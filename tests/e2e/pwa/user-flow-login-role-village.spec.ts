import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { setupUseCaseTestData, performUserSignOut } from '../test-data-setup';

test.describe('End-to-End User Flow: Login, Role Switch, Fullscreen App, and Village Update', () => {

  test.beforeEach(async ({ page }) => {
    // Standardized Test Data Setup for UC-01, UC-02, UC-03
    await setupUseCaseTestData(page, 'UC-01');

    // Reset test user in PostgreSQL to clean state (role: buyer, village: village_peridepi_523273)
    await page.request.patch('http://localhost:30080/v1/users/usr_8977848501', {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer dev-token:usr_8977848501:buyer',
      },
      data: {
        villageId: 'village_peridepi_523273',
      },
    });

    await page.request.post('http://localhost:30080/v1/buyers/usr_8977848501/role', {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer dev-token:usr_8977848501:buyer',
      },
      data: {
        targetRole: 'buyer',
      },
    });
  });

  test('UC-01 / UC-02 / UC-03: Complete User Journey: Phone Login -> Contact Support & Switch Role -> Open Fullscreen App -> Close App -> Update Village -> Explicit Sign Out', async ({ page }) => {
    // ─── STEP 1: Phone Login with 8977848501 and OTP 123123 ────────────────────
    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    // Fill phone number 8977848501
    const phoneInput = page.locator('input[type="tel"]');
    await expect(phoneInput).toBeVisible();
    await phoneInput.fill('8977848501');

    // Click Send OTP
    const sendOtpBtn = page.getByRole('button', { name: /Send.*OTP/i });
    await expect(sendOtpBtn).toBeVisible();
    await sendOtpBtn.click();

    // Verify redirected to /login/verify
    await expect(page).toHaveURL(/\/login\/verify/);

    // Enter OTP 123123 into the 6 digits input fields
    const codeDigits = ['1', '2', '3', '1', '2', '3'];
    for (let i = 0; i < 6; i++) {
      const input = page.locator(`[data-testid="otp-digit-${i}"]`);
      await expect(input).toBeVisible();
      await input.fill(codeDigits[i]);
    }

    // Click Verify & Continue
    const verifyBtn = page.locator('[data-testid="verify-otp-btn"]');
    await expect(verifyBtn).toBeVisible();
    await verifyBtn.click();

    // ─── STEP 2: Authenticated View & Role Switch via Support ───────────────────
    await expect(page).toHaveURL(/\/login/);
    await expect(page.getByText('You are Signed In')).toBeVisible();

    // Verify initial assigned role is Consumer / Buyer
    const assignedRoleText = page.locator('[data-testid="assigned-role-text"]');
    await expect(assignedRoleText).toContainText('Consumer / Buyer');

    // Verify initial village
    const villageText = page.locator('[data-testid="user-village-text"]');
    await expect(villageText).toContainText('village_peridepi_523273');

    // Click "Contact Support to Switch Role" button
    const contactSupportBtn = page.locator('[data-testid="contact-support-role-btn"]');
    await expect(contactSupportBtn).toBeVisible();
    await contactSupportBtn.click();

    // Verify Role Switch Form is now visible
    const roleForm = page.locator('[data-testid="role-switch-form"]');
    await expect(roleForm).toBeVisible();

    // Select "Kirana Merchant" role
    const roleSelect = page.locator('[data-testid="role-switch-select"]');
    await roleSelect.selectOption('merchant');

    // Provide reason
    const reasonInput = page.locator('[data-testid="role-switch-reason"]');
    await reasonInput.fill('Requesting Kirana Merchant Terminal access for rural retail shop in Kandukur corridor.');

    // Submit the Role Switch Request
    const submitRoleBtn = page.locator('[data-testid="submit-role-switch-btn"]');
    await submitRoleBtn.click();

    // Verify role is converted to merchant in the UI
    await expect(assignedRoleText).toContainText('Kirana Merchant');

    // ─── STEP 3: Open App into Full Screen (Web Header & Footer Hidden) ─────────
    const openAppBtn = page.getByRole('button', { name: /Open App/i });
    await expect(openAppBtn).toBeVisible();
    await openAppBtn.click();

    // Based on user's current role provided by Identity Microservice ('merchant'),
    // the App opens the merchant corridor (/m/gigs)
    await expect(page).toHaveURL(/\/m\/gigs/);

    // Verify the public website's top section (pub-header) and bottom section (pub-footer) are NOT visible
    const pubHeader = page.locator('[data-testid="pub-header"]');
    const pubFooter = page.locator('[data-testid="pub-footer"]');
    await expect(pubHeader).not.toBeVisible();
    await expect(pubFooter).not.toBeVisible();

    // Verify the Close App button is visible in full screen app
    const closeAppBtn = page.locator('[data-testid="close-app-btn"]');
    await expect(closeAppBtn).toBeVisible();

    // ─── STEP 4: Close App and Return to Website ───────────────────────────────
    await closeAppBtn.click();

    // Verify returned to the website root
    await expect(page).toHaveURL('http://localhost:5173/');

    // On website, top header and bottom footer are visible again
    await expect(pubHeader).toBeVisible();
    await expect(pubFooter).toBeVisible();

    // Website header shows "Open App →" for active session
    await expect(page.locator('[data-testid="pub-header"] [data-testid="open-app-btn"]')).toBeVisible();

    // ─── STEP 5: Update Village via Microservice & Verify UI ────────────────────
    // Navigate to profile edit screen
    await page.goto('/profile/edit');
    await page.waitForLoadState('networkidle');

    // Select a new village: village_kandukur_523105
    const villageSelect = page.locator('[data-testid="profile-village-select"]');
    await expect(villageSelect).toBeVisible();
    await villageSelect.selectOption('village_kandukur_523105');

    // Save profile
    const saveProfileBtn = page.locator('[data-testid="save-profile-btn"]');
    await saveProfileBtn.click();

    // Wait for save completion toast
    await expect(page.getByText('Saved village & profile successfully')).toBeVisible();

    // Navigate to profile overview
    await page.goto('/profile');
    await page.waitForLoadState('networkidle');

    // Verify the updated village is displayed in UI
    const profileVillage = page.locator('[data-testid="profile-village-display"]');
    await expect(profileVillage).toContainText('village_kandukur_523105');

    // Also verify persistence directly against Identity Microservice API
    const userRes = await page.request.get('http://localhost:30080/v1/users/usr_8977848501', {
      headers: {
        'Authorization': 'Bearer dev-token:usr_8977848501:merchant',
      },
    });
    expect(userRes.ok()).toBeTruthy();
    const userData = await userRes.json();
    expect(userData.user.village_id).toBe('village_kandukur_523105');
    expect(userData.user.role).toBe('merchant');

    // ─── STEP 6: Explicit Sign-Out Flow ─────────────────────────────────────────
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    const signOutBtn = page.getByRole('button', { name: /Sign Out & Switch Account/i });
    await expect(signOutBtn).toBeVisible();
    await signOutBtn.click();

    // Verify redirected/returned to unauthenticated sign-in prompt
    await expect(page.getByText('Sign In or Register')).toBeVisible();

    // Verify session tokens removed from localStorage
    const storedToken = await page.evaluate(() => localStorage.getItem('lc_dev_token'));
    const storedUser = await page.evaluate(() => localStorage.getItem('lc_session_user'));
    expect(storedToken).toBeNull();
    expect(storedUser).toBeNull();
  });

});
