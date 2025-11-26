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
 */
interface HoneyHiveEvent {
  project: string;
  session_id: string;
  parent_id: string;
  event_type: string;
  event_name: string;
  inputs: Record<string, unknown>;
  outputs: Record<string, unknown>;
  config: Record<string, unknown>;
  metrics: Record<string, unknown>;
  start_time: string | null;
  end_time: string | null;
  error?: string;
  metadata: Record<string, unknown>;
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
    console.log(`[HoneyHive Exporter] Session ID set: ${sessionId}`);
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
    console.log(
      `[HoneyHive Exporter] Clearing session ID (was: ${this.sessionId})`
    );
    this.sessionId = undefined;
  }

  /**
   * Export spans to HoneyHive API
   * Called by BatchTraceProcessor when spans are ready
   */
  async export(items: SpanOrTrace[], signal?: AbortSignal): Promise<void> {
    console.log(
      `[HoneyHive Exporter] export() called with ${items.length} items, sessionId: ${this.sessionId}`
    );

    // Log item types for debugging
    const itemTypes = items.map((item) => item.type);
    console.log(
      `[HoneyHive Exporter] Item types: ${JSON.stringify(itemTypes)}`
    );

    if (!this.sessionId) {
      console.warn(
        '[HoneyHive Exporter] No session ID set - skipping export of',
        items.length,
        'items'
      );
      return;
    }

    if (!this.apiKey) {
      console.warn('[HoneyHive Exporter] No API key configured');
      return;
    }

    try {
      const events: HoneyHiveEvent[] = [];

      for (const item of items) {
        // Skip trace objects - we already have a HoneyHive session for the root
        if (item.type === 'trace') {
          console.log('[HoneyHive Exporter] Skipping trace object');
          continue;
        }

        // Process span - use any for SDK compatibility
        const span = item as Span<any>;
        const spanData = span.spanData as SpanData;

        console.log(
          `[HoneyHive Exporter] Processing span: type=${spanData.type}, traceId=${span.traceId}, spanId=${span.spanId}`
        );

        // Map SDK span type to HoneyHive event type
        const eventType = this.mapSpanType(spanData.type);
        const eventData = this.extractSpanData(spanData);

        events.push({
          project: this.project,
          session_id: this.sessionId,
          parent_id: span.parentId || this.sessionId,
          event_type: eventType,
          event_name: eventData.name || spanData.type,
          inputs: eventData.inputs || {},
          outputs: eventData.outputs || {},
          config: eventData.config || {},
          metrics: eventData.metrics || {},
          start_time: span.startedAt,
          end_time: span.endedAt,
          error: span.error?.message,
          metadata: {
            trace_id: span.traceId,
            span_id: span.spanId,
            span_type: spanData.type,
          },
        });
      }

      if (events.length > 0) {
        console.log(
          `[HoneyHive Exporter] Sending ${events.length} events to HoneyHive`
        );
        await this.sendToHoneyHive(events, signal);
      } else {
        console.log('[HoneyHive Exporter] No events to send (all were traces)');
      }
    } catch (error) {
      console.error('[HoneyHive Exporter] Export failed:', error);
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
    console.log(
      `[HoneyHive Exporter] POST to HoneyHive API with ${events.length} events`
    );

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
      console.error(
        `[HoneyHive Exporter] API error ${response.status}: ${body}`
      );
      throw new Error(`HoneyHive API error ${response.status}: ${body}`);
    }

    console.log(
      `[HoneyHive Exporter] Successfully exported ${events.length} events`
    );
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
    return exporter;
  }

  if (!process.env.HONEYHIVE_API_KEY) {
    console.log(
      '[HoneyHive Exporter] Not initialized - missing HONEYHIVE_API_KEY'
    );
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
  console.log('[HoneyHive Exporter] Initialized and registered');

  return exporter;
}

/**
 * Get the singleton exporter instance
 */
export function getHoneyHiveExporter(): HoneyHiveTracingExporter | null {
  return exporter;
}
