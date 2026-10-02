# EPIC-04: Merchant B2B Ordering, Credit Facilities & Settlements

## Executive Summary
EPIC-04 defines the B2B operational workflow for local village merchants. Merchants act as local village hubs, placing bulk wholesale orders with suppliers, utilizing revolving credit facilities, verifying bulk delivery receipts via secure code batches, and making partial or full credit repayments to visiting drivers.

---

## FEAT-04.01: Merchant B2B Bulk Ordering & Restocking

### 1. Hierarchy & Metadata
- **Epic**: `EPIC-04`
- **Feature ID**: `FEAT-04.01`
- **Official Runtimes**: Android Native (Preferred), Web PWA (`web/m/index.html` Legal), Functions
- **Screens**: [MER-02 Merchant Gigs](file:///c:/Users/Admin/Downloads/logikchain/logikchain.com/constitution/wireframes/Merchant.md#MER-02), [MER-04 Bulk Catalog](file:///c:/Users/Admin/Downloads/logikchain/logikchain.com/constitution/wireframes/Merchant.md#MER-04), [MER-05 Order Checkout](file:///c:/Users/Admin/Downloads/logikchain/logikchain.com/constitution/wireframes/Merchant.md#MER-05)
- **Functions / APIs**: `POST /v1/merchant-orders` (`placeMerchantOrder`), `POST /v1/merchant-orders/{id}:cancel` (`cancelMerchantOrder`)

### 2. Business Value & Problem Statement
Village shopkeepers purchase in bulk cases rather than single units. They need wholesale bulk tier pricing, flexible payment terms (immediate digital payment, cash on delivery, or charging to their revolving credit line).

### 3. Users in Use Case
- **Primary Actor**: Village Merchant (`role: merchant`).
- **Supplying Partner**: Regional Supplier (`role: supplier`).

### 4. End-to-End Use Case Narrative
1. **Pre-conditions**: Merchant has an active profile bound to a supplier.
2. **Main Flow**:
   - Merchant browses wholesale products for an upcoming gig.
   - Merchant selects case quantities.
   - Merchant selects "Charge to Credit Line".
   - System verifies available credit: $availableCredit \ge orderTotal$.
   - System places `MerchantOrder`, locks available credit, and notifies supplier.
3. **Alternate Flow**: Insufficient credit limit $\rightarrow$ System offers split payment or prompts merchant to request a credit limit increase.
4. **Post-conditions**: `MerchantOrders/{id}` placed; merchant credit balance utilized.

### 5. Agile User Stories
- **US-04.01.01 (Must Have)**: As a village merchant, I want to order bulk stock on credit, so that I can keep my store shelves stocked even when cash flow is delayed.

### 6. Acceptance Criteria (Gherkin)

```gherkin
Scenario: Merchant places order using credit facility
  Given merchant "mer_01" with credit limit ₹20,000 and current balance ₹5,000
  When merchant submits "POST /v1/merchant-orders" with:
    | gigId        | "gig_99"        |
    | supplierId   | "sup_01"        |
    | items        | [{"productId": "case_flour_10kg", "quantity": 5}] |
    | paymentMode  | "credit"        |
    | payWithCredit| true            |
  Then response status is 201 Created
  And order total ₹6,000 is authorized
  And merchant's available credit becomes ₹9,000 (20000 - 5000 - 6000)
```

### 7. Developer Test Plan & Mapping
- **Bruno API Test**: `tests/bruno/04-merchant-orders/placeMerchantOrder/`.
- **UI E2E Test**: `tests/e2e/merchant/b2b-order.spec.ts` on `MER-04`/`MER-05`.
- **Unit Tests**: Wholesale bulk discount rate engine and credit headroom evaluator.
- **Functional Tests**: Atomicity of order placement and credit reservation.

---

## FEAT-04.02: Revolving Credit Facility & Limit Increase Requests

### 1. Hierarchy & Metadata
- **Epic**: `EPIC-04`
- **Feature ID**: `FEAT-04.02`
- **Official Runtimes**: Merchant Android/PWA, Supplier Console, Functions
- **Screens**: [MER-07 Credit Overview](file:///c:/Users/Admin/Downloads/logikchain/logikchain.com/constitution/wireframes/Merchant.md#MER-07), [MER-08 Request Credit](file:///c:/Users/Admin/Downloads/logikchain/logikchain.com/constitution/wireframes/Merchant.md#MER-08), [SUP-06 Merchant Credit Admin](file:///c:/Users/Admin/Downloads/logikchain/logikchain.com/constitution/wireframes/Supplier.md#SUP-06)
- **Functions / APIs**: `POST /v1/credit-profiles/{id}/increase-requests` (`requestCreditIncrease`), `PATCH /v1/credit-increase-requests/{id}` (`reviewCreditIncreaseRequest`), `PUT /v1/credit-profiles/{id}/limit` (`setMerchantCreditLimit`)

### 2. Acceptance Criteria (Gherkin)

```gherkin
Scenario: Supplier approves merchant credit limit increase
  Given a pending credit request "req_cred_44" from "mer_01" requesting ₹30,000
  When supplier calls "PATCH /v1/credit-increase-requests/req_cred_44" with:
    | decision       | "approve" |
    | approvedAmount | 25000     |
  Then response status is 200 OK
  And "CreditProfiles/mer_01.creditLimit" updates to ₹25,000
  And merchant receives an FCM notification "Credit limit increased to ₹25,000"
```

### 3. Developer Test Plan & Mapping
- **Bruno API Test**: `tests/bruno/05-credit/requestCreditIncrease/` and `reviewCreditIncreaseRequest/`.
- **UI E2E Test**: `tests/e2e/merchant/credit-management.spec.ts`.
- **Unit Tests**: Credit limit floor and ceiling rule check.

---

## FEAT-04.03: Bulk Handover Verification & Offline Code Batches

### 1. Hierarchy & Metadata
- **Epic**: `EPIC-04`
- **Feature ID**: `FEAT-04.03`
- **Official Runtimes**: Android Native (Driver & Merchant), Functions
- **Screens**: [MER-06 Handover Code](file:///c:/Users/Admin/Downloads/logikchain/logikchain.com/constitution/wireframes/Merchant.md#MER-06), [DRV-03 Active Run](file:///c:/Users/Admin/Downloads/logikchain/logikchain.com/constitution/wireframes/Driver.md#DRV-03)
- **Functions / APIs**: `POST /v1/verification-code-batches` (`issueOfflineCodeBatch`), `PATCH /v1/merchant-orders/{id}/status` (`updateMerchantOrderStatus`)

### 2. Business Value & Problem Statement
Merchants receiving multi-case orders in poor mobile network areas need pre-generated offline code batches to confirm custody handovers reliably without needing an active data connection at the exact minute of delivery.

### 3. Acceptance Criteria (Gherkin)

```gherkin
Scenario: Driver completes bulk merchant delivery via handover code
  Given merchant order "mord_88" in status "dispatched"
  When driver on Android submits "PATCH /v1/merchant-orders/mord_88/status" with:
    | status                 | "delivered"       |
    | proof.method           | "otp"             |
    | proof.confirmationCode | "918234"          |
    | idempotencyKey         | "mo_deliv_uuid_1" |
  Then status updates to "delivered"
  And custody transfer record is logged in "/CustodyTransfers"
```

### 4. Developer Test Plan & Mapping
- **Bruno API Test**: `tests/bruno/04-merchant-orders/updateMerchantOrderStatus/` and `tests/bruno/08-cash/issueOfflineCodeBatch/`.
- **Unit Tests**: Offline verification token generator and validator.

---

## FEAT-04.04: Provisional Credit Policy & Emergency Restocking

### 1. Hierarchy & Metadata
- **Epic**: `EPIC-04`
- **Feature ID**: `FEAT-04.04`
- **Official Runtimes**: Supplier Web Console, Functions
- **Screens**: [SUP-06 Credit Policies](file:///c:/Users/Admin/Downloads/logikchain/logikchain.com/constitution/wireframes/Supplier.md#SUP-06)
- **Functions / APIs**: `PUT /v1/credit-profiles/{id}/provisional-policy` (`setProvisionalCreditPolicy`)

### 2. Acceptance Criteria (Gherkin)

```gherkin
Scenario: Supplier enables provisional emergency credit buffer
  Given merchant "mer_01"
  When supplier puts to "/v1/credit-profiles/mer_01/provisional-policy" with:
    | enabled | true                     |
    | cap     | 2000                     |
    | reason  | "Festival season buffer" |
  Then response status is 200 OK
  And merchant can order up to ₹2,000 over their regular credit limit
```

### 3. Developer Test Plan & Mapping
- **Bruno API Test**: `tests/bruno/05-credit/setProvisionalCreditPolicy/`.
- **Unit Tests**: Provisional buffer overflow math tests.

---

## FEAT-04.05: Field Credit Repayments via Driver Custody

### 1. Hierarchy & Metadata
- **Epic**: `EPIC-04`
- **Feature ID**: `FEAT-04.05`
- **Official Runtimes**: Android Native (Driver & Merchant), Functions
- **Screens**: [MER-09 Repay Credit](file:///c:/Users/Admin/Downloads/logikchain/logikchain.com/constitution/wireframes/Merchant.md#MER-09), [DRV-05 Repayment Collection](file:///c:/Users/Admin/Downloads/logikchain/logikchain.com/constitution/wireframes/Driver.md#DRV-05)
- **Functions / APIs**: `POST /v1/credit-repayments` (`initiateCreditRepayment`), `POST /v1/credit-repayments/{id}:confirm` (`confirmCreditRepayment`)

### 2. Business Value & Problem Statement
Merchants often repay credit balances using physical cash handed to the visiting driver. This requires a 2-step mutual handshake (driver initiates amount, merchant provides proof OTP) to prevent theft or ledger disputes.

### 3. Acceptance Criteria (Gherkin)

```gherkin
Scenario: Merchant repays credit with physical cash to visiting driver
  Given merchant "mer_01" has outstanding balance ₹10,000
  When driver on Android calls "POST /v1/credit-repayments" with:
    | merchantId     | "mer_01"          |
    | gigId          | "gig_99"          |
    | amount         | 4000              |
    | idempotencyKey | "repay_tx_101"    |
  Then a pending transfer "trans_77" is created
  And merchant receives a one-time repayment confirmation code "551290"
  When driver submits "POST /v1/credit-repayments/trans_77:confirm" with:
    | proof.confirmationCode | "551290" |
  Then repayment status becomes "confirmed"
  And merchant's outstanding credit balance drops to ₹6,000
  And driver's physical cash custody increments by ₹4,000
```

### 4. Developer Test Plan & Mapping
- **Bruno API Test**: `tests/bruno/08-cash/initiateCreditRepayment/` and `confirmCreditRepayment/`.
- **UI E2E Test**: `tests/e2e/merchant/credit-repayment-cash.spec.ts`.
- **Functional Tests**: Transactional ledger balance verification: Merchant credit account credited ₹4,000; Driver cash custody account debited ₹4,000.
