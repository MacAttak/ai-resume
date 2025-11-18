/**
 * Application-wide constants
 */

export const RATE_LIMITS = {
  /** Maximum requests per minute per user */
  PER_MINUTE: 10,
  /** Maximum requests per day per user */
  PER_DAY: 100,
} as const;

/**
 * Test environment rate limits (much higher to prevent E2E test failures)
 * Used only in local development, not for preview or production deployments
 */
export const TEST_RATE_LIMITS = {
  /** Maximum requests per minute per user in test environments */
  PER_MINUTE: 1000,
  /** Maximum requests per day per user in test environments */
  PER_DAY: 10000,
} as const;

/**
 * Check if the current environment should use production rate limits
 * Returns false only for local development (dev server, unit tests, E2E tests)
 * Preview and production deployments always use production limits
 */
export function shouldUseProductionLimits(): boolean {
  // Use production limits for all Vercel environments (production, preview)
  // Only use test limits for local development (no VERCEL_ENV set)
  return process.env.VERCEL_ENV !== undefined;
}

export const CONVERSATION_TTL = 60 * 60 * 24 * 7; // 7 days in seconds
