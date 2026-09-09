# Patterns

Cross-screen behaviour that is drawn once here instead of repeated in every role file: the state matrix every screen must satisfy, the **Data** contract (Firestore reads vs Function clicks), global error pages, the error-code to UI mapping, the offline queue, the AI assistant pattern, and the GST tax invoice.

Foundations: [Foundations.md](Foundations.md) · IA and screen IDs: [Navigation.md](Navigation.md) · Shared states, errors, AI and invoice: [Patterns.md](Patterns.md)

Roles: [Shared](Shared.md) · [Buyer](Buyer.md) · [Merchant](Merchant.md) · [Driver](Driver.md) · [Supplier](Supplier.md) · [Support](Support.md)

---

## 1. The state matrix

A screen is not done when its happy path is drawn. Every screen must answer all seven states below. Role files draw only the variants that carry screen-specific copy or layout; everything else falls back to the defaults defined here.

| State | Trigger | Default treatment |
| ----- | ------- | ----------------- |
| **Loading** | First read, no cache | Skeleton in the shape of the real content. Never a centred spinner on a list screen. |
| **Empty** | Query succeeded, zero results | Icon, one line naming the cause, one line naming the remedy, one primary action. |
| **Error** | Read failed, or a write returned a business error | Inline where the cause is a field, banner where the cause is the screen, sheet where the user must choose. Always retryable. |
| **Offline** | `navigator.onLine === false` or a read served from cache past its TTL | Persistent `⚠ Offline: data may be outdated` banner. Content stays visible and readable. Writes queue. |
| **Queued** | A mutation was made offline and is waiting to replay | `(n)🔄` counter in the header plus a per-row `queued` chip. Tapping the counter opens `SHR-12`. |
| **Disabled** | Action is unavailable in the current state | Control stays visible, dimmed, and states why in adjacent text. Never a silently dead button. |
| **Stale** | Cached volatile data older than its 10-minute TTL | `[cached]` chip on the affected card plus the offline banner if the network is down. |

