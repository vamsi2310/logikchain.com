# EPIC-03: Buyer E-Commerce, Catalog & Order Handover

## Executive Summary
EPIC-03 encompasses the end-to-end consumer shopping experience in rural and suburban communities. The official client for buyers is the Web PWA (`web/index.html`), optimized for low-end mobile browsers, village location selection, upcoming gig pamphlet catalogs, secure order booking, cryptographic pickup codes, and cash-on-pickup or digital handover.

---

## FEAT-03.01: Village Gig Discovery & Pamphlet Catalog Browsing

### 1. Hierarchy & Metadata
- **Epic**: `EPIC-03`
- **Feature ID**: `FEAT-03.01`
- **Official Runtimes**: Web PWA (`web/index.html` Official)
- **Screens**: [BUY-04 Home](file:///c:/Users/Admin/Downloads/logikchain/logikchain.com/constitution/wireframes/Buyer.md#BUY-04), [BUY-05 Gig Detail](file:///c:/Users/Admin/Downloads/logikchain/logikchain.com/constitution/wireframes/Buyer.md#BUY-05), [BUY-05.1 Pamphlet Catalog](file:///c:/Users/Admin/Downloads/logikchain/logikchain.com/constitution/wireframes/Buyer.md#BUY-05.1), [BUY-06 Product Detail](file:///c:/Users/Admin/Downloads/logikchain/logikchain.com/constitution/wireframes/Buyer.md#BUY-06)
- **Functions / APIs**: Firestore live queries (`/Gigs`, `/Pamphlets`, `/Products`)

### 2. Business Value & Problem Statement
Rural buyers need to see what delivery vehicle is visiting their specific village, when it arrives, and what goods are available on that vehicle's physical/digital pamphlet.

### 3. Users in Use Case
- **Primary Actor**: Rural Consumer (`role: buyer`).
- **Secondary**: Local Village Hub Merchant.

### 4. End-to-End Use Case Narrative
1. **Pre-conditions**: Buyer opens PWA; location is set to their village.
2. **Main Flow**:
   - PWA queries scheduled gigs servicing the buyer's village.
   - PWA displays countdown timer: "Next delivery in 4 hours · Driver Ramesh".
   - Buyer clicks "Browse Catalog" to view products categorized by essential staples, produce, and FMCG items.
   - Buyer inspects unit prices, bulk discounts, and available vehicle stock.
3. **Alternate Flow**: No gig scheduled for the village $\rightarrow$ System displays next planned date with a "Request Delivery Stop" action.

### 5. Agile User Stories
- **US-03.01.01 (Must Have)**: As a buyer, I want to select my village and see upcoming delivery trucks and their catalogs, so that I can buy goods without travelling to distant urban markets.

### 6. Acceptance Criteria (Gherkin)

```gherkin
Scenario: Buyer browses active gig catalog for their village
  Given an authenticated buyer in village "vil_inkollu_01"
  When navigating to screen "BUY-04"
  Then the system shows gig "gig_99" scheduled to arrive at "10:30 AM"
  When user opens "BUY-05.1"
  Then available products with prices, images, and remaining stock are displayed
```

### 7. Developer Test Plan & Mapping
- **UI E2E Test**: `tests/e2e/buyer/catalog-browsing.spec.ts` testing `BUY-04` $\rightarrow$ `BUY-05.1` $\rightarrow$ `BUY-06`.
- **Unit Tests**: Product catalog filter by category, out-of-stock badge logic.

---

## FEAT-03.02: Cart Management & Stock Validation

### 1. Hierarchy & Metadata
- **Epic**: `EPIC-03`
- **Feature ID**: `FEAT-03.02`
- **Official Runtimes**: Web PWA
- **Screens**: [BUY-07 Cart](file:///c:/Users/Admin/Downloads/logikchain/logikchain.com/constitution/wireframes/Buyer.md#BUY-07), [BUY-07.2 Stock Reconciliation](file:///c:/Users/Admin/Downloads/logikchain/logikchain.com/constitution/wireframes/Buyer.md#BUY-07.2)

### 2. Acceptance Criteria (Gherkin)

```gherkin
Scenario: Buyer adjusts quantities and validates stock
  Given items in cart on "BUY-07"
  When buyer updates quantity of "Sunlit Sunflower Oil 1L" to 3
  Then total price and GST breakdown recalculate instantly
  And if requested quantity exceeds gig stock, system displays "BUY-07.2" with max available quantity
```

### 3. Developer Test Plan & Mapping
- **UI E2E Test**: `tests/e2e/buyer/cart-reconciliation.spec.ts`.
- **Unit Tests**: Cart price calculation, quantity step boundaries ($1 \le qty \le maxStock$).

---

## FEAT-03.03: Order Placement & Payment Mode Selection

### 1. Hierarchy & Metadata
- **Epic**: `EPIC-03`
- **Feature ID**: `FEAT-03.03`
- **Official Runtimes**: Web PWA, Functions
- **Screens**: [BUY-08 Review & Pay](file:///c:/Users/Admin/Downloads/logikchain/logikchain.com/constitution/wireframes/Buyer.md#BUY-08), [BUY-09 Payment Processing](file:///c:/Users/Admin/Downloads/logikchain/logikchain.com/constitution/wireframes/Buyer.md#BUY-09), [BUY-10 Order Confirmation](file:///c:/Users/Admin/Downloads/logikchain/logikchain.com/constitution/wireframes/Buyer.md#BUY-10)
- **Functions / APIs**: `POST /v1/orders` (`placeOrder`)

### 2. Business Value & Problem Statement
Order placement creates a binding order doc, allocates stock, assigns a local merchant hub, and generates a pickup verification code. Payment modes include cash on pickup and digital prepayment.

### 3. Acceptance Criteria (Gherkin)

```gherkin
Scenario: Buyer places order with cash on pickup
  Given an authenticated buyer
  When buyer submits "POST /v1/orders" with:
    | gigId       | "gig_99"          |
    | village     | "vil_inkollu_01"  |
    | merchantId  | "usr_mer_04"      |
    | items       | [{"productId": "prod_oil_1", "quantity": 2}] |
    | paymentMode | "cash_on_pickup"  |
  Then response status is 201 Created
  And order has status "placed"
  And "Orders/{orderId}" contains a hashed pickup code
  And response returns the cleartext "pickupCode" for buyer display
```

### 4. Developer Test Plan & Mapping
- **Bruno API Test**: `tests/bruno/03-orders/placeOrder/`.
- **UI E2E Test**: `tests/e2e/buyer/checkout-flow.spec.ts` (`BUY-08` $\rightarrow$ `BUY-10`).
- **Unit Tests**: Order tax and item total calculation.
- **Functional Tests**: Transactional inventory decrement assertion.

---

## FEAT-03.04: Cryptographic Pickup Code & Custody Handover

### 1. Hierarchy & Metadata
- **Epic**: `EPIC-03`
- **Feature ID**: `FEAT-03.04`
- **Official Runtimes**: Web PWA (Buyer), Android Native (Driver), Functions
- **Screens**: [BUY-10.1 Pickup Code](file:///c:/Users/Admin/Downloads/logikchain/logikchain.com/constitution/wireframes/Buyer.md#BUY-10.1), [BUY-12.5 Handover Receipt](file:///c:/Users/Admin/Downloads/logikchain/logikchain.com/constitution/wireframes/Buyer.md#BUY-12.5), [DRV-03 Active Run](file:///c:/Users/Admin/Downloads/logikchain/logikchain.com/constitution/wireframes/Driver.md#DRV-03)
- **Functions / APIs**: `POST /v1/orders/{orderId}:deliver` (`markOrderDelivered`), `POST /v1/handover-codes:resend` (`resendHandoverCode`)

### 2. Business Value & Problem Statement
To eliminate theft and false delivery claims in remote areas, delivery is completed only when the driver enters the buyer's 6-digit pickup code or scans the secure QR code. Replay of old codes is strictly rejected.

### 3. Acceptance Criteria (Gherkin)

```gherkin
Scenario: Driver verifies buyer pickup code and collects cash
  Given an order "ord_101" with status "placed" and paymentMode "cash_on_pickup"
  When driver on Android submits "POST /v1/orders/ord_101:deliver" with:
    | proof.method           | "otp"             |
    | proof.confirmationCode | "492018"          |
    | cashCollected          | 500               |
    | idempotencyKey         | "deliv_uuid_777"  |
  Then response status is 200 OK
  And order status becomes "delivered"
  And driver's unconfirmed cash balance increments by 500
  And buyer screen "BUY-12" transitions to "Delivered" with electronic receipt "BUY-12.5"

Scenario: Replay of used confirmation code
  Given order "ord_101" is already "delivered"
  When driver attempts delivery with the same code
  Then response status is 409 Conflict with code "CODE_REPLAYED"
```

### 4. Developer Test Plan & Mapping
- **Bruno API Test**: `tests/bruno/03-orders/markOrderDelivered/` and `tests/bruno/08-cash/resendHandoverCode/`.
- **UI E2E Test**: Cross-device flow: Buyer displays `BUY-10.1` code; Driver enters code on Android `DRV-03`.
- **Unit Tests**: HMAC-SHA256 pickup code hash matching logic.
- **Functional Tests**: Cash custody balance integrity test.

---

## FEAT-03.05: Order Cancellation, Tracking & Tax Invoices

### 1. Hierarchy & Metadata
- **Epic**: `EPIC-03`
- **Feature ID**: `FEAT-03.05`
- **Official Runtimes**: Web PWA, Functions
- **Screens**: [BUY-11 Orders](file:///c:/Users/Admin/Downloads/logikchain/logikchain.com/constitution/wireframes/Buyer.md#BUY-11), [BUY-12 Order Detail](file:///c:/Users/Admin/Downloads/logikchain/logikchain.com/constitution/wireframes/Buyer.md#BUY-12), [BUY-12.1 Tax Invoice](file:///c:/Users/Admin/Downloads/logikchain/logikchain.com/constitution/wireframes/Buyer.md#BUY-12.1), [BUY-12.2 Cancel Confirm](file:///c:/Users/Admin/Downloads/logikchain/logikchain.com/constitution/wireframes/Buyer.md#BUY-12.2)
- **Functions / APIs**: `POST /v1/orders/{orderId}:cancel` (`cancelOrder`)

### 2. Acceptance Criteria (Gherkin)

```gherkin
Scenario: Buyer cancels order before gig departure
  Given an order "ord_101" in status "placed"
  And the associated gig is not yet "in_transit"
  When buyer calls "POST /v1/orders/ord_101:cancel"
  Then order status transitions to "cancelled"
  And reserved stock is restored to the gig inventory
```

### 3. Developer Test Plan & Mapping
- **Bruno API Test**: `tests/bruno/03-orders/cancelOrder/`.
- **UI E2E Test**: `tests/e2e/buyer/order-cancellation.spec.ts`.
- **Unit Tests**: Tax invoice PDF generation logic and GST split formatting.
