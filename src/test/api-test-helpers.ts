import { vi } from 'vitest';

/**
 * Common test helpers for API route tests
 */

export const createMockRateLimitResponse = (overrides?: {
  allowed?: boolean;
  minuteRemaining?: number;
  dayRemaining?: number;
}) => ({
  allowed: overrides?.allowed ?? true,
  minuteRemaining: overrides?.minuteRemaining ?? 10,
  dayRemaining: overrides?.dayRemaining ?? 100,
  resetMinute: new Date(Date.now() + 60000),
  resetDay: new Date(Date.now() + 86400000),
});

export const createMockConversationState = (overrides?: {
  messages?: any[];
  agentHistory?: any[];
}) => ({
  messages: overrides?.messages ?? [],
  agentHistory: overrides?.agentHistory ?? [],
});

export const setupAuthMock = (
  auth: any,
  userId: string | null = 'test-user-id'
) => {
  vi.mocked(auth).mockResolvedValue({ userId } as any);
};

export const setupRateLimitMock = (
  checkRateLimit: any,
  options?: Parameters<typeof createMockRateLimitResponse>[0]
) => {
  vi.mocked(checkRateLimit).mockResolvedValue(
    createMockRateLimitResponse(options)
  );
};

export const setupConversationMock = (
  getConversation: any,
  state: ReturnType<typeof createMockConversationState> | null = null
) => {
  vi.mocked(getConversation).mockResolvedValue(state as any);
};

export const setupAddMessageMock = (addMessage: any) => {
  vi.mocked(addMessage).mockResolvedValue({
    messages: [],
    agentHistory: [],
  } as any);
};

export const setupStreamMock = (
  runDanielAgentStream: any,
  events: Array<{
    type: 'content' | 'done' | 'complete' | 'error';
    content?: string;
    error?: string;
  }>
) => {
  const mockStream = (async function* () {
    for (const event of events) {
      yield event as any;
    }
  })();
  vi.mocked(runDanielAgentStream).mockReturnValue(mockStream);
};

export const setupAuthenticatedRequest = (
  auth: any,
  checkRateLimit: any,
  getConversation: any,
  options?: {
    rateLimitAllowed?: boolean;
    conversationState?: any;
  }
) => {
  setupAuthMock(auth);
  setupRateLimitMock(checkRateLimit, {
    allowed: options?.rateLimitAllowed ?? true,
  });
  setupConversationMock(getConversation, options?.conversationState ?? null);
};

export const createMockMessages = (count: number = 2) => {
  const messages = [];
  for (let i = 0; i < count; i++) {
    messages.push({
      role: i % 2 === 0 ? ('user' as const) : ('assistant' as const),
      content: i % 2 === 0 ? `Message ${i + 1}` : `Response ${i + 1}`,
      timestamp: new Date(),
    });
  }
  return messages;
};
