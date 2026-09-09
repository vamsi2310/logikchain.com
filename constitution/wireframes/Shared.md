# Shared wireframes

Portrait-primary PWA layouts (360px class). Bottom navigation is for business tasks only. Profile and account settings are always in the **top-right avatar**. Interactions that create or edit records use **bottom sheets**. Cards are tappable. FAB is bottom-right, above the nav bar.

See also: [Shared](Shared.md) · [Buyer](Buyer.md) · [Merchant](Merchant.md) · [Driver](Driver.md) · [Supplier](Supplier.md) · [Support](Support.md)

Foundations: [Foundations.md](Foundations.md) (tokens, targets, formatting) · [Navigation.md](Navigation.md) (screen ID registry, routes, deep links) · [Patterns.md](Patterns.md) (state matrix, error pages, AI pattern, GST tax invoice)

**Legend**


| Symbol        | Meaning                                      |
| ------------- | -------------------------------------------- |
| `[ btn ]`     | Primary or secondary button                  |
| `( )` / `(x)` | Radio / checkbox                             |
| `...`         | Overflow / more                              |
| `👤`          | Profile (header)                             |
| `+`           | Floating action button                       |
| `━━━━`        | Sheet drag handle                            |
| `⚠`           | Warning / offline / GPS banner               |
| `[bell n]`    | Notification bell with unread count (header) |
| `[speak]`     | Voice affordance — reads the screen aloud    |
| `[ on ]`      | Toggle switch, on / off                      |


**Screen registry**

Stable IDs per [Navigation.md](Navigation.md). Sub-IDs (`SHR-04.1`) are states or child screens of their parent.


| ID       | Screen                                | Notes                                                     |
| -------- | ------------------------------------- | --------------------------------------------------------- |
| SHR-00   | Shared chrome                         | Header, banner, body, FAB, bottom nav                     |
| SHR-01   | Splash / auth and claims bootstrap    | Entry point for every launch                              |
| SHR-01.1 | Session expiry / re-authenticate      | Token refresh failed mid-session                          |
| SHR-02   | Login / Register                      | Phone or Google; self-register defaults to Buyer          |
| SHR-03   | Pre-auth language picker              | Reachable before sign-in from SHR-01 and SHR-02           |
| SHR-04   | OTP verification                      | Firebase Phone Auth                                       |
| SHR-04.1 | OTP invalid code                      | `auth/invalid-verification-code`, `auth/code-expired`     |
| SHR-04.2 | OTP too many attempts                 | `auth/too-many-requests`                                  |
| SHR-04.3 | OTP resend exhausted                  | Resend budget spent                                       |
| SHR-05   | Account unauthorized                  | `UserStatus: "unauthorized"`                              |
| SHR-06   | Role-change splash                    | Custom claims changed since last launch                   |
| SHR-07   | Profile                               | Opened from header `[👤]`                                 |
| SHR-07.1 | Edit profile                          | `name`, `address`                                         |
| SHR-07.2 | Logout confirm                        | Bottom sheet                                              |
| SHR-08   | Notification center                   | Backs the header `[bell n]`                               |
| SHR-08.1 | Notification settings                 | Per-category delivery toggles                             |
| SHR-09   | Credential changes                    | Group heading                                             |
| SHR-09.1 | Change password                       | Hidden for phone-only and Google-only accounts            |
| SHR-09.2 | Change email                          | Verify-before-update                                      |
| SHR-09.3 | Change phone                          | Country picker + OTP                                      |
| SHR-10   | Device permissions manager            | Writes `UserProfile.permissions`                          |
| SHR-11   | Language, voice and audio UI          | In-app counterpart of SHR-03                              |
| SHR-12   | Offline and sync center               | Queued writes, failed uploads, cache                      |
| SHR-13   | App install and updates               | PWA distribution                                          |
| SHR-13.1 | Install prompt (Android / Chromium)   | `beforeinstallprompt`                                     |
| SHR-13.2 | Add to Home Screen (iOS Safari)       | Manual instructions, no install event                     |
| SHR-13.3 | Update available                      | New service worker waiting                                |
| SHR-14   | Help and contact                      | Tap-to-call supplier, merchant, support                   |
| SHR-15   | Terms, privacy and consent            | Acceptance gate and consent toggles                       |
| SHR-OV   | Shared overlays and edge cases        | Timeout, GPS, breakdown, disassociation, plan limit       |


Every screen below must also satisfy the loading, empty, error, offline, queued and disabled states defined in [Patterns.md](Patterns.md), and must carry the **Data** block from [Patterns.md](Patterns.md) §1A (what Firestore paints, what each control calls). Those states are not redrawn here; only the deviations are. Header chrome (`🔊` `🔔` `👤`) is specified once in that section and is not repeated on other screens. `SHR-07`, `SHR-08`, and `SHR-11` *are* that chrome and must list those reads and clicks. The GST tax invoice referenced by `[ Invoice view / download ]` in the role files is also a shared component in [Patterns.md](Patterns.md).

---

## SHR-00. Shared chrome

```
┌──────────────────────────────────┐
│  LOGIKCHAIN   [speak][bell 3][👤]│  Header: title left; voice, bell, profile right
├──────────────────────────────────┤
│  ⚠ Offline: data may be outdated │  Optional persistent banner
├──────────────────────────────────┤
│                                  │
│           PAGE BODY              │  Cards / lists / forms
│                                  │
│                          [ + ]   │  FAB when the screen can create
├──────────────────────────────────┤
│  (tab)  (tab)  (tab)  (tab)      │  Bottom nav — role specific
└──────────────────────────────────┘
```

**Header variants**

```
┌──────────────────────────────────┐
│  LOGIKCHAIN   [speak][bell 3][👤]│  Unread notifications
├──────────────────────────────────┤
│  LOGIKCHAIN     [speak][bell][👤]│  No unread
├──────────────────────────────────┤
│  LOGIKCHAIN           [bell][👤] │  Voice off in Language & voice
├──────────────────────────────────┤
│  ←  Screen title      [bell][👤] │  Child screen: back replaces title
└──────────────────────────────────┘
```

**Actions**


| Control     | Result                                                                              |
| ----------- | ------------------------------------------------------------------------------------ |
| `[speak]`   | Reads the screen's heading, primary values and primary action aloud in the active language (SHR-11) |
| `[bell n]`  | Notification center (SHR-08); `n` is unread count, hidden at zero, capped at `9+`   |
| `[👤]`      | Profile (SHR-07)                                                                    |
| `←`         | Back per the history rules in [Navigation.md](Navigation.md)                        |
| `⚠` banner  | Tapping opens Offline and sync center (SHR-12)                                      |

The bell is present on every top-level screen for every role, including pre-setup screens. `[speak]` is hidden when **Read screens aloud** is off. Both sit left of `[👤]` so the avatar stays the right-most target. All three are 48x48px targets per [Foundations.md](Foundations.md).

**Bottom nav by role**


| Role     | Tabs                                   |
| -------- | -------------------------------------- |
| Buyer    | Home · Cart · Orders                   |
| Merchant | Gigs · Orders · Credit                 |
| Vehicle  | Gigs · Tracking · Earnings             |
| Supplier | Dashboard · Gigs · Inventory · Finance |
| Support  | Hubs · Suppliers · Config · Search     |


---

## Auth and onboarding

Splash, login, OTP and account-state screens are shared. Role-specific setup lives in each role file: [Buyer](Buyer.md) · [Merchant](Merchant.md) · [Driver](Driver.md) · [Supplier](Supplier.md).

### SHR-01. Splash / auth and claims bootstrap

Every launch enters here, including launches from the installed PWA icon and from a push deep link.

**Data**

| Shown | Source |
| ----- | ------ |
| Locale of splash copy | `local` (`lc.locale`) |
| App version line | `local` (build) |
| Auth session / custom claims | `Auth` (`onAuthStateChanged`, `getIdTokenResult(true)`) |
| Role and `status` for routing | `FS get /UserProfiles/{uid}` |

| Control | On click |
| ------- | -------- |
| `[ A/अ ▾ ]` | `nav SHR-03` |
| `[ Retry ]` (timeout) | re-run bootstrap |

```
┌──────────────────────────────────┐
│                       [ A/अ ▾ ]  │
│                                  │
│                                  │
│            LOGIKCHAIN            │
│      Rural logistics platform    │
│                                  │
│              ● ● ●               │
│         Checking account...      │
│                                  │
│                                  │
│                                  │
│  v1.4.0 · works offline          │
└──────────────────────────────────┘
```

**Bootstrap sequence**

