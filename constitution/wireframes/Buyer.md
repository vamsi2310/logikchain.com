# Buyer wireframes

**Nav:** Home · Cart · Orders

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


Setup and Home after login. Shared login / OTP / profile: [Shared.md](Shared.md).

Every screen below must also satisfy the loading, empty, error, offline, queued and disabled states defined in [Patterns.md](Patterns.md), and must carry the **Data** block from [Patterns.md](Patterns.md) §1A (what Firestore paints, what each control calls). Only the buyer-specific variants are drawn here. Header chrome (`🔊` `🔔` `👤`) is specified once in that section and is not repeated.

---

## Screen index

| ID | Screen |
| -- | ------ |
| `BUY-01` | Setup step 1 — permissions |
| `BUY-02` | Setup step 2 — geography |
| `BUY-03` | Setup step 3 — pickup merchant |
| `BUY-03.1` | Incomplete setup re-entry |
| `BUY-04` | Buyer home — upcoming gigs |
| `BUY-04.1` | Home — no gigs in village |
| `BUY-04.2` | Home — offline / GPS denied |
| `BUY-05` | Gig detail |
| `BUY-05.1` | Pamphlet catalog — search and filter |
| `BUY-06` | Product detail sheet |
| `BUY-07` | Cart |
| `BUY-07.1` | Cart — empty |
| `BUY-07.2` | Cart — stock reconciliation |
| `BUY-07.3` | Cart — gig conflict |
| `BUY-08` | Order review and payment method |
| `BUY-09` | Payment processing, failure and pending |
| `BUY-10` | Order placed — pickup code |
| `BUY-10.1` | Pickup code |
| `BUY-10.2` | Pickup code problems |
| `BUY-11` | Orders list |
| `BUY-12` | Order detail and live tracking |
| `BUY-12.1` | Invoice view / download |
| `BUY-12.2` | Cancel order confirm |
| `BUY-12.3` | Refund status |
| `BUY-12.4` | Reorder |
| `BUY-12.5` | Handover receipt |

---

## Setup

### BUY-01 Setup step 1 — permissions

**Data**

| Shown | Source |
| ----- | ------ |
| Permission checkboxes | `FS get /UserProfiles/{uid}` → `permissions` |
| Step chrome | `local` |

| Control | On click |
| ------- | -------- |
| Each checkbox | OS permission prompt, then `local` until Continue |
| Continue | `Fn updateUserProfile` `{ permissions }` then `nav BUY-02` |
| Skip | `nav BUY-02` — no write |

```
┌──────────────────────────────────┐
│  Set up your account   🔊  [👤]    │
├──────────────────────────────────┤
│  Step 1 of 3 · Permissions       │
│  ███████░░░░░░░░░░░░░░░░░░░░░░░  │
├──────────────────────────────────┤
│  □ Location                      │
│  □ SMS                           │
│  □ Audio / voice                 │
│  □ Camera                        │
│                                  │
│  Deny any permission: a warning  │
│  banner appears; you can still   │
│  pick Hub/Village manually.      │
│                                  │
│  [ Skip ]        [ Continue ]    │
└──────────────────────────────────┘
```

Permissions are stored on `UserProfile.permissions` and can be changed later from the permissions manager (`SHR-10`) in [Shared.md](Shared.md).

### BUY-02 Setup step 2 — geography

**Data**

| Shown | Source |
| ----- | ------ |
| Address field | `FS get /UserProfiles/{uid}` → `address` |
| Country / State / District / Hub / Village pickers | `Fn listConfigurationCatalog` — active records only; cascade filters client-side |
| GPS prefills | device location, then match against the catalog |

| Control | On click |
| ------- | -------- |
| Cascading pickers | `local` until Continue |
| Continue | `Fn updateUserProfile` `{ address, villageId }` then `nav BUY-03` |
| Skip | `nav BUY-03` — no write |

```
┌──────────────────────────────────┐
│  ←  Your location      🔊  [👤]    │
├──────────────────────────────────┤
│  Step 2 of 3 · Geography         │
│  ████████████████░░░░░░░░░░░░░░  │
│  Auto-filled from GPS if allowed │
├──────────────────────────────────┤
│  Address                         │
│  ┌────────────────────────────┐  │
│  │ Door / street / landmark   │  │
│  └────────────────────────────┘  │
│  Country        [ India      ▾]  │
│  State          [ Andhra Pr. ▾]  │
│  District       [ Prakasam   ▾]  │
│  Hub            [ Prakasam C ▾]  │
│  Village        [ Karavadi   ▾]  │
│                                  │
│  Pickers show active catalog     │
│  only (cascade).                 │
│                                  │
│  [ Skip ]        [ Continue ]    │
└──────────────────────────────────┘
```

### BUY-03 Setup step 3 — pickup merchant

**Data**

| Shown | Source |
| ----- | ------ |
| Shop cards | `FS query UserProfiles` where `role == "merchant"`, `status == "approved"`, `villageId ==` the village from `BUY-02`. Shop-public fields only (`name`, `shopDetails`, `location`, `contactInfo`). |
| Distance | computed on-device from profile / GPS vs merchant `location` |
| Empty "Ask your supplier" | same query, zero rows |

| Control | On click |
| ------- | -------- |
| Shop radio | `local` |
| Finish | `Fn updateUserProfile` `{ selectedMerchantId, villageId }` then `nav BUY-04` |
| Skip | `nav BUY-04` — home shows `BUY-03.1` until both fields are set |

```
┌──────────────────────────────────┐
│  ←  Your merchant      🔊  [👤]    │
├──────────────────────────────────┤
│  Step 3 of 3 · Pickup shop       │
│  ██████████████████████████████  │
├──────────────────────────────────┤
│  ┌────────────────────────────┐  │
│  │ 🏪 Sri Lakshmi Stores      │   │
│  │    Karavadi · 1.2 km   (•) │  │
│  └────────────────────────────┘  │
│  ┌────────────────────────────┐  │
│  │ 🏪 Village Mart            │   │
│  │    Karavadi · 2.0 km   ( ) │  │
│  └────────────────────────────┘  │
│                                  │
│  [ Skip ]        [ Finish ]      │
└──────────────────────────────────┘
```

**Actions:** Finish → `updateUserProfile` then `BUY-04`. Cascading change of Country/State/District resets Hub/Village. No merchant in village → empty state plus "Ask your supplier".

### BUY-03.1 Incomplete setup re-entry

Skipping any setup step previously left the buyer with no way back. Home now carries a dismissible completion card, and the same entry point is mirrored on the profile screen.

**Data** — same reads as `BUY-04`. Card visibility is `local` (session hide) plus `FS get /UserProfiles/{uid}` (`villageId` / `selectedMerchantId` missing).

| Control | On click |
| ------- | -------- |
| Finish setup | `nav BUY-02` at the first incomplete step |
| Hide | `local` — session only |

```
┌──────────────────────────────────┐
│  Home                  🔔  [👤]    │
├──────────────────────────────────┤
│  ┌────────────────────────────┐  │
│  │ ⚠ Finish setting up        │  │
│  │ Add your village and       │  │
│  │ pickup shop to see gigs.   │  │
│  │ [ Finish setup ]  [ Hide ] │  │
│  └────────────────────────────┘  │
├──────────────────────────────────┤
```

**Actions:** Finish setup → re-enters `BUY-02` at the first incomplete step. Hide suppresses the card for the session only; it returns on next launch until `villageId` and `selectedMerchantId` are both set.

---

## Home and discovery

### BUY-04 Buyer home — upcoming gigs

Lands here after Finish setup (or Skip), and on every later Home tab open. Geo and merchant prefill from setup when present.

**Data**

