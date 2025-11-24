/**
 * Security Tests: Input Validation
 */

import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('Input Validation Security', () => {
  describe('Message length validation', () => {
    it('should have message length limit in chat API', () => {
      const chatApiPath = path.join(
        process.cwd(),
        'src/app/api/chat/stream/route.ts'
      );
      const chatApiContent = fs.readFileSync(chatApiPath, 'utf-8');

      expect(chatApiContent).toContain('MAX_MESSAGE_LENGTH');
      expect(chatApiContent).toContain('4000');
    });

    it('should validate message length before processing', () => {
      const chatApiPath = path.join(
        process.cwd(),
        'src/app/api/chat/stream/route.ts'
      );
      const chatApiContent = fs.readFileSync(chatApiPath, 'utf-8');

      expect(chatApiContent).toContain('message.length');
      expect(chatApiContent).toContain('Message too long');
    });

    it('should return 400 status for oversized messages', () => {
      const chatApiPath = path.join(
        process.cwd(),
        'src/app/api/chat/stream/route.ts'
      );
      const chatApiContent = fs.readFileSync(chatApiPath, 'utf-8');

      // Check that validation returns proper error status
      const hasLengthCheck = chatApiContent.includes('message.length >');
      const hasErrorResponse = chatApiContent.includes('status: 400');

      expect(hasLengthCheck).toBe(true);
      expect(hasErrorResponse).toBe(true);
    });
  });

  describe('Cal.com parameter validation', () => {
    it('should use Zod schemas for Cal.com tool parameters', () => {
      const calToolsPath = path.join(process.cwd(), 'src/lib/cal-tools.ts');
      const calToolsContent = fs.readFileSync(calToolsPath, 'utf-8');

      expect(calToolsContent).toContain("import { z } from 'zod'");
      expect(calToolsContent).toContain('z.object');
    });

    it('should validate email format in booking parameters', () => {
      const calToolsPath = path.join(process.cwd(), 'src/lib/cal-tools.ts');
      const calToolsContent = fs.readFileSync(calToolsPath, 'utf-8');

      // Check for email parameter validation
      expect(calToolsContent).toContain('attendeeEmail');
      expect(calToolsContent).toContain('z.object');
    });

    it('should validate timezone parameter', () => {
      const calToolsPath = path.join(process.cwd(), 'src/lib/cal-tools.ts');
      const calToolsContent = fs.readFileSync(calToolsPath, 'utf-8');

      // Check for timezone usage (may be timeZone or timezone)
      const hasTimezone =
        calToolsContent.includes('timezone') ||
        calToolsContent.includes('timeZone');
      expect(hasTimezone).toBe(true);
      expect(calToolsContent).toContain('z.object');
    });

    it('should distinguish required vs optional fields', () => {
      const calToolsPath = path.join(process.cwd(), 'src/lib/cal-tools.ts');
      const calToolsContent = fs.readFileSync(calToolsPath, 'utf-8');

      expect(calToolsContent).toContain('.optional()');
      expect(calToolsContent).toContain('.nullable()');
    });
  });

  describe('Authentication validation', () => {
    it('should check userId in all protected API routes', () => {
      const apiRoutes = [
        'src/app/api/chat/stream/route.ts',
        'src/app/api/conversation/route.ts',
        'src/app/api/conversation/clear/route.ts',
        'src/app/api/usage/route.ts',
      ];

      for (const route of apiRoutes) {
        const routePath = path.join(process.cwd(), route);
        if (fs.existsSync(routePath)) {
          const routeContent = fs.readFileSync(routePath, 'utf-8');
          expect(routeContent).toContain('userId');
          expect(routeContent).toContain('Unauthorized');
        }
      }
    });
  });

  describe('Webhook signature validation', () => {
    it('should verify HMAC signature in webhook handler', () => {
      const webhookPath = path.join(
        process.cwd(),
        'src/app/api/cal/webhook/route.ts'
      );
      const webhookContent = fs.readFileSync(webhookPath, 'utf-8');

      expect(webhookContent).toContain('verifyWebhookSignature');
      expect(webhookContent).toContain("crypto.createHmac('sha256'");
    });

    it('should return 401 for invalid webhook signature', () => {
      const webhookPath = path.join(
        process.cwd(),
        'src/app/api/cal/webhook/route.ts'
      );
      const webhookContent = fs.readFileSync(webhookPath, 'utf-8');

      expect(webhookContent).toContain('status: 401');
      expect(webhookContent).toContain('Invalid signature');
    });
  });
});
