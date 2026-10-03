# EPIC-02: Orders & Commerce Fulfillment

## 1. Functional Area Alignment & Microservice Metadata
- **Epic ID**: `EPIC-02`
- **Epic Status**: [READY]
- **Functional Area**: Orders, Purchasing & Commerce Fulfillment
- **Bound Microservice**: `microservices/services/orders-service`
- **Container Port**: `4002`
- **Database**: `orders_db` (PostgreSQL with outbox event streaming)
- **Primary Runtimes**: Web PWA (`web/index.html`), Android (`logikchain-android`), iOS (`logikchain-ios`), Support Console
- **Primary Responsibilities**: Buyer direct e-commerce orders, group purchases, merchant B2B bulk restocking orders, order lifecycle state machine, delivery verification, order exception management, and delivery handover.

---

## FEAT-02.01: Buyer E-Commerce & Group Purchase Ordering

### 1. Feature Metadata & Hierarchy
- **Feature ID**: `FEAT-02.01`
- **Feature Status**: [READY]
- **Functional Scope**: Rural consumer cart checkout, village group-buying aggregation (demand pooling with threshold-triggered bulk pricing), pricing tiers, and prepaid/CoD order creation.
- **Bound Microservice**: `orders-service` (`:4002`) — also reads `config-service` (`:4010`) for pricing tiers and `social-connect-service` (`:4012`) for group session WhatsApp alerts.
- **Service Endpoints**:
  - `POST /v1/orders` (`placeOrder`) — individual order
  - `GET /v1/orders/{orderId}` — order status
  - `POST /v1/orders/group-sessions` (`createGroupSession`) — open a village group-buy window
  - `POST /v1/orders/group-sessions/{sessionId}/join` (`joinGroupSession`) — buyer joins existing session
  - `GET /v1/orders/group-sessions/{sessionId}` (`getGroupSession`) — live session progress
  - `POST /v1/orders/group-sessions/{sessionId}/lock` (`lockGroupSession`) — supplier locks session at threshold
