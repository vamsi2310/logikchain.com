# Logikchain Financial Traceability and Control Tests

The pre-implementation verification layer for everything money touches. `constitution/Logikchain_Financial_Controls.md` says what the controls are; this document proves each one is reachable from a screen, backed by a contract, and testable before a line of it ships.

Three questions it exists to answer:

1. **Can every financial control on a screen be traced to a contract?** Section 1.
2. **Does the design survive the ways payment systems actually fail?** Section 2.
3. **What evidence closes sign-off?** Sections 3 to 5.

A row in section 1 with an empty cell is a defect, not a gap to be filled during implementation. An unhandled scenario in section 2 is a design decision that has not been made yet.

---

## 1. Requirements traceability matrix

Read a row as one sentence: *this actor, on this screen, invokes this command, which is permitted to them, writes these records, appends this audit event, notifies these parties, hits this sub-ledger, and recovers this way when it fails.*

### 1.1 Buyer

| Screen | Action | Command | Authorization | Data written | Audit | Notification | Sub-ledger | Failure recovery |
| ------ | ------ | ------- | ------------- | ------------ | ----- | ------------ | ---------- | ---------------- |
| `BUY-08` | Place order and pay | `placeOrder` → `createPaymentIntent` | Buyer, own order | `Order`, `PaymentIntent`, `PaymentTransaction` (`initiated`), stock decrement, `HandoverCodeRecord` | `payment.intent_created` | — | `buyer_collections` | Abandoned checkout leaves `pending`; the 15-minute stock hold releases and the intent expires |
| `BUY-09` | Gateway returns | `processPayment` | Server, on verified capture only | `PaymentTransaction` → `succeeded`, `Order.paymentStatus` → `paid`, `PaymentStatusEvent` | `payment.captured` | Buyer, Supplier, Merchant | `buyer_collections` | Client callback is advisory; the webhook is authoritative. No capture, no `paid` |
| `BUY-09` | Retry a failed payment | `createPaymentIntent` (reuse) | Buyer, own order | New `PaymentTransaction` against the same intent | `payment.retry` | — | `buyer_collections` | The intent is reused, so a retry cannot double-charge; a duplicate capture becomes a reconciliation break and a refund |
| `BUY-10` | Pay cash at pickup | `markOrderDelivered` with `cashCollected` | Driver at handover, verified | `CashLedgerEntry` (`in_custody`), `CustodyTransfer` | `cash.collected` | Buyer, Supplier | `cash_custody` | An amount mismatch opens a discrepancy rather than adjusting the order |
| `BUY-12.2` | Request cancellation and refund | `cancelOrder` → `refundOrder` → `issueCreditNote` | Buyer before dispatch; Support after | `RefundTransaction`, `CreditNote`, `Order.paymentStatus` → `refund_pending` | `refund.requested`, `payment.credit_note_issued` | Buyer | `refunds` | Refund stays `processing` until the provider confirms; a stalled refund ages into the Support queue |
| `BUY-12.3` | Raise a payment dispute | `raiseDispute` | Buyer, own order | `SupportTicket` linked to the transaction | `payment.dispute_raised` | Support | — | The dispute places a legal hold on the linked records |

**The Buyer cannot mark a payment successful or a refund complete.** Every Buyer row either creates an intent or asks for something; none of them writes a terminal money state.

### 1.2 Merchant

