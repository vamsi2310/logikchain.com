import { test, expect } from '@playwright/test';
import { setupUseCaseTestData, performUserSignIn, performUserSignOut } from '../../test-data-setup';

test.describe('Technical Governance & Financial Invariants', () => {
  const GATEWAY_URL = process.env.GATEWAY_URL || 'http://localhost:30080';

  const SUPPORT_AUTH_HEADER = {
    Authorization: 'Bearer dev-token-support-admin',
    'x-client-platform': 'web',
    'x-user-role': 'support',
  };

  const MERCHANT_AUTH_HEADER = {
    Authorization: 'Bearer dev-token-merchant-rural',
    'x-client-platform': 'web',
    'x-user-role': 'merchant',
  };

  const BUYER_AUTH_HEADER = {
    Authorization: 'Bearer dev-token-buyer-rural',
    'x-client-platform': 'web',
    'x-user-role': 'buyer',
  };

  const SYSTEM_AUTH_HEADER = {
    Authorization: 'Bearer dev-token-cloud-scheduler-runner',
    'x-client-platform': 'system',
    'x-user-role': 'system',
  };

  /* ==========================================================================
     EPIC-11: Platform Governance, Compliance & AML
     ========================================================================== */
/**
   * UC-14 (UC-GOV-01): UPI TPAP Compliance, VPA Syntax Validation & Blacklist Rejection
   * 4-Phase Lifecycle:
   * 1. Test Data Setup: Seed TPAP regulatory parameters & blacklist rules.
   * 2. User Sign-In: Authenticate merchant session.
   * 3. Core Business Flow: Validate malformed VPA rejection, blacklist check, register valid VPA, verify status, deregister.
   * 4. Explicit User Sign-Out.
   */
  test('UC-14 (UC-GOV-01): UPI TPAP Compliance, VPA Syntax Validation & Blacklist Rejection', async ({ page }) => {
    // Phase 1: Test Data Setup
    await setupUseCaseTestData(page, 'UC-14');

    // Phase 2: User Sign-In
    await performUserSignIn(page, 'merchant');

    const merchantUserId = `mer_vpa_${Date.now()}`;
    const validVpa = `sri_krishna_stores_${Date.now()}@icici`;

    // Phase 3: Core Business Flow
    // 1. Negative Check: Malformed VPA syntax (missing @handle)
    const malformedRes = await page.request.post(`${GATEWAY_URL}/v1/governance/vpa/register`, {
      headers: MERCHANT_AUTH_HEADER,
      data: {
        vpa: 'invalid_vpa_without_handle',
        userId: merchantUserId,
      },
    });
    expect(malformedRes.status()).toBe(422);
    const malformedData = await malformedRes.json();
    expect(malformedData.error.code).toBe('INVALID_VPA_FORMAT');

    // 2. Negative Check: Known Fraudulent VPA Blacklist Rejection
    const blacklistedVpa = 'fraud_merchant@upi';
    const blacklistRes = await page.request.post(`${GATEWAY_URL}/v1/governance/vpa/register`, {
      headers: MERCHANT_AUTH_HEADER,
      data: {
        vpa: blacklistedVpa,
        userId: merchantUserId,
      },
    });
    expect(blacklistRes.status()).toBe(422);
    const blacklistData = await blacklistRes.json();
    expect(blacklistData.error.code).toBe('VPA_BLACKLISTED');
    expect(blacklistData.compliant).toBe(false);

    // 3. Register Compliant Merchant VPA
    const regRes = await page.request.post(`${GATEWAY_URL}/v1/governance/vpa/register`, {
      headers: MERCHANT_AUTH_HEADER,
      data: {
        vpa: validVpa,
        userId: merchantUserId,
        pspHandle: 'icici',
        bankAccountLinked: true,
        deviceFingerprint: 'fp_and_samsung_m32',
      },
    });
    expect(regRes.ok()).toBeTruthy();
    const regData = await regRes.json();
    expect(regData.success).toBe(true);
    expect(regData.compliant).toBe(true);
    expect(regData.tpapCertified).toBe(true);
    expect(regData.vpa.status).toBe('ACTIVE');

    // 4. Verify VPA Linkage Status
    const verifyRes = await page.request.get(`${GATEWAY_URL}/v1/governance/vpa/${validVpa}/verify`, {
      headers: SUPPORT_AUTH_HEADER,
    });
    expect(verifyRes.ok()).toBeTruthy();
    const verifyData = await verifyRes.json();
    expect(verifyData.vpa).toBe(validVpa.toLowerCase());
    expect(verifyData.complianceCertified).toBe(true);
    expect(verifyData.bankAccountLinked).toBe(true);

    // 5. Deregister VPA
    const deregRes = await page.request.post(`${GATEWAY_URL}/v1/governance/vpa/deregister`, {
      headers: MERCHANT_AUTH_HEADER,
      data: {
        vpa: validVpa,
        userId: merchantUserId,
        reason: 'Merchant transitioned to current account handle',
      },
    });
    expect(deregRes.ok()).toBeTruthy();
    const deregData = await deregRes.json();
    expect(deregData.success).toBe(true);
    expect(deregData.vpa.status).toBe('DEREGISTERED');

    // Phase 4: Explicit User Sign-Out
    await performUserSignOut(page);
  });

/**
   * UC-15 (UC-GOV-02): Real-Time AML Fraud Velocity Interception & Account Freeze Gate
   * 4-Phase Lifecycle:
   * 1. Test Data Setup: Seed AML thresholds & velocity windows.
   * 2. User Sign-In: Authenticate support session.
   * 3. Core Business Flow: Check nominal low risk, large ticket risk score, rapid burst freeze circuit breaker, audit logging.
   * 4. Explicit User Sign-Out.
   */
  test('UC-15 (UC-GOV-02): Real-Time AML Fraud Velocity Interception & Account Freeze Gate', async ({ page }) => {
    // Phase 1: Test Data Setup
    await setupUseCaseTestData(page, 'UC-15');

    // Phase 2: User Sign-In
    await performUserSignIn(page, 'support');

    const suspectUserId = `usr_aml_suspect_${Date.now()}`;

    // Phase 3: Core Business Flow
    // 1. Nominal low-velocity transaction evaluates as ALLOW (low risk)
    const nominalRes = await page.request.post(`${GATEWAY_URL}/v1/governance/aml/check`, {
      headers: MERCHANT_AUTH_HEADER,
      data: {
        userId: suspectUserId,
        amount: 2500.0,
        transactionType: 'PAYMENT',
      },
    });
    expect(nominalRes.ok()).toBeTruthy();
    const nominalData = await nominalRes.json();
    expect(nominalData.allowed).toBe(true);
    expect(nominalData.decision).toBe('ALLOW');
    expect(nominalData.riskScore).toBeLessThan(50);
    expect(nominalData.freezeTriggered).toBe(false);

    // 2. High single ticket check (> ₹1,00,000 for rural merchant profile)
    const largeTicketRes = await page.request.post(`${GATEWAY_URL}/v1/governance/aml/check`, {
      headers: MERCHANT_AUTH_HEADER,
      data: {
        userId: suspectUserId,
        amount: 150000.0,
        transactionType: 'PAYMENT',
      },
    });
    expect(largeTicketRes.ok()).toBeTruthy();
    const largeData = await largeTicketRes.json();
    expect(largeData.riskScore).toBeGreaterThanOrEqual(50);
    expect(largeData.flags.some((f: string) => f.includes('EXCEEDS_SINGLE_TICKET_CEILING'))).toBe(true);

    // 3. High-Velocity Interception Burst (> 5 transactions in 10-minute sliding window)
    for (let i = 0; i < 4; i++) {
      await page.request.post(`${GATEWAY_URL}/v1/governance/aml/check`, {
        headers: MERCHANT_AUTH_HEADER,
        data: {
          userId: suspectUserId,
          amount: 5000.0,
          transactionType: 'PAYMENT',
        },
      });
    }

    // 6th transaction triggers velocity circuit breaker
    const burstRes = await page.request.post(`${GATEWAY_URL}/v1/governance/aml/check`, {
      headers: MERCHANT_AUTH_HEADER,
      data: {
        userId: suspectUserId,
        amount: 5000.0,
        transactionType: 'PAYMENT',
      },
    });
    expect(burstRes.ok()).toBeTruthy();
    const burstData = await burstRes.json();
    expect(burstData.allowed).toBe(false);
    expect(burstData.decision).toBe('REJECT_AND_FREEZE');
    expect(burstData.riskScore).toBeGreaterThanOrEqual(80);
    expect(burstData.freezeTriggered).toBe(true);
    expect(burstData.flags.some((f: string) => f.includes('HIGH_VELOCITY_SPIKE'))).toBe(true);

    // 4. Query Support AML Alerts - Verify alert ticket logged
    const alertsRes = await page.request.get(`${GATEWAY_URL}/v1/governance/aml/alerts`, {
      headers: SUPPORT_AUTH_HEADER,
    });
    expect(alertsRes.ok()).toBeTruthy();
    const alertsData = await alertsRes.json();
    expect(alertsData.count).toBeGreaterThan(0);
    const alert = alertsData.alerts.find((a: any) => a.user_id === suspectUserId);
    expect(alert).toBeDefined();
    expect(alert.decision).toBe('REJECT_AND_FREEZE');

    // 5. Support Proxy Action Audit Logging (US-11.02.02)
    const proxyAuditRes = await page.request.post(`${GATEWAY_URL}/v1/governance/audit/proxy`, {
      headers: SUPPORT_AUTH_HEADER,
      data: {
        operatorUid: 'support_agent_rahul',
        targetSupplierId: 'sup_ongole_seeds_01',
        grantId: 'grant_temporary_support_route_mod',
        action: 'UPDATE_DELIVERY_DISPATCH_ROUTE',
        payloadHash: 'hash_sha256_mock_dispatch_route_update',
        clientIp: '10.0.14.88',
      },
    });
    expect(proxyAuditRes.status()).toBe(201);
    const proxyData = await proxyAuditRes.json();
    expect(proxyData.success).toBe(true);
    expect(proxyData.auditRecord.operator_uid).toBe('support_agent_rahul');

    // Phase 4: Explicit User Sign-Out
    await performUserSignOut(page);
  });

/**
   * UC-17 (UC-GOV-04): Multi-Role Versioned Clickwrap Policy Consent & Mandatory Re-Consent Gate
   * 4-Phase Lifecycle:
   * 1. Test Data Setup: Seed multi-role policy versions.
   * 2. User Sign-In: Authenticate buyer session.
   * 3. Core Business Flow: Fetch policies, check initial required consent, accept clickwrap terms, verify consent record.
   * 4. Explicit User Sign-Out.
   */
  test('UC-17 (UC-GOV-04): Multi-Role Versioned Clickwrap Policy Consent & Mandatory Re-Consent Gate', async ({ page }) => {
    // Phase 1: Test Data Setup
    await setupUseCaseTestData(page, 'UC-17');

    // Phase 2: User Sign-In
    await performUserSignIn(page, 'buyer');

    const testBuyerId = `buyer_consent_${Date.now()}`;

    // Phase 3: Core Business Flow
    // 1. Fetch Active Platform Policies for all 4 roles
    const activeRes = await page.request.get(`${GATEWAY_URL}/v1/governance/policies/active`, {
      headers: BUYER_AUTH_HEADER,
    });
    expect(activeRes.ok()).toBeTruthy();
    const activeData = await activeRes.json();
    expect(activeData.policies.length).toBe(4);
    const buyerPolicy = activeData.policies.find((p: any) => p.role === 'buyer');
    expect(buyerPolicy).toBeDefined();
    expect(buyerPolicy.currentVersion).toBe('v2.0');

    // 2. Fetch Detailed Legal Clauses for Buyer Policy
    const docRes = await page.request.get(`${GATEWAY_URL}/v1/governance/policies/${buyerPolicy.policyId}/versions/v2.0`, {
      headers: BUYER_AUTH_HEADER,
    });
    expect(docRes.ok()).toBeTruthy();
    const docData = await docRes.json();
    expect(docData.policyId).toBe(buyerPolicy.policyId);
    expect(docData.clauses.length).toBeGreaterThan(0);

    // 3. User initial check - Requires consent (none on file)
    const initCheck = await page.request.get(`${GATEWAY_URL}/v1/governance/policies/consent/check/${testBuyerId}?role=buyer`, {
      headers: BUYER_AUTH_HEADER,
    });
    expect(initCheck.ok()).toBeTruthy();
    const initCheckData = await initCheck.json();
    expect(initCheckData.consentValid).toBe(false);
    expect(initCheckData.requiresReconsent).toBe(true);

    // 4. Record Clickwrap Consent
    const consentRes = await page.request.post(`${GATEWAY_URL}/v1/governance/policies/consent`, {
      headers: BUYER_AUTH_HEADER,
      data: {
        userId: testBuyerId,
        role: 'buyer',
        policyId: buyerPolicy.policyId,
        policyVersion: 'v2.0',
        policyVersionHash: buyerPolicy.versionHash,
        clientIp: '192.168.1.105',
        userAgent: 'Logikchain PWA Chrome/120',
        clientRuntime: 'web',
      },
    });
    expect(consentRes.status()).toBe(201);
    const consentData = await consentRes.json();
    expect(consentData.success).toBe(true);
    expect(consentData.verificationToken).toBeDefined();

    // 5. Verification: User consent is now valid and up to date
    const finalCheck = await page.request.get(`${GATEWAY_URL}/v1/governance/policies/consent/check/${testBuyerId}?role=buyer`, {
      headers: BUYER_AUTH_HEADER,
    });
    const finalCheckData = await finalCheck.json();
    expect(finalCheckData.consentValid).toBe(true);
    expect(finalCheckData.requiresReconsent).toBe(false);
    expect(finalCheckData.consentedVersion).toBe('v2.0');

    // Phase 4: Explicit User Sign-Out
    await performUserSignOut(page);
  });

/**
   * UC-18 (UC-FIN-01): Double-Entry Platform General Ledger & Zero-Sum Invariance Invariant Gate
   * 4-Phase Lifecycle:
   * 1. Test Data Setup: Seed chart of accounts.
   * 2. User Sign-In: Authenticate support session.
   * 3. Core Business Flow: Assert 422 on unbalanced journal entry, post balanced entry, verify account balance & trial balance.
   * 4. Explicit User Sign-Out.
   */
  test('UC-18 (UC-FIN-01): Double-Entry Platform General Ledger & Zero-Sum Invariance Invariant Gate', async ({ page }) => {
    // Phase 1: Test Data Setup
    await setupUseCaseTestData(page, 'UC-18');

    // Phase 2: User Sign-In
    await performUserSignIn(page, 'support');

    // Phase 3: Core Business Flow
    // 1. CIRCUIT BREAKER TEST: Unbalanced Journal Entry (Debits != Credits)
    // Debit ₹5,000 to Gateway Clearing, Credit ₹4,500 to Buyer Advance (₹500 discrepancy)
    const unbalancedRes = await page.request.post(`${GATEWAY_URL}/v1/finance/journal-entries`, {
      headers: SUPPORT_AUTH_HEADER,
      data: {
        description: 'Erroneous unbalanced UPI settlement',
        lines: [
          { accountCode: '1010', debit: 5000.0, credit: 0.0 },
          { accountCode: '2010', debit: 0.0, credit: 4500.0 },
        ],
      },
    });
    // Invariant Gate Assertion: Expect 422 Unprocessable Entity
    expect(unbalancedRes.status()).toBe(422);
    const errData = await unbalancedRes.json();
    expect(errData.error.code).toBe('UNBALANCED_JOURNAL_ENTRY');
    expect(errData.error.message).toContain('Double-entry invariant violated');

    // 2. Post Valid Balanced Journal Entry (Order payment of ₹12,000)
    // Debit: 1010-GATEWAY-CLEARING ₹12,000
    // Credit: 2010-BUYER-ADVANCE ₹12,000
    const entryId = `je_ord_pay_${Date.now()}`;
    const balancedRes = await page.request.post(`${GATEWAY_URL}/v1/finance/journal-entries`, {
      headers: SUPPORT_AUTH_HEADER,
      data: {
        entryId,
        transactionReference: `ord_ref_${Date.now()}`,
        description: 'Wholesale fertilizer order pre-payment via UPI',
        lines: [
          { accountCode: '1010', debit: 12000.0, credit: 0.0 },
          { accountCode: '2010', debit: 0.0, credit: 12000.0 },
        ],
      },
    });
    expect(balancedRes.status()).toBe(201);
    const balData = await balancedRes.json();
    expect(balData.success).toBe(true);
    expect(balData.balancedAmount).toBe(12000.0);
    expect(balData.lines.length).toBe(2);

    // 3. Inspect Specific Account Balance (1010-GATEWAY-CLEARING)
    const acctRes = await page.request.get(`${GATEWAY_URL}/v1/finance/accounts/1010/balance`, {
      headers: SUPPORT_AUTH_HEADER,
    });
    expect(acctRes.ok()).toBeTruthy();
    const acctData = await acctRes.json();
    expect(acctData.accountCode).toBe('1010');
    expect(acctData.accountName).toContain('GATEWAY-CLEARING');
    expect(acctData.totalDebit).toBeGreaterThanOrEqual(12000.0);

    // 4. Platform Trial Balance & Financial Reports
    const reportRes = await page.request.get(`${GATEWAY_URL}/v1/finance/reports`, {
      headers: SUPPORT_AUTH_HEADER,
    });
    expect(reportRes.ok()).toBeTruthy();
    const reportData = await reportRes.json();
    expect(reportData.trialBalance.isBalanced).toBe(true);
    expect(reportData.trialBalance.grandTotalDebit).toBe(reportData.trialBalance.grandTotalCredit);
    expect(reportData.accounts.length).toBeGreaterThanOrEqual(9);

    // Phase 4: Explicit User Sign-Out
    await performUserSignOut(page);
  });

/**
   * UC-19 (UC-FIN-02): Nightly 3-Way Bank Reconciliation & Vertex AI Variance Analysis
   * 4-Phase Lifecycle:
   * 1. Test Data Setup: Seed 3-way reconciliation accounts.
   * 2. User Sign-In: Authenticate support session.
   * 3. Core Business Flow: Test zero-variance run, detect ₹50 variance with AI confidence score, execute nightly scheduled trigger.
   * 4. Explicit User Sign-Out.
   */
  test('UC-19 (UC-FIN-02): Nightly 3-Way Bank Reconciliation & Vertex AI Variance Analysis', async ({ page }) => {
    // Phase 1: Test Data Setup
    await setupUseCaseTestData(page, 'UC-19');

    // Phase 2: User Sign-In
    await performUserSignIn(page, 'support');

    // Phase 3: Core Business Flow
    // 1. Scenario A: 3-Way Reconciliation with Zero Variance (All 3 match ₹75,000)
    const balancedReconRes = await page.request.post(`${GATEWAY_URL}/v1/finance/reconciliation:run`, {
      headers: SYSTEM_AUTH_HEADER,
      data: {
        gatewaySettlementAmount: 75000.0,
        bankStatementAmount: 75000.0,
        internalLedgerAmount: 75000.0,
      },
    });
    expect(balancedReconRes.status()).toBe(201);
    const bData = await balancedReconRes.json();
    expect(bData.success).toBe(true);
    expect(bData.isBalanced).toBe(true);
    expect(bData.totalVariance).toBe(0.0);
    expect(bData.reconciliation.status).toBe('BALANCED');
    expect(bData.aiAnalysis.anomalyType).toBe('NONE');

    // 2. Scenario B: 3-Way Reconciliation detecting ₹50 Gateway MDR discrepancy
    const varianceReconRes = await page.request.post(`${GATEWAY_URL}/v1/finance/reconciliation:run`, {
      headers: SYSTEM_AUTH_HEADER,
      data: {
        gatewaySettlementAmount: 74950.0, // ₹50 deducted
        bankStatementAmount: 75000.0,
        internalLedgerAmount: 75000.0,
      },
    });
    expect(varianceReconRes.status()).toBe(201);
    const vData = await varianceReconRes.json();
    expect(vData.isBalanced).toBe(false);
    expect(vData.totalVariance).toBe(50.0);
    expect(vData.reconciliation.status).toBe('VARIANCE_DETECTED');
    expect(vData.aiAnalysis.confidenceScore).toBeGreaterThan(0.85);

    // 3. Automated 01:00 AM Cloud Scheduler Nightly Run Trigger
    const schedRes = await page.request.post(`${GATEWAY_URL}/v1/finance/scheduled-reconciliation`, {
      headers: SYSTEM_AUTH_HEADER,
      data: {},
    });
    expect(schedRes.status()).toBe(201);
    const schedData = await schedRes.json();
    expect(schedData.success).toBe(true);
    expect(schedData.schedulerRun.status).toBe('BALANCED');

    // 4. Query Historical Reconciliation Runs
    const runsListRes = await page.request.get(`${GATEWAY_URL}/v1/finance/reconciliation/runs`, {
      headers: SUPPORT_AUTH_HEADER,
    });
    expect(runsListRes.ok()).toBeTruthy();
    const runsData = await runsListRes.json();
    expect(runsData.count).toBeGreaterThanOrEqual(3);

    // Phase 4: Explicit User Sign-Out
    await performUserSignOut(page);
  });

});
