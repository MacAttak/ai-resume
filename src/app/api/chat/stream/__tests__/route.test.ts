import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '../route';
import { NextRequest } from 'next/server';
import {
  setupAuthMock,
  setupRateLimitMock,
  setupConversationMock,
  setupAddMessageMock,
  setupStreamMock,
  setupAuthenticatedRequest,
  expectUnauthorized,
} from '@/test/api-test-helpers';

// Mock modules
vi.mock('@clerk/nextjs/server', () => ({
  auth: vi.fn(),
}));

vi.mock('@/lib/rate-limit', () => ({
  checkRateLimit: vi.fn(),
}));

vi.mock('@/lib/conversation', () => ({
  getConversation: vi.fn(),
  addMessage: vi.fn(),
}));

vi.mock('@/lib/agent-stream', () => ({
  runDanielAgentStream: vi.fn(),
}));

vi.mock('@opentelemetry/api', () => ({
  trace: {
    getTracer: () => ({
      startActiveSpan: (name: string, callback: any) => {
        const mockSpan = {
          setAttribute: vi.fn(),
          addEvent: vi.fn(),
          recordException: vi.fn(),
          setStatus: vi.fn(),
          end: vi.fn(),
        };
        return callback(mockSpan);
      },
    }),
  },
}));

// Import mocked modules
import { auth } from '@clerk/nextjs/server';
import { checkRateLimit } from '@/lib/rate-limit';
import { getConversation, addMessage } from '@/lib/conversation';
import { runDanielAgentStream } from '@/lib/agent-stream';