| Screen | Action | Command | Authorization | Data written | Audit | Notification | Sub-ledger | Failure recovery |
| ------ | ------ | ------- | ------------- | ------------ | ----- | ------------ | ---------- | ---------------- |
| `MER-06` | Place a bulk order on credit | `placeMerchantOrder` | Merchant, within credit limit | `MerchantOrder`, `CreditTransaction` (`draw`), `CreditProfile` balances | `credit.drawn` | Supplier | `merchant_credit` | `INSUFFICIENT_CREDIT` before any write; the read and the write share one transaction, so two concurrent orders cannot both pass |
| `MER-06` | Pay a bulk order online | `createPaymentIntent` → `processPayment` | Merchant, own order | `PaymentIntent`, `PaymentTransaction` | `payment.captured` | Supplier | `merchant_collections` | As Buyer: capture is authoritative |
| `MER-09.1` | Repay credit by UPI | `createPaymentIntent` (`merchant_credit_repayment`) → `processPayment` | Merchant, own credit line | `PaymentTransaction`, `CreditTransaction` (`repayment_online`), balances | `credit.repaid` | Supplier | `merchant_credit`, `merchant_collections` | Allocation to specific dues is server-computed; a partial capture allocates only what cleared |
| `MER-09.2` | Hand cash to a driver | `recordCreditRepaymentCash` with custody verification | Merchant and driver, both attesting | `CustodyTransfer`, `CashLedgerEntry`, `CreditTransaction` (`repayment_cash`) | `cash.collected`, `credit.repaid` | Supplier, Driver | `cash_custody`, `merchant_credit` | Unverified handover is disputed, not recorded as paid |
| `MER-09` | Run a finance report | `getFinanceReport` | Merchant, own data, entitlement checked | None | `entitlement.report_read` (Support callers) | — | — | `PLAN_FEATURE_REQUIRED` opens the locked-capability sheet with a real quotation |
| `MER-12` | Subscribe or change plan | `subscribeToPlan` / `previewPlanChange` → `changeSubscriptionPlan` | Merchant, own subscription, `targetRole` must match | `PlatformSubscription` (`past_due`), `SubscriptionInvoice`, `PaymentIntent` | `subscription.requested`, `subscription.activated` | Merchant | `subscription_collections` | Abandoned upgrade grants nothing; the subscriber stays exactly where they were |
| `MER-09` | Raise a credit mismatch | `raiseDispute` | Merchant, own credit line | `SupportTicket` | `credit.dispute_raised` | Support, Supplier | — | Legal hold on the linked entries |

**The Merchant cannot edit captured amounts, gateway references, or reconciled records.** Credit balances move only through `CreditTransaction` records the server writes.

### 1.3 Driver

| Screen | Action | Command | Authorization | Data written | Audit | Notification | Sub-ledger | Failure recovery |
| ------ | ------ | ------- | ------------- | ------------ | ----- | ------------ | ---------- | ---------------- |
| `DRV-08` | Register a payout destination | `registerPayoutBeneficiary` | Driver, own profile, step-up auth | `BeneficiaryAccount` (encrypted), verification result | `beneficiary.registered` | Driver on both channels | — | Name mismatch below the floor makes it not payable; the bank's answer is shown before acceptance |
| `DRV-08.3` | Change the destination | `registerPayoutBeneficiary` (supersede) | Driver, step-up auth | New account, old superseded, cooling period starts | `beneficiary.changed` (before/after masked) | Driver, Supplier | — | Payouts hold for `BENEFICIARY_COOLING_PERIOD_HOURS`; an in-flight payout blocks the change |
| `DRV-08` | Request a payout | `requestPayout` | Driver, own earnings, no open request | `DriverPayoutRequest`, `reservedForPayout` increased, `pendingDues` reduced | `payout.requested` | Managing Supplier | `driver_payables` | Reserved and available are two visible numbers, so a reservation never reads as money going missing |
| `DRV-07` | Read own tax deductions | `getTdsRegister` (own rows) | Driver, own rows, baseline access | None | — | — | `taxes_withheld` | Available on any plan, in grace, and after cancellation |
| `DRV-10` | Hand cash to the supplier | `declareCashSettlement` → `confirmCashSettlement` | Driver declares, Supplier confirms | `CashSettlement`, `CashLedgerEntry` closed | `cash.settled` | Supplier | `cash_custody` | A declared but unconfirmed settlement blocks period close |
| `DRV-08.2` | Raise a payout dispute | `raiseDispute` | Driver, own payout | `SupportTicket` linked to the `PayoutTransaction` | `payout.dispute_raised` | Support, Supplier | — | Legal hold |

**The Driver cannot approve, initiate, or complete a payout.** `reviewPayoutRequest` refuses `callerId === driverId` unconditionally.

### 1.4 Supplier