| Shown | Source |
| ----- | ------ |
| Greeting name | `FS get /UserProfiles/{uid}` → `name` |
| Location chip | same get → village name from `/Villages/{villageId}` (static catalog TTL) |
| Pickup shop line | `FS get /UserProfiles/{selectedMerchantId}` → `name`, `shopDetails` |
| Gig cards | `FS query Gigs` where `villageIds` array-contains `profile.villageId` and `status` in `created`, `started`. 10-min TTL. |
| Card item count / title | `FS get /Pamphlets/{gig.pamphletId}` for each visible card (page of 20) |
| Card pickup shop | `FS get /UserProfiles/{merchantId}` for the gig merchant whose `villageId` matches the buyer |
| ETA | `Gig.arrivingTimes[villageId]` |

| Control | On click |
| ------- | -------- |
| Location Apply | `Fn updateUserProfile` `{ villageId }` then re-run the gig query. Clears cart (`local`) if it holds another village's gig. |
| Pickup `[>]` | `nav BUY-03` |
| Gig card | `nav BUY-05` with `gigId` — no extra call |
| Pull to refresh | re-run Shown reads, bypass TTL |

The five stacked geo pickers of the previous revision collapsed into a single location chip. Tapping the chip opens the cascading picker sheet, which keeps the full Country → State → District → Hub → Village cascade without spending the whole first screen on it.

```
┌──────────────────────────────────┐
│  Home              🔊  🔔  [👤]     │
├──────────────────────────────────┤
│  Good morning, Anil              │
│  [ 📍 Karavadi · Prakasam C  ▾]   │
│  Pickup: Sri Lakshmi Stores [>]  │
├──────────────────────────────────┤
│  Upcoming gigs via Karavadi      │
│  ┌────────────────────────────┐  │
│  │ Ongole → Markapur          │  │
│  │ 21-08-2026 · ETA 10:30 AM  │  │
│  │ Pickup: Sri Lakshmi Stores │  │
│  │ 24 items · Harvest special │  │
│  └────────────────────────────┘  │
│  ┌────────────────────────────┐  │
│  │ Podili dairy run           │  │
│  │ 22-08-2026 · ETA 09:00 AM  │  │
│  │ Pickup: Sri Lakshmi Stores │  │
│  │ 11 items                   │  │
│  └────────────────────────────┘  │
├──────────────────────────────────┤
│  [ Home ]   [ Cart ]  [ Orders ] │
└──────────────────────────────────┘
```

**Location picker sheet**

```
┌──────────────────────────────────┐
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│  Change location            [ X ]│
│                                  │
│  Country        [ India      ▾]  │
│  State          [ Andhra Pr. ▾]  │
│  District       [ Prakasam   ▾]  │
│  Hub            [ Prakasam C ▾]  │
│  Village        [ Karavadi   ▾]  │
│                                  │
│  Changing village clears the     │
│  cart if it holds another        │
│  village's gig items.            │
│                                  │
│  [ Apply ]                       │
└──────────────────────────────────┘
```

**Actions**


| Control                | Result                                          |
| ---------------------- | ----------------------------------------------- |
| Location chip          | Cascading picker sheet; active catalog only. Apply calls `updateUserProfile` with the new `villageId` before the gig list refreshes — `placeOrder` requires `buyer.villageId === request.village`. |
| Pickup shop `[>]`      | Re-opens the merchant picker from `BUY-03`      |
| Gig card               | `BUY-05` gig detail                             |
| Pull to refresh        | Re-syncs static geography plus gigs             |
| Cart tab               | `BUY-07`                                        |
| Orders tab             | `BUY-11`                                        |
| Bell `🔔`              | Notification center (`SHR-08`)                  |
| Voice `🔊`             | Reads the screen aloud in the chosen language   |

### BUY-04.1 Home — no gigs in village

**Data** — same reads as `BUY-04`. This is the empty state of that query, not a second endpoint.

| Control | On click |
| ------- | -------- |
| Pull to refresh | re-run `BUY-04` gig query |
| Call supplier | `tel:` from a gig supplier if any cached gig exists; otherwise `nav SHR-14` |

```
┌──────────────────────────────────┐
│  Home              🔊  🔔  [👤]     │
├──────────────────────────────────┤
│  Good morning, Anil              │
│  [ 📍 Karavadi · Prakasam C  ▾]   │
│  Pickup: Sri Lakshmi Stores [>]  │
├──────────────────────────────────┤
│                                  │
│             [ 🚚 ]                │
│                                  │
│    No gigs for Karavadi yet      │
│   Ask your supplier for the      │
│   next delivery day.             │
│                                  │
│      [ Pull to refresh ]         │
│      [ 📞 Call supplier ]         │
│                                  │
├──────────────────────────────────┤
│  [ Home ]   [ Cart ]  [ Orders ] │
└──────────────────────────────────┘
```

### BUY-04.2 Home — offline / GPS denied

Both banners can stack. Neither blocks the screen: the location chip still works, so a buyer with GPS denied picks their village by hand.

**Data** — same as `BUY-04`, served from `cache` past TTL with `[cached]` on the card. Location Apply still calls `Fn updateUserProfile` and is disabled offline with the reason stated.

```
┌──────────────────────────────────┐
│  Home         (2)🔄  🔔   [👤]      │
├──────────────────────────────────┤
│  ⚠ Offline: data may be outdated │
│  ⚠ Location off — pick village   │
├──────────────────────────────────┤
│  Good morning, Anil              │
│  [ 📍 Karavadi · Prakasam C  ▾]   │
├──────────────────────────────────┤
│  Upcoming gigs via Karavadi      │
│  ┌────────────────────────────┐  │
│  │ Ongole → Markapur  [cached]│  │
│  │ 21-08-2026 · ETA 10:30 AM  │  │
│  └────────────────────────────┘  │
├──────────────────────────────────┤
│  [ Home ]   [ Cart ]  [ Orders ] │
└──────────────────────────────────┘
```

`(2)🔄` is the queued-write indicator; tapping it opens the offline and sync centre (`SHR-12`) in [Shared.md](Shared.md).

### BUY-05 Gig detail

Previously the gig card jumped straight to the pamphlet, so the buyer never saw the ETA, the driver, or the rest of the route. The pamphlet is now one step further in.

**Data**

| Shown | Source |
| ----- | ------ |
| Route title, date, status, stops, ETAs | `FS get /Gigs/{gigId}` |
| Pickup shop + call | `FS get /UserProfiles/{merchantId}` for the stop matching `profile.villageId` |
| Driver name / vehicle | `FS get /UserProfiles/{gig.vehicleId}` → `name`, `vehicleNumber`, `vehicleType` |
| Suspended banner | `Gig.status == "suspended"` on the same get |

| Control | On click |
| ------- | -------- |
| Call shop | `tel:` merchant `contactInfo` |
| View pamphlet | `nav BUY-05.1` — disabled when `status == "suspended"` |
| Back | `nav BUY-04` |

```
┌──────────────────────────────────┐
│  ←  Gig detail     🔊  🔔  [👤]     │
├──────────────────────────────────┤
│  Ongole → Markapur               │
│  21-08-2026 · created            │
├──────────────────────────────────┤
│  Your stop                       │
│  Karavadi · ETA 10:30 AM         │
│                                  │
│  Pickup shop                     │
│  🏪 Sri Lakshmi Stores            │
│     Karavadi · 1.2 km            │
│                   [ 📞 Call ]     │
│                                  │
│  Driver                          │
│  Hari · Tata Ace                 │
│  AP-27-TX-1234                   │
│                                  │
│  Route stops                     │
│  1  Karavadi      10:30 AM       │
│  2  Koppolu       11:15 AM       │
│  3  Madhavaram    12:40 PM       │
│                                  │
│  [  View pamphlet  ]             │
└──────────────────────────────────┘
```

**Suspended gig banner**

```
│  ⚠ Gig suspended — vehicle issue │
│    Your supplier is reassigning  │
│    a driver. Orders are on hold. │
```

Shown when `Gig.status` is `suspended`. Add to cart and checkout are disabled while suspended.

### BUY-05.1 Pamphlet catalog — search and filter

A pamphlet can promote dozens of SKUs, so the flat list gained search, category chips and sort. Product images come from `Product.imageUrl` and are served stale-while-revalidate per the PWA strategy.

**Data**

