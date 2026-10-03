# EPIC-02: Gig Planning, Dispatch & Real-Time Logistics Execution

## Executive Summary
EPIC-02 governs the multi-village rural logistics engine. A "Gig" is a planned delivery run connecting a supplier, an authorized driver, a **mandatory vehicle** (vehicleId + startDatetime form the canonical Gig document key), a predefined sequence of villages along a route, and scheduled merchant stops. Each Gig is backed by a **Pamphlet** — a dynamic stock manifest microservice that updates in real-time as stock loads, unloads, and delivers throughout the run.

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

---

## FEAT-02.06: Gig Pamphlet — Dynamic Stock Manifest Microservice

### 1. Hierarchy & Metadata
- **Epic**: `EPIC-02`
- **Feature ID**: `FEAT-02.06`
- **Official Runtimes**: Supplier Web Console (`web/s/index.html`), Android Native (Driver), Web PWA (Buyer read-only), Functions
- **Screens**: [SUP-04 Compose Gig](file:///c:/Users/Admin/Downloads/logikchain/logikchain.com/constitution/wireframes/Supplier.md#SUP-04), [DRV-03 Active Run](file:///c:/Users/Admin/Downloads/logikchain/logikchain.com/constitution/wireframes/Driver.md#DRV-03)
- **Microservice Handler**: `handlers/pamphlet.ts` (separate Cloud Functions module, co-deployed with Gigs)
- **Functions / APIs**:
  - `POST /v1/pamphlets` (`createGigPamphlet`) — supplier creates manifest from their catalog
  - `POST /v1/pamphlets/{pamphletId}/stock:load` (`loadStock`) — driver scans/confirms items loaded at warehouse
  - `POST /v1/pamphlets/{pamphletId}/stock:unload` (`unloadStock`) — items returned / offloaded at a stop
  - `PATCH /v1/pamphlets/{pamphletId}/stock/{itemId}` (`adjustStockItem`) — quantity correction by supplier
  - `POST /v1/pamphlets/{pamphletId}/orders/{orderId}:link` (`linkOrderToPamphlet`) — called internally when an order is placed on an active gig
  - `GET /v1/pamphlets/{pamphletId}` (`getPamphletSnapshot`) — full manifest at current point in time
  - `POST /v1/pamphlets/{pamphletId}:close` (`closePamphlet`) — triggered by `completeAndFinalizeGig`; seals the manifest

### 2. Document Key & Naming Convention

```
Firestore path:  /Pamphlets/{vehicleId}_{startDatetime}
Example key:     VH-KA01AB1234_2026-10-05T06:30:00Z

Sub-collections:
  /Pamphlets/{id}/StockItems/{itemId}
    { skuId, name, qtyLoaded, qtySold, qtyReturned, qtyAdjusted, unit, pricePerUnit }
  /Pamphlets/{id}/LinkedOrders/{orderId}
    { orderId, buyerId, merchantId, villageLgdCode, allocatedItems[], status }
  /Pamphlets/{id}/StockEvents/{eventId}
    { type: 'load'|'unload'|'adjust'|'link'|'close', delta, actorUid, serverTimestamp }
```

### 3. Business Value & Problem Statement
Before this feature, the supplier's static Pamphlet (catalog) and the Gig's runtime stock were unlinked. Drivers had no live view of what remained in the vehicle, and buyers could not see whether their ordered item was still aboard. This microservice bridges the gap:
- **Supplier** authors the catalog → generates a Pamphlet for the specific Gig
- **Driver** confirms load at warehouse → each scan/confirmation updates `qtyLoaded`
- **Orders** link in real-time → `qtySold` ticks up as deliveries are marked
- **Returns** decrement sold, increment returned
- **Buyers & Merchants** read `/Pamphlets/{id}` via `onSnapshot` for live stock visibility
- **Close** seals the manifest when the Gig completes; immutable thereafter

### 4. Users in Use Case
- **Primary Actor**: Supplier Logistics Manager — creates and adjusts the manifest.
- **Secondary Actor**: Driver — confirms load/unload events on Android.
- **Observer**: Buyer, Merchant — read-only `onSnapshot` subscriber.

### 5. Acceptance Criteria (Gherkin)

```gherkin
Scenario: Supplier creates a Gig Pamphlet from catalog
  Given an authenticated supplier with an active pamphlet catalog "pmp_groceries_oct"
  When supplier calls "POST /v1/pamphlets" with:
    | gigId          | "gig_VH-KA01AB1234_2026-10-05T06:30:00Z" |
    | vehicleId      | "VH-KA01AB1234"                           |
    | startDatetime  | "2026-10-05T06:30:00Z"                    |
    | sourcePamphlet | "pmp_groceries_oct"                       |
  Then a Pamphlet document is created at "/Pamphlets/VH-KA01AB1234_2026-10-05T06:30:00Z"
  And StockItems sub-collection is seeded from the source catalog
  And status is "draft"

Scenario: Driver loads stock at warehouse
  Given gig "gig_VH-KA01AB1234_2026-10-05T06:30:00Z" in status "acknowledged"
  When driver calls "POST /v1/pamphlets/VH-KA01AB1234_2026-10-05T06:30:00Z/stock:load" with:
    | itemId  | "sku_rice_5kg" |
    | qty     | 40             |
  Then StockItem "sku_rice_5kg" field "qtyLoaded" becomes 40
  And a StockEvent of type "load" is appended
  And Pamphlet status transitions to "active"

Scenario: Order links to Pamphlet on placement
  Given an active pamphlet for gig "gig_VH-KA01AB1234_2026-10-05T06:30:00Z"
  When buyer places an order for 2x "sku_rice_5kg" on this gig
  Then "linkOrderToPamphlet" is called internally
  And LinkedOrders sub-collection gains a new entry for this orderId
  And StockItem "sku_rice_5kg" field "qtySold" increments by 2

Scenario: Pamphlet is sealed on Gig completion
  Given an active pamphlet for gig "gig_VH-KA01AB1234_2026-10-05T06:30:00Z"
  When "completeAndFinalizeGig" is called
  Then "closePamphlet" is triggered automatically
  And Pamphlet status transitions to "closed"
  And all subsequent write attempts to StockItems are rejected with 403 PAMPHLET_SEALED

Scenario: Buyer reads live stock via onSnapshot
  Given an active pamphlet with 38 units of "sku_rice_5kg" remaining
  When buyer subscribes to "/Pamphlets/VH-KA01AB1234_2026-10-05T06:30:00Z" via Firestore onSnapshot
  And driver unloads 5 units at a village
  Then buyer's UI receives a real-time update showing 33 units remaining
  And no Cloud Function is invoked for this read
```

### 6. Developer Test Plan & Mapping
- **Bruno API Test**: `tests/bruno/02-gigs/pamphlet/createGigPamphlet/`, `loadStock/`, `unloadStock/`, `adjustStockItem/`, `getPamphletSnapshot/`, `closePamphlet/`.
- **UI E2E Test**: `tests/e2e/supplier/pamphlet-compose.spec.ts`, `tests/e2e/driver/pamphlet-load.spec.ts`.
- **Unit Tests**: Key generation (`vehicleId + startDatetime`), qty arithmetic (qtyLoaded ≥ qtySold + qtyReturned), sealed-manifest write rejection.
- **Firestore Rules**: StockItems and StockEvents writable only by Functions; LinkedOrders writable only by the `linkOrderToPamphlet` function; read-only for buyers/merchants.
- **Integration Tests**: `completeAndFinalizeGig` → `closePamphlet` trigger chain.
