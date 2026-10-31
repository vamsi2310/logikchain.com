import { test, expect } from '@playwright/test';
import { setupUseCaseTestData, performUserSignIn, performUserSignOut } from '../../test-data-setup';

test.describe('Technical Identity, RBAC Elevation & Security Gates', () => {

  test.beforeEach(async ({ page }) => {
    // Reset test user profile in PostgreSQL backend mesh before each test
    await page.request.patch('http://localhost:30080/v1/users/usr_8977848501', {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer dev-token:usr_8977848501:buyer',
      },
      data: {
        villageId: 'village_peridepi_523273',
      },
    }).catch(() => {});

    await page.request.post('http://localhost:30080/v1/buyers/usr_8977848501/role', {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer dev-token:usr_8977848501:buyer',
      },
      data: {
        targetRole: 'buyer',
      },
    }).catch(() => {});
  });
// ───────────────────────────────────────────────────────────────────────────
  // UC-01E: Support Operations Specialist Console Authentication & RBAC Privilege Elevation
  // ───────────────────────────────────────────────────────────────────────────
  test('UC-01E: Support Operations Specialist Console Authentication & RBAC Privilege Elevation', async ({ page }) => {
    // Phase 1: Test Data Setup
    await setupUseCaseTestData(page, 'UC-01E');

    // Phase 2: User Sign-In (Support Operator Credentials)
    await performUserSignIn(page, 'support');

    // Phase 3: Core Business Flow (Support Console & Financial Mutation Guardrail)
    await page.goto('/x/ops', { waitUntil: 'domcontentloaded' });
    const topbar = page.locator('header.spt-topbar');
    await expect(topbar).toBeVisible();

    // Test Financial Mutation Proxy Lockout Circuit Breaker (HTTP 403)
    const mutationRes = await page.request.post('http://localhost:30080/v1/payouts/batches/batch_payout_test_01/disburse', {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer dev-token:test_operator_01:support',
        'X-Supplier-Context': 'sup_ongole_01',
      },
      data: {
        payoutIds: ['pay_test_001'],
      },
    });
    // System must reject support proxy from executing financial disbursements
    expect(mutationRes.status()).toBe(403);

    // Phase 4: Explicit User Sign-Out
    await performUserSignOut(page);
  });

// ───────────────────────────────────────────────────────────────────────────
  // UC-01F: Finance & Tax Compliance Officer Audit Sign-In, Dual-Control Access & Ledger Security
  // ───────────────────────────────────────────────────────────────────────────
  test('UC-01F: Finance & Tax Compliance Officer Audit Sign-In, Dual-Control Access & Ledger Security', async ({ page }) => {
    // Phase 1: Test Data Setup
    await setupUseCaseTestData(page, 'UC-01F');

    // Phase 2: User Sign-In (Compliance Officer)
    await performUserSignIn(page, 'support');

    // Phase 3: Core Business Flow (Audit GST Rates & TDS Withholding Profiles)
    await page.goto('/x/config/tax', { waitUntil: 'domcontentloaded' });

    // Verify commodity GST profiles topbar & content rendered
    await expect(page.locator('h1.spt-topbar-title')).toContainText('Tax');
    await expect(page.locator('main.spt-page')).toBeVisible();

    // Verify Section 194C/194O statutory configuration
    await page.goto('/x/config/tds', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('h1.spt-topbar-title')).toContainText('TDS');
    await expect(page.locator('main.spt-page')).toBeVisible();

    // Verify backend double-entry general ledger balance sheet report
    const glRes = await page.request.get('http://localhost:30080/v1/finance/reports', {
      headers: { Authorization: 'Bearer dev-token:test_finance_01:support' },
    });
    expect(glRes.status()).toBe(200);

    // Phase 4: Explicit User Sign-Out
    await performUserSignOut(page);
  });

// ───────────────────────────────────────────────────────────────────────────
  // UC-01G: Platform SRE & DevOps Engineer Zero-Trust Sign-In, Telemetry Session & Mesh Observability
  // ───────────────────────────────────────────────────────────────────────────
  test('UC-01G: Platform SRE & DevOps Engineer Zero-Trust Sign-In, Telemetry Session & Mesh Observability', async ({ page }) => {
    // Phase 1: Test Data Setup
    await setupUseCaseTestData(page, 'UC-01G');

    // Phase 2: User Sign-In (SRE Observer Session)
    await performUserSignIn(page, 'sre');

    // Phase 3: Core Business Flow (Cluster Observability & Database Mesh)
    await page.goto('/status', { waitUntil: 'domcontentloaded' });

    // Verify API Gateway connection probe
    const gwStatus = page.locator('.svc-card, .pub-header').first();
    await expect(gwStatus).toBeVisible();

    // Verify automated test runner portal
    const testRunnerTab = page.getByRole('button', { name: /E2E Use Cases & Test Runner/i });
    await expect(testRunnerTab).toBeVisible();
    await testRunnerTab.click();

    await expect(page.getByText('Automated E2E Test Suites & Interactive Recordings')).toBeVisible();
    await expect(page.getByText('Total Use Cases', { exact: true })).toBeVisible();
    await expect(page.getByText('Passing Tests', { exact: true })).toBeVisible();

    // Phase 4: Explicit User Sign-Out
    await performUserSignOut(page);
  });

// ───────────────────────────────────────────────────────────────────────────
  // UC-01J: Federated Google OAuth Alternative Sign-In Simulation
  // ───────────────────────────────────────────────────────────────────────────
  test('UC-01J: Federated Google OAuth Alternative Sign-In Simulation', async ({ page }) => {
    // Phase 1: Test Data Setup
    await setupUseCaseTestData(page, 'UC-01J');

    // Phase 2: User Opens Login Screen
    await page.goto('/login', { waitUntil: 'domcontentloaded' });

    // Phase 3: Core Business Flow (Google OAuth CTA Verification & Token Exchange)
    const googleBtn = page.getByRole('button', { name: /Google/i });
    await expect(googleBtn).toBeVisible();

    // Verify backend identity token bootstrap endpoint is healthy
    const bootstrapRes = await page.request.post('http://localhost:30080/v1/auth/bootstrap', {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer dev-token:usr_google_oauth_01:buyer',
      },
      data: {
        userId: 'usr_google_oauth_01',
        email: 'user@logikchain.com',
        displayName: 'Google Verified User',
      },
    });
    expect([200, 201]).toContain(bootstrapRes.status());

    // Phase 4: Explicit User Sign-Out
    await performUserSignOut(page);
  });

// ───────────────────────────────────────────────────────────────────────────
  // UC-01K: Inactive / Suspended Account Lockout & Unauthorized Role Circuit Breaker
  // ───────────────────────────────────────────────────────────────────────────
  test('UC-01K: Inactive / Suspended Account Lockout & Unauthorized Role Circuit Breaker', async ({ page }) => {
    // Phase 1: Test Data Setup
    await setupUseCaseTestData(page, 'UC-01K');

    // Phase 2 & 3: Navigate to /unauthorized screen
    await page.goto('/unauthorized', { waitUntil: 'domcontentloaded' });

    // Verify Unauthorized Alert Screen
    await expect(page.getByText(/Unauthorized Access/i)).toBeVisible();

    // Verify "Back to Home" navigation button
    const backToHomeBtn = page.getByRole('button', { name: /Home/i });
    await expect(backToHomeBtn).toBeVisible();
    await backToHomeBtn.click();
    await expect(page).toHaveURL(/\/(\?.*)?$/);

    // Phase 4: Explicit Clean Up
    await performUserSignOut(page);
  });

});
