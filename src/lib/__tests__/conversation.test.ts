import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getConversation, saveConversation, clearConversation, addMessage } from '../conversation';
import { kv } from '@vercel/kv';
import type { ConversationState, Message } from '../agent';
import type { AgentInputItem } from '@openai/agents';

vi.mock('@vercel/kv', () => ({
  kv: {
    get: vi.fn(),
    set: vi.fn(),
    del: vi.fn(),
  },
}));

describe('conversation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getConversation', () => {
    it('returns conversation state when it exists', async () => {
      const mockState: ConversationState = {
        userId: 'user-123',
        messages: [],
        agentHistory: [],
      };

      vi.mocked(kv.get).mockResolvedValue(mockState);

      const result = await getConversation('user-123');

      expect(result).toEqual(mockState);
      expect(kv.get).toHaveBeenCalledWith('conversation:user-123');
    });

    it('returns null when conversation does not exist', async () => {
      vi.mocked(kv.get).mockResolvedValue(null);

      const result = await getConversation('user-123');

      expect(result).toBeNull();
    });
  });

  describe('saveConversation', () => {
    it('saves conversation state with TTL', async () => {
      const state: ConversationState = {
        userId: 'user-123',
        messages: [],
        agentHistory: [],
      };

      await saveConversation(state);

      expect(kv.set).toHaveBeenCalledWith(
        'conversation:user-123',
        state,
        { ex: 60 * 60 * 24 * 7 } // 7 days
      );
    });
  });

  describe('clearConversation', () => {
    it('deletes conversation from KV', async () => {
      await clearConversation('user-123');

      expect(kv.del).toHaveBeenCalledWith('conversation:user-123');
    });
  });

  describe('addMessage', () => {
    it('creates new conversation if none exists', async () => {
      const userId = 'user-123';
      const message: Message = {
        role: 'user',
        content: 'Hello',
        timestamp: new Date(),
      };
      const agentHistory: AgentInputItem[] = [];

      vi.mocked(kv.get).mockResolvedValue(null);
      vi.mocked(kv.set).mockResolvedValue(undefined);

      const result = await addMessage(userId, message, agentHistory);

      expect(result.userId).toBe(userId);
      expect(result.messages).toHaveLength(1);
      expect(result.messages[0]).toEqual(message);
      expect(result.agentHistory).toEqual(agentHistory);
    });

    it('appends message to existing conversation', async () => {
      const userId = 'user-123';
      const existingState: ConversationState = {
        userId,
        messages: [
          {
            role: 'user',
            content: 'First message',
            timestamp: new Date(),
          },
        ],
        agentHistory: [],
      };
      const newMessage: Message = {
        role: 'assistant',
        content: 'Response',
        timestamp: new Date(),
      };
      const agentHistory: AgentInputItem[] = [];

      vi.mocked(kv.get).mockResolvedValue(existingState);
      vi.mocked(kv.set).mockResolvedValue(undefined);

      const result = await addMessage(userId, newMessage, agentHistory);

      expect(result.messages).toHaveLength(2);
      expect(result.messages[0]).toEqual(existingState.messages[0]);
      expect(result.messages[1]).toEqual(newMessage);
      expect(result.agentHistory).toEqual(agentHistory);
    });

    it('updates agent history when provided', async () => {
      const userId = 'user-123';
      const message: Message = {
        role: 'user',
        content: 'Hello',
        timestamp: new Date(),
      };
      const agentHistory: AgentInputItem[] = [
        {
          role: 'user',
          content: [{ type: 'input_text', text: 'Hello' }],
        },
      ];

      vi.mocked(kv.get).mockResolvedValue(null);
      vi.mocked(kv.set).mockResolvedValue(undefined);

      const result = await addMessage(userId, message, agentHistory);

      expect(result.agentHistory).toEqual(agentHistory);
    });
  });
});

