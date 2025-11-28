/**
 * Secure structured logging utility following Vercel best practices
 *
 * Features:
 * - Structured JSON output for Vercel dashboard filtering
 * - Automatic PII sanitization for GDPR/CCPA compliance
 * - Environment-aware log levels (debug hidden in production)
 * - Context-specific loggers for different subsystems
 *
 * Based on Vercel's Pino logging recommendations and observability patterns.
 */

import { sanitizeLogData } from './sanitize';
export { sanitizeLogData };

type LogLevel = 'debug' | 'info' | 'warn' | 'error';
type LogContext = 'honeyhive' | 'cal' | 'agent' | 'api' | 'general';

interface LogOptions {
  context?: LogContext;
  skipSanitize?: boolean;
}

const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const MIN_LOG_LEVEL: LogLevel =
  process.env.NODE_ENV === 'production' ? 'info' : 'debug';

function shouldLog(level: LogLevel): boolean {
  return LOG_LEVEL_PRIORITY[level] >= LOG_LEVEL_PRIORITY[MIN_LOG_LEVEL];
}

function formatLog(
  level: LogLevel,
  message: string,
  data?: unknown,
  options?: LogOptions
): object {
  return {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...(options?.context && { context: options.context }),
    ...(data !== undefined && {
      data: options?.skipSanitize ? data : sanitizeLogData(data),
    }),
  };
}

/**
 * Secure structured logger with automatic PII sanitization
 */
export const logger = {
  /**
   * Log debug messages - only visible in development
   */
  debug: (message: string, data?: unknown, options?: LogOptions) => {
    if (shouldLog('debug')) {
      console.debug(JSON.stringify(formatLog('debug', message, data, options)));
    }
  },

  /**
   * Log informational messages
   */
  info: (message: string, data?: unknown, options?: LogOptions) => {
    if (shouldLog('info')) {
      console.log(JSON.stringify(formatLog('info', message, data, options)));
    }
  },

  /**
   * Log warning messages
   */
  warn: (message: string, data?: unknown, options?: LogOptions) => {
    if (shouldLog('warn')) {
      console.warn(JSON.stringify(formatLog('warn', message, data, options)));
    }
  },

  /**
   * Log error messages - preserves Error object details
   */
  error: (message: string, error?: unknown, options?: LogOptions) => {
    if (shouldLog('error')) {
      const errorData =
        error instanceof Error
          ? { name: error.name, message: error.message, stack: error.stack }
          : error;
      console.error(
        JSON.stringify(formatLog('error', message, errorData, options))
      );
    }
  },
};

/**
 * Context-specific logger for HoneyHive tracing operations
 */
export const honeyhiveLogger = {
  debug: (msg: string, data?: unknown) =>
    logger.debug(msg, data, { context: 'honeyhive' }),
  info: (msg: string, data?: unknown) =>
    logger.info(msg, data, { context: 'honeyhive' }),
  warn: (msg: string, data?: unknown) =>
    logger.warn(msg, data, { context: 'honeyhive' }),
  error: (msg: string, err?: unknown) =>
    logger.error(msg, err, { context: 'honeyhive' }),
};

/**
 * Context-specific logger for Cal.com integration
 */
export const calLogger = {
  debug: (msg: string, data?: unknown) =>
    logger.debug(msg, data, { context: 'cal' }),
  info: (msg: string, data?: unknown) =>
    logger.info(msg, data, { context: 'cal' }),
  warn: (msg: string, data?: unknown) =>
    logger.warn(msg, data, { context: 'cal' }),
  error: (msg: string, err?: unknown) =>
    logger.error(msg, err, { context: 'cal' }),
};

/**
 * Context-specific logger for Agent operations
 */
export const agentLogger = {
  debug: (msg: string, data?: unknown) =>
    logger.debug(msg, data, { context: 'agent' }),
  info: (msg: string, data?: unknown) =>
    logger.info(msg, data, { context: 'agent' }),
  warn: (msg: string, data?: unknown) =>
    logger.warn(msg, data, { context: 'agent' }),
  error: (msg: string, err?: unknown) =>
    logger.error(msg, err, { context: 'agent' }),
};

/**
 * Context-specific logger for API routes
 */
export const apiLogger = {
  debug: (msg: string, data?: unknown) =>
    logger.debug(msg, data, { context: 'api' }),
  info: (msg: string, data?: unknown) =>
    logger.info(msg, data, { context: 'api' }),
  warn: (msg: string, data?: unknown) =>
    logger.warn(msg, data, { context: 'api' }),
  error: (msg: string, err?: unknown) =>
    logger.error(msg, err, { context: 'api' }),
};
