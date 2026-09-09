# Support wireframes

**Nav:** Ops · Users · Config · Search

Support is the one role that is not a field role. It authors country dial-code regexes, plan caps, tariff windows and seven-field offer eligibility rules, and it triages incidents across every supplier on the platform. Those are desk tasks. This file therefore specifies a **responsive layout** (`SPT-18`): the 360px column remains the source of truth for structure and every screen must work in it, but from 1024px up the same screens reflow into a two-pane console.

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


Support cannot self-register. IT Administrators provision the account. Shared login / OTP / profile: [Shared.md](Shared.md).

Every screen below carries a **Data** contract per [Patterns.md](Patterns.md) §1A (Shown → Source, Control → On click). Header chrome (`🔊` `🔔` `👤`) is specified once there and is not repeated. `SPT-18` desktop (`xl`) uses the same Data — layout changes, sources do not. Every screen must also satisfy the loading, empty, error, offline, queued and disabled states in that file.

---

## Navigation change

The previous tabs were Hubs · Suppliers · Config · Search. Two problems: there was no landing screen showing what needed attention, and "Suppliers" excluded the buyers, merchants and drivers that Support is expected to search and suspend.

The tabs are now **Ops · Users · Config · Search**. Hubs and villages move into Config alongside the rest of the geography catalog, where they belong hierarchically. Suppliers become a filter on Users, so one screen covers every role.

---

## Screen index

| ID | Screen |
| -- | ------ |
| `SPT-01` | Operations dashboard |
| `SPT-02` | Users |
| `SPT-02.1` | User detail |
| `SPT-02.2` | Suspend or restore user |
| `SPT-02.3` | Create supplier |
| `SPT-02.4` | Supplier detail |
| `SPT-03` | Suspended orders queue |
| `SPT-04` | Village requests queue |
| `SPT-05` | Config home |
| `SPT-06` | Countries |
| `SPT-07` | States |
| `SPT-08` | Districts |
| `SPT-09` | Hubs |
| `SPT-09.1` | Hub detail and villages |
| `SPT-09.2` | Village editor |
| `SPT-10` | Subscription plans |
| `SPT-11` | Plan tariffs |
| `SPT-12` | Offers |
| `SPT-13` | Offer discount codes |
| `SPT-13.1` | Redemption audit |
| `SPT-14` | Platform subscriptions |
| `SPT-15` | Search and database explorer |
| `SPT-15.1` | Record detail |
| `SPT-16` | Audit log |
| `SPT-17` | Deactivation blocked |
| `SPT-18` | Responsive desktop layout |
| `SPT-19` | Cash custody console |
| `SPT-19.1` | Discrepancy resolution |
| `SPT-19.2` | Custody audit trail |
| `SPT-20` | Payment and payout exceptions |
| `SPT-21` | Reconciliation workspace |
| `SPT-22` | Period close |
| `SPT-23` | Tax profile and place of supply |
| `SPT-24` | TDS register |

---

## Operations

### SPT-01 Operations dashboard

The landing screen was a hub list, which told Support nothing about what was broken. Every queue below is an item where someone else is blocked.

**Data**

| Shown | Source |
| ----- | ------ |
| Clock | `local` |
| Suspended-orders / village-request / unauthorized / past-due tiles | `FS query Orders` where `deliveryStatus == "suspended"`; `FS query VillageRequests` where `status == "pending_support_review"`; `FS query UserProfiles` where `status == "unauthorized"`; `FS query PlatformSubscriptions` where `status == "past_due"` |
| Settlements over 24h / discrepancies / cash in custody | `Fn getCashCustodySummary` `scope: "platform"` |
| Stuck payments / failed payouts / refunds awaiting approval | `FS query PaymentTransactions` where `status == "pending"`; `FS query PayoutTransactions` where `status == "failed"`; `FS query RefundTransactions` where `approvedBy` is unset and amount over ceiling |
| Reconciliation breaks / open period | `FS query ReconciliationExceptions` where `status` in `open`, `investigating`, `escalated`; `FS query AccountingPeriods` where `status == "open"` |
| Platform today (gigs, orders, GMV, failures) | `FS query Gigs` / `Orders` / `PaymentTransactions` / `PayoutTransactions` bounded to today |
| Health row | `Fn getSystemHealth` |

| Control | On click |
| ------- | -------- |
| Triage | `nav SPT-03` |
| Review (villages) | `nav SPT-04` |
| Review (unauthorized) | `nav SPT-02` flagged |
| View (subscriptions) | `nav SPT-14` |
| Review / Resolve (custody) · Cash custody | `nav SPT-19` |
| Work (payments / payouts / refunds) · Approve | `nav SPT-20` |
| Work (breaks) · Reconciliation | `nav SPT-21` |
| Close | `nav SPT-22` |
| Audit log | `nav SPT-16` |
| Tabs | `nav SPT-01` / `SPT-02` / `SPT-05` / `SPT-15` |
| Pull to refresh | re-run Shown reads, bypass TTL |

```
┌──────────────────────────────────┐
│  Ops           🔊   🔔    [👤]      │
│  21-08-2026 · 11:42 AM IST       │
├──────────────────────────────────┤
│  Needs attention                 │
│  ┌────────────────────────────┐  │
│  │ ⚠ 3 suspended orders       │  │
│  │ Oldest 2 days · ₹12,880    │  │
│  │                 [ Triage ] │  │
│  └────────────────────────────┘  │
│  ┌────────────────────────────┐  │
│  │ ⚠ 2 village requests       │  │
│  │ From 2 suppliers           │  │
│  │                 [ Review ] │  │
│  └────────────────────────────┘  │
│  ┌────────────────────────────┐  │
│  │ ⚠ 1 unauthorized account   │  │
│  │ Waiting since 19-08        │  │
│  │                 [ Review ] │  │
│  └────────────────────────────┘  │
│  ┌────────────────────────────┐  │
│  │ ⚠ 4 past_due subscriptions │  │
│  │ ₹14,156 unpaid             │  │
│  │                 [ View ]   │  │
│  └────────────────────────────┘  │
│  ┌────────────────────────────┐  │
│  │ ⚠ 9 settlements over 24h   │  │
│  │ ₹71,400 with drivers       │  │
│  │                 [ Review ] │  │
│  └────────────────────────────┘  │
│  ┌────────────────────────────┐  │
│  │ ⚠ 4 cash discrepancies     │  │
│  │ ₹18,250 disputed           │  │
│  │                [ Resolve ] │  │
│  └────────────────────────────┘  │
├──────────────────────────────────┤
│  Money exceptions                │
│  ┌────────────────────────────┐  │
│  │ ⚠ 7 payments stuck pending │  │
│  │ Oldest 4h · ₹9,240         │  │
│  │                 [ Work ]   │  │
│  └────────────────────────────┘  │
│  ┌────────────────────────────┐  │
│  │ ⚠ 3 payouts failed         │  │
│  │ ₹6,700 back in dues        │  │
│  │                 [ Work ]   │  │
│  └────────────────────────────┘  │
│  ┌────────────────────────────┐  │
│  │ 🔴 11 reconciliation breaks │  │
│  │ 2 past 48h SLA · ₹31,400   │  │
│  │                 [ Work ]   │  │
│  └────────────────────────────┘  │
│  ┌────────────────────────────┐  │
│  │ ⚠ 2 refunds need approval  │  │
│  │ ₹34,000 over the limit     │  │
│  │              [ Approve ]   │  │
│  └────────────────────────────┘  │
│  ┌────────────────────────────┐  │
│  │ ⚠ Aug period not closed    │  │
│  │ Due 05-09 · 11 breaks open │  │
│  │                 [ Close ]  │  │
│  └────────────────────────────┘  │
├──────────────────────────────────┤
│  Platform today                  │
│  Active gigs               18    │
│  Suspended gigs             2    │
│  Orders placed             214   │
│  Payment failures           6    │
│  GMV               ₹8,42,190     │
│  Collected today   ₹6,18,420     │
│  Paid out today      ₹94,200     │
│  Cash in custody   ₹4,86,300     │
├──────────────────────────────────┤
│  Health                          │
│  ✔ Auth        ✔ Firestore       │
│  ✔ Payments    ⚠ Maps API 4%     │
│  ✔ Payout rail  float ₹2.4L      │
│  ✔ Yesterday reconciled 06:12 AM │
├──────────────────────────────────┤
│  [ Audit log ]  [ Cash custody ] │
│  [ Reconciliation ]              │
├──────────────────────────────────┤
│  [ Ops ][ Users ][ Config ][ 🔍 ] │
└──────────────────────────────────┘
```

The two custody tiles differ in kind from everything above them: nothing on them is stuck or broken. They count money that is real, verified, and in somebody else's hands, which is why age is the figure on them rather than a status — a settlement open for two days is the signal, and there is no error anywhere on the platform that will raise it. Both tiles and the `Cash in custody` line read `getCashCustodySummary` and open `SPT-19`.

The money-exception block is separated from the operational queues above it because it is aged against an SLA rather than worked in arrival order, and because a break sitting past its SLA turns red rather than staying amber. A stuck payment is somebody's money in limbo; the count is useful, the age is what forces the call.

The payout rail float line is a leading indicator rather than a status. A rail that is healthy but nearly empty produces a wave of `insufficient_float` failures across every driver at once, and by then the phone calls have already started.

**All clear**

**Data** — same reads as `SPT-01`. This is the empty state of those queries, not a second endpoint.

```
│                                  │
│             [ ✔ ]                │
│                                  │
│      Nothing needs attention     │
│   All queues are empty.          │
│                                  │
│   ₹4,86,300 is with drivers on   │
│   live gigs, none of it late.    │
│                                  │
│   Yesterday reconciled clean at  │
│   06:12 AM. July closed 04-08.   │
│                                  │
```

Cash in custody is stated even in the all-clear state, because zero queues does not mean zero money outstanding and a dashboard that implies otherwise is misleading on the one figure that matters most. The same applies to reconciliation: "no breaks" and "reconciliation has not run" look identical on a dashboard that only counts problems, and they are opposite situations. The all-clear names the run and its time.

### SPT-02 Users

**Data**

| Shown | Source |
| ----- | ------ |
| User cards / count | `FS query UserProfiles` — indexed `role`, `status`; search is prefix on `name` / `phone` / `email`, not a collection scan |
| Plan line on supplier cards | `FS get /PlatformSubscriptions/{activeSubscriptionId}` |

| Control | On click |
| ------- | -------- |
| Search / role chips / status | `local` filter of the same query |
| User card | `nav SPT-02.1` (supplier → `nav SPT-02.4`) |
| FAB `+` | `nav SPT-02.3` |
| Tabs | `nav SPT-01` / `SPT-02` / `SPT-05` / `SPT-15` |
| Pull to refresh | re-run Shown reads |

```
┌──────────────────────────────────┐
│  Users         🔊   🔔    [👤]      │
├──────────────────────────────────┤
│  ┌────────────────────────────┐  │
│  │ 🔍 Name, phone or email    │   │
│  └────────────────────────────┘  │
│  [ All ][ Supplier ][ Merchant ] │
│  [ Driver ][ Buyer ][ ⚠ Flagged ]│
│  Status [ Any            ▾]      │
├──────────────────────────────────┤
│  1,284 users                     │
├──────────────────────────────────┤
│  ┌────────────────────────────┐  │
│  │ Kranthi Kumar · supplier   │  │
│  │ Ongole · Growth plan       │  │
│  │ ✔ approved                 │  │
│  └────────────────────────────┘  │
│  ┌────────────────────────────┐  │
│  │ Anil Kumar · merchant      │  │
│  │ Karavadi · Sri Lakshmi     │  │
│  │ ✔ approved                 │  │
│  └────────────────────────────┘  │
│  ┌────────────────────────────┐  │
│  │ Mohan Rao · buyer          │  │
│  │ Koppolu                    │  │
│  │ ⚠ unauthorized             │  │
│  └────────────────────────────┘  │
│  ┌────────────────────────────┐  │
│  │ Suresh · driver            │  │
│  │ Podili · AP-27-TZ-9911     │  │
│  │ ✖ suspended                │  │
│  └────────────────────────────┘  │
│                          [ + ]   │
├──────────────────────────────────┤
│  [ Ops ][ Users ][ Config ][ 🔍 ] │
└──────────────────────────────────┘
```

The FAB creates a supplier, the only account type Support provisions directly. Buyers self-register, and merchants and drivers are converted by their supplier.

### SPT-02.1 User detail

**Data**

| Shown | Source |
| ----- | ------ |
| Identity, placement, permissions, last seen | `FS get /UserProfiles/{userId}` |
| Village / hub names | `FS get /Villages/{villageId}` · `FS get /Hubs/{hubId}` |
| Supplier / shop | `FS get /UserProfiles/{supplierId}` |
| Credit used / limit | `FS get /CreditProfiles/{userId}` |
| Activity counts | `FS query Orders` / `MerchantOrders` where the party matches |

| Control | On click |
| ------- | -------- |
| Phone | `tel:` |
| View orders | `nav SPT-15` scoped Orders |
| View audit trail | `nav SPT-16` where `targetId == userId` |
| Suspend account | `nav SPT-02.2` |

```
┌──────────────────────────────────┐
│  ←  Anil Kumar            [👤]    │
├──────────────────────────────────┤
│  merchant · ✔ approved           │
│  UID  u_8Kd2xQ91mZ               │
│  +91 98765 43210                 │
│  anil.k@example.com              │
│  Joined 02-02-2026               │
│  Last seen 21-08-2026 10:31 AM   │
├──────────────────────────────────┤
│  Placement                       │
│  Village   Karavadi              │
│  Hub       Prakasam Central      │
│  Supplier  Kranthi Kumar         │
│  Shop      Sri Lakshmi Stores    │
│  GSTIN     37BBBMK1234B1Z2       │
├──────────────────────────────────┤
│  Permissions                     │
│  Location ✔  SMS ✔               │
│  Audio ✖     Camera ✔            │
├──────────────────────────────────┤
│  Activity                        │
│  Orders as buyer          12     │
│  Pickups handled         148     │
│  Bulk orders               9     │
│  Credit used  ₹17,098 / ₹50,000  │
├──────────────────────────────────┤
│  [ View orders ]                 │
│  [ View audit trail ]            │
│  [ Suspend account ]             │
└──────────────────────────────────┘
```

**Unauthorized account variant** — the `UserStatus: "unauthorized"` state was defined but had no admin screen to act on it, so an unauthorized user was stuck forever behind the blocked-account screen in [Shared.md](Shared.md).

**Data** — same get as `SPT-02.1`. `Restore access` on `"unauthorized"` or `"suspended"` calls `Fn restoreUser`. `Suspend permanently` → `nav SPT-02.2`.

```
├──────────────────────────────────┤
│  ⚠ unauthorized                  │
│    Set 19-08-2026 by system      │
│    Reason: repeated failed OTP   │
│                                  │
│  [ Restore access ]              │
│  [ Suspend permanently ]         │
├──────────────────────────────────┤
```

### SPT-02.2 Suspend or restore user

**Data** — inherit identity and open-work reads from `SPT-02.1`.

| Shown | Source |
| ----- | ------ |
| Open work / credit | `FS query Orders` / `MerchantOrders` · `FS get /CreditProfiles/{userId}` |
| Status radios / reason | `local` |

| Control | On click |
| ------- | -------- |
| Cancel | `local` dismiss |
| Suspend | `Fn suspendUser` |
| Restore | `Fn restoreUser` |

