import { test, expect } from '@playwright/test';

test.describe('FEAT-10.02: Subscription Plans & Tiered Tariffs', () => {
  test('Support operator views subscription plan catalog and quotas', async ({ page }) => {
    await page.goto('/x/config/plans');
    await expect(page.locator('h1.spt-topbar-title')).toContainText('Plans');

    const main = page.locator('main.spt-page');
    await expect(main).toBeVisible();
  });

  test('Support operator views tariffs and pricing tier controls', async ({ page }) => {
    await page.goto('/x/config/tariffs');
    await expect(page.locator('h1.spt-topbar-title')).toContainText('Tariffs');
  });
});
