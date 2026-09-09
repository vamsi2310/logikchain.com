# Foundations

Design tokens, component inventory, accessibility rules, locale formatting, and the platform write-authority model. Every screen in the `constitution/wireframes/` folder is built from the primitives defined here; role files draw layouts, this file defines what the boxes are made of.

Foundations: [Foundations.md](Foundations.md) · IA and screen IDs: [Navigation.md](Navigation.md) · Shared states, errors, AI and invoice: [Patterns.md](Patterns.md)

Roles: [Shared](Shared.md) · [Buyer](Buyer.md) · [Merchant](Merchant.md) · [Driver](Driver.md) · [Supplier](Supplier.md) · [Support](Support.md)

---

## 1. Device and viewport

Logikchain is a portrait-primary product for low-spec budget Android devices in rural India, shipped as a PWA and as a Kotlin Compose app that share these breakpoints (`constitution/Logikchain_Architecture.md`). The design target is a 360px-wide viewport; 320px is the hard floor at which everything must still be usable.

| Breakpoint | Width | Who sees it | Layout |
| ---------- | ----- | ----------- | ------ |
| `xs` | 320–359px | Oldest budget Android | Single column, 12px page padding, labels may wrap to two lines |
| `sm` **(design target)** | 360–411px | Majority of buyers, merchants, drivers | Single column, 16px page padding |
| `md` | 412–767px | Larger phones | Same single column, content capped at 480px and centred |
| `lg` | 768–1023px | Support on a tablet | Two-column config lists, sheets become side panels |
| `xl` | 1024px+ | Support on desktop only | Persistent left rail replaces bottom nav, tables replace cards |

- **Orientation:** `portrait-primary` is locked in `manifest.json`. Landscape is not designed for; if forced, layouts must not clip.
- **Chrome heights:** header 56px, bottom nav 56px, FAB 56px diameter sitting 16px above the nav bar, bottom sheet max height 90vh with the content area scrolling inside.
- **Safe areas:** respect `env(safe-area-inset-bottom)` so the bottom nav clears Android gesture bars.
- **Support desktop:** `lg` and `xl` exist only for the Support console. Country ISO codes, plan caps, tariff windows, and seven-field offer eligibility are authored there. Support screens must remain *functional* at 360px, but they are *optimised* at 1024px. Every other role is phone-only by design.

```
360px viewport
├─16─┤                          ├─16─┤
┌────┬────────────────────────────┬────┐
│    │      content 328px         │    │
└────┴────────────────────────────┴────┘
```

---

## 2. Spacing and grid

A single 4px base unit, used in 8px steps for everything except icon-to-label gaps.

| Token | Value | Use |
| ----- | ----- | --- |
| `--space-0` | 0 | Flush |
| `--space-1` | 4px | Icon to label, chip inner |
| `--space-2` | 8px | Between related lines, minimum gap between touch targets |
| `--space-3` | 12px | Between cards in a list |
| `--space-4` | 16px | Page padding, card padding, form field gap |
| `--space-5` | 24px | Between form sections |
| `--space-6` | 32px | Above a screen's primary action |
| `--space-8` | 48px | Empty-state and success-screen vertical rhythm |

- Page padding is `--space-4` at `sm` and above, `--space-3` at `xs`.
- Lists are a vertical stack with `--space-3` gaps, never a grid, except the Support config home which uses a two-up card grid.
- The last element on a scrolling screen carries `--space-8` bottom padding so the FAB and bottom nav never cover it.

---

## 3. Type scale

System font stack (`system-ui`) — no web fonts. Font files are the single largest avoidable payload on a 2G connection.

| Token | Size / line-height | Weight | Use |
| ----- | ------------------ | ------ | --- |
| `--text-display` | 32 / 40 | 700 | Pickup code, OTP digits, order-placed confirmation |
| `--text-h1` | 24 / 32 | 700 | Screen title on hero screens (splash, success) |
| `--text-h2` | 20 / 28 | 600 | Header title, sheet title |
| `--text-h3` | 17 / 24 | 600 | Card title, section heading |
| `--text-body` | 15 / 22 | 400 | Default body, list rows, form values |
| `--text-body-strong` | 15 / 22 | 600 | Amounts, statuses, emphasised values |
| `--text-label` | 13 / 18 | 500 | Field labels, chips, bottom-nav labels |
| `--text-caption` | 12 / 16 | 400 | Timestamps, helper text, invoice fine print |

- **Minimum readable size is 12px.** Nothing smaller ships, including invoice fine print and table footnotes.
- Body text must reflow legibly at 200% browser zoom without horizontal scrolling.
- Numerals in amounts and codes use tabular figures so column-aligned totals do not jitter.
- No text is baked into images, which would break both translation and zoom.

---

## 4. Colour and contrast

Contrast ratios below are measured against `--surface` (`#FFFFFF`). Body text needs ≥ 4.5:1, large text (≥ 19px bold or ≥ 24px) and meaningful UI boundaries need ≥ 3:1.

