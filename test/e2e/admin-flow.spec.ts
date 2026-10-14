import { test, expect } from '@playwright/test';

test.describe('End-to-End Admin Authentication & Backoffice Flow', () => {
  test('authenticates admin and verifies backoffice KPI dashboard', async ({ page }) => {
    // 1. Visit Login
    await page.goto('/login');
    await expect(page.locator('h1')).toContainText(/Sign In/i);

    // 2. Fill admin credentials
    await page.fill('input[type="email"]', 'admin@ecommerce.example.in');
    await page.fill('input[type="password"]', 'AdminSecure2026!');
    await page.locator('button[type="submit"]:has-text("Sign In")').click();

    // 3. Automatically redirects to /admin upon admin login
    await page.waitForURL(/\/admin/, { timeout: 20000 });
    await expect(page.locator('h1:has-text("Dashboard Overview")')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=Total Revenue')).toBeVisible();
    await expect(page.locator('text=Total Orders')).toBeVisible();
  });
});
