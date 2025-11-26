import { AgentInputItem, Runner, getGlobalTraceProvider } from '@openai/agents';
import { createDanielAgent, createRunnerConfig } from './agent-config';
import { setCalToolsUserId } from './cal-tools';
import { getHoneyHiveTracer } from '@/instrumentation';
import { getHoneyHiveExporter } from './honeyhive-exporter';

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
  // Get HoneyHive tracer and exporter for this session
  const tracer = getHoneyHiveTracer();
  const exporter = getHoneyHiveExporter();

  try {
    // Start HoneyHive session and link exporter to it
    let sessionId: string | null = null;
    if (tracer) {
      sessionId = await tracer.startSession();

      // Link the exporter to this session so SDK traces go to HoneyHive
      if (exporter && sessionId) {
        exporter.setSessionId(sessionId);
      }

      // Enrich session with initial inputs
      await tracer.enrichSession({
        inputs: {
          userMessage,
          conversationLength: conversationHistory.length,
        },
        metadata: { userId },
      });
    }

    // Run agent with HoneyHive tracing - captures inputs/outputs automatically
    let accumulatedContent = '';
    let updatedHistory: AgentInputItem[] = [];

    try {
      // Execute agent directly - tracing is now handled by the exporter
      console.log('[HoneyHive] Starting agent execution...');
      const { result, fullHistory } = await executeAgentRun(
        userMessage,
        conversationHistory,
        userId
      );
      console.log('[HoneyHive] Agent execution completed');
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
            console.log('[HoneyHive] Flushing traces (streaming complete)...');
            try {
              await getGlobalTraceProvider().forceFlush();
              console.log('[HoneyHive] Flush completed');
            } catch (flushError) {
              console.warn('[HoneyHive] Failed to flush traces:', flushError);
            }

            // Enrich and flush HoneyHive session
            if (tracer) {
              await tracer.enrichSession({
                outputs: { response: accumulatedContent },
                metrics: { responseLength: accumulatedContent.length },
              });
              await tracer.flush();
            }

            // DON'T clear session yet - let any pending exports complete
            // The session will be cleared on the next request

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
      // DON'T clear exporter session - might still have pending spans
      console.error('[HoneyHive] Agent execution error:', error);
      yield {
        type: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
      return;
    }

    // Force flush SDK traces to HoneyHive before completing (non-streaming path)
    console.log('[HoneyHive] Flushing traces (non-streaming complete)...');
    try {
      await getGlobalTraceProvider().forceFlush();
      console.log('[HoneyHive] Flush completed');
    } catch (flushError) {
      console.warn('[HoneyHive] Failed to flush traces:', flushError);
    }

    // Enrich session with final outputs
    if (tracer) {
      await tracer.enrichSession({
        outputs: { response: accumulatedContent },
        metrics: { responseLength: accumulatedContent.length },
      });
      await tracer.flush();
    }

    // DON'T clear session yet - let any pending exports complete
    // The session will be cleared on the next request

    // Return final state
    yield {
      type: 'done',
      content: accumulatedContent,
      updatedHistory,
    };
  } catch (error) {
    console.error('agent-stream error:', error);
    // DON'T clear exporter session on error either - might still have pending spans
    yield {
      type: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
