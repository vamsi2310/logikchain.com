# EPIC-10: Subscriptions, Tariffs & Monetization Entitlements

## Executive Summary
EPIC-10 manages Logikchain platform monetization. Regional suppliers subscribe to tiered platform plans (e.g. Standard, Enterprise Logistics) governed by billing cycles, tiered tariffs, regional discount codes, feature entitlements, and payment grace periods.

---

## FEAT-10.01: Subscription Plans & Tiered Tariff Definitions

### 1. Hierarchy & Metadata
- **Epic**: `EPIC-10`
- **Feature ID**: `FEAT-10.01`
- **Official Runtimes**: Support Ops Web Console (`web/x/index.html`), Functions
- **Screens**: [SPT-09 Plans & Pricing](file:///c:/Users/Admin/Downloads/logikchain/logikchain.com/constitution/wireframes/Support.md)
- **Functions / APIs**: `PUT /v1/config/plans/{planId}` (`upsertSubscriptionPlan`), `PUT /v1/config/tariffs/{tariffId}` (`upsertPlanTariff`)

### 2. Business Value & Problem Statement
Pricing models vary by geography and business scale. Support administrators define plans with designated feature entitlements (e.g., advanced route metrics, finance exports) and attach tariffs with billing cycles (monthly, annual) and country tax rates.

### 3. Acceptance Criteria (Gherkin)

```gherkin
Scenario: Support administrator configures a new subscription plan and monthly tariff
  Given an authenticated Support administrator
  When submitting "PUT /v1/config/plans/plan_pro_logistics" with:
    | name         | "Pro Logistics Suite"                     |
    | targetRole   | "supplier"                                |
    | status       | "active"                                  |
    | entitlements | ["finance.dashboard", "routes.unlimited"] |
  And submitting "PUT /v1/config/tariffs/tariff_pro_monthly" with:
    | planId       | "plan_pro_logistics" |
    | countryId    | "country_in"         |
    | billingCycle | "monthly"            |
    | listPrice    | 4999                 |
    | gstRate      | 18                   |
    | status       | "active"             |
  Then both records are activated
  And the plan becomes available for supplier enrollment
```

### 4. Developer Test Plan & Mapping
- **Bruno API Test**: `tests/bruno/11-config/upsertSubscriptionPlan/` and `upsertPlanTariff/`.
- **UI E2E Test**: `tests/e2e/support/plan-management.spec.ts`.

---

## FEAT-10.02: Promotional Offers & Discount Code Governance

### 1. Hierarchy & Metadata
- **Epic**: `EPIC-10`
- **Feature ID**: `FEAT-10.02`
- **Official Runtimes**: Support Ops Web Console, Functions
- **Functions / APIs**: `PUT /v1/config/offers/{offerId}` (`upsertSubscriptionOffer`), `PUT /v1/config/discount-codes/{codeId}` (`upsertOfferDiscountCode`)

### 2. Acceptance Criteria (Gherkin)

```gherkin
Scenario: Configure 20% discount offer code for new supplier onboarding
  Given an authenticated Support administrator
  When creating an offer "off_launch_20" with 20% discount value
  And creating discount code "BRUNO_LAUNCH_20" linked to the offer
  Then suppliers applying "BRUNO_LAUNCH_20" receive a 20% discount on their first billing cycle
```

### 3. Developer Test Plan & Mapping
- **Bruno API Test**: `tests/bruno/11-config/upsertSubscriptionOffer/` and `upsertOfferDiscountCode/`.
- **Unit Tests**: Discount percentage vs flat rate subtraction logic.

---

## FEAT-10.03: Supplier Self-Serve Subscriptions & Plan Migration

### 1. Hierarchy & Metadata
- **Epic**: `EPIC-10`
- **Feature ID**: `FEAT-10.03`
- **Official Runtimes**: Supplier Web PWA, Functions
- **Screens**: [SUP-13 Subscriptions](file:///c:/Users/Admin/Downloads/logikchain/logikchain.com/constitution/wireframes/Supplier.md#SUP-13)
- **Functions / APIs**: `POST /v1/subscriptions:self` (`subscribeToPlan`), `GET /v1/subscriptions/{id}/preview` (`previewPlanChange`), `PATCH /v1/subscriptions/{id}/plan` (`changeSubscriptionPlan`), `POST /v1/subscriptions/{id}:cancel` (`cancelSubscription`)

### 2. Acceptance Criteria (Gherkin)

```gherkin
Scenario: Supplier previews plan upgrade with proration calculation
  Given supplier has active plan "plan_starter" costing ₹1,999/mo (15 days remaining)
  When supplier requests "GET /v1/subscriptions/sub_01/preview?planId=plan_pro&tariffId=tariff_pro"
  Then the response details:
    | Prorated Credit on Old Plan | ₹1,000 |
    | Prorated Charge on New Plan | ₹2,500 |
    | Immediate Net Payable       | ₹1,500 |
    | Additional Entitlements     | ["routes.unlimited", "reports.exports"] |
```

### 3. Developer Test Plan & Mapping
- **Bruno API Test**: `tests/bruno/10-subscriptions/previewPlanChange/`, `changeSubscriptionPlan/`, `subscribeToPlan/`, and `cancelSubscription/`.
- **UI E2E Test**: `tests/e2e/supplier/subscription-upgrade.spec.ts`.
- **Unit Tests**: Mid-cycle prorated billing calculator.

---

## FEAT-10.04: Administrative Plan Assignment & Grace Period Extensions

### 1. Hierarchy & Metadata
- **Epic**: `EPIC-10`
- **Feature ID**: `FEAT-10.04`
- **Official Runtimes**: Support Ops Web Console, Functions
- **Screens**: [SPT-10 Subscriptions Ops](file:///c:/Users/Admin/Downloads/logikchain/logikchain.com/constitution/wireframes/Support.md)
- **Functions / APIs**: `POST /v1/subscriptions` (`assignSubscription`), `POST /v1/subscriptions/{id}:extend-grace` (`extendSubscriptionGrace`)

### 2. Acceptance Criteria (Gherkin)

```gherkin
Scenario: Support grants a 7-day payment grace extension for an overdue account
  Given a supplier subscription "sub_01" in status "past_due"
  When Support calls "POST /v1/subscriptions/sub_01:extend-grace" with extraDays 7
  Then the subscription status remains temporarily active
  And gracePeriodExpiresAt advances by 7 calendar days
  And platform features remain unblocked
```

### 3. Developer Test Plan & Mapping
- **Bruno API Test**: `tests/bruno/10-subscriptions/assignSubscription/` and `extendSubscriptionGrace/`.
- **UI E2E Test**: `tests/e2e/support/subscription-grace.spec.ts`.
