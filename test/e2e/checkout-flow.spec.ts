import { test, expect } from '@playwright/test';

test.describe('End-to-End Customer Purchase Flow', () => {
  test('completes full customer purchase from catalog to order confirmation', async ({ page }) => {
    // 1. Storefront Homepage
    await page.goto('/');
    await expect(page).toHaveTitle(/BharatStore|Maison/i);
    await expect(page.locator('header')).toBeVisible();

    // 2. Navigate to Catalog
    await page.goto('/products');
    await expect(page.locator('h1')).toContainText(/All Creations|Creations|Catalog/i);

    // 3. Open first product
    const productCardLink = page.locator('a[href^="/products/"]').first();
    await expect(productCardLink).toBeVisible();
    await productCardLink.click();

    // 4. Product Detail Page
    await page.waitForURL(/\/products\/.+/);
    const addToBagBtn = page.locator('button:has-text("Add to Bag")');
    await expect(addToBagBtn).toBeVisible();
    await addToBagBtn.click();

    // Wait for cart drawer trigger
    await page.waitForTimeout(1000);

    // 5. Checkout View
    await page.goto('/checkout');
    await expect(page.locator('h1')).toContainText(/Secure Checkout|Maison Checkout/i);

    // 6. Enter Indian Statutory Customer Details
    await page.fill('input[placeholder*="Pooja Sharma"]', 'Aarav Patel');
    await page.fill('input[placeholder*="name@example.in"]', 'aarav.patel@test.in');
    await page.fill('input[placeholder="9876543210"]', '9876543210');
    await page.fill('input[placeholder*="Flat 402"]', 'Flat 101, Prestige Court, MG Road');
    await page.fill('input[placeholder="Bengaluru"]', 'Bengaluru');
    await page.fill('input[placeholder="560038"]', '560001');

    // 7. Select Cash on Delivery (COD) if order total <= ₹5,000, or ONLINE mock
    const codRadio = page.locator('input[value="COD"]');
    const isCodEnabled = await codRadio.isEnabled();
    if (isCodEnabled) {
      await codRadio.check();
    } else {
      const onlineRadio = page.locator('input[value="ONLINE"]');
      await onlineRadio.check();
    }

    // 8. Submit Order
    const placeOrderBtn = page.locator('form button[type="submit"]:has-text("Place Order")');
    await expect(placeOrderBtn).toBeEnabled();
    await placeOrderBtn.click();

    // 9. Order Confirmation Certificate
    await page.waitForURL(/\/checkout\/success\?orderNumber=.+/, { timeout: 20000 });
    await expect(page.locator('h1')).toBeVisible();
    await expect(page.locator('button:has-text("Print Official Tax Invoice")')).toBeVisible();
  });
});
