const fs = require('fs');
const path = require('path');

const jsonPath = path.resolve('work-management/work_management_data.json');
const webJsonPath = path.resolve('web/src/data/work_management_data.json');
const jsPath = path.resolve('work-management/work_management_data.js');

const epics = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

// Expectations mapping by feature ID
const expectationsByFeature = {
  'FEAT-01.01': {
    functionalExpectations: 'Seamless phone OTP authentication (10-digit Indian MSISDN) with automatic custom claims injection (`role`, `status`, `officialClient`) and session bootstrap calling API Gateway.',
    lifecycleExpectations: '1. Seed phone number and mock OTP in test auth state -> 2. Execute phone OTP login and verify 6-digit input auto-advance -> 3. Validate decoded custom claims and profile navigation -> 4. Explicit user sign-out and session storage clearing.',
    circuitBreakerExpectations: 'Rate limiting on OTP requests (max 3 per 5 minutes per IP/MSISDN); invalid OTP lockout after 5 failed attempts with 15-minute cool-down.',
    definitionOfDone: 'Automated Playwright E2E passing (user-flow-login-role-village.spec.ts), Firebase Auth token verification in identity-service, session claims correctly decoded in React session context.'
  },
  'FEAT-01.03': {
    functionalExpectations: 'Progressive role elevation from Buyer to Kirana Merchant, Driver, or Supplier with support review workflow and runtime client handoff into fullscreen role corridors.',
    lifecycleExpectations: '1. Bootstrap active buyer session -> 2. Submit role conversion request via Contact Support modal with justification -> 3. Verify role change in session and open fullscreen role app (/m/gigs) hiding public layout -> 4. Click Close App to restore public layout and explicitly sign out.',
    circuitBreakerExpectations: 'Disallow unauthorized privilege elevation; multi-role accounts must switch contexts explicitly; support operators cannot self-elevate without audit logging.',
    definitionOfDone: 'Playwright E2E test passing, identity_db role update verified, layout transition between public chrome and standalone fullscreen corridor verified.'
  },
  'FEAT-01.06': {
    functionalExpectations: 'User profile management including village selection, Google Cloud Storage media upload (avatar/KYC documents), and PostgreSQL user_profiles persistence.',
    lifecycleExpectations: '1. Authenticate user -> 2. Navigate to profile edit screen (/profile/edit) -> 3. Update primary village (village_kandukur_523105) and save profile -> 4. Verify identity-service database persistence and explicitly sign out.',
    circuitBreakerExpectations: 'Village selection must validate against config-service master hierarchy; media upload requires signed URL verification with MIME type and size enforcement (<5MB).',
    definitionOfDone: 'E2E test verifying profile mutation and identity_db row persistence, display badge update in user menu, clean sign-out.'
  },
  'FEAT-02.01': {
    functionalExpectations: 'End-to-end B2B and consumer order placement, shopping cart checkout, and dynamic in-transit ordering with vehicle departure gate enforcement.',
    lifecycleExpectations: '1. Seed catalog items and merchant delivery address -> 2. Sign in as rural buyer -> 3. Add items to cart, submit order via POST /v1/orders, verify departure gate status -> 4. Explicit user sign-out.',
    circuitBreakerExpectations: 'Orders blocked if delivery village is outside active gig route corridor or if vehicle has completed departure gate inspection.',
    definitionOfDone: 'orders-service PostgreSQL order creation verified, outbox CDC event queued, passing Playwright usecases-commerce test.'
  },
  'FEAT-02.04': {
    functionalExpectations: 'Order deliverable verification, doorstep return handling, line-item rejection policies, and 72-hour RTO (Return to Origin) protocol execution.',
    lifecycleExpectations: '1. Seed delivered order with perishable and non-perishable line items -> 2. Sign in as buyer/merchant -> 3. Initiate doorstep line-item rejection (POST /v1/orders/:id/returns/initiate) and trigger 72-hr RTO manifest -> 4. Explicit sign-out.',
    circuitBreakerExpectations: 'Non-returnable goods (e.g. perishable seeds, cut produce) blocked from return; RTO triggered automatically when merchant PUDO hold exceeds 72 hours without pickup.',
    definitionOfDone: 'order_returns and order_rtos tables populated, orders status updated to partially_delivered or rto_initiated, tested in usecases-commerce.spec.ts.'
  },
  'FEAT-05.01': {
    functionalExpectations: 'Dynamic UPI Intent URI and QR code generation for payments with PSP integration and HMAC webhook verification.',
    lifecycleExpectations: '1. Seed pending order amount -> 2. Sign in as merchant/buyer -> 3. Generate dynamic UPI QR, simulate PSP webhook callback with HMAC signature -> 4. Verify order payment status transition and sign out.',
    circuitBreakerExpectations: 'Reject webhooks with invalid HMAC signatures; disallow duplicate webhook replay using idempotency keys.',
    definitionOfDone: 'payments-service returns valid UPI intent string (upi://pay?...), webhook transitions order status to paid, E2E test passing.'
  },
  'FEAT-05.03': {
    functionalExpectations: 'Automated order cancellation refunds, partial item refund processing, and GST credit note generation.',
    lifecycleExpectations: '1. Seed cancelled order -> 2. Support operator signs in -> 3. Triggers refund via POST /v1/payments/:id/refund, verifies credit note issuance -> 4. Explicit sign out.',
    circuitBreakerExpectations: 'Refund amount cannot exceed captured transaction amount; refund to original VPA only.',
    definitionOfDone: 'Refund queued in payments_db, credit note PDF generated, support UI displays refund audit trail.'
  },
  'FEAT-06.01': {
    functionalExpectations: 'Beneficiary bank account registration, IFSC branch resolution, and Google Cloud KMS field-level account encryption.',
    lifecycleExpectations: '1. Seed beneficiary bank details -> 2. Sign in as driver/supplier -> 3. Submit bank account, verify KMS ciphertext storage and penny-drop validation -> 4. Explicit sign out.',
    circuitBreakerExpectations: 'Disallow plaintext bank account numbers in database; invalid IFSC rejected at submission.',
    definitionOfDone: 'payouts-service stores encrypted account numbers, Penny-drop mock passes, verified in usecases-custody-payouts.spec.ts.'
  },
  'FEAT-06.02': {
    functionalExpectations: 'Driver & supplier earnings payout requests, auto-approval threshold checks, and cash discrepancy lockout guard.',
    lifecycleExpectations: '1. Seed driver earnings and cash custody status -> 2. Sign in as driver -> 3. Request earnings withdrawal; verify cash shortage check blocks payout if discrepancy exists -> 4. Explicit sign out.',
    circuitBreakerExpectations: 'Driver payout strictly blocked (403 CUSTODY_LOCKED) if driver has unresolved cash collection shortages.',
    definitionOfDone: 'payouts-service calls cash-service custody check, returns 403 on shortage, verified in usecases-custody-payouts.spec.ts.'
  },
  'FEAT-06.03': {
    functionalExpectations: 'Automated IMPS/NEFT bank transfer execution via Google Cloud Tasks with UTR bank settlement reconciliation.',
    lifecycleExpectations: '1. Seed approved payout request -> 2. System worker executes Cloud Task -> 3. Dispatches IMPS transfer, receives bank UTR reference, updates status to SETTLED -> 4. Verifies ledger entry.',
    circuitBreakerExpectations: 'Idempotency key prevents double disbursement; bank failure initiates retry with exponential backoff.',
    definitionOfDone: 'UTR recorded in payouts_db.disbursements, finance ledger records matching disbursement debit, E2E verified.'
  },
  'FEAT-06.04': {
    functionalExpectations: 'Supplier escrow funds tracking, merchant PUDO commission allocation, driver trip pay, and multi-channel governance console.',
    lifecycleExpectations: '1. Seed supplier sales and delivery gigs -> 2. Sign in as support/admin -> 3. Query /v1/payouts/admin/suppliers-financial-monitor, verify fee allocations, block support proxy mutation -> 4. Explicit sign out.',
    circuitBreakerExpectations: 'Support proxy users strictly forbidden (403 FINANCIAL_MUTATION_PROXY_BLOCKED) from executing financial disbursements.',
    definitionOfDone: 'supplier_funds_ledger table updated, financial monitor UI rendered, proxy mutation blocker verified in test.'
  },
  'FEAT-07.01': {
    functionalExpectations: 'Cash on Delivery (CoD) collection tracking, driver physical cash custody balance ledger, and daily float limits.',
    lifecycleExpectations: '1. Seed CoD order -> 2. Sign in as driver -> 3. Record cash collection at doorstep, verify driver custody float increment and threshold warning -> 4. Explicit sign out.',
    circuitBreakerExpectations: 'Driver cash float exceeding max threshold (₹20,000) generates high-risk warning and restricts new CoD handovers until cash turn-in.',
    definitionOfDone: 'cash-service driver_custody record incremented, mobile offline outbox sync verified, tested in usecases-custody-payouts.spec.ts.'
  },
  'FEAT-07.02': {
    functionalExpectations: 'End-of-shift driver cash handover to supplier with cryptographic 6-digit OTP verification and custody balance clearing.',
    lifecycleExpectations: '1. Seed driver with active cash float -> 2. Driver and supplier sign in -> 3. Declare handover amount, generate OTP, verify supplier confirmation -> 4. Explicit sign out.',
    circuitBreakerExpectations: 'OTP expires in 10 minutes; handover amount must equal declared cash bundle; mismatched OTP fails settlement.',
    definitionOfDone: 'cash_handovers record updated to CONFIRMED, driver float balance decremented, E2E test passing.'
  },
  'FEAT-07.03': {
    functionalExpectations: 'Cash shortage discrepancy logging, operational incident reporting, and financial lockout trigger.',
    lifecycleExpectations: '1. Seed cash turn-in with shortage -> 2. Supplier records shortage discrepancy -> 3. System logs discrepancy incident and locks driver payout gate -> 4. Explicit sign out.',
    circuitBreakerExpectations: 'Shortage > ₹500 immediately freezes driver withdrawal capability until support resolution.',
    definitionOfDone: 'Discrepancy audit log recorded, payout lockout integration validated, tested in usecases-custody-payouts.spec.ts.'
  },
  'FEAT-08.01': {
    functionalExpectations: 'Kirana merchant trade credit line underwriting, limit assignment, credit score calculation, and balance holds.',
    lifecycleExpectations: '1. Seed merchant credit line profile -> 2. Sign in as merchant -> 3. Reserve credit for B2B order; verify available credit headroom decrease -> 4. Explicit sign out.',
    circuitBreakerExpectations: 'Order amount exceeding available credit headroom strictly rejected with 402/403 credit limit exceeded.',
    definitionOfDone: 'credit-service reservations table updated, headroom circuit breaker verified in usecases-commerce.spec.ts.'
  },
  'FEAT-08.03': {
    functionalExpectations: 'Credit repayment collection via UPI, field cash collection, post-due aging calculation, and relief schedule.',
    lifecycleExpectations: '1. Seed outstanding credit balance -> 2. Merchant signs in -> 3. Submits partial or full repayment via UPI, receives instant credit limit restoration -> 4. Explicit sign out.',
    circuitBreakerExpectations: 'Overdue loans (>30 days) lock merchant ordering privileges until minimum due is repaid.',
    definitionOfDone: 'credit_repayments recorded, credit headroom restored, automated aging cron job operational.'
  },
  'FEAT-08.04': {
    functionalExpectations: 'Trade credit terms configuration, repayment billing cycles, and default recovery escalation policy.',
    lifecycleExpectations: '1. Seed credit terms template -> 2. Admin/support reviews terms -> 3. Configures 7/14/30-day billing cycle and overdue penalties -> 4. Explicit sign out.',
    circuitBreakerExpectations: 'Terms modifications require merchant digital agreement re-consent before taking effect.',
    definitionOfDone: 'credit_terms table updated, merchant notification dispatched upon cycle rollover.'
  },
  'FEAT-09.01': {
    functionalExpectations: 'Immutable double-entry platform general ledger with strict mathematical zero-sum balance invariance.',
    lifecycleExpectations: '1. Seed financial transaction event -> 2. System worker ingests journal entry -> 3. Validates sum(Debit) == sum(Credit); commits immutable journal and ledger lines -> 4. Verifies audit trail.',
    circuitBreakerExpectations: 'Any unbalanced journal entry (Debit != Credit) is strictly rejected with 422 UNBALANCED_JOURNAL_ENTRY; existing entries are append-only.',
    definitionOfDone: 'finance_db.journal_entries and ledger_lines populated, zero-sum invariant verified in usecases-governance-ledger.spec.ts.'
  },
  'FEAT-09.02': {
    functionalExpectations: 'Automated nightly 3-way reconciliation comparing internal ledger, payment gateway statements, and bank escrow accounts.',
    lifecycleExpectations: '1. Seed simulated bank statement and gateway settlement files -> 2. Cloud Scheduler triggers nightly reconciliation job -> 3. Matches transactions, isolates variances, runs Vertex AI discrepancy classification -> 4. Generates audit report.',
    circuitBreakerExpectations: 'Unreconciled variance > ₹1,000 alerts finance ops team immediately; blocks automated accounting period closure.',
    definitionOfDone: 'finance_db.reconciliation_runs record created with matched/unmatched tallies, verified in E2E test.'
  },
  'FEAT-09.03': {
    functionalExpectations: 'Statutory Section 194C (1% driver transport) and Section 194O (1% e-commerce operator) TDS calculation, quarterly challans, and tax register.',
    lifecycleExpectations: '1. Seed taxable payout and commission events -> 2. Finance service computes statutory TDS deductions -> 3. Aggregates into TDS register and generates government challan settlement -> 4. Verifies ledger balancing.',
    circuitBreakerExpectations: 'TDS rate dynamically adjusted based on PAN availability (20% for missing PAN); challan payment must balance withholding ledger.',
    definitionOfDone: 'tds_register populated, quarterly challan summary generated, passing test in usecases-governance-ledger.spec.ts.'
  },
  'FEAT-10.01': {
    functionalExpectations: 'Four-tier platform geographical master hierarchy (Country -> State -> District -> Village) with Google Maps geocoding and postGIS boundary support.',
    lifecycleExpectations: '1. Seed geo-hierarchy data -> 2. Support operator signs in -> 3. Navigates to /x/config/villages, verifies 4 levels of administration and village boundary coordinates -> 4. Explicit sign out.',
    circuitBreakerExpectations: 'Villages cannot be orphaned without a valid district foreign key; duplicate PIN code associations rejected.',
    definitionOfDone: 'config_service villages, districts, states tables populated, passing Playwright test config-geo-hierarchy.spec.ts.'
  },
  'FEAT-10.02': {
    functionalExpectations: 'Commercial SaaS subscription plans (Silver, Gold, Platinum) with tiered tariffs, commission caps, and entitlement enforcement.',
    lifecycleExpectations: '1. Seed subscription plans -> 2. Support operator signs in -> 3. Reviews plan features, tariff controls, and billing cycles at /x/config/subscriptions -> 4. Explicit sign out.',
    circuitBreakerExpectations: 'Suppliers on expired subscription grace periods restricted from scheduling new logistics gigs.',
    definitionOfDone: 'config_db.subscription_plans and tariffs tables active, verified in config-subscription-plans.spec.ts.'
  },
  'FEAT-10.03': {
    functionalExpectations: 'Master statutory commodity tax profiles (0% essential grains, 5% branded pulses, 18% packaged goods) and regional GST/TDS rules.',
    lifecycleExpectations: '1. Seed tax profile configurations -> 2. Support operator signs in -> 3. Reviews commodity GST profiles and withholding rules at /x/config/taxes -> 4. Explicit sign out.',
    circuitBreakerExpectations: 'Invoices missing tax profile mapping rejected by order checkout engine.',
    definitionOfDone: 'config_db.tax_profiles active, validated in config-tax-profiles.spec.ts.'
  },
  'FEAT-10.04': {
    functionalExpectations: 'Support-as-Supplier proxy context switching allowing authorized support operators to manage supplier data with full audit trail.',
    lifecycleExpectations: '1. Seed support user credentials and target supplier organization -> 2. Support operator signs in -> 3. Selects proxy supplier context, injects X-Supplier-Context header, audits catalog -> 4. Explicit sign out.',
    circuitBreakerExpectations: 'Support proxy users strictly blocked from executing bank disbursements and financial withdrawals.',
    definitionOfDone: 'Proxy context header validated, audit logging verified, tested in support-supplier-proxy.spec.ts.'
  },
  'FEAT-10.08': {
    functionalExpectations: 'Bulk supplier ecosystem data ingestion with 11 entity categories, dry-run schema validation, and GSTIN syntax enforcement.',
    lifecycleExpectations: '1. Seed bulk ingestion JSON payload -> 2. Support operator signs in -> 3. Selects entity categories, executes dry-run validation, verifies GSTIN syntax checks -> 4. Explicit sign out.',
    circuitBreakerExpectations: 'Invalid GSTIN (<15 chars or checksum failure) disables commit button and displays error alert.',
    definitionOfDone: 'Dry-run validation passes with 11 entities, invalid GSTIN rejected, verified in support-supplier-bulk-ingest.spec.ts.'
  },
  'FEAT-11.01': {
    functionalExpectations: 'NPCI and RBI Third-Party Application Provider (TPAP) compliance, VPA syntax validation, handle verification, and blacklisting.',
    lifecycleExpectations: '1. Seed valid and invalid VPA strings -> 2. System worker validates VPA against approved PSP handles -> 3. Rejects blacklisted handles and records compliance audit log -> 4. Explicit verification.',
    circuitBreakerExpectations: 'Non-whitelisted PSP handles rejected with 422 INVALID_VPA_HANDLE; blacklisted VPAs blocked immediately.',
    definitionOfDone: 'governance-service VPA governance rules passing in usecases-governance-ledger.spec.ts.'
  },
  'FEAT-11.02': {
    functionalExpectations: 'Real-time Anti-Money Laundering (AML) fraud detection with velocity guardrails and instant account freeze circuit breakers.',
    lifecycleExpectations: '1. Seed transaction stream exceeding velocity threshold (>5 transactions/min or >₹50,000) -> 2. Ingestion worker evaluates risk score -> 3. Triggers account freeze gate and notifies compliance ops -> 4. Verifies frozen user cannot initiate payments.',
    circuitBreakerExpectations: 'Velocity breach immediately triggers HTTP 423 LOCKED / ACCOUNT_FROZEN_FOR_AML.',
    definitionOfDone: 'AML interceptor active in governance-service, tested in usecases-governance-ledger.spec.ts.'
  },
  'FEAT-11.03': {
    functionalExpectations: 'Dispute SLA tracking with 24-hour countdown timer, evidence packaging for bank arbitration, and NPCI regulatory reporting.',
    lifecycleExpectations: '1. Seed customer chargeback/dispute -> 2. Compliance operator signs in -> 3. Audits dispute countdown timer, attaches evidence package, submits regulatory report -> 4. Explicit sign out.',
    circuitBreakerExpectations: 'Disputes exceeding 24 hours without evidence automatically escalated to high-priority compliance queue.',
    definitionOfDone: 'Dispute SLA tracker rendered in UI, regulatory export generated, verified in E2E test.'
  },
  'FEAT-11.04': {
    functionalExpectations: 'Platform Terms of Service, privacy policies, and multi-role versioned clickwrap consent engine with mandatory re-consent gates.',
    lifecycleExpectations: '1. Seed user with consent to policy version 1.0 -> 2. Bump policy version to 2.0 in config -> 3. User attempts login; system forces modal re-consent gate before access is granted -> 4. User accepts and signs out.',
    circuitBreakerExpectations: 'Unaccepted policy versions strictly block app routing until user digitally signs agreement.',
    definitionOfDone: 'Re-consent gate modal validated, policy version stored in user_consents table, verified in E2E test.'
  },
  'FEAT-12.01': {
    functionalExpectations: 'Unified API Gateway perimeter reverse proxy with Firebase App Check attestation, JWT validation, and internal header injection.',
    lifecycleExpectations: '1. Send incoming client request -> 2. Gateway validates App Check token -> 3. Injects x-user-uid and x-user-role headers, proxies request to target microservice -> 4. Returns downstream response.',
    circuitBreakerExpectations: 'Requests lacking valid App Check or JWT rejected with 401 UNAUTHORIZED / 403 FORBIDDEN; rate limit 300 req/min per IP.',
    definitionOfDone: 'Gateway proxies to all 13 microservices, health endpoint reports 13 active services, tested in status-services.spec.ts.'
  },
  'FEAT-12.02': {
    functionalExpectations: 'Zero-trust perimeter security monitoring, live E2E test runner console, test suite execution triggers, and WebM video playback.',
    lifecycleExpectations: '1. Navigate to /status -> 2. Switch between Microservices Mesh and Test Runner tabs -> 3. Select test suite, trigger rerun, open video playback modal with speed controls -> 4. Verify telemetry.',
    circuitBreakerExpectations: 'Test runner execution is sandboxed and does not impact production databases; video streams with chunked delivery.',
    definitionOfDone: 'status-test-runner.spec.ts passes, test runner UI fully operational, video modal playback validated.'
  }
};

