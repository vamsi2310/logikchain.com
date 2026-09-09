# Merchant wireframes

**Nav:** Gigs · Orders · Credit

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


Merchants are upgraded from an approved Buyer. After upgrade they see the role-change splash in [Shared.md](Shared.md), then this setup.

Every screen below must also satisfy the loading, empty, error, offline, queued and disabled states defined in [Patterns.md](Patterns.md), and must carry the **Data** block from [Patterns.md](Patterns.md) §1A (what Firestore paints, what each control calls). Header chrome (🔊 🔔 👤) is specified once in that section and is not repeated.

---

## Screen index

| ID | Screen |
| -- | ------ |
| `MER-01` | Merchant setup |
| `MER-02` | Gigs — supplier discovery |
| `MER-03` | Buyer pickup orders list |
| `MER-04` | Buyer pickup order detail |
| `MER-04.1` | Handover proof sheet |
| `MER-05` | Bulk order catalog |
| `MER-06` | Bulk order checkout |
| `MER-07` | Orders tab |
| `MER-08` | Merchant order detail and tracking |
| `MER-08.1` | Cancel bulk order |
| `MER-08.2` | Bulk order handover code |
| `MER-09` | Credit dashboard |
| `MER-09.1` | Credit repayment |
| `MER-09.2` | Cash repayment to driver |
| `MER-09.3` | Credit ledger |
| `MER-09.4` | Offline authorisation codes |
| `MER-10` | Credit increase request and status |
| `MER-11` | Shop settings |
| `MER-12` | Platform subscription |

---

## Two resolved model questions

Both of these were ambiguous in earlier revisions and are settled here so the screens below are unambiguous.

**One managing supplier, many order-able suppliers.** `UserProfile.supplierId` is the *managing* supplier: the supplier who converted this buyer into a merchant, and the only party who owns this merchant's `CreditProfile`. It is singular and is not user-changeable. Separately, `placeMerchantOrder` accepts an arbitrary `supplierId`, and the constitution says merchants view gigs from approved suppliers (plural). So the `Supplier ▾` picker in the Gigs header is retained, listing every supplier whose gigs serve this merchant's village, with the managing supplier pinned first. The consequence is drawn explicitly on `MER-06`: **credit is only a payment option with the managing supplier.** Bulk orders to any other supplier are UPI-only.

**Merchants do not keep a product catalog.** `Product.supplierId` means inventory belongs to suppliers. The "updates inventory" phrasing in the Merchant Setup description of the constitution does not correspond to any writable structure and no inventory screen is specified here. What a merchant actually manages is the shop profile (`MER-11`) and the bulk stock they buy in (`MER-05` to `MER-08`). The constitution text is corrected to match.

---

## Setup

### MER-01 Merchant setup

**Data**

| Shown | Source |
| ----- | ------ |
| Village picker | `Fn listConfigurationCatalog` — active records only; cascade filters client-side |
| Managing supplier | `FS get /UserProfiles/{uid}` → `supplierId`, then `FS get /UserProfiles/{supplierId}` — display only |
| Shop name, address, GSTIN, permissions | `FS get /UserProfiles/{uid}` → `name`, `address` / `shopDetails`, `gstin`, `permissions` |

| Control | On click |
| ------- | -------- |
| Village / shop fields | `local` until Save |
| Save and open Gigs | `Fn updateUserProfile` `{ villageId, name, address, shopDetails, gstin, permissions }` then `nav MER-02` |

```
┌──────────────────────────────────┐
│  Merchant setup        🔊  [👤]    │
├──────────────────────────────────┤
│  Village         [ Karavadi  ▾]  │
│                                  │
│  Managing supplier               │
│  ┌────────────────────────────┐  │
│  │ Kranthi Kumar · Ongole     │  │
│  │ Assigned — cannot change   │  │
│  └────────────────────────────┘  │
│                                  │
│  Shop name                       │
│  ┌────────────────────────────┐  │
│  │ Sri Lakshmi Stores         │  │
│  └────────────────────────────┘  │
│  Shop address                    │
│  ┌────────────────────────────┐  │
│  │ Karavadi Road, Karavadi    │  │
│  └────────────────────────────┘  │
│  GSTIN (optional)                │
│  ┌────────────────────────────┐  │
│  │ 37BBBMK1234B1Z2            │  │
│  └────────────────────────────┘  │
│                                  │
│  Permissions  Loc SMS Audio Cam  │
│                                  │
│  [  Save and open Gigs  ]        │
└──────────────────────────────────┘
```

**Actions:** Save calls `updateUserProfile`, then opens `MER-02`. GSTIN is optional for a merchant who only facilitates buyer pickups. It becomes required before placing a taxable bulk order, because `placeMerchantOrder` writes `recipientGstNumber` onto the invoice. Managing supplier is display-only, per the model note above.

---

## Gigs and buyer pickups

### MER-02 Gigs — supplier discovery

**Data**

| Shown | Source |
| ----- | ------ |
| Own village + managing supplier | `FS get /UserProfiles/{uid}` → `villageId`, `supplierId` |
| Gig cards | `FS query Gigs` where `villageIds` array-contains `profile.villageId` (and/or `merchantIds` array-contains `uid`). Status in `created`, `started`, `suspended`. 10-min TTL. |
| Buyer pickup count on a card | `FS query Orders` where `gigId` matches and `merchantId == uid` — count only |
| Bulk order count on a card | `FS query MerchantOrders` where `merchantId == uid` and `gigId` matches, status in `placed`, `reached` — count only |
| Supplier picker rows | `local` distinct `supplierId` from the gig query; managing supplier pinned first |
| Credit on the managing row | `FS get /CreditProfiles/{uid}` → `creditAvailable` |

| Control | On click |
| ------- | -------- |
| Supplier radio / Apply | `local` filter of already-loaded gigs |
| Gig card | `nav MER-03` with `gigId` — hidden when `Gig.status == "suspended"` |
| Place bulk order | `nav MER-05` with selected `supplierId` — hidden when the gig is suspended |
| Pull to refresh | re-run Shown reads, bypass TTL |

```
┌──────────────────────────────────┐
│  Gigs          🔊   🔔    [👤]      │
│  Supplier: Kranthi Kumar      ▾  │
├──────────────────────────────────┤
│  Today · 21-08-2026              │
│  ┌────────────────────────────┐  │
│  │ Ongole → Markapur          │  │
│  │ started · ETA 10:30 AM     │  │
│  │ 4 buyer pickups at my shop │  │
│  │ 1 of my bulk orders        │  │
│  └────────────────────────────┘  │
│                                  │
│  Upcoming                        │
│  ┌────────────────────────────┐  │
│  │ Podili dairy run           │  │
│  │ 22-08-2026 · created       │  │
│  │ 0 buyer pickups yet        │  │
│  └────────────────────────────┘  │
│                                  │
│  [ Place bulk order ]            │
├──────────────────────────────────┤
│  [ Gigs ]  [ Orders ] [ Credit ] │
└──────────────────────────────────┘
```

**Supplier picker sheet**

```
┌──────────────────────────────────┐
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│  Choose supplier            [ X ]│
│                                  │
│  ┌────────────────────────────┐  │
│  │ Kranthi Kumar          (•) │  │
│  │ Managing · credit ₹32,772  │  │
│  └────────────────────────────┘  │
│  ┌────────────────────────────┐  │
│  │ Devi Traders           ( ) │  │
│  │ Serves Karavadi · UPI only │  │
│  └────────────────────────────┘  │
│                                  │
│  Credit is available with your   │
│  managing supplier only.         │
│                                  │
│  [ Apply ]                       │
└──────────────────────────────────┘
```

**Actions:** Gig card → `MER-03` buyer pickups for that gig. Place bulk order → `MER-05`. Suspended gig shows the suspended banner and hides both actions.

### MER-03 Buyer pickup orders list

**Data**

| Shown | Source |
| ----- | ------ |
| Gig title / date | `FS get /Gigs/{gigId}` |
| Pickup cards | `FS query Orders` where `merchantId == uid` and `gigId ==` this gig |
| Buyer name / phone | `Order.recipientName`; phone from `FS get /UserProfiles/{order.buyer}` → `phone` / `contactInfo` |
| Chip counts | `local` partition of that query (`reached_merchant` vs delivered) |

| Control | On click |
| ------- | -------- |
| To collect / Done chips | `local` filter |
| Details | `nav MER-04` with `orderId` |
| Hand over | `nav MER-04.1` — enabled only when `deliveryStatus == "reached_merchant"` |
| Pull to refresh | re-run Shown reads |

```
┌──────────────────────────────────┐
│  ←  Pickups · Karavadi    [👤]    │
│     Ongole → Markapur · 21-08    │
├──────────────────────────────────┤
│  [ To collect 2 ] [ Done 2 ]     │
├──────────────────────────────────┤
│  ┌────────────────────────────┐  │
│  │ Anil Kumar                 │  │
│  │ INV-2408210001             │  │
│  │ 🚚 reached_merchant        │   │
│  │ ₹1,550 · Paid              │  │
│  │ [ Details ] [ Hand over ]  │  │
│  └────────────────────────────┘  │
│  ┌────────────────────────────┐  │
│  │ Bala Krishna               │  │
│  │ INV-2408210014             │  │
│  │ ○ placed · in transit      │  │
│  │ ₹880 · Cash on pickup      │  │
│  │ [ Details ]                │  │
│  └────────────────────────────┘  │
├──────────────────────────────────┤
│  [ Gigs ]  [ Orders ] [ Credit ] │
└──────────────────────────────────┘
```