1. Service worker takes control and serves the cached app shell (cache-first).
2. Restore the stored locale (`lc.locale`) so the splash and everything after it render in the user's language.
3. `onAuthStateChanged` resolves the Firebase session.
4. `getIdTokenResult(true)` force-refreshes custom claims so a role upgrade made by a Supplier is seen on this launch.
5. Read `UserProfile` (cache first, then server) for `role` and `status`.
6. Route.

**Routing**


| Condition                                            | Destination                                            |
| ---------------------------------------------------- | ------------------------------------------------------ |
| No session                                           | Login (SHR-02)                                         |
| Session valid, `status: "unauthorized"`              | Account unauthorized (SHR-05)                          |
| Claim `role` differs from the last launch            | Role-change splash (SHR-06)                            |
| Session valid, `status: "approved"`, setup incomplete | Role setup in the role file                            |
| Session valid, `status: "approved"`, setup complete  | Role home                                              |
| Deep link present and session valid                  | Target screen per [Navigation.md](Navigation.md)       |
| Token refresh rejected                               | Session expiry (SHR-01.1)                              |
| Offline with a cached session                        | Role home with the `⚠` offline banner; claims refresh is deferred |
| Offline with no cached session                       | Login (SHR-02) with sign-in disabled and the offline banner |
| No response in 15s                                   | Timeout state per [Patterns.md](Patterns.md), with `[ Retry ]` |

The splash holds for at most 15 seconds. `[ A/अ ▾ ]` opens the pre-auth language picker (SHR-03); it is the only control on this screen.

### SHR-01.1. Session expiry / re-authenticate

Shown when the refresh token is revoked or expired while the app is open, and for operations that Firebase rejects with `auth/requires-recent-login` (password, email and phone changes, and account deletion).

**Data**

| Shown | Source |
| ----- | ------ |
| Signed-in phone / Google identity | `Auth` current user |
| Cart / queued-writes note | `local` outbox keyed by uid |

| Control | On click |
| ------- | -------- |
| Send OTP to continue | `Auth` phone OTP → `nav SHR-04`; on success `Fn registerDeviceToken` then return to the interrupted route |
| Continue with Google | `Auth` Google re-auth, then `Fn registerDeviceToken` |
| Use another account | `Auth` sign-out; discard other-user outbox after confirm; `nav SHR-02` |

```
┌──────────────────────────────────┐
│  Session expired                 │
├──────────────────────────────────┤
│                                  │
│  ⚠ You were signed out           │
│                                  │
│  Sign in again to continue.      │
│                                  │
│  Signed in as                    │
│  +91 98765 43210                 │
│                                  │
│  [   Send OTP to continue   ]    │
│                                  │
│  [ Use another account ]         │
│                                  │
│  Your cart and unsent updates    │
│  stay on this device.            │
└──────────────────────────────────┘
```

**Actions**


| Control             | Result                                                                    |
| ------------------- | --------------------------------------------------------------------------- |
| Send OTP to continue | OTP (SHR-04) for the same number; on success returns to the screen that was interrupted |
| Use another account | Clears the session and opens Login (SHR-02). Queued writes for the old user are discarded after a confirm sheet |
| Back / dismiss      | Not available. This screen is modal over the app                          |

Locally persisted cart and queued writes are keyed by user id, so they survive re-authentication as the same user. Re-auth for a Google account swaps the OTP button for `[ Continue with Google ]`.

### SHR-02. Login / Register

Self-register defaults to **Buyer**. Support and Supplier cannot self-register. Merchants and Drivers arrive here after upgrade and skip buyer setup.

**Data**

| Shown | Source |
| ----- | ------ |
| Country picker (prefix, length) | `Fn listConfigurationCatalog` — active Countries |
| Phone field | `local` |
| Locale of copy | `local` (`lc.locale`) |

| Control | On click |
| ------- | -------- |
| `[ A/अ ▾ ]` | `nav SHR-03` |
| `[speak]` | `local` — read labels and sign-in options |
| Country ▾ | `local` selection from the catalog |
| Send OTP | `Auth` Firebase Phone Auth → `nav SHR-04` |
| Continue with Google | `Auth` Google → Buyer if new, else role home |

```
┌──────────────────────────────────┐
│  [speak]              [ A/अ ▾ ]  │
│            LOGIKCHAIN            │
│      Rural logistics Platform    │
├──────────────────────────────────┤
│                                  │
│  Country                         │
│  ┌────────────────────────────┐  │
│  │ India (+91)             ▾  │  │
│  └────────────────────────────┘  │
│                                  │
│  Mobile number                   │
│  ┌────────────────────────────┐  │
│  │ +91  │ 98765 43210         │  │
│  └────────────────────────────┘  │
│                                  │
│         [  Send OTP  ]           │
│                                  │
│  ─────────── or ───────────      │
│                                  │
│      [  Continue with Google ]   │
│                                  │
│  are you a Supplier?             │
│ contact support to create account│
│                                  │
└──────────────────────────────────┘
```

**Actions**


| Control              | Result                                                                     |
| -------------------- | -------------------------------------------------------------------------- |
| `[ A/अ ▾ ]`          | Pre-auth language picker (SHR-03)                                          |
| `[speak]`            | Reads the two field labels and both sign-in options aloud                  |
| Country ▾            | Sheet of **active** Countries from catalog; sets `mobilePrefix` and length |
| Phone field          | Prefills prefix; rejects wrong length / regex                              |
| Send OTP             | Firebase Phone Auth → OTP screen                                           |
| Continue with Google | Firebase Google Auth → Buyer if new, else role home                        |
| Invalid phone        | Inline error: does not match country prefix/length                         |
| Offline              | Both sign-in buttons disabled with the `⚠` banner. Authentication is network-only |
| First-time sign-up   | Consent gate (SHR-15) is shown before the account is created               |

### SHR-03. Pre-auth language picker

A user who cannot read English must be able to change language **before** signing in. Reachable from SHR-01 and SHR-02 via `[ A/अ ▾ ]`, and from the unauthorized screen (SHR-05).

**Data**

| Shown | Source |
| ----- | ------ |
| Language rows | `local` / `static` (app-shell bundles) |
| Selected locale | `local` (`lc.locale`); default `navigator.language` |

| Control | On click |
| ------- | -------- |
| `[speak]` | `local` — speak that row's language name |
| Radio | `local` — re-render immediately |
| Save | `local` write `lc.locale`; after sign-in `Fn updateUserProfile` `{ locale }` |
| `←` | `nav` back — no write |

```
┌──────────────────────────────────┐
│  ←  Language / भाषा              │
├──────────────────────────────────┤
│                                  │
│  ( ) English              [speak]│
│                                  │
│  ( ) हिंदी   Hindi        [speak]│
│                                  │
│  (•) తెలుగు   Telugu      [speak]│
│                                  │
│  ( ) ಕನ್ನಡ   Kannada      [speak]│
│                                  │
│  ( ) தமிழ்   Tamil        [speak]│
│                                  │
│  ( ) मराठी   Marathi      [speak]│
│                                  │
│         [  Save  ]               │
└──────────────────────────────────┘
```

Each row carries the endonym in its own script first and the English name second, so selection does not require reading Latin script. Box padding above is counted in code points, not rendered glyph width.

**Actions**


| Control   | Result                                                                                  |
| --------- | ---------------------------------------------------------------------------------------- |
| `[speak]` | Plays "this is Telugu" in that language, so a non-reader can identify the row by ear     |
| Radio     | Selects the language; the screen re-renders immediately in it                            |
| Save      | Writes `lc.locale` to `localStorage` and returns. After sign-in the value is mirrored to the user profile |
| `←`       | Returns without changing the language                                                    |

The default is the browser's `navigator.language` when it matches a supported locale, otherwise English. The offered set is English, Hindi and the regional languages of the active deployment hub. This screen must work with no session and no network: language bundles ship in the app shell and are cache-first.

### SHR-04. OTP verification

**Data**

| Shown | Source |
| ----- | ------ |
| Masked phone | `Auth` verification session |
| Digit boxes / cooldown | `local` |
| Autofill | `local` Web OTP API |

| Control | On click |
| ------- | -------- |
| Verify | `Auth` confirm OTP; on success `Fn registerDeviceToken` then role setup / home |
| Resend OTP | `Auth` resend (client + Firebase budgets) |
| `←` | `nav SHR-02` |

```
┌──────────────────────────────────┐
│  ←  Verify phone                 │
├──────────────────────────────────┤
│                                  │
│  Code sent to +91 98765 43210    │
│                                  │
│     [ _ ] [ _ ] [ _ ] [ _ ]      │
│     [ _ ] [ _ ]                  │
│                                  │
│         [  Verify  ]             │
│                                  │
│  Resend OTP in 0:24              │
│                                  │
└──────────────────────────────────┘
```

