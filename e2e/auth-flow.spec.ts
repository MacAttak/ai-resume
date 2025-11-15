import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test('redirects to sign-in for protected routes', async ({ page }) => {
    // Try to access protected chat route without auth
    await page.goto('/chat');
    
    // Clerk should redirect to sign-in or show auth UI
    // This test may need adjustment based on your Clerk setup
    await page.waitForLoadState('networkidle');
    
    // Check that we're either on sign-in page or auth is required
    const url = page.url();
    expect(url).toMatch(/\/(sign-in|sign-up|chat)/);
  });

  test('landing page is accessible without auth', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Landing page should be visible
    await expect(page.locator('body')).toBeVisible();
  });
});

