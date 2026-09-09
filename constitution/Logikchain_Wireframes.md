# Logikchain Mobile Wireframes

Portrait-primary PWA layouts (360px class). The PWA is five role entries on one kernel (`/`, `/m/`, `/d/`, `/s/`, `/x/` — `constitution/Logikchain_Architecture.md` §2a). Bottom navigation is for business tasks only. Profile and account settings are always in the **top-right avatar**. Interactions that create or edit records use **bottom sheets**. Cards are tappable. FAB is bottom-right, above the nav bar.

Wireframes live in the [`constitution/wireframes/`](wireframes/) folder. Read the three foundation files first: they define the tokens, the screen IDs, and the states that every role file assumes.

## Foundations

| File | Contents |
| ---- | -------- |
| [Foundations.md](wireframes/Foundations.md) | Design tokens, type scale, contrast-checked palette, 8pt spacing, 48x48 touch targets, 360px grid, component inventory, `en-IN` currency and IST date formatting, low-literacy and voice patterns |
| [Navigation.md](wireframes/Navigation.md) | Per-role IA maps, route table, back and deep-link behaviour, and the **authoritative screen ID registry** mapping every screen to its Cloud Functions and E2E flow |
| [Patterns.md](wireframes/Patterns.md) | The state matrix every screen must satisfy, global error pages, the AI assistant pattern, the shared **custody handover verification** and **cash custody and reconciliation** patterns, and the shared **GST tax invoice** layout |

## Role files

| File | Role | Bottom nav | Screen IDs |
| ---- | ---- | ---------- | ---------- |
| [Shared.md](wireframes/Shared.md) | Chrome, auth, OTP, profile, notifications, overlays | — | `SHR-00` … `SHR-15` |
| [Buyer.md](wireframes/Buyer.md) | Buyer | Home · Cart · Orders | `BUY-01` … `BUY-12.5` |
| [Merchant.md](wireframes/Merchant.md) | Merchant | Gigs · Orders · Credit | `MER-01` … `MER-12` |
| [Driver.md](wireframes/Driver.md) | Vehicle (Driver) | Gigs · Tracking · Earnings | `DRV-01` … `DRV-10.3` |
| [Supplier.md](wireframes/Supplier.md) | Supplier | Dashboard · Gigs · Inventory · Finance | `SUP-01` … `SUP-16.3` |
| [Support.md](wireframes/Support.md) | Support | Ops · Users · Config · Search | `SPT-01` … `SPT-24` |

## Screen IDs

Screens are identified by a role prefix and a two-digit number; sub-states, variants, and sheets that belong to a screen take a decimal suffix (`BUY-12.1` is the invoice view belonging to buyer order detail `BUY-12`). An ID is stable for the life of the product even if the screen moves in the navigation, so specs, tickets, and E2E tests cite the ID rather than a screen title.

[Navigation.md](wireframes/Navigation.md) is the registry. A new screen is added there — with the Cloud Functions it calls and the E2E flow it belongs to — before it is drawn in a role file.

## Two rules that apply to every screen

1. **The state matrix is mandatory.** Loading, empty, inline error, full-page error, offline, queued, and disabled are specified in [Patterns.md](wireframes/Patterns.md). A screen drawn only in its happy path is not specified. Role files draw only the role-specific variants.
2. **Every button needs a backing contract.** A control that mutates server state must name a Cloud Function that exists in [Logikchain_API_Specifications.md](Logikchain_API_Specifications.md), and the registry's coverage check must list it.

## Responsive stance

The 360px column is canonical for all six role files. Support is the one role with a desktop layout, because it authors dial-code regexes, plan caps, tariff windows, and seven-criterion eligibility rules — desk tasks that do not belong on a phone. `SPT-18` defines the 768px and 1024px breakpoints, and no field is gained or lost between them.

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
