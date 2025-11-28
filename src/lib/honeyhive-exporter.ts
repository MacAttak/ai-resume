/**
 * HoneyHive Tracing Exporter for @openai/agents SDK
 *
 * This module bridges the @openai/agents SDK's internal tracing system
 * with HoneyHive's observability platform by implementing a custom
 * TracingExporter that forwards spans to the HoneyHive API.
 *
 * The @openai/agents SDK has its own tracing system that does NOT emit
 * OpenTelemetry spans - it sends traces to OpenAI's dashboard by default.
 * This exporter intercepts those traces and sends them to HoneyHive.
 */

import {
  addTraceProcessor,
  BatchTraceProcessor,
  type Trace,
  type Span,
} from '@openai/agents';
// Import from sanitize directly to avoid circular dependency with logger -> instrumentation
import { sanitizeLogData } from './sanitize';
import { honeyhiveLogger } from './logger';

// Define span data types locally (these mirror the internal SDK types)
// The SDK exports Span<T> as a generic but the specific SpanData types are internal
type SpanDataBase = {
  type: string;
};

type GenerationSpanData = SpanDataBase & {
  type: 'generation';
  input?: Array<Record<string, unknown>>;
  output?: Array<Record<string, unknown>>;
  model?: string;
  model_config?: Record<string, unknown>;
  usage?: Record<string, unknown>;
};

type FunctionSpanData = SpanDataBase & {
  type: 'function';
  name: string;
  input: string;
  output: string;
};

type AgentSpanData = SpanDataBase & {
  type: 'agent';
  name: string;
  handoffs?: string[];
  tools?: string[];
};

type ResponseSpanData = SpanDataBase & {
  type: 'response';
  response_id?: string;
  _input?: string | Record<string, unknown>[];
  _response?: Record<string, unknown>;
};

type HandoffSpanData = SpanDataBase & {
  type: 'handoff';
  from_agent?: string;
  to_agent?: string;
};

type GuardrailSpanData = SpanDataBase & {
  type: 'guardrail';
  name: string;
  triggered: boolean;
};

// Union of all known span data types
type SpanData =
  | GenerationSpanData
  | FunctionSpanData
  | AgentSpanData
  | ResponseSpanData
  | HandoffSpanData
  | GuardrailSpanData
  | SpanDataBase;

// Type for items that can be exported (either Trace or Span)
// We use Span<any> because the SDK internally uses various span data types
// that may not match our local definitions exactly
type SpanOrTrace = Trace | Span<any>;

/**
 * TracingExporter interface from @openai/agents SDK
 * We implement this to intercept SDK traces
 */
interface TracingExporter {
  export(items: SpanOrTrace[], signal?: AbortSignal): Promise<void>;
}

/**
 * HoneyHive event structure for batch API
 * Based on CreateEventRequest schema from honeyhive SDK
 */
interface HoneyHiveEvent {
  project: string;
  source: string;
  event_name: string;
  event_type: 'model' | 'tool' | 'chain';
  event_id?: string;
  session_id?: string;
  parent_id?: string;
  config: Record<string, unknown>;
  inputs: Record<string, unknown>;
  outputs?: Record<string, unknown>;
  error?: string;
  start_time?: number; // UTC timestamp in milliseconds
  end_time?: number; // UTC timestamp in milliseconds
  duration: number; // Duration in milliseconds
  metadata?: Record<string, unknown>;
  metrics?: Record<string, unknown>;
}

/**
 * Custom exporter that forwards @openai/agents traces to HoneyHive
 */
export class HoneyHiveTracingExporter implements TracingExporter {
  private sessionId: string | undefined;
  private apiKey: string;
  private project: string;

  constructor() {
    this.apiKey = process.env.HONEYHIVE_API_KEY || '';
    this.project = process.env.HONEYHIVE_PROJECT || '';
  }

  /**
   * Set the HoneyHive session ID to link spans to
   * Must be called before export() to associate spans with a session
   */
  setSessionId(sessionId: string) {
    this.sessionId = sessionId;
    honeyhiveLogger.debug('Session ID set', { sessionId });
  }

  /**
   * Get current session ID (for debugging)
   */
  getSessionId(): string | undefined {
    return this.sessionId;
  }

