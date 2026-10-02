# EPIC-05: Driver Mobile Operations, Custody Chain & Earnings Payouts

## Executive Summary
EPIC-05 governs driver field operations. As established in the Constitution (`constitution/Logikchain_Architecture.md`), the **Android Native app is the official client** for drivers. It provides a durable Room + WorkManager outbox for zero-loss offline execution, real-time custody of collected physical cash, end-of-day warehouse cash settlement, emergency handover fallback authorizations, and driver payout management.

---

## FEAT-05.01: Driver Manifest & Durable Offline Delivery Outbox

### 1. Hierarchy & Metadata
- **Epic**: `EPIC-05`
- **Feature ID**: `FEAT-05.01`
- **Official Runtimes**: Android Native (Jetpack Compose, Room, WorkManager)
- **Screens**: [DRV-02 Gigs](file:///c:/Users/Admin/Downloads/logikchain/logikchain.com/constitution/wireframes/Driver.md#DRV-02), [DRV-03 Active Run](file:///c:/Users/Admin/Downloads/logikchain/logikchain.com/constitution/wireframes/Driver.md#DRV-03)
- **Functions / APIs**: Android Room DB Outbox $\rightarrow$ Callable Firebase Functions

### 2. Business Value & Problem Statement
Rural delivery routes suffer from patchy network connectivity. Drivers cannot be blocked from handing over goods or collecting cash when offline. All field mutations must be journaled in an atomic, non-volatile native Room database and synchronised deterministically upon signal recovery with strict idempotency.

### 3. Users in Use Case
- **Primary Actor**: Field Driver / Logistics Operator (`role: vehicle`).
- **Recipients**: Village Buyers and Retail Merchants.

### 4. End-to-End Use Case Narrative
1. **Pre-conditions**: Driver signs into official Android app; active gig manifest downloaded to Room database.
2. **Main Flow**:
   - Driver enters dead-zone village.
   - Driver opens order stop, verifies recipient pickup code, collects ₹350 cash, and taps "Complete Handover".
   - Android app records handover in local Room table `outbox_mutations` with timestamp and unique `idempotencyKey`.
   - Android UI updates immediately to "Delivered (Queued Sync)".
   - Once cellular signal is re-established, Android `WorkManager` flushes queued outbox events sequentially to `/v1/orders/{id}:deliver`.
3. **Post-conditions**: Remote Firestore matches local state; outbox queue entry marked `synced`.

### 5. Agile User Stories
- **US-05.01.01 (Must Have)**: As a delivery driver in remote areas, I want my delivery and cash collections recorded offline in a persistent outbox, so that I can finish my run without network delays.

### 6. Acceptance Criteria (Gherkin)

```gherkin
Scenario: Driver executes handover while offline
  Given the Android app is disconnected from mobile data
  When the driver enters confirmation code "654321" and confirms delivery of order "ord_202"
  Then the order is saved in the local Room database with syncState "PENDING"
  And the local UI reflects the delivery as completed
  When network connectivity is restored
  Then WorkManager posts the mutation with the persisted idempotencyKey
  And marks the local record syncState "SYNCED"
```

### 7. Developer Test Plan & Mapping
- **Android Native Instrumentation Test**: Espresso + Robolectric test mocking Airplane Mode, enqueueing mutations to Room, restoring network, and asserting synchronization.
- **Unit Tests**: Android Room outbox entity serialization and deduplication.

---

## FEAT-05.02: Driver Physical Cash Custody & Warehouse Settlement

### 1. Hierarchy & Metadata
- **Epic**: `EPIC-05`
- **Feature ID**: `FEAT-05.02`
- **Official Runtimes**: Android Native (Driver), Web PWA (Supplier), Functions
- **Screens**: [DRV-04 Trip Summary](file:///c:/Users/Admin/Downloads/logikchain/logikchain.com/constitution/wireframes/Driver.md#DRV-04), [SUP-07 Cash Settlement](file:///c:/Users/Admin/Downloads/logikchain/logikchain.com/constitution/wireframes/Supplier.md#SUP-07)
- **Functions / APIs**: `GET /v1/cash/custody` (`getCashCustodySummary`), `POST /v1/cash-settlements/{id}:declare` (`declareCashHandover`), `POST /v1/cash-settlements/{id}:confirm` (`confirmCashSettlement`)

### 2. Business Value & Problem Statement
Drivers collect substantial cash on delivery and credit repayments during a trip. At trip conclusion, this physical money must be handed over to the supplier warehouse cashier, with both parties confirming the exact counted amount.

### 3. Acceptance Criteria (Gherkin)

```gherkin
Scenario: Driver declares cash and supplier confirms warehouse deposit
  Given driver "usr_drv_01" has collected ₹18,500 during trip "gig_99"
  When driver calls "POST /v1/cash-settlements/settle_55:declare" with:
    | declaredAmount         | 18500    |
    | proof.confirmationCode | "881234" |
  Then settlement status becomes "declared"
  When supplier cashier calls "POST /v1/cash-settlements/settle_55:confirm" with:
    | countedAmount          | 18500    |
    | proof.confirmationCode | "881234" |
  Then settlement status transitions to "confirmed"
  And driver's physical custody liability drops from ₹18,500 to ₹0
  And supplier's warehouse cash ledger increments by ₹18,500
```

### 4. Developer Test Plan & Mapping
- **Bruno API Test**: `tests/bruno/08-cash/getCashCustodySummary/`, `declareCashHandover/`, and `confirmCashSettlement/`.
- **UI E2E Test**: `tests/e2e/logistics/cash-settlement-flow.spec.ts`.
- **Unit Tests**: Cash custody balance summation per driver.
- **Functional Tests**: Financial double-entry invariance for settlement ledger entries.

---

## FEAT-05.03: Cash Discrepancies, Shortfalls & Dispute Escalation

### 1. Hierarchy & Metadata
- **Epic**: `EPIC-05`
- **Feature ID**: `FEAT-05.03`
- **Official Runtimes**: Android Native, Support Ops Console, Functions
- **Screens**: [DRV-04.1 Discrepancy](file:///c:/Users/Admin/Downloads/logikchain/logikchain.com/constitution/wireframes/Driver.md#DRV-04), [SPT-04 Cash Disputes](file:///c:/Users/Admin/Downloads/logikchain/logikchain.com/constitution/wireframes/Support.md)
- **Functions / APIs**: `POST /v1/cash-discrepancies` (`raiseCashDiscrepancy`), `PATCH /v1/cash-discrepancies/{id}` (`resolveCashDiscrepancy`)

### 2. Acceptance Criteria (Gherkin)

```gherkin
Scenario: Shortfall reported during settlement and resolved by Support
  Given driver counted ₹14,000 against declared ₹14,500 (shortfall of ₹500)
  When driver posts to "/v1/cash-discrepancies" with:
    | settlementId | "settle_55" |
    | kind         | "shortfall" |
    | amount       | 500         |
    | reason       | "Counterfeit note refused at bank" |
  Then a discrepancy record "disc_99" is created in status "open"
  When Support operator investigates and calls "PATCH /v1/cash-discrepancies/disc_99" with:
    | resolution   | "write_off" |
    | reason       | "Approved under logistics breakage policy" |
  Then discrepancy is "resolved" and ₹500 is posted to bad debt expense
```

### 3. Developer Test Plan & Mapping
- **Bruno API Test**: `tests/bruno/08-cash/raiseCashDiscrepancy/` and `resolveCashDiscrepancy/`.
- **UI E2E Test**: `tests/e2e/support/cash-discrepancy-resolution.spec.ts`.

---

## FEAT-05.04: Verification Fallback Protocols for Field Failures

### 1. Hierarchy & Metadata
- **Epic**: `EPIC-05`
- **Feature ID**: `FEAT-05.04`
- **Official Runtimes**: Android Native (Driver), Supplier Console, Functions
- **Screens**: [DRV-03.2 Fallback Sheet](file:///c:/Users/Admin/Downloads/logikchain/logikchain.com/constitution/wireframes/Driver.md#DRV-03), [SUP-05 Exception Center](file:///c:/Users/Admin/Downloads/logikchain/logikchain.com/constitution/wireframes/Supplier.md#SUP-05)
- **Functions / APIs**: `POST /v1/verification-fallbacks:request` (`requestVerificationFallback`), `POST /v1/verification-fallbacks` (`authorizeVerificationFallback`)

### 2. Business Value & Problem Statement
When a buyer's mobile phone battery dies, or SMS is delayed, delivery cannot stall the driver's tight route schedule. The driver requests an emergency fallback, which the supplier manager reviews and authorizes with supervisor override credentials.

### 3. Acceptance Criteria (Gherkin)

```gherkin
Scenario: Emergency handover fallback authorized by supplier
  Given a delivery where buyer phone is unreachable
  When driver calls "POST /v1/verification-fallbacks:request" with orderId "ord_303"
  Then supplier receives high-priority alert on "SUP-05"
  When supplier posts "POST /v1/verification-fallbacks" with:
    | orderId   | "ord_303"                |
    | grantedTo | "usr_drv_01"             |
    | reason    | "Verified buyer in-person via photo proof" |
  Then a one-time supervisor bypass token is issued to the driver
  And driver completes delivery without buyer OTP
```

### 4. Developer Test Plan & Mapping
- **Bruno API Test**: `tests/bruno/08-cash/requestVerificationFallback/` and `authorizeVerificationFallback/`.
- **UI E2E Test**: `tests/e2e/driver/fallback-authorization.spec.ts`.

---

## FEAT-05.05: Driver Earnings Payouts & UPI Disbursement

### 1. Hierarchy & Metadata
- **Epic**: `EPIC-05`
- **Feature ID**: `FEAT-05.05`
- **Official Runtimes**: Android Native, Supplier Console, Support Console, Functions
- **Screens**: [DRV-06 Earnings & Payout](file:///c:/Users/Admin/Downloads/logikchain/logikchain.com/constitution/wireframes/Driver.md#DRV-06), [SUP-09 Driver Pay](file:///c:/Users/Admin/Downloads/logikchain/logikchain.com/constitution/wireframes/Supplier.md#SUP-09)
- **Functions / APIs**: `POST /v1/beneficiaries` (`registerPayoutBeneficiary`), `POST /v1/payout-requests` (`requestPayout`), `PATCH /v1/payout-requests/{id}` (`reviewPayoutRequest`), `POST /v1/payouts/{id}:retry` (`retryPayout`), `POST /v1/payouts/{id}:verify-manual` (`verifyManualPayout`)

### 2. Acceptance Criteria (Gherkin)

```gherkin
Scenario: Driver registers UPI VPA and requests earnings payout
  Given driver "usr_drv_01" has available accrued earnings ₹3,500
  When driver registers UPI ID "driver@okaxis" via "POST /v1/beneficiaries" with a stepUpToken
  And submits "POST /v1/payout-requests" for ₹3,000
  Then payout request is created with status "pending_review"
  When supplier reviews and approves payout request
  Then automated payout is triggered via gateway
  And upon success, driver's wallet balance decrements by ₹3,000
```

### 3. Developer Test Plan & Mapping
- **Bruno API Test**: `tests/bruno/07-payouts/registerPayoutBeneficiary/`, `requestPayout/`, `reviewPayoutRequest/`, `retryPayout/`, and `verifyManualPayout/`.
- **UI E2E Test**: `tests/e2e/driver/payout-flow.spec.ts`.
- **Unit Tests**: UPI VPA format validator, minimum withdrawal threshold ($amount \ge ₹100$).
