import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';

export interface UseCaseDefinition {
  number: string;
  title: string;
  epic: string;
  featureId: string;
  actor: 'buyer' | 'merchant' | 'driver' | 'supplier' | 'support' | 'admin' | 'sre';
  description: string;
  specFile: string;
  testData: {
    userId?: string;
    phone?: string;
    villageId?: string;
    targetSupplierId?: string;
    orderId?: string;
    driverId?: string;
    amount?: number;
    gstin?: string;
    otpCode?: string;
    currency?: string;
    mockState?: Record<string, any>;
  };
}

export const NUMBERED_USE_CASES: Record<string, UseCaseDefinition> = {
  'UC-01': {
    number: 'UC-01',
    title: 'Rural Phone OTP Sign-In & Role Bootstrapping',
    epic: 'EPIC-01',
    featureId: 'FEAT-01.01',
    actor: 'buyer',
    description: 'User enters rural mobile 8977848501, inputs 6-digit OTP 123123, bootstraps authenticated session with default Consumer/Buyer claims.',
    specFile: 'tests/e2e/pwa/user-flow-login-role-village.spec.ts',
    testData: {
      userId: 'usr_8977848501',
      phone: '8977848501',
      otpCode: '123123',
      villageId: 'village_peridepi_523273',
    },
  },
  'UC-02': {
    number: 'UC-02',
    title: 'Progressive Role Elevation to Kirana Merchant & Multi-Client Handoff',
    epic: 'EPIC-01',
    featureId: 'FEAT-01.03',
    actor: 'merchant',
    description: 'User requests role switch to Kirana Merchant, launches fullscreen role corridor (/m/gigs), and returns cleanly to website via Close App handover.',
    specFile: 'tests/e2e/pwa/user-flow-login-role-village.spec.ts',
    testData: {
      userId: 'usr_8977848501',
      targetSupplierId: 'sup_ongole_01',
      mockState: { requestedRole: 'merchant', corridor: '/m/gigs' },
    },
  },
  'UC-03': {
    number: 'UC-03',
    title: 'User Profile Village Selection & PostgreSQL Persistence',
    epic: 'EPIC-01',
    featureId: 'FEAT-01.06',
    actor: 'buyer',
    description: 'User navigates to /profile/edit, selects village_kandukur_523105, verifies persistence in identity microservice and badge display in UI.',
    specFile: 'tests/e2e/pwa/user-flow-login-role-village.spec.ts',
    testData: {
      userId: 'usr_8977848501',
      villageId: 'village_kandukur_523105',
    },
  },
  'UC-04': {
    number: 'UC-04',
    title: 'Trade Credit 2-Phase Hold & Headroom Circuit Breaker',
    epic: 'EPIC-08',
    featureId: 'FEAT-08.01',
    actor: 'merchant',
    description: 'Merchant evaluates credit headroom, reserves funds via 2-phase synchronous hold, and verifies over-extension circuit breaker.',
    specFile: 'tests/e2e/pwa/usecases-commerce.spec.ts',
    testData: {
      userId: 'usr_8977848501',
      targetSupplierId: 'sup_ongole_01',
      amount: 4500.0,
      mockState: { creditLimit: 100000.0, activeHoldTtlMinutes: 15 },
    },
  },
  'UC-05': {
    number: 'UC-05',
    title: 'Dynamic UPI QR Intent Generation & Webhook Settlement',
    epic: 'EPIC-05',
    featureId: 'FEAT-05.01',
    actor: 'merchant',
    description: 'Generates cryptographically signed UPI QR intent payload and processes idempotent payment gateway webhook settlement.',
    specFile: 'tests/e2e/pwa/usecases-commerce.spec.ts',
    testData: {
      orderId: 'ord_upi_523105',
      amount: 12500.0,
      currency: 'INR',
    },
  },
  'UC-06': {
    number: 'UC-06',
    title: 'End-to-End Order Creation, Vehicle Departure Gate & OTP Handover',
    epic: 'EPIC-02',
    featureId: 'FEAT-02.01',
    actor: 'merchant',
    description: 'Creates wholesale consignment order, validates vehicle payload capacity before departure, and completes delivery handover with 4-digit OTP.',
    specFile: 'tests/e2e/pwa/usecases-commerce.spec.ts',
    testData: {
      orderId: 'ord_b2b_kandukur_01',
      driverId: 'drv_kandukur_01',
      otpCode: '4821',
      amount: 15400.0,
    },
  },
  'UC-07': {
    number: 'UC-07',
    title: 'Order Deliverable Verification, Doorstep Rejection & 72-Hour RTO Protocol',
    epic: 'EPIC-02',
    featureId: 'FEAT-02.04',
    actor: 'buyer',
    description: 'Enforces contractual deliverable standards, line-item doorstep rejection before OTP signoff, and automated 72-hour PUDO RTO return.',
    specFile: 'tests/e2e/pwa/usecases-commerce.spec.ts',
    testData: {
      orderId: 'ord_rto_test_01',
      targetSupplierId: 'sup_ongole_01',
      mockState: { retentionHours: 72, nonReturnableSkus: ['seeds_tomato_f1'] },
    },
  },
  'UC-08': {
    number: 'UC-08',
    title: 'CoD Cash Collection, Custody Tracking & Daily Limit Guard',
    epic: 'EPIC-07',
    featureId: 'FEAT-07.01',
    actor: 'driver',
    description: 'Records physical Cash-on-Delivery collections, updates driver real-time custody balance, and enforces ₹50,000 transit ceiling.',
    specFile: 'tests/e2e/pwa/usecases-custody-payouts.spec.ts',
    testData: {
      driverId: 'drv_ongole_01',
      orderId: 'ord_cod_001',
      amount: 14500.0,
      mockState: { dailyCeiling: 50000.0 },
    },
  },
  'UC-09': {
    number: 'UC-09',
    title: 'End-of-Shift Cash Turn-In & Cryptographic Handover OTP Verification',
    epic: 'EPIC-07',
    featureId: 'FEAT-07.02',
    actor: 'driver',
    description: 'Driver initiates shift cash turn-in at supplier depot, generates 6-digit OTP, and discharges custody balance down to zero.',
    specFile: 'tests/e2e/pwa/usecases-custody-payouts.spec.ts',
    testData: {
      driverId: 'drv_ongole_01',
      otpCode: '829104',
      amount: 25000.0,
    },
  },
  'UC-10': {
    number: 'UC-10',
    title: 'Cash Discrepancy & The Payout Custody Gate Circuit Breaker',
    epic: 'EPIC-07',
    featureId: 'FEAT-07.03',
    actor: 'support',
    description: 'Detects cash remittance shortages, flags driver custody lock, and halts bank withdrawal requests until audit dispute resolution.',
    specFile: 'tests/e2e/pwa/usecases-custody-payouts.spec.ts',
    testData: {
      driverId: 'drv_ongole_01',
      amount: 1200.0,
      mockState: { reason: 'SHORTAGE_COUNT', isLocked: true },
    },
  },
  'UC-11': {
    number: 'UC-11',
    title: 'Bank Beneficiary Registration & KMS Account Encryption',
    epic: 'EPIC-06',
    featureId: 'FEAT-06.01',
    actor: 'driver',
    description: 'Registers driver bank account with AES-256-GCM envelope encryption, penny-drop validation, and masked PII data display.',
    specFile: 'tests/e2e/pwa/usecases-custody-payouts.spec.ts',
    testData: {
      userId: 'drv_ongole_01',
      mockState: { ifsc: 'HDFC0001234', maskedAccount: '**********7890' },
    },
  },
  'UC-12': {
    number: 'UC-12',
    title: 'Cloud Tasks Asynchronous IMPS Bank Transfer & UTR Settlement',
    epic: 'EPIC-06',
    featureId: 'FEAT-06.03',
    actor: 'driver',
    description: 'Disburses approved payouts through banking worker tasks, capturing immutable banking UTR and updating settlement records.',
    specFile: 'tests/e2e/pwa/usecases-custody-payouts.spec.ts',
    testData: {
      amount: 8500.0,
      mockState: { channel: 'IMPS', utrPrefix: 'UTR_BANK_' },
    },
  },
  'UC-13': {
    number: 'UC-13',
    title: 'Supplier Funds Tracking & Multi-Channel Allocation Governance',
    epic: 'EPIC-06',
    featureId: 'FEAT-06.04',
    actor: 'support',
    description: 'Monitors supplier escrow ledger breakdown into merchant PUDO commissions, driver delivery compensation, and bank disbursement.',
    specFile: 'tests/e2e/pwa/usecases-custody-payouts.spec.ts',
    testData: {
      targetSupplierId: 'sup_ongole_01',
      amount: 125000.0,
      mockState: { grossInflow: 150000.0, merchantAllocation: 8500.0, driverAllocation: 12000.0 },
    },
  },
  'UC-14': {
    number: 'UC-14',
    title: 'UPI TPAP Compliance, VPA Syntax Validation & Blacklist Rejection',
    epic: 'EPIC-11',
    featureId: 'FEAT-11.01',
    actor: 'support',
    description: 'Enforces NPCI TPAP guidelines, checks VPA syntax rules, and rejects transactions originating from blacklisted handles.',
    specFile: 'tests/e2e/pwa/usecases-governance-ledger.spec.ts',
    testData: {
      mockState: { validVpa: 'merchant.ongole@icici', blacklistedVpa: 'fraudster@upi' },
    },
  },
  'UC-15': {
    number: 'UC-15',
    title: 'Real-Time AML Fraud Velocity Interception & Account Freeze Gate',
    epic: 'EPIC-11',
    featureId: 'FEAT-11.02',
    actor: 'support',
    description: 'Intersects high-frequency transactions exceeding 5/minute or ₹50,000 threshold and triggers automatic risk score freeze.',
    specFile: 'tests/e2e/pwa/usecases-governance-ledger.spec.ts',
    testData: {
      userId: 'usr_suspicious_01',
      amount: 75000.0,
      mockState: { velocityThreshold: 5, riskScore: 88 },
    },
  },
  'UC-16': {
    number: 'UC-16',
    title: 'Dispute SLA Tracking, 24-Hour Countdown & Regulatory Reporting',
    epic: 'EPIC-11',
    featureId: 'FEAT-11.03',
    actor: 'support',
    description: 'Tracks dispute SLA resolution windows and compiles automated daily NPCI/statutory regulatory compliance files.',
    specFile: 'tests/e2e/pwa/usecases-governance-ledger.spec.ts',
    testData: {
      orderId: 'ord_dispute_101',
      mockState: { slaHours: 24, disputeReason: 'GOODS_NOT_RECEIVED' },
    },
  },
  'UC-17': {
    number: 'UC-17',
    title: 'Multi-Role Versioned Clickwrap Policy Consent & Mandatory Re-Consent Gate',
    epic: 'EPIC-11',
    featureId: 'FEAT-11.04',
    actor: 'support',
    description: 'Tracks versioned legal policies across personas and forces re-consent gates upon policy version bumps.',
    specFile: 'tests/e2e/pwa/usecases-governance-ledger.spec.ts',
    testData: {
      mockState: { currentPolicyVersion: 'v2.4', requireReConsent: true },
    },
  },
  'UC-18': {
    number: 'UC-18',
    title: 'Double-Entry Platform General Ledger & Zero-Sum Invariance Invariant Gate',
    epic: 'EPIC-09',
    featureId: 'FEAT-09.01',
    actor: 'support',
    description: 'Enforces immutable double-entry journal balance where total debits equal total credits with zero mathematical variance.',
    specFile: 'tests/e2e/pwa/usecases-governance-ledger.spec.ts',
    testData: {
      amount: 10000.0,
      mockState: { debitAccount: 'ESCROW_SETTLEMENT', creditAccount: 'MERCHANT_PAYABLE' },
    },
  },
  'UC-19': {
    number: 'UC-19',
    title: 'Nightly 3-Way Bank Reconciliation & Vertex AI Variance Analysis',
    epic: 'EPIC-09',
    featureId: 'FEAT-09.02',
    actor: 'support',
    description: 'Executes automated 01:00 AM nightly reconciliation matching domain transactions against bank escrow statements and payment gateway logs.',
    specFile: 'tests/e2e/pwa/usecases-governance-ledger.spec.ts',
    testData: {
      mockState: { totalLedgerRecords: 120, matchedRecords: 120, unmatchedVariance: 0 },
    },
  },
  'UC-20': {
    number: 'UC-20',
    title: 'Section 194C/194O TDS Deductions, Government Challan Settlement & Ledger Balancing',
    epic: 'EPIC-09',
    featureId: 'FEAT-09.03',
    actor: 'support',
    description: 'Calculates statutory TDS deductions on driver payouts (1%) and e-commerce gross sales, maintaining immutable quarterly challan ledgers.',
    specFile: 'tests/e2e/pwa/usecases-governance-ledger.spec.ts',
    testData: {
      amount: 50000.0,
      mockState: { tdsSection: '194C', tdsRate: 0.01, deduction: 500.0 },
    },
  },
  'UC-21': {
    number: 'UC-21',
    title: 'Critical Path Roadmap Golden Path Integration',
    epic: 'EPIC-12',
    featureId: 'FEAT-12.01',
    actor: 'support',
    description: 'Verifies the complete end-to-end golden path pipeline across all 6 architectural tiers.',
    specFile: 'tests/e2e/pwa/usecases-governance-ledger.spec.ts',
    testData: {
      mockState: { verifiedTiers: [0, 1, 2, 3, 4, 5] },
    },
  },
  'UC-22': {
    number: 'UC-22',
    title: 'Platform 4-Tier Geo-Hierarchy & Village Registry Management',
    epic: 'EPIC-10',
    featureId: 'FEAT-10.01',
    actor: 'support',
    description: 'Support operator audits Country, State, District, and Village hierarchy and manages rural delivery hub assignments.',
    specFile: 'tests/e2e/pwa/config-geo-hierarchy.spec.ts',
    testData: {
      mockState: { country: 'India', state: 'Andhra Pradesh', district: 'Prakasam' },
    },
  },
  'UC-23': {
    number: 'UC-23',
    title: 'Commercial SaaS Subscription Plans & Tiered Tariffs',
    epic: 'EPIC-10',
    featureId: 'FEAT-10.02',
    actor: 'support',
    description: 'Audits Silver, Gold, and Platinum merchant subscription tiers, active member quotas, and trade credit authorization limits.',
    specFile: 'tests/e2e/pwa/config-subscription-plans.spec.ts',
    testData: {
      mockState: { plans: ['Silver', 'Gold', 'Platinum'], renewalCycle: 'MONTHLY' },
    },
  },
  'UC-24': {
    number: 'UC-24',
    title: 'Statutory Commodity Tax Profiles & Regional GST Rates',
    epic: 'EPIC-10',
    featureId: 'FEAT-10.03',
    actor: 'support',
    description: 'Verifies commodity GST splits (0% essentials, 5% pulses, 18% consumer goods) and statutory TDS rate mappings.',
    specFile: 'tests/e2e/pwa/config-tax-profiles.spec.ts',
    testData: {
      mockState: { rates: [0, 5, 18], tdsCategories: ['194C', '194O'] },
    },
  },
  'UC-25': {
    number: 'UC-25',
    title: 'Supplier Bulk Ingestion & Selective Entity Loader',
    epic: 'EPIC-10',
    featureId: 'FEAT-10.08',
    actor: 'support',
    description: 'Pre-flight dry run validation of 11 supplier entity categories with schema error interception on invalid 14-character GSTINs.',
    specFile: 'tests/e2e/pwa/support-supplier-bulk-ingest.spec.ts',
    testData: {
      targetSupplierId: 'sup_ongole_01',
      gstin: '37AAAAA0000A1Z5',
      mockState: { invalidGstin: '37ABCDE0000Z1Z', expectedCategories: 11 },
    },
  },
  'UC-26': {
    number: 'UC-26',
    title: 'Support-as-Supplier Proxy Impersonation & Audit Trail',
    epic: 'EPIC-10',
    featureId: 'FEAT-10.04',
    actor: 'support',
    description: 'Operator impersonates supplier via proxy switcher with immutable audit logging and financial mutation exclusion guardrails.',
    specFile: 'tests/e2e/pwa/support-supplier-proxy.spec.ts',
    testData: {
      targetSupplierId: 'sup_ongole_01',
      mockState: { proxyHeader: 'X-Supplier-Context', allowedSuppliers: ['sup_ongole_01', 'sup_krishna_01'] },
    },
  },
  'UC-27': {
    number: 'UC-27',
    title: 'Microservices Mesh Health & Database Isolation Probes',
    epic: 'EPIC-12',
    featureId: 'FEAT-12.01',
    actor: 'sre',
    description: 'Verifies all 13 microservices and their dedicated isolated PostgreSQL databases reporting operational latency.',
    specFile: 'tests/e2e/pwa/status-services.spec.ts',
    testData: {
      mockState: { totalServices: 13, expectedMeshPort: 30080 },
    },
  },
  'UC-28': {
    number: 'UC-28',
    title: 'Live E2E Test Runner, Results Review & Video Playback Console',
    epic: 'EPIC-12',
    featureId: 'FEAT-12.02',
    actor: 'sre',
    description: 'Interactive test execution runner, telemetry report inspector, and video playback player at /status/tests.',
    specFile: 'tests/e2e/pwa/status-test-runner.spec.ts',
    testData: {
      mockState: { testRunnerUrl: '/status/tests', playbackSpeeds: [0.5, 1, 1.5, 2] },
    },
  },
  'UC-29': {
    number: 'UC-29',
    title: 'Automated Payment Refund & GST Credit Note Issuance',
    epic: 'EPIC-05',
    featureId: 'FEAT-05.03',
    actor: 'support',
    description: 'Customer order cancellation triggers automated payment refund, generates statutory GST credit note (CN-YYYY-XXXXXX), and updates ledger.',
    specFile: 'tests/e2e/pwa/usecases-refunds-credit.spec.ts',
    testData: {
      orderId: 'ord_cancelled_8812',
      amount: 1450.00,
      mockState: { reason: 'ORDER_CANCELLED_BY_CUSTOMER', refundChannel: 'ORIGINAL_UPI' },
    },
  },
  'UC-30': {
    number: 'UC-30',
    title: 'Credit Repayment Settlement, Statement Generation & Post-Due Relief',
    epic: 'EPIC-08',
    featureId: 'FEAT-08.03',
    actor: 'merchant',
    description: 'Merchant executes revolving credit repayment, restores available credit limit, generates multi-supplier statement, and applies post-due relief.',
    specFile: 'tests/e2e/pwa/usecases-refunds-credit.spec.ts',
    testData: {
      userId: 'mer_rural_01',
      targetSupplierId: 'sup_ongole_01',
      amount: 5000.00,
      mockState: { repaymentChannel: 'UPI', reliefExtendedDays: 14 },
    },
  },
  'UC-31': {
    number: 'UC-31',
    title: 'Trade Credit Agreement Acceptance, Aging Ledger & Default Lockdown',
    epic: 'EPIC-08',
    featureId: 'FEAT-08.04',
    actor: 'merchant',
    description: 'Merchant digitally accepts 14-day trade credit terms, monitors 4-bucket aging analysis, and system validates default recovery lockdown circuit breaker.',
    specFile: 'tests/e2e/pwa/usecases-refunds-credit.spec.ts',
    testData: {
      userId: 'mer_rural_01',
      targetSupplierId: 'sup_ongole_01',
      mockState: { termsVersion: 'v2.1', cycleDays: 14, defaultLockdownReason: 'EXCEEDED_MAX_OVERDUE_WINDOW' },
    },
  },
};

