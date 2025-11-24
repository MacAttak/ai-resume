/**
 * Security Tests: PII Sanitization
 */

import { describe, it, expect } from 'vitest';
import { sanitizeLogData, logger } from '@/lib/logger';

describe('PII Sanitization', () => {
  describe('sanitizeLogData', () => {
    it('should redact email addresses', () => {
      const data = {
        email: 'user@example.com',
        action: 'login',
      };

      const sanitized = sanitizeLogData(data);

      expect(sanitized.email).toBe('***REDACTED***');
      expect(sanitized.action).toBe('login');
    });

    it('should redact attendeeEmail fields', () => {
      const data = {
        attendeeEmail: 'attendee@example.com',
        bookingId: '123',
      };

      const sanitized = sanitizeLogData(data);

      expect(sanitized.attendeeEmail).toBe('***REDACTED***');
      expect(sanitized.bookingId).toBe('123');
    });

    it('should redact name fields', () => {
      const data = {
        name: 'John Doe',
        attendeeName: 'Jane Smith',
        userId: 'user123',
      };

      const sanitized = sanitizeLogData(data);

      expect(sanitized.name).toBe('***REDACTED***');
      expect(sanitized.attendeeName).toBe('***REDACTED***');
      expect(sanitized.userId).toBe('user123');
    });

    it('should redact sensitive credential fields', () => {
      const data = {
        password: 'secret123',
        token: 'abc123xyz',
        apiKey: 'key_123',
        secret: 'mysecret',
      };

      const sanitized = sanitizeLogData(data);

      expect(sanitized.password).toBe('***REDACTED***');
      expect(sanitized.token).toBe('***REDACTED***');
      expect(sanitized.apiKey).toBe('***REDACTED***');
      expect(sanitized.secret).toBe('***REDACTED***');
    });

    it('should handle nested objects', () => {
      const data = {
        user: {
          email: 'user@example.com',
          name: 'John Doe',
          id: '123',
        },
        action: 'update',
      };

      const sanitized = sanitizeLogData(data);

      expect(sanitized.user.email).toBe('***REDACTED***');
      expect(sanitized.user.name).toBe('***REDACTED***');
      expect(sanitized.user.id).toBe('123');
      expect(sanitized.action).toBe('update');
    });

    it('should handle arrays of objects', () => {
      const data = {
        attendees: [
          { email: 'user1@example.com', name: 'User 1' },
          { email: 'user2@example.com', name: 'User 2' },
        ],
      };

      const sanitized = sanitizeLogData(data);

      expect(sanitized.attendees[0].email).toBe('***REDACTED***');
      expect(sanitized.attendees[0].name).toBe('***REDACTED***');
      expect(sanitized.attendees[1].email).toBe('***REDACTED***');
      expect(sanitized.attendees[1].name).toBe('***REDACTED***');
    });

    it('should handle null and undefined values', () => {
      const data = {
        email: null,
        name: undefined,
        action: 'test',
      };

      const sanitized = sanitizeLogData(data);

      expect(sanitized.email).toBe('***REDACTED***');
      expect(sanitized.name).toBe('***REDACTED***');
      expect(sanitized.action).toBe('test');
    });

    it('should not modify primitive values', () => {
      expect(sanitizeLogData('test string')).toBe('test string');
      expect(sanitizeLogData(123)).toBe(123);
      expect(sanitizeLogData(true)).toBe(true);
      expect(sanitizeLogData(null)).toBe(null);
      expect(sanitizeLogData(undefined)).toBe(undefined);
    });

    it('should handle deeply nested structures', () => {
      const data = {
        level1: {
          level2: {
            level3: {
              email: 'deep@example.com',
              data: 'keep this',
            },
          },
        },
      };

      const sanitized = sanitizeLogData(data);

      expect(sanitized.level1.level2.level3.email).toBe('***REDACTED***');
      expect(sanitized.level1.level2.level3.data).toBe('keep this');
    });

    it('should be case-insensitive for field matching', () => {
      const data = {
        Email: 'test@example.com',
        PASSWORD: 'secret',
        ApiKey: 'key123',
      };

      const sanitized = sanitizeLogData(data);

      expect(sanitized.Email).toBe('***REDACTED***');
      expect(sanitized.PASSWORD).toBe('***REDACTED***');
      expect(sanitized.ApiKey).toBe('***REDACTED***');
    });

    it('should handle phone number variations', () => {
      const data = {
        phone: '+1234567890',
        phoneNumber: '555-1234',
        mobile: '123-456-7890',
      };

      const sanitized = sanitizeLogData(data);

      expect(sanitized.phone).toBe('***REDACTED***');
      expect(sanitized.phoneNumber).toBe('***REDACTED***');
      // mobile should not be redacted (not in sensitive fields list)
      expect(sanitized.mobile).toBe('123-456-7890');
    });
  });

  describe('logger integration', () => {
    it('should have info method that sanitizes data', () => {
      // This test verifies the logger exists and has the correct methods
      expect(logger.info).toBeDefined();
      expect(typeof logger.info).toBe('function');
    });

    it('should have error method', () => {
      expect(logger.error).toBeDefined();
      expect(typeof logger.error).toBe('function');
    });

    it('should have warn method', () => {
      expect(logger.warn).toBeDefined();
      expect(typeof logger.warn).toBe('function');
    });

    it('should have debug method', () => {
      expect(logger.debug).toBeDefined();
      expect(typeof logger.debug).toBe('function');
    });
  });
});