**Actions:** Verify → approved Buyer → [Buyer Setup](Buyer.md). Resend after cooldown. Back → Login (SHR-02).

Budgets, enforced client-side and by Firebase: **5** verification attempts per code, **3** resends per number per hour, 30-second resend cooldown that doubles after each resend (0:30, 1:00, 2:00). SMS autofill uses the Web OTP API when the browser supports it (SHR-10).

#### SHR-04.1. Invalid code

**Data** — same as `SHR-04`. Attempt counter is `local`.

| Control | On click |
| ------- | -------- |
| Verify | `Auth` re-submit |
| Resend OTP | `Auth` new code; resets the attempt counter |

```
┌──────────────────────────────────┐
│  ←  Verify phone                 │
├──────────────────────────────────┤
│                                  │
│  Code sent to +91 98765 43210    │
│                                  │
│     [4] [1] [9] [2] [0] [7]      │
│                                  │
│  ⚠ Wrong code. 2 of 5 tries left │
│                                  │
│         [  Verify  ]             │
│                                  │
│  Resend OTP in 0:24              │
│                                  │
└──────────────────────────────────┘
```

**Actions**


| Control       | Result                                                                    |
| ------------- | --------------------------------------------------------------------------- |
| Verify        | Re-submits; the boxes shake, clear, and focus returns to the first digit   |
| Resend OTP    | Enabled at 0:00; resets the attempt counter and issues a new code          |
| 5th wrong try | Too many attempts (SHR-04.2)                                               |

`auth/code-expired` uses the same layout with "This code expired. Ask for a new one." and enables `[ Resend OTP ]` immediately without spending a resend.

#### SHR-04.2. Too many attempts

**Data** — same session as `SHR-04`. Lock countdown is advisory from `Auth` (`auth/too-many-requests`).

| Control | On click |
| ------- | -------- |
| Continue with Google | `Auth` Google |
| Call support | `tel:` platform support number (`SHR-14`) |

```
┌──────────────────────────────────┐
│  ←  Verify phone                 │
├──────────────────────────────────┤
│                                  │
│  ⚠ Too many attempts             │
│                                  │
│  This number is locked for       │
│  30 minutes.                     │
│                                  │
│  Try again after 11:42 AM        │
│                                  │
│  [    Continue with Google    ]  │
│                                  │
│  [ Call support ]                │
│                                  │
│  Code: auth/too-many-requests    │
└──────────────────────────────────┘
```

The lock is imposed by Firebase Abuse Prevention on the number and, in some cases, on the device. The countdown is advisory: `[ Verify ]` and `[ Resend OTP ]` stay disabled until the server accepts a new request. `[ Call support ]` is a `tel:` link to the platform support number (SHR-14).

#### SHR-04.3. Resend exhausted

**Data** — same as `SHR-04`. Resend budget is `local` per number per hour.

| Control | On click |
| ------- | -------- |
| Verify | `Auth` confirm the last valid code |
| Continue with Google | `Auth` Google |
| Call support | `tel:` platform support number |

```
┌──────────────────────────────────┐
│  ←  Verify phone                 │
├──────────────────────────────────┤
│                                  │
│  Code sent to +91 98765 43210    │
│                                  │
│     [ _ ] [ _ ] [ _ ] [ _ ]      │
│     [ _ ] [ _ ]                  │
│                                  │
│         [  Verify  ]             │
│                                  │
│  ⚠ No resends left (3 of 3 used) │
│  Next resend after 1:00:00       │
│                                  │
│  [    Continue with Google    ]  │
│  [ Call support ]                │
└──────────────────────────────────┘
```

The last code stays valid, so `[ Verify ]` remains enabled while attempts remain. Leaving and returning to Login does not refill the resend budget; it is tracked per number per rolling hour.

### SHR-05. Account unauthorized

Shown when the profile resolves with `status: "unauthorized"`. All roles are approved on creation, so this state is reached only when Support or a Supplier withdraws access — see the Support user detail screen in [Support.md](Support.md).

**Data**

| Shown | Source |
| ----- | ------ |
| Name, phone, `status` | `FS get /UserProfiles/{uid}` |
| Locale control | `local` |

| Control | On click |
| ------- | -------- |
| Call support | `tel:` platform support number |
| Check again | `FS get /UserProfiles/{uid}` (server); `approved` → role home |
| Logout | `nav SHR-07.2` |
| `[ A/अ ▾ ]` | `nav SHR-03` |

```
┌──────────────────────────────────┐
│                       [ A/अ ▾ ]  │
│                                  │
│  ⚠ Account not active            │
│                                  │
│  Anil Kumar                      │
│  +91 98765 43210                 │
│  Status: unauthorized            │
│                                  │
│  This account cannot be used     │
│  right now. Contact support or   │
│  your supplier to restore it.    │
│                                  │
│  [ Call support ]                │
│  [ Check again ]                 │
│  [ Logout ]                      │
└──────────────────────────────────┘
```

**Actions**


| Control      | Result                                                                                |
| ------------ | ---------------------------------------------------------------------------------------- |
| Call support | `tel:` link to the platform support number                                             |
| Check again  | Re-reads `UserProfile.status` from the server; on `approved` continues to the role home |
| Logout       | Logout confirm (SHR-07.2), then Login (SHR-02)                                         |
| `[ A/अ ▾ ]`  | Pre-auth language picker (SHR-03), so the message can be read in the user's language   |

The session is left signed in so `[ Check again ]` can poll. No bottom nav, no bell, no other navigation: this screen is a dead end by design. Cached business data is not shown. Queued writes are held, not sent.

### SHR-06. Role-change splash (upgrade detected)

**Data**

| Shown | Source |
| ----- | ------ |
| Previous role | `local` / `cache` last-launch claim |
| New role + `status` | `Auth` custom claims + `FS get /UserProfiles/{uid}` |

| Control | On click |
| ------- | -------- |
| Continue setup | `nav` role setup (Merchant / Driver) |

```
┌──────────────────────────────────┐
│                                  │
│         Your role changed        │
│                                  │
│     Buyer  →  Merchant           │
│     Status: approved             │
│                                  │
│      [  Continue setup  ]        │
│                                  │
└──────────────────────────────────┘
```

**Actions:** App refresh/open detects custom claims → this screen → [Merchant](Merchant.md) or [Driver](Driver.md) setup. No extra approval step.

Reached from step 4 of the SHR-01 bootstrap. The buyer's cart and order history are preserved; only the navigation shell changes.

---

## Profile and settings (all roles)

### SHR-07. Profile

Opened from header `[👤]`. Not a bottom-nav tab. This screen *is* the avatar chrome.

**Data**

| Shown | Source |
| ----- | ------ |
| Voice `🔊` | `local` (speech synthesis; hidden when Read screens aloud is off) |
| Bell badge | `FS query /Notifications` where `recipientId == uid` and `read != true`, count only |
| Avatar (this screen) | `FS get /UserProfiles/{uid}` |
| Name, role, status, phone, email | same get; phone/email also `Auth` |
| Permissions `⚠` | same get → `permissions` any `false` |
| Offline & sync count | `local` outbox |
| Install row | `local` (`display-mode: standalone` hides it) |
| App version | `local` (build) |

| Control | On click |
| ------- | -------- |
| Voice | `local` — read the screen aloud |
| Bell | `nav SHR-08` |
| Avatar | — (this screen) |
| Edit profile | `nav SHR-07.1` |
| Change password | `nav SHR-09.1` |
| Change phone | `nav SHR-09.3` |
| Change email | `nav SHR-09.2` |
| Notifications | `nav SHR-08` |
| Language & voice | `nav SHR-11` |
| Permissions | `nav SHR-10` |
| Offline & sync | `nav SHR-12` |
| Install app | `nav SHR-13.1` or `SHR-13.2` |
| Help & contact | `nav SHR-14` |
| Terms & privacy | `nav SHR-15` |
| Logout | `nav SHR-07.2` |

```
┌──────────────────────────────────┐
│  ←  Profile           [bell 3]   │
├──────────────────────────────────┤
│  ┌────────────────────────────┐  │
│  │  Anil Kumar                │  │
│  │  Buyer · approved          │  │
│  │  +91 98765 43210           │  │
│  │  buyer1@logikchain.com     │  │
│  └────────────────────────────┘  │
│                                  │
│  Account                         │
│  [ Edit profile          > ]     │
│  [ Change password       > ]     │
│  [ Change phone          > ]     │
│  [ Change email          > ]     │
│                                  │
│  App                             │
│  [ Notifications       3 > ]     │
│  [ Language & voice      > ]     │
│  [ Permissions         ⚠ > ]     │
│  [ Offline & sync      2 > ]     │
│  [ Install app           > ]     │
│                                  │
│  Help                            │
│  [ Help & contact        > ]     │
│  [ Terms & privacy       > ]     │
│                                  │
│  [ Logout ]                      │
│  v1.4.0 (build 214)              │
└──────────────────────────────────┘
```