| Screen | Action | Command | Authorization | Data written | Audit | Notification | Sub-ledger | Failure recovery |
| ------ | ------ | ------- | ------------- | ------------ | ----- | ------------ | ---------- | ---------------- |
| `SUP-05.2` | Approve a payout | `reviewPayoutRequest` (`approve`) | Managing Supplier, not the requester | `PayoutTransaction` (`approved`), `TdsDeduction`, `CashLedgerEntry` recovery, `PayoutStatusEvent` | `payout.approved` with masked destination and reason | Driver: "approved — sending", never "paid" | `driver_payouts`, `taxes_withheld` | `STALE_APPROVAL_CONTEXT` aborts an approval taken against a changed destination |
| `SUP-05.2` | Reject a payout | `reviewPayoutRequest` (`reject`) | Managing Supplier | Request rejected, reservation released back to `pendingDues` | `payout.rejected` with mandatory reason | Driver | `driver_payables` | The liability is restored atomically; no `PayoutTransaction` is created |
| `SUP-05.3` | Retry a failed payout | `retryPayout` | Managing Supplier or Support | New `PayoutTransaction` linked to the original | `payout.retried` | Driver | `driver_payouts` | A third attempt needs Support; a retry is refused while the driver holds cash |
| `SUP-04.2` | Set a merchant credit limit | `setMerchantCreditLimit` | Supplier of that merchant | `CreditProfile` with before/after | `credit.limit_changed` with both balances | Merchant | `merchant_credit` | The supplier cannot edit transaction history, only the limit |
| `SUP-11.1` | Refund and credit-note an order | `refundOrder` → `issueCreditNote` | Supplier, own order; above the ceiling needs a second actor | `RefundTransaction`, `CreditNote` | `refund.approved`, `payment.credit_note_issued` | Buyer | `refunds` | Refunds above `REFUND_SINGLE_APPROVAL_CEILING_INR` wait for a second approver |
| `SUP-12` | Run a gated report | `getFinanceReport` / `exportFinanceReport` | Supplier, own network, entitlement and limit checked | `FinanceEntitlementUsage` counter | `entitlement.export` | — | — | `PLAN_FEATURE_REQUIRED` or `ENTITLEMENT_LIMIT_EXCEEDED`, each naming the remedy |
| `SUP-13`, `SUP-15` | Buy or change a plan | `subscribeToPlan` / `changeSubscriptionPlan` | Supplier, own subscription | `PlatformSubscription`, `SubscriptionInvoice`, `PaymentIntent` | `subscription.activated` | Supplier | `subscription_collections` | Entitlements move on verified capture only |
| `SUP-16.1` | Confirm a cash settlement | `confirmCashSettlement` | Supplier receiving the cash | `CashSettlement` confirmed, custody closed | `cash.settled` | Driver | `cash_custody` | A disagreement raises a discrepancy rather than closing the settlement |

**The Supplier authorizes payment but cannot mark it completed.** Only verified provider success advances a `PayoutTransaction` to `completed`.

### 1.5 Support

| Screen | Action | Command | Authorization | Data written | Audit | Notification | Sub-ledger | Failure recovery |
| ------ | ------ | ------- | ------------- | ------------ | ----- | ------------ | ---------- | ---------------- |
| `SPT-20` | Work a payment or payout exception | `resolveReconciliationException`, `refundOrder`, `retryPayout`, `blockPayoutBeneficiary` | Support, reason mandatory | Resolution plus its balancing entry | `reconciliation.resolved` with before/after | Affected party | Per resolution | Write-off above the ceiling needs a second Support actor |
| `SPT-20` | Verify a manual UTR | `verifyManualPayout` | A second Support actor, never the one who entered it | `PayoutTransaction` → `completed`, `PayoutStatusEvent` | `payout.manually_verified` | Driver, Supplier | `driver_payouts` | `UTR_MISMATCH` never echoes the expected value |
| `SPT-21` | Run reconciliation | `runReconciliation` | Support or the scheduler | `ReconciliationRun`, `ReconciliationException` records | `reconciliation.run` | Support when breaks exist | All | A missing source fails the run rather than producing a two-way match |
| `SPT-22` | Close a period | `closeAccountingPeriod` | Support, attestation required | `AccountingPeriod` closed, evidence pack, content hash | `reconciliation.period_closed` with counts | Support | All | `UNACKNOWLEDGED_EXCEPTIONS` names the blocking ids |
| `SPT-22` | Reopen a period | `reopenAccountingPeriod` | Admin, reason mandatory | `reopenHistory` appended, original pack retained | `reconciliation.period_reopened` | Support | All | The original pack is never altered |
| `SPT-23` | Publish a tax profile | `upsertTaxProfile` | Support | New `TaxProfile` version | `configuration.tax_profile` with before/after basis | — | — | Overlapping windows refused; issued documents never recalculated |
| `SPT-24` | Enable withholding | `upsertTdsConfiguration` | Support with a named adviser confirmation | New `TdsConfiguration` version | `configuration.tds` with reason and adviser reference | Every affected Driver | `taxes_withheld` | `ADVISER_CONFIRMATION_REQUIRED` blocks enabling without it |
| `SPT-24` | Record a challan | `recordTdsChallan` | Support | `TdsChallan`, deductions → `deposited` | `payout.tds_deposited` | — | `taxes_withheld` | A challan that does not tie is refused, not stored |
| `SPT-10` | Configure a plan | `upsertSubscriptionPlan` | Support | `SubscriptionPlan`, `pendingEntitlements` on affected subscribers | `configuration.plan` with entitlement diff | Affected subscribers | — | Removals apply at next renewal; blast radius shown before saving |
| `SPT-14` | Extend a grace period | `assignSubscription` (grace path) | Support, reason mandatory | `gracePeriodEndsAt`, `gracePeriodGrantedBy` | `subscription.grace_granted` | Subscriber | — | Granting paid entitlement is always audited |

