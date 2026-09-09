# Supplier wireframes

**Nav:** Dashboard · Gigs · Inventory · Finance

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


Suppliers cannot self-register. Support creates the account; first login lands on this setup. Shared login / OTP / profile: [Shared.md](Shared.md).

Every screen below must also satisfy the loading, empty, error, offline, queued and disabled states defined in [Patterns.md](Patterns.md), and must carry the **Data** block from [Patterns.md](Patterns.md) §1A (what Firestore paints, what each control calls). Only the supplier-specific variants are drawn here. Header chrome (`🔊` `🔔` `👤`) is specified once in that section and is not repeated.

---

## Screen index

| ID | Screen |
| -- | ------ |
| `SUP-01` | Supplier first-run setup |
| `SUP-01.1` | Business settings |
| `SUP-02` | Dashboard and network |
| `SUP-02.1` | Convert buyer to role |
| `SUP-03` | Villages |
| `SUP-03.1` | Request new village |
| `SUP-04` | Merchants |
| `SUP-04.1` | Merchant detail |
| `SUP-04.2` | Set credit limit |
| `SUP-04.3` | Credit increase requests |
| `SUP-04.4` | Disassociate merchant |
| `SUP-04.5` | Merchant credit ledger |
| `SUP-05` | Drivers |
| `SUP-05.1` | Driver detail |
| `SUP-05.2` | Payout requests |
| `SUP-05.3` | Payout transaction detail |
| `SUP-06` | Inventory |
| `SUP-06.1` | Add / edit product |
| `SUP-06.2` | Discounts |
| `SUP-07` | Routes |
| `SUP-07.1` | Route builder |
| `SUP-08` | Pamphlets |
| `SUP-08.1` | Pamphlet builder |
| `SUP-09` | Gig composer |
| `SUP-10` | Gigs list |
| `SUP-10.1` | Gig detail |
| `SUP-10.2` | Suspend gig |
| `SUP-10.3` | Reassign driver |
| `SUP-11` | Orders |
| `SUP-11.1` | Order detail and invoice |
| `SUP-12` | Financial report |
| `SUP-13` | Finance and subscription |
| `SUP-14` | AI assistant workspace |
| `SUP-15` | Plan comparison |
| `SUP-16` | Cash and settlements |
| `SUP-16.1` | Confirm driver settlement |
| `SUP-16.2` | Settlement variance |
| `SUP-16.3` | Authorise verification fallback |

---

## A note on the create affordance

The previous revision defined the dashboard FAB as "a shortcut to add a product, route or gig based on the last tab visited". A control whose action depends on invisible prior state is unpredictable, and on this role it could create three different record types. The FAB now opens a labelled create menu instead, so the action is always legible before it is taken.

```
┌──────────────────────────────────┐
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│  Create new                 [ X ]│
│                                  │
│  [ 📦 Product        ]            │
│  [ 🏷 Discount       ]            │
│  [ 🗺 Route          ]            │
│  [ 📰 Pamphlet       ]            │
│  [ 🚚 Gig            ]            │
│                                  │
│  [ ✨ Ask AI to do it ]           │
└──────────────────────────────────┘
```

Entries the active plan has exhausted are shown disabled with the reason inline, rather than failing with `PLAN_LIMIT_EXCEEDED` after the form has been filled in.

---

## Setup and settings

### SUP-01 Supplier first-run setup

**Data**

| Shown | Source |
| ----- | ------ |
| Country / State / District pickers | `Fn listConfigurationCatalog` — active records only; cascade `local` |
| HQ, address, GSTIN | `FS get /UserProfiles/{uid}` then `local` draft |
| No-subscription banner | same get → `activeSubscriptionId`; `FS get /PlatformSubscriptions/{id}` |

| Control | On click |
| ------- | -------- |
| Pickers / fields | `local` until Continue |
| View plans | `nav SUP-15` |
| Continue | `Fn updateUserProfile` `{ address, location, gstin }` then `nav SUP-02` — disabled until a subscription is active |

```
┌──────────────────────────────────┐
│  Supplier setup        🔊  [👤]    │
├──────────────────────────────────┤
│  ⚠ No active subscription        │
│    Ask Support to assign a plan  │
│    or subscribe below.           │
├──────────────────────────────────┤
│  Country        [ India      ▾]  │
│  State          [ Andhra Pr. ▾]  │
│  District       [ Prakasam   ▾]  │
│                                  │
│  HQ location                     │
│  ┌────────────────────────────┐  │
│  │ Ongole Hub Headquarters    │  │
│  └────────────────────────────┘  │
│                                  │
│  Registered address              │
│  ┌────────────────────────────┐  │
│  │ 12-4 Trunk Road, Ongole,   │  │
│  │ Prakasam, AP 523001        │  │
│  └────────────────────────────┘  │
│                                  │
│  GSTIN                           │
│  ┌────────────────────────────┐  │
│  │ 37AAALK2341A1Z0            │  │
│  └────────────────────────────┘  │
│  ⚠ Required before any order can │
│    raise a tax invoice.          │
│                                  │
│  [ View plans ]   [ Continue ]   │
└──────────────────────────────────┘
```

**Actions:** View plans → `SUP-15`. Continue is enabled once a subscription is active; otherwise it explains what is missing. A missing GSTIN does not block setup, but `placeOrder` and `placeMerchantOrder` both throw `INVALID_STATE` without it, so the warning is stated here rather than discovered at a buyer's checkout.

### SUP-01.1 Business settings

HQ, address and GSTIN were captured once and then unreachable, although all three are printed on every invoice.

**Data**

| Shown | Source |
| ----- | ------ |
| Name, GSTIN, address, HQ | `FS get /UserProfiles/{uid}` |
| Place of supply | `local` from HQ state |
| Driver pay rates | `FS get /UserProfiles/{uid}` → `driverPay` |

| Control | On click |
| ------- | -------- |
| Fields | `local` until Save |
| Save | `Fn updateUserProfile` `{ name, address, location, gstin }` then `Fn updateDriverPayRates` |

```
┌──────────────────────────────────┐
│  ←  Business settings            │
├──────────────────────────────────┤
│  Business name                   │
│  ┌────────────────────────────┐  │
│  │ Kranthi Kumar Logistics    │  │
│  └────────────────────────────┘  │
│                                  │
│  GSTIN                           │
│  ┌────────────────────────────┐  │
│  │ 37AAALK2341A1Z0            │  │
│  └────────────────────────────┘  │
│  ✔ Valid 15-character format     │
│                                  │
│  Registered address (invoice)    │
│  ┌────────────────────────────┐  │
│  │ 12-4 Trunk Road, Ongole    │  │
│  └────────────────────────────┘  │
│                                  │
│  HQ           [ Ongole Hub HQ ▾] │
│  Place of supply                 │
│  Andhra Pradesh · from HQ state  │
│                                  │
│  Driver pay rates                │
│  Base per gig      [ 800     ]   │
│  Per km            [ 6       ]   │
│  Per buyer order   [ 40      ]   │
│  Per bulk order    [ 58      ]   │
│                                  │
│  Past invoices are never         │
│  rewritten when these change.    │
│                                  │
│  [  Save  ]                      │
└──────────────────────────────────┘
```

Driver pay rates live here because `completeAndFinalizeGig` computes driver earnings from a base rate and delivery milestones, and those figures are itemised to the driver on `DRV-07.1`.

---

## Dashboard and network

### SUP-02 Dashboard and network

**Data**

| Shown | Source |
| ----- | ------ |
| Plan name / renews | `FS get /UserProfiles/{uid}` → `activeSubscriptionId`; `FS get /PlatformSubscriptions/{id}` |
| Usage bars | `local` counts from the queries below vs plan caps on that subscription |
| Credit-request cards | `FS query CreditIncreaseRequests` for this supplier's merchant ids (no `supplierId` on the doc) |
| Payout-request cards | `FS query DriverEarnings` where `supplierId == uid` → pending `payoutRequests[]` |
| Low-stock cards | `FS query Products` where `supplierId == uid` — `local` filter on `stock` |
| Settlement cards | `FS query CashSettlements` where `supplierId == uid` and `status` in `pending`, `declared` |
| Network chips | `FS query UserProfiles` where `supplierId == uid`, split by `role` |
| Buyer cards | same buyer slice; order count / ₹ is `local` over gigs (Order has no `supplierId`) |
| Top 3 routes (desktop) | `FS query Routes` where `supplierId == uid`; `FS query Gigs` where `supplierId == uid`; rank is `local` — not a Function |

| Control | On click |
| ------- | -------- |
| Review (credit) | `nav SUP-04.3` |
| Review (payout) | `nav SUP-05.2` |
| View (stock) | `nav SUP-06` |
| Confirm (settlement) | `nav SUP-16.1` |
| Villages / Merchants / Drivers | `nav SUP-03` / `SUP-04` / `SUP-05` |
| → Merchant / → Driver | `nav SUP-02.1` with `buyerId` |
| Create pamphlet | `nav SUP-08` with `routeId` |
| Add a route | `nav SUP-07.1` |
| `+` create menu | `local` then `nav` the chosen builder |
| Pull to refresh | re-run Shown reads, bypass TTL |

```
┌──────────────────────────────────┐
│  Dashboard     🔊   🔔    [👤]      │
│  Growth · renews 01-09-2026      │
├──────────────────────────────────┤
│  Plan usage                      │
│  Hubs      1/5   ██░░░░░░░░      │
│  Routes   12/20  ██████░░░░      │
│  Gigs   142/200  ███████░░░      │
│  Merchants 3/50  █░░░░░░░░░      │
│  Drivers   2/25  █░░░░░░░░░      │
├──────────────────────────────────┤
│  Needs your attention            │
│  ┌────────────────────────────┐  │
│  │ ⚠ 2 credit requests        │  │
│  │ ₹75,000 and ₹20,000        │  │
│  │                 [ Review ] │  │
│  └────────────────────────────┘  │
│  ┌────────────────────────────┐  │
│  │ ⚠ 1 payout request         │  │
│  │ Hari · ₹2,000              │  │
│  │                 [ Review ] │  │
│  └────────────────────────────┘  │
│  ┌────────────────────────────┐  │
│  │ ⚠ 3 low stock items        │  │
│  │                 [ View ]   │  │
│  └────────────────────────────┘  │
│  ┌────────────────────────────┐  │
│  │ ⚠ 1 settlement open 2 days │  │
│  │ Hari · ₹8,450.00           │  │
│  │               [ Confirm ]  │  │
│  └────────────────────────────┘  │
├──────────────────────────────────┤
│  My network                      │
│  [ Villages 5 ] [ Merchants 3 ]  │
│  [ Drivers 2  ] [ Buyers 41   ]  │
├──────────────────────────────────┤
│  Approved buyers                 │
│  ┌────────────────────────────┐  │
│  │ Anil Kumar · Karavadi      │  │
│  │ 12 orders · ₹18,400        │  │
│  │ [ → Merchant ] [ → Driver ]│  │
│  └────────────────────────────┘  │
│  ┌────────────────────────────┐  │
│  │ Bala Krishna · Koppolu     │  │
│  │ 4 orders · ₹3,120          │  │
│  │ [ → Merchant ] [ → Driver ]│  │
│  └────────────────────────────┘  │
│                          [ + ]   │
├──────────────────────────────────┤
│[Dashboard][Gigs][Inventory][Fin.]│
└──────────────────────────────────┘
```

The attention block exists because credit requests, payout requests and low stock were all previously buried at the bottom of the Finance tab or absent entirely. These are the items that block other people's work. An ageing settlement earns a card on the same test: until it closes, the driver holding that cash cannot be paid, and it opens `SUP-16.1` directly.

### SUP-02.1 Convert buyer to role

**Data**

| Shown | Source |
| ----- | ------ |
| Name, village, since | `FS get /UserProfiles/{buyerId}` |
| Order count / ₹ | same `local` aggregate as `SUP-02` |
| Slot copy / limit sheet | `FS get /PlatformSubscriptions/{id}` plus `SUP-02` network counts |

| Control | On click |
| ------- | -------- |
| Role radios | `local` |
| Convert | `Fn convertBuyerToRole` |
| Compare plans | `nav SUP-15` |
| Convert to driver instead | `local` role = vehicle, then same Convert |
| Cancel | dismiss sheet |

```
┌──────────────────────────────────┐
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│  Upgrade Anil Kumar              │
│                                  │
│  Karavadi · buyer since 02-2026  │
│  12 orders · ₹18,400             │
│                                  │
│  (•) Merchant                    │
│      Runs a shop, accepts buyer  │
│      pickups, can buy on credit  │
│      Uses 1 of 47 merchant slots │
│                                  │
│  ( ) Vehicle (driver)            │
│      Drives gigs and delivers    │
│      Uses 1 of 23 driver slots   │
│                                  │
│  Approved instantly. Roles       │
│  cannot be changed afterwards.   │
│                                  │
│  [ Cancel ]      [ Convert ]     │
└──────────────────────────────────┘
```

**Plan limit reached**

```
┌──────────────────────────────────┐
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│  Merchant limit reached          │
│                                  │
│  Growth allows 50 merchants and  │
│  you have 50.                    │
│                                  │
│  [ Compare plans ]               │
│  [ Convert to driver instead ]   │
│  [ Cancel ]                      │
└──────────────────────────────────┘
```

**Actions:** Convert calls `convertBuyerToRole`, which provisions an empty `CreditProfile` for a merchant or an empty `DriverEarnings` for a driver. `PLAN_LIMIT_EXCEEDED` raises the sheet above. The irreversibility warning is stated before the action, not after.

---

## Network management

### SUP-03 Villages

**Data**

| Shown | Source |
| ----- | ------ |
| Village cards | `FS query Routes` where `supplierId == uid` → distinct `villages[].villageId`; `FS get /Villages/{id}` |
| Merchant / buyer counts | `FS query UserProfiles` where `supplierId == uid`, grouped by `villageId` |
| On N routes | `local` from the Routes query |

| Control | On click |
| ------- | -------- |
| Search | `local` filter |
| Village card | `—` |
| Request new village | `nav SUP-03.1` |

```
┌──────────────────────────────────┐
│  ←  Villages              [👤]    │
│     Prakasam Central Hub         │
├──────────────────────────────────┤
│  ┌────────────────────────────┐  │
│  │ 🔍 Search villages         │   │
│  └────────────────────────────┘  │
├──────────────────────────────────┤
│  ┌────────────────────────────┐  │
│  │ Karavadi · 523182          │  │
│  │ 1 merchant · 18 buyers     │  │
│  │ On 3 routes                │  │
│  └────────────────────────────┘  │
│  ┌────────────────────────────┐  │
│  │ Koppolu · 523261           │  │
│  │ 1 merchant · 12 buyers     │  │
│  │ On 2 routes                │  │
│  └────────────────────────────┘  │
│  ┌────────────────────────────┐  │
│  │ Madhavaram · 523264        │  │
│  │ ⚠ No merchant              │  │
│  │ 6 buyers wait for pickup   │  │
│  └────────────────────────────┘  │
├──────────────────────────────────┤
│  [ Request new village ]         │
└──────────────────────────────────┘
```

A village with no merchant is called out, because buyers there see the "ask your supplier" empty state on `BUY-04.1` and cannot transact at all.

### SUP-03.1 Request new village

The button existed with no destination and no endpoint. It now creates a `VillageRequest` that Support actions from their queue.

**Data**

| Shown | Source |
| ----- | ------ |
| Hub picker | `cache` of `listConfigurationCatalog` from `SUP-01` |
| Name, pincode, mandal, why | `local` draft |
| Prior request status | `FS query VillageRequests` where `requestedBy == uid` |

| Control | On click |
| ------- | -------- |
| Fields | `local` |
| Send request | `Fn requestVillage` |