| Token | Hex | On white | Use |
| ----- | --- | -------- | --- |
| `--ink` | `#1A1A1A` | 17.4:1 | Primary text |
| `--ink-muted` | `#5C5C5C` | 6.7:1 | Secondary text, helper copy, timestamps |
| `--ink-disabled` | `#8C8C8C` | 3.5:1 | Disabled labels (never carries essential meaning) |
| `--primary` | `#1B7F3B` | 5.1:1 | Primary buttons, active nav, progress fill |
| `--primary-ink` | `#FFFFFF` | 5.1:1 on primary | Text on primary |
| `--primary-wash` | `#E8F3EB` | — | Selected rows, active chips |
| `--danger` | `#B3261E` | 6.5:1 | Destructive actions, errors, overdue |
| `--danger-wash` | `#FCEBEA` | — | Error banner background |
| `--warning` | `#8A5300` | 6.3:1 | Suspended, offline, GPS off, plan limit |
| `--warning-wash` | `#FDF3E2` | — | Warning banner background |
| `--info` | `#1B5FBF` | 6.1:1 | Informational banners, refund progress |
| `--info-wash` | `#E9F1FC` | — | Info banner background |
| `--surface` | `#FFFFFF` | — | Cards, sheets, page |
| `--surface-alt` | `#F4F6F4` | — | Page background behind cards, skeletons |
| `--border` | `#D6DAD6` | 1.5:1 | Decorative dividers only |
| `--border-strong` | `#6E7A6E` | 4.5:1 | Input outlines, checkbox and radio borders, focus ring |

**Status colours** always pair with an icon and a word, never colour alone:

| State | Token | Glyph | Appears on |
| ----- | ----- | ----- | ---------- |
| `placed` | `--info` | `•` | Order, MerchantOrder |
| `reached_merchant` / `reached` | `--primary` | `🚚` | Order, MerchantOrder |
| `delivered` | `--primary` | `✔` | Order, MerchantOrder |
| `cancelled` | `--ink-muted` | `✖` | Order, MerchantOrder |
| `suspended` | `--warning` | `⚠` | Order, MerchantOrder, Gig |
| `pending` (payment or payout) | `--warning` | `⏳` | Payment, DriverPayoutRequest |
| `overdue` | `--danger` | `!` | CreditPaymentDue |
| `active` / `approved` | `--primary` | `✔` | Subscription, config records |
| `past_due` | `--warning` | `⚠` | PlatformSubscription |
| `grace` | `--warning` | `⏳` | PlatformSubscription |
| `expired` / `inactive` / `retired` | `--ink-muted` | `—` | PlatformSubscription, config records |
| `initiated` / `processing` | `--info` | `⏳` | PaymentTransaction, PayoutTransaction |
| `succeeded` / `completed` | `--primary` | `✔` | PaymentTransaction, PayoutTransaction |
| `failed` | `--danger` | `✖` | PaymentTransaction, PayoutTransaction, RefundTransaction |
| `reversed` | `--danger` | `⚠` | PaymentTransaction, PayoutTransaction |
| `partially_refunded` | `--info` | `↩` | PaymentTransaction |
| `unverified` / `pending_verification` | `--warning` | `⏳` | BeneficiaryAccount |
| `verified` | `--primary` | `✔` | BeneficiaryAccount |
| `blocked` | `--danger` | `🚫` | BeneficiaryAccount |
| Reconciliation break within SLA | `--warning` | `⚠` | ReconciliationException |
| Reconciliation break past SLA | `--danger` | `🔴` | ReconciliationException |
| `closed` (period) | `--primary` | `🔒` | AccountingPeriod |
| Locked by plan | `--ink-muted` | `🔒` | Any entitlement-gated control |

**Two status words are never used interchangeably, and the palette enforces it.** `approved` on a payout is `--primary ✔` because a decision was made, but it is always rendered with the word "approved" and never with "paid", "sent", or "transferred". Only `completed` — which requires a UTR from the rail — may be worded as money having moved. A colour system that gives approval and completion the same tick invites the same word, and the same word is how a driver ends up at a shop counter with a balance that is not there.

**`🔒` carries two unrelated meanings and both are legible from context.** On an accounting period it means finalised and unchangeable; on a report or export it means the plan does not include it. Neither is an error state and neither is rendered in `--danger`.

Dark mode is out of scope for the first release. Tokens are defined as CSS custom properties so a dark palette can be swapped in later without touching component code.

---

## 5. Elevation, radius and borders

| Token | Value | Use |
| ----- | ----- | --- |
| `--radius-sm` | 4px | Chips, badges, inputs |
| `--radius-md` | 8px | Cards, buttons, banners |
| `--radius-lg` | 16px | Bottom sheets (top corners only) |
| `--radius-full` | 999px | FAB, avatar, stepper buttons |
| `--shadow-1` | `0 1px 2px rgba(0,0,0,.08)` | Cards |
| `--shadow-2` | `0 4px 12px rgba(0,0,0,.12)` | Bottom sheets, FAB, sticky footers |

Shadows are a nicety, not a signal. Cards also carry a 1px `--border` so they remain distinguishable on cheap low-contrast LCDs where shadows disappear.

---

## 6. Touch targets and gestures

- **Minimum touch target is 48×48px**, even when the painted control looks smaller (a 24px icon gets 12px of invisible padding on each side).
- Adjacent targets are separated by at least `--space-2`. Quantity steppers `[-] 1 [+]` therefore occupy 48px each with 8px between them.
- Primary actions sit in the lower third of the screen, inside comfortable thumb reach. Destructive actions never sit adjacent to a confirm action without a text label distinguishing them.
- **No gesture is the only way to do anything.** Swipe-to-delete always has a visible `[ Remove ]`; drag-to-reorder route villages always has up/down affordances.
- Pull-to-refresh is available on every list that reads volatile data, and is duplicated by an explicit refresh action in the empty and offline states.
- Long-press is decorative only.

