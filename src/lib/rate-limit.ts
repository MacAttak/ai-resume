import { Ratelimit } from '@upstash/ratelimit';
import { kv } from '@vercel/kv';
import {
  RATE_LIMITS,
  TEST_RATE_LIMITS,
  shouldUseProductionLimits,
} from './constants';

// Use Vercel KV (which is Upstash Redis) for rate limiting
const redis = kv;

// Determine which limits and prefixes to use based on environment
const limits = shouldUseProductionLimits() ? RATE_LIMITS : TEST_RATE_LIMITS;
const keyPrefix = shouldUseProductionLimits() ? 'ratelimit' : 'ratelimit:test';

// Per-minute rate limit
export const ratelimitPerMinute = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(limits.PER_MINUTE, '1 m'),
  analytics: true,
  prefix: `${keyPrefix}:minute`,
});

// Per-day rate limit
export const ratelimitPerDay = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(limits.PER_DAY, '1 d'),
  analytics: true,
  prefix: `${keyPrefix}:day`,
});

export async function checkRateLimit(userId: string): Promise<{
  allowed: boolean;
  minuteRemaining: number;
  dayRemaining: number;
  resetMinute: Date;
  resetDay: Date;
}> {
  const [minuteCheck, dayCheck] = await Promise.all([
    ratelimitPerMinute.limit(userId),
    ratelimitPerDay.limit(userId),
  ]);

  return {
    allowed: minuteCheck.success && dayCheck.success,
    minuteRemaining: minuteCheck.remaining,
    dayRemaining: dayCheck.remaining,
    resetMinute: new Date(minuteCheck.reset),
    resetDay: new Date(dayCheck.reset),
  };
}
