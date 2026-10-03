# EPIC-01: Identity, Authentication & Role Lifecycle

## 1. Functional Area Alignment & Microservice Metadata
- **Epic ID**: `EPIC-01`
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
- **US-01.01.01**: *As an unauthenticated citizen, I want to authenticate using my 10-digit phone number and an SMS OTP, so that I can securely log into Logikchain without needing an email or password.*
- **US-01.01.02**: *As an authenticated user opening the app, I want the client to inspect my verified custom claims, so that I am automatically directed to my designated workspace (Buyer, Merchant, Driver, Supplier, or Support).*

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
- **INT-01.01.01 (Firebase Auth Integration)**: *As the Identity Service, I need to integrate with the Firebase Admin Auth SDK to set and refresh custom user claims (`role`, `status`, `officialClient`) upon user registration and claim modification.*
- **INT-01.01.02 (Firestore Periodic Sync Integration)**: *As the Identity Service, I need to synchronize `identity_db.user_profiles` to Cloud Firestore collection `/UserProfiles/{uid}` via the periodic sync engine every 2000ms.*
- **INT-01.01.03 (API Gateway Context Header Integration)**: *As the Identity Service, I need to ingest pre-validated user identity headers (`x-user-uid`, `x-user-role`, `x-client-platform`) injected by the API Gateway after App Check and JWT verification.*

### 5. Independent Support Stories
- **OPS-01.01.01 (DevOps & Deployment)**: *Implement multi-stage Docker build (`Dockerfile.service`), non-root Alpine runtime, Kubernetes deployment (`03-identity.yaml`), database migration for `identity_db`, and readiness probe `GET /health`.*
- **DOC-01.01.01 (Contract & Runbook Documentation)**: *Publish OpenAPI 3.0 specification for authentication bootstrap endpoints, token lifecycle sequence diagrams, and claim synchronization failure runbooks.*
- **TEST-01.01.01 (Automation Test Suite)**: *Implement automated Bruno API collection `tests/bruno/01-identity/bootstrap/`, Vitest unit test suite with $\ge 90\%$ branch coverage, and multi-attempt rate-limiting validation.*

---

## FEAT-01.02: Regional Supplier Organization Provisioning

### 1. Feature Metadata & Hierarchy
- **Feature ID**: `FEAT-01.02`
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
- **US-01.02.01**: *As a Support Administrator, I want to register a new verified supplier organization with regional configuration parameters, so that they can manage distribution routes, inventory, and field fleets.*

#### Acceptance Criteria (Gherkin)
```gherkin
Scenario: Support provisions valid supplier entity
  Given an authenticated Support user with claim "role: support"
  When a POST is made to "/v1/suppliers" with valid supplier metadata
  Then identity-service responds with status 201 Created and generated supplierId
  And the user record is provisioned with custom claim "role: supplier"
```

### 4. Integration Stories
- **INT-01.02.01 (Config Service Integration)**: *As the Identity Service, I need to query `config-service` (`:4010`) to validate country, state, and district IDs during supplier provisioning.*
- **INT-01.02.02 (Firestore Sync Integration)**: *As the Identity Service, I need to mirror newly provisioned suppliers to Firestore `/Suppliers/{id}` via outbox sync.*

### 5. Independent Support Stories
- **OPS-01.02.01 (DevOps & Database Schema)**: *Execute SQL migration adding `suppliers` table with foreign key constraints, unique GSTIN indices, and automated outbox trigger.*
- **DOC-01.02.01 (OpenAPI Documentation)**: *Document `POST /v1/suppliers` request/response schemas, error taxonomy (`DUPLICATE_GSTIN`), and access policies.*
- **TEST-01.02.01 (Bruno API Automation)**: *Create Bruno automated test `tests/bruno/01-identity/createSupplier/` with automated cleanup teardown.*

---

## FEAT-01.03: Progressive Role Conversion & Multi-Client Handoff