```
┌──────────────────────────────────┐
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│  Suspend Anil Kumar?             │
│                                  │
│  New status                      │
│  ( ) unauthorized                │
│      Blocked, can be restored    │
│  (•) suspended                   │
│      Blocked, needs admin action │
│                                  │
│  Reason (recorded in audit)      │
│  ┌────────────────────────────┐  │
│  │ Disputed GST details       │  │
│  └────────────────────────────┘  │
│                                  │
│  Open work affected              │
│  • 4 buyer pickups at this shop  │
│  • 1 bulk order · ₹17,098        │
│  These move to suspended and     │
│  their suppliers are notified.   │
│                                  │
│  Outstanding credit of ₹17,098   │
│  remains on record.              │
│                                  │
│  [ Cancel ]        [ Suspend ]   │
└──────────────────────────────────┘
```

**Actions:** Writes `UserProfile.status`. Suspending a merchant or driver cascades their open orders and gigs to `suspended` and notifies the affected supplier and buyers. Every change is written to the audit log with the actor, timestamp and reason.

*(Open contract: no specified function writes `UserProfile.status` — `updateUserProfile` step 2 never writes it — and `UserStatus` has only `approved` and `unauthorized`, so the `suspended` option drawn above is not yet representable and a suspension has to be recorded as `unauthorized`. Tracked under "Known spec gaps" in [Navigation.md](Navigation.md).)*

### SPT-02.3 Create supplier

**Data**

| Shown | Source |
| ----- | ------ |
| Country picker | `FS query Countries` where `status == "active"` |
| Form fields | `local` |
| Regex match hint | `local` against selected Country `phoneValidationRegex` |

| Control | On click |
| ------- | -------- |
| Close | `local` dismiss |
| Create supplier | `Fn createSupplier` |

```
┌──────────────────────────────────┐
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│  New supplier               [ X ]│
│                                  │
│  Name                            │
│  ┌────────────────────────────┐  │
│  │ Kranthi Kumar              │  │
│  └────────────────────────────┘  │
│  Email                           │
│  ┌────────────────────────────┐  │
│  │ kranthi@example.com        │  │
│  └────────────────────────────┘  │
│  Country        [ India      ▾]  │
│  Phone                           │
│  ┌────────────────────────────┐  │
│  │ +91 | 98480 11223          │  │
│  └────────────────────────────┘  │
│  ✔ Matches +91 and 10 digits     │
│                                  │
│  Location                        │
│  ┌────────────────────────────┐  │
│  │ Ongole                     │  │
│  └────────────────────────────┘  │
│                                  │
│  A password reset email is sent  │
│  on creation.                    │
│                                  │
│  [  Create supplier  ]           │
└──────────────────────────────────┘
```

**Actions:** Create calls `createSupplier`, validating the phone against the selected country's prefix and length. `INVALID_PHONE` is shown inline under the field, quoting the expected pattern. `ALREADY_EXISTS` names the conflicting email or phone.

### SPT-02.4 Supplier detail

**Data**

| Shown | Source |
| ----- | ------ |
| Supplier identity | `FS get /UserProfiles/{supplierId}` |
| Subscription / usage / entitlements | `FS get /PlatformSubscriptions/{activeSubscriptionId}` + `FS get /SubscriptionPlans/{planId}` |
| Network counts | `FS query UserProfiles` where `supplierId` matches |
| Route cards | `FS query Routes` where `supplierId` matches |
| Assign-sheet catalog / price | `FS query SubscriptionPlans` / `PlanTariffs` / `SubscriptionOffers` — active only |

| Control | On click |
| ------- | -------- |
| Assign / change plan · Assign | `Fn assignSubscription` |
| Cancel subscription | `Fn cancelSubscription` |
| Check (offer code) | `local` eligibility against the catalog + profile |
| Add to hub · Edit / Delete route · `+` Route | `Fn upsertVillage` (hubId) / `Fn upsertRoute` |
| View orders | `nav SPT-15` |
| View audit trail | `nav SPT-16` |
| Suspend account | `nav SPT-02.2` |

```
┌──────────────────────────────────┐
│  ←  Kranthi Kumar         [👤]    │
├──────────────────────────────────┤
│  supplier · ✔ approved           │
│  kranthi@example.com             │
│  +91 98480 11223 · Ongole        │
│  GSTIN 37AAALK2341A1Z0           │
├──────────────────────────────────┤
│  Subscription                    │
│  Growth · ✔ active               │
│  Monthly INR · renews 01-09      │
│  [ Assign / change plan ]        │
│  [ Cancel subscription ]         │
├──────────────────────────────────┤
│  Plan usage                      │
│  Hubs 1/5     Routes 12/20       │
│  Gigs 142/200                    │
│  Merchants 3/50  Drivers 2/25    │
├──────────────────────────────────┤
│  Network                         │
│  Hubs         Prakasam Central   │
│  Villages                  5     │
│  Merchants                 3     │
│  Drivers                   2     │
│  Buyers                   41     │
│  [ Add to hub  Prakasam C  ▾ ]   │
├──────────────────────────────────┤
│  Routes                          │
│  ┌────────────────────────────┐  │
│  │ Ongole to Markapur         │  │
│  │ 5 stops · 86 km            │  │
│  │ [ Edit ]      [ Delete ]   │  │
│  └────────────────────────────┘  │
│  [ + Route ]                     │
│  [ ✨ AI: update route ]          │
├──────────────────────────────────┤
│  [ View orders ]                 │
│  [ View audit trail ]            │
│  [ Suspend account ]             │
└──────────────────────────────────┘
```

**Assign subscription sheet**

**Data** — inherit catalog reads from `SPT-02.4`. Radios and code field are `local` until Assign.

```
┌──────────────────────────────────┐
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│  Assign subscription             │
│                                  │
│  Plan    [ Growth            ▾]  │
│  Tariff  [ Monthly INR       ▾]  │
│                                  │
│  Offer code (optional)           │
│  ┌──────────────┐ [ Check ]      │
│  │ LOGIKLAUNCH50│                │
│  └──────────────┘                │
│  ✔ Eligible · 50% first period   │
│                                  │
│  List price           ₹2,999     │
│  Discount            −₹1,500     │
│  GST 18%                ₹270     │
│  Charged now          ₹1,769     │
│                                  │
│  Starts today · renews 21-09     │
│                                  │
│  [  Assign  ]                    │
└──────────────────────────────────┘
```

**Actions:** Assign calls `assignSubscription`. `INVALID_DISCOUNT` distinguishes the reasons rather than collapsing them: code not found, offer expired, role or country ineligible, plan mismatch, redemption cap reached, or already used by this subscriber. Check evaluates eligibility before assigning, so Support is never surprised at submit.

### SPT-03 Suspended orders queue

Suspension is reachable from three paths — a suspended gig, a disassociated merchant, and a suspended user — and the constitution requires Support notification for all three. There was no queue to receive them.

**Data**

| Shown | Source |
| ----- | ------ |
| Open cards | `FS query Orders` where `deliveryStatus == "suspended"`; `FS query MerchantOrders` where status is suspended |
| Buyer / shop names | `FS get /UserProfiles/{id}` |
| Cash-held line | `FS query CashLedgerEntries` where `orderId` matches and `status == "in_custody"` |
| Resolved segment | same collections where cancelled / refunded after suspension |

| Control | On click |
| ------- | -------- |
| Open / Resolved / sort | `local` |
| Reassign shop | `Fn reassignOrderMerchant` — same village |
| Resume on new gig | `Fn resumeOrderOnGig` — later gig, same route |
| Export CSV | `Fn exportFinanceReport` `{ reportType: "order_register" }` |
| Cancel and refund | `Fn cancelOrder` then `Fn refundOrder` |
| Cancel order (buyer) | `Fn cancelOrder` |
| Cancel order (merchant) | `Fn cancelMerchantOrder` |
| Open custody trail | `nav SPT-19.2` |
| Export CSV | `local` of the query |

```
┌──────────────────────────────────┐
│  ←  Suspended orders      [👤]    │
├──────────────────────────────────┤
│  [ Open 3 ] [ Resolved ]         │
│  Sort [ Oldest first        ▾]   │
├──────────────────────────────────┤
│  ┌────────────────────────────┐  │
│  │ INV-2408190112 · ₹4,100    │  │
│  │ Cause: merchant            │  │
│  │ disassociated              │  │
│  │ Buyer  Latha · Madhavaram  │  │
│  │ Shop   Devi Provisions     │  │
│  │ Paid UPI · 2 days ago      │  │
│  │                            │  │
│  │ [ Reassign shop ]          │  │
│  │ [ Cancel and refund ]      │  │
│  └────────────────────────────┘  │
│  ┌────────────────────────────┐  │
│  │ MO-7688 · ₹4,100           │  │
│  │ Cause: gig suspended       │  │
│  │ Shop   Village Mart        │  │
│  │ Credit · unpaid            │  │
│  │                            │  │
│  │ [ Resume on new gig ]      │  │
│  │ [ Cancel order ]           │  │
│  └────────────────────────────┘  │
│  ┌────────────────────────────┐  │
│  │ INV-2408200087 · ₹880      │  │
│  │ Cause: user suspended      │  │
│  │ Cash on pickup · unpaid    │  │
│  │ Nothing collected          │  │
│  │                            │  │
│  │ [ Cancel order ]           │  │
│  └────────────────────────────┘  │
│  ┌────────────────────────────┐  │
│  │ INV-2408190094 · ₹1,240    │  │
│  │ Cause: gig suspended       │  │
│  │ Cash on pickup             │  │
│  │ ⏳ ₹1,240 collected, held   │  │
│  │   by Ravi Teja · CLE-9940  │  │
│  │ Settlement CS-8831 open    │  │
│  │                            │  │
│  │ [ Open custody trail ]     │  │
│  │ [ Cancel order ]           │  │
│  └────────────────────────────┘  │
├──────────────────────────────────┤
│  [ Export CSV ]                  │
└──────────────────────────────────┘
```

Every card states what has been collected against the order, including when the answer is nothing. That line exists so the last card cannot be read as the same situation as the one above it.

**Actions:** Reassign shop moves the pickup to another merchant in the same village and notifies the buyer. Cancel and refund calls `cancelOrder` then `refundOrder`. Resume on new gig re-attaches the order to a later gig on the same route. Each action names the money involved, because most of these orders are already paid.

Cash already collected is the case that needs care. `refundOrder` reverses a gateway payment and cannot reach notes in a driver's pocket, so cancelling an order whose `CashLedgerEntry` is still `in_custody` would leave the entry pointing at a cancelled order with nobody accountable for it. Where a card names a holder and an entry, the money discharges through the driver's settlement or through `resolveCashDiscrepancy` on `SPT-19.1`, and the cancellation follows rather than precedes it. `[ Open custody trail ]` opens `SPT-19.2` scoped to the order.

### SPT-04 Village requests queue

**Data**

| Shown | Source |
| ----- | ------ |
| Request cards | `FS query VillageRequests` where `status == "pending_support_review"` (Decided = `approved` / `rejected`) |
| Requester | `FS get /UserProfiles/{requestedBy}` |
| Duplicate warning | `FS query Villages` where `name` + `pincode` |

| Control | On click |
| ------- | -------- |
| Pending / Decided | `local` |
| Add it · Move hub | `nav SPT-09.2` prefilled, then `Fn upsertVillage` |
| Decline | `Fn rejectVillageRequest` |

```
┌──────────────────────────────────┐
│  ←  Village requests      [👤]    │
├──────────────────────────────────┤
│  [ Pending 2 ] [ Decided ]       │
├──────────────────────────────────┤
│  ┌────────────────────────────┐  │
│  │ Cherukuru · 523168         │  │
│  │ Bapatla mandal             │  │
│  │ From Kranthi Kumar         │  │
│  │ Hub Prakasam Central       │  │
│  │ "14 buyers already ask for │  │
│  │  delivery here."           │  │
│  │ Sent 21-08-2026            │  │
│  │                            │  │
│  │ ⚠ LGD code not verified    │  │
│  │                            │  │
│  │ [ Decline ]   [ Add it ]   │  │
│  └────────────────────────────┘  │
│  ┌────────────────────────────┐  │
│  │ Inkollu · 523167           │  │
│  │ From Devi Traders          │  │
│  │ ⚠ Already exists in        │  │
│  │   Bapatla Hub              │  │
│  │                            │  │
│  │ [ Decline ]  [ Move hub ]  │  │
│  └────────────────────────────┘  │
└──────────────────────────────────┘
```

**Actions:** Add it opens `SPT-09.2` prefilled from the request, then calls `upsertVillage`. The duplicate check runs on name plus pincode, since the same village must not be created twice under different hubs.

---

## Config

### SPT-05 Config home

**Data**

| Shown | Source |
| ----- | ------ |
| Geography / plan / tariff / offer / code counts | `Fn listConfigurationCatalog` `includeInactive: true` |
| Village-requests badge | `FS query VillageRequests` where `status == "pending_support_review"` count |
| Subscriptions tile | `FS query PlatformSubscriptions` count by status |

| Control | On click |
| ------- | -------- |
| Countries / States / Districts / Hubs / Villages | `nav SPT-06` · `SPT-07` · `SPT-08` · `SPT-09` |
| Village requests | `nav SPT-04` |
| Plans / Tariffs / Offers / Codes | `nav SPT-10` · `SPT-11` · `SPT-12` · `SPT-13` |
| Subscriptions | `nav SPT-14` |
| Tabs | `nav SPT-01` / `SPT-02` / `SPT-05` / `SPT-15` |

```
┌──────────────────────────────────┐
│  Config        🔊   🔔    [👤]      │
├──────────────────────────────────┤
│  GEOGRAPHY                       │
│  ┌────────────────────────────┐  │
│  │ Countries              1   │  │
│  │ ISO, dial prefix, currency │  │
│  └────────────────────────────┘  │
│  ┌────────────┐ ┌────────────┐   │
│  │ States   1 │ │ Districts 1│   │
│  └────────────┘ └────────────┘   │
│  ┌────────────┐ ┌────────────┐   │
│  │ Hubs     1 │ │ Villages 5 │   │
│  └────────────┘ └────────────┘   │
│  ┌────────────────────────────┐  │
│  │ ⚠ Village requests     2   │  │
│  └────────────────────────────┘  │
│                                  │
│  SUBSCRIPTIONS                   │
│  ┌────────────┐ ┌────────────┐   │
│  │ Plans    3 │ │ Tariffs  6 │   │
│  └────────────┘ └────────────┘   │
│  ┌────────────┐ ┌────────────┐   │
│  │ Offers   2 │ │ Codes    4 │   │
│  └────────────┘ └────────────┘   │
│  ┌────────────────────────────┐  │
│  │ Subscriptions        14    │  │
│  │ 9 active · 4 past_due      │  │
│  └────────────────────────────┘  │
├──────────────────────────────────┤
│  [ Ops ][ Users ][ Config ][ 🔍 ] │
└──────────────────────────────────┘
```

Counts are shown on every tile so Support can see the shape of the catalog without opening each list.

### SPT-06 Countries

**Data**

| Shown | Source |
| ----- | ------ |
| Country cards | `FS query Countries` |
| Child-state count | `FS query States` where `countryId` matches |
| Sheet fields | `local` until Save; regex test is `local` |

| Control | On click |
| ------- | -------- |
| Edit · FAB `+` | `local` open sheet |
| Save | `Fn upsertCountry` |
| Deactivate | `Fn deactivateConfigurationRecord` — `IN_USE` → `nav SPT-17` |
| Test | `local` against the draft regex |

