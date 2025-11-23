import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from '../route';

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
      vi.mocked(auth).mockResolvedValue({ userId: null } as any);

      const response = await GET();

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.error).toBe('Unauthorized');
    });

    it('proceeds when user is authenticated', async () => {
      vi.mocked(auth).mockResolvedValue({ userId: 'test-user-id' } as any);
      vi.mocked(getConversation).mockResolvedValue(null);
      vi.mocked(checkRateLimit).mockResolvedValue({
        allowed: true,
        minuteRemaining: 10,
        dayRemaining: 100,
        resetMinute: Date.now() + 60000,
        resetDay: Date.now() + 86400000,
      });

      const response = await GET();

      expect(response.status).toBe(200);
    });
  });

  describe('Response Data', () => {
    beforeEach(() => {
      vi.mocked(auth).mockResolvedValue({ userId: 'test-user-id' } as any);
    });

    it('returns empty messages array when no conversation exists', async () => {
      vi.mocked(getConversation).mockResolvedValue(null);
      vi.mocked(checkRateLimit).mockResolvedValue({
        allowed: true,
        minuteRemaining: 10,
        dayRemaining: 100,
        resetMinute: Date.now() + 60000,
        resetDay: Date.now() + 86400000,
      });

      const response = await GET();
      const data = await response.json();

      expect(data.messages).toEqual([]);
      expect(data.usage).toBeDefined();
    });

    it('returns existing conversation messages', async () => {
      const mockMessages = [
        { role: 'user', content: 'Hello', timestamp: new Date() },
        { role: 'assistant', content: 'Hi there!', timestamp: new Date() },
      ];

      vi.mocked(getConversation).mockResolvedValue({
        messages: mockMessages,
        agentHistory: [],
      });
      vi.mocked(checkRateLimit).mockResolvedValue({
        allowed: true,
        minuteRemaining: 10,
        dayRemaining: 100,
        resetMinute: Date.now() + 60000,
        resetDay: Date.now() + 86400000,
      });

      const response = await GET();
      const data = await response.json();

      expect(data.messages).toHaveLength(2);
      expect(data.messages[0].role).toBe('user');
      expect(data.messages[1].role).toBe('assistant');
    });

    it('returns usage information', async () => {
      vi.mocked(getConversation).mockResolvedValue(null);
      vi.mocked(checkRateLimit).mockResolvedValue({
        allowed: true,
        minuteRemaining: 5,
        dayRemaining: 50,
        resetMinute: Date.now() + 60000,
        resetDay: Date.now() + 86400000,
      });

      const response = await GET();
      const data = await response.json();

      expect(data.usage).toEqual({
        minuteRemaining: 5,
        dayRemaining: 50,
        resetMinute: expect.any(Number),
        resetDay: expect.any(Number),
      });
    });
  });

  describe('Error Handling', () => {
    beforeEach(() => {
      vi.mocked(auth).mockResolvedValue({ userId: 'test-user-id' } as any);
    });

    it('returns 500 when getConversation throws error', async () => {
      vi.mocked(getConversation).mockRejectedValue(new Error('Database error'));
      vi.mocked(checkRateLimit).mockResolvedValue({
        allowed: true,
        minuteRemaining: 10,
        dayRemaining: 100,
        resetMinute: Date.now() + 60000,
        resetDay: Date.now() + 86400000,
      });

      const response = await GET();

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.error).toBe('Internal server error');
    });

    it('returns 500 when checkRateLimit throws error', async () => {
      vi.mocked(getConversation).mockResolvedValue(null);
      vi.mocked(checkRateLimit).mockRejectedValue(new Error('Redis error'));

      const response = await GET();

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.error).toBe('Internal server error');
    });
  });
});
