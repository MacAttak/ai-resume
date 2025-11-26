/**
 * Secure logging utility with PII sanitization
 *
 * Automatically redacts sensitive information from logs to ensure
 * compliance with privacy regulations (GDPR, CCPA) and prevent
 * accidental exposure of personally identifiable information.
 *
 * Logs go to console only. HoneyHive tracing is handled separately
 * via the custom exporter in honeyhive-exporter.ts.
 */

// Import sanitizeLogData for internal use and re-export for consumers
import { sanitizeLogData } from './sanitize';
export { sanitizeLogData };

// REMOVED: import { getHoneyHiveTracer } from '@/instrumentation';
// REMOVED: sendToHoneyHive() function - was causing circular dependency issues
//          and HoneyHive tracing is now handled via SDK exporter

/**
 * Secure logger that automatically sanitizes PII before logging
 */
export const logger = {
  /**
   * Log informational messages with automatic PII sanitization
   */
  info: (message: string, data?: unknown) => {
    if (data !== undefined) {
      console.log(message, sanitizeLogData(data));
    } else {
      console.log(message);
    }
  },

  /**
   * Log error messages
   * Note: Error stack traces are preserved for debugging
   */
  error: (message: string, error?: unknown) => {
    const sanitizedError =
      error instanceof Error
        ? {
            name: error.name,
            message: error.message,
            stack: error.stack,
          }
        : sanitizeLogData(error);

    if (error !== undefined) {
      console.error(message, sanitizedError);
    } else {
      console.error(message);
    }
  },

  /**
   * Log warning messages with automatic PII sanitization
   */
  warn: (message: string, data?: unknown) => {
    if (data !== undefined) {
      console.warn(message, sanitizeLogData(data));
    } else {
      console.warn(message);
    }
  },

  /**
   * Log debug messages with automatic PII sanitization
   * Only logs in non-production environments
   */
  debug: (message: string, data?: unknown) => {
    if (process.env.NODE_ENV !== 'production') {
      if (data !== undefined) {
        console.debug(message, sanitizeLogData(data));
      } else {
        console.debug(message);
      }
    }
  },
};