```
┌──────────────────────────────────┐
│  ←  Countries             [👤]    │
├──────────────────────────────────┤
│  ┌────────────────────────────┐  │
│  │ India · IN · IND · 356     │  │
│  │ +91 · 10 digits            │  │
│  │ INR ₹ · Asia/Kolkata       │  │
│  │ ✔ active · 1 state         │  │
│  │ [ Edit ]     [ Deactivate ]│  │
│  └────────────────────────────┘  │
│                          [ + ]   │
└──────────────────────────────────┘
```

**Upsert country sheet**

**Data** — inherit `SPT-06`. Fields are `local` until Save.

```
┌──────────────────────────────────┐
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│  Country                    [ X ]│
├──────────────────────────────────┤
│  Name                            │
│  ┌────────────────────────────┐  │
│  │ India                      │  │
│  └────────────────────────────┘  │
│  ISO2  [ IN  ]  ISO3  [ IND  ]   │
│  Numeric code   [ 356        ]   │
│                                  │
│  Dial prefix    [ +91        ]   │
│  Mobile length  [ 10         ]   │
│  Validation regex                │
│  ┌────────────────────────────┐  │
│  │ ^\+91[0-9]{10}$            │  │
│  └────────────────────────────┘  │
│  Test a number                   │
│  ┌──────────────┐ [ Test ]       │
│  │ +919848011223│                │
│  └──────────────┘                │
│  ✔ Matches                       │
│                                  │
│  Currency [ INR ] Symbol [ ₹ ]   │
│  Timezone [ Asia/Kolkata     ▾]  │
│  Status   [ active           ▾]  │
│                                  │
│  [  Save  ]                      │
└──────────────────────────────────┘
```

**Actions:** Save calls `upsertCountry`. A duplicate ISO code or dial prefix returns `ALREADY_EXISTS` naming the conflicting country. The regex tester exists because a wrong pattern here silently locks every user in that country out of OTP login, and a typo in a regex is not visually obvious.

### SPT-07 States

**Data**

| Shown | Source |
| ----- | ------ |
| Country filter | `FS query Countries` where `status == "active"` |
| State cards | `FS query States` where `countryId` matches |
| Child-district count | `FS query Districts` where `stateId` matches |
| Sheet fields | `local` until Save |

| Control | On click |
| ------- | -------- |
| Country picker | `local` re-runs the state query |
| Edit · FAB `+` | `local` open sheet |
| Save | `Fn upsertState` |
| Deactivate | `Fn deactivateConfigurationRecord` — `IN_USE` → `nav SPT-17` |

```
┌──────────────────────────────────┐
│  ←  States                [👤]    │
│  Country [ India             ▾]  │
├──────────────────────────────────┤
│  ┌────────────────────────────┐  │
│  │ Andhra Pradesh · AP        │  │
│  │ ✔ active · 1 district      │  │
│  │ [ Edit ]     [ Deactivate ]│  │
│  └────────────────────────────┘  │
│                          [ + ]   │
└──────────────────────────────────┘
```

**Sheet:** name, code, parent country. Only active countries are selectable. The code must be unique within its country.

### SPT-08 Districts

**Data**

| Shown | Source |
| ----- | ------ |
| Country / state filters | `FS query Countries` / `States` — active; cascade client-side |
| District cards | `FS query Districts` where `stateId` matches |
| Child-hub count | `FS query Hubs` where `districtId` matches |
| Sheet fields | `local` until Save |

| Control | On click |
| ------- | -------- |
| Cascading pickers | `local` re-runs the district query |
| Edit · FAB `+` | `local` open sheet |
| Save | `Fn upsertDistrict` |
| Deactivate | `Fn deactivateConfigurationRecord` — `IN_USE` → `nav SPT-17` |

```
┌──────────────────────────────────┐
│  ←  Districts             [👤]    │
│  [ India ▾]  [ Andhra Pr. ▾]     │
├──────────────────────────────────┤
│  ┌────────────────────────────┐  │
│  │ Prakasam · PRA             │  │
│  │ ✔ active · 1 hub           │  │
│  │ [ Edit ]     [ Deactivate ]│  │
│  └────────────────────────────┘  │
│                          [ + ]   │
└──────────────────────────────────┘
```

**Sheet:** name, optional code, country and state. The state must belong to the selected country; the picker enforces it rather than validating after submit.

### SPT-09 Hubs

**Data**

| Shown | Source |
| ----- | ------ |
| Hub cards | `FS query Hubs` |
| Village / supplier counts | `Hub.villages` on that document; `FS query UserProfiles` where role is supplier and hub matches |
| Parent geography labels | `FS get /Countries/{id}` · `/States/{id}` · `/Districts/{id}` |
| Sheet pickers | `FS query Countries` / `States` / `Districts` — active only |

| Control | On click |
| ------- | -------- |
| Hub card | `nav SPT-09.1` |
| FAB `+` · Save | `FS write /Hubs/{hubId}` (direct write, Support-owned) |

```
┌──────────────────────────────────┐
│  ←  Hubs                  [👤]    │
├──────────────────────────────────┤
│  ┌────────────────────────────┐  │
│  │ Prakasam Central Hub       │  │
│  │ India · AP · Prakasam      │  │
│  │ 5 villages · 1 supplier    │  │
│  │ ✔ active                   │  │
│  └────────────────────────────┘  │
│                          [ + ]   │
└──────────────────────────────────┘
```

**Add / edit hub sheet**

**Data** — inherit `SPT-09`. Fields are `local` until Save (`FS write /Hubs/{hubId}`).

```
┌──────────────────────────────────┐
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│  Hub                        [ X ]│
│                                  │
│  Name                            │
│  ┌────────────────────────────┐  │
│  │ Prakasam Central Hub       │  │
│  └────────────────────────────┘  │
│  Country  [ India            ▾]  │
│  State    [ Andhra Pradesh   ▾]  │
│  District [ Prakasam         ▾]  │
│  Only active records are listed. │
│                                  │
│  [  Save  ]                      │
└──────────────────────────────────┘
```

### SPT-09.1 Hub detail and villages

**Data**

| Shown | Source |
| ----- | ------ |
| Hub header | `FS get /Hubs/{hubId}` |
| Village cards | `Hub.villages[]` plus `FS get /Villages/{id}` for LGD / coords |
| Merchant / buyer counts | `FS query UserProfiles` where `villageId` matches |

| Control | On click |
| ------- | -------- |
| Village card | `nav SPT-09.2` |
| `+` Village | `nav SPT-09.2` |
| AI: add villages | `local` draft, then `Fn upsertVillage` |

```
┌──────────────────────────────────┐
│  ←  Prakasam Central      [👤]    │
├──────────────────────────────────┤
│  India · AP · Prakasam           │
│  1 supplier · 41 buyers          │
├──────────────────────────────────┤
│  Villages (5)                    │
│  ┌────────────────────────────┐  │
│  │ Karavadi · 523182          │  │
│  │ LGD 254132 · Bapatla       │  │
│  │ ✔ Coordinates set          │  │
│  │ 1 merchant · 18 buyers     │  │
│  └────────────────────────────┘  │
│  ┌────────────────────────────┐  │
│  │ Madhavaram · 523264        │  │
│  │ LGD 254199 · Addanki       │  │
│  │ ⚠ No coordinates           │  │
│  │ ⚠ No merchant              │  │
│  └────────────────────────────┘  │
│  [ + Village ]                   │
│  [ ✨ AI: add villages to hub ]   │
└──────────────────────────────────┘
```

Missing coordinates are flagged here because driver geofencing depends on them: a stop without latitude and longitude forces the manual override on `DRV-04.1`.

### SPT-09.2 Village editor

The village record carries `lgdCode`, `pincode`, `panchayat`, `mandal` and `location`, but the only editor was a bare `[ + Village ]` button with no form behind it.

**Data**

| Shown | Source |
| ----- | ------ |
| Existing village | `FS get /Villages/{villageId}` (create: empty) |
| Hub picker | `FS query Hubs` (active) |
| Form fields / map pin | `local` until Save |

| Control | On click |
| ------- | -------- |
| Pick on map | `local` |
| Save | `Fn upsertVillage` |
| Delete | `Fn deactivateConfigurationRecord` — `IN_USE` → `nav SPT-17` |

```
┌──────────────────────────────────┐
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│  Village                    [ X ]│
├──────────────────────────────────┤
│  Hub      [ Prakasam Central ▾]  │
│                                  │
│  Name                            │
│  ┌────────────────────────────┐  │
│  │ Karavadi                   │  │
│  └────────────────────────────┘  │
│  LGD code                        │
│  ┌────────────────────────────┐  │
│  │ 254132                     │  │
│  └────────────────────────────┘  │
│  Government Local Directory code │
│                                  │
│  Pincode  [ 523182           ]   │
│  Panchayat                       │
│  ┌────────────────────────────┐  │
│  │ Karavadi Gram Panchayat    │  │
│  └────────────────────────────┘  │
│  Mandal   [ Bapatla          ]   │
├──────────────────────────────────┤
│  Location (required for          │
│  geofencing)                     │
│  Latitude   [ 15.7621        ]   │
│  Longitude  [ 80.1329        ]   │
│  [ 📍 Pick on map ]               │
│  ⚠ Without coordinates, drivers  │
│    must set stop status by hand. │
├──────────────────────────────────┤
│  [ Delete ]        [ Save ]      │
└──────────────────────────────────┘
```

**Actions:** Save calls `upsertVillage`. A duplicate name plus pincode in another hub is rejected with `ALREADY_EXISTS`, naming the existing hub. Delete is blocked while any buyer, merchant or route references the village.

### SPT-10 Subscription plans

**Data**

| Shown | Source |
| ----- | ------ |
| Plan cards | `FS query SubscriptionPlans` |
| Subscriber / tariff counts | `FS query PlatformSubscriptions` / `PlanTariffs` where `planId` matches |
| Sheet fields / preview | `local` until Save — preview reads no live subscriber data |
| Affected-subscriber warning | `FS query PlatformSubscriptions` where `planId` matches (count + earliest `currentPeriodEnd`) |

| Control | On click |
| ------- | -------- |
| Active / Draft | `local` filter |
| Plan card · FAB `+` | `local` open sheet |
| Save · Save anyway · Publish | `Fn upsertSubscriptionPlan` |
| Delete | `Fn deactivateConfigurationRecord` — `IN_USE` → `nav SPT-17` |
| Preview as subscriber | `local` watermarked mock |
| Add tariff | `nav SPT-11` |

```
┌──────────────────────────────────┐
│  ←  Plans                 [👤]    │
├──────────────────────────────────┤
│  [ Active 3 ] [ Draft 1 ]        │
├──────────────────────────────────┤
│  ┌────────────────────────────┐  │
│  │ Starter · supplier         │  │
│  │ ✔ active · 4 subscribers   │  │
│  │ 1 hub · 3 routes           │  │
│  │ 20 gigs/mo · 10 merch      │  │
│  │ 2 tariffs                  │  │
│  └────────────────────────────┘  │
│  ┌────────────────────────────┐  │
│  │ Growth · supplier          │  │
│  │ ✔ active · 5 subscribers   │  │
│  │ 5 hubs · 20 routes         │  │
│  │ 200 gigs/mo · 50 merch     │  │
│  └────────────────────────────┘  │
│  ┌────────────────────────────┐  │
│  │ Merchant Basic · merchant  │  │
│  │ ○ draft · no tariff yet    │  │
│  │        [ Publish ]         │  │
│  └────────────────────────────┘  │
│                          [ + ]   │
└──────────────────────────────────┘
```

**Upsert plan sheet**

**Data** — inherit `SPT-10`. Toggles and limits are `local` until Save.

```
┌──────────────────────────────────┐
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│  Plan                       [ X ]│
├──────────────────────────────────┤
│  Name                            │
│  ┌────────────────────────────┐  │
│  │ Growth                     │  │
│  └────────────────────────────┘  │
│  Target role                     │
│  (•) Supplier   ( ) Merchant     │
│  Status  [ active            ▾]  │
│                                  │
│  Features (pricing card copy)    │
│  [ Gig composer x ] [ AI x ]     │
│  [ Reports x ]  [ + Add ]        │
│  Display only. Grants nothing.   │
├──────────────────────────────────┤
│  Finance entitlements            │
│  Always on, every plan           │
│  ✔ Basic dashboard               │
│  ✔ Standard reports              │
│  ✔ Self-service payouts          │
│  Can't be turned off.            │
│                                  │
│  (x) Advanced dashboard          │
│  (x) Advanced reports            │
│  (x) Report exports              │
│  (x) Scheduled reports           │
│  ( ) View reconciliation         │
│  ( ) Manage reconciliation       │
│  ( ) Period close                │
│  ( ) Bulk payouts                │
│  (x) Credit management           │
│  ( ) GST filing pack             │
│  ( ) Ledger export               │
│  ( ) API access                  │
├──────────────────────────────────┤
│  Usage ceilings                  │
│  Exports / month  [ 10       ]   │
│  Scheduled reports[ 3        ]   │
│  Ledger rows / mo [ 50000    ]   │
│  API calls / day  [ 0        ]   │
│  History months   [ 36       ]   │
│  Blank means unlimited.          │
├──────────────────────────────────┤
│  Limits                          │
│  Max hubs         [ 5        ]   │
│  Max routes       [ 20       ]   │
│  Max gigs / month [ 200      ]   │
│  Max merchants    [ 50       ]   │
│  Max drivers      [ 25       ]   │
│  Blank means unlimited.          │
├──────────────────────────────────┤
│  [ Preview as subscriber ]       │
│  [ Delete ]        [ Save ]      │
└──────────────────────────────────┘
```

**Preview as subscriber**

**Data** — `local` only. No Firestore read.

```
┌──────────────────────────────────┐
│  ←  Growth · as a supplier       │
├──────────────────────────────────┤
│  ⚠ Preview. You are seeing what  │
│    a Growth supplier would see.  │
│    Nothing here reads real data. │
├──────────────────────────────────┤
│  Finance tab                     │
│  ✔ Balances and dues             │
│  ✔ Payout approvals              │
│  ✔ Custom date reports           │
│  ✔ Merchant ageing               │
│  ✔ 10 exports a month            │
│  ✔ 3 scheduled reports           │
│  🔒 Reconciliation workspace      │
│  🔒 Period close                  │
│  🔒 GST and TDS packs             │
│  🔒 Tally export                  │
│                                  │
│  Reports visible          8 of 11│
│  History                36 months│
├──────────────────────────────────┤
│  [ Back to plan ]                │
└──────────────────────────────────┘
```

**Removing an entitlement from a live plan**

**Data** — inherit subscriber count from `SPT-10`. Confirm is `Fn upsertSubscriptionPlan`.

```
┌──────────────────────────────────┐
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│  This affects 5 subscribers      │
│                                  │
│  Turning off                     │
│  − Report exports                │
│  − Scheduled reports             │
│                                  │
│  They keep both until their      │
│  next renewal, then lose them.   │
│  Earliest renewal 01-09-2026.    │
│                                  │
│  4 of the 5 used exports last    │
│  month.                          │
│                                  │
│  [ Cancel ]      [ Save anyway ] │
└──────────────────────────────────┘
```

**Publish confirm**

**Data** — inherit `SPT-10`. Publish is `Fn upsertSubscriptionPlan`.

```
┌──────────────────────────────────┐
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│  Publish Merchant Basic?         │
│                                  │
│  ⚠ No tariff exists, so no one   │
│    can be charged for it.        │
│                                  │
│  Add a tariff first, or publish  │
│  now and add one later.          │
│                                  │
│  [ Add tariff ]   [ Publish ]    │
└──────────────────────────────────┘
```

