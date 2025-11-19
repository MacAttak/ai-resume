'use client';

import { Badge } from './ui/badge';
import { RATE_LIMITS } from '@/lib/constants';

export function UsageDisplay({
  usage,
}: {
  usage: { minuteRemaining: number; dayRemaining: number };
}) {
  const variant = usage.dayRemaining < 20 ? 'destructive' : 'secondary';

  return (
    <Badge variant={variant} className="text-xs">
      {usage.dayRemaining} / {RATE_LIMITS.PER_DAY} messages today
    </Badge>
  );
}
