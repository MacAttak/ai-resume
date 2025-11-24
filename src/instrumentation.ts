import { registerOTel } from '@vercel/otel';
import { HoneyHiveTracer } from 'honeyhive';

// Initialize HoneyHive tracer globally if API key is available
let honeyHiveTracer: HoneyHiveTracer | null = null;

export function register() {
  // Register Vercel OpenTelemetry
  registerOTel({
    serviceName: 'ai-resume',
  });

  // Initialize HoneyHive tracer for production tracing
  if (process.env.HONEYHIVE_API_KEY && process.env.HONEYHIVE_PROJECT) {
    try {
      honeyHiveTracer = new HoneyHiveTracer({
        apiKey: process.env.HONEYHIVE_API_KEY,
        project: process.env.HONEYHIVE_PROJECT,
        serverUrl: 'https://api.honeyhive.ai',
        source: 'production',
        verbose: process.env.NODE_ENV === 'development',
        disableBatch: false,
      });

      console.log('[HoneyHive] Tracer initialized successfully');
    } catch (error) {
      console.error('[HoneyHive] Failed to initialize tracer:', error);
    }
  } else {
    console.log(
      '[HoneyHive] Tracer not initialized - missing HONEYHIVE_API_KEY or HONEYHIVE_PROJECT'
    );
  }
}

/**
 * Get the HoneyHive tracer instance
 * @returns HoneyHiveTracer instance or null if not initialized
 */
export function getHoneyHiveTracer(): HoneyHiveTracer | null {
  return honeyHiveTracer;
}
