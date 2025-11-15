import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Ratelimit } from '@upstash/ratelimit';
import { kv } from '@vercel/kv';

vi.mock('@vercel/kv');
vi.mock('@upstash/ratelimit');

// Import after mocks
import { checkRateLimit, ratelimitPerMinute, ratelimitPerDay } from '../rate-limit';

describe('checkRateLimit', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('allows request when both limits are not exceeded', async () => {
    (ratelimitPerMinute.limit as any) = vi.fn().mockResolvedValue({
      success: true,
      limit: 10,
      remaining: 5,
      reset: Date.now() + 60000,
    });
    (ratelimitPerDay.limit as any) = vi.fn().mockResolvedValue({
      success: true,
      limit: 100,
      remaining: 50,
      reset: Date.now() + 86400000,
    });

    const result = await checkRateLimit('user-123');

    expect(result.allowed).toBe(true);
    expect(result.minuteRemaining).toBe(5);
    expect(result.dayRemaining).toBe(50);
  });

  it('denies request when minute limit is exceeded', async () => {
    (ratelimitPerMinute.limit as any) = vi.fn().mockResolvedValue({
      success: false,
      limit: 10,
      remaining: 0,
      reset: Date.now() + 60000,
    });
    (ratelimitPerDay.limit as any) = vi.fn().mockResolvedValue({
      success: true,
      limit: 100,
      remaining: 50,
      reset: Date.now() + 86400000,
    });

    const result = await checkRateLimit('user-123');

    expect(result.allowed).toBe(false);
    expect(result.minuteRemaining).toBe(0);
  });

  it('denies request when day limit is exceeded', async () => {
    (ratelimitPerMinute.limit as any) = vi.fn().mockResolvedValue({
      success: true,
      limit: 10,
      remaining: 5,
      reset: Date.now() + 60000,
    });
    (ratelimitPerDay.limit as any) = vi.fn().mockResolvedValue({
      success: false,
      limit: 100,
      remaining: 0,
      reset: Date.now() + 86400000,
    });

    const result = await checkRateLimit('user-123');

    expect(result.allowed).toBe(false);
    expect(result.dayRemaining).toBe(0);
  });

  it('returns correct reset times', async () => {
    const minuteReset = Date.now() + 60000;
    const dayReset = Date.now() + 86400000;

    (ratelimitPerMinute.limit as any) = vi.fn().mockResolvedValue({
      success: true,
      limit: 10,
      remaining: 5,
      reset: minuteReset,
    });
    (ratelimitPerDay.limit as any) = vi.fn().mockResolvedValue({
      success: true,
      limit: 100,
      remaining: 50,
      reset: dayReset,
    });

    const result = await checkRateLimit('user-123');

    expect(result.resetMinute).toBeInstanceOf(Date);
    expect(result.resetDay).toBeInstanceOf(Date);
    expect(result.resetMinute.getTime()).toBe(minuteReset);
    expect(result.resetDay.getTime()).toBe(dayReset);
  });
});