```
┌──────────────────────────────────┐
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│  Request a new village           │
│                                  │
│  Hub            [ Prakasam C ▾]  │
│                                  │
│  Village name                    │
│  ┌────────────────────────────┐  │
│  │ Cherukuru                  │  │
│  └────────────────────────────┘  │
│  Pincode                         │
│  ┌────────────────────────────┐  │
│  │ 523168                     │  │
│  └────────────────────────────┘  │
│  Mandal / panchayat              │
│  ┌────────────────────────────┐  │
│  │ Bapatla                    │  │
│  └────────────────────────────┘  │
│                                  │
│  Why do you need it?             │
│  ┌────────────────────────────┐  │
│  │ 14 buyers already ask for  │  │
│  │ delivery here.             │  │
│  └────────────────────────────┘  │
│                                  │
│  Support verifies the LGD code   │
│  and adds it to your hub.        │
│                                  │
│  [  Send request  ]              │
└──────────────────────────────────┘
```

**Actions:** Send calls `requestVillage`. Status is tracked on this screen as pending, approved or declined.

### SUP-04 Merchants

**Data**

| Shown | Source |
| ----- | ------ |
| Merchant cards | `FS query UserProfiles` where `role == "merchant"`, `supplierId == uid` |
| Credit bar / overdue | `FS get /CreditProfiles/{merchantId}` per visible row |

| Control | On click |
| ------- | -------- |
| All / Credit / ⚠ chips | `local` filter |
| Merchant card | `nav SUP-04.1` |
| Credit requests | `nav SUP-04.3` |

```
┌──────────────────────────────────┐
│  ←  Merchants             [👤]    │
├──────────────────────────────────┤
│  [ All 3 ] [ Credit 2 ] [ ⚠ 1 ]  │
├──────────────────────────────────┤
│  ┌────────────────────────────┐  │
│  │ Sri Lakshmi Stores         │  │
│  │ Anil Kumar · Karavadi      │  │
│  │ Credit ₹17,098 / ₹50,000   │  │
│  │ ████░░░░░░  34%            │  │
│  │ 24 pickups this month      │  │
│  └────────────────────────────┘  │
│  ┌────────────────────────────┐  │
│  │ Village Mart               │  │
│  │ Dharma · Koppolu           │  │
│  │ ⚠ ₹4,100 overdue 3 days    │  │
│  │ No credit limit set        │  │
│  └────────────────────────────┘  │
│  ┌────────────────────────────┐  │
│  │ Devi Provisions            │  │
│  │ Latha · Madhavaram         │  │
│  │ Credit not opened          │  │
│  │                            │  │
│  └────────────────────────────┘  │
├──────────────────────────────────┤
│  [ Credit requests 2 ]           │
└──────────────────────────────────┘
```

### SUP-04.1 Merchant detail

**Data**

| Shown | Source |
| ----- | ------ |
| Name, phone, address, GSTIN | `FS get /UserProfiles/{merchantId}` |
| Credit scalars | `FS get /CreditProfiles/{merchantId}` |
| Activity / open orders | `FS query MerchantOrders` where `merchantId` matches, last 30d; buyer pickups via that merchant's `Orders` on this supplier's gigs |

| Control | On click |
| ------- | -------- |
| Call | `tel:` merchant `contactInfo` |
| Change credit limit | `nav SUP-04.2` |
| View orders | `nav SUP-11` |
| Disassociate merchant | `nav SUP-04.4` |

```
┌──────────────────────────────────┐
│  ←  Sri Lakshmi Stores    [👤]    │
├──────────────────────────────────┤
│  Anil Kumar                      │
│  +91 98765 43210                 │
│  Karavadi Road, Karavadi         │
│  GSTIN 37BBBMK1234B1Z2           │
│                   [ 📞 Call ]     │
├──────────────────────────────────┤
│  Credit                          │
│  Limit                ₹50,000    │
│  Used                 ₹17,098    │
│  Available            ₹32,902    │
│  [ Change credit limit ]         │
├──────────────────────────────────┤
│  Activity                        │
│  Buyer pickups (30d)       24    │
│  Bulk orders (30d)          3    │
│  Revenue (30d)        ₹41,320    │
│  On-time handover         96%    │
├──────────────────────────────────┤
│  Open orders                     │
│  MO-7781 · placed · ₹17,098      │
│  4 buyer pickups today           │
├──────────────────────────────────┤
│  [ View orders ]                 │
│  [ Disassociate merchant ]       │
└──────────────────────────────────┘
```

### SUP-04.2 Set credit limit

`convertBuyerToRole` provisions a `CreditProfile` with `creditLimit: 0`, and nothing existed to raise it. Without this screen no merchant could ever buy on credit, which made the whole credit path in `placeMerchantOrder` unreachable. Every merchant therefore starts at zero, and this screen — or an approved request on `SUP-04.3` — is the only way off it.

**Data**

| Shown | Source |
| ----- | ------ |
| Shop name, current / used | `FS get /UserProfiles/{merchantId}` + `FS get /CreditProfiles/{merchantId}` |
| New limit, chips, note | `local` |

| Control | On click |
| ------- | -------- |
| Limit chips / field / note | `local` |
| Save limit | `Fn setMerchantCreditLimit` — absolute limit, not a delta |

```
┌──────────────────────────────────┐
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│  Credit limit · Sri Lakshmi      │
│                                  │
│  Current limit        ₹50,000    │
│  Currently used       ₹17,098    │
│                                  │
│  New limit                       │
│  ┌────────────────────────────┐  │
│  │ ₹ 75,000                   │  │
│  └────────────────────────────┘  │
│  [ 25k ] [ 50k ] [ 75k ] [ 1L ]  │
│                                  │
│  ⚠ A new limit cannot be below   │
│    the ₹17,098 already used.     │
│                                  │
│  Note (visible to merchant)      │
│  ┌────────────────────────────┐  │
│  │ Raised for festival season │  │
│  └────────────────────────────┘  │
│                                  │
│  [  Save limit  ]                │
└──────────────────────────────────┘
```

**Opening a line on a merchant who has none**

```
┌──────────────────────────────────┐
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│  Credit limit · Devi Provisions  │
│                                  │
│  Current limit             ₹0    │
│  Currently used            ₹0    │
│  Credit not opened               │
│                                  │
│  New limit                       │
│  ┌────────────────────────────┐  │
│  │ ₹ 25,000                   │  │
│  └────────────────────────────┘  │
│  [ 10k ] [ 25k ] [ 50k ] [ 1L ]  │
│                                  │
│  Latha became a merchant on      │
│  12-08 and starts at ₹0. Until   │
│  a limit is set here, every bulk │
│  order she tries to put on       │
│  credit is refused.              │
│                                  │
│  Note (visible to merchant)      │
│  ┌────────────────────────────┐  │
│  │ Opening your credit line   │  │
│  └────────────────────────────┘  │
│                                  │
│  [  Save limit  ]                │
└──────────────────────────────────┘
```

**Actions:** Save calls `setMerchantCreditLimit` with the **absolute** new limit, not a delta. It recomputes `creditAvailable` in one transaction, appends a `CreditTransaction` of type `limit_change` naming the acting supplier and carrying the note as its `reason`, and notifies the merchant. A limit below `creditUsed` is rejected: drawn credit cannot be stranded outside the line that authorised it, so the floor moves as the merchant repays, not before. Every limit the merchant has ever held is readable on `SUP-04.5`.

### SUP-04.3 Credit increase requests

**Data**

| Shown | Source |
| ----- | ------ |
| Request cards | `FS query CreditIncreaseRequests` for this supplier's merchant ids |
| Now / used / overdue | `FS get /CreditProfiles/{merchantId}` + `FS get /UserProfiles/{merchantId}` |
| Approve / decline fields | `local` |

| Control | On click |
| ------- | -------- |
| Pending / Decided | `local` filter |
| Approve / Decline | `Fn reviewCreditIncreaseRequest` |
| Approve-amount / decline-reason | `local` until that Fn |

```
┌──────────────────────────────────┐
│  ←  Credit requests       [👤]    │
├──────────────────────────────────┤
│  [ Pending 2 ] [ Decided ]       │
├──────────────────────────────────┤
│  ┌────────────────────────────┐  │
│  │ Village Mart · Dharma      │  │
│  │ Wants +₹25,000             │  │
│  │ Now ₹0 · used ₹4,100       │  │
│  │ "Peak festival demand in   │  │
│  │  September."               │  │
│  │ Sent 21-08-2026            │  │
│  │                            │  │
│  │ ⚠ ₹4,100 overdue 3 days    │  │
│  │                            │  │
│  │ [ Decline ]  [ Approve ]   │  │
│  └────────────────────────────┘  │
│  ┌────────────────────────────┐  │
│  │ Sri Lakshmi · Anil Kumar   │  │
│  │ Wants +₹25,000 → ₹75,000   │  │
│  │ Now ₹50,000 · used ₹17,098 │  │
│  │ Repaid on time 6 of 6      │  │
│  │                            │  │
│  │ [ Decline ]  [ Approve ]   │  │
│  └────────────────────────────┘  │
└──────────────────────────────────┘
```

**Approve sheet**

```
┌──────────────────────────────────┐
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│  Approve for Sri Lakshmi         │
│                                  │
│  Requested           +₹25,000    │
│                                  │
│  Approve additional              │
│  ┌────────────────────────────┐  │
│  │ ₹ 25,000                   │  │
│  └────────────────────────────┘  │
│  New limit becomes ₹75,000       │
│  You can approve a lower amount. │
│                                  │
│  [  Approve  ]                   │
└──────────────────────────────────┘
```

**Decline sheet**

```
┌──────────────────────────────────┐
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│  Decline this request            │
│                                  │
│  Reason (sent to merchant)       │
│  ┌────────────────────────────┐  │
│  │ Clear the overdue ₹4,100   │  │
│  │ first, then ask again.     │  │
│  └────────────────────────────┘  │
│                                  │
│  [  Decline  ]                   │
└──────────────────────────────────┘
```

**Actions:** Both call `reviewCreditIncreaseRequest`. The amounts on this screen are *increments*, not target limits, so they carry a `+` prefix and the resulting limit is spelled out beside them — `approvedAmount` is added to `creditLimit`, `creditAvailable` is recomputed, and a `CreditTransaction` of type `limit_change` is appended carrying the `creditIncreaseRequestId` and the approving supplier, all inside the same transaction that stamps `reviewedBy` and `reviewedAt`. An approval *below* the requested increment is a first-class outcome rather than a soft decline; an approval above it is rejected, so the input is capped at what the merchant asked for. `SUP-04.2` is the separate path for setting an absolute limit without a request, and `SUP-04.5` shows both as the same kind of ledger row. The decline reason is shown to the merchant on `MER-10`.

### SUP-04.4 Disassociate merchant

The constitution specifies this edge case in detail but no screen or endpoint existed for it.

**Data**

| Shown | Source |
| ----- | ------ |
| Shop name, open work | `FS get /UserProfiles/{merchantId}`; `FS query Orders` / `MerchantOrders` still open for this merchant |
| Outstanding credit | `FS get /CreditProfiles/{merchantId}` → `creditUsed` |
| Type-to-confirm | `local` |

| Control | On click |
| ------- | -------- |
| Confirm field | `local` — must match shop name |
| Disassociate | `Fn disassociateMerchant` |
| Cancel | dismiss sheet |

```
┌──────────────────────────────────┐
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│  Disassociate Sri Lakshmi?       │
│                                  │
│  This shop stops receiving new   │
│  buyer pickups immediately.      │
│                                  │
│  Open work that will be          │
│  suspended:                      │
│  • 4 buyer pickup orders         │
│  • 1 bulk order · ₹17,098        │
│                                  │
│  Support and every affected      │
│  buyer are notified so orders    │
│  can be reassigned or cancelled. │
│                                  │
│  Outstanding credit of ₹17,098   │
│  remains payable.                │
│                                  │
│  Type the shop name to confirm   │
│  ┌────────────────────────────┐  │
│  │                            │  │
│  └────────────────────────────┘  │
│                                  │
│  [ Cancel ]   [ Disassociate ]   │
└──────────────────────────────────┘
```

**Actions:** `disassociateMerchant` cascades affected `Order` and `MerchantOrder` records to `suspended` and fans out notifications. Typed confirmation is required because the action is destructive and affects third parties.

### SUP-04.5 Merchant credit ledger

The scalars on `SUP-04.1` are a running total. This is the evidence behind them: every `CreditTransaction` on the merchant's line, oldest at the bottom, with the balance as it stood after each one. Read-only, because a balance that can be edited is not evidence.

**Data**

| Shown | Source |
| ----- | ------ |
| Limit / used / available / in-transit | `FS get /CreditProfiles/{merchantId}` |
| Ledger rows | `FS query CreditTransactions` where `merchantId` matches, `supplierId == uid`, newest first |
| Driver on in-transit | `FS get` the `"in_custody"` `CashLedgerEntry` named on the pending repayment |
| Offline | `cache` past TTL with `[cached]` on the in-flight figure |

| Control | On click |
| ------- | -------- |
| Filter chips / date range | `local` |
| Load more | next page of the same query |
| Export CSV | `Fn exportFinanceReport` `{ reportType: "credit_ledger" }` |
| Set credit limit (empty) | `nav SUP-04.2` |

```
┌──────────────────────────────────┐
│  ←  Credit ledger         [👤]    │
│     Sri Lakshmi Stores           │
├──────────────────────────────────┤
│  Limit                ₹75,000    │
│  Used                 ₹13,098    │
│  Available            ₹61,902    │
│                                  │
│  ⏳ With driver         ₹4,000    │
│  Hari · collected 04:15 PM       │
│  Her credit is already reduced.  │
│  It reaches you tonight.         │
├──────────────────────────────────┤
│  [ All 9 ][ Draws ][ Repayments ]│
│  From [ 01-08 ]  To [ 21-08 ]    │
├──────────────────────────────────┤
│  ┌────────────────────────────┐  │
│  │ Cash repayment    ₹4,000   │  │
│  │ repayment_cash · MO-7781   │  │
│  │ ⏳ With Hari · not settled  │  │
│  │ Used after       ₹13,098   │  │
│  │ 21-08-2026 04:15 PM        │  │
│  └────────────────────────────┘  │
│  ┌────────────────────────────┐  │
│  │ Limit raised     +₹25,000  │  │
│  │ limit_change · request     │  │
│  │ By Kranthi Kumar           │  │
│  │ Limit after      ₹75,000   │  │
│  │ 21-08-2026 10:44 AM        │  │
│  └────────────────────────────┘  │
│  ┌────────────────────────────┐  │
│  │ Order on credit   ₹17,098  │  │
│  │ draw · MO-7781             │  │
│  │ Used after       ₹17,098   │  │
│  │ 21-08-2026 09:20 AM        │  │
│  └────────────────────────────┘  │
│  ┌────────────────────────────┐  │
│  │ Online repayment  ₹8,000   │  │
│  │ repayment_online · UPI     │  │
│  │ Used after            ₹0   │  │
│  │ 18-08-2026 11:05 AM        │  │
│  └────────────────────────────┘  │
│  [ Load more ]                   │
├──────────────────────────────────┤
│  [ Export CSV ]                  │
└──────────────────────────────────┘
```

Seven kinds of row appear here and nothing else can: `draw` when a bulk order consumes credit, `release` when one is cancelled, `repayment_cash` and `repayment_online`, `limit_change` from `SUP-04.2` or an approved request on `SUP-04.3`, and `adjustment` or `reversal` when Support closes a discrepancy on `SPT-19.1`. The last two always carry a reason, which is shown in full rather than truncated.

**A correction made by Support**

