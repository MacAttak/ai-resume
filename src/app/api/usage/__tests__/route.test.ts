import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from '../route';

// Mock modules
vi.mock('@clerk/nextjs/server', () => ({
  auth: vi.fn(),
}));

vi.mock('@/lib/rate-limit', () => ({
  checkRateLimit: vi.fn(),
}));

vi.mock('@/lib/conversation', () => ({
  getConversation: vi.fn(),
}));

// Import mocked modules
import { auth } from '@clerk/nextjs/server';
import { checkRateLimit } from '@/lib/rate-limit';
import { getConversation } from '@/lib/conversation';

describe('GET /api/usage', () => {
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
      vi.mocked(checkRateLimit).mockResolvedValue({
        allowed: true,
        minuteRemaining: 10,
        dayRemaining: 100,
        resetMinute: Date.now() + 60000,
        resetDay: Date.now() + 86400000,
      });
      vi.mocked(getConversation).mockResolvedValue(null);

      const response = await GET();

      expect(response.status).toBe(200);
    });
  });

  describe('Usage Data', () => {
    beforeEach(() => {
      vi.mocked(auth).mockResolvedValue({ userId: 'test-user-id' } as any);
    });

    it('returns rate limit information', async () => {
      const resetMinute = Date.now() + 60000;
      const resetDay = Date.now() + 86400000;

      vi.mocked(checkRateLimit).mockResolvedValue({
        allowed: true,
        minuteRemaining: 8,
        dayRemaining: 75,
        resetMinute,
        resetDay,
      });
      vi.mocked(getConversation).mockResolvedValue(null);

      const response = await GET();
      const data = await response.json();

      expect(data.minuteRemaining).toBe(8);
      expect(data.dayRemaining).toBe(75);
      expect(data.resetMinute).toBe(resetMinute);
      expect(data.resetDay).toBe(resetDay);
    });

    it('returns message count from conversation', async () => {
      vi.mocked(checkRateLimit).mockResolvedValue({
        allowed: true,
        minuteRemaining: 10,
        dayRemaining: 100,
        resetMinute: Date.now() + 60000,
        resetDay: Date.now() + 86400000,
      });

      const mockMessages = [
        { role: 'user', content: 'Message 1', timestamp: new Date() },
        { role: 'assistant', content: 'Response 1', timestamp: new Date() },
        { role: 'user', content: 'Message 2', timestamp: new Date() },
      ];

      vi.mocked(getConversation).mockResolvedValue({
        messages: mockMessages,
        agentHistory: [],
      });

      const response = await GET();
      const data = await response.json();

      expect(data.messageCount).toBe(3);
    });

    it('returns 0 message count when no conversation exists', async () => {
      vi.mocked(checkRateLimit).mockResolvedValue({
        allowed: true,
        minuteRemaining: 10,
        dayRemaining: 100,
        resetMinute: Date.now() + 60000,
        resetDay: Date.now() + 86400000,
      });
      vi.mocked(getConversation).mockResolvedValue(null);

      const response = await GET();
      const data = await response.json();

      expect(data.messageCount).toBe(0);
    });

    it('fetches rate limit and conversation in parallel', async () => {
      vi.mocked(auth).mockResolvedValue({ userId: 'test-user-id' } as any);
      vi.mocked(checkRateLimit).mockResolvedValue({
        allowed: true,
        minuteRemaining: 10,
        dayRemaining: 100,
        resetMinute: Date.now() + 60000,
        resetDay: Date.now() + 86400000,
      });
      vi.mocked(getConversation).mockResolvedValue(null);

      await GET();

      // Both should be called
      expect(checkRateLimit).toHaveBeenCalledWith('test-user-id');
      expect(getConversation).toHaveBeenCalledWith('test-user-id');
    });
  });

  describe('Error Handling', () => {
    beforeEach(() => {
      vi.mocked(auth).mockResolvedValue({ userId: 'test-user-id' } as any);
    });

    it('throws error when checkRateLimit fails', async () => {
      vi.mocked(checkRateLimit).mockRejectedValue(new Error('Redis error'));
      vi.mocked(getConversation).mockResolvedValue(null);

      await expect(GET()).rejects.toThrow('Redis error');
    });

    it('throws error when getConversation fails', async () => {
      vi.mocked(checkRateLimit).mockResolvedValue({
        allowed: true,
        minuteRemaining: 10,
        dayRemaining: 100,
        resetMinute: Date.now() + 60000,
        resetDay: Date.now() + 86400000,
      });
      vi.mocked(getConversation).mockRejectedValue(new Error('Database error'));

      await expect(GET()).rejects.toThrow('Database error');
    });
  });
});