/**
 * Executes standardized Test Data Setup for a given numbered use case.
 * Injects required mock data, IDs, and session credentials.
 */
export async function setupUseCaseTestData(page: Page, useCaseNumber: string): Promise<UseCaseDefinition> {
  const uc = NUMBERED_USE_CASES[useCaseNumber];
  if (!uc) {
    throw new Error(`Unknown use case identifier: ${useCaseNumber}`);
  }

  await page.goto('/');
  await page.evaluate((data) => {
    // Inject usecase metadata
    localStorage.setItem('lc_active_usecase', data.number);
    localStorage.setItem('lc_active_usecase_title', data.title);

    // Inject persona role
    if (data.number === 'UC-01') {
      // Start in unauthenticated state for phone login flow
      localStorage.removeItem('lc_test_role');
      localStorage.removeItem('lc_dev_token');
      localStorage.removeItem('lc_session_user');
    } else if (data.actor === 'support' || data.actor === 'admin') {
      localStorage.removeItem('lc_session_user');
      localStorage.setItem('lc_test_role', 'support');
      localStorage.setItem('lc_dev_token', 'dev-token:test_operator_01:support');
    } else if (data.actor === 'driver') {
      localStorage.setItem('lc_test_role', 'driver');
      localStorage.setItem('lc_dev_token', 'dev-token:drv_ongole_01:driver');
      localStorage.setItem('lc_session_user', JSON.stringify({
        uid: 'drv_ongole_01',
        name: 'Rural Transporter',
        phone: '+919876543211',
        role: 'vehicle',
        status: 'approved',
      }));
    } else if (data.actor === 'supplier') {
      localStorage.setItem('lc_test_role', 'supplier');
      localStorage.setItem('lc_dev_token', 'dev-token:sup_ongole_01:supplier');
      localStorage.setItem('lc_session_user', JSON.stringify({
        uid: 'sup_ongole_01',
        name: 'Wholesale Mill Supplier',
        phone: '+919876543212',
        role: 'supplier',
        status: 'approved',
      }));
    } else if (data.actor === 'merchant') {
      localStorage.setItem('lc_test_role', 'merchant');
      localStorage.setItem('lc_dev_token', 'dev-token:usr_8977848501:merchant');
      localStorage.setItem('lc_session_user', JSON.stringify({
        uid: 'usr_8977848501',
        name: 'Kirana Merchant',
        phone: '8977848501',
        role: 'merchant',
        status: 'approved',
      }));
    } else {
      localStorage.setItem('lc_test_role', 'buyer');
      localStorage.setItem('lc_dev_token', 'dev-token:usr_8977848501:buyer');
      localStorage.setItem('lc_session_user', JSON.stringify({
        uid: 'usr_8977848501',
        name: 'Consumer Buyer',
        phone: '8977848501',
        role: 'buyer',
        status: 'approved',
      }));
    }

    // Inject test data entity payload
    if (data.testData) {
      localStorage.setItem(`lc_test_data_${data.number}`, JSON.stringify(data.testData));
      if (data.testData.targetSupplierId) {
        localStorage.setItem('lc_test_supplier_id', data.testData.targetSupplierId);
      }
      if (data.testData.villageId) {
        localStorage.setItem('lc_test_village_id', data.testData.villageId);
      }
    }
  }, uc);

  return uc;
}

