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
#### UC-10.01.A: Village Location Geocoding & Hierarchy Registration
- **Description**: Support or Supplier registers a new rural village; service resolves administrative coordinates and hierarchy using Google Maps Geocoding.
- **Primary Actor**: Support Administrator (`role: support`) or Supplier (`role: supplier`).
- **Secondary Systems**: `config-service`, Google Maps Places & Geocoding API.
- **Nominal Flow**:
  1. Operator inputs village name, district, state, and PIN code on `SPT-10`.
  2. `config-service` calls Google Maps Geocoding API to retrieve centroid coordinates (lat/lng) and administrative bounding box.
  3. `config-service` verifies district and state parent entities exist in `config_db`.
  4. Inserts or updates village record in `config_db.villages`.
  5. Outbox event emitted for Cloud Firestore mirror.
- **Postconditions**: Village registered in platform master catalog; available for logistics routing and buyer address selection.

### 3. User Journey Stories
- **US-10.01.01 [READY]**: *As a logistics planner, I want village locations geocoded with high precision via Google Maps, so that driver route navigation and distance calculations are accurate.*
- **US-10.01.02 [READY]**: *As a rural buyer, I want to select my village and nearest landmark easily, so that delivery vehicles can find my location without calling multiple times.*

#### Acceptance Criteria (Gherkin)
```gherkin
Scenario: Geocoding and registering a new village
  Given an operator registering village "Kothapeta", District "Krishna", State "AP"
  When config-service calls Google Maps Geocoding API
  Then valid coordinates [16.5062, 80.6480] and placeId are retrieved
  And village is persisted in config_db.villages with active status
```

### 4. Integration Stories
- **INT-10.01.01 [IN_PROGRESS] (Google Maps Geocoding & Places API Integration)**: *As the Config Service, I need to integrate with Google Maps Geocoding and Places API using GCP restricted server-side API keys.*
- **INT-10.01.02 [READY] (Firestore Periodic Sync Integration)**: *As the Config Service, I need to mirror all active villages and geo-hierarchies to Cloud Firestore collection `/Villages/{villageId}` every 2000ms.*
- **INT-10.01.03 [READY] (Gateway Cache Integration)**: *As the Config Service, I need to push cache invalidation signals to API Gateway when village boundaries or master configs are altered.*

### 5. Multi-Client Implementation Stories
- **PWA-10.01.01 [IN_PROGRESS] (Web PWA Geo-Hierarchy & Village Registry)**: *Build spatial search and Google Maps autocomplete village picker on Support Web PWA (`web/x/` on `SPT-10`) and Supplier portal (`web/s/` on `SUP-03`).*
- **AND-10.01.01 [READY] (Android Native Location Picker & Offline Village Cache)**: *Build native Android location selector with Google Play Services Places SDK and offline SQLite village cache.*
- **IOS-10.01.01 [READY] (iOS Native Location Picker & Village Cache)**: *Build native iOS location selector with Apple Maps / Google Maps SDK and offline CoreData village catalog.*

### 6. PWA Cloud Testing Story
- **TEST-10.01.PWA [READY] (PWA Cloud E2E Test on Test Project)**: *Automated Playwright test verifying village search, Google Maps Places geocoding integration, and Firestore mirror sync on PWA against `config-service` on `logikchain-test`.*

### 7. Independent Support Stories
- **OPS-10.01.01 [READY] (DevOps & PostGIS / Geo Indexing)**: *Configure PostgreSQL with spatial indices on `villages(latitude, longitude)` for high-speed radius and nearest-village queries.*
- **DOC-10.01.01 [READY] (Geographical Hierarchy Standards)**: *Document census village naming conventions, LGD (Local Government Directory) code mapping, and PIN code datasets.*
- **TEST-10.01.01 [READY] (Bruno API Automation)**: *Create automated Bruno test `tests/bruno/10-config/upsertVillage/` validating hierarchy constraints.*

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
  - [ ] Backend microservice running on Google Cloud Run in `logikchain-test` with `200 OK` on `/health`.
  - [ ] Web PWA deployed to Firebase Hosting on `logikchain-test` communicating through API Gateway.
  - [ ] Android & iOS builds compile and connect to `logikchain-test`.
  - [ ] Automated PWA E2E tests pass 100% assertions on test project URL.

---

## FEAT-10.02: Subscription Plans & Tiered Tariffs

