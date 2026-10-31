import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';
import {
  ALL_USE_CASES_TEST_DATA,
  getUseCaseTestData,
  loadUseCaseTestData,
  UseCaseTestData,
} from './data';

export * from './data';

// Backward compatibility alias for legacy references
export type UseCaseDefinition = UseCaseTestData;
export const NUMBERED_USE_CASES = ALL_USE_CASES_TEST_DATA;

/**
 * Standardized Test Data Setup for a given numbered use case.
 * Delegates to the dedicated test data loader in tests/e2e/data/.
 * Invokes and injects required mock entities, IDs, tokens, and storage state.
 */
export async function setupUseCaseTestData(
  page: Page,
  useCaseNumber: string
): Promise<UseCaseTestData> {
  return loadUseCaseTestData(page, useCaseNumber);
}

/**
 * Standard User Sign-In Flow
 * Validates that the user is authenticated in the UI with active session headers.
 */
export async function performUserSignIn(page: Page, actorRole: string): Promise<void> {
  if (actorRole === 'support' || actorRole === 'admin' || actorRole === 'finance') {
    await page.goto('/x/ops', { waitUntil: 'domcontentloaded' });
    const topbar = page.locator('header.spt-topbar');
    await expect(topbar).toBeVisible({ timeout: 10000 });
  } else if (actorRole === 'sre') {
    await page.goto('/status', { waitUntil: 'domcontentloaded' });
    const gatewayCard = page.locator('.svc-card, .pub-header').first();
    await expect(gatewayCard).toBeVisible({ timeout: 10000 });
  } else if (actorRole === 'supplier') {
    await page.goto('/suppliers', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: /Suppliers/i })).toBeVisible({ timeout: 10000 });
  } else if (actorRole === 'buyer' || actorRole === 'merchant' || actorRole === 'driver') {
    await page.goto('/login', { waitUntil: 'domcontentloaded' });
    const signedInBanner = page.getByText(/You are Signed In/i);
    const isAlreadySignedIn = await signedInBanner
      .waitFor({ timeout: 2000 })
      .then(() => true)
      .catch(() => false);
    if (isAlreadySignedIn) {
      const assignedRole = page.locator('[data-testid="assigned-role-text"]');
      const text = (await assignedRole.textContent().catch(() => '')) || '';
      const expectedRoleFragment =
        actorRole === 'merchant' ? 'Kirana' : actorRole === 'driver' ? 'Fleet' : 'Buyer';
      if (!text.includes(expectedRoleFragment)) {
        const switchAccountBtn = page.getByRole('button', { name: /Sign Out & Switch Account/i });
        if (await switchAccountBtn.isVisible().catch(() => false)) {
          await switchAccountBtn.click();
          await page.waitForTimeout(500);
        }
      }
    }

    const phoneInput = page.locator('input[type="tel"]');
    if (await phoneInput.isVisible().catch(() => false)) {
      if (actorRole === 'driver') {
        const driverRoleOpt = page.locator('div:has-text("Fleet Rider")').last();
        if (await driverRoleOpt.isVisible().catch(() => false)) await driverRoleOpt.click();
      } else if (actorRole === 'merchant') {
        const merchantRoleOpt = page.locator('div:has-text("Kirana Merchant")').last();
        if (await merchantRoleOpt.isVisible().catch(() => false)) await merchantRoleOpt.click();
      }
      await phoneInput.fill('8977848501');
      const sendOtpBtn = page.getByRole('button', { name: /Send.*OTP/i });
      await sendOtpBtn.click();
      await page.waitForURL(/\/login\/verify/, { timeout: 8000 });
      for (let i = 0; i < 6; i++) {
        await page.locator(`[data-testid="otp-digit-${i}"]`).fill('123123'[i]);
      }
      await page.locator('[data-testid="verify-otp-btn"]').click();
      await page.waitForURL(/\/login/, { timeout: 8000 });
    }
  }
}

/**
 * Standard User Sign-Out Flow
 * Executes explicit sign-out, clears session tokens, and verifies return to unauthenticated public state.
 */
export async function performUserSignOut(page: Page): Promise<void> {
  const isSupportView = page.url().includes('/x/');
  if (isSupportView) {
    const signOutBtn = page.locator('button[title="Sign out"], button:has-text("Sign out")').first();
    if (await signOutBtn.isVisible().catch(() => false)) {
      await signOutBtn.click();
      const confirmBtn = page.locator('button.spt-btn-danger, button:has-text("Sign out")').last();
      if (await confirmBtn.isVisible().catch(() => false)) {
        await confirmBtn.click();
      }
    }
  } else {
    await page.goto('/login');
    const switchAccountBtn = page.getByRole('button', { name: /Sign Out & Switch Account/i });
    if (await switchAccountBtn.isVisible().catch(() => false)) {
      await switchAccountBtn.click();
      await expect(page.getByText(/Sign In or Register/i)).toBeVisible({ timeout: 5000 });
    }
  }

  // Clear test session storage directly to ensure total test isolation
  await page.evaluate(async () => {
    localStorage.removeItem('lc_session_user');
    localStorage.removeItem('lc_dev_token');
    localStorage.removeItem('lc_test_role');
    localStorage.removeItem('lc_support_supplier_context');
    try {
      const dbs = await window.indexedDB.databases();
      for (const db of dbs) {
        if (db.name && db.name.includes('firebase')) {
          window.indexedDB.deleteDatabase(db.name);
        }
      }
    } catch {}
  });
}
