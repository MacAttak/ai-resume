import { AgentInputItem, Runner } from '@openai/agents';
import { createDanielAgent, createRunnerConfig } from './agent-config';
import { setCalToolsUserId } from './cal-tools';

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
  try {
    // Set userId context for Cal.com tools
    setCalToolsUserId(userId);

    // Add user message to conversation
    const newUserItem: AgentInputItem = {
      role: 'user',
      content: [
        {
          type: 'input_text',
          text: userMessage,
        },
      ],
    };

    const fullHistory = [...conversationHistory, newUserItem];

    // Configure runner with proper tracing
    const conversationId = `${Date.now()}`;
    const runnerConfig = createRunnerConfig(conversationId);
    const runner = new Runner(runnerConfig);

    // Run agent - try streaming first, fallback to chunked response
    let accumulatedContent = '';
    let updatedHistory = [...fullHistory];

    try {
      const daniel = createDanielAgent(userId);
      const result = await runner.run(daniel, fullHistory);

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
            // Yield completion event immediately
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
      yield {
        type: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
      return;
    }

    // Return final state
    yield {
      type: 'done',
      content: accumulatedContent,
      updatedHistory,
    };
  } catch (error) {
    console.error('agent-stream error:', error);
    yield {
      type: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
