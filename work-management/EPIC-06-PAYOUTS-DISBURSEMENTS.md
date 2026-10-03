# EPIC-06: Payouts, Disbursements & Beneficiary Banking

## 1. Functional Area Alignment & Microservice Metadata
- **Epic ID**: `EPIC-06`
- **Epic Status**: [READY]
- **Functional Area**: Payouts, Disbursements & Field Remuneration
- **Bound Microservice**: `microservices/services/payouts-service`
- **Container Port**: `4006`
- **Database**: `payouts_db` (PostgreSQL with outbox event streaming)
- **Primary Runtimes**: Web Support Console (`web/x/`), Android (`logikchain-android` - Driver), API Gateway
- **Primary Responsibilities**: Driver earnings withdrawal, supplier settlement disbursements, Google Cloud KMS envelope encryption for bank account and IFSC numbers, Cloud Tasks asynchronous queue draining, bank transfer reconciliation, and payout failure retry workflows.

---

## FEAT-06.01: Beneficiary Registration & KMS Account Encryption

### 1. Feature Metadata & Hierarchy
- **Feature ID**: `FEAT-06.01`
- **Feature Status**: [READY]
- **Functional Scope**: Secure bank account & UPI VPA onboarding, Penny-drop validation, and Cloud KMS envelope encryption at rest.
- **Service Endpoints**: `POST /v1/payouts/beneficiaries` (`registerPayoutBeneficiary`), `POST /v1/payouts/beneficiaries/{id}:block`
- **UI Screens**: [VEH-07 Driver Earnings](file:///c:/Users/Admin/Downloads/logikchain/logikchain.com/constitution/wireframes/Vehicle.md#VEH-07), [SUP-08 Bank Profile](file:///c:/Users/Admin/Downloads/logikchain/logikchain.com/constitution/wireframes/Supplier.md#SUP-08)

### 2. Derived Use Cases
#### UC-06.01.A: Bank Beneficiary Registration with Cloud KMS Envelope Encryption
- **Description**: A driver or supplier registers their bank account for weekly payouts; sensitive account details are KMS-encrypted before database storage.
- **Primary Actor**: Driver (`role: vehicle`) or Supplier (`role: supplier`).
- **Secondary Systems**: `payouts-service`, Google Cloud KMS, RazorpayX Penny-drop API.
- **Preconditions**: User is authenticated with approved identity profile.
- **Nominal Flow**:
  1. User inputs bank account number, account holder name, and IFSC code on `VEH-07`.
  2. `payouts-service` invokes Penny-Drop API to verify account validity and match name against KYC record.
  3. `payouts-service` calls Google Cloud KMS to generate a Data Encryption Key (DEK).
  4. Account number and IFSC are encrypted with DEK; ciphertext and encrypted DEK stored in `payouts_db.beneficiaries`.
  5. Last 4 digits retained as plaintext for UI display (`masked_account`).
  6. Beneficiary marked `verified`.
- **Postconditions**: Beneficiary safely stored; banking PII fully encrypted at rest; ready for automated disbursement.

### 3. User Journey Stories
- **US-06.01.01 [READY]**: *As a delivery driver, I want to securely add my bank account details on my phone, so that my delivery earnings can be directly deposited into my bank account.*
- **US-06.01.02 [READY]**: *As an organization, I want banking details encrypted at rest using Cloud KMS, so that customer financial data is completely secure against database leaks.*

#### Acceptance Criteria (Gherkin)
```gherkin
Scenario: Driver registers bank account with KMS encryption
  Given an authenticated driver "usr_drv_01"
  When driver registers bank account "123456789012" with IFSC "HDFC0001234"
  Then payouts-service verifies account via penny-drop
  And encrypts account number using Google Cloud KMS
  And stores only ciphertext and masked string "********9012" in payouts_db
```

### 4. Integration Stories
- **INT-06.01.01 [READY] (Google Cloud KMS Integration)**: *As the Payouts Service, I need to integrate with Google Cloud Key Management Service (KMS) to encrypt and decrypt sensitive bank account details using hardware-backed cryptographic keys.*
- **INT-06.01.02 [READY] (Penny-Drop Verification Integration)**: *As the Payouts Service, I need to call the banking penny-drop verification API to authenticate beneficiary account existence and name matching before activation.*
- **INT-06.01.03 [READY] (Firestore Sync Integration)**: *As the Payouts Service, I need to mirror masked beneficiary metadata to Firestore collection `/PayoutBeneficiaries/{id}`.*

### 5. Multi-Client Implementation Stories
- **PWA-06.01.01 [READY] (Web PWA Client)**: *Implement Supplier Bank Profile (`SUP-08`) with IFSC code auto-lookup, masked account number preview, and penny-drop verification badge in `web/`.*
- **AND-06.01.01 [READY] (Android Native Client)**: *Implement Driver Earnings & Bank Setup view (`VEH-07`) with account input, IFSC lookup, and local biometric authorization before submission in `android/`.*
- **IOS-06.01.01 [READY] (iOS Native Client)**: *Implement Supplier Bank Profile view with secure field masking and FaceID confirmation.*

### 6. PWA Cloud Testing Story
- **TEST-06.01.PWA [READY] (PWA Cloud E2E Test on Test Project)**: *Automated Playwright test validating bank account onboarding from Supplier PWA, verifying IFSC resolution and KMS encrypted storage against `payouts-service` on `logikchain-test`.*

### 7. Independent Support Stories
- **OPS-06.01.01 [READY] (DevOps & IAM KMS Roles)**: *Configure Kubernetes service account with GCP Workload Identity granting `roles/cloudkms.cryptoKeyEncrypterDecrypter` on key ring `logikchain-banking-keys`.*
- **DOC-06.01.01 [READY] (Banking Data Security Specification)**: *Publish technical documentation of the KMS envelope encryption architecture and PCI/RBI compliance alignment.*
- **TEST-06.01.01 [READY] (Bruno API Automation)**: *Create automated Bruno test `tests/bruno/06-payouts/registerBeneficiary/` verifying that raw account numbers never appear in database dumps.*

### 8. Deployment & Cloud Verification (Acceptance Criteria & Commands)
- **Cloud Run Microservice Deployment Command**:
  ```bash
  docker build -t asia-south1-docker.pkg.dev/logikchain-test/logikchain-microservices/payouts-service:latest -f microservices/services/payouts-service/Dockerfile.service microservices/services/payouts-service
  docker push asia-south1-docker.pkg.dev/logikchain-test/logikchain-microservices/payouts-service:latest
  gcloud run deploy payouts-service \
    --image=asia-south1-docker.pkg.dev/logikchain-test/logikchain-microservices/payouts-service:latest \
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
  npx playwright test tests/e2e/pwa/beneficiary-kms-onboarding.spec.ts --project=test --config=playwright.pwa.config.ts
  ```
- **Acceptance Criteria**:
  - [ ] `payouts-service` running in `logikchain-test` with access to GCP KMS test key ring.
  - [ ] PWA Supplier portal securely submits beneficiary details with 0 plaintext leaks.
  - [ ] Android client registers driver bank details.
  - [ ] Automated PWA E2E tests pass 100% assertions on test project URL.

---

## FEAT-06.02: Driver & Supplier Payout Requests & Approval Workflow

### 1. Feature Metadata & Hierarchy
- **Feature ID**: `FEAT-06.02`
- **Feature Status**: [READY]
- **Functional Scope**: Driver earnings balance validation, withdrawal request creation, threshold validation, and Support review workflow.
- **Service Endpoints**: `POST /v1/payouts/requests` (`requestPayout`), `POST /v1/payouts/requests/{id}/review` (`reviewPayoutRequest`)
- **UI Screens**: [VEH-07 Driver Wallet](file:///c:/Users/Admin/Downloads/logikchain/logikchain.com/constitution/wireframes/Vehicle.md#VEH-07), [SPT-05 Payout Review](file:///c:/Users/Admin/Downloads/logikchain/logikchain.com/constitution/wireframes/Support.md#SPT-05)

### 2. Derived Use Cases
#### UC-06.02.A: Driver Weekly Earnings Withdrawal & Multi-Level Review
- **Description**: Driver requests payout of cleared earnings; system verifies cash custody balances and presents request for review if above threshold.
- **Primary Actor**: Driver (`role: vehicle`) and Support Operator (`role: support`).
- **Nominal Flow**:
  1. Driver navigates to `VEH-07`, views cleared balance (e.g. ₹6,500), and requests withdrawal.
  2. `payouts-service` queries `cash-service` (`:4007`) to verify driver has zero pending cash custody shortfalls.
  3. If request $\le ₹5,000$ and zero discrepancies: Auto-approved.
  4. If request $> ₹5,000$: Status set to `pending_review` and routed to Support on `SPT-05`.
  5. Support reviews payout details and clicks "Approve Payout".
  6. Outbox event emitted; task queued for transfer processing.
- **Postconditions**: Payout request transitioned to `approved`; ready for bank transfer execution.

### 3. User Journey Stories
- **US-06.02.01 [READY]**: *As a delivery driver, I want to withdraw my weekly earnings with one tap, so that I receive my income promptly.*
- **US-06.02.02 [READY]**: *As a Support operator, I want large payout requests flagged for review, so that fraudulent or unverified payouts are prevented.*

#### Acceptance Criteria (Gherkin)
```gherkin
Scenario: Driver requests payout with pending cash discrepancy
  Given driver "usr_drv_01" has ₹5,000 cleared earnings but ₹2,000 unresolved cash shortage
  When driver attempts to request payout
  Then payouts-service rejects request with error "CASH_CUSTODY_DISCREPANCY_UNRESOLVED"
  And locks withdrawal until cash-service clears the shortage
```

### 4. Integration Stories
- **INT-06.02.01 [READY] (Cash Service Custody Check Integration)**: *As the Payouts Service, I need to call `cash-service` (`:4007`) to ensure driver has zero unresolved physical cash shortages before approving a payout.*
- **INT-06.02.02 [READY] (Finance Service Withholding Integration)**: *As the Payouts Service, I need to notify `finance-service` (`:4009`) to compute and deduct statutory TDS (Section 194C / 194O) prior to final approval.*

### 5. Multi-Client Implementation Stories
- **PWA-06.02.01 [READY] (Web PWA Support Review & Supplier Portal)**: *Implement Support Operator payout review dashboard (`SPT-05`) and Supplier withdrawal portal in `web/` with real-time balance queries and threshold warning modals.*
- **AND-06.02.01 [READY] (Android Native Driver Wallet & Withdrawal)**: *Build native Android Jetpack Compose wallet UI (`VEH-07`) in `android/` displaying cleared earnings, cash custody lock alerts, and one-tap withdrawal.*
- **IOS-06.02.01 [READY] (iOS Native Driver Wallet & Withdrawal)**: *Build native iOS SwiftUI wallet UI (`VEH-07`) in `ios/` showing cleared balance, cash custody notices, and withdrawal requests.*

### 6. PWA Cloud Testing Story
- **TEST-06.02.PWA [READY] (PWA Cloud E2E Test on Test Project)**: *Automated Playwright test validating driver payout submission on PWA, threshold validation, and Support review workflow against `payouts-service` on `logikchain-test`.*

### 7. Independent Support Stories
- **OPS-06.02.01 [READY] (DevOps & Database Schema)**: *Execute PostgreSQL migration for `payouts_db.payout_requests` including foreign key constraints and approval audit columns.*
- **DOC-06.02.01 [READY] (Disbursement Threshold Rules)**: *Document threshold rules (auto-approval caps, daily limits) and operator review workflows.*
- **TEST-06.02.01 [READY] (Bruno API Automation)**: *Create Bruno automated test `tests/bruno/06-payouts/requestPayout/` testing boundary conditions and threshold triggers.*

### 8. Deployment & Cloud Verification (Acceptance Criteria & Commands)
- **Cloud Run Microservice Deployment Command**:
  ```bash
  docker build -t asia-south1-docker.pkg.dev/logikchain-test/logikchain-microservices/payouts-service:latest -f microservices/services/payouts-service/Dockerfile.service microservices/services/payouts-service
  docker push asia-south1-docker.pkg.dev/logikchain-test/logikchain-microservices/payouts-service:latest
  gcloud run deploy payouts-service \
    --image=asia-south1-docker.pkg.dev/logikchain-test/logikchain-microservices/payouts-service:latest \
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
  npx playwright test tests/e2e/pwa/payout-request-approval.spec.ts --project=test --config=playwright.pwa.config.ts
  ```
- **Acceptance Criteria**:
  - [ ] Backend microservice running on Google Cloud Run in `logikchain-test` with `200 OK` on `/health`.
  - [ ] Web PWA deployed to Firebase Hosting on `logikchain-test` communicating through API Gateway.
  - [ ] Android & iOS builds compile and connect to `logikchain-test`.
  - [ ] Automated PWA E2E tests pass 100% assertions on test project URL.

---

## FEAT-06.03: Automated Cloud Tasks Payout Execution & Settlement

### 1. Feature Metadata & Hierarchy
- **Feature ID**: `FEAT-06.03`
- **Feature Status**: [READY]
- **Functional Scope**: Rate-limited payout queue execution, Cloud Tasks worker integration, RazorpayX payout disbursement, and settlement logging.
- **Service Endpoints**: `POST /v1/payouts/tasks/transfer` (`initiatePayoutTransfer`), `POST /v1/payouts/settlement`
- **UI Screens**: [VEH-07 Driver Wallet](file:///c:/Users/Admin/Downloads/logikchain/logikchain.com/constitution/wireframes/Vehicle.md#VEH-07), [SPT-05 Support Payout Details](file:///c:/Users/Admin/Downloads/logikchain/logikchain.com/constitution/wireframes/Support.md#SPT-05)

### 2. Derived Use Cases
#### UC-06.03.A: Asynchronous Bank Transfer Execution via Cloud Tasks
- **Description**: Approved payouts are enqueued in Google Cloud Tasks and disbursed through bank payment APIs at controlled rates.
- **Primary Actor**: Cloud Tasks Runner (System).
- **Secondary Systems**: `payouts-service`, Google Cloud Tasks, RazorpayX Payout Gateway, `finance-service`.
- **Nominal Flow**:
  1. Approved payout triggers Cloud Task creation targeting `/v1/payouts/tasks/transfer`.
  2. Cloud Tasks invokes worker endpoint with OIDC authentication token.
  3. `payouts-service` validates OIDC token, decrypts beneficiary bank account using Cloud KMS.
  4. `payouts-service` executes bank transfer API call to RazorpayX.
  5. RazorpayX returns transfer reference; status updated to `settled` in `payouts_db`.
  6. `payouts-service` notifies `finance-service` (`:4009`) to record payout clearing journal entry.
- **Alternate / Degraded Flow**:
  - *Bank Gateway Downtime*: Task returns HTTP 503; Cloud Tasks automatically retries with exponential backoff up to 5 attempts.
- **Postconditions**: Funds disbursed; UTR registered; ledger updated.

### 3. User Journey Stories
- **US-06.03.01 [READY]**: *As a platform administrator, I want payouts disbursed through a rate-limited queue, so that banking gateway rate limits are never exceeded during peak weekly settlements.*

#### Acceptance Criteria (Gherkin)
```gherkin
Scenario: Cloud Task executes bank payout transfer
  Given an approved payout request "pay_req_501"
  When Cloud Tasks invokes "/v1/payouts/tasks/transfer" with valid OIDC token
  Then payouts-service decrypts account details via KMS
  And executes bank transfer through RazorpayX
  And updates status to "settled" with banking UTR reference
```

### 4. Integration Stories
- **INT-06.03.01 [READY] (Google Cloud Tasks Queue Integration)**: *As the Payouts Service, I need to integrate with Google Cloud Tasks API to enqueue approved payout jobs and handle rate-controlled delivery.*
- **INT-06.03.02 [READY] (Banking Disbursement Gateway Integration)**: *As the Payouts Service, I need to call RazorpayX / IMPS Payout API to execute electronic bank transfers.*
- **INT-06.03.03 [READY] (Finance Service Payout Journal Integration)**: *As the Payouts Service, I need to notify `finance-service` (`:4009`) with UTR and TDS details for ledger reconciliation.*

### 5. Multi-Client Implementation Stories
- **PWA-06.03.01 [READY] (Web PWA Disbursement Status & Live UTR Tracker)**: *Implement real-time payout settlement status tracker in `web/` with WebSocket/polling for UTR reference display on Support and Supplier consoles.*
- **AND-06.03.01 [READY] (Android Native Payout Notification & UTR View)**: *Build driver push notification receiver and settlement detail bottom-sheet in `android/` displaying UTR reference and timestamp.*
- **IOS-06.03.01 [READY] (iOS Native Payout Notification & UTR View)**: *Build driver push notification receiver and settlement detail sheet in `ios/` showing UTR reference and bank settlement confirmation.*

### 6. PWA Cloud Testing Story
- **TEST-06.03.PWA [READY] (PWA Cloud E2E Test on Test Project)**: *Automated Playwright test verifying live state transition of payout request to settled with UTR on PWA against `payouts-service` on `logikchain-test`.*

### 7. Independent Support Stories
- **OPS-06.03.01 [READY] (DevOps & Task Queue Configuration)**: *Configure Terraform scripts for Google Cloud Tasks queue `payout-transfer-queue` with max 10 dispatches/sec and dead-letter queue.*
- **DOC-06.03.01 [READY] (Disbursement Sequence Docs)**: *Publish end-to-end sequence diagram detailing KMS decryption, Cloud Task execution, and bank UTR capture.*
- **TEST-06.03.01 [READY] (Automated Test Suite)**: *Build automated Bruno API test in `tests/bruno/06-payouts/transferTask/` validating OIDC token authorization and idempotent re-executions.*

### 8. Deployment & Cloud Verification (Acceptance Criteria & Commands)
- **Cloud Run Microservice Deployment Command**:
  ```bash
  docker build -t asia-south1-docker.pkg.dev/logikchain-test/logikchain-microservices/payouts-service:latest -f microservices/services/payouts-service/Dockerfile.service microservices/services/payouts-service
  docker push asia-south1-docker.pkg.dev/logikchain-test/logikchain-microservices/payouts-service:latest
  gcloud run deploy payouts-service \
    --image=asia-south1-docker.pkg.dev/logikchain-test/logikchain-microservices/payouts-service:latest \
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
  npx playwright test tests/e2e/pwa/payout-tasks-settlement.spec.ts --project=test --config=playwright.pwa.config.ts
  ```
- **Acceptance Criteria**:
  - [ ] Backend microservice running on Google Cloud Run in `logikchain-test` with `200 OK` on `/health`.
  - [ ] Web PWA deployed to Firebase Hosting on `logikchain-test` communicating through API Gateway.
  - [ ] Android & iOS builds compile and connect to `logikchain-test`.
  - [ ] Automated PWA E2E tests pass 100% assertions on test project URL.
