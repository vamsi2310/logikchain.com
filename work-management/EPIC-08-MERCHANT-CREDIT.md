# EPIC-08: Merchant Credit & Risk Underwriting

## 1. Functional Area Alignment & Microservice Metadata
- **Epic ID**: `EPIC-08`
- **Epic Status**: [READY]
- **Functional Area**: Merchant Credit Facilities, Limits & Risk Underwriting
- **Bound Microservice**: `microservices/services/credit-service`
- **Container Port**: `4008`
- **Database**: `credit_db` (PostgreSQL with outbox event streaming)
- **Primary Runtimes**: Android Native (`logikchain-android` - Preferred Merchant), Web PWA (`web/m/`), Support Console
- **Primary Responsibilities**: Revolving trade credit facility, credit limit underwriting, synchronous order balance reservations, partial/full credit repayments, post-due credit relief policies, interest/fee ledger postings, and overdue credit lockdowns.

---

## FEAT-08.01: Merchant Credit Line Underwriting & Limit Assignment

### 1. Feature Metadata & Hierarchy
- **Feature ID**: `FEAT-08.01`
- **Feature Status**: [READY]
- **Functional Scope**: Merchant trade credit underwriting, credit limit assignment, limit increase requests, and Supplier/Support review.
- **Service Endpoints**: `POST /v1/credit/limits` (`setMerchantCreditLimit`), `POST /v1/credit/requests` (`requestCreditIncrease`), `POST /v1/credit/requests/{id}/review`
- **UI Screens**: [MER-07 Credit Line](file:///c:/Users/Admin/Downloads/logikchain/logikchain.com/constitution/wireframes/Merchant.md#MER-07), [SUP-10 Credit Governance](file:///c:/Users/Admin/Downloads/logikchain/logikchain.com/constitution/wireframes/Supplier.md#SUP-10)

### 2. Derived Use Cases
#### UC-08.01.A: Supplier Credit Underwriting & Headroom Assignment
- **Description**: Supplier establishes revolving credit line for a trusted village shopkeeper to enable bulk restocking.
- **Primary Actor**: Regional Supplier (`role: supplier`) and Village Merchant (`role: merchant`).
- **Nominal Flow**:
  1. Merchant applies for credit limit increase on `MER-07` submitting business turnover data.
  2. Supplier reviews merchant order history and payment punctuality on `SUP-10`.
  3. Supplier grants revolving credit limit (e.g. ₹50,000) with 14-day payment cycle.
  4. `credit-service` updates `credit_db.credit_profiles` setting `credit_limit = 50000` and `available_credit = 50000`.
  5. Outbox event emitted; merchant notified via push notification.
- **Postconditions**: Credit line activated; merchant authorized for credit checkout.

### 3. User Journey Stories
- **US-08.01.01 [READY]**: *As a village merchant, I want to view my credit limit, used credit, and available headroom on my phone, so that I can plan my store inventory purchases effectively.*
- **US-08.01.02 [READY]**: *As a regional supplier, I want to assign customized credit limits to local shopkeepers based on their order history, so that I can drive sales while mitigating credit risk.*

#### Acceptance Criteria (Gherkin)
```gherkin
Scenario: Supplier grants credit limit to verified merchant
  Given an active merchant "mer_01" bound to supplier "sup_01"
  When supplier sets credit limit to ₹50,000 with 14-day term
  Then credit-service updates credit_profiles with limit ₹50,000 and available ₹50,000
  And logs limit assignment in credit_audit table
```

### 4. Integration Stories
- **INT-08.01.01 [READY] (Identity Service Role Check Integration)**: *As the Credit Service, I need to verify with `identity-service` (`:4001`) that target merchant account is in `approved` status before enabling credit.*
- **INT-08.01.02 [READY] (Firestore Periodic Sync Integration)**: *As the Credit Service, I need to synchronize credit balances to Firestore collection `/CreditProfiles/{merchantId}` every 2000ms.*

### 5. Multi-Client Implementation Stories
- **PWA-08.01.01 [READY] (Web PWA Merchant Credit Dashboard & Supplier Underwriting)**: *Build merchant credit dashboard on `web/m/` (`MER-07`) and Supplier underwriting governance console on `web/s/` (`SUP-10`) with tier selector and limit adjustment sliders.*
- **AND-08.01.01 [READY] (Android Native Merchant Credit Application)**: *Build native Android Jetpack Compose credit limit viewer and increase application screen in `android/` (`MER-07`).*
- **IOS-08.01.01 [READY] (iOS Native Merchant Credit Application)**: *Build native iOS SwiftUI credit limit viewer and increase application screen in `ios/` (`MER-07`).*

### 6. PWA Cloud Testing Story
- **TEST-08.01.PWA [READY] (PWA Cloud E2E Test on Test Project)**: *Automated Playwright test verifying credit application submission, Supplier underwriting approval, and live headroom update on PWA against `credit-service` on `logikchain-test`.*

### 7. Independent Support Stories
- **OPS-08.01.01 [READY] (DevOps & Database Migrations)**: *Deploy `credit-service` on Kubernetes (`03-credit.yaml`), apply schema migrations for `credit_db`, and configure health probe `GET /health`.*
- **DOC-08.01.01 [READY] (Underwriting Policy Documentation)**: *Publish risk tier definitions, maximum credit ceilings per village category, and underwriting guidelines.*
- **TEST-08.01.01 [READY] (Bruno API Automation)**: *Create automated Bruno test `tests/bruno/08-credit/setCreditLimit/` asserting input validation on credit amounts.*

### 8. Deployment & Cloud Verification (Acceptance Criteria & Commands)
- **Cloud Run Microservice Deployment Command**:
  ```bash
  docker build -t asia-south1-docker.pkg.dev/logikchain-test/logikchain-microservices/credit-service:latest -f microservices/services/credit-service/Dockerfile.service microservices/services/credit-service
  docker push asia-south1-docker.pkg.dev/logikchain-test/logikchain-microservices/credit-service:latest
  gcloud run deploy credit-service \
    --image=asia-south1-docker.pkg.dev/logikchain-test/logikchain-microservices/credit-service:latest \
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
  npx playwright test tests/e2e/pwa/credit-underwriting-limits.spec.ts --project=test --config=playwright.pwa.config.ts
  ```
- **Acceptance Criteria**:
  - [ ] Backend microservice running on Google Cloud Run in `logikchain-test` with `200 OK` on `/health`.
  - [ ] Web PWA deployed to Firebase Hosting on `logikchain-test` communicating through API Gateway.
  - [ ] Android & iOS builds compile and connect to `logikchain-test`.
  - [ ] Automated PWA E2E tests pass 100% assertions on test project URL.

---

## FEAT-08.02: Revolving Credit Authorization & Order Holds

### 1. Feature Metadata & Hierarchy
- **Feature ID**: `FEAT-08.02`
- **Feature Status**: [READY]
- **Functional Scope**: Real-time synchronous credit availability evaluation, order balance hold, and commit/release rollback protocol.
- **Service Endpoints**: `POST /v1/credit/holds`, `POST /v1/credit/holds/{id}/commit`, `POST /v1/credit/holds/{id}/release`
- **UI Screens**: [MER-05 Checkout](file:///c:/Users/Admin/Downloads/logikchain/logikchain.com/constitution/wireframes/Merchant.md#MER-05)

### 2. Derived Use Cases
#### UC-08.02.A: Synchronous Credit Reservation During Order Checkout
- **Description**: Merchant checks out wholesale bulk order; credit service verifies available headroom and places a hold.
- **Primary Actor**: System (`orders-service`) on behalf of Merchant (`role: merchant`).
- **Nominal Flow**:
  1. `orders-service` calls `credit-service` (`:4008`) with merchant ID and order amount ₹15,000.
  2. `credit-service` checks `available_credit >= 15000` and `status == active`.
  3. `credit-service` inserts hold record; decrements `available_credit` by ₹15,000.
  4. Returns `holdId` and success status to `orders-service`.
  5. Upon order placement success, `orders-service` invokes `/commit`, turning the hold into a formal credit debt.
- **Alternate / Degraded Flow**:
  - *Order Placement Fails*: `orders-service` invokes `/release`; `credit-service` restores the ₹15,000 headroom immediately.
- **Postconditions**: Merchant debt increased; available credit reduced; double-entry booking triggered.

### 3. User Journey Stories
- **US-08.02.01 [READY]**: *As a village merchant, I want my credit purchase authorized instantly at checkout without waiting for manual approvals, so that my delivery orders are processed without delay.*

#### Acceptance Criteria (Gherkin)
```gherkin
Scenario: Synchronous credit hold and commit
  Given merchant "mer_01" with available credit ₹30,000
  When orders-service requests a hold for ₹12,000
  Then credit-service grants hold "hld_99" and updates available credit to ₹18,000
  When orders-service commits hold "hld_99"
  Then hold status changes to "committed" and debt increases by ₹12,000
```

### 4. Integration Stories
- **INT-08.02.01 [READY] (Orders Service Two-Phase Hold Integration)**: *As the Credit Service, I need to provide idempotent `/holds`, `/commit`, and `/release` endpoints for `orders-service` to ensure zero lost or phantom credit balances.*
- **INT-08.02.02 [READY] (Finance Service Ledger Integration)**: *As the Credit Service, I need to notify `finance-service` (`:4009`) upon hold commit to book Trade Receivable vs Supplier Payable.*

### 5. Multi-Client Implementation Stories
- **PWA-08.02.01 [READY] (Web PWA Credit Checkout Flow)**: *Implement merchant wholesale checkout screen (`MER-05`) in `web/m/` displaying real-time available headroom and synchronous trade credit payment selection.*
- **AND-08.02.01 [READY] (Android Native Credit Checkout)**: *Build native Android wholesale checkout flow in `android/` with instant credit hold validation and error handling for limit exhaustion.*
- **IOS-08.02.01 [READY] (iOS Native Credit Checkout)**: *Build native iOS wholesale checkout flow in `ios/` with trade credit hold validation.*

### 6. PWA Cloud Testing Story
- **TEST-08.02.PWA [READY] (PWA Cloud E2E Test on Test Project)**: *Automated Playwright test executing credit checkout order placement, two-phase hold commit, and headroom balance decrement on PWA against `credit-service` on `logikchain-test`.*

### 7. Independent Support Stories
- **OPS-08.02.01 [READY] (High-Performance Concurrency Locks)**: *Configure strict transactional isolation (`REPEATABLE READ`) in PostgreSQL for hold operations to prevent concurrent overdrafts.*
- **DOC-08.02.01 [READY] (Two-Phase Commit Technical Specs)**: *Document failure recovery protocol if network drops between hold and commit calls.*
- **TEST-08.02.01 [READY] (Bruno & Concurrency Tests)**: *Execute automated Bruno test `tests/bruno/08-credit/creditHold/` and concurrency test simulating 10 parallel checkout requests against limited headroom.*

### 8. Deployment & Cloud Verification (Acceptance Criteria & Commands)
- **Cloud Run Microservice Deployment Command**:
  ```bash
  docker build -t asia-south1-docker.pkg.dev/logikchain-test/logikchain-microservices/credit-service:latest -f microservices/services/credit-service/Dockerfile.service microservices/services/credit-service
  docker push asia-south1-docker.pkg.dev/logikchain-test/logikchain-microservices/credit-service:latest
  gcloud run deploy credit-service \
    --image=asia-south1-docker.pkg.dev/logikchain-test/logikchain-microservices/credit-service:latest \
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
  npx playwright test tests/e2e/pwa/credit-hold-commit.spec.ts --project=test --config=playwright.pwa.config.ts
  ```
- **Acceptance Criteria**:
  - [ ] Backend microservice running on Google Cloud Run in `logikchain-test` with `200 OK` on `/health`.
  - [ ] Web PWA deployed to Firebase Hosting on `logikchain-test` communicating through API Gateway.
  - [ ] Android & iOS builds compile and connect to `logikchain-test`.
  - [ ] Automated PWA E2E tests pass 100% assertions on test project URL.

---

## FEAT-08.03: Credit Repayment Collection & Post-Due Relief

### 1. Feature Metadata & Hierarchy
- **Feature ID**: `FEAT-08.03`
- **Feature Status**: [READY]
- **Functional Scope**: Partial/full credit repayments (via visiting driver cash or online UPI), scheduled overdue relief, and credit freezing.
- **Service Endpoints**: `POST /v1/credit/repayments/initiate` (`initiateCreditRepayment`), `POST /v1/credit/repayments/confirm` (`confirmCreditRepayment`), `POST /v1/credit/relief:run` (`postDueCreditRelief`)
- **UI Screens**: [MER-07 Repayments](file:///c:/Users/Admin/Downloads/logikchain/logikchain.com/constitution/wireframes/Merchant.md#MER-07), [VEH-05 In-Person Repayment](file:///c:/Users/Admin/Downloads/logikchain/logikchain.com/constitution/wireframes/Vehicle.md#VEH-05)

### 2. Derived Use Cases
#### UC-08.03.A: In-Person Cash Repayment to Visiting Driver & Headroom Restoration
- **Description**: Village merchant gives ₹10,000 cash to visiting driver to clear outstanding credit balance; driver confirms receipt and credit headroom is restored immediately.
- **Primary Actor**: Village Merchant (`role: merchant`) and Vehicle Driver (`role: driver`).
- **Nominal Flow**:
  1. Merchant opens `MER-07` and selects "Pay Visiting Driver".
  2. Driver verifies cash on `VEH-05` and enters collected amount.
  3. Client posts to `confirmCreditRepayment`.
  4. `credit-service` decreases merchant debt by ₹10,000 and increments `available_credit` by ₹10,000.
  5. `credit-service` notifies `cash-service` (`:4007`) to record driver cash custody.
  6. Outbox event emitted; merchant receives instant digital repayment receipt.
- **Postconditions**: Merchant debt reduced; headroom restored; driver cash custody incremented.

### 3. User Journey Stories
- **US-08.03.01 [READY]**: *As a village merchant, I want to hand over cash repayments to the delivery driver and see my available credit restored immediately on my phone, so that I can place my next wholesale order right away.*

#### Acceptance Criteria (Gherkin)
```gherkin
Scenario: In-person credit repayment restores available headroom
  Given merchant "mer_01" has debt ₹20,000 and available credit ₹10,000
  When driver confirms in-person cash collection of ₹10,000
  Then credit-service reduces debt to ₹10,000 and increases available credit to ₹20,000
  And calls cash-service to add ₹10,000 to driver cash custody
```

### 4. Integration Stories
- **INT-08.03.01 [READY] (Cash Service Custody Integration)**: *As the Credit Service, I need to call `cash-service` (`:4007`) upon in-person cash repayments to register physical currency custody with the collecting driver.*
- **INT-08.03.02 [READY] (Payments Service UPI Repayment Integration)**: *As the Credit Service, I need to accept payment capture callbacks from `payments-service` (`:4005`) for online digital credit repayments.*

### 5. Multi-Client Implementation Stories
- **PWA-08.03.01 [READY] (Web PWA Credit Repayment & Statement Portal)**: *Build repayment interface on `web/m/` (`MER-07`) with UPI gateway integration, dynamic QR display, and downloadable ledger statement.*
- **AND-08.03.01 [READY] (Android Native Cash Repayment Handover)**: *Implement merchant in-person payment trigger on `android/` (`MER-07`) and driver collection receipt on `VEH-05` with instant headroom restoration.*
- **IOS-08.03.01 [READY] (iOS Native Cash Repayment Handover)**: *Implement merchant in-person payment trigger on `ios/` (`MER-07`) and driver collection receipt on `VEH-05`.*

### 6. PWA Cloud Testing Story
- **TEST-08.03.PWA [READY] (PWA Cloud E2E Test on Test Project)**: *Automated Playwright test verifying credit repayment via UPI/cash, headroom restoration, and overdue relief status on PWA against `credit-service` on `logikchain-test`.*

### 7. Independent Support Stories
- **OPS-08.03.01 [READY] (Cloud Scheduler Hourly Cron)**: *Configure Cloud Scheduler cron job invoking `postDueCreditRelief` hourly to evaluate aging balances and apply overdue grace periods.*
- **DOC-08.03.01 [READY] (Aging & Relief Policies)**: *Document aging buckets (0-14 days: Current, 15-30 days: Overdue Grace, 30+ days: Frozen) and interest calculation formulas.*
- **TEST-08.03.01 [READY] (Bruno API Automation)**: *Create automated Bruno test `tests/bruno/08-credit/repayment/` verifying headroom math and partial repayment handling.*

### 8. Deployment & Cloud Verification (Acceptance Criteria & Commands)
- **Cloud Run Microservice Deployment Command**:
  ```bash
  docker build -t asia-south1-docker.pkg.dev/logikchain-test/logikchain-microservices/credit-service:latest -f microservices/services/credit-service/Dockerfile.service microservices/services/credit-service
  docker push asia-south1-docker.pkg.dev/logikchain-test/logikchain-microservices/credit-service:latest
  gcloud run deploy credit-service \
    --image=asia-south1-docker.pkg.dev/logikchain-test/logikchain-microservices/credit-service:latest \
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
  npx playwright test tests/e2e/pwa/credit-repayment-relief.spec.ts --project=test --config=playwright.pwa.config.ts
  ```
- **Acceptance Criteria**:
  - [ ] Backend microservice running on Google Cloud Run in `logikchain-test` with `200 OK` on `/health`.
  - [ ] Web PWA deployed to Firebase Hosting on `logikchain-test` communicating through API Gateway.
  - [ ] Android & iOS builds compile and connect to `logikchain-test`.
  - [ ] Automated PWA E2E tests pass 100% assertions on test project URL.
