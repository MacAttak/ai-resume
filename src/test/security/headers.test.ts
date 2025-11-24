/**
 * Security Tests: Security Headers Configuration
 */

import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('Security Headers Configuration', () => {
  it('should have vercel.json configuration file', () => {
    const vercelConfigPath = path.join(process.cwd(), 'vercel.json');
    expect(fs.existsSync(vercelConfigPath)).toBe(true);
  });

  it('should include all required security headers in vercel.json', () => {
    const vercelConfigPath = path.join(process.cwd(), 'vercel.json');
    const vercelConfig = JSON.parse(fs.readFileSync(vercelConfigPath, 'utf-8'));

    expect(vercelConfig.headers).toBeDefined();
    expect(Array.isArray(vercelConfig.headers)).toBe(true);

    const headersConfig = vercelConfig.headers[0];
    expect(headersConfig.source).toBe('/(.*)');

    const headers = headersConfig.headers;
    const headerKeys = headers.map((h: any) => h.key);

    // Required security headers
    expect(headerKeys).toContain('X-Frame-Options');
    expect(headerKeys).toContain('X-Content-Type-Options');
    expect(headerKeys).toContain('Referrer-Policy');
    expect(headerKeys).toContain('Permissions-Policy');
    expect(headerKeys).toContain('Content-Security-Policy');
  });

  it('should have correct X-Frame-Options value', () => {
    const vercelConfigPath = path.join(process.cwd(), 'vercel.json');
    const vercelConfig = JSON.parse(fs.readFileSync(vercelConfigPath, 'utf-8'));

    const xFrameOptions = vercelConfig.headers[0].headers.find(
      (h: any) => h.key === 'X-Frame-Options'
    );

    expect(xFrameOptions).toBeDefined();
    expect(xFrameOptions.value).toBe('DENY');
  });

  it('should have correct X-Content-Type-Options value', () => {
    const vercelConfigPath = path.join(process.cwd(), 'vercel.json');
    const vercelConfig = JSON.parse(fs.readFileSync(vercelConfigPath, 'utf-8'));

    const xContentTypeOptions = vercelConfig.headers[0].headers.find(
      (h: any) => h.key === 'X-Content-Type-Options'
    );

    expect(xContentTypeOptions).toBeDefined();
    expect(xContentTypeOptions.value).toBe('nosniff');
  });

  it('should have Content-Security-Policy header', () => {
    const vercelConfigPath = path.join(process.cwd(), 'vercel.json');
    const vercelConfig = JSON.parse(fs.readFileSync(vercelConfigPath, 'utf-8'));

    const csp = vercelConfig.headers[0].headers.find(
      (h: any) => h.key === 'Content-Security-Policy'
    );

    expect(csp).toBeDefined();
    expect(csp.value).toContain("default-src 'self'");
    expect(csp.value).toContain("frame-ancestors 'none'");
  });

  it('should have restrictive Permissions-Policy', () => {
    const vercelConfigPath = path.join(process.cwd(), 'vercel.json');
    const vercelConfig = JSON.parse(fs.readFileSync(vercelConfigPath, 'utf-8'));

    const permissionsPolicy = vercelConfig.headers[0].headers.find(
      (h: any) => h.key === 'Permissions-Policy'
    );

    expect(permissionsPolicy).toBeDefined();
    expect(permissionsPolicy.value).toContain('geolocation=()');
    expect(permissionsPolicy.value).toContain('microphone=()');
    expect(permissionsPolicy.value).toContain('camera=()');
  });

  it('should have strict Referrer-Policy', () => {
    const vercelConfigPath = path.join(process.cwd(), 'vercel.json');
    const vercelConfig = JSON.parse(fs.readFileSync(vercelConfigPath, 'utf-8'));

    const referrerPolicy = vercelConfig.headers[0].headers.find(
      (h: any) => h.key === 'Referrer-Policy'
    );

    expect(referrerPolicy).toBeDefined();
    expect(referrerPolicy.value).toBe('strict-origin-when-cross-origin');
  });

  describe('CSP Third-Party Integration Support', () => {
    it('should allow Clerk worker-src for web workers', () => {
      const vercelConfigPath = path.join(process.cwd(), 'vercel.json');
      const vercelConfig = JSON.parse(
        fs.readFileSync(vercelConfigPath, 'utf-8')
      );

      const csp = vercelConfig.headers[0].headers.find(
        (h: any) => h.key === 'Content-Security-Policy'
      );

      expect(csp).toBeDefined();
      expect(csp.value).toContain("worker-src 'self' blob:");
    });

    it('should allow Cal.com scripts and frames', () => {
      const vercelConfigPath = path.join(process.cwd(), 'vercel.json');
      const vercelConfig = JSON.parse(
        fs.readFileSync(vercelConfigPath, 'utf-8')
      );

      const csp = vercelConfig.headers[0].headers.find(
        (h: any) => h.key === 'Content-Security-Policy'
      );

      expect(csp).toBeDefined();
      // Cal.com in script-src
      expect(csp.value).toContain('https://app.cal.com');
      expect(csp.value).toContain('https://cal.com');
      // Cal.com in frame-src
      expect(csp.value).toContain('frame-src');
      expect(csp.value).toContain('https://app.cal.com');
    });

    it('should allow Clerk images and Cloudflare challenges', () => {
      const vercelConfigPath = path.join(process.cwd(), 'vercel.json');
      const vercelConfig = JSON.parse(
        fs.readFileSync(vercelConfigPath, 'utf-8')
      );

      const csp = vercelConfig.headers[0].headers.find(
        (h: any) => h.key === 'Content-Security-Policy'
      );

      expect(csp).toBeDefined();
      // Clerk images
      expect(csp.value).toContain('https://img.clerk.com');
      // Cloudflare challenge frames for Clerk bot protection
      expect(csp.value).toContain('https://challenges.cloudflare.com');
    });

    it('should allow Vercel tooling in development/preview', () => {
      const vercelConfigPath = path.join(process.cwd(), 'vercel.json');
      const vercelConfig = JSON.parse(
        fs.readFileSync(vercelConfigPath, 'utf-8')
      );

      const csp = vercelConfig.headers[0].headers.find(
        (h: any) => h.key === 'Content-Security-Policy'
      );

      expect(csp).toBeDefined();
      expect(csp.value).toContain('https://vercel.live');
      expect(csp.value).toContain('https://va.vercel-scripts.com');
    });
  });
});