| Shown | Source |
| ----- | ------ |
| Title, item count, slogan prices, pamphlet stock | `FS get /Pamphlets/{gig.pamphletId}` |
| Image, category, HSN, warehouse stock cap | `FS get /Products/{productId}` per visible row (page of 20). Stale-while-revalidate for `imageUrl`. |
| Search / chips / sort | `local` filter of the pamphlet lines already loaded |
| Add qty | `local` cart (IndexedDB). Cap is `min(Product.stock, remaining stepper)`. |

| Control | On click |
| ------- | -------- |
| Product card (not stepper) | `nav BUY-06` with `productId` |
| `+` / `−` / Add | `local` cart write. No Function. Out of stock disables Add. |
| Search / chips / sort | `local` |

```
┌──────────────────────────────────┐
│  ←  Harvest special    🔊  [👤]    │
│     21-08-2026 · 24 items        │
├──────────────────────────────────┤
│  ┌────────────────────────────┐  │
│  │ 🔍 Search products         │   │
│  └────────────────────────────┘  │
│  [ All ][ Staples ][ Oils ]  >   │
│  Sort [ Price low to high    ▾]  │
├──────────────────────────────────┤
│  ┌────────────────────────────┐  │
│  │ [img]  Rice 25kg           │  │
│  │        ₹1,250 → ₹1,100     │  │
│  │        Stock 40 · bag      │  │
│  │        [-]  1  [+]  [ Add ]│  │
│  └────────────────────────────┘  │
│  ┌────────────────────────────┐  │
│  │ [img]  Cooking oil 1L      │  │
│  │        ₹180                │  │
│  │        Stock 12 · bottle   │  │
│  │        [-]  0  [+]  [ Add ]│  │
│  └────────────────────────────┘  │
│  ┌────────────────────────────┐  │
│  │ [img]  Toor dal 5kg        │  │
│  │        ₹640                │  │
│  │        ✖ Out of stock      │  │
│  │        [ Add ]  (disabled) │  │
│  └────────────────────────────┘  │
├──────────────────────────────────┤
│  [ Home ]   [ Cart 2 ] [ Orders] │
└──────────────────────────────────┘
```

**Actions:** `+` / `-` adjust quantity, capped at `Product.stock`. Add to cart persists to local storage so a refresh does not lose it. Out of stock disables Add. The cart badge updates immediately. Search filters on name and category. No search results → empty state with a Clear search action.

### BUY-06 Product detail sheet

**Data**

| Shown | Source |
| ----- | ------ |
| Name, pamphlet price, slogan | `FS get /Pamphlets/{gig.pamphletId}` → matching `promotedProducts[]` |
| Image, unit, HSN, category, warehouse stock | `FS get /Products/{productId}` |
| Sold by | `FS get /UserProfiles/{gig.supplierId}` → `name` |

| Control | On click |
| ------- | -------- |
| `+` / `−` / Add to cart | `local` cart. Same cap as `BUY-05.1`. |
| Close | dismiss sheet |

```
┌──────────────────────────────────┐
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│  Rice 25kg                  [ X ]│
├──────────────────────────────────┤
│  ┌────────────────────────────┐  │
│  │                            │  │
│  │        [ product img ]     │  │
│  │                            │  │
│  └────────────────────────────┘  │
│                                  │
│  ₹1,250 → ₹1,100  (12% off)      │
│  Harvest special price           │
│                                  │
│  Unit          bag (25 kg)       │
│  In stock      40 bag            │
│  Category      Staples           │
│  HSN           1006              │
│                                  │
│  Sold by Kranthi Kumar           │
│                                  │
│  [-]   1   [+]    [ Add to cart ]│
└──────────────────────────────────┘
```

HSN and unit are shown here because they appear on the tax invoice; a buyer questioning a line on their invoice can trace it back to the product.

---

## Cart and checkout

### BUY-07 Cart

The previous cart was read-only, so a buyer who over-ordered had to go back to the pamphlet. Quantity steppers and per-line removal now live in the cart itself.

**Data**

| Shown | Source |
| ----- | ------ |
| Line items, qty, pamphlet prices | `local` cart |
| Gig title, ETA, pickup | `FS get /Gigs/{cart.gigId}` + `FS get /UserProfiles/{merchantId}` |
| Live stock for steppers | `FS get /Products/{productId}` per line (one-shot on open — this is also the first reconciliation pass) |
| Discount row | `FS get /Discounts/{code}` after Apply; until then `local` |
| GST / total | `local` estimate only. The figure that settles is returned by `placeOrder` on `BUY-08`. |

| Control | On click |
| ------- | -------- |
| `+` / `−` / Remove | `local` cart. Qty 0 prompts remove. |
| Apply | `FS get /Discounts/{code}` + client rule check. Invalid → inline `INVALID_DISCOUNT`. Not a Function. |
| Review order | re-run stock gets; if any line moved → `nav BUY-07.2`; else `nav BUY-08` |

```
┌──────────────────────────────────┐
│  Cart              🔊  🔔  [👤]     │
├──────────────────────────────────┤
│  Gig: Ongole → Markapur          │
│  Pickup: Sri Lakshmi Stores      │
│  Arrives 21-08-2026 · 10:30 AM   │
├──────────────────────────────────┤
│  ┌────────────────────────────┐  │
│  │ Rice 25kg                  │  │
│  │ ₹1,100 × 1      ₹1,100     │  │
│  │ [-] 1 [+]        [ Remove ]│  │
│  └────────────────────────────┘  │
│  ┌────────────────────────────┐  │
│  │ Cooking oil 1L             │  │
│  │ ₹180 × 2          ₹360     │  │
│  │ [-] 2 [+]        [ Remove ]│  │
│  └────────────────────────────┘  │
├──────────────────────────────────┤
│  Discount code                   │
│  ┌──────────────┐ [ Apply ]      │
│  │ HARVEST10    │                │
│  └──────────────┘                │
│  ✔ HARVEST10 applied  −₹146      │
├──────────────────────────────────┤
│  Subtotal              ₹1,314    │
│  CGST 9%                 ₹118    │
│  SGST 9%                 ₹118    │
│  Total                 ₹1,550    │
│                                  │
│  [  Review order  ]              │
├──────────────────────────────────┤
│  [ Home ]   [ Cart ]  [ Orders ] │
└──────────────────────────────────┘
```

GST is shown split into CGST and SGST to match the invoice the buyer will receive, rather than as a single 18% line.

**Actions:** Apply resolves a supplier `Discount` code, not a platform `OfferDiscountCode`. Invalid or ineligible code → inline `INVALID_DISCOUNT` message under the field. Stepping quantity to zero prompts removal. Review order → `BUY-08`.

### BUY-07.1 Cart — empty

**Data** — `local` cart is empty. No Firestore read required.

| Control | On click |
| ------- | -------- |
| Go to Home | `nav BUY-04` |

```
┌──────────────────────────────────┐
│  Cart              🔊  🔔  [👤]     │
├──────────────────────────────────┤
│                                  │
│             [ 🛒 ]                │
│                                  │
│      Your cart is empty          │
│   Browse a gig pamphlet to       │
│   add items.                     │
│                                  │
│      [ Go to Home ]              │
│                                  │
├──────────────────────────────────┤
│  [ Home ]   [ Cart ]  [ Orders ] │
└──────────────────────────────────┘
```

### BUY-07.2 Cart — stock reconciliation

The cart lives in local storage and can sit there for hours while stock moves. Reconciliation runs when the cart opens and again immediately before `placeOrder`, so the buyer is never surprised by an `OUT_OF_STOCK` failure at the payment step. `placeOrder` also refuses `NOT_SERVICEABLE` when a line is not on this gig's pamphlet or the gig does not stop in the buyer's village — the honest cart never hits that; a stale or crafted payload does.

**Data**

| Shown | Source |
| ----- | ------ |
| Per-line wanted vs left | `local` cart qty vs `FS get /Products/{productId}.stock` and pamphlet membership via `FS get /Pamphlets/{gig.pamphletId}` |

| Control | On click |
| ------- | -------- |
| Update cart | `local` — clamp / drop lines |
| Cancel | dismiss sheet; Review stays blocked |

