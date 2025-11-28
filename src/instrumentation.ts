import { registerOTel } from '@vercel/otel';
import { setTracingDisabled, startTraceExportLoop } from '@openai/agents';
import { initHoneyHiveExporter } from '@/lib/honeyhive-exporter';
import { honeyhiveLogger, logger } from '@/lib/logger';

export async function register() {
  logger.info('Instrumentation register() called');

  // Keep Vercel OpenTelemetry for HTTP/request tracing
  registerOTel({
    serviceName: 'ai-resume',
  });

  // Initialize HoneyHive via REST API (no OTel conflicts)
  if (process.env.HONEYHIVE_API_KEY && process.env.HONEYHIVE_PROJECT) {
    try {
      // Enable @openai/agents SDK tracing
      setTracingDisabled(false);

      // Initialize custom exporter (bridges SDK traces to HoneyHive REST API)
      initHoneyHiveExporter();

      // Start the trace export loop
      startTraceExportLoop();

      honeyhiveLogger.info('REST-based exporter initialized successfully');
    } catch (error) {
      honeyhiveLogger.error('Failed to initialize exporter', error);
    }
  } else {
    honeyhiveLogger.warn('Exporter not initialized - missing HONEYHIVE_API_KEY or HONEYHIVE_PROJECT');
  }
}