Hand over is only enabled once the order is `reached_merchant`. While the order is still `placed` the goods are physically on the vehicle, so there is nothing for the merchant to hand over.

### MER-04 Buyer pickup order detail

**Data**

| Shown | Source |
| ----- | ------ |
| Invoice, items, totals, status, payment | `FS get /Orders/{orderId}` — merchant cannot read `/private/pickup` |
| Buyer name, phone, address | same get → `recipientName`, `recipientAddress`; phone from `FS get /UserProfiles/{order.buyer}` |
| Collect-cash reminder | same Order get when `paymentMode == "cash_on_pickup"` |

| Control | On click |
| ------- | -------- |
| Call | `tel:` buyer `contactInfo` |
| Invoice view / download | `local` render of that Order (Patterns invoice) |
| Hand over to buyer | `nav MER-04.1` — enabled when `deliveryStatus == "reached_merchant"` |

```
┌──────────────────────────────────┐
│  ←  INV-2408210001        [👤]    │
├──────────────────────────────────┤
│  Buyer                           │
│  Anil Kumar                      │
│  +91 98765 43210                 │
│  Door No 3-45, Karavadi          │
│                   [ 📞 Call ]     │
├──────────────────────────────────┤
│  Status                          │
│  ●  Placed         21-08 09:02   │
│  ●  Paid           21-08 09:03   │
│  ◉  At my shop     21-08 10:28   │
│  ○  Collected      —             │
├──────────────────────────────────┤
│  Items                           │
│  Rice 25kg × 1         ₹1,100    │
│  Cooking oil 1L × 2      ₹360    │
│  Discount HARVEST10     −₹146    │
│  Subtotal              ₹1,314    │
│  CGST 9% + SGST 9%       ₹236    │
│  Total ₹1,550 · Paid UPI         │
├──────────────────────────────────┤
│  [ Invoice view / download ]     │
│  [  Hand over to buyer  ]        │
└──────────────────────────────────┘
```

Cash-on-pickup orders show a collect-cash reminder above the hand-over button:

```
│  ⚠ Collect ₹880 in cash before   │
│    handing over.                 │
```

### MER-04.1 Handover proof sheet

The security rules give merchants write access to `MerchantOrder` only, so a merchant cannot write `Order.deliveryStatus` directly. This action therefore calls the `markOrderDelivered` Cloud Function, which accepts both the assigned driver and the assigned merchant as callers and validates the proof server-side. The button is legitimate; the write path is not a client write.

The code field, the resend, the fallback list and the offline counter box are the shared handover sheet drawn once in [Patterns.md](Patterns.md) section 7.2. Only the header and the cash line are specific to this handover.

**Data** — same Order get as `MER-04`. The six boxes start empty: the merchant cannot `FS get /Orders/{orderId}/private/pickup`.

| Control | On click |
| ------- | -------- |
| Code entry / Confirm | `Fn markOrderDelivered` `{ method: "otp" }` — matched server-side against the buyer's private pickup code |
| Send the code again | `Fn resendHandoverCode` `{ orderId }` — goes to the buyer's phone, never this device |
| Use another way | `Fn markOrderDelivered` with a `"weak"` method from Patterns §7.4 |
| Collect cash | field on that `markOrderDelivered` body; `cashCollected` must equal `Order.totalPrice` |
| Cancel | dismiss |

```
┌──────────────────────────────────┐
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│  Hand over to Anil Kumar  [ X ]  │
│                                  │
│  Anil Kumar · INV-2408210001     │
│  Rice 25kg, Cooking oil 1L       │
│  Collect cash      ₹1,550.52     │
│                                  │
│  Ask Anil for the 6-digit code   │
│  on their phone and type it in.  │
│  You cannot see their code; only │
│  they can.                       │
│                                  │
│  ┌────────────────────────────┐  │
│  │  code entry, resend and    │  │
│  │  fallbacks: see            │  │
│  │  Patterns.md section 7.2   │  │
│  └────────────────────────────┘  │
│                                  │
│  [ Cancel ]      [ Confirm ]     │
└──────────────────────────────────┘
```

The buyer reads their code off `BUY-10.1` and the merchant types it here. There is no other source for it: the pickup code lives at `/Orders/{orderId}/private/pickup`, which the merchant cannot read, so the six boxes start empty by design rather than by omission.

**Actions**


| Control            | Result                                                              |
| ------------------ | ------------------------------------------------------------------- |
| Code entry         | `markOrderDelivered` with `method: "otp"`; matched server-side against the buyer's private pickup code |
| Send the code again | `resendHandoverCode` with `orderId`; goes to the buyer's registered phone, never to this device |
| Use another way    | The fallback list in [Patterns.md](Patterns.md) section 7.4; photo, gallery, counter-signature and supplier override, each recorded as `"weak"` with a reason |
| Collect cash       | On a `cash_on_pickup` order `cashCollected` must equal `Order.totalPrice`; anything else is `AMOUNT_MISMATCH` and routes to `raiseCashDiscrepancy` |
| Wrong code         | Inline error; five attempts, then the code field is replaced by the fallback list for good |
| Offline            | The live code cannot be checked; the sheet switches to the counter box of section 7.3 and queues with the real device timestamp preserved, see `SHR-12` |

---

## Bulk purchasing

### MER-05 Bulk order catalog

**Data**

| Shown | Source |
| ----- | ------ |
| Supplier header | `FS get /UserProfiles/{selectedSupplierId}` → `name` |
| Product rows | `FS query Products` where `supplierId ==` selected supplier (warehouse catalog for bulk). Page of 20. |
| Search / chips | `local` filter of loaded rows |
| Qty / line total / footer | `local` cart. Cap is `Product.stock`. |

| Control | On click |
| ------- | -------- |
| Search / chips | `local` |
| `+` / `−` | `local` cart. Exceeding stock shows remaining count inline. No Function. |
| Review order | `nav MER-06` with the local cart |

```
┌──────────────────────────────────┐
│  ←  Bulk order            [👤]    │
│     From Kranthi Kumar           │
├──────────────────────────────────┤
│  ┌────────────────────────────┐  │
│  │ 🔍 Search products         │   │
│  └────────────────────────────┘  │
│  [ All ][ Staples ][ Oils ]  >   │
├──────────────────────────────────┤
│  ┌────────────────────────────┐  │
│  │ Rice 25kg · HSN 1006       │  │
│  │ ₹1,250 · bag · stock 40    │  │
│  │ [-]  10  [+]    ₹12,500    │  │
│  └────────────────────────────┘  │
│  ┌────────────────────────────┐  │
│  │ Cooking oil 1L · HSN 1514  │  │
│  │ ₹180 · bottle · stock 60   │  │
│  │ [-]  20  [+]     ₹3,600    │  │
│  └────────────────────────────┘  │
├──────────────────────────────────┤
│  2 lines · ₹16,100               │
│  [  Review order  ]              │
└──────────────────────────────────┘
```

Quantity is capped at `Product.stock`. Attempting to exceed it shows the remaining count inline rather than failing later with `OUT_OF_STOCK`.

### MER-06 Bulk order checkout

**Data**

| Shown | Source |
| ----- | ------ |
| Lines, qty, prices | `local` cart + `FS get /Products/{productId}` per line (stock re-check on open) |
| Deliver-to, GSTIN | `FS get /UserProfiles/{uid}` → `name`, `address` / `shopDetails`, `gstin` |
| Supplier | `FS get /UserProfiles/{cart.supplierId}` |
| Credit available | `FS get /CreditProfiles/{uid}` — credit radio enabled only when `cart.supplierId == profile.supplierId` |
| Discount row | `FS get /Discounts/{code}` after Apply; until then `local` |
| Totals on this screen | `local` estimate. Authoritative totals arrive in the `placeMerchantOrder` response. |
| Payment radios | `local` |

| Control | On click |
| ------- | -------- |
| Payment radio | `local` — credit disabled for a non-managing supplier |
| Apply discount | `FS get /Discounts/{code}` + client rule check. Not a Function. |
| Place order (credit / cash) | `Fn placeMerchantOrder` `{ gigId, supplierId, paymentMode, payWithCredit }`. `NOT_SERVICEABLE` returns to `MER-02`. `INSUFFICIENT_CREDIT` opens the sheet. Missing GSTIN → `nav MER-11`. Blocked offline. |
| Place order (UPI) | `Fn placeMerchantOrder` `{ gigId, supplierId, paymentMode: "online" }` then `Fn createPaymentIntent` as returned. Blocked offline. |
| Request limit increase | `nav MER-10` |
| Pay with UPI instead | `local` — flips the radio, then Place order |
| Add GSTIN | `nav MER-11` |