```
┌──────────────────────────────────┐
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│  Stock changed                   │
│                                  │
│  Some items are no longer        │
│  available in full:              │
│                                  │
│  Rice 25kg                       │
│  You wanted 3 · only 1 left      │
│                                  │
│  Toor dal 5kg                    │
│  Now out of stock                │
│                                  │
│  [ Update cart ]  [ Cancel ]     │
└──────────────────────────────────┘
```

**Actions:** Update cart clamps each line to available stock and drops out-of-stock lines, then recomputes totals. Cancel returns to the cart untouched, leaving checkout blocked until the buyer resolves it.

### BUY-07.3 Cart — gig conflict

A cart belongs to exactly one gig, because `placeOrder` takes a single `gigId`. Adding an item from a different gig therefore has to be an explicit decision.

**Data** — `local` cart `gigId` vs the pamphlet being browsed. No Function.

| Control | On click |
| ------- | -------- |
| Keep current | dismiss; do not add |
| Start new | `local` — replace cart with the new gig's line |

```
┌──────────────────────────────────┐
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│  Start a new cart?               │
│                                  │
│  Your cart holds items from      │
│  Ongole → Markapur (21-08).      │
│                                  │
│  Each order belongs to one gig.  │
│  Adding this item clears the     │
│  current cart.                   │
│                                  │
│  [ Keep current ] [ Start new ]  │
└──────────────────────────────────┘
```

### BUY-08 Order review and payment method

**Data**

| Shown | Source |
| ----- | ------ |
| Shop, collect-on, items, discount | `local` cart + `FS get /Gigs/{gigId}` + `FS get /UserProfiles/{merchantId}` + `FS get /UserProfiles/{uid}` |
| Totals on this screen | `local` estimate. Authoritative totals arrive in the `placeOrder` response. |
| Payment radios | `local` |

| Control | On click |
| ------- | -------- |
| Edit | `nav BUY-07` |
| Pay (UPI) | `Fn placeOrder` `{ paymentMode: "online" }` then `Fn createPaymentIntent` as returned, then `nav BUY-09`. Blocked offline. |
| Place order (cash confirm) | `Fn placeOrder` `{ paymentMode: "cash_on_pickup" }` then `nav BUY-10`. Blocked offline. |
| `NOT_SERVICEABLE` | `nav BUY-05.1` |
| `OUT_OF_STOCK` | `nav BUY-07.2` |

```
┌──────────────────────────────────┐
│  ←  Review and pay               │
├──────────────────────────────────┤
│  Pickup shop                     │
│  🏪 Sri Lakshmi Stores            │
│     Karavadi · 1.2 km            │
│                                  │
│  Collect on                      │
│  21-08-2026 · around 10:30 AM    │
│                                  │
│  Deliver to (invoice)            │
│  Anil Kumar                      │
│  Door No 3-45, Karavadi          │
├──────────────────────────────────┤
│  Items (2)             [ Edit ]  │
│  Rice 25kg × 1         ₹1,100    │
│  Cooking oil 1L × 2      ₹360    │
│  Discount HARVEST10     −₹146    │
├──────────────────────────────────┤
│  Subtotal              ₹1,314    │
│  CGST 9%                 ₹118    │
│  SGST 9%                 ₹118    │
│  Total                 ₹1,550    │
├──────────────────────────────────┤
│  How do you want to pay?         │
│  (•) Pay now by UPI              │
│      GPay / PhonePe / Paytm      │
│  ( ) Cash when you collect       │
│      Bring ₹1,550.52 to the shop │
│                                  │
│  [  Pay ₹1,550  ]                │
│                                  │
│  15s timeout · retry on failure  │
└──────────────────────────────────┘
```

**Cash on pickup confirm**

```
┌──────────────────────────────────┐
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│  Pay cash at pickup?             │
│                                  │
│  Bring ₹1,550.52 in cash to Sri  │
│  Lakshmi Stores when you         │
│  collect. Bring the exact        │
│  amount — the shop cannot take   │
│  part payment.                   │
│                                  │
│  Your order stays unpaid until   │
│  then.                           │
│                                  │
│  [ Cancel ]   [ Place order ]    │
└──────────────────────────────────┘
```

**Actions:** Pay calls `placeOrder` with the chosen `paymentMode`. The function first proves the gig is `"created"` or `"started"`, that `village` is a stop on that gig and equals the buyer's `villageId`, that the pickup merchant is on the gig in that village, and that every `productId` is on that gig's pamphlet; then it reserves warehouse `Product.stock` and prices from pamphlet `discountedPrice`. `"online"` reserves stock, computes GST, mints the invoice number and the pickup code, and opens a `PaymentIntent` through `createPaymentIntent`; `processPayment` then confirms that intent against the gateway, so the figure that settles is the server's and not this screen's. `"cash_on_pickup"` opens no intent, leaves `paymentStatus` at `"pending"`, and makes the order a cash-custody source: the full `totalPrice` is collected at the counter and nothing less is accepted. Both paths need a connection and are disabled offline, because an order needs a server-priced total and a server-issued pickup code before anyone hands anything over. `NOT_SERVICEABLE` returns the buyer to `BUY-05.1`. Edit returns to `BUY-07`.

### BUY-09 Payment processing, failure and pending

**Data**

| Shown | Source |
| ----- | ------ |
| Amount, shop, invoice no. | `FS get /Orders/{orderId}` |
| Payment reference / status | `FS listen /PaymentIntents/{id}` and child `PaymentTransactions` while this screen is open (unbind on leave). One of the two allowed listeners. |
| Processing / pending / failed copy | derived from those documents — never from a client timer |

| Control | On click |
| ------- | -------- |
| (auto) | `Fn processPayment` after `placeOrder` returned `paymentIntentId` |
| Try UPI again | `Fn createPaymentIntent` (reuse) then `Fn processPayment`. Hidden while any transaction is `pending`. |
| Switch to cash | `Fn cancelOrder` then `Fn placeOrder` `{ paymentMode: "cash_on_pickup" }` |
| Cancel order | `Fn cancelOrder` |

**Processing** — back navigation is blocked while the gateway call is in flight.

```
┌──────────────────────────────────┐
│                                  │
│                                  │
│             [ ⏳ ]                │
│                                  │
│      Talking to your UPI app     │
│                                  │
│      Do not close this screen    │
│                                  │
│      ▓▓▓▓▓▓▓░░░░░░░░░  8s        │
│                                  │
│                                  │
└──────────────────────────────────┘
```

**Failure**

```
┌──────────────────────────────────┐
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│  Payment failed                  │
│                                  │
│  ₹1,550 was not charged.         │
│  Reason: UPI request declined    │
│                                  │
│  Payment ref  PT-2408210442      │
│  Attempt 1 · 21-08 10:31 AM      │
│                                  │
│  Your order is held for 15 min   │
│  and your items are reserved.    │
│                                  │
│  [ Try UPI again ]               │
│  [ Switch to cash on pickup ]    │
│  [ Cancel order ]                │
└──────────────────────────────────┘
```

**Pending / awaiting webhook** — the UPI app returned but the gateway has not confirmed. The order exists and stock is held; the buyer is not asked to pay twice.

```
┌──────────────────────────────────┐
│  ←  Payment pending              │
├──────────────────────────────────┤
│  ⚠ Confirming your payment       │
│                                  │
│  INV-2408210001                  │
│  ₹1,550 · UPI                    │
│  Payment ref  PT-2408210443      │
│                                  │
│  Your bank has not confirmed     │
│  yet. This usually takes under   │
│  two minutes. We will notify     │
│  you when it clears.             │
│                                  │
│  Until then the order counts as  │
│  unpaid.                         │
│                                  │
│  Do not pay again. If money left │
│  your account, it comes back on  │
│  its own or the order clears.    │
│                                  │
│  [ Check again ]  [ View order ] │
│  [ Something's wrong ]           │
└──────────────────────────────────┘
```

**Pending too long** — after the configured escalation window the screen stops implying that waiting will fix it.