Two extra states apply to specific screens: **permission denied** (the caller's role or ownership does not allow the read — shown as the `SHR-05`-style explanation, not an empty list) and **partial** (a list loaded but one section failed — that section shows an inline retry while the rest stays usable).

---

## 1A. Screen data contract

A screen is not implementable from the ASCII alone. Every screen in a role file carries a **Data** block with two tables. [Navigation.md](Navigation.md) lists which Functions exist on a screen; the Data block says **which control fires them** and **which Firestore documents paint the pixels**. A screen without a Data block is unfinished.

| Column | What it names |
| ------ | ------------- |
| **Shown → Source** | Every distinct piece of content on the canvas. Source is `FS get`, `FS query`, `FS listen` (only when the value must move while the screen is open), `Fn`, `Auth`, `local`, or `cache`. Paths use the document shapes in `constitution/Logikchain_Data_Structures.md`. |
| **Control → On click** | Every tappable control including chips, cards, steppers, and pull-to-refresh. On click is `Fn {operationId}`, `FS write` (only where Foundations already allow a direct supplier/Support write), `local`, `nav {ID}`, `tel:`, or `—` (display-only). |

**Rules the tables must honour**

1. **Reads are Firestore. Mutations are Functions** — same split as `constitution/Logikchain_Architecture.md` §6. A button that changes `Order`, `Gig`, stock, cash, credit, or a payout calls a Function named in the API spec. It does not `set()` that document.
2. **Header chrome is not repeated.** Voice `🔊`, bell `🔔`, and avatar `👤` are specified once below. A role screen only lists them if that screen's job *is* that chrome (`SHR-08`, `SHR-07`, `SHR-11`).
3. **Variants inherit.** `BUY-04.1` / `BUY-04.2` reuse `BUY-04` Data and add only the rows that differ. Empty and offline are states, not extra queries.
4. **Listeners are rationed.** Foundations cap Firestore listeners at two per screen, unbound on unmount. Default is one-shot `get` / `query`. `listen` is reserved for values that change while the user is looking (gig progress, in-custody cash, a payment that is still `pending`). Catalogues, pamphlets, and product detail are one-shot plus the TTL in section 4.
5. **Local is not a Function.** Cart lines, draft forms, stepper qty, and radio choice are `local` until a named Function or allowed `FS write` commits them.
6. **Pull-to-refresh** re-runs that screen's Shown reads and bypasses TTL. It is not a new endpoint.

**Header chrome (every authenticated screen)**

| Shown | Source |
| ----- | ------ |
| Voice `🔊` | `local` (speech synthesis of the current canvas) |
| Bell badge | `FS query` `/Notifications` where `userId == uid` and `read != true`, count only |
| Avatar | `nav SHR-07` |

| Control | On click |
| ------- | -------- |
| Voice | `local` — read the screen aloud |
| Bell | `nav SHR-08` |
| Avatar | `nav SHR-07` |

**Source abbreviations**

| Prefix | Meaning |
| ------ | ------- |
| `FS get /Collection/{id}` | One document. Cache-first; volatile collections use the 10-minute TTL. |
| `FS query Collection where …` | Indexed list. The `where` must be a query Firestore can run — do not invent a client-side scan of the whole collection as the happy path. |
| `FS listen /Collection/{id}` | Snapshot while the view is mounted. Unbind on unmount. |
| `Fn operationId` | Firebase Function in `constitution/Logikchain_API_Specifications.md`. Same handler as `METHOD /v1/…`. |
| `FS write /Collection/{id}` | Direct document write the security rules already allow (supplier-owned `Products` / `Pamphlets` / `Routes` / `Discounts`; never `Product.stock`). |
| `Auth` | Firebase Auth (OTP, session, claims). |
| `local` | Device state (IndexedDB / Room / memory). Not a server write. |

A buyer home that listed "Firestore `Gigs`" without a `where` would invite a collection scan. `composeGig` therefore writes `Gig.villageIds: string[]` (copy of `villages[].villageId`) so `BUY-04` can query `villageIds` array-contains the buyer's `villageId`.

**Loading skeleton**

```
┌──────────────────────────────────┐
│  Orders            🔊  🔔  [👤]     │
├──────────────────────────────────┤
│  ┌────────────────────────────┐  │
│  │ ▓▓▓▓▓▓▓▓▓▓▓▓               │  │
│  │ ▓▓▓▓▓▓▓▓                   │  │
│  │ ▓▓▓▓▓▓  ▓▓▓▓▓▓             │  │
│  └────────────────────────────┘  │
│  ┌────────────────────────────┐  │
│  │ ▓▓▓▓▓▓▓▓▓▓                 │  │
│  │ ▓▓▓▓▓▓                     │  │
│  └────────────────────────────┘  │
└──────────────────────────────────┘
```

Skeletons show at most three placeholder rows and appear only after 300ms, so a fast cache hit does not flash. Pull-to-refresh on an already-populated list shows the refresh spinner, not skeletons.

**Empty state**

```
┌──────────────────────────────────┐
│                                  │
│             [ 🚚 ]                │
│                                  │
│     No gigs for Karavadi yet     │
│   Ask your supplier for the      │
│   next delivery day.             │
│                                  │
│      [ Pull to refresh ]         │
│      [ 📞 Call supplier ]         │
│                                  │
└──────────────────────────────────┘
```

An empty state never blames the user and never dead-ends: it always offers either a retry or a way to reach a human.

**Inline field error**

```
│  Amount   [ 250000            ]  │
│  ⚠ Above your supplier's cap of  │
│    ₹1,00,000                     │
```

**Screen-level error banner**

```
│  ⚠ Could not load orders         │
│    [ Retry ]                     │
```

**Queued write**

```
┌──────────────────────────────────┐
│  Tracking      (2)🔄  🔔  [👤]      │
├──────────────────────────────────┤
│  ⚠ Offline — 2 updates waiting   │
├──────────────────────────────────┤
│  ┌────────────────────────────┐  │
│  │ Anil INV-2408210001        │  │
│  │ ✔ Delivered · queued       │  │
│  │ Photo saved on device      │  │
│  └────────────────────────────┘  │
└──────────────────────────────────┘
```

A queued action reads as done to the user, because from their point of view it is. The chip explains that the server has not confirmed it yet. Queued rows are not editable a second time.

**Disabled action**

```
│  [ End gig ]  (disabled)         │
│  2 orders still undelivered      │
```

---

## 2. Global error pages

Full-screen states that replace the page body. All of them keep the header so the user can still reach Profile and Help.

**Not found** — the record is gone, or the ID in a deep link is wrong.

```
┌──────────────────────────────────┐
│  ←  Not found                    │
├──────────────────────────────────┤
│                                  │
│             [ ? ]                │
│                                  │
│    We could not find this        │
│    order.                        │
│    It may have been cancelled.   │
│                                  │
│      [ Go to Orders ]            │
│      [ 📞 Contact support ]       │
└──────────────────────────────────┘
```

**Not allowed** — `PERMISSION_DENIED` on a read, or a route that does not belong to the caller's role.

```
┌──────────────────────────────────┐
│  ←  Not available                │
├──────────────────────────────────┤
│             [ 🔒 ]                │
│                                  │
│    This screen is not part of    │
│    your role.                    │
│                                  │
│      [ Go to Home ]              │
└──────────────────────────────────┘
```

**Something went wrong** — an unexpected server error. Shows a copyable reference so support can find the log line.

```
┌──────────────────────────────────┐
│  Something went wrong            │
├──────────────────────────────────┤
│             [ ! ]                │
│                                  │
│    We could not complete that.   │
│    Nothing was charged.          │
│                                  │
│    Reference  8f21-4c            │
│                                  │
│      [ Try again ]               │
│      [ 📞 Contact support ]       │
└──────────────────────────────────┘
```

**No connection, nothing cached** — the only hard offline block. If any cache exists, the app shows it with the offline banner instead of this page.

```
┌──────────────────────────────────┐
│             [ 📵 ]                │
│                                  │
│    You are offline and this      │
│    screen has nothing saved.     │
│                                  │
│    Anything you do offline is    │
│    saved and sent later.         │
│                                  │
│      [ Try again ]               │
│      [ Open saved data ]         │
└──────────────────────────────────┘
```

**Timeout** — the 15-second Cloud Function ceiling. Shown as a sheet over the current screen so the user's input is not lost.

```
┌──────────────────────────────────┐
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│  Taking too long                 │
│  The network did not answer in   │
│  15 seconds. Your details are    │
│  still here.                     │
│  [ Cancel ]      [ Retry ]       │
└──────────────────────────────────┘
```

**Session expired** (`SHR-01.1`) and **update available** (`SHR-13.3`) are dialogs rather than pages, because both must be answered before anything else happens.

```
┌──────────────────────────────────┐
│  Signed out                      │
│  Your session ended. Sign in to  │
│  continue where you left off.    │
│  [ Sign in ]                     │
└──────────────────────────────────┘

┌──────────────────────────────────┐
│  New version ready               │
│  Reload to update. Your cart and │
│  saved work are kept.            │
│  [ Later ]        [ Reload ]     │
└──────────────────────────────────┘
```

---

## 3. Error code to UI mapping

Cloud Function error codes from `constitution/Logikchain_API_Specifications.md`, and how each one surfaces. A code never reaches the user as a code; the reference string is only exposed on the unexpected-error page.

| Code | Surface | Copy pattern |
| ---- | ------- | ------------ |
| `PERMISSION_DENIED` | Not-allowed page, or toast if it happened on a write from a stale screen | "This screen is not part of your role." |
| `NOT_FOUND` | Not-found page for reads, toast plus list refresh for writes | "We could not find this order." |
| `INVALID_ARGUMENT` | Inline on the offending field | Names the field and the rule it broke |
| `INVALID_STATE` | Sheet or banner explaining the missing precondition | "Add your GSTIN before you can invoice." |
| `INVALID_PHONE` | Inline under the phone field | "This is not a valid India (+91) number. Enter 10 digits." |
| `ALREADY_EXISTS` | Inline on the unique field | "That ISO code is already used by another country." |
| `IN_USE` | Blocking sheet listing dependents | "Blocked: 1 state, 1 hub in use." |
| `OUT_OF_STOCK` | Stock reconciliation sheet (`BUY-07.2`) | Per-line "you wanted 3, only 1 left" |
| `NOT_SERVICEABLE` | Return to pamphlet (`BUY-05.1`) or home empty state | "This item is not on today's run through your village." |
| `INVALID_DISCOUNT` | Inline under the discount field | "This code is not valid for this order." |
| `INSUFFICIENT_CREDIT` | Insufficient-credit sheet with the two ways out | "Need ₹17,228 · have ₹5,000" |
| `INSUFFICIENT_DUES` | Inline on the payout amount | "You can withdraw up to ₹3,200." |
| `INVALID_AMOUNT` | Inline on the amount field | "Enter an amount above zero." |
| `DUPLICATE_PENDING_REQUEST` | Toast plus a link to the pending request | "You already have a request waiting." |
| `ORDER_UNALTERABLE` | Toast, then the action is removed from the screen | "This order has already been delivered." |
| `PENDING_DELIVERIES` | Blocking sheet listing the undelivered orders (`DRV-06`) | "2 orders still undelivered." |
| `INVALID_GIG_STATE` | Banner on the gig screen, action removed | "This gig has already started." |
| `INVALID_INDEX` | Silent client correction plus a re-sync | — |
| `DRIVER_NOT_AVAILABLE` | Inline on the vehicle picker | "This driver is not approved." |
| `PLAN_LIMIT_EXCEEDED` | Plan-limit sheet with `[ View plans ]` | "Plan limit reached. Upgrade or wait for the next cycle." |
| `SUBSCRIPTION_REQUIRED` | Banner on every write screen, redirect to subscription | "Subscribe to create gigs." |
| `INVALID_DATE_RANGE` | Inline on the date fields | "Choose an end date after the start date." |
| `INVALID_SIGNATURE` | Payment-failed sheet | "Payment could not be verified. Nothing was charged." |
| `TRANSACTION_FAILED` | Payment-failed sheet with retry and alternate method | "₹1,550 was not charged." |
| `ALREADY_COMPLETED` | Toast, screen refreshes to the completed state | "This gig is already finished." |
| `CODE_INVALID` | Inline under the code field, attempts remaining stated | "Wrong code. 3 tries left." |
| `CODE_EXPIRED` | Banner on the verification sheet with `[ Send again ]` | "This code has expired. Send a new one." |
| `CODE_REPLAYED` | Failed-sync card in `SHR-12`, transfer marked disputed | "This code was already used. Handover not confirmed." |
| `CODE_ATTEMPTS_EXCEEDED` | Code field removed, alternative proof methods promoted | "Too many tries. Use a photo or ask your supplier." |
| `RESEND_LIMIT_EXCEEDED` | Disabled `[ Send again ]` with the countdown | "You can send again after 11:20 AM." |
| `FALLBACK_NOT_AUTHORIZED` | Sheet offering `[ Ask supplier ]` | "Your supplier must approve skipping the code." |
| `FALLBACK_EXPIRED` | Same sheet, re-request instead of retry | "That approval has expired. Ask again." |
| `VERIFICATION_REQUIRED` | Blocking sheet listing the unconfirmed handovers | "1 handover is not confirmed yet." |
| `CUSTODY_TRANSFER_EXPIRED` | Toast, the collection sheet resets to the amount step | "This took too long. Start the collection again." |
| `SETTLEMENT_ALREADY_CONFIRMED` | Toast, screen refreshes to the receipt | "Your supplier has already confirmed this." |
| `CASH_IN_CUSTODY_OUTSTANDING` | Blocking sheet with `[ Hand over cash ]` | "Hand over ₹8,450 to your supplier first." |
| `AMOUNT_MISMATCH` | Inline on the amount field, expected figure shown | "This should be ₹1,550.52." |
| `IDEMPOTENCY_CONFLICT` | Silent client de-duplication plus a re-sync | — |
| `LEDGER_IMBALANCE` | Blocking sheet routed to support | "The amounts do not add up. Support has been told." |
| `DUPLICATE_WEBHOOK_EVENT` | Never surfaced; the server treats it as a no-op | — |
| `BENEFICIARY_UNVERIFIED` | Inline on the payout amount, with a jump to the destination screen | "We have not confirmed this account yet." |
| `BENEFICIARY_COOLING_PERIOD` | Inline, stating the exact time it clears; the request is still allowed | "Payouts to this account start after 6:40 PM tomorrow." |
| `BENEFICIARY_NAME_MISMATCH` | Inline on the registration form, showing the name the bank returned | "This account belongs to R KUMAR." |
| `BENEFICIARY_BLOCKED` | Blocking sheet with `[ 📞 Call support ]` | "Payouts to this account are stopped." |
| `PAYOUT_IN_FLIGHT` | Inline on the destination screen | "A payout is on its way. Change this once it lands." |
| `APPROVER_IS_REQUESTER` | Blocking sheet on the approver's screen | "This was raised by you. Someone else has to approve it." |
| `BENEFICIARY_ACKNOWLEDGEMENT_MISMATCH` | Blocking sheet, approval aborted | "The account changed while you were reviewing. Open it again." |
| `UTR_REQUIRED` | Inline on the manual settlement form | "Enter the bank reference before marking this paid." |
| `UTR_MISMATCH` | Inline on the verification form; the expected value is never shown | "That reference does not match. Check the bank statement." |
| `PAYOUT_REQUEST_OPEN` | Send disabled, with a jump to the open request | "You already have a payout waiting." |
| `REFUND_EXCEEDS_PAYMENT` | Inline on the refund amount, with the refundable balance | "Only ₹640 of this payment is left to refund." |
| `REFUND_APPROVAL_REQUIRED` | Stated on submit; the cancellation still succeeds | "This needs a second check. We've started it." |
| `PERIOD_CLOSED` | Blocking sheet on any back-dated financial write | "This period is closed. Raise it in the current period." |
| `RECONCILIATION_EXCEPTION_OPEN` | Close button disabled with the breaks listed | "Clear the 11 breaks first." |
| `PLAN_FEATURE_REQUIRED` | Locked-feature sheet naming the capability, the plan and the price | "Reconciliation is in Enterprise. ₹4,823 now." |
| `ENTITLEMENT_LIMIT_EXCEEDED` | Inline on the export or schedule action | "10 of 10 exports used. Next one on 1 Sep." |
| `DEADLINE_EXCEEDED` / no response in 15s | Timeout sheet | "Taking too long." |

**Three copy rules apply to every money error above.**

A message states what happened to the money before it states what to do. "₹1,550 was not charged" comes before the retry button, and "your ₹1,500 is back in your dues" comes before the offer to try again. A user reading a payment error is asking one question, and it is not what the next step is.

A message never blames the user for a rail's decision. "The bank sent it back — the account number looks wrong" is actionable; "invalid beneficiary" is an accusation in a language the user did not choose.

A refusal names the specific blocker and the specific way past it. `PLAN_FEATURE_REQUIRED` names the capability, the plan and the price rather than saying the feature is unavailable, and `BENEFICIARY_COOLING_PERIOD` names the hour rather than saying "please try later".

**Locked finance capability** — the one sheet every `PLAN_FEATURE_REQUIRED` opens, in Supplier and Merchant alike. It is reached from the locked control itself, never after a form has been filled in.

```
┌──────────────────────────────────┐
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│  Reconciliation workspace   [ X ]│
│                                  │
│  Match your payments against     │
│  the gateway and your bank,      │
│  and work the differences.       │
│                                  │
│  You're on Growth.               │
│  This is in Enterprise.          │
│                                  │
│  Enterprise         ₹9,999 / mo  │
│  Unused Growth        −₹1,999    │
│  For 10 days           ₹4,088    │
│  GST 18%                 ₹736    │
│  Pay now               ₹4,823    │
│  Then ₹11,799 from 01-09-2026    │
│                                  │
│  Opens as soon as the payment    │
│  clears.                         │
│                                  │
│  [ See all plans ]               │
│  [  Upgrade and pay ₹4,823  ]    │
└──────────────────────────────────┘
```

The figures come from `previewPlanChange`, not from the sheet. Every locked finance control routes here: the capability in plain words, the current plan, the cheapest plan that carries it, the price with GST, the proration, the effective moment, and one button that starts the payment. Letting a user fill in a date range and a grouping and a format before telling them the report is not on their plan is the failure this pattern exists to prevent — the refusal arrives after the work, and it reads as a bait.

A locked control is drawn `🔒` and stays tappable. Hiding it entirely means a supplier never learns the capability exists; greying it out with no route means they learn it exists and cannot act on it.

**Destructive confirmation** — required before cancel, suspend, disassociate, delete, deactivate, and logout. The sheet restates the object and the consequence, and the destructive verb is the button label, never "OK".

```
┌──────────────────────────────────┐
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│  Suspend this gig?               │
│                                  │
│  Ongole → Markapur · 21-08       │
│  Reason [ Vehicle breakdown   ]  │
│                                  │
│  4 buyer orders and 1 bulk order │
│  will be marked suspended. You   │
│  can reassign a driver after.    │
│                                  │
│  [ Cancel ]      [ Suspend gig ] │
└──────────────────────────────────┘
```

**Toast with undo** — for reversible client-side actions only (removing a cart line, dismissing a card). Server mutations use a confirm sheet up front instead, because a 4-second window is not a safety net on a 2G connection.

```
│  Removed Rice 25kg      [ Undo ] │
```

---

## 4. Offline and sync

Rural coverage is assumed to fail. The rules:

| Action class | Offline behaviour |
| ------------ | ----------------- |
| Reads | Served from the Firestore cache. Volatile data past its 10-minute TTL is shown with `[cached]` plus the offline banner. |
| Profile-shaped writes | Queued as Firestore writes, last-write-wins on reconnect. |
| Delivery proof | Photo stored on device, the `markOrderDelivered` call queued with the original `capturedAt` so the physical delivery time survives. |
| Gig location updates | Queued in order; replayed in sequence so `arriving → reached → left` cannot arrive scrambled. |
| Cart edits | Local only until checkout. |
| Custody handover — `markOrderDelivered`, `updateMerchantOrderStatus`, `confirmCreditRepayment`, `declareCashHandover`, `confirmCashSettlement` | **Queued, but only against strong offline proof.** The verification sheet drops the live-OTP option and offers the counterparty's offline code batch instead. Each queued call carries a client `idempotencyKey` and the device `capturedAt`, so a replay is de-duplicated and the physical time survives. This is the one class of money movement that queues, because a driver standing in a village with no signal still has to be able to take cash and be held to it. |
| Money movement over a gateway — `placeOrder` online, `createPaymentIntent`, `processPayment`, `refundOrder`, `requestPayout`, `reviewPayoutRequest`, `registerPayoutBeneficiary`, `retryPayout`, `verifyManualPayout`, `issueCreditNote`, `subscribeToPlan`, `changeSubscriptionPlan` | **Blocked offline.** The action is disabled with "Needs an internet connection", because a queued payment is worse than a refused one. A payout approval queued for four hours is an approval against a balance that has since changed, given by an approver who cannot see the destination's current verification state. |
| Reconciliation and period close — `runReconciliation`, `resolveReconciliationException`, `closeAccountingPeriod` | **Blocked offline**, and the reason is stated rather than the button merely dimmed. These read across three sources; a cached view of one of them is not evidence. |
| Finance reports and exports | Reads serve from cache behind the `[cached]` marker with the run timestamp shown. Exports are blocked, since a signed download URL cannot be minted offline. |
| Cash-on-pickup `placeOrder` | Blocked offline like the online path: an order needs a server-priced total and a server-issued pickup code before anyone hands anything over. |
| Configuration writes (Support) | Blocked offline for the same reason: uniqueness and referential integrity can only be judged server-side. |

**Offline and sync centre (`SHR-12`)**

```
┌──────────────────────────────────┐
│  ←  Saved and waiting            │
├──────────────────────────────────┤
│  ⚠ Offline since 10:42 AM        │
├──────────────────────────────────┤
│  Waiting to send (2)             │
│  ┌────────────────────────────┐  │
│  │ Delivered · INV-2408210001 │  │
│  │ Photo · saved 10:44 AM     │  │
│  │                  [ Retry ] │  │
│  └────────────────────────────┘  │
│  ┌────────────────────────────┐  │
│  │ Reached · Karavadi         │  │
│  │ saved 10:43 AM             │  │
│  └────────────────────────────┘  │
│                                  │
│  Failed (1)                      │
│  ┌────────────────────────────┐  │
│  │ Photo upload failed        │  │
│  │ Order already delivered    │  │
│  │        [ Discard ] [ View ]│  │
│  └────────────────────────────┘  │
│                                  │
│  [ Try all again ]               │
└──────────────────────────────────┘
```

Uploads retry with exponential backoff. A queued call that fails permanently — because the server state moved on — surfaces here with the reason and a discard action, never silently disappears.

A queued **custody handover** that fails on sync is the one failure that cannot be discarded, because money changed hands in the physical world whatever the server thinks. It surfaces with the amount, the counterparty, and a single mandatory action.

```
│  Failed (1)                      │
│  ┌────────────────────────────┐  │
│  │ ⚠ Handover not confirmed   │  │
│  │ Sri Lakshmi Stores         │  │
│  │ ₹4,000 cash · 10:44 AM     │  │
│  │ Code already used          │  │
│  │      [ Report to support ] │  │
│  └────────────────────────────┘  │
```

Reporting opens `raiseCashDiscrepancy` with the amount and counterparty pre-filled. Until it is reported the row stays at the top of the queue and the driver's `[ Hand over cash ]` action is disabled with the reason, so an unconfirmed collection cannot be quietly rolled into a settlement.

---

## 5. AI assistant pattern

Five buttons in the wireframes hand a natural-language instruction to Gemini and then mutate live business data:

| Entry | Screen | Mutates |
| ----- | ------ | ------- |
| AI: update inventory | `SUP-14` from `SUP-06` | `Product.price`, `Product.stock` |
| AI: create discount | `SUP-14` from `SUP-06.2` | `Discount` |
| AI: update pamphlet | `SUP-14` from `SUP-08` | `Pamphlet.promotedProducts` |
| AI: update route | `SUP-14` from `SUP-07`, `SPT-04.2` | `Route.villages` |
| AI: add villages to hub | `SPT-02.2` | `Hub.villages`, `Village` |

Every one of them follows the same four steps. The model never writes anything; it proposes, the user applies.

**Step 1 — Prompt.** Opens as a sheet from the screen whose data it will change, with examples in the user's own domain language and a voice input option.

```
┌──────────────────────────────────┐
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│  AI: update inventory     [ X ]  │
│                                  │
│  Tell me what changed.           │
│  ┌────────────────────────────┐  │
│  │ Rice 25kg is now 1,180 and │  │
│  │ we got 30 more bags. Oil   │  │
│  │ 1L is out of stock.        │  │
│  └────────────────────────────┘  │
│                      [ 🎤 Speak ] │
│                                  │
│  Try: "drop all dal prices by 5%"│
│  Try: "add 20 bags of Rice 25kg" │
│                                  │
│  Only your own products change.  │
│                                  │
│  [ Cancel ]        [ Preview ]   │
└──────────────────────────────────┘
```

**Step 2 — Generating.** Cancellable, with a 15-second ceiling like every other call.

```
┌──────────────────────────────────┐
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│  Reading your request…           │
│  ▓▓▓▓▓▓▓░░░░░░░░░  4s            │
│  [ Cancel ]                      │
└──────────────────────────────────┘
```

**Step 3 — Preview the diff.** The heart of the pattern. Nothing is applied until the user has seen every field that will change, old value beside new, each line individually deselectable.

```
┌──────────────────────────────────┐
│  ←  Review 3 changes             │
├──────────────────────────────────┤
│  ┌────────────────────────────┐  │
│  │ (x) Rice 25kg              │  │
│  │     Price ₹1,250 → ₹1,180  │  │
│  │     Stock 40 → 70          │  │
│  └────────────────────────────┘  │
│  ┌────────────────────────────┐  │
│  │ (x) Cooking oil 1L         │  │
│  │     Stock 12 → 0           │  │
│  │     ⚠ Removes it from 1    │  │
│  │       live pamphlet        │  │
│  └────────────────────────────┘  │
│  ┌────────────────────────────┐  │
│  │ ( ) Toor dal 5kg           │  │
│  │     Price ₹640 → ₹610      │  │
│  │     ⚠ Not mentioned in     │  │
│  │       your request         │  │
│  └────────────────────────────┘  │
├──────────────────────────────────┤
│  3 changes · 2 selected          │
│  [ Edit prompt ]  [ Apply 2 ]    │
└──────────────────────────────────┘
```

Rules for the preview:

- Nothing is pre-selected if the assistant inferred it rather than being told. Low-confidence lines are unchecked with the reason shown.
- Side effects are named on the line that causes them — a stock drop that empties a live pamphlet, a route change that would strand a scheduled gig.
- A proposal that cannot be applied at all (unknown product, village with no coordinates, price below zero) is shown as a rejected line with the reason and no checkbox.
- The apply button counts what will change. `[ Apply 2 ]`, never `[ Confirm ]`.
- More than 20 changed lines is treated as a suspicious result: the sheet warns and requires scrolling to the end before Apply enables.

**Step 4 — Applied, with undo.** Changes are written as one batch so undo can reverse them as one batch. The undo window is generous because these are bulk edits on live pricing.

```
┌──────────────────────────────────┐
│  ✔ 2 products updated            │
│  Rice 25kg, Cooking oil 1L       │
│                                  │
│  [ Undo ]                        │
│  Undo available for 10 minutes   │
└──────────────────────────────────┘
```

**Failure and guardrails**

```
┌──────────────────────────────────┐
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│  I could not read that           │
│  I did not find "basmati" in     │
│  your inventory.                 │
│                                  │
│  [ Edit prompt ] [ Do it myself ]│
└──────────────────────────────────┘
```

- The assistant only ever proposes changes to records the caller already owns. Scope is enforced server-side, not by the prompt.
- It cannot change money that has already moved: no order, invoice, credit profile, payout, or subscription is in scope.
- It is disabled offline, with the reason stated.
- Every applied batch is written to the audit log (`SPT-16`) with the prompt, the diff, and the acting user.
- Manual entry is always available beside the AI action. The AI button is never the only way to do something.

---

## 6. GST tax invoice

The invoice is a shared component. `Order` and `MerchantOrder` both carry the full compliance field set, and `[ Invoice view / download ]` on buyer, merchant, and supplier order screens all render this same layout.

### 6.1 Field mapping

Fifteen compliance fields plus per-line HSN and UQC, all stored on the order document at placement time so a later change to a product or a profile can never rewrite history.

| Invoice element | Field |
| --------------- | ----- |
| Invoice number | `invoiceNumber` |
| Invoice date | `invoiceDate` |
| Supplier name | `supplierName` |
| Supplier address | `supplierAddress` |
| Supplier GSTIN | `supplierGstNumber` |
| Recipient name | `recipientName` |
| Recipient billing address | `recipientAddress` |
| Recipient shipping address | `recipientShippingAddress` |
| Recipient GSTIN | `recipientGstNumber` (absent for unregistered buyers) |
| Place of supply | `placeOfSupply` |
| Taxable value | `subTotal` |
| GST rate | `gstRate` |
| CGST amount | `cgstAmount` |
| SGST amount | `sgstAmount` |
| IGST amount | `igstAmount` |
| Invoice total | `totalPrice` |
| Authorised signatory | `authorizedSignatory` |
| Line description | `items[].name` |
| Line HSN | `items[].hsnCode` |
| Line UQC | `items[].unit` |
| Line quantity and rate | `items[].quantity`, `items[].price` |
| Discount | `discount.code`, `discount.discountPercent` |
| Currency | `currency` |
| Payment status | `paymentStatus` (buyer) or `paidWithCredit` (merchant) |

Amount in words and the copy label ("Original for Recipient") are derived client-side, not stored.

### 6.2 Mobile layout

At 360px a five-column tax table is unreadable, so each line item is a block. The downloadable PDF uses the conventional tabular layout; the on-screen view does not pretend to be the PDF.

```
┌──────────────────────────────────┐
│  ←  Tax invoice        [ ⬇ ] [ ⤴]│
├──────────────────────────────────┤
│  ┌────────────────────────────┐  │
│  │        TAX INVOICE         │  │
│  │   Original for Recipient   │  │
│  └────────────────────────────┘  │
│                                  │
│  INV-2408210001                  │
│  Date  21-08-2026                │
│  ✔ Paid · UPI                    │
├──────────────────────────────────┤
│  SUPPLIER                        │
│  Kranthi Kumar                   │
│  Ongole Hub Headquarters,        │
│  Ongole, Prakasam, AP 523001     │
│  GSTIN  37AAALK2341A1Z0          │
├──────────────────────────────────┤
│  RECIPIENT (BILL TO)             │
│  Anil Kumar                      │
│  Door No 3-45, Karavadi,         │
│  Prakasam, AP 523182             │
│  GSTIN  —  (unregistered)        │
│                                  │
│  SHIP TO                         │
│  Sri Lakshmi Stores, Karavadi    │
│  (pickup at merchant)            │
│                                  │
│  Place of supply  Andhra Pradesh │
│  (37)                            │
├──────────────────────────────────┤
│  ITEMS                           │
│  ┌────────────────────────────┐  │
│  │ 1  Rice 25kg               │  │
│  │    HSN 1006 · UQC bag      │  │
│  │    1 bag × ₹1,100.00       │  │
│  │    Less discount   −₹110.00│  │
│  │    Taxable        ₹990.00  │  │
│  │    CGST 9%         ₹89.10  │  │
│  │    SGST 9%         ₹89.10  │  │
│  │    Amount       ₹1,168.20  │  │
│  └────────────────────────────┘  │
│  ┌────────────────────────────┐  │
│  │ 2  Cooking oil 1L          │  │
│  │    HSN 1512 · UQC bottle   │  │
│  │    2 bottle × ₹180.00      │  │
│  │    Less discount    −₹36.00│  │
│  │    Taxable        ₹324.00  │  │
│  │    CGST 9%         ₹29.16  │  │
│  │    SGST 9%         ₹29.16  │  │
│  │    Amount         ₹382.32  │  │
│  └────────────────────────────┘  │
├──────────────────────────────────┤
│  Gross                ₹1,460.00  │
│  Discount HARVEST10    −₹146.00  │
│  Taxable value        ₹1,314.00  │
│  CGST 9%                ₹118.26  │
│  SGST 9%                ₹118.26  │
│  IGST                        —   │
│  ─────────────────────────────   │
│  TOTAL                ₹1,550.52  │
│                                  │
│  Rupees one thousand five        │
│  hundred fifty and fifty two     │
│  paise only                      │
├──────────────────────────────────┤
│  For Kranthi Kumar               │
│                                  │
│  Kranthi Kumar                   │
│  Authorised signatory            │
│                                  │
│  Computer-generated invoice.     │
├──────────────────────────────────┤
│  [ Download PDF ]   [ Share ]    │
└──────────────────────────────────┘
```

### 6.3 Rules

- **Intra-state supply** shows CGST and SGST at half the `gstRate` each and an em dash for IGST. **Inter-state supply** shows a single IGST line at the full rate and dashes for CGST and SGST. Which one appears is decided by the stored amounts, never recomputed on the client.
- **Order-level discounts are apportioned across lines** in proportion to line value and deducted before tax, so the line taxable values sum exactly to `subTotal` and the line CGST and SGST sum exactly to `cgstAmount` and `sgstAmount`.
- **The client never calculates tax.** Every figure on this screen is read from the order document written by `placeOrder` or `placeMerchantOrder`. A rendered invoice that disagrees with the stored total is a bug in the renderer.
- **`INVALID_STATE` before invoicing.** A supplier with no `gstin` cannot place orders at all, so an invoice without a supplier GSTIN cannot exist. Merchant `gstin` is optional; when absent, the recipient GSTIN line reads "— (unregistered)".
- **Status watermarks.** An unpaid order shows an amber `PAYMENT DUE` band under the title; a cancelled order shows a grey `CANCELLED` band and, when refunded, the refund reference. The line items and tax figures are never altered — a cancelled invoice is still a record.
- **Download** renders the PDF client-side from the stored fields, names it `{invoiceNumber}.pdf`, and works offline whenever the order document is cached. **Share** uses the Web Share API with a print fallback.
- **Merchant bulk invoices** use the same layout with `paidWithCredit` rendered as "Paid on credit · due {dueDate}" in the status line, and the merchant's `shopDetails` as the billing address against their `address` as the shipping address.
- **Accessibility.** The invoice is real text, never a canvas or an image, so it can be zoomed, selected, read aloud, and translated. Amounts use tabular figures and are right-aligned within their block.
- **Place of supply is stored, not inferred.** `placeOfSupplyStateCode` is written onto the order at placement from the recipient's registered state, and `supplyType` records whether the platform treated it as intra-state or inter-state. Deriving the state code at render time from whatever address the profile holds today would silently restate the tax on an invoice issued months ago, which is the one thing an invoice must never do.
- **The buyer's own invoice is never entitlement-gated.** A recipient can always open, download and share the tax invoice and credit note for their own transactions, on any plan and after cancellation. These are statutory documents belonging to the recipient; the platform holds them, it does not own them.

### 6.4 Credit note

An issued invoice is never edited, reissued, or deleted. Every correction — a cancellation, a partial refund, a price or tax error, goods returned — is a separate credit note referencing the original, drawn from a gapless per-financial-year series.

```
┌──────────────────────────────────┐
│  ←  Credit note        [ ⬇ ] [ ⤴]│
├──────────────────────────────────┤
│  ┌────────────────────────────┐  │
│  │       CREDIT NOTE          │  │
│  │   Original for Recipient   │  │
│  └────────────────────────────┘  │
│                                  │
│  CN-2627-0043                    │
│  Date  21-08-2026                │
│                                  │
│  Against invoice                 │
│  INV-2408210001 · 21-08-2026     │
│  Reason  Order cancelled         │
├──────────────────────────────────┤
│  SUPPLIER                        │
│  Kranthi Kumar                   │
│  GSTIN  37AAALK2341A1Z0          │
├──────────────────────────────────┤
│  RECIPIENT                       │
│  Anil Kumar                      │
│  GSTIN  —  (unregistered)        │
│                                  │
│  Place of supply  Andhra Pradesh │
│  (37)                            │
├──────────────────────────────────┤
│  CREDITED                        │
│  ┌────────────────────────────┐  │
│  │ 1  Rice 25kg               │  │
│  │    HSN 1006 · UQC bag      │  │
│  │    Taxable        ₹990.00  │  │
│  │    CGST 9%         ₹89.10  │  │
│  │    SGST 9%         ₹89.10  │  │
│  │    Amount       ₹1,168.20  │  │
│  └────────────────────────────┘  │
├──────────────────────────────────┤
│  Taxable value        ₹1,314.00  │
│  CGST 9%                ₹118.26  │
│  SGST 9%                ₹118.26  │
│  IGST                        —   │
│  ─────────────────────────────   │
│  TOTAL CREDIT         ₹1,550.52  │
│                                  │
│  Refunded to UPI ····4321        │
│  RF-2408210077 · 21-08-2026      │
├──────────────────────────────────┤
│  For Kranthi Kumar               │
│  Authorised signatory            │
├──────────────────────────────────┤
│  [ Download PDF ]   [ Share ]    │
└──────────────────────────────────┘
```

**Rules**

- The tax split on a credit note always mirrors the original invoice. A note that switched from CGST/SGST to IGST because the recipient moved state would put both parties' returns out of agreement.
- Cumulative credit against one invoice can never exceed its total. `issueCreditNote` refuses the excess rather than clamping it, because a clamped credit note quietly under-refunds someone.
- The series is per financial year and gapless. A missing number in a GST document series is a question an auditor will ask and the platform must be able to answer.
- A credit note over a closed accounting period is refused; the correction is raised in the open period against the original invoice reference.
- Where e-invoicing applies, the IRN appears on the note once acknowledged. Its absence is shown as pending rather than omitted, so nobody assumes a note was reported when it was not.

---

## 7. Custody handover verification

Goods and cash change hands four times on this platform, and all four are the same interaction: one party releases custody, the counterparty proves they consented, the server writes a record neither of them can edit. Drawn once here, used by `BUY-10.1`, `MER-08.2`, `MER-09.2`, `DRV-05.2`, `DRV-10.1`, `DRV-10.2`, and `SUP-16.1`.

| Handover | Releasing party | Verifying counterparty | Cloud Function |
| -------- | --------------- | ---------------------- | -------------- |
| Buyer order pickup | Driver or merchant | **Buyer** | `markOrderDelivered` |
| Merchant bulk order | Driver | **Merchant** | `updateMerchantOrderStatus` |
| Merchant cash against credit | Merchant | **Merchant** confirms to the driver | `initiateCreditRepayment` then `confirmCreditRepayment` |
| Driver cash to supplier | Driver | **Supplier** | `declareCashHandover` then `confirmCashSettlement` |

### 7.1 The rule that shapes every screen

**The party being verified is the only party that holds the code.** A driver's screen never displays the buyer's pickup code, a merchant's handover code, or a supplier's settlement code — it displays an empty six-box field to type what the counterparty reads out. Codes live in private subdocuments the releasing party cannot read, and the code owner sees their own code on a screen of their own (`BUY-10.1`, `MER-08.2`, `SUP-16.1`).

This is why the counterparty always needs a screen of their own. A verification flow with only one screen is a verification flow where one person types both halves.

### 7.2 The code entry sheet

Opens over whatever screen initiated the handover. Identical in every role; only the header line and the amount block change.

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
│  [ 🔊 Read the digits aloud ]     │
│  [ Send the code again ]         │
│                                  │
│  Cannot get the code?            │
│  [ Use another way ]             │
│                                  │
│  [ Cancel ]      [ Confirm ]     │
└──────────────────────────────────┘
```

- Six separate boxes, `text-2xl`, numeric keypad, auto-advance, paste-aware. At 360px the boxes are 44px so they clear the touch target minimum.
- `[ 🔊 Read the digits aloud ]` reads back what has been typed, for a driver who cannot easily check small text. It never reads a code the caller should not know.
- `[ Send the code again ]` calls `resendHandoverCode` and is disabled with a countdown after three sends in an hour.
- `[ Confirm ]` is disabled until six digits are entered. On `CODE_INVALID` the boxes clear, shake once, and the remaining attempts appear inline.
- After five failures the code field is replaced by the fallback list, permanently for that handover.

### 7.3 Offline: the code batch

Offline, the sheet cannot ask the server for anything, so the live-code option is replaced. The counterparty reads out the next unused code from a batch issued to them in advance by `issueOfflineCodeBatch` — printed, or held on their own device at `MER-09.4`.

```
┌──────────────────────────────────┐
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│  Confirm handover         [ X ]  │
│  ⚠ Offline — will send later     │
│                                  │
│  Sri Lakshmi Stores              │
│  Cash against credit  ₹4,000     │
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
│                                  │
│  [ Cancel ]      [ Confirm ]     │
└──────────────────────────────────┘
```

The counter box is typed alongside the code, because the app cannot know which line of the sheet the counterparty is reading. Each counter burns on sync; a code that arrives twice fails the second time with `CODE_REPLAYED`, which is what stops a captured code from being replayed against a second, larger handover. The sheet states the single-use rule in plain words, because a merchant who reuses line 7 will otherwise believe the app lost their payment.

### 7.4 Fallbacks

`[ Use another way ]` opens the fallback list. Every entry is weaker than a code and every entry is recorded as such, with the reason attached to the permanent record.

```
┌──────────────────────────────────┐
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│  Cannot get the code?     [ X ]  │
│                                  │
│  ( ) Photo of the handover       │
│      Weaker proof. Your supplier │
│      will see it was used.       │
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
│  [ Back ]        [ Continue ]    │
└──────────────────────────────────┘
```

- A reason is mandatory. The picker offers "No signal on their phone", "Phone is switched off", "Wrong number on file", "Shared family phone", "They cannot read the code", and "Other" with a free-text field.
- "They confirm on my phone" collects a name and the last four digits of the counterparty's registered number, so the record says who stood there. It cannot be used if the digits do not match the profile.
- "Ask my supplier to allow it" sends a request and blocks until the supplier grants a `VerificationFallbackAuthorization` at `SUP-16.3`. The authorisation lasts two hours, covers one handover, and names both parties. Waiting is deliberate: an override that a driver can grant themselves is not an override.
- The releasing party is told, in the confirmation screen and in the receipt, that weak proof was used. It is not hidden from them and it is not hidden from the supplier.

### 7.5 States

| State | Treatment |
| ----- | --------- |
| **Loading** | The sheet opens with the counterparty and amount already rendered from the cached order; only the code field waits. |
| **Empty** | Not applicable — the sheet is a form. |
| **Error** | Inline under the code boxes for `CODE_INVALID` and `AMOUNT_MISMATCH`; banner inside the sheet for `CODE_EXPIRED` and `CUSTODY_TRANSFER_EXPIRED`; a nested sheet for `FALLBACK_NOT_AUTHORIZED`. |
| **Offline** | Header banner, live-code option removed, counter box added, `[ Send the code again ]` hidden. |
| **Queued** | On confirm the sheet closes to a `queued` chip on the row and `(n)🔄` in the header. The receipt reads "Saved — waiting to send". |
| **Disabled** | `[ Confirm ]` dimmed until six digits and, where cash moves, a matching amount. The reason sits directly under the button. |
| **Stale** | A cached amount older than its TTL shows `[cached]` beside the figure and re-reads before submitting. |

---

## 8. Cash custody and reconciliation

Physical cash moves through three pairs of hands: buyer to driver, merchant to driver, driver to supplier. The platform's answer to "who is holding how much of whose money" is an append-only ledger, and every screen that shows a cash figure reads the same one.

### 8.1 The custody card

The shared component. Appears on `DRV-10`, `SUP-16`, `SUP-16.1`, and `SPT-19`, always itemised by source and always with the same total, because driver and supplier both call `getCashCustodySummary` and get the same `asOf` figure. A cash total that differs between two screens is the defect this pattern exists to prevent.

```
┌────────────────────────────────┐
│  Cash to hand over             │
│  ₹8,450.00                     │
│  As of 21-08-2026 06:40 PM     │
│                                │
│  Buyer cash orders   ₹3,150.00 │
│  7 orders                      │
│  Merchant repayments ₹4,000.00 │
│  2 merchants                   │
│  Merchant bulk cash  ₹1,300.00 │
│  1 order                       │
│  ─────────────────────────────  │
│  Total               ₹8,450.00 │
└────────────────────────────────┘
```

Each source line is tappable and opens the underlying ledger entries, each naming its order, its counterparty, and the time it was collected. The total is never editable and never entered by hand; it is derived from entries that each carry a verified handover behind them.

### 8.2 The two-sided handover

A settlement is two acts by two people, drawn as two screens on purpose. The driver **declares** what they are handing over (`DRV-10.2`, `declareCashHandover`); the supplier **counts** and confirms against their own code (`SUP-16.1`, `confirmCashSettlement`). Neither side can do both.

```
┌──────────────────────────────────┐
│  ←  Hand over cash               │
├──────────────────────────────────┤
│  To  Kranthi Kumar · Ongole Hub  │
│                                  │
│  App says          ₹8,450.00     │
│                                  │
│  I am handing over               │
│  [ ₹ 8,450                    ]  │
│                                  │
│  ✔ Matches                       │
│                                  │
│  Your supplier will count it and │
│  confirm with their code.        │
│                                  │
│  [ Declare handover ]            │
└──────────────────────────────────┘
```

When the declared amount differs from the expected amount, a reason becomes mandatory before the button enables. The difference is stated as a fact, not an accusation.

```
│  I am handing over               │
│  [ ₹ 8,200                    ]  │
│                                  │
│  ⚠ ₹250.00 less than the app     │
│    says. Tell your supplier why. │
│  Reason                          │
│  [ Buyer paid ₹250 short      ]  │
```

The supplier's side stores a third number — what they actually counted — beside the other two. Three figures rather than one is what makes a shortfall attributable instead of contested.

```
┌──────────────────────────────────┐
│  ←  Confirm settlement           │
├──────────────────────────────────┤
│  From  Ravi Teja · AP39 TR 4521  │
│  Gig   Ongole → Markapur · 21-08 │
│                                  │
│  App says          ₹8,450.00     │
│  Driver declared   ₹8,200.00     │
│                                  │
│  I counted                       │
│  [ ₹ 8,200                    ]  │
│                                  │
│  ⚠ Short by ₹250.00              │
│  What should happen?             │
│  ( ) Take it from driver's pay   │
│  ( ) Carry to the next gig       │
│  ( ) Write it off                │
│  (•) Send to support             │
│  Note                            │
│  [ Buyer paid short at Karavadi] │
│                                  │
│  [ Confirm settlement ]          │
└──────────────────────────────────┘
```

- The four resolutions map to `CashVarianceResolution`. `Write it off` is hidden from driver callers.
- `Send to support` opens a `CashDiscrepancy` and leaves the cash in the driver's custody. Custody does not discharge while an amount is contested, which is the point of having a disputed state at all.
- An overage is treated with the same seriousness as a shortfall and gets its own ledger entry, because unattributed extra cash is also unexplained cash.

### 8.3 Money in flight

A merchant's credit is relieved the moment a driver takes their cash, but the supplier does not have that cash yet. All three parties see the gap, on their own screen, using the same words.

```
│  Credit                          │
│  Limit              ₹50,000.00   │
│  Used               ₹12,000.00   │
│  Available          ₹38,000.00   │
│                                  │
│  ⏳ With driver      ₹4,000.00    │
│  Ravi Teja · collected 04:15 PM  │
│  Your credit is already reduced. │
│  Your supplier gets it tonight.  │
```

The merchant sees `⏳ With driver` on `MER-09`; the driver sees the same amount inside their custody card on `DRV-10`; the supplier sees it per driver on `SUP-16` and per merchant on `SUP-04.5`. The hourglass is the shared signal for a movement that is real but not yet settled, and it disappears only when `confirmCashSettlement` runs.

### 8.4 Rules

- **Every cash figure is server-derived.** No screen sums a list client-side to produce a total a user will act on. `getCashCustodySummary` is the only source, and it returns `asOf` so two screens can be compared.
- **Every money-moving button names its function.** `[ Collect cash ]` is `initiateCreditRepayment`, `[ Confirm ]` on the code sheet is `confirmCreditRepayment`, `[ Declare handover ]` is `declareCashHandover`, `[ Confirm settlement ]` is `confirmCashSettlement`, `[ Report a problem ]` is `raiseCashDiscrepancy`. A cash button with no function behind it is not drawn.
- **A driver holding cash cannot withdraw earnings.** `DRV-08` blocks with `CASH_IN_CUSTODY_OUTSTANDING` and links to `DRV-10.2`. The block states the amount and the settlement it belongs to.
- **Amounts are `en-IN` with two decimals and a `₹` prefix** wherever a person will be counting notes against the screen. Lakh grouping applies: `₹1,00,000.00`.
- **Receipts are readable offline.** Every confirmed handover writes a receipt screen the counterparty can reopen from their order or credit history, cached, because a paper trail nobody can retrieve is not a paper trail.
- **Nothing is discharged by inference.** A gig ending, a driver going offline, a merchant closing the app: none of these settle anything. Only a confirmed two-sided event moves cash out of custody.

---

## 9. Digital money movement

Cash is settled by two people looking at each other. Digital money is settled by a third party the platform cannot see, and the patterns below exist because that difference changes what a screen is allowed to claim.

### 9.1 The transaction card

Every payment, refund and payout renders through one card. It answers, in order: how much, what state, where it went, and what to quote on a phone call.

```
┌────────────────────────────────┐
│ ₹3,000.00                      │
│ ✔ Money sent · 13-08 02:14 PM  │
│ To  UPI hari····@okhdfcbank    │
│ Ref PO-24102                   │
│ UTR 431299887766       [ Copy ]│
│                     [ Details ]│
└────────────────────────────────┘
```

| Slot | Rule |
| ---- | ---- |
| Amount | Always the amount that actually moved, never the requested figure when they differ. A netted payout shows the net with the breakdown on the detail screen. |
| State | The transaction's own status word, from the palette in [Foundations.md](Foundations.md). Never derived from an API `success` flag. |
| Destination or source | `maskedLabel` only. Never a full VPA, account number, or card number. |
| Platform reference | Always present, from the moment the record exists. This is the one a user can be asked to read out. |
| Provider reference or UTR | Present only once the provider or bank supplies it, with `[ Copy ]`. Absent rather than blank while pending. |

### 9.2 Six states, six sentences

Every money surface must be able to render all six. A screen that only draws the happy path is unfinished.

| State | What the user is told | What is offered |
| ----- | --------------------- | --------------- |
| Requested / initiated | The amount and that it has started | Nothing to do; no retry |
| Pending at the provider | The amount, the reference, and *do not try again* | Check again, contact support |
| Succeeded | The amount, the time, and the provider reference | Receipt, invoice, copy reference |
| Failed | The amount was **not** taken or **not** sent, the reason in plain words, and where the money is now | Retry as a new attempt, or an alternative route |
| Reversed after success | That it succeeded and was then taken back, with the original reference and the reason | Support case, already opened |
| Stuck past the escalation window | That this is longer than it should be, and that support already has it, with the case id | Alternative route, call support |

**Pending is the state that costs money when it is drawn badly.** It looks like an unfinished action and invites a retry, and a retry against a pending collection is a double payment. Wherever a transaction is pending, the retry control is **removed rather than disabled**, every other route to the same payment is replaced by a link to the pending screen, and the instruction not to pay again is stated as a sentence rather than implied by a spinner.

**Failed states say where the money is.** "Not charged", "back in your dues", "returned to your account" — a user who cannot tell whether their money is gone will assume it is, and will call.

### 9.3 The reference rule

Two identifiers exist for every transaction and they are not interchangeable.

- The **platform reference** (`PT-`, `RF-`, `PO-`, `CN-`, `PR-`) is minted before the provider is contacted, exists even when the provider never responds, and is what every screen leads with.
- The **provider reference** (gateway payment id, UTR) exists only once the provider or bank supplies it, is what a bank will recognise, and is shown alongside — never instead.

A screen that shows only the provider reference cannot identify a payment that failed before the provider saw it, which is exactly the payment somebody is calling about.

### 9.4 Approval is not completion

Any surface that renders an authorisation follows three rules.

An approved item is worded as approved, never as paid, sent, transferred, or done. The approval sheet carries no field for a provider reference, because none exists at that moment. The actor who approved and the actor who initiated are shown separately in the history, with automated steps attributed to the system rather than to the person who authorised them.

### 9.5 Entitlement gating

A gated control is **locked, not hidden and not silently disabled**. It shows what the capability does, the plan that carries it, and the computed price of getting there, before any form is filled.

```
┌──────────────────────────────────┐
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│  🔒 {Capability}                  │
│                                  │
│  {One line: what it does.}       │
│                                  │
│  Your plan   {current}           │
│  Needs       {plan} · {price}    │
│                                  │
│  You'd pay {prorated} now, then  │
│  {recurring} from {date}.        │
│                                  │
│  [ Compare plans ]               │
│  [  Upgrade and pay  ]           │
└──────────────────────────────────┘
```

| Rule | Reason |
| ---- | ------ |
| Locked before the form, never after submission | A user who fills a date range and then meets a paywall has been made to work for a refusal |
| Named capability, not a tier name | "Reconciliation workspace" is a decision; "Enterprise feature" is an advertisement |
| Server re-checks every gated call | A hidden button is a courtesy; a direct call, a cached client, or a stale tab must still be refused |
| Metered limits show consumption before exhaustion | "8 of 10 exports left" prevents the surprise that "limit reached" delivers |
| Never applied to a baseline entitlement | Own balances, own payout controls, own invoices and credit notes are unconditional on every plan and in every subscription state |

**No degraded subscription state ever blocks money movement.** Past due, grace, cancelled and expired all reduce reporting depth and withdraw exports; none of them stop a payout being requested or approved, a refund being issued, a credit repayment being made, or an invoice being opened. A platform that withholds a driver's earnings over its own unpaid invoice has turned a billing problem into a wage dispute.

### 9.6 Rules

- **Every money figure is server-derived.** No screen sums transactions client-side to produce a total a user acts on.
- **Every money-moving button names its function**, its permitted role, and the transaction record it creates.
- **No money-moving call is queued offline.** The control is disabled with the reason stated.
- **No screen renders a raw destination.** Masked labels only, everywhere, including Support consoles.
- **Every state-changing money control produces a visible identifier and timestamp** the user can quote.
- **Automated steps are attributed to the system** in every history, never to the last human who touched the record.
