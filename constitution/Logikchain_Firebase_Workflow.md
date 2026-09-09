# Logikchain Firebase Workflow

This document is the authoritative development and deploy path for Logikchain. The callable contract lives in `constitution/Logikchain_API_Specifications.md`. Hosting and clients live in `constitution/Logikchain_Architecture.md`.

There is **one codebase** and **four isolated runtimes**. Function names, security rules, and indexes are identical. Everything that can move money, identify a user, or bill a third party is **not** shared.

Speech in this constitution uses **aliases only**: `emulator`, `dev`, `test`, `prod`. Project IDs appear only in `.firebaserc` and in the identity table below. “The project”, “logikchainTest”, and an unprefixed `firebase deploy` are not names for an environment.

---

## Table of Contents

1. [Naming law](#1-naming-law)
2. [Isolation (what never crosses)](#2-isolation-what-never-crosses)
3. [Required repo files](#3-required-repo-files)
4. [Playbook: `emulator`](#4-playbook-emulator)
5. [Playbook: `dev`](#5-playbook-dev)
6. [Playbook: `test`](#6-playbook-test)
7. [Playbook: `prod`](#7-playbook-prod)
8. [Promotion (SHA only)](#8-promotion-sha-only)
9. [Compute deploy (shared mechanics)](#9-compute-deploy-shared-mechanics)
10. [What this workflow forbids](#10-what-this-workflow-forbids)
11. [Appendix: retired name `logikchainTest`](#11-appendix-retired-name-logikchaintest)

---

## 1. Naming law

`.firebaserc` is the only map from alias → GCP project ID. Every CLI command takes `--project <alias>`. A human-typed project ID is a defect.

| Alias | Project ID | Firebase web app nickname | Firebase Android app nickname | Hosting | Android `applicationId` |
| ----- | ---------- | ------------------------- | ----------------------------- | ------- | ----------------------- |
| `emulator` | *(none — not GCP)* | n/a | n/a | `localhost` | `com.logikchain.app.dev` (debug + emulator hosts) |
| `dev` | `logikchain-dev` | `logikchain-web-dev` | `logikchain-android-dev` | `logikchain-dev.web.app` | `com.logikchain.app.dev` |
| `test` | `logikchain-test` | `logikchain-web-test` | `logikchain-android-test` | `test.logikchain.com` | `com.logikchain.app.test` |
| `prod` | `logikchain-prod` | `logikchain-web-prod` | `logikchain-android-prod` | `logikchain.com` | `com.logikchain.app` |

Do not register `logikchainSuperApp` or `logikchainAndroid` as a nickname that is reused across projects. The console must show which environment an app belongs to without opening Project settings.

Client Firebase options, `google-services.json`, Secret Manager, KMS keyrings, Maps keys, Razorpay webhook URLs, and App Check providers are **per alias**. The PWA env file and the Android flavor are named for the same alias. A `dev` APK that contains `logikchain-prod` options is a mis-build, not a configuration toggle.

Function source never contains a project ID. It reads `process.env.GCLOUD_PROJECT` (set by the platform on that alias).

```json
{
  "projects": {
    "dev": "logikchain-dev",
    "test": "logikchain-test",
    "prod": "logikchain-prod"
  }
}
```

---

## 2. Isolation (what never crosses)

| Asset | Shared across aliases? |
| ----- | ---------------------- |
| Git SHA / function source / rules / indexes | Yes — that is the point of promotion |
| Callable **names** (`placeOrder`, …) | Yes — the API spec |
| Auth users / phone numbers / custom claims | **No** |
| Firestore documents / Storage objects | **No** |
| FCM tokens | **No** |
| Razorpay keys, webhook secrets, webhook URLs | **No** |
| KMS keys, Secret Manager values | **No** |
| Maps keys, App Check site keys, VAPID keys | **No** |
| Service account JSON | **No** |
| `seed/` fixtures | `emulator` only (`dev` may recreate throwaway Support data; never a seed import into `test` or `prod`) |
| Production data export | **No** destination except a legal hold / Security out of band |

A UID on `dev` is not the same person as a UID on `prod`, even if the phone number matches. `convertBuyerToRole` on `test` does not change `prod`.

---

## 3. Required repo files

`2026-09-09.` Constitution markdown and wireframes live under `constitution/`. `seed/` stays at repo root (emulator only). Runtime trees are `functions/` (Node 20, 2nd gen), `web/` (Vite role apps), and `android/`. DevOps for this product lives here: `firebase.json`, `scripts/deploy.*`, rules, and `.github/workflows/`.

| File | Committed? | Role |
| ---- | ---------- | ---- |
| `constitution/` | yes | Law: API spec, data shapes, architecture, workflow, finance, API testing (Bruno), AI Studio instructions, `constitution/wireframes/` |
| `tests/bruno/` | yes | Bruno `/v1` collection. Governed by `constitution/Logikchain_API_Testing.md`. Emulator default |
| `seed/` | yes | Emulator fixtures only. Never imported into `dev` / `test` / `prod` |
| `.firebaserc` | yes (IDs only) | Alias → project ID |
| `.firebaserc.example` | yes | Template |
| `firebase.json` | yes | Functions `nodejs20`, emulator ports, Hosting `web/dist`, rewrites `/v1/**` → `api` (`asia-south1`) and `/m` `/d` `/s` `/x` → role HTML |
| `firestore.rules` / `firestore.indexes.json` / `storage.rules` | yes | Same artifacts, every remote alias |
| `storage/` | yes | Storage architecture, `cors.json`, and rules definition |
| `functions/` | yes | 2nd gen TypeScript. Export names **are** the API spec names. `src/` is source; `lib/` is `tsc` output |
| `functions/.env.dev` `.env.test` `.env.prod` | **no** | Non-secrets per alias. Secrets → Secret Manager |
| `functions/.env.example` | yes | Placeholders for those files |
| `web/` | yes | One Vite PWA, five role entries, shared kernel (`constitution/Logikchain_Architecture.md` §2a) |
| `web/.env.development` `.env.test` `.env.production` `.env.emulator` | **no** | PWA Firebase options per Vite `--mode`. Selected at build time only |
| `web/.env.local` | **no** | Personal overlay. May point `/v1` at the Functions emulator. Must not set `FIREBASE_PROJECT_ALIAS` |
| `web/.env.*.example` | yes | Committed samples. No live keys |
| `scripts/deploy.ps1` `scripts/deploy.sh` | yes | The only local deploy path. Always `--project <alias>` |
| `scripts/deploy-dev.ps1` | yes | Allowed laptop deploy to `dev` |
| `scripts/deploy-test.ps1` | yes | Requires `-CiRecovery`; refuses otherwise |
| `scripts/deploy-prod.ps1` | yes | Always refuses. Production is CI on `v*` |
| `.env.example` | yes | Placeholders |
| `android/` | yes | Kotlin + Compose. Flavors `dev` / `test` / `prod` |
| `android/app/src/dev\|test\|prod/google-services.json` | flavor copies; no unrestricted Maps/Gemini keys | Android per alias |
| `.github/workflows/` | yes | `deploy-test` on `main` and `workflow_dispatch`; `deploy-prod` on tag `v*` only |

`firebase.json` runtime is **Node 20**, codebase 2nd gen. No `firebase-functions/v1` import. `functions/package.json` `deploy:test` and `deploy:prod` exit 1 so a laptop npm script cannot skip the playbook.

---

## 4. Playbook: `emulator`

**Identity.** Not a Firebase project. Local Auth / Firestore / Functions / Storage / PubSub emulators on one machine.

**Who.** Any developer, on a laptop. No GCP IAM required.

**Purpose.** Write and unit-test a callable. Rules tests. Seeded journeys.

**Allowed**

```text
firebase emulators:start --only auth,firestore,functions,storage,pubsub
```

- Load `seed/` into the Firestore emulator.
- PWA: from `web/`, `npm run start:emulator` (Vite `--mode emulator` → `web/.env.emulator`). Buyer is `http://localhost:5173/`. Role apps are `/m/`, `/d/`, `/s/`, `/x/`.
- Hybrid laptop: `web/.env.local` with `REACT_APP_USE_LOCAL_FUNCTIONS=true` plus `npm run start:dev` talks to remote `dev` Auth/Firestore and `127.0.0.1:5001` Functions. Do not start Auth/Firestore emulators in that mix.
- Android `dev` debug build with emulator hosts (`localhost`, `10.0.2.2`). `FIREBASE_PROJECT_ALIAS` is unset or `emulator`.
- App Check off or debug tokens.
- Razorpay, SMS, Vertex **stubbed**. A function that calls a live payout rail is a defect.
- Bruno `/v1` collection from `tests/bruno/` (`constitution/Logikchain_API_Testing.md`). `npx bru run --env emulator`.

**Forbidden in this playbook**

- Any `firebase deploy`.
- Pointing the emulator client at `dev` / `test` / `prod` “because the emulator is down”.
- Loading `seed/` anywhere except this emulator.

**Exit.** PR with functions tests, rules tests, typecheck. The next playbook is `dev` or, after merge, `test` via CI — never `prod`.

---

## 5. Playbook: `dev`

**Identity.** Alias `dev`. Project `logikchain-dev`. Apps `logikchain-web-dev` / `logikchain-android-dev`. Hosting `logikchain-dev.web.app`. Package `com.logikchain.app.dev`.

**Who.** Developers, from a feature branch.

**Purpose.** Shared sandbox. It is allowed to be broken. It is not QA and it is not production.

**Allowed**

```text
.\scripts\deploy.ps1 -Alias dev
.\scripts\deploy.ps1 -Alias dev -Only functions
# equivalent:
firebase deploy --project dev --only functions
firebase deploy --project dev --only functions,firestore:rules,firestore:indexes,storage,hosting
```

Local deploys go through `scripts/deploy.ps1` / `scripts/deploy.sh`. Those scripts always pass `--project <alias>`. A leftover `firebase use` is not a targeting mechanism.

- Support-created throwaway geography, or a one-off Support pass — not a `seed/` import script aimed at this project.
- Razorpay **test** mode. Webhook URL is **only** the `dev` function URL.
- AI Studio `GEMINI_API_KEY` allowed. Vertex optional.
- App Check: debug tokens allowed.
- Service account for `dev` may live in a laptop env var.

**Forbidden in this playbook**

- `--project test` or `--project prod`.
- `seed/` bulk import.
- Prod or test Razorpay / KMS / Maps / VAPID keys.
- A client build whose Firebase `projectId` is not `logikchain-dev`.

**Exit.** Merge to `main`. CI starts the `test` playbook. A developer does not “also deploy this branch to test” unless CI is down, and that exception is logged.

---

## 6. Playbook: `test`

**Identity.** Alias `test`. Project `logikchain-test`. Apps `logikchain-web-test` / `logikchain-android-test`. Hosting `test.logikchain.com`. Package `com.logikchain.app.test`.

**Who.** CI on every merge to `main`. A human deploys here only to recover broken CI, and the deploy is logged.

**Purpose.** QA, UAT, release candidate. Last place a SHA runs before a tag. **Not** a second production and **not** a developer sandbox.

**Allowed**

```text
# CI on main (and workflow_dispatch). Laptop only with -CiRecovery:
.\scripts\deploy.ps1 -Alias test -CiRecovery
firebase deploy --project test --only functions,firestore:rules,firestore:indexes,storage,hosting
```

- Geography and plans created by Support through Config functions on **this** project.
- Razorpay **test** mode. Webhook URL is **only** the `test` function URL (a second dashboard row, second secret).
- Vertex in `logikchain-test`. No AI Studio key in the function runtime.
- App Check **enforced** (reCAPTCHA Enterprise + Play Integrity for the test package / test hosting).
- QA uses the test-flavor APK and `test.logikchain.com` only.

**Forbidden in this playbook**

- `seed/` import.
- Production Firestore export/import.
- Live Razorpay keys.
- `--project dev` or `--project prod` from this pipeline job.
- A QA tester signing into `logikchain.com` “to compare”.

**Exit.** QA signs off on this SHA. A tag `vX.Y.Z` on **that same SHA** starts the `prod` playbook. Tagging a different SHA is a failed release.

---

## 7. Playbook: `prod`

**Identity.** Alias `prod`. Project `logikchain-prod`. Apps `logikchain-web-prod` / `logikchain-android-prod`. Hosting `logikchain.com`. Package `com.logikchain.app`.

**Who.** CI only, on tag `vX.Y.Z`, after that SHA passed `test`. No human token has `functions.admin` on `logikchain-prod`. The prod service account is not downloaded onto a laptop.

**Purpose.** Live users and live money.

**Allowed**

```text
# CI on tag vX.Y.Z only. scripts/deploy.ps1 -Alias prod and npm run deploy:prod exit 1.
firebase deploy --project prod --only functions,firestore:rules,firestore:indexes,storage,hosting
```

- Support-created geography and plans on **this** project (same Config functions, different documents).
- Razorpay **live** mode. Webhook URL is **only** the `prod` function URL.
- Vertex in `logikchain-prod`.
- App Check **enforced**.
- Rollback = CI redeploy of the previous tag to `prod`. Not a document rewrite.

**Forbidden in this playbook**

- Any local `firebase deploy`.
- `seed/`.
- Test-mode Razorpay keys (and the reverse: live keys on `dev`/`test`).
- Importing `test` or `dev` data.
- A production APK or PWA that can retarget `dev`, `test`, or the emulator.

**Exit.** None in-band. Incidents are out of band. The next change starts again at `emulator` or `dev`.

---

## 8. Promotion (SHA only)

```
emulator (laptop)
    → PR
    → merge to main
    → CI: playbook test
    → QA on test.logikchain.com + test APK
    → tag vX.Y.Z on that SHA
    → CI: playbook prod
```

What is promoted: git SHA, function source, rules, indexes, hosting bundle.

What is **not** promoted: Firestore, Auth, Storage, secrets, webhook registrations, KMS keys, seed data.

Support clicks the same Config functions on `test` and again on `prod`. That duplication is the isolation. A `gcloud firestore export` from `prod` into `dev` or `test` is an exfil, not a refresh.

---

## 9. Compute deploy (shared mechanics)

These settings apply to `dev`, `test`, and `prod`. They do not apply to `emulator` (local runtime).

```text
firebase deploy --project <alias> --only functions
```

- **2nd gen only, Node 20:** `onCall` / `onRequest` / `onSchedule` / `onTaskDispatched` from `firebase-functions/v2/*`.
- **Region:** `asia-south1`. A `us-central1` leftover is out of contract.
- **Scale:** `minInstances: 0`. Concurrency 20–80. Memory 512 MB except the isolation list in `constitution/Logikchain_Architecture.md` §4 (1 GiB).
- **Isolation list** (own export, still 2nd gen): `handleGatewayWebhook`, `recordPayoutSettlement`, `initiatePayoutTransfer`, `runReconciliation`, `postDueCreditRelief`, `closeAccountingPeriod`, `reopenAccountingPeriod`, `issueCreditNote`, `getFinanceReport`, `exportFinanceReport`, `computeRouteMetrics`, Vertex-backed helpers.
- **HTTP:** Hosting rewrite `/v1/**` → function `api` in `asia-south1`. Same handlers as the named callables.
- **Source:** `functions/src/handlers/` must not import sibling handlers; shared internals live in `functions/src/lib/`.
- Not a Cloud Run service the team `gcloud run deploy`s.

`--project` is mandatory. CI rejects a deploy without it. A script that relies on `firebase use` leftover state is a defect.

---

## 10. What this workflow forbids

- Referring to an environment as `logikchainTest`, “the Firebase project”, or an unaliased `firebase deploy`.
- Running two GCP projects for the same alias (e.g. keeping `logikchainTest` **and** `logikchain-test`).
- Registering the same Firebase app nickname (`logikchainSuperApp`) on more than one project.
- `firebase deploy` with no `--project` alias, or with a raw project ID typed from memory.
- A human deploying to `prod` from a laptop.
- Crossing playbooks: `seed/` on `test`/`prod`; live Razorpay on `dev`/`test`; debug App Check on `test`/`prod`; emulator hosts in a `prod` or `test` client.
- 1st-gen Functions, Python Functions, or a `gcloud run deploy` of this API.
- `minInstances > 0` without a dated amendment in `constitution/Logikchain_Architecture.md` §4.
- A local `npm run deploy:test` / `deploy:prod` that does not exit 1.
- Five isolated `web/` apps or a runtime env picker (`constitution/Logikchain_Architecture.md` §2a).
- Hard-coded project IDs, webhook URLs, or KMS names in `functions/src`.
- One third-party key shared across aliases.
- Changing callable names per environment.

---

## 11. Appendix: retired name `logikchainTest`

Older constitution text and the Firebase console may still show a project named `logikchainTest`. That string is **not an alias** and is **not** a fifth environment.

- If that GCP project is kept, `.firebaserc` maps **`test` → that project's actual ID**. All speech, CI, and client flavors still say `test`.
- If `logikchain-test` is created instead, `logikchainTest` is disabled and forgotten. Do not run both.
- Function source, PWA env files, and Android flavors must not contain the string `logikchainTest`.
- New documents in this constitution do not use `logikchainTest` except this appendix.
