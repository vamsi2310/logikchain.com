# EPIC-05: Payments, UPI Collections & Gateway Integration

## 1. Functional Area Alignment & Microservice Metadata
- **Epic ID**: `EPIC-05`
- **Functional Area**: Payments, UPI Collections & Payment Gateway Integration
- **Bound Microservice**: `microservices/services/payments-service`
- **Container Port**: `4005`
- **Database**: `payments_db` (PostgreSQL with outbox event streaming)
- **Primary Runtimes**: Web PWA (`web/index.html`), Android (`logikchain-android`), iOS (`logikchain-ios`), API Gateway
- **Primary Responsibilities**: Native UPI Intent and Dynamic QR generation, PSP Collect requests, HMAC-verified raw webhook processing, payment status polling, automated refunds, credit notes, and payment dispute registration.

---

## FEAT-05.01: UPI Intent & Dynamic QR Code Generation

### 1. Feature Metadata & Hierarchy
- **Feature ID**: `FEAT-05.01`
- **Functional Scope**: Dynamic UPI deep-link generation, QR code rendering for UPI apps (GPay, PhonePe, Paytm, BHIM), and transaction session creation.
- **Service Endpoints**: `POST /v1/payments/intent` (`createPaymentIntent`), `GET /v1/payments/{paymentId}`
- **UI Screens**: [BUY-04 Checkout](file:///c:/Users/Admin/Downloads/logikchain/logikchain.com/constitution/wireframes/Buyer.md#BUY-04), [MER-05 Checkout](file:///c:/Users/Admin/Downloads/logikchain/logikchain.com/constitution/wireframes/Merchant.md#MER-05)

### 2. Derived Use Cases
#### UC-05.01.A: Seamless Mobile UPI Intent & Dynamic QR Pay-In
- **Description**: A buyer or merchant initiates digital payment; mobile app deep-links into installed UPI apps or displays dynamic QR.
- **Primary Actor**: Buyer (`role: buyer`) or Merchant (`role: merchant`).
- **Secondary Systems**: `payments-service`, Payment Gateway (Razorpay/NPCI), UPI Application (GPay, PhonePe).
- **Preconditions**: Order amount and currency are determined; client provides unique `idempotencyKey`.
- **Nominal Flow**:
  1. Client calls `POST /v1/payments/intent` with order ID, amount, and customer details.
  2. `payments-service` retrieves Razorpay API credentials from GCP Secret Manager.
  3. `payments-service` creates payment order with Razorpay and generates a standard UPI Intent URI (`upi://pay?pa=...&pn=Logikchain&am=...&tr=...`).
  4. `payments-service` writes transaction record to `payments_db.payment_intents` in status `created`.
  5. Android/iOS app invokes native UPI Intent chooser; Web PWA renders dynamic QR code.
  6. User authorizes payment within their banking app.
- **Postconditions**: Payment intent active; awaiting PSP webhook or status poll confirmation.

### 3. User Journey Stories
- **US-05.01.01**: *As a rural buyer using a smartphone, I want the app to open my preferred UPI application directly (e.g. PhonePe or Google Pay), so that I can authorize payment with a single PIN entry.*
- **US-05.01.02**: *As a merchant ordering from a desktop or tablet, I want a dynamic QR code displayed on screen, so that I can scan and pay instantly using my mobile phone.*

#### Acceptance Criteria (Gherkin)
```gherkin
Scenario: Buyer initiates UPI Intent payment
  Given an order totaling ₹1,250 with idempotencyKey "pay_uuid_001"
  When client calls "POST /v1/payments/intent"
  Then payments-service returns 201 Created with dynamic upiUri and qrString
  And records transaction in payments_db in status "created"
```

### 4. Integration Stories
- **INT-05.01.01 (Payment Gateway REST Integration)**: *As the Payments Service, I need to integrate with Razorpay Payment Gateway APIs to create payment orders and obtain verified transaction handles.*
- **INT-05.01.02 (GCP Secret Manager Integration)**: *As the Payments Service, I need to fetch PSP API keys (`RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`) securely from GCP Secret Manager at runtime without embedding keys in code or images.*
- **INT-05.01.03 (Firestore Sync Integration)**: *As the Payments Service, I need to synchronize payment intent statuses to Firestore collection `/PaymentIntents/{id}` every 2000ms.*

### 5. Independent Support Stories
- **OPS-05.01.01 (DevOps & Security Hardening)**: *Configure Kubernetes deployment (`03-payments.yaml`), GCP Workload Identity for Secret Manager access, and apply database migrations for `payments_db`.*
- **DOC-05.01.01 (UPI Integration Guide)**: *Document NPCI UPI intent URL formatting standards, timeout handling (15-minute expiry), and payload structure.*
- **TEST-05.01.01 (Bruno API Automation)**: *Create automated Bruno test `tests/bruno/05-payments/createIntent/` mocking PSP gateway responses with stubbed tokens.*

---

## FEAT-05.02: PSP Webhook Processing & Cryptographic Validation

### 1. Feature Metadata & Hierarchy
- **Feature ID**: `FEAT-05.02`
- **Functional Scope**: Gateway raw webhook ingress, HMAC-SHA256 signature verification, idempotent transaction capture, and order completion dispatch.
- **Service Endpoints**: `POST /v1/payments/webhook` (`handlePSPWebhook`)
- **UI Screens**: Background Platform Ingress (No UI)

### 2. Derived Use Cases
#### UC-05.02.A: Cryptographic Webhook Validation & Payment Confirmation
- **Description**: Payment gateway notifies Logikchain of payment authorization via webhook; service validates authenticity and confirms the order.
- **Primary Actor**: Payment Gateway (External System: Razorpay/NPCI).
- **Secondary Systems**: API Gateway, `payments-service`, `orders-service`, `finance-service`.
- **Preconditions**: Payment gateway sends POST webhook with `X-Razorpay-Signature` header and raw JSON body.
- **Nominal Flow**:
  1. API Gateway forwards raw unparsed body and signature header to `payments-service`.
  2. `payments-service` computes HMAC-SHA256 on the exact raw body using the shared webhook secret.
  3. Signature matches: `payments-service` extracts event type `payment.captured`.
  4. `payments-service` updates `payments_db.payment_intents` status to `captured`.
  5. `payments-service` notifies `orders-service` (`:4002`) to transition order to `placed`/`confirmed`.
  6. `payments-service` notifies `finance-service` (`:4009`) to book the cash/bank journal entry.
  7. Returns HTTP `200 OK` to PSP.
- **Alternate / Degraded Flow**:
  - *Invalid Signature*: Webhook rejected with HTTP 401 Unauthorized; logged as security violation in `governance-service`.
  - *Duplicate Webhook*: `payments-service` acknowledges with 200 OK without re-triggering business logic (idempotency guard).
- **Postconditions**: Payment captured; orders and ledger updated; audit event logged.

### 3. User Journey Stories
- **US-05.02.01**: *As a platform operator, I want all incoming payment webhooks cryptographically verified before processing, so that fraudulent status updates and replay attacks are impossible.*

#### Acceptance Criteria (Gherkin)
```gherkin
Scenario: Valid webhook transitions payment and order state
  Given an incoming webhook with valid HMAC signature and event "payment.captured"
  When payments-service receives the raw payload
  Then signature verification passes
  And payment status updates to "captured" in payments_db
  And orders-service is invoked to mark the order as paid
```

### 4. Integration Stories
- **INT-05.02.01 (Orders Service Payment Notification Integration)**: *As the Payments Service, I need to call `orders-service` (`:4002`) upon payment capture to transition order status from `pending_payment` to `placed`.*
- **INT-05.02.02 (Finance Service Ledger Integration)**: *As the Payments Service, I need to emit an event to `finance-service` (`:4009`) to record debit in Gateway Clearing and credit in Customer Advance accounts.*
- **INT-05.02.03 (Governance AML Alert Integration)**: *As the Payments Service, I need to send transaction telemetry to `governance-service` (`:4011`) for velocity monitoring and AML compliance.*

### 5. Independent Support Stories
- **OPS-05.02.01 (DevOps & Raw Body Middleware)**: *Configure Express raw body buffer parser in `payments-service` to prevent whitespace alteration during HMAC calculation.*
- **DOC-05.02.01 (Webhook Security Protocol)**: *Document webhook signature verification algorithm, retry policy (up to 24h), and replay prevention mechanism.*
- **TEST-05.02.01 (Bruno & Security Test Suite)**: *Build automated test in `tests/bruno/05-payments/webhook/` testing genuine signature vs forged signature rejection.*

---

## FEAT-05.03: Automated Refunds & Credit Note Issuance

### 1. Feature Metadata & Hierarchy
- **Feature ID**: `FEAT-05.03`
- **Functional Scope**: Order cancellation refunds, partial item refund processing, PSP gateway reverse transfers, and GST credit note generation.
- **Service Endpoints**: `POST /v1/payments/{paymentId}/refund` (`refundOrder`), `POST /v1/payments/{paymentId}/credit-note` (`issueCreditNote`)
- **UI Screens**: [SPT-04 Support Orders Console](file:///c:/Users/Admin/Downloads/logikchain/logikchain.com/constitution/wireframes/Support.md#SPT-04)

### 2. Derived Use Cases
#### UC-05.03.A: Customer Refund Execution & Reversal Accounting
- **Description**: An order is cancelled prior to dispatch; system triggers automated refund via original UPI VPA.
- **Primary Actor**: Support Operator (`role: support`) or System Cancellation Trigger.
- **Nominal Flow**:
  1. Operator initiates refund with reason code and refund amount.
  2. `payments-service` validates that `refundAmount <= capturedAmount - previousRefunds`.
  3. `payments-service` issues refund call to Razorpay API.
  4. Razorpay returns refund reference ID; `payments_db.refunds` record inserted with status `processed`.
  5. `finance-service` is notified to record reversal journal entry.
- **Postconditions**: Funds reversed to buyer bank account; credit note generated; ledger balanced.

### 3. User Journey Stories
- **US-05.03.01**: *As a rural buyer whose order was cancelled, I want my money refunded automatically to my original UPI account within standard banking timelines, so that I maintain complete trust in the platform.*

#### Acceptance Criteria (Gherkin)
```gherkin
Scenario: Successful automated refund
  Given a captured payment of ₹1,000 for order "ord_101"
  When support calls "POST /v1/payments/pay_101/refund" for ₹1,000
  Then payments-service invokes PSP refund API
  And records refund record in payments_db
  And notifies finance-service to issue a GST credit note
```

### 4. Integration Stories
- **INT-05.03.01 (PSP Refund API Integration)**: *As the Payments Service, I need to execute refund calls to Razorpay APIs and handle synchronous/asynchronous refund callbacks.*
- **INT-05.03.02 (Finance Service Credit Note Integration)**: *As the Payments Service, I need to call `finance-service` (`:4009`) to generate statutory credit notes for all refunded transactions.*

### 5. Independent Support Stories
- **OPS-05.03.01 (DevOps & Refund Queue)**: *Implement retry policies with exponential backoff for transient PSP refund gateway failures.*
- **DOC-05.03.01 (Refund & Credit Note Policy Docs)**: *Document NPCI T+1 refund mandates, GST credit note compliance rules, and customer communication templates.*
- **TEST-05.03.01 (Bruno API Automation)**: *Create Bruno automated test `tests/bruno/05-payments/refundOrder/` asserting refund bounds and double-refund blocks.*