---

## 7. Component inventory

| Component | Spec | States |
| --------- | ---- | ------ |
| App header | 56px, title `--text-h2` left, up to three trailing 48px slots (`🔊` voice, `🔔` bell, `👤` avatar), back chevron leading | default, with back, with banner below |
| Bottom nav | 56px, 3–4 tabs, icon + `--text-label`, active tab `--primary` with filled icon | active, inactive, badged |
| Banner | Full width, `--warning-wash` / `--danger-wash` / `--info-wash`, icon + one or two lines, stacks under the header | offline, GPS off, suspended, plan limit, subscription required |
| Card | `--surface`, `--radius-md`, 1px `--border`, 16px padding, whole card tappable when it has a detail screen | default, pressed, selected, disabled, skeleton |
| List row | 56px minimum, leading icon optional, trailing chevron or action | default, pressed, disabled |
| Bottom sheet | `--radius-lg` top, drag handle `━━━━`, title, scrollable body, sticky action footer, backdrop scrim | create, edit, confirm, destructive confirm, picker |
| Dialog | Centred, used only for blocking system messages (session expiry, forced update) | — |
| FAB | 56px `--radius-full`, `--primary`, bottom-right 16px above nav | default, hidden while scrolling a long list |
| Button | 48px height, `--radius-md`; primary filled, secondary outlined, tertiary text, destructive `--danger` | default, pressed, loading (spinner replaces label), disabled |
| Text field | 48px, 1px `--border-strong`, floating or top label, helper and error slots reserved so layout does not jump | default, focus, filled, error, disabled, read-only |
| Picker `▾` | Opens a bottom sheet list, never a native `<select>`, so cascade and "active only" rules can be explained inline | default, loading, empty, cascade-locked |
| Stepper | `[-] n [+]`, 48px targets, clamps at 0 and at `Product.stock` | default, at min, at max, disabled |
| Chip | 32px tall with 48px touch area, `--radius-sm` | filter, selected filter, read-only tag |
| Radio / checkbox | 24px glyph in a 48px target, `--border-strong` outline | unchecked, checked, disabled |
| Switch | Used only for permissions and notification toggles | on, off, disabled |
| Segmented tabs | In-page `[ Active ] [ Past ]` selector, not to be confused with bottom nav | — |
| Search field | 48px, leading `🔍`, clear affordance, debounced 300ms | default, typing, no results |
| Progress stepper | `Step 2 of 3` plus a filled bar; used in buyer setup and refund status | — |
| Timeline | Vertical `● ◉ ○` milestone list for order progress and refunds | complete, current, pending |
| Badge | Count on nav tabs and the bell; caps at `99+` | — |
| Toast | Bottom, above the nav bar, 4s, one line, optional single action (usually Undo) | success, error, info |
| Skeleton | `--surface-alt` blocks matching the real layout's shape | — |
| Empty state | Icon, one-line cause, one-line remedy, one primary action | per screen |
| Voice button `🔊` | Header slot; reads the screen aloud in the selected language | idle, speaking, unavailable |
| Avatar `👤` | 40px in a 48px target; opens Profile, never a nav tab | — |

**Card**

```
┌────────────────────────────────┐
│ Title                          │  --text-h3
│ Secondary line · status        │  --text-body / --ink-muted
│ ₹1,550 · 21-08-2026            │  --text-body-strong
│              [ Action ]  [ > ] │  48px targets
└────────────────────────────────┘
```

**Bottom sheet**

```
┌──────────────────────────────────┐
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │  drag handle
│  Sheet title              [ X ]  │  --text-h2 + 48px close
├──────────────────────────────────┤
│  scrollable body                 │
├──────────────────────────────────┤
│  [ Cancel ]      [ Confirm ]     │  sticky footer
└──────────────────────────────────┘
```

**Banner**

```
│  ⚠ Offline: data may be outdated │
```

---

## 8. Iconography and imagery

- Icons always carry a text label. An icon alone is only acceptable in the header slots (`🔊`, `🔔`, `👤`), which are constant across every screen and have accessible names.
- The wireframes use emoji as icon placeholders (`🚚` gig, `🏪` merchant shop, `🛒` cart, `📞` call, `📍` location, `🔍` search, `⏳` waiting, `🔄` sync). Production uses a single inline SVG sprite; no icon font.
- Product images come from `Product.imageUrl`, are square, are served as WebP or AVIF, and follow the stale-while-revalidate strategy. Every image has a text fallback tile carrying the product name, because a missing image must never leave a nameless row.
- Images are never the sole carrier of price, stock, or status.

**Emoji and ASCII box width.** Box borders in these wireframes are padded to a uniform *character* count — 36 for a phone screen, 34 for a nested card. Emoji are one character but two display columns, so the roughly 317 lines carrying one render a single column past the right border in GitHub, VS Code preview, and most terminals. This is cosmetic and deliberate: uniform character counts keep the boxes checkable by a simple width script, and the alternative — padding by rendered column width — would make those lines 35 characters and defeat that check, while still rendering wrong in the monospace fonts that draw emoji single-width. Do not "correct" a lone emoji line to match its neighbours visually; it is already consistent with every other emoji line in the set. Genuine misalignment means a line whose *character* count differs from the dominant count inside the same fenced block.

