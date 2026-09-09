# Driver (Vehicle) wireframes

**Nav:** Gigs · Tracking · Earnings

Portrait-primary PWA layouts (360px class). Bottom navigation is for business tasks only. Profile and account settings are always in the **top-right avatar**. Interactions that create or edit records use **bottom sheets**. Cards are tappable. FAB is bottom-right, above the nav bar.

See also: [Shared](Shared.md) · [Buyer](Buyer.md) · [Merchant](Merchant.md) · [Driver](Driver.md) · [Supplier](Supplier.md) · [Support](Support.md)

Foundations: [Foundations.md](Foundations.md) · IA and screen IDs: [Navigation.md](Navigation.md) · Shared states, errors, AI and invoice: [Patterns.md](Patterns.md)

**Legend**


| Symbol        | Meaning                        |
| ------------- | ------------------------------ |
| `[ btn ]`     | Primary or secondary button    |
| `( )` / `(x)` | Radio / checkbox               |
| `...`         | Overflow / more                |
| `👤`          | Profile (header)               |
| `+`           | Floating action button         |
| `━━━━`        | Sheet drag handle              |
| `⚠`           | Warning / offline / GPS banner |


Drivers are upgraded from an approved Buyer. After upgrade they see the role-change splash in [Shared.md](Shared.md), then this setup.

The driver app is the one role that routinely runs with no connectivity for long stretches. Every write on these screens is queued locally with the real device timestamp preserved, per the conflict-resolution policy in the constitution. The offline and queued states in [Patterns.md](Patterns.md) are not optional here.

Two facts shape every screen below. **The driver is the party being verified, and never holds the code:** a driver's screen shows an empty six-box field for what the buyer, merchant, or supplier reads out, never the code itself. **Cash in the driver's pocket is the supplier's money:** every collection writes a `CashLedgerEntry` at `status: "in_custody"` against the driver as `holderId`, and it leaves custody only through a confirmed two-sided settlement. The shared code-entry sheet, the fallback list, the custody card and the two-sided handover are drawn once in [Patterns.md](Patterns.md) sections 7 and 8; the screens here draw what is specific to the driver.

Every screen below must also satisfy the loading, empty, error, offline, queued and disabled states defined in [Patterns.md](Patterns.md), and must carry the **Data** block from [Patterns.md](Patterns.md) §1A (what Firestore paints, what each control calls). Only the driver-specific variants are drawn here. Header chrome (`🔊` `🔔` `👤`) is specified once in that section and is not repeated. Vehicle mutations run from the official Android client (Play Integrity); this file does not invent extra Functions.

---

## Screen index

| ID | Screen |
| -- | ------ |
| `DRV-01` | Driver setup |
| `DRV-02` | Assigned gigs |
| `DRV-02.1` | Gig acknowledgement |
| `DRV-03` | Gig stops and orders by village |
| `DRV-04` | Live route tracking |
| `DRV-04.1` | Manual village override |
| `DRV-04.2` | Suspended gig and reassignment |
| `DRV-05` | Delivery proof sheet |
| `DRV-05.1` | Offline proof queue |
| `DRV-05.2` | Handover verification |
| `DRV-05.3` | Verification fallback |
| `DRV-06` | End gig blocked — pending deliveries |
| `DRV-07` | Earnings and wallet |
| `DRV-07.1` | Per-gig earnings detail |
| `DRV-08` | Payout method and request |
| `DRV-08.1` | Payout blocked — cash in hand |
| `DRV-08.2` | Payout status and history |
| `DRV-08.3` | Change payout destination |
| `DRV-09` | Vehicle profile |
| `DRV-10` | Cash in hand |
| `DRV-10.1` | Collect merchant cash |
| `DRV-10.2` | Hand over to supplier |
| `DRV-10.3` | Settlement receipt |

---

## Setup

### DRV-01 Driver setup

The vehicle registration and model were shown here but had nowhere to be stored. They are now persisted on `UserProfile.vehicleNumber` and `UserProfile.vehicleType`, which is also what lets the gig, the buyer tracking screen and the merchant order detail name the vehicle.

**Data**

| Shown | Source |
| ----- | ------ |
| Contact number | `Auth` phone; `FS get /UserProfiles/{uid}` → `phone` |
| Registration / type | same get → `vehicleNumber`, `vehicleType` |
| Managing supplier | same get → `supplierId`, then `FS get /UserProfiles/{supplierId}` → `name` |
| Permission checks | same get → `permissions` plus OS grants (`local`) |

| Control | On click |
| ------- | -------- |
| Registration / type fields | `local` until Save |
| Permission chips | OS prompt, then `local` until Save |
| Save and open Gigs | `Fn updateUserProfile` `{ vehicleNumber, vehicleType, permissions }` then `nav DRV-02` |

```
┌──────────────────────────────────┐
│  Driver setup          🔊  [👤]    │
├──────────────────────────────────┤
│  Contact number                  │
│  ┌────────────────────────────┐  │
│  │ +91 76543 21090            │  │
│  └────────────────────────────┘  │
│                                  │
│  Vehicle registration            │
│  ┌────────────────────────────┐  │
│  │ AP-27-TX-1234              │  │
│  └────────────────────────────┘  │
│                                  │
│  Vehicle type                    │
│  ┌────────────────────────────┐  │
│  │ Tata Ace                ▾  │  │
│  └────────────────────────────┘  │
│                                  │
│  Managing supplier               │
│  ┌────────────────────────────┐  │
│  │ Kranthi Kumar              │  │
│  │ Assigned — cannot change   │  │
│  └────────────────────────────┘  │
│                                  │
│  Permissions  Loc Audio Cam      │
│  ⚠ Location is required to run   │
│    gigs automatically.           │
│                                  │
│  [  Save and open Gigs  ]        │
└──────────────────────────────────┘
```

**Actions:** Save calls `updateUserProfile`, then opens `DRV-02`. Location permission is strongly recommended rather than mandatory: denying it falls back to the manual village override on `DRV-04.1`.

---

## Gigs

### DRV-02 Assigned gigs

**Data**

| Shown | Source |
| ----- | ------ |
| Supplier line | `FS get /UserProfiles/{uid}` → `supplierId`, then `FS get /UserProfiles/{supplierId}` → `name` |
| Gig cards | `FS query Gigs` where `vehicleId == uid`. Split Today / Upcoming / Past in `local` from `date` + `status` |
| Stop / order counts, vehicle label | fields on each Gig plus `FS get /UserProfiles/{uid}` → `vehicleNumber`, `vehicleType` |
| Suspended card | same query, `status == "suspended"` |

| Control | On click |
| ------- | -------- |
| Open tracking | `nav DRV-04` — enabled only when `status` is `created` or `started` |
| Review gig | `nav DRV-02.1` |
| Past card | `nav DRV-07.1` |
| Call supplier | `tel:` supplier `contactInfo` |
| Pull to refresh | re-run Shown reads, bypass TTL |

```
┌──────────────────────────────────┐
│  Gigs          🔊   🔔    [👤]      │
│  Supplier: Kranthi Kumar         │
├──────────────────────────────────┤
│  Today · 21-08-2026              │
│  ┌────────────────────────────┐  │
│  │ Ongole → Markapur          │  │
│  │ ○ created · not started    │  │
│  │ 5 stops · 12 orders        │  │
│  │ Tata Ace · AP-27-TX-1234   │  │
│  │      [ Open tracking ]     │  │
│  └────────────────────────────┘  │
│                                  │
│  Upcoming                        │
│  ┌────────────────────────────┐  │
│  │ Podili dairy run           │  │
│  │ 22-08-2026 · 3 stops       │  │
│  │ ⚠ Not acknowledged         │  │
│  │      [ Review gig ]        │  │
│  └────────────────────────────┘  │
│                                  │
│  Past                            │
│  ┌────────────────────────────┐  │
│  │ ✔ Completed · 18-08-2026   │  │
│  │ Ongole → Markapur          │  │
│  │ 9 delivered · ₹1,400       │  │
│  └────────────────────────────┘  │
├──────────────────────────────────┤
│ [ Gigs ] [ Tracking ] [ Earnings]│
└──────────────────────────────────┘
```

**Suspended gig card**

```
│  ┌────────────────────────────┐  │
│  │ Ongole → Markapur          │  │
│  │ ⚠ suspended                │  │
│  │ Wait for reassignment.     │  │
│  │ Do not continue the route. │  │
│  │      [ 📞 Call supplier ]  │   │
│  └────────────────────────────┘  │
```

**Actions:** Open tracking is enabled only for the assigned driver on a `created` or `started` gig. Only one gig can be `started` at a time. Suspended gigs disable every route action.

### DRV-02.1 Gig acknowledgement

A gig previously appeared in the driver's list with no way to confirm the driver had actually seen it, so a supplier had no signal before dispatch day.

**Data**

| Shown | Source |
| ----- | ------ |
| Title, date, route, stops, ETAs, status | `FS get /Gigs/{gigId}` |
| Supplier name | same get → `supplierName` |
| Vehicle line | `FS get /UserProfiles/{uid}` → `vehicleType`, `vehicleNumber` |
| Pamphlet name | `FS get /Pamphlets/{gig.pamphletId}` → title |

| Control | On click |
| ------- | -------- |
| Acknowledge | `Fn acknowledgeGig` |
| Report a problem radios / note | `local` |
| Send | `Fn acknowledgeGig` `{ problemNote }` |

```
┌──────────────────────────────────┐
│  ←  Podili dairy run      [👤]    │
├──────────────────────────────────┤
│  Assigned 20-08-2026 04:10 PM    │
│  by Kranthi Kumar                │
├──────────────────────────────────┤
│  Date        22-08-2026          │
│  Start       09:00 AM            │
│  Route       Podili circuit      │
│  Stops       3 villages          │
│  Distance    47 km · about 2h    │
│  Vehicle     Tata Ace            │
│  Pamphlet    Dairy weekly        │
├──────────────────────────────────┤
│  Stops                           │
│  1  Podili        09:00 AM       │
│  2  Konakanamitla 09:50 AM       │
│  3  Kanigiri      10:40 AM       │
├──────────────────────────────────┤
│  [  Acknowledge  ]               │
│  [ Report a problem ]            │
└──────────────────────────────────┘
```

**Report a problem sheet**

```
┌──────────────────────────────────┐
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│  Report a problem                │
│                                  │
│  ( ) Vehicle not available       │
│  ( ) I am not available          │
│  ( ) Route is wrong              │
│  ( ) Other                       │
│                                  │
│  ┌────────────────────────────┐  │
│  │ Add a note                 │  │
│  └────────────────────────────┘  │
│                                  │
│  Your supplier is notified and   │
│  can reassign the gig.           │
│                                  │
│  [  Send  ]                      │
└──────────────────────────────────┘
```

Acknowledgement is advisory: it does not gate `startGig`, because a driver with no signal on the morning of the run must still be able to start.

### DRV-03 Gig stops and orders by village

Merchant bulk orders were listed here but had no delivery action anywhere in the driver app, so a bulk order could never legitimately reach `delivered`. Both order types now carry the same actions.

**Data**