```
┌──────────────────────────────────┐
│  ←  Review bulk order            │
├──────────────────────────────────┤
│  Supplier   Kranthi Kumar        │
│  Deliver to Sri Lakshmi Stores   │
│  Karavadi Road, Karavadi         │
│  My GSTIN   37BBBMK1234B1Z2      │
├──────────────────────────────────┤
│  Rice 25kg × 10       ₹12,500    │
│  Cooking oil 1L × 20   ₹3,600    │
│                                  │
│  Discount code                   │
│  ┌──────────────┐ [ Apply ]      │
│  │ HARVEST10    │                │
│  └──────────────┘                │
│  ✔ HARVEST10 applied  −₹1,610    │
├──────────────────────────────────┤
│  Subtotal             ₹14,490    │
│  CGST 9%               ₹1,304    │
│  SGST 9%               ₹1,304    │
│  Total                ₹17,098    │
├──────────────────────────────────┤
│  Payment                         │
│  (•) Credit                      │
│      Available ₹32,772           │
│  ( ) UPI now                     │
│  ( ) Cash when the driver        │
│      brings it                   │
│      Keep ₹17,098.00 ready       │
│                                  │
│  [  Place order ₹17,098  ]       │
└──────────────────────────────────┘
```

**Non-managing supplier variant** — credit is unavailable, per the resolved model note.

```
│  Payment                         │
│  ( ) Credit                      │
│      Not available with Devi     │
│      Traders — credit is only    │
│      offered by your managing    │
│      supplier                    │
│  (•) UPI now                     │
│  ( ) Cash when the driver        │
│      brings it                   │
```

**Insufficient credit sheet**

```
┌──────────────────────────────────┐
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│  Not enough credit               │
│                                  │
│  Need ₹17,098 · have ₹5,000      │
│  Short by ₹12,098                │
│                                  │
│  [ Request limit increase ]      │
│  [ Pay with UPI instead   ]      │
│  [ Cancel ]                      │
└──────────────────────────────────┘
```

**Missing GSTIN block**

```
┌──────────────────────────────────┐
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│  Add your GSTIN first            │
│                                  │
│  Bulk orders raise a tax invoice │
│  in your shop's name, so a       │
│  GSTIN is required.              │
│                                  │
│  [ Add GSTIN ]      [ Cancel ]   │
└──────────────────────────────────┘
```

**Actions:** Place order calls `placeMerchantOrder` with a `paymentMode` of `"credit"`, `"online"` or `"cash_on_delivery"`, and `payWithCredit` mirroring the credit choice. Credit draws the line now and raises the payment due at delivery, not at order time, so nothing is owed for goods that never arrived. UPI opens a `PaymentIntent` through `createPaymentIntent` and is confirmed by `processPayment`. Cash takes nothing here: the driver collects the full `totalPrice` at handover and `updateMerchantOrderStatus` records it into that driver's custody, which is why the amount to keep ready is stated on this screen rather than discovered at the door. `INSUFFICIENT_CREDIT` raises the sheet above rather than a bare toast. Add GSTIN deep-links to `MER-11`.

### MER-07 Orders tab

**Data**

| Shown | Source |
| ----- | ------ |
| My bulk cards | `FS query MerchantOrders` where `merchantId == uid` |
| Buyer pickup cards | `FS query Orders` where `merchantId == uid` |
| Search | `local` filter of the loaded tab |

| Control | On click |
| ------- | -------- |
| Buyer pickups / My bulk chips | `local` tab |
| Search | `local` |
| Bulk card | `nav MER-08` with `merchantOrderId` |
| Pickup card | `nav MER-04` with `orderId` |
| Pull to refresh | re-run Shown reads |

```
┌──────────────────────────────────┐
│  Orders        🔊   🔔    [👤]      │
├──────────────────────────────────┤
│  [ Buyer pickups ] [ My bulk ]   │
│  ┌────────────────────────────┐  │
│  │ 🔍 Invoice no. or item     │   │
│  └────────────────────────────┘  │
├──────────────────────────────────┤
│  ┌────────────────────────────┐  │
│  │ MO-7781                    │  │
│  │ ○ placed · Credit          │  │
│  │ ₹17,098 · 21-08-2026       │  │
│  └────────────────────────────┘  │
│  ┌────────────────────────────┐  │
│  │ MO-7702                    │  │
│  │ ✔ delivered · UPI          │  │
│  │ ₹8,240 · 18-08-2026        │  │
│  └────────────────────────────┘  │
│  ┌────────────────────────────┐  │
│  │ MO-7688                    │  │
│  │ ⚠ suspended                │  │
│  │ ₹4,100 · 16-08-2026        │  │
│  └────────────────────────────┘  │
├──────────────────────────────────┤
│  [ Gigs ]  [ Orders ] [ Credit ] │
└──────────────────────────────────┘
```

### MER-08 Merchant order detail and tracking

`MerchantOrder.status` moves through `placed`, `reached`, `delivered`, `cancelled` and `suspended`, but the previous revision only had a list row with two buttons and no detail screen.

**Data**

| Shown | Source |
| ----- | ------ |
| Invoice, items, totals, status, payment | `FS get /MerchantOrders/{id}` |
| Credit due line | `FS get /CreditProfiles/{uid}` → matching `paymentsDue` when `paymentMode == "credit"` |
| Gig title / driver | `FS get /Gigs/{order.gigId}` |
| Suspended banner | `MerchantOrder.status == "suspended"` on the same get |

| Control | On click |
| ------- | -------- |
| Invoice view / download | `local` render of that MerchantOrder (Patterns invoice) |
| Show handover code | `nav MER-08.2` — enabled once `reached` |
| Confirm received | `nav MER-08.2` — same screen; the Function fires there |
| Cancel order | `nav MER-08.1` — only while `placed` or `reached` |
| Contact support | `nav SHR-14` |

```
┌──────────────────────────────────┐
│  ←  MO-7781               [👤]    │
├──────────────────────────────────┤
│  Supplier   Kranthi Kumar        │
│  Gig        Ongole → Markapur    │
│  Driver     Hari · AP-27-TX-1234 │
├──────────────────────────────────┤
│  Progress                        │
│  ●  Placed         21-08 08:40   │
│  ◉  On the way     21-08 10:05   │
│  ○  Reached shop   ETA 10:30 AM  │
│  ○  Delivered      —             │
├──────────────────────────────────┤
│  Rice 25kg × 10       ₹12,500    │
│  Cooking oil 1L × 20   ₹3,600    │
│  Discount HARVEST10   −₹1,610    │
│  Subtotal             ₹14,490    │
│  CGST 9% + SGST 9%     ₹2,608    │
│  Total                ₹17,098    │
├──────────────────────────────────┤
│  Paid by credit                  │
│  Due 05-09-2026                  │
├──────────────────────────────────┤
│  [ Invoice view / download ]     │
│  [ Show handover code ]          │
│  [ Confirm received ]            │
│  [ Cancel order ]                │
└──────────────────────────────────┘
```

**Suspended variant**

```
│  ⚠ Order suspended               │
│    Your supplier disassociated   │
│    this shop, or the gig was     │
│    suspended. Support has been   │
│    notified.                     │
│                                  │
│  [ 📞 Contact support ]           │
```

**Actions**


| Control            | Result                                                              |
| ------------------ | ------------------------------------------------------------------- |
| Show handover code | `MER-08.2`; enabled once `reached`, and the primary route to delivery |
| Confirm received   | `MER-08.2`, where the same `updateMerchantOrderStatus` call is made with a `"counter_signature"` proof and the weaker standing of that proof is stated |
| Invoice            | Shared tax invoice view, see [Patterns.md](Patterns.md)              |
| Cancel order       | `MER-08.1`; only while `placed` or `reached`                         |

### MER-08.1 Cancel bulk order

**Data** — same `FS get /MerchantOrders/{id}` as `MER-08`. Release copy is derived from `paymentMode` on that document.

| Control | On click |
| ------- | -------- |
| Keep order | dismiss |
| Cancel order | `Fn cancelMerchantOrder`. If `paymentMode == "online"` then `Fn refundOrder`. `ORDER_UNALTERABLE` when already delivered. |

```
┌──────────────────────────────────┐
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│  Cancel MO-7781?                 │
│                                  │
│  ₹17,098 was charged to your     │
│  credit line. Cancelling         │
│  releases it back to your        │
│  available credit.               │
│                                  │
│  Stock returns to the supplier.  │
│                                  │
│  [ Keep order ]  [ Cancel order ]│
└──────────────────────────────────┘
```

**Actions:** `cancelMerchantOrder` restores product stock and, for credit orders, decrements `creditUsed` and restores `creditAvailable`. UPI-paid orders additionally trigger a refund. `ORDER_UNALTERABLE` when already delivered.

### MER-08.2 Bulk order handover code

The merchant is the verifying counterparty for a bulk delivery, so the merchant is the one who holds the code. `placeMerchantOrder` returns it once and writes it to `/MerchantOrders/{merchantOrderId}/private/handover`; the delivering driver can ask for a resend but can never read it, which is what makes reading it out mean anything.

**Data** — same MerchantOrder get as `MER-08`.

| Shown | Source |
| ----- | ------ |
| Code digits | `FS get /MerchantOrders/{id}/private/handover` — merchant-only. Cached when the order was placed. |
| Cash-to-pay / nothing-to-pay card | same MerchantOrder get → `paymentMode`, `totalPrice` |
| Send budget | `HandoverCodeRecord.sendCount` on that private get |

