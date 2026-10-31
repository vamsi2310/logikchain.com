import { test, expect } from '@playwright/test';
import { setupUseCaseTestData, performUserSignIn, performUserSignOut } from '../../test-data-setup';

test.describe('UC-23 (FEAT-10.02): Commercial SaaS Subscription Plans & Tiered Tariffs', () => {
  test.beforeEach(async ({ page }) => {
    await setupUseCaseTestData(page, 'UC-23');
  });

  test('Support operator signs in, reviews subscription plans & tariff controls, and signs out', async ({ page }) => {
    // 1. Sign In Verification
    await performUserSignIn(page, 'support');

    // 2. Core Flow: Plans Catalog & Quotas
    await page.goto('/x/config/plans');
    await expect(page.locator('h1.spt-topbar-title')).toContainText('Plans');
    const main = page.locator('main.spt-page');
    await expect(main).toBeVisible();

    // 3. Core Flow: Tariffs & Pricing Controls
    await page.goto('/x/config/tariffs');
    await expect(page.locator('h1.spt-topbar-title')).toContainText('Tariffs');

    // 4. Sign Out
    await performUserSignOut(page);
  });
});
