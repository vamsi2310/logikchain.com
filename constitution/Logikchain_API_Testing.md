# Logikchain API Testing (Bruno)

This document is the law for **HTTP API tests**. It owns how `/v1` operations from `constitution/Logikchain_API_Specifications.md` §0B are exercised. It does not own UI journeys, Firestore rules tests, or unit tests of `functions/src/lib/`.

The collection lives at `tests/bruno/`. One collection. One tool: **Bruno**. Requests are committed `.bru` files. There is no Postman cloud, no second collection per alias, and no callable-protocol duplicate of the same handler.

---

## 1. Scope

**In scope.** Every client-reachable `METHOD /v1/...` row in the API spec catalog. Setup, execute, and teardown for that `operationId`. Assertions on HTTP status and the spec error envelope.

**Out of scope.** Playwright UI flows. Vitest / lib unit tests. Firestore security-rules suites. Live Razorpay, SMS, Maps, or KMS calls. `initiatePayoutTransfer` (task worker). `postDueCreditRelief` (scheduler). Those are not HTTP client APIs.

**One wire.** Tests call Hosting-shaped HTTP (`METHOD {{baseUrl}}/v1/...` with Bearer). They do not call `httpsCallable` and they do not use retired `POST /api/{name}` paths. The handler is the same either way; a second protocol is a second API.

**One environment at a time.** Speech uses aliases only: `emulator`, `dev`. The Bruno default is `emulator`. `test` and `prod` are not Bruno targets. A collection pointed at `test.logikchain.com` or `logikchain.com` is a defect.

---

## 2. Tooling

| Item | Rule |
| ---- | ---- |
| Tool | Bruno (GUI or `@usebruno/cli`) |
| Collection root | `tests/bruno/` |
| Collection name | `Logikchain API` |
| Environments | `tests/bruno/environments/emulator.bru` (committed), `dev.bru` (committed, no secrets) |
| Secrets overlay | `tests/bruno/environments/*.local.bru` — gitignored. Tokens, webhook secrets, personal emails. |
| Results | `tests/bruno/results/` — gitignored |
| Catalog | `tests/bruno/catalog.mjs` — one row per `operationId`; regenerate requests from it |

Install the CLI at the collection (`npm install` in `tests/bruno/`). Open the folder in Bruno Desktop. Do not export to Postman and commit that export.

---

## 3. Folder standard (groups)

Groups are directories. Directory names are numbered so `bru run` order is the catalog order, not alphabetical accident.

| Dir | Group | Spec section | Tag |
| --- | ----- | ------------ | --- |
| `01-identity` | Onboarding and access | §1 | `identity` |
| `02-gigs` | Gig lifecycle | §2 | `gigs` |
| `03-orders` | Buyer orders | §3 | `orders` |
| `04-merchant-orders` | Merchant bulk orders | §3 | `merchant-orders` |
| `05-credit` | Credit line | §4 | `credit` |
| `06-payments` | Intents, capture, refunds, credit notes | §4 | `payments` |
| `07-payouts` | Beneficiaries and payouts | §4B | `payouts` |
| `08-cash` | Custody, handover, settlement | §4A | `cash` |
| `09-reports` | Finance reports and entitlements | §4 | `reports` |
| `10-subscriptions` | Plans, assign, subscribe, cancel | §5 | `subscriptions` |
| `11-config` | Geography, catalog, villages | §5 | `config` |
| `12-tax` | Tax profiles, TDS | §5 | `tax` |
| `13-reconciliation` | Runs, exceptions, periods | §4 | `reconciliation` |
| `14-ops` | Devices, stock, routes, health, privacy | §6–7 | `ops` |
| `15-webhooks` | Gateway and payout settlement | HTTPS REST | `webhook` |

A new `operationId` is added to the matching group. A new group needs a row in this table and a `folder.bru`.

Each group has:

```text
NN-group/
  folder.bru          # name, seq, docs, inherit auth
  00-group-setup.bru
  99-group-teardown.bru
  {operationId}/
    folder.bru
    00-setup.bru
    10-execute.bru
    90-teardown.bru
```

That layout is what makes **one API**, **one group**, and **the whole collection** independently runnable.

---

## 4. File standard (one operation)

### 4.1 Names