**Lowering a limit below current use**

**Data** — inherit `SPT-10`. Save anyway is `Fn upsertSubscriptionPlan`.

```
┌──────────────────────────────────┐
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│  This affects 5 subscribers      │
│                                  │
│  Max routes 20 → 10              │
│                                  │
│  Kranthi Kumar has 12 routes.    │
│  Existing routes keep working;   │
│  new ones are blocked until      │
│  they are under the cap.         │
│                                  │
│  [ Cancel ]      [ Save anyway ] │
└──────────────────────────────────┘
```

**Actions:** Save calls `upsertSubscriptionPlan`, which validates every entitlement against the known set, forces the baseline entitlements on regardless of the toggles, and returns the affected subscriber count and the entitlements withdrawn. A plan targeting `merchant` cannot be assigned to a supplier or the reverse, and the target role is fixed once the plan has subscribers.

**The two lists on this sheet do different jobs and the sheet says so.** `features` is the copy that appears on a pricing card and grants nothing; entitlements are what the server checks. Keeping them in one list is how a plan ends up advertising a capability nobody enabled, or granting one nobody is being charged for — and the failure is silent in both directions until a customer notices.

**Baseline entitlements are shown as fixed ticks, not as unchecked boxes.** Support cannot compose a plan that hides a subscriber's own balances or blocks their own payouts, and the sheet makes that a stated property of the platform rather than a discipline Support has to remember at eleven at night.

**Withdrawing an entitlement states the human consequence before it saves.** Five subscribers, four of whom used the feature last month, effective at each renewal rather than immediately. Commercial decisions are legitimately Support's to make; making them without seeing who is affected is not.

**Preview reads no real data.** The preview renders the entitlement shape of the plan against sample figures and is watermarked. A preview that pulled a live supplier's numbers would be a route to reading another party's finances through the plan editor, which no amount of good intent makes acceptable.

### SPT-11 Plan tariffs

**Data**

| Shown | Source |
| ----- | ------ |
| Plan filter | `FS query SubscriptionPlans` |
| Tariff cards | `FS query PlanTariffs` where `planId` matches |
| Sheet fields / GST preview / overlap warning | `local` until Save; overlap is `FS query PlanTariffs` for the same plan · currency · country |

| Control | On click |
| ------- | -------- |
| Plan picker | `local` re-runs the tariff query |
| FAB `+` · card | `local` open sheet |
| Save | `Fn upsertPlanTariff` |
| Deactivate | `Fn deactivateConfigurationRecord` — `IN_USE` → `nav SPT-17` |

```
┌──────────────────────────────────┐
│  ←  Tariffs               [👤]    │
│  Plan [ Growth               ▾]  │
├──────────────────────────────────┤
│  ┌────────────────────────────┐  │
│  │ Monthly INR                │  │
│  │ ₹2,999 + 18% GST           │  │
│  │ Country IN · ✔ active      │  │
│  │ 01-01-2026 → open          │  │
│  └────────────────────────────┘  │
│  ┌────────────────────────────┐  │
│  │ Annual INR                 │  │
│  │ ₹29,999 + 18% GST          │  │
│  │ Country IN · ✔ active      │  │
│  │ 01-01-2026 → 31-12-2026    │  │
│  └────────────────────────────┘  │
│                          [ + ]   │
└──────────────────────────────────┘
```

**Upsert tariff sheet**

**Data** — inherit `SPT-11`. Fields are `local` until Save.

```
┌──────────────────────────────────┐
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│  Tariff                     [ X ]│
├──────────────────────────────────┤
│  Plan     [ Growth           ▾]  │
│  Cycle    [ Monthly          ▾]  │
│  Type     [ Flat             ▾]  │
│  Currency [ INR              ▾]  │
│  Country  [ India (optional) ▾]  │
│                                  │
│  Base price     [ 2999       ]   │
│  Unit price     [            ]   │
│  GST percent    [ 18         ]   │
│                                  │
│  Effective from [ 01-01-2026 ]   │
│  Effective to   [ blank = open]  │
│  Status   [ active           ▾]  │
│                                  │
│  Buyer pays ₹3,539 including GST │
│                                  │
│  ⚠ Overlaps Annual INR for IN.   │
│    Two active tariffs for the    │
│    same plan, currency and       │
│    country will conflict.        │
│                                  │
│  [  Save  ]                      │
└──────────────────────────────────┘
```

The overlap warning matters because subscription pricing resolves a single tariff per plan, currency, country and date; two overlapping active windows make that resolution non-deterministic.

### SPT-12 Offers

**Data**

| Shown | Source |
| ----- | ------ |
| Offer cards | `FS query SubscriptionOffers` |
| Redeemed / cap | `SubscriptionOffer.redemptionCount` / `maxRedemptions` on that document |
| Sheet pickers | `FS query SubscriptionPlans` / `PlanTariffs` / `Countries` — active |
| Eligibility tester result | `local` against `FS get /UserProfiles/{testUserId}` |

| Control | On click |
| ------- | -------- |
| Offer card · FAB `+` | `local` open sheet |
| Save | `Fn upsertSubscriptionOffer` |
| Delete | `Fn deactivateConfigurationRecord` — `IN_USE` → `nav SPT-17` |
| Test against a user | `local` evaluate `eligibility` — no extra Function |

```
┌──────────────────────────────────┐
│  ←  Offers                [👤]    │
├──────────────────────────────────┤
│  ┌────────────────────────────┐  │
│  │ India Launch 50 · 50%      │  │
│  │ Plan Starter               │  │
│  │ 01-08-2026 → 31-12-2026    │  │
│  │ Redeemed 138 / 500         │  │
│  │ ████░░░░░░  28%            │  │
│  │ ✔ active                   │  │
│  └────────────────────────────┘  │
│  ┌────────────────────────────┐  │
│  │ Merchant Intro · ₹200 off  │  │
│  │ Plan Merchant Basic        │  │
│  │ Redeemed 500 / 500         │  │
│  │ ✖ exhausted                │  │
│  └────────────────────────────┘  │
│                          [ + ]   │
└──────────────────────────────────┘
```

**Upsert offer sheet**

**Data** — inherit `SPT-12`. Criteria toggles are `local` until Save.

```
┌──────────────────────────────────┐
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│  Offer                      [ X ]│
├──────────────────────────────────┤
│  Name                            │
│  ┌────────────────────────────┐  │
│  │ India Launch 50            │  │
│  └────────────────────────────┘  │
│  Plan     [ Starter          ▾]  │
│  Tariff   [ Any (optional)   ▾]  │
│                                  │
│  Discount                        │
│  (•) Percent  ( ) Flat amount    │
│  Value    [ 50               ]%  │
│                                  │
│  Valid from [ 01-08-2026     ]   │
│  Valid to   [ 31-12-2026     ]   │
├──────────────────────────────────┤
│  Eligibility · all must pass     │
│                                  │
│  (x) Roles                       │
│      [ supplier x ] [ + ]        │
│  (x) Countries                   │
│      [ India x ] [ + ]           │
│  ( ) Existing plans              │
│  (x) First subscription only     │
│  ( ) Min tenure months  [    ]   │
│  ( ) Min completed gigs [    ]   │
├──────────────────────────────────┤
│  Max redemptions  [ 500      ]   │
│  Max per user     [ 1        ]   │
├──────────────────────────────────┤
│  Preview eligibility             │
│  [ Test against a user ]         │
│                                  │
│  [ Delete ]        [ Save ]      │
└──────────────────────────────────┘
```

Seven independent eligibility criteria are hard to reason about, so a tester is provided: pick a real user and the sheet reports pass or fail per criterion. That is how Support avoids shipping an offer nobody can redeem.

### SPT-13 Offer discount codes

**Data**

| Shown | Source |
| ----- | ------ |
| Offer filter | `FS query SubscriptionOffers` |
| Code cards | `FS query OfferDiscountCodes` where `offerId` matches |
| `usedCount` | field on that document — never reset on edit |
| Sheet fields | `local` until Save |

| Control | On click |
| ------- | -------- |
| Edit · FAB `+` | `local` open sheet |
| Save | `Fn upsertOfferDiscountCode` |
| Deactivate | `Fn deactivateConfigurationRecord` |
| Redemptions | `nav SPT-13.1` |

```
┌──────────────────────────────────┐
│  ←  Discount codes        [👤]    │
│  Offer [ India Launch 50     ▾]  │
├──────────────────────────────────┤
│  ┌────────────────────────────┐  │
│  │ LOGIKLAUNCH50              │  │
│  │ Used 138 / 500             │  │
│  │ ✔ active                   │  │
│  │ [ Edit ] [ Deactivate ]    │  │
│  │ [ Redemptions ]            │  │
│  └────────────────────────────┘  │
│                          [ + ]   │
└──────────────────────────────────┘
```

**Sheet:** code (unique, matched case-insensitively) and maximum uses. `upsertOfferDiscountCode` never resets `usedCount` on edit, and the sheet states that where the count is shown.

### SPT-13.1 Redemption audit

Offers cap total and per-user redemptions, and `usedCount` is incremented transactionally, but there was no way to see who had redeemed what. Discount abuse is undetectable without this.

**Data**

| Shown | Source |
| ----- | ------ |
| Cap line | `FS get /OfferDiscountCodes/{id}` + parent Offer |
| Successful rows | `FS query PlatformSubscriptions` where `discountCode` matches — not a collection dump |
| Blocked attempts | `FS query AuditLogEntries` where action names this code and the assign was refused |
| Discount-given total | `local` sum of those subscription rows |
| Date range | `local` filter of the same queries |

| Control | On click |
| ------- | -------- |
| From / To | `local` |
| Row | `nav SPT-02.4` or `SPT-14` |
| Export CSV | `local` of the query |

```
┌──────────────────────────────────┐
│  ←  Redemptions           [👤]    │
│     LOGIKLAUNCH50                │
├──────────────────────────────────┤
│  138 of 500 used                 │
│  Max 1 per user                  │
│  From [ 01-08 ] To [ 21-08 ]     │
├──────────────────────────────────┤
│  ┌────────────────────────────┐  │
│  │ Kranthi Kumar · supplier   │  │
│  │ Starter · Monthly INR      │  │
│  │ ₹999 → ₹499                │  │
│  │ 03-08-2026 10:22 AM        │  │
│  └────────────────────────────┘  │
│  ┌────────────────────────────┐  │
│  │ Devi Traders · supplier    │  │
│  │ Starter · Monthly INR      │  │
│  │ ₹999 → ₹499                │  │
│  │ 05-08-2026 04:15 PM        │  │
│  └────────────────────────────┘  │
│  ┌────────────────────────────┐  │
│  │ ⚠ Mohan Traders            │  │
│  │ 2 attempts blocked         │  │
│  │ Reason: already redeemed   │  │
│  └────────────────────────────┘  │
├──────────────────────────────────┤
│  Discount given    ₹68,862       │
│  [ Export CSV ]                  │
└──────────────────────────────────┘
```

### SPT-14 Platform subscriptions

`PlatformSubscriptions` is written by `assignSubscription` and `subscribeToPlan` and drives every plan-limit check on the platform, but Support had no screen for it. A supplier stuck in `past_due` could not be diagnosed.

**Data**

| Shown | Source |
| ----- | ------ |
| List cards / MRR | `FS query PlatformSubscriptions` — filter `status`, `planId` |
| Subscriber name / role | `FS get /UserProfiles/{subscriberId}` |
| Plan / tariff labels | `FS get /SubscriptionPlans/{planId}` · `/PlanTariffs/{tariffId}` |
| Detail: why it failed | `FS get /SubscriptionInvoices/{id}` · `FS get /PaymentTransactions/{lastPaymentTransactionId}` |
| Entitlements / usage / billing history | fields on the subscription + `FS query SubscriptionInvoices` where `subscriptionId` matches |

| Control | On click |
| ------- | -------- |
| Status / plan chips | `local` filter |
| Card | `local` open detail (same documents) |
| Retry payment | `Fn processPayment` |
| Change plan | `Fn assignSubscription` |
| Cancel subscription | `Fn cancelSubscription` |
| Extend grace | `Fn extendSubscriptionGrace` |
| Export CSV | `local` of the query |

```
┌──────────────────────────────────┐
│  ←  Subscriptions         [👤]    │
├──────────────────────────────────┤
│  [ All 14 ][ ⚠ past_due 4 ]      │
│  [ Cancelled ][ Expired ]        │
│  Plan [ Any                  ▾]  │
├──────────────────────────────────┤
│  ┌────────────────────────────┐  │
│  │ Kranthi Kumar · supplier   │  │
│  │ Growth · Monthly INR       │  │
│  │ ✔ active                   │  │
│  │ 01-08 → 01-09-2026         │  │
│  │ ₹3,539 paid                │  │
│  └────────────────────────────┘  │
│  ┌────────────────────────────┐  │
│  │ Devi Traders · supplier    │  │
│  │ Starter · Monthly INR      │  │
│  │ ⚠ past_due · 6 days        │  │
│  │ ₹1,179 unpaid              │  │
│  │ Gigs blocked               │  │
│  │ [ Retry ] [ Extend grace ] │  │
│  └────────────────────────────┘  │
│  ┌────────────────────────────┐  │
│  │ Sri Lakshmi · merchant     │  │
│  │ Merchant Basic             │  │
│  │ ○ cancelled at period end  │  │
│  │ Access until 01-09-2026    │  │
│  └────────────────────────────┘  │
├──────────────────────────────────┤
│  MRR              ₹34,180        │
│  [ Export CSV ]                  │
└──────────────────────────────────┘
```

**Subscription detail**

**Data** — inherit `SPT-14`. Same documents; no extra query.

```
┌──────────────────────────────────┐
│  ←  Devi Traders          [👤]    │
├──────────────────────────────────┤
│  Starter · supplier              │
│  ⚠ past_due · 6 days             │
│  Grace until 08-09-2026          │
├──────────────────────────────────┤
│  Why it failed                   │
│  INV-SUB-2609-0212 · ₹1,179      │
│  PT-2609010044 · card declined   │
│  Retried 02-09, 04-09 — declined │
├──────────────────────────────────┤
│  Entitlements right now          │
│  ✔ Basic dashboard               │
│  ✔ Standard reports              │
│  ✔ Self-service payouts          │
│  ✔ Credit management             │
│  ⏳ Advanced reports — until 08-09│
│  ⏳ Exports — until 08-09         │
│                                  │
│  Payouts, refunds and invoices   │
│  keep working whatever happens   │
│  to this subscription.           │
├──────────────────────────────────┤
│  Usage this period               │
│  Exports        7 of 10          │
│  Scheduled      1 of 3           │
│  Ledger rows    0 of 50,000      │
├──────────────────────────────────┤
│  Billing history                 │
│  01-08  ₹1,179  ✔ paid           │
│  01-07  ₹1,179  ✔ paid           │
│  01-09  ₹1,179  ✖ failed         │
├──────────────────────────────────┤
│  [ Retry payment ]               │
│  [ Extend grace ]                │
│  [ Change plan ]                 │
│  [ Cancel subscription ]         │
└──────────────────────────────────┘
```

**Extend grace**

**Data** — inherit `SPT-14`. Confirm calls `Fn extendSubscriptionGrace`.