**Row visibility**


| Row              | Shown when                                                                    |
| ---------------- | ------------------------------------------------------------------------------- |
| Change password  | The account has an email/password credential. Hidden for phone-only and Google-only accounts (SHR-09.1) |
| Change email     | Always. For phone-only accounts this **adds** an address rather than replacing one |
| Change phone     | Always                                                                         |
| Permissions      | Always. Shows `⚠` when any permission in `UserProfile.permissions` is `false`  |
| Offline & sync   | Always. Shows the queued-write count when greater than zero                    |
| Install app      | Hidden once the app runs in `standalone` display mode                          |

**Actions**


| Control          | Result                                     |
| ---------------- | -------------------------------------------- |
| Edit profile     | SHR-07.1                                   |
| Change password  | SHR-09.1                                   |
| Change phone     | SHR-09.3                                   |
| Change email     | SHR-09.2                                   |
| Notifications    | SHR-08                                     |
| Language & voice | SHR-11                                     |
| Permissions      | SHR-10                                     |
| Offline & sync   | SHR-12                                     |
| Install app      | SHR-13.1 or SHR-13.2 depending on browser  |
| Help & contact   | SHR-14                                     |
| Terms & privacy  | SHR-15                                     |
| Logout           | SHR-07.2                                   |

Role-specific rows are appended by the role files: managing supplier and shop details for Merchants, vehicle profile for Drivers, subscription for Suppliers and Merchants.

A payout destination is not a profile field and does not appear here. It is money-movement custody, it is registered and verified through `registerPayoutBeneficiary`, and it lives on `DRV-08.3`, reached from Earnings rather than from Profile. `SHR-07.1` never renders an account number or a VPA input.

#### SHR-07.1. Edit profile

**Data**

| Shown | Source |
| ----- | ------ |
| Name, address | `FS get /UserProfiles/{uid}` |
| Draft fields | `local` |

| Control | On click |
| ------- | -------- |
| Save | `Fn updateUserProfile` `{ name, address }` — queueable offline |
| `←` | `nav SHR-07` |

```
┌──────────────────────────────────┐
│  ←  Edit profile                 │
├──────────────────────────────────┤
│  Name     [ Anil Kumar         ] │
│  Address  [ Door No 3-45...    ] │
│                                  │
│         [  Save  ]               │
└──────────────────────────────────┘
```

Phone and email are not editable here; they have their own verified flows (SHR-09.2, SHR-09.3). Save uses last-write-wins and is queueable offline: the row shows "Waiting to send" and appears in SHR-12 until it syncs.

#### SHR-07.2. Logout confirm sheet

**Data**

| Shown | Source |
| ----- | ------ |
| Unsent count | `local` outbox |

| Control | On click |
| ------- | -------- |
| Cancel | `local` dismiss sheet |
| Logout / Logout anyway | `Fn registerDeviceToken` `{ revoke: true }` then `Auth` sign-out; clear Firestore persistence cache |

```
┌──────────────────────────────────┐
│                                  │
│ ┌──────────────────────────────┐ │
│ │ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │ │
│ │ Logout?                      │ │
│ │ You can sign in again with   │ │
│ │ the same phone or Google.    │ │
│ │                              │ │
│ │ [ Cancel ]     [ Logout ]    │ │
│ └──────────────────────────────┘ │
└──────────────────────────────────┘
```

**Unsent-work variant**

```
┌──────────────────────────────────┐
│                                  │
│ ┌──────────────────────────────┐ │
│ │ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │ │
│ │ ⚠ 2 changes not sent yet     │ │
│ │ Logging out now discards     │ │
│ │ them. Connect and sync       │ │
│ │ first.                       │ │
│ │                              │ │
│ │ [ Cancel ]  [ Logout anyway ]│ │
│ └──────────────────────────────┘ │
└──────────────────────────────────┘
```

Logout clears the Firestore persistence cache and the FCM token registration for this device. The cart is kept, keyed by user id.

### SHR-08. Notification center

Backs the header `[bell n]`. Delivered by FCM through the background service worker; the same records render here when the app is open. This screen *is* the bell chrome.

**Data**

| Shown | Source |
| ----- | ------ |
| Voice `🔊` | `local` |
| Bell (this screen) | `FS query /Notifications` where `recipientId == uid`, ordered by `createdAt` desc |
| Avatar | `nav SHR-07` |
| Unread `●` | same query → `read != true` |
| Push-blocked banner | `local` (`navigator.permissions` notifications) |

| Control | On click |
| ------- | -------- |
| Voice | `local` — read the screen aloud |
| Bell | — (this screen) |
| Avatar | `nav SHR-07` |
| Notification card | `local` optimistic `read`; `FS write /Notifications/{id}` `{ read: true }` (rules allow recipient update of `read` only); then `nav` deep link |
| Mark all read | same write per unread row — no `markNotificationsRead` Function |
| `[ ... ]` settings | `nav SHR-08.1` |
| `[ Fix this ]` | `nav SHR-10` |
| Pull to refresh | re-run the query, bypass TTL |

```
┌──────────────────────────────────┐
│  ←  Notifications         [ ... ]│
├──────────────────────────────────┤
│  ⚠ Push is blocked in this       │
│    browser        [ Fix this ]   │
├──────────────────────────────────┤
│  Today                           │
│  ┌────────────────────────────┐  │
│  │ ● Order · Reached merchant │  │
│  │   INV-2408210001           │  │
│  │   21-08-2026, 10:28 AM     │  │
│  └────────────────────────────┘  │
│  ┌────────────────────────────┐  │
│  │ ● Gig · Ongole to Markapur │  │
│  │   Arriving at Karavadi     │  │
│  │   21-08-2026, 10:05 AM     │  │
│  └────────────────────────────┘  │
│  ┌────────────────────────────┐  │
│  │ ● Account · Role changed   │  │
│  │   You are now a Merchant   │  │
│  │   21-08-2026, 08:15 AM     │  │
│  └────────────────────────────┘  │
│                                  │
│  Earlier                         │
│  ┌────────────────────────────┐  │
│  │   Order · Delivered        │  │
│  │   INV-2408180044           │  │
│  │   18-08-2026, 04:12 PM     │  │
│  └────────────────────────────┘  │
│                                  │
│  [ Mark all read ]               │
└──────────────────────────────────┘
```

**Actions**


| Control             | Result                                                                        |
| ------------------- | -------------------------------------------------------------------------------- |
| Notification card   | Deep-links to the target screen for its type; marks that one read              |
| `●`                 | Unread marker. Rows without it are read                                        |
| `[ ... ]`           | Overflow: Mark all read · Notification settings (SHR-08.1)                     |
| `[ Fix this ]`      | Permissions manager (SHR-10) with the notification row focused                 |
| Pull to refresh     | Re-reads the notification collection                                           |
| Empty               | "No notifications yet" empty state per [Patterns.md](Patterns.md)              |
| Offline             | Renders from cache with the `⚠` banner; unread state is written locally and synced later |

**Notification taxonomy by role**


| Role     | Type              | Trigger                                        | Opens                     |
| -------- | ----------------- | ---------------------------------------------- | ------------------------- |
| Buyer    | Gig arriving      | `updateGigLocation` → `arriving` for the buyer's village | Order tracking       |
| Buyer    | Reached merchant  | `updateGigLocation` → `reached`; orders become `reached_merchant` | Order details |
| Buyer    | Delivered         | Driver marks the order delivered               | Order details             |
| Buyer    | Order suspended   | Merchant disassociation (SHR-OV-4)             | Order details             |
| Buyer    | Payment or refund | Payment failed, payment stuck pending past the escalation window, cash pending, refund initiated, refund credited, credit note issued | Order details, refund status |
| Merchant | Buyer order       | A buyer order lands for pickup at this shop    | Buyer pickup detail       |
| Merchant | Pending deliveries | Orders still awaiting pickup handover         | Orders list               |
| Merchant | Merchant order    | Merchant order reached or delivered            | Merchant order detail     |
| Merchant | Credit            | Credit limit request decided; payment due or overdue | Credit tab          |
| Merchant | Subscription      | `past_due`, `expired`, renewal due             | Subscription screen       |
| Driver   | Gig assigned      | A gig is composed with this vehicle            | Gig detail                |
| Driver   | Gig modified      | Route, date, pamphlet or merchant list changed | Gig detail                |
| Driver   | Gig suspended     | Support or Supplier suspends the gig           | Gig detail                |
| Driver   | Reassignment      | This driver takes over a suspended gig         | Gig detail                |
| Driver   | Payout            | Request approved, rejected, transfer sent, money credited with the bank reference, transfer failed with the reason, or a destination change entering or leaving its cooling period | Payout status and history |
| Supplier | Credit request    | A merchant requests a credit increase          | Credit approval queue     |
| Supplier | Payout request    | A driver requests a payout                     | Payout approval queue     |
| Supplier | Payout failed     | An approved transfer was returned by the bank and needs attention | Payout requests, "Needs attention" |
| Supplier | Merchant order    | A merchant places a bulk order                 | Merchant order detail     |
| Supplier | Gig completed     | `completeAndFinalizeGig` closes a gig          | Gig detail                |
| Supplier | Plan limit        | A cap is reached or breached (SHR-OV-5)        | Subscription / plans      |
| Supplier | Subscription      | `past_due`, `expired`, renewal due             | Subscription screen       |
| Support  | Village request   | A supplier requests a new village              | Village editor            |
| Support  | Suspended orders  | Orders suspended by a disassociation           | Suspended orders queue    |
| Support  | Account           | Role change, status change, provisioning       | User detail               |
| Support  | Money exception   | A payment past the pending escalation window, a failed payout, a suspected duplicate collection, a refund above the approval threshold | Payment and payout exceptions |
| Support  | Reconciliation    | A run finished with unresolved breaks, or an exception has aged past its SLA | Reconciliation workspace |
| Support  | Period close      | A period is due for close, or a close is blocked by open exceptions | Period close             |

