import { test, expect } from '@playwright/test';

test.describe('FEAT-10.04: Support-as-Supplier Proxy Data Management', () => {
  test('Support operator selects supplier from proxy switcher in console topbar', async ({ page }) => {
    await page.goto('/x/ops');
    await expect(page.locator('header.spt-topbar')).toBeVisible();

    // Verify proxy dropdown exists
    const proxySelect = page.locator('header.spt-topbar select');
    await expect(proxySelect).toBeVisible();

    // Select proxy context
    await proxySelect.selectOption('sup_ongole_01');
    await expect(proxySelect).toHaveValue('sup_ongole_01');

    // Verify localStorage persistence
    const storedContext = await page.evaluate(() => localStorage.getItem('lc_support_supplier_context'));
    expect(storedContext).toBe('sup_ongole_01');
  });
});
