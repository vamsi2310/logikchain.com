# Logikchain Architecture

This document is the authoritative description of how Logikchain is hosted, which clients exist, and which client is allowed to perform which job. The callable contract in `constitution/Logikchain_API_Specifications.md` is what both clients speak. This file is what stops a second backend, a second driver loop, five isolated web apps, or a "simplify it with direct Firestore writes" rewrite from being treated as an implementation detail.

Wireframes stay the citation unit for screens (`constitution/wireframes/Navigation.md`). This file is the citation unit for runtime, hosting, and the hybrid split.

---

## Table of Contents

1. [Decision](#1-decision)
2. [Clients and official runtimes](#2-clients-and-official-runtimes)
2a. [Web: five role apps, one kernel](#2a-web-five-role-apps-one-kernel)
3. [Backend: Firebase first, GCP where Firebase is the wrong tool](#3-backend-firebase-first-gcp-where-firebase-is-the-wrong-tool)
4. [Compute: Firebase Functions 2nd gen](#4-compute-firebase-functions-2nd-gen)
5. [Environments](#5-environments)
6. [Request path](#6-request-path)
7. [Offline: cache is not an outbox](#7-offline-cache-is-not-an-outbox)
8. [Identity, claims, and App Check](#8-identity-claims-and-app-check)
9. [Push, maps, payments, and AI](#9-push-maps-payments-and-ai)
10. [Cost, reliability, maintainability, security](#10-cost-reliability-maintainability-security)
11. [What this architecture forbids](#11-what-this-architecture-forbids)
12. [Related constitution](#12-related-constitution)

---

## 1. Decision

Logikchain is **one git tree**, **three Firebase projects** (`dev`, `test`, `prod` — `constitution/Logikchain_Firebase_Workflow.md`), and **two client runtimes** on each project:

- a **Vite + React PWA** (Firebase nickname `logikchain-web-<alias>`) shipped as **five role entries on one kernel** — buyer, merchant, driver (read-only + Play handoff), supplier, Support. It is one Firebase web app and one Hosting origin per alias, not five products
- a **Kotlin + Jetpack Compose Android app** (nickname `logikchain-android-<alias>`) for the operational loop — **drivers official**, then merchants and suppliers on phone. One Play listing, role-gated by claims. Five white-label APKs are not the architecture

Inside one project there is one Auth directory, one Firestore, one set of Firebase Functions, one FCM configuration. A user who starts as a buyer on the PWA and is upgraded by `convertBuyerToRole` does not re-register. They receive new custom claims on the same UID and, when the new role's official client is Android, a handoff into the Play app. They do not hop between `dev` and `prod` on that UID: environments do not share users.

The backend is **Firebase-hosted**, not a raw Google Cloud rewrite. Compute is **Firebase Functions 2nd gen** only — **Node 20**, scale to zero, region `asia-south1`. That product *is* Cloud Run functions under the hood; the team does not `gcloud run deploy` a container, does not use 1st-gen Functions or Python Functions, and does not stand up Cloud SQL, GKE, or a custom auth service. GCP services that Firebase does not provide — Cloud KMS, Secret Manager, Vertex AI, Maps Platform, Cloud Scheduler, Cloud Tasks — run in the **same project as that environment** and are invoked only from Firebase Functions.

This split exists because the four things the platform optimises for pull in different directions, and pretending they do not is how a rural logistics product ends up with either an always-on bill or a driver who cannot close a handover:

- **Cost** wants pay-per-use and no idle compute while the network is still small.
- **Reliability** wants a durable outbox, background location, and a camera that survives process death on a budget phone.
- **Maintainability** wants one callable contract and one data model, not a PWA API and an Android API.
- **Security** wants every money and inventory mutation behind a Function that re-reads `/UserProfiles/{callerId}`, with App Check on the public Firebase config.

A PWA-only product fails the driver. A native-only product fails the buyer who will not install from Play. Two backends fail everything else.

---

## 2. Clients and official runtimes

Both clients are thin. They render screens, cache reads, and call Functions. They do not decide prices, burn codes, move credit, or write `Order`, `Gig`, `CreditProfile`, or `VerificationCodeBatch`.

The **official client** is the runtime that is allowed to perform a role's reliability-critical jobs. The other client may still sign the same user in and show what the role is allowed to read.

| Role | Official client | The other client may |
| ---- | --------------- | -------------------- |
| `buyer` | PWA | Sign in on Android and browse; checkout and pickup codes are designed for the PWA install path (`SHR-13`) |
| `support` | Web console (`lg` / `xl`) | Remain functional at 360px; not a phone product |
| `vehicle` | Android | Sign in on the PWA and see assigned gigs, earnings, and a prompt to open the Play app. It must not start a gig, submit a location ping, or close a custody handover |
| `merchant` | Android preferred; PWA legal | Catalogue, credit, and online-only actions on either client. Photo proof and offline code entry are safer on Android |
| `supplier` | Both | Phone daily loop on Android or PWA. Desktop pamphlet and network admin (`SUP-02`, `SUP-08` at 1024px+) on web |

`convertBuyerToRole` is the join. The response carries `officialClient`. When that value is `"android"`, the PWA does not unlock driver chrome: it deep-links into the Play app with the same Firebase session. Building a second driver outbox in the service worker so the handoff can be skipped is how queued cash becomes a `CODE_REPLAYED` dispute.

Screen IDs, routes, and `Notification.deepLink` values are shared. `/d/gigs/{gigId}` is the same gig record on both clients. The PWA may resolve that deep link to the handoff sheet rather than to a working `DRV-03`.

One Android APK, role-gated by custom claims. Five white-label APKs are not the architecture. Five isolated web repos or five Firebase web apps are not the architecture either — that is §2a. Flutter is not the architecture unless a dated constitution amendment commits to iOS inside the next twelve months; the design target remains budget Android in rural India.

---

## 2a. Web: five role apps, one kernel

A buyer must not download Support chrome. A Support operator must not wait on a pamphlet bundle. Those are product and cost constraints, not a licence to fork the backend.

**Locked shape (`2026-09-09`).** `web/` is one Vite app, one `package.json`, one Firebase web app per alias. It builds five HTML entries that share a kernel and load only that role's screens.

| Role | HTML entry | URL prefix | What it ships |
| ---- | ---------- | ---------- | ------------- |
| `buyer` + shared auth / profile | `web/index.html` | `/` | Login, OTP, splash, buyer shop, pickup codes |
| `merchant` | `web/m/index.html` | `/m/` | Credit-first merchant loop |
| `vehicle` | `web/d/index.html` | `/d/` | Read-only gigs / earnings + Play handoff. No start, ping, or custody close |
| `supplier` | `web/s/index.html` | `/s/` | Phone daily loop and desktop pamphlet / network admin |
| `support` | `web/x/index.html` | `/x/` | Ops console (`lg` / `xl`) |

**Kernel** (imported by every entry; screens never read `import.meta.env` themselves): `web/src/config` (the only backend switch), `web/src/firebase`, `web/src/api`, `web/src/data`, `web/src/state`, `web/src/ui`, `web/src/shared`. Role screens live under `web/src/apps/{buyer,merchant,vehicle,supplier,support}`.

**Why not five isolated folders / repos.** Isolation of `package.json`s is not a browser security boundary. Buyer at `/` and Support at `/x` are still one origin, one Auth session, one cookie jar. XSS in a field-role dependency can act as whoever is signed in. Five copies of Auth, `/v1`, Firestore shapes, money formatting, and the alias switch is how `convertBuyerToRole` (same UID, new chrome) becomes five login bugs. Folder isolation also does not buy more UX freedom: each entry already owns routes, nav, density, copy, and its own look.

**The only approved extra origin.** Field roles stay on the Hosting origin in §5. A later dated amendment may give **Support only** its own origin (and App Check site) so an ops session is not the same cookie jar as a buyer PWA. Until that amendment, `/x` is a separate bundle on the same origin. Do not mint a second Firebase web app "for Support" without that amendment.

**PWA runtime.** `vite-plugin-pwa` owns the web manifest and the service worker. There is no hand-rolled `public/sw.js`. The app shell is precached. `/v1/**`, Firestore, and Auth are **NetworkOnly** — the worker must not queue a mutation. Portrait-primary stays in the generated manifest (`constitution/wireframes/Foundations.md`).

**Hosting.** `firebase.json` rewrites `/v1/**` to the `api` function in `asia-south1`, each role prefix to that role's `index.html`, and everything else to buyer `index.html`. A navigate-fallback that swallows `/m` into the buyer shell is a defect.

**UX is per role.** Shared kernel is plumbing. Buyer stays a shop. Merchant is credit-first. Supplier is desktop-heavy at 1024px+. Support is tables and period close. Driver web is a handoff, not a second `DRV-03`. Tailoring chrome, type, and install prompt per entry is expected. Inventing a second API per entry is not.

---

## 3. Backend: Firebase first, GCP where Firebase is the wrong tool

```
┌──────────────────────────────────────────────────────────────┐
│  PWA — five role entries, one kernel (vite-plugin-pwa)       │
│  Android (driver official; merchant / supplier phone)        │
├──────────────┬──────────────────┬────────────────────────────┤
│ Firestore    │ Callable / HTTPS │ Durable outbox (Android)   │
│ reads + TTL  │ all mutations    │ Room + WorkManager         │
│ cache        │ App Check        │ idempotencyKey, capturedAt │
└──────────────┴──────────────────┴────────────────────────────┘
         │                │                    │
         ▼                ▼                    ▼
┌──────────────────────────────────────────────────────────────┐
│  Firebase — one of logikchain-dev | -test | -prod            │
│  Auth (phone, Google) + custom claims `{ role, status }`     │
│  Firestore + Security Rules                                  │
│  Firebase Functions 2nd gen (onCall, onRequest, onSchedule)  │
│  Cloud Storage (media, profiles, products, proofs) · FCM · App Check │
├──────────────────────────────────────────────────────────────┤
│  GCP in the same project                                     │
│  Cloud KMS · Secret Manager · Vertex AI                      │
│  Maps Platform · Cloud Scheduler · Cloud Tasks               │
└──────────────────────────────────────────────────────────────┘
```

| Concern | Service | Why this one |
| ------- | ------- | ------------ |
| Identity | Firebase Auth | Phone OTP and Google, already the onboarding path |
| Authorisation | Custom claims + `/UserProfiles/{uid}` re-read on every callable | Claims are a convenience for rules. The profile document is the authority for a mutation. See `suspendUser` |
| Reads | Firestore | Offline cache, security rules, the document shapes in `constitution/Logikchain_Data_Structures.md` |
| Mutations | Firebase Functions 2nd gen | The entire API spec. A UI tap that changes order, gig, credit, cash, or payout state always calls an `onCall` / `onRequest` / `onSchedule` export |
| Storage & Media | Cloud Storage | Profile pictures, product inventory photos, proofs, KYC docs, evidence payloads, exports |
| Push | FCM | `DeviceToken.platform` is `"web"`, `"android"`, or `"ios"`; `registerDeviceToken` keeps up to five |
| Secrets at rest | Cloud KMS | PAN, VPA, account numbers. No client and no Support console decrypts |
| Function secrets | Secret Manager | Razorpay, SMS, webhook secrets. Never in the APK or the PWA bundle |
| Production Gemini | Vertex AI | Called only from Functions. AI Studio keys are development-only |
| Routing geometry | Maps Platform | Separate restricted keys per client. Distance Matrix and Geocoding stay server-side |
| Webhook retries / payout drain | Cloud Tasks + Scheduler | Provider callbacks and approved-payout workers, not client timers |

A workload leaves Firestore only when a measured reason exists: heavy reporting already goes through `getFinanceReport` / BigQuery-shaped exports; high-volume location pings may later need their own **Firebase Function** export. None of those is a licence to move Auth, the callable contract, or the ledger onto a Cloud Run service.

---

### 3.1 Cloud Storage Architecture

Cloud Storage houses media assets, proofs, compliance files, and system evidence across all client runtimes. The single bucket per alias (`logikchain-{alias}.firebasestorage.app`) is partitioned into well-defined top-level prefixes governed by `storage.rules`:

| Prefix | Category | Read Access | Write Access | Max Size | Allowed Types | Notes |
| ------ | -------- | ----------- | ------------ | -------- | ------------- | ----- |
| `/profiles/{uid}/*` | Profile Pictures | Public (`true`) | Owner or Support | 5 MB | `image/*` | Buyer, merchant, driver, supplier avatars. |
| `/products/{supplierId}/*` | Product & Catalog | Public (`true`) | Supplier or Support | 10 MB | `image/*` | Inventory item pictures and promotional pamphlets. |
| `/proofs/{uid}/*` | Delivery Proofs | Auth (parties + roles) | Owner | 8 MB | `image/*` | Arrival and handover evidence (`photoUrl`). |
| `/documents/{uid}/*` | KYC & Regulatory | Owner or Support | Owner or Support | 15 MB | `image/*`, `application/pdf` | PAN cards, GSTIN, driving licenses, vehicle RC. |
| `/exports/{uid}/*` | Data Exports | Owner or Support | Functions (Admin SDK) | 50 MB | Any (`text/csv`, `json`, `zip`) | User privacy downloads and finance reports. |
| `/payloads/*`, `/challans/*` | System Evidence | Server only (`false`) | Functions (Admin SDK) | 20 MB | `application/json`, `pdf` | Raw webhook records and stamped tax challans. |

Direct client uploads utilize the Firebase Storage SDK with client-side size and MIME validation (`web/src/storage/index.ts`). Server-side URL signing, evidence archival, and data purge actions execute through `functions/src/lib/storage.ts`.

---

## 4. Compute: Firebase Functions 2nd gen

Use **Firebase Functions 2nd gen** on **Node 20** (TypeScript), scale to zero, region **`asia-south1`**. That *is* Google’s serverless / Cloud Run functions product, deployed and named through the Firebase Functions API so the callable contract, App Check, Auth context, and emulator stay the ones this constitution specifies. Python is not the Functions runtime: the Admin SDK, callable types, and emulator story are one language with the PWA contract.

| Option | Verdict |
| ------ | ------- |
| Firebase Functions **2nd gen** (`onCall` / `onRequest` / `onSchedule` / `onTaskDispatched`), Node 20 | **Required.** Free tier covers early volume. Concurrency 20–80 on one instance. |
| “Google Cloud Functions” / “Cloud Run functions” via `gcloud` | Same billing, wrong toolchain. Loses callable SDK, emulator, and the export names in the API spec. |
| Cloud Run **services** (team-built containers, `gcloud run deploy`) | Not cheaper at rural bursty volume. Costs a second API and a `minInstances` temptation. Forbidden for v1. |
| Firebase / Cloud Functions **1st gen** | One request per instance. The expensive option. Forbidden. |
| Python Functions | Forbidden. A second runtime is a second deploy, a second emulator, and a second set of types for the same `operationId`. |

**Locked settings** (every export, every project):

- Runtime **Node 20**. `firebase.json` `runtime: nodejs20`. `functions/package.json` `engines.node` is `"20"`.
- `minInstances: 0` — an always-on container is tens of dollars a month before anyone opens the app.
- Memory 512 MB for ordinary callables; **1 GiB** only for the isolation list below.
- CPU allocated only during the request.
- Isolation list (own export, still 2nd gen, still `minInstances: 0`): `handleGatewayWebhook`, `recordPayoutSettlement`, `initiatePayoutTransfer`, `runReconciliation`, `postDueCreditRelief`, `closeAccountingPeriod`, `reopenAccountingPeriod`, `issueCreditNote`, `getFinanceReport`, `exportFinanceReport`, `computeRouteMetrics`, and any later Vertex-backed helper. Do not isolate every callable — fifty cold-start pools are how 2nd gen becomes expensive.

**Source layout.** Export names in `functions/src/index.ts` **are** the API spec `operationId`s, plus the HTTPS `api` function. Domain logic lives in `functions/src/handlers/`. Shared internals (pricing an intent, tax, custody, rails) live in `functions/src/lib/`. A handler must not import a sibling handler — that cycle is how the typechecker loses `./payments`. `functions/lib/` is `tsc` output (`rootDir: src`, `main: lib/index.js`); it is not a second source tree.

**HTTP and callable are the same handler.** Clients call `httpsCallable(operationId)` or `METHOD /v1/...`. Hosting rewrites `/v1/**` to `api` in `asia-south1`. RPC paths (`POST /api/placeOrder`) stay retired.

**Graduate a path** only after a bill or a timeout names it: a hotter `updateGigLocation` or webhook stays a Firebase Function first; `minInstances: 1` on that one export requires a dated amendment in this section. Firestore reads, Maps, Phone Auth SMS, and Vertex will dwarf Functions cost long before a container rewrite would save money.

Deploy, aliases, and who may touch `prod` are `constitution/Logikchain_Firebase_Workflow.md`.

---

## 5. Environments

Speech uses **aliases only**: `emulator`, `dev`, `test`, `prod`. Project IDs live in `.firebaserc`. There is no environment called `logikchainTest` — that string is a retired console name, mapped in `constitution/Logikchain_Firebase_Workflow.md` §11 if the GCP project still exists.

One git SHA is promoted. Users, documents, and secrets are not. Each alias has its own playbook; they do not share commands, client builds, or third-party keys.

| Alias | Project ID | Playbook | Client build |
| ----- | ---------- | -------- | ------------ |
| `emulator` | *(not GCP)* | Laptop + `seed/`. No `firebase deploy`. | Emulator hosts only |
| `dev` | `logikchain-dev` | Developer sandbox. Local deploy allowed. | Vite `--mode development` → `web/.env.development`, Android `dev` flavor |
| `test` | `logikchain-test` | QA. CI on `main`. | Vite `--mode test` → `web/.env.test`, `test.logikchain.com`, Android `test` flavor |
| `prod` | `logikchain-prod` | Live money. CI on tag only. | Vite `--mode production` → `web/.env.production`, `logikchain.com`, Android `prod` flavor |

The PWA backend switch is **build-time only**. Vite `--mode` selects the alias file. Screens import `env` from `web/src/config/env.ts` and never read `import.meta.env` themselves. There is no runtime environment picker in the UI. A production build must not be able to retarget `dev`, `test`, or the emulator.

`web/.env.local` is a personal overlay (gitignored). It may set `REACT_APP_USE_LOCAL_FUNCTIONS=true` so `/v1` hits the Functions emulator while Auth and Firestore stay on the Vite `--mode` alias. It must not set `FIREBASE_PROJECT_ALIAS`. That overlay is ignored for production builds. Do not start Auth/Firestore emulators in that hybrid playbook — Functions would write local data while the PWA reads the remote alias.

Firebase app nicknames are env-specific (`logikchain-web-dev`, `logikchain-android-test`, …). Reusing `logikchainSuperApp` on every project is how the console becomes one blur. Function **names** stay identical; the **build** selects the project. A production APK that can retarget `dev` is a defect.

Full isolation table, per-playbook allow/forbid, and promotion: `constitution/Logikchain_Firebase_Workflow.md`. Provisioning is repeated per alias in `constitution/Logikchain_Integration_Config.md` — keys are not shared.

---

## 6. Request path

**Reads come from Firestore.** Clients enable persistence, honour the TTL rules in the system instructions (static catalogues until pull-to-refresh or app-start; live gigs, orders, and pamphlet stock for ten minutes), and mark stale values `[cached]` as `constitution/wireframes/Patterns.md` requires. Snapshot listeners are unbound when the view unmounts. Chatty listeners on every gig and order document are the bill the platform will actually receive.

**Writes that are not money go through the documented path for that field.** `updateUserProfile` is the allow-list for self-service profile edits. `deviceTokens` moves only through `registerDeviceToken`. `role`, `status`, `supplierId`, and `activeSubscriptionId` move only through the functions named in the security-rules commentary.

**Every sensitive mutation is an API in `constitution/Logikchain_API_Specifications.md`.** The public contract is REST (`GET` / `POST` / `PATCH` / `PUT` / `DELETE` under `/v1`, §0B). The runtime is Firebase Functions 2nd gen (`onCall` or `onRequest` — same handler, same security block). Firestore rules deny client writes on `Orders`, `MerchantOrders`, `Gigs`, cash and credit collections, payment and payout records, `BeneficiaryAccounts`, and `VerificationCodeBatches`. A web SDK that can `set()` a document is not permission to do so.

**The two clients are interchangeable at the wire.** Same operationId, same HTTP method and path, same payloads, same `idempotencyKey` and `capturedAt` semantics, same error codes. An Android-only request shape is a second API and is rejected.

---

## 7. Offline: cache is not an outbox

Firestore offline persistence is a **read cache** and a queue for the few document writes the rules still allow (profile-shaped last-write-wins fields). It is not a queue for callables. A Function invocation that is not sent is not persisted by the Firestore SDK, and a driver whose Chrome process was killed has not "queued" a handover.

The action-class matrix in `constitution/wireframes/Patterns.md` §4 is normative for both clients. In short:

| Class | Offline | Runtime that may queue it |
| ----- | ------- | ------------------------- |
| Reads | Serve from cache, `[cached]` when past TTL | Both |
| Profile-shaped writes | Queue, last-write-wins | Both |
| Gig location (`updateGigLocation`) | Queue in capture order | Android only (`vehicle`) |
| Custody handovers with strong offline proof (`markOrderDelivered`, `updateMerchantOrderStatus`, `confirmCreditRepayment`, `declareCashHandover`, `confirmCashSettlement`) | Queue with `idempotencyKey` + device `capturedAt` | Android for `vehicle`. Merchant self-confirmation of their own bulk order may run online on either client |
| Gateway money, payouts, subscriptions, Support configuration, reconciliation, period close, cash-on-pickup `placeOrder` | **Blocked.** The control states "Needs an internet connection" | Neither |

The Android outbox is Room + WorkManager. Each row is one callable, the original `capturedAt`, a client-minted `idempotencyKey` that is stable across retries, and a visible state (`queued`, `uploading`, `failed`) on `SHR-12` and `DRV-05.1`. Replay is in capture order. A permanent server refusal (`CODE_REPLAYED`, `INVALID_STATE`) surfaces; it is not dropped. A disputed custody transfer cannot be discarded by the driver, because money changed hands in the village whatever the server thinks.

The PWA may keep IndexedDB for buyer carts, draft forms, and cached reads. `vite-plugin-pwa` must not implement a second driver outbox: `/v1/**` and Auth/Firestore are NetworkOnly. When a `vehicle` session on `/d` reaches an action that would queue, the screen is the Play handoff, not a service-worker retry.

---

## 8. Identity, claims, and App Check

One Firebase Auth user. Phone and Google. Custom claims `{ role, status }` are set only by Functions (`createSupplier`, `convertBuyerToRole`, `suspendUser`, `restoreUser`).

Every callable that mutates re-reads `/UserProfiles/{callerId}` and refuses a caller whose status is not `"approved"` with `USER_SUSPENDED`, except the custody carve-out documented on `declareCashHandover` / `confirmCashSettlement`. A client that still holds an hour-old ID token is not a second source of truth.

After any function that changes claims — `convertBuyerToRole`, `suspendUser`, `restoreUser` — every signed-in client for that UID force-refreshes the ID token before routing. The role-change splash and the suspension screen exist so a PWA that still thinks it is a buyer, and an Android app that already knows it is a driver, cannot disagree for the life of a token.

**App Check is mandatory** on every client-reachable callable and HTTPS function. Web uses reCAPTCHA Enterprise (or the documented web provider). Android uses Play Integrity. Provider callbacks (`handleGatewayWebhook`, `recordPayoutSettlement`) authenticate by signature, not App Check. A missing or invalid App Check token is `UNAUTHENTICATED`.

**Official-client enforcement.** When the caller role is `vehicle`, the custody and gig-mutation functions (`startGig`, `updateGigLocation`, `completeAndFinalizeGig`, `markOrderDelivered`, `updateMerchantOrderStatus`, `confirmCreditRepayment`, `declareCashHandover`, `confirmCashSettlement`) accept only an App Check token whose provider is Play Integrity. Any other provider returns `CLIENT_NOT_OFFICIAL`. The PWA uses that error to open the Play handoff rather than to retry. Merchant self-confirmation of a bulk order on the merchant's own device is the documented exception in section 4A of the API spec: the caller and the counterparty are the same UID, the network is live, and web App Check remains legal.

Logout of one client calls `registerDeviceToken` with `revoke: true` for **that token only**. A hybrid user may hold a web token and an Android token at once. Wiping the array on PWA logout is how the driver stops receiving gig assignments on the phone they are actually holding.

Provisioning — Android package, SHA-256, App Check, restricted Maps keys — lives in `constitution/Logikchain_Integration_Config.md`.

---

## 9. Push, maps, payments, and AI

**Push.** FCM to every registered `DeviceToken`. Web uses the VAPID key with the worker `vite-plugin-pwa` registers. Android uses the Play token. The same `Notification` document and `deepLink` are delivered to both; the receiving client decides whether it can honour the link or must hand off. A driver deep link that lands on `/d` opens the handoff, not a working start-gig control.

**Maps.** The Android app uses the Maps SDK with an Android-restricted key. The PWA uses the JavaScript SDK with an HTTP-referrer-restricted key. Geocoding and Distance Matrix stay on Functions with a server key. No Maps key that can bill Distance Matrix is shipped in either client.

**Payments.** Razorpay Checkout.js on web, Razorpay Android SDK on the APK. Both present a server-priced `PaymentIntent`. `processPayment` still requires a gateway signature. A client asserting that checkout succeeded is not evidence, on either runtime.

**AI.** Vertex AI from Functions in production. The Android app and the PWA never embed a Gemini key. Route ranking on `SUP-02` is derived from existing documents, not a new Function, as the supplier wireframes already state.

---

## 10. Cost, reliability, maintainability, security

**Cost.** Blaze-plan Firebase. Functions 2nd gen at `minInstances: 0` in `asia-south1`. Reads are the larger meter: short TTL on volatile data, no lingering snapshots, App Check so the public config cannot be used as an anonymous Functions and Maps budget. Native is one Play listing. Flutter is not cheaper while iOS is out of scope. Always-on Cloud Run is not a reliability upgrade at this volume; it is a fixed bill.

**Reliability.** The driver loop is why Android exists. Room + WorkManager + Play-managed updates survive the conditions a service worker on a low-RAM phone does not. Functions remain the consistency boundary: the Firestore transactions in the API spec are unchanged by the hybrid split.

**Maintainability.** Feature modules on Android follow roles. The PWA follows the same screen IDs, split across five entries that share one kernel. Domain types come from `constitution/Logikchain_Data_Structures.md`. A change to a callable is a change to every entry and to Android, which is the point of one contract. Five isolated web apps would multiply Auth and `/v1` without adding a security boundary.

**Security.** App Check, Play Integrity, claim refresh, KMS for beneficiary secrets, webhook HMAC on the raw body, rules that deny client money writes. The hybrid split does not relax any of those. It adds one rule: the official client for a job is part of the security boundary, because an unverifiable outbox is a way to invent deliveries.

---

## 11. What this architecture forbids

- A second backend (Cloud Run services + Cloud SQL + custom auth, or "the Android app talks to a different API").
- Firebase Functions **1st gen**, or a `gcloud run deploy` of a container that re-implements the API spec.
- `minInstances > 0` without a dated amendment in §4 that names the export and the measured reason.
- One Firebase project for “everyone”, a fourth project “for Android” / “for Cloud Run”, or treating `logikchainTest` as a live alias (retired; workflow §11).
- Crossing playbooks: `seed/` on `test`/`prod`, live Razorpay on `dev`/`test`, a `prod` client that can retarget `dev`.
- `firebase deploy` without an explicit project alias, or a human deploying to `prod` from a laptop (`constitution/Logikchain_Firebase_Workflow.md`).
- Hard-coded project IDs or webhook URLs in function source.
- Sharing Razorpay live keys, KMS keys, or webhook secrets across `dev` / `test` / `prod`.
- Client writes to collections the rules mark read-only, including from the Firebase JS SDK "because it is convenient".
- A PWA driver outbox, or treating Firestore offline persistence as a queue for callables.
- Five APKs, or a Flutter rewrite without a dated iOS commitment in this file.
- Five isolated web apps, five `web/` package.jsons, or a second Firebase web app per role. Role entries share one kernel and one Hosting origin (Support-only origin requires a dated amendment in §2a).
- A hand-rolled service worker, or any Workbox rule that caches `/v1/**`, Auth, or Firestore.
- A runtime environment picker, or a production bundle that can retarget `dev` / `test` / emulator.
- Handler-to-handler imports inside `functions/src/handlers/`. Shared mutation helpers belong in `functions/src/lib/`.
- Python (or any second Functions language) for this API.
- Gemini, Razorpay secret, or unrestricted Maps keys in either client bundle.
- `registerDeviceToken` used as a wipe of every platform's token on a single logout.
- Queuing gateway payments, payouts, subscriptions, or Support configuration writes.
- Inventing in-chat exceptions that make the PWA an official driver client "just for this network".

---

## 12. Related constitution

| Document | What it owns |
| -------- | ------------ |
| `constitution/Logikchain_API_Specifications.md` | HTTP contract §0B (`GET`/`POST`/`PATCH`/`PUT`/`DELETE`), Security block per operation, Firebase Functions runtime §0A |
| `constitution/Logikchain_Firebase_Workflow.md` | Naming law, isolation, distinct playbooks for `emulator` / `dev` / `test` / `prod`, SHA-only promotion |
| `constitution/Logikchain_Data_Structures.md` | Document and request/response types, including `DeviceToken.platform` and `officialClient` |
| `constitution/Logikchain_API_Swagger_Spec.md` | Machine-readable contract |
| `constitution/Logikchain_API_Testing.md` | Bruno `/v1` collection law: groups, setup / execute / teardown, `emulator` only |
| `constitution/Logikchain_Integration_Config.md` | Per-project Firebase web/Android/Admin provisioning, App Check, Maps key restrictions, FCM, Razorpay, KMS |
| `constitution/Logikchain_Financial_Controls.md` / `constitution/Logikchain_Financial_Traceability.md` | Money movement, unchanged by client runtime |
| `constitution/Logikchain_AI_Studio_System_Instructions.md` | Agent-facing summary; defers to this file on runtime |
| `constitution/wireframes/Patterns.md` §4 | Offline action-class matrix drawn on every screen |
| `constitution/wireframes/Foundations.md` | 360px layout contract; resolved decisions including role-app split (§16 #15–19) |
| `constitution/wireframes/Navigation.md` | Screen IDs, `/` `/m/` `/d/` `/s/` `/x/` prefixes, deep links shared by both clients |