| Control | On click |
| ------- | -------- |
| Read aloud | `local` speech |
| Send the code again | `Fn resendHandoverCode` `{ merchantOrderId, channel }` — disabled offline |
| I received this order | `Fn updateMerchantOrderStatus` `{ status: "delivered", proof.method: "counter_signature" }` with mandatory `fallbackReason` |
| Reason picker | `local` until I received |

```
┌──────────────────────────────────┐
│  ←  Handover code      🔊    [👤]  │
├──────────────────────────────────┤
│  MO-7781 · from Kranthi Kumar    │
│  Driver Hari · AP-27-TX-1234     │
│  Reached your shop 10:30 AM      │
├──────────────────────────────────┤
│  ┌────────────────────────────┐  │
│  │  Your handover code        │  │
│  │                            │  │
│  │      6 1 4 0 8 3           │  │
│  │                            │  │
│  │  Read it out to the driver │  │
│  │  once the goods are off    │  │
│  │  the vehicle.              │  │
│  └────────────────────────────┘  │
│  ┌────────────────────────────┐  │
│  │  Cash to pay the driver    │  │
│  │      ₹17,098.00            │  │
│  │  The exact amount. Count   │  │
│  │  it out before you read    │  │
│  │  the code.                 │  │
│  └────────────────────────────┘  │
│                                  │
│  [ 🔊 Read aloud ]                │
│  [ Send the code again ]         │
│  Sent to +91 ****2345 · 1 of 3   │
├──────────────────────────────────┤
│  Driver cannot take the code?    │
│  [ I received this order ]       │
│  Signing for your own delivery   │
│  is weaker proof than the code.  │
│  Your supplier sees which one    │
│  was used.                       │
└──────────────────────────────────┘
```

The cash card is drawn only when `MerchantOrder.paymentMode` is `"cash_on_delivery"`, at `totalPrice` to two decimals. A credit or prepaid order shows what it settled instead:

```
│  ┌────────────────────────────┐  │
│  │  Nothing to pay now        │  │
│  │  On credit · due 05-09     │  │
│  └────────────────────────────┘  │
```

**Sign for it yourself**

```
┌──────────────────────────────────┐
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│  Sign for MO-7781?        [ X ]  │
│                                  │
│  Rice 25kg × 10, Cooking oil 1L  │
│  × 20 · ₹17,098.00               │
│                                  │
│  This is recorded as your own    │
│  signature, not a code check.    │
│  It is weaker proof and your     │
│  supplier will see it was used.  │
│                                  │
│  Why is the code not being used? │
│  [ No signal on their phone   ▾] │
│                                  │
│  [ Cancel ]      [ I received ]  │
└──────────────────────────────────┘
```

A merchant cannot submit `"otp"` against their own order — a party that verifies itself has verified nothing — so this route is recorded as `"counter_signature"` against the merchant's registered name and the last four digits of their phone. It is legitimate, it closes the order, and it is honest about being the weaker of the two paths. The reason picker is the one in [Patterns.md](Patterns.md) section 7.4 and is mandatory.

**Actions**


| Control               | Result                                                                       |
| --------------------- | ----------------------------------------------------------------------------- |
| Voice `🔊 Read aloud` | Speaks the driver, the digits one at a time, and the cash amount              |
| Send the code again   | `resendHandoverCode` with `merchantOrderId` and `channel: "sms"` or `"voice"` |
| I received this order | `updateMerchantOrderStatus` with `status: "delivered"` and a `"counter_signature"` proof carrying the mandatory `fallbackReason` |
| Driver's own confirm  | `updateMerchantOrderStatus` from the driver's device with `method: "otp"`; on a cash order its `cashCollected` must equal `MerchantOrder.totalPrice` |

**States.** Loading renders the order header from cache behind a skeleton in the shape of the code card. Offline keeps the code and the cash figure readable, because both were cached when the order was placed, and disables the resend with "Needs an internet connection"; the driver cannot check a live code with no network, so an offline bulk handover closes on the counter-signature route instead. Queued applies to that route: the call carries its `idempotencyKey` and the device `capturedAt`, the row takes a `queued` chip, and it is not signed a second time. Disabled applies to `[ I received this order ]` until the order is `reached` — until then the goods are still on the vehicle — with the reason under the button. Stale marks a cached amount `[cached]` and re-reads before the driver submits. Empty does not apply. Error follows the Patterns mapping, with `RESEND_LIMIT_EXCEEDED` disabling the resend and stating the time it returns.

---

## Credit

### MER-09 Credit dashboard

A merchant's credit line starts at zero and only becomes non-zero once their managing supplier sets a limit, so the zero state is the first thing most merchants will see. It has to explain itself.

**Data**

| Shown | Source |
| ----- | ------ |
| Limit / used / available / bar | `FS get /CreditProfiles/{uid}` → `creditLimit`, `creditUsed`, `creditAvailable` |
| ⏳ With driver | same get → `pendingRepayments` (wireframe copy: in-transit) |
| Set-by supplier | `FS get /UserProfiles/{profile.supplierId}` |
| Payments due / payments made | same CreditProfile get → `paymentsDue`, `paymentsMade` |
| Driver-asking banner | `FS query CustodyTransfers` where `fromPartyId == uid`, `kind == "credit_repayment"`, `status == "pending"` |
| Locked report rows | `Fn getEntitlements` |
| Empty zero-limit state | same CreditProfile get when `creditLimit == 0` — not a second query |

| Control | On click |
| ------- | -------- |
| Pay now | `nav MER-09.1` with the due id |
| Show my code | `nav MER-09.2` |
| Credit ledger | `nav MER-09.3` |
| Offline codes | `nav MER-09.4` |
| Request limit increase / Request credit line | `nav MER-10` |
| ⏳ With driver line | `nav MER-09.3` filtered to the in-transit entry |
| Payment history | `Fn getFinanceReport` `{ collections_summary }` |
| Statement of account | `Fn getFinanceReport` `{ receivables_ageing }` scoped to this merchant |
| A locked report | `nav MER-12` at that row (`Fn previewPlanChange` on the comparison) |
| Call supplier | `tel:` managing supplier `contactInfo` |
| Pull to refresh | re-run Shown reads |

```
┌──────────────────────────────────┐
│  Credit        🔊   🔔    [👤]      │
├──────────────────────────────────┤
│  Limit                ₹50,000    │
│  Used                 ₹17,098    │
│  Available            ₹32,902    │
│  ████████████░░░░░░░░░░░░░░░░░   │
│                            34%   │
│                                  │
│  ⏳ With driver      ₹4,000.00    │
│  Ravi Teja · collected 04:15 PM  │
│  Your credit is already reduced. │
│  Your supplier gets it tonight.  │
│                                  │
│  Set by Kranthi Kumar            │
│  [ Request limit increase ]      │
├──────────────────────────────────┤
│  Payments due                    │
│  ┌────────────────────────────┐  │
│  │ ₹17,098   due 05-09-2026   │  │
│  │ ○ pending · MO-7781        │  │
│  │              [ Pay now ]   │  │
│  └────────────────────────────┘  │
│  ┌────────────────────────────┐  │
│  │ ₹4,100    due 28-08-2026   │  │
│  │ ⚠ overdue · MO-7688        │  │
│  │              [ Pay now ]   │  │
│  └────────────────────────────┘  │
├──────────────────────────────────┤
│  Payments made                   │
│  ⏳ ₹4,000   21-08-2026           │
│     with Ravi Teja               │
│  ₹8,240   14-08-2026   ✔         │
│  ₹6,000   02-08-2026   ✔         │
│  [ Credit ledger ]               │
├──────────────────────────────────┤
│  Paying a driver in cash         │
│  The driver starts it on their   │
│  phone and you read out a code.  │
│  [ Offline codes ]               │
├──────────────────────────────────┤
│  Reports                         │
│  [ Payment history ]             │
│  [ Statement of account ]        │
│  🔒 What I owe, by age            │
│  🔒 Where my money went           │
│  🔒 Cash flow                     │
│  [ See what's in Finance ]       │
├──────────────────────────────────┤
│  [ Gigs ]  [ Orders ] [ Credit ] │
└──────────────────────────────────┘
```

The `⏳ With driver` block is the treatment defined in [Patterns.md](Patterns.md) section 8.3, and the wording is fixed there because the merchant, the driver and the supplier all read the same sentence about the same money. `Used` and `Available` are already net of it: `confirmCreditRepayment` relieves the credit at the moment the driver takes the cash, so the merchant can place the next order against a line they have genuinely paid down. What is still outstanding is the supplier's receipt of it, which is what `inTransitRepayments` counts and what the hourglass says.

**A driver is asking for cash**

```
├──────────────────────────────────┤
│  ⏳ Ravi Teja is asking for       │
│    ₹4,000.00 in cash             │
│    [ Show my code ]              │
├──────────────────────────────────┤
```

Raised by `initiateCreditRepayment` and pushed as a `verification` notification; both the banner and the notification open `MER-09.2`. It disappears when the transfer is confirmed or when its 30 minutes run out.

