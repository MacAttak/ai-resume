import { test, expect } from '@playwright/test';

test.describe('Chat Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Mock authentication - Clerk will handle this in real app
    await page.goto('/chat');
    
    // Wait for page to load
    await page.waitForLoadState('networkidle');
  });

  test('displays chat interface with empty state', async ({ page }) => {
    await expect(page.locator('h1:has-text("Chat with Daniel McCarthy")')).toBeVisible();
    await expect(page.locator('text=Start a conversation')).toBeVisible();
    await expect(page.locator('text=What data platforms have you worked with?')).toBeVisible();
  });

  test('user can send message and receive response', async ({ page }) => {
    // Mock the API response
    await page.route('**/api/chat', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          response: 'I have extensive experience with enterprise data platforms including Snowflake, Teradata, and Azure Data Lake.',
          usage: {
            minuteRemaining: 9,
            dayRemaining: 99,
          },
        }),
      });
    });

    // Type and send message
    const input = page.locator('textarea[placeholder*="Type your message"]');
    await input.fill('What data platforms have you worked with?');
    await page.locator('button:has-text("Send")').click();

    // Wait for response
    await expect(page.locator('text=I have extensive experience')).toBeVisible({ timeout: 5000 });
  });

  test('displays error message on API failure', async ({ page }) => {
    await page.route('**/api/chat', async route => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'Internal server error',
        }),
      });
    });

    const input = page.locator('textarea[placeholder*="Type your message"]');
    await input.fill('Test message');
    await page.locator('button:has-text("Send")').click();

    await expect(page.locator('text=Internal server error')).toBeVisible({ timeout: 5000 });
  });

  test('displays rate limit error correctly', async ({ page }) => {
    await page.route('**/api/chat', async route => {
      await route.fulfill({
        status: 429,
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'Rate limit exceeded',
          dayRemaining: 45,
        }),
      });
    });

    const input = page.locator('textarea[placeholder*="Type your message"]');
    await input.fill('Test message');
    await page.locator('button:has-text("Send")').click();

    await expect(page.locator('text=Rate limit exceeded')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=45 messages remaining today')).toBeVisible();
  });

  test('can clear conversation', async ({ page }) => {
    // First send a message
    await page.route('**/api/chat', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          response: 'Test response',
          usage: { minuteRemaining: 9, dayRemaining: 99 },
        }),
      });
    });

    const input = page.locator('textarea[placeholder*="Type your message"]');
    await input.fill('Test message');
    await page.locator('button:has-text("Send")').click();

    await expect(page.locator('text=Test response')).toBeVisible();

    // Mock clear endpoint
    await page.route('**/api/conversation/clear', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true }),
      });
    });

    // Clear conversation
    await page.locator('button:has-text("Clear Chat")').click();

    // Should return to empty state
    await expect(page.locator('text=Start a conversation')).toBeVisible();
  });

  test('suggested questions populate input', async ({ page }) => {
    const suggestion = page.locator('button:has-text("What data platforms have you worked with?")');
    await suggestion.click();

    const input = page.locator('textarea[placeholder*="Type your message"]');
    await expect(input).toHaveValue('What data platforms have you worked with?');
  });

  test('usage display updates after sending message', async ({ page }) => {
    await page.route('**/api/chat', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          response: 'Response',
          usage: {
            minuteRemaining: 5,
            dayRemaining: 50,
          },
        }),
      });
    });

    const input = page.locator('textarea[placeholder*="Type your message"]');
    await input.fill('Test message');
    await page.locator('button:has-text("Send")').click();

    // Wait for usage to update
    await expect(page.locator('text=/\\d+ \\/ 100 messages today/')).toBeVisible();
  });
});