- Folder name **is** the `operationId` (`placeOrder`, not `Place Order` or `post-orders`).
- `00-setup.bru` — prepare caller, path params, and body vars.
- `10-execute.bru` — the spec HTTP line. This is the test.
- `90-teardown.bru` — reverse only what this execute created and the spec allows to reverse.

`meta.name` on execute is the `operationId`. `meta.seq` is `0`, `10`, `90` inside the operation folder. Tags always include the group tag and the `operationId`. Add `smoke` only on read-only, fixture-safe executes (`listConfigurationCatalog`, `getSystemHealth`, `getEntitlements`, `getCashCustodySummary`). Add `money` on any execute that can write a ledger, intent, invoice, or custody row. Add `webhook` and `manual` on provider callbacks.

### 4.2 Execute request shape

```text
meta {
  name: placeOrder
  type: http
  seq: 10
}

post {
  url: {{baseUrl}}/v1/orders
  body: json
  auth: inherit
}

headers {
  Content-Type: application/json
  Idempotency-Key: {{idempotencyKey}}
  X-Correlation-Id: {{correlationId}}
}

body:json {
  { ...spec fields... }
}

assert {
  res.status: in [200, 400, 401, 403, 404, 409, 429]
}

tests {
  test("envelope is spec-shaped", function () {
    const status = res.getStatus();
    const body = res.getBody();
    if (status === 200) {
      expect(body).to.be.an("object");
    } else {
      expect(body).to.have.property("error");
      expect(body.error).to.have.property("code");
      expect(body.error).to.have.property("message");
    }
  });
}
```

Rules:

- URL is `{{baseUrl}}` plus the spec path. Path params are `{{var}}`, never hard-coded UIDs from `prod`.
- Verb matches §0B. No `POST` used as a `PATCH`.
- Auth is `inherit` except webhooks (`mode: none`) and the public countries slice of `listConfigurationCatalog`.
- `Idempotency-Key` is sent on every mutate the spec requires `idempotencyKey` for. The same key is also in the JSON body when the interface names the field. Header and body must match.
- `X-Correlation-Id` is set on every request. Format: `{operationId}:{runId}:{seq}`.
- `Content-Type: application/json` on requests with a body. GET uses query string vars, not a dummy POST.
- Do not send App Check headers on `emulator` (Functions skip enforcement there). On `dev`, send `X-Firebase-AppCheck` from the local overlay only.

### 4.3 Setup

`00-setup.bru` does three things and nothing else:

1. **Caller.** Mint or refresh a Firebase ID token for the role the Security block names. Store it in a collection runtime var (`supportAccessToken`, `buyerAccessToken`, …). Collection auth uses `{{accessToken}}`; setup copies the role token into `accessToken` before execute.
2. **Fixtures.** Resolve IDs the body needs (`gigId`, `orderId`, `countryId`). Prefer vars written by an earlier execute in this run. Fall back to environment seed IDs (`seedGigId`, …). Never invent a `prod` UID.
3. **Isolation.** Mint a fresh `idempotencyKey` and `correlationId` for this execute. Writes that create users or config rows use a run-scoped suffix (`{{runId}}`) so a second local run does not collide with `ALREADY_EXISTS`.

Setup may call the Auth emulator (`{{authEmulator}}`) to sign in seed users. Setup must not call the operation under test. Setup must not call `test` or `prod`.

If the operation cannot be executed without a prior mutation (example: `cancelOrder` needs `placeOrder`), setup documents that dependency in `docs` and reads `{{orderId}}`. Running that execute alone without a prior place is expected to return `NOT_FOUND` — that is still a valid isolated run; do not silently skip.

### 4.4 Teardown

Teardown is **isolation**, not history rewrite.

| Created by execute | Teardown may |
| ------------------ | ------------ |
| Config / catalog row this run created | `deactivateConfigurationRecord` |
| Buyer or merchant order still cancellable | `cancelOrder` / `cancelMerchantOrder` |
| `suspendUser` this run performed | `restoreUser` with a new idempotency key |
| Device token this run registered | `registerDeviceToken` with `revoke: true` |
| Subscription this run created and still cancellable | `cancelSubscription` |
| Append-only money (intents, ledger, custody, payouts, invoices, TDS, audit) | **Nothing.** Do not delete. Do not refund “to clean up” unless the execute under test is `refundOrder`. |

