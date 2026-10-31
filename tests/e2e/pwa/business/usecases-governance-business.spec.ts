import { test, expect } from '@playwright/test';
import { setupUseCaseTestData, performUserSignIn, performUserSignOut } from '../../test-data-setup';

test.describe('Business Governance, Disputes & TDS Settlement', () => {
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
   * UC-16 (UC-GOV-03): Dispute SLA Tracking, 24-Hour Countdown & Daily NPCI Compliance Report
   * 4-Phase Lifecycle:
   * 1. Test Data Setup: Seed NPCI grievance record.
   * 2. User Sign-In: Authenticate support session.
   * 3. Core Business Flow: Log customer dispute, verify 24hr SLA calculation, resolve within window, export daily NPCI compliance report.
   * 4. Explicit User Sign-Out.
   */
  test('UC-16 (UC-GOV-03): Dispute SLA Tracking, 24-Hour Countdown & Daily NPCI Compliance Report', async ({ page }) => {
    // Phase 1: Test Data Setup
    await setupUseCaseTestData(page, 'UC-16');

    // Phase 2: User Sign-In
    await performUserSignIn(page, 'support');

    const disputeId = `disp_npci_${Date.now()}`;
    const txId = `tx_upi_${Date.now()}`;

    // Phase 3: Core Business Flow
    // 1. Ingest incoming UPI Customer Dispute
    const disputeRes = await page.request.post(`${GATEWAY_URL}/v1/governance/disputes`, {
      headers: SUPPORT_AUTH_HEADER,
      data: {
        disputeId,
        transactionId: txId,
        userId: 'buyer_rural_guntur_10',
        vpa: 'buyer_guntur@okaxis',
        amount: 3200.0,
        reason: 'Goods not delivered at PUDO center',
      },
    });
    expect(disputeRes.status()).toBe(201);
    const disputeData = await disputeRes.json();
    expect(disputeData.success).toBe(true);
    expect(disputeData.slaHours).toBe(24);
    expect(disputeData.dispute.status).toBe('OPEN');

    // Verify SLA deadline is exactly 24 hours later
    const receivedTime = new Date(disputeData.dispute.received_at).getTime();
    const deadlineTime = new Date(disputeData.dispute.sla_deadline).getTime();
    expect(deadlineTime - receivedTime).toBe(24 * 60 * 60 * 1000);

    // 2. Query Dispute SLA countdown list
    const listRes = await page.request.get(`${GATEWAY_URL}/v1/governance/disputes`, {
      headers: SUPPORT_AUTH_HEADER,
    });
    expect(listRes.ok()).toBeTruthy();
    const listData = await listRes.json();
    const foundDispute = listData.disputes.find((d: any) => d.dispute_id === disputeId);
    expect(foundDispute).toBeDefined();
    expect(foundDispute.remainingMinutes).toBeGreaterThan(1400); // ~1440 minutes in 24 hours

    // 3. Resolve Dispute within SLA window
    const resolveRes = await page.request.post(`${GATEWAY_URL}/v1/governance/disputes/${disputeId}/resolve`, {
      headers: SUPPORT_AUTH_HEADER,
      data: {
        resolutionOutcome: 'REFUND',
        resolutionNotes: 'Merchant stock delayed; full refund of ₹3,200 initiated to buyer VPA',
        resolvedBy: 'dispute_officer_anita',
      },
    });
    expect(resolveRes.ok()).toBeTruthy();
    const resolveData = await resolveRes.json();
    expect(resolveData.success).toBe(true);
    expect(resolveData.dispute.status).toBe('RESOLVED');
    expect(resolveData.slaBreached).toBe(false);

    // 4. Compile & Generate Daily NPCI Regulatory Compliance Report
    const reportRes = await page.request.post(`${GATEWAY_URL}/v1/governance/reporting/npci`, {
      headers: SYSTEM_AUTH_HEADER,
      data: {
        reportDate: new Date().toISOString(),
      },
    });
    expect(reportRes.status()).toBe(201);
    const reportData = await reportRes.json();
    expect(reportData.success).toBe(true);
    expect(reportData.report.regulatoryEntity).toBe('NPCI_TPAP_OVERSIGHT');
    expect(reportData.report.complianceRatio).toBeGreaterThanOrEqual(95.0);

    // Phase 4: Explicit User Sign-Out
    await performUserSignOut(page);
  });

/**
   * UC-20 (UC-FIN-03): Section 194C/194O TDS Deductions, Government Challan Settlement & Ledger Balancing
   * 4-Phase Lifecycle:
   * 1. Test Data Setup: Seed TDS statutory rates & deductee data.
   * 2. User Sign-In: Authenticate support session.
   * 3. Core Business Flow: Deduct Section 194C TDS (1%), check Form 26Q register, reject bad BSR code (422), record valid challan, verify status.
   * 4. Explicit User Sign-Out.
   */
  test('UC-20 (UC-FIN-03): Section 194C/194O TDS Deductions, Government Challan Settlement & Ledger Balancing', async ({ page }) => {
    // Phase 1: Test Data Setup
    await setupUseCaseTestData(page, 'UC-20');

    // Phase 2: User Sign-In
    await performUserSignIn(page, 'support');

    const driverId = `drv_tax_${Date.now()}`;
    const validPan = 'ABCDE1234F';

    // Phase 3: Core Business Flow
    // 1. Record Section 194C TDS Deduction (1% with valid PAN on ₹10,000 payout)
    const tdsRes = await page.request.post(`${GATEWAY_URL}/v1/finance/tds/deductions`, {
      headers: SUPPORT_AUTH_HEADER,
      data: {
        deducteeId: driverId,
        deducteeType: 'DRIVER',
        panNumber: validPan,
        section: '194C',
        grossAmount: 10000.0,
        payoutId: `pay_${Date.now()}`,
      },
    });
    expect(tdsRes.status()).toBe(201);
    const tdsData = await tdsRes.json();
    expect(tdsData.success).toBe(true);
    expect(tdsData.tdsRate).toBe(1.0); // 1% for PAN verified
    expect(tdsData.tdsAmount).toBe(100.0);
    expect(tdsData.deduction.status).toBe('PENDING');

    // 2. Query TDS Register (Form 26Q Repository)
    const registerRes = await page.request.get(`${GATEWAY_URL}/v1/finance/tds/register?status=PENDING`, {
      headers: SUPPORT_AUTH_HEADER,
    });
    expect(registerRes.ok()).toBeTruthy();
    const regData = await registerRes.json();
    expect(regData.count).toBeGreaterThan(0);
    expect(regData.summary.pendingCount).toBeGreaterThan(0);

    // 3. Negative check: Invalid BSR Code format on Challan upload
    const badBsrRes = await page.request.post(`${GATEWAY_URL}/v1/finance/tds/challans`, {
      headers: SUPPORT_AUTH_HEADER,
      data: {
        taxPeriod: '2026-Q2',
        bsrCode: '123', // Must be 7 digits
        challanNumber: '99401',
        amount: 100.0,
      },
    });
    expect(badBsrRes.status()).toBe(422);
    const badBsrData = await badBsrRes.json();
    expect(badBsrData.error.code).toBe('INVALID_BSR_CODE');

    // 4. Record Valid Government Tax Deposit Challan
    // BSR Code: "0210001" (7 digits), Challan No: "99401" (5 digits)
    const challanRes = await page.request.post(`${GATEWAY_URL}/v1/finance/tds/challans`, {
      headers: SUPPORT_AUTH_HEADER,
      data: {
        taxPeriod: '2026-Q2',
        bsrCode: '0210001',
        challanNumber: '99401',
        depositDate: new Date().toISOString(),
        amount: 100.0,
      },
    });
    expect(challanRes.status()).toBe(201);
    const challanData = await challanRes.json();
    expect(challanData.success).toBe(true);
    expect(challanData.linkedDeductionsCount).toBeGreaterThan(0);

    // 5. Verification: TDS records are marked DEPOSITED and liability cleared
    const postChallanRegister = await page.request.get(`${GATEWAY_URL}/v1/finance/tds/register?status=DEPOSITED`, {
      headers: SUPPORT_AUTH_HEADER,
    });
    const postData = await postChallanRegister.json();
    expect(postData.summary.depositedCount).toBeGreaterThan(0);

    // Phase 4: Explicit User Sign-Out
    await performUserSignOut(page);
  });

/**
   * UC-21 (UC-STG-10): Critical Path Roadmap Stage 10 Golden Path Integration
   * 4-Phase Lifecycle:
   * 1. Test Data Setup: Seed Stage 10 ecosystem state.
   * 2. User Sign-In: Authenticate support session.
   * 3. Core Business Flow: VPA registration, AML scan, balanced ledger entry, 3-way reconciliation, TDS withholding.
   * 4. Explicit User Sign-Out.
   */
  test('UC-21 (UC-STG-10): Critical Path Roadmap Stage 10 Golden Path Integration', async ({ page }) => {
    // Phase 1: Test Data Setup
    await setupUseCaseTestData(page, 'UC-21');

    // Phase 2: User Sign-In
    await performUserSignIn(page, 'support');

    // Phase 3: Core Business Flow
    // Step 1: VPA Audit
    const testVpa = `golden_path_${Date.now()}@okhdfcbank`;
    const vpaReg = await page.request.post(`${GATEWAY_URL}/v1/governance/vpa/register`, {
      headers: SUPPORT_AUTH_HEADER,
      data: {
        vpa: testVpa,
        userId: 'golden_path_ops',
        pspHandle: 'okhdfcbank',
        bankAccountLinked: true,
      },
    });
    expect(vpaReg.ok()).toBeTruthy();

    // Step 2: AML Scan
    const amlScan = await page.request.post(`${GATEWAY_URL}/api/v1/governance/aml/scan`, {
      headers: SUPPORT_AUTH_HEADER,
      data: {
        userId: 'golden_path_ops',
        amount: 1800.0,
        vpa: testVpa,
        transactionType: 'PAYMENT',
      },
    });
    expect(amlScan.ok()).toBeTruthy();
    const amlData = await amlScan.json();
    expect(amlData.allowed).toBe(true);

    // Step 3: Balanced General Ledger Entry
    const ledgerEntry = await page.request.post(`${GATEWAY_URL}/api/v1/finance/ledger/entry`, {
      headers: SUPPORT_AUTH_HEADER,
      data: {
        description: 'Golden Path Stage 10 balanced transaction clearing',
        lines: [
          { accountCode: '1010', debit: 1800.0, credit: 0.0 },
          { accountCode: '2010', debit: 0.0, credit: 1800.0 },
        ],
      },
    });
    expect(ledgerEntry.status()).toBe(201);

    // Step 4: 01:00 AM Nightly 3-Way Reconciliation
    const nightlyRecon = await page.request.post(`${GATEWAY_URL}/api/v1/finance/recon/nightly`, {
      headers: SYSTEM_AUTH_HEADER,
      data: {
        gatewaySettlementAmount: 1800.0,
        bankStatementAmount: 1800.0,
        internalLedgerAmount: 1800.0,
      },
    });
    expect(nightlyRecon.status()).toBe(201);
    const reconData = await nightlyRecon.json();
    expect(reconData.isBalanced).toBe(true);
    expect(reconData.totalVariance).toBe(0.0);

    // Step 5: TDS Withholding Record & Fiscal Day Seal
    const tdsRec = await page.request.post(`${GATEWAY_URL}/v1/finance/tds/deductions`, {
      headers: SUPPORT_AUTH_HEADER,
      data: {
        deducteeId: 'drv_golden_10',
        deducteeType: 'DRIVER',
        panNumber: 'ABCDE9876Z',
        section: '194C',
        grossAmount: 1800.0,
      },
    });
    expect(tdsRec.status()).toBe(201);
    const tdsFinal = await tdsRec.json();
    expect(tdsFinal.tdsAmount).toBe(18.0); // 1% of 1,800

    // Phase 4: Explicit User Sign-Out
    await performUserSignOut(page);
  });

});
