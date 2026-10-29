import { test, expect } from '@playwright/test';

test.describe('FEAT-10.03: Statutory Tax Profiles & TDS Rules', () => {
  test('Support operator views tax profiles and GST configuration', async ({ page }) => {
    await page.goto('/x/config/tax');
    await expect(page.locator('h1.spt-topbar-title')).toContainText('Tax');
    await expect(page.locator('main.spt-page')).toBeVisible();
  });

  test('Support operator views TDS configuration console', async ({ page }) => {
    await page.goto('/x/config/tds');
    await expect(page.locator('h1.spt-topbar-title')).toContainText('TDS');
    await expect(page.locator('main.spt-page')).toBeVisible();
  });
});
