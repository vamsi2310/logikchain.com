# EPIC-11: Platform Governance, Master Data Configuration & Ops Console

## Executive Summary
EPIC-11 establishes foundational governance, master data structures, Google Maps-powered location services (Places Autocomplete & Geocoding API) for geo-spatial hierarchy resolution, crowd-sourced village coverage expansion, device push notifications, platform telemetry/health monitoring, and statutory privacy controls (GDPR / Indian DPDP Act data exports and deletion requests).

---

## FEAT-11.01: Location Services via Google Maps

### 1. Hierarchy & Metadata
- **Epic**: `EPIC-11`
- **Feature ID**: `FEAT-11.01`
- **Official Runtimes**: Support Ops Web Console (`web/x/index.html`), Web PWA (Buyer), Android Native, Functions
- **Screens**: [SPT-11 Geo & Master Data](file:///c:/Users/Admin/Downloads/logikchain/logikchain.com/constitution/wireframes/Support.md)
- **External Integration**: Google Maps Platform — Places Autocomplete API, Geocoding API (server-side via Cloud Functions only; restricted API key)
- **Functions / APIs**:
  - `POST /v1/config/location:resolve` (`resolveLocation`) — server-side Geocoding lookup returning country→state→district→village hierarchy
  - `POST /v1/config/location:autocomplete` (`autocompleteLocation`) — proxied Places Autocomplete for address input UIs
  - `PUT /v1/config/villages/{villageId}` (`upsertVillage`) — pins a confirmed Google Maps result as an official service village
  - `PATCH /v1/config/{collection}/{recordId}:deactivate` (`deactivateConfigurationRecord`)
  - `GET /v1/config/catalog` (`listConfigurationCatalog`)

### 2. Business Value & Problem Statement
Previously, support admins had to manually create country, state, and district records via upsert APIs — error-prone and misaligned with real administrative boundaries. By delegating geographic hierarchy resolution to **Google Maps Places Autocomplete** and **Geocoding API** (server-side, Cloud Functions only), Logikchain ensures:
- Accurate country→state→district hierarchy derived from authoritative geodata.
- No manual upsert of country/state/district records by support staff.
- Village records are pinned from confirmed Maps results, with LGD codes overlaid by support.
- All Maps API calls are server-side to protect restricted API keys (never embedded in APK/PWA).

### 3. Acceptance Criteria (Gherkin)

```gherkin
Scenario: Buyer inputs delivery address via autocomplete
  Given an authenticated buyer on Web PWA or Android
  When buyer types a partial address in the delivery field
  Then the PWA/Android calls the Functions proxy "POST /v1/config/location:autocomplete"
  And returns a ranked list of place suggestions from Google Maps Places API
  And no Maps API key is exposed to the client

Scenario: Support admin resolves and pins a new village
  Given an authenticated Support administrator
  When admin submits "POST /v1/config/location:resolve" with a Google place_id
  Then the function geocodes the place and returns country, state, district, and GPS coordinates
  And admin confirms and calls "PUT /v1/config/villages/vil_inkollu" with the resolved data and LGD code "592100"
  Then the village is stored and available via "GET /v1/config/catalog?types[]=villages"

Scenario: Maps API key is never exposed to clients
  Given any client runtime (Web PWA or Android)
  When the client requests location autocomplete or geocoding
  Then the request is routed through Cloud Functions
  And the Google Maps API key is read from Secret Manager at runtime
  And the raw key is never present in any APK or PWA bundle
```

### 4. Developer Test Plan & Mapping
- **Bruno API Test**: `tests/bruno/11-config/resolveLocation/`, `autocompleteLocation/`, `upsertVillage/`, `deactivateConfigurationRecord/`, `listConfigurationCatalog/`.
- **UI E2E Test**: `tests/e2e/support/location-services.spec.ts`, `tests/e2e/buyer/address-autocomplete.spec.ts`.
- **Unit Tests**: Maps API response → hierarchy mapping, Secret Manager key injection, restricted-key header validation.
- **Security**: Verify Maps restricted API key is sourced from Secret Manager and absent from all client bundles.

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
