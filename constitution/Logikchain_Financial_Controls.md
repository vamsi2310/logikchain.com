# Logikchain Financial Controls

The accounting, tax, and entitlement rules that the API specifications, data structures, and wireframes all reference. Those documents say what a function does; this one says what the resulting numbers must mean and who is allowed to change them.

Precedence: where this document and a wireframe disagree, this document governs and the wireframe is a defect. Where this document and `constitution/Logikchain_API_Specifications.md` disagree on a figure, the API specification governs the mechanics and this document governs the accounting treatment — and the disagreement is itself a defect to be closed rather than a choice to be made per screen.

**Nothing here sets a commercial price.** Prices, plan names, billing cycles, GST rates, tariffs, offers, and effective dates are Support configuration. This document defines what an entitlement *means* and what a safe default *is*.

## Contents

| | Section |
| - | ------- |
| 1 | [Chart of sub-ledgers and control accounts](#1-chart-of-sub-ledgers-and-control-accounts) |
| 2 | [Cut-off rules](#2-cut-off-rules) |
| 3 | [Reconciliation](#3-reconciliation) |
| 4 | [Sub-ledger statements and exports](#4-sub-ledger-statements-and-exports) |
| 5 | [GST treatment](#5-gst-treatment) |
| 6 | [Statutory withholding (TDS)](#6-statutory-withholding-tds) |
| 7 | [Retention, privacy, and redaction](#7-retention-privacy-and-redaction) |
| 8 | [Period close evidence pack](#8-period-close-evidence-pack) |
| 9 | [Finance entitlement matrix](#9-finance-entitlement-matrix) |
| 10 | [Preventive and detective controls](#10-preventive-and-detective-controls) |
| 11 | [Authority and approval limits](#11-authority-and-approval-limits) |
| 12 | [Exception queues and SLAs](#12-exception-queues-and-slas) |
| 13 | [Traceability](#13-traceability) |
| 14 | [Control testing](#14-control-testing) |

---

## 1. Chart of sub-ledgers and control accounts

Every financial record on the platform belongs to exactly one `SubLedger`. That is what makes "does the platform agree with the bank" a question with an answer rather than an opinion. Each sub-ledger ties out to one control account, and the tie-out is either against an external statement or against another sub-ledger — never against itself.

| Sub-ledger | Contents | Ties out against | Normal balance | Source of truth |
| ---------- | -------- | ---------------- | -------------- | --------------- |
| `buyer_collections` | Buyer order payments captured through the gateway | Provider settlement report, then bank credit | Debit | `PaymentTransaction` |
| `merchant_collections` | Merchant bulk-order payments and credit repayments made online | Provider settlement report, then bank credit | Debit | `PaymentTransaction` |
| `subscription_collections` | Supplier and Merchant subscription charges | Provider settlement report, then bank credit | Debit | `PaymentTransaction`, `SubscriptionInvoice` |
| `refunds` | Money returned to a payer for any reason | Provider refund report, then bank debit | Credit | `RefundTransaction`, `CreditNote` |
| `driver_payables` | Earnings accrued to drivers and not yet paid | Internal: nets against `driver_payouts` and `cash_custody` | Credit | `DriverEarning` |
| `driver_payouts` | Money actually sent to driver beneficiaries | Payout provider report, then bank debit | Debit | `PayoutTransaction` |
| `merchant_credit` | Credit drawn, repaid, and adjusted on merchant credit lines | Internal: nets against `merchant_collections` and `cash_custody` | Debit | `CreditTransaction` |
| `cash_custody` | Cash collected and held by a driver or merchant before settlement | Third-party custody: physical settlement to the supplier | Debit | `CashLedgerEntry`, `CashSettlement` |
| `gateway_fees` | Provider fees and the tax on them, deducted before settlement | Provider settlement report | Debit | `PaymentTransaction.providerFee`, `providerTax` |
| `taxes_withheld` | TDS withheld from payouts and not yet deposited | Challan evidence, then bank debit | Credit | `TdsDeduction`, `TdsChallan` |

Three rules make the chart usable rather than decorative.

**A record belongs to one sub-ledger for its whole life.** A payment that is later refunded does not move out of `buyer_collections`; a `RefundTransaction` appears in `refunds` beside it. Moving records between ledgers to net a figure is the fastest way to make a control account untraceable.

**Internal tie-outs are still tie-outs.** `driver_payables` has no bank statement, so it is proved differently: opening payable, plus accruals, less payouts, less cash recovered, less tax withheld, equals closing payable. A variance here is exactly as reportable as a bank difference.

**A tolerance is a decision, not a rounding convenience.** `ControlAccount.toleranceAmount` is zero for every ledger by default. A non-zero tolerance is a Support configuration change with a reason attached, because a tolerance is a stated willingness to not notice a difference.

---

## 2. Cut-off rules

A period contains the records whose **economic event** falls inside it, not the records that happened to be written inside it. Every close applies these dates.

| Record | Period is decided by | Treatment when still non-terminal at cut-off |
| ------ | -------------------- | -------------------------------------------- |
| `PaymentTransaction` | Provider capture timestamp (`succeededAt`) | `pending` at cut-off is an in-transit line, not a collection |
| `RefundTransaction` | Provider refund date | `processing` is in-transit; the liability stays in the period the refund was requested |
| `PayoutTransaction` | Settlement (`settledAt`), not approval and not initiation | `initiated` or `processing` remains a payable, shown as cash committed and not yet gone |
| `CashLedgerEntry` | The verified custody transfer that created it | `in_custody` at cut-off carries forward as a stated closing custody balance per holder |
| `CashSettlement` | Confirmation by the receiving supplier | `declared` or `disputed` blocks the close entirely |
| `CreditTransaction` | The draw, repayment, or adjustment timestamp | Not applicable; credit entries are immediately terminal |
| `Order` / `MerchantOrder` invoice | `invoiceDate` | Not applicable; an invoice is issued or it is not |
| `CreditNote` | `creditNoteDate` — the issue date, never the credited invoice's date | Not applicable |
| `SubscriptionInvoice` | The period it bills, not the date it was paid | An unpaid invoice is a receivable in its own period |
| `TdsDeduction` | The payout approval that withheld it | `accrued` with no challan is a stated liability |
| Gateway fee and tax | The settlement batch that deducted it | Unsettled captures carry an accrued fee estimate, labelled as an estimate |

**A late event posts to the period it belongs to while that period is open, and to the current period with a reference once it is not.** A webhook that arrives on the 3rd confirming a capture on the 31st posts to the closed month if the close has not run, and to the open month carrying `againstAccountingPeriodId` if it has. Reopening a reported period to absorb a late webhook is the wrong trade: the correction is cheap and visible, the reopen is neither.

**In-transit is a line item, not a rounding.** The close pack states the in-transit count and amount per ledger. A total that quietly includes or quietly excludes in-flight money is a total nobody can reproduce.

---

## 3. Reconciliation

### 3.1 The three sides

`runReconciliation` matches platform records against the provider's report against the bank statement, daily, per business date in IST. A run with a missing side fails rather than degrading to a two-way match — a green tick over an unchecked leg is worse than no tick at all.

Matching is attempted in strict order: provider reference first; then the tuple of amount, target record, and date within a one-day window. Anything unmatched on any side becomes a `ReconciliationException`.

### 3.2 Exception taxonomy, ownership, and SLA

| Kind | What it means | Severity floor | SLA | Permitted resolutions |
| ---- | ------------- | -------------- | --- | --------------------- |
| `missing_at_provider` | Platform recorded it; provider has no row | High | 24h | `matched_manually`, `corrected_by_adjustment`, `escalated` |
| `missing_on_platform` | Provider or bank has a row the platform never created | Critical | 8h | `matched_manually`, `corrected_by_adjustment`, `refunded` |
| `amount_mismatch` | Same reference, different figure | High | 24h | `matched_manually`, `corrected_by_adjustment`, `refunded` |
| `currency_mismatch` | Non-INR value on any side | Critical | 8h | `escalated` only |
| `duplicate_at_provider` | Two successful references against one target | Critical | 8h | `refunded`, `corrected_by_adjustment` |
| `status_mismatch` | Platform succeeded, provider failed, or the reverse | High | 24h | `matched_manually`, `corrected_by_adjustment`, `retried` |
| `stale_pending` | Non-terminal past its ageing threshold | Medium | 48h | `retried`, `corrected_by_adjustment`, `no_action_required` |
| `unapplied_settlement` | Money in the bank attributable to nothing | High | 24h | `matched_manually`, `written_off` |
| `fee_variance` | Provider fee or tax differs from the contracted schedule | Low | 5 days | `corrected_by_adjustment`, `provider_credit_note`, `written_off` |

SLA hours are seeded from `RECONCILIATION_EXCEPTION_SLA_HOURS` and configurable per kind. Ageing is recomputed by each run, so an exception that outlives its SLA rises in the queue rather than sinking down it.

### 3.3 Resolution authority

| Action | Who | Additional control |
| ------ | --- | ------------------ |
| Assign, investigate, escalate | Support | Reason optional; actor recorded |
| `matched_manually` | Support | Requires a linked record whose amount agrees |
| `corrected_by_adjustment` | Support | Writes a balancing entry; never edits the wrong record |
| `refunded` | Support | Requires an existing `RefundTransaction` and, where GST applies, a `CreditNote` |
| `retried` | Support or the managing Supplier | Requires a new `PayoutTransaction` from `retryPayout` |
| `recovered_from_earnings` | Support | Only where a driver is the counterparty |
| `written_off` | Support, below `WRITE_OFF_SINGLE_APPROVAL_CEILING_INR` | Above the ceiling, a second Support actor who did not raise it must agree |
| `provider_credit_note` | Support | Requires the provider's own credit reference |
| `no_action_required` | Support | Leaves the break open and ageing; it is a parking decision, not a close |

**The wrong record is never edited.** Every correction sits beside the original and points at it. This is the same rule the cash and credit ledgers follow, and the reason the audit trail can be read forwards.

---

## 4. Sub-ledger statements and exports

Every sub-ledger produces a statement with the same shape: opening balance, movements with their source document and counterparty, closing balance, and the tie-out against the control account. `getFinanceReport` and `exportFinanceReport` generate both the screen and the file from the same server aggregation, so the two cannot disagree.

| Report | Sub-ledgers covered | Available to | Ties out to |
| ------ | ------------------- | ------------ | ----------- |
| `collections_summary` | `buyer_collections`, `merchant_collections` | Supplier, Merchant (own) | Bank credits for the period |
| `transaction_register` | All collection ledgers | Supplier, Merchant (own) | Provider settlement report |
| `sub_ledger_statement` | Any single ledger | Supplier | That ledger's control account |
| `settlement_register` | `buyer_collections`, `cash_custody`, `driver_payouts` | Supplier | Bank statement, both directions |
| `merchant_ageing` | `merchant_credit` | Supplier, Merchant (own) | Credit control account |
| `driver_payout_analysis` | `driver_payables`, `driver_payouts` | Supplier | Payable roll-forward |
| `cash_flow` | All | Supplier, Merchant (own) | Bank movement for the period |
| `supplier_spend` | `merchant_credit`, `merchant_collections` | Merchant (own) | Merchant's own invoices |
| `repayment_allocation` | `merchant_credit` | Supplier, Merchant (own) | Credit control account |
| `gateway_fee_and_gst` | `gateway_fees` | Supplier | Provider fee invoice |
| `tax_pack` | Output tax across all collection ledgers | Supplier, Merchant (own purchases) | Invoice and credit-note series |
| `tds_register` | `taxes_withheld` | Supplier, Support; a Driver reads their own rows | Challans deposited |
| `reconciliation_summary` | All | Supplier (Enterprise), Support | The run's own counts |

Report to entitlement, which `getFinanceReport` enforces on every call:

| Entitlement | Reports it unlocks |
| ----------- | ------------------ |
| `finance.dashboard`, `finance.transaction_history` | `collections_summary`, `transaction_register` |
| `finance.statements` | `sub_ledger_statement` |
| `finance.settlement_register` | `settlement_register` |
| `finance.advanced_reports` | `merchant_ageing`, `driver_payout_analysis`, `cash_flow`, `supplier_spend`, `repayment_allocation`, `gateway_fee_and_gst` |
| `finance.tax_reports` | `tax_pack`, `tds_register` |
| `finance.reconciliation` | `reconciliation_summary` |
| `finance.custom_date_range` | Any of the above outside the plan's rolling default window |
| `finance.exports` | File output of any report the caller may already run |
| `finance.scheduled_reports` | Recurring delivery of any report the caller may already run |

A gateway-fee summary is analysis and sits with the other advanced reports; a filing pack is statutory output and sits with `finance.tax_reports`. Selling them as one key would force a supplier who wants to see what the gateway charged into a tier priced for tax filing.

**Every export states its tie-out.** A report whose total does not equal its control balance is returned with `balanced: false` and the variance named. A number that looks authoritative and is not is more dangerous than a number that admits it.

**Exports already produced remain downloadable after a downgrade or cancellation.** The subscriber paid for that output when it was generated.

---

## 5. GST treatment

### 5.1 Place of supply resolution

Place of supply is resolved from the supplier's effective `TaxProfile` at document time, then frozen onto the document. The platform operating in one state today is exactly why the rule is configuration: a hard-coded state is invisible while it is right.

| Document class | Default basis | Resolution | Result when recipient state equals supplier state |
| -------------- | ------------- | ---------- | -------------------------------------------------- |
| Buyer order | `recipient_delivery_state` | Delivery village's state | Intra-state: CGST + SGST |
| Buyer order, registered recipient | `recipient_registered_state` | Recipient GSTIN's state code | Intra-state: CGST + SGST |
| Merchant order | `recipient_registered_state` | Merchant GSTIN's state code | Intra-state: CGST + SGST |
| Merchant order, unregistered merchant | `recipient_delivery_state` | Shop address state | Intra-state: CGST + SGST |
| Subscription | `service_performance_state` | Subscriber's registered state | Intra-state: CGST + SGST |
| Any of the above, differing states | — | — | Inter-state: IGST only |
| No recorded recipient address | `supplier_state` | Supplier's registration | Intra-state: CGST + SGST |

Splits: intra-state is `taxableValue × rate / 200` to each of CGST and SGST; inter-state is `taxableValue × rate / 100` to IGST. Rounding happens once, at the total, so the three heads always sum to the printed figure.

### 5.2 Invoice and credit-note series

Both series are gapless, per supplier, per financial year, allocated inside the transaction that writes the document. Credit notes use their own sequence, separate from invoices. A gap in either series is a reportable defect, and the close pack prints both ranges with any gap named.

### 5.3 Credit notes

An invoice is never rewritten. A cancellation, a refund, a suspended order, an overcollection, or a cancelled subscription period is corrected by a credit note against the original.

- **Tax heads follow the original.** An inter-state invoice is credited in IGST even where the same parties would transact intra-state today. A credit note that changes head reverses tax the recipient never claimed.
- **The rate follows the original**, not today's rate.
- **The reporting period follows the issue date**, not the invoice date. A period's pack therefore shows invoices issued in it and credit notes issued in it, deliberately different sets.
- **A closed period is not reopened for a credit note.** The note is issued in the open period carrying `againstAccountingPeriodId`.
- **Cumulative credits may not exceed the invoice's taxable value.** Partial credits are permitted and flagged `isPartial`.
- **Money and document point at each other.** A refund with no credit note behind it, or a credit note with no refund or cancellation behind it, is a reconciliation break rather than something for the return to discover.

---

## 6. Statutory withholding (TDS)

**This module ships disabled, and that is a deliberate position rather than an omission.** Whether Logikchain is the person obliged to deduct tax on a driver payout depends on the contracting model between supplier, driver, and platform — whether the driver contracts with the supplier or with the platform, and in what capacity. That determination belongs to a qualified tax adviser. The product's obligation is to make the answer applicable, evidenced, and attributable once given. A platform that withholds by assumption deducts money it may have no authority to deduct; one with no module cannot comply the day it must.

### 6.1 Enabling

`upsertTdsConfiguration` refuses `enabled: true` without a TAN, a named `adviserConfirmedBy`, and an `adviserReference`. Enabling notifies every affected driver with the effective date and opens a Support task for each driver with no PAN on file. The `impact` figures — drivers above threshold, drivers without PAN, estimated monthly withholding — are shown before the change is saved.

### 6.2 Determination at payout

At `reviewPayoutRequest` approval, with the module enabled:

1. Read the driver's PAN. Apply `rateWithPan` where present, `rateWithoutPan` where not, or refuse with `PAN_REQUIRED` where `requirePanBeforePayout` is set.
2. Test this payout against `singlePaymentThreshold` and the driver's cumulative financial-year gross against `annualThreshold`.
3. Where `appliesRetrospectivelyOnThresholdBreach` is set and the annual threshold is crossed by this payout, withhold on the cumulative value not yet withheld against, recorded with `thresholdBasis: "retrospective_catch_up"`.
4. Write an immutable `TdsDeduction` in the same transaction as the `PayoutTransaction`, carrying the `configurationId`, the cumulative figures as they stood before this payout, and the basis that triggered it.
5. Show gross, recovery, TDS, and net on the approval screen and on the driver's payout record. A driver receiving less than they requested is entitled to see which deduction did it.

### 6.3 Deposit, return, and certificate

| Step | Function | Evidence produced | Deduction status |
| ---- | -------- | ----------------- | ---------------- |
| Withhold | `reviewPayoutRequest` | `TdsDeduction` | `accrued` |
| Deposit | `recordTdsChallan` | Stamped challan with BSR code and date | `deposited` |
| File return | Recorded on the quarter | Return acknowledgement number | `returned` |
| Certify | `issueTdsCertificate` | Form 16A PDF | `certified` |
| Reverse | Payout reversal | Negative deduction referencing the original | `reversed` |

A challan must tie exactly to the deductions it names, or it is refused. A re-issued certificate supersedes rather than overwrites, because the earlier one may already sit in the deductee's return.

### 6.4 Accounting and access

Withheld tax sits in `taxes_withheld` as a liability until a challan covers it. The close pack states withheld, deposited, and uncovered separately — money withheld and not deposited is somebody else's money the platform is holding, and the pack says so.

Certificates and the deductee's own register rows are `own_statutory_evidence`: readable on any plan, in grace, and after cancellation.

---

## 7. Retention, privacy, and redaction

Retention runs from the **close of the financial year** the record belongs to, not its write date, so a March and an April record do not expire eleven months apart.

| Class | Covers | Default retention | At expiry | At rest | In reads and logs |
| ----- | ------ | ----------------- | --------- | ------- | ----------------- |
| `statutory_financial` | Orders, invoices, credit notes, payment/payout/refund transactions, cash and credit ledgers, close packs | 8 years | Review | Encrypted | Full values to the owning party and Support |
| `statutory_tax` | TDS deductions, challans, certificates, GST packs | 8 years | Review | Encrypted | PAN last four only |
| `payment_evidence` | Raw webhook payloads, provider settlement reports, bank statements | 8 years | Review | Encrypted | Never returned to a client |
| `beneficiary_secret` | Full VPA, bank account number, PAN | 24 months after the destination is superseded or the relationship ends | **Destroy** | KMS-encrypted; decrypt held only by payout and verification functions | `maskedLabel`, `accountNumberLast4`, `vpaHandle`, `ifsc` only |
| `operational_audit` | `AuditLogEntry`, payment and payout status events | 8 years | Review | Encrypted | Actor and reason visible; before/after scoped to the reader's authority |
| `support_correspondence` | Dispute threads, resolution notes | 5 years | Redact | Encrypted | Author and timestamp retained |
| `derived_export` | Generated CSV and PDF output | 90 days | Destroy | Encrypted | Signed short-lived URLs only |

Four rules govern the schedule.

**Beneficiary secrets are the only class destroyed automatically.** The obligation to hold an account number ends long before the obligation to hold the payout it funded. After destruction the masked label and the verification outcome remain — enough to explain a payout, not enough to make one.

**A legal hold suspends expiry** for every record linked to an open dispute, exception, or assessment. Placing and lifting a hold are audited acts.

**Redaction is irreversible and recorded.** An `AuditLogEntry` under `account` names the class, the record count, the action, and the policy version, so a gap in a historical set can always be explained.

**Nothing in this schedule is shortened by a subscription state.** A downgrade or a cancellation narrows the reporting window a subscriber can generate; it does not change how long the platform keeps the record or whether the party can read their own.

---

## 8. Period close evidence pack

The pack manifest is fixed so one month can be compared with another. `closeAccountingPeriod` produces every section, stores a content hash over the whole, and stamps the closing actor.

1. Period identity: start, end, `cutoffAt`, scope (platform or supplier), and the previous period's close reference.
2. Per sub-ledger: opening balance, movements by type, closing balance, control-account balance, variance, and tolerance applied.
3. Collections, disbursements, refunds, and credit notes with counts and totals.
4. Cash in custody carried forward, by holder.
5. In-transit items at cut-off, by ledger, with counts and amounts.
6. GST output summary by tax head, with invoice and credit-note number ranges and any gap in either series named.
7. TDS: withheld, deposited, uncovered, and drivers with no PAN.
8. Every reconciliation run in the period with its source references and counts.
9. Every exception with kind, amount, resolution, resolving actor, and note.
10. Acknowledged still-open exceptions, each with the acknowledgement reason.
11. Source files: provider reports and bank statements, by reference.
12. Attestation: the closing statement text, `closedBy`, `closedAt`, and the content hash.

**The close checklist is a gate, not advice.** A period cannot close over an unacknowledged break, a disputed cash settlement, or cash still in custody. A close that could be forced would be forced at month end, which is exactly when the pressure exists and exactly when the breaks matter.

---

## 9. Finance entitlement matrix

`SubscriptionPlan.features[]` is display copy and grants nothing. `FinanceEntitlement` keys are what server functions check. Keys are never renamed once published.

### 9.1 Baseline: outside the entitlement system entirely

`BaselineFinanceCapability` is not expressible in a plan. It cannot be added by Support, removed by a downgrade, metered by a limit, or withheld in `past_due`, cancellation, or expiry.

| Capability | Meaning |
| ---------- | ------- |
| `own_balances` | Current dues, credit balance, reserved versus available |
| `own_transaction_status` | Payment, payout, refund, and repayment status with internal transaction IDs |
| `own_receipts_and_invoices` | Tax invoices, credit notes, payout advices addressed to the party |
| `own_statutory_evidence` | GST documents and TDS certificates addressed to the party |
| `own_subscription_billing` | Subscription invoices and billing history |
| `payout_self_service` | Register a destination and request a payout |
| `dispute_raising` | Open a tracked payment, payout, or credit dispute |

**Money already earned is not a feature that can be sold back to its owner.** A lapsed subscription must never become a mechanism for withholding funds or hiding what somebody is owed. Expiry makes historical records read-only; it never makes them inaccessible.

### 9.2 Role scope

| Entitlement | Supplier | Merchant | What it unlocks |
| ----------- | :------: | :------: | --------------- |
| `finance.dashboard` | Mandatory | Mandatory | Balances, dues, payment and payout status |
| `finance.transaction_history` | Mandatory | Mandatory | Full transaction list with provider references |
| `finance.statements` | Yes | Yes | Period statements and bulk receipts |
| `finance.settlement_register` | Yes | Yes | Settlement, custody, and payout registers with provider legs, scoped to the caller's own activity |
| `finance.advanced_reports` | Yes | Yes | Ageing, cash flow, spend, payout analysis |
| `finance.custom_date_range` | Yes | Yes | Reporting outside the rolling default window |
| `finance.exports` | Yes | Yes | CSV and PDF export of report and ledger output |
| `finance.scheduled_reports` | Yes | Yes | Recurring delivery |
| `finance.reconciliation` | Yes | **No** | Reconciliation workspace and exception handling |
| `finance.tax_reports` | Yes | Yes | GST and TDS packs |
| `finance.period_close` | Yes | **No** | Period lock and close evidence |

A merchant plan carrying a supplier-only key is rejected with `INVALID_ENTITLEMENT`. There is no merchant screen that can consume the reconciliation workspace or period close — those work platform-wide breaks against a provider report and a bank statement — so granting them would sell an experience that does not exist. A settlement register scoped to a merchant's own UPI, credit, and cash activity is a different capability with a real screen behind it, which is why that key is available to both roles.

### 9.3 Metered limits

| Limit key | Meaning | Unlimited |
| --------- | ------- | --------- |
| `finance.report_history_days` | How far back a report may reach | `-1` |
| `finance.exports_per_month` | Export generations per billing period | `-1` |
| `finance.scheduled_reports` | Concurrent schedules | `-1` |
| `finance.reconciliation_rows_per_month` | Reconciliation rows worked | `-1` |
| `finance.retained_periods` | Closed periods whose packs remain generatable | `-1` |

Limits are counted in `FinanceEntitlementUsage`, not estimated, and shown back to the subscriber before refusal. A ceiling discovered only at the point of refusal is a ceiling that was hidden.

### 9.4 Safe default tier composition

Support may configure any composition. These are the defaults the constitution assumes, the values the seed data carries, and the composition `SUP-15` and `MER-12` were drawn against. A change to either table is a change to those screens.

| Supplier | Starter | Growth | Enterprise | Surfaces as |
| -------- | :-----: | :----: | :--------: | ----------- |
| `finance.dashboard` | Yes | Yes | Yes | Balances, dues, cash in hand |
| `finance.transaction_history` | Yes | Yes | Yes | Payment and payout references |
| `finance.statements` | Yes | Yes | Yes | Per-ledger period statements |
| `finance.advanced_reports` | — | Yes | Yes | Merchant ageing, payout analysis, fee and GST summaries |
| `finance.custom_date_range` | — | Yes | Yes | Custom-date reports |
| `finance.exports` | — | Yes | Yes | CSV, XLSX, and Tally output |
| `finance.scheduled_reports` | — | Yes | Yes | Recurring delivery |
| `finance.settlement_register` | — | — | Yes | Settlement exception management |
| `finance.reconciliation` | — | — | Yes | Reconciliation workspace |
| `finance.period_close` | — | — | Yes | Period close and lock |
| `finance.tax_reports` | — | — | Yes | GST and TDS filing packs |
| `finance.report_history_days` | 365 | 1095 | 2920 | "History kept 12m / 36m / 96m" |
| `finance.exports_per_month` | 0 | 10 | 100 | |
| `finance.scheduled_reports` | 0 | 3 | 20 | |
| `finance.reconciliation_rows_per_month` | 0 | 0 | `-1` | |
| `finance.retained_periods` | 12 | 36 | 96 | |

| Merchant | Basic | Finance | Pro | Surfaces as |
| -------- | :---: | :-----: | :-: | ----------- |
| `finance.dashboard` | Yes | Yes | Yes | Credit balance and dues |
| `finance.transaction_history` | Yes | Yes | Yes | Payment history |
| `finance.statements` | Yes | Yes | Yes | Payment history and statement |
| `finance.advanced_reports` | — | Yes | Yes | Ageing, repayment allocation, cash flow, supplier spend |
| `finance.custom_date_range` | — | Yes | Yes | Any date range |
| `finance.exports` | — | Yes | Yes | CSV and PDF |
| `finance.settlement_register` | — | — | Yes | UPI, credit, and cash tie-up |
| `finance.scheduled_reports` | — | — | Yes | Recurring delivery |
| `finance.tax_reports` | — | — | Yes | GST purchase pack |
| `finance.report_history_days` | 365 | 1095 | 2920 | "History kept 12m / 36m / 96m" |
| `finance.exports_per_month` | 0 | 10 | 50 | |
| `finance.scheduled_reports` | 0 | 0 | 5 | |
| `finance.retained_periods` | 12 | 36 | 96 | |

A merchant's tie-up is `finance.settlement_register` scoped to their own activity, not `finance.reconciliation`. The two are different capabilities: one ties a party's own UPI, credit, and cash movements against their own dues; the other works platform-wide breaks against a provider report and a bank statement, and no merchant screen exists for it.

Note what is *not* gated in either table: credit balance, dues, repayment history, bulk-order payment, receipts, invoices, credit notes, payout self-service, and subscription billing are baseline. What a higher tier buys is analysis and delivery — depth of history, cross-cutting reports, file output, scheduling, and filing evidence — never sight of the subscriber's own money.

### 9.5 Lifecycle

| Event | Entitlement effect | Record effect |
| ----- | ------------------ | ------------- |
| `subscribeToPlan` / `assignSubscription` | None. Subscription is `past_due` | Invoice raised |
| Verified payment | `activeEntitlements` written from the plan and frozen for the period | Invoice paid, `lastPaymentTransactionId` stamped |
| Upgrade paid | New entitlements active immediately | Prorated invoice with GST |
| Upgrade abandoned | Unchanged | Invoice remains unpaid; nothing granted |
| Downgrade requested | `pendingPlanId` and `pendingEntitlements` set; current set untouched | Applies at `currentPeriodEnd` |
| Plan edited by Support | Applies at each subscriber's next renewal | `affectedSubscriberCount` and removals reported before saving |
| `past_due` | Entitlements survive to `gracePeriodEndsAt`; then advanced reporting, exports, and schedules stop | Money movement, invoices, and receipts unaffected |
| Cancellation or expiry | Premium generation stops | Every historical record and already-generated export remains readable |
| Reactivation | Priced and paid as a fresh period | Records were never withdrawn and are not "restored" |

**Enforcement is server-side, without exception.** `getFinanceReport`, `exportFinanceReport`, and `scheduleFinanceReport` each resolve the caller's active `PlatformSubscription` and its entitlements on every call. A direct URL, a cached client, a Support preview, or a stale build cannot invoke a premium finance function. A hidden button is a courtesy; the gate is the control.

---

## 10. Preventive and detective controls

### 10.1 Segregation of duties

One money movement, four separate hands. No actor performs another actor's step, and the server refuses the combination rather than trusting the org chart.

| Step | Actor | Cannot also |
| ---- | ----- | ----------- |
| Request a payout | Driver | Approve, initiate, or complete it |
| Approve or reject | Managing Supplier | Have filed the request; approve their own; mark it completed |
| Initiate the transfer | Server function | Be invoked directly by any client |
| Confirm settlement | Provider webhook, or a second Support actor on the manual rail | Be asserted by the requester or the approver |
| Resolve an exception | Support | Have created the record under exception |

`reviewPayoutRequest` refuses `callerId === driverId` unconditionally, even where one person somehow holds both roles. On the manual UTR fallback the entering actor and the verifying actor must differ, which is the entire reason the fallback is tolerable at all.

### 10.2 Beneficiary controls

| Control | Rule |
| ------- | ---- |
| Verification | VPA lookup or penny drop at registration; the returned account-holder name is stored for the name match |
| Name match | Below `BENEFICIARY_NAME_MATCH_FLOOR` the destination is not payable |
| Cooling period | `BENEFICIARY_COOLING_PERIOD_HOURS` after a change; requests may be filed but not paid |
| Duplicate detection | A salted fingerprint detects one account registered across multiple drivers |
| Change notification | The driver is told on the old and new channel that the destination moved |
| Step-up authentication | Required to change a destination, not merely to view it |
| Snapshot at request | The approver authorises the destination recorded at request time, never whatever the profile says now |
| Block | Support or the managing Supplier can stop payouts to a destination, with a reason |

### 10.3 Transaction controls

Amounts are server-calculated and never accepted from a client. Currency is immutable. A provider payment or payout identifier may be consumed exactly once; a repeat is a duplicate, not a second event. Every mutating finance call carries an idempotency key and a replay returns the original record rather than creating a second. Velocity and value limits apply per beneficiary and per platform per day. No client writes to any money collection under any circumstance — the Firestore rules deny it, and the deny is the control, not the absence of a UI.

### 10.4 Audit immutability

`AuditLogEntry` is `allow write: if false` for every client **and for Support**. Entries are written only by the function performing the action they describe, in the same transaction, so an action that succeeded without an audit entry is impossible rather than merely discouraged. Each entry carries before and after values for the fields that changed, a reason code, a reason where the action is an override, the actor and actor kind, a correlation ID shared across the request, the source, and both the occurrence and recording timestamps. Automated actions appear in the same history as user actions and never impersonate a user; a Support action taken for a user carries `onBehalfOfId` rather than the user's identity.

### 10.5 The Support access boundary

Support is powerful and therefore bounded by named actions rather than by trust.

- Support works from named queues and named resolutions. Each is a specific server action requiring a reason.
- Support **cannot** overwrite a successful transaction, change a captured amount, edit a gateway reference, or declare a settlement without provider or bank evidence.
- Support **cannot** grant a Supplier plan to a Merchant, enable an entitlement outside the published union, or add a capability to the baseline set.
- Routine database-editor changes to money records are prohibited. Where the record explorer exposes a money collection it is read-only, and every read of another subscriber's finance data is itself audited.
- A Support plan preview shows the experience a plan produces; it never grants the previewing actor the entitlement.

---

## 11. Authority and approval limits

Every threshold is Support configuration read at the moment of the decision, and every decision records the value that applied to it. Re-reading a live setting months later would otherwise make an approval that was correct at the time look like a breach.

| Decision | Maker | Checker | Threshold parameter |
| -------- | ----- | ------- | ------------------- |
| Payout request | Driver | Managing Supplier approves | — |
| Payout above ceiling | Managing Supplier | Second approver | `PAYOUT_SINGLE_APPROVAL_CEILING_INR` |
| Payout initiation | Server function | Provider webhook confirms | — |
| Manual UTR settlement | Support enters UTR | Second Support actor verifies | `PAYOUT_MANUAL_FALLBACK_ENABLED` |
| Refund above ceiling | Support | Second Support actor | `REFUND_SINGLE_APPROVAL_CEILING_INR` |
| Write-off above ceiling | Support | Second Support actor who did not raise it | `WRITE_OFF_SINGLE_APPROVAL_CEILING_INR` |
| Merchant credit limit | Supplier | Recorded before/after balances | — |
| Period close | Support | Attestation with named actor | — |
| Period reopen | Admin | Mandatory reason, counted on the pack | — |
| Enabling TDS | Support | Named tax adviser confirmation | `TDS_MODULE_ENABLED` |
| Tax profile change | Support | Resolution preview reviewed before saving | — |
| Threshold change | Support | Audited with old value, new value, and reason | — |

**No actor performs another actor's step.** A driver cannot approve their own payout; a supplier cannot mark one completed; Support cannot declare a settlement without provider or bank evidence; and no role can edit a transaction that has already been reconciled.

---

## 12. Exception queues and SLAs

Section 3.2 sets the SLA for reconciliation breaks. Money goes wrong in ways a daily run never sees, and those exceptions need the same treatment: one named queue, one first owner, one clock, and a closed list of endings.

| Queue | Enters when | Severity floor | SLA | First owner | Escalates to | Permitted endings |
| ----- | ----------- | -------------- | --- | ----------- | ------------ | ----------------- |
| Payments stuck pending | Non-terminal past `PENDING_PAYMENT_ESCALATION_MINUTES` | Medium | 4h | Support | Provider liaison | Confirmed against the provider, aged to failed, or refunded as a late capture |
| Debited but failed | A payer reports a debit against a failed transaction | High | 4h | Support | Provider liaison | Matched to a provider record, refunded, or raised with the provider |
| Duplicate collection | Two successes against one target | Critical | 4h | Support | Second Support approver for the refund | Later collection refunded with a credit note |
| Payout failed | Rail refusal or bank return | High | 8h | Managing Supplier | Support | Retried as a new transaction, destination re-verified, or held with a reason |
| Payout reversed after completion | Credit returned by the beneficiary bank | Critical | 8h | Support | Supplier for re-approval | Dues restored, beneficiary re-verified, re-presented to the approver |
| Payout stuck in processing | No terminal event inside the rail's window | Medium | 8h | Support | Provider liaison | Confirmed against the statement, or aged to failed with dues restored |
| Refund awaiting approval | Above `REFUND_SINGLE_APPROVAL_CEILING_INR` | Medium | 24h | Second approver | Support lead | Approved, or rejected with a reason |
| Beneficiary held | Duplicate fingerprint or name match below the floor | Medium | 24h | Support | Supplier for context | Approved with evidence, rejected, or blocked |
| Subscription payment failed | Purchase or renewal failed | Low | To `gracePeriodEndsAt` | Automated retry | Support | Paid, downgraded at period end, or lapsed |
| Cash discrepancy | `raiseCashDiscrepancy` from any party | High | 24h | Managing Supplier | Support | `resolveCashDiscrepancy` with an outcome both parties can see |
| Period close blocked | Unresolved items at cut-off | Critical | Before close | Support | Support lead, then Admin | Resolved, or acknowledged on the pack with a reason |
| User dispute | A buyer, merchant, or driver raises one | Per subject | 24h to first response | Support | Per subject | Closed with an outcome **visible to the person who raised it** |

Three rules apply to every queue.

**Ageing is visible and rises.** Each row shows time in state and takes the aged treatment from [wireframes/Foundations.md](wireframes/Foundations.md) §4 once past SLA. An exception that ages downward in a list is an exception designed to be forgotten.

**Escalation is announced.** At SLA the item moves to the next owner *and notifies*. A silent reassignment is an item that has changed hands without anyone knowing it needed to.

**Nothing ages out.** An exception has exactly two endings: a typed resolution with evidence, or an explicit acknowledgement recorded at period close naming the actor, the reason, and the residual amount. There is no third path where an item quietly leaves a queue.

---

## 13. Traceability

Every financial control in the product ties a screen to a command, an authorisation rule, a data write, an audit event, a notification, an accounting effect, an owner, and a recovery path. A row with a gap is an unfinished feature, not a documentation shortfall.

| Screen action | Command | Authorised for | Writes | Audit | Notifies | Accounting effect | On failure |
| ------------- | ------- | -------------- | ------ | ----- | -------- | ----------------- | ---------- |
| `BUY-08` Pay | `createPaymentIntent` | Buyer, own order | `PaymentIntent` | `payment` | — | None until capture | Intent expires; stock hold released |
| `BUY-09` return from gateway | `processPayment`, `handleGatewayWebhook` | Buyer; provider | `PaymentTransaction`, `Order.paymentStatus` | `payment` | Buyer | `buyer_collections` | Failed screen and a fresh intent, never a retry of the same one |
| `BUY-12.2` Cancel a paid order | `cancelOrder` → `refundOrder` → `issueCreditNote` | Buyer; Supplier; Support | `RefundTransaction`, `CreditNote` | `refund` | Buyer | `refunds`, GST credit | Refund exception queue |
| `MER-09.1` Repay credit | `initiateCreditRepayment`, `confirmCreditRepayment` | Merchant, own credit | `PaymentTransaction`, `CreditTransaction` | `payment`, `credit` | Merchant, Supplier | `merchant_collections`, `merchant_credit` | Repayment stays due; no partial state |
| `MER-09.2` Cash to driver | Custody functions, `raiseCashDiscrepancy` on variance | Merchant and Driver jointly | `CustodyTransfer`, `CashLedgerEntry` | `cash` | Both parties, Supplier | `cash_custody`, `merchant_credit` | Cash discrepancy queue |
| `MER-12` Subscribe or change plan | `subscribeToPlan`, `previewPlanChange`, `changeSubscriptionPlan` | Merchant, own subscription | `SubscriptionInvoice`, `PaymentTransaction`, `PlatformSubscription` | `subscription`, `entitlement` | Merchant | `subscription_collections` | Entitlements unchanged; invoice unpaid |
| `DRV-08.3` Change destination | `registerPayoutBeneficiary` | Driver, own account, with step-up | `BeneficiaryAccount`, `UserProfile.activeBeneficiaryId` | `beneficiary` | Driver and managing Supplier | None | Verification failure leaves the old destination active |
| `DRV-08` Request payout | `requestPayout` | Driver, own earnings | `DriverPayoutRequest`, reservation on `DriverEarning` | `payout` | Supplier | Reservation inside `driver_payables` | Reservation released atomically |
| `SUP-05.2` Approve or reject | `reviewPayoutRequest` | Managing Supplier, Support; never the driver | `PayoutTransaction` in `approved`, `TdsDeduction` where applicable | `payout` | Driver | None — approval moves no money | Rejection releases the reservation |
| — Initiate | `initiatePayoutTransfer` | Server only | `PayoutTransaction` → `initiated` | `payout` | — | None yet | Rail refusal fails it and restores dues |
| — Settle | `recordPayoutSettlement` | Provider webhook | `PayoutTransaction` → `completed`, `DriverEarning` | `payout` | Driver, Supplier | `driver_payouts` | Timeout routes to the stuck-processing queue |
| `SPT-20` Verify manual UTR | `verifyManualPayout` | Support, and not the actor who entered it | `PayoutTransaction` → `completed` | `payout` | Driver, Supplier | `driver_payouts` | Refused when the two actors are the same |
| `DRV-08.2`, `SUP-05.3` Retry | `retryPayout` | Driver, Supplier, Support | A **new** `PayoutTransaction` | `payout` | Driver | New reservation | The original stays failed |
| `SPT-20` Block a destination | `blockPayoutBeneficiary` | Support, managing Supplier | `BeneficiaryAccount` → `blocked` | `beneficiary` | Driver | None | — |
| `SPT-21` Run reconciliation | `runReconciliation` | Support, scheduler | `ReconciliationRun`, exceptions | `reconciliation` | Support on breaks | None — it observes | A missing source fails the run |
| `SPT-21` Resolve a break | `resolveReconciliationException` | Support, within the write-off ceiling | Balancing entries | `reconciliation` | The affected party where money moves | Per resolution | Second approver above the ceiling |
| `SPT-22` Close | `closeAccountingPeriod` | Support, with attestation | `AccountingPeriod` and the pack | `configuration` | Support | Locks the period | `UNACKNOWLEDGED_EXCEPTIONS` |
| `SPT-22` Reopen | `reopenAccountingPeriod` | Admin only | `reopenHistory`, original pack retained | `configuration` | Support | Unlocks | — |
| `SUP-11.1` Credit note | `issueCreditNote` | Supplier, Support | `CreditNote` | `payment` | Recipient | GST credit | Refused above the uncredited value |
| `SUP-04.2` Credit limit | `setMerchantCreditLimit` | Managing Supplier | `CreditProfile` | `credit` | Merchant | `merchant_credit` capacity | Refused below current utilisation |
| `SUP-12`, `MER-09` Report | `getFinanceReport` | Entitlement-gated, scope-filtered | — | `access` | — | — | `PLAN_FEATURE_REQUIRED` with the upgrade path |
| `SUP-12` Export | `exportFinanceReport` | Entitlement and limit gated | Export record | `access` | — | — | `ENTITLEMENT_LIMIT_REACHED` naming usage and reset |
| `SPT-10` Configure a plan | `upsertSubscriptionPlan` | Support | `SubscriptionPlan` | `configuration` | Affected subscribers | — | Role-scope violation refused |
| `SPT-23` Tax profile | `upsertTaxProfile` | Support | `TaxProfile` | `configuration` | — | Future documents only | Prefix change after issuance refused |
| `SPT-24` TDS | `upsertTdsConfiguration`, `recordTdsChallan`, `issueTdsCertificate` | Support with the finance grant | `TdsConfiguration`, `TdsChallan`, `TdsCertificate` | `configuration`, `payout` | Drivers on enabling and on certificate | `taxes_withheld` | Refused without adviser confirmation or deposit evidence |

---

## 14. Control testing

### 14.1 Scenario reviews

Ten scenarios, each of which has broken a real payments platform somewhere. Each is walked end to end **against the screens**, not only against the functions: a correct backend behind a screen that invites a second payment is still a double charge.

| # | Scenario | Expected behaviour | Evidence that it held |
| - | -------- | ------------------ | --------------------- |
| S-01 | Duplicate webhook for one capture | Second delivery returns `applied: false, reason: "duplicate_event"` with HTTP 200 | One `PaymentTransaction`, one ledger entry, both event IDs on the record |
| S-02 | Amount mismatch between intent and capture | Not marked paid; `amount_mismatch` raised with both figures | Exception record; the order still unpaid |
| S-03 | Destination changed while a payout sits approved | The approved payout is held and returned to the approver naming the change; an already-initiated payout continues to its original destination | The held item in the queue; the unchanged snapshot on the in-flight one |
| S-04 | Provider timeout on a collection | Stays pending; the retry control is **removed**, not disabled; escalates at the configured window | The pending screen with no retry path; the Support queue item |
| S-05 | Late success after the record aged to failed | The failed record is unchanged; `missing_on_platform` carries the provider reference | Both records, plus the resolution linking them |
| S-06 | Payout fails at the bank | Reservation released and dues restored in one transaction; driver and supplier told the reason; retry available as a new transaction | The balanced pair of movements; two payout records after retry |
| S-07 | Two partial refunds, then a third that would exceed | Two credit notes in a gapless series; the third refused | Both notes; the `INVALID_AMOUNT` refusal |
| S-08 | Cancelled order that was already paid | Refund initiated, credit note issued, stock released, buyer told where their money is and when | Refund transaction, credit note, buyer-visible status |
| S-09 | Manual UTR entered and verified by one actor | Refused | The refusal, and the two-actor record when done correctly |
| S-10 | Unauthorised override attempts | Support setting a payment status, a driver approving their own payout, a Merchant invoking a Supplier-only report: each refused with its specific error | Denials recorded; no state change |

### 14.2 Acceptance evidence

| Test class | Passes when |
| ---------- | ----------- |
| State transition | Every transition in [Logikchain_API_Specifications.md](Logikchain_API_Specifications.md) §4B.1 and §4B.2 is exercised, and every transition *absent* from those diagrams is refused |
| Idempotency | Same key and same arguments replays; same key and different arguments returns `IDEMPOTENCY_CONFLICT`; concurrent duplicates produce one record |
| Access control | Every function called by every role: the permitted set succeeds, all others are denied, including the self-approval and cross-tenant cases |
| Webhook integrity | Valid applies; invalid rejects with the payload retained as evidence; replay outside the window rejects; a status behind the record's current one is ignored |
| Reconciliation | A seeded day with known breaks produces exactly the expected exception set; a clean day produces none; a missing source fails the run |
| Cut-off | An event timestamped either side of `cutoffAt` lands in the correct period, and a late arrival after close posts to the open period with `againstAccountingPeriodId` |
| Audit immutability | Update and delete against `AuditLogEntries` fail for every principal including Admin, from client and server contexts alike |
| Retention | Each class behaves per its `expiryAction`; a legal hold suspends expiry; account deletion destroys `beneficiary_secret` only |
| GST | Intra-state and inter-state resolution per document class; credit note heads and rates follow the original; both series gapless across a year boundary |
| TDS | Threshold crossing with and without PAN, retrospective catch-up, challan tie-out, certificate supersession, and a driver reading their own rows on the lowest plan |
| Entitlements | Every key tested granted and withheld on both roles, through the UI **and** through a direct call; a Support preview cannot invoke a gated function; metered limits refuse with usage and reset stated |
| Subscription lifecycle | Purchase success and failure, webhook delay, upgrade with proration, downgrade at period end, past-due grace, expiry, and evidence still readable afterwards |
| Money under degraded subscription | Payout request, approval, refund, and repayment all succeed while past due, in grace, cancelled, and expired |
| Role walkthrough | A person in each of the five roles completes their financial journey on the wireframes and can, at every step, say where their money is |

### 14.3 Sign-off

The framework is ready for implementation when every row in §13 is complete, every scenario in §14.1 has an agreed expected result, every test class in §14.2 has a named owner, and no control in this document lacks a test. Sign-off records the reviewer, the date, and the version of this document reviewed — the same standard this document asks of everything else.