**Support cannot overwrite a successful transaction, change an amount, or declare a settlement without evidence.** Every row is a named product action with a reason, not a database edit.

### 1.6 System and provider

| Trigger | Command | Authorization | Data written | Audit | Sub-ledger | Failure recovery |
| ------- | ------- | ------------- | ------------ | ----- | ---------- | ---------------- |
| Provider event | `handleGatewayWebhook` | Signature verified against the raw body | Raw payload stored first, then routed | `payment.webhook_received` with the event id | Per event | Unmapped type returns 200 `unhandled_event`; unmatched reference opens `missing_on_platform` |
| Payout approved | `initiatePayoutTransfer` | Server only, never client-invocable | `PayoutTransaction` → `initiated`, provider reference | `payout.initiated` | `driver_payouts` | Insufficient float holds the batch and alerts rather than failing every driver |
| Payout settled | `recordPayoutSettlement` | Provider webhook | → `completed` or `failed`, reservation released on failure | `payout.settled` / `payout.failed` | `driver_payouts`, `driver_payables` | A permanent failure restores dues atomically |
| Daily schedule | `runReconciliation` | Scheduler identity | Run and exceptions | `reconciliation.run` | All | Duplicate run for the same date refused |
| Period boundary | Pending plan application | Scheduler | `activeEntitlements` replaced, schedules disabled | `subscription.plan_applied` | — | A subscriber never loses a period they paid for |
| Retention schedule | Retention job | Scheduler | Destroy, redact, or raise a review task | `account.retention_applied` with the policy version | — | A legal hold suspends expiry |

**Automated actions appear in the same history as user actions and never impersonate a user.**

---

## 2. Scenario reviews

Each scenario states the trigger, the expected system behaviour, and the observable evidence. A scenario is passed when the evidence exists, not when the behaviour merely seems right.

### 2.1 Duplicate webhook delivery

The provider redelivers `payment.captured` for a transaction already `succeeded`. The signature verifies, the event id is already in `gatewayEventIds`, and the handler returns HTTP 200 with `applied: false`. No second `PaymentStatusEvent`, no second `Order` update, no notification. **Evidence:** one status event, one audit entry, two stored raw payloads.

### 2.2 Amount mismatch at capture

The provider reports a capture of ₹1,400 against an intent priced at ₹1,550. The transaction moves to `failed` with `failureCategory: "amount_mismatch"`, the order stays `pending`, and a `ReconciliationException` of kind `amount_mismatch` opens at severity high with a 24-hour SLA. The order is never marked paid on a figure nobody authorised. **Evidence:** exception with both amounts and the variance.

### 2.3 Payout destination changed mid-approval

The driver changes their UPI ID while the supplier has the approval sheet open. `reviewPayoutRequest` compares `acknowledgedBeneficiaryLabel` against the frozen snapshot, refuses with `STALE_APPROVAL_CONTEXT`, and the approver is shown the change. The cooling period on the new destination then holds the payout even after re-approval. **Evidence:** refused approval in the audit log; `beneficiary.changed` entry with masked before and after.

### 2.4 Provider timeout on payout initiation