```
│  ⚠ Still not confirmed           │
│                                  │
│  Payment ref  PT-2408210443      │
│  ₹1,550 · started 10:31 AM       │
│                                  │
│  This is taking longer than it   │
│  should. We've asked support to  │
│  check it. Ticket SUP-8841.      │
│                                  │
│  Don't pay again. If money left  │
│  your account, you'll get it     │
│  back or the order will clear —  │
│  not both.                       │
│                                  │
│  [ Switch to cash on pickup ]    │
│  [ 📞 Call support ]              │
```

**Attempt history** — visible from the order detail once more than one attempt exists.

```
│  Payment attempts                │
│  PT-2408210442  ✖ declined       │
│    10:31 AM · not charged        │
│  PT-2408210443  ⏳ confirming     │
│    10:34 AM                      │
│  PT-2408210451  ✔ paid           │
│    10:38 AM · ref pay_Nq82kd     │
```

**Actions:** Try UPI again opens a new `PaymentTransaction` against the same `PaymentIntent` through `createPaymentIntent`, which returns `reused: true` with the existing intent rather than re-pricing the order, and confirms it with `processPayment`. The amount is never sent from this screen: `processPayment` settles `PaymentIntent.amount`, and a gateway figure that disagrees with it fails as `AMOUNT_MISMATCH` rather than being reconciled. A `pending` transaction is not a payment — `paymentStatus` stays `"pending"`, the stock stays reserved, and the buyer is not asked for money twice. A `failed` transaction is terminal and is never retried in place; the retry opens a new one. Switch to cash on pickup calls `cancelOrder` on the unpaid order and re-runs `placeOrder` with `paymentMode: "cash_on_pickup"`, which mints a fresh invoice number and a fresh pickup code. Cancel order calls `cancelOrder`, which restores stock. The pending state resolves on the Razorpay `payment.captured` webhook.

**The payment reference is on every one of these states.** `PT-2408210443` is the platform's `PaymentTransaction` id, not the gateway's, and it is the only identifier a buyer can be expected to read out. A buyer whose money left their account and whose order still says unpaid has exactly one useful thing to say on a phone call, and "I paid at about half ten" is not it. The gateway reference appears only once a payment succeeds, alongside the platform reference, since it is what a bank will recognise.

**Retry is prevented, not merely discouraged.** While a transaction is `pending`, `[ Try UPI again ]` is absent rather than disabled and the order's pay action across every other screen is replaced by a link to this one. A duplicate payment in this platform is not a rounding error: it is a rural buyer's week of income sitting in a suspense account until somebody notices. Where one does occur, the second transaction is detected as a duplicate against the same intent, refunded automatically with a `duplicate_payment` reason code, and surfaced on `BUY-12.3` without the buyer having to ask.

**Distinguishing gateway-pending from cash due.** Both leave `paymentStatus` at `"pending"`, and they are opposite situations: one means money may already have left and the buyer must not pay again, the other means the buyer must bring cash to the counter. No buyer screen ever renders the raw status. A cash order reads "Bring ₹1,550.52 to the shop" with the amount and the shop named; a gateway-pending order reads "Confirming your payment" with the payment reference and an explicit instruction not to pay again.

### BUY-10 Order placed — pickup code

`placeOrder` returns the pickup code exactly once, in its response, and writes it to `/Orders/{orderId}/private/pickup`, which only the buyer and Support can read. The driver and the merchant see `pickupCodeIssuedAt` and nothing else, because a code the party being verified can read verifies nothing. It appears here, on `BUY-10.1`, on the order detail, and in the order-placed notification.

**Data**

| Shown | Source |
| ----- | ------ |
| Invoice no., shop, ETA, paid / cash line | `placeOrder` response, then `FS get /Orders/{orderId}` |
| Pickup code digits | `placeOrder` response `pickupCode`, persisted to `local` / cache. Later opens: `FS get /Orders/{orderId}/private/pickup`. Never read from the Order document. |

| Control | On click |
| ------- | -------- |
| Show pickup code | `nav BUY-10.1` |
| View order | `nav BUY-12` |
| Home | `nav BUY-04` |

```
┌──────────────────────────────────┐
│                                  │
│           ✔ Order placed         │
│           INV-2408210001         │
│                                  │
│  ┌────────────────────────────┐  │
│  │  Your pickup code          │  │
│  │                            │  │
│  │      4 7 2 9 1 6           │  │
│  │                            │  │
│  │  Read it out at the shop   │  │
│  └────────────────────────────┘  │
│                                  │
│  Pickup: Sri Lakshmi Stores      │
│  Gig ETA: 21-08 · 10:30 AM       │
│  Paid ₹1,550 · UPI               │
│                                  │
│  [ Show pickup code ]            │
│  [ View order ]   [ Home ]       │
└──────────────────────────────────┘
```

On a `cash_on_pickup` order the paid line reads `Bring ₹1,550.52 in cash` instead, taken from `Order.totalPrice`.

The code is deliberately large and digit-spaced so it can be read aloud or shown on a cracked screen. The voice assistant reads it out when audio UI is enabled. Show pickup code opens `BUY-10.1`, which keeps the code and the cash figure readable with no connection and carries the resend.

### BUY-10.1 Pickup code

The buyer's half of the handover pattern in [Patterns.md](Patterns.md) section 7. The code is read out, never handed over: the merchant or driver types it into the shared entry sheet in section 7.2, and neither of them can read it from the order. That makes this screen the only place the buyer can get at their own code, so it has to work standing inside a shop with no signal.

**Data**

| Shown | Source |
| ----- | ------ |
| Invoice, shop, ETA, cash / paid card | `FS get /Orders/{orderId}` (cache-first — this screen must work offline) |
| Code digits | `FS get /Orders/{orderId}/private/pickup` — buyer-only. Cached with the order. |
| Send budget | `HandoverCodeRecord.sendCount` on that private get |

| Control | On click |
| ------- | -------- |
| Read aloud | `local` speech |
| Send (SMS / voice) | `Fn resendHandoverCode` `{ orderId, channel }`. Disabled offline. |
| Code not arriving? | `nav BUY-10.2` |

```
┌──────────────────────────────────┐
│  ←  Pickup code       🔊    [👤]   │
├──────────────────────────────────┤
│  INV-2408210001                  │
│  Collect at Sri Lakshmi Stores   │
│  Karavadi · 21-08 · 10:30 AM     │
├──────────────────────────────────┤
│  ┌────────────────────────────┐  │
│  │  Your pickup code          │  │
│  │                            │  │
│  │      4 7 2 9 1 6           │  │
│  │                            │  │
│  │  Read it out only to the   │  │
│  │  person handing over your  │  │
│  │  order.                    │  │
│  └────────────────────────────┘  │
│  ┌────────────────────────────┐  │
│  │  Cash to bring             │  │
│  │      ₹1,550.52             │  │
│  │  The exact amount. The     │  │
│  │  shop cannot take part     │  │
│  │  payment.                  │  │
│  └────────────────────────────┘  │
│                                  │
│  [ 🔊 Read aloud ]                │
│  [ Send the code again ]         │
│  Sent to +91 ****3210 · 1 of 3   │
│                                  │
│  Nobody else can see this code.  │
│  The shop and the driver ask you │
│  for it; they cannot read it.    │
│                                  │
│  [ Code not arriving? ]          │
└──────────────────────────────────┘
```

The cash card is drawn only when `Order.paymentMode` is `"cash_on_pickup"`, and the figure is `Order.totalPrice` to two decimals, because the person reading it is counting notes against it. A prepaid order shows the settled state in the same slot:

```
│  ┌────────────────────────────┐  │
│  │  Nothing to pay            │  │
│  │  ✔ Paid ₹1,550.52 by UPI   │  │
│  └────────────────────────────┘  │
```

**Send the code again**

```
┌──────────────────────────────────┐
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│  Send the code again      [ X ]  │
│                                  │
│  (•) Text message                │
│  ( ) Phone call that reads the   │
│      digits out twice            │
│                                  │
│  Goes to +91 ****3210 only.      │
│  2 sends left in this hour.      │
│                                  │
│  [ Cancel ]        [ Send ]      │
└──────────────────────────────────┘
```

