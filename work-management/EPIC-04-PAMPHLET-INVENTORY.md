# EPIC-04: Pamphlet & Dynamic Inventory Distribution

## 1. Functional Area Alignment & Microservice Metadata
- **Epic ID**: `EPIC-04`
- **Epic Status**: [READY]
- **Functional Area**: Pamphlet & Dynamic Inventory Manifest Distribution
- **Bound Microservice**: `microservices/services/pamphlet-service`
- **Container Port**: `4004`
- **Database**: `pamphlet_db` (PostgreSQL with outbox event streaming)
- **Primary Runtimes**: Android Native (`logikchain-android`), Web PWA (`web/s/` Supplier Warehouse), API Gateway
- **Primary Responsibilities**: Dynamic stock manifest lifecycle per Gig, surrogate-keyed manifests (`pmp_{id}`) linked to `gigId`, dual cargo partitioning (pre-booked orders vs. rolling pamphlet stock), dynamic in-transit order conversion, merchant spot-restocking, warehouse loading/unloading, real-time stock item adjustments, in-transit breakage/return logging, and order item linkage.

---

## FEAT-04.01: Dynamic Gig Pamphlet Creation & In-Transit Rolling Stock

### 1. Feature Metadata & Hierarchy
- **Feature ID**: `FEAT-04.01`
- **Feature Status**: [READY]
- **Functional Scope**: Automated manifest initialization, surrogate key binding (`pmp_{id}` linked to `gigId`), dual cargo partitioning (pre-booked customer orders vs. rolling merchant spot-restock stock), and dynamic in-transit order conversion.
- **Service Endpoints**: `POST /v1/pamphlets` (`createGigPamphlet`), `GET /v1/pamphlets/{pamphletId}`, `POST /v1/pamphlets/{pamphletId}/deduct-transit-stock`
- **UI Screens**: [SUP-06 Warehouse Loading](file:///c:/Users/Admin/Downloads/logikchain/logikchain.com/constitution/wireframes/Supplier.md#SUP-06), [VEH-03 Vehicle Manifest](file:///c:/Users/Admin/Downloads/logikchain/logikchain.com/constitution/wireframes/Vehicle.md#VEH-03)

### 2. Derived Use Cases
#### UC-04.01.A: Automated Dynamic Manifest Initialization & Dual Cargo Partitioning
- **Description**: When a supplier schedules a gig, the system initializes a dedicated dynamic manifest ("pamphlet") with a surrogate ID bound to the `gigId`. The vehicle's cargo is explicitly partitioned into:
  1. **Pre-Booked Orders**: Packaged orders assigned to specific village merchants or pre-ordered by buyers.
  2. **Pamphlet Stock (In-Transit Rolling Stock)**: Uncommitted inventory loaded onto the truck primarily for village merchants to spot-restock when the truck arrives.
  3. **Dynamic In-Transit Order Conversion**: While the truck is traveling along the route, buyers in upcoming villages can browse this live pamphlet stock on their phones. Placing an order deducts from the live truck pamphlet stock and dynamically converts it into a packaged order dropped off at their village merchant.
  *(A truck can depart warehouse with zero pre-booked orders, loaded purely with pamphlet inventory, and dynamically aggregate buyer and merchant orders en-route).*
- **Primary Actor**: System (`gigs-service`) or Warehouse Dispatcher (`role: supplier`).
- **Secondary Systems**: `pamphlet-service`, `gigs-service`, `orders-service`, Cloud Firestore.
- **Preconditions**: A valid gig exists with surrogate `gigId`.
- **Nominal Flow**:
  1. `gigs-service` invokes `POST /v1/pamphlets` with `gigId`.
  2. `pamphlet-service` generates surrogate `pamphletId` (e.g. `pmp_01J8F9...`) linked 1:1 with `gigId`.
  3. Manifest is created in `pamphlet_db.pamphlets` in status `draft`.
  4. Warehouse loads pre-booked order items AND adds uncommitted bulk inventory as `pamphlet_stock` (for merchant spot-restock).
  5. As truck departs, status transitions to `in_transit`.
  6. When buyers/merchants order en-route, `orders-service` calls `deduct-transit-stock`; items decrement from `pamphlet_stock` and link to the newly created `orderId`.
  7. Outbox event emitted for real-time Firestore mirror.
- **Postconditions**: Pamphlet established with surrogate ID; rolling stock tracked in real time; dynamic orders seamlessly supported.

### 3. User Journey Stories
- **US-04.01.01 [READY]**: *As a warehouse dispatcher, I want a dedicated digital manifest for every scheduled vehicle departure with clear separation between pre-booked orders and uncommitted pamphlet stock, so that warehouse loading is completely verifiable.*
- **US-04.01.02 [READY]**: *As a delivery driver or supplier, I want a delivery truck to be able to depart with zero pre-booked orders and purely pamphlet inventory, so that we can capture dynamic orders from buyers and merchants while the truck is rolling toward their village.*

#### Acceptance Criteria (Gherkin)
```gherkin
Scenario: Automatic pamphlet generation with surrogate key
  Given gigs-service composing gig "gig_9981"
  When gigs-service posts to "/v1/pamphlets" with gigId "gig_9981"
  Then pamphlet-service creates pamphlet with surrogate ID matching "pmp_*"
  And links pamphlet to gigId "gig_9981"
  And initializes pre_booked_orders and rolling_pamphlet_stock partitions

Scenario: Dynamic in-transit stock deduction
  Given an active pamphlet "pmp_01" in transit with 50 units of sugar in rolling stock
  When orders-service requests deduction of 5 units for new in-transit order #ORD-501
  Then pamphlet-service atomically decrements rolling stock to 45 units
  And links 5 units to order #ORD-501 on the vehicle drop manifest
```

### 4. Integration Stories
- **INT-04.01.01 [READY] (Gigs Service Lifecycle Hook Integration)**: *As the Pamphlet Service, I need to receive REST calls from `gigs-service` (`:4003`) to auto-create and close vehicle manifests bound to surrogate `gigId`s.*
- **INT-04.01.02 [READY] (Firestore Periodic Sync Integration)**: *As the Pamphlet Service, I need to synchronize rolling pamphlet stock to Firestore collection `/Pamphlets/{pamphletId}` every 2000ms for real-time mobile app updates.*
- **INT-04.01.03 [READY] (Orders Service In-Transit Stock Deduction Integration)**: *As the Pamphlet Service, I need to provide high-concurrency atomic stock deduction endpoints for `orders-service` when in-transit orders are placed.*

### 5. Multi-Client Implementation Stories
- **PWA-04.01.01 [READY] (Web PWA Client)**: *Implement Supplier Warehouse Loading dashboard (`SUP-06`) showing dynamic manifest items and rolling stock allocation per scheduled departure in `web/`.*
- **AND-04.01.01 [READY] (Android Native Client)**: *Implement Vehicle Manifest screen (`VEH-03`) with offline SQLite cache and barcode scanner support for loaded SKU verification in `android/`.*
- **IOS-04.01.01 [READY] (iOS Native Client)**: *Implement Supplier Warehouse inventory audit view with real-time Firestore pamphlet snapshot binding.*

### 6. PWA Cloud Testing Story
- **TEST-04.01.PWA [READY] (PWA Cloud E2E Test on Test Project)**: *Automated Playwright test validating that when a gig is composed, the matching pamphlet is automatically generated with surrogate key and visible on Supplier PWA console on `logikchain-test`.*

### 7. Independent Support Stories
- **OPS-04.01.01 [READY] (DevOps & Database Schema)**: *Maintain multi-stage Docker build, configure Kubernetes deployment (`03-pamphlet.yaml`), and apply PostgreSQL schema migrations for `pamphlet_db` including surrogate keys and return manifest tables.*
- **DOC-04.01.01 [READY] (Manifest Schema Documentation)**: *Publish technical documentation detailing surrogate keys, dual cargo partitioning, and in-transit order conversion workflows.*
- **TEST-04.01.01 [READY] (Automated Test Suite)**: *Build automated Bruno API test collection `tests/bruno/04-pamphlet/createPamphlet/` verifying surrogate key generation and rolling stock deduction.*

### 8. Deployment & Cloud Verification (Acceptance Criteria & Commands)
- **Cloud Run Microservice Deployment Command**:
  ```bash
  docker build -t asia-south1-docker.pkg.dev/logikchain-test/logikchain-microservices/pamphlet-service:latest -f microservices/services/pamphlet-service/Dockerfile.service microservices/services/pamphlet-service
  docker push asia-south1-docker.pkg.dev/logikchain-test/logikchain-microservices/pamphlet-service:latest
  gcloud run deploy pamphlet-service \
    --image=asia-south1-docker.pkg.dev/logikchain-test/logikchain-microservices/pamphlet-service:latest \
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
  npx playwright test tests/e2e/pwa/pamphlet-creation.spec.ts --project=test --config=playwright.pwa.config.ts
  ```
- **Acceptance Criteria**:
  - [ ] `pamphlet-service` deployed to Cloud Run in `logikchain-test` with valid `pamphlet_db` migrations.
  - [ ] Web PWA displays active vehicle manifests with accurate SKU listings.
  - [ ] Android client binds to dynamic `{vehicleId}_{startDatetime}` run.
  - [ ] Automated PWA E2E tests pass 100% assertions on test project URL.

---

## FEAT-04.02: Warehouse Loading, Unloading & Stock Deltas

### 1. Feature Metadata & Hierarchy
- **Feature ID**: `FEAT-04.02`
- **Feature Status**: [READY]
- **Functional Scope**: Physical stock load delta verification, gate dispatch approval, and post-trip stock unloading.
- **Service Endpoints**: `POST /v1/pamphlets/{id}/load` (`loadStock`), `POST /v1/pamphlets/{id}/unload` (`unloadStock`)
- **UI Screens**: [SUP-06 Warehouse Loading](file:///c:/Users/Admin/Downloads/logikchain/logikchain.com/constitution/wireframes/Supplier.md#SUP-06), [VEH-03 Manifest Inspection](file:///c:/Users/Admin/Downloads/logikchain/logikchain.com/constitution/wireframes/Vehicle.md#VEH-03)

### 2. Derived Use Cases
#### UC-04.02.A: Physical Warehouse Loading & Driver Sign-Off
- **Description**: Supplier (warehouse loader) loads cartons and bags into delivery truck; driver scans or verifies items before leaving.
- **Primary Actor**: Warehouse Loader (`role: supplier`) and Vehicle Driver (`role: driver`).
- **Nominal Flow**:
  1. Warehouse loader scans loaded SKUs into `SUP-06`.
  2. System calls `POST /v1/pamphlets/{id}/load` with batch items and quantities.
  3. `pamphlet-service` increments `loaded_qty` in `pamphlet_db.pamphlet_items`.
  4. Driver inspects truck, reviews manifest on `VEH-03`, and submits digital sign-off.
  5. Pamphlet status transitions to `sealed`.
- **Postconditions**: Stock custody transferred from warehouse to vehicle driver; manifest sealed for transit.

### 3. User Journey Stories
- **US-04.02.01 [READY]**: *As a delivery driver, I want to review and confirm the exact inventory loaded into my vehicle before departure, so that I am not held liable for shortages originating in the warehouse.*

#### Acceptance Criteria (Gherkin)
```gherkin
Scenario: Warehouse loading stock batch into vehicle pamphlet
  Given an open draft pamphlet "veh_01_20261004T060000Z"
  When warehouse loader posts stock items [SKU-100: 50 units, SKU-200: 20 units] to "/load"
  Then pamphlet-service increments loaded quantities
  And records batch timestamp and warehouse operator ID
```

### 4. Integration Stories
- **INT-04.02.01 [READY] (Orders Service Linkage Integration)**: *As the Pamphlet Service, I need to accept `linkOrderToPamphlet` events from `orders-service` (`:4002`) to verify that all loaded items correspond to approved customer orders.*
- **INT-04.02.02 [READY] (Firestore Delta Sync Integration)**: *As the Pamphlet Service, I need to push real-time delta events to Firestore so the driver's Android app immediately reflects updated stock counts.*

### 5. Multi-Client Implementation Stories
- **PWA-04.02.01 [READY] (Web PWA Client)**: *Implement Warehouse Dispatch gate screen (`SUP-06`) with SKU load counter, variance warning banner, and driver digital signature pad in `web/`.*
- **AND-04.02.01 [READY] (Android Native Client)**: *Implement Driver Manifest Inspection screen (`VEH-03`) with item-by-item checklist, loading seal acceptance button, and Play Integrity gate verification in `android/`.*
- **IOS-04.02.01 [READY] (iOS Native Client)**: *Implement Warehouse Loading approval view with barcode scanner and seal status gauge.*

### 6. PWA Cloud Testing Story
- **TEST-04.02.PWA [READY] (PWA Cloud E2E Test on Test Project)**: *Automated Playwright test validating warehouse stock loading, gate seal verification, and status lock against `pamphlet-service` on `logikchain-test`.*

### 7. Independent Support Stories
- **OPS-04.02.01 [READY] (PostgreSQL Transaction Isolation)**: *Ensure strict row-level locking (`SELECT ... FOR UPDATE`) in `pamphlet_db` to prevent race conditions during simultaneous load/unload delta writes.*
- **DOC-04.02.01 [READY] (Loading Gate Runbook)**: *Document warehouse gate check operating procedures and variance dispute escalation trees.*
- **TEST-04.02.01 [READY] (Bruno API Automation)**: *Create Bruno automated test `tests/bruno/04-pamphlet/loadStock/` asserting item count math.*

### 8. Deployment & Cloud Verification (Acceptance Criteria & Commands)
- **Cloud Run Microservice Deployment Command**:
  ```bash
  docker build -t asia-south1-docker.pkg.dev/logikchain-test/logikchain-microservices/pamphlet-service:latest -f microservices/services/pamphlet-service/Dockerfile.service microservices/services/pamphlet-service
  docker push asia-south1-docker.pkg.dev/logikchain-test/logikchain-microservices/pamphlet-service:latest
  gcloud run deploy pamphlet-service \
    --image=asia-south1-docker.pkg.dev/logikchain-test/logikchain-microservices/pamphlet-service:latest \
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
  npx playwright test tests/e2e/pwa/warehouse-loading-seal.spec.ts --project=test --config=playwright.pwa.config.ts
  ```
- **Acceptance Criteria**:
  - [ ] Stock loading and gate seal endpoints operational on Cloud Run test instance.
  - [ ] Warehouse PWA console performs batch load submissions with zero delta errors.
  - [ ] Android client signs off manifest and unseals driver navigation gate.
  - [ ] Automated PWA E2E tests pass 100% assertions on test project URL.

---

## FEAT-04.03: In-Transit Stock Adjustments & Damage Claims

### 1. Feature Metadata & Hierarchy
- **Feature ID**: `FEAT-04.03`
- **Feature Status**: [READY]
- **Functional Scope**: On-road inventory adjustments, damaged carton write-offs, missing items, and stock re-balancing.
- **Service Endpoints**: `POST /v1/pamphlets/{id}/adjust` (`adjustStockItem`), `GET /v1/pamphlets/{id}/snapshot`
- **UI Screens**: [VEH-04 Stock Adjustment](file:///c:/Users/Admin/Downloads/logikchain/logikchain.com/constitution/wireframes/Vehicle.md#VEH-04), [SUP-07 Inventory Audit](file:///c:/Users/Admin/Downloads/logikchain/logikchain.com/constitution/wireframes/Supplier.md#SUP-07)

### 2. Derived Use Cases
#### UC-04.03.A: In-Transit Breakage / Damaged Stock Recording
- **Description**: Driver discovers damaged items during transit (e.g. broken oil tin) and logs an adjustment before drop-off.
- **Primary Actor**: Vehicle Driver (`role: driver`).
- **Nominal Flow**:
  1. Driver navigates to `VEH-04`, selects SKU, and logs reason code `damaged_in_transit`.
  2. Driver takes photo proof on mobile and enters affected quantity.
  3. Client calls `POST /v1/pamphlets/{id}/adjust`.
  4. `pamphlet-service` deducts available deliverable stock and increments `damaged_qty`.
  5. Photo uploaded to Cloud Storage via sync engine; supplier alerted.
#### UC-04.03.B: Transit Damage Liability Assessment & Shrinkage Allowance Claims
- **Description**: Evaluates whether cargo damage exceeds the 0.5% normal rural road shrinkage allowance. If under 0.5% of trip value, loss is absorbed by supplier as transit shrinkage; if over 0.5%, Support investigates whether damage resulted from rough driving, poor cargo strapping, or defective warehouse packaging.
- **Primary Actor**: Support Claims Officer (`role: support`), Supplier Manager (`role: supplier`).
- **Nominal Flow**:
  1. At end of trip, `pamphlet-service` aggregates total damaged stock value vs. total cargo value.
  2. If damage ratio $\le 0.5\%$: System automatically approves supplier shrinkage write-off.
  3. If damage ratio $> 0.5\%$: System generates high-shrinkage alert on `SPT-14` and locks driver's transit security deposit pending photo/telemetry audit.
  4. Support reviews road accelerometer telemetry (`gigs-service`) and warehouse pre-dispatch strap photo.
  5. Support allocates liability between driver deduction or supplier insurance claim.
- **Postconditions**: Liability attributed; write-off or driver balance deduction posted to `finance-service`.

### 3. User Journey Stories
- **US-04.03.01 [READY]**: *As a driver, I want to immediately log damaged or spilled goods with photo evidence, so that customer orders can be adjusted before delivery attempts.*
- **US-04.03.02 [READY]**: *As a supplier and fleet operator, I want clear contractual policies defining the 0.5% standard rural transit shrinkage allowance, so that drivers are not penalized for inevitable road vibration losses while gross negligence is strictly attributed.*
- **US-04.03.03 [READY]**: *As a warehouse inventory manager, I want standardized intake procedures for returned or rejected goods brought back by trucks, so that re-sellable stock is restocked and damaged stock is routed to the statutory write-off ledger.*

#### Acceptance Criteria (Gherkin)
```gherkin
Scenario: Driver logs broken goods in transit
  Given a sealed vehicle pamphlet with 20 units of "SKU-OIL-1L"
  When driver posts an adjustment of -2 units with reason "broken_bottle" and photo URI
  Then pamphlet-service reduces deliverable stock to 18 units
  And records 2 units in damaged_inventory audit table

Scenario: In-transit shrinkage evaluated against 0.5% threshold
  Given a completed gig with total dispatched cargo value ₹1,00,000
  When total reported breakage is ₹400 (0.4%)
  Then system flags damage as "ALLOWABLE_RURAL_SHRINKAGE"
  And absorbs loss without deducting driver payout
```

### 4. Integration Stories
- **INT-04.03.01 [READY] (Orders Service Adjustment Integration)**: *As the Pamphlet Service, I need to notify `orders-service` (`:4002`) if an inventory adjustment causes an order fulfillment shortfall, so the order is automatically flagged for partial delivery.*
- **INT-04.03.02 [READY] (Firebase Cloud Storage Photo Sync Integration)**: *As the Pamphlet Service, I need to sync damage claim photos to Firebase Cloud Storage `/claims/{id}/damage.jpg`.*

### 5. Multi-Client Implementation Stories
- **PWA-04.03.01 [READY] (Web PWA Client)**: *Implement Supplier Inventory Audit screen (`SUP-07`) displaying real-time damage claims, attached photo evidence thumbnails, and shrinkage ledger adjustments.*
- **AND-04.03.01 [READY] (Android Native Client)**: *Implement Driver Stock Adjustment (`VEH-04`) with camera capture, offline image compression, and damage reason code selector.*
- **IOS-04.03.01 [READY] (iOS Native Client)**: *Implement Supplier damage claims audit review sheet with high-resolution image viewer.*

### 6. PWA Cloud Testing Story
- **TEST-04.03.PWA [READY] (PWA Cloud E2E Test on Test Project)**: *Automated Playwright test validating that when a damage claim is recorded by driver API, the claim and photo proof appear on Supplier PWA console in real-time on `logikchain-test`.*

### 7. Independent Support Stories
- **OPS-04.03.01 [READY] (Storage Event Queue DevOps)**: *Configure `storage_sync_events` worker in `pamphlet-service` to reliably sync image binary metadata.*
- **DOC-04.03.01 [READY] (Transit Damage & Shrinkage Policy)**: *Publish formal documents `docs/compliance/transit_damage_and_shrinkage_policy.md` and `docs/compliance/warehouse_returns_and_restocking_sop.md` defining shrinkage allowances, driver exemption rules, and returns intake.*
- **TEST-04.03.01 [READY] (Bruno API Automation)**: *Create Bruno test collection `tests/bruno/04-pamphlet/adjustStockItem/` verifying non-negative inventory constraints.*

### 8. Deployment & Cloud Verification (Acceptance Criteria & Commands)
- **Cloud Run Microservice Deployment Command**:
  ```bash
  docker build -t asia-south1-docker.pkg.dev/logikchain-test/logikchain-microservices/pamphlet-service:latest -f microservices/services/pamphlet-service/Dockerfile.service microservices/services/pamphlet-service
  docker push asia-south1-docker.pkg.dev/logikchain-test/logikchain-microservices/pamphlet-service:latest
  gcloud run deploy pamphlet-service \
    --image=asia-south1-docker.pkg.dev/logikchain-test/logikchain-microservices/pamphlet-service:latest \
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
  npx playwright test tests/e2e/pwa/damage-claim-audit.spec.ts --project=test --config=playwright.pwa.config.ts
  ```
- **Acceptance Criteria**:
  - [ ] Stock adjustment endpoints and Cloud Storage sync verified on Cloud Run test instance.
  - [ ] PWA Supplier audit view renders damage claims with photo previews.
  - [ ] Android client captures photo proof and updates in-transit stock.
  - [ ] Automated PWA E2E tests pass 100% assertions on test project URL.
