# EPIC-03: Gig Logistics, Fleet Dispatch & Routing

## 1. Functional Area Alignment & Microservice Metadata
- **Epic ID**: `EPIC-03`
- **Epic Status**: [READY]
- **Functional Area**: Gig Logistics, Fleet Dispatch & Real-Time Routing
- **Bound Microservice**: `microservices/services/gigs-service`
- **Container Port**: `4003`
- **Database**: `gigs_db` (PostgreSQL with outbox event streaming)
- **Primary Runtimes**: Android Native (`logikchain-android` - Official Driver Runtime), Web PWA (`web/s/` Supplier), iOS (`logikchain-ios`)
- **Primary Responsibilities**: Driver fleet dispatch scheduling, surrogate-keyed Gigs (`gig_{id}`) with mutable vehicle/driver bindings, mid-route breakdown vehicle reassignments, real-time GPS telemetry, Play Integrity enforcement, route optimization via Google Maps, and end-of-day gig finalization.

---

## FEAT-03.01: Gig Composition & Fleet Dispatch Scheduling

### 1. Feature Metadata & Hierarchy
- **Feature ID**: `FEAT-03.01`
- **Feature Status**: [READY]
- **Functional Scope**: Route assembly, multi-stop village merchant sequencing, vehicle assignment, surrogate gig ID creation, and mid-route vehicle/driver reassignment.
- **Service Endpoints**: `POST /v1/gigs` (`composeGig`), `GET /v1/gigs/{gigId}`, `PATCH /v1/gigs/{gigId}/reassign-vehicle`, `PATCH /v1/gigs/{gigId}/reassign-driver`
- **UI Screens**: [SUP-02 Gig Scheduler](file:///c:/Users/Admin/Downloads/logikchain/logikchain.com/constitution/wireframes/Supplier.md#SUP-02), [SUP-03 Route Planner](file:///c:/Users/Admin/Downloads/logikchain/logikchain.com/constitution/wireframes/Supplier.md#SUP-03)

### 2. Derived Use Cases
#### UC-03.01.A: Supplier Route Planning & Driver Dispatch (Merchant Hub Anchored)
- **Description**: A regional supplier configures a multi-village delivery circuit where every stop is anchored to a registered Village Merchant location. The gig is assigned a surrogate `gigId`, allowing vehicles and drivers to be reassigned mid-route without breaking order or inventory relationships.
- **Primary Actor**: Regional Supplier (`role: supplier`) or Support Operator (`role: support`) acting as proxy with `X-Supplier-Context` header.
- **Secondary Systems**: `gigs-service`, Google Maps Distance Matrix API, `pamphlet-service`, `config-service`.
- **Preconditions**:
  - Target villages have at least one registered active Merchant in `config_db.villages`.
  - Driver and vehicle are registered and active in `identity_db`.
- **Nominal Flow**:
  1. Supplier selects targeted rural villages on `SUP-03`. System verifies each village has a registered merchant hub.
  2. `gigs-service` queries Google Maps Distance Matrix to compute optimal waypoint sequencing between merchant locations, mileage, and estimated transit times.
  3. Supplier reviews route, assigns vehicle and driver, and clicks "Publish Gig".
  4. `gigs-service` generates an immutable surrogate `gigId` (e.g. `gig_01J8F9Q2...`) and persists the gig with mutable attributes `vehicleId`, `driverId`, and `scheduledDeparture` in `gigs_db.gigs`.
  5. `gigs-service` triggers `pamphlet-service` (`:4004`) to initialize the matching dynamic stock manifest (`pamphletId` linked to `gigId`).
  6. Outbox event emitted for Firestore mirror and driver push notification.
- **Alternate / Degraded Flow**:
  - *Vehicle Breakdown Mid-Route*: If the assigned truck suffers a mechanical failure, the Supplier or Support operator invokes `PATCH /v1/gigs/{gigId}/reassign-vehicle` with `newVehicleId`. The surrogate `gigId` remains unchanged; all associated customer orders, in-transit pamphlet stock, and warehouse manifests remain valid and intact.
- **Postconditions**: Gig created with status `scheduled`; driver notified on Android app; matching pamphlet initialized.

### 3. User Journey Stories
- **US-03.01.01 [READY]**: *As a supplier logistics manager (or Support operator acting as proxy), I want to automatically optimize waypoints across registered merchant locations, so that our delivery vehicles minimize fuel consumption and transit delays.*
- **US-03.01.02 [READY]**: *As a delivery driver, I want to receive my daily scheduled route with merchant stops and order summaries on my Android device, so that I can prepare my vehicle before dispatch.*
- **US-03.01.03 [READY]**: *As a Support operator or Supplier manager, I want to reassign a broken-down vehicle to a replacement truck without altering the underlying gig ID or canceling customer orders, so that rural deliveries can proceed with minimal disruption.*

#### Acceptance Criteria (Gherkin)
```gherkin
Scenario: Supplier composes gig with automated route metrics
  Given a supplier planning a delivery run for vehicle "veh_truck_08"
  When supplier posts to "/v1/gigs" with stops ["vil_ap_01", "vil_ap_02", "vil_ap_03"]
  Then gigs-service creates gig with surrogate ID matching "gig_*"
  And binds vehicleId "veh_truck_08" as a mutable operational attribute
  And calculates estimated transit time and distance via Google Maps API
  And automatically calls pamphlet-service to initialize the vehicle pamphlet

Scenario: Mid-route vehicle reassignment maintains gig continuity
  Given an active gig "gig_9981" assigned to vehicle "veh_truck_08"
  When vehicle "veh_truck_08" suffers breakdown and operator reassigns to "veh_truck_09"
  Then gigs-service updates vehicleId to "veh_truck_09"
  And the gig ID remains "gig_9981" with all orders and pamphlet items intact
```

### 4. Integration Stories
- **INT-03.01.01 [READY] (Google Maps Distance Matrix Integration)**: *As the Gigs Service, I need to integrate with Google Maps Distance Matrix and Routes API to compute road distances, optimal waypoint ordering, and travel durations.*
- **INT-03.01.02 [READY] (Pamphlet Service Integration)**: *As the Gigs Service, I need to call `pamphlet-service` (`:4004`) via internal REST on `composeGig` to automatically initialize the dynamic manifest (`pamphletId` bound to `gigId`).*
- **INT-03.01.03 [READY] (Firestore Periodic Sync Integration)**: *As the Gigs Service, I need to synchronize all gig state changes to Cloud Firestore collection `/Gigs/{gigId}` every 2000ms.*

### 5. Multi-Client Implementation Stories
- **PWA-03.01.01 [READY] (Web PWA Client)**: *Implement Supplier Gig Scheduler (`SUP-02`) and Route Planner (`SUP-03`) with interactive village waypoint selection, Google Maps route visualizer, and departure schedule configuration in `web/`.*
- **AND-03.01.01 [READY] (Android Native Client)**: *Implement Driver Scheduled Route view with offline waypoint caching and push notification listener for newly assigned gigs in `android/`.*
- **IOS-03.01.01 [READY] (iOS Native Client)**: *Implement Supplier Route Monitoring view in iOS management app with route sequence cards and transit time estimates.*

### 6. PWA Cloud Testing Story
- **TEST-03.01.PWA [READY] (PWA Cloud E2E Test on Test Project)**: *Automated Playwright test validating gig composition on `SUP-03`, Google Maps distance calculation, and automatic pamphlet instantiation against `gigs-service` and `pamphlet-service` on `logikchain-test`.*

### 7. Independent Support Stories
- **OPS-03.01.01 [READY] (DevOps & Database Migrations)**: *Deploy `gigs-service` container on Kubernetes (`03-gigs.yaml`), configure database migrations for `gigs_db`, and establish secret bindings for Google Maps API keys.*
- **DOC-03.01.01 [READY] (Route Computation & Surrogate Gig Specs)**: *Document surrogate `gig_{id}` generation, mutable vehicle/driver reassignments, and Google Maps API quota policies in `microservices/` docs.*
- **TEST-03.01.01 [READY] (Bruno API Automation)**: *Create automated test collection `tests/bruno/03-gigs/composeGig/` verifying surrogate key generation and vehicle reassignment.*

### 8. Deployment & Cloud Verification (Acceptance Criteria & Commands)
- **Cloud Run Microservice Deployment Command**:
  ```bash
  docker build -t asia-south1-docker.pkg.dev/logikchain-test/logikchain-microservices/gigs-service:latest -f microservices/services/gigs-service/Dockerfile.service microservices/services/gigs-service
  docker push asia-south1-docker.pkg.dev/logikchain-test/logikchain-microservices/gigs-service:latest
  gcloud run deploy gigs-service \
    --image=asia-south1-docker.pkg.dev/logikchain-test/logikchain-microservices/gigs-service:latest \
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
  npx playwright test tests/e2e/pwa/supplier-gig-composition.spec.ts --project=test --config=playwright.pwa.config.ts
  ```
- **Acceptance Criteria**:
  - [ ] `gigs-service` deployed to Cloud Run in `logikchain-test` with valid Google Maps API credentials.
  - [ ] Web PWA deployed to Firebase Hosting on `logikchain-test` and successfully renders route planner.
  - [ ] Automated PWA E2E tests compose a gig and verify dynamic `{vehicleId}_{startDatetime}` keying on test project.

---

## FEAT-03.02: Live Gig Execution & Real-Time Telemetry

### 1. Feature Metadata & Hierarchy
- **Feature ID**: `FEAT-03.02`
- **Feature Status**: [READY]
- **Functional Scope**: Gig start attestation, background GPS ping ingestion, real-time driver tracking, and Play Integrity verification.
- **Service Endpoints**: `POST /v1/gigs/{gigId}:start`, `POST /v1/gigs/{gigId}/location`
- **UI Screens**: [VEH-02 Active Gig](file:///c:/Users/Admin/Downloads/logikchain/logikchain.com/constitution/wireframes/Vehicle.md#VEH-02), [BUY-05 Live Tracking](file:///c:/Users/Admin/Downloads/logikchain/logikchain.com/constitution/wireframes/Buyer.md#BUY-05)

### 2. Derived Use Cases
#### UC-03.02.A: Native Driver Route Navigation & Background Telemetry
- **Description**: Delivery driver begins route on Android; app streams GPS telemetry; buyers and suppliers monitor live transit.
- **Primary Actor**: Vehicle Driver (`role: driver`).
- **Secondary Systems**: Android Play Integrity, `gigs-service`, Cloud Firestore.
- **Preconditions**: Driver is authenticated on the official Android app at the departure warehouse.
- **Nominal Flow**:
  1. Driver taps "Start Gig" on screen `VEH-02`.
  2. Android app captures Play Integrity attestation token and transmits `POST /v1/gigs/{gigId}:start`.
  3. `gigs-service` verifies App Check token and transitions gig status to `in_progress`.
  4. While vehicle moves, Android background foreground service pings `POST /v1/gigs/{gigId}/location` every 30 seconds with latitude, longitude, bearing, and speed.
  5. `gigs-service` records coordinates in `gigs_db.telemetry` and streams outbox updates to Firestore.
- **Postconditions**: Gig marked `in_progress`; buyers and suppliers observe live vehicle pin on map.

### 3. User Journey Stories
- **US-03.02.01 [READY]**: *As a driver on the road, I want my Android app to continuously stream GPS coordinates in the background, so that villagers are notified ahead of my arrival without my manual intervention.*

#### Acceptance Criteria (Gherkin)
```gherkin
Scenario: Driver starts gig with Play Integrity token
  Given an authenticated driver on the official Android app
  When the driver posts to "/v1/gigs/veh_01_20261004T060000Z:start" with Play Integrity token
  Then gigs-service transitions gig status to "in_progress"
  And begins accepting location telemetry pings
```

### 4. Integration Stories
- **INT-03.02.01 [READY] (Play Integrity App Check Integration)**: *As the Gigs Service, I need to reject `startGig` and `updateGigLocation` requests that do not provide a valid Android Google Play Integrity token to prevent fake GPS injection.*
- **INT-03.02.02 [READY] (Firestore Telemetry Sync Integration)**: *As the Gigs Service, I need to stream driver GPS coordinates to Firestore collection `/DriverLocations/{vehicleId}` for ultra-low latency client map rendering.*

### 5. Multi-Client Implementation Stories
- **PWA-03.02.01 [READY] (Web PWA Client)**: *Implement Buyer Live Tracking map (`BUY-05`) with smooth vehicle pin animation reacting to Firestore `/DriverLocations` stream.*
- **AND-03.02.01 [READY] (Android Native — Driver Navigation UI Layout)**: *Implement Jetpack Compose active navigation screen (`VEH-02`) with waypoint sequence cards, turn-by-turn banner, and gig status control buttons.*
- **AND-03.02.02 [READY] (Android Native — Foreground GPS Location Service)**: *Build Android Foreground Service with continuous background GPS pinging (30s interval), battery optimization whitelist request, and Google Play Integrity token attestation.*
- **AND-03.02.03 [READY] (Android Native — Room DB Offline Waypoint & Telemetry Cache)**: *Implement local Room database entities and DAOs for caching route waypoints and queueing GPS telemetry points during cellular dead zones.*
- **IOS-03.02.01 [READY] (iOS Native Client)**: *Implement Buyer Live Tracking map using MapKit with real-time Firestore vehicle coordinate binding.*

### 6. PWA Cloud Testing Story
- **TEST-03.02.PWA [READY] (PWA Cloud E2E Test on Test Project)**: *Automated Playwright test verifying that when synthetic telemetry is pushed to `gigs-service`, the buyer PWA tracking view updates the delivery vehicle position smoothly on `logikchain-test`.*

### 7. Independent Support Stories
- **OPS-03.02.01 [READY] (High-Throughput Ingestion Tuning)**: *Configure connection pooling and write-batching in `gigs-service` to efficiently handle 10,000 concurrent driver GPS pings per minute.*
- **DOC-03.02.01 [READY] (Telemetry Pipeline Documentation)**: *Publish sequence diagrams showing GPS ping ingestion, validation, and real-time distribution.*
- **TEST-03.02.01 [READY] (Bruno & Performance Tests)**: *Execute automated Bruno test `tests/bruno/03-gigs/locationPing/` and load test endpoint with synthetic vehicle telemetry.*

### 8. Deployment & Cloud Verification (Acceptance Criteria & Commands)
- **Cloud Run Microservice Deployment Command**:
  ```bash
  docker build -t asia-south1-docker.pkg.dev/logikchain-test/logikchain-microservices/gigs-service:latest -f microservices/services/gigs-service/Dockerfile.service microservices/services/gigs-service
  docker push asia-south1-docker.pkg.dev/logikchain-test/logikchain-microservices/gigs-service:latest
  gcloud run deploy gigs-service \
    --image=asia-south1-docker.pkg.dev/logikchain-test/logikchain-microservices/gigs-service:latest \
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
  npx playwright test tests/e2e/pwa/driver-live-tracking.spec.ts --project=test --config=playwright.pwa.config.ts
  ```
- **Acceptance Criteria**:
  - [ ] Telemetry ingestion endpoint live on Cloud Run test instance.
  - [ ] Buyer PWA renders live moving pin based on test driver coordinates.
  - [ ] Android client streams GPS pings with Play Integrity token.
  - [ ] Automated PWA E2E tests pass 100% assertions on test project URL.

---

## FEAT-03.03: Gig Finalization & Route Settlement

### 1. Feature Metadata & Hierarchy
- **Feature ID**: `FEAT-03.03`
- **Feature Status**: [READY]
- **Functional Scope**: End-of-day gig audit, completion sign-off, route mileage reconciliation, and driver handoff readiness.
- **Service Endpoints**: `POST /v1/gigs/{gigId}:complete`, `POST /v1/gigs/{gigId}:suspend`
- **UI Screens**: [VEH-06 Gig Summary](file:///c:/Users/Admin/Downloads/logikchain/logikchain.com/constitution/wireframes/Vehicle.md#VEH-06), [SUP-05 Route Monitoring](file:///c:/Users/Admin/Downloads/logikchain/logikchain.com/constitution/wireframes/Supplier.md#SUP-05)

### 2. Derived Use Cases
#### UC-03.03.A: Gig Closure & Route Metrics Audit
- **Description**: Driver completes all village deliveries, returns to warehouse, and finalizes the day's gig.
- **Primary Actor**: Vehicle Driver (`role: driver`).
- **Secondary Systems**: `gigs-service`, `pamphlet-service`, `cash-service`.
- **Nominal Flow**:
  1. Driver arrives back at warehouse and taps "Complete Gig" on `VEH-06`.
  2. `gigs-service` verifies all assigned orders are in a terminal state (`delivered`, `cancelled`, or `returned`).
  3. `gigs-service` computes total actual kilometers driven and transit duration.
  4. `gigs-service` marks gig `completed` and notifies `pamphlet-service` to initiate stock reconciliation.
- **Postconditions**: Gig status set to `completed`; driver unlocked to settle physical cash at cashier desk.

### 3. User Journey Stories
- **US-03.03.01 [READY]**: *As a driver finishing my shift, I want a complete operational summary of my day's deliveries, returns, and mileage, so that I can verify my performance before heading to cash settlement.*

#### Acceptance Criteria (Gherkin)
```gherkin
Scenario: Driver completes gig after all deliveries finished
  Given an in-progress gig where all assigned orders are delivered or returned
  When the driver submits "POST /v1/gigs/veh_01_20261004T060000Z:complete"
  Then gigs-service marks the gig as "completed"
  And calculates total kilometers driven and route efficiency metrics
```

### 4. Integration Stories
- **INT-03.03.01 [READY] (Pamphlet Service Close Integration)**: *As the Gigs Service, I need to call `pamphlet-service` (`:4004`) on gig completion to trigger stock unload auditing.*
- **INT-03.03.02 [READY] (Cash Service Verification Integration)**: *As the Gigs Service, I need to query `cash-service` (`:4007`) to verify if any cash collected during the gig remains outstanding.*

### 5. Multi-Client Implementation Stories
- **PWA-03.03.01 [READY] (Web PWA Client)**: *Implement Supplier Route Monitoring summary dashboard (`SUP-05`) with gig completion status, total mileage, and return auditing.*
- **AND-03.03.01 [READY] (Android Native Client)**: *Implement Driver End-of-Day Summary screen (`VEH-06`) showing delivered count, cash collected total, and "Proceed to Cashier" prompt.*
- **IOS-03.03.01 [READY] (iOS Native Client)**: *Implement Supplier route audit cards with actual vs estimated mileage comparison.*

### 6. PWA Cloud Testing Story
- **TEST-03.03.PWA [READY] (PWA Cloud E2E Test on Test Project)**: *Automated Playwright test validating gig completion audit on Supplier PWA console and verifying status updates against `gigs-service` on `logikchain-test`.*

### 7. Independent Support Stories
- **OPS-03.03.01 [READY] (DevOps & Reporting Queries)**: *Create optimized SQL aggregation views in `gigs_db` for driver daily and monthly performance metrics.*
- **DOC-03.03.01 [READY] (End-of-Gig Settlement Runbook)**: *Document standard operating procedures for handling stranded vehicles or premature gig suspensions.*
- **TEST-03.03.01 [READY] (Bruno API Automation)**: *Create Bruno automated test `tests/bruno/03-gigs/completeGig/` validating that gigs with open orders cannot be finalized.*

### 8. Deployment & Cloud Verification (Acceptance Criteria & Commands)
- **Cloud Run Microservice Deployment Command**:
  ```bash
  docker build -t asia-south1-docker.pkg.dev/logikchain-test/logikchain-microservices/gigs-service:latest -f microservices/services/gigs-service/Dockerfile.service microservices/services/gigs-service
  docker push asia-south1-docker.pkg.dev/logikchain-test/logikchain-microservices/gigs-service:latest
  gcloud run deploy gigs-service \
    --image=asia-south1-docker.pkg.dev/logikchain-test/logikchain-microservices/gigs-service:latest \
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
  npx playwright test tests/e2e/pwa/gig-finalization.spec.ts --project=test --config=playwright.pwa.config.ts
  ```
- **Acceptance Criteria**:
  - [ ] Gig completion endpoint deployed and accessible on Cloud Run test instance.
  - [ ] PWA Supplier dashboard displays updated completion metrics in real-time.
  - [ ] Android client finalizes route and routes driver to cashier OTP screen.
  - [ ] Automated PWA E2E tests pass 100% assertions on test project URL.

---

## FEAT-03.04: Supplier Route Catalog, Freeform Route Authoring, Cloning & Monthly Gig Quota Enforcement

### 1. Feature Metadata & Hierarchy
- **Feature ID**: `FEAT-03.04`
- **Feature Status**: `[READY]`
- **Functional Scope**: Route catalog presentation on `SUP-07`, universal ability for all suppliers to author custom routes from scratch or clone existing corridors/custom routes (`cloneRoute`), zero route-count caps (no separate or combined route quotas), enforcement of subscription **monthly gig execution limits** (`monthlyGigLimit` / `maxGigsPerMonth`) during gig scheduling on any route, interactive route builder on `SUP-07.1`, and deletion protection while referenced by active or upcoming gigs.
- **Service Endpoints**:
  - `POST /v1/routes/{routeId}/clone` (`cloneRoute` on `gigs-service`)
  - `GET /v1/routes` (supports `supplierId` filtering)
  - `POST /v1/routes` (`upsertSupplierRoute` on `gigs-service`)
  - `DELETE /v1/routes/{routeId}` (`deleteSupplierRoute` - blocked with 409 if in use by gigs)
  - `POST /v1/gigs` (`composeGig` - enforces subscription `monthlyGigLimit`)
- **UI Screens**: [SUP-07 Routes Catalog](file:///c:/Users/Admin/Downloads/logikchain/logikchain.com/constitution/wireframes/Supplier.md#SUP-07), [SUP-07.1 Route Builder](file:///c:/Users/Admin/Downloads/logikchain/logikchain.com/constitution/wireframes/Supplier.md#SUP-07.1), [SUP-02 Gig Scheduler](file:///c:/Users/Admin/Downloads/logikchain/logikchain.com/constitution/wireframes/Supplier.md#SUP-02)

### 2. Derived Use Cases

#### UC-03.04.A: Standard Corridor Adoption & Freeform Route Creation / Cloning
- **Description**: Suppliers discover Support pre-configured corridors for their regional hub and can schedule gigs immediately. Additionally, all suppliers have full ability to author custom routes from scratch or clone existing routes (corridors or custom circuits) into their private catalog to modify waypoints, transit times, and delivery sequences. There is no route-count cap or separate quota for standard vs. custom routes.
- **Primary Actor**: Regional Supplier (`role: supplier`).
- **Secondary Systems**: `gigs-service` (`:4003`), `config-service` (`:4010`), Cloud Firestore.
- **Nominal Flow**:
  1. Supplier opens `SUP-07` and browses verified corridors and custom routes.
  2. Supplier can either:
     - Click "Use in Gig ➔" to schedule a delivery run directly on a corridor.
     - Click "[ + New Route ]" to author a completely custom circuit from scratch.
     - Click "[ Clone Route ]" on any corridor or custom route to fork it into a new custom draft (`Copy of ...`).
  3. On cloning/creation, `gigs-service` persists the route in `gigs_db.routes` (with `clonedFromRouteId` pointer if cloned) without imposing any route-count limits.
  4. In Route Builder (`SUP-07.1`), supplier sequences village waypoints, reorders stops via drag-and-drop, and calls Maps Distance Matrix to recalculate transit durations.
  5. Route saved; immediately available in supplier's catalog and visible/editable by Support.
- **Postconditions**: Route saved in database; visible to supplier and Support; zero route-count quota consumed.

#### UC-03.04.B: Subscription Monthly Gig Quota Enforcement & Route Deletion Protection
- **Description**: The subscription plan controls how many **gigs per month** a supplier can operate (`monthlyGigLimit`), alongside fleet vehicle limits (`maxVehicles`). When a supplier schedules a gig on *any* route (standard corridor or custom route), `gigs-service` checks that the supplier's completed/scheduled gig count for the current billing cycle is within their monthly gig quota. Furthermore, deletion of any route is blocked as long as any active or scheduled gigs reference it.
- **Primary Actor**: Regional Supplier (`role: supplier`).
- **Secondary Systems**: `gigs-service` (`:4003`), `identity-service` (`:4001`), `config-service` (`:4010`).
- **Nominal Flow**:
  1. Supplier configures a gig on `SUP-02` on any selected route (standard or custom).
  2. Upon "Publish Gig", `gigs-service` queries `identity-service` / `config-service` for active subscription plan tier:
     - Checks active gigs executed in current monthly billing cycle against plan `monthlyGigLimit` (e.g. Starter: 50, Growth: 200, Enterprise: unlimited).
     - If monthly gig limit is reached: rejects request with `403 PLAN_LIMIT_EXCEEDED` ("Monthly gig limit of 200 reached. Please upgrade subscription plan.").
     - If quota available: gig is created in `gigs_db.gigs` with status `scheduled`.
  3. When an operator or supplier attempts to delete any route:
     - `gigs-service` verifies whether any active or scheduled gigs reference the `routeId`.
     - If referencing gigs exist: deletion is blocked with `409 Conflict` (`ROUTE_IN_USE_BY_GIGS`).
     - If no referencing gigs exist: route is deleted / archived.
- **Postconditions**: Monthly gig volume governed by subscription tier; field deliveries safeguarded against route deletion.

### 3. User Journey Stories
- **US-03.04.01 [READY]**: *As a regional supplier, I want to create custom routes freely or clone existing corridors without being constrained by route-count quotas, so that my logistics team can map any necessary village delivery circuits.*
- **US-03.04.02 [READY]**: *As a regional supplier, I want clear visibility into my monthly gig allowance and usage across all my routes, so that I can manage my delivery schedule within my subscription plan tier.*
- **US-03.04.03 [READY]**: *As a regional supplier, I want the system to warn and block deletion of any route that has active or scheduled gigs, so that drivers in transit are never disrupted by accidental route removals.*

#### Acceptance Criteria (Gherkin)
```gherkin
Scenario: Supplier clones any route freely without route-count restrictions
  Given a supplier "sup_01" subscribed to "Growth" plan
  When supplier requests to clone standard corridor "rte_prakasam_north"
  Then gigs-service creates a new custom route with supplierId "sup_01" and clonedFromRouteId "rte_prakasam_north"
  And route creation succeeds without checking or enforcing any route-count limit
  And supplier is redirected to SUP-07.1 in edit mode

Scenario: Supplier blocked from scheduling gig when monthly gig limit reached
  Given a supplier "sup_02" on "Starter" plan with monthlyGigLimit 50
  And supplier has already scheduled or executed 50 gigs in the current billing cycle
  When supplier attempts to dispatch a new gig on any route (standard or custom)
  Then gigs-service rejects the request with 403 Forbidden and error "PLAN_LIMIT_EXCEEDED"
  And client displays upgrade modal prompting selection of Growth plan

Scenario: Supplier cannot delete route referenced by upcoming gigs
  Given a route "rte_custom_01" referenced by 1 scheduled gig
  When supplier clicks Delete Route on screen "SUP-07.1"
  Then gigs-service rejects deletion with 409 Conflict and error "ROUTE_IN_USE_BY_GIGS"
  And client alerts user to cancel or reassign scheduled gigs first
```

### 4. Integration Stories
- **INT-03.04.01 [READY] (Subscription Monthly Gig Quota Gate)**: *As the Gigs Service, I need to evaluate the supplier's current monthly gig execution count against their active subscription `monthlyGigLimit` in `config_db.subscription_plans` before accepting `composeGig`.*
- **INT-03.04.02 [READY] (Google Maps Distance Matrix Routing Integration)**: *As the Gigs Service, I need to call Google Maps Distance Matrix to compute turnarounds and kilometer lengths when suppliers reorder or edit custom route stops.*
- **INT-03.04.03 [READY] (Active Gig Route Reference Validation)**: *As the Gigs Service, I need to verify that zero active (`in_progress`) or upcoming (`scheduled`) gigs reference a route before processing any route deletion.*

### 5. Multi-Client Implementation Stories
- **PWA-03.04.01 [READY] (Web PWA Route Catalog & Builder)**: *Build route catalog on `SUP-07` with 1-click clone and new route creation, interactive drag-and-drop waypoint editor on `SUP-07.1`, monthly gig quota consumption bar on `SUP-02`, and gig-dependency delete blocker in `web/s/`.*
- **AND-03.04.01 [READY] (Android Native Route Catalog & Stop Inspector)**: *Build native Android route catalog and stop inspection cards for supplier management app.*
- **IOS-03.04.01 [READY] (iOS Native Route Catalog & Stop Inspector)**: *Build native iOS route catalog and stop inspection view for supplier management app.*

### 6. Independent Support Stories
- **DOC-03.04.01 [READY] (Supplier Route Playbook & Monthly Gig Quota Guide)**: *Publish operational documentation explaining standard corridor benefits, route authoring and cloning workflows, and subscription monthly gig quota rules in `docs/playbooks/supplier_route_management.md`.*
- **OPS-03.04.01 [READY] (Gigs Service Route Schema Migration)**: *Create migration for `gigs_db.routes` and configure monthly gig aggregation query index in `gigs_db.gigs`.*
- **TEST-03.04.01 [READY] (Bruno API Automation)**: *Create automated Bruno test `tests/bruno/03-gigs/routeGovernance/` validating route cloning without route caps, 403 rejection on exceeding monthly gig limit, and 409 rejection on deleting routes in use.*


