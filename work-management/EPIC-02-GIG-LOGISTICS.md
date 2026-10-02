# EPIC-02: Gig Planning, Dispatch & Real-Time Logistics Execution

## Executive Summary
EPIC-02 governs the multi-village rural logistics engine. A "Gig" is a planned delivery run connecting a supplier, an authorized driver/vehicle, a physical or digital catalog (Pamphlet), a predefined sequence of villages along a route, and scheduled merchant stops.

---

## FEAT-02.01: Gig Composition & Multi-Village Route Binding

### 1. Hierarchy & Metadata
- **Epic**: `EPIC-02`
- **Feature ID**: `FEAT-02.01`
- **Official Runtimes**: Supplier Web Console (`web/s/index.html`), Functions
- **Screens**: [SUP-03 Gigs List](file:///c:/Users/Admin/Downloads/logikchain/logikchain.com/constitution/wireframes/Supplier.md#SUP-03), [SUP-04 Compose Gig](file:///c:/Users/Admin/Downloads/logikchain/logikchain.com/constitution/wireframes/Supplier.md#SUP-04)
- **Functions / APIs**: `POST /v1/gigs` (`composeGig`)

### 2. Business Value & Problem Statement
Rural logistics requires consolidating micro-orders into daily delivery runs. Suppliers plan runs days ahead, associating inventory pamphlets, vehicle availability, and estimated village arrival windows.

### 3. Users in Use Case
- **Primary Actor**: Supplier Logistics Manager (`role: supplier`).
- **Secondary Actor**: Assigned Driver (`role: vehicle`).

### 4. End-to-End Use Case Narrative
1. **Pre-conditions**: Active Route exists with sequenced villages; Vehicle driver profile is `approved`; Pamphlet is active.
2. **Main Flow**:
   - Supplier selects Route, Pamphlet, Vehicle, and departure date on `SUP-04`.
   - Supplier inputs expected arrival time per village stop.
   - Function `composeGig` verifies driver is not double-booked, validates route geometry, initializes Gig doc with status `scheduled`, and emits FCM notification to the driver.
3. **Alternate Flow**: Driver already assigned to another overlapping gig $\rightarrow$ System rejects with `409 DRIVER_UNAVAILABLE`.
4. **Post-conditions**: `Gigs/{gigId}` created with state `scheduled`; Driver invited to acknowledge.

### 5. Agile User Stories
- **US-02.01.01 (Must Have)**: As a supplier, I want to create a new delivery gig binding a driver, route, and product catalog, so that rural villages receive timely deliveries according to scheduled arrival windows.

### 6. Acceptance Criteria (Gherkin)

```gherkin
Scenario: Supplier successfully composes a gig
  Given an authenticated supplier "sup_01"
  When supplier calls "POST /v1/gigs" with:
    | title       | "Prakasam West Morning Run" |
    | routeId     | "rte_prakasam_01"           |
    | vehicleId   | "usr_drv_05"                |
    | pamphletId  | "pmp_groceries_sep"         |
    | date        | "2026-10-05"                |
  Then response status is 201 Created
  And response contains "gigId"
  And Firestore document "/Gigs/{gigId}" has "status: scheduled"
```

### 7. Developer Test Plan & Mapping
- **Bruno API Test**: `tests/bruno/02-gigs/composeGig/`.
- **UI E2E Test**: `tests/e2e/supplier/gig-composition.spec.ts` on `SUP-04`.
- **Unit Tests**: Driver conflict checker, arrival time chronological sequence validator.
- **Functional Tests**: Firestore trigger verification for driver FCM notification payload.

---

## FEAT-02.02: Driver Gig Acknowledgment & Dispatch Activation

### 1. Hierarchy & Metadata
- **Epic**: `EPIC-02`
- **Feature ID**: `FEAT-02.02`
- **Official Runtimes**: Android (`logikchain-android` Official), Web PWA (Read-only notice)
- **Screens**: [DRV-02 Gigs List](file:///c:/Users/Admin/Downloads/logikchain/logikchain.com/constitution/wireframes/Driver.md#DRV-02), [DRV-03 Active Run](file:///c:/Users/Admin/Downloads/logikchain/logikchain.com/constitution/wireframes/Driver.md#DRV-03)
- **Functions / APIs**: `POST /v1/gigs/{gigId}:acknowledge` (`acknowledgeGig`), `POST /v1/gigs/{gigId}:start` (`startGig`)

### 2. Business Value & Problem Statement
Before driving to the warehouse, drivers must acknowledge their assignment. Once loaded and inspected, starting the gig transitions it to `in_transit`, alerting all downstream buyers and merchants.

### 3. Acceptance Criteria (Gherkin)

```gherkin
Scenario: Driver acknowledges and starts gig on Android official app
  Given an authenticated driver on the Android native app
  And a gig "gig_99" in status "scheduled" assigned to this driver
  When driver posts to "/v1/gigs/gig_99:acknowledge"
  Then gig status transitions to "acknowledged"
  When driver posts to "/v1/gigs/gig_99:start"
  Then gig status transitions to "in_transit"
  And gig field "startedAt" is populated with current server timestamp

Scenario: Driver attempts to start gig from Web PWA
  Given an authenticated driver on Web PWA
  When attempting to trigger start gig
  Then the PWA blocks the action and displays "Official Client: Android Native Required for Gig Execution"
```

### 4. Developer Test Plan & Mapping
- **Bruno API Test**: `tests/bruno/02-gigs/acknowledgeGig/` and `startGig/`.
- **UI E2E Test**: Android Espresso test verifying trip start button and GPS permission gate.
- **Unit Tests**: State machine transitions (`scheduled` $\rightarrow$ `acknowledged` $\rightarrow$ `in_transit`).

---

## FEAT-02.03: Real-Time Telemetry & In-Transit Location Pings

### 1. Hierarchy & Metadata
- **Epic**: `EPIC-02`
- **Feature ID**: `FEAT-02.03`
- **Official Runtimes**: Android Native (WorkManager / Foreground Service), Functions
- **Screens**: [DRV-03 Active Run](file:///c:/Users/Admin/Downloads/logikchain/logikchain.com/constitution/wireframes/Driver.md#DRV-03), [BUY-05 Gig Tracking](file:///c:/Users/Admin/Downloads/logikchain/logikchain.com/constitution/wireframes/Buyer.md#BUY-05)
- **Functions / APIs**: `PATCH /v1/gigs/{gigId}/location` (`updateGigLocation`)

### 2. Business Value & Problem Statement
Rural buyers and merchants need live visibility of the incoming supply truck to meet at pickup points on time. Android WorkManager pushes location pings reliably even in low-reception areas.

### 3. Acceptance Criteria (Gherkin)

```gherkin
Scenario: Driver publishes valid telemetry ping
  Given an active gig "gig_99" in status "in_transit"
  When the Android client patches "/v1/gigs/gig_99/location" with:
    | latitude   | 15.512000                |
    | longitude  | 80.042000                |
    | capturedAt | "2026-10-05T08:30:00Z"   |
  Then response status is 200 OK
  And "Gigs/gig_99.currentLocation" matches coordinates
  And "Gigs/gig_99.lastPingAt" is updated
```

### 4. Developer Test Plan & Mapping
- **Bruno API Test**: `tests/bruno/02-gigs/updateGigLocation/`.
- **Unit Tests**: Lat/Long boundary check ($-90 \le lat \le 90$, $-180 \le lon \le 180$).
- **Functional Tests**: Rate limit assertion: max 1 ping per 10 seconds per gig.

---

## FEAT-02.04: Gig Completion, Finalization & Earnings Ledgering

### 1. Hierarchy & Metadata
- **Epic**: `EPIC-02`
- **Feature ID**: `FEAT-02.04`
- **Official Runtimes**: Android Native, Functions
- **Screens**: [DRV-04 Trip Summary & Handover](file:///c:/Users/Admin/Downloads/logikchain/logikchain.com/constitution/wireframes/Driver.md#DRV-04)
- **Functions / APIs**: `POST /v1/gigs/{gigId}:complete` (`completeAndFinalizeGig`)

### 2. Business Value & Problem Statement
Completing a gig locks order deliveries, calculates driver pay (base trip fee + per-km + per-delivery bonus), credits the driver balance, and ensures all collected cash is accounted for.

### 3. Acceptance Criteria (Gherkin)

```gherkin
Scenario: Complete gig and calculate driver payout credit
  Given gig "gig_99" with 12 successful orders and total distance 45.2 km
  And all undelivered items are marked returned
  When driver calls "POST /v1/gigs/gig_99:complete"
  Then status transitions to "completed"
  And driver earnings are calculated: "base + (perKm * 45.2) + (perDelivery * 12)"
  And a credit ledger entry is posted to the driver's earnings account
```

### 4. Developer Test Plan & Mapping
- **Bruno API Test**: `tests/bruno/02-gigs/completeAndFinalizeGig/`.
- **Unit Tests**: Driver trip fare calculator logic adhering to supplier rate card.
- **Functional Tests**: Financial double-entry test verifying Gig completion ledger transaction.

---

## FEAT-02.05: Route Disruption, Gig Suspension & Driver Reassignment

### 1. Hierarchy & Metadata
- **Epic**: `EPIC-02`
- **Feature ID**: `FEAT-02.05`
- **Official Runtimes**: Supplier Web Console, Support Console, Functions
- **Screens**: [SUP-05 Gig Exceptions](file:///c:/Users/Admin/Downloads/logikchain/logikchain.com/constitution/wireframes/Supplier.md#SUP-05)
- **Functions / APIs**: `POST /v1/gigs/{gigId}:suspend` (`suspendGig`), `PATCH /v1/gigs/{gigId}/driver` (`reassignGigDriver`)

### 2. Business Value & Problem Statement
In cases of vehicle breakdown or road blockages, a supplier must suspend the gig or reassign it to an alternate driver without losing order state.

### 3. Acceptance Criteria (Gherkin)

```gherkin
Scenario: Supplier suspends gig due to vehicle breakdown
  Given an in-transit gig "gig_99"
  When supplier posts to "/v1/gigs/gig_99:suspend" with reason "Engine breakdown at Mandal Junction"
  Then gig status changes to "suspended"
  And active orders on the gig are marked on-hold
  And alert notification is broadcast to all affected merchants and buyers
```

### 4. Developer Test Plan & Mapping
- **Bruno API Test**: `tests/bruno/02-gigs/suspendGig/` and `reassignGigDriver/`.
- **UI E2E Test**: `tests/e2e/supplier/gig-reassignment.spec.ts`.
- **Unit Tests**: Order hold state mapper on gig suspension.