```
│  ┌────────────────────────────┐  │
│  │ Correction        ₹4,000   │  │
│  │ reversal · by Support      │  │
│  │ Reverses repayment_cash    │  │
│  │ of 21-08 04:15 PM          │  │
│  │ "Code was replayed; the    │  │
│  │  cash never reached the    │  │
│  │  hub."                     │  │
│  │ Used after       ₹17,098   │  │
│  └────────────────────────────┘  │
```

**Nothing on the line yet**

```
┌──────────────────────────────────┐
│                                  │
│             [ 🏪 ]                │
│                                  │
│    Devi Provisions has not       │
│    used credit yet.              │
│    Set a limit to open the line. │
│                                  │
│      [ Set credit limit ]        │
│                                  │
└──────────────────────────────────┘
```

**Actions:** None. The screen reads `CreditTransactions` and `CreditProfile` directly and writes nothing, so a disputed balance is answered by scrolling rather than by asking someone to adjust it. The `⏳ With driver` figure is `CreditProfile.inTransitRepayments` and the driver named beside it is the holder on the matching `"in_custody"` ledger entry; it clears when `confirmCashSettlement` runs on `SUP-16.1`, not when the merchant's credit changes, because the credit changed at collection. Offline the list is served from cache with the `⚠ Offline: data may be outdated` banner and the in-flight figure carries `[cached]`, since it is the one number here that moves without the merchant doing anything. Reached from `SUP-04.1`.

### SUP-05 Drivers

**Data**

| Shown | Source |
| ----- | ------ |
| Driver cards | `FS query UserProfiles` where `role == "vehicle"`, `supplierId == uid` |
| On-gig / available | `FS query Gigs` where `supplierId == uid` and `status` in `created`, `started` |
| Dues | `FS get /DriverEarnings/{driverId}` → `pendingDues` |

| Control | On click |
| ------- | -------- |
| Driver card | `nav SUP-05.1` |
| Payout requests | `nav SUP-05.2` |

```
┌──────────────────────────────────┐
│  ←  Drivers               [👤]    │
├──────────────────────────────────┤
│  ┌────────────────────────────┐  │
│  │ Hari                       │  │
│  │ Tata Ace · AP-27-TX-1234   │  │
│  │ ◉ On gig · stop 2 of 5     │  │
│  │ Dues ₹3,200                │  │
│  └────────────────────────────┘  │
│  ┌────────────────────────────┐  │
│  │ Ramesh                     │  │
│  │ Mahindra Jeeto · AP-27-…   │  │
│  │ ○ Available                │  │
│  │ Dues ₹0                    │  │
│  └────────────────────────────┘  │
├──────────────────────────────────┤
│  [ Payout requests 1 ]           │
└──────────────────────────────────┘
```

Live availability matters here, because `composeGig` rejects an unapproved driver with `DRIVER_NOT_AVAILABLE` and a supplier composing tomorrow's gigs needs to know who is free.

### SUP-05.1 Driver detail

**Data**

| Shown | Source |
| ----- | ------ |
| Phone, vehicle | `FS get /UserProfiles/{driverId}` |
| Now / progress | `FS get /Gigs/{activeGigId}` |
| Earnings / dues / paid | `FS get /DriverEarnings/{driverId}` |
| Cash custody block | `Fn getCashCustodySummary` scoped to this driver |
| Performance (30d) | `local` from `FS query Gigs` where `vehicleId == driverId` |

| Control | On click |
| ------- | -------- |
| Call | `tel:` driver `contactInfo` |
| View tracking | `nav SUP-10.1` |
| Confirm settlement | `nav SUP-16.1` |
| View payout requests | `nav SUP-05.2` |
| View past gigs | `nav SUP-10` |

```
┌──────────────────────────────────┐
│  ←  Hari                  [👤]    │
├──────────────────────────────────┤
│  +91 76543 21090                 │
│  Tata Ace · 750 kg               │
│  AP-27-TX-1234                   │
│                   [ 📞 Call ]     │
├──────────────────────────────────┤
│  Now                             │
│  Ongole → Markapur               │
│  Stop 2 of 5 · reached           │
│  6 of 12 delivered               │
│              [ View tracking ]   │
├──────────────────────────────────┤
│  Earnings                        │
│  Total earned        ₹12,400     │
│  Pending dues         ₹3,200     │
│  Paid out             ₹9,200     │
├──────────────────────────────────┤
│  Cash custody                    │
│  In custody          ₹8,450.00   │
│  Recover from pay      ₹250.00   │
│  Open settlements            1   │
│  Ongole → Markapur · 19-08       │
│  ⚠ Open 2 days                   │
│         [ Confirm settlement ]   │
├──────────────────────────────────┤
│  Performance (30d)               │
│  Gigs completed           14     │
│  Deliveries              162     │
│  On-time stops           91%     │
│  Suspensions               1     │
├──────────────────────────────────┤
│  [ View payout requests ]        │
│  [ View past gigs ]              │
└──────────────────────────────────┘
```

`cashInCustody`, `cashRecoverable` and `openSettlementIds` come from the driver's `DriverEarnings` through `getCashCustodySummary`, so this figure and the one the driver reads on their own screen are the same number with the same `asOf`. The custody block sits directly above the payout entry point on purpose: a payout request from a driver who is holding cash is refused, and the reason is one line up rather than a surprise in a sheet. `[ Confirm settlement ]` opens `SUP-16.1` for the named settlement.

### SUP-05.2 Payout requests

The supplier authorises a payout. The supplier does not make it. Those are two different acts by two different parties, and this screen is built so that no supplier can confuse one for the other.

**Data**

| Shown | Source |
| ----- | ------ |
| To-approve rows | `FS query DriverEarnings` where `supplierId == uid` → `payoutRequests[]` with `status == "pending"` |
| In-flight / done / attention | `FS query PayoutTransactions` where `supplierId == uid` |
| Cash in hand now | `FS get /DriverEarnings/{driverId}` → `cashInCustody` |
| Approve-sheet amounts | same request + `cashRecoverable` / TDS on the earnings doc |

| Control | On click |
| ------- | -------- |
| Filter chips | `local` |
| Approve / Reject | `Fn reviewPayoutRequest` |
| Beneficiary checkbox / note | `local` until that Fn |
| Call | `tel:` driver |
| View | `nav SUP-05.3` |
| Confirm settlement | `nav SUP-16.1` |

```
┌──────────────────────────────────┐
│  ←  Payouts               [👤]    │
├──────────────────────────────────┤
│  [ To approve 1 ] [ In flight 2 ]│
│  [ Needs attention 1 ] [ Done ]  │
├──────────────────────────────────┤
│  To approve                      │
│  ┌────────────────────────────┐  │
│  │ Hari                       │  │
│  │ Requests ₹2,000            │  │
│  │ PR-24188 · sent 20-08      │  │
│  │ Available dues ₹3,200      │  │
│  │ Cash in hand then ₹0       │  │
│  │                            │  │
│  │ To UPI hari····@okhdfcbank │  │
│  │ ✔ bank confirmed the name  │  │
│  │ Frozen when he asked       │  │
│  │                            │  │
│  │ ⚠ ₹250 shortfall to net    │  │
│  │   off · pays out ₹1,750    │  │
│  │                            │  │
│  │ [ Reject ]   [ Approve ]   │  │
│  └────────────────────────────┘  │
└──────────────────────────────────┘
```

**In flight** — approved, and now the platform's problem rather than the supplier's.

```
│  In flight                       │
│  ┌────────────────────────────┐  │
│  │ Hari · ₹1,750              │  │
│  │ PO-24188                   │  │
│  │ ✔ Approved  20-08 06:55 PM │  │
│  │   by you                   │  │
│  │ ⏳ Sending  21-08 11:24 AM  │  │
│  │   UPI hari····@okhdfcbank  │  │
│  │ Expected by 6:00 PM        │  │
│  │ [ View ]                   │  │
│  └────────────────────────────┘  │
│  ┌────────────────────────────┐  │
│  │ Ramesh · ₹4,000            │  │
│  │ PO-24190                   │  │
│  │ ✔ Approved  21-08 09:10 AM │  │
│  │ ○ Not sent yet             │  │
│  │   His account changed      │  │
│  │   yesterday. Sends after   │  │
│  │   6:40 PM today.           │  │
│  │ [ View ]                   │  │
│  └────────────────────────────┘  │
```

**Needs attention** — a payout that stopped, with the reason and the two ways forward.

```
│  Needs attention                 │
│  ┌────────────────────────────┐  │
│  │ ✖ Ramesh · ₹1,500          │  │
│  │ PO-24077                   │  │
│  │ Bank returned it 09-08     │  │
│  │ "Account does not exist"   │  │
│  │                            │  │
│  │ ₹1,500 went back to his    │  │
│  │ dues. Nothing was lost.    │  │
│  │                            │  │
│  │ He needs to fix his account│  │
│  │ before this can be paid.   │  │
│  │ [ 📞 Call Ramesh ]  [ View ]│  │
│  └────────────────────────────┘  │
│  ┌────────────────────────────┐  │
│  │ ⚠ Hari · ₹3,000            │  │
│  │ PO-24102                   │  │
│  │ Bank took it back 15-08    │  │
│  │ after paying it on 13-08.  │  │
│  │                            │  │
│  │ Support is on this.        │  │
│  │ Case RX-1188 · opened 15-08│  │
│  │ [ View ]                   │  │
│  └────────────────────────────┘  │
│  ┌────────────────────────────┐  │
│  │ ⚠ Suresh · ₹2,200          │  │
│  │ PO-24151                   │  │
│  │ Sent 18-08. The bank has   │  │
│  │ not said yes or no for     │  │
│  │ 3 days.                    │  │
│  │ Support is checking with   │  │
│  │ the bank. RX-1191          │  │
│  │ Don't approve another      │  │
│  │ payout for this one.       │  │
│  └────────────────────────────┘  │
```

**Done**

```
│  Done                            │
│  ₹3,000 Hari · paid 13-08        │
│    UTR 431299887766              │
│  ₹5,000 Hari · rejected 05-08    │
│    "Exceeds cleared dues."       │
```

**Cash collected after the request was filed**

```
│  ┌────────────────────────────┐  │
│  │ Ramesh                     │  │
│  │ Requests ₹1,500            │  │
│  │ Cash in hand then ₹0       │  │
│  │ ⚠ Holding ₹4,000 now       │  │
│  │   Podili circuit · 21-08   │  │
│  │                            │  │
│  │ To UPI ramesh····@okaxis   │  │
│  │                            │  │
│  │ [ Approve ] (disabled)     │  │
│  │ Confirm the settlement     │  │
│  │ first.                     │  │
│  │ [ Confirm settlement ]     │  │
│  └────────────────────────────┘  │
```

**Approve sheet**

```
┌──────────────────────────────────┐
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│  Approve payout                  │
│                                  │
│  Hari · PR-24188                 │
│                                  │
│  Requested            ₹2,000.00  │
│  Cash shortfall        −₹250.00  │
│  Tax deducted            ₹0.00   │
│  He receives          ₹1,750.00  │
│                                  │
│  Money goes to                   │
│  ┌────────────────────────────┐  │
│  │ UPI hari····@okhdfcbank    │  │
│  │ Bank name: HARI PRASAD     │  │
│  │ Confirmed 04-08            │  │
│  └────────────────────────────┘  │
│  (x) I've checked this is where  │
│      the money should go         │
│                                  │
│  Note (optional)                 │
│  ┌────────────────────────────┐  │
│  │                            │  │
│  └────────────────────────────┘  │
│                                  │
│  Approving authorises the        │
│  transfer. It doesn't send the   │
│  money — we do that, and the     │
│  bank confirms it.               │
│                                  │
│  [  Approve ₹1,750  ]            │
└──────────────────────────────────┘
```

**Above the approval ceiling**

```
│  ⚠ ₹62,000 is over your ₹50,000  │
│    limit for one payout.         │
│                                  │
│  Approving sends it to support   │
│  for a second check. It won't    │
│  go out until they agree.        │
│                                  │
│  [  Approve and send for check ] │
```

**Actions:** `reviewPayoutRequest` records the decision and, on approval, creates a `PayoutTransaction` at status `approved`. It does not move money. `initiatePayoutTransfer` is a server action the supplier cannot call, and `recordPayoutSettlement` belongs to the rail. Rejection releases the reservation back to the driver's withdrawable dues in full. Either way the driver is notified and sees the outcome on `DRV-07` and `DRV-08.2`.

**"Approved and paid" is gone, and its absence is the point.** The old sheet let a supplier declare in one tap that they had authorised a payout and that the money had arrived, with an optional UTR. That single control removed every useful property of the payout chain: there was no independent confirmation, no way to tell an authorisation from a disbursement, and a supplier could close a payout that never left their account. Approval now carries no reference field at all, because at the moment of approval no reference exists.

**The destination acknowledgement is a checkbox, not a display line.** `reviewPayoutRequest` requires `acknowledgedBeneficiaryLabel` to match the frozen snapshot, and a mismatch aborts the approval outright rather than proceeding with a warning. This catches the case that matters: a destination that changed between the approver opening the screen and tapping approve. Making the approver tick the box costs a second and converts "the supplier didn't notice" into "the supplier confirmed", which is the difference between a control and a display.

**The net breakdown is on the sheet, not derived after the fact.** Any `cashRecoverable` from a confirmed shortfall is deducted first and written as a `CashLedgerEntry` with `source: "recovery"`, and TDS is withheld where the compliance module says it applies. The supplier approves the figure the driver will actually receive, so approval and receipt cannot disagree.

`cashInCustodyAtRequest` sits beside the amount because the two figures diverge: `requestPayout` refuses to file at all while the driver holds cash, but a driver who filed with empty hands can be holding four thousand rupees by the time the request is read. Approve stays visible and disabled until that is settled, with the settlement one tap away.

**Approver segregation.** A request raised by the same user account that would approve it is refused with `APPROVER_IS_REQUESTER`. On a single-operator supplier account this routes to Support as a second approver rather than silently permitting self-approval — which is precisely the account shape where self-approval is most tempting and least visible.

### SUP-05.3 Payout transaction detail

Reached from any payout row. This is the record an auditor asks for, and it is the same one the supplier and the driver see.

**Data**

| Shown | Source |
| ----- | ------ |
| Amounts, destination, refs, recon | `FS get /PayoutTransactions/{id}` |
| Who-did-what | `FS query` child `events` on that payout |
| Driver name / phone | `FS get /UserProfiles/{driverId}` |

| Control | On click |
| ------- | -------- |
| Retry | `Fn retryPayout` — disabled until the destination is re-verified |
| Call | `tel:` driver |
| Download evidence | `Fn exportFinanceReport` `{ reportType: "payout_evidence" }` |
| View case | `nav` Support case when present |

```
┌──────────────────────────────────┐
│  ←  PO-24102              [👤]    │
├──────────────────────────────────┤
│  Hari Prasad · ₹3,000.00         │
│  ✔ Paid · 13-08-2026 02:14 PM    │
├──────────────────────────────────┤
│  Amounts                         │
│  Requested            ₹3,000.00  │
│  Cash recovery           ₹0.00   │
│  TDS withheld            ₹0.00   │
│  Paid                 ₹3,000.00  │
├──────────────────────────────────┤
│  Destination (frozen 12-08)      │
│  UPI hari····@okhdfcbank         │
│  Bank name  HARI PRASAD          │
│  Verified 04-08 by penny drop    │
├──────────────────────────────────┤
│  References                      │
│  Request       PR-24102          │
│  Payout        PO-24102          │
│  Rail          UPI · RazorpayX   │
│  Provider ref  pout_Nk91ldm4     │
│  UTR           431299887766      │
├──────────────────────────────────┤
│  Who did what                    │
│  12-08 09:10  Hari requested     │
│               ₹3,000             │
│  12-08 18:55  You approved       │
│               "cleared dues"     │
│  13-08 14:11  System sent it     │
│               to RazorpayX       │
│  13-08 14:14  Bank confirmed     │
│               UTR above          │
├──────────────────────────────────┤
│  Reconciliation                  │
│  ✔ Matched to bank statement     │
│    14-08 · run REC-240814        │
├──────────────────────────────────┤
│  [ Download evidence ]           │
└──────────────────────────────────┘
```