`initiatePayoutTransfer` receives no response. The transaction stays `initiated` with its idempotency key intact. The next poll or webhook resolves it; a retried create-payout call carrying the same key cannot produce a second credit. If it is still non-terminal past its ageing threshold, a `stale_pending` exception opens. **Evidence:** one provider reference for one payout, whatever the retry count.

### 2.5 Late success after a recorded failure

A payout marked `failed` — with the reservation already released back to `pendingDues` — receives a delayed provider success. The platform does not silently flip it to `completed`, because the driver's dues have since been re-reserved against a retry. A `status_mismatch` exception opens naming both records, and Support reconciles the duplicate credit through `resolveReconciliationException`. **Evidence:** exception linking the original and the retry; no automatic second debit.

### 2.6 Failed payout with dues restoration

The bank returns the transfer. `recordPayoutSettlement` sets `failed`, releases `reservedForPayout` back to `pendingDues` atomically, and notifies the driver with the rail's reason in plain language. The driver's screen shows the amount back in their dues before it offers a retry. **Evidence:** the two balance lines move in one transaction; the audit entry carries both.

### 2.7 Partial refund

₹640 of a ₹1,550 order is refunded. `RefundTransaction` records the partial, `refundedAmount` accumulates, the transaction becomes `partially_refunded`, and `issueCreditNote` raises a partial credit note at the original rate and supply type, flagged `isPartial`. A second refund attempt beyond the remaining balance is refused with `REFUND_EXCEEDS_PAYMENT`. **Evidence:** cumulative credited value never exceeds the invoice taxable value.

### 2.8 Cancelled paid order

A paid order is cancelled before dispatch. Stock is restored, a refund is raised, a full credit note is issued in the current open period against the invoice's period, and the order moves to `refund_pending` then `refunded` on provider confirmation. If the invoice's period is closed, the credit note still issues in the open one carrying `againstAccountingPeriodId`. **Evidence:** refund and credit note reference each other; no reopened period.

### 2.9 Manual UTR fallback

The payout rail is unavailable and `PAYOUT_MANUAL_FALLBACK_ENABLED` is set. Support records the transfer with a UTR; a second Support actor verifies it against the bank statement before the payout completes. The entering actor cannot be the verifying actor. **Evidence:** two distinct actor ids on the `PayoutTransaction` status events; `UTR_MISMATCH` never discloses the expected value.

### 2.10 Unauthorized override attempt

A Support user attempts to write off a break above their ceiling, and separately attempts to call `getFinanceReport` for a subscriber whose plan lacks the entitlement. The first is refused with `PERMISSION_DENIED` naming the ceiling and the requirement for a second actor. The second succeeds only as a recorded Support read, and never grants the previewing actor the entitlement. **Evidence:** both attempts appear in the audit log, refusals included.

### 2.11 Cash-on-pickup converted to UPI at the door

The buyer chose cash but pays by UPI at handover. The order's `paymentMode` is not rewritten; a `PaymentTransaction` is created for the actual collection and the expected `CashLedgerEntry` is not opened. The driver's custody balance is unaffected. **Evidence:** the collection sits in `buyer_collections`, not `cash_custody`, and the two never double-count.

### 2.12 Subscription payment fails at renewal

The renewal charge fails. The subscription becomes `past_due` with `gracePeriodEndsAt` set. Advanced reports, exports, and scheduled deliveries stop at the end of grace; payouts, refunds, credit repayment, order collection, and invoice access continue unchanged throughout. **Evidence:** a payout approved during grace; an export refused after it.

---

## 3. Acceptance evidence