  /**
   * Clear the session ID (called when session ends)
   */
  clearSessionId() {
    honeyhiveLogger.debug('Clearing session ID', {
      previousSessionId: this.sessionId,
    });
    this.sessionId = undefined;
  }

  /**
   * Export spans to HoneyHive API
   * Called by BatchTraceProcessor when spans are ready
   */
  async export(items: SpanOrTrace[], signal?: AbortSignal): Promise<void> {
    const itemTypes = items.map((item) => item.type);
    honeyhiveLogger.debug('Export called', {
      itemCount: items.length,
      sessionId: this.sessionId,
      itemTypes,
    });

    if (!this.sessionId) {
      honeyhiveLogger.warn('No session ID set - skipping export', {
        itemCount: items.length,
      });
      return;
    }

    if (!this.apiKey) {
      honeyhiveLogger.warn('No API key configured');
      return;
    }

    try {
      const events: HoneyHiveEvent[] = [];

      for (const item of items) {
        // Skip trace objects - we already have a HoneyHive session for the root
        if (item.type === 'trace') {
          honeyhiveLogger.debug('Skipping trace object');
          continue;
        }

        // Process span - use any for SDK compatibility
        const span = item as Span<any>;
        const spanData = span.spanData as SpanData;

        honeyhiveLogger.debug('Processing span', {
          type: spanData.type,
          traceId: span.traceId,
          spanId: span.spanId,
        });

        // Map SDK span type to HoneyHive event type
        const eventType = this.mapSpanType(spanData.type) as
          | 'model'
          | 'tool'
          | 'chain';
        const eventData = this.extractSpanData(spanData);

        // Parse timestamps - SDK provides ISO strings, API needs milliseconds
        const startTime = span.startedAt
          ? new Date(span.startedAt).getTime()
          : Date.now();
        const endTime = span.endedAt
          ? new Date(span.endedAt).getTime()
          : Date.now();
        const duration = endTime - startTime;

        events.push({
          project: this.project,
          source: process.env.VERCEL_ENV || 'development',
          event_name: eventData.name || spanData.type,
          event_type: eventType,
          event_id: span.spanId,
          session_id: this.sessionId,
          parent_id: span.parentId || this.sessionId,
          config: eventData.config || {},
          inputs: eventData.inputs || {},
          outputs: eventData.outputs,
          error: span.error?.message,
          start_time: startTime,
          end_time: endTime,
          duration: duration,
          metadata: {
            trace_id: span.traceId,
            span_type: spanData.type,
            ...eventData.metadata,
          },
          metrics: eventData.metrics,
        });
      }

      if (events.length > 0) {
        honeyhiveLogger.debug('Sending events to HoneyHive', {
          eventCount: events.length,
        });
        await this.sendToHoneyHive(events, signal);
      } else {
        honeyhiveLogger.debug('No events to send (all were traces)');
      }
    } catch (error) {
      honeyhiveLogger.error('Export failed', error);
    }
  }

  /**
   * Map @openai/agents span types to HoneyHive event types
   */
  private mapSpanType(sdkType: string): string {
    const typeMap: Record<string, string> = {
      agent: 'chain',
      generation: 'model',
      function: 'tool',
      response: 'model',
      handoff: 'chain',
      guardrail: 'chain',
      custom: 'chain',
      transcription: 'model',
      speech: 'model',
      speech_group: 'chain',
      mcp_tools: 'tool',
    };
    return typeMap[sdkType] || 'chain';
  }

