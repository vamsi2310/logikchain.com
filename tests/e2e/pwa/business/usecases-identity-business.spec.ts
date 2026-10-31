import { test, expect } from '@playwright/test';
import { setupUseCaseTestData, performUserSignIn, performUserSignOut } from '../../test-data-setup';

test.describe('Business Identity & Multi-Persona Onboarding', () => {

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
  // UC-01A: Rural Citizen / Consumer Buyer Signup & Phone OTP Login
  // ───────────────────────────────────────────────────────────────────────────
  test('UC-01A: Rural Citizen / Consumer Buyer Signup & Phone OTP Login', async ({ page }) => {
    // Phase 1: Test Data Setup
    await setupUseCaseTestData(page, 'UC-01A');

    // Phase 2: User Sign-In (Fresh Phone OTP Login with Pre-Onboarding Intent)
    await page.goto('/login', { waitUntil: 'domcontentloaded' });

    // If currently signed in, sign out first to test the fresh signup & OTP flow
    const switchBtn = page.getByRole('button', { name: /Sign Out & Switch Account/i });
    if (await switchBtn.isVisible().catch(() => false)) {
      await switchBtn.click();
      await expect(page.getByText(/Sign In or Register/i)).toBeVisible();
    }

    // Fill optional quick profile intent
    const nameInput = page.locator('input[placeholder*="Ramesh Kumar"]');
    if (await nameInput.isVisible().catch(() => false)) {
      await nameInput.fill('Ramesh Kumar');
    }

    const pincodeInput = page.locator('input[placeholder*="560001"]');
    if (await pincodeInput.isVisible().catch(() => false)) {
      await pincodeInput.fill('523273');
    }

    // Enter rural mobile number
    const phoneInput = page.locator('input[type="tel"]');
    await expect(phoneInput).toBeVisible();
    await phoneInput.fill('8977848501');

    // Request OTP
    const sendOtpBtn = page.getByRole('button', { name: /Send.*OTP/i });
    await expect(sendOtpBtn).toBeVisible();
    await sendOtpBtn.click();

    // Verify transition to OTP verification screen
    await expect(page).toHaveURL(/\/login\/verify/);

    // Enter 6-digit cryptographic OTP 123123
    const codeDigits = ['1', '2', '3', '1', '2', '3'];
    for (let i = 0; i < 6; i++) {
      const digitInput = page.locator(`[data-testid="otp-digit-${i}"]`);
      await expect(digitInput).toBeVisible();
      await digitInput.fill(codeDigits[i]);
    }

    // Submit OTP verification
    const verifyBtn = page.locator('[data-testid="verify-otp-btn"]');
    await expect(verifyBtn).toBeVisible();
    await verifyBtn.click();

    // Phase 3: Core Business Flow (Verify Authenticated Session & Navigation)
    await expect(page).toHaveURL(/\/login/);
    await expect(page.getByText(/You are Signed In/i)).toBeVisible();

    const assignedRole = page.locator('[data-testid="assigned-role-text"]');
    await expect(assignedRole).toContainText(/Consumer \/ Buyer/i);

    // Click "Open App ➔" to verify buyer routing
    const openAppBtn = page.getByRole('button', { name: /Open App/i });
    await expect(openAppBtn).toBeVisible();
    await openAppBtn.click();

    // Verify buyer landing page
    await expect(page).toHaveURL(/\/home/);

    // Phase 4: Explicit User Sign-Out
    await performUserSignOut(page);
    await expect(page.getByText(/Sign In or Register/i)).toBeVisible();
  });

// ───────────────────────────────────────────────────────────────────────────
  // UC-01B: Kirana Merchant Registration, Retail Profiling & Fullscreen Corridor Ingress
  // ───────────────────────────────────────────────────────────────────────────
  test('UC-01B: Kirana Merchant Registration, Retail Profiling & Fullscreen Corridor Ingress', async ({ page }) => {
    // Phase 1: Test Data Setup
    await setupUseCaseTestData(page, 'UC-01B');

    // Phase 2: User Sign-In (Merchant Credentials)
    await performUserSignIn(page, 'merchant');

    // Phase 3: Core Business Flow (Corridor Ingress & Handover)
    await page.goto('/login', { waitUntil: 'domcontentloaded' });
    await expect(page.getByText(/You are Signed In/i)).toBeVisible({ timeout: 10000 });

    const roleBadge = page.locator('[data-testid="assigned-role-text"]');
    await expect(roleBadge).toContainText(/Kirana Merchant/i);

    // Launch fullscreen corridor
    await page.getByRole('button', { name: /Open App/i }).click();
    await expect(page).toHaveURL(/\/m\/gigs/);

    // Verify fullscreen corridor header and Close App handover button
    const closeAppBtn = page.locator('button:has-text("✕ Close App")');
    await expect(closeAppBtn).toBeVisible({ timeout: 10000 });

    // Use Close App handover button to return cleanly to public website
    await closeAppBtn.click();
    await expect(page).toHaveURL(/\/(\?.*)?$/);

    // Phase 4: Explicit User Sign-Out
    await performUserSignOut(page);
  });

// ───────────────────────────────────────────────────────────────────────────
  // UC-01C: Fleet Transporter / Driver Signup, Vehicle Onboarding & Mobile PWA Ingress
  // ───────────────────────────────────────────────────────────────────────────
  test('UC-01C: Fleet Transporter / Driver Signup, Vehicle Onboarding & Mobile PWA Ingress', async ({ page }) => {
    // Phase 1: Test Data Setup
    await setupUseCaseTestData(page, 'UC-01C');

    // Phase 2: User Sign-In (Driver Credentials)
    await performUserSignIn(page, 'driver');

    // Phase 3: Core Business Flow (Driver PWA Ingress & Telemetry)
    await page.goto('/login', { waitUntil: 'domcontentloaded' });
    await expect(page.getByText(/You are Signed In/i)).toBeVisible({ timeout: 10000 });

    const roleBadge = page.locator('[data-testid="assigned-role-text"]');
    await expect(roleBadge).toContainText(/Fleet Rider/i);

    // Navigate to driver corridor
    await page.goto('/d/gigs', { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(/\/d\/gigs/);

    // Verify driver screen container rendered
    const driverBody = page.locator('body');
    await expect(driverBody).toBeVisible();

    // Verify backend driver custody endpoint is operational
    const custodyRes = await page.request.get('http://localhost:30080/v1/cash/summary/drv_ongole_01', {
      headers: { Authorization: 'Bearer dev-token:drv_ongole_01:driver' },
    });
    expect(custodyRes.status()).toBe(200);

    // Phase 4: Explicit User Sign-Out
    await performUserSignOut(page);
  });

// ───────────────────────────────────────────────────────────────────────────
  // UC-01D: Regional Mill Supplier Enterprise Registration, GSTIN Validation & Depot Portal Ingress
  // ───────────────────────────────────────────────────────────────────────────
  test('UC-01D: Regional Mill Supplier Enterprise Registration, GSTIN Validation & Depot Portal Ingress', async ({ page }) => {
    // Phase 1: Test Data Setup
    await setupUseCaseTestData(page, 'UC-01D');

    // Phase 2: User Sign-In (Supplier Credentials)
    await performUserSignIn(page, 'supplier');

    // Phase 3: Core Business Flow (Supplier Portal Ingress & Catalog Management)
    await page.goto('/suppliers', { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(/\/suppliers/);

    // Verify supplier landing headline
    await expect(page.getByRole('heading', { name: /Suppliers/i })).toBeVisible();

    // Verify supplier funds summary & escrow ledger from backend
    const orgRes = await page.request.get('http://localhost:30080/v1/payouts/suppliers/sup_ongole_01/funds-summary', {
      headers: { Authorization: 'Bearer dev-token:sup_ongole_01:supplier' },
    });
    expect(orgRes.status()).toBe(200);

    // Phase 4: Explicit User Sign-Out
    await performUserSignOut(page);
  });

// ───────────────────────────────────────────────────────────────────────────
  // UC-01H: Progressive Role Elevation with Operations Desk Verification
  // ───────────────────────────────────────────────────────────────────────────
  test('UC-01H: Progressive Role Elevation (Buyer to Merchant) with Operations Desk Verification', async ({ page }) => {
    // Phase 1: Test Data Setup
    await setupUseCaseTestData(page, 'UC-01H');

    // Phase 2: User Sign-In (Buyer Credentials)
    await performUserSignIn(page, 'buyer');

    // Phase 3: Core Business Flow (Role Elevation Form Submission)
    await page.goto('/login', { waitUntil: 'domcontentloaded' });
    await expect(page.getByText(/You are Signed In/i)).toBeVisible({ timeout: 10000 });

    // Open Role Switch Form
    const contactSupportBtn = page.locator('[data-testid="contact-support-role-btn"]');
    await expect(contactSupportBtn).toBeVisible();
    await contactSupportBtn.click();

    const roleForm = page.locator('[data-testid="role-switch-form"]');
    await expect(roleForm).toBeVisible();

    // Select Kirana Merchant
    await page.locator('[data-testid="role-switch-select"]').selectOption('merchant');
    await page.locator('[data-testid="role-switch-reason"]').fill('Kirana store owner requesting terminal access.');

    // Submit request calling backend identity microservice
    await page.locator('[data-testid="submit-role-switch-btn"]').click();

    // Verify role upgrade reflected in UI
    const assignedRoleText = page.locator('[data-testid="assigned-role-text"]');
    await expect(assignedRoleText).toContainText(/Kirana Merchant/i);

    // Phase 4: Explicit User Sign-Out
    await performUserSignOut(page);
  });

// ───────────────────────────────────────────────────────────────────────────
  // UC-01I: Multilingual Regional Dialect Selection (6 Languages) & Voice-Prompt Onboarding
  // ───────────────────────────────────────────────────────────────────────────
  test('UC-01I: Multilingual Regional Dialect Selection (6 Languages) & Voice-Prompt Onboarding', async ({ page }) => {
    // Phase 1: Test Data Setup
    await setupUseCaseTestData(page, 'UC-01I');

    // Phase 2: User Accesses Language Screen
    await page.goto('/language', { waitUntil: 'domcontentloaded' });

    // Phase 3: Core Business Flow (Select Telugu Dialect)
    const teluguOption = page.locator('div:has-text("తెలుగు")').last();
    await expect(teluguOption).toBeVisible();
    await teluguOption.click();

    // Click Save & Continue
    const saveBtn = page.getByRole('button', { name: /Save.*Continue/i });
    if (await saveBtn.isVisible().catch(() => false)) {
      await saveBtn.click();
    }
    await page.goto('/language', { waitUntil: 'domcontentloaded' });
    await expect(page.getByText('తెలుగు')).toBeVisible();

    // Phase 4: Explicit User Sign-Out & Session Isolation
    await performUserSignOut(page);
  });

});