A second class of exception is also intentional: the viewport diagram in section 1, the two padding diagrams in section 7, and the chrome diagrams in `SHR-00` place explanatory annotations to the right of the box, outside the border, so their line lengths vary by design.

---

## 9. Motion

| Motion | Duration | Notes |
| ------ | -------- | ----- |
| Sheet in / out | 240ms / 180ms ease-out | Slides from the bottom edge |
| Page transition | 200ms | Forward slides left, back slides right |
| Toast | 150ms fade and rise | |
| Skeleton shimmer | 1.2s loop | Disabled under `prefers-reduced-motion` |
| Spinner | Continuous | Only inside a button or a full-screen processing state |

All motion respects `prefers-reduced-motion: reduce` by collapsing to an instant state change. Nothing animates for longer than 300ms; on a low-end device the animation is the lag.

---

## 10. Locale formatting (`en-IN`)

Timestamps are stored in UTC as ISO 8601 and rendered in IST (`Asia/Kolkata`, UTC+5:30). Currency and number grouping follow the Indian system. Formatting is centralised in one utility module so no screen hand-rolls it.

| Value | Format | Example |
| ----- | ------ | ------- |
| Currency | `Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' })`, Indian lakh/crore grouping | `₹1,50,000.00`, `₹1,550` |
| Currency, whole rupees | Paise hidden when zero on lists and cards | `₹1,550` not `₹1,550.00` |
| Currency, invoice and credit | Always two decimals, right-aligned, tabular | `₹17,228.00` |
| Currency symbol | From `Country.currencySymbol`; never hard-code `₹` | `₹` |
| Date | `DD-MM-YYYY` | `21-08-2026` |
| Date, compact in lists | `DD-MM` when the year is the current year | `21-08` |
| Time | `hh:mm A` | `10:30 AM` |
| Date and time | `DD-MM-YYYY, hh:mm A` | `21-08-2026, 10:30 AM` |
| Relative time | Under 60 minutes only, then absolute | `12 min ago` |
| Phone | `{mobilePrefix} 5-digit 5-digit` for India | `+91 98765 43210` |
| Percentage | Integer unless fractional | `18%`, `12.5%` |
| Distance | Kilometres, one decimal under 10km | `1.2 km`, `24 km` |
| Duration | Minutes under 100, then `h m` | `35 min`, `1h 40m` |
| Quantity | Number + UQC from `Product.unit` / `OrderItem.unit` | `40 bag`, `2 bottle` |
| GSTIN | 15 characters, uppercase, never truncated | `37AAALK2341A1Z0` |
| HSN | As stored, 4–8 digits | `1006` |
| Invoice number | `INV-` + `YYMMDD` + 4-digit daily sequence, within the spec's 16-character ceiling | `INV-2408210001` |
| Merchant order id | `MO-` + sequence | `MO-7781` |
| Pickup code | 6 digits, space-separated and `--text-display` when presented for reading aloud | `4 7 2 9 1 6` |
| Vehicle number | Uppercase, hyphen-grouped | `AP-27-TX-1234` |

- Amounts are never abbreviated to `1.5L` or `15k`. A merchant reading a credit limit needs the exact figure.
- GST is shown split into CGST and SGST for intra-state supply and as a single IGST line for inter-state, matching whatever the order document actually stores. A screen never displays a bare "GST 18%" line when the invoice behind it splits the tax.
- Date pickers accept typed `DD-MM-YYYY` as well as calendar selection, because rural users frequently type faster than they scroll a calendar.

---

## 11. Language and internationalisation

- **Languages:** English and Hindi platform-wide, plus the regional language of the active hub — Telugu, Kannada, Tamil, or Marathi. The language picker appears pre-auth (`SHR-03`) and again in Profile (`SHR-11`).
- **Fallback chain:** selected language → English → key. A missing translation never renders an empty string or a raw key to a user.
- **Layout:** allow 40% string expansion. Buttons wrap to two lines rather than truncating; a truncated action label is a failed screen. Telugu and Tamil need extra line height, which `--text-body` at 22px already allows.
- **Plurals and interpolation:** ICU message format. No sentence is assembled from concatenated fragments.
- **Numerals:** Latin digits everywhere, including in Hindi and Telugu copy, because prices, invoice numbers, and OTPs are read against SMS and printed receipts that use Latin digits.
- **Untranslated by design:** invoice number, GSTIN, HSN, vehicle number, discount codes, and LGD codes are identifiers, not prose.
- **Language change** is applied immediately without a reload and persists to `localStorage` plus the user profile.

---

## 12. Low-literacy and voice patterns

A large share of buyers and drivers read slowly or not at all. These are requirements, not enhancements.

- **Icon plus text, always.** Every action pairs a glyph with a word in the user's language.
- **One primary action per screen.** Secondary actions are visually quieter and never sit above the primary one.
- **Numbers over prose for anything critical.** The pickup code, the amount due, and the stop number are large, spaced, and isolated from surrounding text.
- **Voice affordance `🔊`** sits in the header of every buyer- and driver-facing screen. Tapping it reads the screen's meaningful content in the selected language: greeting, status, amounts, next action. Tapping again stops. It is hidden — not disabled — when `UserProfile.permissions.audio` is false, and the permissions manager (`SHR-10`) explains how to turn it back on.
- **Spoken milestones.** Checkout confirmation, "gig reached your shop", delivery confirmation, and the pickup code are spoken automatically when audio UI is enabled.
- **Call instead of type.** Every screen where a user might get stuck offers a `[ 📞 Call ]` — supplier, merchant, or support — rather than a text form.
- **Plain words.** "Tax invoice", not "GST compliance document". Where a term is unavoidable (GSTIN, HSN), it appears with a plain-language gloss on first use in a flow.
- **Confirmation before consequence.** Any action that spends money, cancels an order, or suspends work restates the amount and the object in a confirm sheet.