/**
 * Standard User Sign-In Flow
 * Validates that the user is authenticated in the UI with active session headers.
 */
export async function performUserSignIn(page: Page, actorRole: string): Promise<void> {
  if (actorRole === 'support' || actorRole === 'admin') {
    await page.goto('/x/ops');
    // Ensure support console header or topbar is visible
    const topbar = page.locator('header.spt-topbar');
    await expect(topbar).toBeVisible({ timeout: 10000 });
  } else if (actorRole === 'buyer' || actorRole === 'merchant' || actorRole === 'driver') {
    await page.goto('/login');
    // If not already signed in, complete OTP flow
    const signedInBanner = page.getByText(/You are Signed In/i);
    const isAlreadySignedIn = await signedInBanner.isVisible().catch(() => false);
    if (!isAlreadySignedIn) {
      const phoneInput = page.locator('[data-testid="phone-input"]');
      if (await phoneInput.isVisible().catch(() => false)) {
        await phoneInput.fill('8977848501');
        await page.locator('[data-testid="request-otp-btn"]').click();
        const otpInput0 = page.locator('[data-testid="otp-input-0"]');
        await expect(otpInput0).toBeVisible({ timeout: 5000 });
        for (let i = 0; i < 6; i++) {
          await page.locator(`[data-testid="otp-input-${i}"]`).fill('123123'[i]);
        }
        await page.locator('[data-testid="verify-otp-btn"]').click();
        await expect(page.getByText(/You are Signed In/i)).toBeVisible({ timeout: 5000 });
      }
    }
  }
}

