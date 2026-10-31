import { test, expect } from '@playwright/test';
import { setupUseCaseTestData, performUserSignIn, performUserSignOut } from '../test-data-setup';

test.describe('UC-24 (FEAT-10.03): Statutory Commodity Tax Profiles & Regional GST Rates', () => {
  test.beforeEach(async ({ page }) => {
    await setupUseCaseTestData(page, 'UC-24');
  });

  test('Support operator signs in, reviews GST profiles & TDS configuration, and signs out', async ({ page }) => {
    // 1. Sign In Verification
    await performUserSignIn(page, 'support');

    // 2. Core Flow: GST Profiles & Commodity Rates
    await page.goto('/x/config/tax');
    await expect(page.locator('h1.spt-topbar-title')).toContainText('Tax');
    await expect(page.locator('main.spt-page')).toBeVisible();

    // 3. Core Flow: Statutory TDS Configuration
    await page.goto('/x/config/tds');
    await expect(page.locator('h1.spt-topbar-title')).toContainText('TDS');
    await expect(page.locator('main.spt-page')).toBeVisible();

    // 4. Sign Out
    await performUserSignOut(page);
  });
});
