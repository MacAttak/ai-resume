import { clerkSetup } from '@clerk/testing/playwright';
import { test as setup, expect } from '@playwright/test';

setup('authenticate with Clerk', async ({ page }) => {
  // First, obtain the testing token to bypass bot detection
  await clerkSetup();

  // Import the clerk helper
  const { clerk } = await import('@clerk/testing/playwright');

  // Navigate to an unprotected page (required before signIn)
  await page.goto('/');

  // Sign in using email_code strategy with Clerk test mode
  // Note: Test user must be created manually in Clerk Dashboard first
  await clerk.signIn({
    page,
    signInParams: {
      strategy: 'email_code',
      identifier: process.env.E2E_CLERK_TEST_EMAIL!,
    },
  });

  // clerk.signIn() redirects back to '/', so we need to navigate to the chat page
  await page.goto('/chat');
  await page.waitForLoadState('networkidle');

  // Verify we're actually signed in
  await expect(
    page.locator('h1:has-text("Chat with Daniel McCarthy")')
  ).toBeVisible();

  // Save the authenticated state for all tests to use
  await page.context().storageState({
    path: 'playwright/.clerk/user.json',
  });
});
