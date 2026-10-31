import { test, expect } from '@playwright/test';
import { setupUseCaseTestData, performUserSignIn, performUserSignOut } from '../test-data-setup';

test.describe('UC-22 (FEAT-10.01): Platform 4-Tier Geo-Hierarchy & Village Registry', () => {
  test.beforeEach(async ({ page }) => {
    await setupUseCaseTestData(page, 'UC-22');
  });

  test('Support operator executes sign-in, village registry audit, and explicit sign-out', async ({ page }) => {
    // 1. Sign In Verification
    await performUserSignIn(page, 'support');
    await expect(page.locator('header.spt-topbar')).toBeVisible();

    // 2. Core Flow: Villages Management
    await page.goto('/x/config/villages');
    await expect(page.locator('h1.spt-topbar-title')).toContainText('Villages');
    const content = page.locator('main.spt-page');
    await expect(content).toBeVisible();

    // 3. Core Flow: 4-Tier Geographic Master Levels
    await page.goto('/x/config');
    await expect(page.getByRole('link', { name: 'Countries' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'States' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Districts' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Villages' })).toBeVisible();

    // 4. Sign Out
    await performUserSignOut(page);
  });
});
