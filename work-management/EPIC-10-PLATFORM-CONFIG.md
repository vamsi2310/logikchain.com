# EPIC-10: Master Configuration, Geo-Hierarchy & Subscriptions

## 1. Functional Area Alignment & Microservice Metadata
- **Epic ID**: `EPIC-10`
- **Epic Status**: `[IN_PROGRESS]`
- **Functional Area**: Master Configuration, Geo-Hierarchy, Subscriptions & Tax Profiles
- **Bound Microservice**: `microservices/services/config-service`
- **Container Port**: `4010`
- **Database**: `config_db` (PostgreSQL with outbox event streaming)
- **Primary Runtimes**: Web Support Console (`web/x/`), Web PWA (`web/s/` Supplier), API Gateway
- **Primary Responsibilities**: Master Country-State-District-Village geographical hierarchy, Google Maps Places & Geocoding integration, village addition requests and boundary vetting, subscription plan tier management, GST tax profiles, and statutory TDS rules.

---

## FEAT-10.01: Geographic Hierarchy & Google Maps Geocoding

### 1. Feature Metadata & Hierarchy
- **Feature ID**: `FEAT-10.01`
- **Feature Status**: `[IN_PROGRESS]`
- **Functional Scope**: Hierarchical spatial registry (Country $\rightarrow$ State $\rightarrow$ District $\rightarrow$ Village), Google Maps Geocoding integration, pin-code resolution, and boundary polygons.
- **Service Endpoints**: `POST /v1/config/villages` (`upsertVillage`), `GET /v1/config/villages/{villageId}`, `POST /v1/config/geocode`
- **UI Screens**: [SPT-10 Geo Registry](file:///c:/Users/Admin/Downloads/logikchain/logikchain.com/constitution/wireframes/Support.md#SPT-10), [SUP-03 Route Planner](file:///c:/Users/Admin/Downloads/logikchain/logikchain.com/constitution/wireframes/Supplier.md#SUP-03)

### 2. Derived Use Cases
#### UC-10.01.A: Village Location Geocoding & Merchant-Gated Serviceability
- **Description**: Support or Supplier registers or verifies a rural village in the master geo-catalog. A village is cataloged with coordinates, but is **marked as `is_serviceable: true` if and only if there is at least one active, registered Merchant (`role: merchant`) in that village**.
- **Primary Actor**: Support Administrator (`role: support`) or Supplier (`role: supplier`).
- **Secondary Systems**: `config-service`, `identity-service`, Google Maps Places & Geocoding API.
- **Nominal Flow**:
  1. Operator inputs village name, district, state, and PIN code on `SPT-10`.
  2. `config-service` calls Google Maps Geocoding API to retrieve centroid coordinates (lat/lng) and administrative bounding box.
  3. `config-service` checks `identity-service` (`:4001`) for registered merchants in that village:
     - If $\ge 1$ active merchant: `is_serviceable` is set to `true`.
     - If 0 active merchants: `is_serviceable` is set to `false` (cataloged but non-serviceable).
  4. Inserts or updates village record in `config_db.villages`.
  5. Outbox event emitted for Cloud Firestore mirror.
- **Postconditions**: Village registered in platform master catalog; serviceability status accurately reflects merchant presence.

### 3. User Journey Stories
- **US-10.01.01 [DONE]**: *As a platform support operator, I want village locations geocoded with high precision via Google Maps, so that driver route navigation and distance calculations are accurate.*
- **US-10.01.02 [DONE]**: *As a rural buyer, I want to see if my village is currently serviceable based on having an active local kirana merchant, so that I only place orders when a local pickup hub exists.*
- **US-10.01.03 [DONE]**: *As the platform, I need to resolve a user's GPS coordinate to their pincode and eligible village using `ST_Within` + `ST_Distance` PostGIS queries and check active merchant presence, so that service availability is gated accurately in real time.*
- **US-10.01.04 [DONE]**: *As a Support operator, I want to add, edit, and deactivate pincodes (with their GeoJSON boundary polygons) from the Support console (`SPT-10`), so that service coverage zones can be expanded or corrected without a code deployment.*
- **US-10.01.05 [DONE]**: *As a Support operator, I want to manage the State and District master list directly from `SPT-10`, so that new administrative jurisdictions can be registered and geo-hierarchy stays authoritative.*

#### Acceptance Criteria (Gherkin)
```gherkin
Scenario: Village serviceability gated by registered merchant
  Given a geocoded village "Kothapeta", District "Krishna", State "AP"
  When identity-service reports 0 active registered merchants in "Kothapeta"
  Then config-service marks village is_serviceable as false
  When a local kirana merchant "mer_krishna_01" is approved in "Kothapeta"
  Then config-service updates village is_serviceable to true
```

### 4. Integration Stories
- **INT-10.01.01 [DONE] (Google Maps Geocoding & Places API Integration)**: *As the Config Service, I need to integrate with Google Maps Geocoding and Places API using GCP restricted server-side API keys.*
- **INT-10.01.02 [DONE] (Firestore Periodic Sync Integration)**: *As the Config Service, I need to mirror all active villages and geo-hierarchies to Cloud Firestore collection `/Villages/{villageId}` every 2000ms.*
- **INT-10.01.03 [DONE] (Gateway Cache Integration)**: *As the Config Service, I need to push cache invalidation signals to API Gateway when village boundaries or master configs are altered.*

### 5. Multi-Client Implementation Stories
- **PWA-10.01.01 [DONE] (Web PWA Geo-Hierarchy & Village Registry)**: *Build spatial search and Google Maps autocomplete village picker on Support Web PWA (`web/x/` on `SPT-10`) and Supplier portal (`web/s/` on `SUP-03`).*
- **AND-10.01.01 [DONE] (Android Native Location Picker & Offline Village Cache)**: *Build native Android location selector with Google Play Services Places SDK and offline SQLite village cache.*
- **IOS-10.01.01 [DONE] (iOS Native Location Picker & Village Cache)**: *Build native iOS location selector with Apple Maps / Google Maps SDK and offline CoreData village catalog.*

### 6. PWA Cloud Testing Story
- **TEST-10.01.PWA [DONE] (PWA Cloud E2E Test on Test Project)**: *Automated Playwright test verifying village search, Google Maps Places geocoding integration, and Firestore mirror sync on PWA against `config-service` on `logikchain-test`.*

### 7. Independent Support Stories
- **OPS-10.01.01 [DONE] (DevOps & PostGIS / Geo Indexing)**: *Configure PostgreSQL with spatial indices on `villages(latitude, longitude)` for high-speed radius and nearest-village queries.*
- **OPS-10.01.02 [DONE] (PostGIS Pincode Polygon Storage)**: *Enable PostGIS extension on `config_db` and store pincode boundary polygons as a `GEOMETRY(MultiPolygon, 4326)` column in `config_db.pincodes`, seeded from GeoJSON source datasets (Survey of India / Data.gov.in). Add a GIST spatial index on the polygon column to support millisecond-latency `ST_Within` and `ST_Distance` queries for user location-to-village resolution.*
- **OPS-10.01.03 [DONE] (Pincode & Geo-Master CRUD Endpoints)**: *Expose `POST /v1/config/pincodes` (`upsertPincode`), `DELETE /v1/config/pincodes/{id}`, `POST /v1/config/states` (`upsertState`), and `POST /v1/config/districts` (`upsertDistrict`) on `config-service`, secured to `role: support` claims only.*
- **DOC-10.01.01 [DONE] (Geographical Hierarchy Standards)**: *Document census village naming conventions, LGD (Local Government Directory) code mapping, and PIN code datasets.*
- **TEST-10.01.01 [DONE] (Bruno API Automation)**: *Create automated Bruno test `tests/bruno/10-config/upsertVillage/` validating hierarchy constraints.*

### 8. Deployment & Cloud Verification (Acceptance Criteria & Commands)
- **Cloud Run Microservice Deployment Command**:
  ```bash
  docker build -t asia-south1-docker.pkg.dev/logikchain-test/logikchain-microservices/config-service:latest -f microservices/services/config-service/Dockerfile.service microservices/services/config-service
  docker push asia-south1-docker.pkg.dev/logikchain-test/logikchain-microservices/config-service:latest
  gcloud run deploy config-service \
    --image=asia-south1-docker.pkg.dev/logikchain-test/logikchain-microservices/config-service:latest \
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
  npx playwright test tests/e2e/pwa/config-geo-hierarchy.spec.ts --project=test --config=playwright.pwa.config.ts
  ```
- **Acceptance Criteria**:
  - [x] Backend microservice running on Google Cloud Run in `logikchain-test` with `200 OK` on `/health`.
  - [x] Web PWA deployed to Firebase Hosting on `logikchain-test` communicating through API Gateway.
  - [x] Android & iOS builds compile and connect to `logikchain-test`.
  - [x] Automated PWA E2E tests pass 100% assertions on test project URL.

---

## FEAT-10.02: Subscription Plans & Tiered Tariffs

### 1. Feature Metadata & Hierarchy
- **Feature ID**: `FEAT-10.02`
- **Feature Status**: `[READY]`
- **Functional Scope**: SaaS subscription plan definition, feature flag entitlements, multi-tier pricing, and platform service fees.
- **Service Endpoints**: `GET /v1/config/plans` (`listSubscriptionPlans`), `POST /v1/config/plans` (`upsertSubscriptionPlan`), `POST /v1/suppliers/{supplierId}/subscription` (`updateSupplierSubscriptionPlan`), `GET /v1/config/catalog` (`listConfigurationCatalog`)
- **UI Screens**: [SPT-11 Subscription Admin](file:///c:/Users/Admin/Downloads/logikchain/logikchain.com/constitution/wireframes/Support.md#SPT-11)

### 2. Derived Use Cases
#### UC-10.02.A: SaaS Subscription Plan Configuration & Tiered Entitlements
- **Description**: Platform administrator defines subscription plans (Starter, Growth, Enterprise) with quotas for maximum active delivery vehicles (`maxVehicles`) and monthly gig execution quota (`maxGigsPerMonth` / `monthlyGigLimit`). Routes themselves are not constrained by route-count quotas.
- **Primary Actor**: System Administrator (`role: support`).
- **Nominal Flow**:
  1. Admin navigates to `SPT-11` and sets plan attributes: name, monthly fee, max fleet size (`maxVehicles`), monthly gig quota (`maxGigsPerMonth`), credit feature access, and `delegated_support_enabled` (boolean).
  2. Admin submits plan updates.
  3. `config-service` validates payload and upserts record in `config_db.subscription_plans`.
  4. Outbox event emitted; Firestore mirror updated.
- **Postconditions**: Subscription plans active; enforced by domain services (`gigs-service`, `identity-service`).

### 3. User Journey Stories
- **US-10.02.01 [DONE]**: *As a supplier selecting a subscription tier, I want clear visibility into vehicle quotas, monthly gig limits, platform fees, and whether Delegated Support Management is included, so that I can choose the appropriate plan for my delivery operations.*

#### Acceptance Criteria (Gherkin)
```gherkin
Scenario: Admin creates new subscription plan tier with monthly gig limit
  Given an admin configuring plan "Growth Tier" with vehicleLimit 15, monthlyGigLimit 200, fee ₹2,999/month, and delegated_support_enabled = true
  When admin submits payload to "/v1/config/plans"
  Then config-service creates plan in config_db with status "active"
  And syncs plan definition with monthlyGigLimit: 200 and delegated_support_enabled: true to Firestore collection "/SubscriptionPlans"
```

### 4. Integration Stories
- **INT-10.02.01 [DONE] (Firestore Plan Sync Integration)**: *As the Config Service, I need to sync subscription plans and tariff catalogs to Firestore collection `/SubscriptionPlans/{id}`.*

### 5. Multi-Client Implementation Stories
- **PWA-10.02.01 [DONE] (Web PWA Subscription Plan Viewer & Management)**: *Build subscription tier comparison table and entitlement editor on Support Web PWA (`web/x/` on `SPT-11`) and Supplier account portal (`web/s/`).*
- **AND-10.02.01 [DONE] (Android Native Subscription Status Card)**: *Build native Android subscription tier and quota utilization card for suppliers.*
- **IOS-10.02.01 [DONE] (iOS Native Subscription Status Card)**: *Build native iOS subscription tier view for suppliers.*

### 6. PWA Cloud Testing Story
- **TEST-10.02.PWA [DONE] (PWA Cloud E2E Test on Test Project)**: *Automated Playwright test verifying plan creation, price calculation, and Firestore collection sync on PWA against `config-service` on `logikchain-test`.*

### 7. Independent Support Stories
- **OPS-10.02.01 [DONE] (DevOps & Database Schema)**: *Execute PostgreSQL migration for `config_db.subscription_plans` and establish seed data scripts.*
- **DOC-10.02.01 [DONE] (Tariff & Entitlement Specification)**: *Publish master tariff documentation and feature entitlement matrices.*
- **TEST-10.02.01 [DONE] (Bruno API Automation)**: *Create automated Bruno test `tests/bruno/10-config/upsertPlan/` validating pricing rules.*

### 8. Deployment & Cloud Verification (Acceptance Criteria & Commands)
- **Cloud Run Microservice Deployment Command**:
  ```bash
  docker build -t asia-south1-docker.pkg.dev/logikchain-test/logikchain-microservices/config-service:latest -f microservices/services/config-service/Dockerfile.service microservices/services/config-service
  docker push asia-south1-docker.pkg.dev/logikchain-test/logikchain-microservices/config-service:latest
  gcloud run deploy config-service \
    --image=asia-south1-docker.pkg.dev/logikchain-test/logikchain-microservices/config-service:latest \
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
  npx playwright test tests/e2e/pwa/config-subscription-plans.spec.ts --project=test --config=playwright.pwa.config.ts
  ```
- **Acceptance Criteria**:
  - [x] Backend microservice running on Google Cloud Run in `logikchain-test` with `200 OK` on `/health`.
  - [x] Web PWA deployed to Firebase Hosting on `logikchain-test` communicating through API Gateway.
  - [x] Android & iOS builds compile and connect to `logikchain-test`.
  - [x] Automated PWA E2E tests pass 100% assertions on test project URL.

---

## FEAT-10.03: Statutory Tax Profiles & TDS Rules

### 1. Feature Metadata & Hierarchy
- **Feature ID**: `FEAT-10.03`
- **Feature Status**: `[READY]`
- **Functional Scope**: GST rate slabs (0%, 5%, 12%, 18%), HSN/SAC code mapping, and Section 194C / 194O TDS percentage configurations.
- **Service Endpoints**: `POST /v1/config/tax-profiles` (`upsertTaxProfile`), `POST /v1/config/tds-configs` (`upsertTdsConfiguration`)
- **UI Screens**: [SPT-12 Tax Config Console](file:///c:/Users/Admin/Downloads/logikchain/logikchain.com/constitution/wireframes/Support.md#SPT-12)

### 2. Derived Use Cases
#### UC-10.03.A: Master Tax Profile & TDS Statutory Rate Governance
- **Description**: Finance administrator updates GST slabs or TDS withholding percentages in response to statutory regulatory updates.
- **Primary Actor**: Finance Compliance Officer (`role: support`).
- **Nominal Flow**:
  1. Compliance officer updates TDS rate for Section 194O from 1% to revised rate with effective date.
  2. Submits payload to `upsertTdsConfiguration`.
  3. `config-service` stores versioned tax configuration in `config_db.tax_profiles`.
  4. Outbox event dispatched; domain services (`finance-service`, `orders-service`) ingest latest rates.
- **Postconditions**: Tax profile updated with effective timestamp; applied to all subsequent orders and settlements.

### 3. User Journey Stories
- **US-10.03.01 [DONE]**: *As a compliance officer, I want tax rates and TDS rules centrally configured and versioned, so that regulatory updates can be applied platform-wide without code redeployment.*

#### Acceptance Criteria (Gherkin)
```gherkin
Scenario: Compliance officer configures versioned tax profile
  Given an updated GST profile for agricultural equipment with HSN "8432" and GST 12%
  When officer posts update to "/v1/config/tax-profiles"
  Then config-service records versioned profile with validFrom timestamp
  And makes it available across all microservices
```

### 4. Integration Stories
- **INT-10.03.01 [DONE] (Finance & Orders Service Ingestion Integration)**: *As the Config Service, I need to provide high-speed cached endpoints for `orders-service` and `finance-service` to query active tax rates.*

### 5. Multi-Client Implementation Stories
- **PWA-10.03.01 [DONE] (Web PWA Tax Profile Console)**: *Build master GST slab and TDS configuration UI on Support Web PWA (`web/x/` on `SPT-12`) with version history and scheduled effective date controls.*
- **AND-10.03.01 [DONE] (Android Native Tax Summary Viewer)**: *Build native Android tax rate summary viewer for billing operators.*
- **IOS-10.03.01 [DONE] (iOS Native Tax Summary Viewer)**: *Build native iOS tax rate viewer for billing operators.*

### 6. PWA Cloud Testing Story
- **TEST-10.03.PWA [DONE] (PWA Cloud E2E Test on Test Project)**: *Automated Playwright test verifying tax profile versioning, TDS rate validation, and cache synchronization on PWA against `config-service` on `logikchain-test`.*

### 7. Independent Support Stories
- **OPS-10.03.01 [DONE] (DevOps & Cache Warming)**: *Implement in-memory LRU cache in `config-service` for millisecond-latency tax profile retrieval.*
- **DOC-10.03.01 [DONE] (GST & TDS Rules Architecture)**: *Document HSN/SAC classification hierarchy and statutory compliance references.*
- **TEST-10.03.01 [DONE] (Bruno API Automation)**: *Create automated Bruno test `tests/bruno/10-config/upsertTaxProfile/` validating percentage bounds.*

### 8. Deployment & Cloud Verification (Acceptance Criteria & Commands)
- **Cloud Run Microservice Deployment Command**:
  ```bash
  docker build -t asia-south1-docker.pkg.dev/logikchain-test/logikchain-microservices/config-service:latest -f microservices/services/config-service/Dockerfile.service microservices/services/config-service
  docker push asia-south1-docker.pkg.dev/logikchain-test/logikchain-microservices/config-service:latest
  gcloud run deploy config-service \
    --image=asia-south1-docker.pkg.dev/logikchain-test/logikchain-microservices/config-service:latest \
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
  npx playwright test tests/e2e/pwa/config-tax-profiles.spec.ts --project=test --config=playwright.pwa.config.ts
  ```
- **Acceptance Criteria**:
  - [x] Backend microservice running on Google Cloud Run in `logikchain-test` with `200 OK` on `/health`.
  - [x] Web PWA deployed to Firebase Hosting on `logikchain-test` communicating through API Gateway.
  - [x] Android & iOS builds compile and connect to `logikchain-test`.
  - [x] Automated PWA E2E tests pass 100% assertions on test project URL.

---

## FEAT-10.04: Support-as-Supplier Proxy Data Management

### 1. Feature Metadata & Hierarchy
- **Feature ID**: `FEAT-10.04`
- **Feature Status**: `[READY]`
- **Functional Scope**: Cross-cutting capability allowing Support operators to act on behalf of any supplier for data management tasks — gig scheduling, fleet management, route planning, member directory, and subscription administration — when a supplier outsources platform operations to the Support team.
- **Service Endpoints**: All supplier-scoped endpoints accept `role: support` claims as an authorized proxy actor when `X-Supplier-Context` header is present.
- **UI Screens**: [SPT-10 Geo Registry](file:///c:/Users/Admin/Downloads/logikchain/logikchain.com/constitution/wireframes/Support.md#SPT-10), [SPT-11 Subscription Admin](file:///c:/Users/Admin/Downloads/logikchain/logikchain.com/constitution/wireframes/Support.md#SPT-11), Support proxy mirrors of `SUP-02`, `SUP-03`, `SUP-05`, `SUP-08`

### 2. Derived Use Cases
#### UC-10.04.A: Support Operator Acting as Supplier Proxy
- **Description**: A supplier organization outsources day-to-day platform data operations (gig scheduling, driver assignment, route planning, member management) to a dedicated Support operator. The Support operator performs all supplier-side actions on behalf of that supplier within their authorized jurisdiction.
- **Primary Actor**: Support Operator (`role: support`) acting as proxy for a Supplier (`supplierId` passed via `X-Supplier-Context` header).
- **Secondary Systems**: `config-service`, `gigs-service`, `identity-service`, `governance-service`.
- **Nominal Flow**:
  1. Support operator selects the target supplier jurisdiction from the Support console proxy switcher.
  2. Operator performs supplier-scoped actions (route planning, gig composition, member role promotion, fleet view) with `supplierId` injected as `X-Supplier-Context` header.
  3. API Gateway validates the header against an active supplierId in `identity_db` before forwarding to downstream services.
  4. Each downstream microservice validates `role: support` token and treats the request as an authorized proxy for the given `supplierId`.
  5. All proxy actions are audit-logged in `governance_db.audit_events` with both the support operator's identity and the target `supplierId`.
- **Preconditions**:
  1. Target Supplier must be subscribed to a plan with `delegated_support_enabled: true` (`FEAT-10.02`).
  2. Target Supplier must have created an active, unexpired delegated support grant (`FEAT-01.05`).
  3. Support operator must explicitly select an authorized supplier context.
  4. **Financial Exclusion Guardrail**: Support proxy is strictly prohibited from mutating banking details, payout VPAs, or initiating disbursements (`/v1/payouts/*`, `/v1/banking/*`). Direct Supplier biometric or OTP authorization is mandatory for all financial movements.
- **Postconditions**: Actions completed as if performed by the supplier; audit trail records support proxy identity, grant ID, and payload hash.

### 3. User Journey Stories
- **US-10.04.01 [DONE]**: *As a Support operator, I want to schedule gigs and plan routes on behalf of a supplier who granted me administrative access, so that suppliers who outsource operations do not face service disruption.*
- **US-10.04.02 [DONE]**: *As a Support operator, I want to manage a supplier's member directory and promote buyers to merchant or driver roles, so that the supplier's field network remains operational even when the supplier's admin is unavailable.*
- **US-10.04.03 [DONE]**: *As a platform compliance officer, I want every support-proxy action attributed to both the operator and the target supplier in the audit log, so that delegation accountability is maintained for regulatory review.*

#### Acceptance Criteria (Gherkin)
```gherkin
Scenario: Support operator creates gig on behalf of supplier with active grant
  Given an authenticated Support operator with claim "role: support"
  And supplier "sup_001" has granted delegated support with active TTL
  When operator posts to "/v1/gigs" with header "X-Supplier-Context: sup_001"
  Then gigs-service creates the gig attributed to "sup_001"
  And governance-service records audit event with proxyOperatorId, targetSupplierId, and grantId

Scenario: Support proxy blocked for financial mutation
  Given an authenticated Support operator with header "X-Supplier-Context: sup_001"
  When operator attempts to initiate payout via "POST /v1/payouts/disburse"
  Then API Gateway rejects request with 403 Forbidden ("FINANCIAL_MUTATION_PROXY_BLOCKED")

Scenario: Support operator attempts proxy without selecting supplier context
  Given an authenticated Support operator without X-Supplier-Context header
  When operator posts to "/v1/gigs"
  Then the request is rejected with 422 Unprocessable Entity and error "SUPPLIER_CONTEXT_REQUIRED"
```

### 4. Integration Stories
- **INT-10.04.01 [DONE] (Governance Proxy Audit Integration)**: *As every microservice, I need to forward proxy action metadata (operatorId, targetSupplierId) to `governance-service` (`:4011`) for immutable audit logging whenever `role: support` executes a supplier-scoped action.*
- **INT-10.04.02 [DONE] (API Gateway Context Validation Integration)**: *As the API Gateway, I need to validate that Support proxy requests include a valid `X-Supplier-Context` header resolving to an active supplierId in `identity_db`, before forwarding to downstream services.*

### 5. Multi-Client Implementation Stories
- **PWA-10.04.01 [DONE] (Web PWA Support Proxy Console)**: *Build a supplier-context switcher on the Support Web PWA (`web/x/`) allowing operators to select a supplier and seamlessly access mirrored views of `SUP-02` (Gig Scheduler), `SUP-03` (Route Planner), `SUP-05` (Route Monitoring), and `SUP-08` (Member Directory) with proxy actions fully audit-logged.*

### 6. PWA Cloud Testing Story
- **TEST-10.04.PWA [DONE] (PWA Cloud E2E Test on Test Project)**: *Automated Playwright test verifying that a Support operator can select a supplier context, schedule a gig, and that the audit log records the correct proxy identity chain on `logikchain-test`.*

### 7. Independent Support Stories
- **OPS-10.04.01 [DONE] (API Gateway Supplier Context Middleware)**: *Configure API Gateway middleware to parse and validate `X-Supplier-Context` header on all supplier-scoped endpoints when caller carries `role: support` claim. Reject requests without context with `422 SUPPLIER_CONTEXT_REQUIRED`.*
- **DOC-10.04.01 [DONE] (Support Proxy Delegation Model)**: *Document the Support-as-Supplier proxy authorization pattern, audit chain, per-endpoint scope boundaries, and `X-Supplier-Context` header specification in platform governance documentation.*
- **TEST-10.04.01 [DONE] (Bruno API Automation)**: *Create Bruno test collection `tests/bruno/10-config/supportProxy/` verifying proxy authorization grants, context-missing rejections, and audit log integrity.*

### 8. Deployment & Cloud Verification (Acceptance Criteria & Commands)
- **Cloud Run Microservice Deployment Command**:
  ```bash
  docker build -t asia-south1-docker.pkg.dev/logikchain-test/logikchain-microservices/config-service:latest -f microservices/services/config-service/Dockerfile.service microservices/services/config-service
  docker push asia-south1-docker.pkg.dev/logikchain-test/logikchain-microservices/config-service:latest
  gcloud run deploy config-service \
    --image=asia-south1-docker.pkg.dev/logikchain-test/logikchain-microservices/config-service:latest \
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
  npx playwright test tests/e2e/pwa/support-supplier-proxy.spec.ts --project=test --config=playwright.pwa.config.ts
  ```
- **Acceptance Criteria**:
  - [x] API Gateway validates `X-Supplier-Context` header on all supplier-scoped endpoints when caller is `role: support`.
  - [x] Support PWA supplier-context switcher operational on Firebase Hosting `logikchain-test`.
  - [x] Audit events correctly attribute proxy operatorId and targetSupplierId in `governance_db`.
  - [x] Automated PWA E2E tests pass 100% assertions on test project URL.

---

## FEAT-10.05: Bulk Geo-Data Ingestion & Superimposition Engine

### 1. Feature Metadata & Hierarchy
- **Feature ID**: `FEAT-10.05`
- **Feature Status**: `[READY]`
- **Functional Scope**: Bulk ingestion, polygon topological validation (`ST_MakeValid`), CSV post office + GeoJSON boundary superimposition, missing coordinate interpolation, and Firestore read-projection batch compilation.
- **Service Endpoints**: `POST /v1/config/geo/bulk-import`, `GET /v1/config/geo/import-jobs/{jobId}`
- **UI Screens**: [SPT-10 Geo Registry](file:///c:/Users/Admin/Downloads/logikchain/logikchain.com/constitution/wireframes/Support.md#SPT-10)

### 2. Derived Use Cases
#### UC-10.05.A: Superimposition of Official Datasets & Master PostGIS Population
- **Description**: Support or DevOps ingests the Department of Posts CSV (176k post offices) and Survey of India / Data.gov.in GeoJSON (19k polygons). The system joins them on 6-digit Pincode, repairs self-intersecting polygon boundaries, interpolates missing office coordinates using polygon centroids, and performs high-speed bulk population into `config_db.pincodes` and `config_db.post_offices`.
- **Primary Actor**: Support Administrator (`role: support`) or DevOps Engineer.
- **Secondary Systems**: `config-service`, PostGIS, Google Cloud Storage, Cloud Firestore.
- **Nominal Flow**:
  1. Support uploads updated monthly CSV and boundary GeoJSON via `SPT-10` (or CLI pipeline).
  2. `config-service` creates an asynchronous `import_job` with status `processing`.
  3. Spatial worker normalizes pincodes (zero-padded 6 digits), executes `ST_MakeValid` on polygons, and generates bounding boxes.
  4. For the 69k post offices without coordinates, worker assigns the parent pincode polygon centroid.
  5. Bulk `COPY` populates PostgreSQL tables with spatial GIST indexes.
  6. Worker generates lightweight `/pincodes/{pincode}` JSON documents and writes them to Cloud Firestore in 500-item atomic batches.
  7. Job transitions to `completed` with detailed report (matched, unmatched, coordinates interpolated).
- **Postconditions**: PostGIS database fully populated with 100% India coverage; Firestore cached for instant mobile lookups.

### 3. User Journey Stories
- **US-10.05.01 [DONE]**: *As a Support operator, I want to upload nationwide CSV and GeoJSON updates from the Support console and see an automated validation diff report, so that new postal circles, districts, and boundaries are imported without manual database scripting.*

---

## FEAT-10.06: Merchant Village Delivery & Supplier PUDO Commission Tier Governance

### 1. Feature Metadata & Hierarchy
- **Feature ID**: `FEAT-10.06`
- **Feature Status**: `[READY]`
- **Functional Scope**: Merchant village home delivery configuration (enable/disable, working days, delivery days, delivery charge), supplier tiered PUDO parcel handling commission configuration, Support proxy override, and notification dispatch.
- **Service Endpoints**:
  - `POST /v1/config/merchants/{merchantId}/village-delivery` (`setMerchantVillageDeliveryConfig`)
  - `GET /v1/config/merchants/{merchantId}/village-delivery`
  - `POST /v1/config/suppliers/{supplierId}/pudo-tiers` (`setSupplierPUDOCommissionTiers`)
  - `GET /v1/config/suppliers/{supplierId}/pudo-tiers`
- **UI Screens**: [MER-08 Village Delivery Settings](file:///c:/Users/Admin/Downloads/logikchain/logikchain.com/constitution/wireframes/Merchant.md#MER-08), [SUP-12 PUDO Commission Tiers](file:///c:/Users/Admin/Downloads/logikchain/logikchain.com/constitution/wireframes/Supplier.md#SUP-12), [SPT-13 PUDO Commission Governance](file:///c:/Users/Admin/Downloads/logikchain/logikchain.com/constitution/wireframes/Support.md#SPT-13)

### 2. Derived Use Cases

#### UC-10.06.A: Merchant Village Home Delivery Service Configuration
- **Description**: A village kirana merchant configures whether they offer last-mile home delivery within their village, setting their active working days, dedicated delivery days (e.g. Mon, Wed, Fri), and flat delivery charge (e.g. ₹20).
- **Primary Actor**: Village Merchant (`role: merchant`).
- **Nominal Flow**:
  1. Merchant opens `MER-08` in the merchant app.
  2. Merchant toggles `enableHomeDelivery: true`.
  3. Merchant configures operating schedule: working days, specific delivery departure days, and delivery fee.
  4. Client invokes `POST /v1/config/merchants/{merchantId}/village-delivery`.
  5. `config-service` saves settings in `config_db.merchant_delivery_configs` and mirrors to Firestore `/MerchantConfigs/{merchantId}`.
- **Postconditions**: Home delivery option immediately becomes selectable for buyers ordering in that village.

#### UC-10.06.B: Supplier Tiered PUDO Commission Configuration & Support Oversight
- **Description**: A supplier configures monthly parcel volume tiers and commission rates paid to village merchants for acting as pickup/PUDO hubs. Support operators can also configure these tiers on behalf of the supplier (or resolve disputes) and trigger automated notifications to both parties.
- **Primary Actor**: Regional Supplier (`role: supplier`) or Support Operator (`role: support`).
- **Secondary Systems**: `config-service`, `social-connect-service` (`:4012`), Cloud Firestore.
- **Nominal Flow**:
  1. Supplier opens `SUP-12` (or Support opens `SPT-13`).
  2. Supplier defines volume tiers:
     - Tier 1: 1–50 parcels/month $\rightarrow$ ₹8/parcel
     - Tier 2: 51–200 parcels/month $\rightarrow$ ₹12/parcel
     - Tier 3: 201+ parcels/month $\rightarrow$ ₹15/parcel
  3. Supplier saves configuration via `POST /v1/config/suppliers/{supplierId}/pudo-tiers`.
  4. If configured by Support: `social-connect-service` sends notification to both supplier and affected merchants detailing the updated commission structure.
  5. `config-service` mirrors tiers to Firestore collection `/SupplierPudoTiers/{supplierId}`.
- **Postconditions**: Tiers locked; automatically evaluated at end-of-month payout settlement by `payouts-service`.

### 3. User Journey Stories
- **US-10.06.01 [DONE]**: *As a village merchant, I want to configure whether I offer home delivery, set my delivery fee, and pick which days I deliver, so that I can earn extra income while controlling my delivery schedule.*
- **US-10.06.02 [DONE]**: *As a regional supplier, I want to set volume-tiered commissions for merchant parcel pickups on a dedicated dashboard, so that active kirana merchants are incentivized to handle higher package volumes.*
- **US-10.06.03 [DONE]**: *As a Support operator, I want to configure or adjust PUDO commission tiers on behalf of suppliers and send instant notifications to merchants and suppliers, so that policy disputes and commission updates are handled smoothly.*
- **US-10.06.04 [DONE]**: *As a village merchant and platform operator, I want a formal Village PUDO Hub Partner Agreement detailing package storage care obligations, 72-hour holding SLAs, lost parcel liability, and monthly commission settlement guarantees, so that our operational relationship is legally grounded.*

#### Acceptance Criteria (Gherkin)
```gherkin
Scenario: Merchant configures village home delivery
  Given an active merchant "mer_kirana_01" in village "vil_ap_01"
  When merchant enables home delivery with fee ₹20 and delivery days ["Monday", "Thursday"]
  Then config-service records active home delivery settings
  And buyers in "vil_ap_01" see home delivery available on checkout for ₹20

Scenario: Supplier configures tiered PUDO commissions
  Given supplier "sup_01" on screen "SUP-12"
  When supplier sets monthly tiers: Tier 1 (1-50: ₹8), Tier 2 (51-200: ₹12), Tier 3 (200+: ₹15)
  Then config-service persists tiers in config_db.pudo_commission_tiers
  And mirrors tiers to Firestore collection "/SupplierPudoTiers/sup_01"
```

### 4. Integration Stories
- **INT-10.06.01 [DONE] (Payouts Service Commission Lookup Integration)**: *As the Payouts Service, I need to query `config-service` (`:4010`) to calculate monthly merchant PUDO commission earnings based on verified parcel collection volume.*
- **INT-10.06.02 [DONE] (Social Connect Notification Integration)**: *As the Config Service, I need to call `social-connect-service` (`:4012`) to alert merchants when supplier commission tiers change.*

### 5. Multi-Client Implementation Stories
- **PWA-10.06.01 [DONE] (Web PWA Management Screens)**: *Build `MER-08` on Merchant PWA, `SUP-12` on Supplier PWA, and `SPT-13` on Support PWA with reactive Firestore sync.*
- **AND-10.06.01 [DONE] (Android Native Delivery Settings)**: *Build `MER-08` native Jetpack Compose screen in Android app for setting home delivery fees and active delivery days.*
- **IOS-10.06.01 [DONE] (iOS Native Delivery Settings)**: *Build `MER-08` native SwiftUI view for village home delivery configuration.*

### 6. Independent Support Stories
- **DOC-10.06.01 [DONE] (Merchant PUDO Hub Partner Agreement & Commission Policy)**: *Publish formal compliance document `docs/compliance/merchant_pudo_partner_agreement.md` defining package storage care standards, 72h holding SLAs, loss indemnification, and monthly tiered commission settlement schedules.*
- **OPS-10.06.01 [DONE] (PostgreSQL Migration)**: *Create database tables `config_db.merchant_delivery_configs` and `config_db.pudo_commission_tiers` with GIST and foreign key constraints.*

---

## FEAT-10.07: Master Route Corridors, Supplier Route Oversight & Unified Deletion Policy

### 1. Feature Metadata & Hierarchy
- **Feature ID**: `FEAT-10.07`
- **Feature Status**: `[READY]`
- **Functional Scope**:
  - Authoring and maintaining standard master corridors (`supplierId: "GLOBAL"`, `isPreConfigured: true`) tied to Hubs/Districts with village stops, geocodes, and transit turnaround times.
  - Universal Support Visibility: Support operators can view all standard master corridors and all custom routes across all suppliers from `SPT-09.4` and `SPT-02.4`.
  - Universal Support Editability: Support operators can edit any supplier's custom routes directly (to assist as proxy, correct coordinates, adjust sequences, or update turnaround metrics).
  - Unified Route Deletion Policy: Deleting any route (standard master corridor OR supplier custom route) is strictly blocked while active or upcoming gigs reference it (`ROUTE_IN_USE_BY_GIGS`). All referencing gigs must be completed, canceled, or reassigned first.
  - Automated distance & duration computation via Google Maps Distance Matrix / Routes API.
  - Outbox synchronization to Cloud Firestore collection `/Routes/{routeId}`.
- **Service Endpoints**:
  - `POST /v1/config/master-routes` (`upsertMasterRoute`)
  - `GET /v1/config/routes` (supports filter by `supplierId`, `type`, `hubId`)
  - `PUT /v1/config/routes/{routeId}` (`supportUpdateRoute` - allows editing any route including custom ones)
  - `DELETE /v1/config/routes/{routeId}` (`deleteRoute` - enforces zero-gig reference check)
  - `POST /v1/config/routes/metrics` (`computeRouteMetrics`)
- **UI Screens**: [SPT-05 Config Home](file:///c:/Users/Admin/Downloads/logikchain/logikchain.com/constitution/wireframes/Support.md#SPT-05), `SPT-09.4 Master Corridor & Route Manager` (`/x/config/routes`), [SPT-02.4 Supplier Detail](file:///c:/Users/Admin/Downloads/logikchain/logikchain.com/constitution/wireframes/Support.md#SPT-02.4)

### 2. Derived Use Cases

#### UC-10.07.A: Support Master Route Corridor Authoring & Hub Publishing
- **Description**: Support operator designs a standard commercial delivery circuit for a regional hub, selecting verified village waypoints. The system computes road distances and driving turnaround times via Google Maps Distance Matrix API. Once published, the corridor becomes immediately available to all suppliers operating within that hub to readily use for gigs. (The subscription plan regulates monthly gig operations rather than route counts.)
- **Primary Actor**: Support Administrator (`role: support`).
- **Secondary Systems**: `config-service`, Google Maps Distance Matrix API, Cloud Firestore.
- **Nominal Flow**:
  1. Operator opens `SPT-09.4` (`/x/config/routes`) and clicks "[ + Add Corridor ]".
  2. Selects regional Hub (e.g. `Prakasam Central`) and defines Origin and Destination endpoints.
  3. Sequences village waypoints from the registered village catalog.
  4. System calls `computeRouteMetrics` to calculate road mileage and village-by-village arrival offsets.
  5. Operator saves corridor. `config-service` sets `supplierId: "GLOBAL"`, `isPreConfigured: true`, and `status: "active"`.
  6. Outbox engine mirrors the corridor to Firestore collection `/Routes/{routeId}`.
- **Postconditions**: Corridor published globally; visible to all suppliers in that hub.

#### UC-10.07.B: Support Cross-Supplier Route Oversight, Direct Editing & Unified Deletion Protection
- **Description**: Support operators can view all routes on the platform—both platform corridors and custom routes created by any supplier. If a supplier requests assistance or if a road closure occurs, Support can edit that supplier's custom route directly. Furthermore, deletion of any route (standard or custom) is strictly prohibited as long as any active or upcoming gigs reference it.
- **Primary Actor**: Support Administrator (`role: support`).
- **Secondary Systems**: `config-service`, `gigs-service` (`:4003`), `governance-service` (`:4011`), Cloud Firestore.
- **Nominal Flow**:
  1. Support operator accesses `SPT-09.4` and filters by supplier or views routes under `SPT-02.4`.
  2. Operator selects a supplier's custom route and clicks "[ Edit Route ]".
  3. Operator updates waypoints, reorders stops, or adjusts transit times, and submits updates.
  4. `config-service` validates changes, persists in `config_db.master_routes`, mirrors to `/Routes/{routeId}`, and dispatches audit log to `governance-service`.
  5. If an operator or supplier attempts to delete a route:
     - `config-service` queries `gigs-service` for active/scheduled gigs referencing the route.
     - If $\ge 1$ referencing gigs exist: Deletion is rejected with `409 Conflict` (`ROUTE_IN_USE_BY_GIGS`), detailing the active gig IDs.
     - If 0 referencing gigs exist: Route status transitions to `archived` / deleted.
- **Postconditions**: Supplier route corrected with full audit traceability; active field deliveries protected against route deletion.

### 3. User Journey Stories
- **US-10.07.01 [DONE]**: *As a platform support operator, I want to author and publish standard master corridors tied to regional hubs, so that newly onboarded suppliers can immediately dispatch gigs without manual route mapping.*
- **US-10.07.02 [DONE]**: *As a platform support operator, I want to view and edit custom routes created by any supplier from the Support console, so that I can assist suppliers with logistics troubleshooting, road adjustments, and coordinates corrections.*
- **US-10.07.03 [DONE]**: *As a platform compliance and operations officer, I want any route deletion (standard corridor or supplier custom route) blocked while referenced by active or scheduled gigs, so that drivers in the field never have their active delivery circuit deleted underneath them.*

#### Acceptance Criteria (Gherkin)
```gherkin
Scenario: Support edits supplier custom route with audit trail
  Given a custom route "rte_sup_krishna_01" created by supplier "sup_01"
  When an authenticated Support operator edits the route stop sequence on screen "SPT-09.4"
  Then config-service updates the route definition in config_db.master_routes
  And mirrors the updated route to Firestore collection "/Routes/rte_sup_krishna_01"
  And governance-service logs audit event attributing the modification to the Support operator

Scenario: Route deletion blocked while referenced by upcoming gigs
  Given a route "rte_001" (standard corridor or supplier custom)
  And 2 scheduled gigs in gigs-service referencing "rte_001"
  When an operator or supplier attempts to delete "rte_001"
  Then the request is rejected with 409 Conflict and error "ROUTE_IN_USE_BY_GIGS"
  And the error details list the referencing gig IDs
```

### 4. Integration Stories
- **INT-10.07.01 [DONE] (Google Maps Distance Matrix Corridor Calculation)**: *As the Config Service, I need to integrate with Google Maps Distance Matrix to compute turnarounds and kilometer lengths for multi-stop master corridors.*
- **INT-10.07.02 [DONE] (Gigs Service Active Reference Check Integration)**: *As the Config Service, I need to query `gigs-service` (`:4003`) prior to deleting any route to verify that zero active or scheduled gigs reference the route ID.*
- **INT-10.07.03 [DONE] (Firestore Real-Time Route Catalog Mirror)**: *As the Config Service, I need to mirror all active master corridors and supplier custom routes to Cloud Firestore collection `/Routes/{routeId}`.*

### 5. Multi-Client Implementation Stories
- **PWA-10.07.01 [DONE] (Web PWA Support Route Console)**: *Build route management console on Support Web PWA (`web/x/config/routes` / `SPT-09.4`) with master corridor authoring, supplier filter dropdown to view/edit custom routes, and gig-dependency delete blocker.*
- **AND-10.07.01 [DONE] (Android Support Proxy Route Viewer)**: *Implement route list and stop inspector in Support Android app with supplier filter.*
- **IOS-10.07.01 [DONE] (iOS Support Route Viewer)**: *Implement route list and stop sequence viewer in Support iOS app.*

### 6. Independent Support Stories
- **DOC-10.07.01 [DONE] (Master Corridor Design & Deletion Policy SOP)**: *Publish operational guide documenting master corridor authoring standards, merchant density criteria, supplier custom route editing protocols, and the unified zero-referencing-gigs deletion rule.*
- **OPS-10.07.01 [DONE] (PostgreSQL Master Routes Migration)**: *Create database table `config_db.master_routes` supporting `route_type` ('standard_corridor', 'supplier_custom'), `supplier_id`, `cloned_from_route_id`, and GIST/spatial indexes.*
- **TEST-10.07.01 [DONE] (Bruno API Automation)**: *Create Bruno automated test `tests/bruno/10-config/routes/` verifying master route creation, cross-supplier editing by Support, and 409 rejection on deleting routes in use by gigs.*



---

## FEAT-10.08: Support Bulk Ingestion & Selective Entity Loader for Supplier Ecosystem Data

### 1. Feature Metadata & Hierarchy
- **Feature ID**: `FEAT-10.08`
- **Feature Status**: [COMPLETED]
- **Functional Scope**:
  - Platform Support operational console tooling for bulk onboarding legacy and active supplier operational datasets into Logikchain.
  - Modular Checkbox Selection UI: Supports a master "Select All" toggle alongside granular checkboxes allowing the Support team to load either the complete dataset package at once or selectively ingest any single operational category:
    1. **Organization Details**: Registered legal business name, trade name, company registration number, business PAN, registered office and warehouse physical addresses.
    2. **Contact Details**: Primary authorized contact name, mobile telephone (+91), operational dispatch email, escalations hotline, and emergency contact.
    3. **GST Details**: 15-character GSTIN, legal trade class (Proprietorship / LLP / Pvt Ltd), state jurisdiction, filing frequency, and certificate document reference.
    4. **Food License (FSSAI)**: 14-digit FSSAI license number, manufacturer/wholesaler classification, license issue and expiry dates, and certificate media upload.
    5. **Inventory, Stock & Prices**: Master product catalog, SKU codes, HSN codes, product titles, packaging unit of measure, base wholesale prices, physical warehouse stock counts, and bulk case-break tier pricing.
    6. **Price History**: Historical price evolution log per SKU, effective date intervals, promotional campaign price adjustments, and wholesale price changes.
    7. **Sales History Data**: Granular historical transactions recorded per geographical region, per delivery route, per village hub, and per SKU, including quantities sold, unit invoice prices, and settlement dates.
    8. **Routes**: Standard delivery routes, origin warehouse hub, sequenced village waypoints, planned transit turnaround hours, and route mileage.
    9. **Drivers & Driver Profiles**: Field driver profiles, legal name, phone number, driving license number, license expiration date, emergency contacts, profile photo, and KYC verification state.
    10. **Trucks & Vehicle Fleet**: Delivery vehicle assets, registration plate number, chassis number, payload capacity (kg and volumetric cubic feet), fuel type, and insurance validity.
    11. **Merchants & Merchant Profiles**: Partner village kirana merchants, store trade name, village ID, shopkeeper contact info, merchant profile photos, pre-assigned revolving trade credit headroom, and PUDO pickup hub authorization flag.
  - Pre-flight Dry-Run & Validation Engine: Multi-file (CSV / XLSX / JSON) schema validation, foreign-key dependency integrity check (e.g. verifying villages exist before creating routes; verifying routes exist before assigning gigs), duplicate detection, and row-level diff reports.
  - Asynchronous Batch Execution: Cloud Tasks / background worker execution with transactional rollback per selected entity domain, real-time percentage progress tracking, and downloadable error audit report.
  - Outbox Sync to Cloud Firestore: Automatically mirrors created records to Firestore collections (`/Suppliers`, `/Pamphlets`, `/Routes`, `/UserProfiles`, `/MerchantProfiles`, `/Vehicles`) for instant client availability.
- **Service Endpoints**:
  - `POST /v1/config/suppliers/{supplierId}/bulk-import` (`bulkImportSupplierData`)
  - `POST /v1/config/suppliers/{supplierId}/bulk-import/validate` (`validateSupplierBulkImport`)
  - `GET /v1/config/suppliers/{supplierId}/bulk-import/jobs/{jobId}` (`getSupplierImportJobStatus`)
  - `GET /v1/config/suppliers/bulk-import/templates` (`downloadSupplierImportTemplates`)
- **UI Screens**: [SPT-02.5 Supplier Bulk Ingestion Console](file:///c:/Users/Admin/Downloads/logikchain/logikchain.com/constitution/wireframes/Support.md#SPT-02.5), [SPT-05 Config Home](file:///c:/Users/Admin/Downloads/logikchain/logikchain.com/constitution/wireframes/Support.md#SPT-05), [SPT-02.4 Supplier Detail](file:///c:/Users/Admin/Downloads/logikchain/logikchain.com/constitution/wireframes/Support.md#SPT-02.4)

### 2. Derived Use Cases

#### UC-10.08.A: Support End-to-End Bulk Supplier Onboarding (Select All)
- **Description**: A Support operator onboards an enterprise regional supplier migrating from a legacy ERP. The operator uploads the unified multi-sheet dataset, clicks "Select All", inspects the pre-flight validation preview, and triggers automated end-to-end ingestion across all 11 operational entities.
- **Primary Actor**: Platform Support Administrator (`role: support`).
- **Secondary Systems**: `config-service`, `identity-service`, `pamphlet-service`, `gigs-service`, `orders-service`, `credit-service`, Google Cloud Storage, Cloud Firestore.
- **Nominal Flow**:
  1. Operator accesses `SPT-02.5` from Supplier Detail (`SPT-02.4`) or Config Home (`SPT-05`).
  2. Selects target Supplier (or enters new Supplier provisioning details).
  3. Uploads multi-sheet XLSX or modular CSV batch.
  4. Clicks `[x] Select All` checkboxes covering all 11 data categories.
  5. Operator triggers `[ Validate & Preview ]`.
  6. System parses data, checks schema types, verifies GSTIN / FSSAI formats, resolves village coordinates against `config_db.villages`, and presents a validation summary grid (Total Rows, Valid Rows, Conflicts).
  7. Operator reviews the clean validation report and confirms `[ Start Bulk Ingestion ]`.
  8. `config-service` spawns an asynchronous ingestion job, dispatches entity payloads to respective microservices via transactional boundaries, stages certificates in Cloud Storage, and mirrors entities to Cloud Firestore.
  9. System notifies operator upon completion with execution metrics.
- **Postconditions**: Supplier organization, statutory documents, fleet, drivers, merchant network, routes, catalog, pricing, and historical sales fully populated in system databases.

#### UC-10.08.B: Selective Incremental Entity Loading via Checkbox Selection
- **Description**: An already active supplier needs to update only their historical sales records, or onboard 25 new drivers and trucks, without re-uploading or modifying their company profile or catalog. Support selects only the relevant entity checkboxes (e.g. `[x] Drivers`, `[x] Trucks`) and ingests that isolated entity subset.
- **Primary Actor**: Platform Support Operator (`role: support`).
- **Secondary Systems**: `config-service`, `identity-service`, `gigs-service`.
- **Nominal Flow**:
  1. Operator opens `SPT-02.5` and selects the target supplier.
  2. Leaves "Select All" unchecked; manually checks only `(x) Drivers & Driver Profiles` and `(x) Trucks & Vehicle Fleet`.
  3. Uploads the driver and fleet CSV datasets.
  4. Triggers `[ Validate & Preview ]`; the validator parses only the selected driver and truck tables, ignoring unselected sections.
  5. Operator clicks `[ Ingest Selected Entities ]`.
  6. The system ingests only the drivers and trucks into `identity_db` and `gigs_db`, validating foreign-key ties to the supplier, and updates Firestore collections.
- **Postconditions**: Only the targeted driver and vehicle records are loaded; other supplier domains remain unchanged.

### 3. User Journey Stories
- **US-10.08.01 [DONE]**: *As a platform support operator, I want to bulk-upload supplier data with a 'Select All' toggle or granular checkboxes for Contact Details, Organization, GST, Food License, Inventory/Stock/Price, Sales History, Price History, Routes, Drivers, Trucks, and Merchants, so that I can ingest the complete operational ecosystem or update any individual entity modularly.*
- **US-10.08.02 [DONE]**: *As a platform support operator, I want a dry-run validation preview highlighting row-level schema errors, duplicate records, and missing foreign keys before committing, so that bad data is detected and corrected without corrupting production databases.*
- **US-10.08.03 [DONE]**: *As a platform support operator, I want real-time job progress tracking and a downloadable audit log showing rows succeeded versus rows failed, so that bulk data ingestion operations are fully auditable and transparent.*

#### Acceptance Criteria (Gherkin)
```gherkin
Scenario: Support performs selective entity bulk load
  Given an authenticated Support operator on screen "SPT-02.5" with supplier "sup_ongole_01"
  When the operator unchecks "Select All" and checks only "Drivers" and "Trucks"
  And uploads valid CSV datasets for 15 drivers and 10 trucks
  When the operator clicks "Validate & Preview"
  Then the system displays validation status "VALID" with 15 drivers and 10 trucks ready
  When the operator clicks "Start Bulk Ingestion"
  Then config-service creates background ingestion job with status "processing"
  And persists 15 drivers into identity_db and 10 vehicles into gigs_db
  And mirrors records to Firestore collections "/UserProfiles" and "/Vehicles"
  And records audit event in governance-service attributing the import to the Support operator

Scenario: Dry-run detects invalid GSTIN and blocks unverified commit
  Given a supplier data sheet containing an invalid GSTIN "37ABCDE0000Z1Z" (14 chars instead of 15)
  When the operator runs dry-run validation for "GST Details"
  Then the system marks entity status as "VALIDATION_FAILED"
  And highlights row 1 column "gstin" with error "INVALID_GSTIN_FORMAT"
  And disables the "Start Bulk Ingestion" button until the file is corrected
```

### 4. Integration Stories
- **INT-10.08.01 [DONE] (Cross-Service Ingestion Orchestration)**: *As the Config Service, I need to orchestrate distributed entity ingestion by dispatching validated data subsets to `identity-service` (org, contacts, drivers, merchants), `pamphlet-service` (catalog, stock, prices), `gigs-service` (trucks, gigs), `orders-service` (sales history), and `credit-service` (merchant credit lines).*
- **INT-10.08.02 [DONE] (Firebase Cloud Storage Document Staging)**: *As the Config Service, I need to stage and persist uploaded supplier GST certificates, FSSAI licenses, and driver KYC documents to Firebase Cloud Storage path `/suppliers/{supplierId}/kyc/`.*
- **INT-10.08.03 [DONE] (Firestore Multi-Collection Mirror)**: *As the Config Service, I need to mirror all newly created or updated entities across their respective Cloud Firestore collections (`/Suppliers`, `/Routes`, `/UserProfiles`, `/Vehicles`, `/MerchantProfiles`, `/Pamphlets`) upon job commit.*

### 5. Multi-Client Implementation Stories
- **PWA-10.08.01 [DONE] (Web PWA Support Bulk Ingestion Console)**: *Build screen `SPT-02.5` on the Support Web PWA (`web/x/config/supplier-ingestion`) featuring a supplier selector, master 'Select All' toggle, 11 individual entity checkboxes, drag-and-drop file uploader, validation diff table, real-time progress bar, and error CSV export.*
- **AND-10.08.01 [DONE] (Android Support Read-Only Ingestion Job Monitor)**: *Implement background job status and ingestion history viewer on the Support Android app.*
- **IOS-10.08.01 [DONE] (iOS Support Read-Only Ingestion Job Monitor)**: *Implement background job status and ingestion history viewer on the Support iOS app.*

### 6. PWA Cloud Testing Story
- **TEST-10.08.PWA [DONE] (PWA Cloud E2E Test on Test Project)**: *Automated Playwright test validating the complete bulk loading workflow on PWA—including checkbox toggling, file upload, dry-run schema validation, and live commit verification against microservices on `logikchain-test`.*

### 7. Independent Support Stories
- **OPS-10.08.01 [DONE] (PostgreSQL Staging Tables & Migration)**: *Create database tables `config_db.supplier_ingestion_jobs` and `config_db.supplier_ingestion_staging` supporting chunked batch insertion, JSONB payloads, execution statuses, and rollback transaction isolation.*
- **DOC-10.08.01 [DONE] (Supplier Bulk Ingestion Data Dictionary & SOP)**: *Publish formal operational handbook `docs/operations/supplier_bulk_ingestion_guide.md` specifying exact CSV/XLSX schemas, mandatory versus optional columns, regex validation rules, and support troubleshooting runbooks for all 11 entities.*
- **TEST-10.08.01 [DONE] (Bruno API Automation)**: *Create automated Bruno test suite `tests/bruno/10-config/bulkSupplierIngest/` covering template download, dry-run validation, selective checkbox ingestion, and audit log generation.*

### 8. Deployment & Cloud Verification (Acceptance Criteria & Commands)
- **Cloud Run Microservice Deployment Command**:
  ```bash
  docker build -t asia-south1-docker.pkg.dev/logikchain-test/logikchain-microservices/config-service:latest -f microservices/services/config-service/Dockerfile.service microservices/services/config-service
  docker push asia-south1-docker.pkg.dev/logikchain-test/logikchain-microservices/config-service:latest
  gcloud run deploy config-service \
    --image=asia-south1-docker.pkg.dev/logikchain-test/logikchain-microservices/config-service:latest \
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
  npx playwright test tests/e2e/pwa/support-supplier-bulk-ingest.spec.ts --project=test --config=playwright.pwa.config.ts
  ```
- **Acceptance Criteria**:
  - [x] `config-service` deployed to Cloud Run in `logikchain-test` with `200 OK` on `/health`.
  - [x] Support Web PWA deployed to Firebase Hosting with operational `SPT-02.5` screen.
  - [x] Checkbox selection allows ingesting "Select All" or any isolated entity (e.g. Drivers only, or Sales History only).
  - [x] Dry-run validation successfully catches invalid rows and rejects unverified commits.
  - [x] Automated PWA E2E tests pass 100% assertions on test project URL.