### 1. Feature Metadata & Hierarchy
- **Feature ID**: `FEAT-01.03`
- **Functional Scope**: Elevating active buyer accounts to merchant or driver roles and coordinating runtime handoff between PWA, Android, and iOS.
- **Service Endpoints**: `POST /v1/buyers/{buyerId}/role`, `POST /v1/merchants/{merchantId}:disassociate`
- **UI Screens**: [SHR-06 Role Splash](file:///c:/Users/Admin/Downloads/logikchain/logikchain.com/constitution/wireframes/Shared.md#SHR-06), [SUP-08 Member Directory](file:///c:/Users/Admin/Downloads/logikchain/logikchain.com/constitution/wireframes/Supplier.md)

### 2. Derived Use Cases
#### UC-01.03.A: Buyer Elevation to Merchant or Driver
- **Description**: An existing buyer is vetted and elevated by an authorized supplier to become a local merchant or vehicle driver.
- **Primary Actor**: Regional Supplier (`role: supplier`).
- **Target Subject**: Active Buyer (`usr_xxx`).
- **Nominal Flow**:
  1. Supplier selects verified buyer on `SUP-08` and designates target role (`merchant` or `vehicle`).
  2. `identity-service` updates `user_profiles.role` in `identity_db` and refreshes Firebase Auth custom claims.
  3. If elevated to `vehicle` (driver), `officialClient` is set to `android`.
  4. On subsequent session launch, PWA displays screen `SHR-06` with deep links to launch the official Android application.

### 3. User Journey Stories
- **US-01.03.01**: *As a supplier, I want to convert an existing buyer into an authorized merchant or driver, so that our field logistics network expands with trusted local individuals.*
- **US-01.03.02**: *As a converted driver using the Web PWA, I want to be presented with an immediate deep link to the Android Play Store, so that I can perform field custody handovers on the official native runtime.*

#### Acceptance Criteria (Gherkin)
```gherkin
Scenario: Supplier elevates buyer to vehicle driver
  Given an authenticated supplier with claim "role: supplier"
  When the supplier posts to "/v1/buyers/usr_123/role" with targetRole "vehicle"
  Then identity-service updates user custom claims to { role: "vehicle", officialClient: "android" }
  And the Web PWA locks custody actions and presents the Android deep-link modal
```

### 4. Integration Stories
- **INT-01.03.01 (Firebase Auth Custom Claims Integration)**: *As the Identity Service, I need to invalidate existing JWT claims and assign new role tokens using `admin.auth().setCustomUserClaims()`.*
- **INT-01.03.02 (Firestore Outbox Sync Integration)**: *As the Identity Service, I need to sync updated role definitions to `/UserProfiles/{id}` for real-time mobile listener triggers.*

### 5. Independent Support Stories
- **OPS-01.03.01 (DevOps Scripting)**: *Verify zero-downtime database updates during role alterations and validate PostgreSQL indexing on `user_profiles(role, supplier_id)`.*
- **DOC-01.03.01 (Role Transition Architecture Docs)**: *Document state transition matrix and client capabilities per role in `constitution/`.*
- **TEST-01.03.01 (Bruno & Unit Tests)**: *Execute role change automation in `tests/bruno/01-identity/convertBuyerToRole/` verifying unauthorized role escalation blocks.*

---

## FEAT-01.04: User Suspension & Account Governance Lifecycle

### 1. Feature Metadata & Hierarchy
- **Feature ID**: `FEAT-01.04`
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
- **US-01.04.01**: *As a Support operator, I want to suspend a compromised or non-compliant user account across the entire platform, so that further transactions are blocked immediately.*
- **US-01.04.02**: *As an operator, I want to restore an account once discrepancies are settled, so that legitimate business activities can resume promptly.*

#### Acceptance Criteria (Gherkin)
```gherkin
Scenario: Platform suspension locks client session
  Given an authenticated Support operator
  When POST "/v1/users/usr_456/suspension" is executed with scope "platform"
  Then user profile status is set to "suspended"
  And all subsequent API calls from "usr_456" return HTTP 403 Forbidden
```

### 4. Integration Stories
- **INT-01.04.01 (Governance Service Integration)**: *As the Identity Service, I need to send suspension telemetry events to `governance-service` (`:4011`) for audit compliance and AML risk scoring.*
- **INT-01.04.02 (Firebase Token Revocation Integration)**: *As the Identity Service, I need to invoke `admin.auth().revokeRefreshTokens(uid)` to force immediate logout across all active client devices.*

### 5. Independent Support Stories
- **OPS-01.04.01 (DevOps & Audit Logging)**: *Configure DB triggers logging suspension state changes into an immutable audit table in `identity_db`.*
- **DOC-01.04.01 (Compliance Documentation)**: *Publish operational standard operating procedures (SOP) for suspension escalation and restoration criteria.*
- **TEST-01.04.01 (Automated Test Suite)**: *Implement Bruno test `tests/bruno/01-identity/suspendUser/` verifying supplier permission boundary checks.*
