import { test, expect } from '@playwright/test';

test.describe('FEAT-10.08: Supplier Bulk Ingestion & Selective Entity Loader', () => {
  test('Support operator navigates to SPT-02.5 and toggles entity checkboxes', async ({ page }) => {
    await page.goto('/x/config/supplier-ingestion');
    await expect(page.locator('h1.spt-topbar-title')).toContainText('Supplier Bulk Ingestion');

    // Verify 11 categories checkboxes rendered
    const checkboxes = page.locator('input[type="checkbox"]');
    const count = await checkboxes.count();
    expect(count).toBeGreaterThanOrEqual(11);

    // Click Validate & Preview button
    const validateBtn = page.getByRole('button', { name: 'Validate & Preview' });
    await expect(validateBtn).toBeVisible();
    await validateBtn.click();

    // Verify validation response renders
    await expect(page.getByText(/Status: VALID/i)).toBeVisible();

    // Verify Start Bulk Ingestion button is enabled
    const ingestBtn = page.getByRole('button', { name: 'Start Bulk Ingestion' });
    await expect(ingestBtn).toBeEnabled();
  });

  test('Dry-run detects invalid GSTIN and disables commit button', async ({ page }) => {
    await page.goto('/x/config/supplier-ingestion');

    // Trigger simulate 14-char error
    const errorCheckbox = page.getByLabel(/Inject 14-char Invalid GSTIN/i);
    await errorCheckbox.check();

    // Run Validate
    await page.getByRole('button', { name: 'Validate & Preview' }).click();

    // Verify error state
    await expect(page.getByText(/VALIDATION_FAILED/i)).toBeVisible();
    await expect(page.getByText('INVALID_GSTIN_FORMAT')).toBeVisible();

    // Verify Start Bulk Ingestion button is disabled
    const ingestBtn = page.getByRole('button', { name: 'Start Bulk Ingestion' });
    await expect(ingestBtn).toBeDisabled();
  });
});
