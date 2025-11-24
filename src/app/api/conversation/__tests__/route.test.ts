import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from '../route';
import {
  setupAuthMock,
  setupRateLimitMock,
  setupConversationMock,
} from '@/test/api-test-helpers';

// Mock modules
vi.mock('@clerk/nextjs/server', () => ({
  auth: vi.fn(),
}));

vi.mock('@/lib/conversation', () => ({
  getConversation: vi.fn(),
}));

vi.mock('@/lib/rate-limit', () => ({
  checkRateLimit: vi.fn(),
}));

// Import mocked modules
import { auth } from '@clerk/nextjs/server';
import { getConversation } from '@/lib/conversation';
import { checkRateLimit } from '@/lib/rate-limit';

describe('GET /api/conversation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Authentication', () => {
    it('returns 401 when user is not authenticated', async () => {
      setupAuthMock(auth, null);

      const response = await GET();

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.error).toBe('Unauthorized');
    });

    it('proceeds when user is authenticated', async () => {
      setupAuthMock(auth);
      setupConversationMock(getConversation, null);
      setupRateLimitMock(checkRateLimit);

      const response = await GET();

      expect(response.status).toBe(200);
    });
  });

  describe('Response Data', () => {
    beforeEach(() => {
      setupAuthMock(auth);
    });

    it('returns empty messages array when no conversation exists', async () => {
      setupConversationMock(getConversation, null);
      setupRateLimitMock(checkRateLimit);

      const response = await GET();
      const data = await response.json();

      expect(data.messages).toEqual([]);
      expect(data.usage).toBeDefined();
    });

    it('returns existing conversation messages', async () => {
      const mockMessages = [
        { role: 'user' as const, content: 'Hello', timestamp: new Date() },
        {
          role: 'assistant' as const,
          content: 'Hi there!',
          timestamp: new Date(),
        },
      ];

      setupConversationMock(getConversation, {
        messages: mockMessages,
        agentHistory: [],
      });
      setupRateLimitMock(checkRateLimit);

      const response = await GET();
      const data = await response.json();

      expect(data.messages).toHaveLength(2);
      expect(data.messages[0].role).toBe('user');
      expect(data.messages[1].role).toBe('assistant');
    });

    it('returns usage information', async () => {
      setupConversationMock(getConversation, null);
      setupRateLimitMock(checkRateLimit, {
        minuteRemaining: 5,
        dayRemaining: 50,
      });

      const response = await GET();
      const data = await response.json();

      expect(data.usage).toEqual({
        minuteRemaining: 5,
        dayRemaining: 50,
        resetMinute: expect.any(String),
        resetDay: expect.any(String),
      });
    });
  });

  describe('Error Handling', () => {
    beforeEach(() => {
      setupAuthMock(auth);
    });

    it('returns 500 when getConversation throws error', async () => {
      vi.mocked(getConversation).mockRejectedValue(new Error('Database error'));
      setupRateLimitMock(checkRateLimit);

      const response = await GET();

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.error).toBe('Internal server error');
    });

    it('returns 500 when checkRateLimit throws error', async () => {
      setupConversationMock(getConversation, null);
      vi.mocked(checkRateLimit).mockRejectedValue(new Error('Redis error'));

      const response = await GET();

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.error).toBe('Internal server error');
    });
  });
});