```
┌──────────────────────────────────┐
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│  Extend grace for Devi Traders?  │
│                                  │
│  Grace to  [ 15-09-2026    ▾]    │
│                                  │
│  This gives them 7 more days of  │
│  Starter features without        │
│  payment. ₹1,179 stays owed.     │
│                                  │
│  Reason (required)               │
│  ┌────────────────────────────┐  │
│  │ Bank issue, confirmed by   │  │
│  │ phone. Paying 08-09.       │  │
│  └────────────────────────────┘  │
│                                  │
│  Recorded against your name.     │
│                                  │
│  [ Cancel ]      [ Extend ]      │
└──────────────────────────────────┘
```

**Actions:** Retry calls `createPaymentIntent` on the open `SubscriptionInvoice` and then `processPayment`; entitlements resume only when that payment succeeds. Extend grace pushes `gracePeriodEndsAt`, records `gracePeriodGrantedBy`, and writes an `AuditLogEntry` with the reason, since it hands out paid entitlement for free. Change plan calls `changeSubscriptionPlan` and is refused when the target plan's `targetRole` does not match the subscriber; there is no path on this screen that writes `activeEntitlements` directly.

**The entitlement block is the diagnostic, not the plan name.** "Past due on Starter" does not tell an agent whether the supplier can still pay their drivers, which is the question the supplier is calling about. Listing what is active now, what expires with grace, and what is unconditional answers it in one glance and gives the agent the sentence to say.

**Usage is shown because it is the argument for the upgrade.** An agent looking at seven exports out of ten has something concrete to discuss; an agent looking at a plan name has a script.

---

## Search and audit

### SPT-15 Search and database explorer

**Data**

| Shown | Source |
| ----- | ------ |
| Collection picker / search box | `local` |
| Result rows | `FS query` the selected collection — indexed equality or prefix only; never a dump of the repo or a full-collection scan |

| Control | On click |
| ------- | -------- |
| Collection / search | `local` then re-run that indexed query |
| Result row | `nav SPT-15.1` |
| Tabs | `nav SPT-01` / `SPT-02` / `SPT-05` / `SPT-15` |

```
┌──────────────────────────────────┐
│  Search        🔊   🔔    [👤]      │
├──────────────────────────────────┤
│  ┌────────────────────────────┐  │
│  │ 🔍 Name, phone, invoice…   │   │
│  └────────────────────────────┘  │
│  Collection [ Users          ▾]  │
│  Users, Orders, MerchantOrders,  │
│  Gigs, Routes, Products,         │
│  Countries, Plans, Tariffs,      │
│  Offers, Subscriptions, Villages │
├──────────────────────────────────┤
│  12 results for "anil"           │
│  ┌────────────────────────────┐  │
│  │ Anil Kumar · merchant      │  │
│  │ u_8Kd2xQ91mZ               │  │
│  │ Karavadi · approved        │  │
│  └────────────────────────────┘  │
│  ┌────────────────────────────┐  │
│  │ Anil Reddy · buyer         │  │
│  │ u_4Rp8bV22nK               │  │
│  │ Koppolu · approved         │  │
│  └────────────────────────────┘  │
├──────────────────────────────────┤
│  [ Ops ][ Users ][ Config ][ 🔍 ] │
└──────────────────────────────────┘
```

### SPT-15.1 Record detail

A card that opens straight into an edit sheet gives Support no way to read a record before changing it, and no way at all to inspect a collection with no editor.

**Data**

| Shown | Source |
| ----- | ------ |
| Summary / raw JSON | `FS get /{collection}/{id}` — one document |
| Related chevrons | `FS get` each linked id (buyer, supplier, gig, village) |

| Control | On click |
| ------- | -------- |
| Summary / Raw | `local` |
| Related `[>]` | `nav SPT-15.1` on that id |
| Open in editor | matching `Fn upsert*` from the Navigation Support table for that collection, or `nav` to its editor |
| View audit trail | `nav SPT-16` where `targetId` matches |

```
┌──────────────────────────────────┐
│  ←  Orders / INV-2408210001      │
├──────────────────────────────────┤
│  [ Summary ]  [ Raw ]            │
├──────────────────────────────────┤
│  Buyer      Anil Kumar      [>]  │
│  Supplier   Kranthi Kumar   [>]  │
│  Merchant   Sri Lakshmi     [>]  │
│  Gig        Ongole → Mark.  [>]  │
│  Village    Karavadi        [>]  │
├──────────────────────────────────┤
│  Total              ₹1,550       │
│  Payment      paid · UPI         │
│  Delivery     reached_merchant   │
│  Invoice      INV-2408210001     │
│  Created      21-08 09:02 AM     │
│  Updated      21-08 10:28 AM     │
├──────────────────────────────────┤
│  Raw tab shows the document as   │
│  read-only JSON.                 │
├──────────────────────────────────┤
│  [ Open in editor ]              │
│  [ View audit trail ]            │
└──────────────────────────────────┘
```

Related-record chevrons make the graph traversable, which is the whole point of an explorer. Open in editor appears only for collections that have one.

### SPT-16 Audit log

Support can suspend accounts, extend paid grace periods, change plan caps and cancel other people's orders. None of that was recorded anywhere visible.

**Data**

| Shown | Source |
| ----- | ------ |
| Entry cards | `FS query AuditLogEntries` — indexed `actorId`, `action`, `occurredAt` range; not a collection scan |
| Actor labels | `FS get /UserProfiles/{actorId}` for visible rows |

| Control | On click |
| ------- | -------- |
| Actor / action / dates | `local` re-runs the same query |
| Row | `nav SPT-15.1` on `targetCollection` / `targetId` |
| Export CSV | `local` of the query |

```
┌──────────────────────────────────┐
│  ←  Audit log             [👤]    │
├──────────────────────────────────┤
│  Actor  [ Any                ▾]  │
│  Action [ Any                ▾]  │
│  From [ 14-08 ] To [ 21-08 ]     │
├──────────────────────────────────┤
│  ┌────────────────────────────┐  │
│  │ 21-08 11:02 AM             │  │
│  │ suspendGig                 │  │
│  │ Kranthi Kumar (supplier)   │  │
│  │ Gig Ongole → Markapur      │  │
│  │ "Vehicle breakdown"        │  │
│  └────────────────────────────┘  │
│  ┌────────────────────────────┐  │
│  │ 21-08 10:44 AM             │  │
│  │ setMerchantCreditLimit     │  │
│  │ Kranthi Kumar (supplier)   │  │
│  │ Sri Lakshmi ₹50,000 →      │  │
│  │ ₹75,000                    │  │
│  └────────────────────────────┘  │
│  ┌────────────────────────────┐  │
│  │ 20-08 06:12 PM             │  │
│  │ user.status change         │  │
│  │ Priya (support)            │  │
│  │ Suresh approved →          │  │
│  │ suspended                  │  │
│  │ "Disputed GST details"     │  │
│  └────────────────────────────┘  │
├──────────────────────────────────┤
│  [ Export CSV ]                  │
└──────────────────────────────────┘
```

Entries are immutable and there is no delete action, which is what makes the log worth keeping.

### SPT-17 Deactivation blocked

**Data**

| Shown | Source |
| ----- | ------ |
| Blocking records | payload of `Fn deactivateConfigurationRecord` (`IN_USE`) — not a second query |

| Control | On click |
| ------- | -------- |
| Show records | `nav SPT-15.1` on each named id |
| OK | `local` dismiss |

```
┌──────────────────────────────────┐
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│  Cannot deactivate India         │
│                                  │
│  These records still use it:     │
│  • 1 state · Andhra Pradesh      │
│  • 1 hub · Prakasam Central      │
│  • 1 supplier · Kranthi Kumar    │
│  • 2 tariffs priced in INR       │
│                                  │
│  Deactivate or move them first.  │
│                                  │
│  [ Show records ]      [ OK ]    │
└──────────────────────────────────┘
```

`deactivateConfigurationRecord` returns `IN_USE`. Naming the blocking records, with a way to open them, is the difference between an actionable error and a dead end.

---

## Cash custody

Support is the escalation path for every rupee the platform cannot account for. Two parties who disagree about an amount need a third who can see both ledgers and whose correction is itself a transaction. These screens are read-only over the money and write only through named functions, so Support can settle an argument without becoming a way to edit a balance.

### SPT-19 Cash custody console

The platform-wide position. Every other custody screen in this constitution shows one party's view; this one shows all of them at once, which is the only way to notice that one supplier's drivers are consistently late settling.

**Data**

| Shown | Source |
| ----- | ------ |
| Totals, age bands, holder cards | `Fn getCashCustodySummary` `scope: "platform"` (`weakProofOnly`, `agedOverHours` on the same call) |
| Offline stamp | `cache` of that response + `asOf` |

| Control | On click |
| ------- | -------- |
| Queue / grouping chips | `local` re-call with those flags — not a client-side filter of a dump |
| Resolve | `nav SPT-19.1` |
| Open trail | `nav SPT-19.2` |
| View all custody | same Function without the exception filters |
| Try again / pull to refresh | re-run `getCashCustodySummary` |

```
┌──────────────────────────────────┐
│  ←  Cash custody          [👤]    │
├──────────────────────────────────┤
│  Out with drivers  ₹4,86,300     │
│  Across 11 suppliers · 63 drivers│
│                                  │
│  ⚠ Over 24h          ₹71,400     │
│  ⚠ Disputed          ₹18,250     │
│  ⚠ Weak proof        ₹31,900     │
│  As of 21-08-2026 11:42 AM       │
├──────────────────────────────────┤
│  [ Disputes 7 ][ Overdue 9 ]     │
│  [ Weak proof 4 ]                │
│  [ By supplier ][ By driver ]    │
├──────────────────────────────────┤
│  ┌────────────────────────────┐  │
│  │ ⚠ Ravi Teja        ₹3,950  │  │
│  │ Kranthi Kumar · Ongole Hub │  │
│  │ Disputed · open 2 days     │  │
│  │ Shortfall ₹250 · CD-4471   │  │
│  │        [ Resolve ]         │  │
│  └────────────────────────────┘  │
│  ┌────────────────────────────┐  │
│  │ ⚠ Suresh Babu     ₹12,100  │  │
│  │ Anand Traders · Guntur Hub │  │
│  │ Not settled · 3 days       │  │
│  │ Gig ended 18-08 07:20 PM   │  │
│  │        [ Open trail ]      │  │
│  └────────────────────────────┘  │
│  ┌────────────────────────────┐  │
│  │ Lakshmi Devi       ₹2,400  │  │
│  │ Anand Traders · Guntur Hub │  │
│  │ Weak proof on 2 handovers  │  │
│  │        [ Open trail ]      │  │
│  └────────────────────────────┘  │
└──────────────────────────────────┘
```

Three things are surfaced without being asked for: money outstanding too long, money in dispute, and handovers closed on weak proof. The third is not an error and generates no alert anywhere else, which is exactly why it belongs on a queue — a driver whose handovers routinely close on a photo rather than a code is a pattern, not an incident.

**A clean platform**

**Data** — same `Fn getCashCustodySummary` as `SPT-19`. Empty exception filters, not a second endpoint.

```
┌──────────────────────────────────┐
│                                  │
│             [ ✔ ]                │
│                                  │
│    Nothing overdue, nothing      │
│    disputed.                     │
│                                  │
│    ₹4,86,300 is out with         │
│    drivers on live gigs.         │
│                                  │
│    [ View all custody ]          │
│                                  │
└──────────────────────────────────┘
```

**Error**

**Data** — same Function failed. Retry re-runs it.

```
┌──────────────────────────────────┐
│             [ ⚠ ]                │
│    Could not load custody.       │
│    Figures here are money;       │
│    a partial answer is worse     │
│    than none.                    │
│         [ Try again ]            │
└──────────────────────────────────┘
```

**Actions:** The console reads `getCashCustodySummary` at `scope: "platform"` — the one scope only Support may ask for — which returns a `CashCustodyHolderSummary` per holder across every supplier, with `weakProofAmount` and `openDiscrepancyCount` on each, and writes nothing. The `Weak proof` total and the age filter are `weakProofOnly` and `agedOverHours` on that same call rather than client-side filtering, so the figures on screen are always the server's. `[ Resolve ]` opens `SPT-19.1`; `[ Open trail ]` opens `SPT-19.2`. On desktop, per `SPT-18`, the queue becomes the list column and the selected claim or trail fills the detail pane, because comparing two ledgers in a 360px column is how mistakes get made.

Offline, the console serves the last summary it holds behind the standard banner and stamps it with the `asOf` it was read at, so an agent on a bad connection knows they are looking at a figure from twenty minutes ago rather than now. Every write on this screen and the two below it is a financial write, and financial writes are blocked offline for Support: `[ Resolve ]` is disabled with the reason stated rather than queued, because a correction that lands out of order against an append-only ledger is worse than one that waits.

### SPT-19.1 Discrepancy resolution

One claim, both sides of it, and a decision that writes a balancing entry. This is the only path by which anyone corrects a cash or credit balance on this platform, which is deliberate: a correction is always itself an audited transaction, never an edit.

**Data**

| Shown | Source |
| ----- | ------ |
| Claim | `FS get /CashDiscrepancies/{discrepancyId}` |
| Parties | `FS get /UserProfiles/{raisedBy}` · `/{againstPartyId}` |
| Settlement / expected vs declared | `FS get /CashSettlements/{settlementId}` |
| Evidence thumbs | `FS get` the transfer / ledger docs named on the claim |
| Credit-touch confirm | `FS get /CreditProfiles/{merchantId}` |
| Resolution radios / amount / reason | `local` |

| Control | On click |
| ------- | -------- |
| Open trail · View trail | `nav SPT-19.2` |
| Resolve claim · Reverse | `Fn resolveCashDiscrepancy` |
| Raise a counter | `Fn raiseCashDiscrepancy` |

```
┌──────────────────────────────────┐
│  ←  Claim CD-4471         [👤]    │
├──────────────────────────────────┤
│  Shortfall               ₹250    │
│  Open 2 days · under review      │
├──────────────────────────────────┤
│  Raised by                       │
│  Kranthi Kumar · supplier        │
│  21-08-2026 06:58 PM             │
│                                  │
│  Against                         │
│  Ravi Teja · driver              │
├──────────────────────────────────┤
│  "Buyer disputes the price at    │
│   Karavadi. Checking with the    │
│   merchant."                     │
├──────────────────────────────────┤
│  Settlement CS-8820              │
│  Expected              ₹8,450    │
│  Driver declared       ₹8,200    │
│  Supplier counted      ₹8,200    │
│  Driver's note: "Buyer paid      │
│  ₹250 short at Karavadi"         │
│           [ Open trail ]         │
├──────────────────────────────────┤
│  Evidence                        │
│  ┌────────┐ ┌────────┐           │
│  │ 📷 door │ │ 📷 slip │           │
│  └────────┘ └────────┘           │
├──────────────────────────────────┤
│  Decide                          │
│  ( ) Recover from driver's pay   │
│      recover_from_earnings       │
│  ( ) Carry to his next gig       │
│      carry_forward               │
│  ( ) Write off · supplier bears  │
│      waive                       │
│  (•) Keep under review           │
│      escalate_to_support         │
│                                  │
│  Amount                          │
│  ┌──────────┐  of ₹250 claimed   │
│  │ ₹ 250    │                    │
│  └──────────┘                    │
│                                  │
│  Reason (required, shown to both)│
│  ┌────────────────────────────┐  │
│  │ Order OR-9914 was priced   │  │
│  │ ₹250 above the pamphlet.   │  │
│  │ Buyer paid correctly; the  │  │
│  │ supplier bears the gap.    │  │
│  └────────────────────────────┘  │
│                                  │
│  [ Resolve claim ]               │
└──────────────────────────────────┘
```