---

## 13. Accessibility checklist

Applied to every screen as part of the Definition of Done:

- Touch targets ≥ 48×48px with ≥ 8px separation.
- Text contrast ≥ 4.5:1; large text and meaningful borders ≥ 3:1.
- No information conveyed by colour alone — always colour plus glyph plus word.
- Visible focus ring (2px `--border-strong`, 2px offset) on every interactive element, for keyboard and switch-access users.
- Semantic HTML: real `<button>`, `<a>`, `<label>`, `<h1>`–`<h3>` order matching visual order.
- Every input has a programmatic label; errors are announced through `aria-live="polite"` and referenced by `aria-describedby`.
- Status changes that happen without user action (gig reached, payment confirmed, queued write synced) are announced in a live region.
- Sheets and dialogs trap focus, close on `Esc` and on backdrop tap, and restore focus to the trigger.
- Content reflows without horizontal scrolling at 320px and at 200% zoom.
- `prefers-reduced-motion` honoured.
- Screen reader labels for header slots: "Read this screen aloud", "Notifications, 3 unread", "Profile and settings".

---

## 14. Performance budgets

Budget assumes a ₹6,000 Android device on a 2G-to-3G connection.

| Budget | Target |
| ------ | ------ |
| App shell (HTML + CSS + JS, gzipped) | ≤ 200KB |
| Route chunk | ≤ 50KB |
| First contentful paint on 3G | ≤ 2.5s |
| Time to interactive on 3G | ≤ 5s |
| Product image | ≤ 40KB, WebP or AVIF, lazy below the fold |
| Fonts | 0 bytes — system stack only |
| Firestore listeners per screen | ≤ 2, unsubscribed on unmount |

Long lists are paginated at 20 items with an explicit `[ Load more ]` rather than infinite scroll, so a slow connection never traps a user mid-list.

---

## 15. Write authority and permission model

Client apps never write financial, inventory, or delivery state directly. A UI control that mutates any of the below calls a Cloud Function; the Firestore security rules exist as the second line of defence, not the mechanism.