**Failed, with the retry path**

```
│  ✖ Didn't go through             │
│  09-08-2026 11:02 AM             │
│                                  │
│  Bank said: account does not     │
│  exist (rail code R03)           │
│                                  │
│  ₹1,500.00 released back to      │
│  Ramesh's dues at 11:02 AM.      │
│                                  │
│  09-08 09:40  Ramesh requested   │
│  09-08 10:15  You approved       │
│  09-08 10:58  System sent it     │
│  09-08 11:02  Bank returned it   │
│                                  │
│  Retry needs a working account.  │
│  Ramesh has not changed his yet. │
│  [ 📞 Call Ramesh ]               │
│  [ Retry ] (disabled)            │
```

**Reversed after completion**

```
│  ⚠ Taken back by the bank        │
│  Paid 13-08 · reversed 15-08     │
│                                  │
│  UTR 431299887766 was reversed.  │
│  Reason: beneficiary account     │
│  closed.                         │
│                                  │
│  ₹3,000.00 is back in Hari's     │
│  dues. His account was marked    │
│  unverified — he has to confirm  │
│  it again before the next one.   │
│                                  │
│  Support case RX-1188            │
│  [ View case ]                   │
```

**Reconciliation break**

```
│  ⚠ Doesn't match the bank        │
│                                  │
│  We show this as paid on 13-08   │
│  with UTR 431299887766. The      │
│  bank statement for 13-08 has    │
│  no matching debit.              │
│                                  │
│  Support is checking. Nothing    │
│  is being paid again until they  │
│  finish.                         │
│                                  │
│  Break REC-240814-07 · opened    │
│  14-08 · 2 days old              │
```

**Actions:** read-only for the supplier apart from `[ Retry ]`, which calls `retryPayout` and is enabled only when the destination that caused the failure has since been re-verified. `[ Download evidence ]` produces the payout's audit extract — request, approval, initiation, provider events, and reconciliation stamp — and is gated behind the `finance.exports` entitlement, with the on-screen record always available regardless of plan.

The "who did what" list is built from `PayoutStatusEvent` records and names the actor on every line, including the system. An automated step reads "System sent it to RazorpayX" rather than being attributed to the supplier who approved it; a platform that lets automated actions wear a user's name has an audit trail that cannot answer who decided anything.

---

## Inventory

### SUP-06 Inventory

A flat unsearchable list stops working at about twenty products. Search, category filter, sort and a low-stock view are added, along with the delete path that was missing entirely.

**Data**

| Shown | Source |
| ----- | ------ |
| Product cards | `FS query Products` where `supplierId == uid` |
| Search / chips / sort | `local` filter of that list |

| Control | On click |
| ------- | -------- |
| Search / chips / sort | `local` |
| Product card | `nav SUP-06.1` |
| `+` | `nav SUP-06.1` (new) |
| AI: update inventory | `nav SUP-14` |
| Manage discounts | `nav SUP-06.2` |

```
┌──────────────────────────────────┐
│  Inventory     🔊   🔔    [👤]      │
├──────────────────────────────────┤
│  ┌────────────────────────────┐  │
│  │ 🔍 Search name or HSN      │   │
│  └────────────────────────────┘  │
│  [ All 34 ][ Low 3 ][ Out 1 ]    │
│  [ Staples ][ Oils ][ Dairy ] >  │
│  Sort [ Low stock first      ▾]  │
├──────────────────────────────────┤
│  ┌────────────────────────────┐  │
│  │ Toor dal 5kg · HSN 0713    │  │
│  │ ₹640 · bag                 │  │
│  │ ✖ Out of stock             │  │
│  └────────────────────────────┘  │
│  ┌────────────────────────────┐  │
│  │ Cooking oil 1L · HSN 1514  │  │
│  │ ₹180 · bottle              │  │
│  │ ⚠ Stock 4 · low            │  │
│  └────────────────────────────┘  │
│  ┌────────────────────────────┐  │
│  │ Rice 25kg · HSN 1006       │  │
│  │ ₹1,250 · bag               │  │
│  │ ✔ Stock 40                 │  │
│  └────────────────────────────┘  │
│                          [ + ]   │
├──────────────────────────────────┤
│  [ ✨ AI: update inventory ]      │
│  [ Manage discounts ]            │
├──────────────────────────────────┤
│[Dashboard][Gigs][Inventory][Fin.]│
└──────────────────────────────────┘
```

Out-of-stock products are surfaced at the top by default because they silently break buyer checkout and pamphlet promotions.

### SUP-06.1 Add / edit product

**Data**

| Shown | Source |
| ----- | ------ |
| Form fields | `FS get /Products/{id}` on edit; empty `local` on create |
| In-pamphlet / open-order warning | `FS query Pamphlets` / `Orders` mentioning this `productId` |

| Control | On click |
| ------- | -------- |
| Fields / photo | `local` until Save |
| Save | `FS write /Products/{id}` — all fields except `stock` |
| Delete / Delete anyway | `FS write` delete of `/Products/{id}` |
| Set stock to 0 / Stock field | `Fn adjustProductStock` `{ mode: "absolute" \| "delta", reason }` |

```
┌──────────────────────────────────┐
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│  Product                    [ X ]│
├──────────────────────────────────┤
│  Photo                           │
│  ┌────────────────────────────┐  │
│  │   [ 📷 Add photo ]         │   │
│  │   Compressed to WebP       │  │
│  └────────────────────────────┘  │
│                                  │
│  Name                            │
│  ┌────────────────────────────┐  │
│  │ Rice 25kg                  │  │
│  └────────────────────────────┘  │
│  Category       [ Staples    ▾]  │
│                                  │
│  Price ₹        [ 1250       ]   │
│  Stock          [ 40         ]   │
│  Unit (UQC)     [ bag        ▾]  │
│  HSN code       [ 1006       ]   │
│                                  │
│  Low stock alert at [ 5      ]   │
│                                  │
│  Unit and HSN appear on every    │
│  tax invoice line.               │
│                                  │
│  [ Delete ]        [ Save ]      │
└──────────────────────────────────┘
```

**Delete confirm**

```
┌──────────────────────────────────┐
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│  Delete Rice 25kg?               │
│                                  │
│  ⚠ In 1 active pamphlet and 2    │
│    open orders.                  │
│                                  │
│  Past orders and invoices keep   │
│  their own copy of this item,    │
│  so history is unaffected.       │
│                                  │
│  Remove it from the pamphlet     │
│  first, or set stock to 0 to     │
│  hide it from buyers.            │
│                                  │
│  [ Set stock to 0 ]              │
│  [ Cancel ]   [ Delete anyway ]  │
└──────────────────────────────────┘
```

### SUP-06.2 Discounts

These are supplier `Discount` codes applied to product orders. They are not platform `OfferDiscountCode` records, which belong to Support and discount subscriptions.

**Data**

| Shown | Source |
| ----- | ------ |
| Discount cards | `FS query Discounts` where `supplierId == uid` |
| Sheet fields | `FS get /Discounts/{code}` on edit; `local` on create |

| Control | On click |
| ------- | -------- |
| Card | opens the sheet (`local` / same get) |
| `+` | empty sheet |
| Fields | `local` until Save |
| Save / Delete | `FS write /Discounts/{code}` |
| AI: create discount | `nav SUP-14` |

```
┌──────────────────────────────────┐
│  ←  Discounts             [👤]    │
├──────────────────────────────────┤
│  ┌────────────────────────────┐  │
│  │ HARVEST10 · 10%            │  │
│  │ Staples · ₹500 to ₹50,000  │  │
│  │ Used 34 times              │  │
│  └────────────────────────────┘  │
│  ┌────────────────────────────┐  │
│  │ DAIRY5 · 5%                │  │
│  │ Dairy · ₹200 to ₹10,000    │  │
│  │ Used 8 times               │  │
│  └────────────────────────────┘  │
│                          [ + ]   │
├──────────────────────────────────┤
│  [ ✨ AI: create discount ]       │
└──────────────────────────────────┘
```

**Add / edit discount sheet**

```
┌──────────────────────────────────┐
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│  Discount                   [ X ]│
├──────────────────────────────────┤
│  Code                            │
│  ┌────────────────────────────┐  │
│  │ HARVEST10                  │  │
│  └────────────────────────────┘  │
│  Uppercase, no spaces.           │
│                                  │
│  Name                            │
│  ┌────────────────────────────┐  │
│  │ Harvest special            │  │
│  └────────────────────────────┘  │
│  Description                     │
│  ┌────────────────────────────┐  │
│  │ 10% off staples in August  │  │
│  └────────────────────────────┘  │
│                                  │
│  Percent off    [ 10         ]%  │
│  Category       [ Staples    ▾]  │
│  Min order ₹    [ 500        ]   │
│  Max order ₹    [ 50000      ]   │
│                                  │
│  Applies to buyer and merchant   │
│  orders alike.                   │
│                                  │
│  [ Delete ]        [ Save ]      │
└──────────────────────────────────┘
```

---

## Routes, pamphlets and gigs

### SUP-07 Routes

Only the builder existed; there was no list to reach it from.

**Data**

| Shown | Source |
| ----- | ------ |
| Route cards / cap | `FS query Routes` where `supplierId == uid`; cap from `SUP-02` subscription |
| Used by N gigs | `FS query Gigs` where `supplierId == uid`, `routeId` matches, `status` in `created`, `started` |

| Control | On click |
| ------- | -------- |
| Route card | `nav SUP-07.1` |
| `+` | `nav SUP-07.1` (new) |
| AI: build a route | `nav SUP-14` |

```
┌──────────────────────────────────┐
│  ←  Routes                [👤]    │
│     12 of 20 used                │
├──────────────────────────────────┤
│  ┌────────────────────────────┐  │
│  │ Ongole to Markapur         │  │
│  │ 5 stops · 86 km · 4h       │  │
│  │ Used by 3 upcoming gigs    │  │
│  └────────────────────────────┘  │
│  ┌────────────────────────────┐  │
│  │ Podili circuit             │  │
│  │ 3 stops · 47 km · 2h       │  │
│  │ Used by 1 upcoming gig     │  │
│  └────────────────────────────┘  │
│                          [ + ]   │
├──────────────────────────────────┤
│  [ ✨ AI: build a route ]         │
└──────────────────────────────────┘
```

### SUP-07.1 Route builder

**Data**

| Shown | Source |
| ----- | ------ |
| Name, origin, destination, stops | `FS get /Routes/{id}` on edit; `local` on create |
| Stop village / coords | `FS get /Villages/{villageId}` |
| km / hours | `Fn computeRouteMetrics` — server Maps; then `local` until Save |
| Upcoming-gig warning | same Gigs query as `SUP-07` |

| Control | On click |
| ------- | -------- |
| Fields / drag / add stop | `local` until Save |
| Save route | `FS write /Routes/{id}` |
| Delete | `FS write` delete — blocked while upcoming gigs use it |
| View gigs | `nav SUP-10` |

```
┌──────────────────────────────────┐
│  ←  Route builder         [👤]    │
├──────────────────────────────────┤
│  Name                            │
│  ┌────────────────────────────┐  │
│  │ Ongole to Markapur         │  │
│  └────────────────────────────┘  │
│  Origin         [ Ongole     ▾]  │
│  Destination    [ Markapur   ▾]  │
├──────────────────────────────────┤
│  Stops · drag to reorder         │
│  ┌────────────────────────────┐  │
│  │ ≡ 1 Karavadi               │  │
│  │   15 min · 12.4 km         │  │
│  │   ✔ Coordinates set        │  │
│  └────────────────────────────┘  │
│  ┌────────────────────────────┐  │
│  │ ≡ 2 Koppolu                │  │
│  │   35 min · 28.1 km         │  │
│  │   ✔ Coordinates set        │  │
│  └────────────────────────────┘  │
│  ┌────────────────────────────┐  │
│  │ ≡ 3 Madhavaram             │  │
│  │   100 min · 61.0 km        │  │
│  │   ⚠ No coordinates         │  │
│  └────────────────────────────┘  │
│  [ + Add stop ]                  │
├──────────────────────────────────┤
│  Total 86 km · about 4h          │
│  Times come from the Distance    │
│  Matrix API and can be edited.   │
├──────────────────────────────────┤
│  [ Delete ]     [ Save route ]   │
└──────────────────────────────────┘
```

Each stop carries a `villageId` and a latitude and longitude. The coordinate check is shown because the driver geofence cannot run without it: a stop with no coordinates falls back to the manual override on `DRV-04.1`.

**Delete confirm**

```
┌──────────────────────────────────┐
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│  Delete this route?              │
│                                  │
│  ⚠ 3 upcoming gigs use it.       │
│    Delete those gigs first.      │
│                                  │
│  [ View gigs ]   [ Cancel ]      │
└──────────────────────────────────┘
```

### SUP-08 Pamphlets

**Data**

| Shown | Source |
| ----- | ------ |
| Pamphlet cards | `FS query Pamphlets` where `supplierId == uid` |
| On N gigs / OOS warning | `FS query Gigs` + `FS get /Products/{id}` for promoted lines |
| Desktop two-pane (supplier_new) | same writes as `SUP-08.1` plus warehouse `FS query Products` where `supplierId == uid` |

| Control | On click |
| ------- | -------- |
| Card | `nav SUP-08.1` |
| `+` | `nav SUP-08.1` (new) |
| AI: update pamphlet | `nav SUP-14` |
| Save pamphlet (desktop) | `FS write /Pamphlets/{id}` |
| Delete (desktop) | `FS write` delete |
| Preview as buyer (desktop) | `nav BUY-05.1` |
| Sliders / drag / target radios / Esc | `local` until Save |

```
┌──────────────────────────────────┐
│  ←  Pamphlets             [👤]    │
├──────────────────────────────────┤
│  ┌────────────────────────────┐  │
│  │ Harvest special            │  │
│  │ 24 items · 8 discounted    │  │
│  │ On 2 upcoming gigs         │  │
│  │ ⚠ 1 item out of stock      │  │
│  └────────────────────────────┘  │
│  ┌────────────────────────────┐  │
│  │ Dairy weekly               │  │
│  │ 11 items · 3 discounted    │  │
│  │ On 1 upcoming gig          │  │
│  └────────────────────────────┘  │
│                          [ + ]   │
├──────────────────────────────────┤
│  [ ✨ AI: update pamphlet ]       │
└──────────────────────────────────┘
```

### SUP-08.1 Pamphlet builder

**Data**

| Shown | Source |
| ----- | ------ |
| Title, subtitle, promoted lines | `FS get /Pamphlets/{id}` on edit; `local` on create |
| Price / stock / unit | `FS get /Products/{productId}` per line |
| Product picker | `FS query Products` where `supplierId == uid` |

| Control | On click |
| ------- | -------- |
| Fields / checks / slogan prices | `local` until Save |
| Add product | `local` append from the Products query |
| Preview as buyer | `nav BUY-05.1` |
| Save pamphlet | `FS write /Pamphlets/{id}` |
| Delete | `FS write` delete |