The call-out exists for buyers who cannot read an SMS, so it is offered beside the text message rather than buried behind it. Neither choice changes the digits: a resent code is the same code, because the buyer has usually already written it down.

**Offline**

```
│  ⚠ Offline — your code is saved  │
│    on this phone                 │
│                                  │
│  [ Send the code again ]         │
│  (disabled) Needs an internet    │
│  connection                      │
```

**Actions**


| Control                 | Result                                                                       |
| ----------------------- | ---------------------------------------------------------------------------- |
| Voice `🔊 Read aloud`   | Speaks the shop, the digits one at a time, and the cash amount                |
| Send the code again     | `resendHandoverCode` with `orderId` and `channel: "sms"` or `"voice"`        |
| Code not arriving?      | `BUY-10.2`                                                                   |
| Back                    | Returns to `BUY-10` or `BUY-12`, whichever opened this screen                 |

**States.** Loading renders the order header from cache and holds a skeleton in the shape of the code card while the private subdocument reads. Offline is the state this screen exists for: the code and the cash figure are cached with the order, stay readable, and the resend is disabled with its reason rather than hidden. Stale does not apply — a pickup code does not drift, and `resendHandoverCode` never rotates it. Empty does not apply. Queued does not apply, since nothing here writes business state. Error on the resend is `RESEND_LIMIT_EXCEEDED`, which routes to `BUY-10.2`; a buyer opening someone else's order gets the not-allowed page from [Patterns.md](Patterns.md) section 2, not an empty code card.

### BUY-10.2 Pickup code problems

Three things go wrong with a code that has to reach a phone which may not be the buyer's: the sends run out, the number on file belongs to somebody else, and the person at the counter mistypes it five times. None of them are the buyer's fault, and none of them are fixed by asking the buyer to try again.

**Data** — same documents as `BUY-10.1`. Countdown from `nextResendAvailableAt` on the private record. Reason radios are `local`.

| Control | On click |
| ------- | -------- |
| Send the code again | `Fn resendHandoverCode` — disabled until `nextResendAvailableAt` |
| Call shop | `tel:` merchant `contactInfo` |
| Contact support | `nav SHR-14` |

**Sends used up** — `RESEND_LIMIT_EXCEEDED`.

```
┌──────────────────────────────────┐
│  ←  Code not arriving  🔊    [👤]  │
├──────────────────────────────────┤
│  ⚠ You can send again after      │
│    11:20 AM                      │
├──────────────────────────────────┤
│  INV-2408210001                  │
│  Sent 3 times to +91 ****3210    │
│  Last sent 10:20 AM              │
│                                  │
│  [ Send the code again ]         │
│  (disabled) · 22 min to wait     │
│                                  │
│  Your code has not changed. It   │
│  is still on your phone:         │
│                                  │
│         4 7 2 9 1 6              │
│                                  │
│  [ 🔊 Read aloud ]                │
│  [ 📞 Call Sri Lakshmi Stores ]   │
└──────────────────────────────────┘
```

The countdown is the whole message. A buyer standing at the counter does not need the SMS at all, which is why the digits are repeated here instead of sending them back to `BUY-10.1` to find them.

**Wrong number, or a phone the buyer does not carry**

```
┌──────────────────────────────────┐
│  ←  Code not arriving  🔊    [👤]  │
├──────────────────────────────────┤
│  Messages go to +91 ****3210     │
│                                  │
│  ( ) That is not my number       │
│  ( ) It is a family phone I do   │
│      not carry                   │
│                                  │
│  You do not need the message.    │
│  Your code is on this screen:    │
│                                  │
│         4 7 2 9 1 6              │
│                                  │
│  If you cannot be at the shop    │
│  yourself, ask Sri Lakshmi       │
│  Stores to let the driver finish │
│  another way. Your supplier has  │
│  to allow that; you cannot.      │
│                                  │
│  [ 📞 Call Sri Lakshmi Stores ]   │
│  [ 📞 Contact support ]           │
└──────────────────────────────────┘
```

The screen deliberately stops short of offering to fix the number. The registered phone is the one every code, every notification and every counter-signature check is measured against, so it is changed under support, and in the meantime the route that actually unblocks the handover is the fallback list in [Patterns.md](Patterns.md) section 7.4 — which the driver opens and the supplier authorises. Telling the buyer to edit a field would be telling them to solve it on the wrong screen.

**Five wrong tries at the counter** — `CODE_ATTEMPTS_EXCEEDED`.

```
│  ⚠ The code will not be taken    │
│    again for this order          │
│                                  │
│  Five wrong tries were entered   │
│  at the shop. Nothing is wrong   │
│  with your order.                │
│                                  │
│  The shop can still hand it over │
│  with a photo, or with your      │
│  supplier's approval.            │
│                                  │
│  [ 📞 Call Sri Lakshmi Stores ]   │
```

**Actions**


| Control                       | Result                                                                    |
| ----------------------------- | ------------------------------------------------------------------------- |
| Send the code again           | `resendHandoverCode`; disabled until `nextResendAvailableAt`               |
| Reason radios                 | Local only; they choose which help text and which call target is shown     |
| `📞 Call Sri Lakshmi Stores`  | Dials the merchant `contactInfo`                                          |
| `📞 Contact support`          | Opens the support contact route in [Shared.md](Shared.md)                  |

**States.** This screen is itself the error state of `BUY-10.1`, so error is drawn above in all three shapes. Loading, empty and stale do not apply: the countdown, the masked number and the code are all already on the device. Offline keeps every word readable and disables the resend with "Needs an internet connection", since the digits — the only thing the buyer actually needs at the counter — are cached. Queued does not apply. Disabled follows the Patterns default: the send button stays visible and states the wait beneath it.

---

## Orders

### BUY-11 Orders list

**Data**

| Shown | Source |
| ----- | ------ |
| Order cards | `FS query Orders` where `buyer == uid`, split Active (`placed` / `reached_merchant` / `suspended`) vs Past (`delivered` / `cancelled`). Page of 20. |
| "Pick up now" | `Order.deliveryStatus` on that query |
| Code digits on an Active card | `FS get /Orders/{id}/private/pickup` for visible Active rows only — not a field on the list query |

| Control | On click |
| ------- | -------- |
| Segmented Active / Past | `local` filter of the same query |
| Search | `local` filter on invoice no. / item name |
| Order card | `nav BUY-12` |

```
┌──────────────────────────────────┐
│  Orders            🔊  🔔  [👤]     │
├──────────────────────────────────┤
│  [ Active ]  [ Past ]            │
│  ┌────────────────────────────┐  │
│  │ 🔍 Invoice no. or item     │   │
│  └────────────────────────────┘  │
├──────────────────────────────────┤
│  ┌────────────────────────────┐  │
│  │ INV-2408210001             │  │
│  │ 🚚 Reached merchant        │   │
│  │ Code 472916 · pick up now  │  │
│  │ ₹1,550 · 21-08-2026        │  │
│  └────────────────────────────┘  │
│  ┌────────────────────────────┐  │
│  │ INV-2408200087             │  │
│  │ ⚠ Suspended                │  │
│  │ ₹880 · 20-08-2026          │  │
│  └────────────────────────────┘  │
│  ┌────────────────────────────┐  │
│  │ INV-2408180044             │  │
│  │ ✔ Delivered                │  │
│  │ ₹640 · 18-08-2026          │  │
│  └────────────────────────────┘  │
├──────────────────────────────────┤
│  [ Home ]   [ Cart ]  [ Orders ] │
└──────────────────────────────────┘
```

Active covers `placed`, `reached_merchant` and `suspended`. Past covers `delivered` and `cancelled`. The suspended state comes from a vehicle breakdown or a merchant being disassociated mid-order.

### BUY-12 Order detail and live tracking

The old three-chip progress bar hid the village-level detail the gig actually publishes. Tracking now mirrors `Gig.currentVillageIndex` and `currentVillageStatus`.