### 1. Feature Metadata & Hierarchy
- **Feature ID**: `FEAT-10.02`
- **Feature Status**: `[READY]`
- **Functional Scope**: SaaS subscription plan definition, feature flag entitlements, multi-tier pricing, and platform service fees.
- **Service Endpoints**: `POST /v1/config/plans` (`upsertSubscriptionPlan`), `GET /v1/config/catalog` (`listConfigurationCatalog`)
- **UI Screens**: [SPT-11 Subscription Admin](file:///c:/Users/Admin/Downloads/logikchain/logikchain.com/constitution/wireframes/Support.md#SPT-11)

### 2. Derived Use Cases
#### UC-10.02.A: SaaS Subscription Plan Configuration & Tiered Entitlements
- **Description**: Platform administrator defines subscription plans (Starter, Growth, Enterprise) with quotas for maximum active delivery vehicles and routes.
- **Primary Actor**: System Administrator (`role: support`).
- **Nominal Flow**:
  1. Admin navigates to `SPT-11` and sets plan attributes: name, monthly fee, max fleet size, and credit feature access.
  2. Admin submits plan updates.
  3. `config-service` validates payload and upserts record in `config_db.subscription_plans`.
  4. Outbox event emitted; Firestore mirror updated.
- **Postconditions**: Subscription plans active; enforced by domain services.

### 3. User Journey Stories
- **US-10.02.01 [READY]**: *As a supplier selecting a subscription tier, I want clear visibility into vehicle quotas and platform fees, so that I can choose the appropriate plan for my fleet size.*

#### Acceptance Criteria (Gherkin)
```gherkin
Scenario: Admin creates new subscription plan tier
  Given an admin configuring plan "Growth Tier" with vehicleLimit 15 and fee ₹2,999/month
  When admin submits payload to "/v1/config/plans"
  Then config-service creates plan in config_db with status "active"
  And syncs plan definition to Firestore collection "/SubscriptionPlans"
```

### 4. Integration Stories
- **INT-10.02.01 [READY] (Firestore Plan Sync Integration)**: *As the Config Service, I need to sync subscription plans and tariff catalogs to Firestore collection `/SubscriptionPlans/{id}`.*

### 5. Multi-Client Implementation Stories
- **PWA-10.02.01 [READY] (Web PWA Subscription Plan Viewer & Management)**: *Build subscription tier comparison table and entitlement editor on Support Web PWA (`web/x/` on `SPT-11`) and Supplier account portal (`web/s/`).*
- **AND-10.02.01 [READY] (Android Native Subscription Status Card)**: *Build native Android subscription tier and quota utilization card for supplier admins.*
- **IOS-10.02.01 [READY] (iOS Native Subscription Status Card)**: *Build native iOS subscription tier view for supplier admins.*

### 6. PWA Cloud Testing Story
- **TEST-10.02.PWA [READY] (PWA Cloud E2E Test on Test Project)**: *Automated Playwright test verifying plan creation, price calculation, and Firestore collection sync on PWA against `config-service` on `logikchain-test`.*

### 7. Independent Support Stories
- **OPS-10.02.01 [READY] (DevOps & Database Schema)**: *Execute PostgreSQL migration for `config_db.subscription_plans` and establish seed data scripts.*
- **DOC-10.02.01 [READY] (Tariff & Entitlement Specification)**: *Publish master tariff documentation and feature entitlement matrices.*
- **TEST-10.02.01 [READY] (Bruno API Automation)**: *Create automated Bruno test `tests/bruno/10-config/upsertPlan/` validating pricing rules.*

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
  - [ ] Backend microservice running on Google Cloud Run in `logikchain-test` with `200 OK` on `/health`.
  - [ ] Web PWA deployed to Firebase Hosting on `logikchain-test` communicating through API Gateway.
  - [ ] Android & iOS builds compile and connect to `logikchain-test`.
  - [ ] Automated PWA E2E tests pass 100% assertions on test project URL.

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
- **US-10.03.01 [READY]**: *As a compliance officer, I want tax rates and TDS rules centrally configured and versioned, so that regulatory updates can be applied platform-wide without code redeployment.*

#### Acceptance Criteria (Gherkin)
```gherkin
Scenario: Compliance officer configures versioned tax profile
  Given an updated GST profile for agricultural equipment with HSN "8432" and GST 12%
  When officer posts update to "/v1/config/tax-profiles"
  Then config-service records versioned profile with validFrom timestamp
  And makes it available across all microservices
```

### 4. Integration Stories
- **INT-10.03.01 [READY] (Finance & Orders Service Ingestion Integration)**: *As the Config Service, I need to provide high-speed cached endpoints for `orders-service` and `finance-service` to query active tax rates.*

### 5. Multi-Client Implementation Stories
- **PWA-10.03.01 [READY] (Web PWA Tax Profile Console)**: *Build master GST slab and TDS configuration UI on Support Web PWA (`web/x/` on `SPT-12`) with version history and scheduled effective date controls.*
- **AND-10.03.01 [READY] (Android Native Tax Summary Viewer)**: *Build native Android tax rate summary viewer for billing operators.*
- **IOS-10.03.01 [READY] (iOS Native Tax Summary Viewer)**: *Build native iOS tax rate viewer for billing operators.*

### 6. PWA Cloud Testing Story
- **TEST-10.03.PWA [READY] (PWA Cloud E2E Test on Test Project)**: *Automated Playwright test verifying tax profile versioning, TDS rate validation, and cache synchronization on PWA against `config-service` on `logikchain-test`.*

### 7. Independent Support Stories
- **OPS-10.03.01 [READY] (DevOps & Cache Warming)**: *Implement in-memory LRU cache in `config-service` for millisecond-latency tax profile retrieval.*
- **DOC-10.03.01 [READY] (GST & TDS Rules Architecture)**: *Document HSN/SAC classification hierarchy and statutory compliance references.*
- **TEST-10.03.01 [READY] (Bruno API Automation)**: *Create automated Bruno test `tests/bruno/10-config/upsertTaxProfile/` validating percentage bounds.*

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
  - [ ] Backend microservice running on Google Cloud Run in `logikchain-test` with `200 OK` on `/health`.
  - [ ] Web PWA deployed to Firebase Hosting on `logikchain-test` communicating through API Gateway.
  - [ ] Android & iOS builds compile and connect to `logikchain-test`.
  - [ ] Automated PWA E2E tests pass 100% assertions on test project URL.
