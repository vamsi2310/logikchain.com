# EPIC-09: Financial Ledger, Reconciliation & Tax Accounting

## 1. Functional Area Alignment & Microservice Metadata
- **Epic ID**: `EPIC-09`
- **Functional Area**: Finance, General Ledger, Statutory Tax & Automated Reconciliation
- **Bound Microservice**: `microservices/services/finance-service`
- **Container Port**: `4009`
- **Database**: `finance_db` (PostgreSQL with outbox event streaming)
- **Primary Runtimes**: Web Support & Finance Console (`web/x/`), API Gateway, Google Cloud Scheduler
- **Primary Responsibilities**: Immutable double-entry general ledger, nightly automated multi-source reconciliation, accounting period closure and audit locking, Section 194C / 194O TDS calculation and challan repository, financial reporting, and Vertex AI discrepancy analysis.

---

## FEAT-09.01: Double-Entry Platform General Ledger

### 1. Feature Metadata & Hierarchy
- **Feature ID**: `FEAT-09.01`
- **Functional Scope**: Immutable multi-currency double-entry ledger, journal entry posting, chart of accounts, and balance conservation.
- **Service Endpoints**: `POST /v1/finance/journal-entries`, `GET /v1/finance/accounts/{code}/balance`, `GET /v1/finance/reports` (`getFinanceReport`)
- **UI Screens**: [SPT-07 Finance Dashboard](file:///c:/Users/Admin/Downloads/logikchain/logikchain.com/constitution/wireframes/Support.md#SPT-07), [SPT-08 Ledger Explorer](file:///c:/Users/Admin/Downloads/logikchain/logikchain.com/constitution/wireframes/Support.md#SPT-08)

### 2. Derived Use Cases
#### UC-09.01.A: Automated Double-Entry Journal Posting with Zero-Sum Invariance
- **Description**: Whenever funds move across orders, payments, payouts, or cash handovers, system records balanced debits and credits.
- **Primary Actor**: System (Domain microservices) and Finance Controller (`role: support`).
- **Nominal Flow**:
  1. A transaction occurs (e.g. order paid via UPI ₹1,200).
  2. Calling service emits transaction event to `finance-service`.
  3. `finance-service` constructs double-entry journal entry:
     - Debit: `1010-GATEWAY-CLEARING` ₹1,200
     - Credit: `2010-BUYER-ADVANCE` ₹1,200
  4. Invariant assertion: $\sum Debit - \sum Credit = 0$.
  5. `finance-service` writes append-only rows to `finance_db.journal_lines`.
  6. Outbox event emitted for audit trail.
- **Postconditions**: Ledger entry immutably written; account balances recalculated; zero phantom money verified.

### 3. User Journey Stories
- **US-09.01.01**: *As a platform financial controller, I want all transactions recorded using strict double-entry principles, so that financial audits pass without discrepancy.*
- **US-09.01.02**: *As an auditor, I want an immutable journal entry ledger that cannot be updated or deleted, so that the financial history of the platform is tamper-proof.*

#### Acceptance Criteria (Gherkin)
```gherkin
Scenario: Journal entry enforces double-entry balance
  Given a journal entry payload with Debit ₹5,000 to Account "1010" and Credit ₹4,500 to Account "2010"
  When the entry is submitted to "/v1/finance/journal-entries"
  Then finance-service rejects the request with HTTP 422 "UNBALANCED_JOURNAL_ENTRY"
  And records zero mutations in finance_db
```

### 4. Integration Stories
- **INT-09.01.01 (Multi-Service Ingestion Integration)**: *As the Finance Service, I need to ingest journal creation events from `payments-service`, `payouts-service`, `cash-service`, and `credit-service` via internal REST endpoints.*
- **INT-09.01.02 (Firestore Periodic Sync Integration)**: *As the Finance Service, I need to mirror daily balance summaries to Firestore collection `/FinanceSummaries/{date}`.*

### 5. Independent Support Stories
- **OPS-09.01.01 (DevOps & Immutability Rules)**: *Configure PostgreSQL permissions in `finance_db` revoking `UPDATE` and `DELETE` grants on `journal_lines` table.*
- **DOC-09.01.01 (Standard Chart of Accounts Spec)**: *Publish comprehensive Logikchain Chart of Accounts (Assets, Liabilities, Equity, Revenue, Expense) in platform documentation.*
- **TEST-09.01.01 (Bruno API Automation)**: *Create automated Bruno test `tests/bruno/09-finance/postJournalEntry/` validating debits-equal-credits invariant.*

---

## FEAT-09.02: Automated Scheduled Daily Reconciliation

### 1. Feature Metadata & Hierarchy
- **Feature ID**: `FEAT-09.02`
- **Functional Scope**: Nightly three-way automated reconciliation (Gateway settlement file vs Bank statement vs Internal ledger), variance identification, and Vertex AI discrepancy analysis.
- **Service Endpoints**: `POST /v1/finance/reconciliation:run` (`runReconciliation`), `POST /v1/finance/scheduled-reconciliation` (`scheduledReconciliation`)
- **UI Screens**: [SPT-07 Reconciliation Runs](file:///c:/Users/Admin/Downloads/logikchain/logikchain.com/constitution/wireframes/Support.md#SPT-07)

### 2. Derived Use Cases
#### UC-09.02.A: Nightly Settlement & Three-Way Bank Reconciliation
- **Description**: Cloud Scheduler triggers nightly reconciliation at 01:00 AM UTC; system reconciles PSP settlements, bank statements, and orders ledger.
- **Primary Actor**: Google Cloud Scheduler (System) and Financial Auditor.
- **Secondary Systems**: `finance-service`, `payments-service`, `payouts-service`, Vertex AI.
- **Nominal Flow**:
  1. Cloud Scheduler sends authenticated POST to `scheduledReconciliation`.
  2. `finance-service` queries `payments_db` and `payouts_db` for previous day's cleared transactions.
  3. Ingests PSP nodal account settlement report and driver cash turn-in totals from `cash_db`.
  4. Matches transactions by UTR, order ID, and transaction amount.
  5. If matched: Marks transactions as `reconciled`.
  6. If variance detected (e.g. ₹50 unallocated charge): Creates variance ticket and calls Vertex AI to analyze patterns.
  7. Persists `reconciliation_runs` record in `finance_db`.
- **Postconditions**: Daily reconciliation completed; variance report published; alerts dispatched if variance $> ₹500$.

### 3. User Journey Stories
- **US-09.02.01**: *As a finance manager, I want the system to automatically reconcile bank and payment gateway statements every night, so that I start each morning with an accurate variance report.*

#### Acceptance Criteria (Gherkin)
```gherkin
Scenario: Automated nightly reconciliation identifies zero variance
  Given all payments and payouts for date "2026-10-03" match banking settlements exactly
  When Cloud Scheduler triggers "/v1/finance/scheduled-reconciliation"
  Then finance-service marks reconciliation status as "balanced" with zero variance
  And closes the daily reconciliation run
```

### 4. Integration Stories
- **INT-09.02.01 (Google Cloud Scheduler Integration)**: *As the Finance Service, I need to receive cron triggers from Google Cloud Scheduler configured with OIDC authentication tokens.*
- **INT-09.02.02 (Vertex AI Discrepancy Analysis Integration)**: *As the Finance Service, I need to call Google Cloud Vertex AI to identify recurring merchant or driver variance patterns across historical data.*

### 5. Independent Support Stories
- **OPS-09.02.01 (Cloud Scheduler Terraform DevOps)**: *Define Terraform resource for Cloud Scheduler job `daily-finance-reconciliation` running at `0 1 * * *`.*
- **DOC-09.02.01 (Reconciliation Operating Manual)**: *Document three-way matching criteria, variance tolerance thresholds, and manual intervention steps.*
- **TEST-09.02.01 (Automated Test Suite)**: *Build Bruno test in `tests/bruno/09-finance/runReconciliation/` simulating synthetic mismatch scenarios.*

---

## FEAT-09.03: Statutory Tax Compliance & TDS Register

### 1. Feature Metadata & Hierarchy
- **Feature ID**: `FEAT-09.03`
- **Functional Scope**: Statutory TDS withholding (Sections 194C / 194O), tax liability accumulation, quarterly Challan recording, and Form 16A generation.
- **Service Endpoints**: `POST /v1/finance/tds/challans` (`recordTdsChallan`), `GET /v1/finance/tds/register` (`getTdsRegister`)
- **UI Screens**: [SPT-09 Tax & TDS Console](file:///c:/Users/Admin/Downloads/logikchain/logikchain.com/constitution/wireframes/Support.md#SPT-09)

### 2. Derived Use Cases
#### UC-09.03.A: Section 194C/194O TDS Deduction & Quarterly Challan Recording
- **Description**: System deducts 1% TDS on driver payouts and supplier settlements, compiles TDS register, and records government challan receipt.
- **Primary Actor**: Finance Compliance Officer (`role: support`).
- **Nominal Flow**:
  1. On each payout calculation, `finance-service` evaluates TDS rule (1% for PAN verified, 20% for non-PAN).
  2. Withheld tax is credited to `2030-TDS-PAYABLE`.
  3. At month-end, compliance officer deposits withheld TDS to Income Tax Department.
  4. Compliance officer uploads challan details (BSR Code, Challan No, Deposit Date) on `SPT-09`.
  5. `finance-service` links challan to withheld payout records and updates TDS register.
- **Postconditions**: Tax liability cleared; statutory audit trail prepared for Form 26Q filing.

### 3. User Journey Stories
- **US-09.03.01**: *As a finance officer, I want a complete TDS register detailing every tax deduction and its corresponding government tax deposit challan, so that quarterly tax filings are flawless.*

#### Acceptance Criteria (Gherkin)
```gherkin
Scenario: Record government tax challan
  Given pending TDS deductions totaling ₹45,000 for month "September 2026"
  When compliance officer posts challan with BSR "0210001" and ChallanNo "99401"
  Then finance-service marks matched TDS line items as "deposited"
  And debits TDS Payable account in finance_db
```

### 4. Integration Stories
- **INT-09.03.01 (Config Service Tax Profile Integration)**: *As the Finance Service, I need to read statutory TDS thresholds and tax rates dynamically from `config-service` (`:4010`).*
- **INT-09.03.02 (Firebase Cloud Storage Challan PDF Sync)**: *As the Finance Service, I need to store scanned government bank challan receipts in Firebase Cloud Storage `/tax/challans/{id}.pdf`.*

### 5. Independent Support Stories
- **OPS-09.03.01 (DevOps & Reporting Views)**: *Create database view `vw_tds_quarterly_summary` in `finance_db` for instant export to government e-filing utilities.*
- **DOC-09.03.01 (TDS Statutory Compliance Guide)**: *Document Indian Income Tax Act compliance rules (Section 194C / 194O) applicable to rural gig logistics.*
- **TEST-09.03.01 (Bruno API Automation)**: *Create automated Bruno test `tests/bruno/09-finance/recordChallan/` validating BSR code formatting.*
