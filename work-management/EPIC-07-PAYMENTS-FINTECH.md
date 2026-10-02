# EPIC-07: Payments Gateway, Digital Collections, Refunds & Financial Events

## Executive Summary
EPIC-07 covers the electronic payments architecture, integration with licensed payment aggregators (e.g. Razorpay, UPI gateways), payment intent lifecycle, HMAC-SHA256 signature verification, idempotent capture, support-directed refunds, credit notes, and webhook idempotency.

---

## FEAT-07.01: Payment Intent Creation & Idempotent Lock

### 1. Hierarchy & Metadata
- **Epic**: `EPIC-07`
- **Feature ID**: `FEAT-07.01`
- **Official Runtimes**: Web PWA, Android, Functions
- **Screens**: [BUY-09 Payment Processing](file:///c:/Users/Admin/Downloads/logikchain/logikchain.com/constitution/wireframes/Buyer.md#BUY-09), [MER-05 Checkout](file:///c:/Users/Admin/Downloads/logikchain/logikchain.com/constitution/wireframes/Merchant.md#MER-05)
- **Functions / APIs**: `POST /v1/payment-intents` (`createPaymentIntent`)

### 2. Business Value & Problem Statement
To prevent duplicate debits, any online payment must begin with a server-authoritative `PaymentIntent`. The server validates target order totals or credit repayment balances, creates an order lock, and returns the gateway transaction parameters.

### 3. Acceptance Criteria (Gherkin)

```gherkin
Scenario: Create idempotent payment intent for buyer order
  Given an order "ord_101" with amount ₹450
  When buyer posts to "/v1/payment-intents" with:
    | purpose        | "buyer_order"   |
    | orderId        | "ord_101"       |
    | idempotencyKey | "pay_uuid_101"  |
  Then response status is 201 Created
  And returns "paymentIntentId" and gateway order token
  And repeated calls with "pay_uuid_101" return the exact same paymentIntentId without creating duplicate records
```

### 4. Developer Test Plan & Mapping
- **Bruno API Test**: `tests/bruno/06-payments/createPaymentIntent/`.
- **Unit Tests**: Idempotency key cache check and price validation.

---

## FEAT-07.02: Payment Capture & Signature Verification

### 1. Hierarchy & Metadata
- **Epic**: `EPIC-07`
- **Feature ID**: `FEAT-07.02`
- **Official Runtimes**: Web PWA, Android, Functions, Gateway Webhook
- **Screens**: [BUY-10 Confirmation](file:///c:/Users/Admin/Downloads/logikchain/logikchain.com/constitution/wireframes/Buyer.md#BUY-10)
- **Functions / APIs**: `POST /v1/payment-intents/{id}:capture` (`processPayment`), `POST /v1/webhooks/gateway` (`handleGatewayWebhook`)

### 2. Acceptance Criteria (Gherkin)

```gherkin
Scenario: Buyer submits valid Razorpay signature for capture
  Given payment intent "pi_888" in status "created"
  When buyer submits "POST /v1/payment-intents/pi_888:capture" with:
    | paymentIntentId   | "pi_888"             |
    | razorpayPaymentId | "pay_mock_123"       |
    | razorpaySignature | "<valid_hmac_sha256>"|
  Then server validates HMAC using secret key from Secret Manager
  And payment intent status transitions to "paid"
  And associated order status transitions to "paid"

Scenario: Forged signature rejected
  When buyer submits capture with an invalid signature
  Then response status is 400 Bad Request with code "INVALID_SIGNATURE"
  And payment intent remains "created"
```

### 3. Developer Test Plan & Mapping
- **Bruno API Test**: `tests/bruno/06-payments/processPayment/` and `tests/bruno/15-webhooks/handleGatewayWebhook/`.
- **Unit Tests**: HMAC-SHA256 signature verifier utility.
- **Functional Tests**: Cloud KMS / Secret Manager mock verification.

---

## FEAT-07.03: Order Refunds & Support Reversals

### 1. Hierarchy & Metadata
- **Epic**: `EPIC-07`
- **Feature ID**: `FEAT-07.03`
- **Official Runtimes**: Support Ops Web Console, Functions
- **Screens**: [SPT-05 Refunds & Adjustments](file:///c:/Users/Admin/Downloads/logikchain/logikchain.com/constitution/wireframes/Support.md)
- **Functions / APIs**: `POST /v1/orders/{orderId}/refunds` (`refundOrder`)

### 2. Acceptance Criteria (Gherkin)

```gherkin
Scenario: Support issues partial refund for damaged items
  Given an order "ord_101" previously paid online for ₹800
  When Support operator submits "POST /v1/orders/ord_101/refunds" with:
    | amount         | 200            |
    | reasonCode     | "damaged_goods"|
    | reasonNote     | "Crushed carton"|
    | idempotencyKey | "ref_uuid_009" |
  Then refund is processed via payment gateway
  And order refundedAmount updates to ₹200
  And ledger posts reverse transaction to buyer wallet / bank
```

### 3. Developer Test Plan & Mapping
- **Bruno API Test**: `tests/bruno/06-payments/refundOrder/`.
- **UI E2E Test**: `tests/e2e/support/refund-issuance.spec.ts`.

---

## FEAT-07.04: Credit Notes Issuance & Ledger Balancing

### 1. Hierarchy & Metadata
- **Epic**: `EPIC-07`
- **Feature ID**: `FEAT-07.04`
- **Official Runtimes**: Support Ops Web Console, Functions
- **Functions / APIs**: `POST /v1/credit-notes` (`issueCreditNote`)

### 2. Acceptance Criteria (Gherkin)

```gherkin
Scenario: Support issues credit note for billing dispute
  Given an authenticated Support operator
  When calling "POST /v1/credit-notes" with:
    | orderId | "ord_101"                        |
    | reason  | "Goodwill credit for late delivery"|
  Then a formal Credit Note document is generated with sequential GST-compliant numbering
  And posted to the customer's ledger
```

### 3. Developer Test Plan & Mapping
- **Bruno API Test**: `tests/bruno/06-payments/issueCreditNote/`.
- **Unit Tests**: Credit Note sequence numbering generator (`CN-YYYY-NNNNN`).
