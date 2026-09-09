# Logikchain Integration Config Guide

This guide details the integration parameters, provisioning steps, and security guidelines for all third-party services utilized by the Logikchain platform. Every chapter is executed **once per alias** (`dev`, `test`, `prod`). Values are not copied between aliases. The playbook for who may run which command is `constitution/Logikchain_Firebase_Workflow.md`.

---

## Table of Contents

1. [Firebase Integration](#1-firebase-integration)
   - 1.0 Environments
   - 1.1 Web App Config
   - 1.2 Firebase Admin SDK
   - 1.3 Android App Config
   - 1.4 App Check
   - 1.5 Firebase Functions 2nd gen
2. [Google Maps Platform](#2-google-maps-platform)
3. [Gemini API](#3-gemini-api)
4. [Razorpay Payments](#4-razorpay-payments)
   - 4.1 Test Mode Credentials
   - 4.2 Secure Webhooks Setup
   - 4.3 Server-Priced Orders and Idempotency
   - 4.4 Event-to-state matrix
   - 4.5 Settlement reports
   - 4.6 Payout rail
   - 4.7 Encryption of financial credentials
   - 4.8 Financial control thresholds
   - 4.9 Tax configuration and place of supply
   - 4.10 Statutory withholding (TDS)
   - 4.11 Retention, privacy, and redaction
5. [Firebase Cloud Messaging (FCM)](#5-firebase-cloud-messaging-fcm)
6. [SMS Gateway & OTP Integration](#6-sms-gateway--otp-integration)

---

## 1. Firebase Integration

Firebase serves as the backend host, providing real-time data sync, user authentication, and Firebase Functions 2nd gen. **Three** Firebase projects exist, addressed only by alias (`dev`, `test`, `prod` — `constitution/Logikchain_Firebase_Workflow.md` §1). Each project registers **two** client apps with **env-specific nicknames**. Do not create a fourth project for the Play app, do not reuse `logikchainSuperApp` as a nickname on every project, and do not share keys across aliases.

### 1.0 Environments
Open the Firebase console for **one** alias and finish §1.1–1.5, Maps, Razorpay, and KMS for **that** alias before opening another. A key minted on `prod` is not pasted into `dev`.

| Alias | Project ID | Web app nickname | Android app nickname | Hosting | Android applicationId |
| ----- | ---------- | ---------------- | -------------------- | ------- | --------------------- |
| `dev` | `logikchain-dev` | `logikchain-web-dev` | `logikchain-android-dev` | `logikchain-dev.web.app` | `com.logikchain.app.dev` |
| `test` | `logikchain-test` | `logikchain-web-test` | `logikchain-android-test` | `test.logikchain.com` | `com.logikchain.app.test` |
| `prod` | `logikchain-prod` | `logikchain-web-prod` | `logikchain-android-prod` | `logikchain.com` | `com.logikchain.app` |

`emulator` is not in this table: it is not provisioned in the console (`constitution/Logikchain_Firebase_Workflow.md` §4). The retired console name `logikchainTest` is not an alias; see workflow §11. Region for Functions on all three remote aliases: **`asia-south1`**.

Store captured values in the file named for that alias. Do not keep one `.env` that is “whatever I deployed last”. There is no runtime picker in the PWA.

| Alias | Vite `--mode` | Web env file (gitignored) | Functions env (gitignored) |
| ----- | ------------- | ------------------------- | -------------------------- |
| `emulator` | `emulator` | `web/.env.emulator` | *(none — emulator stubs)* |
| `dev` | `development` | `web/.env.development` | `functions/.env.dev` |
| `test` | `test` | `web/.env.test` | `functions/.env.test` |
| `prod` | `production` | `web/.env.production` | `functions/.env.prod` |

`web/.env.local` is a personal overlay. It may set `REACT_APP_USE_LOCAL_FUNCTIONS=true` so `/v1` hits `127.0.0.1:5001` while Auth/Firestore stay on the Vite `--mode` alias. It must not set `FIREBASE_PROJECT_ALIAS`. Ignored for production builds. Committed samples: `web/.env.development.example`, `web/.env.test.example`, `web/.env.production.example`, `web/.env.local.example`, `web/.env.emulator`, `functions/.env.example`.

*   **Parameters to Capture (per alias):**
    *   `FIREBASE_PROJECT_ALIAS` (`dev` \| `test` \| `prod`)
    *   `REACT_APP_FIREBASE_PROJECT_ID` matching that alias’s project ID
    *   Android `applicationId` + `src/<alias>/google-services.json`
    *   `FUNCTIONS_REGION=asia-south1`

### 1.1 Web App Config (Client SDK)
*   **Purpose**: Client-side initialization for Firebase Auth, Firestore, Storage, App Check, and FCM on the Vite PWA **for one alias**. One Firebase web app covers all five role entries (`/`, `/m/`, `/d/`, `/s/`, `/x/`). Do not register a web app per role.
*   **Provisioning Steps**:
    1. Navigate to the [Firebase Console](https://console.firebase.google.com/).
    2. Select **only** the project for the alias being provisioned (`logikchain-dev`, `logikchain-test`, or `logikchain-prod`).
    3. Under Project Overview, click the Web icon (`</>`) to add an app. Register it as the nickname in §1.0 (`logikchain-web-dev` / `-test` / `-prod`), not `logikchainSuperApp`.
    4. Copy the auto-generated config object into **that alias’s** env file (`web/.env.development` / `.env.test` / `.env.production`). Screens read it only through `web/src/config/env.ts`.
    5. Hosting `public` is `web/dist`. Confirm rewrites: `/v1/**` → function `api` (`asia-south1`); `/m/**` `/d/**` `/s/**` `/x/**` → that role’s `index.html`.
*   **Parameters to Capture**:
    *   `REACT_APP_FIREBASE_API_KEY`
    *   `REACT_APP_FIREBASE_AUTH_DOMAIN`
    *   `REACT_APP_FIREBASE_PROJECT_ID`
    *   `REACT_APP_FIREBASE_STORAGE_BUCKET`
    *   `REACT_APP_FIREBASE_MESSAGING_SENDER_ID`
    *   `REACT_APP_FIREBASE_APP_ID`
    *   `REACT_APP_FIREBASE_MEASUREMENT_ID`

### 1.2 Firebase Admin SDK (Server SDK)
*   **Purpose**: Authorizes backend Firebase Functions and admin scripts with full privileges (e.g., credit updates, driver payouts, transaction audits). One service account **per alias**. The `prod` key is never downloaded onto a laptop (`constitution/Logikchain_Firebase_Workflow.md` playbook `prod`).
*   **Provisioning Steps**:
    1. In the Firebase Console for that alias, go to **Project Settings** > **Service Accounts**.
    2. Click **Generate New Private Key** only for `dev` (local/CI) and the CI accounts for `test` / `prod`.
    3. Securely download the JSON key file.
*   **Security Guidelines**:
    *   **NEVER** commit this JSON key file to git or public repositories.
    *   For local emulator and `dev`, place the path in `GOOGLE_APPLICATION_CREDENTIALS` or stringify the JSON into `FIREBASE_SERVICE_ACCOUNT_KEY` env. Never point those variables at the `prod` account.
*   **Parameters to Capture**:
    *   `FIREBASE_SERVICE_ACCOUNT_KEY` (stringified JSON)

### 1.3 Android App Config (Client SDK)
*   **Purpose**: Client-side initialization for Firebase Auth, Firestore, Firebase Functions, FCM, and App Check on the Kotlin + Jetpack Compose Play app **for one alias**. Official runtime for `vehicle`. Same project as §1.1 for that alias. Runtime rules are in `constitution/Logikchain_Architecture.md`.
*   **Provisioning Steps**:
    1. In the Firebase Console, select **only** the project for the alias being provisioned.
    2. Under Project Overview, click the Android icon. Register it as the nickname in §1.0 (`logikchain-android-dev` / `-test` / `-prod`) with that alias’s `applicationId`.
    3. Add the SHA-1 and SHA-256 fingerprints that belong to **that flavor** (debug keystore for `dev`; Play App Signing for `test` and `prod`). Do not paste prod fingerprints into the `dev` app.
    4. Download `google-services.json` into `android/app/src/<alias>/`. Do not overwrite another flavor’s file. Do not commit unrestricted Maps or Gemini keys.
*   **Parameters to Capture**:
    *   `ANDROID_APPLICATION_ID` (package name)
    *   `ANDROID_FIREBASE_APP_ID`
    *   Debug and release SHA-256 fingerprints (stored as CI secrets, not in the repo)

### 1.4 App Check
*   **Purpose**: Stops the public Firebase config from becoming an anonymous Functions, Firestore, Storage, and Maps meter. Every client-reachable callable rejects a missing token with `UNAUTHENTICATED`. When the caller is `vehicle`, custody and gig-mutation functions additionally require the Play Integrity provider or they return `CLIENT_NOT_OFFICIAL` (`constitution/Logikchain_API_Specifications.md` §0).
*   **Provisioning Steps**:
    1. In Firebase Console, open **App Check**.
    2. Register the web app nickname for **this alias** (`logikchain-web-dev` / `-test` / `-prod`) with **reCAPTCHA Enterprise**. Separate site keys per alias.
    3. Register the Android app nickname for **this alias** with **Play Integrity** bound to that alias’s package name.
    4. Enforce App Check on Functions, Firestore, and Storage on `test` and `prod`. `dev` may allow debug tokens. Do not reuse a `dev` debug token on `test`.
*   **Parameters to Capture**:
    *   `RECAPTCHA_ENTERPRISE_SITE_KEY` (web App Check; never a Gemini or Maps key)
    *   Play Integrity is bound to the package name and signing certificates in §1.3 — no extra client secret.
    *   Debug App Check tokens are allowed on `dev` and the emulator only. `test` and `prod` enforce.

### 1.5 Firebase Functions 2nd gen
*   **Purpose**: The only compute. Callable, HTTPS (`api` + webhooks), scheduled, and task exports named in `constitution/Logikchain_API_Specifications.md`. Runtime is **Node 20**.
*   **Provisioning Steps**:
    1. Enable Cloud Functions, Cloud Run, Artifact Registry, Cloud Build, Cloud Scheduler, Cloud Tasks, and Secret Manager on each project.
    2. Set the Functions region to `asia-south1`. Confirm no leftover `us-central1` exports exist. Confirm `firebase.json` `runtime` is `nodejs20`.
    3. Store secrets with `firebase functions:secrets:set <NAME> --project <alias>`. Do not use deprecated `functions.config()`.
    4. Deploy only through `scripts/deploy.ps1` / `scripts/deploy.sh` or CI, always `firebase deploy --project <alias> --only functions` as in `constitution/Logikchain_Firebase_Workflow.md`.
*   **Locked settings:** Node 20. `minInstances: 0`. No 1st-gen exports. No Python. No `gcloud run deploy`. Isolation list and handler/`lib` split: `constitution/Logikchain_Architecture.md` §4.
*   **Parameters to Capture**:
    *   `FUNCTIONS_REGION=asia-south1`
    *   Secret Manager resource names **per alias** (Razorpay, webhook, SMS, KMS key path)

---

## 2. Google Maps Platform

Google Maps API is integrated to automate village-to-village geofence transitions and provide waypoints for logistics routing.

### 2.1 API Services Used
*   **Geocoding API**: Maps village/hub names to GPS coordinates (`latitude`/`longitude`) for administrative registration.
*   **Distance Matrix API**: Computes distances and driving times between hub-to-village and village-to-village nodes.
*   **Maps SDK (JavaScript/Mobile)**: Supports universal navigation intents and local rendering on driver devices.

### 2.2 Provisioning Steps
Mint the three keys below **in the GCP project that matches the alias**. Do not create keys in `logikchain-prod` and restrict them to `dev` referrers.

1. Open the [Google Cloud Console](https://console.cloud.google.com/) for that alias’s project.
2. Enable the **Geocoding API**, **Distance Matrix API**, and **Maps SDK for Android/iOS/Web**.
3. Go to **APIs & Services** > **Credentials**.
4. Click **Create Credentials** > **API Key**. Repeat until this alias has three keys.

### 2.3 Key Security Restrictions
*   **Three keys per alias, not one.** A key that can call Distance Matrix must never ship in either client. Per alias, mint (1) a **server** key, Functions-only, with Geocoding + Distance Matrix; (2) a **web** key restricted to **that alias’s** hosting origin; (3) an **Android** key restricted to **that alias’s** package name plus SHA-256 and the Maps SDK for Android.
*   **Application Restrictions**: `dev` web → `logikchain-dev.web.app`. `test` web → `test.logikchain.com`. `prod` web → `logikchain.com`. Do not reuse the web key in the APK, the Android key on the PWA, or a `prod` key on `dev`.
*   **API Restrictions**: Under "API restrictions", select only the APIs that key is allowed to call.

*   **Parameters to Capture (per alias):**
    *   `GOOGLE_MAPS_API_KEY` (server / Functions — Distance Matrix and Geocoding)
    *   `REACT_APP_GOOGLE_MAPS_API_KEY` (web, referrer-restricted, Maps JavaScript SDK only)
    *   `ANDROID_GOOGLE_MAPS_API_KEY` (package- and SHA-restricted, Maps SDK for Android only)

---

## 3. Gemini API

The Gemini API powers AI-driven platform workflows, automated route suggestions, and dynamic inventory / pamphlet generation.

### 3.1 Google AI Studio (`emulator` and `dev` only)
*   **Purpose**: Fast prototyping of system instructions and AI-driven UI helpers. Not a `test` or `prod` runtime key.
*   **Provisioning Steps**:
    1. Access [Google AI Studio](https://aistudio.google.com/).
    2. Sign in with the Google account that owns `logikchain-dev`.
    3. Click **Get API Key** and select `logikchain-dev`.
    4. Store the key in `functions/.env.dev` / emulator env only.

### 3.2 Vertex API (`test` and `prod`)
*   **Purpose**: Enterprise-grade AI execution with data residency in **that alias’s** project.
*   **Provisioning Steps**:
    1. In Google Cloud Console for `logikchain-test` or `logikchain-prod` (the alias being provisioned), enable the **Vertex AI API**.
    2. Grant the Functions service account of **that** project the `Vertex AI User` role. Do not grant the `dev` account access to the `prod` Vertex project.

*   **Parameters to Capture**:
    *   `GEMINI_API_KEY` (`emulator` / `dev` only)
    *   `GCP_VERTEX_PROJECT_ID` (equals the alias’s Firebase project ID on `test` and `prod`)

---

## 4. Razorpay Payments

Razorpay is the payment gateway of choice for mobile checkouts via Indian UPI (Google Pay, PhonePe, Paytm) and domestic credit/debit cards.

Razorpay is provisioned **twice in test mode** (`dev` and `test` — two webhook rows, two secrets) and **once in live mode** (`prod`). Mixing those three is how a captured test payload is replayed against live money.

### 4.1 Test Mode Credentials (`dev` and `test` only)
*   **Purpose**: Sandbox testing of buyer checkouts, merchant credit repayments, and Supplier/Merchant platform subscription billing (Plans and Tariffs published by Support) without executing real financial transactions. Used by the `dev` playbook and the `test` playbook, each with its own webhook URL.
*   **Provisioning Steps**:
    1. Log into the Razorpay Dashboard.
    2. Select **Test Mode** from the environment toggle in the header.
    3. Navigate to **Account & Settings** > **API Keys**.
    4. Click **Generate Key**. Download and store the Key ID and Key Secret.

### 4.2 Secure Webhooks Setup
*   **Purpose**: Real-time server-to-server confirmation of successful checkouts to prevent client-side payment forgery.
*   **Webhooks Configuration**:
    1. Go to **Account & Settings** > **Webhooks** in Razorpay Dashboard.
    2. Add the webhook URL for **one** alias only:
       `https://asia-south1-<project_id>.cloudfunctions.net/handleGatewayWebhook`
       `dev` and `test` rows live on the Razorpay **test** dashboard (two rows, two secrets). The `prod` row lives on the **live** dashboard only. Never register the `prod` URL on the test dashboard, or a `dev`/`test` URL on live.
    3. Select active webhook events:
       *   `payment.authorized`
       *   `payment.captured`
       *   `payment.failed`
       *   `order.paid`
       *   `refund.created`
       *   `refund.processed`
       *   `refund.failed`
       *   `payout.processed`
       *   `payout.failed`
       *   `payout.reversed`
       *   `subscription.charged` (platform Plan/Tariff renewals)
       *   `subscription.halted`
       *   `settlement.processed`
    4. Provide a strong, random custom Webhook Secret (`RAZORPAY_WEBHOOK_SECRET`).
*   **Backend Signature Validation**:
    *   Cloud Functions must intercept webhook POST requests, retrieve the `x-razorpay-signature` header, compute the HMAC-SHA256 signature of the **raw, unparsed** request body using `RAZORPAY_WEBHOOK_SECRET`, and compare it in constant time before updating the database. Hashing a re-serialised object rather than the exact bytes that were signed is the standard way this check is accidentally defeated.
    *   The same validation applies to the Callable path. `processPayment` requires a `gatewaySignature` whether it is invoked by a client or by the webhook, because a client asserting its own payment succeeded is not evidence.
    *   Events older than `RAZORPAY_WEBHOOK_REPLAY_WINDOW_SECONDS` are stored as evidence and ignored, so a captured payload cannot be replayed days later.

### 4.3 Server-Priced Orders and Idempotency
*   **Purpose**: Ensures the amount a payer is charged is the amount the platform computed, and that a repeated gateway callback cannot apply the same payment twice.
*   **Order creation**: `createPaymentIntent` calls the Razorpay **Orders API** with a server-derived amount in paise, never an amount supplied by the client, and passes an idempotency key derived from the purpose plus the target document id. The returned Razorpay order id is stored as `PaymentIntent.gatewayOrderId`, and the client is handed only that id.
*   **Amount reconciliation**: `processPayment` compares the amount reported by the gateway against the stored `PaymentIntent.amount` and rejects any difference as `AMOUNT_MISMATCH`, moving the intent to `failed`. A partial capture is not treated as a partial payment.
*   **Event de-duplication**: every applied webhook event id is appended to `PaymentIntent.gatewayEventIds` and to the `PaymentTransaction` it applied to. A repeat delivery of an id already present is acknowledged to Razorpay as a success and applied to nothing. Razorpay retries the same event on any non-2xx response, and a merchant credit line relieved twice for one payment is a direct loss to the supplier.
*   **Provider reference uniqueness**: a `gatewayPaymentId` is consumable exactly once across all `PaymentTransactions`. A second arrival against a different obligation is recorded as a `duplicate_at_provider` reconciliation exception, not applied.
*   **Failed and pending events**: a `payment.failed` event sets the transaction to `failed` with a `failureCategory` and the provider's verbatim reason; an authorized-but-uncaptured payment sets `pending`. Neither touches a credit balance or an order's `paymentStatus`. A merchant's credit stays drawn until an event says otherwise, and the client is expected to open a fresh attempt rather than retry a terminal one.

### 4.4 Event-to-state matrix

Every accepted event maps to exactly one platform transition. An event type absent from this table returns HTTP 200 with `applied: false, reason: "unhandled_event"`; it is never guessed at.

| Provider event | Matched by | Target record | Transition | Refused when |
| -------------- | ---------- | ------------- | ---------- | ------------ |
| `payment.authorized` | `order_id` → `PaymentIntent.gatewayOrderId` | `PaymentTransaction` | `initiated` → `pending` | Signature invalid, event stale |
| `payment.captured` | `order_id` + `payment.id` | `PaymentTransaction` | `pending` → `succeeded` | Amount ≠ intent amount, currency ≠ `INR`, `payment.id` already consumed, transaction terminal |
| `payment.failed` | `order_id` + `payment.id` | `PaymentTransaction` | `pending` → `failed` | Transaction already `succeeded`; raises a `status_mismatch` exception instead |
| `order.paid` | `order_id` | `PaymentIntent` | Confirms `paid`; no-op when already applied | — |
| `refund.created` | `payment.id` + `refund.id` | `RefundTransaction` | `requested` → `processing` | No matching refund record |
| `refund.processed` | `refund.id` | `RefundTransaction`, `PaymentTransaction` | Refund → `completed`; payment → `partially_refunded` or `reversed` | Cumulative refunds would exceed the captured amount |
| `refund.failed` | `refund.id` | `RefundTransaction` | `processing` → `failed` | — |
| `payout.processed` | `payout.id` → `PayoutTransaction.providerTransferId` | `PayoutTransaction` | `initiated`/`processing` → `completed` | No UTR in the payload, or payout already terminal |
| `payout.failed` | `payout.id` | `PayoutTransaction` | → `failed`, reservation released to `pendingDues` | Payout already `completed`; raises a `status_mismatch` exception |
| `payout.reversed` | `payout.id` | `PayoutTransaction`, `BeneficiaryAccount` | `completed` → `reversed`, dues restored, beneficiary to `pending_verification` | — |
| `subscription.charged` | `subscription.id` | `SubscriptionInvoice`, `PlatformSubscription` | Period advanced, entitlements re-resolved | Amount ≠ invoice total |
| `subscription.halted` | `subscription.id` | `PlatformSubscription` | → `past_due` with a grace window | — |
| `settlement.processed` | `settlement.id` | `PaymentTransaction` | Stamps `bankSettledAt`, `providerFee`, `providerTax` | — |

*   **No matching record**: a signed event whose reference matches nothing on the platform opens a `missing_on_platform` `ReconciliationException` and returns HTTP 200. This is the path that catches a payment captured against an order the platform failed to persist.
*   **Evidence before effect**: the raw payload is written to Cloud Storage and its pointer recorded before any transition is attempted, so a transition that later proves wrong can still be examined against exactly what the provider sent.
*   **Always 200 for a signed, well-formed event**: business failures become exceptions in the Support queue, not endless provider retries. `INVALID_SIGNATURE` is the only condition that returns a non-2xx.

### 4.5 Settlement reports

*   **Purpose**: The third leg of reconciliation. Provider events say what the gateway did; the settlement report says what actually reached the bank, net of fees and tax.
*   **Ingestion**: A scheduled job pulls the previous business day's Razorpay settlement report and the platform's bank statement, normalises both into `ReconciliationRun.sources`, and hands them to `runReconciliation`.
*   **Fee and tax capture**: each settled payment carries `providerFee` and `providerTax` onto its `PaymentTransaction`, and `netSettlementAmount` is derived rather than assumed. A fee differing from the contracted schedule raises a `fee_variance` exception.

### 4.6 Payout rail

Payouts leave the platform on an API-and-webhook rail. Manual bank transfer exists only as a controlled fallback for when that rail is unavailable, and carries the two-person UTR control described in `constitution/Logikchain_API_Specifications.md`, section 4B.

*   **Primary rail**: RazorpayX Payouts, or an equivalent provider exposing create-payout, fetch-payout, and payout webhooks. Fund account and contact objects are built from a verified `BeneficiaryAccount`, never from a free-text profile field.
*   **Beneficiary verification**: UPI VPA validation and bank penny drop run at `registerPayoutBeneficiary` time, and the returned account-holder name is stored for the name-match check.
*   **Idempotency**: every create-payout call carries `payout:{payoutTransactionId}`, so a retried network call cannot produce two credits.
*   **Rail selection**: UPI for a UPI beneficiary; IMPS below the configured ceiling and NEFT above it for a bank beneficiary; RTGS only where the ceiling requires it.
*   **Float monitoring**: the payout account balance is polled before each batch. Insufficient float holds the batch and raises a Support alert rather than producing a wave of `insufficient_float` failures across every driver.
*   **Reconciliation of the outbound leg**: payouts are matched against the provider payout report and the bank debit, exactly as collections are matched against the settlement report. A payout the platform believes completed with no bank debit behind it is a `missing_at_provider` exception.

### 4.7 Encryption of financial credentials

*   Full UPI VPAs, bank account numbers, and PAN are encrypted at rest with a Cloud KMS key. Only the payout and verification functions hold decrypt permission; no client and no Support console can read through it.
*   `maskedLabel`, `accountNumberLast4`, `vpaHandle`, and `ifsc` are the only representations returned by any API or rendered on any screen.
*   Application logs, error reports, analytics events, and archived webhook payloads are scrubbed of these values before storage.

### 4.8 Financial control thresholds

Every threshold that decides whether an act needs a second pair of eyes is configuration, not a constant compiled into a function. A platform that has to ship code to change its approval limit will not change it, and an approval limit that never moves stops matching the business it governs.

*   Thresholds are held in a Support-managed configuration document, versioned, and read at the moment of the decision. Changing one is itself a privileged act: it writes an `AuditLogEntry` naming the old value, the new value, the actor, and the reason.
*   A decision records the threshold value that applied to it. Re-reading a live setting months later would otherwise make an approval that was correct at the time look like a breach.
*   Raising a threshold never retroactively approves anything already pending; items awaiting a second approver keep the rule they were captured under.

*   **Parameters to Capture**:
    *   `PAYOUT_SINGLE_APPROVAL_CEILING_INR` (above this, a payout needs a second approver)
    *   `PAYOUT_DAILY_LIMIT_PER_BENEFICIARY_INR`
    *   `PAYOUT_DAILY_PLATFORM_LIMIT_INR`
    *   `REFUND_SINGLE_APPROVAL_CEILING_INR`
    *   `WRITE_OFF_SINGLE_APPROVAL_CEILING_INR`
    *   `RECONCILIATION_EXCEPTION_SLA_HOURS` (default `48`)
    *   `PENDING_PAYMENT_ESCALATION_MINUTES` (default `60`)
    *   `TDS_SECTION_194C_RATE_WITH_PAN` / `TDS_SECTION_194C_RATE_WITHOUT_PAN`
    *   `TDS_ANNUAL_THRESHOLD_INR` / `TDS_SINGLE_PAYMENT_THRESHOLD_INR`
    *   `FINANCIAL_RECORD_RETENTION_YEARS` (default `8`)

*   **Parameters to Capture (gateway and rail)**:
    *   `RAZORPAY_KEY_ID` (begins with `rzp_test_` or `rzp_live_`)
    *   `RAZORPAY_KEY_SECRET`
    *   `RAZORPAY_WEBHOOK_SECRET`
    *   `RAZORPAY_WEBHOOK_REPLAY_WINDOW_SECONDS` (default `300`)
    *   `RAZORPAY_SETTLEMENT_REPORT_ENABLED`
    *   `BANK_STATEMENT_SOURCE` (SFTP path or bank API identifier)
    *   `BANK_STATEMENT_ACCOUNT_LAST4`
    *   `PAYOUT_PROVIDER` (e.g. `razorpayx`)
    *   `PAYOUT_ACCOUNT_NUMBER` (the platform's payout source account)
    *   `PAYOUT_API_KEY_ID`
    *   `PAYOUT_API_KEY_SECRET`
    *   `PAYOUT_WEBHOOK_SECRET`
    *   `PAYOUT_MANUAL_FALLBACK_ENABLED` (default `false`)
    *   `PAYOUT_IMPS_CEILING_INR`
    *   `BENEFICIARY_VERIFICATION_PROVIDER`
    *   `BENEFICIARY_NAME_MATCH_FLOOR` (default `80`)
    *   `BENEFICIARY_COOLING_PERIOD_HOURS` (default `24`)
    *   `KMS_FINANCIAL_KEY_RESOURCE_NAME`
    *   `BENEFICIARY_FINGERPRINT_SALT`

### 4.9 Tax configuration and place of supply

Tax treatment is data, held in `TaxProfile` records that Support publishes, and never a constant in a function. The platform currently operates in one state, and that is precisely why the rule is externalised: a hard-coded state is invisible while it is right and expensive the day it is not.

*   **One effective profile per supplier per instant.** `upsertTaxProfile` refuses overlapping effective windows, so "which rule applied to this invoice" always has one answer.
*   **Resolution is frozen onto the document.** `placeOfSupply`, `placeOfSupplyStateCode`, `supplyType`, `gstRate`, and the tax heads are computed at placement and stored. Nothing recomputes tax from live configuration afterwards, which is what keeps a rate change from rewriting a reported quarter.
*   **The basis is per document class.** Buyer orders default to `recipient_delivery_state` because they are B2C goods movements; merchant orders default to `recipient_registered_state` because a registered merchant claims input credit against their own registration; subscriptions default to `service_performance_state`.
*   **Environment holds only bootstrap defaults**, used to seed the first profile. After that, the record is authoritative and the variables are ignored.

*   **Parameters to Capture**:
    *   `TAX_DEFAULT_GST_RATE_PERCENT` (default `18`)
    *   `TAX_PERMITTED_GST_RATES_PERCENT` (comma-separated allow-list, e.g. `0,5,12,18,28`)
    *   `TAX_BOOTSTRAP_SUPPLIER_STATE_CODE` (e.g. `37`)
    *   `TAX_INVOICE_NUMBER_PREFIX` / `TAX_CREDIT_NOTE_NUMBER_PREFIX`
    *   `TAX_INVOICE_SEQUENCE_RESET` (default `financial_year`)

### 4.10 Statutory withholding (TDS)

Withholding ships **disabled**. Whether this platform is the person obliged to deduct on a driver payout depends on the contracting model between supplier, driver, and platform, and that is a determination for a tax adviser. The module exists so the answer can be applied precisely and evidenced; it does not presume the answer.

*   **Enabling requires a recorded confirmation.** `upsertTdsConfiguration` refuses `enabled: true` without a TAN, a named adviser, and an adviser reference. There is no route that turns withholding on as a convenience setting.
*   **Every deduction names the configuration version that produced it**, so a later rate change never makes a past deduction look like an error.
*   **Deposit and certification are separate evidenced steps.** A deduction is not complete because money was withheld; it is complete when a challan covers it and a Form 16A reaches the deductee.
*   **Deductee access is unconditional.** A driver reads their own deductions and certificates on any plan, in grace, and after cancellation.

*   **Parameters to Capture** (bootstrap defaults for the first configuration record):
    *   `TDS_MODULE_ENABLED` (default `false`)
    *   `TDS_DEDUCTOR_TAN`
    *   `TDS_APPLIES_RETROSPECTIVELY_ON_THRESHOLD_BREACH` (default `true`)
    *   `TDS_REQUIRE_PAN_BEFORE_PAYOUT` (default `false`)
    *   `TDS_QUARTERLY_RETURN_DUE_DAY_OFFSET`
    *   `TDS_CERTIFICATE_TEMPLATE_REF`

### 4.11 Retention, privacy, and redaction

Retention is defined per `RetentionClass` in `RetentionPolicy` records and enforced by a scheduled job. Deletion is not the default outcome — most classes expire into a Support review — because a live dispute or an open assessment must outlast a calendar rule.

*   **Statutory financial and tax records** are retained for `FINANCIAL_RECORD_RETENTION_YEARS` from the close of the financial year they belong to, not from their write date, so a March and an April record do not expire eleven months apart.
*   **Beneficiary secrets are the one class destroyed on schedule.** The obligation to hold a bank account number ends long before the obligation to hold the payout it funded. At expiry the encrypted value is destroyed and the `maskedLabel`, `accountNumberLast4`, and verification outcome remain, which is enough to explain a payout and not enough to make one.
*   **Raw provider payloads and bank statements** are retained as payment evidence, encrypted, with card and account identifiers scrubbed before storage rather than at read time.
*   **A legal hold suspends expiry** for every record linked to an open dispute, exception, or assessment, and the hold is itself an audited act.
*   **Redaction is irreversible and recorded.** An `AuditLogEntry` under `account` names the class, the record count, the action taken, and the policy version that authorised it, so a gap in a historical record set can always be explained.
*   **Derived exports follow the shorter clock.** A generated CSV is a copy, not the record, and is purged on its own schedule while the underlying transactions remain.

*   **Parameters to Capture**:
    *   `FINANCIAL_RECORD_RETENTION_YEARS` (default `8`; also listed in 4.8)
    *   `TAX_RECORD_RETENTION_YEARS` (default `8`)
    *   `PAYMENT_EVIDENCE_RETENTION_YEARS` (default `8`)
    *   `BENEFICIARY_SECRET_RETENTION_MONTHS` (default `24` after the destination is superseded or the relationship ends)
    *   `AUDIT_LOG_RETENTION_YEARS` (default `8`)
    *   `DERIVED_EXPORT_RETENTION_DAYS` (default `90`)
    *   `RETENTION_EXPIRY_ACTION_DEFAULT` (default `review`)
    *   `LEGAL_HOLD_ENABLED` (default `true`)

---

## 5. Firebase Cloud Messaging (FCM)

FCM drives mobile push alerts informing buyers of gig arrivals, merchants of stock updates, and drivers of gig updates. A hybrid user registers **one token per runtime** through `registerDeviceToken` (`platform: "web"` from the service worker, `platform: "android"` from the Play app). Logout revokes only the token of the client that signed out. Tokens minted against `dev` are useless on `prod` — they are different FCM projects.

### 5.1 VAPID Push Certificates (Web Push)
*   **Purpose**: Establishes trust between FCM servers and web browser Service Workers on **one alias**.
*   **Provisioning Steps**:
    1. Navigate to the Firebase Console for that alias.
    2. Open **Project Settings** > **Cloud Messaging**.
    3. Locate the **Web configuration** card.
    4. Under **Web Push certificates**, click **Generate Key Pair**.
    5. Copy the VAPID public key into **that alias’s** env file. A `prod` VAPID key in `.env.development` is a mis-build.

*   **Parameters to Capture**:
    *   `REACT_APP_FCM_VAPID_PUBLIC_KEY`

---

## 6. SMS Gateway & OTP Integration

This section defines the SMS/OTP verification mechanism for user authentication and platform-wide transactional notifications, conforming to Indian telecommunication compliance.

### 6.1 Primary Authentication: Firebase Auth Phone Verification
*   **Purpose**: Powers built-in user verification on client apps using one-time passcodes, utilizing Google's direct SMS routing.
*   **Provisioning Steps**:
    1. Open the Firebase Console for the alias being provisioned.
    2. Navigate to **Build** > **Authentication** > **Sign-in method** and enable the **Phone** provider on **that** project.
    3. Authorized test phone numbers belong on `dev` (and the emulator). Do not copy them onto `test` or `prod`. `prod` uses real numbers only.
*   **Parameters to Capture**: Uses the default client-side Firebase configuration.

### 6.2 Backup & Transactional SMS: Custom Indian SMS Gateway
*   **Purpose**: Serves as a backup for delivering transactional alerts, updates, and custom fallback OTPs via enterprise SMS providers (such as MSG91 or Twilio).
*   **Provisioning Steps**:
    1. Create an enterprise account with the selected SMS gateway provider.
    2. Generate secure API keys or access tokens from the developer portal.
    3. Register webhook URLs to capture real-time delivery status reports (DLRs).

### 6.3 Custody Handover Codes
*   **Purpose**: Delivers the six-digit codes that authorise a transfer of goods or cash — a buyer's order pickup code, a merchant's bulk order handover code, a merchant's cash repayment code, and a supplier's settlement confirmation code. These are distinct from authentication OTPs: they are issued by `placeOrder`, `placeMerchantOrder`, `initiateCreditRepayment`, and `completeAndFinalizeGig`, re-sent by `resendHandoverCode`, and validated server-side against a private subdocument the sending party cannot read.
*   **Routing rules**:
    *   Codes are sent only to the registered phone of the party who must authorise the transfer, resolved server-side from `UserProfile.phone`. A destination is never taken from the request, and the response returns it masked (`+91 ****3456`) so a driver can read it back without learning the number.
    *   `resendHandoverCode` is capped at three sends per target per rolling hour and does not rotate the code, because a counterparty who has already written it down would otherwise be holding a dead number.
    *   The `"voice"` channel places an automated call reading the digits twice, for recipients who cannot read an SMS. It uses the same gateway's voice API and is logged identically.
*   **Offline path**: where there is no network at the moment of handover, no message is sent at all. The authorising party reads out the next unused code from a batch issued in advance by `issueOfflineCodeBatch`, which never travels over SMS. Delivery reports are therefore not a dependency of the verification design.
*   **DLT templates**: handover codes need their own pre-approved templates, separate from the authentication OTP template, because the message body names an amount and a counterparty. Register one transactional template per handover kind so the carrier does not block a message that does not match a template exactly.

### 6.4 Telecom Regulatory Compliance: TRAI DLT Guidelines
*   **Purpose**: Ensures all outbound custom transactional messages bypass Indian carrier-level spam filters under TRAI guidelines.
*   **Required Configuration Items**:
    *   **Entity ID**: Unique company registration ID issued on a TRAI-compliant Distributed Ledger Technology (DLT) platform.
    *   **Sender ID / Header**: A registered 6-character alphabetic header (e.g., `LKGCHN`) used to uniquely identify the sender.
    *   **Pre-approved SMS Template IDs**: All SMS templates must be pre-approved in the DLT portal. Messages not matching these exact templates are blocked at the carrier level.

### 6.5 Parameters to Capture
*   `SMS_GATEWAY_PROVIDER` (e.g., `msg91`, `twilio`)
*   `SMS_GATEWAY_API_KEY`
*   `SMS_GATEWAY_SENDER_ID` (pre-approved 6-character DLT sender header, e.g., `LKGCHN`)
*   `SMS_GATEWAY_ENTITY_ID` (registered TRAI DLT Principal Entity ID)
*   `SMS_GATEWAY_TEMPLATE_ID_OTP` (pre-approved DLT template ID for OTP)
*   `SMS_GATEWAY_TEMPLATE_ID_TRANSACTIONAL` (pre-approved DLT template ID for transactional alerts)
*   `SMS_GATEWAY_TEMPLATE_ID_PICKUP_CODE` (pre-approved DLT template ID for buyer order pickup codes)
*   `SMS_GATEWAY_TEMPLATE_ID_HANDOVER_CODE` (pre-approved DLT template ID for merchant bulk order handover codes)
*   `SMS_GATEWAY_TEMPLATE_ID_CASH_CODE` (pre-approved DLT template ID for merchant cash repayment and supplier settlement codes)
*   `HANDOVER_CODE_HASH_PEPPER` (server-only secret mixed with the per-batch salt when hashing offline verification codes)