| Collection | Client read | Client direct write | Server-only (Cloud Function) |
| ---------- | ----------- | ------------------- | ---------------------------- |
| `UserProfiles` | Own profile; Supplier reads their network; Support reads all | — | `createSupplier`, `convertBuyerToRole`, `updateUserProfile`, `disassociateMerchant`, `registerDeviceToken`, `registerPayoutBeneficiary` |
| `Countries` `States` `Districts` | Authenticated, `active` only | — | `upsertCountry`, `upsertState`, `upsertDistrict`, `deactivateConfigurationRecord` |
| `Hubs` `Villages` | Authenticated | — | `requestVillage`, `upsertVillage` |
| `Products` | Authenticated | Supplier owner except `stock` and including `lowStockAlert` | Stock movements via `placeOrder`, `placeMerchantOrder`, `cancelOrder`, `cancelMerchantOrder`, `adjustProductStock` |
| `Routes` `Pamphlets` | Owner supplier, buyers on the gig | Supplier owner | — |
| `Gigs` | Assigned driver, served merchants, buyers in a served village, owner supplier | — | `composeGig`, `startGig`, `updateGigLocation`, `completeAndFinalizeGig`, `suspendGig`, `reassignGigDriver` |
| `Orders` | Owning buyer, assigned merchant, serving driver, managing supplier, Support | — | `placeOrder`, `cancelOrder`, `markOrderDelivered`, `refundOrder`, `disassociateMerchant` |
| `Orders/{id}/private/pickup` | Owning buyer, Support — **not** the driver or the merchant | — | `placeOrder`, `resendHandoverCode`, `markOrderDelivered` |
| `MerchantOrders` | Owning merchant, supplying supplier, serving driver, Support | — | `placeMerchantOrder`, `updateMerchantOrderStatus`, `cancelMerchantOrder` |
| `MerchantOrders/{id}/private/handover` | Owning merchant, Support — **not** the delivering driver | — | `placeMerchantOrder`, `resendHandoverCode`, `updateMerchantOrderStatus` |
| `CreditProfiles` | Owning merchant (read-only), managing supplier, Support | — | `setMerchantCreditLimit`, `reviewCreditIncreaseRequest`, `processPayment`, `placeMerchantOrder`, `cancelMerchantOrder`, `confirmCreditRepayment`, `confirmCashSettlement`, `resolveCashDiscrepancy` |
| `CreditTransactions` | Owning merchant (read-only), managing supplier, Support (read-only) | — | Append-only; written by every function that moves credit |
| `CreditIncreaseRequests` | Owning merchant, managing supplier, Support | — | `requestCreditIncrease`, `reviewCreditIncreaseRequest` |
| `DriverEarnings` | Owning driver (read-only), managing supplier, Support | — | `completeAndFinalizeGig`, `requestPayout`, `reviewPayoutRequest`, `markOrderDelivered`, `confirmCreditRepayment`, `confirmCashSettlement` |
| `CashLedgerEntries` | Holding driver, owning supplier, the counterparty on the entry, Support (read-only) | — | Append-only; `markOrderDelivered`, `updateMerchantOrderStatus`, `confirmCreditRepayment`, `confirmCashSettlement`, `resolveCashDiscrepancy`, `reviewPayoutRequest` |
| `CustodyTransfers` | The two parties named on the transfer, owning supplier, Support (read-only) | — | Append-only; every handover function |
| `CustodyTransfers/{id}/private/code` | Paying merchant, Support — **not** the collecting driver | — | `initiateCreditRepayment`, `resendHandoverCode`, `confirmCreditRepayment` |
| `CashSettlements` | Named driver, owning supplier, Support | — | `completeAndFinalizeGig`, `suspendGig`, `declareCashHandover`, `confirmCashSettlement`, `resolveCashDiscrepancy` |
| `CashSettlements/{id}/private/code` | Receiving supplier, Support — **not** the driver | — | `completeAndFinalizeGig`, `suspendGig`, `resendHandoverCode`, `confirmCashSettlement` |
| `CashDiscrepancies` | Raiser, party named in `againstPartyId`, owning supplier, Support | — | `raiseCashDiscrepancy`, `resolveCashDiscrepancy`, `confirmCashSettlement` |
| `PaymentIntents` | Own intents (read-only), owning supplier for a credit repayment, Support | — | `createPaymentIntent`, `processPayment`, `refundOrder` |
| `PaymentTransactions` `PaymentStatusEvents` | Payer, payee, owning supplier, Support (all read-only) | — | Append-only; `createPaymentIntent`, `processPayment`, `handleGatewayWebhook`, `refundOrder` |
| `RefundTransactions` | Original payer, owning supplier, Support (read-only) | — | `refundOrder`, `handleGatewayWebhook` |
| `CreditNotes` | The recipient of the supply, issuing supplier, Support (read-only) | — | `issueCreditNote`, `refundOrder` |
| `BeneficiaryAccounts` | **Nobody.** Denied to every client including Support | — | `registerPayoutBeneficiary`, `blockPayoutBeneficiary`; only the masked label is ever returned |
| `PayoutTransactions` `PayoutStatusEvents` | Beneficiary driver, approving supplier, Support (all read-only) | — | Append-only; `reviewPayoutRequest`, `initiatePayoutTransfer`, `recordPayoutSettlement`, `verifyManualPayout`, `retryPayout`, `handleGatewayWebhook` |
| `ReconciliationRuns` `ReconciliationExceptions` | Support and Admin only | — | `runReconciliation`, `resolveReconciliationException`, `handleGatewayWebhook` |
| `AccountingPeriods` | Support and Admin only | — | `closeAccountingPeriod`, `reopenAccountingPeriod` |
| `AuditLogEntries` | Support and Admin (read-only) | — | Append-only; written inside the transaction of every privileged act. No function updates or deletes one |
| `SubscriptionInvoices` | Own invoices (read-only), Support | — | `subscribeToPlan`, `assignSubscription`, `changeSubscriptionPlan`, `processPayment`, `handleGatewayWebhook` |
| `FinanceEntitlementUsage` | Own usage (read-only), Support | — | `getFinanceReport`, `exportFinanceReport`, `scheduleFinanceReport` |
| `VerificationCodeBatches` | **Nobody.** Denied to every client including Support | — | `issueOfflineCodeBatch` returns the plaintext codes exactly once; only the server reads the hashes |
| `VerificationFallbackAuthorizations` | Grantee, granting supplier, Support | — | `authorizeVerificationFallback`, and consumed by the handover functions |
| `SubscriptionPlans` `PlanTariffs` `SubscriptionOffers` `OfferDiscountCodes` | Authenticated, `active` only | — | `upsert*`, `deactivateConfigurationRecord` |
| `PlatformSubscriptions` | Own subscription (read-only), Support | — | `assignSubscription`, `subscribeToPlan`, `cancelSubscription`, `changeSubscriptionPlan`, `processPayment` |
| `Notifications` | Own notifications | Own `read` flag only | Written by the functions that raise them |

Nine consequences for wireframes:

1. **Every button that changes server state names its Cloud Function** in the screen's Actions notes. A button with no function behind it is a bug in the wireframe, not a feature request for the backend.
2. **Offline writes are queued client-side and replayed against the function**, preserving the original device timestamp (`capturedAt` on delivery proof and on every custody handover). Direct offline Firestore writes are limited to profile-shaped, last-write-wins fields. **No money-moving call is ever queued.** A payment, refund, payout request, approval, or settlement is disabled offline with the reason stated, because replaying a stale financial intent hours later against a changed balance is how a queue turns into a double payment.
3. **A screen never shows a code its user is supposed to be asking for.** The private subdocuments above are readable only by the party who must authorise a transfer, which is why the buyer, the merchant, and the supplier each need a code screen of their own and the driver's screen only ever has an empty field.
4. **Support is read-only on the append-only ledgers.** A correction is not an edit; it is a `resolveCashDiscrepancy` call, a typed `adjustment` / `reversal` transaction, or a `CreditNote`, each carrying a mandatory reason and a named actor, so the correction is itself auditable.
5. **No client screen ever renders a full account number, VPA, or PAN.** `BeneficiaryAccounts` is denied to every reader; screens draw `maskedLabel` and, where it helps a human decide, the account-holder name the rail returned. A support console that can display a destination is a support console that can be socially engineered into reading one out.
6. **`success` on a response is not a statement about money.** Every screen that reports an outcome reads the transaction status field, never the call's success flag. "We processed your request" and "you were paid" are different sentences and the wireframes keep them apart.
7. **Approval and disbursement are drawn as separate states with separate actors.** No screen offers a single control that both authorises and completes a payment, and no approval form has a field for a provider reference, because at approval time none exists.
8. **Entitlement-gated controls are locked with their price, not hidden and not disabled after use.** A gated report shows what it does, which plan carries it, and what the upgrade costs, before any form is filled. The server re-checks the entitlement regardless of what the client rendered.
9. **Every financial state-changing control names its permitted role, required evidence, resulting state, and the identifier it produces.** A control that cannot state the transaction id and timestamp it will generate is not specified yet.

