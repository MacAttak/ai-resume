/**
 * Secure logging utility with PII sanitization
 *
 * Automatically redacts sensitive information from logs to ensure
 * compliance with privacy regulations (GDPR, CCPA) and prevent
 * accidental exposure of personally identifiable information.
 *
 * Logs are sent to both console and HoneyHive (if configured) for
 * centralized observability and analysis.
 */

import { getHoneyHiveTracer } from '@/instrumentation';
// Import sanitizeLogData for internal use and re-export for consumers
import { sanitizeLogData } from './sanitize';
export { sanitizeLogData };

/**
 * Send log event to HoneyHive for centralized observability
 */
function sendToHoneyHive(
  level: 'info' | 'warn' | 'error' | 'debug',
  message: string,
  data?: any
) {
  try {
    const tracer = getHoneyHiveTracer();
    if (!tracer) {
      return; // HoneyHive not configured
    }

    // Create a log event using enrichSpan (synchronous)
    tracer.enrichSpan({
      eventName: `log.${level}`,
      metadata: {
        level,
        message,
        timestamp: new Date().toISOString(),
        ...(data && { data: sanitizeLogData(data) }),
      },
    });
  } catch (error) {
    // Silently fail - don't break logging if HoneyHive is down
    console.error('[HoneyHive] Failed to send log:', error);
  }
}

/**
 * Secure logger that automatically sanitizes PII before logging
 */
export const logger = {
  /**
   * Log informational messages with automatic PII sanitization
   */
  info: (message: string, data?: any) => {
    if (data !== undefined) {
      console.log(message, sanitizeLogData(data));
    } else {
      console.log(message);
    }
    // Send to HoneyHive (synchronous, non-blocking)
    sendToHoneyHive('info', message, data);
  },

  /**
   * Log error messages
   * Note: Error stack traces are preserved for debugging
   */
  error: (message: string, error?: any) => {
    const sanitizedError =
      error instanceof Error
        ? {
            name: error.name,
            message: error.message,
            stack: error.stack,
          }
        : sanitizeLogData(error);

    if (error instanceof Error) {
      console.error(message, sanitizedError);
    } else if (error !== undefined) {
      console.error(message, sanitizedError);
    } else {
      console.error(message);
    }
    // Send to HoneyHive
    sendToHoneyHive('error', message, sanitizedError);
  },

  /**
   * Log warning messages with automatic PII sanitization
   */
  warn: (message: string, data?: any) => {
    if (data !== undefined) {
      console.warn(message, sanitizeLogData(data));
    } else {
      console.warn(message);
    }
    // Send to HoneyHive
    sendToHoneyHive('warn', message, data);
  },

  /**
   * Log debug messages with automatic PII sanitization
   * Only logs in non-production environments
   */
  debug: (message: string, data?: any) => {
    if (process.env.NODE_ENV !== 'production') {
      if (data !== undefined) {
        console.debug(message, sanitizeLogData(data));
      } else {
        console.debug(message);
      }
      // Send to HoneyHive in development too
      sendToHoneyHive('debug', message, data);
    }
  },
};
