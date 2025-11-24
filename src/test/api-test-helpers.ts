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