Every role also receives **Account** notifications (role change, status change) and **App** notifications (a new version is available, handled by SHR-13.3).

#### SHR-08.1. Notification settings

**Data**

| Shown | Source |
| ----- | ------ |
| Master / category / sound toggles | `FS get /UserProfiles/{uid}` → `notificationPrefs` |
| Browser permission line | `local` (`navigator.permissions`) |

| Control | On click |
| ------- | -------- |
| Push master | `local`; if browser `denied` → `nav SHR-10` (cannot re-prompt) |
| Category / sound / read-aloud | `Fn updateUserProfile` `{ notificationPrefs }` — FCM honours muted categories before send |
| `←` | `nav SHR-08` |

```
┌──────────────────────────────────┐
│  ←  Notification settings        │
├──────────────────────────────────┤
│  Push notifications      [ on ]  │
│  Browser: allowed                │
│                                  │
│  Categories                      │
│  Orders and delivery     [ on ]  │
│  Gigs and tracking       [ on ]  │
│  Payments and credit     [ on ]  │
│  Account and role        [ on ]  │
│  Offers and promotions   [off ]  │
│                                  │
│  Sound                   [ on ]  │
│  Read aloud on arrival   [off ]  │
│                                  │
│  Account and role alerts cannot  │
│  be turned off.                  │
└──────────────────────────────────┘
```

Turning the master switch on when the browser permission is `denied` cannot re-prompt; the toggle stays off and links to SHR-10. Category preferences are stored on the profile and honoured server-side before a push is sent, so they also apply when the app is closed.

### SHR-09. Credential changes

**Data** — group. Children use `Auth` for the credential. `Fn updateUserProfile` only where the profile document must follow (`phone`, `email`, `countryId`).

#### SHR-09.1. Change password

**Data**

| Shown | Source |
| ----- | ------ |
| Current email | `Auth` |

| Control | On click |
| ------- | -------- |
| Update password | `Auth` re-auth + `updatePassword` (not a Function) |

```
┌──────────────────────────────────┐
│  ←  Change password              │
├──────────────────────────────────┤
│  Signed in with email            │
│  supplier1@logikchain.com        │
│                                  │
│  Current password                │
│  ┌────────────────────────────┐  │
│  │ ••••••••                   │  │
│  └────────────────────────────┘  │
│                                  │
│  New password                    │
│  ┌────────────────────────────┐  │
│  │                            │  │
│  └────────────────────────────┘  │
│  At least 8 characters           │
│                                  │
│  Confirm new password            │
│  ┌────────────────────────────┐  │
│  │                            │  │
│  └────────────────────────────┘  │
│                                  │
│  [   Update password   ]         │
└──────────────────────────────────┘
```

**Actions**


| Control                    | Result                                                              |
| -------------------------- | --------------------------------------------------------------------- |
| Update password            | Re-authenticates with the current password, then updates the credential |
| Wrong current password     | Inline error on the first field; the other two are untouched         |
| Weak password              | Inline error: at least 8 characters                                  |
| Mismatch                   | Inline error on Confirm                                              |
| `auth/requires-recent-login` | Session expiry / re-auth (SHR-01.1), returning here on success     |
| Offline                    | Button disabled with the `⚠` banner. Credential changes are network-only and are never queued |

**Hidden for accounts with no password**

Firebase Phone Auth and Google sign-in create no password credential, so there is nothing to change. Those accounts do not show the row at all, rather than showing a disabled one.

```
┌──────────────────────────────────┐
│  ←  Profile           [bell 3]   │
├──────────────────────────────────┤
│  Account                         │
│  [ Edit profile          > ]     │
│  [ Change phone          > ]     │
│  [ Change email          > ]     │
│                                  │
│  Signed in with phone. This      │
│  account has no password.        │
└──────────────────────────────────┘
```

In practice this means: Buyers, Merchants and Drivers (phone or Google) see no password row; Suppliers and Support, who are provisioned with an email address, do. If a phone-only user later verifies an email and sets a password, the row appears.

#### SHR-09.2. Change email

**Data**

| Shown | Source |
| ----- | ------ |
| Current email / verified | `Auth` + `FS get /UserProfiles/{uid}` → `email` |
| Pending address / countdown | `local` |

| Control | On click |
| ------- | -------- |
| Send verification link | `Auth` `verifyBeforeUpdateEmail`; `Fn updateUserProfile` `{ email }` only after confirmation |
| Resend / Cancel change | `Auth` / `local` |

```
┌──────────────────────────────────┐
│  ←  Change email                 │
├──────────────────────────────────┤
│  Current                         │
│  buyer1@logikchain.com           │
│  Verified                        │
│                                  │
│  New email                       │
│  ┌────────────────────────────┐  │
│  │ anil.kumar@example.com     │  │
│  └────────────────────────────┘  │
│                                  │
│  We send a link to the new       │
│  address. The change applies     │
│  only after you open that link.  │
│                                  │
│  [ Send verification link ]      │
└──────────────────────────────────┘
```

**Pending verification**

```
┌──────────────────────────────────┐
│  ←  Change email                 │
├──────────────────────────────────┤
│  ⚠ Verification pending          │
│                                  │
│  Link sent to                    │
│  anil.kumar@example.com          │
│  Expires in 59:12                │
│                                  │
│  Sign-in and notifications still │
│  use buyer1@logikchain.com until │
│  the link is opened.             │
│                                  │
│  [ Resend link ]                 │
│  [ Cancel change ]               │
└──────────────────────────────────┘
```

**Actions**


| Control                | Result                                                                |
| ---------------------- | ------------------------------------------------------------------------ |
| Send verification link | `verifyBeforeUpdateEmail`; the auth record and `UserProfile.email` change only on confirmation |
| Address already in use | Inline error; the address belongs to another account                   |
| Resend link            | One resend per 60 seconds, three per hour                              |
| Cancel change          | Drops the pending change; the current address stays                    |
| Offline                | Blocked, same as SHR-09.1                                              |

#### SHR-09.3. Change phone

Replaces the one-line note that used to stand in for this screen.

**Data**

| Shown | Source |
| ----- | ------ |
| Current phone | `Auth` + `FS get /UserProfiles/{uid}` → `phone` |
| Country picker | `Fn listConfigurationCatalog` — active Countries |

| Control | On click |
| ------- | -------- |
| Country ▾ | `local` until success |
| Send OTP | `Auth` Phone Auth → `nav SHR-04`; on success `Fn updateUserProfile` `{ phone, countryId }` |

```
┌──────────────────────────────────┐
│  ←  Change phone                 │
├──────────────────────────────────┤
│  Current                         │
│  +91 98765 43210                 │
│                                  │
│  Country                         │
│  ┌────────────────────────────┐  │
│  │ India (+91)             ▾  │  │
│  └────────────────────────────┘  │
│                                  │
│  New mobile number               │
│  ┌────────────────────────────┐  │
│  │ +91  │ 90000 12345         │  │
│  └────────────────────────────┘  │
│                                  │
│  You verify the new number with  │
│  an OTP. Sign-in then uses it.   │
│                                  │
│  [   Send OTP   ]                │
└──────────────────────────────────┘
```

**Actions**


