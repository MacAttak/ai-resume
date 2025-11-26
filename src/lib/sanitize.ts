/**
 * PII sanitization utility
 *
 * Automatically redacts sensitive information to ensure
 * compliance with privacy regulations (GDPR, CCPA) and prevent
 * accidental exposure of personally identifiable information.
 */

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