**No credit line yet**

```
┌──────────────────────────────────┐
│  Credit        🔊   🔔    [👤]      │
├──────────────────────────────────┤
│                                  │
│             [ 💳 ]                │
│                                  │
│    No credit line yet            │
│                                  │
│  Your supplier sets your credit  │
│  limit. Ask Kranthi Kumar to     │
│  open one, or request a limit    │
│  below.                          │
│                                  │
│  [ Request credit line ]         │
│  [ 📞 Call supplier ]             │
│                                  │
│  Until then, pay bulk orders by  │
│  UPI or cash on delivery.        │
├──────────────────────────────────┤
│  [ Gigs ]  [ Orders ] [ Credit ] │
└──────────────────────────────────┘
```

The `[ Pay now ]` control on each due row was previously missing entirely, which left `processPayment`'s merchant-repayment branch unreachable from the UI.

**Actions**


| Control                | Result                                                                   |
| ---------------------- | ------------------------------------------------------------------------ |
| Pay now                | `MER-09.1`, carrying the due it was tapped from                          |
| Show my code           | `MER-09.2`, the code the asking driver needs to hear                     |
| Credit ledger          | `MER-09.3`, every movement behind the three figures at the top           |
| Offline codes          | `MER-09.4`, the sheet to read from when the network is down              |
| Request limit increase | `MER-10`, which calls `requestCreditIncrease`                            |
| `⏳ With driver` line   | `MER-09.3` filtered to the in-transit entry                              |
| Payment history        | `getFinanceReport` with `collections_summary`; available on every plan   |
| Statement of account   | `getFinanceReport` with `receivables_ageing` scoped to the merchant; every plan |
| A locked report        | `MER-12` plan comparison, opened at the row that was tapped              |

**The two unlocked reports are unlocked on every plan, including a lapsed one.** A merchant's own payment history and statement of account are the evidence they need to argue with their supplier about what they owe. Selling that back to them would make the platform the reason a merchant cannot defend their own position, and a merchant who cannot see what they paid stops paying. What the paid tiers add is analysis — ageing buckets, spend patterns, cash-flow projection — and the filing formats an accountant asks for.

**Locked rows state the capability, not the plan.** "What I owe, by age" tells a merchant what they would get; "Finance tier feature" tells them nothing and reads as an advertisement. Tapping opens the comparison at that row with the price already computed, so the decision needs one more tap and no form filling.

### MER-09.1 Credit repayment

**Data** — same CreditProfile get as `MER-09`. Payable max is `creditUsed - pendingRepayments`. Amount chips are `local`.

| Shown | Source |
| ----- | ------ |
| Outstanding / with-driver / payable | `FS get /CreditProfiles/{uid}` |
| Against due | `nav` payload from `MER-09`, matched to `paymentsDue[]` |
| Receipt figures | `Fn processPayment` response, then the same CreditProfile get |

| Control | On click |
| ------- | -------- |
| This due / All / Custom / amount field | `local` — clamp stated, not applied silently |
| Pay | `Fn createPaymentIntent` `{ purpose: "merchant_credit_repayment", duesTargeted }` then `Fn processPayment`. Blocked offline. |
| Done | `nav MER-09` |
| Share receipt | `local` render |

```
┌──────────────────────────────────┐
│  ←  Repay credit                 │
├──────────────────────────────────┤
│  Outstanding          ₹17,098    │
│  ⏳ With driver        ₹4,000     │
│  You can pay up to    ₹13,098    │
│                                  │
│  Amount to pay                   │
│  ┌────────────────────────────┐  │
│  │ ₹ 13,098                   │  │
│  └────────────────────────────┘  │
│  [ This due ] [ All ] [ Custom ] │
│                                  │
│  Against                         │
│  MO-7781 · due 05-09-2026        │
│                                  │
│  Pay by                          │
│  (•) UPI  GPay / PhonePe / Paytm │
│                                  │
│  [  Pay ₹13,098  ]               │
│                                  │
│  Your available credit increases │
│  by the same amount once the     │
│  payment clears.                 │
└──────────────────────────────────┘
```

**Above the payable maximum** — `AMOUNT_MISMATCH`, inline on the field.

```
│  Amount to pay                   │
│  ┌────────────────────────────┐  │
│  │ ₹ 17,098                   │  │
│  └────────────────────────────┘  │
│  ⚠ You can pay up to ₹13,098.00. │
│    ₹4,000.00 is already with     │
│    Ravi Teja and reaches your    │
│    supplier tonight. Paying it   │
│    here would pay it twice.      │
```

The clamp is `creditUsed - inTransitRepayments`, and it is stated rather than applied silently: a merchant who typed the figure off their own due list needs to know why it was refused, or they will conclude the app lost their earlier payment.

**Receipt**

```
┌──────────────────────────────────┐
│                                  │
│         ✔ Payment received       │
│           ₹13,098                │
│                                  │
│  Against    MO-7781              │
│  Paid on    21-08-2026 11:14 AM  │
│  Reference  pay_Q8xk21ppLm       │
│                                  │
│  New available credit ₹46,000    │
│                                  │
│  [ Done ]     [ Share receipt ]  │
└──────────────────────────────────┘
```

**Actions:** Pay calls `createPaymentIntent` with `purpose: "merchant_credit_repayment"` and the dues it is meant to clear, then `processPayment` confirms that intent against the gateway. The settling figure is `PaymentIntent.amount`, priced server-side; this screen never sends an amount the server has not already agreed to, and a gateway figure that disagrees with the intent fails rather than being reconciled. On success `processPayment` decrements `creditUsed`, recomputes `creditAvailable` capped at `creditLimit`, marks the targeted dues paid, appends to `paymentsMade`, and writes a `repayment_online` row to the ledger at `MER-09.3`. Paying a driver in cash is not started here — the driver starts it and the merchant answers at `MER-09.2`. Like every gateway payment, this screen is blocked offline with the reason stated, per [Patterns.md](Patterns.md) section 4.

### MER-09.2 Cash repayment to driver

A driver serving this merchant's village called `initiateCreditRepayment`, which opened a pending transfer, started a 30-minute clock and sent a code to the merchant's registered phone. Nothing has moved: a pending transfer is a question awaiting an answer, and it expires unanswered.

**Data** — same CreditProfile get as `MER-09` for the before-and-after preview.

| Shown | Source |
| ----- | ------ |
| Driver, amount, asked-at, expiry | `FS get /CustodyTransfers/{transferId}` (from the notification / `MER-09` query) |
| Code digits | `FS get /CustodyTransfers/{transferId}/private/code` — merchant-only |
| Countdown | `CustodyTransfer.challengeExpiresAt` on that get. `FS listen` only while pending and mounted (unbind on leave). |
| Expired / offline copy | same transfer get — states, not extra queries |

| Control | On click |
| ------- | -------- |
| Read aloud | `local` speech |
| Report a problem | `Fn raiseCashDiscrepancy` `{ custodyTransferId, amount, againstPartyId: driver }` |
| Open offline codes | `nav MER-09.4` |
| Call supplier | `tel:` managing supplier `contactInfo` |

```
┌──────────────────────────────────┐
│  ←  Pay the driver     🔊    [👤]  │
├──────────────────────────────────┤
│  Ravi Teja · AP39 TR 4521        │
│  Kranthi Kumar's gig · 21-08     │
│  Asked at 04:12 PM               │
├──────────────────────────────────┤
│  ┌────────────────────────────┐  │
│  │  They are asking for       │  │
│  │      ₹4,000.00             │  │
│  │  Count the notes before    │  │
│  │  you read the code out.    │  │
│  └────────────────────────────┘  │
│  ┌────────────────────────────┐  │
│  │  Your code                 │  │
│  │                            │  │
│  │      3 0 5 7 4 2           │  │
│  │                            │  │
│  │  Good until 04:42 PM       │  │
│  │  28 min left               │  │
│  └────────────────────────────┘  │
├──────────────────────────────────┤
│  After they confirm              │
│  Used         ₹21,098 → ₹17,098  │
│  Available    ₹28,902 → ₹32,902  │
│  ₹4,000.00 then sits under       │
│  ⏳ With driver on your credit    │
│  screen until your supplier      │
│  receives it tonight.            │
├──────────────────────────────────┤
│  The driver confirms this on     │
│  their own phone. There is       │
│  nothing for you to confirm      │
│  here.                           │
│                                  │
│  [ 🔊 Read aloud ]                │
│  [ Report a problem ]            │
└──────────────────────────────────┘
```

The absence of a confirm button on this screen is the design. `confirmCreditRepayment` is called by the driver, against the code the merchant reads out; a screen where the merchant could both hold the code and close the transfer would be a screen where one person types both halves. The before-and-after figures are shown because the merchant is being asked to part with cash on the strength of a number, and the number should be visible before the notes are.

**Expired** — `CUSTODY_TRANSFER_EXPIRED`.

