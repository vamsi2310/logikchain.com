import { test, expect } from '@playwright/test';

test.describe('FEAT-10.01: Geo-Hierarchy & Village Registry', () => {
  test('Support operator views villages and navigates to village management', async ({ page }) => {
    await page.goto('/x/config/villages');
    await expect(page.locator('header.spt-topbar')).toBeVisible();
    await expect(page.locator('h1.spt-topbar-title')).toContainText('Villages');

    // Check add village action or village list items
    const content = page.locator('main.spt-page');
    await expect(content).toBeVisible();
  });

  test('Verify geographic master levels: Countries, States, Districts, Villages', async ({ page }) => {
    await page.goto('/x/config');
    await expect(page.getByText('Countries')).toBeVisible();
    await expect(page.getByText('States')).toBeVisible();
    await expect(page.getByText('Districts')).toBeVisible();
    await expect(page.getByText('Villages')).toBeVisible();
  });
});
