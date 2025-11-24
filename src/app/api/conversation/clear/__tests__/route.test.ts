import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '../route';

// Mock modules
vi.mock('@clerk/nextjs/server', () => ({
  auth: vi.fn(),
}));

vi.mock('@/lib/conversation', () => ({
  clearConversation: vi.fn(),
}));

// Import mocked modules
import { auth } from '@clerk/nextjs/server';
import { clearConversation } from '@/lib/conversation';

describe('POST /api/conversation/clear', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Authentication', () => {
    it('returns 401 when user is not authenticated', async () => {
      vi.mocked(auth).mockResolvedValue({ userId: null } as any);

      const response = await POST();

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.error).toBe('Unauthorized');
    });

    it('proceeds when user is authenticated', async () => {
      vi.mocked(auth).mockResolvedValue({ userId: 'test-user-id' } as any);
      vi.mocked(clearConversation).mockResolvedValue(undefined);

      const response = await POST();

      expect(response.status).toBe(200);
    });
  });

  describe('Conversation Clearing', () => {
    beforeEach(() => {
      vi.mocked(auth).mockResolvedValue({ userId: 'test-user-id' } as any);
    });

    it('calls clearConversation with user ID', async () => {
      vi.mocked(clearConversation).mockResolvedValue(undefined);

      await POST();

      expect(clearConversation).toHaveBeenCalledWith('test-user-id');
    });

    it('returns success true on successful clear', async () => {
      vi.mocked(clearConversation).mockResolvedValue(undefined);

      const response = await POST();
      const data = await response.json();

      expect(data.success).toBe(true);
    });
  });

  describe('Error Handling', () => {
    beforeEach(() => {
      vi.mocked(auth).mockResolvedValue({ userId: 'test-user-id' } as any);
    });

    it('throws error when clearConversation fails', async () => {
      vi.mocked(clearConversation).mockRejectedValue(
        new Error('Database error')
      );

      await expect(POST()).rejects.toThrow('Database error');
    });
  });
});
