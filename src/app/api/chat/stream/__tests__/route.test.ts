import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '../route';
import { NextRequest } from 'next/server';

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

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.error).toBe('Unauthorized');
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
      vi.mocked(auth).mockResolvedValue({ userId: 'test-user-id' } as any);
    });

    it('returns 429 when rate limit is exceeded', async () => {
      vi.mocked(checkRateLimit).mockResolvedValue({
        allowed: false,
        minuteRemaining: 0,
        dayRemaining: 5,
        resetMinute: new Date(Date.now() + 60000),
        resetDay: new Date(Date.now() + 86400000),
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
      vi.mocked(auth).mockResolvedValue({ userId: 'test-user-id' } as any);
      vi.mocked(checkRateLimit).mockResolvedValue({
        allowed: true,
        minuteRemaining: 10,
        dayRemaining: 100,
        resetMinute: new Date(Date.now() + 60000),
        resetDay: new Date(Date.now() + 86400000),
      });
      vi.mocked(getConversation).mockResolvedValue(null);

      // Mock empty stream
      const mockStream = (async function* () {
        yield { type: 'done' as const };
      })();
      vi.mocked(runDanielAgentStream).mockReturnValue(mockStream);

      const request = createMockRequest({ message: 'Hello' });
      const response = await POST(request);

      // Should get streaming response
      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Type')).toBe('text/event-stream');
    });
  });

  describe('Input Validation', () => {
    beforeEach(() => {
      vi.mocked(auth).mockResolvedValue({ userId: 'test-user-id' } as any);
      vi.mocked(checkRateLimit).mockResolvedValue({
        allowed: true,
        minuteRemaining: 10,
        dayRemaining: 100,
        resetMinute: new Date(Date.now() + 60000),
        resetDay: new Date(Date.now() + 86400000),
      });
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
      vi.mocked(auth).mockResolvedValue({ userId: 'test-user-id' } as any);
      vi.mocked(checkRateLimit).mockResolvedValue({
        allowed: true,
        minuteRemaining: 10,
        dayRemaining: 100,
        resetMinute: new Date(Date.now() + 60000),
        resetDay: new Date(Date.now() + 86400000),
      });
      vi.mocked(getConversation).mockResolvedValue(null);
      vi.mocked(addMessage).mockResolvedValue({
        messages: [],
        agentHistory: [],
      } as any);
    });

    it('streams content from agent', async () => {
      const mockStream = (async function* () {
        yield { type: 'content' as const, content: 'Hello' };
        yield { type: 'content' as const, content: ' World' };
        yield { type: 'done' as const };
      })();
      vi.mocked(runDanielAgentStream).mockReturnValue(mockStream);

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
      const mockStream = (async function* () {
        yield { type: 'content' as const, content: 'Test response' };
        yield { type: 'done' as const };
      })();
      vi.mocked(runDanielAgentStream).mockReturnValue(mockStream);

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
      const mockStream = (async function* () {
        yield { type: 'error' as const, error: 'Agent error occurred' };
      })();
      vi.mocked(runDanielAgentStream).mockReturnValue(mockStream);

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
      vi.mocked(checkRateLimit).mockResolvedValue({
        allowed: true,
        minuteRemaining: 5,
        dayRemaining: 50,
        resetMinute: new Date(Date.now() + 60000),
        resetDay: new Date(Date.now() + 86400000),
      });

      const mockStream = (async function* () {
        yield { type: 'content' as const, content: 'Response' };
        yield { type: 'done' as const };
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

      expect(fullText).toContain('minuteRemaining');
      expect(fullText).toContain('dayRemaining');
    });
  });

  describe('Conversation History', () => {
    beforeEach(() => {
      vi.mocked(auth).mockResolvedValue({ userId: 'test-user-id' } as any);
      vi.mocked(checkRateLimit).mockResolvedValue({
        allowed: true,
        minuteRemaining: 10,
        dayRemaining: 100,
        resetMinute: new Date(Date.now() + 60000),
        resetDay: new Date(Date.now() + 86400000),
      });
      vi.mocked(addMessage).mockResolvedValue({
        messages: [],
        agentHistory: [],
      } as any);
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

      const mockStream = (async function* () {
        yield { type: 'done' as const };
      })();
      vi.mocked(runDanielAgentStream).mockReturnValue(mockStream);

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

      const mockStream = (async function* () {
        yield { type: 'done' as const };
      })();
      vi.mocked(runDanielAgentStream).mockReturnValue(mockStream);

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
      vi.mocked(auth).mockResolvedValue({ userId: 'test-user-id' } as any);
      vi.mocked(checkRateLimit).mockResolvedValue({
        allowed: true,
        minuteRemaining: 10,
        dayRemaining: 100,
        resetMinute: new Date(Date.now() + 60000),
        resetDay: new Date(Date.now() + 86400000),
      });
      vi.mocked(getConversation).mockResolvedValue(null);
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