```
┌──────────────────────────────────┐
│  ←  Pamphlet              [👤]    │
├──────────────────────────────────┤
│  Title                           │
│  ┌────────────────────────────┐  │
│  │ Harvest special            │  │
│  └────────────────────────────┘  │
│  Subtitle                        │
│  ┌────────────────────────────┐  │
│  │ August offers for Prakasam │  │
│  └────────────────────────────┘  │
├──────────────────────────────────┤
│  Promoted products               │
│  ┌────────────────────────────┐  │
│  │ (x) Rice 25kg              │  │
│  │     ₹1,250 → [ 1100    ]   │  │
│  │     Stock 40 · 12% off     │  │
│  │     Slogan [ Best of the ] │  │
│  └────────────────────────────┘  │
│  ┌────────────────────────────┐  │
│  │ (x) Cooking oil 1L         │  │
│  │     ₹180 → [ 160       ]   │  │
│  │     ⚠ Stock 4 only         │  │
│  └────────────────────────────┘  │
│  ┌────────────────────────────┐  │
│  │ ( ) Toor dal 5kg           │  │
│  │     ✖ Out of stock         │  │
│  └────────────────────────────┘  │
│  [ + Add product ]               │
├──────────────────────────────────┤
│  [ Preview as buyer ]            │
│  [ Delete ]   [ Save pamphlet ]  │
└──────────────────────────────────┘
```

Preview as buyer renders `BUY-05.1` with this pamphlet's contents, so a supplier can see the discount and stock exactly as a buyer will.

### SUP-09 Gig composer

**Data**

| Shown | Source |
| ----- | ------ |
| Monthly gig cap | `FS get /PlatformSubscriptions/{id}` + `local` count of this month's gigs |
| Route / pamphlet / vehicle pickers | `FS query Routes` / `Pamphlets` / `UserProfiles` (`role == "vehicle"`) where `supplierId == uid` |
| Merchants served | `FS query UserProfiles` where `role == "merchant"`, `supplierId == uid`, village on the route |
| Stop times | `local` from `Route.villages[].journeyTimeFromOrigin` |

| Control | On click |
| ------- | -------- |
| Fields / merchant checks / times | `local` until Compose |
| Compose gig | `Fn composeGig` — writes `villageIds` |
| Compare plans / View plans | `nav SUP-15` |

```
┌──────────────────────────────────┐
│  ←  Compose gig           [👤]    │
├──────────────────────────────────┤
│  Gigs this month  142 of 200     │
├──────────────────────────────────┤
│  Title                           │
│  ┌────────────────────────────┐  │
│  │ Ongole → Markapur          │  │
│  └────────────────────────────┘  │
│  Route     [ Ongole to Mark. ▾]  │
│  Vehicle   [ Hari · Tata Ace ▾]  │
│  Pamphlet  [ Harvest special ▾]  │
│  Date      [ 21-08-2026      ]   │
│  Start     [ 09:00 AM        ]   │
├──────────────────────────────────┤
│  Merchants served                │
│  (x) Sri Lakshmi · Karavadi      │
│  (x) Village Mart · Koppolu      │
│  ( ) Devi Prov. · Madhavaram     │
│  ⚠ Madhavaram has no merchant    │
│    selected — buyers there       │
│    cannot order.                 │
├──────────────────────────────────┤
│  Stop times                      │
│  Karavadi     [ 10:30 AM ]       │
│  Koppolu      [ 11:15 AM ]       │
│  Madhavaram   [ 12:40 PM ]       │
│  Auto-filled from route times.   │
├──────────────────────────────────┤
│  [  Compose gig  ]               │
└──────────────────────────────────┘
```

The merchant selector is drawn because the constitution states a gig requires merchants, and the gig now carries `merchantIds` so buyers in each village know which shop to collect from.

**Blocked states**

```
┌──────────────────────────────────┐
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│  Monthly gig limit reached       │
│                                  │
│  Growth allows 200 gigs a month  │
│  and you have used 200.          │
│  Resets 01-09-2026.              │
│                                  │
│  [ Compare plans ]   [ OK ]      │
└──────────────────────────────────┘
```

```
┌──────────────────────────────────┐
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│  Subscription required           │
│                                  │
│  Composing gigs needs an active  │
│  plan.                           │
│                                  │
│  [ View plans ]      [ OK ]      │
└──────────────────────────────────┘
```

**Actions:** Compose calls `composeGig`. A missing route, vehicle or pamphlet is blocked inline. `DRIVER_NOT_AVAILABLE` when the chosen driver is unapproved, `PLAN_LIMIT_EXCEEDED` and `SUBSCRIPTION_REQUIRED` raise the sheets above.

### SUP-10 Gigs list

**Data**

| Shown | Source |
| ----- | ------ |
| Gig cards | `FS query Gigs` where `supplierId == uid` |
| Stop / delivered counts | same get; order counts `FS query` Orders / MerchantOrders for that `gigId` |

| Control | On click |
| ------- | -------- |
| Today / Upcoming / Past | `local` filter |
| Card / Track | `nav SUP-10.1` |
| Orders | `nav SUP-11` with `gigId` |
| Reassign driver | `nav SUP-10.3` |
| `...` Suspend | `nav SUP-10.2` |
| `+` | `nav SUP-09` |

```
┌──────────────────────────────────┐
│  Gigs          🔊   🔔    [👤]      │
├──────────────────────────────────┤
│  [ Today ] [ Upcoming ] [ Past ] │
├──────────────────────────────────┤
│  ┌────────────────────────────┐  │
│  │ Ongole → Markapur          │  │
│  │ ◉ started · stop 2 of 5    │  │
│  │ Hari · 6 of 12 delivered   │  │
│  │ [ Orders ] [ Track ]  ...  │  │
│  └────────────────────────────┘  │
│  ┌────────────────────────────┐  │
│  │ Podili dairy run           │  │
│  │ ○ created · 22-08          │  │
│  │ ⚠ Driver has not           │  │
│  │   acknowledged             │  │
│  │ [ Orders ]            ...  │  │
│  └────────────────────────────┘  │
│  ┌────────────────────────────┐  │
│  │ Kanigiri run               │  │
│  │ ⚠ suspended · 20-08        │  │
│  │ 6 orders on hold           │  │
│  │ [ Reassign driver ]        │  │
│  └────────────────────────────┘  │
│                          [ + ]   │
├──────────────────────────────────┤
│[Dashboard][Gigs][Inventory][Fin.]│
└──────────────────────────────────┘
```

The `...` overflow holds Suspend, Reassign driver and Cancel gig, so destructive actions are not adjacent to the primary Orders and Track actions.

### SUP-10.1 Gig detail

**Data**

| Shown | Source |
| ----- | ------ |
| Status, route, pamphlet, times | `FS get /Gigs/{gigId}` |
| Driver / vehicle | `FS get /UserProfiles/{gig.vehicleId}` |
| Progress | `FS listen /Gigs/{gigId}` while `status == "started"` (unbind on leave) |
| Order totals | `FS query Orders` / `MerchantOrders` where `gigId` matches |
| Cash on this gig | `Fn getCashCustodySummary` scoped to this gig / settlement |

| Control | On click |
| ------- | -------- |
| Call | `tel:` driver |
| View orders | `nav SUP-11` |
| Suspend gig | `nav SUP-10.2` |
| Reassign driver | `nav SUP-10.3` |
| Confirm settlement | `nav SUP-16.1` |

```
┌──────────────────────────────────┐
│  ←  Ongole → Markapur     [👤]    │
├──────────────────────────────────┤
│  ◉ started · 21-08-2026          │
│  Started 09:58 AM                │
├──────────────────────────────────┤
│  Driver    Hari                  │
│  Vehicle   Tata Ace · AP-27-TX…  │
│  Route     Ongole to Markapur    │
│  Pamphlet  Harvest special       │
│                   [ 📞 Call ]     │
├──────────────────────────────────┤
│  Progress                        │
│  ✔ 1 Ongole      left 10:02      │
│  ◉ 2 Karavadi    reached 10:28   │
│  ○ 3 Koppolu     ETA 11:15       │
│  ○ 4 Madhavaram  ETA 12:40       │
│  ○ 5 Markapur    ETA 01:30       │
├──────────────────────────────────┤
│  Orders                          │
│  Buyer pickups      9            │
│  Merchant bulk      3            │
│  Delivered          6            │
│  Open               6            │
│  Value         ₹48,210           │
├──────────────────────────────────┤
│  Cash on this gig                │
│  Buyer cash orders   ₹3,150.00   │
│  Merchant repayments ₹4,000.00   │
│  Merchant bulk cash  ₹1,300.00   │
│  ──────────────────────────────  │
│  Hari is holding     ₹8,450.00   │
│  As of 21-08-2026 06:40 PM       │
├──────────────────────────────────┤
│  [ View orders ]                 │
│  [ Suspend gig ]                 │
│  [ Reassign driver ]             │
└──────────────────────────────────┘
```

**After the gig closes**

```
│  ✔ completed · 19-08-2026        │
│  Finished 07:12 PM               │
├──────────────────────────────────┤
│  Cash on this gig                │
│  App said            ₹8,450.00   │
│  Hari declared       ₹8,200.00   │
│  ⚠ Short by            ₹250.00   │
│  Settlement open 2 days          │
│         [ Confirm settlement ]   │
```

`completeAndFinalizeGig` returns `cashToHandOver` beside `totalEarnings` and, when that figure is above zero, opens a `CashSettlement` naming the exact ledger entries it sweeps and issuing the supplier a private confirmation code. The block above is that running figure while the gig is live and the settlement once it closes; both come from `getCashCustodySummary`, which returns the settlement's frozen `expectedAmount` once one exists rather than recomputing it, so the number cannot drift between this screen and the driver's. A gig that collected nothing shows no settlement and no handover step, because a cash-free gig should not manufacture one. `[ Confirm settlement ]` opens `SUP-16.1`.

### SUP-10.2 Suspend gig

**Data** — same gig / cash reads as `SUP-10.1`. Reason radios and note are `local`.

| Control | On click |
| ------- | -------- |
| Reason / note | `local` |
| Suspend gig | `Fn suspendGig` |
| Cancel | dismiss sheet |

```
┌──────────────────────────────────┐
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│  Suspend this gig?               │
│                                  │
│  Ongole → Markapur · stop 2 of 5 │
│  6 orders still undelivered      │
│                                  │
│  Reason                          │
│  ( ) Vehicle breakdown           │
│  ( ) Driver unavailable          │
│  ( ) Road or weather             │
│  ( ) Other                       │
│                                  │
│  ┌────────────────────────────┐  │
│  │ Add a note                 │  │
│  └────────────────────────────┘  │
│                                  │
│  The driver's route locks and    │
│  affected buyers are notified.   │
│  Reassign a driver to resume     │
│  from stop 2.                    │
│                                  │
│  Hari holds ₹8,450.00 of your    │
│  cash. Suspending opens a        │
│  settlement so he can hand it    │
│  over tonight without waiting    │
│  for this gig.                   │
│                                  │
│  A new driver does not take that │
│  cash on. It settles against     │
│  Hari.                           │
│                                  │
│  [ Cancel ]     [ Suspend gig ]  │
└──────────────────────────────────┘
```

### SUP-10.3 Reassign driver

**Data** — same gig read as `SUP-10.1`. Candidate list is `FS query UserProfiles` where `role == "vehicle"`, `supplierId == uid`, plus their active Gig for availability.

| Control | On click |
| ------- | -------- |
| Driver radio | `local` |
| Reassign | `Fn reassignGigDriver` |
| Cancel | dismiss sheet |

```
┌──────────────────────────────────┐
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│  Reassign driver                 │
│                                  │
│  Resumes at stop 2 · Karavadi    │
│  6 orders to deliver             │
│                                  │
│  ┌────────────────────────────┐  │
│  │ Ramesh                 (•) │  │
│  │ Mahindra Jeeto · free      │  │
│  │ 14 km from Karavadi        │  │
│  └────────────────────────────┘  │
│  ┌────────────────────────────┐  │
│  │ Suresh                 ( ) │  │
│  │ Tata Ace · on another gig  │  │
│  │ Unavailable                │  │
│  └────────────────────────────┘  │
│                                  │
│  Earnings so far stay with Hari. │
│  Ramesh earns from stop 2 on.    │
│                                  │
│  [ Cancel ]       [ Reassign ]   │
└──────────────────────────────────┘
```

**Actions:** `suspendGig` sets `Gig.status` to `suspended` and locks driver route actions. It also sums the cash the driver already holds on this gig and, where that is above zero, opens a `CashSettlement` exactly as `completeAndFinalizeGig` would, with the supplier's private confirmation code — an interrupted driver should not have to carry a day's takings until a gig they may never resume is closed. `reassignGigDriver` swaps `vehicleId` while preserving `currentVillageIndex`, so the replacement driver resumes rather than restarts, and it does not transfer custody: the notes are in the first driver's pocket, the settlement is against the first driver, and the replacement starts from zero. Both notify the affected drivers, merchants and buyers.

---

## Orders and finance

### SUP-11 Orders

Orders were reachable only from inside a single gig card, so there was no way to see the business as a whole.

**Data**

| Shown | Source |
| ----- | ------ |
| Merchant-order cards / ₹ | `FS query MerchantOrders` where `supplierId == uid` |
| Buyer-order cards | `FS query Orders` where `gigId` in this supplier's gigs — `Order` has no `supplierId` |
| Search / filters / dates | `local` |

| Control | On click |
| ------- | -------- |
| Buyer / Merchant / All / search / filters | `local` |
| Order card | `nav SUP-11.1` |
| Export CSV | `Fn exportFinanceReport` `{ reportType: "order_register" }` |

```
┌──────────────────────────────────┐
│  ←  Orders                [👤]    │
├──────────────────────────────────┤
│  [ Buyer ] [ Merchant ] [ All ]  │
│  ┌────────────────────────────┐  │
│  │ 🔍 Invoice, buyer or shop  │   │
│  └────────────────────────────┘  │
│  Filter [ Gig ▾ ] [ Status ▾ ]   │
│  From [ 01-08 ]  To [ 21-08 ]    │
├──────────────────────────────────┤
│  86 orders · ₹4,18,240           │
├──────────────────────────────────┤
│  ┌────────────────────────────┐  │
│  │ INV-2408210001             │  │
│  │ Anil Kumar · Karavadi      │  │
│  │ ◉ reached_merchant · Paid  │  │
│  │ ₹1,550 · 21-08             │  │
│  └────────────────────────────┘  │
│  ┌────────────────────────────┐  │
│  │ MO-7781                    │  │
│  │ Sri Lakshmi Stores         │  │
│  │ ○ placed · Credit          │  │
│  │ ₹17,098 · 21-08            │  │
│  └────────────────────────────┘  │
│  ┌────────────────────────────┐  │
│  │ INV-2408200087             │  │
│  │ ⚠ suspended · Refund due   │  │
│  │ ₹880 · 20-08               │  │
│  └────────────────────────────┘  │
├──────────────────────────────────┤
│  [ Export CSV ]                  │
└──────────────────────────────────┘
```

Note the Indian digit grouping in the total: `₹4,18,240`, not `₹418,240`.

### SUP-11.1 Order detail and invoice

**Data**

| Shown | Source |
| ----- | ------ |
| Invoice, items, tax, payment | `FS get /Orders/{id}` or `FS get /MerchantOrders/{id}` |
| Buyer / shop / driver | `FS get /UserProfiles/{…}` + `FS get /Gigs/{gigId}` |

| Control | On click |
| ------- | -------- |
| Invoice view / download | `nav` shared invoice (`Patterns.md`) — same document, no Function |
| Cancel order | `Fn cancelOrder` |
| Refund (when paid / due) | `Fn refundOrder` |

```
┌──────────────────────────────────┐
│  ←  INV-2408210001        [👤]    │
├──────────────────────────────────┤
│  Buyer      Anil Kumar           │
│  Village    Karavadi             │
│  Pickup     Sri Lakshmi Stores   │
│  Gig        Ongole → Markapur    │
│  Driver     Hari                 │
├──────────────────────────────────┤
│  Rice 25kg × 1  1006  ₹1,100     │
│  Oil 1L × 2     1514    ₹360     │
│  Discount HARVEST10    −₹146     │
│                                  │
│  Taxable value        ₹1,314     │
│  CGST 9%                ₹118     │
│  SGST 9%                ₹118     │
│  IGST 0%                  ₹0     │
│  Total                ₹1,550     │
├──────────────────────────────────┤
│  Payment    Paid · UPI           │
│  Delivery   reached_merchant     │
│  Invoice    INV-2408210001       │
│  Dated      21-08-2026           │
├──────────────────────────────────┤
│  [ Invoice view / download ]     │
│  [ Cancel order ]                │
└──────────────────────────────────┘
```