```
┌──────────────────────────────────┐
│  ←  Pay the driver     🔊    [👤]  │
├──────────────────────────────────┤
│  ⚠ This request has run out of   │
│    time. The code stopped        │
│    working at 04:42 PM.          │
├──────────────────────────────────┤
│  Ravi Teja asked for ₹4,000.00   │
│                                  │
│  Nothing has moved. Your credit  │
│  is unchanged and no cash is     │
│  recorded against you.           │
│                                  │
│  If you have already handed the  │
│  money over, say so now.         │
│                                  │
│  [ Report a problem ]            │
│  [ 📞 Call your supplier ]        │
│                                  │
│  To pay, ask the driver to start │
│  again. They will send a new     │
│  code.                           │
└──────────────────────────────────┘
```

The expired state has to carry the "if you already handed it over" line, because the window closes on wall-clock time and cash moves on human time. A merchant who paid at 04:41 PM against a code the driver typed at 04:43 PM is exactly the case a discrepancy exists for.

**Offline**

```
│  ⚠ Offline — no new code can     │
│    reach you                     │
│                                  │
│  Read out the next unused code   │
│  from your own sheet, and the    │
│  number beside it.               │
│                                  │
│  [ Open offline codes ]          │
```

**Actions**


| Control               | Result                                                                     |
| --------------------- | --------------------------------------------------------------------------- |
| Voice `🔊 Read aloud` | Speaks the driver, the amount and the digits one at a time                  |
| Report a problem      | `raiseCashDiscrepancy` with the `custodyTransferId`, the amount, and `againstPartyId` set to the driver |
| Open offline codes    | `MER-09.4`                                                                  |
| The driver's confirm  | `confirmCreditRepayment` from the driver's device, against the code read out here |

**States.** Loading renders the driver and the amount from the notification payload while the code reads. Empty does not apply: the screen only exists against a pending transfer, and an already-answered one refreshes to the credit dashboard. Error covers `CUSTODY_TRANSFER_EXPIRED`, drawn above, and `CODE_INVALID` on the driver's side, which surfaces here only as the countdown continuing to run. Offline replaces the live code with the offline sheet, as drawn, since a code the server issues cannot arrive on a phone with no signal. Queued does not apply — nothing on this screen writes. Disabled does not apply, for the same reason. Stale re-reads the credit figures before the preview is shown; a `[cached]` chip on the before-and-after block is the one place a merchant would otherwise act on an old balance.

### MER-09.3 Credit ledger

`CreditProfile` carries the running scalars because they are cheap to read. This is the append-only evidence behind every one of them, newest first, which is what makes a disputed balance answerable instead of an argument about whose figure is right.

**Data** — same CreditProfile get as `MER-09` for the header scalars.

| Shown | Source |
| ----- | ------ |
| Ledger rows | `FS query CreditTransactions` where `merchantId == uid`, newest first, page of 20 |
| Type labels | `local` map of `CreditTransaction.type` (draw → "Bulk order", etc.) |
| Empty state | same query, zero rows |

| Control | On click |
| ------- | -------- |
| Row with an order | `nav MER-08` for that `merchantOrderId` |
| Report a problem | `Fn raiseCashDiscrepancy` against the row's `custodyTransferId` and named driver |
| Load more | same query, next page |
| Place bulk order | `nav MER-05` |
| Pull to refresh | re-run Shown reads together so scalars and rows cannot disagree |

```
┌──────────────────────────────────┐
│  ←  Credit ledger      🔊    [👤]  │
├──────────────────────────────────┤
│  Used                ₹17,098.00  │
│  Limit               ₹50,000.00  │
│  + adds to what you owe          │
│  − reduces it                    │
├──────────────────────────────────┤
│  ┌────────────────────────────┐  │
│  │ Cash to driver  −₹4,000.00 │  │
│  │ ⏳ With driver              │  │
│  │ Used after     ₹17,098.00  │  │
│  │ Ravi Teja · driver         │  │
│  │ 21-08-2026, 04:15 PM       │  │
│  │        [ Report a problem ]│  │
│  └────────────────────────────┘  │
│  ┌────────────────────────────┐  │
│  │ Bulk order    +₹17,098.00  │  │
│  │ MO-7781                    │  │
│  │ Used after     ₹21,098.00  │  │
│  │ You · merchant             │  │
│  │ 21-08-2026, 08:40 AM       │  │
│  └────────────────────────────┘  │
│  ┌────────────────────────────┐  │
│  │ Order cancelled −₹4,100.00 │  │
│  │ MO-7688                    │  │
│  │ Used after      ₹4,000.00  │  │
│  │ Kranthi Kumar · supplier   │  │
│  │ 19-08-2026, 09:20 AM       │  │
│  └────────────────────────────┘  │
│  ┌────────────────────────────┐  │
│  │ Paid by UPI    −₹8,240.00  │  │
│  │ Used after      ₹8,100.00  │  │
│  │ You · merchant             │  │
│  │ 14-08-2026, 11:14 AM       │  │
│  └────────────────────────────┘  │
│  ┌────────────────────────────┐  │
│  │ Limit raised  +₹25,000.00  │  │
│  │ Limit now      ₹50,000.00  │  │
│  │ Kranthi Kumar · supplier   │  │
│  │ 02-08-2026, 06:02 PM       │  │
│  └────────────────────────────┘  │
│                                  │
│  [ Load more ]                   │
└──────────────────────────────────┘
```

Every `CreditTransaction.type` has a plain-language label and no row is left as a code the merchant has to decode: `draw` is "Bulk order", `release` is "Order cancelled", `repayment_cash` is "Cash to driver", `repayment_online` is "Paid by UPI", `limit_change` is "Limit raised" or "Limit lowered", `adjustment` is "Correction", and `reversal` is "Entry reversed". A limit change reports `creditLimitAfter` rather than `creditUsedAfter`, because it moves the ceiling and not the balance; every other row reports `creditUsedAfter`, so the running figure can be followed down the list to the scalar at the top.

Rows with `inTransit: true` carry the `⏳` treatment of [Patterns.md](Patterns.md) section 8.3 and are the only rows offering `[ Report a problem ]`, since they are the only ones describing money that is out of everyone's hands.

**A correction and the entry it reverses**

```
│  ┌────────────────────────────┐  │
│  │ Entry reversed   +₹250.00  │  │
│  │ Reverses the correction    │  │
│  │ below                      │  │
│  │ Used after      ₹4,000.00  │  │
│  │ Support · 20-08-2026       │  │
│  └────────────────────────────┘  │
│  ┌────────────────────────────┐  │
│  │ Correction       −₹250.00  │  │
│  │ Used after      ₹3,750.00  │  │
│  │ "Buyer paid ₹250 short at  │  │
│  │  Karavadi, written off"    │  │
│  │ Support · 20-08-2026       │  │
│  └────────────────────────────┘  │
```

`adjustment` and `reversal` always carry a `reason`, and it is shown verbatim in quotes. A correction a merchant cannot read the reason for is indistinguishable from an error.

**Empty**

```
┌──────────────────────────────────┐
│  ←  Credit ledger      🔊    [👤]  │
├──────────────────────────────────┤
│                                  │
│             [ 💳 ]                │
│                                  │
│    Nothing on your credit yet    │
│  Your first bulk order on credit │
│  will show up here.              │
│                                  │
│      [ Place bulk order ]        │
│                                  │
└──────────────────────────────────┘
```

**Actions**


| Control          | Result                                                                        |
| ---------------- | ------------------------------------------------------------------------------ |
| Row with an order | Opens `MER-08` for that `merchantOrderId`                                     |
| Report a problem  | `raiseCashDiscrepancy` against the row's `custodyTransferId` and the driver named on it |
| Load more         | Pages 20 rows at a time, per the Foundations list budget                      |
| Pull to refresh   | Re-reads the ledger and the scalars together, so they cannot disagree          |

**States.** Loading shows three skeleton rows in the shape of a ledger card. Empty is drawn above and points at the action that would create a first entry. Offline serves the cached page with the standard banner and hides `[ Load more ]`, since the next page is a server read; the rows already on the device stay readable, which is the point of keeping a ledger at all. Stale marks the header scalars `[cached]`. Queued and disabled do not apply — the screen is read-only apart from `[ Report a problem ]`, which is blocked offline with its reason. Error is the screen-level banner with a retry. A merchant reading another merchant's ledger gets the not-allowed page.

### MER-09.4 Offline authorisation codes

`issueOfflineCodeBatch` issues the merchant a sheet of single-use codes. Without it a merchant in a village with no signal cannot authorise a driver to take cash, because the live code the driver would normally check cannot reach anybody. The plaintext codes are returned once and held on this device; the server keeps only salted hashes, so this screen is the sheet.

A merchant holds **two** sheets, one per purpose, and the screen opens on whichever the merchant last used. `purpose: "credit_repayment"` authorises a driver to take cash; `purpose: "bulk_order_handover"` confirms the merchant received a bulk order. They are separate sheets because a code overheard while paying a driver must not be usable to sign for stock that never arrived, and one sheet serving both would make exactly that swap possible. Issuing a new sheet revokes only the sheet of the same purpose, so replacing the payment codes does not strand the goods-receipt codes.

**Data** — CreditProfile is not read here. `VerificationCodeBatches` is denied to every client; plaintext lives only on this device.

| Shown | Source |
| ----- | ------ |
| Code list, counters, issued / expiry, remaining | `local` — `issueOfflineCodeBatch` response, persisted on device |
| Purpose radio | `local` — last-used purpose; two sheets, never one |