Suite-level cleanup is **restarting the emulator**, not a Bruno script that wipes Firestore. `99-group-teardown` and collection teardown only clear runtime vars (`bru.deleteVar`) so the next group does not inherit a stale `orderId`.

A teardown that fails must not hide an execute failure. Assert teardown HTTP only when teardown is a real reverse call; var-clear teardowns assert `true`.

### 4.5 Docs block

Every `00-setup`, `10-execute`, and `90-teardown` carries a `docs` block with:

- `operationId`
- Spec HTTP line
- Required role
- What setup prepares
- What execute asserts
- What teardown will / will not reverse

---

## 5. Environments

Committed environment files contain **hosts and seed identifiers only**.

| Variable | `emulator` | `dev` |
| -------- | ---------- | ----- |
| `alias` | `emulator` | `dev` |
| `baseUrl` | `http://127.0.0.1:5001/{{projectId}}/asia-south1/api` | `https://asia-south1-{{projectId}}.cloudfunctions.net/api` |
| `authEmulator` | `http://127.0.0.1:9099` | *(empty — use overlay tokens)* |
| `projectId` | the `.firebaserc` `dev` id when the emulator was started with `--project dev`, else the emulator project the operator passed | `.firebaserc` `dev` id |
| `firebaseWebApiKey` | any non-empty string the Auth emulator accepts | from `web/.env.development` overlay, not committed here |
| `seedPassword` | well-known emulator-only password | must not be set |
| `seed*Email` | `seed/` addresses (`support1@logikchain.com`, …) | throwaway Support-created accounts, overlay only |
| `seedCountryId` | `country_in` | Support-created country on `dev` |

Forbidden in committed env files: ID tokens, refresh tokens, Razorpay secrets, webhook secrets, App Check debug tokens, `prod` hosts, personal emails.

`dev` Bruno runs are optional and manual. They use throwaway records, never `seed/` import. They never use live Razorpay. Prefer `emulator`.

---

## 6. Auth and headers

Collection default auth is Bearer `{{accessToken}}`.

Seed roles on `emulator` (from `seed/`):

| Role | Env email var | Token var |
| ---- | ------------- | --------- |
| support | `seedSupportEmail` | `supportAccessToken` |
| supplier | `seedSupplierEmail` | `supplierAccessToken` |
| buyer | `seedBuyerEmail` | `buyerAccessToken` |
| merchant | `seedMerchantEmail` | `merchantAccessToken` |
| vehicle | `seedVehicleEmail` | `vehicleAccessToken` |

Setup for an operation copies the matching token into `accessToken`. A test that checks `UNAUTHENTICATED` clears `accessToken` for that execute only.

App Check: omitted on `emulator`. Required on `dev` via overlay. Vehicle official-client operations (`startGig`, `updateGigLocation`, `completeAndFinalizeGig`, `markOrderDelivered`, `updateMerchantOrderStatus`, `initiateCreditRepayment`, `confirmCreditRepayment`, `declareCashHandover`, `confirmCashSettlement`, `acknowledgeGig`, `requestVerificationFallback`) are skipped on `dev` unless the overlay supplies a Play Integrity token. On `emulator`, Functions skip that check — the execute is legal there.

Webhooks send no Bearer. They send the provider signature header the handler expects. Unsigned webhook executes are tagged `manual` and are allowed only on `emulator` against a stub secret. Do not store the live webhook secret in the collection.

---

## 7. Assertions

Every execute asserts:

1. Status is one of the spec status codes in §0B (`200`, `400`, `401`, `403`, `404`, `409`, `429`, `500` only if the test is explicitly an internal-error probe — default suite must not expect `500`).
2. Failure body is `{ error: { code, message } }`. `error.code` is a spec `SpecErrorCode`, not the gRPC string (`permission-denied`).
3. Success body is a JSON object. When the spec names a required success field (`orderId`, `success`, `gigId`), assert it is present and non-empty.
4. Money fields that the spec stores in rupees stay numbers. Do not assert paise unless the field is documented as paise.

Do not assert Firestore documents from Bruno. If the run must prove a ledger write, that is a handler test, not this collection.

Do not assert wall-clock timestamps beyond “is an ISO string”.

