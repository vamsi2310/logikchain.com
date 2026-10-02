# EPIC-01: Identity, Authentication & Role Lifecycle

## Executive Summary
EPIC-01 governs identity provisioning, Firebase Auth phone verification, custom claims lifecycle, role transitions, official client delegation (PWA vs Android), profile data management, and operational/platform suspension controls.

---

## FEAT-01.01: Phone OTP Authentication & Custom Claims Bootstrap

### 1. Hierarchy & Metadata
- **Epic**: `EPIC-01`
- **Feature ID**: `FEAT-01.01`
- **Official Runtimes**: Web PWA (`web/index.html`), Android (`logikchain-android`)
- **Screens**: [SHR-01 Splash](file:///c:/Users/Admin/Downloads/logikchain/logikchain.com/constitution/wireframes/Shared.md#SHR-01), [SHR-02 Login](file:///c:/Users/Admin/Downloads/logikchain/logikchain.com/constitution/wireframes/Shared.md#SHR-02), [SHR-04 OTP](file:///c:/Users/Admin/Downloads/logikchain/logikchain.com/constitution/wireframes/Shared.md#SHR-04)
- **Functions / APIs**: Firebase Auth SDK, `/v1/users/{userId}` bootstrap trigger

### 2. Business Value & Problem Statement
Rural users and logistics actors rely on SMS OTP authentication. Self-registration defaults to `role: buyer` with status `unauthorized` until phone verification completes and business profile binds.

### 3. Users in Use Case
- **Primary Actor**: Any unauthenticated actor (Buyer, Merchant, Driver, Supplier, Support).
- **Secondary System**: Firebase Auth, SMS Telephony Gateway, Firebase Functions (`beforeUserCreated`/`beforeUserSignedIn`).

### 4. End-to-End Use Case Narrative
1. **Pre-conditions**: User opens PWA or Android app without an active Firebase session.
2. **Main Flow**:
   - User inputs 10-digit mobile number and taps "Send OTP".
   - Telephony gateway transmits 6-digit numeric OTP.
   - User enters 6-digit code.
   - Firebase verifies credentials and generates ID token.
   - Client decodes custom claims `{ role, status, officialClient }`.
   - Client routes user to target home screen based on claims.
3. **Alternate Flow**: Invalid OTP entered $\rightarrow$ Error displayed, retry counter decremented, timeout countdown initiated.
4. **Post-conditions**: Auth record created in Firebase Auth; `UserProfiles/{uid}` doc populated; session cached securely.

### 5. Agile User Stories
- **US-01.01.01 (Must Have)**: As an unauthenticated user, I want to log in using my mobile phone number and a one-time password (OTP), so that I can securely access the platform without memorizing complex passwords.
- **US-01.01.02 (Must Have)**: As a returning user, I want the system to inspect my custom claims on startup, so that I am instantly routed to my authorized role experience (Buyer, Merchant, Driver, Supplier, or Support).

### 6. Acceptance Criteria (Gherkin)

```gherkin
Scenario: Successful phone login and role dispatch
  Given the user is on screen "SHR-02"
  When the user enters a valid 10-digit mobile number "+919876543210"
  And requests an OTP
  Then the system renders "SHR-04" with a 60-second countdown timer
  When the user submits the correct 6-digit OTP
  Then an authenticated session is established
  And the user is redirected to the role root route matching claims.role

Scenario: Throttled OTP attempts
  Given the user has failed OTP verification 3 times consecutively on "SHR-04"
  When the user attempts a 4th submission with an invalid code
  Then the system displays error "Too many failed attempts. Please wait 15 minutes."
  And disables the submit action until the backoff timer elapses
```

### 7. Developer Test Plan & Mapping
- **Bruno API Test**: `tests/bruno/00-auth/phone-login.bru` (Emulator stub: token exchange against local Auth emulator).
- **UI E2E Test**: `tests/e2e/auth/login-otp.spec.ts` testing `SHR-02` $\rightarrow$ `SHR-04` $\rightarrow$ role navigation.
- **Unit Tests**: Phone number international format normalizer (`+91`), OTP input masking, 60s countdown timer hook.
- **Functional Tests**: Firestore Security Rules assertion: unauthenticated tokens cannot read `/UserProfiles/*`.

---

## FEAT-01.02: Supplier Organization Provisioning

### 1. Hierarchy & Metadata
- **Epic**: `EPIC-01`
- **Feature ID**: `FEAT-01.02`
- **Official Runtimes**: Support Ops Web Console (`web/x/index.html`), Functions
- **Screens**: [SPT-02 Supplier Management](file:///c:/Users/Admin/Downloads/logikchain/logikchain.com/constitution/wireframes/Support.md)
- **Functions / APIs**: `POST /v1/suppliers` (`createSupplier`)

### 2. Business Value & Problem Statement
Suppliers are regional anchor businesses. They cannot self-register; they must be vetted and provisioned by Support with geographic country bindings and admin accounts.

### 3. Users in Use Case
- **Primary Actor**: Support Administrator (`role: support`).
- **Target Subject**: New Regional Supplier Entity.

### 4. End-to-End Use Case Narrative
1. **Pre-conditions**: Support operator is authenticated with `role: support`.
2. **Main Flow**:
   - Support operator navigates to `SPT-02` and enters Supplier business name, admin email, phone, and country ID.
   - Support operator submits the provisioning request.
   - Cloud Function `createSupplier` validates payload, ensures email/phone uniqueness, creates Supplier doc, creates Auth user with `role: supplier`, sets custom claims, and triggers welcome SMS/email.
3. **Post-conditions**: `Suppliers/{supplierId}` created; primary contact registered; audit log logged in `/AuditLogs`.

### 5. Agile User Stories
- **US-01.02.01 (Must Have)**: As a Support administrator, I want to register a new verified supplier organization with authorized regional parameters, so that they can manage distribution routes, inventory, and field fleets.

### 6. Acceptance Criteria (Gherkin)

```gherkin
Scenario: Support operator provisions valid supplier
  Given an authenticated user with custom claim "role: support"
  When a POST request is sent to "/v1/suppliers" with:
    | name        | "Andhra Agro Logistics"             |
    | email       | "ops@andhra-agro.test"              |
    | phone       | "+919876500001"                     |
    | countryId   | "country_in"                        |
  Then the response status is 201 Created
  And the response body contains "success: true" and a generated "supplierId"
  And a document is created in "/Suppliers/{supplierId}"

Scenario: Non-support user attempts supplier creation
  Given an authenticated user with custom claim "role: merchant"
  When a POST request is sent to "/v1/suppliers"
  Then the response status is 403 Forbidden
  And error code is "PERMISSION_DENIED"
```

### 7. Developer Test Plan & Mapping
- **Bruno API Test**: `tests/bruno/01-identity/createSupplier/` (`00-setup.bru`, `10-execute.bru`, `90-teardown.bru`).
- **UI E2E Test**: `tests/e2e/support/supplier-provisioning.spec.ts` on `SPT-02`.
- **Unit Tests**: Supplier schema validator, GSTIN / phone regex validation.
- **Functional Tests**: Custom claims assignment verification in Firebase Auth admin SDK mock.

---

## FEAT-01.03: Progressive Role Conversion & Official Client Handoff

### 1. Hierarchy & Metadata
- **Epic**: `EPIC-01`
- **Feature ID**: `FEAT-01.03`
- **Official Runtimes**: Web PWA, Android, Functions
- **Screens**: [SHR-06 Role Splash](file:///c:/Users/Admin/Downloads/logikchain/logikchain.com/constitution/wireframes/Shared.md#SHR-06), [SHR-13 Install & Updates](file:///c:/Users/Admin/Downloads/logikchain/logikchain.com/constitution/wireframes/Shared.md#SHR-13)
- **Functions / APIs**: `POST /v1/buyers/{buyerId}/role` (`convertBuyerToRole`)

### 2. Business Value & Problem Statement
Users start as buyers. When vetted as merchants or drivers, their single Firebase UID is elevated without losing transaction history. If upgraded to `vehicle` (Driver), the official client is Android; the PWA must display handoff instructions rather than executing custody actions.

### 3. Users in Use Case
- **Primary Actor**: Supplier (initiator) or Support Operator.
- **Target Subject**: Buyer elevating to Merchant or Driver (`vehicle`).

### 4. End-to-End Use Case Narrative
1. **Pre-conditions**: Buyer account exists in `approved` status.
2. **Main Flow**:
   - Supplier selects buyer on `SUP-08` and invokes `convertBuyerToRole` targeting `merchant` or `vehicle`.
   - Function checks caller authorization, updates `UserProfiles/{buyerId}.role`, refreshes custom claims, and sets `officialClient`.
   - Target user receives notification. On next app launch, `SHR-06` displays role change congratulations.
   - If converted to `vehicle`, `SHR-06` prompts user to install and launch the Android Play Store app.
3. **Post-conditions**: Custom claim `role` matches new role; PWA acts as read-only handoff for drivers.

### 5. Agile User Stories
- **US-01.03.01 (Must Have)**: As a supplier, I want to convert an active buyer into an authorized merchant or driver, so that our supply network expands organically from verified community members.
- **US-01.03.02 (Must Have)**: As a converted driver using the web PWA, I want to see a clear link to launch the Android official app, so that I can perform location tracking and custody handovers reliably.

### 6. Acceptance Criteria (Gherkin)

```gherkin
Scenario: Supplier upgrades buyer to vehicle driver
  Given a supplier authenticated with custom claims "role: supplier"
  When the supplier posts to "/v1/buyers/usr_buyer_123/role" with:
    | targetRole | "vehicle" |
  Then the response status is 200 OK
  And the target user custom claims are updated to "{ role: 'vehicle', officialClient: 'android' }"
  And on next PWA session, user is shown screen "SHR-06" with Play Store deep-link
```

### 7. Developer Test Plan & Mapping
- **Bruno API Test**: `tests/bruno/01-identity/convertBuyerToRole/`.
- **UI E2E Test**: `tests/e2e/identity/role-handoff.spec.ts` verifying `SHR-06` deep link generation.
- **Unit Tests**: Claim verification logic, client capability router.
- **Functional Tests**: Token refresh assertion after claim mutation.

---

## FEAT-01.04: User Profile & Multilingual Localization

### 1. Hierarchy & Metadata
- **Epic**: `EPIC-01`
- **Feature ID**: `FEAT-01.04`
- **Official Runtimes**: Web PWA, Android, Functions
- **Screens**: [SHR-07 Profile](file:///c:/Users/Admin/Downloads/logikchain/logikchain.com/constitution/wireframes/Shared.md#SHR-07), [SHR-07.1 Edit Profile](file:///c:/Users/Admin/Downloads/logikchain/logikchain.com/constitution/wireframes/Shared.md#SHR-07.1), [SHR-11 Audio/Voice Settings](file:///c:/Users/Admin/Downloads/logikchain/logikchain.com/constitution/wireframes/Shared.md#SHR-11)
- **Functions / APIs**: `PATCH /v1/users/{userId}` (`updateUserProfile`)

### 2. Business Value & Problem Statement
Rural users speak regional languages (e.g., Telugu, Hindi, English). Profile information must support localized strings, voice-assist playback options, and default delivery addresses.

### 3. Acceptance Criteria (Gherkin)

```gherkin
Scenario: User updates locale and profile details
  Given an authenticated user "usr_101"
  When user patches "/v1/users/usr_101" with:
    | name   | "Ramesh Kumar" |
    | locale | "te-IN"        |
  Then the response status is 200 OK
  And "UserProfiles/usr_101" reflects name "Ramesh Kumar" and locale "te-IN"
  And the UI immediately renders in Telugu
```

### 4. Developer Test Plan & Mapping
- **Bruno API Test**: `tests/bruno/01-identity/updateUserProfile/`.
- **UI E2E Test**: Playwright testing `SHR-07` $\rightarrow$ `SHR-07.1` input and i18n change.
- **Unit Tests**: Locale string sanitizer, address schema validator.

---

## FEAT-01.05: User Suspension & Account Governance Lifecycle

### 1. Hierarchy & Metadata
- **Epic**: `EPIC-01`
- **Feature ID**: `FEAT-01.05`
- **Official Runtimes**: Support Ops Web Console, Functions
- **Screens**: [SPT-03 User Detail & Governance](file:///c:/Users/Admin/Downloads/logikchain/logikchain.com/constitution/wireframes/Support.md), [SHR-05 Account Blocked](file:///c:/Users/Admin/Downloads/logikchain/logikchain.com/constitution/wireframes/Shared.md#SHR-05)
- **Functions / APIs**: `POST /v1/users/{userId}/suspension` (`suspendUser`), `DELETE /v1/users/{userId}/suspension` (`restoreUser`), `POST /v1/merchants/{merchantId}:disassociate` (`disassociateMerchant`)

### 2. Business Value & Problem Statement
When fraud, missing cash settlement, or safety issues occur, Support or Suppliers must suspend accounts. Crucially, Suppliers can only impose `operational` scope within their network, while Support can impose `platform` scope.

### 3. Acceptance Criteria (Gherkin)

```gherkin
Scenario: Support issues platform suspension for unresolved cash shortfall
  Given an authenticated Support user
  When the user calls "POST /v1/users/usr_drv_99/suspension" with:
    | scope                   | "platform"         |
    | reasonCode              | "cash_not_settled" |
    | reason                  | "Pending ₹12,000"  |
    | acknowledgeCustodyPlan  | true               |
    | idempotencyKey          | "susp_uuid_001"    |
  Then the response status is 200 OK
  And user profile status changes to "suspended"
  And any subsequent API call by "usr_drv_99" returns 403 Account Suspended
  And the driver UI is locked to screen "SHR-05"

Scenario: Restore suspended user
  Given a suspended user "usr_drv_99"
  When Support calls "DELETE /v1/users/usr_drv_99/suspension" with:
    | restoreNote   | "Full cash settlement cleared" |
    | idempotencyKey| "rest_uuid_001"                |
  Then the response status is 200 OK
  And user profile status returns to "approved"
```

### 4. Developer Test Plan & Mapping
- **Bruno API Test**: `tests/bruno/01-identity/suspendUser/` and `restoreUser/`.
- **UI E2E Test**: `tests/e2e/support/user-suspension-flow.spec.ts`.
- **Unit Tests**: Suspension scope validator (Suppliers cannot set `platform`).
- **Functional Tests**: Firestore Security Rules block write access for users with status `suspended`.