| Control            | Result                                                                          |
| ------------------ | ---------------------------------------------------------------------------------- |
| Country ▾          | Sheet of **active** Countries; sets `mobilePrefix` and `phoneNumberLength`, and updates `UserProfile.countryId` on success |
| Invalid number     | Inline error: does not match the country's prefix, length or `phoneValidationRegex` |
| Send OTP           | OTP (SHR-04) against the new number, with the same failure states                |
| Number already in use | Error after verification: that number belongs to another account              |
| Success            | Updates the auth record and `UserProfile.phone` (last-write-wins), then returns to Profile with a confirmation toast |
| Offline            | Blocked, same as SHR-09.1                                                        |

Changing country here does not change the user's village, hub or merchant; those are geography records edited in the role setup screens.

### SHR-10. Device permissions manager

Reads and writes `UserProfile.permissions` (`location`, `sms`, `audio`, `camera`) and reconciles it with the live browser permission state on every open. The browser is the source of truth; the profile field records what the app has been granted so server-side logic can degrade gracefully.

**Data**

| Shown | Source |
| ----- | ------ |
| Permission rows / ⚠ | `FS get /UserProfiles/{uid}` → `permissions` reconciled with `local` (`navigator.permissions`) |

| Control | On click |
| ------- | -------- |
| `[ Allow ]` | OS / browser prompt, then `Fn updateUserProfile` `{ permissions }` |
| `[ How to enable ]` | `local` instruction sheet |
| `[ Play instructions ]` | `local` |
| On open drift | `Fn updateUserProfile` `{ permissions }` |

```
┌──────────────────────────────────┐
│  ←  Permissions                  │
├──────────────────────────────────┤
│  ┌────────────────────────────┐  │
│  │ Location        Allowed    │  │
│  │ Finds your village and     │  │
│  │ tracks gig arrival.        │  │
│  └────────────────────────────┘  │
│  ┌────────────────────────────┐  │
│  │ SMS autofill    Not asked  │  │
│  │ Fills the OTP code for     │  │
│  │ you.                       │  │
│  │                 [ Allow ]  │  │
│  └────────────────────────────┘  │
│  ┌────────────────────────────┐  │
│  │ Microphone      Blocked    │  │
│  │ Voice search and spoken    │  │
│  │ confirmation.              │  │
│  │        [ How to enable ]   │  │
│  └────────────────────────────┘  │
│  ┌────────────────────────────┐  │
│  │ Camera          Blocked    │  │
│  │ Delivery proof photos.     │  │
│  │        [ How to enable ]   │  │
│  └────────────────────────────┘  │
│  ┌────────────────────────────┐  │
│  │ Notifications   Allowed    │  │
│  │ Pickup and delivery        │  │
│  │ alerts.                    │  │
│  └────────────────────────────┘  │
│                                  │
│  ⚠ Location off: pick your       │
│    village by hand on Home.      │
└──────────────────────────────────┘
```

**States and fallbacks**


| Permission    | Profile field | Blocked state fallback                                                     |
| ------------- | ------------- | ---------------------------------------------------------------------------- |
| Location      | `location`    | Persistent GPS banner; manual Hub/Village and route selection everywhere (SHR-OV-2) |
| SMS autofill  | `sms`         | Type the six digits by hand on SHR-04                                       |
| Microphone    | `audio`       | Voice input hidden; spoken output still works, it needs no permission       |
| Camera        | `camera`      | Upload from gallery, or enter the system-generated confirmation code        |
| Notifications | —             | No push. The bell and SHR-08 keep working while the app is open             |

**Actions**


| Control            | Result                                                                       |
| ------------------ | ------------------------------------------------------------------------------ |
| `[ Allow ]`        | Triggers the browser prompt. Shown only in the `Not asked` state              |
| `[ How to enable ]` | Instruction sheet below. Shown in the `Blocked` state, where the app cannot re-prompt |
| Row                | Expands to the full description of what the permission is used for            |
| On open            | Re-reads `navigator.permissions` and writes any drift back to `UserProfile.permissions` |

**How to enable sheet**

```
┌──────────────────────────────────┐
│                                  │
│ ┌──────────────────────────────┐ │
│ │ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │ │
│ │ Camera is blocked            │ │
│ │ The app cannot ask again.    │ │
│ │ 1. Tap the lock icon in the  │ │
│ │    address bar               │ │
│ │ 2. Open Permissions          │ │
│ │ 3. Set Camera to Allow       │ │
│ │ 4. Reload this page          │ │
│ │                              │ │
│ │ [ Play instructions ] [ OK ] │ │
│ └──────────────────────────────┘ │
└──────────────────────────────────┘
```

Instructions vary by browser and by installed-versus-tab mode; the sheet picks the matching variant. `[ Play instructions ]` reads them aloud, which matters here because this is the screen a low-literacy user is most likely to be stuck on.

### SHR-11. Language, voice and audio UI

The in-app counterpart of SHR-03, plus the audio settings that make the app usable without reading. Localized voice instructions and audio descriptions for core tasks are a platform requirement, not an optional extra. This screen *is* the voice chrome.

**Data**

