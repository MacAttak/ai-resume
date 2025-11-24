/**
 * Security Tests: Environment Variable Security
 */

import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('Environment Variable Security', () => {
  describe('.gitignore configuration', () => {
    it('should have .gitignore file', () => {
      const gitignorePath = path.join(process.cwd(), '.gitignore');
      expect(fs.existsSync(gitignorePath)).toBe(true);
    });

    it('should ignore .env.local files', () => {
      const gitignorePath = path.join(process.cwd(), '.gitignore');
      const gitignoreContent = fs.readFileSync(gitignorePath, 'utf-8');

      expect(gitignoreContent).toContain('.env*.local');
    });

    it('should ignore .env files', () => {
      const gitignorePath = path.join(process.cwd(), '.gitignore');
      const gitignoreContent = fs.readFileSync(gitignorePath, 'utf-8');

      expect(gitignoreContent).toContain('.env');
    });

    it('should ignore .vercel directory', () => {
      const gitignorePath = path.join(process.cwd(), '.gitignore');
      const gitignoreContent = fs.readFileSync(gitignorePath, 'utf-8');

      expect(gitignoreContent).toContain('.vercel');
    });
  });

  describe('.env.example file', () => {
    it('should have .env.example file', () => {
      const envExamplePath = path.join(process.cwd(), '.env.example');
      expect(fs.existsSync(envExamplePath)).toBe(true);
    });

    it('should not contain actual secrets', () => {
      const envExamplePath = path.join(process.cwd(), '.env.example');
      const envExampleContent = fs.readFileSync(envExamplePath, 'utf-8');

      // Should not contain actual API keys or tokens (only check for patterns with real keys, not placeholders)
      expect(envExampleContent).not.toMatch(/sk-proj-[A-Za-z0-9]{20,}/); // OpenAI key pattern (20+ chars)
      expect(envExampleContent).not.toMatch(/sk_test_[A-Za-z0-9]{20,}/); // Clerk secret pattern (20+ chars)
      expect(envExampleContent).not.toMatch(/pk_test_[A-Za-z0-9]{20,}/); // Clerk publishable pattern (20+ chars)
      expect(envExampleContent).not.toMatch(/cal_live_[A-Za-z0-9]{20,}/); // Cal.com key pattern (20+ chars)

      // Should contain placeholders
      expect(envExampleContent).toContain('YOUR_KEY_HERE');
      expect(envExampleContent).toContain('YOUR_TOKEN');
    });

    it('should include all required environment variables', () => {
      const envExamplePath = path.join(process.cwd(), '.env.example');
      const envExampleContent = fs.readFileSync(envExamplePath, 'utf-8');

      const requiredVars = [
        'OPENAI_API_KEY',
        'OPENAI_PROJECT_ID',
        'OPENAI_VECTOR_STORE_ID',
        'NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY',
        'CLERK_SECRET_KEY',
        'UPSTASH_REDIS_REST_URL',
        'UPSTASH_REDIS_REST_TOKEN',
        'CAL_API_KEY',
        'CAL_EVENT_TYPE_ID_15MIN',
        'CAL_WEBHOOK_SECRET',
      ];

      for (const varName of requiredVars) {
        expect(envExampleContent).toContain(varName);
      }
    });
  });

  describe('Vector Store ID configuration', () => {
    it('should read VECTOR_STORE_ID from environment variable', () => {
      const agentConfigPath = path.join(
        process.cwd(),
        'src/lib/agent-config.ts'
      );
      const agentConfigContent = fs.readFileSync(agentConfigPath, 'utf-8');

      expect(agentConfigContent).toContain('process.env.OPENAI_VECTOR_STORE_ID');
    });

    it('should have fallback for VECTOR_STORE_ID', () => {
      const agentConfigPath = path.join(
        process.cwd(),
        'src/lib/agent-config.ts'
      );
      const agentConfigContent = fs.readFileSync(agentConfigPath, 'utf-8');

      // Should have fallback value
      expect(agentConfigContent).toContain('||');
    });
  });

  describe('package.json scripts', () => {
    it('should have env:pull script', () => {
      const packageJsonPath = path.join(process.cwd(), 'package.json');
      const packageJson = JSON.parse(
        fs.readFileSync(packageJsonPath, 'utf-8')
      );

      expect(packageJson.scripts['env:pull']).toBeDefined();
      expect(packageJson.scripts['env:pull']).toContain('vercel env pull');
    });

    it('should have env:pull:preview script', () => {
      const packageJsonPath = path.join(process.cwd(), 'package.json');
      const packageJson = JSON.parse(
        fs.readFileSync(packageJsonPath, 'utf-8')
      );

      expect(packageJson.scripts['env:pull:preview']).toBeDefined();
      expect(packageJson.scripts['env:pull:preview']).toContain(
        '--environment=preview'
      );
    });

    it('should have env:pull:production script', () => {
      const packageJsonPath = path.join(process.cwd(), 'package.json');
      const packageJson = JSON.parse(
        fs.readFileSync(packageJsonPath, 'utf-8')
      );

      expect(packageJson.scripts['env:pull:production']).toBeDefined();
      expect(packageJson.scripts['env:pull:production']).toContain(
        '--environment=production'
      );
    });
  });
});