---

## 16. Resolved contract decisions

Contradictions between the wireframes, the security rules, the data model, and the web/Functions layout were blocking screens and clients from being drawable. These are the resolutions every role file and both runtimes now assume.

| # | Contradiction | Resolution |
| - | ------------- | ---------- |
| 1 | `convertBuyerToRole` provisions `creditLimit: 0` and `requestCreditIncrease` only files a `pending_supplier_approval` record, so no merchant could ever hold non-zero credit. The Supplier `[ Approve ]` button had no function behind it. | Two new Cloud Functions close the loop: `setMerchantCreditLimit` sets an absolute limit (supplier or Support), and `reviewCreditIncreaseRequest` approves or rejects a pending request, applying the delta to `CreditProfile.creditLimit` in the same transaction and stamping `reviewedBy` / `reviewedAt` / `approvedAmount`. |
| 2 | Merchants were given a `[ Delivered ]` action on buyer orders, but merchants may only write `MerchantOrder`; `Order.deliveryStatus` belongs to the driver. | The action stays, and it never writes the Order document. Both the driver and the assigned merchant call `markOrderDelivered`, which authorises the caller server-side, requires `deliveryStatus === "reached_merchant"`, validates the proof, and writes `deliveryStatus` and `deliveryProof` with a server-set `capturedBy`. Security rules keep merchants out of `Orders` writes entirely. |
| 3 | Vehicle breakdown and merchant disassociation both set things to "suspended", but neither `Gig.status` nor `Order.deliveryStatus` had that member. | `suspended` is now a first-class state on `Gig.status`, `Order.deliveryStatus`, and `MerchantOrder.status`, each with a `suspensionReason`, reached only through `suspendGig` or `disassociateMerchant`, and cleared by `reassignGigDriver`. It renders as the `--warning` `⚠` treatment everywhere. |
| 4 | On-device Haversine geofencing needs per-village coordinates, but `Route.villages` carried only a name and a journey time and `Gig.villages` was a `string[]`. Only `Village` held `location`. | `Route.villages` and `Gig.villages` are now arrays of `{ villageId, name, location { latitude, longitude } }`. `composeGig` copies the coordinates forward in route order and rejects with `INVALID_STATE` if any stop lacks them, so a gig can never reach a driver in an ungeofenceable state. |
| 5 | The driver's proof-of-delivery fallback was "enter confirmation code", but no buyer screen ever showed a code — and the code, had it existed on the order document, would have been readable by the very driver asking for it. | `placeOrder` mints a 6-digit code unique among the open orders at that merchant and writes it to `/Orders/{orderId}/private/pickup`, readable only by the buyer and Support. It surfaces on `BUY-10.1`, on the order detail, in the order-placed notification, and is read aloud by the voice assistant. The order document carries only `pickupCodeIssuedAt` and `pickupCodeLastSentAt`, so the driver can see that a code exists without seeing its value. `markOrderDelivered` matches the submitted `confirmationCode` server-side, rate-limited to five attempts per order. `/MerchantOrders/{id}/private/handover` and `/CashSettlements/{id}/private/code` follow the same shape for the merchant and the supplier. |
| 6 | Physical cash moved through buyers, drivers, merchants, and suppliers with no ledger entry, no dual confirmation, and no dispute trail. Money was in a person's pocket and the platform had no representation of it. | `CashLedgerEntries` is an append-only custody ledger: every collection writes an entry with `status: "in_custody"` and a named `holderId`, and it leaves custody only through a `CashSettlement` confirmed by two different actors. `CustodyTransfers` records each verified handover, `CashDiscrepancies` carries contested amounts to Support, and `CreditTransactions` is the append-only trail behind every scalar on `CreditProfile`. No client writes any of them. |
| 7 | A merchant handing cash to a driver against credit is two events separated in time — the merchant parts with the money, the supplier receives it later — and the platform modelled neither. | **Credit is relieved at driver-collection time**, on OTP-verified `confirmCreditRepayment`, not at supplier settlement. A merchant who has paid should not be blocked from ordering while a driver drives, and the delay is not theirs to influence. The counterparty risk sits with the supplier, who chose the driver, and it is carried visibly: the amount appears as `CreditProfile.inTransitRepayments` to the merchant, `DriverEarning.cashInCustody` to the driver, and an `"in_custody"` ledger entry to the supplier, all rendered with the `⏳` treatment. |
| 8 | `requestPayout` moved money with no destination field anywhere in `UserProfile` or `DriverEarning`, and a driver could withdraw earnings while holding the supplier's cash. | A payout destination is a `BeneficiaryAccount` registered through `registerPayoutBeneficiary` under step-up re-authentication, verified against the rail, held encrypted, returned only masked, and subject to a cooling period. `updateUserProfile` cannot write one. `DriverPayoutRequest.destination` freezes a `BeneficiarySnapshot` at submit time so a later change cannot retarget an approved payout. `requestPayout` refuses with `CASH_IN_CUSTODY_OUTSTANDING` while `cashInCustody` is above zero, and reserves the amount rather than deducting it. `reviewPayoutRequest` nets off any `cashRecoverable` from a confirmed shortfall. |
| 9 | `processPayment` accepted a client-supplied `amount` and an optional signature, and had no idempotency on a gateway callback. | `createPaymentIntent` prices every payment server-side, mints a `PaymentTransaction` for the attempt, and returns only a gateway order id; `processPayment` takes no amount at all, requires the signature on both the Callable and webhook paths, rejects an amount that disagrees with the intent as `AMOUNT_MISMATCH`, consumes a `gatewayPaymentId` exactly once across all transactions, and de-duplicates on the provider event id so a retried webhook cannot relieve a credit line twice. |
| 10 | Supplier approval of a payout was drawn as "Approved and paid" with an optional UTR field, which let one actor authorise a transfer and declare it settled in the same tap, with no provider confirmation and no way to distinguish the two acts afterwards. | Approval and disbursement are separated across four actors. `reviewPayoutRequest` creates a `PayoutTransaction` at `approved` and moves nothing. `initiatePayoutTransfer` is server-only. `recordPayoutSettlement` applies the rail's confirmation and is refused without a UTR. Manual bank transfer survives only as a controlled fallback, where `verifyManualPayout` requires a second actor to re-enter the UTR blind. A failure or reversal releases the reservation; a retry is a new transaction with a new provider reference. |
| 11 | A refund edited the order's payment status and left the issued tax invoice standing, so a refunded buyer held an invoice showing GST that the platform had returned. | `refundOrder` creates a `RefundTransaction` and `issueCreditNote` raises a GST credit note from a gapless per-financial-year series. An issued invoice is never edited or withdrawn. Refunds above the configured ceiling require a second Support approver who did not raise them. |
| 12 | Nothing tied platform records to what the provider and the bank actually did, so a payment captured against an order the platform failed to persist, or a payout the platform believed completed with no bank debit behind it, would never surface. | `runReconciliation` performs a daily three-way match across platform records, provider reports, and bank statements, opening a `ReconciliationException` for every break rather than adjusting silently. `closeAccountingPeriod` locks a period against back-dated writes and is refused while breaks remain open. Reopening is Admin-only and counted. |
| 13 | Finance capability was implied by `SubscriptionPlan.features`, a display-only string array that granted nothing and was enforced nowhere. | `SubscriptionPlan.entitlements` carries typed `FinanceEntitlement` keys with optional `entitlementLimits`, resolved through `getEntitlements` and re-checked server-side on every finance endpoint. `features` remains pricing-card copy. Baseline entitlements — own dashboard, standard reports, self-service payouts — are granted on every plan and in every degraded subscription state, so no billing condition can stand between a party and their own money. |