The full compliant tax invoice layout is the shared component in [Patterns.md](Patterns.md).

### SUP-12 Financial report

The report was previously a single line reading "Revenue · orders · AOV · top SKU", with no output layout.

**Data**

| Shown | Source |
| ----- | ------ |
| Report tiles / locks | `Fn getEntitlements` |
| Report body | `Fn getFinancialReport` (trading summary) or `Fn getFinanceReport` `{ reportType }` |
| TDS register | `Fn getTdsRegister` when entitled |
| Dates / count-by | `local` until Run |

| Control | On click |
| ------- | -------- |
| Report tile | `local` select; locked tiles `nav SUP-15` |
| Run report | `Fn getFinancialReport` or `Fn getFinanceReport` |
| Export CSV | `Fn exportFinanceReport` |
| Schedule | `Fn scheduleFinanceReport` |
| Compare plans / Upgrade | `nav SUP-15` |

```
┌──────────────────────────────────┐
│  ←  Reports               [👤]    │
├──────────────────────────────────┤
│  Included in Growth              │
│  ┌────────────────────────────┐  │
│  │ Trading summary            │  │
│  │ Revenue, orders, top SKUs  │  │
│  └────────────────────────────┘  │
│  ┌────────────────────────────┐  │
│  │ Payments received          │  │
│  │ UPI, cash, credit          │  │
│  └────────────────────────────┘  │
│  ┌────────────────────────────┐  │
│  │ Driver payouts             │  │
│  │ Paid, pending, failed      │  │
│  └────────────────────────────┘  │
│  ┌────────────────────────────┐  │
│  │ Merchant ageing            │  │
│  │ 0-30, 31-60, 60+ days      │  │
│  └────────────────────────────┘  │
│  ┌────────────────────────────┐  │
│  │ Gateway fees and GST       │  │
│  └────────────────────────────┘  │
├──────────────────────────────────┤
│  In Enterprise                   │
│  ┌────────────────────────────┐  │
│  │ 🔒 Reconciliation summary   │  │
│  │ Match bank to platform     │  │
│  │            [ See plans ]   │  │
│  └────────────────────────────┘  │
│  ┌────────────────────────────┐  │
│  │ 🔒 GST filing pack          │  │
│  │ GSTR-1 ready export        │  │
│  │            [ See plans ]   │  │
│  └────────────────────────────┘  │
│  ┌────────────────────────────┐  │
│  │ 🔒 TDS register             │  │
│  │            [ See plans ]   │  │
│  └────────────────────────────┘  │
└──────────────────────────────────┘
```

**Report output**

```
┌──────────────────────────────────┐
│  ←  Payments received     [👤]    │
├──────────────────────────────────┤
│  From [ 01-08-2026 ]             │
│  To   [ 21-08-2026 ]             │
│  Count by  (•) When paid         │
│            ( ) When it reached   │
│                the bank          │
│  [  Run report  ]                │
├──────────────────────────────────┤
│  01-08 to 21-08-2026             │
│  Counted by payment date         │
│  Period is open — figures can    │
│  still change.                   │
├──────────────────────────────────┤
│  Collected            ₹4,18,240  │
│    UPI                ₹2,81,900  │
│    Cash at pickup       ₹22,180  │
│    Merchant credit    ₹1,14,160  │
│  Refunded               −₹6,420  │
│  Net                  ₹4,11,820  │
│                                  │
│  Gateway fees           ₹5,638   │
│  GST on fees            ₹1,015   │
│  Reached the bank     ₹2,75,247  │
├──────────────────────────────────┤
│  Not settled yet                 │
│  Still confirming  3 · ₹4,180    │
│  Failed today      7 · ₹9,240    │
├──────────────────────────────────┤
│  [ Export CSV ]  [ Schedule ]    │
│  8 of 10 exports left this month │
└──────────────────────────────────┘
```

**Locked report opened directly**

```
┌──────────────────────────────────┐
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│  Reconciliation summary          │
│                                  │
│  Matches every payment and       │
│  payout against your bank        │
│  statement, and lists what       │
│  doesn't line up.                │
│                                  │
│  Your plan   Growth              │
│  Needs       Enterprise          │
│              ₹9,999 + GST/month  │
│                                  │
│  You'd pay ₹4,823 now for the    │
│  rest of this month, then        │
│  ₹11,799 from 01-09.             │
│                                  │
│  [ Compare plans ]               │
│  [  Upgrade and pay  ]           │
└──────────────────────────────────┘
```

**Actions:** each report calls `getFinanceReport` with its `reportType`; the older `getFinancialReport` remains for the trading summary. `INVALID_DATE_RANGE` is prevented client-side by validating the range before submission. `[ Export CSV ]` calls `exportFinanceReport` and consumes one metered export; `[ Schedule ]` calls `scheduleFinanceReport`. Both are absent, not disabled, on plans without the entitlement.

**The lock is shown before the form, never after it.** A supplier who picks a date range, waits for a run, and is then told the report needs a higher plan has been made to work for a refusal. Locked reports are listed with what they do and what they cost, so the decision is available at the point of interest.

**Every report states its basis and whether the period is closed.** Collections counted by payment date and collections counted by bank settlement date are both correct and will differ by whatever is in transit; a report that does not say which one it used produces a supplier and an accountant arguing about a discrepancy that is not one. An open period carries the warning that figures can still move, and a closed period says so with the close date, which is what makes it quotable.

**The unsettled block is part of the report, not a footnote.** Pending and failed transactions are exactly where money goes missing, and a revenue figure that quietly omits them looks tidier and is less true.

### SUP-13 Finance and subscription

**Data**

| Shown | Source |
| ----- | ------ |
| Plan card / renews / past_due | `FS get /PlatformSubscriptions/{id}` |
| Usage bars / finance tools | `Fn getEntitlements` |
| Money in / out / outstanding | `local` 30d from `MerchantOrders`, `PayoutTransactions`, `CreditProfiles`, `CashSettlements` — no report Function on this screen |
| Billing history | `FS query SubscriptionInvoices` where `subscriberId == uid` |

| Control | On click |
| ------- | -------- |
| Compare plans / What's in Enterprise / Choose a plan | `nav SUP-15` |
| Billing history / Tax invoice | `local` list; invoice is the SubscriptionInvoice get |
| Cancel plan | `Fn cancelSubscription` |
| Retry payment | `Fn createPaymentIntent` then `Fn processPayment` |
| Run a report | `nav SUP-12` |
| Credit / Payout / Cash | `nav SUP-04.3` / `SUP-05.2` / `SUP-16` |

```
┌──────────────────────────────────┐
│  Finance       🔊   🔔    [👤]      │
├──────────────────────────────────┤
│  Subscription                    │
│  ┌────────────────────────────┐  │
│  │ Growth · ✔ active          │  │
│  │ Monthly INR ₹2,999 + GST   │  │
│  │ Renews 01-09-2026          │  │
│  └────────────────────────────┘  │
│  Hubs 1/5  Routes 12/20          │
│  Gigs 142/200                    │
│  Merchants 3/50  Drivers 2/25    │
│                                  │
│  [ Compare plans ]               │
│  [ Billing history ]             │
│  [ Cancel subscription ]         │
├──────────────────────────────────┤
│  Finance tools in Growth         │
│  ✔ Payment and payout history    │
│  ✔ Custom date reports           │
│  ✔ Merchant ageing               │
│  ✔ CSV exports  8/10 left        │
│  ✔ Scheduled reports  1/3 used   │
│  🔒 Reconciliation workspace      │
│  🔒 Period close                  │
│  🔒 GST and TDS packs             │
│  [ What's in Enterprise ]        │
├──────────────────────────────────┤
│  Reports                         │
│  [ Run a report ]                │
├──────────────────────────────────┤
│  Money in (30d)                  │
│  Buyer orders        ₹94,180     │
│  Bulk orders       ₹3,24,060     │
│  Credit repaid       ₹14,240     │
│                                  │
│  Money out (30d)                 │
│  Driver payouts       ₹9,200     │
│  Subscription         ₹3,539     │
├──────────────────────────────────┤
│  Outstanding                     │
│  Merchant credit     ₹21,198     │
│  ⚠ Overdue            ₹4,100     │
│  Driver dues          ₹3,200     │
│  ⏳ Cash with drivers ₹12,450     │
│  Oldest settlement 2 days open   │
├──────────────────────────────────┤
│  [ Credit requests 2 ]           │
│  [ Payout requests 1 ]           │
│  [ Cash and settlements 3 ]      │
├──────────────────────────────────┤
│[Dashboard][Gigs][Inventory][Fin.]│
└──────────────────────────────────┘
```

**Past due subscription**

```
│  ┌────────────────────────────┐  │
│  │ Growth · ⚠ past_due        │  │
│  │ Payment failed 01-09-2026  │  │
│  │ INV-SUB-2609-0141          │  │
│  │ Card declined              │  │
│  │                            │  │
│  │ Grace until 08-09. Until   │  │
│  │ then everything works.     │  │
│  │                            │  │
│  │ After 08-09 you lose       │  │
│  │ custom reports and         │  │
│  │ exports. Payouts, refunds  │  │
│  │ and invoices keep working. │  │
│  │      [ Retry payment ]     │  │
│  └────────────────────────────┘  │
```

**Expired subscription**

```
│  ┌────────────────────────────┐  │
│  │ Growth · ✖ expired         │  │
│  │ Ended 08-09-2026           │  │
│  │                            │  │
│  │ ✖ No new gigs or routes    │  │
│  │ ✖ No custom reports or     │  │
│  │   exports                  │  │
│  │ ✔ Approve and track payouts│  │
│  │ ✔ Refunds and credit notes │  │
│  │ ✔ All invoices and history │  │
│  │ ✔ Basic 30-day summary     │  │
│  │      [ Choose a plan ]     │  │
│  └────────────────────────────┘  │
```

**Billing history**

```
┌──────────────────────────────────┐
│  ←  Billing history       [👤]    │
├──────────────────────────────────┤
│  ┌────────────────────────────┐  │
│  │ 01-08-2026 · Growth        │  │
│  │ INV-SUB-2608-0141          │  │
│  │ ₹2,999 + ₹540 GST          │  │
│  │ ✔ Paid · ₹3,539            │  │
│  │ UPI · PT-2608010012        │  │
│  │   [ Tax invoice ]          │  │
│  └────────────────────────────┘  │
│  ┌────────────────────────────┐  │
│  │ 21-08-2026 · Growth        │  │
│  │ Upgrade part-month         │  │
│  │ INV-SUB-2608-0193          │  │
│  │ ₹4,088 + ₹736 GST          │  │
│  │ ✔ Paid · ₹4,823            │  │
│  │   [ Tax invoice ]          │  │
│  └────────────────────────────┘  │
│  ┌────────────────────────────┐  │
│  │ 01-07-2026 · Starter       │  │
│  │ ₹999 · LOGIKLAUNCH50       │  │
│  │ ✔ Paid · ₹589              │  │
│  │   [ Tax invoice ]          │  │
│  └────────────────────────────┘  │
│                                  │
│  Kept for 8 years, whatever      │
│  plan you're on.                 │
└──────────────────────────────────┘
```

**Cancel subscription**

```
┌──────────────────────────────────┐
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│  Cancel Growth?                  │
│                                  │
│  You keep access until           │
│  01-09-2026. After that:         │
│                                  │
│  ✖ No new gigs                   │
│  ✖ No new routes                 │
│  ✖ No merchant or driver         │
│    upgrades                      │
│  ✖ No custom reports or exports  │
│  ✔ Open orders still complete    │
│  ✔ You can still approve and     │
│    track driver payouts          │
│  ✔ Every invoice, credit note    │
│    and receipt stays readable    │
│  ✔ Exports you already made      │
│    stay downloadable             │
│                                  │
│  [ Keep plan ]  [ Cancel plan ]  │
└──────────────────────────────────┘
```

**Actions:** `cancelSubscription` sets the subscription to `cancelled` at `currentPeriodEnd` rather than immediately. Retry payment calls `createPaymentIntent` for the open `SubscriptionInvoice` and then `processPayment`, so the amount charged is the tariff the server holds and not a figure the client sends back, and entitlements are re-granted only when that payment succeeds. `[ Cash and settlements ]` opens `SUP-16`, and the `⏳ Cash with drivers` figure above it is the same server-derived total that screen leads with, so the two cannot disagree. It sits under Outstanding rather than under Money in because it is money the supplier owns and does not yet hold — the same category as credit a merchant has drawn.

**Every subscription state names what still works, not only what stops.** A supplier reading "expired" needs to know within one screen whether their drivers can still be paid. The answer is always yes, and saying so explicitly is what stops a lapsed card from turning into unpaid drivers. Baseline entitlements — the balances, the payout approvals, the invoices, the basic summary — are listed under `✔` in every degraded state precisely because that is when a supplier doubts them.

**The finance tools block is rendered from `getEntitlements`, not from the plan name.** Metered items show consumption against the ceiling rather than a bare tick, so a supplier discovers they have two exports left before they need the third rather than at the moment they are refused.

### SUP-14 AI assistant workspace

Five AI entry points existed as bare buttons on flows that mutate stock and pricing, with no prompt, no preview and no undo. They all now route through the AI pattern defined in [Patterns.md](Patterns.md), specialised here per task.

**Data**

| Shown | Source |
| ----- | ------ |
| Current rows | `FS query Products` / `Discounts` / `Pamphlets` / `Routes` where `supplierId == uid` (task picker) |
| Prompt / preview ticks | `local` — Gemini proposal, not a Function |
| Undo window | `local` snapshot of the last applied write |

| Control | On click |
| ------- | -------- |
| Task / prompt / Speak / ticks | `local` |
| Generate preview | Gemini — not a Logikchain Function |
| Apply changes | `FS write` of supplier-owned Products (except `stock`) / Discounts / Pamphlets / Routes |
| Discard | `local` drop proposal |
| Undo | `FS write` restore from the `local` snapshot |

```
┌──────────────────────────────────┐
│  ←  AI assistant          [👤]    │
├──────────────────────────────────┤
│  Task    [ Update inventory  ▾]  │
│  Options: update inventory,      │
│  create discount, update         │
│  pamphlet, build route           │
├──────────────────────────────────┤
│  What should I change?           │
│  ┌────────────────────────────┐  │
│  │ Raise all staple prices by │  │
│  │ 4% and restock rice to 80. │  │
│  │                            │  │
│  │            [ 🎤 Speak ]    │   │
│  └────────────────────────────┘  │
│                                  │
│  Try                             │
│  • "Mark dairy items out of      │
│     stock"                       │
│  • "10% off oils above ₹500"     │
│                                  │
│  [  ✨ Generate preview  ]        │
└──────────────────────────────────┘
```

**Preview with diff**