The reason is shown to both parties verbatim. A decision the loser cannot read is not a resolution, it is an outcome, and the difference is whether anyone trusts the next one.

**Partial amount**

**Data** — inherit `SPT-19.1`. Amount is `local` until Resolve.

```
│  Amount                          │
│  ┌──────────┐  of ₹250 claimed   │
│  │ ₹ 150    │                    │
│  └──────────┘                    │
│  ⚠ ₹100 stays with Ravi Teja and │
│    appears on his next gig.      │
```

A partial resolution is allowed and the remainder is never left implicit. The screen states where the rest of the money goes before the button is pressed.

**Touching a merchant's credit**

**Data** — inherit `SPT-19.1`. Reverse is `Fn resolveCashDiscrepancy`.

```
┌──────────────────────────────────┐
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│  This changes credit             │
│                                  │
│  Sri Lakshmi Stores              │
│  Used now             ₹13,098    │
│  Used after           ₹17,098    │
│                                  │
│  A reversal row will appear on   │
│  her ledger with your name and   │
│  this reason. She is notified.   │
│                                  │
│  [ Cancel ]    [ Reverse ₹4,000 ]│
└──────────────────────────────────┘
```

**Resolved**

**Data** — same `FS get /CashDiscrepancies/{id}` after resolve. View trail → `nav SPT-19.2`.

```
┌──────────────────────────────────┐
│  ✔ Claim CD-4471 resolved        │
│                                  │
│  Written off · ₹250              │
│  Kranthi Kumar bears it          │
│                                  │
│  Settlement CS-8820 is now       │
│  settled. Ravi Teja holds ₹0.    │
│                                  │
│  Both parties notified.          │
│  [ View trail ]                  │
└──────────────────────────────────┘
```

**Actions**

| Control        | Result                                                                                                             |
| -------------- | ------------------------------------------------------------------------------------------------------------------ |
| Resolve claim  | `resolveCashDiscrepancy` with the `resolution`, an optional `adjustedAmount`, and the mandatory `resolutionNote`     |
| Reverse        | The same call; a credit correction appends a `CreditTransaction` of type `adjustment`, or `reversal` carrying `reversalOfTransactionId` when it undoes one named earlier row |
| Raise a counter| `raiseCashDiscrepancy` when reviewing reveals a second, separate claim rather than a variant of this one              |
| Open trail     | `SPT-19.2` on the settlement, the transfer, or the ledger entry named in the row                                     |

There is no field on this screen that writes a balance. `CashLedgerEntries`, `CreditTransactions` and `CustodyTransfers` are append-only and Support reads all three and writes none, so the only thing `[ Resolve claim ]` can do is add a row — a typed `adjustment` or `reversal` carrying the caller's id and the reason typed above. That is a deliberate limit rather than a missing feature: an administrator who can edit the evidence can edit the account of what happened, and the reason this queue is trusted by both a supplier and a driver who disagree is that neither of them can be quietly overwritten. A balance that looks wrong is corrected by explaining it, in a row anyone can read afterwards.

`INVALID_STATE` on an already-resolved claim renders as the resolved card rather than an error, because two Support agents opening the same queue item is routine. `INVALID_AMOUNT` on an amount above the claim is caught on the field before the call, and `LEDGER_IMBALANCE` refuses the resolution outright rather than posting a row that would not reconcile. Closing the last claim on a settlement completes the sweep `confirmCashSettlement` deferred, and the driver's `cashInCustody` drops to zero in the same transaction — the claim and the custody it froze are never resolved separately.

### SPT-19.2 Custody audit trail

One rupee, end to end. The question this screen answers is the one every dispute eventually reduces to: where did the money go, who said so, and how did they prove it.

**Data**

| Shown | Source |
| ----- | ------ |
| Header / totals | `FS get /CashSettlements/{id}` (or transfer / ledger / order named in the lookup) |
| Timeline rows | `FS query CashLedgerEntries` · `CustodyTransfers` · `CashDiscrepancies` scoped to that settlement — not a repo dump |
| Proof / clocks / fallback | fields on those documents + `FS get` the `VerificationFallback` named on the row |
| Lookup id | `local` |

| Control | On click |
| ------- | -------- |
| Open trail (lookup) | `FS get` the named id, then the same scoped queries |
| Raise claim | `Fn raiseCashDiscrepancy` |
| Authorise fallback | `Fn authorizeVerificationFallback` |
| Row tap | `nav SPT-15.1` |
| Export CSV | `local` of the loaded rows |

```
┌──────────────────────────────────┐
│  ←  Trail · CS-8820       [👤]    │
├──────────────────────────────────┤
│  Settlement · Ravi Teja          │
│  Kranthi Kumar · Ongole Hub      │
│  Gig ongole-darsi-1908           │
├──────────────────────────────────┤
│  ┌────────────────────────────┐  │
│  │ ● Collected     ₹4,000     │  │
│  │ Sri Lakshmi Stores → Ravi  │  │
│  │ credit_repayment           │  │
│  │ ✔ otp · strong             │  │
│  │ On phone  19-08 04:15 PM   │  │
│  │ On server 19-08 04:15 PM   │  │
│  │ Credit relieved at once    │  │
│  │ CT-3301 · CLE-9902         │  │
│  └────────────────────────────┘  │
│  ┌────────────────────────────┐  │
│  │ ● Collected     ₹1,500     │  │
│  │ Buyer OR-9914 → Ravi       │  │
│  │ order_handover             │  │
│  │ ⚠ photo · weak             │  │
│  │ On phone  19-08 04:52 PM   │  │
│  │ On server 19-08 07:06 PM   │  │
│  │ ⚠ replayed after 2h 14m    │  │
│  │ "Buyer's phone was with    │  │
│  │  her son" — authorised by  │  │
│  │  Kranthi Kumar 04:44 PM    │  │
│  │ VFA-2210 · consumed        │  │
│  └────────────────────────────┘  │
│  ┌────────────────────────────┐  │
│  │ ● Declared      ₹8,200     │  │
│  │ On phone  19-08 07:20 PM   │  │
│  │ On server 19-08 07:20 PM   │  │
│  │ Expected ₹8,450            │  │
│  │ "Buyer paid ₹250 short"    │  │
│  └────────────────────────────┘  │
│  ┌────────────────────────────┐  │
│  │ ● Counted       ₹8,200     │  │
│  │ Ravi → Kranthi Kumar       │  │
│  │ ⚠ counter_signature · weak │  │
│  │ On phone  19-08 07:31 PM   │  │
│  │ On server 19-08 07:31 PM   │  │
│  │ Shortfall ₹250 · escalated │  │
│  │ CD-4471                    │  │
│  └────────────────────────────┘  │
│  ┌────────────────────────────┐  │
│  │ ● Written off     ₹250     │  │
│  │ 21-08 07:04 PM · by you    │  │
│  │ "Order was mispriced"      │  │
│  │ CLE-9977 · adjustment      │  │
│  └────────────────────────────┘  │
├──────────────────────────────────┤
│  Collected             ₹8,450    │
│  Settled               ₹8,200    │
│  Written off             ₹250    │
│  Unaccounted               ₹0    │
├──────────────────────────────────┤
│  [ Export CSV ]                  │
└──────────────────────────────────┘
```

The trail reconciles to zero at the bottom or it says so. `Unaccounted` is the number an auditor looks at first and the only one on this screen that should never be non-zero; when it is, the row that broke it is flagged rather than the total being quietly adjusted.

Every row carries two clocks. `On phone` is the `capturedAt` the device recorded at the physical moment of handover; `On server` is the `verifiedAt` at which the platform accepted it. On a live connection they agree, and showing both looks redundant. On the second row they are two hours apart, which is the whole reason both are kept: the handover happened at 04:52 PM in a village with no signal and was replayed at 07:06 PM, and an investigation that only had the server clock would conclude the driver collected the money after the gig had already ended. The gap is stated on the row rather than left to be inferred from the two timestamps.

Weak proof is called out on the row, not buried in a detail sheet, together with the authorisation that permitted it and the name of whoever granted it. A photo-closed handover with a supplier's reason beside it is defensible; the same handover with nothing beside it is the thing this whole system exists to prevent. `VerificationRecord.strength` is server-derived and not a claim the client makes: `otp`, `code` and `offline_code` are `strong`, and `photo`, `gallery`, `counter_signature` and `support_override` are `weak` however necessary they were at the time. A settlement whose every row reads `weak` is not an error and will not appear on any error queue, which is exactly why `SPT-19` filters for it.

**Entered by id**

**Data** — inherit `SPT-19.2`. Id and kind chips are `local` until Open trail.

```
┌──────────────────────────────────┐
│  ←  Trail                 [👤]    │
├──────────────────────────────────┤
│  Look up                         │
│  [ Settlement ][ Transfer ]      │
│  [ Ledger entry ][ Order ]       │
│  ┌────────────────────────────┐  │
│  │ CLE-9902                   │  │
│  └────────────────────────────┘  │
│  [ Open trail ]                  │
└──────────────────────────────────┘
```

**Broken chain**

**Data** — inherit `SPT-19.2`. Raise claim is `Fn raiseCashDiscrepancy`.

```
│  ┌────────────────────────────┐  │
│  │ ⚠ Gap                      │  │
│  │ CLE-9940 · ₹800            │  │
│  │ in_custody, but the gig    │  │
│  │ closed 19-08 07:31 PM      │  │
│  │ No transfer references it. │  │
│  │        [ Raise claim ]     │  │
│  └────────────────────────────┘  │
│                                  │
│  Unaccounted             ₹800    │
```

**Actions**

| Control          | Result                                                                                                       |
| ---------------- | ------------------------------------------------------------------------------------------------------------ |
| Raise claim      | `raiseCashDiscrepancy` with `kind: "unrecorded_collection"`, the entry id, and the gap amount as the claim     |
| Authorise fallback| `authorizeVerificationFallback` when a live handover on this trail is stuck and Support is the escalation      |
| Row tap          | `SPT-15.1` record detail on the underlying document, with its links traversable                                |
| Export CSV       | The same rows, for an auditor who does not have an app login                                                  |

Reachable from `SPT-19`, `SPT-19.1`, and from any `CashLedgerEntry`, `CustodyTransfer`, or `CashSettlement` opened in the database explorer. Each row also carries through to `SPT-16`, where the same act appears as an `AuditLogEntry` with the actor, the claim under which they acted, and the request that carried it — the trail answers what happened to the money and the audit log answers who was allowed to do it, and a dispute usually needs both. It writes nothing on its own except through the two functions named above, and every row on it is a document that already exists rather than a rendering of one.

**States:** Loading renders the timeline as skeleton rows top-down so the earliest events appear first and the totals last, since the totals are the part that must not be read early. An id with no trail shows the lookup card above with `⚠ Nothing found for CLE-9902` inline against the field. A partial read shows the rows it has plus an inline `⚠ Some rows could not be loaded` banner and suppresses the totals block entirely — a reconciliation total computed over an incomplete trail is worse than no total. Offline the trail serves from cache behind the standard banner but suppresses the totals block for the same reason as a partial read: the rows are evidence and remain useful stale, while the reconciliation over them is only meaningful against a complete and current chain. Every control is read-only except `[ Raise claim ]` and `[ Authorise fallback ]`, both financial writes and therefore disabled rather than queued while the banner is showing.

---

## Money exceptions

### SPT-20 Payment and payout exceptions

Six named queues, each holding items where money is in an ambiguous state and somebody is waiting. Every queue is aged, every item carries its own references, and every resolution is a specific server action with a mandatory reason.

**Data**

| Shown | Source |
| ----- | ------ |
| Queue chips / cards | `FS query PaymentTransactions` (`pending`); `PayoutTransactions` (`failed`); `ReconciliationExceptions` (`kind` in duplicate / orphan); `RefundTransactions` awaiting `approvedBy` |
| Work-it header / events / checks | `FS get /PaymentTransactions/{id}` + `/PaymentIntents/{id}` + `/Orders/{id}` |
| Reason / radios | `local` |

| Control | On click |
| ------- | -------- |
| Queue / sort chips | `local` filter of those queries |
| Work it | `local` open the item (same gets) |
| Re-query the gateway · Apply | `Fn handleGatewayWebhook` |
| Mark failed / match orphan / park | `Fn resolveReconciliationException` |
| Refund duplicate · Approve refund | `Fn refundOrder` (credit note via `Fn issueCreditNote` on that path) |
| Retry payout | `Fn retryPayout` |
| Verify manual payout | `Fn verifyManualPayout` |
| Block beneficiary | `Fn blockPayoutBeneficiary` |

```
┌──────────────────────────────────┐
│  ←  Money exceptions      [👤]    │
├──────────────────────────────────┤
│  [ Stuck payments 7 ]            │
│  [ Failed payouts 3 ]            │
│  [ Duplicates 2 ]                │
│  [ Orphans 4 ]                   │
│  [ Reversals 1 ]                 │
│  [ Refund approvals 2 ]          │
│  Sort [ Oldest first        ▾]   │
├──────────────────────────────────┤
│  Stuck payments · 7              │
│  ┌────────────────────────────┐  │
│  │ 🔴 PT-2408210443            │  │
│  │ ₹1,550 · pending 4h 12m    │  │
│  │ Anil Kumar · INV-...0001   │  │
│  │ Order OR-9914 · unpaid     │  │
│  │ Gateway last said:         │  │
│  │ authorized 10:31 AM        │  │
│  │ No capture, no failure.    │  │
│  │              [ Work it ]   │  │
│  └────────────────────────────┘  │
│  ┌────────────────────────────┐  │
│  │ ⚠ PT-2408210502             │  │
│  │ ₹640 · pending 52m         │  │
│  │ Within the 1h window       │  │
│  │              [ Work it ]   │  │
│  └────────────────────────────┘  │
└──────────────────────────────────┘
```

**Working a stuck payment**

**Data** — inherit `SPT-20`. Apply maps to the radio's Function above.

```
┌──────────────────────────────────┐
│  ←  PT-2408210443         [👤]    │
├──────────────────────────────────┤
│  ₹1,550.00 · pending 4h 12m      │
│  Buyer Anil Kumar · +91 ····3456 │
│  Order OR-9914 · INV-2408210001  │
├──────────────────────────────────┤
│  What we know                    │
│  Intent    PI-2408210221         │
│  Attempt   3 of 3                │
│  Gateway   order_Nq82kd          │
│  Payment   pay_Nq83ll (reported) │
│  Signature ✔ verified            │
├──────────────────────────────────┤
│  Provider events received        │
│  10:31:04  payment.authorized    │
│  —         no capture            │
│  —         no failure            │
├──────────────────────────────────┤
│  What we checked                 │
│  ✔ Gateway API says: authorized  │
│    at 10:31, not captured        │
│  ✖ Not in today's settlement     │
│    report                        │
│  ✖ No bank credit matched        │
├──────────────────────────────────┤
│  What you can do                 │
│  ( ) Re-query the gateway        │
│  ( ) Mark failed and release     │
│      the stock                   │
│  ( ) Escalate to the provider    │
│                                  │
│  Reason (required)               │
│  ┌────────────────────────────┐  │
│  │                            │  │
│  └────────────────────────────┘  │
│                                  │
│  You cannot mark this paid.      │
│  Only the provider can.          │
│                                  │
│  [  Apply  ]                     │
└──────────────────────────────────┘
```

**Duplicate payment**

**Data** — inherit `SPT-20`. Apply is `Fn refundOrder`.

