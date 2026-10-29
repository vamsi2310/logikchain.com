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

## FEAT-02.01: Buyer E-Commerce & In-Transit Dynamic Ordering

### 1. Feature Metadata & Hierarchy
- **Feature ID**: `FEAT-02.01`
- **Feature Status**: [READY]
- **Functional Scope**: Rural consumer cart checkout, village merchant hub delivery (PUDO), village serviceability check (requires registered merchant), dynamic order capture from in-transit truck pamphlet stock, and prepaid/CoD order creation. *(Group-buying demand pooling is PARKED for a future phase).*
- **Bound Microservice**: `orders-service` (`:4002`) — also reads `config-service` (`:4010`) for village serviceability and `pamphlet-service` (`:4004`) for live truck inventory.
- **Service Endpoints**:
  - `POST /v1/orders` (`placeOrder`) — individual pre-order or dynamic in-transit pamphlet order
  - `GET /v1/orders/{orderId}` — order status
  - `GET /v1/orders/serviceability/{villageId}` — check village serviceability (active merchant check)
- **UI Screens**: [BUY-03 Catalog](file:///c:/Users/Admin/Downloads/logikchain/logikchain.com/constitution/wireframes/Buyer.md#BUY-03), [BUY-04 Checkout](file:///c:/Users/Admin/Downloads/logikchain/logikchain.com/constitution/wireframes/Buyer.md#BUY-04), [BUY-05 Order Tracking](file:///c:/Users/Admin/Downloads/logikchain/logikchain.com/constitution/wireframes/Buyer.md#BUY-05), [MER-03 Village Drop Hub](file:///c:/Users/Admin/Downloads/logikchain/logikchain.com/constitution/wireframes/Merchant.md#MER-03)

### 2. Derived Use Cases

#### UC-02.01.A: Rural Buyer Order Placement, Fulfillment Choice & In-App Payment Flexibility
- **Description**: A village citizen places an order for essentials or agricultural supplies from a supplier's catalog (or from in-transit truck pamphlet stock). A village is serviceable if and only if there is at least one registered active merchant in that village. The buyer chooses between:
  1. **Merchant Pickup (Default)**: Free/standard pickup from the village merchant's kirana store (village PUDO hub).
  2. **Village Home Delivery (Optional)**: If the village merchant has enabled home delivery, the buyer can opt for doorstep delivery within the village at the merchant's configured delivery fee.
- **Primary Actor**: Village Buyer (`role: buyer`).
- **Secondary Systems**: `orders-service`, `payments-service` (`:4005`), `gigs-service` (`:4003`), `pamphlet-service` (`:4004`), `config-service` (`:4010`).
- **Preconditions**:
  - Target village is verified as serviceable (`config-service` confirms $\ge 1$ active registered merchant in `config_db.villages`).
  - Buyer is authenticated and has selected goods from either supplier catalog or live rolling pamphlet stock.
- **Nominal Flow**:
  1. Buyer opens catalog screen `BUY-03`. The app verifies village serviceability: if no registered merchant exists, screen shows *"Service coming soon — No registered village merchant"*.
  2. Buyer adds items to cart and navigates to `BUY-04`.
  3. Buyer chooses fulfillment mode:
     - `merchant_pickup`: Free pickup at the registered village merchant shop.
     - `merchant_home_delivery`: Enabled only if the merchant has turned on home delivery; displays merchant's delivery fee (e.g. ₹20) and configured delivery days.
  4. Buyer selects initial payment mode: `upi_intent` (Prepaid) or `cod` (Cash on Collection/Delivery).
  5. Client submits `POST /v1/orders` with unique `idempotencyKey`, `fulfillmentMode`, and `merchantId`.
  6. `orders-service` checks stock:
     - *If pre-order*: Reserves warehouse allocation.
     - *If ordered from in-transit truck*: Atomically decrements the vehicle's live **Pamphlet Stock** via `pamphlet-service` (`:4004`), converting that stock into an assigned order line before the truck arrives at the village.
  7. If `upi_intent`, `orders-service` requests payment intent from `payments-service` (`:4005`).
  8. `orders-service` persists order in `orders_db.orders` in status `placed` (or `pending_payment`), tagged with `merchantId` and `fulfillmentMode`.
  9. Outbox event emitted for Cloud Firestore synchronization.
- **Alternate / In-App Payment Transition Flow**:
  - *Pay Online Before Collection*: If the order was created as `cod`, the buyer can at any time before final package collection/handover open `BUY-05` and tap **"Pay Online via UPI"**. Upon successful payment via `payments-service`, the order is marked `paid_online`. The platform collects the funds (to settle with the supplier later) and clears the cash collection requirement from the merchant.
- **Postconditions**: Order created in `orders_db` with `deliveryHub: merchantId`; stock reserved or converted from truck pamphlet; buyer tracks package on `BUY-05`.

#### UC-02.01.B: [PARKED - FUTURE PHASE] Village Group-Buying Aggregation
- **Status**: `[PARKED - FUTURE ENHANCEMENT]`
- **Reason**: Group-buying demand pooling and collective threshold pricing introduces excessive operational complexity for MVP launch. Preserved as an architectural design reference for Phase 2.

### 3. User Journey Stories

#### Individual & In-Transit Ordering (UC-02.01.A)
- **US-02.01.01 [READY]**: *As a rural buyer, I want to choose between collecting my parcel from the village merchant shop or opting for village home delivery at the merchant's fee, so that I can choose the convenience level that fits my day.*
- **US-02.01.02 [READY]**: *As a rural buyer with a CoD order, I want to pay online via UPI in my app anytime before picking up the parcel, so that I don't have to carry exact cash change to the merchant's store.*
- **US-02.01.03 [READY]**: *As a rural buyer, I want to browse the live stock currently carried on the delivery truck en-route to my village, so that I can buy items on-the-fly and have them dropped off at my village merchant on the truck's arrival.*
- **US-02.01.04 [READY]**: *As the platform, I need to verify that a village has an active registered merchant before allowing orders to be placed, so that packages are never dispatched to a village without an authorized pickup/PUDO location.*
- **US-02.01.05 [READY]  [PARKED - FUTURE PHASE]**: *As a rural buyer, I want to participate in village group-buying sessions. [Parked for Phase 2]*

#### Acceptance Criteria (Gherkin)
```gherkin
Scenario: Buyer places order for pickup at village merchant
  Given an authenticated buyer in village "vil_ap_01" with active merchant "mer_kirana_01"
  When the buyer submits "POST /v1/orders" with paymentMode "cod"
  Then orders-service creates the order with deliveryHub "mer_kirana_01"
  And order status is "placed" with pickup address matching merchant location

Scenario: In-transit order converts truck pamphlet stock dynamically
  Given a truck en-route with 20 units of cooking oil in pamphlet stock
  When a buyer in the upcoming village orders 2 units of cooking oil
  Then pamphlet-service decrements live pamphlet stock to 18 units
  And orders-service creates order #ORD-882 assigned to that truck for merchant drop-off
```

### 4. Integration Stories
- **INT-02.01.01 [READY] (Payments Service Integration)**: *As the Orders Service, I need to synchronously call `payments-service` (`:4005`) to create a Payment Intent when a buyer selects digital prepaid checkout.*
- **INT-02.01.02 [READY] (Gigs Service Integration)**: *As the Orders Service, I need to query `gigs-service` (`:4003`) to link orders to the active delivery gig serving the destination village merchant.*
- **INT-02.01.03 [READY] (Pamphlet Service In-Transit Stock Deduction Integration)**: *As the Orders Service, I need to notify `pamphlet-service` (`:4004`) to atomically decrement rolling vehicle pamphlet stock when an in-transit order is placed.*
- **INT-02.01.04 [READY] (Firestore Periodic Sync Integration)**: *As the Orders Service, I need to mirror all order state changes to Cloud Firestore collection `/Orders/{orderId}` every 2000ms.*
- **INT-02.01.05 [READY]  [PARKED - FUTURE PHASE] (Group Session Alerts)**: *[Parked for Phase 2]*

### 5. Multi-Client Implementation Stories
- **PWA-02.01.01 [READY] (Web PWA — Buyer Catalog & Merchant Hub Pickup)**: *Implement Catalog browsing (`BUY-03`), live truck pamphlet stock view, merchant pickup point display, and checkout (`BUY-04`) with UPI Intent / CoD in `web/`.*
- **AND-02.01.01 [READY] (Android Native — Buyer Catalog UI & Cart Layout)**: *Implement Jetpack Compose screens for catalog browsing (`BUY-03`), category filter tabs, product detail modal, and cart bottom-sheet with merchant hub pickup selector in `android/`.*
- **AND-02.01.02 [READY] (Android Native — Room DB Offline Catalog & Cart Cache)**: *Implement Room DB entities (`ProductEntity`, `CartItemEntity`), DAOs, and repository layer for offline catalog reading and cart persistence during network drops.*
- **AND-02.01.03 [READY] (Android Native — UPI Intent Chooser & Real-Time Sync)**: *Implement Android OS Intent launcher for UPI app chooser (GPay, PhonePe, Paytm), checkout network client with idempotency headers, and live truck stock counter via Firestore snapshot listener.*
- **IOS-02.01.01 [READY] (iOS Native — Buyer Catalog)**: *Implement SwiftUI catalog with merchant hub selector, live stock widget, and offline catalog cache in `ios/`.*

### 6. PWA Cloud Testing Story
- **TEST-02.01.PWA [READY] (PWA Cloud E2E Test — Individual & In-Transit Checkout)**: *Automated Playwright test validating end-to-end buyer checkout with merchant hub pickup, in-transit stock deduction, and tracking screen update against `orders-service` on `logikchain-test`.*

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

## FEAT-02.03: Order Custody Transitions, Merchant Hub Handover & Partial Delivery

### 1. Feature Metadata & Hierarchy
- **Feature ID**: `FEAT-02.03`
- **Feature Status**: [READY]
- **Functional Scope**: Field delivery confirmation at village merchant location (PUDO), buyer collection OTP verification, partial delivery line-item rejection, doorstep invoice adjustment, cash custody linkage, and return inventory logging.
- **Service Endpoints**:
  - `POST /v1/orders/{orderId}/delivered` (`markOrderDelivered`)
  - `POST /v1/orders/{orderId}/partial-delivery` (`recordPartialDelivery`)
  - `POST /v1/orders/{orderId}/buyer-pickup` (`confirmBuyerPickupFromMerchant`)
- **UI Screens**: [VEH-05 Delivery Handover](file:///c:/Users/Admin/Downloads/logikchain/logikchain.com/constitution/wireframes/Vehicle.md#VEH-05), [BUY-06 Order Details](file:///c:/Users/Admin/Downloads/logikchain/logikchain.com/constitution/wireframes/Buyer.md#BUY-06), [MER-03 Village Drop Hub](file:///c:/Users/Admin/Downloads/logikchain/logikchain.com/constitution/wireframes/Merchant.md#MER-03)

### 2. Derived Use Cases

#### UC-02.03.A: Driver-to-Merchant Drop Hub Delivery & Buyer OTP Collection
- **Description**: Delivery driver arrives at the registered Village Merchant shop. Driver unloads merchant restocking orders and buyer pre-packaged parcels. If the buyer is present, buyer provides their 4-digit OTP; if buyer is not present, merchant accepts custody of buyer parcels into their shop, and buyer later collects from the merchant using their OTP.
- **Primary Actor**: Vehicle Driver (`role: driver`), Village Merchant (`role: merchant`), Village Buyer (`role: buyer`).
- **Secondary Systems**: `orders-service`, `cash-service`, Android Play Integrity.
- **Preconditions**: Orders are in status `dispatched` assigned to the active gig servicing the merchant's village.
- **Nominal Flow**:
  1. Driver arrives at the registered merchant shop and opens `VEH-05`.
  2. Driver scans/confirms parcels dropped at merchant shop.
  3. For buyer parcels collected on-the-spot: Driver/Merchant verifies buyer's 4-digit OTP.
  4. If CoD, collected cash is recorded.
  5. Android client submits `markOrderDelivered` with Play Integrity App Check token.
  6. `orders-service` validates OTP; updates order status to `delivered` in `orders_db`.
  7. If CoD, `orders-service` notifies `cash-service` (`:4007`) to record cash custody.
  8. Outbox event emitted; buyer notified of successful delivery/collection.
- **Postconditions**: Order marked `delivered`; cash custody recorded; stock discharged from vehicle pamphlet.

#### UC-02.03.C: Partial Delivery Acceptance & Line-Item Rejection at Merchant Drop Point
- **Description**: During inspection at the merchant location, a merchant or buyer identifies damaged goods or rejects specific items from an order (e.g. 1 carton of oil damaged in transit). Driver records rejected line items, the order total is dynamically recalculated on the spot, and the remaining valid items are delivered.
- **Primary Actor**: Vehicle Driver (`role: driver`), Village Merchant (`role: merchant`), or Village Buyer (`role: buyer`).
- **Secondary Systems**: `orders-service`, `cash-service`, `credit-service`, `pamphlet-service`.
- **Preconditions**: Order is being delivered at merchant shop and contains multiple line items or units.
- **Nominal Flow**:
  1. Recipient inspects goods on screen `VEH-05` and points out damaged or rejected units.
  2. Driver marks specific line items as rejected with reason code (`DAMAGED_IN_TRANSIT`, `SHORT_SHIPPED`, `REJECTED_BY_CUSTOMER`).
  3. `orders-service` recalculates payable amount:
     - *If CoD*: Driver collects adjusted cash amount (e.g., ₹13,500 instead of ₹15,000).
     - *If Merchant Credit*: `orders-service` notifies `credit-service` (`:4008`) to release the ₹1,500 unused credit hold back to merchant headroom immediately.
     - *If Prepaid UPI*: `orders-service` enqueues an automated partial refund via `payments-service` (`:4005`).
  4. Driver confirms handover with OTP; `orders-service` marks order as `partially_delivered`.
  5. Rejected units are logged to `pamphlet_db.return_items` on the vehicle's return manifest for warehouse restaging.
- **Postconditions**: Order state transitions to `partially_delivered`; invoice balance adjusted; credit hold released or cash collection reduced; return goods manifested.

### 3. User Journey Stories
- **US-02.03.01 [READY]**: *As a delivery driver, I want to drop all village packages at the registered merchant shop and verify handovers via OTP, so that proof-of-delivery is legally and operationally undeniable.*
- **US-02.03.02 [READY]**: *As a rural buyer, I want to collect my package from my village merchant shop at my convenience using a 4-digit OTP, so that I don't have to wait by the roadside for a delivery truck.*
- **US-02.03.03 [READY]**: *As a merchant or buyer inspecting a delivery, I want to reject damaged or broken items on the spot and pay only for accepted goods, so that I am never forced to pay for damaged stock.*

#### Acceptance Criteria (Gherkin)
```gherkin
Scenario: Driver completes delivery handover at merchant shop
  Given an order in status "dispatched" for merchant drop point "mer_kirana_01"
  When the driver verifies handover OTP "7391" and collected cash ₹850
  Then orders-service transitions status to "delivered"
  And invokes cash-service to record ₹850 custody under driver balance

Scenario: Partial delivery acceptance with line-item rejection
  Given an order with 10 bags of fertilizer (₹10,000) and 2 cartons of oil (₹5,000) on credit
  When merchant rejects 1 carton of oil due to "DAMAGED_IN_TRANSIT"
  Then orders-service transitions order to "partially_delivered" with bill total ₹12,500
  And credit-service releases ₹2,500 credit hold back to merchant headroom immediately
  And pamphlet-service logs 1 carton of oil to the vehicle return manifest
```

### 4. Integration Stories
- **INT-02.03.01 [READY] (Cash Service Integration)**: *As the Orders Service, I need to call `cash-service` (`:4007`) upon delivery of CoD orders to register physical cash custody.*
- **INT-02.03.02 [READY] (Pamphlet Service Stock Deduction Integration)**: *As the Orders Service, I need to notify `pamphlet-service` (`:4004`) to decrement stock from the dynamic vehicle manifest upon completed delivery.*
- **INT-02.03.03 [READY] (Play Integrity Validation Integration)**: *As the Orders Service, I need to verify Google Play Integrity tokens on delivery completion requests to safeguard against GPS spoofing.*

### 5. Multi-Client Implementation Stories
- **PWA-02.03.01 [READY] (Web PWA Client)**: *Implement Buyer Order Details (`BUY-06`) showing the secure 4-digit handover OTP and live delivery status badge.*
- **AND-02.03.01 [READY] (Android Native — Delivery Handover UI Layout)**: *Implement Jetpack Compose driver delivery handover screen (`VEH-05`) with 4-digit OTP input pad, line-item rejection checkboxes, and cash denomination counter.*
- **AND-02.03.02 [READY] (Android Native — Room DB Offline Handover & Rejection Store)**: *Implement local Room database entities (`DeliveryHandoverEntity`, `RejectedItemEntity`) and DAOs to store completed handovers and line-item rejection proofs during cellular dead zones.*
- **AND-02.03.03 [READY] (Android Native — Hardware Scanner & Play Integrity Attestation)**: *Integrate Bluetooth barcode scanner SDK, camera ML Kit barcode scanner fallback, and Google Play Integrity App Check attestation token generation on delivery submission.*
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

---

## FEAT-02.04: Order Deliverables, Customer Return Policy & RTO Protocol

### 1. Feature Metadata & Hierarchy
- **Feature ID**: `FEAT-02.04`
- **Feature Status**: [READY]
- **Functional Scope**: Formal order deliverable specifications, village merchant PUDO 72-hour retention window, doorstep line-item rejection policy, non-returnable categories, automated Return-to-Origin (RTO) execution, and buyer refund triggers.
- **Service Endpoints**:
  - `POST /v1/orders/{orderId}/returns/initiate` (`initiateOrderReturn`)
  - `POST /v1/orders/{orderId}/rto/trigger` (`triggerOrderRTO`)
  - `GET /v1/orders/policies/deliverables` (`getOrderDeliverablePolicy`)
- **UI Screens**: [BUY-06 Order Details](file:///c:/Users/Admin/Downloads/logikchain/logikchain.com/constitution/wireframes/Buyer.md#BUY-06), [MER-03 Village Drop Hub](file:///c:/Users/Admin/Downloads/logikchain/logikchain.com/constitution/wireframes/Merchant.md#MER-03), [VEH-05 Delivery Handover](file:///c:/Users/Admin/Downloads/logikchain/logikchain.com/constitution/wireframes/Vehicle.md#VEH-05), [SPT-14 Dispute Escalation](file:///c:/Users/Admin/Downloads/logikchain/logikchain.com/constitution/wireframes/Support.md#SPT-14)

### 2. Derived Use Cases

#### UC-02.04.A: Order Deliverable Verification & Doorstep Line-Item Rejection Policy
- **Description**: Defines contractual deliverable standards for orders. Buyers and merchants inspect packaging integrity upon arrival at the village merchant shop. The recipient can reject defective, leaking, or damaged items on the spot before OTP signoff. Non-returnable categories (e.g. perishable agricultural seeds with broken seals) are enforced.
- **Primary Actor**: Village Buyer (`role: buyer`) or Village Merchant (`role: merchant`).
- **Nominal Flow**:
  1. Recipient opens order details and inspects delivered packages at the merchant shop.
  2. If an item is damaged or expired, recipient marks the unit rejected on screen `VEH-05` / `MER-03`.
  3. System validates if the SKU is return-eligible (perishables rejected at factory level are non-returnable post-handover).
  4. For valid rejections, `orders-service` adjusts payable balance (or initiates UPI refund if prepaid).
  5. The accepted portion is released via 4-digit OTP.
- **Postconditions**: Order marked `partially_delivered`; rejected units manifested for reverse logistics; invoice adjusted.

#### UC-02.04.B: 72-Hour Merchant Retention & Automated Return-to-Origin (RTO)
- **Description**: Packages dropped at a village merchant shop must be collected within a 72-hour retention window. If uncollected after 72 hours, the system marks the package as `rto_pending` and dispatches it back to the supplier on the next visiting logistics circuit.
- **Primary Actor**: System (Cloud Scheduler Cron) & Logistics Driver (`role: driver`).
- **Nominal Flow**:
  1. Parcel arrives at merchant shop (`status: dropped_at_merchant`). A 72-hour countdown begins.
  2. Buyer receives daily automated reminders via WhatsApp and push notification.
  3. At T+72 hours without buyer OTP collection:
     - `orders-service` transitions status to `rto_initiated`.
     - Parcel is automatically assigned to the reverse manifest of the next scheduled gig servicing the village.
     - Driver arrives on next circuit, scans the uncollected parcel barcode, and signs it out from the merchant.
     - Buyer's prepaid payment is refunded minus standard reverse transit fee; supplier inventory is restaged.
- **Postconditions**: Merchant shop uncluttered; parcel returned to supplier; outbox event emitted for finance reversal.

### 3. User Journey Stories
- **US-02.04.01 [READY]**: *As a rural buyer, I want clear contractual policies on order deliverables, holding windows (72 hours at my village shop), and return rights displayed before I place an order, so that I understand my pickup deadlines and guarantees.*
- **US-02.04.02 [READY]**: *As a village merchant, I want packages uncollected after 72 hours automatically flagged for RTO and collected by the next visiting truck, so that my shop storage space is protected from abandoned parcels.*
- **US-02.04.03 [READY]**: *As a supplier, I want non-returnable categories (such as opened agrochemicals and perishables) strictly enforced by the system, so that fraudulent returns are prevented after goods leave physical custody.*

#### Acceptance Criteria (Gherkin)
```gherkin
Scenario: Parcel reaches 72-hour retention limit at merchant shop
  Given a parcel delivered to merchant "mer_01" at "2026-10-01T10:00:00Z"
  When current time reaches "2026-10-04T10:00:01Z" without buyer OTP verification
  Then orders-service updates status to "rto_initiated"
  And queues parcel on the next visiting gig circuit reverse manifest
  And sends WhatsApp notification to buyer advising of RTO return

Scenario: Doorstep rejection of non-returnable perishable item
  Given an order containing sealed hybrid tomato seeds flagged "non_returnable"
  When buyer attempts to reject the item after opening the packaging seal
  Then orders-service rejects the return request with code "CATEGORY_NON_RETURNABLE"
  And prompts buyer to file a manufacturer defect warranty claim instead
```

### 4. Integration Stories
- **INT-02.04.01 [READY] (Reverse Logistics Manifest Integration)**: *As the Orders Service, I need to notify `pamphlet-service` (`:4004`) to add RTO parcels to the visiting truck's reverse cargo manifest upon driver check-in.*
- **INT-02.04.02 [READY] (Automated Refund & Credit Note Integration)**: *As the Orders Service, I need to call `payments-service` (`:4005`) and `finance-service` (`:4009`) to issue credit notes and trigger UPI reversals when RTO parcels arrive back at the supplier warehouse.*

### 5. Multi-Client Implementation Stories
- **PWA-02.04.01 [READY] (Web PWA Return & Policy Viewer)**: *Implement Order Return Policy drawer on `web/b/` (`BUY-06`) and Merchant RTO clearance dashboard on `web/m/` (`MER-03`).*
- **AND-02.04.01 [READY] (Android Native RTO & Return Scan)**: *Implement RTO package scan and merchant handover signoff in `android/` (`VEH-05`, `MER-03`).*
- **IOS-02.04.01 [READY] (iOS Native Return & Policy Viewer)**: *Implement Buyer return request flow and policy viewer on iOS.*

### 6. Independent Support Stories
- **DOC-02.04.01 [READY] (Order Deliverables, Return & RTO Policy)**: *Publish formal compliance documents `docs/compliance/order_deliverables_and_sla_policy.md`, `docs/compliance/customer_return_and_refund_policy.md`, and `docs/compliance/unclaimed_parcel_rto_policy.md`.*
- **OPS-02.04.01 [READY] (RTO Scheduler Cron)**: *Configure Cloud Scheduler cron job invoking `/v1/orders/rto/check-expired` every 6 hours.*