| Shown | Source |
| ----- | ------ |
| Stop chrome, ETA, village | `FS get /Gigs/{gigId}` |
| Buyer pickup cards | `FS query Orders` where `gigId` matches this gig (this stop's `villageId`) |
| Merchant bulk cards | `FS query MerchantOrders` where `gigId` matches this gig |
| Credit row | `FS get /CreditProfiles/{merchantId}` → `creditUsed`, `pendingRepayments` — only when `creditUsed > 0` |

| Control | On click |
| ------- | -------- |
| Buyer Delivered | `nav DRV-05.2` then `Fn markOrderDelivered` |
| Merchant Delivered | `nav DRV-05.2` then `Fn updateMerchantOrderStatus` `{ status: "delivered" }` |
| Take cash | `nav DRV-10.1` |
| Navigate in Google Maps | `local` Maps intent from current GPS + remaining villages |
| Open live tracking | `nav DRV-04` |

```
┌──────────────────────────────────┐
│  ←  Ongole → Markapur     [👤]    │
├──────────────────────────────────┤
│  Stop 2 of 5 · Karavadi          │
│  ETA 10:30 AM · reached          │
├──────────────────────────────────┤
│  Buyer pickups (3)               │
│  ┌────────────────────────────┐  │
│  │ Anil Kumar                 │  │
│  │ INV-2408210001 · ₹1,550    │  │
│  │ ◉ reached_merchant         │  │
│  │ Drop at Sri Lakshmi Stores │  │
│  │            [ Delivered ]   │  │
│  └────────────────────────────┘  │
│  ┌────────────────────────────┐  │
│  │ Bala Krishna               │  │
│  │ INV-2408210014 · ₹880      │  │
│  │ ✔ delivered 10:34 AM       │  │
│  └────────────────────────────┘  │
├──────────────────────────────────┤
│  Merchant bulk (1)               │
│  ┌────────────────────────────┐  │
│  │ Sri Lakshmi Stores         │  │
│  │ MO-7781 · ₹17,098          │  │
│  │ 30 units · 2 lines         │  │
│  │ ◉ reached · cash order     │  │
│  │            [ Delivered ]   │  │
│  └────────────────────────────┘  │
├──────────────────────────────────┤
│  Credit at this shop             │
│  ┌────────────────────────────┐  │
│  │ Sri Lakshmi Stores         │  │
│  │ Owes on credit  ₹12,000    │  │
│  │ ⏳ ₹4,000 with another      │  │
│  │   driver                   │  │
│  │            [ Take cash ]   │  │
│  └────────────────────────────┘  │
├──────────────────────────────────┤
│  [ Navigate in Google Maps ]     │
│  [ Open live tracking ]          │
└──────────────────────────────────┘
```

**Actions:** Navigate opens a Maps universal intent from the current GPS position, with the remaining unvisited villages as waypoints. Buyer `[ Delivered ]` and merchant `[ Delivered ]` both open the verification sheet in `DRV-05.2` first, because a `"delivered"` transition needs a proof the counterparty consented to. Buyer `[ Delivered ]` then calls `markOrderDelivered`; merchant `[ Delivered ]` calls `updateMerchantOrderStatus` to `delivered`, which requires the order to already be at `reached` and carries a `cashCollected` equal to `MerchantOrder.totalPrice` when `paymentMode` is `"cash_on_delivery"`. `[ Take cash ]` opens `DRV-10.1` for a merchant who wants to pay down their credit line at the same stop, which is a separate movement from the bulk order sitting on the same card.

The credit row appears only for merchants on this gig who have `creditUsed` above zero. The `⏳` figure is `CreditProfile.inTransitRepayments` — cash a different driver already took, which has already relieved that credit and is not collectable again.

---

## Live tracking

### DRV-04 Live route tracking

**Data**

| Shown | Source |
| ----- | ------ |
| Route, start time, stop rail, current village | `FS listen /Gigs/{gigId}` while mounted (unbind on leave) |
| GPS line | `local` device location vs stop `location` |
| Deliveries at this stop | `FS query Orders` + `FS query MerchantOrders` where `gigId` matches and village is current |
| Not-started body | same listen, `status == "created"` |

| Control | On click |
| ------- | -------- |
| Start route | `Fn startGig` — official Android client (Play Integrity) |
| Arriving / Reached / Left / Next stop | `Fn updateGigLocation`. Offline: `local` outbox (Room + WorkManager) then `Fn updateGigLocation` replay |
| Auto geofence | `local` GPS, then same `Fn updateGigLocation` |
| Proof | `nav DRV-05` |
| End gig | `Fn completeAndFinalizeGig` — blocked → `nav DRV-06` if deliveries or a pending transfer remain |
| Pull to refresh | re-run Shown reads, bypass TTL |

```
┌──────────────────────────────────┐
│  Tracking      🔊   🔔    [👤]      │
├──────────────────────────────────┤
│  Ongole → Markapur · 21-08       │
│  Started 09:58 AM                │
├──────────────────────────────────┤
│  Karavadi ●──◉──○──○──○ Markapur │
│  Stop 2 of 5 · Karavadi          │
│  Status: reached                 │
│  1.2 km from centre              │
├──────────────────────────────────┤
│  Auto status is on               │
│  ✔ GPS active · updated 12s ago  │
│                                  │
│  Override manually               │
│  [ Arriving ] [ Reached ]        │
│  [ Left ]                        │
├──────────────────────────────────┤
│  Deliveries at this stop         │
│  ┌────────────────────────────┐  │
│  │ Anil · INV-…001            │  │
│  │            [ Proof ▾ ]     │  │
│  └────────────────────────────┘  │
│  ┌────────────────────────────┐  │
│  │ Sri Lakshmi · MO-7781      │  │
│  │            [ Proof ▾ ]     │  │
│  └────────────────────────────┘  │
│  2 of 3 done at this stop        │
├──────────────────────────────────┤
│  [ Next stop: Koppolu ]          │
│  [ End gig ]                     │
├──────────────────────────────────┤
│ [ Gigs ] [ Tracking ] [ Earnings]│
└──────────────────────────────────┘
```

**Not started state**

```
│  Ongole → Markapur · 21-08       │
│  ○ Not started                   │
│                                  │
│  5 stops · 12 orders             │
│  First stop Karavadi · 10:30 AM  │
│                                  │
│  [  Start route  ]               │
```

**Actions**


| Control                   | Result                                                                  |
| ------------------------- | ----------------------------------------------------------------------- |
| Start route               | `startGig`; assigned driver only, gig status `created`                   |
| Arriving / Reached / Left | `updateGigLocation`; Reached flips buyer orders to `reached_merchant` and pushes FCM |
| Auto geofence             | Arriving at 1.5 km, Reached at 1 km, Left beyond 1 km and increasing     |
| Proof                     | `DRV-05`                                                                |
| Next stop                 | Sends `left` for the current stop and advances `currentVillageIndex`     |
| End gig                   | `completeAndFinalizeGig`; blocked by `DRV-06` if deliveries remain       |
| GPS denied                | Banner plus `DRV-04.1`                                                  |

Geofencing needs coordinates per stop. Route villages and gig stops carry `villageId` and a `location` with latitude and longitude so the Haversine calculation in the constitution has something to work against.

### DRV-04.1 Manual village override

**Data** — same listen as `DRV-04`. Stop picker lists only the current and unvisited villages (`local` filter). GPS is off; this screen replaces the geofence.

| Control | On click |
| ------- | -------- |
| Stop picker / status radios | `local` |
| Update status | `Fn updateGigLocation`. Offline: `local` outbox (Room + WorkManager) then `Fn updateGigLocation` replay |
| Turn on location | `local` OS prompt, then `nav DRV-04` |

```
┌──────────────────────────────────┐
│  Tracking      🔊   🔔    [👤]      │
├──────────────────────────────────┤
│  ⚠ Location off — set your stop  │
│    manually                      │
├──────────────────────────────────┤
│  Ongole → Markapur · 21-08       │
│                                  │
│  Auto status is off              │
│                                  │
│  Current stop                    │
│  ┌────────────────────────────┐  │
│  │ 2 · Karavadi            ▾  │  │
│  └────────────────────────────┘  │
│  Only unvisited stops and the    │
│  current one are listed.         │
│                                  │
│  Status                          │
│  ( ) Arriving                    │
│  (•) Reached                     │
│  ( ) Left                        │
│                                  │
│  [  Update status  ]             │
│                                  │
│  [ Turn on location ]            │
└──────────────────────────────────┘
```

Manual updates call the same `updateGigLocation` function, so a buyer's "reached" notification fires identically whether the transition came from a geofence or from the driver's thumb. Backwards selection is disallowed: `INVALID_INDEX` is prevented client-side by only listing valid stops.

### DRV-04.2 Suspended gig and reassignment

Two paths land here: the driver's own vehicle broke down and the supplier suspended the gig, or the gig was reassigned away from this driver mid-route.

**Data** — `FS get /Gigs/{gigId}` (suspended or newly assigned). Take-over is after the supplier's `reassignGigDriver`; the driver does not call it. Cash line is `FS get /DriverEarnings/{uid}` → `cashInCustody` / `openSettlementIds`.

| Control | On click |
| ------- | -------- |
| Hand over cash | `nav DRV-10.2` — absent when `cashInCustody == 0` |
| Resume route | `nav DRV-04` at preserved `currentVillageIndex` |
| Call supplier | `tel:` |
| Call support | `tel:` |

**Suspended, this driver still assigned**

```
┌──────────────────────────────────┐
│  Tracking      🔊   🔔    [👤]      │
├──────────────────────────────────┤
│  ⚠ Gig suspended                 │
├──────────────────────────────────┤
│             [ ⚠ ]                │
│                                  │
│      Route paused                │
│                                  │
│  Kranthi Kumar suspended this    │
│  gig at 11:02 AM.                │
│  Reason: vehicle breakdown       │
│                                  │
│  Stop 2 of 5 · Karavadi          │
│  6 orders still undelivered      │
│                                  │
│  Do not continue the route.      │
│  Wait for reassignment.          │
├──────────────────────────────────┤
│  You are still holding           │
│  ₹4,450.00 of Kranthi Kumar's    │
│  money. Hand it over without     │
│  waiting for this gig.           │
│                                  │
│  [ Hand over cash ]              │
├──────────────────────────────────┤
│  [ 📞 Call supplier ]             │
│  [ 📞 Call support ]              │
└──────────────────────────────────┘
```

A stopped gig does not make collected cash disappear. `suspendGig` sweeps whatever the driver holds into a `CashSettlement` exactly as the end of a gig does, with the supplier's confirmation code issued alongside it, so a driver whose vehicle broke down at stop two can settle up today rather than carrying the supplier's money against a route they may never resume. The cash block is absent when nothing was collected.

**Reassigned to this driver, resuming**

The replacement driver's app syncs from the server and resumes at the last visited stop rather than from the beginning.

```
┌──────────────────────────────────┐
│  ←  Take over gig         [👤]    │
├──────────────────────────────────┤
│  Ongole → Markapur · 21-08       │
│  Reassigned to you 11:20 AM      │
├──────────────────────────────────┤
│  Progress so far                 │
│  ✔ 1 Ongole      left 10:02 AM   │
│  ◉ 2 Karavadi    reached         │
│  ○ 3 Koppolu     pending         │
│  ○ 4 Madhavaram  pending         │
│  ○ 5 Markapur    pending         │
│                                  │
│  Already delivered      6        │
│  Still to deliver       6        │
│                                  │
│  You resume at stop 2.           │
│  Earnings are split by the       │
│  deliveries each driver made.    │
│                                  │
│  Cash the first driver took is   │
│  theirs to hand over. You start  │
│  at ₹0.00.                       │
│                                  │
│  [  Resume route  ]              │
└──────────────────────────────────┘
```

**Actions:** Suspension is performed by the supplier or Support via `suspendGig`, which also opens the settlement for cash already collected. Reassignment uses `reassignGigDriver`, which preserves `currentVillageIndex`. Resume route re-enters `DRV-04` at the preserved index. Custody does not travel with the gig: the notes are in the first driver's pocket, so the ledger entries keep their original `holderId` and settle against that driver. The replacement driver's `[ Hand over cash ]` covers only what they collect themselves, which is what stops one driver from being asked to account for another's collections.

---

## Delivery proof

### DRV-05 Delivery proof sheet

**Data**

| Shown | Source |
| ----- | ------ |
| Counterparty, invoice, amount, cash warning | `FS get /Orders/{orderId}` or `FS get /MerchantOrders/{merchantOrderId}` — public fields only. Never `FS get /Orders/{id}/private/pickup` or `/MerchantOrders/{id}/private/handover` |
| Photo / gallery preview | `local` until Confirm |

| Control | On click |
| ------- | -------- |
| Ask for their code | `nav DRV-05.2` |
| Take photo / Choose from gallery | `local` capture, then `nav DRV-05.2` for the cash figure |
| Use another way | `nav DRV-05.3` |
| Confirm delivered | `Fn markOrderDelivered` (buyer) or `Fn updateMerchantOrderStatus` (bulk). Offline: `local` outbox (Room + WorkManager) then Fn replay |
| Cancel | `nav DRV-04`

```
┌──────────────────────────────────┐
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│  Delivered to Anil Kumar         │
│  INV-2408210001 · ₹1,550         │
├──────────────────────────────────┤
│  Choose one proof                │
│                                  │
│  [ Ask Anil for their code ]     │
│  Strongest proof. They read the  │
│  6 digits off their phone and    │
│  you type them in.               │
│                                  │
│  ─────────── or ───────────      │
│                                  │
│  [ 📷 Take photo ]                │
│  [ 🖼 Choose from gallery ]       │
│                                  │
│  Cannot get the code?            │
│  [ Use another way ]             │
│                                  │
│  ⚠ Cash order — collect ₹880     │
│    before confirming.            │
│                                  │
│  [  Confirm delivered  ]         │
└──────────────────────────────────┘
```

**Camera denied fallback**

```
┌──────────────────────────────────┐
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│  Camera not available            │
│                                  │
│  Use one of these instead:       │
│                                  │
│  [ 🖼 Choose from gallery ]       │
│  [ Ask Anil for their code ]     │
│  [ Use another way ]             │
│                                  │
│  [ Cancel ]                      │
└──────────────────────────────────┘
```

**Actions:** The code route opens `DRV-05.2`, where the six boxes start empty and the buyer reads out what is on their own screen at `BUY-10.1`. This screen never shows the code, and no path through it lets the driver see one. `[ Use another way ]` opens the fallback list at `DRV-05.3`, which is the only route to a weak proof and records the reason. Photo and gallery proof still open `DRV-05.2` for the cash figure before they submit, because cash and consent are separate questions and both have to be answered.

Confirm calls `markOrderDelivered` with the chosen `method`, and the proof is stored on the order as `deliveryProof` with a server-derived `strength`. `capturedAt` is taken from the device rather than the server so that a proof captured offline keeps its true delivery time once it syncs. Photos are compressed before queuing, since this often happens on 2G.

The merchant bulk-delivery variant in `DRV-03` reuses this layout with the merchant as the counterparty. The code route is the same: `MerchantOrder` carries its own handover code, held in a private subdocument the driver cannot read, and `updateMerchantOrderStatus` matches the typed digits against it.

### DRV-05.1 Offline proof queue

Proof uploads retry with exponential backoff. Previously that happened invisibly, so a driver had no way to know whether their morning's deliveries had ever reached the server.

**Data** — the queue is `local` outbox (Room + WorkManager), not a Firestore collection. Digits on a queued code row are the value the driver typed, never `FS get /Orders/{id}/private/pickup`.

| Control | On click |
| ------- | -------- |
| Retry / Retry all | `local` outbox then `Fn markOrderDelivered` (or `Fn updateMerchantOrderStatus`) replay |
| Retake | `local` replace photo, then same replay |
| Report to support | `Fn raiseCashDiscrepancy` `{ kind: "failed_verification" }` |
| Hand over cash | `nav DRV-10` — disabled until the disputed row is reported |

```
┌──────────────────────────────────┐
│  ←  Pending uploads       [👤]    │
├──────────────────────────────────┤
│  ⚠ Offline · 3 items waiting     │
├──────────────────────────────────┤
│  ┌────────────────────────────┐  │
│  │ INV-…001 · photo           │  │
│  │ ◉ Uploading · attempt 2    │  │
│  │ 240 KB                     │  │
│  └────────────────────────────┘  │
│  ┌────────────────────────────┐  │
│  │ INV-…014 · code 472916     │  │
│  │ ○ Queued                   │  │
│  │ Marked 10:34 AM            │  │
│  └────────────────────────────┘  │
│  ┌────────────────────────────┐  │
│  │ MO-7781 · photo            │  │
│  │ ✖ Failed · file too large  │  │
│  │        [ Retry ] [ Retake ]│  │
│  └────────────────────────────┘  │
├──────────────────────────────────┤
│  Delivery times are recorded     │
│  from when you marked them, not  │
│  when they upload.               │
│                                  │
│  [ Retry all ]                   │
└──────────────────────────────────┘
```

**A handover that money rode on and failed**

A photo upload can be discarded. A handover cannot, because the cash was already counted into someone's hand in the physical world whatever the server later decided. The row keeps the amount and the counterparty, sits at the top of the queue, and offers exactly one action.

```
┌──────────────────────────────────┐
│  ←  Pending uploads       [👤]    │
├──────────────────────────────────┤
│  ⚠ 1 handover not confirmed      │
├──────────────────────────────────┤
│  Must be reported (1)            │
│  ┌────────────────────────────┐  │
│  │ ⚠ Handover not confirmed   │  │
│  │ Sri Lakshmi Stores         │  │
│  │ ₹4,000.00 cash · 10:44 AM  │  │
│  │ Code already used          │  │
│  │      [ Report to support ] │  │
│  └────────────────────────────┘  │
│  This cash is still counted as   │
│  yours. Report it so Kranthi     │
│  Kumar and support can trace it. │
│                                  │
│  [ Hand over cash ] (disabled)   │
│  Report the handover above first.│
├──────────────────────────────────┤
│  Waiting to send (2)             │
│  ┌────────────────────────────┐  │
│  │ INV-…001 · photo           │  │
│  │ ◉ Uploading · attempt 2    │  │
│  └────────────────────────────┘  │
└──────────────────────────────────┘
```

`CODE_REPLAYED` is the headline failure here. An offline code counter burns on first sync, so the same counter arriving a second time — a captured code replayed against a second, larger handover, or the same queued call sent twice from two devices — is refused, the `CustodyTransfer` goes `disputed`, and the server opens a `CashDiscrepancy` of kind `"failed_verification"` on its own account. `CODE_EXPIRED` and a `counter_signature` whose phone digits no longer match the counterparty's profile land in the same list with the same single action. `IDEMPOTENCY_CONFLICT` does not: a genuine duplicate of the same physical handover is de-duplicated silently and the row closes as sent.

**Actions:** `[ Report to support ]` calls `raiseCashDiscrepancy` with `kind: "failed_verification"`, the amount, the counterparty as `againstPartyId`, and the `custodyTransferId` pre-filled; the driver adds what happened in their own words. Until it is reported, `[ Hand over cash ]` on `DRV-10` is disabled with this reason, so an unconfirmed collection can never be quietly rolled into a settlement total. `[ Retry ]` and `[ Retake ]` stay available on photo failures, which are transport problems rather than money problems.

This screen is reachable from the header sync indicator and from the offline and sync centre (`SHR-12`) in [Shared.md](Shared.md).

### DRV-05.2 Handover verification

The buyer holds the code and the driver holds the field. Six boxes open empty and stay empty until Anil reads out the digits from his own screen, which is the only reason a confirmed handover means anything at all. Keypad behaviour, the attempt counter and the resend rule are the shared code-entry sheet in [Patterns.md](Patterns.md) section 7.2; the counterparty line, the cash block and the running custody total are what this screen adds.

**Data** — same order/merchant-order get as `DRV-05`. Six boxes and cash field are `local`. Never `FS get` a private code document. Confirmed custody total is `FS get /DriverEarnings/{uid}` → `cashInCustody` (`cache` when offline).

| Control | On click |
| ------- | -------- |
| Confirm, online | `Fn markOrderDelivered` (buyer) or `Fn updateMerchantOrderStatus` (bulk) |
| Confirm, offline | `local` outbox (Room + WorkManager) then same Fn replay (`method: "offline_code"`) |
| Send the code again | `Fn resendHandoverCode` |
| Report short payment | `Fn raiseCashDiscrepancy` `{ kind: "shortfall" }` |
| Use another way | `nav DRV-05.3` |
| Read the digits aloud | `local` |
| Cash in hand | `nav DRV-10` |
| Done / Cancel | `nav DRV-03`

```
┌──────────────────────────────────┐
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│  Confirm handover         [ X ]  │
│                                  │
│  Anil Kumar · INV-2408210001     │
│  Rice 25kg, Cooking oil 1L       │
│  Collect cash      ₹1,550.52     │
│                                  │
│  Ask Anil for the 6-digit code   │
│  on their phone.                 │
│                                  │
│  ┌──┐┌──┐┌──┐┌──┐┌──┐┌──┐        │
│  │ 4││ 8││ 1││ 2││  ││  │        │
│  └──┘└──┘└──┘└──┘└──┘└──┘        │
│                                  │
│  Cash you took                   │
│  ┌────────────────────────────┐  │
│  │ ₹ 1,550.52                 │  │
│  └────────────────────────────┘  │
│  Must be the full order amount.  │
│                                  │
│  [ 🔊 Read the digits aloud ]     │
│  [ Send the code again ]         │
│                                  │
│  Cannot get the code?            │
│  [ Use another way ]             │
│                                  │
│  [ Cancel ]      [ Confirm ]     │
└──────────────────────────────────┘
```

**Already paid online**

```
│  Anil Kumar · INV-2408210014     │
│  ✔ Paid online · ₹880.00         │
│  Nothing to collect              │
│                                  │
│  Ask Anil for the 6-digit code   │
│  on their phone.                 │
```

**Wrong code**

```
│  ┌──┐┌──┐┌──┐┌──┐┌──┐┌──┐        │
│  │  ││  ││  ││  ││  ││  │        │
│  └──┘└──┘└──┘└──┘└──┘└──┘        │
│  ⚠ Wrong code. 3 tries left.     │
│                                  │
│  [ Send the code again ]         │
│  [ Use another way ]             │
```

**The cash does not match the order**

A short payment becomes a tracked claim, never a quietly smaller order. The order total is not editable down to whatever was actually handed over, and `AMOUNT_MISMATCH` is the only outcome of trying.

```
│  Cash you took                   │
│  ┌────────────────────────────┐  │
│  │ ₹ 1,300.00                 │  │
│  └────────────────────────────┘  │
│  ⚠ This should be ₹1,550.52.     │
│    Take the rest, or report the  │
│    short payment.                │
│                                  │
│  [ Report short payment ]        │
│                                  │
│  [ Confirm ] (disabled)          │
```

**Offline**

There is no live code without a network, so the buyer reads the next unused line from the code sheet issued to them in advance. Batches are issued to the party that authorises a transfer, which is never the driver: a driver has no code sheet of their own to read from.

```
┌──────────────────────────────────┐
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│  Confirm handover         [ X ]  │
│  ⚠ Offline — will send later     │
│                                  │
│  Anil Kumar · INV-2408210001     │
│  Collect cash      ₹1,550.52     │
│                                  │
│  Ask for code number             │
│  ┌────┐  from their code sheet   │
│  │ 07 │                          │
│  └────┘                          │
│  ┌──┐┌──┐┌──┐┌──┐┌──┐┌──┐        │
│  │  ││  ││  ││  ││  ││  │        │
│  └──┘└──┘└──┘└──┘└──┘└──┘        │
│                                  │
│  Each code works once only.      │
│  Saved with the time you marked  │
│  it, and sent when you have      │
│  signal.                         │
│                                  │
│  [ Cancel ]      [ Confirm ]     │
└──────────────────────────────────┘
```

**Confirmed**

```
┌──────────────────────────────────┐
│                                  │
│          ✔ Delivered             │
│                                  │
│  Anil Kumar · INV-2408210001     │
│  21-08-2026, 10:34 AM            │
│  Anil confirmed with their code  │
│                                  │
│  You took             ₹1,550.52  │
│  Cash in hand now     ₹8,450.00  │
│                                  │
│  This is Kranthi Kumar's money.  │
│  Hand it over at the end of the  │
│  gig.                            │
│                                  │
│  [ Cash in hand ]    [ Done ]    │
└──────────────────────────────────┘
```

Offline the same screen reads `✔ Saved — waiting to send`, the row on `DRV-03` picks up a `queued` chip, and the header counter becomes `(n)🔄`. The custody figure it shows is the last confirmed total plus this collection, marked `[cached]` until the queue drains, because a driver who cannot see what they are carrying cannot be held to it.

**Actions**


| Control                  | Result                                                                      |
| ------------------------ | --------------------------------------------------------------------------- |
| Confirm, online          | `markOrderDelivered` with `proof.method: "otp"`, the typed `confirmationCode`, the device `capturedAt`, a client `idempotencyKey`, and `cashCollected` when `Order.paymentMode` is `"cash_on_pickup"` |
| Confirm, offline         | Same call queued, with `method: "offline_code"`, `codeBatchId` and the typed `codeCounter`; the counter burns on sync and a repeat is `CODE_REPLAYED` |
| Confirm, merchant bulk   | `updateMerchantOrderStatus` to `delivered` against the merchant's handover code, with `cashCollected` on a `"cash_on_delivery"` order |
| Send the code again      | `resendHandoverCode` to the counterparty's registered number, masked in the response; disabled with a countdown after three sends in an hour |
| Report short payment     | `raiseCashDiscrepancy` with `kind: "shortfall"`, the amount actually taken, and the buyer as `againstPartyId` |
| Use another way          | `DRV-05.3`                                                                  |
| Cash in hand             | `DRV-10`                                                                    |

`cashCollected` must equal `Order.totalPrice` exactly; anything else is `AMOUNT_MISMATCH` and routes to `raiseCashDiscrepancy`. `[ Confirm ]` is dimmed until six digits are in and, on a cash order, the amount matches, with the reason directly under the button. The sheet opens with the counterparty and amount already drawn from the cached order, so only the code field ever waits on the network; a cached total past its ten-minute TTL carries `[cached]` and is re-read before submitting. There is no empty state — the sheet is a form.

### DRV-05.3 Verification fallback

Every route on this screen is weaker than a code, and every route says so on the record. The fallback list is the shared one in [Patterns.md](Patterns.md) section 7.4; what the driver's copy of it adds is the sentence naming who will see it.

**Data** — same public order get as `DRV-05`. Method, reason, witness name / last-4 are `local`. Never `FS get /Orders/{id}/private/pickup`.

| Control | On click |
| ------- | -------- |
| Photo / counter-signature / Continue after grant | `Fn markOrderDelivered` or `Fn updateMerchantOrderStatus`. Offline: `local` outbox (Room + WorkManager) then Fn replay. `support_override` is blocked offline |
| Ask my supplier | `Fn requestVerificationFallback` |
| Call supplier | `tel:` |
| Back / Close | `nav DRV-05.2`

```
┌──────────────────────────────────┐
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│  Cannot get the code?     [ X ]  │
│                                  │
│  Anil Kumar · INV-2408210001     │
│  Collect cash      ₹1,550.52     │
│                                  │
│  ( ) Photo of the handover       │
│                                  │
│  ( ) They confirm on my phone    │
│      Needs their name and the    │
│      last 4 digits of their      │
│      phone number.               │
│                                  │
│  ( ) Ask my supplier to allow it │
│      They approve, then you can  │
│      finish without a code.      │
│                                  │
│  Why can't they use the code?    │
│  [ Phone is switched off      ▾] │
│                                  │
│  Kranthi Kumar and support will  │
│  see that you finished without   │
│  a code, and the reason you      │
│  gave. This is allowed. It is    │
│  also recorded.                  │
│                                  │
│  [ Back ]        [ Continue ]    │
└──────────────────────────────────┘
```

The reason picker is mandatory on every one of the three, and `[ Continue ]` stays dimmed until one is chosen with "Add a reason to continue" underneath. "Other" opens a free-text field.

**They confirm on my phone**

```
┌──────────────────────────────────┐
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│  Who is confirming?       [ X ]  │
│                                  │
│  Their name                      │
│  ┌────────────────────────────┐  │
│  │ Anil Kumar                 │  │
│  └────────────────────────────┘  │
│                                  │
│  Last 4 digits of their phone    │
│  ┌──┐┌──┐┌──┐┌──┐                │
│  │ 3││ 2││ 1││ 0│                │
│  └──┘└──┘└──┘└──┘                │
│  Ask them to say it. It must     │
│  match the number we have.       │
│                                  │
│  Reason  Shared family phone     │
│                                  │
│  [ Back ]        [ Confirm ]     │
└──────────────────────────────────┘
```

Digits that do not match the counterparty's registered phone are refused inline — "These do not match the number we have for Anil Kumar" — with the supplier route offered instead. The point of the four digits is that the record says who actually stood there.

**Waiting for the supplier**

```
┌──────────────────────────────────┐
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│  Waiting for Kranthi Kumar       │
│                                  │
│             [ ⏳ ]                │
│                                  │
│  Asked at 10:36 AM               │
│  Reason: phone is switched off   │
│                                  │
│  They have to allow this before  │
│  you can finish without a code.  │
│  You cannot allow it yourself.   │
│                                  │
│  Allowed for 2 hours, for this   │
│  one handover, in both your      │
│  names.                          │
│                                  │
│  [ 📞 Call supplier ]             │
│  [ Close ]                       │
└──────────────────────────────────┘
```

Waiting here is deliberate. An override a driver can grant themselves is not an override, so the sheet blocks until a `VerificationFallbackAuthorization` exists, and the driver can leave the sheet and come back to it — the gig does not stop while the supplier answers.

**Not approved, and approval expired**

```
│  ⚠ Kranthi Kumar has not allowed │
│    this yet.                     │
│    [ Ask Kranthi Kumar ]         │

│  ⚠ That approval ran out at      │
│    12:36 PM. Ask again.          │
│    [ Ask again ]                 │
```

`FALLBACK_NOT_AUTHORIZED` is a nested sheet offering the ask, not an error the driver has to interpret. `FALLBACK_EXPIRED` re-requests rather than retrying, because the two-hour window closed and a fresh grant is a fresh decision by the supplier.

**After five wrong codes**

```
┌──────────────────────────────────┐
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│  Too many tries           [ X ]  │
│                                  │
│  Anil Kumar · INV-2408210001     │
│                                  │
│  The code has been tried 5       │
│  times. It cannot be used for    │
│  this delivery again.            │
│                                  │
│  Use a photo, or ask Kranthi     │
│  Kumar to allow it.              │
│                                  │
│  [ 📷 Take photo ]                │
│  [ Ask my supplier ]             │
└──────────────────────────────────┘
```

`CODE_ATTEMPTS_EXCEEDED` removes the code field for good on that handover, on the server as well as on the screen. Reopening `DRV-05.2` for the same order lands straight here.

**Actions**


| Control                 | Result                                                                       |
| ----------------------- | ---------------------------------------------------------------------------- |
| Photo of the handover    | `markOrderDelivered` (or `updateMerchantOrderStatus`) with `method: "photo"`, the `photoUrl`, and the chosen `fallbackReason` |
| They confirm on my phone | Same call with `method: "counter_signature"`, `witnessName`, `witnessPhoneTail`, and `fallbackReason` |
| Ask my supplier         | Raises a `verification` notification for the managing supplier. The grant itself is the supplier's to make on `SUP-16.3`; no driver-side call issues an authorisation |
| Continue, after a grant  | Same call with `method: "support_override"` and the `fallbackAuthorizationId`, which the server consumes so it cannot be spent twice |

Strength is derived server-side and a client-declared strength is ignored, so nothing on this screen can dress a photo up as a code. Every one of these routes still writes a real `CustodyTransfer` and, where cash moved, a real ledger entry: this is an auditable fallback, not a bypass. Offline, `support_override` is unavailable because the authorisation cannot be read, and the sheet offers `counter_signature` first. `[ Continue ]` is dimmed without a method and a reason. Loading affects nothing here beyond the counterparty line, which is already cached.

### DRV-06 End gig blocked — pending deliveries

`completeAndFinalizeGig` rejects with `PENDING_DELIVERIES` when orders remain open. The driver needs to know which ones.

**Data**

| Shown | Source |
| ----- | ------ |
| Open-order list | `Fn completeAndFinalizeGig` error payload, or `FS query Orders` + `FS query MerchantOrders` still open on this `gigId` |
| Unconfirmed handover | `FS query CustodyTransfers` where `gigId` matches and `status == "pending"` |
| Success totals | `Fn completeAndFinalizeGig` response (`totalEarnings`, `cashToHandOver`, `settlementId`) |

| Control | On click |
| ------- | -------- |
| Go to {village} | `nav DRV-03` |
| Finish this handover | `nav DRV-10.1` |
| Hand over cash | `nav DRV-10.2` |
| View earnings | `nav DRV-07` |
| Call supplier / shop | `tel:` |
| Close / Done | `nav DRV-04` |

```
┌──────────────────────────────────┐
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│  Cannot end gig yet              │
│                                  │
│  4 orders are still open:        │
│                                  │
│  Koppolu                         │
│  • Ravi · INV-…021 · placed      │
│  • Latha · INV-…022 · placed     │
│                                  │
│  Madhavaram                      │
│  • Suresh · INV-…031 · placed    │
│  • Devi Mart · MO-7790 · placed  │
│                                  │
│  Deliver them, or ask your       │
│  supplier to cancel them.        │
│                                  │
│  [ Go to Koppolu ]               │
│  [ 📞 Call supplier ]             │
│  [ Close ]                       │
└──────────────────────────────────┘
```

**A handover is still unconfirmed**

The cash total is not knowable while a transfer is waiting on an answer, so the gig cannot close on a figure that may still move. `VERIFICATION_REQUIRED` names the transfers rather than reporting a number the driver would then have to distrust.

```
┌──────────────────────────────────┐
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│  Finish the cash first           │
│                                  │
│  1 handover is not confirmed:    │
│                                  │
│  Sri Lakshmi Stores              │
│  ₹4,000.00 · asked 04:15 PM      │
│  Waiting for their code          │
│                                  │
│  Until this is answered we       │
│  cannot tell you what you are    │
│  holding.                        │
│                                  │
│  [ Finish this handover ]        │
│  [ 📞 Call the shop ]             │
│  [ Close ]                       │
└──────────────────────────────────┘
```

`[ Finish this handover ]` reopens the code step on `DRV-10.1` for the transfer that is waiting. A pending transfer expires on its own after 30 minutes, at which point the collection never happened and the gig closes without it. A driver who is holding cash against a transfer that expired reports it on `DRV-05.1` instead — an unrecorded collection is a discrepancy, not a rounding error.

**Successful finalisation**

```
┌──────────────────────────────────┐
│                                  │
│          ✔ Gig completed         │
│                                  │
│  Ongole → Markapur               │
│  21-08-2026 · 5 stops            │
│                                  │
│  Delivered            12         │
│  Distance             86 km      │
│  Time on route        4h 12m     │
│                                  │
│  Earned this gig      ₹1,850     │
│  Added to pending dues           │
│                                  │
│  Cash to hand over   ₹8,450.00   │
│  Kranthi Kumar · Ongole Hub      │
│                                  │
│  [ Hand over cash ]              │
│  [ View earnings ]   [ Done ]    │
└──────────────────────────────────┘
```

**Actions:** `completeAndFinalizeGig` returns `totalEarnings`, `cashToHandOver`, and a `settlementId` when there was cash on the gig, and opens the `CashSettlement` that `DRV-10.2` then works against. `[ Hand over cash ]` opens `DRV-10.2`. A cash-free gig shows no cash line and no handover action, because a gig where nobody paid cash should not manufacture a settlement step. Ending the gig discharges nothing on its own: the money stays in the driver's custody until the supplier counts it and confirms.

---

## Earnings

### DRV-07 Earnings and wallet

**Data**

| Shown | Source |
| ----- | ------ |
| Your money / reserved / paid / to recover / cash in hand | `FS get /DriverEarnings/{uid}` |
| Payout request rows | same get → `payoutRequests`, `payments` |
| Earnings-by-gig cards | `FS query Gigs` where `vehicleId == uid` and `status == "completed"` |
| Tax / certificates / PAN mask | `Fn getTdsRegister` (own rows) plus `FS get /UserProfiles/{uid}` → `panNumber` |
| Destination chip | `DriverEarnings.payoutMethod` on the same get |

| Control | On click |
| ------- | -------- |
| Request payout | `nav DRV-08` — disabled offline and while `cashInCustody > 0` |
| Edit / Add payout method | `nav DRV-08.3` or `nav DRV-08` |
| Hand over cash | `nav DRV-10.2` |
| View (gig) | `nav DRV-07.1` |
| Fix | `nav DRV-08.3` or `nav DRV-08.2` |
| Add PAN | `nav SHR-07.1` |
| Download certificate | `local` from `Fn getTdsRegister` payload |
| Pull to refresh | re-run Shown reads, bypass TTL |

```
┌──────────────────────────────────┐
│  Earnings      🔊   🔔    [👤]      │
├──────────────────────────────────┤
│  Your money                      │
│  Total earned      ₹12,400.00    │
│  Available to ask   ₹1,200.00    │
│  Reserved           ₹2,000.00    │
│    in a request you sent         │
│  Paid out           ₹9,200.00    │
│  To recover           ₹250.00    │
├──────────────────────────────────┤
│  Kranthi Kumar's money           │
│  ⏳ Cash in hand     ₹8,450.00    │
│  Ongole → Markapur · 21-08       │
│  Not yours to withdraw.          │
│              [ Hand over cash ]  │
├──────────────────────────────────┤
│  [  Request payout  ]            │
│  Pays to UPI ····4321   [ Edit ] │
├──────────────────────────────────┤
│  Payout requests                 │
│  ┌────────────────────────────┐  │
│  │ ₹2,000        PO-24188     │  │
│  │ ○ waiting for approval     │  │
│  │ Sent 20-08 · Kranthi Kumar │  │
│  └────────────────────────────┘  │
│  ┌────────────────────────────┐  │
│  │ ₹3,000        PO-24102     │  │
│  │ ✔ money sent · 13-08       │  │
│  │ UPI ····4321               │  │
│  │ UTR 431299887766           │  │
│  └────────────────────────────┘  │
│  ┌────────────────────────────┐  │
│  │ ₹1,500        PO-24077     │  │
│  │ ✖ didn't go through · 09-08│  │
│  │ Bank returned it.          │  │
│  │ Back in your dues.  [ Fix ]│  │
│  └────────────────────────────┘  │
│  ┌────────────────────────────┐  │
│  │ ₹5,000        PO-23990     │  │
│  │ ✖ rejected · 05-08-2026    │  │
│  │ "Exceeds cleared dues."    │  │
│  └────────────────────────────┘  │
├──────────────────────────────────┤
│  Earnings by gig                 │
│  ┌────────────────────────────┐  │
│  │ Ongole → Markapur          │  │
│  │ 21-08 · 12 delivered       │  │
│  │ ₹1,850          [ View ]   │  │
│  └────────────────────────────┘  │
├──────────────────────────────────┤
│ [ Gigs ] [ Tracking ] [ Earnings]│
└──────────────────────────────────┘
```

**No payout method yet** — `requestPayout` moves money, so it cannot be reachable before a verified destination exists.

```
│  ⚠ Add a payout method to        │
│    request money.                │
│                                  │
│  [ Add payout method ]           │
│  [ Request payout ] (disabled)   │
```

**Destination added but not yet usable** — verification and the cooling period are separate waits and the screen says which one it is in.

```
│  ⚠ Checking UPI ····4321 with    │
│    the bank. Usually a minute.   │
│  [ Request payout ] (disabled)   │

│  ⚠ You changed your account      │
│    today. Payouts to it start    │
│    after 6:40 PM tomorrow.       │
│    You can still send a request  │
│    now — it will pay out then.   │
```

**Tax deducted** — present only while the withholding module is enabled and this driver has a deduction. Absent entirely otherwise, because a ₹0 tax line invites a question that has no answer.

```
├──────────────────────────────────┤
│  Tax deducted this year          │
│  FY 2026-27           ₹1,284     │
│  PAN ABCPT····4F                 │
│                                  │
│  Certificates                    │
│  Q1  ✔ issued        [ Download ]│
│  Q2  ⏳ after 15-11               │
│                                  │
│  This is deposited with the      │
│  government against your PAN.    │
│  [ Why was this deducted? ]      │
```

**No PAN on file, withholding enabled** — the higher rate is stated before it is applied, not explained after a smaller payout arrives.

```
│  ⚠ Add your PAN                  │
│  Without it, 20% is deducted     │
│  instead of 1%. On your last     │
│  payout that was ₹2,420 more     │
│  than it needed to be.           │
│                                  │
│  [ Add PAN ]                     │
```

A payout row whose amount was reduced states the reason on the row itself — "₹2,000 requested · ₹184 tax · ₹1,816 sent" — so the difference between what was asked for and what arrived is never something the driver has to work out. `[ Download ]` and the certificate list are baseline access under `own_statutory_evidence`: they are the driver's tax documents and no plan, lapse, or suspension gates them.

The two blocks are separated because the figures mean opposite things. `totalEarnings`, the withdrawable balance and the payout history are the driver's own money. `cashInCustody` is the supplier's money sitting in the driver's pocket, and `cashRecoverable` is a shortfall already agreed against the driver's pay that `reviewPayoutRequest` nets off the next approved payout. Summing any of them into one "balance" is how a driver ends up believing they have been paid for cash they still owe, so no screen does it. The `⏳` figure disappears only when `confirmCashSettlement` runs, and the whole block is absent for a driver holding nothing.

**Available and reserved are shown as two numbers, never one.** `DriverEarning.pendingDues` is what can be asked for right now; `reservedForPayout` is money in a request already sent or a transfer already running. A single "pending dues" figure that silently shrinks when a request is filed reads, to the driver, exactly like money going missing — and when the payout later fails, the same figure grows again with no explanation. Two labelled lines make the reservation legible in both directions, and the reserved line names the request it is sitting in.

**A payout row states what actually happened to the money.** "Approved" is never shown as an outcome on its own, because approval is authorisation and the money has not moved; a row that has been approved but not yet transferred reads "approved — sending money" and carries the expected credit time. A completed row carries the UTR permanently, since the only useful answer to "my bank says nothing arrived" is a reference the bank can trace. A failed row states the rail's reason in plain language, confirms the amount is back in the driver's dues, and offers `[ Fix ]`, which opens `DRV-08.3` when the destination caused the failure and `retryPayout` when it did not.

Offline the amounts show `[cached]` under the offline banner and `[ Request payout ]` is disabled with "Needs an internet connection", while `[ Hand over cash ]` stays live because a settlement can be captured offline against the supplier's code sheet.

### DRV-07.1 Per-gig earnings detail

**Data**

| Shown | Source |
| ----- | ------ |
| Route, date, status | `FS get /Gigs/{gigId}` |
| Delivery counts / arithmetic | `FS query Orders` + `FS query MerchantOrders` where `gigId` matches, plus the completed Gig |
| Dues status | `FS get /DriverEarnings/{uid}` |

| Control | On click |
| ------- | -------- |
| Query this amount | `Fn raiseCashDiscrepancy` `{ kind: "earning_query", gigId }` |

```
┌──────────────────────────────────┐
│  ←  Gig earnings          [👤]    │
├──────────────────────────────────┤
│  Ongole → Markapur               │
│  21-08-2026 · completed          │
├──────────────────────────────────┤
│  Base trip rate         ₹800     │
│  Distance 86 km @ ₹6     ₹516    │
│  Buyer deliveries 9 @ ₹40  ₹360  │
│  Bulk deliveries 3 @ ₹58   ₹174  │
│                                  │
│  Total                ₹1,850     │
├──────────────────────────────────┤
│  Status                          │
│  ◉ In pending dues               │
│  Not yet requested               │
├──────────────────────────────────┤
│  Deliveries counted              │
│  Karavadi        3               │
│  Koppolu         4               │
│  Madhavaram      3               │
│  Markapur        2               │
├──────────────────────────────────┤
│  Rates are set by your supplier. │
│  [ 📞 Query this amount ]         │
└──────────────────────────────────┘
```

Showing the arithmetic matters: a driver who cannot reconcile their own pay has no route to dispute it, and disputes over pay are the fastest way to lose drivers.

### DRV-08 Payout method and request

**Data**

| Shown | Source |
| ----- | ------ |
| Available / to recover / destination | `FS get /DriverEarnings/{uid}` |
| Method radios and form fields | `local` |
| Bank name-match result | `Fn registerPayoutBeneficiary` response |

| Control | On click |
| ------- | -------- |
| Check and save | `Fn registerPayoutBeneficiary` — step-up via `DRV-08.3` when a destination already exists |
| Amount All / Custom | `local` |
| Send request | `Fn requestPayout` — `nav DRV-08.1` on `CASH_IN_CUSTODY_OUTSTANDING` |
| View that handover | `nav DRV-10.3` |
| Call supplier | `tel:` |

**Payout method sheet**

```
┌──────────────────────────────────┐
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│  Where should we send money?     │
│                                  │
│  (•) UPI ID                      │
│  ┌────────────────────────────┐  │
│  │ hari@okhdfcbank            │  │
│  └────────────────────────────┘  │
│                                  │
│  ( ) Bank account                │
│  ┌────────────────────────────┐  │
│  │ Account number             │  │
│  └────────────────────────────┘  │
│  ┌────────────────────────────┐  │
│  │ Type it again              │  │
│  └────────────────────────────┘  │
│  ┌────────────────────────────┐  │
│  │ IFSC                       │  │
│  └────────────────────────────┘  │
│  ┌────────────────────────────┐  │
│  │ Account holder name        │  │
│  └────────────────────────────┘  │
│                                  │
│  We check this with the bank     │
│  before sending anything.        │
│                                  │
│  [  Check and save  ]            │
└──────────────────────────────────┘
```

**Verification result** — the bank's answer is shown before the destination is accepted, never after the first payout fails.

```
│  ✔ Account confirmed             │
│  HDFC ····4821                   │
│  Bank says: HARI PRASAD          │
│  Matches your name.              │
│                                  │
│  Payouts to this account can     │
│  start after 6:40 PM tomorrow.   │
│  [ Done ]

│  ✖ Name doesn't match            │
│  Bank says: R KUMAR              │
│  You are registered as           │
│  Hari Prasad.                    │
│                                  │
│  Check the number, or use an     │
│  account in your own name.       │
│  [ Edit ]  [ 📞 Call supplier ]   │
```

**Request payout sheet**

```
┌──────────────────────────────────┐
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│  Request payout                  │
│                                  │
│  Available to ask   ₹3,200.00    │
│  To recover           ₹250.00    │
│                                  │
│  Amount                          │
│  ┌────────────────────────────┐  │
│  │ ₹ 3,200                    │  │
│  └────────────────────────────┘  │
│  [ All ]  [ Custom ]             │
│                                  │
│  Kranthi Kumar takes the         │
│  ₹250.00 off when they approve,  │
│  so you get ₹2,950.00.           │
│  [ View that handover ]          │
│                                  │
│  To  UPI hari····@okhdfcbank     │
│  ✔ confirmed with the bank       │
│  This is where it goes, even if  │
│  you change it later.            │
│                                  │
│  This ₹3,200 is held aside from  │
│  now until it's paid or turned   │
│  down. It's still yours.         │
│                                  │
│  Kranthi Kumar reviews payout    │
│  requests. Usually 1 to 2 days.  │
│                                  │
│  [  Send request  ]              │
└──────────────────────────────────┘
```

**Actions:** `[ Check and save ]` calls `registerPayoutBeneficiary`, which requires the step-up re-authentication in `DRV-08.3` whenever a destination already exists. `updateUserProfile` cannot write a payout destination at all and the sheet is not wired to it. Send calls `requestPayout` with an idempotency key; an amount above the withdrawable balance is rejected inline with `INSUFFICIENT_DUES` before submission, and a driver still holding cash is blocked by `DRV-08.1`. Approval or rejection is recorded by the supplier through `reviewPayoutRequest` and arrives by FCM.

The bank account number is typed twice because a single mistyped digit that passes the IFSC check pays a stranger, and no amount of downstream control recovers money that reached a valid account belonging to somebody else. The rail's own name lookup is the second guard, and its verbatim answer is shown rather than a pass/fail badge — a driver looking at "Bank says: R KUMAR" can tell instantly whether that is their father's account or a typo, and the platform cannot.

The destination is copied onto `DriverPayoutRequest.destination` as a `BeneficiarySnapshot` at the moment the request is sent and frozen there, which is why the sheet states it plainly. Editing the payout method afterwards changes where the *next* request goes and cannot retarget one already submitted: the approver disburses to the destination they reviewed, not to whatever the profile says by the time the transfer runs. The recover line appears only when `cashRecoverable` is above zero and states the net figure, because a driver who expects ₹3,200 and receives ₹2,950 with no explanation has been given a dispute rather than a payment. The reservation sentence is there for the same reason: the withdrawable figure is about to drop by ₹3,200 and the driver should read why before it happens, not after.

**Blocked states on this sheet**

| Condition | Server code | What the driver sees |
| --------- | ----------- | -------------------- |
| Destination not yet checked | `BENEFICIARY_UNVERIFIED` | Inline under the destination, with a jump to the method sheet |
| Changed within the cooling window | `BENEFICIARY_COOLING_PERIOD` | Request still allowed; a line states the payout starts after the stated time |
| Destination stopped by Support | `BENEFICIARY_BLOCKED` | Blocking sheet with a call-support action; no request can be filed |
| A request is already open | `PAYOUT_REQUEST_OPEN` | Send is disabled, with a jump to the open request |
| Still holding supplier cash | `CASH_IN_CUSTODY_OUTSTANDING` | `DRV-08.1` |

### DRV-08.2 Payout status and history

Opened from any payout row on `DRV-07`. This is the driver's answer to "where is my money", and it has to be answerable without a phone call.

**Data** — destination and wallet figures inherit `DRV-08` / `DRV-07`. Timeline and breakdown come from the transaction, not from inventing a status field.

| Shown | Source |
| ----- | ------ |
| Amount, destination snapshot, breakdown | `FS query PayoutTransactions` where this payout (or `FS get /PayoutTransactions/{id}`) |
| What happened | `FS query /PayoutTransactions/{id}/events` |

| Control | On click |
| ------- | -------- |
| Copy UTR | `local` |
| Fix my account details | `nav DRV-08.3` |
| Try again to same account | `Fn retryPayout` |
| Query this payout | `Fn raiseCashDiscrepancy` `{ kind: "payout_query", payoutTransactionId }` |
| Call support | `tel:` |

```
┌──────────────────────────────────┐
│  ←  Payout PO-24102       [👤]    │
├──────────────────────────────────┤
│  ₹3,000.00                       │
│  ✔ Money sent                    │
│  13-08-2026 · 02:14 PM           │
├──────────────────────────────────┤
│  Sent to                         │
│  UPI hari····@okhdfcbank         │
│  The account you had on 12-08.   │
├──────────────────────────────────┤
│  Bank reference (UTR)            │
│  431299887766          [ Copy ]  │
│  Show this if your bank says     │
│  nothing arrived.                │
├──────────────────────────────────┤
│  What happened                   │
│  ○ 12-08 09:10 AM                │
│    You asked for ₹3,000          │
│  ○ 12-08 06:55 PM                │
│    Kranthi Kumar approved it     │
│  ○ 13-08 02:11 PM                │
│    Sent to your bank             │
│  ● 13-08 02:14 PM                │
│    Bank confirmed · UTR above    │
├──────────────────────────────────┤
│  Amount breakdown                │
│  Requested            ₹3,000.00  │
│  Cash shortfall taken   ₹0.00    │
│  Tax deducted           ₹0.00    │
│  Paid to you          ₹3,000.00  │
├──────────────────────────────────┤
│  [ 📞 Query this payout ]         │
└──────────────────────────────────┘
```

**Failed payout**

```
│  ₹1,500.00                       │
│  ✖ Didn't go through             │
│  09-08-2026 · 11:02 AM           │
│                                  │
│  The bank sent it back. The      │
│  account number looks wrong.     │
│                                  │
│  Your ₹1,500.00 is back in your  │
│  dues. Nothing was lost.         │
│                                  │
│  ○ 08-08  You asked for ₹1,500   │
│  ○ 08-08  Kranthi Kumar approved │
│  ○ 09-08  Sent to your bank      │
│  ● 09-08  Bank returned it       │
│                                  │
│  [ Fix my account details ]      │
│  [ Try again to same account ]   │
│  [ 📞 Call support ]              │
```

**Still on its way**

```
│  ₹2,000.00                       │
│  ⏳ Sending money                 │
│  Expected by 6:00 PM today       │
│                                  │
│  Approved by Kranthi Kumar at    │
│  11:20 AM. Sent to your bank at  │
│  11:24 AM. Waiting for the bank  │
│  to confirm.                     │
│                                  │
│  Don't ask again — this one is   │
│  already on its way.             │
```

**Actions:** read-only. `[ Fix my account details ]` opens `DRV-08.3`; `[ Try again to same account ]` calls `retryPayout`, which creates a new `PayoutTransaction` with its own reference rather than replaying the failed one, and the history here then shows both. `[ Query this payout ]` opens a tracked dispute carrying the payout ID, so Support starts the conversation already knowing which transaction is in question.

The status list is rendered from `PayoutStatusEvent` records, not from a status field, so what the driver reads is the same append-only history Support and the auditor read. The amount breakdown appears on every payout including the ones with nothing deducted, because a line reading ₹0.00 teaches the driver where a deduction would appear, and a breakdown that only shows up when money is missing looks like an excuse.

### DRV-08.3 Change payout destination

Changing where money goes is the single highest-value action a driver's account can perform, and it is the action an attacker who has borrowed a phone will reach for first.

**Data** — same `FS get /DriverEarnings/{uid}` destination as `DRV-08`. OTP boxes are `Auth` (step-up), not a handover code.

| Control | On click |
| ------- | -------- |
| Send code | `Auth` step-up OTP to the registered phone |
| Confirm | `Auth` verify, then `Fn registerPayoutBeneficiary` with the `stepUpToken` |
| Call now | `tel:` |

```
┌──────────────────────────────────┐
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│  Change where money goes         │
│                                  │
│  Money goes to                   │
│  UPI hari····@okhdfcbank         │
│                                  │
│  To change it, confirm it's you. │
│  We'll send a code to            │
│  +91 ····3456.                   │
│                                  │
│  [  Send code  ]                 │
└──────────────────────────────────┘
```

```
│  Enter the code                  │
│  ┌──┐┌──┐┌──┐┌──┐┌──┐┌──┐        │
│  └──┘└──┘└──┘└──┘└──┘└──┘        │
│                                  │
│  [  Confirm  ]                   │
│  Resend in 00:42                 │
```

**After the change**

```
│  ✔ New account saved             │
│  HDFC ····4821                   │
│                                  │
│  Payouts start going here after  │
│  6:40 PM tomorrow. Until then    │
│  they go to the old account.     │
│                                  │
│  We told your old account's      │
│  owner and Kranthi Kumar about   │
│  this change.                    │
│                                  │
│  Didn't do this? [ 📞 Call now ]  │
└──────────────────────────────────┘
```

**Actions:** the OTP produces the `stepUpToken` that `registerPayoutBeneficiary` requires; without it the call is refused with 401 regardless of a valid session. On success the previous beneficiary is superseded rather than deleted, so a payout already snapshotted against it still reconciles. Notifications fire to the driver's registered phone and to the managing supplier under the `payout` category.

The cooling period and the notification exist for the same reason: they convert a silent theft into a race the owner can win. An attacker who changes the destination gains nothing for a day, during which the real driver receives a message they did not expect and has a "Didn't do this?" button in front of them. Blocking the change outright would strand every driver who genuinely closed a bank account, so the design delays and announces rather than prevents. If a payout is mid-flight the change is refused with `PAYOUT_IN_FLIGHT` and the sheet states when it can be retried, because retargeting a transfer that has already left is not something the platform can honour.

### DRV-08.1 Payout blocked — cash in hand

Earnings and custody are separate pots of money, and the settlement comes first. A driver carrying the supplier's cash cannot draw their own pay out from underneath it.

**Data** — `DRV-08` wallet get plus `Fn getCashCustodySummary` for the named settlement rows. Blocking total is `DriverEarnings.cashInCustody`.

| Control | On click |
| ------- | -------- |
| Hand over cash / Hand over {date} cash | `nav DRV-10.2` for that `settlementId` |
| Call supplier / support | `tel:` |
| Close | `nav DRV-07` |

```
┌──────────────────────────────────┐
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│  Hand over cash first            │
│                                  │
│  You are holding ₹8,450.00 of    │
│  Kranthi Kumar's money.          │
│                                  │
│  Ongole → Markapur · 21-08       │
│  Opened 06:40 PM · not settled   │
│                                  │
│  Your ₹3,200.00 is still yours.  │
│  Ask for it once this cash is    │
│  handed over and confirmed.      │
│                                  │
│  [ Hand over cash ]              │
│  [ 📞 Call supplier ]             │
│  [ Close ]                       │
└──────────────────────────────────┘
```

**More than one gig unsettled**

```
│  You are holding ₹12,450.00 of   │
│  Kranthi Kumar's money.          │
│                                  │
│  Ongole → Markapur · 21-08       │
│  ₹8,450.00 · not settled         │
│  Podili dairy run · 20-08        │
│  ₹4,000.00 · ⚠ sent to support   │
│                                  │
│  The 20-08 amount is with        │
│  support. It stays counted as    │
│  yours until they finish.        │
│                                  │
│  [ Hand over 21-08 cash ]        │
│  [ 📞 Call support ]              │
```

**Actions:** `requestPayout` throws `CASH_IN_CUSTODY_OUTSTANDING` while `DriverEarning.cashInCustody` is above zero, and this sheet is how that error surfaces — with the amount, the settlement it belongs to, and the way out. `[ Hand over cash ]` opens `DRV-10.2` for the named settlement; where several are open, one action per settlement, oldest first. `[ Request payout ]` on `DRV-07` stays visible and dimmed with "Hand over ₹8,450.00 to your supplier first" beside it rather than vanishing, so the driver can see that the money is reachable and why it is not reachable yet. A disputed settlement does not clear the block: custody has not discharged, and `raiseCashDiscrepancy` is a claim in progress, not a release. The blocking total is `DriverEarning.cashInCustody` and the per-settlement rows beneath it come from `getCashCustodySummary`, so the sheet names the same figures the supplier is looking at rather than a number only the driver's device believes.

### DRV-09 Vehicle profile

**Data**

| Shown | Source |
| ----- | ------ |
| Registration, type, contact | `FS get /UserProfiles/{uid}` → `vehicleNumber`, `vehicleType`, `phone` |
| Managing supplier | same get → `supplierId`, then `FS get /UserProfiles/{supplierId}` → `name` |
| Capacity | `FS get /UserProfiles/{uid}` → `vehicleCapacityKg` |

| Control | On click |
| ------- | -------- |
| Fields | `local` until Save |
| Save | `Fn updateUserProfile` `{ vehicleNumber, vehicleType, vehicleCapacityKg }` |

```
┌──────────────────────────────────┐
│  ←  My vehicle            [👤]    │
├──────────────────────────────────┤
│  Registration                    │
│  ┌────────────────────────────┐  │
│  │ AP-27-TX-1234              │  │
│  └────────────────────────────┘  │
│                                  │
│  Type            [ Tata Ace  ▾]  │
│  Capacity        [ 750 kg    ▾]  │
│                                  │
│  Contact number                  │
│  ┌────────────────────────────┐  │
│  │ +91 76543 21090            │  │
│  └────────────────────────────┘  │
│                                  │
│  Managing supplier               │
│  Kranthi Kumar · fixed           │
│                                  │
│  ⚠ Changing the registration     │
│    does not affect gigs already  │
│    completed.                    │
│                                  │
│  [  Save  ]                      │
└──────────────────────────────────┘
```

Reachable from the avatar menu. Registration and type feed the vehicle label shown to buyers on `BUY-05` and `BUY-12` and to merchants on `MER-08`.

---

## Cash custody

### DRV-10 Cash in hand

The driver's side of the custody card in [Patterns.md](Patterns.md) section 8.1. Driver and supplier both call `getCashCustodySummary` and both quote the same total against the same `asOf` time, which is what stops the handover from being an argument at the counter.

**Data**

| Shown | Source |
| ----- | ------ |
| Total, as-of, source breakdown | `Fn getCashCustodySummary` — the only source of the total |
| Source drill-down rows | `FS query CashLedgerEntries` where `holderId == uid` (and `source` when a line is opened) |
| Offline card | `cache` of the last summary plus `local` outbox rows not yet replayed |

| Control | On click |
| ------- | -------- |
| Source line `[>]` | `local` filter of the same ledger query |
| Load more | same `FS query` page |
| Hand over cash | `nav DRV-10.2` — disabled while a failed handover is unreported |
| Take cash from a merchant | `nav DRV-10.1` |
| Report to support | `Fn raiseCashDiscrepancy` |
| Back to tracking | `nav DRV-04` |
| Pull to refresh | re-run Shown reads, bypass TTL |

```
┌──────────────────────────────────┐
│  ←  Cash in hand    🔊    [👤]     │
├──────────────────────────────────┤
│  Ongole → Markapur · 21-08       │
├──────────────────────────────────┤
│  ┌────────────────────────────┐  │
│  │ Cash to hand over          │  │
│  │ ₹8,450.00                  │  │
│  │ As of 21-08-2026 06:40 PM  │  │
│  │                            │  │
│  │ Buyer cash orders          │  │
│  │ ₹3,150.00 · 7 orders   [ >]│  │
│  │ Merchant repayments        │  │
│  │ ₹4,000.00 · 2 shops    [ >]│  │
│  │ Merchant bulk cash         │  │
│  │ ₹1,300.00 · 1 order    [ >]│  │
│  │ ────────────────────────── │  │
│  │ Total           ₹8,450.00  │  │
│  └────────────────────────────┘  │
│  This is Kranthi Kumar's money.  │
│  The total is worked out from    │
│  your collections. It cannot be  │
│  changed by hand.                │
├──────────────────────────────────┤
│  [ Hand over cash ]              │
│  [ Take cash from a merchant ]   │
└──────────────────────────────────┘
```

**One source, opened up**

```
┌──────────────────────────────────┐
│  ←  Buyer cash orders     [👤]    │
├──────────────────────────────────┤
│  7 collections · ₹3,150.00       │
├──────────────────────────────────┤
│  ┌────────────────────────────┐  │
│  │ Anil Kumar                 │  │
│  │ INV-2408210001 · Karavadi  │  │
│  │ ₹1,550.52 · 10:34 AM       │  │
│  │ ✔ Their code               │  │
│  └────────────────────────────┘  │
│  ┌────────────────────────────┐  │
│  │ Bala Krishna               │  │
│  │ INV-2408210014 · Karavadi  │  │
│  │ ₹880.00 · 10:41 AM         │  │
│  │ ⚠ Photo · phone was off    │  │
│  └────────────────────────────┘  │
│  ┌────────────────────────────┐  │
│  │ Ravi Chandra               │  │
│  │ INV-2408210021 · Koppolu   │  │
│  │ ₹719.48 · 12:05 PM         │  │
│  │ ✔ Their code · queued      │  │
│  └────────────────────────────┘  │
├──────────────────────────────────┤
│  ⏳ Not handed over yet           │
│  [ Load more ]                   │
└──────────────────────────────────┘
```

Every row names its order, its counterparty, the time the cash was taken, and how it was proved. Weak proof carries `⚠` and its reason on the row, because the driver should not have to discover at the counter which of their collections the supplier is going to query.

**Nothing in hand**

```
┌──────────────────────────────────┐
│  ←  Cash in hand    🔊    [👤]     │
├──────────────────────────────────┤
│             [ ✔ ]                │
│                                  │
│     No cash to hand over         │
│   Cash orders and merchant       │
│   repayments show up here as     │
│   you collect them.              │
│                                  │
│      [ Back to tracking ]        │
└──────────────────────────────────┘
```

**Offline**

```
│  ⚠ Offline — saved figures       │
├──────────────────────────────────┤
│  ┌────────────────────────────┐  │
│  │ Cash to hand over          │  │
│  │ ₹8,450.00        [cached]  │  │
│  │ As of 21-08-2026 06:40 PM  │  │
│  │ 1 collection not sent yet  │  │
│  └────────────────────────────┘  │
```

The figure a settlement was opened with is frozen, so a cached total is a stale reading rather than a drifting one; queued collections are counted in and called out on their own line. The screen re-reads before `DRV-10.2` submits anything whenever it has signal.

**Blocked by an unconfirmed collection**

```
│  ⚠ 1 collection could not be     │
│    confirmed. Report it first.   │
│    [ Report to support ]         │
│                                  │
│  [ Hand over cash ] (disabled)   │
│  Report the failed handover.     │
```

**Actions:** The screen reads `getCashCustodySummary`, which mutates nothing and is the only source of the total; no client anywhere sums the rows to produce it. `[ Hand over cash ]` opens `DRV-10.2`, `[ Take cash from a merchant ]` opens `DRV-10.1`, and each source line opens its ledger entries. `[ Report to support ]` calls `raiseCashDiscrepancy`. Loading draws the card as a skeleton with the last known total beneath it; a `permission denied` on another driver's custody is impossible to reach from here, because the request carries no `driverId` when a driver makes it. Reachable from `DRV-04`, from the cash block on `DRV-07`, and from the gig completion screen.

### DRV-10.1 Collect merchant cash

Amount first, then verification. A merchant paying down their credit line hands over notes and reads out a code; the driver types the code and never sees it before that. Credit is relieved the moment the code confirms, not later at the hub, so the merchant can place their next order against a line they have actually paid down.

**Data** — credit ceiling from `FS get /CreditProfiles/{merchantId}` (`creditUsed`, `pendingRepayments`). Shop line from `FS get /UserProfiles/{merchantId}`. Gig gate from `FS get /Gigs/{gigId}`. Code boxes are `local`. Never `FS get /CustodyTransfers/{id}/private/code`.

| Control | On click |
| ------- | -------- |
| All / Custom amount | `local` |
| Ask for cash | `Fn initiateCreditRepayment` |
| Confirm, online | `Fn confirmCreditRepayment` |
| Confirm, offline | `local` outbox (Room + WorkManager) then `Fn confirmCreditRepayment` replay |
| Send the code again | `Fn resendHandoverCode` |
| Use another way | `nav DRV-05.3` |
| Start again | `Fn initiateCreditRepayment` (new transfer) |
| Cash in hand | `nav DRV-10` |
| Read the digits aloud | `local` |

```
┌──────────────────────────────────┐
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│  Take cash from a shop    [ X ]  │
│                                  │
│  Sri Lakshmi Stores · Karavadi   │
│                                  │
│  They owe          ₹12,000.00    │
│  ⏳ With another driver           │
│                     ₹4,000.00    │
│  You can take up to ₹8,000.00    │
│                                  │
│  Amount                          │
│  ┌────────────────────────────┐  │
│  │ ₹ 4,000                    │  │
│  └────────────────────────────┘  │
│  [ All ]  [ Custom ]             │
│                                  │
│  Cash another driver already     │
│  took has already reduced their  │
│  credit. It cannot be collected  │
│  twice.                          │
│                                  │
│  [ Cancel ]    [ Ask for cash ]  │
└──────────────────────────────────┘
```

**Above what is collectable**

```
│  Amount                          │
│  ┌────────────────────────────┐  │
│  │ ₹ 10,000                   │  │
│  └────────────────────────────┘  │
│  ⚠ You can take up to ₹8,000.00. │
│    ₹4,000.00 is already with     │
│    another driver.               │
│                                  │
│  [ Ask for cash ] (disabled)     │
```

The ceiling is `creditUsed - inTransitRepayments` from the merchant's credit profile, stated on the sheet before anything is typed. A figure above it is refused rather than quietly clamped, so the driver and the shopkeeper reconcile the number verbally before any notes move.

**Their code**

```
┌──────────────────────────────────┐
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│  Confirm cash taken       [ X ]  │
│                                  │
│  Sri Lakshmi Stores              │
│  Against credit     ₹4,000.00    │
│  Code sent to +91 ****3456       │
│                                  │
│  Ask them for the 6-digit code   │
│  on their phone.                 │
│                                  │
│  ┌──┐┌──┐┌──┐┌──┐┌──┐┌──┐        │
│  │  ││  ││  ││  ││  ││  │        │
│  └──┘└──┘└──┘└──┘└──┘└──┘        │
│  Finish by 04:45 PM.             │
│                                  │
│  When you confirm, their credit  │
│  drops straight away and         │
│  Kranthi Kumar is told you have  │
│  the money.                      │
│                                  │
│  [ 🔊 Read the digits aloud ]     │
│  [ Send the code again ]         │
│  [ Use another way ]             │
│                                  │
│  [ Cancel ]      [ Confirm ]     │
└──────────────────────────────────┘
```

**The 30 minutes ran out**

```
│  ⚠ This took too long. Nothing   │
│    was recorded. Start the       │
│    collection again.             │
│                                  │
│  [ Start again ]                 │
```

`CUSTODY_TRANSFER_EXPIRED` resets the sheet to the amount step. A pending transfer is a question, not money, and an unanswered question expires rather than lingering: the driver re-initiates instead of reviving a stale challenge. If notes did change hands before it expired, that is an unrecorded collection and belongs in `raiseCashDiscrepancy`.

**Offline**

```
│  ⚠ Offline — will send later     │
│                                  │
│  Sri Lakshmi Stores              │
│  Against credit     ₹4,000.00    │
│                                  │
│  Ask for code number             │
│  ┌────┐  from their code sheet   │
│  │ 07 │                          │
│  └────┘                          │
│  ┌──┐┌──┐┌──┐┌──┐┌──┐┌──┐        │
│  │  ││  ││  ││  ││  ││  │        │
│  └──┘└──┘└──┘└──┘└──┘└──┘        │
│                                  │
│  Each code works once only.      │
│  Saved with the time you took    │
│  it. Their credit drops when     │
│  this reaches Kranthi Kumar.     │
```

The code sheet belongs to the merchant, printed or held on their own device. The driver has no batch of their own and never will: codes are issued to the party that authorises a transfer, and the driver is the party being checked.

**Cash taken**

```
┌──────────────────────────────────┐
│                                  │
│          ✔ Cash taken            │
│                                  │
│  Sri Lakshmi Stores              │
│  ₹4,000.00                       │
│  21-08-2026, 04:15 PM            │
│  They confirmed with their code  │
│                                  │
│  Their credit now                │
│  Used               ₹8,000.00    │
│  Available         ₹42,000.00    │
│                                  │
│  Cash in hand now   ₹8,450.00    │
│                                  │
│  [ Cash in hand ]    [ Done ]    │
└──────────────────────────────────┘
```

**Actions**


| Control              | Result                                                                          |
| -------------------- | ------------------------------------------------------------------------------- |
| Ask for cash         | `initiateCreditRepayment` with the `merchantId`, the `gigId`, the amount, and a client `idempotencyKey`; starts a 30-minute clock and sends the merchant their code |
| Confirm, online      | `confirmCreditRepayment` with `proof.method: "otp"` and the typed `confirmationCode` |
| Confirm, offline     | Same call queued with `method: "offline_code"`, `codeBatchId` and `codeCounter`, plus the device `capturedAt` |
| Send the code again  | `resendHandoverCode` to the merchant's registered number                        |
| Use another way      | `DRV-05.3`, which serves this handover with the merchant as the counterparty     |
| Cash in hand         | `DRV-10`                                                                        |

`confirmCreditRepayment` is the single moment the cash becomes real: it relieves `creditUsed`, raises `inTransitRepayments` on the merchant's profile, writes a `CashLedgerEntry` at `source: "merchant_credit_repayment"` and `status: "in_custody"`, raises the driver's `cashInCustody`, and notifies the merchant and the supplier with the same figure. `[ Ask for cash ]` is available only on a `started` gig that serves this merchant, and is dimmed with the reason otherwise. `[ Confirm ]` is dimmed until six digits are in. A merchant with nothing outstanding shows "Nothing owed on credit" in place of the amount step. Reachable from `DRV-03` and from `DRV-10`.

### DRV-10.2 Hand over to supplier

The driver's half of the two-sided settlement in [Patterns.md](Patterns.md) section 8.2. The driver declares; the supplier counts and confirms against their own code. Neither side does both, which is the whole reason a shortfall is attributable rather than contested.

**Data** — expected figure from `FS get /CashSettlements/{settlementId}` (frozen at open). Declared amount, reason, counted amount, and resolution radios are `local`. Never `FS get /CashSettlements/{id}/private/code`.

| Control | On click |
| ------- | -------- |
| Declare handover | `Fn declareCashHandover`. Offline: `local` outbox (Room + WorkManager) then Fn replay |
| Confirm settlement | `Fn confirmCashSettlement`. Offline: `local` outbox then Fn replay |
| Send the code again | `Fn resendHandoverCode` |
| Use another way | `nav DRV-05.3` |

```
┌──────────────────────────────────┐
│  ←  Hand over cash        [👤]    │
├──────────────────────────────────┤
│  To   Kranthi Kumar · Ongole Hub │
│  Gig  Ongole → Markapur · 21-08  │
├──────────────────────────────────┤
│  App says          ₹8,450.00     │
│                                  │
│  I am handing over               │
│  ┌────────────────────────────┐  │
│  │ ₹ 8,450                    │  │
│  └────────────────────────────┘  │
│                                  │
│  ✔ Matches                       │
│                                  │
│  Kranthi Kumar will count it and │
│  confirm with their own code.    │
│                                  │
│  [ Declare handover ]            │
└──────────────────────────────────┘
```

**Declaring a different figure**

```
│  I am handing over               │
│  ┌────────────────────────────┐  │
│  │ ₹ 8,200                    │  │
│  └────────────────────────────┘  │
│                                  │
│  ⚠ ₹250.00 less than the app     │
│    says. Tell your supplier why. │
│  Reason                          │
│  ┌────────────────────────────┐  │
│  │ Buyer paid ₹250 short at   │  │
│  │ Karavadi                   │  │
│  └────────────────────────────┘  │
│                                  │
│  [ Declare handover ] (disabled) │
│  Add a reason to continue.       │
```

The difference is stated as a fact and never as an accusation. The reason is mandatory before the button enables, and it is required at the moment of declaring rather than afterwards, because a figure explained a day later is an argument and a figure explained at the counter is a record.

**Their code, and what happens to the difference**

```
┌──────────────────────────────────┐
│  ←  Confirm handover      [👤]    │
├──────────────────────────────────┤
│  ⏳ Declared 06:45 PM             │
├──────────────────────────────────┤
│  App says          ₹8,450.00     │
│  You declared      ₹8,200.00     │
│                                  │
│  Kranthi Kumar counted           │
│  ┌────────────────────────────┐  │
│  │ ₹ 8,200                    │  │
│  └────────────────────────────┘  │
│                                  │
│  ⚠ Short by ₹250.00              │
│  What should happen?             │
│  ( ) Take it from my pay         │
│  ( ) Carry to my next gig        │
│  (•) Send to support             │
│  Note                            │
│  ┌────────────────────────────┐  │
│  │ Buyer paid short at        │  │
│  │ Karavadi                   │  │
│  └────────────────────────────┘  │
│                                  │
│  Ask Kranthi Kumar for their     │
│  6-digit code.                   │
│  ┌──┐┌──┐┌──┐┌──┐┌──┐┌──┐        │
│  │  ││  ││  ││  ││  ││  │        │
│  └──┘└──┘└──┘└──┘└──┘└──┘        │
│                                  │
│  [ Confirm settlement ]          │
└──────────────────────────────────┘
```

Three resolutions, not four. Writing the difference off is not offered to a driver at all — only the supplier or Support can waive their own money, and a driver who could waive a shortfall against themselves has no shortfall. The choice belongs to the supplier and is made out loud at the counter; the driver records it beside the code, which is why the two sit on one screen. "Send to support" leaves the whole amount in the driver's custody until the claim is settled, which is what the disputed state is for. An overage is treated with the same seriousness and the same three choices, because unattributed extra cash is also unexplained cash.

**Offline**

```
│  ⚠ Offline — will send later     │
│                                  │
│  App says          ₹8,450.00     │
│  You declared      ₹8,450.00     │
│                                  │
│  Ask for code number             │
│  ┌────┐  from their code sheet   │
│  │ 12 │                          │
│  └────┘                          │
│  ┌──┐┌──┐┌──┐┌──┐┌──┐┌──┐        │
│  │  ││  ││  ││  ││  ││  │        │
│  └──┘└──┘└──┘└──┘└──┘└──┘        │
│                                  │
│  Each code works once only.      │
│  Saved with the time you handed  │
│  it over.                        │
```

**Actions**


| Control              | Result                                                                          |
| -------------------- | ------------------------------------------------------------------------------- |
| Declare handover     | `declareCashHandover` with the `settlementId`, the `declaredAmount`, a `varianceNote` whenever it differs from the expected amount, and a client `idempotencyKey` |
| Confirm settlement   | `confirmCashSettlement` with the `countedAmount`, the supplier's code as `proof`, and a `varianceResolution` plus note on any variance |
| Send the code again  | `resendHandoverCode` against the `settlementId`, which reaches the supplier      |
| Use another way      | `DRV-05.3`, with the supplier as the counterparty                               |

The expected figure is read from the settlement `completeAndFinalizeGig` or `suspendGig` opened, so it does not move underneath either party while they are standing at the counter; if the ledger has moved, `confirmCashSettlement` refuses with `LEDGER_IMBALANCE` and routes to support rather than reconciling itself. `SETTLEMENT_ALREADY_CONFIRMED` means the supplier confirmed from their own screen: the screen refreshes to `DRV-10.3` rather than reporting a failure. A declaration can be re-declared until it is confirmed. Both calls carry an `idempotencyKey`, because a settlement is the single most damaging thing on this platform to apply twice.

### DRV-10.3 Settlement receipt

Read-only and cached on the device, because a paper trail nobody can retrieve is not a paper trail. Three figures side by side, never one.

**Data**

| Shown | Source |
| ----- | ------ |
| App / declared / counted, resolution, note | `FS get /CashSettlements/{settlementId}` (`cache` when offline) |
| Verification line | `FS get /CustodyTransfers/{settlement.custodyTransferId}` |
| Cash in hand now | `FS get /DriverEarnings/{uid}` → `cashInCustody` |

| Control | On click |
| ------- | -------- |
| Report a problem | `Fn raiseCashDiscrepancy` |
| Call support | `tel:` |

```
┌──────────────────────────────────┐
│  ←  Handover receipt      [👤]    │
├──────────────────────────────────┤
│         ✔ Cash handed over       │
│                                  │
│  To   Kranthi Kumar · Ongole Hub │
│  Gig  Ongole → Markapur · 21-08  │
│  21-08-2026, 06:52 PM            │
├──────────────────────────────────┤
│  App said          ₹8,450.00     │
│  You declared      ₹8,200.00     │
│  They counted      ₹8,200.00     │
│  ────────────────────────────    │
│  Short by            ₹250.00     │
│                                  │
│  Settled by taking it from your  │
│  pay. It comes off your next     │
│  payout.                         │
│                                  │
│  Note: buyer paid ₹250 short at  │
│  Karavadi                        │
├──────────────────────────────────┤
│  Confirmed with Kranthi Kumar's  │
│  code                            │
│  Cash in hand now       ₹0.00    │
├──────────────────────────────────┤
│  Saved on this phone. You can    │
│  open it without signal.         │
│                                  │
│  [ Report a problem ]            │
└──────────────────────────────────┘
```

**Nothing was short**

```
│  App said          ₹8,450.00     │
│  You declared      ₹8,450.00     │
│  They counted      ₹8,450.00     │
│  ────────────────────────────    │
│  ✔ Matches                       │
│                                  │
│  Confirmed with Kranthi Kumar's  │
│  code                            │
│  Cash in hand now       ₹0.00    │
```

**Sent to support**

Custody has not discharged here. The cash is still the driver's responsibility, and the receipt says so instead of implying the matter is closed.

```
┌──────────────────────────────────┐
│  ←  Handover receipt      [👤]    │
├──────────────────────────────────┤
│  ⚠ Sent to support               │
├──────────────────────────────────┤
│  App said          ₹8,450.00     │
│  You declared      ₹8,200.00     │
│  They counted      ₹8,000.00     │
│  ────────────────────────────    │
│  Short by            ₹450.00     │
│                                  │
│  Raised 06:55 PM by Kranthi      │
│  Kumar                           │
│                                  │
│  Support is looking at this. The │
│  ₹8,450.00 is still counted as   │
│  yours to hand over until they   │
│  finish, so you cannot request a │
│  payout yet.                     │
│                                  │
│  Confirmed with Kranthi Kumar's  │
│  code                            │
├──────────────────────────────────┤
│  [ 📞 Call support ]              │
│  [ Report a problem ]            │
└──────────────────────────────────┘
```

**Weak proof was used**

```
│  ⚠ Finished without a code       │
│    Photo · phone was switched    │
│    off                           │
│  Kranthi Kumar and support can   │
│  see this.                       │
```

**Actions:** `[ Report a problem ]` calls `raiseCashDiscrepancy` with the settlement, the amount in question, and the supplier as `againstPartyId`. Nothing else on the screen writes. The verification line names the method used and, where it was weak, the reason recorded with it. The receipt is reachable from `DRV-10`, from the per-gig earnings detail on `DRV-07.1`, and from the `cash_custody` notification, and it renders from cache with the offline banner when there is no signal. A settlement still `declared` shows the waiting state from `DRV-10.2` instead of a receipt, because nothing has been counted yet.

---

## End-to-end flows

### Buyer upgraded to driver

```
Buyer exists → Supplier Dashboard → Network
  → Convert to Vehicle → convertBuyerToRole
  → Driver opens app → role splash → DRV-01 setup
  → DRV-02 Gigs immediately
```

### Driver live execution

```
DRV-02 Gigs → acknowledge → DRV-04 Tracking
  → Start route → geofence Arriving → Reached (buyer FCM)
  → DRV-05 proof per order (buyer and bulk)
  → DRV-05.2 counterparty reads out the code
  → Left → next stop → repeat
  → End gig → DRV-06 if anything is open
  → completeAndFinalizeGig → DRV-10 Cash in hand
  → DRV-07 Earnings
```

### Taking cash and handing it over

```
DRV-05.2 buyer cash order → markOrderDelivered
DRV-03 → Take cash → DRV-10.1
  → initiateCreditRepayment → merchant reads out code
  → confirmCreditRepayment → credit relieved, cash in custody
  → DRV-10 running total per source
  → End gig → completeAndFinalizeGig opens CashSettlement
  → DRV-10.2 declareCashHandover
  → supplier reads out settlement code
  → confirmCashSettlement → DRV-10.3 receipt
```

### When a code cannot be read out

```
DRV-05.2 → Use another way → DRV-05.3
  → photo, or counter signature, or ask the supplier
  → supplier grants on SUP-16.3 → support_override
  → 5 wrong codes → code field gone for that handover
  → offline → counterparty's code batch, queued
  → queued call fails on sync → DRV-05.1
  → raiseCashDiscrepancy before any handover
```

### Breakdown and reassignment

```
Breakdown → supplier calls suspendGig
  → DRV-04.2 suspended, route actions locked
  → suspendGig opens a CashSettlement for cash held
  → original driver settles at DRV-10.2
  → supplier calls reassignGigDriver
  → replacement driver sees Take over gig
  → resumes at preserved currentVillageIndex, ₹0.00 held
```

### Getting paid

```
DRV-07 → add payout method (DRV-08)
  → cash still in hand → DRV-08.1 blocks
  → DRV-10.2 settle first
  → Request payout → requestPayout, destination frozen
  → supplier reviewPayoutRequest → approved
  → cashRecoverable netted off, payout logged
```