| Shown | Source |
| ----- | ------ |
| Voice `🔊` (this screen's job) | `local` (speech synthesis + Read screens aloud) |
| Bell badge | `FS query /Notifications` where `recipientId == uid` and `read != true`, count only |
| Avatar | `nav SHR-07` |
| Language + audio toggles / speed | `local` (`lc.locale`, voice prefs) |
| Offline voice pack | `local` / `cache` |

| Control | On click |
| ------- | -------- |
| Voice | `local` — read the screen aloud |
| Bell | `nav SHR-08` |
| Avatar | `nav SHR-07` |
| Language ▾ | `local` write `lc.locale` and `Fn updateUserProfile` `{ locale }` |
| Audio toggles / speed | `local` |
| Play test phrase | `local` |
| Download pack | `local` / `cache` |
| Voice input disabled link | `nav SHR-10` |

```
┌──────────────────────────────────┐
│  ←  Language & voice             │
├──────────────────────────────────┤
│  Language                        │
│  ┌────────────────────────────┐  │
│  │ తెలుగు  Telugu          ▾  │  │
│  └────────────────────────────┘  │
│                                  │
│  Read screens aloud      [ on ]  │
│  Shows [speak] in the header.    │
│                                  │
│  Read prices and totals  [ on ]  │
│  Speak before payment    [ on ]  │
│  Speak delivery updates  [ on ]  │
│  Voice input for search  [off ]  │
│  Needs microphone access.        │
│                                  │
│  Speed                           │
│  Slow  ────●─────────  Fast      │
│                                  │
│  [ Play test phrase ]            │
│                                  │
│  Offline voice pack              │
│  Telugu · 12 MB                  │
│  [ Download ]                    │
└──────────────────────────────────┘
```

**Actions**


| Control                | Result                                                                       |
| ---------------------- | ------------------------------------------------------------------------------ |
| Language ▾             | Same list as SHR-03, each row spoken on tap. Changing it re-renders the app and mirrors to the profile |
| Read screens aloud     | Master switch for `[speak]`. Off hides the header affordance everywhere       |
| Read prices and totals | Amounts are spoken in the Indian numbering system, matching the `en-IN` display format |
| Speak before payment   | Reads item count and total aloud before `[ Pay now ]`, and reads the result after |
| Speak delivery updates | Reads arriving, reached and delivered milestones aloud when the app is open   |
| Voice input for search | Disabled and greyed when microphone is blocked, with a link to SHR-10         |
| Play test phrase       | Plays one sentence at the current speed, so the setting can be judged by ear  |
| Download               | Caches the offline voice pack. Without it, playback falls back to the browser's built-in voices, which may be missing for regional languages |

Voice output uses the Web Speech API where the device provides a voice for the locale, and the downloaded pack otherwise. When neither is available the toggle shows "Not available on this device" and stays off.

### SHR-12. Offline and sync center

Opened from Profile or by tapping the `⚠` offline banner. Makes the queue visible so a user in a dead zone knows whether their work is safe.

**Data**

| Shown | Source |
| ----- | ------ |
| Offline banner / last sync | `local` + `navigator.onLine` |
| Waiting / failed rows | `local` outbox (Room / IndexedDB) — not Firestore persistence |
| Cached data size | `cache` |

| Control | On click |
| ------- | -------- |
| Sync now | replay named `Fn`s from the outbox (not a callable queue in Firestore) |
| Retry | replay that row's `Fn` |
| Remove | `local` discard (uploads only) |
| Clear cache | `local` / `cache` — never the outbox |
| Queued row | `nav` the record the write belongs to |

```
┌──────────────────────────────────┐
│  ←  Offline & sync               │
├──────────────────────────────────┤
│  ⚠ Offline: data may be outdated │
│                                  │
│  Last sync                       │
│  21-08-2026, 09:58 AM            │
│                                  │
│  Waiting to send             2   │
│  ┌────────────────────────────┐  │
│  │ Profile address change     │  │
│  │ queued 09:41 AM            │  │
│  └────────────────────────────┘  │
│  ┌────────────────────────────┐  │
│  │ Delivered · Karavadi       │  │
│  │ queued 09:52 AM            │  │
│  └────────────────────────────┘  │
│                                  │
│  Failed uploads              1   │
│  ┌────────────────────────────┐  │
│  │ Proof photo INV-2408180044 │  │
│  │ 3 tries · next try in 4:00 │  │
│  │      [ Retry ]  [ Remove ] │  │
│  └────────────────────────────┘  │
│                                  │
│  Cached data            8.4 MB   │
│                                  │
│  [ Sync now ]   [ Clear cache ]  │
└──────────────────────────────────┘
```

**Actions**


| Control         | Result                                                                             |
| --------------- | ------------------------------------------------------------------------------------ |
| Sync now        | Forces a reconnect attempt and flushes the write queue. Disabled while offline      |
| Retry           | Retries one failed upload immediately, resetting its backoff                        |
| Remove          | Discards that upload after a confirm sheet. Only offered for uploads, never for state changes |
| Clear cache     | Confirm sheet, then clears cached catalog and image data. Queued writes are never cleared by this action |
| Queued row      | Opens the record the write belongs to                                               |
| Online          | The banner is replaced by "All changes sent · last sync <time>"                     |

**What queues and what does not**


| Operation                                                     | Offline behaviour                                    |
| ------------------------------------------------------------- | ---------------------------------------------------- |
| Direct Firestore writes (profile fields, permissions, read state) | Queued by Firestore persistence, last-write-wins  |
| Driver delivery milestones                                    | Queued with the device timestamp preserved, so the physical completion time survives a later sync |
| File uploads (delivery proof photos)                          | Queued with exponential backoff; surfaced here on repeated failure |
| Cloud Function calls (place order, place merchant order, all configuration writes) | **Not queueable.** They are network-only. The calling screen disables its primary action and shows the offline state from [Patterns.md](Patterns.md) |
| Money movement (pay, refund, request payout, approve payout, retry payout, register or change a payout destination, subscribe or change plan, reconciliation, period close) | **Never queued, and never retried automatically on reconnect.** These need a server-issued idempotency key, a live balance and limit check, and a provider response; a queued money instruction executing hours later against stale state is how a duplicate payment or an over-limit payout gets made. The control is disabled with the reason on the button, and the user re-initiates deliberately when back online |

Cached catalog data (countries, states, districts, hubs, villages, plans, tariffs, base products) is long-lived and refreshed by pull-to-refresh or app-start sync. Gig tracking, order status and pamphlet stock use a 10-minute TTL and show the `⚠` banner when served stale.

### SHR-13. App install and updates

The platform ships as a PWA to avoid app-store distribution, so install and update are first-class product screens rather than browser incidentals.

**Data** — group. Children are `local` / Play / service worker. No Firestore, no Function.

#### SHR-13.1. Install prompt (Android / Chromium)

Shown as a bottom sheet on the second session, after the first successful sign-in, and on demand from Profile → Install app. Dismissal is remembered for 30 days.

**Data**

| Shown | Source |
| ----- | ------ |
| Sheet copy | `static` |
| Install eligibility | `local` (`beforeinstallprompt`, `display-mode`) |

| Control | On click |
| ------- | -------- |
| Install | `local` — prompt the saved `beforeinstallprompt` |
| Not now | `local` — remember 30 days |

```
┌──────────────────────────────────┐
│                                  │
│ ┌──────────────────────────────┐ │
│ │ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │ │
│ │ Install Logikchain           │ │
│ │ Opens from your home screen. │ │
│ │ Works offline. Uses less     │ │
│ │ data. No Play Store needed.  │ │
│ │                              │ │
│ │ [ Not now ]     [ Install ]  │ │
│ └──────────────────────────────┘ │
└──────────────────────────────────┘
```

`[ Install ]` calls the saved `beforeinstallprompt` event. The sheet is never shown when the app already runs in `standalone` mode, and the Profile row disappears in that case.

#### SHR-13.2. Add to Home Screen (iOS Safari)

Safari fires no install event, so the same entry point opens instructions instead.

**Data**

| Shown | Source |
| ----- | ------ |
| Instructions | `static` |

| Control | On click |
| ------- | -------- |
| Play instructions | `local` |
| OK | `local` dismiss |

```
┌──────────────────────────────────┐
│                                  │
│ ┌──────────────────────────────┐ │
│ │ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │ │
│ │ Add to Home Screen           │ │
│ │ 1. Tap Share in Safari       │ │
│ │ 2. Choose Add to Home Screen │ │
│ │ 3. Tap Add                   │ │
│ │                              │ │
│ │ [ Play instructions ][ OK ]  │ │
│ └──────────────────────────────┘ │
└──────────────────────────────────┘
```

#### SHR-13.3. Update available

A new service worker has installed and is waiting. Shown as a banner above the bottom nav so it never blocks work in progress.

**Data**

| Shown | Source |
| ----- | ------ |
| Banner / required sheet | `local` / service worker (waiting worker) |
| Minimum-version gate | server response on the failed call (not a dedicated Function) |
| Play Store update (Android official client) | `local` / Play |

| Control | On click |
| ------- | -------- |
| Reload / Reload now | `local` — activate waiting worker; blocked while outbox has rows |
| Dismiss banner | `local` |

```
┌──────────────────────────────────┐
│  New version ready    [ Reload ] │
├──────────────────────────────────┤
│  (tab)  (tab)  (tab)  (tab)      │
└──────────────────────────────────┘
```

**Required update**

```
┌──────────────────────────────────┐
│                                  │
│ ┌──────────────────────────────┐ │
│ │ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │ │
│ │ Update required              │ │
│ │ This version can no longer   │ │
│ │ talk to the server.          │ │
│ │                              │ │
│ │            [ Reload now ]    │ │
│ └──────────────────────────────┘ │
└──────────────────────────────────┘
```

**Actions**


| Control        | Result                                                                            |
| -------------- | ----------------------------------------------------------------------------------- |
| Reload         | Activates the waiting worker and reloads. Blocked while writes are queued: the app syncs first, then reloads |
| Dismiss banner | Returns on the next app start. Cart and form drafts survive the reload             |
| Reload now     | Required update. No dismiss. Triggered by a server minimum-version response        |

### SHR-14. Help and contact

Every contact route is a `tel:` link, because voice is the fallback channel that always works in the field.

**Data**

| Shown | Source |
| ----- | ------ |
| Own role / merchant / supplier pointers | `FS get /UserProfiles/{uid}` |
| Supplier card | `FS get /UserProfiles/{supplierId}` → `name`, `contactInfo` |
| Pickup shop card | `FS get /UserProfiles/{selectedMerchantId}` |
| Support number / hours | `FS get /Countries/{profile.countryId}` → `supportPhone`, `supportHours` (or public `listConfigurationCatalog` countries slice) |

| Control | On click |
| ------- | -------- |
| Call (any card) | `tel:` |
| Common questions / walkthrough | `local` / `static` |
| Report a problem / Send | `local` outbox (no named Function — gap) |

```
┌──────────────────────────────────┐
│  ←  Help & contact               │
├──────────────────────────────────┤
│  Your supplier                   │
│  ┌────────────────────────────┐  │
│  │ Dharma Traders             │  │
│  │ Prakasam Central           │  │
│  │ +91 90000 11111            │  │
│  │                   [ Call ] │  │
│  └────────────────────────────┘  │
│                                  │
│  Your pickup shop                │
│  ┌────────────────────────────┐  │
│  │ Sri Lakshmi Stores         │  │
│  │ Karavadi                   │  │
│  │ +91 90000 22222            │  │
│  │                   [ Call ] │  │
│  └────────────────────────────┘  │
│                                  │
│  Logikchain support              │
│  ┌────────────────────────────┐  │
│  │ 1800 000 0000              │  │
│  │ 9:00 AM - 7:00 PM IST      │  │
│  │                   [ Call ] │  │
│  └────────────────────────────┘  │
│                                  │
│  [ Common questions      > ]     │
│  [ Report a problem      > ]     │
│  [ Play a walkthrough    > ]     │
└──────────────────────────────────┘
```

**Contact resolution by role**


| Role     | "Your supplier" card resolves to                                | Second card                        |
| -------- | ---------------------------------------------------------------- | ---------------------------------- |
| Buyer    | The supplier behind `selectedMerchantId` (merchant → `supplierId`) | The selected merchant shop        |
| Merchant | `UserProfile.supplierId`                                        | Hidden                             |
| Driver   | `UserProfile.supplierId`                                        | Hidden                             |
| Supplier | Hidden                                                          | Hidden                             |
| Support  | Hidden                                                          | Hidden                             |

When a card cannot be resolved (a buyer with no merchant selected, a merchant not yet attached to a supplier) it is replaced by "Not set yet" with a link to the relevant setup screen. The support number is read from platform configuration, not hard-coded.

**Report a problem**

```
┌──────────────────────────────────┐
│  ←  Report a problem             │
├──────────────────────────────────┤
│  What went wrong?                │
│  ┌────────────────────────────┐  │
│  │                            │  │
│  │                            │  │
│  └────────────────────────────┘  │
│  [ Record instead ]              │
│                                  │
│  (x) Attach app details          │
│      v1.4.0 · Buyer · Karavadi   │
│      Last error 10:31 AM         │
│                                  │
│  [   Send   ]                    │
│                                  │
│  Offline: saved and sent later.  │
└──────────────────────────────────┘
```

`[ Record instead ]` captures a short voice note for users who cannot type; it needs microphone access (SHR-10) and uploads through the same retry queue as delivery proof (SHR-12).

### SHR-15. Terms, privacy and consent

**Data**

| Shown | Source |
| ----- | ------ |
| Document titles / versions / body | `static` / `cache` |
| Accepted timestamp / consents | `local` (no profile fields — gap) |
| App details chip | `local` + `FS get /UserProfiles/{uid}` (role, village) |

| Control | On click |
| ------- | -------- |
| Read terms / privacy / document row | `local` / `static` |
| Play summary | `local` |
| Continue (gate) | `Fn updateUserProfile` `{ locale }` after first-run accept — terms version is Support config |
| Consent toggles | `local` until Download / Delete |
| Download my data | `Fn requestMyDataExport` |
| Delete my account | `Fn requestAccountDeletion` — `INVALID_STATE` names open money |

**Acceptance gate (first sign-up)**

```
┌──────────────────────────────────┐
│                                  │
│ ┌──────────────────────────────┐ │
│ │ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │ │
│ │ Before you continue          │ │
│ │ (x) I accept the Terms of    │ │
│ │     Service and the Privacy  │ │
│ │     Policy                   │ │
│ │                              │ │
│ │ [ Read terms ][ Read privacy]│ │
│ │ [ Play summary ]             │ │
│ │                              │ │
│ │         [  Continue  ]       │ │
│ └──────────────────────────────┘ │
└──────────────────────────────────┘
```

`[ Continue ]` is disabled until the box is ticked. The accepted document versions and the acceptance timestamp are recorded on the profile. A new document version re-shows this sheet on next launch, with a "What changed" line.

**Settings screen**

```
┌──────────────────────────────────┐
│  ←  Terms & privacy              │
├──────────────────────────────────┤
│  Terms of Service      v3  [ > ] │
│  Privacy Policy        v2  [ > ] │
│                                  │
│  Accepted                        │
│  12-06-2026, 08:31 AM            │
│                                  │
│  Consents                        │
│  Order and delivery SMS  [ on ]  │
│  Offers and promotions   [off ]  │
│  Location while a gig    [ on ]  │
│  is running                      │
│                                  │
│  [ Download my data      > ]     │
│  [ Delete my account     > ]     │
└──────────────────────────────────┘
```

**Actions**


| Control            | Result                                                                          |
| ------------------ | ---------------------------------------------------------------------------------- |
| Document row       | Full text, scrollable, cached offline, with `[speak]` in the header               |
| Consent toggle     | Records the change with a timestamp. Turning off promotional consent also clears the matching notification category in SHR-08.1 |
| Location consent   | Turning it off revokes the app-level use of location and shows the GPS fallback banner. It does not change the browser permission |
| Download my data   | Requests an export; delivered by email or made available for download when ready  |
| Delete my account  | Confirm sheet, then re-auth (SHR-01.1). Rejected while the account has undelivered orders, an outstanding credit balance, or pending payouts, with the reason stated |

---

## SHR-OV. Shared overlays and edge cases

Generic loading, empty, error, offline, queued and disabled states are defined once in [Patterns.md](Patterns.md). Only the business-specific overlays live here.

### SHR-OV-1. API timeout

**Data**

| Shown | Source |
| ----- | ------ |
| Timeout copy | `local` (15s on the in-flight `Fn` / `Auth` call) |

| Control | On click |
| ------- | -------- |
| Retry | re-call that same `Fn` / `Auth` |

```
┌──────────────────────────────────┐
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│  Taking too long (15s)           │
│  [ Retry ]                       │
└──────────────────────────────────┘
```

The 15-second timeout applies to every API and Cloud Function call. Full error-page treatment for permission, not-found and server errors: [Patterns.md](Patterns.md).

### SHR-OV-2. GPS warning (non-blocking)

**Data**

| Shown | Source |
| ----- | ------ |
| Banner | `local` (`navigator.permissions` location / GPS) |

| Control | On click |
| ------- | -------- |
| Banner | `nav SHR-10` |

```
│ ⚠ Location off — pick Hub/Village│
```

Persistent, non-blocking. Manual Hub/Village and route selection stay available. Re-request path: SHR-10.

### SHR-OV-3. Vehicle breakdown (Support / Supplier)

**Data**

| Shown | Source |
| ----- | ------ |
| Gig identity / assigned driver | `FS get /Gigs/{gigId}` |

| Control | On click |
| ------- | -------- |
| Cancel | `local` dismiss |
| Suspend gig | `Fn suspendGig` then `nav` reassignment |

```
┌──────────────────────────────────┐
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│  Suspend gig?                    │
│  Reassign driver after suspend.  │
│  [ Cancel ] [ Suspend gig ]      │
└──────────────────────────────────┘
```

Notifies the assigned driver (Gig suspended) and, on reassignment, the replacement driver, who resumes from the last visited village index.

### SHR-OV-4. Merchant disassociated

**Data**

| Shown | Source |
| ----- | ------ |
| Triggering order / merchant | `FS get /Orders/{orderId}` or `FS get /UserProfiles/{merchantId}` (the document that raised the disassociation) |

| Control | On click |
| ------- | -------- |
| Notification / overlay | `nav` order detail or Support suspended-orders queue |

Buyer/Merchant notification: order **suspended**. Support search used for reassignment or cancel. The affected buyers and merchants receive an Order suspended notification (SHR-08); Support sees the orders in the suspended orders queue in [Support.md](Support.md).

### SHR-OV-5. Plan limit

**Data**

| Shown | Source |
| ----- | ------ |
| Limit copy | the failed `Fn` error `PLAN_LIMIT_EXCEEDED` (not a document read) |
| Plan context | `FS get /UserProfiles/{uid}` → `activeSubscriptionId` when present |

| Control | On click |
| ------- | -------- |
| View plans | `nav` Supplier / Merchant plan comparison |
| OK | `local` dismiss |

```
┌──────────────────────────────────┐
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│  Plan limit reached              │
│  Upgrade plan or wait next cycle.│
│  [ View plans ] [ OK ]           │
└──────────────────────────────────┘
```

Raised by the server as `PLAN_LIMIT_EXCEEDED` on compose-gig, route, merchant-upgrade and hub-attachment operations. `[ View plans ]` opens the plan comparison in [Supplier.md](Supplier.md).

---

## Profile flow (any role)

```
Splash (SHR-01)
  → Login (SHR-02) → OTP (SHR-04) → role home
  → Header 👤 → Profile (SHR-07)
      → Edit (07.1) / password (09.1) / phone+OTP (09.3) / email (09.2)
      → Notifications (08) / Language & voice (11) / Permissions (10)
      → Offline & sync (12) / Install (13) / Help (14) / Legal (15)
      → Logout (07.2)
Header bell → Notifications (SHR-08) → deep link to the target record
```

---

## Spec dependencies

These shared screens need contracts that do not exist yet in the specs, and are listed here so the gap is visible from the wireframe.

Already closed: `Notification`, `DeviceToken`, `registerDeviceToken` (backing `SHR-08` and the header bell), `updateUserProfile` (backing `SHR-07.1`, `SHR-09.2`, `SHR-09.3`, and the `UserProfile.permissions` write on `SHR-10`) are all specified in `constitution/Logikchain_Data_Structures.md` and `constitution/Logikchain_API_Specifications.md`.


Closed: `SHR-08.1` → `notificationPrefs` via `updateUserProfile`; `SHR-03` / `SHR-11` → `locale`; `SHR-05` → `suspendUser` / `restoreUser`; `SHR-14` → `Country.supportPhone`; `SHR-15` → `requestMyDataExport` / `requestAccountDeletion`.
