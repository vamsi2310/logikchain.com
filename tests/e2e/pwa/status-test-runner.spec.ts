import { test, expect } from '@playwright/test';
import { setupUseCaseTestData, performUserSignIn, performUserSignOut } from '../test-data-setup';

test.describe('UC-28 (FEAT-12.02): Live E2E Test Runner, Results Review & Video Playback Console', () => {

  test('SRE operator executes test data setup, signs in, audits test suites & video player, and signs out', async ({ page }) => {
    // Phase 1: Test Data Setup
    await setupUseCaseTestData(page, 'UC-28');

    // Phase 2: User Sign-In (SRE persona)
    await performUserSignIn(page, 'sre');

    // Phase 3: Core Business Flow
    // 1. Visit /status
    await page.goto('/status');

    // Verify main status header is visible
    await expect(page.getByText('Microservices & Database Mesh Telemetry')).toBeVisible();

    // 2. Click the "E2E Use Cases & Test Runner" tab
    const testRunnerTab = page.getByRole('button', { name: /E2E Use Cases & Test Runner/i });
    await expect(testRunnerTab).toBeVisible();
    await testRunnerTab.click();

    // Verify header updates to verification & QA
    await expect(page.getByText('Automated E2E Test Suites & Interactive Recordings')).toBeVisible();

    // 3. Verify metrics cards are displayed
    await expect(page.getByText('Total Use Cases', { exact: true })).toBeVisible();
    await expect(page.getByText('Passing Tests', { exact: true })).toBeVisible();
    await expect(page.getByText('Video Recordings', { exact: true })).toBeVisible();

    // 4. Verify user-flow-login-role-village suite is listed and has PASSED badge
    const userFlowCard = page.locator('div').filter({ hasText: 'user-flow-login-role-village' }).first();
    await expect(userFlowCard).toBeVisible();
    await expect(page.getByText(/User Journey: Login, Role Elevation, Corridor & Village Persistence/i)).toBeVisible();

    // 5. Verify "Watch Video" button exists for suites with recordings
    const watchVideoBtn = page.getByRole('button', { name: /Watch Video/i }).first();
    await expect(watchVideoBtn).toBeVisible();

    // 6. Open Video Modal
    await watchVideoBtn.click();

    // Verify Video Modal elements
    await expect(page.getByText('VERIFIED E2E RECORDING')).toBeVisible();
    const videoElement = page.locator('video');
    await expect(videoElement).toBeVisible();
    await expect(videoElement).toHaveAttribute('src', /\/recordings\/.*\.webm/);

    // Verify speed controls & download button
    await expect(page.getByRole('button', { name: '1.5x' })).toBeVisible();
    await expect(page.getByRole('link', { name: /Download \.webm/i })).toBeVisible();

    // Verify verified flow timeline is displayed
    await expect(page.getByText('Verified Flow Timeline in Video:')).toBeVisible();
    await expect(page.getByText(/User Sign-In|Phone/i).first()).toBeVisible();

    // Close video modal
    const closeBtn = page.locator('[data-testid="close-video-modal-btn"]');
    await expect(closeBtn).toBeVisible();
    await closeBtn.click();
    await expect(page.locator('video')).not.toBeVisible();

    // 7. Verify direct URL routing works for /status/tests
    await page.goto('/status/tests');
    await expect(page.getByText('Automated E2E Test Suites & Interactive Recordings')).toBeVisible();

    // Phase 4: Explicit User Sign-Out
    await performUserSignOut(page);
  });

});