A fourteenth, smaller decision follows from #2: a gig requires merchants, so `Gig.merchantIds` and `ComposeGigRequest.merchantIds` are mandatory, and `composeGig` rejects merchants that belong to another supplier or sit off the selected route.

| # | Contradiction | Resolution |
| - | ------------- | ---------- |
| 15 | One PWA bundle would ship Support and supplier chrome to every buyer; five isolated web apps would copy Auth, `/v1`, and the alias switch five times without a real browser boundary. | **Five HTML entries, one Vite kernel, one Firebase web app per alias** (`/`, `/m/`, `/d/`, `/s/`, `/x/`). Screens never read `import.meta.env`. A Support-only origin needs a dated amendment in `constitution/Logikchain_Architecture.md` §2a. Five `package.json`s are forbidden. |
| 16 | A driver-capable PWA would invite a service-worker outbox and a second `DRV-03`. | **`vehicle` official client remains Android.** `/d/` is read-only plus Play handoff. `CLIENT_NOT_OFFICIAL` on gig/custody mutations. UX may still be tailored per entry; official-client enforcement is not relaxed. |
| 17 | A hand-rolled service worker can cache `/v1` and invent a retry. | **`vite-plugin-pwa` only.** App shell precached. `/v1/**`, Firestore, and Auth are NetworkOnly. No `public/sw.js`. |
| 18 | A UI environment switcher lets a `prod` build retarget `dev`. | **Vite `--mode` is the only backend switch.** `web/.env.development` / `.env.test` / `.env.production` / `.env.emulator`. `.env.local` may overlay local Functions (`REACT_APP_USE_LOCAL_FUNCTIONS`) and must not set `FIREBASE_PROJECT_ALIAS`. Production builds ignore that overlay. |
| 19 | Handler files importing each other (`orders` → `payments`) break module resolution and hide cycles. | Shared internals live in `functions/src/lib/` (e.g. `paymentIntent`). Domain handlers do not import siblings. Runtime is Node 20 TypeScript, 2nd gen only. |