  /**
   * Extract relevant data from span based on its type
   * All inputs and outputs are sanitized to remove PII before sending to HoneyHive
   */
  private extractSpanData(spanData: SpanData): {
    name?: string;
    inputs?: Record<string, unknown>;
    outputs?: Record<string, unknown>;
    config?: Record<string, unknown>;
    metrics?: Record<string, unknown>;
    metadata?: Record<string, unknown>;
  } {
    switch (spanData.type) {
      case 'generation': {
        const gen = spanData as GenerationSpanData;
        return {
          name: `${gen.model || 'llm'}-generation`,
          // Sanitize LLM inputs/outputs to remove any PII
          inputs: sanitizeLogData({ messages: gen.input }),
          outputs: sanitizeLogData({ response: gen.output }),
          config: { model: gen.model, ...gen.model_config },
          metrics: gen.usage
            ? {
                prompt_tokens: gen.usage.prompt_tokens,
                completion_tokens: gen.usage.completion_tokens,
                total_tokens: gen.usage.total_tokens,
              }
            : {},
        };
      }

      case 'function': {
        const fn = spanData as FunctionSpanData;
        return {
          name: fn.name,
          // Sanitize tool inputs/outputs
          inputs: sanitizeLogData({ input: fn.input }),
          outputs: sanitizeLogData({ output: fn.output }),
        };
      }

      case 'agent': {
        const agent = spanData as AgentSpanData;
        return {
          name: agent.name,
          config: { tools: agent.tools, handoffs: agent.handoffs },
        };
      }

      case 'response': {
        // ResponseSpanData has _input and _response for non-OpenAI providers
        const response = spanData as {
          type: 'response';
          response_id?: string;
          _input?: string | Record<string, unknown>[];
          _response?: Record<string, unknown>;
        };
        return {
          name: 'response',
          // Sanitize response inputs/outputs
          inputs: response._input
            ? sanitizeLogData({ input: response._input })
            : {},
          outputs: response._response
            ? sanitizeLogData({ response: response._response })
            : {},
          metadata: { response_id: response.response_id },
        };
      }

      case 'handoff': {
        const handoff = spanData as {
          type: 'handoff';
          from_agent?: string;
          to_agent?: string;
        };
        return {
          name: `handoff-${handoff.from_agent || 'unknown'}-to-${handoff.to_agent || 'unknown'}`,
          config: {
            from_agent: handoff.from_agent,
            to_agent: handoff.to_agent,
          },
        };
      }

      case 'guardrail': {
        const guardrail = spanData as {
          type: 'guardrail';
          name: string;
          triggered: boolean;
        };
        return {
          name: guardrail.name,
          outputs: { triggered: guardrail.triggered },
        };
      }

      default:
        return { name: spanData.type };
    }
  }

  /**
   * Send events to HoneyHive batch API
   */
  private async sendToHoneyHive(
    events: HoneyHiveEvent[],
    signal?: AbortSignal
  ): Promise<void> {
    honeyhiveLogger.debug('POST to HoneyHive API', {
      eventCount: events.length,
    });

    // Debug: log sample event payload in development/preview for diagnostics
    // Enable in preview to diagnose 500 errors from HoneyHive API
    if (
      (process.env.NODE_ENV !== 'production' ||
        process.env.VERCEL_ENV === 'preview') &&
      events.length > 0
    ) {
      honeyhiveLogger.debug('Sample event payload', events[0]);
    }

    const response = await fetch('https://api.honeyhive.ai/events/batch', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ events }),
      signal,
    });

    if (!response.ok) {
      const body = await response.text();
      honeyhiveLogger.error('API error', {
        status: response.status,
        body,
        eventCount: events.length,
      });
      throw new Error(`HoneyHive API error ${response.status}: ${body}`);
    }

    honeyhiveLogger.info('Successfully exported events', {
      eventCount: events.length,
    });
  }
}

// Singleton exporter instance
let exporter: HoneyHiveTracingExporter | null = null;
let initialized = false;

/**
 * Initialize the HoneyHive exporter and register it with @openai/agents
 * Should be called once during app initialization (in instrumentation.ts)
 */
export function initHoneyHiveExporter(): HoneyHiveTracingExporter | null {
  if (initialized) {
    honeyhiveLogger.debug('Already initialized, returning existing exporter');
    return exporter;
  }

  if (!process.env.HONEYHIVE_API_KEY) {
    honeyhiveLogger.warn('Not initialized - missing HONEYHIVE_API_KEY');
    return null;
  }

  exporter = new HoneyHiveTracingExporter();

  // Register with @openai/agents trace processor
  // This adds our exporter alongside the default OpenAI exporter
  addTraceProcessor(
    new BatchTraceProcessor(exporter as unknown as TracingExporter, {
      maxBatchSize: 10, // Batch up to 10 spans
      scheduleDelay: 1000, // Export every 1 second
    })
  );

  initialized = true;
  honeyhiveLogger.info('Exporter initialized and registered');

  return exporter;
}

/**
 * Get the singleton exporter instance
 */
export function getHoneyHiveExporter(): HoneyHiveTracingExporter | null {
  return exporter;
}
