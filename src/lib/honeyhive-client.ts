/**
 * HoneyHive REST Client - Session management WITHOUT OTel
 *
 * Uses the HoneyHive REST SDK directly, avoiding Traceloop/OTel conflicts.
 * The HoneyHiveTracer.init() causes OTel conflicts - this is the alternative.
 */

import { HoneyHive } from 'honeyhive';

let client: HoneyHive | null = null;

export function getHoneyHiveClient(): HoneyHive | null {
  if (!process.env.HONEYHIVE_API_KEY) return null;

  if (!client) {
    client = new HoneyHive({
      bearerAuth: process.env.HONEYHIVE_API_KEY,
    });
  }
  return client;
}

export interface SessionConfig {
  sessionName?: string;
  inputs?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  userProperties?: Record<string, unknown>;
}

/**
 * Start a new HoneyHive session using REST API
 */
export async function startSession(
  config: SessionConfig = {}
): Promise<string | null> {
  // Debug logging (safe - only logs boolean/existence, never actual secrets)
  console.log(
    '[HoneyHive Client] startSession:',
    JSON.stringify({
      apiKeyConfigured: !!process.env.HONEYHIVE_API_KEY,
      projectConfigured: !!process.env.HONEYHIVE_PROJECT,
    })
  );

  const hh = getHoneyHiveClient();

  if (!hh || !process.env.HONEYHIVE_PROJECT) {
    console.log('[HoneyHive Client] Aborting - missing client or project');
    return null;
  }

  try {
    const response = await hh.session.startSession({
      session: {
        project: process.env.HONEYHIVE_PROJECT,
        sessionName: config.sessionName || 'ai-resume-chat',
        source: process.env.VERCEL_ENV || 'development',
        inputs: config.inputs,
        metadata: config.metadata,
        userProperties: config.userProperties,
        startTime: Date.now(),
      },
    });
    console.log('[HoneyHive Client] Session created:', response.sessionId);
    return response.sessionId || null;
  } catch (error) {
    console.error('[HoneyHive Client] Failed to start session:', error);
    return null;
  }
}

/**
 * Update session with outputs/metrics using events.updateEvent()
 * (There's no session.updateSession() - sessions are events)
 */
export async function updateSession(
  sessionId: string,
  updates: {
    outputs?: Record<string, unknown>;
    metrics?: Record<string, unknown>;
    metadata?: Record<string, unknown>;
    duration?: number;
  }
): Promise<boolean> {
  const hh = getHoneyHiveClient();
  if (!hh) return false;

  try {
    await hh.events.updateEvent({
      eventId: sessionId,
      outputs: updates.outputs,
      metrics: updates.metrics,
      metadata: updates.metadata,
      duration: updates.duration,
    });
    return true;
  } catch (error) {
    console.error('[HoneyHive] Failed to update session:', error);
    return false;
  }
}
