/**
 * Security Tests: Security Headers Configuration
 */

import { describe, it, expect, beforeAll } from 'vitest';
import fs from 'fs';
import path from 'path';

// Shared helper functions to reduce code duplication
function getVercelConfig() {
  const vercelConfigPath = path.join(process.cwd(), 'vercel.json');
  return JSON.parse(fs.readFileSync(vercelConfigPath, 'utf-8'));
}

function getHeader(config: any, key: string) {
  return config.headers[0].headers.find((h: any) => h.key === key);
}

describe('Security Headers Configuration', () => {
  let vercelConfig: any;

  beforeAll(() => {
    vercelConfig = getVercelConfig();
  });

  it('should have vercel.json configuration file', () => {
    const vercelConfigPath = path.join(process.cwd(), 'vercel.json');
    expect(fs.existsSync(vercelConfigPath)).toBe(true);
  });

  it('should include all required security headers in vercel.json', () => {
    expect(vercelConfig.headers).toBeDefined();
    expect(Array.isArray(vercelConfig.headers)).toBe(true);

    const headersConfig = vercelConfig.headers[0];
    expect(headersConfig.source).toBe('/(.*)');

    const headerKeys = headersConfig.headers.map((h: any) => h.key);

    // Required security headers
    expect(headerKeys).toContain('X-Frame-Options');
    expect(headerKeys).toContain('X-Content-Type-Options');
    expect(headerKeys).toContain('Referrer-Policy');
    expect(headerKeys).toContain('Permissions-Policy');
    expect(headerKeys).toContain('Content-Security-Policy');
  });

  it('should have correct X-Frame-Options value', () => {
    const xFrameOptions = getHeader(vercelConfig, 'X-Frame-Options');
    expect(xFrameOptions).toBeDefined();
    expect(xFrameOptions.value).toBe('DENY');
  });

  it('should have correct X-Content-Type-Options value', () => {
    const xContentTypeOptions = getHeader(
      vercelConfig,
      'X-Content-Type-Options'
    );
    expect(xContentTypeOptions).toBeDefined();
    expect(xContentTypeOptions.value).toBe('nosniff');
  });

  it('should have Content-Security-Policy header', () => {
    const csp = getHeader(vercelConfig, 'Content-Security-Policy');
    expect(csp).toBeDefined();
    expect(csp.value).toContain("default-src 'self'");
    expect(csp.value).toContain("frame-ancestors 'none'");
  });

  it('should have restrictive Permissions-Policy', () => {
    const permissionsPolicy = getHeader(vercelConfig, 'Permissions-Policy');
    expect(permissionsPolicy).toBeDefined();
    expect(permissionsPolicy.value).toContain('geolocation=()');
    expect(permissionsPolicy.value).toContain('microphone=()');
    expect(permissionsPolicy.value).toContain('camera=()');
  });

  it('should have strict Referrer-Policy', () => {
    const referrerPolicy = getHeader(vercelConfig, 'Referrer-Policy');
    expect(referrerPolicy).toBeDefined();
    expect(referrerPolicy.value).toBe('strict-origin-when-cross-origin');
  });

  describe('CSP Third-Party Integration Support', () => {
    let csp: any;

    beforeAll(() => {
      csp = getHeader(vercelConfig, 'Content-Security-Policy');
    });

    it('should allow Clerk worker-src for web workers', () => {
      expect(csp).toBeDefined();
      expect(csp.value).toContain("worker-src 'self' blob:");
    });

    it('should allow Cal.com scripts and frames', () => {
      expect(csp).toBeDefined();
      expect(csp.value).toContain('https://app.cal.com');
      expect(csp.value).toContain('https://cal.com');
      expect(csp.value).toContain('frame-src');
    });

    it('should allow Clerk images and Cloudflare challenges', () => {
      expect(csp).toBeDefined();
      expect(csp.value).toContain('https://img.clerk.com');
      expect(csp.value).toContain('https://challenges.cloudflare.com');
    });

    it('should allow Vercel tooling in development/preview', () => {
      expect(csp).toBeDefined();
      expect(csp.value).toContain('https://vercel.live');
      expect(csp.value).toContain('https://va.vercel-scripts.com');
    });
  });
});