**Data**

| Shown | Source |
| ----- | ------ |
| Invoice, items, totals, payment block | `FS get /Orders/{orderId}` |
| Pickup code card | `FS get /Orders/{orderId}/private/pickup` |
| Driver progress / late banner | `FS listen /Gigs/{order.gigId}` while mounted (unbind on leave) |
| Shop + call | `FS get /UserProfiles/{order.merchantId}` |
| Payment attempts list | `FS query PaymentTransactions` where `orderId` matches |

| Control | On click |
| ------- | -------- |
| Pickup code card | `nav BUY-10.1` |
| Invoice | `nav BUY-12.1` |
| Payment attempts | `local` expand |
| Reorder | `nav BUY-12.4` |
| Cancel order | `nav BUY-12.2` — only `placed` / `reached_merchant` |
| Handover receipt | `nav BUY-12.5` — delivered only |
| Call shop | `tel:` |

```
┌──────────────────────────────────┐
│  ←  INV-2408210001    🔊   [👤]    │
├──────────────────────────────────┤
│  ┌────────────────────────────┐  │
│  │  Pickup code  4 7 2 9 1 6  │  │
│  │  Tap to read it out    [>] │  │
│  └────────────────────────────┘  │
├──────────────────────────────────┤
│  Progress                        │
│  ●  Placed        21-08 09:02 AM │
│  ●  Paid          21-08 09:03 AM │
│  ●  On the way    21-08 10:05 AM │
│  ◉  At your shop  21-08 10:28 AM │
│  ○  Collected     —              │
├──────────────────────────────────┤
│  Driver progress                 │
│  Karavadi ●──◉──○ Koppolu        │
│  Stop 2 of 5 · reached           │
│                                  │
│  Pickup shop                     │
│  🏪 Sri Lakshmi Stores, Karavadi  │
│                   [ 📞 Call ]     │
├──────────────────────────────────┤
│  Items                           │
│  Rice 25kg × 1         ₹1,100    │
│  Cooking oil 1L × 2      ₹360    │
│  Discount HARVEST10     −₹146    │
│  Total ₹1,550 · Paid             │
├──────────────────────────────────┤
│  Payment                         │
│  UPI · 21-08 09:03 AM            │
│  Payment ref  PT-2408210451      │
│  Bank ref     pay_Nq82kdLm9x     │
│  [ Payment attempts (3) ]        │
├──────────────────────────────────┤
│  [ Invoice view / download ]     │
│  [ Reorder ]                     │
│  [ Cancel order ]                │
└──────────────────────────────────┘
```

**Cash on pickup variant** — the payment block states an obligation, not a reference.

```
│  Payment                         │
│  Cash when you collect           │
│  Bring ₹1,550.52 to the shop     │
│  Exact amount — the shop cannot  │
│  take part payment.              │
```

**Delayed gig variant**

```
│  ⚠ Running late                  │
│    Driver is at stop 1 of 5.     │
│    New estimate 11:40 AM.        │
```

**Actions**


| Control              | Result                                                                 |
| -------------------- | ---------------------------------------------------------------------- |
| Pickup code card     | `BUY-10.1`, where the code and the cash figure stay readable offline    |
| Invoice              | `BUY-12.1` tax invoice view                                            |
| Payment attempts     | Expands the attempt list; shown only when more than one attempt exists  |
| Reorder              | `BUY-12.4`, if a live gig carries the same items                        |
| Cancel order         | `BUY-12.2`, only while `placed` or `reached_merchant`                   |
| Call shop            | Dials the merchant `contactInfo`                                       |
| Push notifications   | Reached merchant, delivered, suspended, refund processed               |

Delivered or cancelled orders hide Cancel; a delivered order carries `[ Handover receipt ]` (`BUY-12.5`) in its place and drops the pickup code card, which has nothing left to prove. Suspended orders replace Cancel with `[ Contact support ]`.

### BUY-12.1 Invoice view / download

The full GST tax-invoice layout is a shared component and is drawn once in [Patterns.md](Patterns.md). The buyer-side wrapper adds the download and share actions.

**Data**

| Shown | Source |
| ----- | ------ |
| Every invoice field | `FS get /Orders/{orderId}` — the client never recalculates tax |

| Control | On click |
| ------- | -------- |
| Download PDF / Share | `local` render of that document (Patterns invoice). No Function. |

```
┌──────────────────────────────────┐
│  ←  Tax invoice                  │
├──────────────────────────────────┤
│  ┌────────────────────────────┐  │
│  │                            │  │
│  │   TAX INVOICE              │  │
│  │   INV-2408210001           │  │
│  │   see Patterns.md for the  │  │
│  │   full compliant layout    │  │
│  │                            │  │
│  └────────────────────────────┘  │
│                                  │
│  [ Download PDF ]   [ Share ]    │
└──────────────────────────────────┘
```

### BUY-12.2 Cancel order confirm

**Data**

| Shown | Source |
| ----- | ------ |
| Invoice no., amount, payment mode | `FS get /Orders/{orderId}` |

| Control | On click |
| ------- | -------- |
| Keep order | dismiss |
| Cancel order | `Fn cancelOrder`. If `paymentStatus == "paid"` then `Fn refundOrder`. Then `nav BUY-12.3`. `ORDER_UNALTERABLE` → toast. |

```
┌──────────────────────────────────┐
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│  Cancel this order?              │
│                                  │
│  INV-2408210001 · ₹1,550         │
│                                  │
│  You paid by UPI. A refund of    │
│  ₹1,550 will be sent to the      │
│  same account in 3 to 5 working  │
│  days.                           │
│                                  │
│  [ Keep order ]  [ Cancel order ]│
└──────────────────────────────────┘
```

**Actions:** Cancel order calls `cancelOrder`, which restores stock, then `refundOrder` when `paymentStatus` is `paid`. `refundOrder` creates a `RefundTransaction` and the matching `CreditNote` and returns the buyer to `BUY-12.3`. Unpaid or cash orders skip the refund copy. `ORDER_UNALTERABLE` → toast explaining the order has already been delivered.

A refund above the configured approval ceiling returns `requiresApproval: true`, and the confirmation reads "This refund needs a second check at our end. We've started it — you'll get a message when it's sent." The buyer's cancellation still succeeds; only the money movement waits. Telling them the refund is on its way when it is sitting in an approval queue would be the more comfortable copy and the one that produces the angry call four days later.

### BUY-12.3 Refund status

`cancelOrder` previously left a paid buyer with no visibility into their money.

**Data**

| Shown | Source |
| ----- | ------ |
| Tracker, amounts, refs | `FS get /Orders/{orderId}` + `FS get /RefundTransactions/{id}` (and credit note id on that row) |
| Expected credit date | rail field on the refund, not a client guess |

| Control | On click |
| ------- | -------- |
| View credit note | `local` render of the credit-note invoice layout (Patterns) |

```
┌──────────────────────────────────┐
│  ←  Refund status                │
├──────────────────────────────────┤
│  INV-2408210001                  │
│  Cancelled 21-08-2026            │
├──────────────────────────────────┤
│  ●  Refund requested  21-08      │
│  ◉  Sent to bank      21-08      │
│  ○  Credited          expected   │
│                       25-08      │
├──────────────────────────────────┤
│  Amount            ₹1,550        │
│  To                 UPI ····4321 │
│  The account you paid from.      │
│  Refund ref        RF-2408210077 │
│  Bank reference  rfnd_Q8xk21ppLm │
│                                  │
│  Credit note   CN-2627-0043      │
│  Cancels the tax on your bill.   │
│  [ View credit note ]            │
│                                  │
│  Refunds can take 3 to 5 working │
│  days to appear.                 │
│                                  │
│  [ 📞 Contact support ]           │
└──────────────────────────────────┘
```

**Part refund**

```
│  Refunded             ₹640.00    │
│  Still paid for     ₹910.00      │
│                                  │
│  Two items were out of stock at  │
│  the shop. You were charged for  │
│  what you collected.             │
│                                  │
│  Credit note   CN-2627-0044      │
│  for ₹640.00                     │
```