| Control | On click |
| ------- | -------- |
| Purpose radio | `local` — swap the cached sheet |
| Get new codes | `Fn issueOfflineCodeBatch` `{ purpose }` — revokes only that purpose's live batch. Disabled offline. |
| Print or share | `local` Web Share / print of unused codes |
| Load more | `local` page of the batch already on the device |
| Row | `—` display-only; a code is never copyable |

```
┌──────────────────────────────────┐
│  ←  Offline codes      🔊    [👤]  │
├──────────────────────────────────┤
│  For paying a driver when there  │
│  is no network. Read out the     │
│  next unused code and the        │
│  number beside it.               │
│                                  │
│  Issued 21-08-2026               │
│  Stops working 20-09-2026        │
│  14 of 20 left                   │
├──────────────────────────────────┤
│  01   4 8 2 9 0 1    used 18-08  │
│  02   7 3 1 6 5 2    used 19-08  │
│  03   9 0 4 4 8 7    used 20-08  │
│  04   2 6 8 1 3 5    used 21-08  │
│  05   5 1 9 7 2 0    used 21-08  │
│  06   8 4 0 3 6 9    used 21-08  │
│  07   1 7 5 2 9 4    ready       │
│  08   6 2 3 8 0 1    ready       │
│  09   3 9 7 1 4 6    ready       │
│  10   0 5 2 6 8 3    ready       │
│                                  │
│  [ Load more ]                   │
├──────────────────────────────────┤
│  Each code works once only.      │
│  New codes cancel these ones.    │
│                                  │
│  [ Get new codes ]               │
│  [ Print or share ]              │
└──────────────────────────────────┘
```

The counter is as important as the code and is read out with it, because the driver's device cannot know which line of the sheet is being read. A used counter that arrives a second time fails as `CODE_REPLAYED`, which is what stops a code overheard at one handover from being replayed against a larger one. The single-use rule is stated on the sheet in plain words rather than left to be discovered: a merchant who reads out line 07 twice will otherwise believe the app lost their payment.

**Get new codes**

```
┌──────────────────────────────────┐
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│  Get new codes?           [ X ]  │
│                                  │
│  Your 14 unused codes stop       │
│  working straight away. Throw    │
│  away any sheet you printed.     │
│                                  │
│  You see the new codes once.     │
│  Print or save them before you   │
│  leave this screen.              │
│                                  │
│  [ Cancel ]    [ Get new codes ] │
└──────────────────────────────────┘
```

**Codes for taking in stock**

```
│  Which codes?                    │
│                                  │
│  ○ Paying a driver      14 left  │
│  ● Taking in stock      20 left  │
│                                  │
│  Read out the next unused code   │
│  when the driver hands over an    │
│  order and there is no network.   │
```

The sheet below the switch is drawn identically; only the heading and the purpose change. The switch is a radio rather than a tab because the merchant must be able to see, before reading anything out, which sheet they are on — reading a payment code to a driver delivering stock burns a code and authorises nothing.

**All used up**

```
│  ⚠ All 20 codes have been used   │
│    Get a new sheet before your   │
│    next delivery day, or you     │
│    cannot pay a driver without   │
│    a network.                    │
│                                  │
│  [ Get new codes ]               │
```

**Past its date**

```
│  ⚠ These codes stopped working   │
│    on 20-09-2026                 │
│    A sheet lasts 30 days. The    │
│    driver will be told the code  │
│    has expired.                  │
│                                  │
│  [ Get new codes ]               │
```

**Actions**


| Control        | Result                                                                          |
| -------------- | -------------------------------------------------------------------------------- |
| Get new codes  | `issueOfflineCodeBatch` with `purpose: "credit_repayment"`; revokes the live batch |
| Print or share | Renders the unused codes to a printable sheet through the Web Share API, print fallback |
| Load more      | Pages the list; the whole batch is on the device, so it never waits on a read     |
| Row            | Read-only; a code is never copyable, because a copied code is a code that travels |

**States.** Loading does not apply: the codes were written to the device when the batch was issued and are read locally. Empty is a merchant who has never asked for a sheet, and it says what the sheet is for beside `[ Get new codes ]` rather than showing an empty list. Offline is the state the screen was built for, and it changes nothing about the list — but `[ Get new codes ]` is disabled with "Needs an internet connection", which is the reason to fetch a sheet before leaving for the day rather than when it is needed. Exhausted and expired are drawn above and both keep the list visible so a merchant can see what happened. Stale does not apply; a used counter is used forever. Queued does not apply. Error on issue follows the Patterns mapping.

### MER-10 Credit increase request and status

**Data**

| Shown | Source |
| ----- | ------ |
| Current limit / resulting-limit hint | `FS get /CreditProfiles/{uid}` → `creditLimit` |
| Request cards | `FS query CreditIncreaseRequests` where `merchantId == uid` |
| Amount / reason fields | `local` until Submit |
| Managing supplier name | `FS get /UserProfiles/{profile.supplierId}` |

| Control | On click |
| ------- | -------- |
| Amount / reason | `local` — `requestedAmount` is the increment, not a target limit |
| Submit request | `Fn requestCreditIncrease` `{ requestedAmount, reason }`. `DUPLICATE_PENDING_REQUEST` points at the open card. |

**Request sheet**

```
┌──────────────────────────────────┐
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│  Request credit increase         │
│                                  │
│  Current limit        ₹50,000    │
│                                  │
│  Additional credit needed        │
│  ┌────────────────────────────┐  │
│  │ ₹ 25,000                   │  │
│  └────────────────────────────┘  │
│  New limit would be ₹75,000      │
│                                  │
│  Reason                          │
│  ┌────────────────────────────┐  │
│  │ Peak festival demand in    │  │
│  │ September.                 │  │
│  └────────────────────────────┘  │
│                                  │
│  Goes to Kranthi Kumar for       │
│  approval.                       │
│                                  │
│  [  Submit request  ]            │
└──────────────────────────────────┘
```

**Request status** — previously a merchant submitted a request and never heard back inside the app.

```
┌──────────────────────────────────┐
│  ←  Credit requests              │
├──────────────────────────────────┤
│  ┌────────────────────────────┐  │
│  │ +₹25,000 requested         │  │
│  │ ○ Awaiting Kranthi Kumar   │  │
│  │ Sent 21-08-2026            │  │
│  │ "Peak festival demand…"    │  │
│  └────────────────────────────┘  │
│  ┌────────────────────────────┐  │
│  │ +₹50,000 requested         │  │
│  │ ✔ Approved +₹50,000        │  │
│  │ 02-08-2026 by Kranthi K.   │  │
│  └────────────────────────────┘  │
│  ┌────────────────────────────┐  │
│  │ +₹40,000 requested         │  │
│  │ ✖ Declined                 │  │
│  │ 20-07-2026 · "Clear the    │  │
│  │ current dues first."       │  │
│  └────────────────────────────┘  │
└──────────────────────────────────┘
```

**Actions:** Submit calls `requestCreditIncrease`. `requestedAmount` is the *additional* credit sought, not a target limit, so the sheet asks for the increment and computes the resulting limit as a read-only hint; the status cards carry a `+` prefix for the same reason. A second submission while one is open returns `DUPLICATE_PENDING_REQUEST`, surfaced as an inline message pointing at the open request rather than a bare toast. Approval and decline are pushed via FCM and land on this screen. `reviewCreditIncreaseRequest` records the supplier's decision and applies the approved delta to `creditLimit` in the same transaction — an approval may be for less than was asked, which is why the approved figure is shown separately from the requested one.

---

## Shop and subscription

### MER-11 Shop settings

`shopDetails`, `gstin` and `villageId` were captured once at setup and then permanently uneditable, even though the shop address and GSTIN both appear on every invoice raised against this merchant.

**Data**

| Shown | Source |
| ----- | ------ |
| Shop name, address, GSTIN, phone | `FS get /UserProfiles/{uid}` → `name`, `address` / `shopDetails`, `gstin`, `contactInfo` |
| Village picker | `Fn listConfigurationCatalog` — active records; cascade filters client-side |
| Managing supplier | same profile get → `supplierId`, then `FS get /UserProfiles/{supplierId}` — display only |

| Control | On click |
| ------- | -------- |
| Fields / village | `local` until Save |
| Save | `Fn updateUserProfile` `{ name, address, shopDetails, gstin, contactInfo, villageId }` |

```
┌──────────────────────────────────┐
│  ←  Shop settings                │
├──────────────────────────────────┤
│  Shop name                       │
│  ┌────────────────────────────┐  │
│  │ Sri Lakshmi Stores         │  │
│  └────────────────────────────┘  │
│                                  │
│  Shop address (billing)          │
│  ┌────────────────────────────┐  │
│  │ Karavadi Road, Karavadi,   │  │
│  │ Prakasam, AP 523182        │  │
│  └────────────────────────────┘  │
│                                  │
│  GSTIN                           │
│  ┌────────────────────────────┐  │
│  │ 37BBBMK1234B1Z2            │  │
│  └────────────────────────────┘  │
│  ✔ Valid 15-character format     │
│                                  │
│  Shop phone                      │
│  ┌────────────────────────────┐  │
│  │ +91 98765 12345            │  │
│  └────────────────────────────┘  │
│                                  │
│  Village          [ Karavadi ▾]  │
│  Managing supplier               │
│  Kranthi Kumar · fixed           │
│                                  │
│  Changes apply to invoices       │
│  raised after saving. Past       │
│  invoices are never rewritten.   │
│                                  │
│  [  Save  ]                      │
└──────────────────────────────────┘
```