```
│  ⚠ Two payments, one order       │
│  Order OR-9914 · ₹1,550 due      │
│                                  │
│  PT-...0443  ₹1,550  succeeded   │
│    10:34 AM · pay_Nq83ll         │
│  PT-...0451  ₹1,550  succeeded   │
│    10:38 AM · pay_Nq84mm         │
│                                  │
│  Collected ₹3,100 · owed ₹1,550  │
│  Over-collected ₹1,550           │
│                                  │
│  ( ) Refund the later one        │
│      (recommended)               │
│  ( ) Refund the earlier one      │
│  ( ) Hold — buyer says it's for  │
│      a different order           │
│                                  │
│  Refunding raises a credit note  │
│  against INV-2408210001.         │
│  [  Apply  ]                     │
```

**Orphan at the provider**

**Data** — inherit `SPT-20`. Apply is `Fn resolveReconciliationException`.

```
│  ⚠ Money we can't place          │
│                                  │
│  Razorpay reports pay_Nq99zz     │
│  ₹2,400 captured 20-08 03:12 PM  │
│  order_Nq99yy                    │
│                                  │
│  We have no intent, no order and │
│  no subscription with that       │
│  reference.                      │
│                                  │
│  Someone paid us ₹2,400 and we   │
│  don't know who for.             │
│                                  │
│  ( ) Match to an order  [ find ] │
│  ( ) Refund to source            │
│  ( ) Park in suspense and        │
│      escalate                    │
│                                  │
│  Break REC-240820-03 · 1 day old │
```

**Refund awaiting a second approver**

**Data** — inherit `SPT-20`. Approve / Reject is `Fn refundOrder`.

```
│  ⚠ Refund over the ₹10,000 limit │
│                                  │
│  RF-2408210091 · ₹34,000         │
│  Order MO-7781 · Sri Lakshmi     │
│  Raised by Priya · 21-08 09:14   │
│  "Whole consignment rejected —   │
│   stock damaged in transit"      │
│                                  │
│  Original payment PT-...0088     │
│  ₹34,000 captured 18-08          │
│  Nothing refunded yet.           │
│                                  │
│  You are not Priya, so you can   │
│  approve this.                   │
│                                  │
│  Reason (required)               │
│  ┌────────────────────────────┐  │
│  └────────────────────────────┘  │
│  [ Reject ]   [ Approve ₹34,000 ]│
```

**Actions**

| Control | Server action | Constraint |
| ------- | ------------- | ---------- |
| Re-query the gateway | `handleGatewayWebhook` replay from a fetched provider record | Applies the provider's answer; never Support's |
| Mark failed and release | `resolveReconciliationException` with `corrected_by_adjustment` | Refused if the provider has since reported a capture; the reservation is released in the same transaction that records the failure |
| Refund a duplicate | `refundOrder` with `reasonCode: "duplicate_payment"` | Raises a credit note; over the ceiling it queues for a second approver |
| Match an orphan | `resolveReconciliationException` with `matched_manually` | Requires the target record id; the amount must agree |
| Park in suspense | `resolveReconciliationException` with `no_action_required`, which moves the exception to `escalated` rather than `resolved` | Keeps the break open and aged; it is not a close |
| Approve a refund | `refundOrder` second approval | Blocked when the caller raised it |
| Retry a payout | `retryPayout` | Only from a failed payout, only to a verified destination |

**No control on this screen can declare money received or sent.** There is no "mark as paid", no amount field, and no way to write a UTR that the rail did not supply. Support's authority here is to ask the provider again, to record a failure the provider has confirmed, to move money back, and to escalate. That boundary is what makes the queue trustworthy: a break that Support could close by asserting the happy outcome would be closed that way under pressure, every time, and the platform would lose the one signal telling it that money is missing.

**Every item states what was already checked.** An agent opening a four-hour-old stuck payment should not begin by re-querying the gateway and re-reading the settlement file; the platform has done both and says so, including the negative results. The three lines under "What we checked" are the difference between a queue that gets worked and a queue that gets skipped.

**States:** each queue serves from cache offline behind the standard banner, with every action disabled and the reason stated — these are financial writes and must not be queued. An item another agent has open shows `⚠ Priya is working on this (2m ago)` rather than allowing two simultaneous resolutions. An item already resolved renders as its resolution card rather than an error, because two agents reaching for the same top-of-queue item is routine.

### SPT-21 Reconciliation workspace

Three sources, one business date, and a list of everything that does not agree. This screen is where "the numbers are fine" stops being an assertion.

**Data**

| Shown | Source |
| ----- | ------ |
| Run header / source ticks / totals | `FS query ReconciliationRuns` where `date` matches; `FS get /ReconciliationRuns/{runId}` |
| Break chips | `FS query ReconciliationExceptions` where `runId` matches |
| Worked-break sides / history | `FS get /ReconciliationExceptions/{id}` |
| Date / scope / note / radios | `local` |

| Control | On click |
| ------- | -------- |
| Date / scope | `local` then re-run those queries |
| Run again | `Fn runReconciliation` |
| Break card | `local` open exception (same get) |
| Save | `Fn resolveReconciliationException` |
| Download pack | `local` of the run documents — no export Function on this screen |
| Retry fetch | `Fn runReconciliation` — same run, re-pulls the failed source |
| Call Ops | `tel:` |

```
┌──────────────────────────────────┐
│  ←  Reconciliation        [👤]    │
├──────────────────────────────────┤
│  Date  [ 20-08-2026        ▾]    │
│  Scope [ All               ▾]    │
│  [ Run again ]                   │
├──────────────────────────────────┤
│  Run REC-240820 · 06:12 AM       │
│  completed with exceptions       │
├──────────────────────────────────┤
│  Sources                         │
│  ✔ Platform      412 records     │
│  ✔ Razorpay      409 records     │
│    settlement report 06:02 AM    │
│  ✔ Bank statement 118 lines      │
│    HDFC ····8842 · 05:40 AM      │
├──────────────────────────────────┤
│  Collections                     │
│  Platform          ₹6,18,420     │
│  Provider          ₹6,16,020     │
│  Difference          ₹2,400      │
│                                  │
│  Payouts                         │
│  Platform            ₹94,200     │
│  Provider            ₹94,200     │
│  Bank                ₹94,200     │
│  ✔ agrees                        │
│                                  │
│  Fees and tax                    │
│  Charged              ₹8,204     │
│  Expected             ₹8,204     │
│  ✔ agrees                        │
├──────────────────────────────────┤
│  Matched          401 · ₹6,13,620│
│  Breaks            11 ·   ₹4,800 │
│  ┌────────────────────────────┐  │
│  │ 🔴 Missing at provider  2   │  │
│  │ We say paid, they don't    │  │
│  │ ₹1,200 · oldest 3 days     │  │
│  └────────────────────────────┘  │
│  ┌────────────────────────────┐  │
│  │ 🔴 Missing on platform  1   │  │
│  │ They paid us, we have no   │  │
│  │ record · ₹2,400            │  │
│  └────────────────────────────┘  │
│  ┌────────────────────────────┐  │
│  │ ⚠ Amount mismatch  3        │  │
│  │ ₹640 apart in total        │  │
│  └────────────────────────────┘  │
│  ┌────────────────────────────┐  │
│  │ ⚠ Status mismatch  4        │  │
│  │ ⚠ Duplicate at provider  1  │  │
│  │ ⚠ Fee variance  0           │  │
│  └────────────────────────────┘  │
├──────────────────────────────────┤
│  [ Download pack ]               │
└──────────────────────────────────┘
```

**A break, worked**

**Data** — inherit `SPT-21`. Save is `Fn resolveReconciliationException`.

```
┌──────────────────────────────────┐
│  ←  REC-240820-07         [👤]    │
├──────────────────────────────────┤
│  🔴 Missing at provider           │
│  Open 3 days · SLA breached      │
│  Assigned to Priya               │
├──────────────────────────────────┤
│  We say                          │
│  PO-24102 · ₹3,000 completed     │
│  UTR 431299887766                │
│  13-08 02:14 PM                  │
│                                  │
│  RazorpayX says                  │
│  Payout pout_Nk91ldm4            │
│  processed 13-08 02:14 PM        │
│                                  │
│  The bank says                   │
│  No debit of ₹3,000 on 13-08     │
│  or on 14-08.                    │
├──────────────────────────────────┤
│  Evidence                        │
│  [ Provider payload ]            │
│  [ Bank statement rows ]         │
│  [ Payout audit trail ]          │
├──────────────────────────────────┤
│  History                         │
│  14-08 06:12  Opened by the      │
│               nightly run        │
│  14-08 10:40  Priya: "raised     │
│               with RazorpayX,    │
│               ticket RZP-99120"  │
│  16-08 09:15  Priya: "they are   │
│               checking with the  │
│               beneficiary bank"  │
├──────────────────────────────────┤
│  Resolve as                      │
│  ( ) Matched — I found it        │
│  ( ) We were wrong — correct     │
│      the platform record         │
│  ( ) They were wrong — provider  │
│      is correcting it            │
│  ( ) Write off ₹3,000            │
│  ( ) Ignore — duplicate of       │
│      REC-240819-02               │
│  (•) Still working — add a note  │
│                                  │
│  Note (required)                 │
│  ┌────────────────────────────┐  │
│  └────────────────────────────┘  │
│                                  │
│  ⚠ A write-off over ₹5,000 needs │
│    a second approver.            │
│                                  │
│  [  Save  ]                      │
└──────────────────────────────────┘
```

**Source missing**

**Data** — inherit `SPT-21`. Retry fetch is a gap. Call Ops is `tel:`.

```
│  ⚠ Can't reconcile 21-08         │
│                                  │
│  ✔ Platform       388 records    │
│  ✔ Razorpay       385 records    │
│  ✖ Bank statement not received   │
│    Expected by 05:30 AM          │
│                                  │
│  We won't run a two-way match    │
│  and call it reconciled. Fetch   │
│  the statement, then run again.  │
│                                  │
│  [ Retry fetch ]  [ 📞 Ops ]      │
```

**Actions:** `[ Run again ]` calls `runReconciliation` and is refused over a closed period. Each resolution calls `resolveReconciliationException`. `[ Download pack ]` produces the run's evidence bundle — source files, matched set, break list with resolutions, and the totals — and is what an auditor is handed.

**A break is never closed silently and never closed by default.** "Still working" is the pre-selected option, the note is mandatory on every path including that one, and the history accumulates rather than being replaced. An exception queue whose items can be dismissed with one tap empties reliably and means nothing.

**Partial reconciliation is refused rather than degraded.** With one of three sources missing the platform will not produce a two-way match and label it reconciled, because a reconciliation that quietly reduced its own scope is worse than an absent one — it produces a green tick over an unchecked leg. The screen states which source is missing and offers to fetch it again.

**Write-offs are the one resolution with a money effect, and they carry a threshold.** Above the configured ceiling a second approver who did not raise the write-off must agree. This is the path an insider would use to make a shortfall disappear, and it is the only resolution on the screen that permanently accepts a loss.

### SPT-22 Period close

Closing a period is what turns a report into a statement. It is also the moment back-dated edits stop being possible, which is the property the whole control framework rests on.

**Data**

| Shown | Source |
| ----- | ------ |
| Period header / checklist / lock totals | `FS get /AccountingPeriods/{periodId}` |
| Open-break counts | `FS query ReconciliationExceptions` dated inside the period where status is still open |
| Prior period line | `FS get /AccountingPeriods/{previousId}` |
| Attestation / reopen reason | `local` |

| Control | On click |
| ------- | -------- |
| Go to breaks | `nav SPT-21` |
| Close period | `Fn closeAccountingPeriod` |
| Reopen | `Fn reopenAccountingPeriod` |
| Download | `local` of `evidencePackRef` — no export Function on this screen |
| Run again (if offered) | `Fn runReconciliation` |

```
┌──────────────────────────────────┐
│  ←  Close August 2026     [👤]    │
├──────────────────────────────────┤
│  01-08-2026 to 31-08-2026        │
│  Status  open                    │
│  July closed 04-08 by Ramesh     │
├──────────────────────────────────┤
│  Before you can close            │
│  ✔ Every day reconciled          │
│    31 of 31 runs completed       │
│  ✖ 11 breaks still open          │
│    2 past SLA · ₹4,800           │
│  ✔ No payments pending over 24h  │
│  ✔ No payouts in flight          │
│  ✔ Bank statements received      │
│    for all 31 days               │
├──────────────────────────────────┤
│  What will be locked             │
│  Payments        8,412 ₹1.94 Cr  │
│  Refunds            88   ₹2.1 L  │
│  Credit notes       88   ₹2.1 L  │
│  Payouts           412  ₹28.4 L  │
│  Cash settled      196  ₹41.2 L  │
│  Subscriptions      64   ₹1.8 L  │
│  GST output              ₹29.6 L │
│  TDS withheld             ₹56 K  │
├──────────────────────────────────┤
│  [ Close period ] (disabled)     │
│  Clear the 11 breaks first.      │
│  [ Go to breaks ]                │
└──────────────────────────────────┘
```

**Ready to close**

**Data** — inherit `SPT-22`. Close is `Fn closeAccountingPeriod`.

```
│  Before you can close            │
│  ✔ Every day reconciled          │
│  ✔ No breaks open                │
│    9 resolved · 2 written off    │
│    ₹1,240 written off, approved  │
│    by Ramesh                     │
│  ✔ No payments pending over 24h  │
│  ✔ No payouts in flight          │
│                                  │
│  I confirm I have reviewed the   │
│  reconciliation evidence for     │
│  August 2026.                    │
│  (x) Confirmed                   │
│                                  │
│  After closing, nothing dated in │
│  August can be changed. A        │
│  correction becomes an entry in  │
│  September.                      │
│                                  │
│  [  Close August 2026  ]         │
```

**Closed**

**Data** — inherit `SPT-22`. Reopen is `Fn reopenAccountingPeriod`.

```
│  ✔ August 2026 closed            │
│  Closed 03-09-2026 06:40 PM      │
│  by Meera Iyer                   │
│                                  │
│  Evidence pack                   │
│  31 reconciliation runs          │
│  11 breaks, all resolved         │
│  Source files and totals         │
│  [ Download ]                    │
│                                  │
│  Reopened 0 times                │
│                                  │
│  [ Reopen ] — admin only         │
```

**Reopen**

**Data** — inherit `SPT-22`. Confirm is `Fn reopenAccountingPeriod`.

```
┌──────────────────────────────────┐
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│  Reopen August 2026?             │
│                                  │
│  This period was closed on       │
│  03-09 by Meera Iyer and its     │
│  figures have been reported.     │
│                                  │
│  Reopening is counted, shown on  │
│  the evidence pack, and visible  │
│  to anyone auditing the period.  │
│                                  │
│  Reason (required)               │
│  ┌────────────────────────────┐  │
│  └────────────────────────────┘  │
│                                  │
│  [ Cancel ]   [ Reopen ]         │
└──────────────────────────────────┘
```

**Actions:** `[ Close period ]` calls `closeAccountingPeriod` with the attestation and is refused with the blocking break ids while any remain open. `[ Reopen ]` calls `reopenAccountingPeriod` and is visible only to Admin.

**The checklist is a gate, not advice.** The close button stays disabled with the specific blocker named and a jump to it. A close that could be forced past open breaks would be forced past open breaks at month end, which is precisely when the pressure to report exists and precisely when the breaks matter.

**The attestation names a person.** `closedBy` and the confirmation text are stored on the period and printed on the evidence pack. Period close is the point at which an organisation says these figures are final, and a final figure with no name against it is not one.

### SPT-23 Tax profile and place of supply