```
┌──────────────────────────────────┐
│  ←  Review AI changes            │
├──────────────────────────────────┤
│  4 products will change          │
│  Nothing is saved yet.           │
├──────────────────────────────────┤
│  ┌────────────────────────────┐  │
│  │ Rice 25kg                  │  │
│  │ − Price ₹1,250             │  │
│  │ + Price ₹1,300             │  │
│  │ − Stock 40                 │  │
│  │ + Stock 80                 │  │
│  └────────────────────────────┘  │
│  ┌────────────────────────────┐  │
│  │ Toor dal 5kg               │  │
│  │ − Price ₹640               │  │
│  │ + Price ₹666               │  │
│  └────────────────────────────┘  │
│  ┌────────────────────────────┐  │
│  │ ⚠ Sugar 10kg               │  │
│  │ In an active pamphlet at   │  │
│  │ ₹520. Raising to ₹541 will │  │
│  │ break that promotion.      │  │
│  └────────────────────────────┘  │
├──────────────────────────────────┤
│  (x) Apply all                   │
│  Uncheck any row to skip it.     │
│                                  │
│  [ Discard ]   [ Apply changes ] │
└──────────────────────────────────┘
```

**Applied, with undo**

```
┌──────────────────────────────────┐
│  ✔ 4 products updated            │
│  Rice 25kg, Toor dal 5kg, +2     │
│                                  │
│  [ Undo ]                        │
│  Undo available for 10 minutes   │
└──────────────────────────────────┘
```

AI output is always a proposal. It never writes directly, conflicts with live pamphlets and open orders are flagged before applying, and the batch stays reversible for ten minutes — a fleeting toast is not a safety net for a bulk price change made on a 2G connection. The window matches the AI pattern in [Patterns.md](Patterns.md).

### SUP-15 Plan comparison

Two separate screens link to `[ View plans ]` and neither had a destination.

**Data**

| Shown | Source |
| ----- | ------ |
| Plan cards / finance table | `Fn listConfigurationCatalog` — supplier plans only |
| Current plan / usage flags | `Fn getEntitlements` + `FS get /PlatformSubscriptions/{id}` |
| Upgrade / downgrade sheet | `Fn previewPlanChange` |

| Control | On click |
| ------- | -------- |
| Monthly / Annual / Operations / Finance | `local` |
| Apply (offer code) | `Fn previewPlanChange` |
| Choose / Upgrade and pay | first plan: `Fn subscribeToPlan`; change: `Fn changeSubscriptionPlan` |
| Downgrade / Keep | `Fn changeSubscriptionPlan` or dismiss |

```
┌──────────────────────────────────┐
│  ←  Plans                 [👤]    │
├──────────────────────────────────┤
│  Billing  [ Monthly ] [ Annual ] │
│  Show  [ Operations ][ Finance ] │
├──────────────────────────────────┤
│  ┌────────────────────────────┐  │
│  │ Starter                    │  │
│  │ ₹999 + GST / month         │  │
│  │                            │  │
│  │ Hubs           1           │  │
│  │ Routes         3           │  │
│  │ Gigs / month   20          │  │
│  │ Merchants      10          │  │
│  │ Drivers        5           │  │
│  │                            │  │
│  │ ⚠ Below your current use   │  │
│  │      [ Choose Starter ]    │  │
│  └────────────────────────────┘  │
│  ┌────────────────────────────┐  │
│  │ Growth · current           │  │
│  │ ₹2,999 + GST / month       │  │
│  │                            │  │
│  │ Hubs           5           │  │
│  │ Routes         20          │  │
│  │ Gigs / month   200         │  │
│  │ Merchants      50          │  │
│  │ Drivers        25          │  │
│  │                            │  │
│  │      [ Current plan ]      │  │
│  └────────────────────────────┘  │
│  ┌────────────────────────────┐  │
│  │ Enterprise                 │  │
│  │ ₹9,999 + GST / month       │  │
│  │                            │  │
│  │ Everything unlimited       │  │
│  │      [ Choose Enterprise ] │  │
│  └────────────────────────────┘  │
└──────────────────────────────────┘
```

**Finance view** — the same three plans, compared on what they let a supplier see and prove.

```
┌──────────────────────────────────┐
│  ←  Plans · Finance       [👤]    │
├──────────────────────────────────┤
│  In every plan, always           │
│  ✔ Balances, dues, cash in hand  │
│  ✔ Approve and track payouts     │
│  ✔ Payment and payout references │
│  ✔ Invoices, credit notes, GST   │
│  ✔ 30-day finance summary        │
│  Your money is never behind a    │
│  paywall.                        │
├──────────────────────────────────┤
│              Star  Grow  Enter   │
│  Custom date      ✖     ✔     ✔  │
│    reports                       │
│  Merchant ageing  ✖     ✔     ✔  │
│  Driver payout    ✖     ✔     ✔  │
│    analysis                      │
│  Fee and GST      ✖     ✔     ✔  │
│    summaries                     │
│  CSV / XLSX       ✖    10    100 │
│    exports / mo                  │
│  Scheduled        ✖     3     20 │
│    reports                       │
│  Reconciliation   ✖     ✖     ✔  │
│    workspace                     │
│  Settlement       ✖     ✖     ✔  │
│    exceptions                    │
│  Period close     ✖     ✖     ✔  │
│    and lock                      │
│  Multi-hub        ✖     ✖     ✔  │
│    consolidated                  │
│  GST and TDS      ✖     ✖     ✔  │
│    filing packs                  │
│  Tally export     ✖     ✖     ✔  │
│  History kept    12m   36m    96m│
├──────────────────────────────────┤
│  [ Choose Enterprise ]           │
└──────────────────────────────────┘
```

A downgrade that would fall below current usage is flagged, since the plan caps are enforced server-side and a supplier with 12 routes cannot function on a 3-route plan.

**Upgrade sheet — mid-cycle**

```
┌──────────────────────────────────┐
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│  Move to Enterprise              │
│                                  │
│  Tariff  [ Monthly INR       ▾]  │
│                                  │
│  Offer code                      │
│  ┌──────────────┐ [ Apply ]      │
│  │ LOGIKLAUNCH50│                │
│  └──────────────┘                │
│  ✖ Not valid for Enterprise      │
│                                  │
│  Enterprise            ₹9,999    │
│  Unused Growth        −₹1,999    │
│  For 10 days           ₹4,088    │
│  GST 18%                 ₹736    │
│  Pay now               ₹4,823    │
│                                  │
│  Then ₹11,799 from 01-09-2026    │
│                                  │
│  You get straight away           │
│  + Reconciliation workspace      │
│  + Settlement exceptions         │
│  + Period close and lock         │
│  + GST and TDS packs             │
│  + 100 exports a month           │
│                                  │
│  Starts when the payment clears. │
│                                  │
│  [  Upgrade and pay ₹4,823  ]    │
└──────────────────────────────────┘
```

**Downgrade sheet**

```
┌──────────────────────────────────┐
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│  Move to Starter                 │
│                                  │
│  Starts 01-09-2026, when this    │
│  month ends. Nothing changes     │
│  before then, and there's        │
│  nothing to pay now.             │
│                                  │
│  From 01-09 you lose             │
│  − Custom date reports           │
│  − Merchant ageing               │
│  − Driver payout analysis        │
│  − CSV exports                   │
│  − Scheduled reports (3 running) │
│                                  │
│  Report history drops from       │
│  36 months to 12. Nothing is     │
│  deleted — older months stop     │
│  showing until you move back up. │
│                                  │
│  ⚠ You have 12 routes. Starter   │
│    allows 3. Remove 9 before     │
│    01-09 or the change fails.    │
│                                  │
│  (x) I understand what stops     │
│      working                     │
│                                  │
│  [ Keep Growth ]  [ Downgrade ]  │
└──────────────────────────────────┘
```

**After paying for an upgrade**

```
│  ✔ You're on Enterprise          │
│  Paid ₹4,823 · PT-2608210233     │
│  Tax invoice INV-SUB-2608-0193   │
│                                  │
│  Reconciliation, period close    │
│  and the filing packs are open   │
│  now.                            │
│                                  │
│  [ Open reconciliation ]         │
│  [ Back to finance ]             │
```

**Actions:** the first subscription calls `subscribeToPlan`; a change from an existing plan calls `previewPlanChange` to build this sheet and then `changeSubscriptionPlan`. Both price the tariff, apply the offer and raise the `SubscriptionInvoice` and `PaymentIntent` server-side; the figures on the sheet are the ones the preview returned rather than ones the sheet computed. Only plans with `targetRole: "supplier"` and `status: "active"` are listed. `INVALID_DISCOUNT` is shown inline against the code field, naming the reason, rather than as an opaque toast.

**The baseline block sits above the comparison table on purpose.** A pricing table that lists finance capabilities without it invites the reading that a supplier who stops paying loses sight of their own money, which is both untrue and the sort of belief that costs a platform its network. Stating the floor first also makes the paid rows honest: what is being sold is depth, analysis and filing evidence, not access to one's own balances.

**Gains are stated as capabilities and losses as consequences.** An upgrade lists what opens immediately; a downgrade names each entitlement withdrawn, states plainly that history is hidden rather than deleted, and flags any operational cap the supplier is already exceeding. `changeSubscriptionPlan` refuses a lossy change unless the acknowledgement is ticked, so nobody discovers on the first of the month that their scheduled reports stopped.

**Upgrades take effect on payment; downgrades take effect at renewal.** A supplier who pays mid-cycle should not wait, and a supplier who has paid for a month should not have it cut short. The sheets say which rule applies before the button is pressed.

### SUP-16 Cash and settlements

The answer to "who is holding my money". Cash a driver collects on a route belongs to the supplier from the moment it is verified, but it sits in someone else's pocket until a settlement closes, and the risk of that gap is the supplier's to carry. This screen makes the gap a figure with names and an age against it.

**Data**

| Shown | Source |
| ----- | ------ |
| Out-with-drivers total / breakdown / asOf | `Fn getCashCustodySummary` `scope: "supplier"` |
| Settlement rows | same Fn holders + `FS query CashSettlements` where `supplierId == uid` |
| Offline total | `cache` of that summary with `[cached]` |
| Settlement-code sheet | `Fn issueOfflineCodeBatch` response — plaintext shown once, then `local` |

| Control | On click |
| ------- | -------- |
| Open / Disputed / All / sort | `local` |
| Confirm / row | `nav SUP-16.1` |
| View (disputed) | `nav SUP-16.2` |
| Verification requests | `nav SUP-16.3` |
| My settlement codes / Print | `local` of last batch |
| Issue new sheet | `Fn issueOfflineCodeBatch` `{ purpose: "cash_settlement" }` |
| Pull to refresh | re-run Shown reads |

```
┌──────────────────────────────────┐
│  ←  Cash and settlements  [👤]    │
├──────────────────────────────────┤
│  ⏳ Out with your drivers         │
│  ₹12,450.00                      │
│  As of 21-08-2026 06:40 PM       │
│                                  │
│  Buyer cash orders    ₹3,150.00  │
│  7 orders · 2 drivers            │
│  Merchant repayments  ₹7,000.00  │
│  3 merchants                     │
│  Merchant bulk cash   ₹2,300.00  │
│  2 orders                        │
│  ──────────────────────────────  │
│  Total               ₹12,450.00  │
├──────────────────────────────────┤
│  [ Open 2 ][ Disputed 1 ][ All ] │
│  Sort [ Oldest first         ▾]  │
├──────────────────────────────────┤
│  ┌────────────────────────────┐  │
│  │ Hari · AP-27-TX-1234       │  │
│  │ Ongole → Markapur · 19-08  │  │
│  │ App says        ₹8,450.00  │  │
│  │ He declared     ₹8,200.00  │  │
│  │ ⚠ Open 2 days              │  │
│  │               [ Confirm ]  │  │
│  └────────────────────────────┘  │
│  ┌────────────────────────────┐  │
│  │ Ramesh · AP-27-TZ-9911     │  │
│  │ Podili circuit · 21-08     │  │
│  │ App says        ₹4,000.00  │  │
│  │ ⏳ Not declared yet         │  │
│  │ Open 4 hours               │  │
│  │               [ Confirm ]  │  │
│  └────────────────────────────┘  │
│  ┌────────────────────────────┐  │
│  │ Suresh · AP-27-TX-4521     │  │
│  │ Kanigiri run · 18-08       │  │
│  │ ⚠ disputed · short ₹250.00 │  │
│  │ Support is reviewing it    │  │
│  │                 [ View ]   │  │
│  └────────────────────────────┘  │
├──────────────────────────────────┤
│  [ Verification requests 1 ]     │
│  [ My settlement codes ]         │
└──────────────────────────────────┘
```

The block at the top is the custody card from section 8.1 of [Patterns.md](Patterns.md), itemised by the same three sources and aggregated across every driver rather than shown for one. Each source line opens the ledger entries behind it, each naming its order, its counterparty and the minute it was collected. Rows are sorted oldest first by default, because a settlement that has been open for two days is the thing worth seeing — a driver who is four hours late to the hub is a driver on a long route, and a driver who is two days late is a different problem entirely. Tapping a row opens `SUP-16.1`.

**Nothing outstanding**

```
┌──────────────────────────────────┐
│                                  │
│             [ ✔ ]                │
│                                  │
│    Nothing is out with a         │
│    driver right now.             │
│    Every gig has settled.        │
│                                  │
│      [ Pull to refresh ]         │
│                                  │
└──────────────────────────────────┘
```

**Offline**

```
├──────────────────────────────────┤
│  ⚠ Offline: data may be outdated │
├──────────────────────────────────┤
│  ⏳ Out with your drivers         │
│  ₹12,450.00  [cached]            │
│  As of 21-08-2026 06:40 PM       │
│  Counting cash needs a           │
│  connection unless you read out  │
│  a code from your sheet.         │
```

The total carries `[cached]` rather than disappearing, and `asOf` stays visible, because a stale figure a supplier can date is worth more than a blank where a figure should be. A read failure on the settlement list shows the inline `⚠ Could not load` banner with `[ Retry ]` over the custody card, which loads separately and stays readable.

**My settlement codes**

```
┌──────────────────────────────────┐
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│  My settlement codes        [ X ]│
│                                  │
│  Read one of these out to a      │
│  driver when neither of you has  │
│  signal. Each one works once.    │
│                                  │
│  07   4 7 2 9 1 6                │
│  08   8 1 5 0 3 3                │
│  09   2 9 6 4 8 1                │
│  Used  01 to 06                  │
│                                  │
│  Expires 20-09-2026              │
│  A new sheet cancels this one.   │
│                                  │
│  [ Print ]  [ Issue new sheet ]  │
└──────────────────────────────────┘
```

**Actions:** Every figure on this screen comes from `getCashCustodySummary` at `scope: "supplier"`, which returns one `CashCustodyHolderSummary` per driver and merchant holding this supplier's money along with the network total, `weakProofAmount` and `oldestOpenSettlementAt`. The screen never sums the rows itself, and the `asOf` it returns is what lets this total and the driver's own be compared rather than argued about. A supplier cannot widen the scope past their own network: naming another `supplierId` is refused, and `scope: "platform"` is Support's alone. `[ Issue new sheet ]` calls `issueOfflineCodeBatch` with `purpose: "cash_settlement"`, which revokes the previous sheet so only one is ever live — a supplier holding two sheets is a supplier who cannot tell which codes are spent. The plaintext codes are shown once and never retrievable again. `[ Verification requests 1 ]` opens `SUP-16.3`. Reached from `SUP-13` and from the attention block on `SUP-02`.

### SUP-16.1 Confirm driver settlement

The supplier's half of the two-sided handover in section 8.2 of [Patterns.md](Patterns.md). The driver has already said what they are handing over; this screen records what was actually counted, against a code the driver cannot read.

**Data**

| Shown | Source |
| ----- | ------ |
| Driver, gig, expected / declared | `FS get /CashSettlements/{id}` + `FS get /UserProfiles/{driverId}` + `FS get /Gigs/{gigId}` |
| Supplier code digits | `FS get /CashSettlements/{id}/private/code` |
| I counted / resolution / note | `local` — counted is never pre-filled |

| Control | On click |
| ------- | -------- |
| Call | `tel:` driver |
| Counted / radios / note / Read aloud | `local` |
| Send the code again | `Fn resendHandoverCode` `{ settlementId }` |
| Confirm settlement | `Fn confirmCashSettlement` |

