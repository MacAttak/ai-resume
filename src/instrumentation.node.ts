/**
 * Node.js-only instrumentation.
 * Next.js automatically loads this file only in the Node.js runtime,
 * keeping @openai/agents (which uses process.on) out of the Edge bundle.
 */
import { setTracingDisabled, startTraceExportLoop } from '@openai/agents';
import { initHoneyHiveExporter } from '@/lib/honeyhive-exporter';
import { honeyhiveLogger } from '@/lib/logger';

export async function register() {
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
    honeyhiveLogger.warn(
      'Exporter not initialized - missing HONEYHIVE_API_KEY or HONEYHIVE_PROJECT'
    );
  }
}
