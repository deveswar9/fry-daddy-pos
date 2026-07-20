import { test, expect } from '@playwright/test';

test.describe('Fry-Daddy POS Table & Ordering Journey', () => {
  test('User can login, open table, add items, and verify Occupied status on Dashboard', async ({ page }) => {
    // 1. Visit Login Page
    await page.goto('http://localhost:5173/');

    // Fill credentials for Counter B1
    await page.fill('input[placeholder="b1 or b2"]', 'b1');
    await page.fill('input[placeholder="Enter password"]', 'FryB1@2026!');
    await page.click('button[type="submit"]');

    // 2. Expect Dashboard
    await expect(page.locator('h1')).toContainText('Dashboard');

    // 3. Click Table A1
    await page.click('button:has-text("A1")');

    // 4. Expect Table Details Page
    await expect(page.locator('h1')).toContainText('Table A1');

    // 5. Open Add Items dialog if table is free
    const addItemsButton = page.locator('button:has-text("Add Items")');
    if (await addItemsButton.isVisible()) {
      await addItemsButton.click();
      await expect(page.locator('h2')).toContainText('Add Items');

      // Add first available item
      const plusButtons = page.locator('button:has(svg.lucide-plus)');
      if (await plusButtons.count() > 0) {
        await plusButtons.first().click();
        await page.click('button:has-text("Add to Order")');
      }
    }

    // 6. Verify table shows Active Order Items
    await expect(page.locator('body')).toContainText('Active Order Items');

    // 7. Go back to Dashboard
    await page.click('button:has(svg.lucide-arrow-left)');

    // 8. Verify Table A1 on Dashboard shows Occupied status
    await expect(page.locator('h1')).toContainText('Dashboard');
    const tableA1Card = page.locator('button:has-text("A1")');
    await expect(tableA1Card).toContainText('Occupied');
  });
});
