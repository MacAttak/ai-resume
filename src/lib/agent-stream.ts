import { AgentInputItem, Runner, getGlobalTraceProvider } from '@openai/agents';
import { createDanielAgent, createRunnerConfig } from './agent-config';
import { setCalToolsUserId } from './cal-tools';
import { getHoneyHiveExporter } from './honeyhive-exporter';
import { startSession, updateSession } from './honeyhive-client';
import { honeyhiveLogger } from './logger';

/**
 * Core agent execution function - runs the Daniel agent with conversation history
 * This function is wrapped by the HoneyHive tracer when called via runDanielAgentStream
 */
async function executeAgentRun(
  userMessage: string,
  conversationHistory: AgentInputItem[],
  userId?: string
) {
  setCalToolsUserId(userId);

  const newUserItem: AgentInputItem = {
    role: 'user',
    content: [{ type: 'input_text', text: userMessage }],
  };
  const fullHistory = [...conversationHistory, newUserItem];

  const daniel = createDanielAgent(userId);
  const conversationId = `${Date.now()}`;
  const runnerConfig = createRunnerConfig(conversationId);
  const runner = new Runner(runnerConfig);
  const result = await runner.run(daniel, fullHistory);

  return { result, fullHistory };
}

export async function* runDanielAgentStream(
  userMessage: string,
  conversationHistory: AgentInputItem[] = [],
  userId?: string
): AsyncGenerator<{
  type: string;
  content?: string;
  done?: boolean;
  error?: string;
  updatedHistory?: AgentInputItem[];
}> {
  // Get the HoneyHive exporter (initialized by instrumentation.ts)
  const exporter = getHoneyHiveExporter();
  let sessionId: string | null = null;
  const sessionStartTime = Date.now();

  // Debug logging (safe - only logs boolean/existence, never actual values)
  honeyhiveLogger.debug('Status check', {
    exporterReady: !!exporter,
    apiKeyConfigured: !!process.env.HONEYHIVE_API_KEY,
    projectConfigured: !!process.env.HONEYHIVE_PROJECT,
  });

  try {
    // Start HoneyHive session using REST API (no OTel conflicts)
    if (exporter && process.env.HONEYHIVE_API_KEY) {
      honeyhiveLogger.debug('Starting session via REST API');
      sessionId = await startSession({
        sessionName: 'ai-resume-chat',
        inputs: {
          userMessage,
          conversationLength: conversationHistory.length,
        },
        metadata: { userId },
        userProperties: userId ? { userId } : undefined,
      });

      // Link the exporter to this session so SDK traces go to HoneyHive
      if (sessionId) {
        exporter.setSessionId(sessionId);
        honeyhiveLogger.info('Session started', { sessionId });
      }
    }

    // Run agent with HoneyHive tracing - captures inputs/outputs automatically
    let accumulatedContent = '';
    let updatedHistory: AgentInputItem[] = [];

    try {
      // Execute agent directly - tracing is now handled by the exporter
      honeyhiveLogger.debug('Starting agent execution');
      const { result, fullHistory } = await executeAgentRun(
        userMessage,
        conversationHistory,
        userId
      );
      honeyhiveLogger.debug('Agent execution completed');
      updatedHistory = [...fullHistory];

      // Check if result is an async iterable (streaming)
      if (
        result &&
        typeof (result as any)[Symbol.asyncIterator] === 'function'
      ) {
        // Process streaming events - Agent SDK may send incremental or full content
        for await (const event of result as unknown as AsyncIterable<any>) {
          if (
            event.type === 'raw_model_stream_event' ||
            event.type === 'text_delta'
          ) {
            const content =
              event.data?.content || event.content || event.delta || '';
            if (content) {
              // Check if this is new content (not already accumulated)
              // If content starts with accumulatedContent, it's incremental
              // Otherwise, extract only the new part
              let newContent = content;
              if (content.startsWith(accumulatedContent)) {
                newContent = content.slice(accumulatedContent.length);
              } else if (
                accumulatedContent &&
                content.includes(accumulatedContent)
              ) {
                // Content contains accumulated, extract what's new
                const startIdx = content.indexOf(accumulatedContent);
                newContent = content.slice(
                  startIdx + accumulatedContent.length
                );
              }

              if (newContent && newContent.length > 0) {
                accumulatedContent += newContent;
                yield { type: 'content', content: newContent };
                // Natural reading speed delay (30ms per chunk)
                await new Promise((resolve) => setTimeout(resolve, 30));
              }
            }
          } else if (event.type === 'agent_stream_event') {
            const content = event.data?.content || '';
            if (content) {
              // Similar deduplication for agent events
              let newContent = content;
              if (content.startsWith(accumulatedContent)) {
                newContent = content.slice(accumulatedContent.length);
              }
              if (newContent && newContent.length > 0) {
                accumulatedContent += newContent;
                yield { type: 'content', content: newContent };
                await new Promise((resolve) => setTimeout(resolve, 30));
              }
            }
          } else if (event.type === 'done' || event.type === 'complete') {
            if (event.data?.newItems) {
              updatedHistory = [
                ...fullHistory,
                ...event.data.newItems.map((item: any) => item.rawItem || item),
              ];
            }

            // Force flush SDK traces before completing (streaming path)
            honeyhiveLogger.debug('Flushing traces (streaming complete)');
            try {
              await getGlobalTraceProvider().forceFlush();
              honeyhiveLogger.debug('Flush completed');
            } catch (flushError) {
              honeyhiveLogger.warn('Failed to flush traces', flushError);
            }

            // Update session with final outputs via REST API
            if (sessionId) {
              await updateSession(sessionId, {
                outputs: { response: accumulatedContent },
                metrics: { responseLength: accumulatedContent.length },
                duration: Date.now() - sessionStartTime,
              });
            }

            // Yield completion event
            yield {
              type: 'done',
              content: accumulatedContent,
              updatedHistory,
            };
            return; // Exit the generator
          }
        }
      } else {
        // Fallback: simulate streaming by chunking the response intelligently
        const response = (result as any).finalOutput ?? '';

        // Chunk by words for natural reading speed
        // Split by whitespace to preserve words, then chunk intelligently
        const words = response.split(/(\s+)/); // Split but keep whitespace
        const wordsPerChunk = 4; // Stream 4 words at a time
        const delayPerChunk = 80; // 80ms per chunk (~200-250ms per second, comfortable reading speed)

        let currentChunk: string[] = [];
        let chunkWordCount = 0;

        for (let i = 0; i < words.length; i++) {
          const word = words[i];

          // Skip only truly empty strings, preserve all whitespace including newlines
          if (word === '') continue;

          currentChunk.push(word);

          // If it's a word (not just whitespace), increment counter
          if (word.trim()) {
            chunkWordCount++;
          }

          // Yield chunk when we reach the word limit or hit punctuation
          if (chunkWordCount >= wordsPerChunk || /[.!?]\s*$/.test(word)) {
            const chunk = currentChunk.join('');
            if (chunk.trim()) {
              accumulatedContent += chunk;
              yield { type: 'content', content: chunk };
              await new Promise((resolve) =>
                setTimeout(resolve, delayPerChunk)
              );
            }
            currentChunk = [];
            chunkWordCount = 0;
          }
        }

        // Yield any remaining content
        if (currentChunk.length > 0) {
          const chunk = currentChunk.join('');
          if (chunk.trim()) {
            accumulatedContent += chunk;
            yield { type: 'content', content: chunk };
          }
        }

        updatedHistory = [
          ...fullHistory,
          ...((result as any).newItems || []).map(
            (item: any) => item.rawItem || item
          ),
        ];
      }
    } catch (error) {
      honeyhiveLogger.error('Agent execution error', error);
      yield {
        type: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
      return;
    }

    // Force flush SDK traces to HoneyHive before completing (non-streaming path)
    honeyhiveLogger.debug('Flushing traces (non-streaming complete)');
    try {
      await getGlobalTraceProvider().forceFlush();
      honeyhiveLogger.debug('Flush completed');
    } catch (flushError) {
      honeyhiveLogger.warn('Failed to flush traces', flushError);
    }

    // Update session with final outputs via REST API
    if (sessionId) {
      await updateSession(sessionId, {
        outputs: { response: accumulatedContent },
        metrics: { responseLength: accumulatedContent.length },
        duration: Date.now() - sessionStartTime,
      });
    }

    // Return final state
    yield {
      type: 'done',
      content: accumulatedContent,
      updatedHistory,
    };
  } catch (error) {
    honeyhiveLogger.error('Agent stream error', error);
    yield {
      type: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
