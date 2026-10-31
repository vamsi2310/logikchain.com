import { test, expect } from '@playwright/test';
import { setupUseCaseTestData, performUserSignIn, performUserSignOut } from '../test-data-setup';

test.describe('Phase 4: Field Custody & Cash Management (UC-08 to UC-13)', () => {
  const GATEWAY_URL = process.env.GATEWAY_URL || 'http://localhost:30080';

  const SUPPORT_AUTH_HEADER = {
    Authorization: 'Bearer dev-token-support-admin',
    'x-client-platform': 'web',
    'x-user-role': 'support',
  };

  const DRIVER_AUTH_HEADER = {
    Authorization: 'Bearer dev-token-driver-rural',
    'x-client-platform': 'android',
    'x-user-role': 'driver',
  };

  const SYSTEM_AUTH_HEADER = {
    Authorization: 'Bearer dev-token-cloud-tasks-runner',
    'x-client-platform': 'system',
    'x-user-role': 'system',
  };

  const ADMIN_AUTH_HEADER = {
    Authorization: 'Bearer dev-token-admin-lead',
    'x-client-platform': 'web',
    'x-user-role': 'admin',
  };

  /**
   * UC-08 (UC-CSH-01): CoD Cash Collection, Custody Tracking & Daily Limit Guard
   * 4-Phase Lifecycle:
   * 1. Test Data Setup: Seed driver custody limits.
   * 2. User Sign-In: Authenticate driver session.
   * 3. Core Business Flow: Check zero balance, record collection, verify balance increment, trip daily insurance ceiling (422).
   * 4. Explicit User Sign-Out.
   */
  test('UC-08 (UC-CSH-01): CoD Cash Collection, Custody Tracking & Daily Limit Guard', async ({ page }) => {
    // Phase 1: Test Data Setup
    await setupUseCaseTestData(page, 'UC-08');

    // Phase 2: User Sign-In
    await performUserSignIn(page, 'driver');

    const driverId = `drv_${Date.now()}`;
    const orderId = `ord_cod_${Date.now()}`;

    // Phase 3: Core Business Flow
    // 1. Initial custody summary should show 0 active balance
    const initSummaryRes = await page.request.get(`${GATEWAY_URL}/v1/cash/summary/${driverId}`, {
      headers: DRIVER_AUTH_HEADER,
    });
    expect(initSummaryRes.ok()).toBeTruthy();
    const initData = await initSummaryRes.json();
    expect(initData.driverId).toBe(driverId);
    expect(initData.activeBalance).toBe(0.0);
    expect(initData.unresolvedDiscrepancyCount).toBe(0);
    expect(initData.isLocked).toBe(false);

    // 2. Record valid CoD cash collection of ₹2,500
    const collectRes = await page.request.post(`${GATEWAY_URL}/v1/cash/collections`, {
      headers: {
        ...DRIVER_AUTH_HEADER,
        'Idempotency-Key': `idemp_${Date.now()}_1`,
      },
      data: {
        driverId,
        orderId,
        amount: 2500.0,
        collectionType: 'COD',
        notes: 'Collected physical cash for agricultural seeds',
      },
    });
    expect(collectRes.ok()).toBeTruthy();
    const collectData = await collectRes.json();
    expect(collectData.success).toBe(true);
    expect(collectData.activeBalance).toBe(2500.0);
    expect(collectData.collection.amount).toBe('2500.00');

    // 3. Verify driver custody balance updated
    const updatedSummaryRes = await page.request.get(`${GATEWAY_URL}/v1/cash/summary/${driverId}`, {
      headers: DRIVER_AUTH_HEADER,
    });
    const updatedData = await updatedSummaryRes.json();
    expect(updatedData.activeBalance).toBe(2500.0);
    expect(updatedData.totalCollected).toBe(2500.0);

    // 4. Circuit Breaker Test: Exceeding daily field cash transit insurance ceiling (₹50,000)
    const overLimitRes = await page.request.post(`${GATEWAY_URL}/v1/cash/collections`, {
      headers: DRIVER_AUTH_HEADER,
      data: {
        driverId,
        orderId: `ord_excess_${Date.now()}`,
        amount: 55000.0, // 2500 + 55000 > 50000 ceiling
        collectionType: 'COD',
      },
    });
    expect(overLimitRes.status()).toBe(422);
    const errData = await overLimitRes.json();
    expect(errData.error.code).toBe('DAILY_CUSTODY_LIMIT_EXCEEDED');

    // Phase 4: Explicit User Sign-Out
    await performUserSignOut(page);
  });

  /**
   * UC-09 (UC-CSH-02): End-of-Shift Cash Turn-In & Cryptographic Handover OTP Verification
   * 4-Phase Lifecycle:
   * 1. Test Data Setup: Seed shift turn-in state.
   * 2. User Sign-In: Authenticate driver session.
   * 3. Core Business Flow: Accumulate cash, declare turn-in OTP, verify bad OTP (400), confirm with valid OTP, assert replay block.
   * 4. Explicit User Sign-Out.
   */
  test('UC-09 (UC-CSH-02): End-of-Shift Cash Turn-In & Cryptographic Handover OTP Verification', async ({ page }) => {
    // Phase 1: Test Data Setup
    await setupUseCaseTestData(page, 'UC-09');

    // Phase 2: User Sign-In
    await performUserSignIn(page, 'driver');

    const driverId = `drv_shift_${Date.now()}`;
    const cashierId = 'cashier_depot_ongole';

    // Phase 3: Core Business Flow
    // 1. Accumulate cash in driver custody (₹8,500)
    await page.request.post(`${GATEWAY_URL}/v1/cash/collections`, {
      headers: DRIVER_AUTH_HEADER,
      data: {
        driverId,
        orderId: `ord_acc_${Date.now()}`,
        amount: 8500.0,
        collectionType: 'COD',
      },
    });

    // 2. Driver declares cash handover at depot
    const declareRes = await page.request.post(`${GATEWAY_URL}/v1/cash/handover/declare`, {
      headers: DRIVER_AUTH_HEADER,
      data: {
        driverId,
        recipientId: cashierId,
        declaredAmount: 8500.0,
      },
    });
    expect(declareRes.ok()).toBeTruthy();
    const declareData = await declareRes.json();
    expect(declareData.success).toBe(true);
    expect(declareData.handoverId).toBeDefined();
    expect(declareData.verificationCode).toMatch(/^\d{6}$/); // 6-digit OTP

    const { handoverId, verificationCode } = declareData;

    // 3. Negative check: Cashier inputs incorrect OTP code
    const badCodeRes = await page.request.post(`${GATEWAY_URL}/v1/cash/handover/confirm`, {
      headers: SUPPORT_AUTH_HEADER,
      data: {
        handoverId,
        driverId,
        receivedAmount: 8500.0,
        verificationCode: '000000', // Invalid OTP
      },
    });
    expect(badCodeRes.status()).toBe(400);
    const badData = await badCodeRes.json();
    expect(badData.error.code).toBe('INVALID_CODE');

    // 4. Cashier confirms handover with valid OTP
    const confirmRes = await page.request.post(`${GATEWAY_URL}/v1/cash/handover/confirm`, {
      headers: SUPPORT_AUTH_HEADER,
      data: {
        handoverId,
        driverId,
        receivedAmount: 8500.0,
        verificationCode,
      },
    });
    expect(confirmRes.ok()).toBeTruthy();
    const confirmData = await confirmRes.json();
    expect(confirmData.success).toBe(true);
    expect(confirmData.handover.status).toBe('CONFIRMED');
    expect(confirmData.remainingCustodyBalance).toBe(0.0); // Discharged to 0

    // 5. Replay Protection: Attempting to verify the same OTP again fails
    const replayRes = await page.request.post(`${GATEWAY_URL}/v1/cash/handover/confirm`, {
      headers: SUPPORT_AUTH_HEADER,
      data: {
        handoverId,
        driverId,
        receivedAmount: 8500.0,
        verificationCode,
      },
    });
    expect(replayRes.status()).toBe(400);
    const replayData = await replayRes.json();
    expect(replayData.error.code).toBe('CODE_REPLAYED');

    // Phase 4: Explicit User Sign-Out
    await performUserSignOut(page);
  });

  /**
   * UC-10 (UC-CSH-03 & UC-PAY-02): Cash Discrepancy & The Payout Custody Gate Circuit Breaker
   * 4-Phase Lifecycle:
   * 1. Test Data Setup: Seed discrepancy scenario.
   * 2. User Sign-In: Authenticate support session.
   * 3. Core Business Flow: Raise cash shortage, assert 403 on driver payout withdrawal, resolve discrepancy, verify payout succeeds.
   * 4. Explicit User Sign-Out.
   */
  test('UC-10 (UC-CSH-03 & UC-PAY-02): Cash Discrepancy & The Payout Custody Gate Circuit Breaker', async ({ page }) => {
    // Phase 1: Test Data Setup
    await setupUseCaseTestData(page, 'UC-10');

    // Phase 2: User Sign-In
    await performUserSignIn(page, 'support');

    const driverId = `drv_gate_${Date.now()}`;
    const cashierId = 'cashier_depot_chirala';

    // Phase 3: Core Business Flow
    // 1. Cashier identifies a cash shortage (declared 10,000, counted 9,500 -> 500 shortfall)
    const discRes = await page.request.post(`${GATEWAY_URL}/v1/cash/discrepancies`, {
      headers: SUPPORT_AUTH_HEADER,
      data: {
        driverId,
        cashierId,
        declaredAmount: 10000.0,
        countedAmount: 9500.0,
        reason: 'CASH_SHORTFALL',
        notes: '₹500 note missing in cash bundle',
      },
    });
    expect(discRes.ok()).toBeTruthy();
    const discData = await discRes.json();
    expect(discData.success).toBe(true);
    expect(discData.discrepancy.status).toBe('UNDER_REVIEW');
    const discrepancyId = discData.discrepancy.discrepancy_id;

    // 2. Query driver cash summary - verify driver is marked locked with 1 unresolved discrepancy
    const summaryRes = await page.request.get(`${GATEWAY_URL}/v1/cash/summary/${driverId}`, {
      headers: DRIVER_AUTH_HEADER,
    });
    const summaryData = await summaryRes.json();
    expect(summaryData.isLocked).toBe(true);
    expect(summaryData.unresolvedDiscrepancyCount).toBe(1);

    // 3. CIRCUIT BREAKER TRIGGER: Driver attempts payout withdrawal while discrepancy is open
    const blockedPayoutRes = await page.request.post(`${GATEWAY_URL}/v1/payouts/requests`, {
      headers: DRIVER_AUTH_HEADER,
      data: {
        recipientId: driverId,
        recipientType: 'DRIVER',
        amount: 4200.0,
      },
    });
    // Strict Payout Custody Gate: Expect 403 Forbidden
    expect(blockedPayoutRes.status()).toBe(403);
    const blockedData = await blockedPayoutRes.json();
    expect(blockedData.error.code).toBe('CASH_CUSTODY_DISCREPANCY_UNRESOLVED');
    expect(blockedData.error.message).toContain('Payout Custody Gate Block');

    // 4. Support audits and resolves the discrepancy
    const resolveRes = await page.request.post(`${GATEWAY_URL}/v1/cash/discrepancies/${discrepancyId}/resolve`, {
      headers: SUPPORT_AUTH_HEADER,
      data: {
        resolutionStatus: 'RESOLVED',
        resolutionNotes: 'Driver provided missing ₹500 at audit desk',
        resolvedBy: 'ops_lead_01',
      },
    });
    expect(resolveRes.ok()).toBeTruthy();
    const resolveData = await resolveRes.json();
    expect(resolveData.success).toBe(true);
    expect(resolveData.discrepancy.status).toBe('RESOLVED');

    // 5. Verification: Driver is now unlocked
    const unlockedSummary = await page.request.get(`${GATEWAY_URL}/v1/cash/summary/${driverId}`, {
      headers: DRIVER_AUTH_HEADER,
    });
    const unlockedData = await unlockedSummary.json();
    expect(unlockedData.isLocked).toBe(false);
    expect(unlockedData.unresolvedDiscrepancyCount).toBe(0);

    // 6. Payout Request Now Succeeds (auto-approved under threshold <= 5,000, Section 194C TDS 1% deducted)
    const approvedPayoutRes = await page.request.post(`${GATEWAY_URL}/v1/payouts/requests`, {
      headers: DRIVER_AUTH_HEADER,
      data: {
        recipientId: driverId,
        recipientType: 'DRIVER',
        amount: 4200.0,
      },
    });
    expect(approvedPayoutRes.ok()).toBeTruthy();
    const payoutData = await approvedPayoutRes.json();
    expect(payoutData.success).toBe(true);
    expect(payoutData.status).toBe('APPROVED');
    expect(payoutData.grossAmount).toBe(4200.0);
    expect(payoutData.tdsDeducted).toBe(42.0); // 1% Section 194C
    expect(payoutData.netAmount).toBe(4158.0);

    // Phase 4: Explicit User Sign-Out
    await performUserSignOut(page);
  });

  /**
   * UC-11 (UC-PAY-01): Bank Beneficiary Registration & KMS Account Encryption
   * 4-Phase Lifecycle:
   * 1. Test Data Setup: Seed driver bank beneficiary registration data.
   * 2. User Sign-In: Authenticate driver session.
   * 3. Core Business Flow: Register beneficiary bank details, verify masking and penny drop verification.
   * 4. Explicit User Sign-Out.
   */
  test('UC-11 (UC-PAY-01): Bank Beneficiary Registration & KMS Account Encryption', async ({ page }) => {
    // Phase 1: Test Data Setup
    await setupUseCaseTestData(page, 'UC-11');

    // Phase 2: User Sign-In
    await performUserSignIn(page, 'driver');

    const userId = `usr_bank_${Date.now()}`;

    // Phase 3: Core Business Flow
    // 1. Register beneficiary bank details as Driver
    const regRes = await page.request.post(`${GATEWAY_URL}/v1/payouts/beneficiaries`, {
      headers: DRIVER_AUTH_HEADER,
      data: {
        userId,
        recipientType: 'DRIVER',
        accountHolderName: 'Venkata Raman',
        accountNumber: '50100234567890',
        ifscCode: 'HDFC0001234',
      },
    });
    expect(regRes.ok()).toBeTruthy();
    const regData = await regRes.json();
    expect(regData.success).toBe(true);
    expect(regData.beneficiaryId).toBeDefined();
    expect(regData.beneficiary.maskedAccount).toBe('**********7890');
    expect(regData.beneficiary.maskedIfsc).toBe('HDFC****234');
    expect(regData.beneficiary.pennyDropStatus).toBe('VERIFIED');

    const { beneficiaryId } = regData;

    // 2. Query beneficiary - verify raw account number is never leaked
    const getRes = await page.request.get(`${GATEWAY_URL}/v1/payouts/beneficiaries/${beneficiaryId}`, {
      headers: DRIVER_AUTH_HEADER,
    });
    expect(getRes.ok()).toBeTruthy();
    const getData = await getRes.json();
    expect(getData.maskedAccount).toBe('**********7890');
    expect(getData).not.toHaveProperty('accountNumber');
    expect(getData).not.toHaveProperty('account_number_encrypted');

    // Phase 4: Explicit User Sign-Out
    await performUserSignOut(page);
  });

  /**
   * UC-12 (UC-PAY-03): Cloud Tasks IMPS Bank Transfer Execution & UTR Settlement
   * 4-Phase Lifecycle:
   * 1. Test Data Setup: Seed approved payout for async processing.
   * 2. User Sign-In: Authenticate driver session.
   * 3. Core Business Flow: Create approved payout, execute Cloud Tasks IMPS transfer, verify UTR settlement and replay idempotency.
   * 4. Explicit User Sign-Out.
   */
  test('UC-12 (UC-PAY-03): Cloud Tasks IMPS Bank Transfer Execution & UTR Settlement', async ({ page }) => {
    // Phase 1: Test Data Setup
    await setupUseCaseTestData(page, 'UC-12');

    // Phase 2: User Sign-In
    await performUserSignIn(page, 'driver');

    const driverId = `drv_transfer_${Date.now()}`;

    // Phase 3: Core Business Flow
    // 1. Create approved payout request as Driver
    const payoutRes = await page.request.post(`${GATEWAY_URL}/v1/payouts/requests`, {
      headers: DRIVER_AUTH_HEADER,
      data: {
        recipientId: driverId,
        recipientType: 'DRIVER',
        amount: 3500.0,
      },
    });
    expect(payoutRes.ok()).toBeTruthy();
    const payoutData = await payoutRes.json();
    const { payoutId } = payoutData;
    expect(payoutData.status).toBe('APPROVED');

    // 2. Cloud Tasks invokes payout worker transfer endpoint (using SYSTEM role)
    const taskRes = await page.request.post(`${GATEWAY_URL}/v1/payouts/tasks/transfer`, {
      headers: SYSTEM_AUTH_HEADER,
      data: {
        payoutId,
      },
    });
    expect(taskRes.ok()).toBeTruthy();
    const taskData = await taskRes.json();
    expect(taskData.success).toBe(true);
    expect(taskData.status).toBe('SETTLED');
    expect(taskData.bankUtr).toMatch(/^UTR\d+/);
    expect(Number(taskData.disbursedAmount)).toBe(3465.0); // 3500 - 35 TDS
    expect(taskData.settlement.disbursed_channel).toBe('IMPS');

    // 3. Idempotent transfer execution returns same settlement
    const replayTaskRes = await page.request.post(`${GATEWAY_URL}/v1/payouts/tasks/transfer`, {
      headers: SYSTEM_AUTH_HEADER,
      data: {
        payoutId,
      },
    });
    expect(replayTaskRes.ok()).toBeTruthy();
    const replayData = await replayTaskRes.json();
    expect(replayData.idempotentReplay).toBe(true);
    expect(replayData.status).toBe('SETTLED');

    // Phase 4: Explicit User Sign-Out
    await performUserSignOut(page);
  });

  /**
   * UC-13 (FEAT-06.04): Supplier Funds Tracking, Merchant Commission & Driver Allocation Governance Console
   * 4-Phase Lifecycle:
   * 1. Test Data Setup: Seed multi-channel supplier ledger.
   * 2. User Sign-In: Authenticate support session.
   * 3. Core Business Flow: Audit funds summary, verify financial monitor overview, assert proxy mutation block (403), execute admin disbursement.
   * 4. Explicit User Sign-Out.
   */
  test('UC-13 (FEAT-06.04): Supplier Funds Tracking, Merchant Commission & Driver Allocation Governance Console', async ({ page }) => {
    // Phase 1: Test Data Setup
    await setupUseCaseTestData(page, 'UC-13');

    // Phase 2: User Sign-In
    await performUserSignIn(page, 'support');

    // Phase 3: Core Business Flow
    // 1. Audit Supplier Funds Summary (SUP-11)
    const summaryRes = await page.request.get(`${GATEWAY_URL}/v1/payouts/suppliers/sup_ongole_01/funds-summary`, {
      headers: SUPPORT_AUTH_HEADER,
    });
    expect(summaryRes.ok()).toBeTruthy();
    const summaryData = await summaryRes.json();
    expect(summaryData.success).toBe(true);
    expect(summaryData.supplierId).toBe('sup_ongole_01');
    expect(summaryData.grossInflow).toBeGreaterThan(0);
    expect(summaryData.merchantAllocation).toBeGreaterThan(0);
    expect(summaryData.driverAllocation).toBeGreaterThan(0);
    expect(summaryData.netAvailable).toBeGreaterThan(0);

    // 2. Audit Multi-Supplier Financial Monitoring Overview (SPT-12)
    const monitorRes = await page.request.get(`${GATEWAY_URL}/v1/payouts/admin/suppliers-financial-monitor`, {
      headers: SUPPORT_AUTH_HEADER,
    });
    expect(monitorRes.ok()).toBeTruthy();
    const monitorData = await monitorRes.json();
    expect(monitorData.success).toBe(true);
    expect(monitorData.totalSuppliers).toBeGreaterThanOrEqual(1);

    // 3. Support Proxy Financial Guardrail: Verify support role is strictly blocked from financial mutations
    const blockedDisburseRes = await page.request.post(`${GATEWAY_URL}/v1/payouts/suppliers/sup_ongole_01/disburse`, {
      headers: SUPPORT_AUTH_HEADER,
      data: {
        amount: 5000.0,
        remarks: 'Support attempted disbursement',
      },
    });
    expect(blockedDisburseRes.status()).toBe(403);
    const blockedData = await blockedDisburseRes.json();
    expect(blockedData.error.code).toBe('FINANCIAL_MUTATION_PROXY_BLOCKED');

    // 4. Execute Authorized Supplier Bank Settlement Disbursement via Admin session
    const disburseRes = await page.request.post(`${GATEWAY_URL}/v1/payouts/suppliers/sup_ongole_01/disburse`, {
      headers: ADMIN_AUTH_HEADER,
      data: {
        amount: 5000.0,
        remarks: 'Automated weekly mill proceeds disbursement',
      },
    });
    expect(disburseRes.status()).toBe(201);
    const disburseData = await disburseRes.json();
    expect(disburseData.success).toBe(true);
    expect(disburseData.disbursedAmount).toBe(5000.0);
    expect(disburseData.payout.recipient_type).toBe('SUPPLIER');

    // Phase 4: Explicit User Sign-Out
    await performUserSignOut(page);
  });
});