/**
 * Standard User Sign-Out Flow
 * Executes explicit sign-out, clears session tokens, and verifies return to unauthenticated public state.
 */
export async function performUserSignOut(page: Page): Promise<void> {
  // Check if inside Support console (/x/*)
  const isSupportView = page.url().includes('/x/');
  if (isSupportView) {
    const signOutBtn = page.locator('button[title="Sign out"], button:has-text("Sign out")').first();
    if (await signOutBtn.isVisible().catch(() => false)) {
      await signOutBtn.click();
      // Handle confirm modal if present
      const confirmBtn = page.locator('button.spt-btn-danger, button:has-text("Sign out")').last();
      if (await confirmBtn.isVisible().catch(() => false)) {
        await confirmBtn.click();
      }
    }
  } else {
    // Navigate to /login or public header
    await page.goto('/login');
    const switchAccountBtn = page.getByRole('button', { name: /Sign Out & Switch Account/i });
    if (await switchAccountBtn.isVisible().catch(() => false)) {
      await switchAccountBtn.click();
      await expect(page.getByText(/Sign In or Register/i)).toBeVisible({ timeout: 5000 });
    }
  }

  // Clear test session storage directly to ensure total test isolation
  await page.evaluate(() => {
    localStorage.removeItem('lc_session_user');
    localStorage.removeItem('lc_dev_token');
    localStorage.removeItem('lc_test_role');
    localStorage.removeItem('lc_support_supplier_context');
  });
}
