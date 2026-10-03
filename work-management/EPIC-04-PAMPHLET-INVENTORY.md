# EPIC-04: Pamphlet & Dynamic Inventory Distribution

## 1. Functional Area Alignment & Microservice Metadata
- **Epic ID**: `EPIC-04`
- **Functional Area**: Pamphlet & Dynamic Inventory Manifest Distribution
- **Bound Microservice**: `microservices/services/pamphlet-service`
- **Container Port**: `4004`
- **Database**: `pamphlet_db` (PostgreSQL with outbox event streaming)
- **Primary Runtimes**: Android Native (`logikchain-android`), Web PWA (`web/s/` Supplier Warehouse), API Gateway
- **Primary Responsibilities**: Dynamic stock manifest lifecycle per Gig, vehicle-keyed manifests (`{vehicleId}_{startDatetime}`), warehouse physical stock loading/unloading, real-time stock item adjustments, in-transit breakage logging, and order item linkage.

---

## FEAT-04.01: Dynamic Gig Pamphlet Creation & Manifest Keying

### 1. Feature Metadata & Hierarchy
- **Feature ID**: `FEAT-04.01`
- **Functional Scope**: Automated manifest initialization, composite key binding (`{vehicleId}_{startDatetime}`), and initial SKU allocation.
- **Service Endpoints**: `POST /v1/pamphlets` (`createGigPamphlet`), `GET /v1/pamphlets/{pamphletId}`
- **UI Screens**: [SUP-06 Warehouse Loading](file:///c:/Users/Admin/Downloads/logikchain/logikchain.com/constitution/wireframes/Supplier.md#SUP-06), [VEH-03 Vehicle Manifest](file:///c:/Users/Admin/Downloads/logikchain/logikchain.com/constitution/wireframes/Vehicle.md#VEH-03)

### 2. Derived Use Cases
#### UC-04.01.A: Automated Dynamic Manifest Initialization
- **Description**: When a supplier schedules a gig, the system initializes a dedicated dynamic manifest ("pamphlet") tied directly to the vehicle run.
- **Primary Actor**: System (`gigs-service`) or Warehouse Dispatcher (`role: supplier`).
- **Secondary Systems**: `pamphlet-service`, `gigs-service`, Cloud Firestore.
- **Preconditions**: A valid gig is being scheduled with vehicle ID and start timestamp.
- **Nominal Flow**:
  1. `gigs-service` invokes `POST /v1/pamphlets` during gig composition.
  2. `pamphlet-service` generates pamphlet ID matching `{vehicleId}_{startDatetime}`.
  3. Manifest is created in `pamphlet_db.pamphlets` with status `draft`.
  4. SKU manifest table is initialized with items required for the assigned orders.
  5. Outbox event emitted for Firestore mirror.
- **Postconditions**: Pamphlet established; ready for physical warehouse loading.

### 3. User Journey Stories
- **US-04.01.01**: *As a warehouse dispatcher, I want a dedicated digital manifest for every scheduled vehicle departure, so that inventory loaded onto the truck is tracked with total fidelity.*

#### Acceptance Criteria (Gherkin)
```gherkin
Scenario: Automatic pamphlet generation on gig compose
  Given gigs-service composing gig "veh_01_20261004T060000Z"
  When gigs-service posts to "/v1/pamphlets" with vehicleId "veh_01" and startDatetime "20261004T060000Z"
  Then pamphlet-service creates pamphlet "veh_01_20261004T060000Z"
  And returns status 201 with empty initial inventory state
```

### 4. Integration Stories
- **INT-04.01.01 (Gigs Service Lifecycle Hook Integration)**: *As the Pamphlet Service, I need to receive REST calls from `gigs-service` (`:4003`) to auto-create and close vehicle manifests matching gig lifecycles.*
- **INT-04.01.02 (Firestore Periodic Sync Integration)**: *As the Pamphlet Service, I need to synchronize manifest items to Firestore collection `/Pamphlets/{pamphletId}` every 2000ms for real-time mobile app updates.*

### 5. Independent Support Stories
- **OPS-04.01.01 (DevOps & Database Schema)**: *Maintain multi-stage Docker build, configure Kubernetes deployment (`03-pamphlet.yaml`), and apply PostgreSQL schema migrations for `pamphlet_db`.*
- **DOC-04.01.01 (Manifest Schema Documentation)**: *Publish technical documentation detailing the relationship between Gigs, Orders, and Pamphlet SKUs.*
- **TEST-04.01.01 (Automated Test Suite)**: *Build automated Bruno API test collection `tests/bruno/04-pamphlet/createPamphlet/` verifying deterministic ID generation.*

---

## FEAT-04.02: Warehouse Loading, Unloading & Stock Deltas

### 1. Feature Metadata & Hierarchy
- **Feature ID**: `FEAT-04.02`
- **Functional Scope**: Physical stock load delta verification, gate dispatch approval, and post-trip stock unloading.
- **Service Endpoints**: `POST /v1/pamphlets/{id}/load` (`loadStock`), `POST /v1/pamphlets/{id}/unload` (`unloadStock`)
- **UI Screens**: [SUP-06 Warehouse Loading](file:///c:/Users/Admin/Downloads/logikchain/logikchain.com/constitution/wireframes/Supplier.md#SUP-06), [VEH-03 Manifest Inspection](file:///c:/Users/Admin/Downloads/logikchain/logikchain.com/constitution/wireframes/Vehicle.md#VEH-03)

### 2. Derived Use Cases
#### UC-04.02.A: Physical Warehouse Loading & Driver Sign-Off
- **Description**: Warehouse crew loads cartons and bags into delivery truck; driver scans or verifies items before leaving.
- **Primary Actor**: Warehouse Loader (`role: supplier`) and Vehicle Driver (`role: vehicle`).
- **Nominal Flow**:
  1. Warehouse loader scans loaded SKUs into `SUP-06`.
  2. System calls `POST /v1/pamphlets/{id}/load` with batch items and quantities.
  3. `pamphlet-service` increments `loaded_qty` in `pamphlet_db.pamphlet_items`.
  4. Driver inspects truck, reviews manifest on `VEH-03`, and submits digital sign-off.
  5. Pamphlet status transitions to `sealed`.
- **Postconditions**: Stock custody transferred from warehouse to vehicle driver; manifest sealed for transit.

### 3. User Journey Stories
- **US-04.02.01**: *As a delivery driver, I want to review and confirm the exact inventory loaded into my vehicle before departure, so that I am not held liable for shortages originating in the warehouse.*

#### Acceptance Criteria (Gherkin)
```gherkin
Scenario: Warehouse loading stock batch into vehicle pamphlet
  Given an open draft pamphlet "veh_01_20261004T060000Z"
  When warehouse loader posts stock items [SKU-100: 50 units, SKU-200: 20 units] to "/load"
  Then pamphlet-service increments loaded quantities
  And records batch timestamp and warehouse operator ID
```

### 4. Integration Stories
- **INT-04.02.01 (Orders Service Linkage Integration)**: *As the Pamphlet Service, I need to accept `linkOrderToPamphlet` events from `orders-service` (`:4002`) to verify that all loaded items correspond to approved customer orders.*
- **INT-04.02.02 (Firestore Delta Sync Integration)**: *As the Pamphlet Service, I need to push real-time delta events to Firestore so the driver's Android app immediately reflects updated stock counts.*

### 5. Independent Support Stories
- **OPS-04.02.01 (PostgreSQL Transaction Isolation)**: *Ensure strict row-level locking (`SELECT ... FOR UPDATE`) in `pamphlet_db` to prevent race conditions during simultaneous load/unload delta writes.*
- **DOC-04.02.01 (Loading Gate Runbook)**: *Document warehouse gate check operating procedures and variance dispute escalation trees.*
- **TEST-04.02.01 (Bruno API Automation)**: *Create Bruno automated test `tests/bruno/04-pamphlet/loadStock/` asserting item count math.*

---

## FEAT-04.03: In-Transit Stock Adjustments & Damage Claims

### 1. Feature Metadata & Hierarchy
- **Feature ID**: `FEAT-04.03`
- **Functional Scope**: On-road inventory adjustments, damaged carton write-offs, missing items, and stock re-balancing.
- **Service Endpoints**: `POST /v1/pamphlets/{id}/adjust` (`adjustStockItem`), `GET /v1/pamphlets/{id}/snapshot`
- **UI Screens**: [VEH-04 Stock Adjustment](file:///c:/Users/Admin/Downloads/logikchain/logikchain.com/constitution/wireframes/Vehicle.md#VEH-04), [SUP-07 Inventory Audit](file:///c:/Users/Admin/Downloads/logikchain/logikchain.com/constitution/wireframes/Supplier.md#SUP-07)

### 2. Derived Use Cases
#### UC-04.03.A: In-Transit Breakage / Damaged Stock Recording
- **Description**: Driver discovers damaged items during transit (e.g. broken oil tin) and logs an adjustment before drop-off.
- **Primary Actor**: Vehicle Driver (`role: vehicle`).
- **Nominal Flow**:
  1. Driver navigates to `VEH-04`, selects SKU, and logs reason code `damaged_in_transit`.
  2. Driver takes photo proof on mobile and enters affected quantity.
  3. Client calls `POST /v1/pamphlets/{id}/adjust`.
  4. `pamphlet-service` deducts available deliverable stock and increments `damaged_qty`.
  5. Photo uploaded to Cloud Storage via sync engine; supplier alerted.
- **Postconditions**: Deliverable inventory updated; loss recorded for accounting reconciliation.

### 3. User Journey Stories
- **US-04.03.01**: *As a driver, I want to immediately log damaged or spilled goods with photo evidence, so that customer orders can be adjusted before delivery attempts.*

#### Acceptance Criteria (Gherkin)
```gherkin
Scenario: Driver logs broken goods in transit
  Given a sealed vehicle pamphlet with 20 units of "SKU-OIL-1L"
  When driver posts an adjustment of -2 units with reason "broken_bottle" and photo URI
  Then pamphlet-service reduces deliverable stock to 18 units
  And records 2 units in damaged_inventory audit table
```

### 4. Integration Stories
- **INT-04.03.01 (Orders Service Adjustment Integration)**: *As the Pamphlet Service, I need to notify `orders-service` (`:4002`) if an inventory adjustment causes an order fulfillment shortfall, so the order is automatically flagged for partial delivery.*
- **INT-04.03.02 (Firebase Cloud Storage Photo Sync Integration)**: *As the Pamphlet Service, I need to sync damage claim photos to Firebase Cloud Storage `/claims/{id}/damage.jpg`.*

### 5. Independent Support Stories
- **OPS-04.03.01 (Storage Event Queue DevOps)**: *Configure `storage_sync_events` worker in `pamphlet-service` to reliably sync image binary metadata.*
- **DOC-04.03.01 (Breakage Policy Documentation)**: *Publish supplier shrinkage thresholds and driver liability terms in standard operating documentation.*
- **TEST-04.03.01 (Bruno API Automation)**: *Create Bruno test collection `tests/bruno/04-pamphlet/adjustStockItem/` verifying non-negative inventory constraints.*