**Actions:** Save calls `updateUserProfile`. GSTIN is validated for format only, client-side; the authoritative check happens server-side at order time. The closing note matters for compliance: a tax invoice is immutable once issued.

### MER-12 Platform subscription

`SubscriberRole` includes `merchant`, `subscribeToPlan` permits merchant callers, `assignSubscription` accepts merchant subscribers, and the Support plan editor offers a Merchant target role. None of that was reachable from the merchant's three-tab navigation. It lives under the avatar menu rather than taking a fourth tab, since the bottom nav is reserved for business tasks.

**Data**

| Shown | Source |
| ----- | ------ |
| Current plan card | `FS get /UserProfiles/{uid}` → `activeSubscriptionId`, then `FS get /PlatformSubscriptions/{id}` |
| Included / locked rows | `Fn getEntitlements` |
| Plan comparison / tariffs | `Fn listConfigurationCatalog` — `targetRole == "merchant"` only |
| Billing history | `FS query SubscriptionInvoices` where `subscriberId == uid` |
| Change-plan preview totals | `Fn previewPlanChange` |
| Past-due / no-subscription copy | same subscription get — states, not extra queries |

| Control | On click |
| ------- | -------- |
| Compare plans / View plans / Change plan | `local` sheet; prices from catalog + `Fn previewPlanChange` |
| Billing cycle / offer code / Apply | `local` until pay; Apply re-runs `Fn previewPlanChange` |
| Upgrade and pay / first subscribe | `Fn subscribeToPlan` or `Fn changeSubscriptionPlan`, then `Fn createPaymentIntent` and `Fn processPayment`. Blocked offline. |
| Retry payment | `Fn createPaymentIntent` then `Fn processPayment` |
| Cancel subscription | `Fn cancelSubscription` — entitlement lasts until `currentPeriodEnd` |
| Billing history | `local` expand of the invoice query |

```
┌──────────────────────────────────┐
│  ←  My plan                      │
├──────────────────────────────────┤
│  ┌────────────────────────────┐  │
│  │ Merchant Basic             │  │
│  │ ✔ active                   │  │
│  │ Monthly INR · ₹499 + GST   │  │
│  │ Renews 01-09-2026          │  │
│  └────────────────────────────┘  │
│                                  │
│  Included                        │
│  ✔ Buyer pickup management       │
│  ✔ Bulk ordering on credit       │
│  ✔ Tax invoices                  │
│  ✔ Payment history and statement │
│                                  │
│  Finance tools                   │
│  ✔ Credit balance and dues       │
│  ✔ Receipts and credit notes     │
│  🔒 Ageing and repayment          │
│     allocation                   │
│  🔒 Cash flow and supplier spend  │
│  🔒 CSV and PDF exports           │
│  [ Compare plans ]               │
│                                  │
│  [ Change plan ]                 │
│  [ Billing history ]             │
│  [ Cancel subscription ]         │
└──────────────────────────────────┘
```

**Past due state**

```
│  ┌────────────────────────────┐  │
│  │ Merchant Basic             │  │
│  │ ⚠ past_due                 │  │
│  │ Payment failed 01-09-2026  │  │
│  │ INV-SUB-2609-0512          │  │
│  │        [ Retry payment ]   │  │
│  └────────────────────────────┘  │
│                                  │
│  ⚠ Bulk ordering is paused until │
│    payment clears.               │
│                                  │
│  You can still repay credit,     │
│  see your dues, and open every   │
│  invoice and receipt.            │
```

**No subscription state**

```
┌──────────────────────────────────┐
│  ←  My plan                      │
├──────────────────────────────────┤
│  ⚠ No active subscription        │
│                                  │
│  Ask Support to assign a plan,   │
│  or choose one below.            │
│                                  │
│  [ View plans ]                  │
└──────────────────────────────────┘
```

**Plan comparison**

```
┌──────────────────────────────────┐
│  ←  Merchant plans        [👤]    │
├──────────────────────────────────┤
│  Billing  [ Monthly ] [ Annual ] │
├──────────────────────────────────┤
│  In every plan, always           │
│  ✔ Credit balance and dues       │
│  ✔ Repay credit, by UPI or cash  │
│  ✔ Bulk order payments           │
│  ✔ Receipts, invoices, credit    │
│    notes                         │
│  ✔ Payment history and statement │
│  ✔ Your subscription bills       │
├──────────────────────────────────┤
│              Basic  Fin.   Pro   │
│  ₹ / month     499  1,499  3,499 │
│                                  │
│  What I owe,     ✖     ✔     ✔   │
│    by age                        │
│  Which bills my  ✖     ✔     ✔   │
│    payments went                 │
│    against                       │
│  Cash flow       ✖     ✔     ✔   │
│  Supplier spend  ✖     ✔     ✔   │
│  Any date range  ✖     ✔     ✔   │
│  CSV / PDF       ✖    10    50   │
│    exports / mo                  │
│  Scheduled       ✖     ✖     5   │
│    reports                       │
│  GST purchase    ✖     ✖     ✔   │
│    pack                          │
│  UPI, credit     ✖     ✖     ✔   │
│    and cash tie-up               │
│  History kept   12m   36m    96m │
├──────────────────────────────────┤
│  Prices exclude GST.             │
│  [ Choose Merchant Finance ]     │
└──────────────────────────────────┘
```

**Change plan sheet**

```
┌──────────────────────────────────┐
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│  Move to Merchant Finance        │
│                                  │
│  Tariff [ Monthly INR        ▾]  │
│                                  │
│  Offer code                      │
│  ┌──────────────┐ [ Apply ]      │
│  │ LOGIKLAUNCH50│                │
│  └──────────────┘                │
│  ✔ 50% off first period          │
│                                  │
│  Merchant Finance     ₹1,499     │
│  Unused Basic          −₹166     │
│  Discount              −₹666     │
│  GST 18%                ₹120     │
│  Pay now                ₹787     │
│                                  │
│  Then ₹1,769 from 01-09-2026     │
│                                  │
│  You get straight away           │
│  + What I owe, by age            │
│  + Repayment allocation          │
│  + Cash flow and supplier spend  │
│  + 10 exports a month            │
│                                  │
│  Starts when the payment clears. │
│                                  │
│  [  Upgrade and pay ₹787  ]      │
└──────────────────────────────────┘
```

**Actions:** a first subscription calls `subscribeToPlan`; a change calls `previewPlanChange` and then `changeSubscriptionPlan`. Only plans whose `targetRole` is `merchant` are listed, and Support cannot assign a supplier plan to a merchant. An invalid or ineligible code returns `INVALID_DISCOUNT` and is shown inline under the field. Cancel subscription calls `cancelSubscription`, which keeps entitlement until `currentPeriodEnd`.

**A merchant's own credit position is never a paid feature.** The balance, the dues, the repayment path, and every receipt and credit note stay available on the cheapest plan and after cancellation. This is not generosity: a merchant owes the supplier money, and a platform that obscures the amount owed while continuing to accrue it has manufactured a dispute it will then have to arbitrate. What Finance and Pro sell is the analysis a merchant would otherwise do by hand — which bills a payment was applied to, what is thirty days late, what next month's outflow looks like — and the formats an accountant will accept.

**Downgrade and cancellation hide depth, not records.** Dropping from Pro to Basic narrows the report history from 96 months to 12 and withdraws the exports; the underlying transactions, invoices and credit notes are retained for the statutory period regardless, and moving back up restores visibility rather than rebuilding data. The downgrade sheet states this in those words, because the fear it addresses — "will I lose my records" — is the reason merchants stay on plans they do not need.

---

## End-to-end flows

### Buyer pickup handover

```
Gigs → gig card → Pickups list
  → wait for reached_merchant (driver geofence + FCM)
  → Pickup detail → Hand over → buyer reads out their code
  → markOrderDelivered → Done tab
```

### Bulk order on credit

```
Gigs → Place bulk order → catalog → Review
  → Credit selected (managing supplier only)
  → placeMerchantOrder → Orders / My bulk
  → Reached → Handover code read out to the driver
  → updateMerchantOrderStatus → delivered
  → Credit → payment due → Pay now
  → createPaymentIntent → processPayment
```

### Paying credit back in cash

```
Driver asks (initiateCreditRepayment) → FCM
  → Credit → Show my code → count the notes
  → read the code out to the driver
  → driver calls confirmCreditRepayment
  → credit relieved now · ⏳ With driver
  → supplier confirms settlement → hourglass clears
```

### Opening a credit line

```
Credit (zero state) → Request credit line
  → requestCreditIncrease
  → supplier reviews (reviewCreditIncreaseRequest)
  → setMerchantCreditLimit applies the limit
  → FCM → Credit requests shows Approved
```
