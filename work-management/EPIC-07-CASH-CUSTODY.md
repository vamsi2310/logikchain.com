# EPIC-07: Cash Management & Rural CoD Custody

## 1. Functional Area Alignment & Microservice Metadata
- **Epic ID**: `EPIC-07`
- **Epic Status**: [READY]
- **Functional Area**: Cash Management & Rural CoD Custody Chain
- **Bound Microservice**: `microservices/services/cash-service`
- **Container Port**: `4007`
- **Database**: `cash_db` (PostgreSQL with outbox event streaming)
- **Primary Runtimes**: Android Native (`logikchain-android` - Official Driver), Web PWA (`web/s/` Supplier), Support Console
- **Primary Responsibilities**: Physical currency chain-of-custody, Cash-on-Delivery collections, driver-to-supplier physical handover with 6-digit cryptographic OTP, offline handover code batches, cash discrepancy reporting, and variance settlement.

---

## FEAT-07.01: CoD Cash Collection & Driver Custody Tracking

### 1. Feature Metadata & Hierarchy
- **Feature ID**: `FEAT-07.01`
- **Feature Status**: [READY]
- **Functional Scope**: Field currency collection logging, driver real-time cash balance tracking, offline custody capture, and mobile outbox sync.
- **Service Endpoints**: `GET /v1/cash/summary/{driverId}` (`getCashCustodySummary`), `POST /v1/cash/collections`
- **UI Screens**: [VEH-05 Cash Collect](file:///c:/Users/Admin/Downloads/logikchain/logikchain.com/constitution/wireframes/Vehicle.md#VEH-05), [VEH-08 Cash Custody](file:///c:/Users/Admin/Downloads/logikchain/logikchain.com/constitution/wireframes/Vehicle.md#VEH-08)

### 2. Derived Use Cases
#### UC-07.01.A: Rural Doorstep Cash-on-Delivery Collection & Custody Accumulation
- **Description**: Delivery driver delivers packages to a rural home, collects cash, and the mobile app records cash custody into driver balance.
- **Primary Actor**: Vehicle Driver (`role: vehicle`).
- **Secondary Systems**: `orders-service`, `cash-service`, Android Room Database / WorkManager.
- **Preconditions**: Order is in status `dispatched` with payment mode `cod`.
- **Nominal Flow**:
  1. Driver collects physical currency (e.g. ₹850) from buyer upon delivery.
  2. Driver confirms cash collected on screen `VEH-05`.
  3. Android client enqueues cash collection in local Room database with UUID `idempotencyKey` and `capturedAt` timestamp.
  4. WorkManager syncs record to `POST /v1/cash/collections`.
  5. `cash-service` increments driver's active custody balance in `cash_db.driver_custody`.
  6. Outbox event emitted; driver wallet screen `VEH-08` reflects updated accumulated cash balance.
- **Alternate / Degraded Flow**:
  - *No Cellular Connectivity*: Android client persists record locally; accumulates offline custody counter; syncs automatically once connectivity returns.
- **Postconditions**: Driver custody balance incremented; order marked cash-collected; physical liability established.

### 3. User Journey Stories
- **US-07.01.01 [READY]**: *As a rural delivery driver, I want my mobile app to reliably record cash collections even when there is no mobile network in the village, so that my collected cash tally remains accurate.*
- **US-07.01.02 [READY]**: *As a supplier, I want real-time visibility into the exact physical cash currently held by each driver on the road, so that operational financial risk is monitored continuously.*

#### Acceptance Criteria (Gherkin)
```gherkin
Scenario: Driver collects cash offline and syncs
  Given a driver with active custody ₹1,500 in an area with zero cellular signal
  When driver records collection of ₹500 for order "ord_cod_22"
  Then the Android app records collection locally and increments displayed custody to ₹2,000
  When mobile connectivity is restored
  Then Android WorkManager syncs transaction to cash-service
  And cash-service updates cash_db.driver_custody to ₹2,000
```

### 4. Integration Stories
- **INT-07.01.01 [READY] (Orders Service Handover Integration)**: *As the Cash Service, I need to receive cash collection events from `orders-service` (`:4002`) to link cash entries directly with order IDs.*
- **INT-07.01.02 [READY] (Mobile Offline WorkManager Integration)**: *As the Cash Service, I need to accept batch-queued offline cash events from Android WorkManager, ensuring duplicate events with identical `idempotencyKey` are safely deduplicated.*
- **INT-07.01.03 [READY] (Firestore Periodic Sync Integration)**: *As the Cash Service, I need to synchronize driver custody balances to Firestore collection `/CashCustody/{driverId}` every 2000ms.*

### 5. Multi-Client Implementation Stories
- **PWA-07.01.01 [READY] (Web PWA Cash Custody Monitor)**: *Build real-time driver cash custody monitor on Supplier and Support PWA in `web/` with live aggregate collection tallies and filterable route audit views.*
- **AND-07.01.01 [READY] (Android Native CoD Cash Collection)**: *Implement driver native Android cash collection UI (`VEH-05`, `VEH-08`) in `android/` with Room DB offline queuing, WorkManager sync, and tamper-resistant cash tally.*
- **IOS-07.01.01 [READY] (iOS Native CoD Cash Collection)**: *Implement driver native iOS cash collection UI (`VEH-05`, `VEH-08`) in `ios/` with CoreData offline store and background sync.*

### 6. PWA Cloud Testing Story
- **TEST-07.01.PWA [READY] (PWA Cloud E2E Test on Test Project)**: *Automated Playwright test verifying cash collection recording, driver custody balance updates, and offline sync reconciliation against `cash-service` on `logikchain-test`.*

### 7. Independent Support Stories
- **OPS-07.01.01 [READY] (DevOps & Database Schema)**: *Execute PostgreSQL migration for `cash_db.driver_custody` and configure unique index on `(idempotency_key, driver_id)`.*
- **DOC-07.01.01 [READY] (Cash Invariance Technical Spec)**: *Document mathematical proofs of cash custody conservation and mobile offline outbox synchronization guarantees.*
- **TEST-07.01.01 [READY] (Bruno API Automation)**: *Create automated Bruno test `tests/bruno/07-cash/custodySummary/` verifying balance increment math.*

### 8. Deployment & Cloud Verification (Acceptance Criteria & Commands)
- **Cloud Run Microservice Deployment Command**:
  ```bash
  docker build -t asia-south1-docker.pkg.dev/logikchain-test/logikchain-microservices/cash-service:latest -f microservices/services/cash-service/Dockerfile.service microservices/services/cash-service
  docker push asia-south1-docker.pkg.dev/logikchain-test/logikchain-microservices/cash-service:latest
  gcloud run deploy cash-service \
    --image=asia-south1-docker.pkg.dev/logikchain-test/logikchain-microservices/cash-service:latest \
    --region=asia-south1 \
    --project=logikchain-test \
    --platform=managed \
    --no-allow-unauthenticated \
    --ingress=internal
  ```
- **Web PWA Deployment Command**:
  ```bash
  npm --prefix web run build:test
  firebase deploy --project test --only hosting --non-interactive
  ```
- **PWA Cloud Test Verification Command**:
  ```bash
  npx playwright test tests/e2e/pwa/cash-custody-tracking.spec.ts --project=test --config=playwright.pwa.config.ts
  ```
- **Acceptance Criteria**:
  - [ ] Backend microservice running on Google Cloud Run in `logikchain-test` with `200 OK` on `/health`.
  - [ ] Web PWA deployed to Firebase Hosting on `logikchain-test` communicating through API Gateway.
  - [ ] Android & iOS builds compile and connect to `logikchain-test`.
  - [ ] Automated PWA E2E tests pass 100% assertions on test project URL.

---

## FEAT-07.02: Driver-to-Supplier Cash Handover & OTP Verification

### 1. Feature Metadata & Hierarchy
- **Feature ID**: `FEAT-07.02`
- **Feature Status**: [READY]
- **Functional Scope**: End-of-shift cash turn-in, supplier cashier declaration, 6-digit cryptographic OTP generation, and custody discharge.
- **Service Endpoints**: `POST /v1/cash/handover/declare` (`declareCashHandover`), `POST /v1/cash/handover/confirm` (`confirmCashSettlement`), `POST /v1/cash/handover/resend`
- **UI Screens**: [VEH-08 Cash Handover](file:///c:/Users/Admin/Downloads/logikchain/logikchain.com/constitution/wireframes/Vehicle.md#VEH-08), [SUP-09 Cashier Console](file:///c:/Users/Admin/Downloads/logikchain/logikchain.com/constitution/wireframes/Supplier.md#SUP-09)

### 2. Derived Use Cases
#### UC-07.02.A: End-of-Gig Physical Cash Turn-In & Custody Settlement
- **Description**: Driver turns in accumulated cash at supplier cashier desk; cashier counts money and confirms via OTP.
- **Primary Actor**: Vehicle Driver (`role: vehicle`) and Supplier Cashier (`role: supplier`).
- **Nominal Flow**:
  1. Driver arrives at cashier desk with physical currency and initiates handover on `VEH-08`.
  2. Driver submits `declareCashHandover` specifying declared amount (e.g. ₹12,400).
  3. `cash-service` generates a cryptographically secure 6-digit numeric OTP and transmits it to driver app/SMS.
  4. Cashier physically counts bills on screen `SUP-09` and enters received amount and driver's OTP.
  5. `cash-service` validates OTP; matches declared amount against counted amount.
  6. `cash-service` discharges driver's custody balance to ₹0; creates settlement record in `cash_db.settlements`.
  7. `cash-service` notifies `finance-service` (`:4009`) to book cashier cash receipt.
- **Alternate / Degraded Flow**:
  - *OTP Replay*: If an already-used OTP is submitted, system rejects with `CODE_REPLAYED` guard.
- **Postconditions**: Driver custody liability discharged; supplier cash registered; double-entry booking posted.

### 3. User Journey Stories
- **US-07.02.01 [READY]**: *As a driver handing over cash, I want a secure OTP confirmation from the cashier, so that I receive an instant digital receipt proving I handed over the money.*
- **US-07.02.02 [READY]**: *As a supplier cashier, I want to confirm cash receipts with the driver's OTP, so that neither party can dispute the physical handover amount later.*

#### Acceptance Criteria (Gherkin)
```gherkin
Scenario: Successful cash handover via 6-digit OTP
  Given driver "usr_drv_01" has custody balance ₹12,400
  When driver declares handover of ₹12,400 on screen "VEH-08"
  Then cash-service generates a 6-digit OTP "829401"
  When cashier enters received amount ₹12,400 and OTP "829401"
  Then cash-service discharges driver custody balance to ₹0
  And issues a settlement receipt in cash_db
```

### 4. Integration Stories
- **INT-07.02.01 [READY] (Finance Service Cash Booking Integration)**: *As the Cash Service, I need to call `finance-service` (`:4009`) upon successful cash settlement to credit Driver Custody Clearing and debit Warehouse Safe Cash accounts.*
- **INT-07.02.02 [READY] (Credit Service Repayment Integration)**: *As the Cash Service, I need to notify `credit-service` (`:4008`) if any portion of the turned-in cash corresponds to collected merchant credit repayments.*

### 5. Multi-Client Implementation Stories
- **PWA-07.02.01 [READY] (Web PWA Cashier Handover Console)**: *Build cashier turn-in console (`SUP-09`) in `web/` allowing physical cash counting, OTP verification, denomination breakdown, and instant digital receipt generation.*
- **AND-07.02.01 [READY] (Android Native Cash Turn-In & OTP)**: *Implement driver turn-in declaration screen (`VEH-08`) in `android/` generating 6-digit OTP and displaying handover status.*
- **IOS-07.02.01 [READY] (iOS Native Cash Turn-In & OTP)**: *Implement driver turn-in declaration screen (`VEH-08`) in `ios/` with secure OTP view and receipt archiving.*

### 6. PWA Cloud Testing Story
- **TEST-07.02.PWA [READY] (PWA Cloud E2E Test on Test Project)**: *Automated Playwright test simulating driver cash handover declaration and cashier OTP verification in PWA against `cash-service` on `logikchain-test`.*

### 7. Independent Support Stories
- **OPS-07.02.01 [READY] (DevOps & Code Expiry Jobs)**: *Implement background cleanup job in `cash-service` expiring unused handover OTPs after 15 minutes.*
- **DOC-07.02.01 [READY] (Cashier Settlement Runbook)**: *Publish SOP documentation for warehouse cashiers handling physical bill counting and counterfeit detection.*
- **TEST-07.02.01 [READY] (Bruno API Automation)**: *Create automated Bruno test `tests/bruno/07-cash/confirmSettlement/` asserting replay protection on used OTP codes.*

### 8. Deployment & Cloud Verification (Acceptance Criteria & Commands)
- **Cloud Run Microservice Deployment Command**:
  ```bash
  docker build -t asia-south1-docker.pkg.dev/logikchain-test/logikchain-microservices/cash-service:latest -f microservices/services/cash-service/Dockerfile.service microservices/services/cash-service
  docker push asia-south1-docker.pkg.dev/logikchain-test/logikchain-microservices/cash-service:latest
  gcloud run deploy cash-service \
    --image=asia-south1-docker.pkg.dev/logikchain-test/logikchain-microservices/cash-service:latest \
    --region=asia-south1 \
    --project=logikchain-test \
    --platform=managed \
    --no-allow-unauthenticated \
    --ingress=internal
  ```
- **Web PWA Deployment Command**:
  ```bash
  npm --prefix web run build:test
  firebase deploy --project test --only hosting --non-interactive
  ```
- **PWA Cloud Test Verification Command**:
  ```bash
  npx playwright test tests/e2e/pwa/cash-handover-otp.spec.ts --project=test --config=playwright.pwa.config.ts
  ```
- **Acceptance Criteria**:
  - [ ] Backend microservice running on Google Cloud Run in `logikchain-test` with `200 OK` on `/health`.
  - [ ] Web PWA deployed to Firebase Hosting on `logikchain-test` communicating through API Gateway.
  - [ ] Android & iOS builds compile and connect to `logikchain-test`.
  - [ ] Automated PWA E2E tests pass 100% assertions on test project URL.

---

## FEAT-07.03: Cash Discrepancy Reporting & Resolution Workflow

### 1. Feature Metadata & Hierarchy
- **Feature ID**: `FEAT-07.03`
- **Feature Status**: [READY]
- **Functional Scope**: Cash shortfall/excess recording, dispute documentation, photo attachment of forged bills, and Support resolution.
- **Service Endpoints**: `POST /v1/cash/discrepancies` (`raiseCashDiscrepancy`), `POST /v1/cash/discrepancies/{id}/resolve` (`resolveCashDiscrepancy`)
- **UI Screens**: [SUP-09 Cashier Console](file:///c:/Users/Admin/Downloads/logikchain/logikchain.com/constitution/wireframes/Supplier.md#SUP-09), [SPT-06 Discrepancy Audit](file:///c:/Users/Admin/Downloads/logikchain/logikchain.com/constitution/wireframes/Support.md#SPT-06)

### 2. Derived Use Cases
#### UC-07.03.A: Cash Shortfall Reporting & Structured Resolution
- **Description**: Cashier counts physical cash and identifies a ₹500 shortfall or counterfeit note; discrepancy is raised and audited.
- **Primary Actor**: Supplier Cashier (`role: supplier`) and Support Auditor (`role: support`).
- **Nominal Flow**:
  1. Cashier enters counted amount that is less than driver declared amount.
  2. Cashier submits `raiseCashDiscrepancy` with difference amount, reason code, and notes.
  3. `cash-service` logs discrepancy in `cash_db.discrepancies` in status `under_review`.
  4. Driver's payout withdrawal capability is temporarily locked via `payouts-service`.
  5. Support audits case, decides liability (driver deduction, supplier write-off, or bank deposit correction).
  6. Support submits `resolveCashDiscrepancy`; resolution logged into `finance-service`.
- **Postconditions**: Discrepancy resolved; accounting adjustments made; payout lock released.

### 3. User Journey Stories
- **US-07.03.01 [READY]**: *As a cashier encountering a cash discrepancy, I want to record the exact shortage and upload notes, so that the discrepancy is escalated to Support without delaying the driver's next trip.*

#### Acceptance Criteria (Gherkin)
```gherkin
Scenario: Cashier records cash shortfall
  Given a declared amount of ₹10,000 but actual cash counted is ₹9,500
  When cashier submits discrepancy of ₹500 with reason "cash_shortfall"
  Then cash-service creates discrepancy ticket in status "under_review"
  And locks driver payout capability until resolved
```

### 4. Integration Stories
- **INT-07.03.01 [READY] (Payouts Service Lockout Integration)**: *As the Cash Service, I need to call `payouts-service` (`:4006`) to place a hold on driver withdrawal requests whenever an open cash discrepancy exists.*
- **INT-07.03.02 [READY] (Governance Audit Integration)**: *As the Cash Service, I need to send discrepancy alerts to `governance-service` (`:4011`) when shortages exceed ₹1,000.*

### 5. Multi-Client Implementation Stories
- **PWA-07.03.01 [READY] (Web PWA Cash Discrepancy & Audit Console)**: *Build cashier shortage reporting form on `SUP-09` and Support discrepancy audit dashboard (`SPT-06`) in `web/` with evidence attachment and resolution controls.*
- **AND-07.03.01 [READY] (Android Native Discrepancy Notice)**: *Implement driver push notification and shortage acknowledgment modal in `android/` with locked withdrawal banner.*
- **IOS-07.03.01 [READY] (iOS Native Discrepancy Notice)**: *Implement driver push notification and shortage acknowledgment modal in `ios/` with payout lock alert.*

### 6. PWA Cloud Testing Story
- **TEST-07.03.PWA [READY] (PWA Cloud E2E Test on Test Project)**: *Automated Playwright test asserting cashier discrepancy logging, driver lock status, and Support resolution in PWA against `cash-service` on `logikchain-test`.*

### 7. Independent Support Stories
- **OPS-07.03.01 [READY] (DevOps & Reporting Queries)**: *Create SQL views in `cash_db` tracking driver shortage frequency and cumulative loss ratios.*
- **DOC-07.03.01 [READY] (Discrepancy Resolution Protocol)**: *Publish guidelines for distinguishing accidental shortages from systemic theft.*
- **TEST-07.03.01 [READY] (Bruno API Automation)**: *Create automated Bruno test `tests/bruno/07-cash/raiseDiscrepancy/` validating payout lock triggers.*

### 8. Deployment & Cloud Verification (Acceptance Criteria & Commands)
- **Cloud Run Microservice Deployment Command**:
  ```bash
  docker build -t asia-south1-docker.pkg.dev/logikchain-test/logikchain-microservices/cash-service:latest -f microservices/services/cash-service/Dockerfile.service microservices/services/cash-service
  docker push asia-south1-docker.pkg.dev/logikchain-test/logikchain-microservices/cash-service:latest
  gcloud run deploy cash-service \
    --image=asia-south1-docker.pkg.dev/logikchain-test/logikchain-microservices/cash-service:latest \
    --region=asia-south1 \
    --project=logikchain-test \
    --platform=managed \
    --no-allow-unauthenticated \
    --ingress=internal
  ```
- **Web PWA Deployment Command**:
  ```bash
  npm --prefix web run build:test
  firebase deploy --project test --only hosting --non-interactive
  ```
- **PWA Cloud Test Verification Command**:
  ```bash
  npx playwright test tests/e2e/pwa/cash-discrepancy-resolution.spec.ts --project=test --config=playwright.pwa.config.ts
  ```
- **Acceptance Criteria**:
  - [ ] Backend microservice running on Google Cloud Run in `logikchain-test` with `200 OK` on `/health`.
  - [ ] Web PWA deployed to Firebase Hosting on `logikchain-test` communicating through API Gateway.
  - [ ] Android & iOS builds compile and connect to `logikchain-test`.
  - [ ] Automated PWA E2E tests pass 100% assertions on test project URL.
