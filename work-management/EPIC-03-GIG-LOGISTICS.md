# EPIC-03: Gig Logistics, Fleet Dispatch & Routing

## 1. Functional Area Alignment & Microservice Metadata
- **Epic ID**: `EPIC-03`
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
- **US-03.01.01**: *As a supplier logistics manager, I want to automatically optimize waypoints across multiple villages, so that our delivery vehicles minimize fuel consumption and transit delays.*
- **US-03.01.02**: *As a delivery driver, I want to receive my daily scheduled route with village stops and order summaries on my Android device, so that I can prepare my vehicle before dispatch.*

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
- **INT-03.01.01 (Google Maps Distance Matrix Integration)**: *As the Gigs Service, I need to integrate with Google Maps Distance Matrix and Routes API to compute road distances, optimal waypoint ordering, and travel durations.*
- **INT-03.01.02 (Pamphlet Service Integration)**: *As the Gigs Service, I need to call `pamphlet-service` (`:4004`) via internal REST on `composeGig` to automatically initialize the dynamic manifest for the vehicle run.*
- **INT-03.01.03 (Firestore Periodic Sync Integration)**: *As the Gigs Service, I need to synchronize all gig state changes to Cloud Firestore collection `/Gigs/{gigId}` every 2000ms.*

### 5. Independent Support Stories
- **OPS-03.01.01 (DevOps & Database Migrations)**: *Deploy `gigs-service` container on Kubernetes (`03-gigs.yaml`), configure database migrations for `gigs_db`, and establish secret bindings for Google Maps API keys.*
- **DOC-03.01.01 (Route Computation & Gig Specs)**: *Document the deterministic `{vehicleId}_{startDatetime}` gig ID generation rule and Google Maps API quota policies in `microservices/` docs.*
- **TEST-03.01.01 (Bruno API Automation)**: *Create automated test collection `tests/bruno/03-gigs/composeGig/` verifying composite key generation and waypoint persistence.*

---

## FEAT-03.02: Live Gig Execution & Real-Time Telemetry

### 1. Feature Metadata & Hierarchy
- **Feature ID**: `FEAT-03.02`
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
- **US-03.02.01**: *As a driver on the road, I want my Android app to continuously stream GPS coordinates in the background, so that villagers are notified ahead of my arrival without my manual intervention.*

#### Acceptance Criteria (Gherkin)
```gherkin
Scenario: Driver starts gig with Play Integrity token
  Given an authenticated driver on the official Android app
  When the driver posts to "/v1/gigs/veh_01_20261004T060000Z:start" with Play Integrity token
  Then gigs-service transitions gig status to "in_progress"
  And begins accepting location telemetry pings
```

### 4. Integration Stories
- **INT-03.02.01 (Play Integrity App Check Integration)**: *As the Gigs Service, I need to reject `startGig` and `updateGigLocation` requests that do not provide a valid Android Google Play Integrity token to prevent fake GPS injection.*
- **INT-03.02.02 (Firestore Telemetry Sync Integration)**: *As the Gigs Service, I need to stream driver GPS coordinates to Firestore collection `/DriverLocations/{vehicleId}` for ultra-low latency client map rendering.*

### 5. Independent Support Stories
- **OPS-03.02.01 (High-Throughput Ingestion Tuning)**: *Configure connection pooling and write-batching in `gigs-service` to efficiently handle 10,000 concurrent driver GPS pings per minute.*
- **DOC-03.02.01 (Telemetry Pipeline Documentation)**: *Publish sequence diagrams showing GPS ping ingestion, validation, and real-time distribution.*
- **TEST-03.02.01 (Bruno & Performance Tests)**: *Execute automated Bruno test `tests/bruno/03-gigs/locationPing/` and load test endpoint with synthetic vehicle telemetry.*

---

## FEAT-03.03: Gig Finalization & Route Settlement

### 1. Feature Metadata & Hierarchy
- **Feature ID**: `FEAT-03.03`
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
- **US-03.03.01**: *As a driver finishing my shift, I want a complete operational summary of my day's deliveries, returns, and mileage, so that I can verify my performance before heading to cash settlement.*

#### Acceptance Criteria (Gherkin)
```gherkin
Scenario: Driver completes gig after all deliveries finished
  Given an in-progress gig where all assigned orders are delivered or returned
  When the driver submits "POST /v1/gigs/veh_01_20261004T060000Z:complete"
  Then gigs-service marks the gig as "completed"
  And calculates total kilometers driven and route efficiency metrics
```

### 4. Integration Stories
- **INT-03.03.01 (Pamphlet Service Close Integration)**: *As the Gigs Service, I need to call `pamphlet-service` (`:4004`) on gig completion to trigger stock unload auditing.*
- **INT-03.03.02 (Cash Service Verification Integration)**: *As the Gigs Service, I need to query `cash-service` (`:4007`) to verify if any cash collected during the gig remains outstanding.*

### 5. Independent Support Stories
- **OPS-03.03.01 (DevOps & Reporting Queries)**: *Create optimized SQL aggregation views in `gigs_db` for driver daily and monthly performance metrics.*
- **DOC-03.03.01 (End-of-Gig Settlement Runbook)**: *Document standard operating procedures for handling stranded vehicles or premature gig suspensions.*
- **TEST-03.03.01 (Bruno API Automation)**: *Create Bruno automated test `tests/bruno/03-gigs/completeGig/` validating that gigs with open orders cannot be finalized.*
