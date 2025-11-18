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
 * Used in non-production environments (test, development, preview)
 */
export const TEST_RATE_LIMITS = {
  /** Maximum requests per minute per user in test environments */
  PER_MINUTE: 1000,
  /** Maximum requests per day per user in test environments */
  PER_DAY: 10000,
} as const;

/**
 * Check if the current environment is production
 */
export function isProduction(): boolean {
  return process.env.VERCEL_ENV === 'production';
}

export const CONVERSATION_TTL = 60 * 60 * 24 * 7; // 7 days in seconds
