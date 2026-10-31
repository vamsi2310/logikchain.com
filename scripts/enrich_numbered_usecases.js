const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const jsonPath = path.resolve(rootDir, 'work-management/work_management_data.json');
const webJsonPath = path.resolve(rootDir, 'web/src/data/work_management_data.json');
const jsPath = path.resolve(rootDir, 'work-management/work_management_data.js');

const USE_CASE_MAP = {
  'FEAT-01.01': { useCaseNumber: 'UC-01', useCaseTitle: 'Rural Phone OTP Sign-In & Role Bootstrapping' },
  'FEAT-01.03': { useCaseNumber: 'UC-02', useCaseTitle: 'Progressive Role Elevation to Kirana Merchant & Multi-Client Handoff' },
  'FEAT-01.06': { useCaseNumber: 'UC-03', useCaseTitle: 'User Profile Village Selection & PostgreSQL Persistence' },
  'FEAT-08.01': { useCaseNumber: 'UC-04', useCaseTitle: 'Trade Credit 2-Phase Hold & Headroom Circuit Breaker' },
  'FEAT-05.01': { useCaseNumber: 'UC-05', useCaseTitle: 'Dynamic UPI QR Intent Generation & Webhook Settlement' },
  'FEAT-02.01': { useCaseNumber: 'UC-06', useCaseTitle: 'End-to-End Order Creation, Vehicle Departure Gate & OTP Handover' },
  'FEAT-02.04': { useCaseNumber: 'UC-07', useCaseTitle: 'Order Deliverable Verification, Doorstep Rejection & 72-Hour RTO Protocol' },
  'FEAT-07.01': { useCaseNumber: 'UC-08', useCaseTitle: 'CoD Cash Collection, Custody Tracking & Daily Limit Guard' },
  'FEAT-07.02': { useCaseNumber: 'UC-09', useCaseTitle: 'End-of-Shift Cash Turn-In & Cryptographic Handover OTP Verification' },
  'FEAT-07.03': { useCaseNumber: 'UC-10', useCaseTitle: 'Cash Discrepancy & The Payout Custody Gate Circuit Breaker' },
  'FEAT-06.01': { useCaseNumber: 'UC-11', useCaseTitle: 'Bank Beneficiary Registration & KMS Account Encryption' },
  'FEAT-06.03': { useCaseNumber: 'UC-12', useCaseTitle: 'Cloud Tasks Asynchronous IMPS Bank Transfer & UTR Settlement' },
  'FEAT-06.04': { useCaseNumber: 'UC-13', useCaseTitle: 'Supplier Funds Tracking & Multi-Channel Allocation Governance' },
  'FEAT-11.01': { useCaseNumber: 'UC-14', useCaseTitle: 'UPI TPAP Compliance, VPA Syntax Validation & Blacklist Rejection' },
  'FEAT-11.02': { useCaseNumber: 'UC-15', useCaseTitle: 'Real-Time AML Fraud Velocity Interception & Account Freeze Gate' },
  'FEAT-11.03': { useCaseNumber: 'UC-16', useCaseTitle: 'Dispute SLA Tracking, 24-Hour Countdown & Regulatory Reporting' },
  'FEAT-11.04': { useCaseNumber: 'UC-17', useCaseTitle: 'Multi-Role Versioned Clickwrap Policy Consent & Mandatory Re-Consent Gate' },
  'FEAT-09.01': { useCaseNumber: 'UC-18', useCaseTitle: 'Double-Entry Platform General Ledger & Zero-Sum Invariance Invariant Gate' },
  'FEAT-09.02': { useCaseNumber: 'UC-19', useCaseTitle: 'Nightly 3-Way Bank Reconciliation & Vertex AI Variance Analysis' },
  'FEAT-09.03': { useCaseNumber: 'UC-20', useCaseTitle: 'Section 194C/194O TDS Deductions, Government Challan Settlement & Ledger Balancing' },
  'FEAT-12.01': { useCaseNumber: 'UC-21 / UC-27', useCaseTitle: 'Critical Path Golden Path & Microservices Mesh Health Probes' },
  'FEAT-10.01': { useCaseNumber: 'UC-22', useCaseTitle: 'Platform 4-Tier Geo-Hierarchy & Village Registry Management' },
  'FEAT-10.02': { useCaseNumber: 'UC-23', useCaseTitle: 'Commercial SaaS Subscription Plans & Tiered Tariffs' },
  'FEAT-10.03': { useCaseNumber: 'UC-24', useCaseTitle: 'Statutory Commodity Tax Profiles & Regional GST Rates' },
  'FEAT-10.08': { useCaseNumber: 'UC-25', useCaseTitle: 'Supplier Bulk Ingestion & Selective Entity Loader' },
  'FEAT-10.04': { useCaseNumber: 'UC-26', useCaseTitle: 'Support-as-Supplier Proxy Impersonation & Audit Trail' },
  'FEAT-12.02': { useCaseNumber: 'UC-28', useCaseTitle: 'Live E2E Test Runner, Results Review & Video Playback Console' }
};

const rawData = fs.readFileSync(jsonPath, 'utf8');
const epics = JSON.parse(rawData);

let enrichedCount = 0;
for (const epic of epics) {
  if (Array.isArray(epic.features)) {
    for (const feat of epic.features) {
      if (USE_CASE_MAP[feat.id]) {
        const info = USE_CASE_MAP[feat.id];
        feat.useCaseNumber = info.useCaseNumber;
        feat.useCaseTitle = info.useCaseTitle;
        feat.lifecycle = '1. Test Data Setup -> 2. User Sign-In -> 3. Core Business Flow -> 4. Explicit User Sign-Out';
        enrichedCount++;
      }
    }
  }
}

console.log(`Enriched ${enrichedCount} features with numbered use cases & lifecycle.`);

const updatedJson = JSON.stringify(epics, null, 2);
fs.writeFileSync(jsonPath, updatedJson, 'utf8');
fs.writeFileSync(webJsonPath, updatedJson, 'utf8');
fs.writeFileSync(jsPath, `// Auto-generated work management data\nwindow.WORK_MANAGEMENT_DATA = ${updatedJson};\nif (typeof module !== 'undefined') module.exports = ${updatedJson};\n`, 'utf8');

console.log('Successfully synchronized work management records across JSON and JS sources.');

