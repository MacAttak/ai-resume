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

const SENSITIVE_FIELDS = [
  'email',
  'attendeeemail',
  'phone',
  'phonenumber',
  'name',
  'attendeename',
  'password',
  'token',
  'secret',
  'apikey',
  'authorization',
  'cookie',
  'session',
];

/**
 * Recursively sanitizes an object by redacting sensitive fields
 *
 * @param data - The data object to sanitize
 * @returns Sanitized copy of the data with sensitive fields redacted
 */
export function sanitizeLogData(data: any): any {
  if (data === null || data === undefined) {
    return data;
  }

  if (typeof data !== 'object') {
    return data;
  }

  // Handle arrays
  if (Array.isArray(data)) {
    return data.map((item) => sanitizeLogData(item));
  }

  // Handle objects
  const sanitized: Record<string, any> = {};

  for (const key in data) {
    if (!Object.prototype.hasOwnProperty.call(data, key)) {
      continue;
    }

    const lowerKey = key.toLowerCase();

    // Check if the key contains any sensitive field name
    const isSensitive = SENSITIVE_FIELDS.some((field) =>
      lowerKey.includes(field)
    );

    if (isSensitive) {
      sanitized[key] = '***REDACTED***';
    } else if (typeof data[key] === 'object' && data[key] !== null) {
      // Recursively sanitize nested objects
      sanitized[key] = sanitizeLogData(data[key]);
    } else {
      sanitized[key] = data[key];
    }
  }

  return sanitized;
}

/**
 * Send log event to HoneyHive for centralized observability
 */
async function sendToHoneyHive(
  level: 'info' | 'warn' | 'error' | 'debug',
  message: string,
  data?: any
) {
  try {
    const tracer = getHoneyHiveTracer();
    if (!tracer) {
      return; // HoneyHive not configured
    }

    // Create a log event
    await tracer.enrichEvent({
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
    // Send to HoneyHive asynchronously (don't await to avoid blocking)
    sendToHoneyHive('info', message, data).catch(() => {});
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
    // Send to HoneyHive asynchronously
    sendToHoneyHive('error', message, sanitizedError).catch(() => {});
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
    // Send to HoneyHive asynchronously
    sendToHoneyHive('warn', message, data).catch(() => {});
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
      sendToHoneyHive('debug', message, data).catch(() => {});
    }
  },
};
