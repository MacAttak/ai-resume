/**
 * Application-wide constants
 */

export const RATE_LIMITS = {
  /** Maximum requests per minute per user */
  PER_MINUTE: 10,
  /** Maximum requests per day per user */
  PER_DAY: 100,
} as const;

export const CONVERSATION_TTL = 60 * 60 * 24 * 7; // 7 days in seconds
