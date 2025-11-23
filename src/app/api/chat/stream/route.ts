import { auth } from '@clerk/nextjs/server';
import { NextRequest } from 'next/server';
import { runDanielAgentStream } from '@/lib/agent-stream';
import { checkRateLimit } from '@/lib/rate-limit';
import { getConversation, addMessage } from '@/lib/conversation';
import { trace } from '@opentelemetry/api';

export const runtime = 'nodejs'; // Agent SDK requires Node runtime
export const maxDuration = 30; // 30 second timeout for agent processing

export async function POST(req: NextRequest) {
  const tracer = trace.getTracer('ai-resume');

  return tracer.startActiveSpan('chat.stream', async (span) => {
    try {
      // 1. Verify authentication
      const { userId } = await auth();
      if (!userId) {
        span.recordException(new Error('Unauthorized'));
        span.setStatus({ code: 2 }); // Error
        span.end();
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      span.setAttribute('user.id', userId);

      // 2. Check rate limits
      const rateLimitStatus = await checkRateLimit(userId);
      if (!rateLimitStatus.allowed) {
        span.addEvent('rate_limit_exceeded');
        span.end();
        return new Response(
          JSON.stringify({
            error: 'Rate limit exceeded',
            minuteRemaining: rateLimitStatus.minuteRemaining,
            dayRemaining: rateLimitStatus.dayRemaining,
          }),
          { status: 429, headers: { 'Content-Type': 'application/json' } }
        );
      }

      // 3. Parse request
      const { message } = await req.json();
      if (!message || typeof message !== 'string') {
        span.recordException(new Error('Invalid message'));
        span.setStatus({ code: 2 });
        span.end();
        return new Response(JSON.stringify({ error: 'Invalid message' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      // 4. Get conversation history
      const conversation = await getConversation(userId);
      const agentHistory = conversation?.agentHistory || [];

      // 5. Create streaming response
      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        async start(controller) {
          try {
            let fullResponse = '';
            let finalHistory: any[] = [];

            // Stream agent response with deduplication
            let lastSentLength = 0;
            for await (const event of runDanielAgentStream(
              message,
              agentHistory,
              userId
            )) {
              if (event.type === 'content' && event.content) {
                // Only send new content (prevent duplicates)
                const newContent = event.content;
                if (newContent && newContent.length > 0) {
                  const data = JSON.stringify({
                    type: 'content',
                    content: newContent,
                  });
                  controller.enqueue(encoder.encode(`data: ${data}\n\n`));
                  fullResponse += newContent;
                  lastSentLength = fullResponse.length;
                }
              } else if (event.type === 'done' || event.type === 'complete') {
                // Stream complete - use sanitized content if available
                let finalContent = fullResponse;

                if (event.type === 'done' || event.type === 'complete') {
                  if ((event as any).content) {
                    // Use the sanitized content from the complete event
                    finalContent = (event as any).content;
                  }
                  if ((event as any).updatedHistory) {
                    finalHistory = (event as any).updatedHistory;
                  }
                }

                // Save conversation state with sanitized content
                const updatedHistory =
                  finalHistory.length > 0
                    ? finalHistory
                    : [
                        ...agentHistory,
                        {
                          role: 'user',
                          content: [{ type: 'input_text', text: message }],
                        },
                        {
                          role: 'assistant',
                          content: [{ type: 'text', text: finalContent }],
                        },
                      ];

                await addMessage(
                  userId,
                  { role: 'user', content: message, timestamp: new Date() },
                  updatedHistory
                );
                await addMessage(
                  userId,
                  {
                    role: 'assistant',
                    content: finalContent,
                    timestamp: new Date(),
                  },
                  updatedHistory
                );

                // Send completion event
                const completionData = JSON.stringify({
                  type: 'done',
                  usage: {
                    minuteRemaining: rateLimitStatus.minuteRemaining - 1,
                    dayRemaining: rateLimitStatus.dayRemaining - 1,
                  },
                });
                controller.enqueue(
                  encoder.encode(`data: ${completionData}\n\n`)
                );
                controller.close();
                span.end(); // End span on success
              } else if (event.type === 'error') {
                // Send error
                const errorData = JSON.stringify({
                  type: 'error',
                  error: event.error,
                });
                controller.enqueue(encoder.encode(`data: ${errorData}\n\n`));
                controller.close();
                span.recordException(new Error(event.error));
                span.setStatus({ code: 2 });
                span.end();
              }
            }
          } catch (error) {
            console.error('api:chat:stream error:', error);
            const errorData = JSON.stringify({
              type: 'error',
              error:
                error instanceof Error
                  ? error.message
                  : 'Internal server error',
            });
            controller.enqueue(encoder.encode(`data: ${errorData}\n\n`));
            controller.close();
            span.recordException(error as Error);
            span.setStatus({ code: 2 });
            span.end();
          }
        },
      });

      return new Response(stream, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          Connection: 'keep-alive',
        },
      });
    } catch (error) {
      console.error('api:chat error:', error);
      span.recordException(error as Error);
      span.setStatus({ code: 2 });
      span.end();
      return new Response(JSON.stringify({ error: 'Internal server error' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  });
}