- **UI Screens**: [BUY-03 Catalog](file:///c:/Users/Admin/Downloads/logikchain/logikchain.com/constitution/wireframes/Buyer.md#BUY-03), [BUY-04 Checkout](file:///c:/Users/Admin/Downloads/logikchain/logikchain.com/constitution/wireframes/Buyer.md#BUY-04), [BUY-05 Order Tracking](file:///c:/Users/Admin/Downloads/logikchain/logikchain.com/constitution/wireframes/Buyer.md#BUY-05), [SUP-08 Group Session Dashboard](file:///c:/Users/Admin/Downloads/logikchain/logikchain.com/constitution/wireframes/Supplier.md#SUP-08)
- **DB Schema Additions** (`orders_db`):
  - `group_buy_sessions` — `{ sessionId, villageId, gigId, skuId, targetQty, currentQty, lockedPrice, status: open|locked|expired, expiresAt }`
  - `group_buy_members` — `{ sessionId, buyerId, orderId, qty, joinedAt }`

### 2. Derived Use Cases
#### UC-02.01.A: Rural Buyer Order Placement (Individual — Prepaid & CoD)
- **Description**: A village citizen places an individual order for essentials or agricultural supplies for home delivery via the upcoming scheduled village gig.
- **Primary Actor**: Village Buyer (`role: buyer`).
- **Secondary Systems**: `orders-service`, `payments-service` (`:4005`), `gigs-service` (`:4003`), `pamphlet-service` (`:4004`).
- **Preconditions**: Buyer is authenticated and has selected items from an active village catalog.
- **Nominal Flow**:
  1. Buyer adds items to cart and navigates to checkout screen `BUY-04`.
  2. Buyer selects payment mode: `upi_intent` (Prepaid) or `cod` (Cash on Delivery).
  3. Client generates a UUID `idempotencyKey` and invokes `POST /v1/orders`.
  4. `orders-service` verifies stock availability against the active gig pamphlet and locks items.
  5. If `upi_intent`, `orders-service` requests payment intent from `payments-service` (`:4005`).
  6. `orders-service` persists order in `orders_db.orders` in status `pending_payment` or `placed` (for CoD).
  7. Outbox event emitted for Cloud Firestore synchronization.
- **Alternate / Degraded Flow**:
  - *Network Interruption during checkout*: Client retries with same `idempotencyKey`; `orders-service` returns existing order record without double-debiting.
- **Postconditions**: Order created in `orders_db`; outbox event queued for Firestore mirror; buyer routed to tracking screen `BUY-05`.

#### UC-02.01.B: Village Group-Buying Aggregation (Demand Pooling & Threshold Pricing)
- **Description**: A supplier opens a time-boxed group-buy session for a specific SKU in a village. Multiple buyers join the session individually. When the collective quantity reaches the supplier-defined threshold, all members receive the locked bulk price — even if they ordered before the threshold was crossed. If the session expires before hitting the threshold, orders revert to standard pricing.
- **Primary Actor**: Regional Supplier (`role: supplier`) opens the session; Village Buyers (`role: buyer`) join.
- **Secondary Systems**: `orders-service` (`:4002`), `config-service` (`:4010`) for tier pricing, `social-connect-service` (`:4012`) for WhatsApp alerts, `pamphlet-service` (`:4004`) for manifest reservation.
- **Preconditions**:
  - A scheduled gig (`gigId`) exists for the target village.
  - The SKU has a supplier-defined `bulkPriceThreshold` and `bulkPrice` configured in `config-service`.
  - The session `expiresAt` is set before the gig departure time.
- **Nominal Flow**:
  1. Supplier opens session via `POST /v1/orders/group-sessions` with `{ villageId, gigId, skuId, targetQty: 50, lockedBulkPrice: 70, expiresAt }` on `SUP-08`.
  2. `orders-service` creates `group_buy_sessions` record with `status: open` and `currentQty: 0`.
  3. `social-connect-service` broadcasts WhatsApp template to all buyers in the village: *"Group offer: Rice 50kg @ ₹70/kg — join before [time]. Current: 0/50 kg"*.
  4. Buyer A opens catalog `BUY-03`, sees the live group session banner with progress bar.
  5. Buyer A joins: `POST /v1/orders/group-sessions/{sessionId}/join` with `{ qty: 10, paymentMode: "cod" }`.
  6. `orders-service` inserts `group_buy_members` row; increments `currentQty` to 10; creates provisional order record at standard price.
  7. WhatsApp update sent to all current members: *"Group offer: 10/50 kg filled. 40 kg remaining!"*
  8. Steps 4–7 repeat as Buyers B, C, D, E join with quantities 8, 12, 15, 5 kg.
  9. At `currentQty = 50`, threshold crossed: `orders-service` atomically updates all provisional orders to `lockedBulkPrice: ₹70/kg` and emits `group_session_locked` event.
  10. `social-connect-service` sends WhatsApp confirmation to all members: *"🎉 Group offer locked! Your rice order is confirmed @ ₹70/kg"*.
  11. Supplier sees session `status: locked` on `SUP-08` dashboard; pamphlet manifest updated.
- **Alternate / Degraded Flow**:
  - *Session expires before threshold*: Cloud Scheduler calls `POST /v1/orders/group-sessions/{sessionId}/lock` with `force: false`; `orders-service` marks session `expired`; all provisional orders convert to standard price; members receive WhatsApp notification of the price revision.
  - *Buyer joins expired session*: `orders-service` returns `GROUP_SESSION_EXPIRED` error; client redirects buyer to individual checkout at standard price.
  - *Supplier manually locks early*: Supplier can lock a session above 80% threshold fill via `SUP-08` if sufficient demand is confirmed.
- **Postconditions**: All `group_buy_members` orders confirmed; `group_buy_sessions.status = locked`; pamphlet stock reserved; double-entry journal entries posted via `finance-service` at locked price.

### 3. User Journey Stories

#### Individual Ordering (UC-02.01.A)
- **US-02.01.01 [READY]**: *As a rural buyer, I want to place an individual order choosing either UPI or Cash on Delivery, so that I can purchase essential supplies regardless of my immediate digital bank balance.*
- **US-02.01.02 [READY]**: *As a rural buyer, I want real-time status tracking of my order on my phone, so that I know exactly when the delivery vehicle will arrive in my village.*

#### Group-Buying (UC-02.01.B) — All Personas
- **US-02.01.03 [READY] (Buyer)**: *As a rural buyer, I want to see active group-buy sessions for my village on the catalog screen, so that I can join a shared bulk order and receive a lower price that I could not access individually.*
- **US-02.01.04 [READY] (Buyer)**: *As a rural buyer who joined a group session, I want to receive a WhatsApp notification when the price threshold is crossed and my order is locked in at the bulk price, so that I have clear confirmation without needing to re-open the app.*
- **US-02.01.05 [READY] (Supplier)**: *As a regional supplier, I want to open a time-boxed group-buy session for a SKU in a specific village, so that I can drive predictable bulk demand that justifies loading the full pallet quantity onto the delivery vehicle.*
- **US-02.01.06 [READY] (Supplier)**: *As a regional supplier, I want a live dashboard showing how many kilograms have been committed across all buyers in an active group session, so that I can decide whether to extend the window or lock the session early.*
- **US-02.01.07 [READY] (Driver)**: *As a delivery driver, I want the vehicle manifest to automatically reflect the total locked group-buy quantity as a single consolidated line item, so that I load the correct total pallet weight without counting individual buyer orders.*
- **US-02.01.08 [READY] (Merchant)**: *As a village kirana merchant, I want to be notified when a group-buy session for staples opens in my village, so that I can join it alongside other buyers and reduce my personal procurement cost for in-store resale stock.*
- **US-02.01.09 [READY] (Support)**: *As a platform support operator, I want to view all active and expired group-buy sessions across all villages with threshold fill rates, so that I can identify underperforming sessions and alert the relevant supplier.*

#### Acceptance Criteria (Gherkin)
```gherkin
Scenario: Buyer places individual CoD order successfully
  Given an authenticated buyer in village "vil_ap_01"
  When the buyer submits "POST /v1/orders" with paymentMode "cod" and items list
  Then orders-service creates the order with status "placed"
  And records the idempotencyKey in orders_db
  And returns orderId with estimated delivery window

Scenario: Group-buy session reaches threshold and locks bulk price
  Given an open group session "gs_001" for SKU "rice_25kg" in village "vil_ap_01"
  And targetQty is 50 and lockedBulkPrice is 70
  When 5 buyers join with total qty 50
  Then orders-service atomically updates all member orders to price 70
  And group_buy_sessions status transitions to "locked"
  And social-connect-service sends WhatsApp confirmation to all 5 members
  And pamphlet-service reserves 50 units on the active gig manifest

Scenario: Group-buy session expires before threshold
  Given an open group session "gs_002" with currentQty 30 and targetQty 50
  When the session expiresAt timestamp is reached
  Then orders-service marks session status "expired"
  And all 3 member orders are updated to standard price
  And social-connect-service sends WhatsApp price-revision notification to all members
```

### 4. Integration Stories
- **INT-02.01.01 [READY] (Payments Service Integration)**: *As the Orders Service, I need to synchronously call `payments-service` (`:4005`) to create a Payment Intent when a buyer selects digital prepaid checkout.*
- **INT-02.01.02 [READY] (Gigs Service Integration)**: *As the Orders Service, I need to query `gigs-service` (`:4003`) to associate the order with the active scheduled delivery vehicle gig servicing the buyer's village.*
- **INT-02.01.03 [READY] (Pamphlet Service Integration)**: *As the Orders Service, I need to notify `pamphlet-service` (`:4004`) to reserve and link items to the gig's dynamic inventory manifest, including consolidated group-buy quantities as a single manifest line.*
- **INT-02.01.04 [READY] (Firestore Periodic Sync Integration)**: *As the Orders Service, I need to mirror all order state changes and group session progress to Cloud Firestore collections `/Orders/{orderId}` and `/GroupBuySessions/{sessionId}` every 2000ms.*
- **INT-02.01.05 [READY] (Social Connect — Group Session WhatsApp Alerts)**: *As the Orders Service, I need to call `social-connect-service` (`:4012`) to dispatch WhatsApp template messages to village buyers when a group session opens, when progress milestones (50%, 80%, 100%) are reached, when the session locks, and when it expires.*
- **INT-02.01.06 [READY] (Config Service — Bulk Pricing Tier Lookup)**: *As the Orders Service, I need to call `config-service` (`:4010`) to fetch the SKU's `bulkPriceThreshold` and `lockedBulkPrice` when evaluating group session lock eligibility.*
- **INT-02.01.07 [READY] (Cloud Scheduler — Session Expiry Job)**: *As the Orders Service, I need a Cloud Scheduler job (`orders-group-session-expiry`) firing every 5 minutes to check for expired open sessions and trigger the expiry flow atomically via a PostgreSQL transaction.*

### 5. Multi-Client Implementation Stories
- **PWA-02.01.01 [READY] (Web PWA — Individual & Group Checkout)**: *Implement Catalog browsing (`BUY-03`) with live group session banner and progress bar, multi-item Cart & Group Session Join (`BUY-04`), UPI Intent / CoD payment selection, and Order Tracking (`BUY-05`) with service worker offline caching in `web/`.*
- **PWA-02.01.02 [READY] (Web PWA — Supplier Group Session Dashboard)**: *Implement `SUP-08` group session management console on `web/s/` allowing suppliers to create sessions, monitor live fill rates with real-time Firestore listener, and lock sessions manually.*
- **AND-02.01.01 [READY] (Android Native — Buyer Catalog & Group Join)**: *Implement Jetpack Compose buyer catalog with offline Room cache, group session banner with live qty counter via Firestore snapshot listener, UPI Intent app chooser, and group session join flow in `android/`.*
- **IOS-02.01.01 [READY] (iOS Native — Buyer Catalog & Group Join)**: *Implement SwiftUI catalog with group session widget, Apple Pay / UPI fallback checkout, group join confirmation sheet, and CoreData offline catalog caching in `ios/`.*

### 6. PWA Cloud Testing Story
- **TEST-02.01.PWA [READY] (PWA Cloud E2E Test — Individual Checkout)**: *Automated Playwright test validating end-to-end buyer checkout (Prepaid UPI Intent and CoD), idempotency token handling, and tracking screen update against `orders-service` on `logikchain-test`.*
- **TEST-02.01.GRP.PWA [READY] (PWA Cloud E2E Test — Group-Buy Flow)**: *Automated Playwright test simulating 5 concurrent buyer sessions joining a group session, asserting threshold crossing triggers atomic price update, Firestore session doc transitions to `locked`, and WhatsApp mock receives 5 confirmation payloads.*

### 7. Independent Support Stories
- **OPS-02.01.01 [READY] (DevOps & Containerization)**: *Maintain multi-stage Docker build, configure Kubernetes deployment (`03-orders.yaml`) with horizontal pod autoscaler (HPA), apply PostgreSQL migration scripts for `orders_db` including new `group_buy_sessions` and `group_buy_members` tables with `villageId + skuId + status` composite index.*
- **OPS-02.01.02 [READY] (Cloud Scheduler Job)**: *Configure Cloud Scheduler job `orders-group-session-expiry` running every 5 minutes, calling `POST /internal/orders/group-sessions/expire-check` on `orders-service` internal endpoint.*
- **DOC-02.01.01 [READY] (API Contract Documentation)**: *Publish OpenAPI 3.0 specification for buyer ordering APIs, group session lifecycle state machine diagram (`open → locked | expired`), and document concurrent join idempotency guarantees.*
- **TEST-02.01.01 [READY] (Automation Test Suite)**: *Build automated Bruno API test collection `tests/bruno/02-orders/placeOrder/` validating cart calculation and idempotency protections, plus `tests/bruno/02-orders/groupSession/` validating session create, join, threshold lock, and expiry scenarios.*

### 8. Deployment & Cloud Verification (Acceptance Criteria & Commands)
- **Cloud Run Microservice Deployment Command**:
  ```bash
  docker build -t asia-south1-docker.pkg.dev/logikchain-test/logikchain-microservices/orders-service:latest -f microservices/services/orders-service/Dockerfile.service microservices/services/orders-service
  docker push asia-south1-docker.pkg.dev/logikchain-test/logikchain-microservices/orders-service:latest
  gcloud run deploy orders-service \
    --image=asia-south1-docker.pkg.dev/logikchain-test/logikchain-microservices/orders-service:latest \
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
- **PWA Cloud Test Verification Commands**:
  ```bash
  # Individual checkout
  npx playwright test tests/e2e/pwa/buyer-order-checkout.spec.ts --project=test --config=playwright.pwa.config.ts
  # Group-buy flow (5 concurrent buyers)
  npx playwright test tests/e2e/pwa/buyer-group-buy-session.spec.ts --project=test --config=playwright.pwa.config.ts
  ```
- **Acceptance Criteria**:
  - [ ] `orders-service` deployed to Cloud Run in `logikchain-test` with `group_buy_sessions` and `group_buy_members` tables migrated.
  - [ ] Web PWA deployed to Firebase Hosting on `logikchain-test` and successfully places both individual and group-session orders via API Gateway.
  - [ ] Android & iOS builds compile and render live group session banners from Firestore `/GroupBuySessions/{sessionId}`.
  - [ ] Group session threshold crossing atomically updates all member order prices in a single PostgreSQL transaction with zero partial updates.
  - [ ] Cloud Scheduler expiry job correctly transitions expired sessions and reverts member prices within 5 minutes of expiry.
  - [ ] All Playwright E2E tests pass 100% assertions on test project URL.

---

## FEAT-02.02: Merchant B2B Bulk Ordering & Credit Checkout

### 1. Feature Metadata & Hierarchy
- **Feature ID**: `FEAT-02.02`
- **Feature Status**: [READY]
- **Functional Scope**: Village merchant wholesale bulk restocking, case-tier quantity discounts, and revolving credit line authorization.
- **Service Endpoints**: `POST /v1/merchant-orders` (`placeMerchantOrder`), `POST /v1/merchant-orders/{id}:cancel`
- **UI Screens**: [MER-02 Merchant Gigs](file:///c:/Users/Admin/Downloads/logikchain/logikchain.com/constitution/wireframes/Merchant.md#MER-02), [MER-04 Bulk Catalog](file:///c:/Users/Admin/Downloads/logikchain/logikchain.com/constitution/wireframes/Merchant.md#MER-04), [MER-05 Checkout](file:///c:/Users/Admin/Downloads/logikchain/logikchain.com/constitution/wireframes/Merchant.md#MER-05)

### 2. Derived Use Cases
#### UC-02.02.A: Merchant Wholesale Bulk Restocking with Revolving Credit
- **Description**: A local village shopkeeper orders wholesale cases from their regional supplier and charges the purchase to their revolving credit facility.
- **Primary Actor**: Village Merchant (`role: merchant`).
- **Secondary Systems**: `orders-service`, `credit-service`, `pamphlet-service`.
- **Preconditions**: Merchant has an active approved profile and an established credit limit with the supplier.
- **Nominal Flow**:
  1. Merchant browses wholesale catalog cases on `MER-04` and configures order items.
  2. Merchant selects payment mode `credit` on `MER-05`.
  3. `orders-service` calls `credit-service` (`:4008`) to verify available credit balance.
  4. `credit-service` places a provisional hold on the required amount.
  5. `orders-service` writes `merchant_orders` record to `orders_db` in status `confirmed`.
  6. Outbox event is dispatched to update `pamphlet-service` and notify the supplier.
- **Alternate / Degraded Flow**:
  - *Credit Exceeded*: If order total exceeds available credit, `orders-service` rejects request with `INSUFFICIENT_CREDIT_LIMIT` and suggests split payment or limit increase.
- **Postconditions**: Merchant order registered; credit headroom reserved; supplier warehouse notified.

### 3. User Journey Stories
- **US-02.02.01 [READY]**: *As a village shopkeeper, I want to purchase wholesale bulk inventory on my supplier credit line, so that I can maintain store inventory without exhausting immediate working capital.*

#### Acceptance Criteria (Gherkin)
```gherkin
Scenario: Merchant places bulk order on credit
  Given a merchant with an available credit balance of ₹25,000
  When the merchant places a bulk order totaling ₹18,000 with paymentMode "credit"
  Then orders-service reserves ₹18,000 via credit-service
  And creates merchant_order in status "confirmed"
  And credit-service updates remaining headroom to ₹7,000
```

### 4. Integration Stories
- **INT-02.02.01 [READY] (Credit Service Integration)**: *As the Orders Service, I need to integrate with `credit-service` (`:4008`) via synchronous internal REST to verify and place holds on merchant credit balances.*
- **INT-02.02.02 [READY] (Firestore Sync Integration)**: *As the Orders Service, I need to mirror merchant orders to Firestore collection `/MerchantOrders/{id}` for real-time mobile app updates.*

### 5. Multi-Client Implementation Stories
- **PWA-02.02.01 [READY] (Web PWA Client)**: *Implement Merchant Wholesale Bulk Catalog (`MER-04`), Case-Tier discounts, and B2B Checkout (`MER-05`) with credit headroom indicator and draft save.*
- **AND-02.02.01 [READY] (Android Native Client)**: *Implement merchant mobile checkout with offline order staging and sync via Android WorkManager.*
- **IOS-02.02.01 [READY] (iOS Native Client)**: *Implement SwiftUI merchant ordering view with credit balance gauge and offline queueing.*

### 6. PWA Cloud Testing Story
- **TEST-02.02.PWA [READY] (PWA Cloud E2E Test on Test Project)**: *Automated Playwright test validating wholesale merchant bulk checkout on credit, synchronous hold reservation, and credit headroom decrement against `orders-service` and `credit-service` on `logikchain-test`.*

### 7. Independent Support Stories
- **OPS-02.02.01 [READY] (Database Indices & DevOps)**: *Optimize `orders_db.merchant_orders` with B-tree indices on `(merchant_id, supplier_id, created_at)` and configure dead-letter queues for failed events.*
- **DOC-02.02.01 [READY] (B2B Checkout Documentation)**: *Publish technical documentation of the two-phase credit commit protocol between orders-service and credit-service.*
- **TEST-02.02.01 [READY] (Automated Test Suite)**: *Implement Bruno test collection `tests/bruno/02-orders/placeMerchantOrder/` asserting atomic credit reservation and rollback.*

### 8. Deployment & Cloud Verification (Acceptance Criteria & Commands)
- **Cloud Run Microservice Deployment Command**:
  ```bash
  docker build -t asia-south1-docker.pkg.dev/logikchain-test/logikchain-microservices/orders-service:latest -f microservices/services/orders-service/Dockerfile.service microservices/services/orders-service
  docker push asia-south1-docker.pkg.dev/logikchain-test/logikchain-microservices/orders-service:latest
  gcloud run deploy orders-service \
    --image=asia-south1-docker.pkg.dev/logikchain-test/logikchain-microservices/orders-service:latest \
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
  npx playwright test tests/e2e/pwa/merchant-bulk-credit-order.spec.ts --project=test --config=playwright.pwa.config.ts
  ```
- **Acceptance Criteria**:
  - [ ] B2B credit order endpoints deployed and connected to `credit-service` in `logikchain-test`.
  - [ ] PWA Merchant wholesale portal functional on test project URL.
  - [ ] Automated PWA E2E tests verify credit hold and Firestore outbox mirror with 0 failures.

---

## FEAT-02.03: Order Custody Transitions & Delivery Handover

### 1. Feature Metadata & Hierarchy
- **Feature ID**: `FEAT-02.03`
- **Feature Status**: [READY]
- **Functional Scope**: Field delivery confirmation, buyer OTP / signature verification, cash collection linkage, and custody handover.
- **Service Endpoints**: `POST /v1/orders/{orderId}/delivered` (`markOrderDelivered`), `POST /v1/orders/{orderId}/resume`
- **UI Screens**: [VEH-05 Delivery Handover](file:///c:/Users/Admin/Downloads/logikchain/logikchain.com/constitution/wireframes/Vehicle.md#VEH-05), [BUY-06 Order Details](file:///c:/Users/Admin/Downloads/logikchain/logikchain.com/constitution/wireframes/Buyer.md#BUY-06)

### 2. Derived Use Cases
#### UC-02.03.A: Driver Field Delivery & CoD Cash Capture
- **Description**: Delivery driver reaches village drop point, delivers packages to buyer, verifies 4-digit handover OTP, and collects cash for CoD orders.
- **Primary Actor**: Vehicle Driver (`role: driver`).
- **Secondary Systems**: `orders-service`, `cash-service`, Android Play Integrity.
- **Preconditions**: Order is in status `dispatched` assigned to the active gig.
- **Nominal Flow**:
  1. Driver verifies package contents with buyer on screen `VEH-05`.
  2. Driver requests buyer's 4-digit handover OTP.
  3. If CoD, driver enters collected cash amount.
  4. Android client submits `markOrderDelivered` with Play Integrity App Check token.
  5. `orders-service` validates OTP; updates order status to `delivered` in `orders_db`.
  6. If CoD, `orders-service` notifies `cash-service` (`:4007`) to record driver cash custody.
  7. Outbox event emitted; push notification dispatched to buyer.
- **Postconditions**: Order state transitions to `delivered`; cash custody recorded in `cash_db`; stock removed from vehicle pamphlet.

### 3. User Journey Stories
- **US-02.03.01 [READY]**: *As a delivery driver, I want to verify delivery using a customer OTP and record cash collection on my Android app, so that proof-of-delivery is legally and operationally undeniable.*
- **US-02.03.02 [READY]**: *As a rural buyer, I want to give the OTP to the driver only after inspecting my goods, so that I am assured of receiving the correct items.*

#### Acceptance Criteria (Gherkin)
```gherkin
Scenario: Driver completes delivery handover with OTP
  Given an order in status "dispatched" with verification OTP "7391"
  When the driver submits OTP "7391" and collected cash ₹850 via Android app
  Then orders-service transitions status to "delivered"
  And invokes cash-service to record ₹850 custody under the driver's vehicle ID
```

### 4. Integration Stories
- **INT-02.03.01 [READY] (Cash Service Integration)**: *As the Orders Service, I need to call `cash-service` (`:4007`) upon delivery of CoD orders to register physical cash custody.*
- **INT-02.03.02 [READY] (Pamphlet Service Stock Deduction Integration)**: *As the Orders Service, I need to notify `pamphlet-service` (`:4004`) to decrement stock from the dynamic vehicle manifest upon completed delivery.*
- **INT-02.03.03 [READY] (Play Integrity Validation Integration)**: *As the Orders Service, I need to verify Google Play Integrity tokens on delivery completion requests to safeguard against GPS spoofing.*

### 5. Multi-Client Implementation Stories
- **PWA-02.03.01 [READY] (Web PWA Client)**: *Implement Buyer Order Details (`BUY-06`) showing the secure 4-digit handover OTP and live delivery status badge.*
- **AND-02.03.01 [READY] (Android Native Client)**: *Implement Driver Delivery Handover (`VEH-05`) with OTP verification pad, cash received denomination counter, and background Play Integrity attestation.*
- **IOS-02.03.01 [READY] (iOS Native Client)**: *Implement Buyer Order Details with dynamic OTP display card and offline cache.*

### 6. PWA Cloud Testing Story
- **TEST-02.03.PWA [READY] (PWA Cloud E2E Test on Test Project)**: *Automated Playwright test asserting buyer PWA displays valid OTP, and verifies that upon delivery completion by driver API, buyer PWA status transitions to "Delivered" in real-time on `logikchain-test`.*

### 7. Independent Support Stories
- **OPS-02.03.01 [READY] (DevOps & Mobile Outbox Processing)**: *Ensure `orders-service` handles replayed offline requests with duplicate suppression using `idempotencyKey` and `capturedAt` headers.*
- **DOC-02.03.01 [READY] (Custody State Machine Runbook)**: *Document order state machine transitions (`placed` $\rightarrow$ `assigned` $\rightarrow$ `dispatched` $\rightarrow$ `delivered`) and discrepancy escalation flows.*
- **TEST-02.03.01 [READY] (Bruno API Automation)**: *Create Bruno automated test `tests/bruno/02-orders/markOrderDelivered/` validating incorrect OTP rejections.*

### 8. Deployment & Cloud Verification (Acceptance Criteria & Commands)
- **Cloud Run Microservice Deployment Command**:
  ```bash
  docker build -t asia-south1-docker.pkg.dev/logikchain-test/logikchain-microservices/orders-service:latest -f microservices/services/orders-service/Dockerfile.service microservices/services/orders-service
  docker push asia-south1-docker.pkg.dev/logikchain-test/logikchain-microservices/orders-service:latest
  gcloud run deploy orders-service \
    --image=asia-south1-docker.pkg.dev/logikchain-test/logikchain-microservices/orders-service:latest \
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
  npx playwright test tests/e2e/pwa/delivery-handover-otp.spec.ts --project=test --config=playwright.pwa.config.ts
  ```
- **Acceptance Criteria**:
  - [ ] Handover and OTP verification endpoints active on Cloud Run test instance.
  - [ ] Buyer PWA displays correct 4-digit OTP generated by test microservices.
  - [ ] Android client submits completed delivery and registers cash custody.
  - [ ] Automated PWA E2E tests pass 100% assertions on test project URL.
