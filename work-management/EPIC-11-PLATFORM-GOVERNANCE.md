# EPIC-11: Platform Governance, Master Data Configuration & Ops Console

## Executive Summary
EPIC-11 establishes foundational governance, master data structures, geo-spatial village configuration, crowd-sourced village coverage expansion, device push notifications, platform telemetry/health monitoring, and statutory privacy controls (GDPR / Indian DPDP Act data exports and deletion requests).

---

## FEAT-11.01: Geographic Hierarchy Master Data Management

### 1. Hierarchy & Metadata
- **Epic**: `EPIC-11`
- **Feature ID**: `FEAT-11.01`
- **Official Runtimes**: Support Ops Web Console (`web/x/index.html`), Functions
- **Screens**: [SPT-11 Geo & Master Data](file:///c:/Users/Admin/Downloads/logikchain/logikchain.com/constitution/wireframes/Support.md)
- **Functions / APIs**:
  - `PUT /v1/config/countries/{countryId}` (`upsertCountry`)
  - `PUT /v1/config/states/{stateId}` (`upsertState`)
  - `PUT /v1/config/districts/{districtId}` (`upsertDistrict`)
  - `PUT /v1/config/villages/{villageId}` (`upsertVillage`)
  - `PATCH /v1/config/{collection}/{recordId}:deactivate` (`deactivateConfigurationRecord`)
  - `GET /v1/config/catalog` (`listConfigurationCatalog`)

### 2. Business Value & Problem Statement
Logikchain operates across rural administrative boundaries (Country $\rightarrow$ State $\rightarrow$ District $\rightarrow$ Mandal $\rightarrow$ Village/LGD code). Support administrators manage these boundaries to ensure route optimization and localized taxation.

### 3. Acceptance Criteria (Gherkin)

```gherkin
Scenario: Admin upserts country, state, district, and village records
  Given an authenticated Support administrator
  When submitting "PUT /v1/config/countries/country_in" with currency "INR" and mobilePrefix "+91"
  And submitting "PUT /v1/config/states/state_ap" with countryId "country_in"
  And submitting "PUT /v1/config/districts/dist_prakasam" with stateId "state_ap"
  And submitting "PUT /v1/config/villages/vil_inkollu" with LGD code "592100" and GPS coordinates
  Then all geographic hierarchy entities are stored and linked
  And public clients can query them via "GET /v1/config/catalog?types[]=villages"
```

### 4. Developer Test Plan & Mapping
- **Bruno API Test**: `tests/bruno/11-config/upsertCountry/`, `upsertState/`, `upsertDistrict/`, `upsertVillage/`, `deactivateConfigurationRecord/`, and `listConfigurationCatalog/`.
- **UI E2E Test**: `tests/e2e/support/geo-master-data.spec.ts`.
- **Unit Tests**: Geo-coordinate polygon bounds check.

---

## FEAT-11.02: Crowd-Sourced Village Expansion Requests

### 1. Hierarchy & Metadata
- **Epic**: `EPIC-11`
- **Feature ID**: `FEAT-11.02`
- **Official Runtimes**: Web PWA (Buyer), Support Ops Console, Functions
- **Screens**: [BUY-04.1 Request Delivery Stop](file:///c:/Users/Admin/Downloads/logikchain/logikchain.com/constitution/wireframes/Buyer.md#BUY-04), [SPT-12 Coverage Requests](file:///c:/Users/Admin/Downloads/logikchain/logikchain.com/constitution/wireframes/Support.md)
- **Functions / APIs**: `POST /v1/config/village-requests` (`requestVillage`), `POST /v1/config/village-requests/{id}:reject` (`rejectVillageRequest`)

### 2. Business Value & Problem Statement
When buyers in underserved villages discover the Logikchain app, they can submit their village details to request logistics coverage. Support reviews density and feasibility before provisioning official village records.

### 3. Acceptance Criteria (Gherkin)

```gherkin
Scenario: Buyer requests coverage for new village
  Given a buyer whose village is not listed in catalog
  When buyer submits "POST /v1/config/village-requests" with:
    | name     | "Nagambhotlapalem" |
    | pincode  | "523157"           |
    | district | "Prakasam"         |
    | state    | "Andhra Pradesh"   |
  Then request status is "pending_review"
  And Support receives an alert on screen "SPT-12"
```

### 4. Developer Test Plan & Mapping
- **Bruno API Test**: `tests/bruno/11-config/requestVillage/` and `rejectVillageRequest/`.
- **UI E2E Test**: `tests/e2e/buyer/request-village.spec.ts`.

---

## FEAT-11.03: Device Token Management & Push Broadcasts

### 1. Hierarchy & Metadata
- **Epic**: `EPIC-11`
- **Feature ID**: `FEAT-11.03`
- **Official Runtimes**: Web PWA, Android Native, Functions, FCM
- **Functions / APIs**: `POST /v1/devices` (`registerDeviceToken`)

### 2. Acceptance Criteria (Gherkin)

```gherkin
Scenario: Register FCM push token for logged-in user
  Given an authenticated user on Android
  When app sends "POST /v1/devices" with:
    | token    | "fcm_token_sample_123" |
    | platform | "android"              |
  Then token is associated with the user profile
  And system dispatches critical push notifications to this device
```

### 3. Developer Test Plan & Mapping
- **Bruno API Test**: `tests/bruno/14-ops/registerDeviceToken/`.
- **Unit Tests**: FCM token structure validation and device platform sanitization.

---

## FEAT-11.04: Platform System Health & Observability

### 1. Hierarchy & Metadata
- **Epic**: `EPIC-11`
- **Feature ID**: `FEAT-11.04`
- **Official Runtimes**: Support Ops Web Console, Functions
- **Screens**: [SPT-01 Support Dashboard](file:///c:/Users/Admin/Downloads/logikchain/logikchain.com/constitution/wireframes/Support.md#SPT-01)
- **Functions / APIs**: `GET /v1/ops/health` (`getSystemHealth`)

### 2. Acceptance Criteria (Gherkin)

```gherkin
Scenario: System health probe validates dependent services
  When calling "GET /v1/ops/health"
  Then the response reports:
    | status        | "healthy" |
    | firestore     | "connected" |
    | storage       | "connected" |
    | secretManager | "accessible" |
    | responseTimeMs| < 250 |
```

### 3. Developer Test Plan & Mapping
- **Bruno API Test**: `tests/bruno/14-ops/getSystemHealth/`.
- **Smoke Tests**: CI/CD deployment smoke test target.

---

## FEAT-11.05: Privacy, Data Export & Account Deletion (DPDP Act)

### 1. Hierarchy & Metadata
- **Epic**: `EPIC-11`
- **Feature ID**: `FEAT-11.05`
- **Official Runtimes**: Web PWA, Android Native, Support Ops Console, Functions
- **Screens**: [SHR-15 Terms & Privacy](file:///c:/Users/Admin/Downloads/logikchain/logikchain.com/constitution/wireframes/Shared.md#SHR-15)
- **Functions / APIs**: `POST /v1/me/data-export` (`requestMyDataExport`), `POST /v1/me/deletion` (`requestAccountDeletion`)

### 2. Business Value & Problem Statement
In compliance with the Digital Personal Data Protection (DPDP) Act, users possess the right to export all personal data and request account anonymization or deletion while preserving non-repudiable financial audit ledgers.

### 3. Acceptance Criteria (Gherkin)

```gherkin
Scenario: User requests data export archive
  Given an authenticated buyer
  When user submits "POST /v1/me/data-export"
  Then a Cloud Task generates an encrypted ZIP archive containing all personal profile, order, and address history
  And user receives an email/SMS with a secure temporary download link

Scenario: User requests account deletion
  Given an authenticated user with no active financial debt or open custody liability
  When user submits "POST /v1/me/deletion" with reason "No longer using service"
  Then personal identifiers are anonymized
  And statutory accounting records remain preserved in immutable ledger for compliance
```

### 4. Developer Test Plan & Mapping
- **Bruno API Test**: `tests/bruno/14-ops/requestMyDataExport/` and `requestAccountDeletion/`.
- **UI E2E Test**: `tests/e2e/shared/privacy-data-request.spec.ts`.
- **Unit Tests**: PII anonymizer masking utility.