| Test class | What must be demonstrated |
| ---------- | ------------------------- |
| **State transition** | Every transition in the payment and payout state machines, including every refused transition. A test that only walks the happy path proves the happy path. |
| **Idempotency** | Every mutating finance command replayed with the same key returns the original record and writes nothing new. Verified for payment intents, captures, payouts, refunds, webhooks, and subscription changes. |
| **Access control** | Each command called by every role, including the ones it must refuse. Segregation of duties tested by having the requester attempt their own approval. |
| **Webhook signature** | Valid, invalid, replayed, stale, unmapped, and unmatched events. Signature computed over the raw body, and a test that would pass if the implementation hashed a re-serialised object must fail. |
| **Reconciliation tie-out** | Each sub-ledger reconciled to its control account with a seeded break of each `ReconciliationExceptionKind`, and each break carried to each permitted resolution. |
| **Audit immutability** | A write attempt to `AuditLogEntry` from a client, from Support, and from an unrelated function all refused. Every money-moving command verified to leave an entry in the same transaction. |
| **Tax correctness** | Intra-state and inter-state resolution for each document class; rate and head frozen on the document; credit note following the original's rate and head; gapless invoice and credit-note series under concurrency. |
| **Withholding** | Disabled produces no deduction record at all. Enabled produces the correct rate with and without PAN, at both thresholds, with and without retrospective catch-up. Challan tie-out refused when it does not balance. |
| **Retention** | Each class expires to its stated action; a legal hold suspends expiry; beneficiary secret destruction leaves the masked label and verification outcome intact. |
| **Period close** | Close refused with an unacknowledged break, a disputed settlement, or cash in custody. A back-dated write into a closed period refused with `PERIOD_LOCKED`. Reopen retains the original pack. |
| **Role walkthrough** | One end-to-end pass per role through their own money screens, confirming every displayed figure has a server source and every control has a backing contract. |

---

## 4. Subscription matrix tests

Run for both `supplier` and `merchant`, against every tier in `constitution/Logikchain_Financial_Controls.md` §9.4.

| Case | Expected |
| ---- | -------- |
| Baseline access on every plan | All seven `BaselineFinanceCapability` items reachable |
| Baseline access in `past_due`, cancelled, and expired | Unchanged |
| Each premium entitlement, granted | Report renders; usage counter increments |
| Each premium entitlement, absent | `PLAN_FEATURE_REQUIRED` naming the key and the cheapest eligible plan |
| Direct API call bypassing the UI | Refused identically; a hidden button proves nothing |
| Support preview of a plan | Shows the experience; grants the previewer nothing |
| Upgrade payment succeeds | Entitlements active immediately; invoice paid with GST |
| Upgrade payment fails or is abandoned | Nothing granted; subscriber unchanged |
| Upgrade webhook delayed | Entitlements wait for the capture, not the redirect |
| Downgrade requested | `pendingPlanId` set; current entitlements intact until `currentPeriodEnd` |
| Downgrade applied at period end | Entitlements replaced; unsupported schedules disabled with a recorded reason |
| Downgrade without acknowledgement | `ACKNOWLEDGEMENT_MISMATCH` |
| Proration on a mid-cycle upgrade | `prorationCredit` matches the unused period; GST computed on the net |
| `past_due` grace window | Entitlements survive to `gracePeriodEndsAt`, then reporting degrades only |
| Expiry | Premium generation stops; every historical record and prior export still readable |
| Plan edited by Support | Removals land at next renewal; `affectedSubscriberCount` reported before saving |
| Supplier plan offered to a merchant | `PLAN_ROLE_MISMATCH` |
| Merchant plan carrying `finance.reconciliation` | `INVALID_ENTITLEMENT` |
| Plan omitting `finance.dashboard` | `BASELINE_ENTITLEMENT_REQUIRED` |
| Metered limit reached | `ENTITLEMENT_LIMIT_EXCEEDED` with used, allowed, and reset date |
| Reactivation after expiry | Priced as a fresh period; records were never withdrawn |

---

## 5. Sign-off checklist

Implementation may begin when every line is true.

- [ ] Every screen in section 1 names a command that exists in `constitution/Logikchain_API_Specifications.md`, and `constitution/wireframes/Navigation.md` lists it.
- [ ] Every command in section 1 declares permitted roles, preconditions, idempotency, atomic writes, and audit events.
- [ ] Every `FinanceEntitlement` key used anywhere resolves to the union in `constitution/Logikchain_Data_Structures.md`; no document carries a private vocabulary.
- [ ] Every sub-ledger in the chart has a control account and a stated tie-out.
- [ ] No GST figure anywhere is derived from a hard-coded state.
- [ ] The TDS module is disabled by default and cannot be enabled without a recorded adviser confirmation.
- [ ] Every record class has a retention policy, and beneficiary secrets are the only class destroyed automatically.
- [ ] Each of the twelve scenarios in section 2 has a named owner and an agreed expected behaviour.
- [ ] Each test class in section 3 has at least one case per listed condition.
- [ ] The subscription matrix in section 4 passes for both roles across all six tiers.
- [ ] Every threshold in `constitution/Logikchain_Financial_Controls.md` §11 is configuration, not a constant.
