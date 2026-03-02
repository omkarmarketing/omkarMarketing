import { test, expect } from '@playwright/test';

test.describe('Invoice Generation Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should toggle manual mode and show manual fields', async ({ page }) => {
    // Check if we are on the right page
    await expect(page.getByText(/Generate Brokerage Invoice/i)).toBeVisible();

    // Toggle Manual Mode
    const manualCheckbox = page.locator('input[type="checkbox"]');
    await manualCheckbox.check();

    // Verify manual fields appear
    await expect(page.getByLabel(/Custom Description/i)).toBeVisible();
    await expect(page.getByLabel(/Total Amount/i)).toBeVisible();
    await expect(page.getByLabel(/Invoice Date/i)).toBeVisible();
  });

  test('should validate manual mode fields', async ({ page }) => {
    const manualCheckbox = page.locator('input[type="checkbox"]');
    await manualCheckbox.check();

    // Fill company name
    await page.fill('input[placeholder="Search company..."]', 'Test Company');
    
    // Attempt to download without description
    await page.click('button:has-text("Download Invoice")');

    // Should see validation error (depending on implementation, usually toast or inline)
    // For now, check if we stay on same page and button is still there
    await expect(page.getByText(/Description is required/i)).toBeVisible();
  });
});