The tax treatment of every invoice on the platform is authored here. It is a Config screen rather than a constant in a function because the platform serving one state today is exactly the condition under which a hard-coded state looks correct.

**Data**

| Shown | Source |
| ----- | ------ |
| Profile cards / missing-profile warning | `FS query TaxProfiles`; suppliers without an effective window from `FS query UserProfiles` where `role == "supplier"` |
| Sheet fields / preview examples | `local` until Save; preview is `local` arithmetic |

| Control | On click |
| ------- | -------- |
| Card · Create profile · FAB `+` | `local` open sheet |
| Save profile · Create version | `Fn upsertTaxProfile` |

```
┌──────────────────────────────────┐
│  ←  Tax profiles          [👤]    │
├──────────────────────────────────┤
│  ┌────────────────────────────┐  │
│  │ Kranthi Traders            │  │
│  │ 37AABCK1234M1Z5            │  │
│  │ Andhra Pradesh (37)        │  │
│  │ Regular · ✔ active         │  │
│  │ 01-04-2026 → open          │  │
│  └────────────────────────────┘  │
│  ┌────────────────────────────┐  │
│  │ Sri Lakshmi Supply         │  │
│  │ ⚠ No effective profile     │  │
│  │ Orders will be refused     │  │
│  │ [ Create profile ]         │  │
│  └────────────────────────────┘  │
│                          [ + ]   │
└──────────────────────────────────┘
```

**Upsert profile sheet**

**Data** — inherit `SPT-23`. Fields are `local` until Save.

```
┌──────────────────────────────────┐
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│  Tax profile                [ X ]│
├──────────────────────────────────┤
│  Supplier [ Kranthi Traders  ▾]  │
│  GSTIN    [ 37AABCK1234M1Z5  ]   │
│  Legal name                      │
│  [ Kranthi Traders Pvt Ltd   ]   │
│  Reg. state [ Andhra Pradesh ▾]  │
│           state code 37          │
│  Type     [ Regular          ▾]  │
│                                  │
│  Place of supply basis           │
│  Buyer order                     │
│  [ Recipient delivery state  ▾]  │
│  Merchant order                  │
│  [ Recipient reg. state      ▾]  │
│  Subscription                    │
│  [ Service performance state ▾]  │
│                                  │
│  Default GST % [ 18          ▾]  │
│  Reverse charge      ( ) yes     │
│  Export supplies     ( ) yes     │
│                                  │
│  Invoice prefix     [ INV-    ]  │
│  Credit note prefix [ CN-     ]  │
│  Signatory                       │
│  [ K. Kumar, Director        ]   │
│                                  │
│  Effective from [ 01-04-2026 ]   │
│  Effective to   [ blank = open]  │
│                                  │
│  [  Save  ]                      │
└──────────────────────────────────┘
```

**Resolution preview — shown before save**

**Data** — inherit `SPT-23`. Preview is `local`. Save profile is `Fn upsertTaxProfile`.

```
│  What this produces              │
│                                  │
│  Buyer order → Prakasam, AP      │
│  Intra-state · CGST 9 + SGST 9   │
│                                  │
│  Buyer order → Nellore, TN       │
│  Inter-state · IGST 18           │
│                                  │
│  Merchant order → GSTIN 37…      │
│  Intra-state · CGST 9 + SGST 9   │
│                                  │
│  Merchant order → GSTIN 29…      │
│  Inter-state · IGST 18           │
│                                  │
│  Subscription → AP subscriber    │
│  Intra-state · CGST 9 + SGST 9   │
│                                  │
│  [ Back ]      [ Save profile ]  │
```

**Superseding an in-use profile**

**Data** — inherit `SPT-23`. Create version is `Fn upsertTaxProfile`.

```
│  ⚠ This profile has priced       │
│    4,182 invoices.               │
│                                  │
│  Saving creates version 2        │
│  effective 01-04-2026. Version 1 │
│  stays readable and keeps        │
│  explaining every invoice it     │
│  produced.                       │
│                                  │
│  Documents already issued are    │
│  never recalculated.             │
│                                  │
│  [ Cancel ]  [ Create version ]  │
```

**Actions:** `[ Save profile ]` calls `upsertTaxProfile`. `EFFECTIVE_WINDOW_OVERLAP` renders inline on the effective-from field naming the profile it collides with, because exactly one profile may be effective at any instant.

**A profile is versioned, never edited.** An in-place edit would silently change the explanation for invoices already issued and reported. The sheet therefore always writes a new version with its own effective date, and the previous version stays queryable — an invoice from March can still be explained by the rule that produced it.

**The preview is part of the control, not a nicety.** Place of supply is the field that decides whether a recipient can claim input credit. Reading back a worked example for each document class, against a same-state and a different-state recipient, is the only way the author sees the consequence before a customer does.

### SPT-24 TDS register

Statutory withholding is off until somebody qualified says it applies. This screen is where that decision is recorded, and where the evidence chain from deduction to certificate is worked.

**Data**

| Shown | Source |
| ----- | ------ |
| Disabled banner / live rates | `FS query TdsConfigurations` — current effective version |
| Register totals / driver rows / uncovered | `Fn getTdsRegister` |
| No-PAN list | same Function, `panProvided == false` |
| Configure / challan sheets | `local` until Save / Record |

| Control | On click |
| ------- | -------- |
| Configure withholding · Save · Enable | `Fn upsertTdsConfiguration` |
| View (no PAN) | `local` filter of `getTdsRegister` |
| Record challan · Record | `Fn recordTdsChallan` |
| Issue certificates | `Fn issueTdsCertificate` |
| Export register | `Fn exportFinanceReport` `reportType: "tds_register"` |

```
┌──────────────────────────────────┐
│  ←  TDS                   [👤]    │
├──────────────────────────────────┤
│  ⚠ Withholding is disabled       │
│                                  │
│  No tax is deducted from any     │
│  payout. Whether this platform   │
│  must deduct depends on the      │
│  driver contracting model and    │
│  is a determination for your     │
│  tax adviser.                    │
│                                  │
│  [ Configure withholding ]       │
└──────────────────────────────────┘
```

**Enabled**

**Data** — inherit `SPT-24`. Same `Fn getTdsRegister`.

```
┌──────────────────────────────────┐
│  ←  TDS  FY 2026-27  Q2   [👤]    │
├──────────────────────────────────┤
│  Section 194C · 1% with PAN      │
│  Effective 01-07-2026            │
├──────────────────────────────────┤
│  Withheld        ₹1,42,800       │
│  Deposited       ₹1,08,400       │
│  Uncovered         ₹34,400  ⚠    │
│  Certificates issued   0 of 214  │
│                                  │
│  ⚠ 6 drivers have no PAN         │
│    [ View ]                      │
├──────────────────────────────────┤
│  [ Record challan ]              │
│  [ Issue certificates ]          │
│  [ Export register ]             │
├──────────────────────────────────┤
│  ┌────────────────────────────┐  │
│  │ Ravi Teja      ABCPT…4F    │  │
│  │ Gross ₹18,400 · TDS ₹184   │  │
│  │ deposited · CH 0042719     │  │
│  └────────────────────────────┘  │
│  ┌────────────────────────────┐  │
│  │ Suresh B       no PAN  ⚠   │  │
│  │ Gross ₹12,100 · TDS ₹2,420 │  │
│  │ accrued · 20% rate applied │  │
│  └────────────────────────────┘  │
└──────────────────────────────────┘
```

**Configure withholding sheet**

**Data** — inherit `SPT-24`. Fields are `local` until Save (`Fn upsertTdsConfiguration`).

```
┌──────────────────────────────────┐
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│  Withholding                [ X ]│
├──────────────────────────────────┤
│  Enabled            ( ) yes      │
│  Section       [ 194C        ▾]  │
│  Deductor TAN  [ HYDL12345E  ]   │
│                                  │
│  Rate with PAN     [ 1     ] %   │
│  Rate without PAN  [ 20    ] %   │
│  Single payment  ₹ [ 30000  ]    │
│  Annual          ₹ [ 100000 ]    │
│                                  │
│  On crossing the annual          │
│  threshold, withhold on          │
│  earlier payouts too   ( ) yes   │
│  Block payout without PAN ( ) no │
│                                  │
│  Adviser confirmation (required) │
│  Confirmed by [ CA R. Menon   ]  │
│  Reference    [ ADV-2026-114  ]  │
│                                  │
│  Effective from [ 01-07-2026 ]   │
│  Reason (required)               │
│  ┌────────────────────────────┐  │
│  └────────────────────────────┘  │
│                                  │
│  [  Save  ]                      │
└──────────────────────────────────┘
```

**Impact confirmation**

**Data** — inherit `SPT-24`. Enable is `Fn upsertTdsConfiguration`.

```
│  Before you enable               │
│                                  │
│  214 drivers above the annual    │
│  threshold                       │
│  6 drivers with no PAN — they    │
│  will be deducted at 20%         │
│  Estimated ₹47,600 withheld      │
│  each month                      │
│                                  │
│  Every affected driver is        │
│  notified with the effective     │
│  date. Their next payout will    │
│  be smaller.                     │
│                                  │
│  [ Cancel ]  [ Enable from 01-07]│
```

**Record challan sheet**

**Data** — inherit `SPT-24`. Record is `Fn recordTdsChallan`.

```
┌──────────────────────────────────┐
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│  Record challan             [ X ]│
├──────────────────────────────────┤
│  Challan no  [ 0042719        ]  │
│  BSR code    [ 0510308        ]  │
│  Deposit date[ 07-10-2026     ]  │
│  Quarter     [ Q2 FY 2026-27 ▾]  │
│  Amount    ₹ [ 108400         ]  │
│                                  │
│  Covers 178 accrued deductions   │
│  totalling ₹1,08,400  ✔ ties     │
│                                  │
│  Evidence  [ Attach stamped   ]  │
│            [ challan          ]  │
│                                  │
│  [  Record  ]                    │
└──────────────────────────────────┘
```

**Actions:** `[ Configure withholding ]` calls `upsertTdsConfiguration`, refused with `ADVISER_CONFIRMATION_REQUIRED` when enabling without a TAN and a named confirmation. `[ Record challan ]` calls `recordTdsChallan` and is refused with `INVALID_AMOUNT` when the entered total does not equal the deductions it names. `[ Issue certificates ]` calls `issueTdsCertificate` per driver for the quarter and requires the return acknowledgement number. `[ Export register ]` calls `exportFinanceReport` with `reportType: "tds_register"`.

**The disabled state is the default and says why.** A finance operator opening this screen for the first time is told that no tax is being deducted and that the question is not the product's to answer. Presenting a rate field with a plausible default pre-filled would invite somebody to switch on statutory withholding because the form looked like it wanted a number.

**Uncovered withholding is called out as a liability.** Money deducted from a driver and not yet deposited is somebody else's money the platform is holding. It appears here, in the period close pack, and in the `taxes_withheld` tie-out, in the same figure each time.

**A challan that does not tie is refused rather than stored.** The screen shows the computed sum of the selected deductions beside the entered amount, and the save is disabled while they differ. A challan recorded as an approximation makes the whole register unprovable.

---

## Layout

### SPT-18 Responsive desktop layout

The 360px column stays canonical: every screen above must function in it, because Support does occasionally work from a phone. But authoring a dial-code regex or a seven-criterion eligibility rule on a phone is a mistake waiting to happen, so from 1024px the console reflows.

**Data** — same Shown / Control rows as the screen hosted in the shell (`SPT-01`–`SPT-17`, `SPT-19`–`SPT-24`). Layout reflow only; sources do not change.

| Shown | Source |
| ----- | ------ |
| Left-rail identity | `FS get /UserProfiles/{uid}` |
| List column / detail pane | the hosted screen's Data |

| Control | On click |
| ------- | -------- |
| Rail Ops / Users / Config / Search | `nav SPT-01` / `SPT-02` / `SPT-05` / `SPT-15` |
| List row | `local` select — detail uses that screen's gets, no extra query |

**Breakpoints**


| Range            | Layout                                                                  |
| ---------------- | ----------------------------------------------------------------------- |
| 360 to 767 px    | Single column, bottom tab bar, bottom sheets. As drawn above.            |
| 768 to 1023 px   | Single column at 720px max width, centred. Tabs move to a left rail.     |
| 1024 px and up   | Left rail plus list plus detail. Bottom sheets become right-side panels. |

**Desktop shell at 1440px**

```
┌────────┬─────────────────────┬───────────────────────────────┐
│ LOGIK  │  Users              │  Anil Kumar · merchant        │
│        │  🔍 anil            │  u_8Kd2xQ91mZ                  │
│ ▸ Ops  │  ─────────────────  │  ───────────────────────────  │
│ ▪ Users│  Anil Kumar         │  +91 98765 43210              │
│ ▸ Config│ merchant · Karavadi│  anil.k@example.com           │
│ ▸ Search│ ✔ approved        │  Joined 02-02-2026             │
│        │  ─────────────────  │                               │
│        │  Anil Reddy         │  Placement                    │
│ ──────  │ buyer · Koppolu    │  Karavadi · Prakasam Central  │
│ Priya   │ ✔ approved         │  Supplier Kranthi Kumar       │
│ support │  ─────────────────  │                              │
│         │ Anilkumar M        │  Credit ₹17,098 / ₹50,000     │
│ [ 👤 ]  │ driver · Podili    │                                │
│         │ ✖ suspended        │  [ Orders ] [ Audit ]         │
│         │                    │  [ Suspend account ]          │
└────────┴─────────────────────┴───────────────────────────────┘
```

**Rules**

- The left rail replaces the bottom tab bar above 768px. Tab identity and order are unchanged.
- List and detail are independently scrollable. Selecting a list row updates the detail pane without a navigation push, so browser back exits the section rather than stepping through every row inspected.
- Every bottom sheet becomes a 420px right panel with the same fields in the same order. No sheet gains or loses a field between breakpoints.
- Tables are allowed above 1024px for Subscriptions, Redemptions, Suspended orders, the Audit log and the cash custody breakdowns by supplier and by driver, and each collapses to the card list below it. Column order matches card reading order. The custody queues themselves stay list plus detail rather than becoming tables, because a claim is worked one at a time against two ledgers and a row of a table is not enough surface to decide money on.
- Data-dense authoring screens — the country regex, plan limits, tariff windows and offer eligibility — open as a full-width form above 1024px rather than a panel, since they exceed a comfortable panel height.
- Keyboard support above 1024px: `/` focuses search, `j` and `k` move the list selection, `Enter` opens, `Esc` closes the panel. Every one of these has a visible control as well; nothing is keyboard-only.
- Touch targets stay at 48px at every breakpoint. Desktop does not license smaller controls, because the same build runs on tablets.

---

## End-to-end flows

### Support configuration enablement

```
Config → Country + dial prefix (tested) → State
  → District → Hub bound to district
  → Village with LGD code and coordinates
  → Plan → Tariff → Offer + eligibility → Discount code
  → Users + → Create supplier
  → Supplier detail → Assign subscription (optional code)
```

### Triaging a suspended order

```
Ops → Suspended orders → pick the order
  → cause is merchant disassociated
  → Reassign shop in the same village
     or Cancel and refund (cancelOrder + refundOrder)
  → buyer notified → queue clears
```

### Reviewing a village request

```
Ops → Village requests → verify LGD code and pincode
  → Add it → Village editor prefilled
  → set coordinates → upsertVillage
  → supplier notified → village available to gigs
```

### Restoring a locked-out user

```
Search or Users → filter unauthorized
  → User detail → read the reason
  → Restore access → status approved
  → audit entry written → user can log in
```
