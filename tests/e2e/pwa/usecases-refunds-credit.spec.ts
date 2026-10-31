import { test, expect } from '@playwright/test';
import { setupUseCaseTestData, performUserSignIn, performUserSignOut } from '../test-data-setup';

test.describe('Automated Refunds, Credit Repayments & Terms Governance (FEAT-05.03, FEAT-08.03, FEAT-08.04)', () => {
  test.describe.configure({ mode: 'serial' });
  const GATEWAY_URL = process.env.GATEWAY_URL || 'http://localhost:30080';
  const SUPPORT_AUTH_HEADER = {
    Authorization: 'Bearer dev-token-support-admin',
    'x-client-platform': 'web',
    'x-user-role': 'support',
  };
  const MERCHANT_AUTH_HEADER = {
    Authorization: 'Bearer dev-token-merchant-auth',
    'x-client-platform': 'web',
    'x-user-role': 'merchant',
  };

  /**
   * UC-29 (FEAT-05.03): Automated Payment Refund & GST Credit Note Issuance
   * 4-Phase Lifecycle:
   * 1. Test Data Setup: Create UPI payment intent, simulate successful capture.
   * 2. User Sign-In: Support operator sign-in to support console.
   * 3. Core Business Flow: Initiate order refund, verify 201 Created, assert credit note number generation (CN-YYYY-XXXXXX),
   *    verify tax breakdown (CGST/SGST), inspect refund query endpoint.
   * 4. Explicit User Sign-Out.
   */
  test('UC-29 (FEAT-05.03): Automated Payment Refund & GST Credit Note Issuance', async ({ page }) => {
    // Phase 1: Test Data Setup
    const uc = await setupUseCaseTestData(page, 'UC-29');
    const orderId = `ord_refund_${Date.now()}`;
    const refundAmount = 1450.00;

    // Create payment intent
    const createIntentRes = await page.request.post(`${GATEWAY_URL}/v1/payments/intent`, {
      headers: SUPPORT_AUTH_HEADER,
      data: {
        orderId,
        amount: refundAmount,
        buyerId: 'usr_buyer_test_01',
        buyerVpa: 'buyer.test@okhdfcbank',
      },
    });
    expect(createIntentRes.ok()).toBeTruthy();
    const intentData = await createIntentRes.json();
    const paymentId = intentData.paymentIntent.intent_id;

    // Simulate PSP capture
    const captureRes = await page.request.post(`${GATEWAY_URL}/api/v1/payments/webhook`, {
      headers: {
        'content-type': 'application/json',
        'X-PSP-Signature': 'mock_valid_signature',
      },
      data: {
        event: 'payment.captured',
        payload: {
          payment: {
            entity: {
              id: paymentId,
              amount: refundAmount * 100,
              status: 'CAPTURED',
              notes: { intentId: paymentId },
            },
          },
        },
      },
    });
    expect(captureRes.ok()).toBeTruthy();

    // Phase 2: User Sign-In
    await performUserSignIn(page, uc.actor);

    // Phase 3: Core Business Flow - Execute Refund
    const refundRes = await page.request.post(`${GATEWAY_URL}/v1/payments/${paymentId}/refund`, {
      headers: SUPPORT_AUTH_HEADER,
      data: {
        amount: refundAmount,
        reason: 'CUSTOMER_CANCELLATION_DEFECTIVE_BATCH',
      },
    });
    expect(refundRes.status()).toBe(201);
    const refundData = await refundRes.json();
    expect(refundData.success).toBe(true);
    expect(refundData.refund.refund_id).toMatch(/^ref_/);
    expect(Number(refundData.refund.amount)).toBe(refundAmount);
    expect(refundData.refund.credit_note_number).toMatch(/^CN-\d{4}-\d+/);
    expect(refundData.refund.status).toBe('PROCESSED');

    // Query credit note details
    const creditNoteRes = await page.request.get(`${GATEWAY_URL}/v1/payments/${paymentId}/credit-note`, {
      headers: SUPPORT_AUTH_HEADER,
    });
    expect(creditNoteRes.ok()).toBeTruthy();
    const cnData = await creditNoteRes.json();
    expect(cnData.creditNote.creditNoteNumber).toBe(refundData.refund.credit_note_number);
    expect(cnData.creditNote.totalRefundAmount).toBe(refundAmount);
    expect(cnData.creditNote.taxableAmount).toBeGreaterThan(0);
    expect(cnData.creditNote.cgst + cnData.creditNote.sgst).toBeCloseTo(refundAmount - cnData.creditNote.taxableAmount, 1);

    // Query refunds list
    const listRefundsRes = await page.request.get(`${GATEWAY_URL}/v1/payments/${paymentId}/refunds`, {
      headers: SUPPORT_AUTH_HEADER,
    });
    expect(listRefundsRes.ok()).toBeTruthy();
    const listData = await listRefundsRes.json();
    expect(listData.refunds.length).toBeGreaterThanOrEqual(1);
    expect(listData.refunds[0].refund_id).toBe(refundData.refund.refund_id);

    // Phase 4: Explicit User Sign-Out
    await performUserSignOut(page);
  });

  /**
   * UC-30 (FEAT-08.03): Credit Repayment Settlement, Statement Generation & Post-Due Relief
   * 4-Phase Lifecycle:
   * 1. Test Data Setup: Seed merchant credit limit (₹50,000), place a hold (₹15,000) so utilized credit > 0.
   * 2. User Sign-In: Sign in as Kirana merchant.
   * 3. Core Business Flow: Execute partial credit repayment (₹5,000), assert available credit restoration,
   *    query comprehensive credit statement, and apply post-due relief extension (14 extra days).
   * 4. Explicit User Sign-Out.
   */
  test('UC-30 (FEAT-08.03): Credit Repayment Settlement, Statement Generation & Post-Due Relief', async ({ page }) => {
    // Phase 1: Test Data Setup
    const uc = await setupUseCaseTestData(page, 'UC-30');
    const merchantId = `mer_repay_${Date.now()}`;
    const supplierId = 'sup_ongole_01';

    // Establish credit profile
    const profileRes = await page.request.post(`${GATEWAY_URL}/v1/credit/limits`, {
      headers: SUPPORT_AUTH_HEADER,
      data: {
        merchantId,
        supplierId,
        creditLimit: 50000.0,
      },
    });
    expect(profileRes.ok()).toBeTruthy();

    // Place credit hold to utilize credit
    const holdRes = await page.request.post(`${GATEWAY_URL}/v1/credit/holds`, {
      headers: MERCHANT_AUTH_HEADER,
      data: {
        merchantId,
        supplierId,
        orderId: `ord_repay_${Date.now()}`,
        amount: 15000.0,
      },
    });
    expect(holdRes.ok()).toBeTruthy();

    // Phase 2: User Sign-In
    await performUserSignIn(page, uc.actor);

    // Phase 3: Core Business Flow - Confirm Credit Repayment
    const repayRes = await page.request.post(`${GATEWAY_URL}/v1/credit/repayments/confirm`, {
      headers: MERCHANT_AUTH_HEADER,
      data: {
        merchantId,
        supplierId,
        amount: 5000.0,
        repaymentChannel: 'UPI',
        referenceId: `UPI_REF_${Date.now()}`,
        notes: 'Partial weekly settlement for inventory order',
      },
    });
    expect(repayRes.status()).toBe(200);
    const repayData = await repayRes.json();
    expect(repayData.success).toBe(true);
    expect(Number(repayData.repayment.amount)).toBe(5000.0);
    expect(Number(repayData.profile.utilized_credit)).toBe(10000.0); // 15,000 - 5,000
    expect(Number(repayData.profile.available_credit)).toBe(40000.0); // 50,000 - 10,000

    // Query comprehensive credit statement
    const statementRes = await page.request.get(`${GATEWAY_URL}/v1/credit/merchants/${merchantId}/statement`, {
      headers: MERCHANT_AUTH_HEADER,
    });
    expect(statementRes.ok()).toBeTruthy();
    const stmt = await statementRes.json();
    expect(stmt.merchantId).toBe(merchantId);
    expect(stmt.summary.totalLimit).toBe(50000.0);
    expect(stmt.summary.totalUtilized).toBe(10000.0);
    expect(stmt.summary.totalAvailable).toBe(40000.0);
    expect(stmt.recentRepayments.length).toBeGreaterThanOrEqual(1);

    // Apply Post-Due Relief Plan
    const reliefRes = await page.request.post(`${GATEWAY_URL}/v1/credit/merchants/${merchantId}/relief`, {
      headers: SUPPORT_AUTH_HEADER,
      data: {
        supplierId,
        reliefType: 'POST_DUE_HARVEST_CYCLE_EXTENSION',
        extendedDays: 14,
        waivedPenalties: 250.0,
        notes: 'Monsoon delay relief granted under rural merchant charter',
      },
    });
    expect(reliefRes.status()).toBe(201);
    const reliefData = await reliefRes.json();
    expect(reliefData.success).toBe(true);
    expect(reliefData.reliefPlan.relief_type).toBe('POST_DUE_HARVEST_CYCLE_EXTENSION');
    expect(reliefData.profile.status).toBe('ACTIVE');
    expect(reliefData.profile.terms_cycle_days).toBeGreaterThanOrEqual(28);

    // Phase 4: Explicit User Sign-Out
    await performUserSignOut(page);
  });

  /**
   * UC-31 (FEAT-08.04): Trade Credit Agreement Acceptance, Aging Ledger & Default Recovery Lockdown
   * 4-Phase Lifecycle:
   * 1. Test Data Setup: Seed merchant credit profile with supplier.
   * 2. User Sign-In: Sign in as Kirana merchant.
   * 3. Core Business Flow: Query terms, digitally accept trade credit agreement, compute aging buckets,
   *    trigger default recovery lockdown, and verify circuit breaker blocks subsequent holds (403 CREDIT_LOCKED).
   * 4. Explicit User Sign-Out.
   */
  test('UC-31 (FEAT-08.04): Trade Credit Agreement Acceptance, Aging Ledger & Default Recovery Lockdown', async ({ page }) => {
    // Phase 1: Test Data Setup
    const uc = await setupUseCaseTestData(page, 'UC-31');
    const merchantId = `mer_terms_${Date.now()}`;
    const supplierId = 'sup_ongole_01';

    // Establish credit profile
    const profileRes = await page.request.post(`${GATEWAY_URL}/v1/credit/limits`, {
      headers: SUPPORT_AUTH_HEADER,
      data: {
        merchantId,
        supplierId,
        creditLimit: 30000.0,
      },
    });
    expect(profileRes.ok()).toBeTruthy();

    // Phase 2: User Sign-In
    await performUserSignIn(page, uc.actor);

    // Phase 3: Core Business Flow - Digital Acceptance of Trade Credit Agreement
    const acceptRes = await page.request.post(`${GATEWAY_URL}/v1/credit/merchants/${merchantId}/suppliers/${supplierId}/terms/accept`, {
      headers: MERCHANT_AUTH_HEADER,
      data: {
        termsVersion: 'v2.1',
        cycleDays: 14,
        interestRatePct: 1.5,
        acceptedBy: 'usr_8977848501',
      },
    });
    expect(acceptRes.status()).toBe(201);
    const acceptData = await acceptRes.json();
    expect(acceptData.success).toBe(true);
    expect(acceptData.agreement.terms_version).toBe('v2.1');
    expect(acceptData.agreement.accepted_by).toBe('usr_8977848501');

    // Query terms with latest agreement
    const termsRes = await page.request.get(`${GATEWAY_URL}/v1/credit/merchants/${merchantId}/suppliers/${supplierId}/terms`, {
      headers: MERCHANT_AUTH_HEADER,
    });
    expect(termsRes.ok()).toBeTruthy();
    const termsData = await termsRes.json();
    expect(termsData.merchantId).toBe(merchantId);
    expect(termsData.repaymentCycleDays).toBe(14);
    expect(termsData.latestAgreement).not.toBeNull();
    expect(termsData.latestAgreement.terms_version).toBe('v2.1');

    // Check Aging Ledger Analysis
    const agingRes = await page.request.get(`${GATEWAY_URL}/v1/credit/merchants/${merchantId}/aging`, {
      headers: MERCHANT_AUTH_HEADER,
    });
    expect(agingRes.ok()).toBeTruthy();
    const agingData = await agingRes.json();
    expect(agingData).toHaveProperty('agingBuckets');
    expect(agingData.agingBuckets).toHaveProperty('current_0_14_days');
    expect(agingData.agingBuckets).toHaveProperty('grace_15_20_days');
    expect(agingData.agingBuckets).toHaveProperty('overdue_21_30_days');
    expect(agingData.agingBuckets).toHaveProperty('default_31_plus_days');

    // Trigger Default Recovery Lockdown Circuit Breaker
    const lockdownRes = await page.request.post(`${GATEWAY_URL}/v1/credit/merchants/${merchantId}/lockdown`, {
      headers: SUPPORT_AUTH_HEADER,
      data: {
        supplierId,
        reason: 'OVERDUE_PAYMENT_EXCEEDED_GRACE_PERIOD',
      },
    });
    expect(lockdownRes.status()).toBe(200);
    const lockData = await lockdownRes.json();
    expect(lockData.lockdownStatus).toBe('OVERDUE_LOCKED');
    expect(lockData.profile.status).toBe('OVERDUE_LOCKED');

    // Verify circuit breaker: new credit hold attempt MUST fail with 403 CREDIT_LOCKED
    const blockedHoldRes = await page.request.post(`${GATEWAY_URL}/v1/credit/holds`, {
      headers: MERCHANT_AUTH_HEADER,
      data: {
        merchantId,
        supplierId,
        orderId: `ord_blocked_${Date.now()}`,
        amount: 2000.0,
      },
    });
    expect(blockedHoldRes.status()).toBe(403);
    const errBody = await blockedHoldRes.json();
    expect(errBody.error.code).toBe('CREDIT_LOCKED');

    // Raise Dispute against overdue charge
    const disputeRes = await page.request.post(`${GATEWAY_URL}/v1/credit/merchants/${merchantId}/disputes`, {
      headers: MERCHANT_AUTH_HEADER,
      data: {
        supplierId,
        reason: 'DISPUTED_OVERDUE_INTEREST_DUE_TO_BANK_GATEWAY_OUTAGE',
        disputedAmount: 450.0,
      },
    });
    expect(disputeRes.status()).toBe(201);
    const disputeData = await disputeRes.json();
    expect(disputeData.success).toBe(true);
    expect(disputeData.dispute.status).toBe('OPEN');

    // Phase 4: Explicit User Sign-Out
    await performUserSignOut(page);
  });
});

