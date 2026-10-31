import { test, expect } from '@playwright/test';
import { setupUseCaseTestData, performUserSignIn, performUserSignOut } from '../../test-data-setup';

test.describe('UC-26 (FEAT-10.04): Support-as-Supplier Proxy Data Management & Audit Trail', () => {
  test.beforeEach(async ({ page }) => {
    await setupUseCaseTestData(page, 'UC-26');
  });

  test('Support operator signs in, selects proxy supplier context, and signs out', async ({ page }) => {
    // 1. Sign In Verification
    await performUserSignIn(page, 'support');
    await page.goto('/x/ops');
    await expect(page.locator('header.spt-topbar')).toBeVisible();

    // 2. Core Flow: Proxy Dropdown Selection
    const proxySelect = page.locator('header.spt-topbar select');
    await expect(proxySelect).toBeVisible();

    // Select proxy context
    await proxySelect.selectOption('sup_ongole_01');
    await expect(proxySelect).toHaveValue('sup_ongole_01');

    // Verify localStorage persistence
    const storedContext = await page.evaluate(() => localStorage.getItem('lc_support_supplier_context'));
    expect(storedContext).toBe('sup_ongole_01');

    // 3. Sign Out
    await performUserSignOut(page);
  });
});
