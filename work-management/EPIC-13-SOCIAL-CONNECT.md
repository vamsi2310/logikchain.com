# EPIC-13: Social Media Connect & User Interaction Orchestrator

## 1. Functional Area Alignment & Microservice Metadata
- **Epic ID**: `EPIC-13`
- **Epic Status**: `[IN_PROGRESS]`
- **Functional Area**: Social Media Connect, Multi-Channel User Notifications & Interaction Orchestration
- **Bound Microservice**: `microservices/services/social-connect-service`
- **Container Port**: `4012`
- **Database**: `social_connect_db` (PostgreSQL with outbox event streaming)
- **Primary Runtimes**: API Gateway Orchestrator, Meta WhatsApp Cloud API, Firebase Cloud Messaging (FCM), SMS Gateway
- **Primary Responsibilities**: User notification channel orchestration, WhatsApp Business Cloud API integration for authentication OTPs, real-time order lifecycle updates, automated PDF bills and GST tax invoices, business ownership and daily payout alerts, user notification preferences management, local database preference lookup before dispatch, and bidirectional preference synchronization with Cloud Firestore (`/NotificationPreferences/{userId}`).

---

## FEAT-13.01: User Notification Preferences & Firestore Synchronization

### 1. Feature Metadata & Hierarchy
- **Feature ID**: `FEAT-13.01`
- **Feature Status**: `[IN_PROGRESS]`
- **Functional Scope**: User preference management (WhatsApp, In-App Push, SMS), notification categories (OTPs, Orders, Bills, Ownership Alerts), local database preference cache, and Cloud Firestore synchronization.
- **Service Endpoints**: `GET /api/v1/preferences/{userId}`, `PUT /api/v1/preferences/{userId}`
- **UI Screens**: [SHR-07 Profile Settings](file:///c:/Users/Admin/Downloads/logikchain/logikchain.com/constitution/wireframes/Shared.md#SHR-07), [SHR-12 Notification Center](file:///c:/Users/Admin/Downloads/logikchain/logikchain.com/constitution/wireframes/Shared.md#SHR-12)

### 2. Derived Use Cases
#### UC-13.01.A: User Channel Preference Configuration & Local DB Retrieval
- **Description**: A user configures their communication preferences; the service persists them in `social_connect_db`, syncs them to Firestore, and queries local DB before dispatching any future message.
- **Primary Actor**: Any Registered User (Buyer, Merchant, Driver, Supplier).
- **Secondary Systems**: `social-connect-service`, Cloud Firestore.
- **Preconditions**: User is authenticated with verified UID.
- **Nominal Flow**:
  1. User navigates to notification settings on `SHR-12`.
  2. User selects WhatsApp as primary channel and enables order and billing alerts while muting marketing.
  3. Client calls `PUT /api/v1/preferences/{userId}` via API Gateway.
  4. `social-connect-service` upserts preferences in `social_connect_db.user_notification_preferences`.
  5. `social-connect-service` writes outbox event to mirror preferences to Firestore collection `/NotificationPreferences/{userId}`.
  6. Subsequent notification requests pull preferences from local PostgreSQL in sub-2ms prior to dispatch.
- **Postconditions**: User preferences safely stored; local cache updated; Firestore collection updated.

### 3. User Journey Stories
- **US-13.01.01 [READY]**: *As a rural merchant, I want to choose WhatsApp as my default notification channel, so that I receive order receipts and invoices in the messaging app I use every day.*
- **US-13.01.02 [READY]**: *As a buyer, I want granular control over notification categories, so that I receive critical order and security OTP messages without being disturbed by promotional content.*

#### Acceptance Criteria (Gherkin)
```gherkin
Scenario: Update user notification preferences
  Given an authenticated user "usr_mer_01"
  When user submits PUT "/api/v1/preferences/usr_mer_01" with:
    | whatsapp_enabled  | true       |
    | preferred_channel | "whatsapp" |
    | categories        | { "orders": true, "otps": true, "bills": true, "marketing": false } |
  Then social-connect-service stores preferences in social_connect_db
  And emits an outbox event syncing to Firestore collection "/NotificationPreferences/usr_mer_01"
```

### 4. Integration Stories
- **INT-13.01.01 [IN_PROGRESS] (Local DB Preference Cache Check)**: *As the Social Connect Service, I need to query `social_connect_db.user_notification_preferences` before every notification dispatch to evaluate channel opt-ins and quiet-hour rules.*
- **INT-13.01.02 [READY] (Firestore Periodic Sync Integration)**: *As the Social Connect Service, I need to mirror all user notification preferences to Cloud Firestore collection `/NotificationPreferences/{userId}` every 2000ms.*

### 5. Multi-Client Implementation Stories
- **PWA-13.01.01 [IN_PROGRESS] (Web PWA Notification Preferences Manager)**: *Build notification settings interface in `web/` (`SHR-12`) with WhatsApp opt-in toggle, channel selection, and category checkboxes.*
- **AND-13.01.01 [IN_PROGRESS] (Android Native WhatsApp & Push Preferences)**: *Build native Android notification preferences screen in `android/` with FCM push token registration.*
- **IOS-13.01.01 [READY] (iOS Native WhatsApp & Push Preferences)**: *Build native iOS notification preferences screen in `ios/` with APNS push token registration.*

### 6. PWA Cloud Testing Story
- **TEST-13.01.PWA [READY] (PWA Cloud E2E Test on Test Project)**: *Automated Playwright test updating notification preferences on PWA, verifying Firestore sync, and checking local DB query on `social-connect-service` on `logikchain-test`.*

### 7. Independent Support Stories
- **OPS-13.01.01 [IN_PROGRESS] (DevOps & Database Migrations)**: *Execute PostgreSQL migration for `social_connect_db.user_notification_preferences` with index on `user_id`.*
- **DOC-13.01.01 [READY] (Preference Schema Documentation)**: *Publish OpenAPI 3.0 schema and data dictionary for notification preferences.*
- **TEST-13.01.01 [READY] (Bruno API Automation)**: *Create automated Bruno test `tests/bruno/13-social/preferences/` validating preference updates and default values.*

### 8. Deployment & Cloud Verification (Acceptance Criteria & Commands)
- **Cloud Run Microservice Deployment Command**:
  ```bash
  docker build -t asia-south1-docker.pkg.dev/logikchain-test/logikchain-microservices/social-connect-service:latest -f microservices/services/social-connect-service/Dockerfile.service microservices/services/social-connect-service
  docker push asia-south1-docker.pkg.dev/logikchain-test/logikchain-microservices/social-connect-service:latest
  gcloud run deploy social-connect-service \
    --image=asia-south1-docker.pkg.dev/logikchain-test/logikchain-microservices/social-connect-service:latest \
    --region=asia-south1 \
    --project=logikchain-test \
    --platform=managed \
    --no-allow-unauthenticated \
    --ingress=internal
  ```
- **Web PWA Deployment Command**:
  ```bash
  npm --prefix web run build:test
  firebase deploy --project test --only hosting --non-interactive
  ```
- **PWA Cloud Test Verification Command**:
  ```bash
  npx playwright test tests/e2e/pwa/social-notification-preferences.spec.ts --project=test --config=playwright.pwa.config.ts
  ```
- **Acceptance Criteria**:
  - [ ] Backend microservice running on Google Cloud Run in `logikchain-test` with `200 OK` on `/health`.
  - [ ] Web PWA deployed to Firebase Hosting on `logikchain-test` communicating through API Gateway.
  - [ ] Android & iOS builds compile and connect to `logikchain-test`.
  - [ ] Automated PWA E2E tests pass 100% assertions on test project URL.

---

## FEAT-13.02: WhatsApp Authentication & OTP Orchestration

### 1. Feature Metadata & Hierarchy
- **Feature ID**: `FEAT-13.02`
- **Feature Status**: `[IN_PROGRESS]`
- **Functional Scope**: WhatsApp Cloud API authentication message dispatch, one-tap copyable OTP buttons, delivery receipt tracking, and automatic SMS fallback.
- **Service Endpoints**: `POST /api/v1/interaction/otp`, `POST /api/v1/social/webhook` (Meta Webhook)
- **UI Screens**: [SHR-02 Login](file:///c:/Users/Admin/Downloads/logikchain/logikchain.com/constitution/wireframes/Shared.md#SHR-02), [SHR-04 OTP](file:///c:/Users/Admin/Downloads/logikchain/logikchain.com/constitution/wireframes/Shared.md#SHR-04)

### 2. Derived Use Cases
#### UC-13.02.A: Seamless WhatsApp Login/Signup OTP Dispatch with SMS Fallback
- **Description**: User requests an OTP for authentication; service checks preferences and dispatches an official WhatsApp OTP message with one-tap copy button, falling back to SMS if delivery fails.
- **Primary Actor**: Unauthenticated or Authenticating User.
- **Secondary Systems**: API Gateway, `social-connect-service`, Meta WhatsApp Cloud API, Telephony SMS Gateway.
- **Preconditions**: User inputs 10-digit mobile number.
- **Nominal Flow**:
  1. API Gateway / `identity-service` calls `POST /api/v1/interaction/otp` with `phoneNumber` and `otpCode`.
  2. `social-connect-service` checks user preferences in `social_connect_db`.
  3. User has WhatsApp enabled (default): Service sends template `logikchain_auth_otp` via Meta WhatsApp Cloud API.
  4. WhatsApp message is delivered with interactive "Copy Code" button.
  5. Service logs dispatch in `notification_dispatches` with status `sent`.
  6. Meta Webhook acknowledges message delivery (`status = delivered`).
- **Alternate / Degraded Flow**:
  - *WhatsApp Delivery Fails / User not on WhatsApp*: Service catches failure or un-delivered status and triggers SMS OTP fallback via SMS Telephony Gateway.
- **Postconditions**: OTP delivered to user's phone; dispatch log updated; audit trail recorded.

### 3. User Journey Stories
- **US-13.02.01 [READY]**: *As a rural user logging in, I want to receive my verification code on WhatsApp with a single-tap copy button, so that I can authenticate quickly without navigating away to an SMS inbox.*
- **US-13.02.02 [READY]**: *As an authenticating user without WhatsApp active, I want the system to automatically send an SMS OTP fallback, so that I am never locked out of my account.*

#### Acceptance Criteria (Gherkin)
```gherkin
Scenario: WhatsApp OTP dispatch with one-tap copy
  Given an OTP request for phone "+919876543210" with code "482910"
  When social-connect-service evaluates local preferences
  Then it invokes WhatsApp Cloud API with template "logikchain_auth_otp"
  And logs dispatch record in notification_dispatches with status "sent"
```

### 4. Integration Stories
- **INT-13.02.01 [IN_PROGRESS] (Meta WhatsApp Cloud API Integration)**: *As the Social Connect Service, I need to integrate with Meta WhatsApp Business Cloud API (`graph.facebook.com/v19.0/{phone_id}/messages`) to dispatch pre-approved HSM authentication templates.*
- **INT-13.02.02 [IN_PROGRESS] (Identity Service Orchestration Integration)**: *As the Social Connect Service, I need to provide internal endpoints for `identity-service` (:4001) to orchestrate signup and login OTPs.*
- **INT-13.02.03 [IN_PROGRESS] (Meta Webhook Ingress Integration)**: *As the Social Connect Service, I need to ingest and parse Meta WhatsApp delivery receipts (`sent`, `delivered`, `read`) to maintain real-time dispatch observability.*

### 5. Multi-Client Implementation Stories
- **PWA-13.02.01 [IN_PROGRESS] (Web PWA WhatsApp OTP Dispatch & Verification Screen)**: *Build OTP entry modal on `web/` (`SHR-04`) with "Resend via WhatsApp" button and automatic clipboard paste support.*
- **AND-13.02.01 [IN_PROGRESS] (Android Native WhatsApp Intent & OTP Auto-Read)**: *Implement Android SMS/WhatsApp verification receiver with automatic OTP detection on screen `SHR-04`.*
- **IOS-13.02.01 [READY] (iOS Native WhatsApp & One-Time-Code AutoFill)**: *Implement iOS One-Time-Code keyboard autofill on screen `SHR-04`.*

### 6. PWA Cloud Testing Story
- **TEST-13.02.PWA [READY] (PWA Cloud E2E Test on Test Project)**: *Automated Playwright test requesting WhatsApp OTP on PWA login screen, verifying webhook receipt status, and confirming authentication against `social-connect-service` on `logikchain-test`.*

### 7. Independent Support Stories
- **OPS-13.02.01 [IN_PROGRESS] (GCP Secret Manager WhatsApp Credentials)**: *Store `WHATSAPP_SYSTEM_ACCESS_TOKEN` and `WHATSAPP_PHONE_NUMBER_ID` in GCP Secret Manager and mount via Kubernetes secrets.*
- **DOC-13.02.01 [READY] (WhatsApp Template Catalog Documentation)**: *Document all registered Meta WhatsApp Business templates, variables, and HSM language locales (English, Telugu, Hindi).*
- **TEST-13.02.01 [READY] (Bruno API Automation)**: *Create automated Bruno test `tests/bruno/13-social/otpDispatch/` validating template substitution and fallback trigger.*

### 8. Deployment & Cloud Verification (Acceptance Criteria & Commands)
- **Cloud Run Microservice Deployment Command**:
  ```bash
  docker build -t asia-south1-docker.pkg.dev/logikchain-test/logikchain-microservices/social-connect-service:latest -f microservices/services/social-connect-service/Dockerfile.service microservices/services/social-connect-service
  docker push asia-south1-docker.pkg.dev/logikchain-test/logikchain-microservices/social-connect-service:latest
  gcloud run deploy social-connect-service \
    --image=asia-south1-docker.pkg.dev/logikchain-test/logikchain-microservices/social-connect-service:latest \
    --region=asia-south1 \
    --project=logikchain-test \
    --platform=managed \
    --no-allow-unauthenticated \
    --ingress=internal
  ```
- **Web PWA Deployment Command**:
  ```bash
  npm --prefix web run build:test
  firebase deploy --project test --only hosting --non-interactive
  ```
- **PWA Cloud Test Verification Command**:
  ```bash
  npx playwright test tests/e2e/pwa/social-whatsapp-otp.spec.ts --project=test --config=playwright.pwa.config.ts
  ```
- **Acceptance Criteria**:
  - [ ] Backend microservice running on Google Cloud Run in `logikchain-test` with `200 OK` on `/health`.
  - [ ] Web PWA deployed to Firebase Hosting on `logikchain-test` communicating through API Gateway.
  - [ ] Android & iOS builds compile and connect to `logikchain-test`.
  - [ ] Automated PWA E2E tests pass 100% assertions on test project URL.

---

## FEAT-13.03: Real-Time Order Lifecycle Updates & Delivery Alerts

### 1. Feature Metadata & Hierarchy
- **Feature ID**: `FEAT-13.03`
- **Feature Status**: `[READY]`
- **Functional Scope**: Real-time order placement, dispatch, out-for-delivery, and delivery completion notifications with live tracking links via WhatsApp and FCM Push.
- **Service Endpoints**: `POST /api/v1/interaction/order-update`
- **UI Screens**: [BUY-05 Order Tracking](file:///c:/Users/Admin/Downloads/logikchain/logikchain.com/constitution/wireframes/Buyer.md#BUY-05), [MER-02 Orders](file:///c:/Users/Admin/Downloads/logikchain/logikchain.com/constitution/wireframes/Merchant.md#MER-02)

### 2. Derived Use Cases
#### UC-13.03.A: Contextual WhatsApp Order Notification Pipeline
- **Description**: An order transitions state (e.g. out for delivery); service evaluates user preferences from local DB and dispatches a rich WhatsApp notification with vehicle ETA and web tracking link.
- **Primary Actor**: System (`orders-service`) on behalf of Buyer or Merchant.
- **Nominal Flow**:
  1. `orders-service` (:4002) calls `POST /api/v1/interaction/order-update`.
  2. `social-connect-service` queries `user_notification_preferences` from `social_connect_db`.
  3. Verifies `categories.orders == true`.
  4. Formats WhatsApp template `logikchain_order_update` with order ID, status, amount, and tracking URL.
  5. Dispatches message via WhatsApp Cloud API.
  6. Records dispatch in `notification_dispatches`.
- **Postconditions**: User receives real-time WhatsApp order update with one-click tracking URL.

### 3. User Journey Stories
- **US-13.03.01 [READY]**: *As a rural buyer, I want order updates delivered directly to my WhatsApp, so that I know when the delivery vehicle is approaching my village without having to open the app.*

#### Acceptance Criteria (Gherkin)
```gherkin
Scenario: Order out-for-delivery notification dispatched
  Given an order "ord_9901" transitioning to "dispatched" for buyer "usr_10"
  When orders-service triggers order-update
  Then social-connect-service verifies local preferences
  And dispatches WhatsApp message containing order total and tracking URL
```

### 4. Integration Stories
- **INT-13.03.01 [READY] (Orders Service Event Integration)**: *As the Social Connect Service, I need to receive order lifecycle webhooks from `orders-service` (:4002) to trigger contextual customer messaging.*
- **INT-13.03.02 [READY] (FCM Push Notification Integration)**: *As the Social Connect Service, I need to dispatch Firebase Cloud Messaging (FCM) in-app push notifications for users who prefer in-app alerts over WhatsApp.*

### 5. Multi-Client Implementation Stories
- **PWA-13.03.01 [READY] (Web PWA Live Order Notification Banner & Deep-Link)**: *Build order status notification bar in `web/` with deep-links to tracking screen `BUY-05`.*
- **AND-13.03.01 [READY] (Android Native FCM Order Notification Handler)**: *Build native Android FCM notification receiver opening real-time vehicle map tracking.*
- **IOS-13.03.01 [READY] (iOS Native APNS Order Notification Handler)**: *Build native iOS APNS notification receiver opening live order status.*

### 6. PWA Cloud Testing Story
- **TEST-13.03.PWA [READY] (PWA Cloud E2E Test on Test Project)**: *Automated Playwright test dispatching order update, verifying WhatsApp webhook simulation, and clicking live tracking link in PWA on `logikchain-test`.*

### 7. Independent Support Stories
- **OPS-13.03.01 [READY] (High-Volume Notification Queue DevOps)**: *Deploy Redis-backed queue in `social-connect-service` to buffer high-frequency order notifications during peak morning delivery dispatch windows.*
- **DOC-13.03.01 [READY] (Order Notification Flow Specs)**: *Document sequence diagrams for order lifecycle transitions and corresponding message payloads.*
- **TEST-13.03.01 [READY] (Bruno API Automation)**: *Create automated Bruno test `tests/bruno/13-social/orderUpdate/` testing opt-out suppression.*

### 8. Deployment & Cloud Verification (Acceptance Criteria & Commands)
- **Cloud Run Microservice Deployment Command**:
  ```bash
  docker build -t asia-south1-docker.pkg.dev/logikchain-test/logikchain-microservices/social-connect-service:latest -f microservices/services/social-connect-service/Dockerfile.service microservices/services/social-connect-service
  docker push asia-south1-docker.pkg.dev/logikchain-test/logikchain-microservices/social-connect-service:latest
  gcloud run deploy social-connect-service \
    --image=asia-south1-docker.pkg.dev/logikchain-test/logikchain-microservices/social-connect-service:latest \
    --region=asia-south1 \
    --project=logikchain-test \
    --platform=managed \
    --no-allow-unauthenticated \
    --ingress=internal
  ```
- **Web PWA Deployment Command**:
  ```bash
  npm --prefix web run build:test
  firebase deploy --project test --only hosting --non-interactive
  ```
- **PWA Cloud Test Verification Command**:
  ```bash
  npx playwright test tests/e2e/pwa/social-order-updates.spec.ts --project=test --config=playwright.pwa.config.ts
  ```
- **Acceptance Criteria**:
  - [ ] Backend microservice running on Google Cloud Run in `logikchain-test` with `200 OK` on `/health`.
  - [ ] Web PWA deployed to Firebase Hosting on `logikchain-test` communicating through API Gateway.
  - [ ] Android & iOS builds compile and connect to `logikchain-test`.
  - [ ] Automated PWA E2E tests pass 100% assertions on test project URL.

---

## FEAT-13.04: Digital Bills, GST Invoices & Business Ownership Alerts

### 1. Feature Metadata & Hierarchy
- **Feature ID**: `FEAT-13.04`
- **Feature Status**: `[READY]`
- **Functional Scope**: Automated delivery of PDF tax invoices, merchant bulk order bills, TDS deduction certificates, and business ownership notifications (daily payout confirmations, credit limit updates).
- **Service Endpoints**: `POST /api/v1/interaction/bill`, `POST /api/v1/interaction/ownership-alert`
- **UI Screens**: [MER-07 Financial Hub](file:///c:/Users/Admin/Downloads/logikchain/logikchain.com/constitution/wireframes/Merchant.md#MER-07), [SUP-08 Fleet Admin](file:///c:/Users/Admin/Downloads/logikchain/logikchain.com/constitution/wireframes/Supplier.md#SUP-08)

### 2. Derived Use Cases
#### UC-13.04.A: WhatsApp PDF Invoice Delivery & Business Ownership Alerts
- **Description**: When a wholesale order or daily payout completes, service sends PDF tax invoice documents and ownership summaries directly to the merchant or supplier via WhatsApp.
- **Primary Actor**: System (`finance-service`, `payouts-service`) on behalf of Merchant/Supplier.
- **Nominal Flow**:
  1. `finance-service` generates GST tax invoice PDF and uploads to Firebase Cloud Storage.
  2. `finance-service` calls `POST /api/v1/interaction/bill` with invoice number, amount, and PDF URL.
  3. `social-connect-service` pulls merchant preferences from `social_connect_db`.
  4. Checks `categories.bills == true`.
  5. Dispatches WhatsApp document message attaching the PDF with filename `INV-XXXX.pdf`.
  6. Merchant opens WhatsApp, views summary, and downloads official tax invoice with a single tap.
- **Postconditions**: Business invoice delivered; verified by delivery receipt.

### 3. User Journey Stories
- **US-13.04.01 [READY]**: *As a village merchant, I want wholesale purchase invoices and payment receipts sent to my WhatsApp as downloadable PDFs, so that I have instant digital records for my accounting and GST filings.*
- **US-13.04.02 [READY]**: *As a delivery driver or fleet supplier, I want daily earnings and payout confirmation alerts on WhatsApp, so that I am always updated on my business cash flow.*

#### Acceptance Criteria (Gherkin)
```gherkin
Scenario: Deliver PDF invoice via WhatsApp
  Given a generated GST invoice "INV-2026-0042" with PDF URL
  When finance-service calls "/api/v1/interaction/bill"
  Then social-connect-service verifies merchant preferences
  And dispatches WhatsApp document message containing the PDF invoice
  And logs dispatch in notification_dispatches
```

### 4. Integration Stories
- **INT-13.04.01 [READY] (Finance & Payouts Service Integration)**: *As the Social Connect Service, I need to accept billing and payout notification requests from `finance-service` (:4009) and `payouts-service` (:4006).*
- **INT-13.04.02 [READY] (Firebase Cloud Storage Document Integration)**: *As the Social Connect Service, I need to validate that signed PDF document URLs hosted on Firebase Cloud Storage are accessible by Meta WhatsApp Cloud API servers for media attachment.*

### 5. Multi-Client Implementation Stories
- **PWA-13.04.01 [READY] (Web PWA Digital Bill & Invoice Archive)**: *Build digital bill repository and invoice download view in `web/` (`MER-07`, `SUP-08`) with "Share via WhatsApp" action.*
- **AND-13.04.01 [READY] (Android Native Bill & Payout Alert View)**: *Build native Android PDF bill viewer and payout confirmation dialog in `android/`.*
- **IOS-13.04.01 [READY] (iOS Native Bill & Payout Alert View)**: *Build native iOS PDF invoice viewer and payout confirmation alert in `ios/`.*

### 6. PWA Cloud Testing Story
- **TEST-13.04.PWA [READY] (PWA Cloud E2E Test on Test Project)**: *Automated Playwright test generating PDF bill, invoking WhatsApp dispatch, and opening PDF attachment in PWA on `logikchain-test`.*

### 7. Independent Support Stories
- **OPS-13.04.01 [READY] (DevOps & Media Retention)**: *Configure Cloud Storage bucket lifecycle rules retaining WhatsApp-dispatched PDF bills for 7 years to meet statutory tax record requirements.*
- **DOC-13.04.01 [READY] (Billing Notification Specifications)**: *Document WhatsApp document message payload requirements, file size limits (max 100MB), and PDF metadata formatting.*
- **TEST-13.04.01 [READY] (Bruno API Automation)**: *Create automated Bruno test `tests/bruno/13-social/sendBill/` verifying document attachment formatting.*

### 8. Deployment & Cloud Verification (Acceptance Criteria & Commands)
- **Cloud Run Microservice Deployment Command**:
  ```bash
  docker build -t asia-south1-docker.pkg.dev/logikchain-test/logikchain-microservices/social-connect-service:latest -f microservices/services/social-connect-service/Dockerfile.service microservices/services/social-connect-service
  docker push asia-south1-docker.pkg.dev/logikchain-test/logikchain-microservices/social-connect-service:latest
  gcloud run deploy social-connect-service \
    --image=asia-south1-docker.pkg.dev/logikchain-test/logikchain-microservices/social-connect-service:latest \
    --region=asia-south1 \
    --project=logikchain-test \
    --platform=managed \
    --no-allow-unauthenticated \
    --ingress=internal
  ```
- **Web PWA Deployment Command**:
  ```bash
  npm --prefix web run build:test
  firebase deploy --project test --only hosting --non-interactive
  ```
- **PWA Cloud Test Verification Command**:
  ```bash
  npx playwright test tests/e2e/pwa/social-digital-bills.spec.ts --project=test --config=playwright.pwa.config.ts
  ```
- **Acceptance Criteria**:
  - [ ] Backend microservice running on Google Cloud Run in `logikchain-test` with `200 OK` on `/health`.
  - [ ] Web PWA deployed to Firebase Hosting on `logikchain-test` communicating through API Gateway.
  - [ ] Android & iOS builds compile and connect to `logikchain-test`.
  - [ ] Automated PWA E2E tests pass 100% assertions on test project URL.