A happy-path execute that returns a business refusal (`NOT_SERVICEABLE`, `INSUFFICIENT_CREDIT`) because fixtures are missing is a **setup gap**, not a passing test. Mark the execute failed or skip the folder until fixtures exist. Do not weaken the assertion to “any 4xx”.

---

## 8. How to run

From `tests/bruno/`, with the Auth + Functions + Firestore emulators already up (`functions` `npm run serve`, or the workflow emulator playbook):

```text
# entire collection
npx bru run --env emulator

# one logical group
npx bru run 03-orders --env emulator

# one API (setup + execute + teardown)
npx bru run 03-orders/placeOrder --env emulator

# execute only
npx bru run 03-orders/placeOrder/10-execute.bru --env emulator

# tagged subsets
npx bru run --env emulator --tags smoke
npx bru run --env emulator --tags payments
npx bru run --env emulator --exclude-tags webhook
npx bru run --env emulator --exclude-tags manual
```

GUI: open `tests/bruno/`, pick environment `emulator`, run the request, the folder, or the collection.

Default CI command is the full collection excluding `webhook` and `manual`:

```text
npx bru run --env emulator --exclude-tags webhook --exclude-tags manual
```

Do not `bru run` against `dev` in CI.

---

## 9. Isolation and data

- Each collection run mints `runId` (UTC timestamp + short random) in collection pre-request. Creates use it (`bruno-{{runId}}@logikchain.test`, `country_bruno_{{runId}}`).
- `seed/` fixtures are `emulator` only. Bruno on `dev` must not assume `country_in` or `buyer1`.
- Parallel `bru run` against one emulator is forbidden. One runner, sequential folders.
- Restart the emulator (or `emulators:exec`) between full-suite runs that create money rows.
- Never import `seed/` into `dev`, `test`, or `prod` to make a Bruno test pass.

---

## 10. Best practices

1. **Spec is the source.** Path, verb, role, payload, and error codes are copied from `Logikchain_API_Specifications.md`. If the `.bru` file disagrees with the spec, the spec wins and the request is wrong.
2. **Catalog is the index.** Add or rename an `operationId` in `tests/bruno/catalog.mjs` and regenerate. Do not leave a request whose name is not an export in `functions/src/index.ts`.
3. **One operation, three files.** Do not fold setup into execute “to keep it simple”. Isolated re-runs depend on `00-setup`.
4. **No secrets in git.** Tokens live in runtime vars or `*.local.bru`.
5. **No `prod`.** No production host, no production seed, no production webhook replay.
6. **No silent 200.** `success: true` on a money call is not “money moved”. Assert the fields the spec says that call returns; do not add a second call that “checks the rail”.
7. **Idempotency is a test, not only a header.** Money executes may include a second request (same key, same body) in `tests` via `bru.sendRequest` where Bruno allows it, asserting the same result. A different body with the same key must yield `IDEMPOTENCY_CONFLICT`. If the CLI version cannot nest requests, add a sibling `11-replay.bru` tagged `idempotency`.
8. **Webhooks stay manual.** Replaying a captured live payload is how test money becomes real money. Emulator stubs only.
9. **Do not test the wrapper twice.** A passing `10-execute` is enough. Do not add a callable-protocol clone.
10. **Keep docs short.** The `docs` block states role, fixture, and teardown class. It does not paste the spec.

---

## 11. Adding an operation

1. Land the row in `constitution/Logikchain_API_Specifications.md` §0B and the handler export.
2. Add one object to `tests/bruno/catalog.mjs` (group, verb, path, role, body, teardown class, tags).
3. Run `node scripts/generate.mjs` from `tests/bruno/`.
4. Hand-tune `10-execute.bru` assertions if the spec names extra required success fields.
5. Run that folder: `npx bru run {group}/{operationId} --env emulator`.

Do not add a Bruno request for an `operationId` that is not in the spec.

---

## 12. Related constitution

| Document | What it owns |
| -------- | ------------ |
| `constitution/Logikchain_API_Specifications.md` | Wire: method, path, security, payloads, error codes |
| `constitution/Logikchain_Firebase_Workflow.md` | Alias playbooks; emulator is the Bruno host |
| `constitution/Logikchain_Architecture.md` | `/v1` rewrite to `api`; no second gateway |
| `constitution/Logikchain_Financial_Controls.md` | What a money success is allowed to mean |
| `tests/bruno/` | The collection this file governs |
