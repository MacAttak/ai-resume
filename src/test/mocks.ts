import { vi } from 'vitest';

// Mock OpenAI Agent SDK
export const mockRunDanielAgent = vi.fn().mockResolvedValue({
  response: 'Test response from Daniel',
  updatedHistory: [],
  reasoning: 'Test reasoning',
});

export const mockAgentRunner = {
  run: vi.fn().mockResolvedValue({
    finalOutput: 'Test response from Daniel',
    newItems: [
      {
        rawItem: {
          role: 'assistant',
          content: [{ type: 'text', text: 'Test response from Daniel' }],
        },
      },
    ],
  }),
};

// Mock Clerk auth
export const mockAuth = vi.fn().mockResolvedValue({
  userId: 'test-user-id',
});

// Mock Vercel KV
export const mockKv = {
  get: vi.fn(),
  set: vi.fn(),
  del: vi.fn(),
};

// Mock rate limiting
export const mockRateLimit = {
  allowed: true,
  minuteRemaining: 10,
  dayRemaining: 100,
  resetMinute: new Date(Date.now() + 60000),
  resetDay: new Date(Date.now() + 86400000),
};

// Mock conversation state
export const mockConversation = {
  userId: 'test-user-id',
  messages: [],
  agentHistory: [],
};

