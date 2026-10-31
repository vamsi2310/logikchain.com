# EPIC-01: Identity, Authentication & Role Lifecycle

## 1. Functional Area Alignment & Microservice Metadata
- **Epic ID**: `EPIC-01`
- **Epic Status**: [IN_PROGRESS]
- **Functional Area**: Identity, Access Management & Role Governance
- **Bound Microservice**: `microservices/services/identity-service`
- **Container Port**: `4001`
- **Database**: `identity_db` (PostgreSQL with outbox event streaming)
- **Primary Runtimes**: Web PWA (`web/index.html`), Android (`logikchain-android`), iOS (`logikchain-ios`), API Gateway
- **Primary Responsibilities**: User onboarding, Firebase Auth token validation, custom claims lifecycle (`role`, `status`, `officialClient`), role conversions, multi-client routing, user profile metadata, and operational/platform account suspensions.

---

## FEAT-01.01: Phone OTP Authentication & Custom Claims Bootstrap

### 1. Feature Metadata & Hierarchy
- **Feature ID**: `FEAT-01.01`
- **Feature Status**: [IN_PROGRESS]
- **Functional Scope**: Phone number SMS OTP authentication, user registration bootstrap, and custom claims token decoration.
- **Service Endpoints**: `POST /v1/auth/bootstrap`, `GET /v1/users/me`
- **UI Screens**: [SHR-01 Splash](file:///c:/Users/Admin/Downloads/logikchain/logikchain.com/constitution/wireframes/Shared.md#SHR-01), [SHR-02 Login](file:///c:/Users/Admin/Downloads/logikchain/logikchain.com/constitution/wireframes/Shared.md#SHR-02), [SHR-04 OTP](file:///c:/Users/Admin/Downloads/logikchain/logikchain.com/constitution/wireframes/Shared.md#SHR-04)

### 2. Derived Use Cases
#### UC-01.01.A: Rural Phone OTP Login & Role Bootstrapping
- **Description**: A rural citizen or merchant logs into the mobile app or PWA using their phone number without a password.
- **Primary Actor**: Unauthenticated Citizen / Merchant / Driver / Supplier.
- **Secondary Systems**: Firebase Auth (Phone Provider), Telephony Gateway, `identity-service`.
- **Preconditions**: User has an active SIM card capable of receiving SMS messages.
- **Nominal Flow**:
  1. Actor inputs 10-digit mobile number and triggers OTP dispatch.
  2. Telephony provider sends 6-digit cryptographic OTP.
  3. Actor enters OTP; client exchanges verification code with Firebase Auth for a JWT ID token.
  4. Client invokes `identity-service` bootstrap endpoint via the API Gateway.
  5. `identity-service` checks `identity_db.user_profiles`. If new, it creates a record with default `role: buyer` and `status: approved`.
  6. `identity-service` sets Firebase Auth custom claims `{ role: 'buyer', status: 'approved', officialClient: 'pwa' }`.
  7. Client receives refreshed token and routes actor to the Buyer Home Screen.
- **Alternate / Degraded Flow**:
  - *Invalid OTP*: Display error with attempts remaining counter (max 3 tries).
  - *Rate Limited*: Enforce 15-minute exponential backoff after 3 consecutive failures.
- **Postconditions**: Auth session active; user profile persisted in `identity_db`; outbox event queued for Firestore sync.

### 3. User Journey Stories
- **US-01.01.01 [IN_PROGRESS]**: *As an unauthenticated citizen, I want to authenticate using my 10-digit phone number and an SMS OTP, so that I can securely log into Logikchain without needing an email or password.*
- **US-01.01.02 [IN_PROGRESS]**: *As an authenticated user opening the app, I want the client to inspect my verified custom claims, so that I am automatically directed to my designated workspace (Buyer, Merchant, Driver, Supplier, or Support).*

#### Acceptance Criteria (Gherkin)
```gherkin
Scenario: Successful phone authentication and claims bootstrap
  Given an unauthenticated user on screen "SHR-02"
  When the user submits mobile number "+919876543210" and requests OTP
  Then screen "SHR-04" displays with a 60-second resend countdown
  When the user enters valid OTP "482910"
  Then the session is authenticated
  And identity-service issues custom claims { role: "buyer", status: "approved" }
  And the client redirects to the buyer dashboard
```

### 4. Integration Stories
- **INT-01.01.01 [IN_PROGRESS] (Firebase Auth Integration)**: *As the Identity Service, I need to integrate with the Firebase Admin Auth SDK to set and refresh custom user claims (`role`, `status`, `officialClient`) upon user registration and claim modification.*
- **INT-01.01.02 [IN_PROGRESS] (Firestore Periodic Sync Integration)**: *As the Identity Service, I need to synchronize `identity_db.user_profiles` to Cloud Firestore collection `/UserProfiles/{uid}` via the periodic sync engine every 2000ms.*
- **INT-01.01.03 [IN_PROGRESS] (API Gateway Context Header Integration)**: *As the Identity Service, I need to ingest pre-validated user identity headers (`x-user-uid`, `x-user-role`, `x-client-platform`) injected by the API Gateway after App Check and JWT verification.*

### 5. Multi-Client Implementation Stories
- **PWA-01.01.01 [IN_PROGRESS] (Web PWA Client)**: *Implement phone input (`SHR-02`), reCAPTCHA Enterprise verification, 60s countdown timer, and 6-digit OTP input (`SHR-04`) with token bootstrap calling API Gateway.*
- **AND-01.01.01 [IN_PROGRESS] (Android Native Client)**: *Implement Jetpack Compose phone auth screen with Play Integrity token generation, SMS Retriever API auto-fill, and biometric keystore session caching in `android/`.*
- **IOS-01.01.01 [IN_PROGRESS] (iOS Native Client)**: *Implement SwiftUI phone auth screen with Apple DeviceCheck token attestation, SMS auto-complete textContentType, and Keychain secure token storage in `ios/`.*

### 6. PWA Cloud Testing Story
- **TEST-01.01.PWA [IN_PROGRESS] (PWA Cloud E2E Test on Test Project)**: *Automated Playwright test validating full phone OTP login, custom claims bootstrap, and buyer dashboard redirection against backend microservices deployed on Google Cloud test project (`logikchain-test`).*

### 7. Independent Support Stories
- **OPS-01.01.01 [IN_PROGRESS] (DevOps & Deployment)**: *Implement multi-stage Docker build (`Dockerfile.service`), non-root Alpine runtime, Kubernetes deployment (`03-identity.yaml`), database migration for `identity_db`, and readiness probe `GET /health`.*
- **DOC-01.01.01 [IN_PROGRESS] (Contract & Runbook Documentation)**: *Publish OpenAPI 3.0 specification for authentication bootstrap endpoints, token lifecycle sequence diagrams, and claim synchronization failure runbooks.*
- **TEST-01.01.01 [IN_PROGRESS] (Automation Test Suite)**: *Implement automated Bruno API collection `tests/bruno/01-identity/bootstrap/`, Vitest unit test suite with $\ge 90\%$ branch coverage, and multi-attempt rate-limiting validation.*

### 8. Deployment & Cloud Verification (Acceptance Criteria & Commands)
- **Cloud Run Microservice Deployment Command**:
  ```bash
  docker build -t asia-south1-docker.pkg.dev/logikchain-test/logikchain-microservices/identity-service:latest -f microservices/services/identity-service/Dockerfile.service microservices/services/identity-service
  docker push asia-south1-docker.pkg.dev/logikchain-test/logikchain-microservices/identity-service:latest
  gcloud run deploy identity-service \
    --image=asia-south1-docker.pkg.dev/logikchain-test/logikchain-microservices/identity-service:latest \
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
  npx playwright test tests/e2e/pwa/auth-bootstrap.spec.ts --project=test --config=playwright.pwa.config.ts
  ```
- **Acceptance Criteria**:
  - [ ] `identity-service` deployed to Cloud Run in `logikchain-test` and reports `status: "healthy"` on `GET /health`.
  - [ ] Web PWA deployed to Firebase Hosting on `logikchain-test` and successfully authenticates phone OTP via Google Cloud API Gateway.
  - [ ] Android & iOS builds compile and connect to `logikchain-test` with valid platform attestation.
  - [ ] Automated PWA E2E tests pass 100% assertions on test project URL.

---

## FEAT-01.02: Regional Supplier Organization Provisioning

### 1. Feature Metadata & Hierarchy
- **Feature ID**: `FEAT-01.02`
- **Feature Status**: [IN_PROGRESS]
- **Functional Scope**: Vetted B2B supplier organization creation, geographical jurisdiction binding, and administrator credentials generation.
- **Service Endpoints**: `POST /v1/suppliers`, `GET /v1/suppliers/{supplierId}`
- **UI Screens**: [SPT-02 Supplier Management](file:///c:/Users/Admin/Downloads/logikchain/logikchain.com/constitution/wireframes/Support.md)

### 2. Derived Use Cases
#### UC-01.02.A: Regional Supplier Onboarding & Credential Generation
- **Description**: A Platform Support Administrator provisions a vetted regional agricultural or wholesale supplier organization.
- **Primary Actor**: Support Administrator (`role: support`).
- **Secondary Systems**: `identity-service`, Firebase Auth Admin, `config-service`.
- **Preconditions**: Support Administrator is authenticated with valid custom claim `role: support`.
- **Nominal Flow**:
  1. Support Administrator navigates to `SPT-02` and enters Supplier legal name, GSTIN, business email, phone, and target Country ID.
  2. Support Administrator submits provisioning payload.
  3. `identity-service` verifies GSTIN/Phone uniqueness in `identity_db.suppliers`.
  4. `identity-service` creates supplier organization and admin user record.
  5. `identity-service` sets Firebase Auth custom claims `{ role: 'supplier', supplierId: 'sup_xxx', status: 'approved' }`.
  6. Outbox event emitted for Firestore mirror and audit log recording.
- **Postconditions**: Supplier active; credentials dispatched via secure channel; record mirrored in `/Suppliers/{id}`.

### 3. User Journey Stories
- **US-01.02.01 [READY]**: *As a Support Administrator, I want to register a new verified supplier organization with regional configuration parameters, so that they can manage distribution routes, inventory, and field fleets.*
- **US-01.02.02 [READY]**: *As a Support operator acting as a supplier proxy, I want to perform all supplier-side data management actions (fleet setup, member directory, gig scheduling) on behalf of a supplier organization, so that suppliers who outsource their operations remain fully functional on the platform.*

#### Acceptance Criteria (Gherkin)
```gherkin
Scenario: Support provisions valid supplier entity
  Given an authenticated Support user with claim "role: support"
  When a POST is made to "/v1/suppliers" with valid supplier metadata
  Then identity-service responds with status 201 Created and generated supplierId
  And the user record is provisioned with custom claim "role: supplier"
```

### 4. Integration Stories
- **INT-01.02.01 [READY] (Config Service Integration)**: *As the Identity Service, I need to query `config-service` (`:4010`) to validate country, state, and district IDs during supplier provisioning.*
- **INT-01.02.02 [READY] (Firestore Sync Integration)**: *As the Identity Service, I need to mirror newly provisioned suppliers to Firestore `/Suppliers/{id}` via outbox sync.*

### 5. Multi-Client Implementation Stories
- **PWA-01.02.01 [READY] (Web PWA Client)**: *Implement Supplier Management console view (`SPT-02`) with supplier registration form, GSTIN auto-formatting, regional jurisdiction dropdowns, and submission validation.*
- **AND-01.02.01 [READY] (Android Native Client)**: *Implement read-only regional supplier profile sheet and emergency support contact cards in Android support module.*
- **IOS-01.02.01 [READY] (iOS Native Client)**: *Implement SwiftUI supplier profile card and regional distribution contact sheet in iOS support module.*

### 6. PWA Cloud Testing Story
- **TEST-01.02.PWA [READY] (PWA Cloud E2E Test on Test Project)**: *Automated Playwright test validating supplier organization registration from Support PWA console against `identity-service` and `config-service` deployed on `logikchain-test`.*

### 7. Independent Support Stories
- **OPS-01.02.01 [READY] (DevOps & Database Schema)**: *Execute SQL migration adding `suppliers` table with foreign key constraints, unique GSTIN indices, and automated outbox trigger.*
- **DOC-01.02.01 [IN_PROGRESS] (OpenAPI Documentation)**: *Document `POST /v1/suppliers` request/response schemas, error taxonomy (`DUPLICATE_GSTIN`), and access policies.*
- **TEST-01.02.01 [READY] (Bruno API Automation)**: *Create Bruno automated test `tests/bruno/01-identity/createSupplier/` with automated cleanup teardown.*

### 8. Deployment & Cloud Verification (Acceptance Criteria & Commands)
- **Cloud Run Microservice Deployment Command**:
  ```bash
  docker build -t asia-south1-docker.pkg.dev/logikchain-test/logikchain-microservices/identity-service:latest -f microservices/services/identity-service/Dockerfile.service microservices/services/identity-service
  docker push asia-south1-docker.pkg.dev/logikchain-test/logikchain-microservices/identity-service:latest
  gcloud run deploy identity-service \
    --image=asia-south1-docker.pkg.dev/logikchain-test/logikchain-microservices/identity-service:latest \
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
  npx playwright test tests/e2e/pwa/supplier-provisioning.spec.ts --project=test --config=playwright.pwa.config.ts
  ```
- **Acceptance Criteria**:
  - [ ] `identity-service` running in `logikchain-test` and successfully handles `POST /v1/suppliers`.
  - [ ] Web PWA deployed to Firebase Hosting on `logikchain-test` with Support portal capable of creating organizations.
  - [ ] Automated PWA E2E test creates test supplier and validates Firestore sync with 0 failures.

---

## FEAT-01.03: Progressive Role Conversion & Multi-Client Handoff

### 1. Feature Metadata & Hierarchy
- **Feature ID**: `FEAT-01.03`
- **Feature Status**: [IN_PROGRESS]
- **Functional Scope**: Elevating active buyer accounts to merchant or driver roles and coordinating runtime handoff between PWA, Android, and iOS.
- **Service Endpoints**: `POST /v1/buyers/{buyerId}/role`, `POST /v1/merchants/{merchantId}:disassociate`
- **UI Screens**: [SHR-06 Role Splash](file:///c:/Users/Admin/Downloads/logikchain/logikchain.com/constitution/wireframes/Shared.md#SHR-06), [SUP-08 Member Directory](file:///c:/Users/Admin/Downloads/logikchain/logikchain.com/constitution/wireframes/Supplier.md)

### 2. Derived Use Cases
#### UC-01.03.A: Buyer Elevation to Merchant or Driver
- **Description**: An existing buyer is vetted and elevated by an authorized supplier to become a local merchant or vehicle driver.
- **Primary Actor**: Regional Supplier (`role: supplier`) or Support Operator (`role: support`) acting as proxy with `X-Supplier-Context` header.
- **Target Subject**: Active Buyer (`usr_xxx`).
- **Nominal Flow**:
  1. Supplier selects verified buyer on `SUP-08` and designates target role (`merchant` or `vehicle`).
  2. `identity-service` updates `user_profiles.role` in `identity_db` and refreshes Firebase Auth custom claims.
  3. If elevated to `vehicle` (driver), `officialClient` is set to `android`.
  4. On subsequent session launch, PWA displays screen `SHR-06` with deep links to launch the official Android application.

### 3. User Journey Stories
- **US-01.03.01 [READY]**: *As a supplier (or Support operator acting as supplier proxy), I want to convert an existing buyer into an authorized merchant or driver, so that our field logistics network expands with trusted local individuals.*
- **US-01.03.02 [READY]**: *As a converted driver using the Web PWA, I want to be presented with an immediate deep link to the Android Play Store, so that I can perform field custody handovers on the official native runtime.*

#### Acceptance Criteria (Gherkin)
```gherkin
Scenario: Supplier elevates buyer to vehicle driver
  Given an authenticated supplier with claim "role: supplier"
  When the supplier posts to "/v1/buyers/usr_123/role" with targetRole "vehicle"
  Then identity-service updates user custom claims to { role: "vehicle", officialClient: "android" }
  And the Web PWA locks custody actions and presents the Android deep-link modal
```

### 4. Integration Stories
- **INT-01.03.01 [READY] (Firebase Auth Custom Claims Integration)**: *As the Identity Service, I need to invalidate existing JWT claims and assign new role tokens using `admin.auth().setCustomUserClaims()`.*
- **INT-01.03.02 [READY] (Firestore Outbox Sync Integration)**: *As the Identity Service, I need to sync updated role definitions to `/UserProfiles/{id}` for real-time mobile listener triggers.*

### 5. Multi-Client Implementation Stories
- **PWA-01.03.01 [READY] (Web PWA Client)**: *Implement Supplier Member Directory (`SUP-08`) with role promotion modal, and implement Role Splash screen (`SHR-06`) redirecting elevated drivers to Android Play Store.*
- **AND-01.03.01 [READY] (Android Native Client)**: *Implement deep-link receiver (`logikchain://app/role-handoff`) handling auto-login and opening the Driver Gig Navigation dashboard.*
- **IOS-01.03.01 [READY] (iOS Native Client)**: *Implement Universal Link handling (`https://app.logikchain.com/role-handoff`) directing promoted merchants to the Merchant Wholesale Catalog.*

### 6. PWA Cloud Testing Story
- **TEST-01.03.PWA [READY] (PWA Cloud E2E Test on Test Project)**: *Automated Playwright test validating role elevation on `SUP-08` and verifying that the promoted driver account receives `SHR-06` runtime handoff prompt on `logikchain-test`.*

### 7. Independent Support Stories
- **OPS-01.03.01 [READY] (DevOps Scripting)**: *Verify zero-downtime database updates during role alterations and validate PostgreSQL indexing on `user_profiles(role, supplier_id)`.*
- **DOC-01.03.01 [IN_PROGRESS] (Role Transition Architecture Docs)**: *Document state transition matrix and client capabilities per role in `constitution/`.*
- **TEST-01.03.01 [READY] (Bruno & Unit Tests)**: *Execute role change automation in `tests/bruno/01-identity/convertBuyerToRole/` verifying unauthorized role escalation blocks.*

### 8. Deployment & Cloud Verification (Acceptance Criteria & Commands)
- **Cloud Run Microservice Deployment Command**:
  ```bash
  docker build -t asia-south1-docker.pkg.dev/logikchain-test/logikchain-microservices/identity-service:latest -f microservices/services/identity-service/Dockerfile.service microservices/services/identity-service
  docker push asia-south1-docker.pkg.dev/logikchain-test/logikchain-microservices/identity-service:latest
  gcloud run deploy identity-service \
    --image=asia-south1-docker.pkg.dev/logikchain-test/logikchain-microservices/identity-service:latest \
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
  npx playwright test tests/e2e/pwa/role-conversion.spec.ts --project=test --config=playwright.pwa.config.ts
  ```
- **Acceptance Criteria**:
  - [ ] Role conversion endpoint deployed on Cloud Run test instance.
  - [ ] Promoted user claims refresh in Firebase Auth within 500ms on `logikchain-test`.
  - [ ] PWA displays `SHR-06` handoff modal when accessed by driver role.
  - [ ] Automated PWA E2E tests pass 100% assertions on test project URL.

---

## FEAT-01.04: User Suspension & Account Governance Lifecycle

### 1. Feature Metadata & Hierarchy
- **Feature ID**: `FEAT-01.04`
- **Feature Status**: [IN_PROGRESS]
- **Functional Scope**: Temporary or permanent account suspension, fraud lockdown, and reinstatement workflows.
- **Service Endpoints**: `POST /v1/users/{userId}/suspension`, `DELETE /v1/users/{userId}/suspension`
- **UI Screens**: [SPT-03 User Detail](file:///c:/Users/Admin/Downloads/logikchain/logikchain.com/constitution/wireframes/Support.md), [SHR-05 Account Blocked](file:///c:/Users/Admin/Downloads/logikchain/logikchain.com/constitution/wireframes/Shared.md#SHR-05)

### 2. Derived Use Cases
#### UC-01.04.A: Multi-Level Account Suspension & Restoration
- **Description**: Support or Suppliers suspend accounts for unresolved cash shortfalls or compliance breaches.
- **Primary Actor**: Support Operator (`role: support`) or Supplier (`role: supplier`).
- **Nominal Flow**:
  1. Operator submits suspension payload specifying scope (`operational` or `platform`), reason code, and idempotency key.
  2. `identity-service` enforces scope permissions (Suppliers can only suspend `operational` scope; Support can suspend `platform` scope).
  3. `identity-service` updates status to `suspended` in `identity_db` and Firebase Auth claims.
  4. Active sessions are terminated, and client locks to screen `SHR-05`.

### 3. User Journey Stories
- **US-01.04.01 [READY]**: *As a Support operator, I want to suspend a compromised or non-compliant user account across the entire platform, so that further transactions are blocked immediately.*
- **US-01.04.02 [READY]**: *As an operator, I want to restore an account once discrepancies are settled, so that legitimate business activities can resume promptly.*
- **US-01.04.03 [READY]**: *As a Support operator, I want to view and edit a user's full profile — including contact details, role, linked supplierId, and service eligibility — from `SPT-03`, so that account corrections can be made without a code deployment or direct database intervention.*

#### Acceptance Criteria (Gherkin)
```gherkin
Scenario: Platform suspension locks client session
  Given an authenticated Support operator
  When POST "/v1/users/usr_456/suspension" is executed with scope "platform"
  Then user profile status is set to "suspended"
  And all subsequent API calls from "usr_456" return HTTP 403 Forbidden
```

### 4. Integration Stories
- **INT-01.04.01 [READY] (Governance Service Integration)**: *As the Identity Service, I need to send suspension telemetry events to `governance-service` (`:4011`) for audit compliance and AML risk scoring.*
- **INT-01.04.02 [READY] (Firebase Token Revocation Integration)**: *As the Identity Service, I need to invoke `admin.auth().revokeRefreshTokens(uid)` to force immediate logout across all active client devices.*

### 5. Multi-Client Implementation Stories
- **PWA-01.04.01 [READY] (Web PWA Client)**: *Implement Account Blocked modal (`SHR-05`) with dispute resolution support contact action, and Support User Detail suspension controls (`SPT-03`).*
- **AND-01.04.01 [READY] (Android Native Client)**: *Implement fullscreen non-dismissible lockout activity (`SHR-05`) clearing local cached tokens when suspension push notification arrives.*
- **IOS-01.04.01 [READY] (iOS Native Client)**: *Implement SwiftUI lockout view (`SHR-05`) with emergency support call button when token revocation status is detected.*

### 6. PWA Cloud Testing Story
- **TEST-01.04.PWA [READY] (PWA Cloud E2E Test on Test Project)**: *Automated Playwright test verifying that a suspended user is barred from placing orders and instantly redirected to `SHR-05` on `logikchain-test`.*

### 7. Independent Support Stories
- **OPS-01.04.01 [READY] (DevOps & Audit Logging)**: *Configure DB triggers logging suspension state changes into an immutable audit table in `identity_db`.*
- **DOC-01.04.01 [IN_PROGRESS] (Compliance Documentation)**: *Publish operational standard operating procedures (SOP) for suspension escalation and restoration criteria.*
- **TEST-01.04.01 [READY] (Automated Test Suite)**: *Implement Bruno test `tests/bruno/01-identity/suspendUser/` verifying supplier permission boundary checks.*

### 8. Deployment & Cloud Verification (Acceptance Criteria & Commands)
- **Cloud Run Microservice Deployment Command**:
  ```bash
  docker build -t asia-south1-docker.pkg.dev/logikchain-test/logikchain-microservices/identity-service:latest -f microservices/services/identity-service/Dockerfile.service microservices/services/identity-service
  docker push asia-south1-docker.pkg.dev/logikchain-test/logikchain-microservices/identity-service:latest
  gcloud run deploy identity-service \
    --image=asia-south1-docker.pkg.dev/logikchain-test/logikchain-microservices/identity-service:latest \
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
  npx playwright test tests/e2e/pwa/account-suspension.spec.ts --project=test --config=playwright.pwa.config.ts
  ```
- **Acceptance Criteria**:
  - [ ] `identity-service` suspension and revocation endpoints operational on Cloud Run test instance.
  - [ ] Suspended user sessions invalidated across test environment.
  - [ ] PWA displays `SHR-05` lockout page and rejects protected API routes with `403`.
  - [ ] Automated PWA E2E tests pass 100% assertions on test project URL.

---

## FEAT-01.05: Supplier-Delegated Support Access & Subscription Entitlement Gate

### 1. Feature Metadata & Hierarchy
- **Feature ID**: `FEAT-01.05`
- **Feature Status**: [DONE]
- **Functional Scope**: Subscription-plan-gated delegated administration, supplier-initiated support permission grants, time-bound session lifecycles, and gateway permission verification for `X-Supplier-Context`.
- **Service Endpoints**:
  - `POST /v1/suppliers/me/delegated-support/grants` (`createDelegatedSupportGrant`)
  - `GET /v1/suppliers/me/delegated-support/status` (`getDelegatedSupportStatus`)
  - `DELETE /v1/suppliers/me/delegated-support/grants/{grantId}` (`revokeDelegatedSupportGrant`)
  - `GET /v1/support/suppliers/{supplierId}/delegated-access-check` (`verifyDelegatedAccess`)
- **UI Screens**: [SUP-01 Supplier Account Settings](file:///c:/Users/Admin/Downloads/logikchain/logikchain.com/constitution/wireframes/Supplier.md#SUP-01), [SPT-01 Operations Dashboard](file:///c:/Users/Admin/Downloads/logikchain/logikchain.com/constitution/wireframes/Support.md#SPT-01)

### 2. Derived Use Cases

#### UC-01.05.A: Subscription-Gated Delegated Support Permission Grant
- **Description**: A supplier on an eligible subscription tier (e.g. Growth or Enterprise tier with `delegated_support_enabled: true`) views the "Delegated Support Access" panel in their settings. When encountering operational issues or requesting managed circuit planning, the supplier explicitly grants Support permission to act on their behalf for a selected duration (24 Hours, 7 Days, or Until Revoked).
- **Primary Actor**: Supplier Admin (`role: supplier`).
- **Nominal Flow**:
  1. Supplier opens Account Settings on `SUP-01`.
  2. System checks `config-service` subscription entitlements. If `delegated_support_enabled == true`, displays the "Support Access" card (otherwise hidden or showing an upgrade badge).
  3. Supplier taps "Grant Support Access", selects duration (e.g. 48 hours), enters ticket reference (e.g. "TICK-842: Circuit route setup assistance"), and confirms.
  4. Client invokes `POST /v1/suppliers/me/delegated-support/grants`.
  5. `identity-service` creates a record in `identity_db.supplier_delegated_support_grants` with status `active` and calculated `expires_at`.
  6. Outbox event emitted; Firestore mirror updated.
- **Postconditions**: Active grant established; Support operators authorized to pass `X-Supplier-Context: {supplierId}` until expiry or revocation.

#### UC-01.05.B: Gateway Delegated Support Verification & Rejection Gate
- **Description**: A Support operator selects a supplier in the Support console proxy dropdown (`SPT-01`). The API Gateway and Identity Service verify that the supplier has an active grant and valid subscription plan before permitting requests.
- **Primary Actor**: Support Operator (`role: support`).
- **Nominal Flow**:
  1. Support operator activates proxy mode for `sup_krishna_agro` on `SPT-01`.
  2. Client attaches `X-Supplier-Context: sup_krishna_agro` to subsequent requests.
  3. API Gateway calls `identity-service` cache to verify authorization:
     - Is the supplier's subscription active and entitled?
     - Does an active, unexpired grant exist from `sup_krishna_agro`?
  4. If valid: Gateway injects `x-delegated-grant-id` and forwards request.
  5. If invalid/expired/not granted: Gateway immediately rejects request with `403 Forbidden` (`SUPPLIER_DELEGATED_ACCESS_NOT_GRANTED`).
- **Postconditions**: Support actions strictly gated by supplier permission; unauthorized impersonation impossible.

### 3. User Journey Stories
- **US-01.05.01 [READY]**: *As a supplier on an eligible subscription plan, I want to grant time-bound administrative access to Logikchain Support from my settings, so that support engineers can configure my delivery circuits and troubleshoot issues without sharing passwords.*
- **US-01.05.02 [READY]**: *As a supplier, I want the delegated support configuration strictly hidden or locked if my subscription tier does not include managed support, so that premium operational services are properly monetized.*
- **US-01.05.03 [READY]**: *As a supplier who granted support access, I want to revoke permission with one click at any time, so that I retain full sovereignty over my business operations.*

#### Acceptance Criteria (Gherkin)
```gherkin
Scenario: Supplier grants 48-hour support access
  Given supplier "sup_01" on "Growth Tier" subscription with delegated_support_enabled = true
  When supplier creates a support grant for 48 hours with ticket "TICK-901"
  Then identity-service creates active grant with expires_at = NOW() + 48 hours
  And Support operators can access sup_01 workspace via X-Supplier-Context

Scenario: Basic tier supplier cannot grant delegated support
  Given supplier "sup_basic" on "Starter Tier" with delegated_support_enabled = false
  When supplier visits SUP-01 settings
  Then the delegated support toggle displays "Upgrade to Growth Tier to enable Delegated Support"
  And requests to create a grant are rejected with 403 FORBIDDEN

Scenario: Support proxy blocked when grant is absent or expired
  Given Support operator attempting request with "X-Supplier-Context: sup_unauthorized"
  When supplier has no active grant
  Then API Gateway rejects request with 403 Forbidden ("SUPPLIER_DELEGATED_ACCESS_NOT_GRANTED")
```

### 4. Integration Stories
- **INT-01.05.01 [READY] (Config Service Subscription Entitlement Check)**: *As the Identity Service, I need to query `config-service` (`:4010`) to verify that the supplier's active subscription plan includes `delegated_support_enabled` before accepting grant creation.*
- **INT-01.05.02 [READY] (API Gateway Grant Verification Middleware)**: *As the Identity Service, I need to provide high-performance in-memory grant lookups to the API Gateway to validate `X-Supplier-Context` headers in sub-5ms.*

### 5. Multi-Client Implementation Stories
- **PWA-01.05.01 [READY] (Web PWA Supplier Delegated Support Panel)**: *Build Delegated Support Access grant card on `SUP-01` (`web/s/`) with duration picker, active session countdown timer, and 1-click Revoke button.*
- **AND-01.05.01 [READY] (Android Native Supplier Delegated Access Sheet)**: *Build native Android settings screen in `android/` allowing suppliers to grant and revoke support access.*
- **IOS-01.05.01 [READY] (iOS Native Supplier Delegated Access View)**: *Build native iOS settings view for delegated support management.*

### 6. Independent Support Stories
- **DOC-01.05.01 [READY] (Delegated Support Administration SOP)**: *Publish operational guide `docs/support-sop/delegated_support_administration.md` detailing supplier grant verification, session etiquette, and customer consent protocols.*
- **OPS-01.05.01 [READY] (PostgreSQL Migration)**: *Create table `identity_db.supplier_delegated_support_grants` with indices on `(supplier_id, status, expires_at)`.*

---

## FEAT-01.06: User Profile Lifecycle, Cloud Media Storage & KYC Onboarding

### 1. Feature Metadata & Hierarchy
- **Feature ID**: `FEAT-01.06`
- **Feature Status**: [IN_PROGRESS]
- **Functional Scope**:
  - Complete user profile query and mutation APIs (`GET /v1/users/me`, `GET /v1/users/{userId}`, `PATCH /v1/users/{userId}`).
  - First-time user onboarding wizard (`setupIncomplete`), capturing display name, village binding (`villageId`), primary Kirana merchant selection (`selectedMerchantId`), and preferred language (`locale`: `te` / `hi` / `en`).
  - Secure Cloud Media upload handshake via Google Cloud Storage pre-signed URLs for profile pictures (`avatar.webp`), Kirana storefronts, driver licenses, and vehicle registration documents.
  - Role-specific profile extensions (Merchant shop details & GPS, Driver vehicle payload & license, Supplier GSTIN & PAN).
  - Transactional Outbox synchronization to Cloud Firestore collection `/UserProfiles/{uid}` for real-time mobile listeners.
  - Bidirectional sync with Firebase Auth (`displayName`, `photoURL`).
- **Service Endpoints**:
  - `GET /v1/users/me` (`getCurrentUserProfile`)
  - `GET /v1/users/{userId}` (`getUserProfileById`)
  - `PATCH /v1/users/{userId}` (`updateUserProfile`)
  - `POST /v1/users/{userId}/device-tokens` (`registerDeviceToken`)
  - `POST /v1/users/{userId}/avatar/upload-url` (`generateAvatarUploadSignedUrl`)
  - `POST /v1/users/{userId}/documents/upload-url` (`generateDocumentUploadSignedUrl`)
- **UI Screens**:
  - [SHR-07 User Profile & Settings](file:///c:/Users/Admin/Downloads/logikchain/logikchain.com/constitution/wireframes/Shared.md) (`web/src/apps/shell/screens/AccountScreens.tsx`)
  - `BUY-00 First-Time Setup Wizard` (`/setup` / `web/src/apps/buyer/screens/SetupScreens.tsx`)
  - [MER-01 Merchant Profile & Storefront Config](file:///c:/Users/Admin/Downloads/logikchain/logikchain.com/constitution/wireframes/Merchant.md#MER-01) (`/m/profile` / `web/src/apps/merchant/screens/MerchantScreens.tsx`)
  - [SPT-03 User Detail Console](file:///c:/Users/Admin/Downloads/logikchain/logikchain.com/constitution/wireframes/Support.md#SPT-03) (`/x/users/{id}` / `web/src/apps/support/screens/SupportScreens.tsx`)

### 2. Derived Use Cases

#### UC-01.06.A: First-Time User Onboarding & Rural Persona Setup
- **Description**: A new user signs in via SMS OTP. Because their profile record in `identity_db.user_profiles` is newly created, the client detects `setupIncomplete == true` and directs them to the multi-step onboarding wizard.
- **Primary Actor**: Authenticated Citizen / Merchant (`role: buyer` or `role: merchant`).
- **Secondary Systems**: `identity-service` (`:4001`), `config-service` (`:4010`), Cloud Firestore.
- **Nominal Flow**:
  1. User authenticates via OTP and lands on `/setup` (`BUY-00`).
  2. Step 1: User enters their full name and selects interface language (Telugu, Hindi, or English).
  3. Step 2: User selects their District and Village from the geo-catalog.
  4. Step 3: System displays verified Kirana merchants servicing that village; user designates their primary delivery drop hub (`selectedMerchantId`).
  5. Client calls `PATCH /v1/users/{userId}` with `{ name, villageId, selectedMerchantId, locale }`.
  6. `identity-service` updates PostgreSQL `user_profiles`, updates Firebase Auth `displayName`, and emits an outbox event.
  7. Client transitions to Buyer Home (`BUY-01`).
- **Postconditions**: User profile fully populated; `setupIncomplete` transitions to `false`; mirrored in `/UserProfiles/{uid}`.

#### UC-01.06.B: Profile Mutation & Outbox CDC Replication
- **Description**: An existing user updates their contact details, address, notification preferences, or device tokens. The mutation must be saved transactionally in PostgreSQL and replicated to Firestore for live offline caching.
- **Primary Actor**: Any Authenticated User or Support Administrator.
- **Nominal Flow**:
  1. User navigates to Account Settings (`SHR-07`) and modifies profile fields (e.g. delivery address, phone, notification preferences).
  2. Client submits `PATCH /v1/users/{userId}` to API Gateway with Authorization Bearer token.
  3. Gateway validates JWT and App Check token; injects `x-user-uid` and `x-user-role`.
  4. `identity-service` verifies authorization (Caller must be target user OR Support operator):
     - Validates payload attributes (sanitizes text, enforces max 128 characters).
     - Begins PostgreSQL transaction: updates `identity_db.user_profiles` and inserts record into `outbox_events`.
     - Commits transaction.
  5. Within 2000ms, the CDC Periodic Syncer polls `outbox_events` and writes batch updates to Firestore `/UserProfiles/{userId}`.
  6. Real-time Firestore snapshot listeners on all active devices update UI state immediately.
- **Postconditions**: PostgreSQL updated as system of record; Firestore replicated; zero staleness across mobile and web.

#### UC-01.06.C: Cloud Storage Pre-Signed URL Media Handshake
- **Description**: User updates their profile avatar, or a merchant/driver uploads verification documents (shop facade, driving license). Direct binary streaming through backend microservices is avoided in favor of direct-to-cloud signed uploads.
- **Primary Actor**: Authenticated User.
- **Secondary Systems**: `identity-service`, Google Cloud Storage (`gs://logikchain-media`), Cloud CDN.
- **Nominal Flow**:
  1. User selects an image on mobile/PWA; client resizes and converts to WebP format client-side.
  2. Client requests signed upload URL: `POST /v1/users/{userId}/avatar/upload-url` with `{ contentType: "image/webp", sizeBytes: 145020 }`.
  3. `identity-service` validates MIME type (`image/webp`, `image/jpeg`, `image/png`) and file size ($\le 2$ MB).
  4. `identity-service` invokes Google Cloud Storage SDK to generate a v4 signed `PUT` URL with a 5-minute expiration for path `gs://logikchain-media/profiles/{userId}/avatar.webp`.
  5. Client uploads the binary payload directly to Google Cloud Storage via HTTP `PUT`.
  6. Upon HTTP 200 response from Storage, client calls `PATCH /v1/users/{userId}` with `{ photoUrl: "https://media.logikchain.com/profiles/{userId}/avatar.webp" }`.
  7. `identity-service` updates PostgreSQL `user_profiles` and calls `admin.auth().updateUser(userId, { photoURL })`.
- **Postconditions**: Media asset securely persisted in Cloud Storage; profile record references public CDN URL.

### 3. User Journey Stories
- **US-01.06.01 [READY]**: *As a new user logging into Logikchain for the first time, I want a streamlined onboarding wizard to set my name, language, village, and kirana merchant, so that my shopping and delivery experience is immediately customized to my village.*
- **US-01.06.02 [READY]**: *As an authenticated user, I want to view and edit my personal details, address, and notification preferences from the account settings screen, so that my contact information remains accurate.*
- **US-01.06.03 [READY]**: *As a user, driver, or merchant, I want to upload a profile photo or verification document directly to secure cloud storage, so that my profile is recognized across the field delivery network.*
- **US-01.06.04 [READY]**: *As a Support operator, I want to view any user's profile and KYC verification status on `SPT-03`, so that I can assist with address corrections, language switches, or profile troubleshooting.*

#### Acceptance Criteria (Gherkin)
```gherkin
Scenario: Authenticated user updates profile information
  Given an authenticated user "usr_1001" with active session
  When the user submits PATCH "/v1/users/usr_1001" with name "Ravi Kumar" and locale "te"
  Then identity-service updates user_profiles in identity_db with name "Ravi Kumar" and locale "te"
  And records an outbox event for Firestore collection "/UserProfiles/usr_1001"
  And updates Firebase Auth user displayName to "Ravi Kumar"
  And responds with status 200 OK and the updated profile object

Scenario: User requests signed URL for profile avatar upload
  Given an authenticated user "usr_1001"
  When user submits POST "/v1/users/usr_1001/avatar/upload-url" with contentType "image/webp" and sizeBytes 512000
  Then identity-service generates a Google Cloud Storage v4 signed PUT URL expiring in 300 seconds
  And response includes uploadUrl and final publicMediaUrl "https://media.logikchain.com/profiles/usr_1001/avatar.webp"

Scenario: Unprivileged user cannot modify another user's profile
  Given an authenticated buyer "usr_1001" without Support privileges
  When user attempts PATCH "/v1/users/usr_2002" with new data
  Then identity-service rejects the request with HTTP 403 Forbidden and error "PERMISSION_DENIED"
```

### 4. Integration Stories
- **INT-01.06.01 [READY] (Google Cloud Storage Pre-Signed URL Generator)**: *As the Identity Service, I need to integrate with Google Cloud Storage SDK (`@google-cloud/storage`) to issue cryptographically signed v4 upload URLs with strict MIME type and file size boundaries.*
- **INT-01.06.02 [READY] (Firestore Real-Time UserProfile Outbox Replication)**: *As the Identity Service, I need to replicate all profile mutations to Cloud Firestore collection `/UserProfiles/{uid}` via transactional outbox sync within the 2000ms SLA.*
- **INT-01.06.03 [READY] (Firebase Auth User Profile Synchronization)**: *As the Identity Service, I need to synchronize `displayName` and `photoURL` changes to Firebase Auth via `admin.auth().updateUser(uid, ...)` to keep token attributes aligned.*

### 5. Multi-Client Implementation Stories
- **PWA-01.06.01 [READY] (Web PWA Profile & Setup Wizard)**: *Build onboarding wizard (`BUY-00` / `SetupScreens.tsx`), Account Settings view (`AccountScreens.tsx`), and client-side WebP image cropper/uploader in `web/`.*
- **AND-01.06.01 [READY] (Android Native Profile UI & Room DB Cache)**: *Build Jetpack Compose Profile Screen with Camera/Gallery photo picker, image compression worker, and Room DB `cached_user_profile` table in `android/`.*
- **IOS-01.06.01 [READY] (iOS Native Profile View & SwiftData)**: *Build SwiftUI Profile View with PhotosPicker, image downsampling, and SwiftData local user caching in `ios/`.*

### 6. Independent Support Stories
- **DOC-01.06.01 [READY] (User Profile API & Media Architecture Spec)**: *Publish OpenAPI 3.0 specification for profile queries, mutations, and media handshakes in `docs/architecture/user_profile_and_media_specs.md`.*
- **OPS-01.06.01 [READY] (PostgreSQL User Profiles Indexing & Media Buckets)**: *Configure database indices on `user_profiles(phone_number, role, status)` and set Google Cloud Storage bucket CORS, lifecycle retention, and public CDN caching headers.*
- **TEST-01.06.01 [READY] (Bruno API Automation)**: *Create automated Bruno test collection `tests/bruno/01-identity/profileLifecycle/` validating profile updates, signed URL generation, and unauthorized mutation rejection.*
- **TEST-01.06.PWA [READY] (PWA Cloud E2E Test on Test Project)**: *Automated Playwright cloud test on `logikchain-test` executing full profile onboarding: Phone OTP Login ➔ Onboarding Wizard ➔ Profile Update ➔ Avatar Upload ➔ Real-Time Firestore Listener Verification.*


