# EPIC-11: Platform Governance, Compliance & AML

## 1. Functional Area Alignment & Microservice Metadata
- **Epic ID**: `EPIC-11`
- **Epic Status**: `[READY]`
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
- **Feature Status**: `[READY]`
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
- **Feature Status**: `[READY]`
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

#### Acceptance Criteria (Gherkin)
```gherkin
Scenario: High-velocity transactions trigger AML freeze
  Given user "usr_fraud_01" attempts a 6th transaction within 8 minutes
  When governance-service evaluates AML rules
  Then the transaction is rejected with riskScore 95
  And governance-service invokes identity-service to suspend the user account
```

### 4. Integration Stories
- **INT-11.02.01 [READY] (Identity Service Account Freeze Integration)**: *As the Governance Service, I need to call `identity-service` (`:4001`) to automatically suspend user accounts flagged for AML fraud.*
- **INT-11.02.02 [READY] (Payments Service Interceptor Integration)**: *As the Governance Service, I need to provide sub-50ms REST response times to `payments-service` during synchronous pre-transaction fraud scoring.*

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
- **Feature Status**: `[READY]`
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
