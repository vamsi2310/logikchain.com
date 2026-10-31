import { test, expect } from '@playwright/test';
import { setupUseCaseTestData, performUserSignIn, performUserSignOut } from '../../test-data-setup';

test.describe('UC-27 (FEAT-12.01): Microservices Mesh Health & Database Isolation Probes', () => {
  test.beforeEach(async ({ page }) => {
    // Phase 1: Test Data Setup for UC-27
    await setupUseCaseTestData(page, 'UC-27');
    // Phase 2: User Sign-In (SRE persona)
    await performUserSignIn(page, 'sre');
    // Phase 3: Navigate to status telemetry portal
    await page.goto('/status');
  });

  test.afterEach(async ({ page }) => {
    // Phase 4: Explicit User Sign-Out
    await performUserSignOut(page);
  });

  test('Public Status screen loads with mesh telemetry headers', async ({ page }) => {
    // Verify page header and description
    await expect(page.locator('h2')).toContainText('Microservices & Database Mesh Telemetry');
    await expect(page.getByText('API Gateway: CONNECTED')).toBeVisible({ timeout: 10000 });
  });

  test('API Gateway reports connected and shows online services count', async ({ page }) => {
    const gatewayCard = page.locator('div').filter({ hasText: 'API Gateway: CONNECTED' }).first();
    await expect(gatewayCard).toBeVisible({ timeout: 10000 });
    // Expect online microservices
    await expect(page.getByText(/\d+ Online/).first()).toBeVisible();
  });

  test('Database Mesh card displays active PostgreSQL connections', async ({ page }) => {
    await expect(page.getByText('PostgreSQL Mesh')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(/\d+\/13 Active/).first()).toBeVisible();
  });

  test('Verifies Phase 0 running services (EPIC-10, EPIC-12)', async ({ page }) => {
    // Wait for services table to load
    await expect(page.locator('table.pub-status-table')).toBeVisible({ timeout: 10000 });

    // EPIC-10: config-service
    const configRow = page.locator('tr').filter({ hasText: 'EPIC-10' });
    await expect(configRow).toBeVisible();
    await expect(configRow).toContainText('config-service');
    await expect(configRow).toContainText(':4010');
    await expect(configRow).toContainText('Online');
    await expect(configRow).toContainText('config_db');
    await expect(configRow).toContainText('Connected');

    // EPIC-12: gateway
    const gatewayRow = page.locator('tr').filter({ hasText: 'EPIC-12' });
    await expect(gatewayRow).toBeVisible();
    await expect(gatewayRow).toContainText('gateway');
    await expect(gatewayRow).toContainText(':8080');
    await expect(gatewayRow).toContainText('Online');
  });

  test('Verifies Phase 1 running services (EPIC-01, EPIC-13)', async ({ page }) => {
    await expect(page.locator('table.pub-status-table')).toBeVisible({ timeout: 10000 });

    // EPIC-01: identity-service
    const idnRow = page.locator('tr').filter({ hasText: 'EPIC-01' });
    await expect(idnRow).toBeVisible();
    await expect(idnRow).toContainText('identity-service');
    await expect(idnRow).toContainText(':4001');
    await expect(idnRow).toContainText('Online');
    await expect(idnRow).toContainText('identity_db');
    await expect(idnRow).toContainText('Connected');

    // EPIC-13: social-connect-service
    const socRow = page.locator('tr').filter({ hasText: 'EPIC-13' });
    await expect(socRow).toBeVisible();
    await expect(socRow).toContainText('socialConnect-service');
    await expect(socRow).toContainText(':4012');
    await expect(socRow).toContainText('Online');
    await expect(socRow).toContainText('social_db');
    await expect(socRow).toContainText('Connected');
  });

  test('Verifies Phase 2 running services (EPIC-03, EPIC-04)', async ({ page }) => {
    await expect(page.locator('table.pub-status-table')).toBeVisible({ timeout: 10000 });

    // EPIC-03: gigs-service
    const gigsRow = page.locator('tr').filter({ hasText: 'EPIC-03' });
    await expect(gigsRow).toBeVisible();
    await expect(gigsRow).toContainText('gigs-service');
    await expect(gigsRow).toContainText(':4003');
    await expect(gigsRow).toContainText('Online');
    await expect(gigsRow).toContainText('gigs_db');
    await expect(gigsRow).toContainText('Connected');

    // EPIC-04: pamphlet-service
    const pamRow = page.locator('tr').filter({ hasText: 'EPIC-04' });
    await expect(pamRow).toBeVisible();
    await expect(pamRow).toContainText('pamphlet-service');
    await expect(pamRow).toContainText(':4004');
    await expect(pamRow).toContainText('Online');
    await expect(pamRow).toContainText('pamphlet_db');
    await expect(pamRow).toContainText('Connected');
  });

  test('Verifies Phase 3 running services (EPIC-08, EPIC-05, EPIC-02)', async ({ page }) => {
    await expect(page.locator('table.pub-status-table')).toBeVisible({ timeout: 10000 });

    // EPIC-08: credit-service
    const creditRow = page.locator('tr').filter({ hasText: 'EPIC-08' });
    await expect(creditRow).toBeVisible();
    await expect(creditRow).toContainText('credit-service');
    await expect(creditRow).toContainText(':4008');
    await expect(creditRow).toContainText('Online');
    await expect(creditRow).toContainText('credit_db');
    await expect(creditRow).toContainText('Connected');

    // EPIC-05: payments-service
    const payRow = page.locator('tr').filter({ hasText: 'EPIC-05' });
    await expect(payRow).toBeVisible();
    await expect(payRow).toContainText('payments-service');
    await expect(payRow).toContainText(':4005');
    await expect(payRow).toContainText('Online');
    await expect(payRow).toContainText('payments_db');
    await expect(payRow).toContainText('Connected');

    // EPIC-02: orders-service
    const ordersRow = page.locator('tr').filter({ hasText: 'EPIC-02' });
    await expect(ordersRow).toBeVisible();
    await expect(ordersRow).toContainText('orders-service');
    await expect(ordersRow).toContainText(':4002');
    await expect(ordersRow).toContainText('Online');
    await expect(ordersRow).toContainText('orders_db');
    await expect(ordersRow).toContainText('Connected');
  });

  test('Verifies Phase 4 running services (EPIC-07, EPIC-06)', async ({ page }) => {
    await expect(page.locator('table.pub-status-table')).toBeVisible({ timeout: 10000 });

    // EPIC-07: cash-service
    const cashRow = page.locator('tr').filter({ hasText: 'EPIC-07' });
    await expect(cashRow).toBeVisible();
    await expect(cashRow).toContainText('cash-service');
    await expect(cashRow).toContainText(':4007');
    await expect(cashRow).toContainText('Online');
    await expect(cashRow).toContainText('cash_db');
    await expect(cashRow).toContainText('Connected');

    // EPIC-06: payouts-service
    const payoutsRow = page.locator('tr').filter({ hasText: 'EPIC-06' });
    await expect(payoutsRow).toBeVisible();
    await expect(payoutsRow).toContainText('payouts-service');
    await expect(payoutsRow).toContainText(':4006');
    await expect(payoutsRow).toContainText('Online');
    await expect(payoutsRow).toContainText('payouts_db');
    await expect(payoutsRow).toContainText('Connected');
  });

  test('Verifies Phase 5 running services (EPIC-11, EPIC-09)', async ({ page }) => {
    await expect(page.locator('table.pub-status-table')).toBeVisible({ timeout: 10000 });

    // EPIC-11: governance-service
    const govRow = page.locator('tr').filter({ hasText: 'EPIC-11' });
    await expect(govRow).toBeVisible();
    await expect(govRow).toContainText('governance-service');
    await expect(govRow).toContainText(':4011');
    await expect(govRow).toContainText('Online');
    await expect(govRow).toContainText('governance_db');
    await expect(govRow).toContainText('Connected');

    // EPIC-09: finance-service
    const finRow = page.locator('tr').filter({ hasText: 'EPIC-09' });
    await expect(finRow).toBeVisible();
    await expect(finRow).toContainText('finance-service');
    await expect(finRow).toContainText(':4009');
    await expect(finRow).toContainText('Online');
    await expect(finRow).toContainText('finance_db');
    await expect(finRow).toContainText('Connected');
  });

  test('Interactive connection refresh triggers updated live status', async ({ page }) => {
    const refreshBtn = page.getByRole('button', { name: /Refresh All Checks/i });
    await expect(refreshBtn).toBeVisible({ timeout: 10000 });
    await refreshBtn.click();
    await expect(page.getByText('API Gateway: CONNECTED')).toBeVisible({ timeout: 10000 });
  });

  test('Full UI Video Walkthrough: telemetry cards, service grid, and live refresh', async ({ page }) => {
    // 1. Initial overview
    await expect(page.locator('h2')).toContainText('Microservices & Database Mesh Telemetry');
    await page.waitForTimeout(1000);

    // 2. Showcase top telemetry status cards
    const gatewayCard = page.locator('div').filter({ hasText: 'API Gateway: CONNECTED' }).first();
    await gatewayCard.scrollIntoViewIfNeeded();
    await page.waitForTimeout(1000);

    // 3. Inspect Table rows
    const table = page.locator('table.pub-status-table');
    await expect(table).toBeVisible({ timeout: 10000 });
    await table.scrollIntoViewIfNeeded();
    await page.waitForTimeout(1000);

    // 4. Hover over individual service rows across phases
    const phase0Row = page.locator('tr').filter({ hasText: 'EPIC-10' });
    if (await phase0Row.isVisible()) {
      await phase0Row.hover();
      await page.waitForTimeout(600);
    }

    const phase1Row = page.locator('tr').filter({ hasText: 'EPIC-01' });
    if (await phase1Row.isVisible()) {
      await phase1Row.hover();
      await page.waitForTimeout(600);
    }

    const phase2Row = page.locator('tr').filter({ hasText: 'EPIC-03' });
    if (await phase2Row.isVisible()) {
      await phase2Row.hover();
      await page.waitForTimeout(600);
    }

    const phase3CreditRow = page.locator('tr').filter({ hasText: 'EPIC-08' });
    if (await phase3CreditRow.isVisible()) {
      await phase3CreditRow.hover();
      await page.waitForTimeout(600);
    }

    const phase3PayRow = page.locator('tr').filter({ hasText: 'EPIC-05' });
    if (await phase3PayRow.isVisible()) {
      await phase3PayRow.hover();
      await page.waitForTimeout(600);
    }

    // 5. Scroll down to bottom and then back to top
    await page.evaluate(() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' }));
    await page.waitForTimeout(1500);

    await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'smooth' }));
    await page.waitForTimeout(1000);

    // 6. Click Refresh All Checks button
    const refreshBtn = page.getByRole('button', { name: /Refresh All Checks/i });
    await refreshBtn.hover();
    await page.waitForTimeout(500);
    await refreshBtn.click();
    await page.waitForTimeout(2000);
  });
});
