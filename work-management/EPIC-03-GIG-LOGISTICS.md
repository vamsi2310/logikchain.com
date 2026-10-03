# EPIC-03: Gig Logistics, Fleet Dispatch & Routing

## 1. Functional Area Alignment & Microservice Metadata
- **Epic ID**: `EPIC-03`
- **Epic Status**: [READY]
- **Functional Area**: Gig Logistics, Fleet Dispatch & Real-Time Routing
- **Bound Microservice**: `microservices/services/gigs-service`
- **Container Port**: `4003`
- **Database**: `gigs_db` (PostgreSQL with outbox event streaming)
- **Primary Runtimes**: Android Native (`logikchain-android` - Official Driver Runtime), Web PWA (`web/s/` Supplier), iOS (`logikchain-ios`)
- **Primary Responsibilities**: Driver fleet dispatch scheduling, vehicle-keyed Gigs (`{vehicleId}_{startDatetime}`), real-time GPS telemetry, Play Integrity enforcement, route optimization via Google Maps, and end-of-day gig finalization.

---

## FEAT-03.01: Gig Composition & Fleet Dispatch Scheduling

### 1. Feature Metadata & Hierarchy
- **Feature ID**: `FEAT-03.01`
- **Feature Status**: [READY]
- **Functional Scope**: Route assembly, multi-stop village sequencing, vehicle assignment, and composite Gig initialization.
- **Service Endpoints**: `POST /v1/gigs` (`composeGig`), `GET /v1/gigs/{gigId}`
- **UI Screens**: [SUP-02 Gig Scheduler](file:///c:/Users/Admin/Downloads/logikchain/logikchain.com/constitution/wireframes/Supplier.md#SUP-02), [SUP-03 Route Planner](file:///c:/Users/Admin/Downloads/logikchain/logikchain.com/constitution/wireframes/Supplier.md#SUP-03)

### 2. Derived Use Cases
#### UC-03.01.A: Supplier Route Planning & Driver Dispatch
- **Description**: A regional supplier configures a multi-village delivery circuit, binds it to a vehicle, and schedules departure.
- **Primary Actor**: Regional Supplier (`role: supplier`).
- **Secondary Systems**: `gigs-service`, Google Maps Distance Matrix API, `pamphlet-service`.
- **Preconditions**: Driver and vehicle are registered and active in `identity_db`.
- **Nominal Flow**:
  1. Supplier selects targeted rural villages and delivery order backlog on `SUP-03`.
  2. `gigs-service` queries Google Maps Distance Matrix to compute optimal waypoint sequencing, mileage, and estimated transit times.
  3. Supplier reviews optimized sequence and clicks "Publish Gig".
  4. `gigs-service` creates Gig record keyed by `{vehicleId}_{startDatetime}` in `gigs_db.gigs`.
  5. `gigs-service` triggers `pamphlet-service` (`:4004`) to instantiate the matching dynamic stock manifest.
  6. Outbox event emitted for Firestore mirror and driver push notification.
- **Postconditions**: Gig created with status `scheduled`; driver notified on Android app; matching pamphlet initialized.

### 3. User Journey Stories
- **US-03.01.01 [READY]**: *As a supplier logistics manager, I want to automatically optimize waypoints across multiple villages, so that our delivery vehicles minimize fuel consumption and transit delays.*
- **US-03.01.02 [READY]**: *As a delivery driver, I want to receive my daily scheduled route with village stops and order summaries on my Android device, so that I can prepare my vehicle before dispatch.*

#### Acceptance Criteria (Gherkin)
```gherkin
Scenario: Supplier composes gig with automated route metrics
  Given a supplier planning a delivery run for vehicle "veh_truck_08"
  When supplier posts to "/v1/gigs" with stops ["vil_ap_01", "vil_ap_02", "vil_ap_03"]
  Then gigs-service creates gig with ID "veh_truck_08_20261004T060000Z"
  And calculates estimated transit time and distance via Google Maps API
  And automatically calls pamphlet-service to initialize the vehicle pamphlet
```

### 4. Integration Stories
- **INT-03.01.01 [READY] (Google Maps Distance Matrix Integration)**: *As the Gigs Service, I need to integrate with Google Maps Distance Matrix and Routes API to compute road distances, optimal waypoint ordering, and travel durations.*
- **INT-03.01.02 [READY] (Pamphlet Service Integration)**: *As the Gigs Service, I need to call `pamphlet-service` (`:4004`) via internal REST on `composeGig` to automatically initialize the dynamic manifest for the vehicle run.*
- **INT-03.01.03 [READY] (Firestore Periodic Sync Integration)**: *As the Gigs Service, I need to synchronize all gig state changes to Cloud Firestore collection `/Gigs/{gigId}` every 2000ms.*

### 5. Multi-Client Implementation Stories
- **PWA-03.01.01 [READY] (Web PWA Client)**: *Implement Supplier Gig Scheduler (`SUP-02`) and Route Planner (`SUP-03`) with interactive village waypoint selection, Google Maps route visualizer, and departure schedule configuration in `web/`.*
- **AND-03.01.01 [READY] (Android Native Client)**: *Implement Driver Scheduled Route view with offline waypoint caching and push notification listener for newly assigned gigs in `android/`.*
- **IOS-03.01.01 [READY] (iOS Native Client)**: *Implement Supplier Route Monitoring view in iOS management app with route sequence cards and transit time estimates.*

### 6. PWA Cloud Testing Story
- **TEST-03.01.PWA [READY] (PWA Cloud E2E Test on Test Project)**: *Automated Playwright test validating gig composition on `SUP-03`, Google Maps distance calculation, and automatic pamphlet instantiation against `gigs-service` and `pamphlet-service` on `logikchain-test`.*

### 7. Independent Support Stories
- **OPS-03.01.01 [READY] (DevOps & Database Migrations)**: *Deploy `gigs-service` container on Kubernetes (`03-gigs.yaml`), configure database migrations for `gigs_db`, and establish secret bindings for Google Maps API keys.*
- **DOC-03.01.01 [READY] (Route Computation & Gig Specs)**: *Document the deterministic `{vehicleId}_{startDatetime}` gig ID generation rule and Google Maps API quota policies in `microservices/` docs.*
- **TEST-03.01.01 [READY] (Bruno API Automation)**: *Create automated test collection `tests/bruno/03-gigs/composeGig/` verifying composite key generation and waypoint persistence.*

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
- **Primary Actor**: Vehicle Driver (`role: vehicle`).
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
- **AND-03.02.01 [READY] (Android Native Client)**: *Implement Driver Active Gig navigation screen (`VEH-02`) with Foreground Service background GPS pinging, Play Integrity attestation, and offline waypoint caching.*
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
- **Primary Actor**: Vehicle Driver (`role: vehicle`).
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
