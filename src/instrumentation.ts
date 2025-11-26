import { registerOTel } from '@vercel/otel';
import { setTracingDisabled, startTraceExportLoop } from '@openai/agents';
import { initHoneyHiveExporter } from '@/lib/honeyhive-exporter';

// REMOVED: HoneyHiveTracer import - causes OTel conflicts via Traceloop
// REMOVED: honeyHiveTracer variable
// REMOVED: getHoneyHiveTracer() export

export async function register() {
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

      console.log('[HoneyHive] REST-based exporter initialized successfully');
    } catch (error) {
      console.error('[HoneyHive] Failed to initialize exporter:', error);
    }
  } else {
    console.log(
      '[HoneyHive] Exporter not initialized - missing HONEYHIVE_API_KEY or HONEYHIVE_PROJECT'
    );
  }
}