**Refund of a duplicate payment**

```
│  ⚠ You paid twice for this order │
│                                  │
│  PT-2408210443  ₹1,550  kept     │
│  PT-2408210451  ₹1,550  refunded │
│                                  │
│  We spotted the second payment   │
│  and sent it back on 21-08. You  │
│  did not have to ask.            │
│                                  │
│  Refund ref        RF-2408210079 │
```

**Actions:** read-only. `[ View credit note ]` renders the GST credit note using the invoice layout in [Patterns.md](Patterns.md). The tracker is rendered from the `RefundTransaction` status, and the expected credit date comes from the rail rather than being a fixed guess.

Every refund carries a credit note because the original tax invoice cannot be edited or withdrawn. A buyer who has been refunded still holds an invoice showing GST charged, and the credit note is the document that cancels it; without one the buyer's paperwork and the platform's GST return disagree, and the buyer is the one who cannot explain the difference. The platform reference `RF-...` sits above the gateway reference for the same reason it does on payments: it is the one a support agent can look up, and it exists from the moment the refund is raised, whereas the gateway's appears only once the provider accepts.

### BUY-12.4 Reorder

**Data**

| Shown | Source |
| ----- | ------ |
| Original lines | `FS get /Orders/{orderId}` |
| Next gig via village | same `FS query Gigs` as `BUY-04` |
| Tick / cross per line | membership in `FS get /Pamphlets/{nextGig.pamphletId}` plus `FS get /Products/{id}.stock` |

| Control | On click |
| ------- | -------- |
| Cancel | dismiss |
| Add to cart | `local` — only ticked in-stock pamphlet lines. Disabled if no upcoming gig. |

```
┌──────────────────────────────────┐
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│  Reorder these items?            │
│                                  │
│  Next gig via Karavadi           │
│  Podili dairy run · 22-08        │
│                                  │
│  ✔ Rice 25kg × 1      ₹1,100     │
│  ✔ Cooking oil 1L × 2   ₹360     │
│  ✖ Toor dal 5kg — not in this    │
│    pamphlet                      │
│                                  │
│  Prices may differ from your     │
│  last order.                     │
│                                  │
│  [ Cancel ]     [ Add to cart ]  │
└──────────────────────────────────┘
```

**Actions:** Only items present in the target gig's pamphlet and in stock are carried over. If no upcoming gig serves the buyer's village, Reorder is disabled with the reason shown inline.

### BUY-12.5 Handover receipt

Every confirmed handover writes a receipt the counterparty can reopen, per [Patterns.md](Patterns.md) section 8.4. This is the buyer's copy of what the server recorded: what was handed over, when it physically happened, how much cash changed hands, and what proof the shop or the driver actually produced.

**Data**

| Shown | Source |
| ----- | ------ |
| Items, cash, collected time | `FS get /Orders/{orderId}` + `FS get /CustodyTransfers/{order.custodyTransferId}` |
| Proof method | `VerificationRecord` on that transfer — last two digits of the code only |
| Handed over by | `FS get /UserProfiles/{transfer.fromPartyId}` |

| Control | On click |
| ------- | -------- |
| Invoice | `nav BUY-12.1` |
| Report a problem | `Fn raiseCashDiscrepancy` kinds `disputed_amount` / `failed_verification` |

```
┌──────────────────────────────────┐
│  ←  Handover receipt   🔊    [👤]  │
├──────────────────────────────────┤
│  ✔ Collected                     │
│  21-08-2026, 10:41 AM            │
│  INV-2408210001                  │
├──────────────────────────────────┤
│  From  Sri Lakshmi Stores        │
│  Handed over by Hari · driver    │
├──────────────────────────────────┤
│  What you received               │
│  Rice 25kg × 1         ₹1,100    │
│  Cooking oil 1L × 2      ₹360    │
│  Discount HARVEST10     −₹146    │
│  Total                ₹1,550.52  │
├──────────────────────────────────┤
│  Cash you paid        ₹1,550.52  │
│  ✔ Nothing left to pay           │
├──────────────────────────────────┤
│  Checked with                    │
│  ✔ Your 6-digit pickup code      │
├──────────────────────────────────┤
│  [ Invoice view / download ]     │
│  [ Report a problem ]            │
└──────────────────────────────────┘
```

The time is `VerificationRecord.capturedAt` — the device clock at the moment the goods crossed the counter, preserved through an offline replay — not the moment the server heard about it. The cash line is `Order.cashCollectedAmount`, and it is absent on a prepaid order:

```
│  Cash you paid                —  │
│  ✔ Paid ₹1,550.52 by UPI before  │
│    pickup                        │
```

**Weak proof** — `VerificationRecord.strength` is `"weak"`, so the method was a photo, a counter-signature, or a support override.

```
│  Checked with                    │
│  ⚠ A photo, not your code        │
│    Reason given: "Phone was      │
│    switched off"                 │
│    Weaker proof than a code.     │
│    Your supplier can see that it │
│    was used.                     │
```

It is stated plainly rather than softened, because the buyer is the only person who knows whether they were actually standing there. The `fallbackReason` is shown verbatim as it was recorded; a counter-signature additionally names who signed, and a support override names who authorised it.

**Report a problem**

```
┌──────────────────────────────────┐
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│  Report a problem         [ X ]  │
│                                  │
│  INV-2408210001 · ₹1,550.52      │
│                                  │
│  ( ) I did not collect this      │
│  ( ) I paid a different amount   │
│  ( ) Something was missing       │
│                                  │
│  Amount in question              │
│  ┌────────────────────────────┐  │
│  │ ₹ 1,550.52                 │  │
│  └────────────────────────────┘  │
│                                  │
│  What happened                   │
│  ┌────────────────────────────┐  │
│  │ I paid ₹1,550 and the shop │  │
│  │ kept the change.           │  │
│  └────────────────────────────┘  │
│                      [ 🎤 Speak ] │
│                                  │
│  [ Cancel ]        [ Send ]      │
└──────────────────────────────────┘
```

**Actions**


| Control                   | Result                                                                          |
| ------------------------- | -------------------------------------------------------------------------------- |
| Invoice                   | `BUY-12.1` tax invoice view                                                      |
| I did not collect this    | `raiseCashDiscrepancy` with `kind: "failed_verification"`                        |
| I paid a different amount | `raiseCashDiscrepancy` with `kind: "shortfall"` or `"overage"` against the receipt |
| Something was missing     | `raiseCashDiscrepancy` with `kind: "disputed_amount"`                            |
| Send                      | Carries `orderId`, `custodyTransferId`, the amount and the description            |

`againstPartyId` is the party named on `VerificationRecord.capturedBy`, so the claim lands on whoever produced the proof. An equivalent open claim returns `ALREADY_EXISTS` and the sheet points at the one already running rather than opening a second.

**States.** Offline is the point of the screen: the receipt is cached with the order and stays fully readable, since a paper trail nobody can retrieve is not a paper trail. Loading shows a skeleton in the shape of the three blocks. Empty does not apply — the screen only exists once a handover is recorded, and an order that never got one falls to the not-found page in [Patterns.md](Patterns.md) section 2. Queued applies when the handover was captured with no signal: the receipt reads "Saved — waiting to send", the proof block names the method that was used, and `[ Report a problem ]` is disabled until the handover confirms, because there is nothing settled yet to dispute. Stale does not apply; a verified handover is immutable. Error on send follows the Patterns mapping.

---

## End-to-end flow

### Buyer purchase to pickup

```
Splash → Login → OTP/Google → Setup geo + merchant → Home
  → Gig detail → Pamphlet → Product sheet → Cart
  → Stock reconciliation → Review → UPI or cash
  → Order placed (pickup code) → Orders
  → Tracking (reached FCM) → Read the code out at the shop
  → Delivered → Handover receipt → Invoice
```

### Buyer cancel and refund

```
Orders → Order detail → Cancel order (placed or reached)
  → cancelOrder restores stock
  → refundOrder when already paid
  → Refund status → credited
```