describe('POST /api/chat/stream', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const createMockRequest = (body: any) => {
    return {
      json: async () => body,
    } as NextRequest;
  };

  describe('Authentication', () => {
    it('returns 401 when user is not authenticated', async () => {
      vi.mocked(auth).mockResolvedValue({ userId: null } as any);

      const request = createMockRequest({ message: 'Hello' });
      const response = await POST(request);

      await expectUnauthorized(response);
    });

    it('proceeds when user is authenticated', async () => {
      vi.mocked(auth).mockResolvedValue({ userId: 'test-user-id' } as any);
      vi.mocked(checkRateLimit).mockResolvedValue({
        allowed: false,
        minuteRemaining: 0,
        dayRemaining: 0,
        resetMinute: new Date(Date.now() + 60000),
        resetDay: new Date(Date.now() + 86400000),
      });

      const request = createMockRequest({ message: 'Hello' });
      const response = await POST(request);

      // Should get past auth and hit rate limit
      expect(response.status).toBe(429);
    });
  });

  describe('Rate Limiting', () => {
    beforeEach(() => {
      setupAuthMock(auth);
    });

    it('returns 429 when rate limit is exceeded', async () => {
      setupRateLimitMock(checkRateLimit, {
        allowed: false,
        minuteRemaining: 0,
        dayRemaining: 5,
      });

      const request = createMockRequest({ message: 'Hello' });
      const response = await POST(request);

      expect(response.status).toBe(429);
      const data = await response.json();
      expect(data.error).toBe('Rate limit exceeded');
      expect(data.minuteRemaining).toBe(0);
      expect(data.dayRemaining).toBe(5);
    });

    it('proceeds when rate limit is not exceeded', async () => {
      setupAuthenticatedRequest(auth, checkRateLimit, getConversation);
      setupStreamMock(runDanielAgentStream, [{ type: 'done' }]);

      const request = createMockRequest({ message: 'Hello' });
      const response = await POST(request);

      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Type')).toBe('text/event-stream');
    });
  });

  describe('Input Validation', () => {
    beforeEach(() => {
      setupAuthMock(auth);
      setupRateLimitMock(checkRateLimit);
    });

    it('returns 400 when message is missing', async () => {
      const request = createMockRequest({});
      const response = await POST(request);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('Invalid message');
    });

    it('returns 400 when message is not a string', async () => {
      const request = createMockRequest({ message: 123 });
      const response = await POST(request);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('Invalid message');
    });

    it('returns 400 when message is empty string', async () => {
      const request = createMockRequest({ message: '' });
      const response = await POST(request);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('Invalid message');
    });
  });

  describe('Streaming Response', () => {
    beforeEach(() => {
      setupAuthenticatedRequest(auth, checkRateLimit, getConversation);
      setupAddMessageMock(addMessage);
    });

    it('streams content from agent', async () => {
      setupStreamMock(runDanielAgentStream, [
        { type: 'content', content: 'Hello' },
        { type: 'content', content: ' World' },
        { type: 'done' },
      ]);

      const request = createMockRequest({ message: 'Test message' });
      const response = await POST(request);

      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Type')).toBe('text/event-stream');
      expect(response.headers.get('Cache-Control')).toBe('no-cache');

      // Read stream
      const reader = response.body!.getReader();
      const decoder = new TextDecoder();
      let fullText = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        fullText += decoder.decode(value, { stream: true });
      }

      expect(fullText).toContain('Hello');
      expect(fullText).toContain(' World');
      expect(fullText).toContain('done');
    });

    it('saves conversation history after streaming', async () => {
      setupStreamMock(runDanielAgentStream, [
        { type: 'content', content: 'Test response' },
        { type: 'done' },
      ]);

      const request = createMockRequest({ message: 'Test message' });
      await POST(request);

      // Wait a bit for stream to complete
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(addMessage).toHaveBeenCalledWith(
        'test-user-id',
        expect.objectContaining({
          role: 'user',
          content: 'Test message',
        }),
        expect.any(Array)
      );

      expect(addMessage).toHaveBeenCalledWith(
        'test-user-id',
        expect.objectContaining({
          role: 'assistant',
          content: expect.stringContaining('Test response'),
        }),
        expect.any(Array)
      );
    });

    it('handles errors in agent stream', async () => {
      setupStreamMock(runDanielAgentStream, [
        { type: 'error', error: 'Agent error occurred' },
      ]);

      const request = createMockRequest({ message: 'Test message' });
      const response = await POST(request);

      const reader = response.body!.getReader();
      const decoder = new TextDecoder();
      let fullText = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        fullText += decoder.decode(value, { stream: true });
      }

      expect(fullText).toContain('error');
      expect(fullText).toContain('Agent error occurred');
    });

    it('includes usage stats in completion event', async () => {
      setupRateLimitMock(checkRateLimit, {
        minuteRemaining: 5,
        dayRemaining: 50,
      });
      setupStreamMock(runDanielAgentStream, [
        { type: 'content', content: 'Response' },
        { type: 'done' },
      ]);

      const request = createMockRequest({ message: 'Test' });
      const response = await POST(request);

      const reader = response.body!.getReader();
      const decoder = new TextDecoder();
      let fullText = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        fullText += decoder.decode(value, { stream: true });
      }

      expect(fullText).toContain('minuteRemaining');
      expect(fullText).toContain('dayRemaining');
    });
  });

  describe('Conversation History', () => {
    beforeEach(() => {
      setupAuthMock(auth);
      setupRateLimitMock(checkRateLimit);
      setupAddMessageMock(addMessage);
    });

    it('uses existing conversation history', async () => {
      const existingHistory = [
        {
          role: 'user',
          content: [{ type: 'input_text', text: 'Previous message' }],
        },
        {
          role: 'assistant',
          content: [{ type: 'text', text: 'Previous response' }],
        },
      ];

      vi.mocked(getConversation).mockResolvedValue({
        messages: [],
        agentHistory: existingHistory,
      } as any);

      setupStreamMock(runDanielAgentStream, [{ type: 'done' }]);

      const request = createMockRequest({ message: 'New message' });
      await POST(request);

      expect(runDanielAgentStream).toHaveBeenCalledWith(
        'New message',
        existingHistory,
        'test-user-id'
      );
    });

    it('handles missing conversation history', async () => {
      vi.mocked(getConversation).mockResolvedValue(null);

      setupStreamMock(runDanielAgentStream, [{ type: 'done' }]);

      const request = createMockRequest({ message: 'First message' });
      await POST(request);

      expect(runDanielAgentStream).toHaveBeenCalledWith(
        'First message',
        [],
        'test-user-id'
      );
    });
  });

  describe('Error Handling', () => {
    beforeEach(() => {
      setupAuthenticatedRequest(auth, checkRateLimit, getConversation);
    });

    it('handles errors during stream processing', async () => {
      const mockStream = (async function* () {
        yield { type: 'content' as const, content: 'Starting...' };
        throw new Error('Stream processing error');
      })();
      vi.mocked(runDanielAgentStream).mockReturnValue(mockStream);

      const request = createMockRequest({ message: 'Test' });
      const response = await POST(request);

      const reader = response.body!.getReader();
      const decoder = new TextDecoder();
      let fullText = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        fullText += decoder.decode(value, { stream: true });
      }

      expect(fullText).toContain('error');
    });

    it('handles JSON parsing errors', async () => {
      const request = {
        json: async () => {
          throw new Error('Invalid JSON');
        },
      } as unknown as NextRequest;

      const response = await POST(request);

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.error).toBe('Internal server error');
    });
  });
});
