import { test, expect } from '@playwright/test';
import { setupUseCaseTestData, performUserSignIn, performUserSignOut } from '../test-data-setup';

test.describe('UC-25 (FEAT-10.08): Supplier Bulk Ingestion & Selective Entity Loader', () => {
  test.beforeEach(async ({ page }) => {
    await setupUseCaseTestData(page, 'UC-25');
  });

  test('Support operator signs in, executes dry-run validation with 11 entities, and signs out', async ({ page }) => {
    // 1. Sign In Verification
    await performUserSignIn(page, 'support');

    // 2. Core Flow: Navigate to SPT-02.5 and audit entity categories
    await page.goto('/x/config/supplier-ingestion');
    await expect(page.locator('h1.spt-topbar-title')).toContainText('Supplier Bulk Ingestion');

    // Verify 11 categories checkboxes rendered
    const checkboxes = page.locator('input[type="checkbox"]');
    const count = await checkboxes.count();
    expect(count).toBeGreaterThanOrEqual(11);

    // Click Validate & Preview button
    const validateBtn = page.getByRole('button', { name: 'Validate & Preview' });
    await expect(validateBtn).toBeVisible();
    await validateBtn.scrollIntoViewIfNeeded();
    await validateBtn.click({ force: true });

    // Verify validation response renders
    await expect(page.getByText(/Status: VALID/i)).toBeVisible();

    // Verify Start Bulk Ingestion button is enabled
    const ingestBtn = page.getByRole('button', { name: 'Start Bulk Ingestion' });
    await expect(ingestBtn).toBeEnabled();

    // 3. Sign Out
    await performUserSignOut(page);
  });

  test('Dry-run detects invalid GSTIN and disables commit button before sign-out', async ({ page }) => {
    // 1. Sign In Verification
    await performUserSignIn(page, 'support');
    await page.goto('/x/config/supplier-ingestion');
    await expect(page.locator('h1.spt-topbar-title')).toContainText('Supplier Bulk Ingestion');

    // 2. Core Flow: Trigger simulate 14-char error
    const errorCheckbox = page.getByLabel(/Inject 14-char Invalid GSTIN/i);
    await errorCheckbox.check();

    // Run Validate
    const validateBtn = page.getByRole('button', { name: 'Validate & Preview' });
    await validateBtn.scrollIntoViewIfNeeded();
    await validateBtn.click({ force: true });

    // Verify error state
    await expect(page.getByText(/VALIDATION_FAILED/i)).toBeVisible();
    await expect(page.getByText('INVALID_GSTIN_FORMAT')).toBeVisible();

    // Verify Start Bulk Ingestion button is disabled
    const ingestBtn = page.getByRole('button', { name: 'Start Bulk Ingestion' });
    await expect(ingestBtn).toBeDisabled();

    // 3. Sign Out
    await performUserSignOut(page);
  });
});