```
┌──────────────────────────────────┐
│  ←  Confirm settlement    [👤]    │
├──────────────────────────────────┤
│  From  Hari · AP-27-TX-1234      │
│  Gig   Ongole → Markapur · 19-08 │
│  Opened 19-08-2026 06:40 PM      │
│                   [ 📞 Call ]     │
├──────────────────────────────────┤
│  App says          ₹8,450.00     │
│  Driver declared   ₹8,200.00     │
│  declared 06:52 PM               │
│  "Buyer paid ₹250 short"         │
├──────────────────────────────────┤
│  I counted                       │
│  ┌────────────────────────────┐  │
│  │ ₹ 8,200                    │  │
│  └────────────────────────────┘  │
│  ⚠ Short by ₹250.00              │
├──────────────────────────────────┤
│  What should happen?             │
│  ( ) Take it from driver's pay   │
│      recover_from_earnings       │
│  ( ) Carry to the next gig       │
│      carry_forward               │
│  ( ) Write it off                │
│      waive                       │
│  (•) Send to support             │
│      escalate_to_support         │
│  Note                            │
│  ┌────────────────────────────┐  │
│  │ Buyer paid short at        │  │
│  │ Karavadi                   │  │
│  └────────────────────────────┘  │
├──────────────────────────────────┤
│  Your code · read it to Hari     │
│  4 7 2 9 1 6                     │
│  [ 🔊 Read the digits aloud ]     │
│  [ Send the code again ]         │
│  He types it on his own phone.   │
├──────────────────────────────────┤
│  [ Confirm settlement ]          │
│  Confirming here is recorded as  │
│  your signature.                 │
└──────────────────────────────────┘
```

Three amounts are on the screen and all three are stored: what the ledger expected, what the driver declared, and what the supplier counted. One figure makes a shortfall contested; three make it attributable. `I counted` is never pre-filled from either of the other two, because a pre-filled count is not a count.

The variance block appears only when the counted amount differs from the expected one, and then `varianceResolution` and the note are both mandatory before `[ Confirm settlement ]` enables, with the reason under the button. `Write it off` is offered here because the supplier owns the money; it is hidden when a driver is the caller.

The code block is the supplier's own settlement code, held at `/CashSettlements/{settlementId}/private/code` and readable by nobody else. It is here because the supplier is the party being verified: they read the digits out at the counter and the driver types them on `DRV-10.2`. A supplier who confirms on their own device instead does not type it — the confirmation itself is the attestation, and it is recorded as a `"counter_signature"`, which is legitimate precisely because the party receiving the cash is the party attesting.

**Already confirmed**

```
┌──────────────────────────────────┐
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│  Already confirmed               │
│                                  │
│  This settlement was confirmed   │
│  at 06:58 PM today. Nothing was  │
│  counted twice.                  │
│                                  │
│  [ View receipt ]                │
└──────────────────────────────────┘
```

**The ledger moved underneath it**

```
┌──────────────────────────────────┐
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│  The amounts do not add up       │
│                                  │
│  The entries in this settlement  │
│  no longer come to ₹8,450.00.    │
│  Nothing was settled and the     │
│  cash stays with Hari.           │
│                                  │
│  Support has been told and can   │
│  see the same entries you can.   │
│                                  │
│  [ View entries ]     [ Close ]  │
└──────────────────────────────────┘
```

**Offline**

```
├──────────────────────────────────┤
│  ⚠ Offline: data may be outdated │
├──────────────────────────────────┤
│  [ Confirm settlement ]          │
│  (disabled)                      │
│  Counting needs a connection.    │
│  Read out code 07 from your      │
│  settlement code sheet and let   │
│  Hari enter it on his phone      │
│  instead. It sends when either   │
│  of you has signal.              │
```

**Actions:** `[ Confirm settlement ]` calls `confirmCashSettlement` with `countedAmount`, the proof, and — on any variance — `varianceResolution` and `varianceNote`. `[ Send the code again ]` calls `resendHandoverCode` with `settlementId`, goes to the supplier's own registered phone, and is disabled with a countdown after three sends in an hour. `SETTLEMENT_ALREADY_CONFIRMED` raises the first sheet above and refreshes the screen to the receipt; nothing is counted twice, because the `idempotencyKey` is checked before the ledger is read at all. `LEDGER_IMBALANCE` raises the second: the entries named on this settlement no longer sum to `expectedAmount`, so the settlement is refused rather than reconciled to whatever the ledger says now, and the cash stays where it is. Choosing `escalate_to_support` opens a `CashDiscrepancy`, moves the settlement to `disputed`, and leaves custody with the driver — the screen then shows `SUP-16.2` rather than a receipt. Offline the count is disabled with the reason and the strong-proof path through the driver's device is named in its place, since a code the supplier reads aloud is available with no network at all.

### SUP-16.2 Settlement variance

A settlement that did not balance, in full. Reached from `SUP-16.1` on escalation and from the `disputed` filter on `SUP-16`.

**Data**

| Shown | Source |
| ----- | ------ |
| Amounts, status, breakdown | `FS get /CashSettlements/{id}` |
| Discrepancy / raised-by | `FS get /CashDiscrepancies/{settlement.discrepancyId}` |
| Resolve / report fields | `local` |

| Control | On click |
| ------- | -------- |
| Resolve | `Fn resolveCashDiscrepancy` |
| Report a problem | `Fn raiseCashDiscrepancy` |
| Radios / amount / note / photo | `local` until that Fn |
| Custody trail | `nav SPT-19.2` |

```
┌──────────────────────────────────┐
│  ←  Settlement variance   [👤]    │
│     Hari · 19-08-2026            │
├──────────────────────────────────┤
│  ⚠ disputed                      │
│  The cash stays with Hari until  │
│  this is closed.                 │
├──────────────────────────────────┤
│  App says          ₹8,450.00     │
│  Hari declared     ₹8,200.00     │
│  You counted       ₹8,200.00     │
│  ──────────────────────────────  │
│  Short by            ₹250.00     │
│  shortfall                       │
├──────────────────────────────────┤
│  What this settlement covers     │
│  ┌────────────────────────────┐  │
│  │ Buyer cash orders          │  │
│  │ 7 orders        ₹3,150.00  │  │
│  └────────────────────────────┘  │
│  ┌────────────────────────────┐  │
│  │ Merchant repayments        │  │
│  │ 2 merchants     ₹4,000.00  │  │
│  └────────────────────────────┘  │
│  ┌────────────────────────────┐  │
│  │ Merchant bulk cash         │  │
│  │ 1 order         ₹1,300.00  │  │
│  └────────────────────────────┘  │
├──────────────────────────────────┤
│  Raised 19-08-2026 07:04 PM      │
│  By you · sent to support        │
│  "Buyer paid short at Karavadi"  │
├──────────────────────────────────┤
│  [ Resolve ]                     │
│  [ Report a problem ]            │
│  [ Custody trail ]               │
└──────────────────────────────────┘
```

**An overage**

```
│  App says          ₹8,450.00     │
│  Hari declared     ₹8,700.00     │
│  You counted       ₹8,700.00     │
│  ──────────────────────────────  │
│  Over by             ₹250.00     │
│  overage                         │
│                                  │
│  Extra cash gets its own ledger  │
│  entry, not a shrug. Say where   │
│  it came from before you close   │
│  this.                           │
```

An overage is treated with exactly the seriousness of a shortfall and gets its own ledger entry with `source: "overage"`, because two hundred and fifty rupees nobody can account for is unexplained whichever direction it points. Absorbing it silently would mean the next shortfall has nowhere to be explained from.

**Resolve**

```
┌──────────────────────────────────┐
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│  Resolve ₹250.00 shortfall  [ X ]│
│                                  │
│  Against  Hari (driver)          │
│  Gig      Ongole → Markapur      │
│                                  │
│  ( ) Take it from driver's pay   │
│      recover_from_earnings       │
│  (•) Carry to the next gig       │
│      carry_forward               │
│  ( ) Write it off                │
│      waive                       │
│                                  │
│  Sending it to support is not    │
│  yours to choose. Support ends   │
│  a review; it does not start     │
│  one from here.                  │
│                                  │
│  Amount                          │
│  ┌────────────────────────────┐  │
│  │ ₹ 250.00                   │  │
│  └────────────────────────────┘  │
│  Up to the ₹250.00 claimed.      │
│                                  │
│  Note (required, kept for good)  │
│  ┌────────────────────────────┐  │
│  │ Carried to Hari's next     │  │
│  │ gig; he agreed at the      │  │
│  │ counter.                   │  │
│  └────────────────────────────┘  │
│                                  │
│  This writes a ledger entry.     │
│  It does not edit a balance.     │
│                                  │
│  [ Cancel ]       [ Resolve ]    │
└──────────────────────────────────┘
```

**Report a problem**

```
┌──────────────────────────────────┐
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│  Report a problem           [ X ]│
│                                  │
│  What is wrong?                  │
│  (•) Short of what he declared   │
│      shortfall                   │
│  ( ) More than he declared       │
│      overage                     │
│  ( ) Cash I never saw recorded   │
│      unrecorded_collection       │
│  ( ) We disagree on the amount   │
│      disputed_amount             │
│                                  │
│  Amount                          │
│  ┌────────────────────────────┐  │
│  │ ₹ 250.00                   │  │
│  └────────────────────────────┘  │
│  Against  Hari (driver)          │
│                                  │
│  What happened                   │
│  ┌────────────────────────────┐  │
│  │ Counted twice with Hari    │  │
│  │ present. ₹250 missing.     │  │
│  └────────────────────────────┘  │
│  [ 📷 Add a photo ]               │
│                                  │
│  The settlement goes to disputed │
│  and the cash stays with Hari.   │
│                                  │
│  [ Cancel ]        [ Report ]    │
└──────────────────────────────────┘
```

**Actions:** `[ Report ]` calls `raiseCashDiscrepancy` with the kind, the amount, the party it is claimed against, and a description; referencing the settlement moves it to `disputed` and stamps `discrepancyId`. `[ Resolve ]` calls `resolveCashDiscrepancy` with a resolution, an optional adjusted amount capped at the claim, and a note that is never optional. `escalate_to_support` is absent from the supplier's resolve sheet because it is Support's to set, not the supplier's to hand over a second time. Every resolution writes a `CashLedgerEntry` — `source: "shortfall"` for a recovery, `"waiver"` for a write-off, an `"in_custody"` adjustment for a carry-forward — and none of them edits a balance in place. While the settlement is `disputed`, custody does not discharge: `cashInCustody` stays against the driver, `inTransitRepayments` stays against the merchants, and the driver's payout stays blocked. That is what having a disputed state is for. `[ Custody trail ]` opens `SPT-19.2` for suppliers who have escalated and want to read the same chain Support is reading.

### SUP-16.3 Authorise verification fallback

A driver standing at a counter with no code cannot close a handover on their own say-so. They ask, and this is where the asking arrives.

**Data**

| Shown | Source |
| ----- | ------ |
| Waiting cards | `FS query VerificationFallbackRequests` where `supplierId == uid` and `status == "pending"` |
| Granted today | `FS query VerificationFallbackAuthorizations` where `grantedBy == uid` |
| Allow reason | `local` |

| Control | On click |
| ------- | -------- |
| Allow | `Fn authorizeVerificationFallback` `{ requestId }` |
| Dismiss | `local` — writes nothing |
| Waiting / Granted chips | `local` filter |

```
┌──────────────────────────────────┐
│  ←  Verification requests [👤]    │
├──────────────────────────────────┤
│  [ Waiting 1 ] [ Granted today ] │
├──────────────────────────────────┤
│  ┌────────────────────────────┐  │
│  │ Hari · AP-27-TX-1234       │  │
│  │ Cannot get a code from you │  │
│  │ Cash settlement ₹8,450.00  │  │
│  │ Ongole → Markapur · 19-08  │  │
│  │ "Your phone was switched   │  │
│  │  off"                      │  │
│  │ Asked 06:44 PM             │  │
│  │                            │  │
│  │ [ Dismiss ]    [ Allow ]   │  │
│  └────────────────────────────┘  │
├──────────────────────────────────┤
│  Granted today                   │
│  ┌────────────────────────────┐  │
│  │ Ramesh · bulk order        │  │
│  │ Granted 11:20 AM by you    │  │
│  │ Used 11:24 AM · consumed   │  │
│  │ ⚠ Recorded as weak proof   │  │
│  └────────────────────────────┘  │
└──────────────────────────────────┘
```

**Allow**

```
┌──────────────────────────────────┐
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│  Let Hari finish without a code  │
│                                  │
│  Cash settlement    ₹8,450.00    │
│  Ongole → Markapur · 19-08       │
│                                  │
│  Why (kept on the record)        │
│  ┌────────────────────────────┐  │
│  │ My phone was switched off  │  │
│  └────────────────────────────┘  │
│                                  │
│  This lasts two hours and ends   │
│  at 08:44 PM. It covers this     │
│  one handover and Hari only.     │
│                                  │
│  Your name stays on it for good, │
│  and the handover is marked as   │
│  weak proof to Support.          │
│                                  │
│  [ Cancel ]        [ Allow ]     │
└──────────────────────────────────┘
```

**Nobody waiting**

```
┌──────────────────────────────────┐
│                                  │
│             [ ✔ ]                │
│                                  │
│    No one is stuck.              │
│    Nobody has asked to skip a    │
│    code today.                   │
│                                  │
└──────────────────────────────────┘
```

**Actions:** `[ Allow ]` calls `authorizeVerificationFallback` with the transfer kind, the target, the named driver and the reason. It creates a `VerificationFallbackAuthorization` that lives two hours, covers one handover, and names one driver — a permission that is broader than that is not an exception, it is a policy change. The authorisation is itself a permanent record with the granting supplier on it, Support is notified at the moment it is granted rather than reading about it later, and the handover it closes is stamped `strength: "weak"` wherever it appears afterwards. `ALREADY_EXISTS` means a live authorisation already covers this driver and target, and the screen shows that one instead of opening a second. `[ Dismiss ]` writes nothing at all: the driver's fallback stays blocked, they are told to try the code again, and the request returns if they ask again. Waiting is the point — an override a driver can grant themselves is not an override. Offline the grant is disabled with the reason: an authorisation the driver's device cannot read is worth nothing to them, and their own screen offers the supplier's offline code sheet in its place, which is stronger proof anyway.

---

## End-to-end flows

### Supplier gig and pamphlet

```
Inventory + → Route builder + → Discounts
  → Pamphlet builder → Compose gig → Gigs feed
  (blocked without a subscription or over the gig cap)
```

### Opening a merchant's credit line

```
Dashboard → Merchants → merchant detail
  → Set credit limit → setMerchantCreditLimit
  → merchant can now pay bulk orders on credit

or: Credit requests → Approve
  → reviewCreditIncreaseRequest + setMerchantCreditLimit
```

### Handling a breakdown

```
Driver reports breakdown → Gigs → gig detail
  → Suspend gig → suspendGig (buyers notified)
  → Reassign driver → reassignGigDriver
  → replacement resumes at the last stop
```

### Taking the day's cash off a driver

```
Gig ends → completeAndFinalizeGig opens a
  CashSettlement and issues your code
  → Finance → Cash and settlements
  → driver's row → Confirm settlement
  → count the notes, read your code out
  → confirmCashSettlement
  → ledger entries settled, merchants'
     in-transit repayments cleared

variance → choose a resolution
  → escalate_to_support → Settlement
     variance → cash stays with the driver
```

### Paying a driver

```
Finance → Payout requests → Approve
  → reviewPayoutRequest
  → any cashRecoverable netted off first
  → pendingDues reduced, payment logged
     to the frozen destination
  → driver notified
```
