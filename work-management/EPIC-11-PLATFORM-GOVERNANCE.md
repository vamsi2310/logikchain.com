# EPIC-11: Platform Governance, Compliance & AML

## 1. Functional Area Alignment & Microservice Metadata
- **Epic ID**: `EPIC-11`
- **Epic Status**: [DONE]
- **Functional Area**: Platform Governance, NPCI/RBI TPAP Compliance & Anti-Money Laundering (AML)
- **Bound Microservice**: `microservices/services/governance-service`
- **Container Port**: `4011`
- **Database**: `governance_db` (PostgreSQL with outbox event streaming)
- **Primary Runtimes**: Web Support & Compliance Console (`web/x/`), API Gateway, Scheduled Workers
- **Primary Responsibilities**: NPCI/RBI Third-Party Application Provider (TPAP) compliance, VPA lifecycle governance, real-time AML fraud velocity guardrails, T+1 dispute SLA tracking, statutory regulatory reporting, and tamper-proof append-only audit logging.

---

## FEAT-11.01: UPI TPAP Compliance & VPA Lifecycle Governance

### 1. Feature Metadata & Hierarchy
- **Feature ID**: `FEAT-11.01`
- **Feature Status**: [DONE]
- **Functional Scope**: NPCI TPAP guidelines enforcement, Virtual Payment Address (VPA) registration, bank account binding verification, and VPA de-registration.
- **Service Endpoints**: `POST /v1/governance/vpa/register` (`registerVPA`), `POST /v1/governance/vpa/deregister` (`deregisterVPA`), `GET /v1/governance/vpa/{vpa}/verify` (`verifyVPALinkage`)
- **UI Screens**: [SPT-13 Compliance Console](file:///c:/Users/Admin/Downloads/logikchain/logikchain.com/constitution/wireframes/Support.md#SPT-13)

### 2. Derived Use Cases
#### UC-11.01.A: Regulatory VPA Onboarding & Bank Account Linkage Verification
- **Description**: Merchant or Buyer registers a UPI VPA for platform collections/payouts; service validates linkage compliance with NPCI TPAP circulars.
- **Primary Actor**: System (via `payments-service` or `identity-service`) and Compliance Officer (`role: support`).
- **Nominal Flow**:
  1. Actor submits VPA (e.g. `merchant@okhdfcbank`) for registration.
  2. `governance-service` validates VPA syntax, PSP handle authorization, and checks against national fraudulent VPA blacklist.
  3. Service queries PSP verification gateway to ensure device binding and active bank account link.
  4. Persists VPA in `governance_db.registered_vpas` with status `active`.
  5. Cryptographic audit event logged in `audit_events`.
- **Postconditions**: VPA officially certified for TPAP transactions; compliance record established.

### 3. User Journey Stories
- **US-11.01.01 [READY]**: *As a compliance officer, I want all merchant and platform VPAs verified against NPCI TPAP regulations before any transactions occur, so that the platform avoids regulatory penalties or license suspension.*

#### Acceptance Criteria (Gherkin)
```gherkin
Scenario: Register compliant VPA
  Given a valid merchant VPA "krishna_store@icici" with verified device linkage
  When governance-service processes registration
  Then VPA is recorded in governance_db in status "active"
  And an immutable audit event is appended to the compliance log
```

### 4. Integration Stories
- **INT-11.01.01 [READY] (PSP Verification Gateway Integration)**: *As the Governance Service, I need to integrate with authorized PSP TPAP bank verification APIs to confirm VPA ownership and account linkage.*
- **INT-11.01.02 [READY] (Firestore Compliance Sync Integration)**: *As the Governance Service, I need to mirror verified VPA states to Firestore collection `/VerifiedVPAs/{id}`.*

### 5. Multi-Client Implementation Stories
- **PWA-11.01.01 [READY] (Web PWA Compliance & TPAP Console)**: *Build VPA verification dashboard on Support Web PWA (`web/x/` on `SPT-13`) displaying NPCI compliance status, device linkage certs, and blacklist audit log.*
- **AND-11.01.01 [READY] (Android Native VPA Verification Badge)**: *Build native Android merchant VPA certification badge and bank account link status indicator.*
- **IOS-11.01.01 [READY] (iOS Native VPA Verification Badge)**: *Build native iOS merchant VPA certification badge and status indicator.*

### 6. PWA Cloud Testing Story
- **TEST-11.01.PWA [READY] (PWA Cloud E2E Test on Test Project)**: *Automated Playwright test verifying VPA syntax validation, blacklist checks, and regulatory audit logging on PWA against `governance-service` on `logikchain-test`.*

### 7. Independent Support Stories
- **OPS-11.01.01 [READY] (DevOps & Database Schema)**: *Execute PostgreSQL migration for `governance_db.registered_vpas` and configure unique index on `(vpa, status)`.*
- **DOC-11.01.01 [READY] (NPCI TPAP Regulatory Blueprint)**: *Document NPCI procedural guidelines for third-party application providers and VPA lifecycle requirements.*
- **TEST-11.01.01 [READY] (Bruno API Automation)**: *Create automated Bruno test `tests/bruno/11-governance/registerVPA/` testing blacklist rejection rules.*

### 8. Deployment & Cloud Verification (Acceptance Criteria & Commands)
- **Cloud Run Microservice Deployment Command**:
  ```bash
  docker build -t asia-south1-docker.pkg.dev/logikchain-test/logikchain-microservices/governance-service:latest -f microservices/services/governance-service/Dockerfile.service microservices/services/governance-service
  docker push asia-south1-docker.pkg.dev/logikchain-test/logikchain-microservices/governance-service:latest
  gcloud run deploy governance-service \
    --image=asia-south1-docker.pkg.dev/logikchain-test/logikchain-microservices/governance-service:latest \
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
  npx playwright test tests/e2e/pwa/governance-vpa-compliance.spec.ts --project=test --config=playwright.pwa.config.ts
  ```
- **Acceptance Criteria**:
  - [ ] Backend microservice running on Google Cloud Run in `logikchain-test` with `200 OK` on `/health`.
  - [ ] Web PWA deployed to Firebase Hosting on `logikchain-test` communicating through API Gateway.
  - [ ] Android & iOS builds compile and connect to `logikchain-test`.
  - [ ] Automated PWA E2E tests pass 100% assertions on test project URL.

---

## FEAT-11.02: Real-Time AML Fraud Detection & Velocity Guardrails

### 1. Feature Metadata & Hierarchy
- **Feature ID**: `FEAT-11.02`
- **Feature Status**: [DONE]
- **Functional Scope**: Real-time transaction velocity checks, circular transaction ring detection, rapid cash-out prevention, and automated account lockdown.
- **Service Endpoints**: `POST /v1/governance/aml/check` (`runAMLFraudCheck`), `GET /v1/governance/aml/alerts`
- **UI Screens**: [SPT-13 Compliance Alerts](file:///c:/Users/Admin/Downloads/logikchain/logikchain.com/constitution/wireframes/Support.md#SPT-13)

### 2. Derived Use Cases
#### UC-11.02.A: High-Velocity Transaction Interception & Risk Scoring
- **Description**: A user account initiates unusual high-frequency or high-value payment/payout activity; service intercepts and evaluates risk score.
- **Primary Actor**: System (`payments-service`, `payouts-service`) on behalf of User.
- **Nominal Flow**:
  1. `payments-service` or `payouts-service` sends transaction metadata to `runAMLFraudCheck`.
  2. `governance-service` evaluates rules:
     - Velocity: More than 5 transactions within 10 minutes.
     - Single ticket size: Exceeds ₹1,00,000 for rural merchant profile.
     - Device fingerprint: Rapid switching between geographic cells.
  3. If risk score $\ge 80$: Returns `REJECT_AND_FREEZE`.
  4. `governance-service` automatically notifies `identity-service` (`:4001`) to place account in `suspended` status.
  5. Incident ticket created for Support audit on `SPT-13`.
- **Postconditions**: Suspicious transaction blocked; account locked; AML investigation ticket opened.

### 3. User Journey Stories
- **US-11.02.01 [READY]**: *As a fraud risk manager, I want high-velocity fraudulent transaction rings automatically intercepted in real time, so that platform financial losses and chargebacks are prevented.*
- **US-11.02.02 [READY]**: *As a platform compliance auditor, I want every API request executed by Support under `X-Supplier-Context` immutably logged with the operator ID, target supplier ID, grant ID, payload hash, and IP address, so that unauthorized actions or operational errors are undeniably attributable.*

#### Acceptance Criteria (Gherkin)
```gherkin
Scenario: High-velocity transactions trigger AML freeze
  Given user "usr_fraud_01" attempts a 6th transaction within 8 minutes
  When governance-service evaluates AML rules
  Then the transaction is rejected with riskScore 95
  And governance-service invokes identity-service to suspend the user account

Scenario: Support proxy action recorded in immutable audit log
  Given a Support operator "sup_op_04" executing action under grant "grnt_88" for supplier "sup_01"
  When operator modifies delivery route via proxy API
  Then governance-service writes record to governance_db.proxy_audit_trail
  And includes operatorUid, targetSupplierId, grantId, payloadHash, and clientIp
```

### 4. Integration Stories
- **INT-11.02.01 [READY] (Identity Service Account Freeze Integration)**: *As the Governance Service, I need to call `identity-service` (`:4001`) to automatically suspend user accounts flagged for AML fraud.*
- **INT-11.02.02 [READY] (Payments Service Interceptor Integration)**: *As the Governance Service, I need to provide sub-50ms REST response times to `payments-service` during synchronous pre-transaction fraud scoring.*
- **INT-11.02.03 [READY] (Support Proxy Audit Ingestion Integration)**: *As the Governance Service, I need to receive and record proxy action telemetry in `governance_db.proxy_audit_trail` asynchronously from the API Gateway.*

### 5. Multi-Client Implementation Stories
- **PWA-11.02.01 [READY] (Web PWA AML Alert & Incident Console)**: *Build real-time AML alert stream on Support Web PWA (`web/x/` on `SPT-13`) with transaction velocity graphs and 1-click unfreeze controls.*
- **AND-11.02.01 [READY] (Android Native AML Security Banner)**: *Build native Android security freeze warning banner for users flagged by velocity rules.*
- **IOS-11.02.01 [READY] (iOS Native AML Security Banner)**: *Build native iOS security freeze alert screen for flagged accounts.*

### 6. PWA Cloud Testing Story
- **TEST-11.02.PWA [READY] (PWA Cloud E2E Test on Test Project)**: *Automated Playwright test simulating rapid transaction spikes, triggering AML freeze alert, and verifying account lock status on PWA against `governance-service` on `logikchain-test`.*

### 7. Independent Support Stories
- **OPS-11.02.01 [READY] (DevOps & Redis Sliding-Window Rate Limiter)**: *Deploy Redis cluster supporting atomic sliding-window rate tracking for real-time velocity calculations.*
- **DOC-11.02.01 [READY] (AML Fraud Matrix & Thresholds)**: *Publish formal AML risk policy defining threshold matrices, scoring algorithms, and escalation tiers.*
- **TEST-11.02.01 [READY] (Bruno & Benchmark Test Suite)**: *Build automated test in `tests/bruno/11-governance/amlCheck/` validating boundary thresholds and latency limits.*

### 8. Deployment & Cloud Verification (Acceptance Criteria & Commands)
- **Cloud Run Microservice Deployment Command**:
  ```bash
  docker build -t asia-south1-docker.pkg.dev/logikchain-test/logikchain-microservices/governance-service:latest -f microservices/services/governance-service/Dockerfile.service microservices/services/governance-service
  docker push asia-south1-docker.pkg.dev/logikchain-test/logikchain-microservices/governance-service:latest
  gcloud run deploy governance-service \
    --image=asia-south1-docker.pkg.dev/logikchain-test/logikchain-microservices/governance-service:latest \
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
  npx playwright test tests/e2e/pwa/governance-aml-fraud.spec.ts --project=test --config=playwright.pwa.config.ts
  ```
- **Acceptance Criteria**:
  - [ ] Backend microservice running on Google Cloud Run in `logikchain-test` with `200 OK` on `/health`.
  - [ ] Web PWA deployed to Firebase Hosting on `logikchain-test` communicating through API Gateway.
  - [ ] Android & iOS builds compile and connect to `logikchain-test`.
  - [ ] Automated PWA E2E tests pass 100% assertions on test project URL.

---

## FEAT-11.03: Dispute SLA Tracking & Regulatory Reporting

### 1. Feature Metadata & Hierarchy
- **Feature ID**: `FEAT-11.03`
- **Feature Status**: [DONE]
- **Functional Scope**: NPCI-mandated T+1 dispute SLA tracking, customer complaint escalation, audit logging, and automated daily compliance filing.
- **Service Endpoints**: `POST /v1/governance/disputes` (`trackDisputeSLA`), `POST /v1/governance/disputes/{id}/resolve` (`resolveUPIDispute`), `POST /v1/governance/reporting/npci` (`reportToNPCI`)
- **UI Screens**: [SPT-14 Dispute Escalation](file:///c:/Users/Admin/Downloads/logikchain/logikchain.com/constitution/wireframes/Support.md#SPT-14)

### 2. Derived Use Cases
#### UC-11.03.A: Regulatory Dispute SLA Enforcement & NPCI Reporting
- **Description**: Customer files a UPI transaction complaint; service tracks countdown to comply with NPCI's 24-hour turnaround mandate.
- **Primary Actor**: Support Dispute Officer (`role: support`).
- **Nominal Flow**:
  1. Customer raises dispute via UPI banking app; dispute enters `governance-service`.
  2. Service assigns dispute reference and starts strict 24-hour SLA countdown timer.
  3. If dispute approaches 18 hours without resolution: System triggers urgent escalation alert to senior management.
  4. Dispute officer investigates and posts `resolveUPIDispute` with resolution outcome (Refund, Goods Delivered, Fraud).
  5. Nightly job `reportToNPCI` aggregates all dispute resolutions into NPCI standardized XML/JSON regulatory report.
- **Postconditions**: Dispute resolved within statutory timeframe; daily compliance file dispatched to NPCI portal.

### 3. User Journey Stories
- **US-11.03.01 [READY]**: *As a support dispute officer, I want a live countdown timer for all open UPI disputes, so that our team never breaches NPCI's statutory 24-hour turnaround requirement.*

#### Acceptance Criteria (Gherkin)
```gherkin
Scenario: Open dispute tracks 24-hour SLA timer
  Given an incoming UPI dispute "disp_901" received at "10:00:00Z"
  When governance-service ingests dispute
  Then dispute SLA expiry is set to exactly 24 hours later "10:00:00Z + 1 day"
  And status is tracked in governance_db.dispute_sla
```

### 4. Integration Stories
- **INT-11.03.01 [READY] (Payments Service Dispute Forwarding Integration)**: *As the Governance Service, I need to receive automated dispute webhooks forwarded from `payments-service` (`:4005`).*
- **INT-11.03.02 [READY] (NPCI Regulatory Portal Integration)**: *As the Governance Service, I need to package and securely transmit daily settlement and dispute compliance files to NPCI via SFTP/API.*

### 5. Multi-Client Implementation Stories
- **PWA-11.03.01 [READY] (Web PWA Dispute Escalation & SLA Tracker)**: *Build dispute tracking console on Support Web PWA (`web/x/` on `SPT-14`) with live countdown timers, evidence upload, and NPCI report export.*
- **AND-11.03.01 [READY] (Android Native Dispute Status View)**: *Build native Android dispute ticket history and resolution notification screen for users.*
- **IOS-11.03.01 [READY] (iOS Native Dispute Status View)**: *Build native iOS dispute ticket status and push notification handler for users.*

### 6. PWA Cloud Testing Story
- **TEST-11.03.PWA [READY] (PWA Cloud E2E Test on Test Project)**: *Automated Playwright test asserting 24-hour dispute SLA countdown, evidence submission, and NPCI report generation on PWA against `governance-service` on `logikchain-test`.*

### 7. Independent Support Stories
- **OPS-11.03.01 [READY] (Scheduled Compliance Cron)**: *Configure Cloud Scheduler job triggering `reportToNPCI` daily at `23:30:00 UTC`.*
- **DOC-11.03.01 [READY] (Dispute Resolution SOP)**: *Document NPCI customer grievance redressal mechanism and ombudsman escalation paths.*
- **TEST-11.03.01 [READY] (Bruno API Automation)**: *Create automated Bruno test `tests/bruno/11-governance/trackDispute/` verifying SLA date calculations.*

### 8. Deployment & Cloud Verification (Acceptance Criteria & Commands)
- **Cloud Run Microservice Deployment Command**:
  ```bash
  docker build -t asia-south1-docker.pkg.dev/logikchain-test/logikchain-microservices/governance-service:latest -f microservices/services/governance-service/Dockerfile.service microservices/services/governance-service
  docker push asia-south1-docker.pkg.dev/logikchain-test/logikchain-microservices/governance-service:latest
  gcloud run deploy governance-service \
    --image=asia-south1-docker.pkg.dev/logikchain-test/logikchain-microservices/governance-service:latest \
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
  npx playwright test tests/e2e/pwa/governance-dispute-sla.spec.ts --project=test --config=playwright.pwa.config.ts
  ```
- **Acceptance Criteria**:
  - [ ] Backend microservice running on Google Cloud Run in `logikchain-test` with `200 OK` on `/health`.
  - [ ] Web PWA deployed to Firebase Hosting on `logikchain-test` communicating through API Gateway.
  - [ ] Android & iOS builds compile and connect to `logikchain-test`.
  - [ ] Automated PWA E2E tests pass 100% assertions on test project URL.

---

## FEAT-11.04: Platform Terms of Service, Legal Policies & Versioned Consent Engine

### 1. Feature Metadata & Hierarchy
- **Feature ID**: `FEAT-11.04`
- **Feature Status**: [DONE]
- **Functional Scope**: Multi-role legal contracts (Buyer Terms of Sale, Merchant PUDO Agreement, Supplier Master Agreement, Driver Logistics Agreement), versioned clickwrap consent capture, cryptographic audit logging, mandatory policy update re-consent workflows, and statutory disclosures under the Consumer Protection (E-Commerce) Rules 2020.
- **Service Endpoints**:
  - `POST /v1/governance/policies/consent` (`recordPolicyConsent`)
  - `GET /v1/governance/policies/active` (`getActivePlatformPolicies`)
  - `GET /v1/governance/policies/{policyId}/versions/{version}` (`getPolicyVersionDocument`)
- **UI Screens**: [SHR-02 Login](file:///c:/Users/Admin/Downloads/logikchain/logikchain.com/constitution/wireframes/Shared.md#SHR-02), [BUY-05 Checkout](file:///c:/Users/Admin/Downloads/logikchain/logikchain.com/constitution/wireframes/Buyer.md#BUY-05), [MER-04 Restock](file:///c:/Users/Admin/Downloads/logikchain/logikchain.com/constitution/wireframes/Merchant.md#MER-04), [SPT-13 Compliance Console](file:///c:/Users/Admin/Downloads/logikchain/logikchain.com/constitution/wireframes/Support.md#SPT-13)

### 2. Derived Use Cases

#### UC-11.04.A: Multi-Role Versioned Clickwrap Policy Consent & Audit Trail
- **Description**: Users across all four commercial roles (Buyer, Merchant, Driver, Supplier) must explicitly consent to role-specific terms and conditions, order deliverable rules, return policies, and privacy terms prior to onboarding or transacting. Consent is cryptographically recorded in `governance_db.policy_consents`.
- **Primary Actor**: Any platform user (`buyer`, `merchant`, `driver`, `supplier`).
- **Nominal Flow**:
  1. User initiates registration on `SHR-02` or checkout on `BUY-05`.
  2. UI displays mandatory clickwrap checkbox with links to in-app policy modals.
  3. User checks agreement box and submits action.
  4. Client attaches `policyVersionHash` and invokes `POST /v1/governance/policies/consent`.
  5. `governance-service` logs immutable audit record with `{ userId, role, policyId, policyVersion, consentedAt, ipAddress, userAgent, clientRuntime }`.
  6. Service returns validation token allowing transaction to proceed.
- **Postconditions**: User consent established and legally provable; audit entry recorded.

#### UC-11.04.B: Mandatory Policy Update Re-Consent Gate
- **Description**: When platform legal terms or operational policies (such as transit damage liability or return windows) are updated with a new major/minor version, users are gated on their next app session until the revised terms are reviewed and accepted.
- **Primary Actor**: System & Authenticated User.
- **Nominal Flow**:
  1. Legal/Support publishes updated policy version (e.g. `POL-RETURNS-v2.1`).
  2. On next user app launch, `identity-service` calls `governance-service` during `/auth/bootstrap`.
  3. System detects user has only consented to `v1.0`.
  4. App presents non-dismissible Policy Update Sheet highlighting changed clauses.
  5. User accepts new terms; consent recorded; normal app dashboard unlocked.
- **Postconditions**: Full user base re-baselined to active legal terms without breaking session state.

### 3. User Journey Stories
- **US-11.04.01 [READY]**: *As an unauthenticated citizen or merchant signing up, I want clear, accessible clickwrap links to the platform Terms of Service, Privacy Policy, and Return Policy, so that I can provide informed consent before account creation.*
- **US-11.04.02 [READY]**: *As a compliance auditor, I want every user consent event recorded immutably with timestamp, user ID, IP address, client runtime, and policy version hash, so that legal enforceability is guaranteed in case of dispute.*
- **US-11.04.03 [READY]**: *As a platform administrator updating legal terms (e.g. delivery fee or liability revisions), I want existing users prompted with a re-consent modal on their next app launch, so that updated contractual obligations are legally binding.*

#### Acceptance Criteria (Gherkin)
```gherkin
Scenario: Buyer accepts terms at order checkout
  Given an authenticated buyer placing order on "BUY-05"
  When buyer checks "I accept Order Deliverables & Return Policy v2.0"
  Then governance-service records consent in governance_db.policy_consents
  And orders-service allows checkout submission to complete

Scenario: Outdated user session intercepted by policy re-consent gate
  Given a merchant with recorded consent for "POL-MER-v1.0"
  When legal team publishes "POL-MER-v2.0"
  Then next merchant app launch triggers modal "Review Updated Partner Terms"
  And blocks order creation until user taps "Accept Updated Terms"
```

### 4. Integration Stories
- **INT-11.04.01 [READY] (Identity Service Consent Gate Integration)**: *As the Governance Service, I need to provide a consent status check API to `identity-service` (`:4001`) during claims bootstrap to inject an `unacceptedPolicies` claim if legal terms are outstanding.*
- **INT-11.04.02 [READY] (Firestore Policy Mirror Integration)**: *As the Governance Service, I need to mirror active policy texts and version hashes to Firestore collection `/PlatformPolicies/{id}` for zero-latency client reading.*

### 5. Multi-Client Implementation Stories
- **PWA-11.04.01 [READY] (Web PWA Clickwrap & Policy Modal)**: *Build responsive Policy Viewer Drawer and Clickwrap components on PWA across `web/b/`, `web/m/`, `web/s/`, and `web/x/`.*
- **AND-11.04.01 [READY] (Android Native Policy Sheet & Offline Reader)**: *Build Jetpack Compose legal terms viewer bottom-sheet in `android/` with cached policy markdown rendering.*
- **IOS-11.04.01 [READY] (iOS Native Policy Sheet & Offline Reader)**: *Build SwiftUI legal terms sheet in `ios/` with markdown formatting.*

### 6. Independent Support Stories
- **DOC-11.04.01 [READY] (Master Legal Policy Catalog)**: *Publish formal documents `docs/compliance/platform_terms_of_service.md`, `docs/compliance/privacy_data_protection_policy.md`, and `docs/compliance/intermediary_guidelines_disclosure.md`.*
- **OPS-11.04.01 [READY] (PostgreSQL Migration)**: *Execute PostgreSQL migration for `governance_db.policy_consents` and `governance_db.platform_policies`.*