// Update Epics and Features
let epicsUpdated = 0;
let featuresUpdated = 0;

epics.forEach(epic => {
  // Move active Epics to IN_PROGRESS
  if (['EPIC-01', 'EPIC-02', 'EPIC-05', 'EPIC-06', 'EPIC-07', 'EPIC-08', 'EPIC-09', 'EPIC-10', 'EPIC-11', 'EPIC-12', 'EPIC-13'].includes(epic.id)) {
    epic.status = 'IN_PROGRESS';
    epicsUpdated++;
  }

  (epic.features || []).forEach(f => {
    // Move features to IN_PROGRESS
    if (f.useCaseNumber || expectationsByFeature[f.id] || ['FEAT-05.03', 'FEAT-08.03', 'FEAT-08.04'].includes(f.id)) {
      f.status = 'IN_PROGRESS';
      featuresUpdated++;
    }

    // Attach or update clearExpectations
    if (expectationsByFeature[f.id]) {
      f.clearExpectations = expectationsByFeature[f.id];
    } else {
      f.clearExpectations = {
        functionalExpectations: f.scope || f.title,
        lifecycleExpectations: '1. Test Data Setup -> 2. User Sign-In -> 3. Core Business Flow -> 4. Explicit User Sign-Out',
        circuitBreakerExpectations: 'Ensure boundary checks, authorization guards, and idempotency protection on all service endpoints.',
        definitionOfDone: 'Service API verified, outbox CDC replication active, zero regressions across test suites.'
      };
    }
  });
});

console.log(`Updated ${epicsUpdated} Epics and ${featuresUpdated} Features to IN_PROGRESS with clearExpectations.`);

fs.writeFileSync(jsonPath, JSON.stringify(epics, null, 2), 'utf8');
fs.writeFileSync(webJsonPath, JSON.stringify(epics, null, 2), 'utf8');
fs.writeFileSync(
  jsPath,
  'window.WORK_MANAGEMENT_DATA = ' + JSON.stringify(epics, null, 2) + ';\nif (typeof module !== "undefined") module.exports = window.WORK_MANAGEMENT_DATA;\n',
  'utf8'
);

console.log('Successfully wrote updated work management data to all 3 files.');

