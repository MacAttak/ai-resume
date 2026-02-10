import { registerOTel } from '@vercel/otel';
import { logger } from '@/lib/logger';

export async function register() {
  logger.info('Instrumentation register() called');

  // Keep Vercel OpenTelemetry for HTTP/request tracing
  registerOTel({
    serviceName: 'ai-resume',
  });

  // Node.js-only tracing setup is in instrumentation.node.ts
  // Next.js automatically loads it only in the Node.js runtime
}
