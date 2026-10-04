# Logikchain Documentation Framework & Story Traceability Matrix

This document defines the **5-Tier Documentation Framework** required as part of development for all work items in `work-management`. It establishes the target locations, exact content requirements, and a story-by-story traceability matrix mapping each feature and user story to the specific documentation that must be produced and maintained in code.

---

## 1. The 5-Tier Documentation Taxonomy

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                    THE 5 PRODUCTION DOCUMENTATION TIERS                      │
├──────────────────────────────────────────────────────────────────────────────┤
│ TIER 1: Service-Level Technical Docs    │ TIER 2: Operational Runbooks & SRE │
│ • Microservice READMEs & Architecture   │ • Incident Response & Health Probes│
│ • OpenAPI / Swagger Contracts           │ • CDC Sync & Dead-Letter Handling  │
│ • PostGIS / Relational Migration Specs  │ • Geo ETL Superimposition SOPs     │
│ • Outbox Event Schemas                  │ • Support Administrative SOPs      │
├─────────────────────────────────────────┼────────────────────────────────────┤
│ TIER 3: Client Runtime Technical Docs   │ TIER 4: Regulatory & Compliance    │
│ • Android Compose & Room Offline Guide  │ • NPCI TPAP Compliance Blueprint   │
│ • Web PWA Service Worker & Caching Guide│ • Section 194C / 194O TDS Guides   │
│ • iOS SwiftUI Architecture Guide        │ • GST Invoicing & Credit Note Spec │
│ • Hardware/Sensor Integration Protocols │ • Cloud KMS Banking Data Security  │
├─────────────────────────────────────────┴────────────────────────────────────┤
│ TIER 5: Embedded In-App Operational User Handbooks (In PWA, Android, iOS)   │
│ • Buyer In-App Guide (BUY-HELP): PUDO pickup, home delivery, in-app UPI pay  │
│ • Driver Pocket Guide (VEH-HELP): Loading, offline cash, partial delivery OTP│
│ • Merchant Playbook (MER-HELP): PUDO drop hub, home delivery setup, credit   │
│ • Supplier Playbook (SUP-HELP): Route planning, PUDO tiers, funds withdrawal │
│ • Support User Handbook (SPT-HELP): Proxy context, funds monitor, audit     │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Tier 5 Standards: Embedded In-App Operational Handbooks

All operational handbooks must be **first-class components baked directly into the application binaries and bundles** across **Web PWA**, **Android Native**, and **iOS Native**. They must function completely offline and be contextualized to the logged-in role:

| In-App Handbook | Screen / Route ID | Embedded App Targets | Core Modules & Content |
|---|---|---|---|
| **Buyer Guide** | `BUY-HELP` | • Web PWA (`web/b/help`)<br>• Android (`BuyerHelpScreen.kt`)<br>• iOS (`BuyerHelpView.swift`) | 1. How to select village merchant pickup vs. home delivery.<br>2. How to order from a rolling truck pamphlet in-transit.<br>3. How to pay online via UPI before picking up a CoD parcel.<br>4. Inspecting parcels and sharing 4-digit handover OTPs. |
| **Driver Pocket Guide** | `VEH-HELP` | • Web PWA (`web/d/help`)<br>• Android (`DriverHelpScreen.kt`)<br>• iOS (`DriverHelpView.swift`) | 1. Warehouse gate check and loading barcode scanning (`VEH-03`).<br>2. Dropping packages at the village merchant shop.<br>3. Handling partial deliveries and line-item rejections on `VEH-05`.<br>4. Offline cash collection tally and end-of-shift 6-digit OTP turn-in (`VEH-08`). |
| **Merchant Playbook** | `MER-HELP` | • Web PWA (`web/m/help`)<br>• Android (`MerchantHelpScreen.kt`)<br>• iOS (`MerchantHelpView.swift`) | 1. Operating the village pickup hub (PUDO) & verifying buyer OTPs.<br>2. Configuring village home delivery, working days, and fees on `MER-08`.<br>3. Placing bulk restocking orders on supplier-specific credit (`MER-04`, `MER-05`).<br>4. Holding and remitting collected buyer CoD cash to visiting truck drivers. |
| **Supplier Playbook** | `SUP-HELP` | • Web PWA (`web/s/help`)<br>• Android (`SupplierHelpScreen.kt`)<br>• iOS (`SupplierHelpView.swift`) | 1. Scheduling multi-village circuits with merchant waypoints on `SUP-03`.<br>2. Partitioning pre-booked orders vs. liquid rolling pamphlet stock.<br>3. Underwriting merchant trade credit headroom per vendor on `SUP-10`.<br>4. Setting monthly volume-tiered PUDO commissions on `SUP-12`.<br>5. Monitoring revenue allocations and executing bank withdrawals on `SUP-11`. |
| **Support User Handbook** | `SPT-HELP` | • Web PWA (`web/x/help`)<br>• Android (`SupportHelpScreen.kt`)<br>• iOS (`SupportHelpView.swift`) | 1. Operating the Support-as-Supplier proxy switcher (`X-Supplier-Context`).<br>2. Auditing and resolving driver cash shortages vs. counterfeit bills on `SPT-06`.<br>3. Intervening during vehicle breakdowns to reassign gigs on `SPT-03`.<br>4. Monitoring supplier platform funds and escrow allocations on `SPT-12`.<br>5. Running the monthly Geo CSV + GeoJSON superimposition engine on `SPT-10`.<br>6. Field support guide for resolving rural merchant offline sync issues on mobile devices. |

---

## 3. Epic-by-Epic Documentation Traceability Matrix

The following matrix classifies all features and user stories across the 13 microservices, detailing the **exact documentation deliverables** required for each.

---

### EPIC-01: Identity, Access & Organization Governance
**Bound Microservice**: `identity-service` (:4001) | **Database**: `identity_db`

| Feature / User Story | Applicable Tiers | Target Documentation Files | Exact Contents to be Added |
|---|:---:|---|---|
| **FEAT-01.01** (Auth Bootstrap)<br>`US-01.01.01`, `US-01.01.02` | **Tier 1, 3** | • `microservices/services/identity-service/README.md`<br>• `microservices/services/identity-service/openapi.yaml`<br>• `android/docs/auth_flow.md` | • Firebase custom claims lifecycle (`role`, `supplierId`, `merchantId`).<br>• Token refresh and session revocation rules.<br>• Play Integrity App Check header validation sequence. |
| **FEAT-01.02** (Supplier Onboarding)<br>`US-01.02.01`, `US-01.02.02` | **Tier 1, 5** | • `microservices/services/identity-service/openapi.yaml`<br>• Embedded in `SUP-HELP` & `SPT-HELP` | • OpenAPI spec for `POST /v1/suppliers` with GSTIN verification.<br>• Step-by-step supplier business document verification guide for Support operators. |
| **FEAT-01.03** (Role Conversion & Merchant Registration)<br>`US-01.03.01`, `US-01.03.02` | **Tier 1, 5** | • `microservices/services/identity-service/README.md`<br>• Embedded in `MER-HELP` | • Specification of buyer-to-merchant promotion state machine.<br>• Village merchant shop registration walkthrough, including GPS tagging of shop location. |
| **FEAT-01.04** (Account Governance & Lockout)<br>`US-01.04.01`, `US-01.04.02` | **Tier 2, 5** | • `docs/support-sop/account_suspension_sop.md`<br>• Embedded in `SPT-HELP` | • Criteria for fraud/AML account suspension.<br>• Procedure for Support operators to view audit logs and restore locked accounts. |
| **FEAT-01.05** (Supplier Support Delegation & Subscription Gate)<br>`US-01.05.01`, `US-01.05.02`, `US-01.05.03` | **Tier 1, 2, 4, 5** | • `microservices/services/identity-service/openapi.yaml`<br>• `docs/support-sop/support_proxy_guide.md`<br>• `docs/compliance/delegated_support_access_policy.md`<br>• Embedded in `SUP-HELP`, `SPT-HELP` | • OpenAPI contracts for support grant lifecycle (`POST /v1/suppliers/support-grants`, `DELETE .../{id}`).<br>• Subscription tier gating check (`delegated_support_enabled: true`).<br>• Gateway proxy header (`X-Supplier-Context`) validation rules, 4-hour max grant expiry, and one-click revocation.<br>• Support-as-Supplier operator handbook on `SPT-01` and supplier security settings on `SUP-13`. |
| **FEAT-01.06** (User Profile Lifecycle & Media Storage)<br>`US-01.06.01`–`US-01.06.04`<br>`PWA-01.06.01`, `AND-01.06.01`, `IOS-01.06.01` | **Tier 1, 3, 5** | • `microservices/services/identity-service/openapi.yaml`<br>• `docs/architecture/user_profile_and_media_specs.md`<br>• `android/docs/user_profile_room_cache.md`<br>• Embedded in `BUY-HELP`, `MER-HELP`, `VEH-HELP`, `SUP-HELP`, `SPT-HELP` | • OpenAPI contracts for `GET /v1/users/me`, `PATCH /v1/users/{userId}`, and `POST /v1/users/{userId}/avatar/upload-url`.<br>• Google Cloud Storage v4 signed URL handshake specs and image crop guidelines.<br>• First-time onboarding wizard specifications (`BUY-00` / `/setup`) for village and merchant binding.<br>• Room DB & SwiftData offline profile caching protocols. |

---

### EPIC-02: Orders, Fulfillment & Dual Commerce
**Bound Microservice**: `orders-service` (:4002) | **Database**: `orders_db`

| Feature / User Story | Applicable Tiers | Target Documentation Files | Exact Contents to be Added |
|---|:---:|---|---|
| **FEAT-02.01** (Buyer Ordering & In-Transit Conversion)<br>`US-02.01.01`–`US-02.01.03`<br>`AND-02.01.01` (UI Layout)<br>`AND-02.01.02` (Room DB)<br>`AND-02.01.03` (UPI Intent & Sync) | **Tier 1, 3, 5** | • `microservices/services/orders-service/openapi.yaml`<br>• `android/docs/orders_offline.md`<br>• `android/docs/buyer_room_schema.md`<br>• Embedded in `BUY-HELP`, `MER-HELP` | • OpenAPI contract for `POST /v1/orders` with `fulfillmentMode` (`merchant_pickup` vs `merchant_home_delivery`).<br>• Dynamic stock deduction protocol from in-transit truck pamphlets.<br>• Room DB schema (`cached_orders`, `cached_order_items`) and Compose UI layout for multi-line checkout.<br>• In-app guide showing buyers how to pay online via UPI anytime before collecting a CoD parcel. |
| **FEAT-02.02** (B2B Merchant Bulk Credit Ordering)<br>`US-02.02.01` | **Tier 1, 4, 5** | • `microservices/services/orders-service/openapi.yaml`<br>• `docs/compliance/b2b_invoicing_rules.md`<br>• Embedded in `MER-HELP` | • Two-phase credit hold contract (`/credit/holds` $\rightarrow$ `/orders` $\rightarrow$ `/commit`).<br>• B2B GST tax invoice breakdown with case-tier wholesale pricing.<br>• Merchant handbook section on restocking on credit. |
| **FEAT-02.03** (Merchant Hub Handover & Partial Delivery)<br>`US-02.03.01`–`US-02.03.03`<br>`AND-02.03.01` (UI Layout)<br>`AND-02.03.02` (Room Handover Store)<br>`AND-02.03.03` (Scanner & Integrity) | **Tier 1, 2, 3, 5** | • `microservices/services/orders-service/openapi.yaml`<br>• `docs/runbooks/delivery_handover_runbook.md`<br>• `android/docs/handover_scanner_protocol.md`<br>• Embedded in `VEH-HELP`, `MER-HELP`, `BUY-HELP` | • OpenAPI contract for `POST /v1/orders/{id}/partial-delivery` with line-item rejection reason codes.<br>• ML Kit CameraX barcode scanning and Play Integrity token attestation specs.<br>• Room DB staging for offline OTP verification and discrepancy queue.<br>• Illustrated driver guide on inspecting damaged goods and scanning 4-digit buyer OTPs at merchant shops. |
| **FEAT-02.04** (Order Deliverables, Returns & RTO Policy)<br>`US-02.04.01`, `US-02.04.02`, `US-02.04.03` | **Tier 1, 4, 5** | • `microservices/services/orders-service/openapi.yaml`<br>• `docs/compliance/order_deliverables_and_sla_policy.md`<br>• `docs/compliance/customer_return_and_refund_policy.md`<br>• `docs/compliance/unclaimed_parcel_rto_policy.md`<br>• Embedded in `BUY-HELP`, `MER-HELP`, `SPT-HELP` | • Contract for `POST /v1/orders/{id}/rto/trigger` and return eligibility validation.<br>• Policy definitions: 72-hour village merchant PUDO holding window, non-returnable categories, and automated RTO reverse logistics.<br>• In-app guide on pickup deadlines and return rights. |

---

### EPIC-03: Gig Logistics, Fleet Dispatch & Routing
**Bound Microservice**: `gigs-service` (:4003) | **Database**: `gigs_db`

| Feature / User Story | Applicable Tiers | Target Documentation Files | Exact Contents to be Added |
|---|:---:|---|---|
| **FEAT-03.01** (Gig Composition & Waypoints)<br>`US-03.01.01`, `US-03.01.02`, `US-03.01.03` | **Tier 1, 2, 5** | • `microservices/services/gigs-service/openapi.yaml`<br>• `docs/runbooks/fleet_breakdown_sop.md`<br>• Embedded in `SUP-HELP`, `VEH-HELP`, `SPT-HELP` | • Surrogate key specification (`gig_{id}`) with mutable `vehicleId` and `driverId`.<br>• Merchant-anchored waypoint optimization rules via Google Maps Distance Matrix.<br>• SRE runbook & Support guide for mid-route vehicle reassignment (`PATCH /v1/gigs/{id}/reassign-vehicle`). |
| **FEAT-03.02** (Real-Time GPS Telemetry)<br>`US-03.02.01`<br>`AND-03.02.01` (UI Tracking Screen)<br>`AND-03.02.02` (Foreground GPS Service)<br>`AND-03.02.03` (Room Telemetry Cache) | **Tier 1, 3** | • `microservices/services/gigs-service/README.md`<br>• `android/docs/gps_telemetry.md`<br>• `android/docs/room_telemetry_cache.md` | • Telemetry ingestion pipeline, batching intervals (30s), and Play Integrity token validation.<br>• Android Foreground Service with persistent notification and fused location provider.<br>• Room DB schema (`offline_waypoints`) for offline queuing when out of cellular coverage. |
| **FEAT-03.03** (Gig Finalization & Settlement)<br>`US-03.03.01` | **Tier 1, 2, 5** | • `docs/runbooks/end_of_gig_runbook.md`<br>• Embedded in `SUP-HELP`, `VEH-HELP` | • Criteria for gig completion: all merchant drops completed, returns verified, and cash handed over.<br>• Premature gig suspension and emergency route truncation SOP. |
| **FEAT-03.04** (Supplier Route Catalog & Cloning)<br>`US-03.04.01`, `US-03.04.02`, `US-03.04.03` | **Tier 1, 4, 5** | • `microservices/services/gigs-service/openapi.yaml`<br>• `docs/playbooks/supplier_route_management.md`<br>• Embedded in `SUP-HELP` | • Contract for `POST /v1/routes/{id}/clone` and freeform custom route creation on `gigs-service`.<br>• Subscription monthly gig execution limit (`monthlyGigLimit`) rulebook enforced on `POST /v1/gigs`.<br>• Interactive route builder drag-and-drop stop editing and turnaround recalculation guide.<br>• Route deletion rejection SOP when referenced by active/upcoming gigs (`ROUTE_IN_USE_BY_GIGS`). |

---

### EPIC-04: Pamphlet & Dynamic Inventory Distribution
**Bound Microservice**: `pamphlet-service` (:4004) | **Database**: `pamphlet_db`

| Feature / User Story | Applicable Tiers | Target Documentation Files | Exact Contents to be Added |
|---|:---:|---|---|
| **FEAT-04.01** (Dynamic Pamphlet & Rolling Stock)<br>`US-04.01.01`, `US-04.01.02` | **Tier 1, 5** | • `microservices/services/pamphlet-service/openapi.yaml`<br>• Embedded in `SUP-HELP`, `VEH-HELP` | • Surrogate key specification (`pmp_{id}`) bound to `gigId`.<br>• Dual cargo partitioning spec: pre-booked merchant packages vs. rolling spot-restock inventory.<br>• In-transit stock deduction API and zero-pre-orders departure guide. |
| **FEAT-04.02** (Warehouse Loading & Verification)<br>`US-04.02.01` | **Tier 2, 5** | • `docs/runbooks/warehouse_staging_sop.md`<br>• Embedded in `SUP-HELP` | • Dock loading gate check procedures and barcode scanner verification protocols.<br>• Discrepancy logging when warehouse physical stock differs from planned manifest. |
| **FEAT-04.03** (Transit Damage, Shrinkage & Returns)<br>`US-04.03.01`, `US-04.03.02`, `US-04.03.03` | **Tier 1, 2, 4, 5** | • `microservices/services/pamphlet-service/README.md`<br>• `docs/compliance/transit_damage_and_shrinkage_policy.md`<br>• `docs/compliance/warehouse_returns_and_restocking_sop.md`<br>• Embedded in `VEH-HELP`, `SUP-HELP`, `SPT-HELP` | • Database schema for `return_items` logging rejected/damaged items.<br>• Contractual policy on 0.5% rural road shrinkage allowance vs driver negligence.<br>• Warehouse reverse logistics intake, restocking, and damage write-off protocols. |

---

### EPIC-05: Payments & Collections Infrastructure
**Bound Microservice**: `payments-service` (:4005) | **Database**: `payments_db`

| Feature / User Story | Applicable Tiers | Target Documentation Files | Exact Contents to be Added |
|---|:---:|---|---|
| **FEAT-05.01** (UPI Intent & QR Collections)<br>`US-05.01.01` | **Tier 1, 4, 5** | • `microservices/services/payments-service/openapi.yaml`<br>• `docs/compliance/upi_intent_spec.md`<br>• Embedded in `BUY-HELP` | • NPCI UPI Intent URL parameter specification (`upi://pay?pa=...&am=...`).<br>• 15-minute intent expiry timeout handling and polling reconciliation.<br>• In-app guide for buyers selecting Google Pay, PhonePe, or Paytm. |
| **FEAT-05.02** (Payment Webhooks & Replay Defense)<br>`US-05.02.01` | **Tier 1, 2** | • `microservices/services/payments-service/README.md`<br>• `docs/runbooks/payment_gateway_outage_sop.md` | • Razorpay webhook signature verification algorithm (HMAC-SHA256).<br>• Idempotent payment processing and replay attack mitigation.<br>• SRE runbook for delayed webhook replay after gateway outages. |
| **FEAT-05.03** (Automated Refunds & Credit Notes)<br>`US-05.03.01` | **Tier 1, 4, 5** | • `microservices/services/payments-service/openapi.yaml`<br>• `docs/compliance/gst_credit_notes.md`<br>• Embedded in `BUY-HELP`, `SPT-HELP` | • Automated UPI reversal API specification for canceled or partially rejected orders.<br>• Statutory GST credit note formatting and customer communication templates. |

---

### EPIC-06: Payouts, Disbursements & Banking Security
**Bound Microservice**: `payouts-service` (:4006) | **Database**: `payouts_db`

| Feature / User Story | Applicable Tiers | Target Documentation Files | Exact Contents to be Added |
|---|:---:|---|---|
| **FEAT-06.01** (Beneficiary Banking & KMS)<br>`US-06.01.01`, `US-06.01.02` | **Tier 1, 4, 5** | • `microservices/services/payouts-service/README.md`<br>• `docs/compliance/kms_envelope_encryption.md`<br>• Embedded in `SUP-HELP`, `VEH-HELP` | • Google Cloud KMS envelope encryption technical spec (DEK generation & ciphertext storage).<br>• Penny-drop account validation integration spec.<br>• In-app guide for suppliers and drivers adding bank account details. |
| **FEAT-06.02** (Payout Requests & Threshold Review)<br>`US-06.02.01`, `US-06.02.02` | **Tier 1, 2, 5** | • `microservices/services/payouts-service/openapi.yaml`<br>• `docs/support-sop/payout_review_sop.md`<br>• Embedded in `SPT-HELP`, `SUP-HELP` | • Auto-approval limits (e.g. $\le ₹5,000$) vs. manual Support review thresholds.<br>• Rule: Payout is blocked if driver has unresolved cash custody shortages.<br>• Support operator review and approval walkthrough. |
| **FEAT-06.03** (Cloud Tasks Asynchronous Execution)<br>`US-06.03.01` | **Tier 1, 2** | • `microservices/services/payouts-service/README.md`<br>• `docs/runbooks/cloud_tasks_payout_queue.md` | • Rate-limited disbursement queue parameters (max 10 transfers/sec).<br>• Banking UTR capture and webhook reconciliation. |
| **FEAT-06.04** (Supplier Funds Tracking Console)<br>`US-06.04.01`, `US-06.04.02` | **Tier 1, 4, 5** | • `microservices/services/payouts-service/openapi.yaml`<br>• `docs/compliance/supplier_escrow_accounting.md`<br>• Embedded in `SPT-HELP`, `SUP-HELP` | • Multi-channel fund allocation math: Gross Inflow $\rightarrow$ Merchant Commissions, Driver Pay, Platform Take-Rate, Net Supplier Bank Balance.<br>• Support monitoring guide for auditing supplier balances and resolving withdrawal holds. |

---

### EPIC-07: Cash Management & Rural CoD Custody
**Bound Microservice**: `cash-service` (:4007) | **Database**: `cash_db`

| Feature / User Story | Applicable Tiers | Target Documentation Files | Exact Contents to be Added |
|---|:---:|---|---|
| **FEAT-07.01** (Merchant Hub Cash Collection)<br>`US-07.01.01`, `US-07.01.02`<br>`AND-07.01.01` (UI Denomination Calculator)<br>`AND-07.01.02` (Room Offline Ledger)<br>`AND-07.01.03` (WorkManager Sync) | **Tier 1, 3, 5** | • `microservices/services/cash-service/openapi.yaml`<br>• `android/docs/offline_cash_custody.md`<br>• `android/docs/room_cash_ledger.md`<br>• Embedded in `VEH-HELP`, `MER-HELP` | • Android Room DB schema (`offline_cash_ledger`) for offline collection logging.<br>• WorkManager sync with exponential backoff and network constraint gates.<br>• Compose UI denomination breakdown calculator (₹500, ₹200, ₹100, ₹50).<br>• Merchant CoD remittance flow: merchant collects cash at parcel pickup and turns it over to the truck driver on the next visit.<br>• Cash adjustment rules for partial deliveries. |
| **FEAT-07.02** (Driver-to-Supplier Cash Handover & OTP)<br>`US-07.02.01`, `US-07.02.02` | **Tier 1, 2, 5** | • `microservices/services/cash-service/openapi.yaml`<br>• `docs/runbooks/cashier_settlement_sop.md`<br>• Embedded in `VEH-HELP`, `SUP-HELP` | • Cryptographic 6-digit handover OTP generation and verification API.<br>• Warehouse cashier physical bill counting and settlement receipt generation.<br>• Emergency counter-signature code voucher for dead mobile devices. |
| **FEAT-07.03** (Cash Shortage, Counterfeit & Loss Policy)<br>`US-07.03.01`, `US-07.03.02` | **Tier 1, 2, 4, 5** | • `docs/support-sop/cash_shortfall_dispute_sop.md`<br>• `docs/compliance/cash_custody_and_counterfeit_policy.md`<br>• Embedded in `VEH-HELP`, `SPT-HELP` | • Standard operating procedure for investigating cash shortages vs. counterfeit bills on `SPT-06`.<br>• RBI counterfeit currency reporting guidelines, driver cash-in-transit limit (₹50k), and highway theft insurance terms. |

---

### EPIC-08: Merchant Credit & Risk Underwriting
**Bound Microservice**: `credit-service` (:4008) | **Database**: `credit_db`

| Feature / User Story | Applicable Tiers | Target Documentation Files | Exact Contents to be Added |
|---|:---:|---|---|
| **FEAT-08.01** (Supplier-Scoped Credit Underwriting)<br>`US-08.01.01`, `US-08.01.02` | **Tier 1, 4, 5** | • `microservices/services/credit-service/openapi.yaml`<br>• `docs/compliance/trade_credit_agreements.md`<br>• Embedded in `MER-HELP`, `SUP-HELP` | • Database schema for composite primary key `(merchant_id, supplier_id)`.<br>• Strict isolation proof: merchant can hold independent credit lines with different suppliers.<br>• Merchant handbook guide to viewing supplier-by-supplier credit headroom. |
| **FEAT-08.02** (Synchronous Credit Holds & Releases)<br>`US-08.02.01` | **Tier 1, 2** | • `microservices/services/credit-service/openapi.yaml`<br>• `docs/runbooks/credit_hold_commit_protocol.md` | • High-performance synchronous hold API contract (`POST /v1/credit/holds`).<br>• Two-phase commit protocol and automatic partial hold release upon line-item rejection. |
| **FEAT-08.03** (Cash Credit Repayment & Headroom Restoration)<br>`US-08.03.01` | **Tier 1, 5** | • `microservices/services/credit-service/openapi.yaml`<br>• Embedded in `MER-HELP`, `VEH-HELP` | • In-person repayment workflow: merchant hands cash to driver, driver receipts it on `VEH-05`, and headroom is instantly restored on `MER-07`. |
| **FEAT-08.04** (Trade Credit Terms & Default Recovery)<br>`US-08.04.01`, `US-08.04.02` | **Tier 1, 4, 5** | • `microservices/services/credit-service/openapi.yaml`<br>• `docs/compliance/merchant_trade_credit_policy.md`<br>• Embedded in `MER-HELP`, `SUP-HELP`, `SPT-HELP` | • Contract for `GET /v1/credit/merchants/{id}/suppliers/{id}/terms` and aging evaluation.<br>• Statutory trade credit terms: 7/14-day cycles, aging buckets (Current, Grace, Overdue, Default), and automated supplier ordering freezes.<br>• In-app guide on repayment schedules and dispute arbitration. |

---

### EPIC-09: Finance, Ledger & Bank Reconciliation
**Bound Microservice**: `finance-service` (:4009) | **Database**: `finance_db`

| Feature / User Story | Applicable Tiers | Target Documentation Files | Exact Contents to be Added |
|---|:---:|---|---|
| **FEAT-09.01** (Double-Entry General Ledger)<br>`US-09.01.01` | **Tier 1, 4** | • `microservices/services/finance-service/README.md`<br>• `docs/compliance/chart_of_accounts.md` | • Standard Logikchain Chart of Accounts (Assets, Liabilities, Equity, Revenue, Expense).<br>• Mathematical invariants: Debits equal Credits on every transaction. |
| **FEAT-09.02** (Three-Way Bank Reconciliation)<br>`US-09.02.01` | **Tier 1, 2, 5** | • `docs/runbooks/bank_reconciliation_sop.md`<br>• Embedded in `SPT-HELP` | • Automated three-way matching logic: Order Amount vs. Payment Gateway Settlement vs. Bank Statement.<br>• Variance tolerance thresholds and Support manual reconciliation guide. |
| **FEAT-09.03** (Statutory TDS Tax Ledger)<br>`US-09.03.01` | **Tier 1, 4** | • `docs/compliance/tds_statutory_guide.md` | • Indian Income Tax Act compliance: Section 194C (1% / 2% on driver earnings) and Section 194O (1% on e-commerce suppliers).<br>• Quarterly Form 26Q / 27Q tax export generation specs. |

---

### EPIC-10: Platform Configuration & Geo Registry
**Bound Microservice**: `config-service` (:4010) | **Database**: `config_db`

| Feature / User Story | Applicable Tiers | Target Documentation Files | Exact Contents to be Added |
|---|:---:|---|---|
| **FEAT-10.01** (Geo Master & Merchant Serviceability)<br>`US-10.01.01` – `US-10.01.05` | **Tier 1, 2, 5** | • `microservices/services/config-service/openapi.yaml`<br>• `docs/runbooks/geo_master_maintenance.md`<br>• Embedded in `BUY-HELP`, `SPT-HELP` | • Rule specification: `is_serviceable = (has_active_merchant == true)`.<br>• PostGIS `ST_Within` coordinate-to-village resolution queries.<br>• Support console guide for editing pincode boundaries and state/district masters on `SPT-10`. |
| **FEAT-10.02** (Subscription Plans & Tariffs)<br>`US-10.02.01` | **Tier 1, 4, 5** | • `microservices/services/config-service/openapi.yaml`<br>• `docs/compliance/subscription_tariffs.md`<br>• Embedded in `SUP-HELP`, `SPT-HELP` | • Tier definition schema (vehicle limits, platform fees, credit feature flags).<br>• In-app guide for suppliers choosing subscription tiers on `SUP-01` and support editing on `SPT-11`. |
| **FEAT-10.03** (Audit Logging & Governance)<br>`US-10.03.01` | **Tier 1, 2** | • `microservices/services/config-service/README.md`<br>• `docs/runbooks/audit_trail_inspection.md` | • Immutable audit log schema (`audit_events` with actor, IP, timestamp, diff).<br>• Compliance runbook for investigating unauthorized configuration overrides. |
| **FEAT-10.04** (Support Proxy Pattern & Context Switcher)<br>`US-10.04.01` | **Tier 1, 2, 5** | • `microservices/services/config-service/README.md`<br>• `docs/support-sop/support_proxy_guide.md`<br>• Embedded in `SPT-HELP` | • `X-Supplier-Context` header specification, Gateway validation middleware, and audit logging.<br>• Illustrated Support handbook on switching supplier context to configure routes or resolve tickets. |
| **FEAT-10.05** (Bulk Geo ETL & Superimposition Engine)<br>`US-10.05.01`, `SPT-09.3` | **Tier 1, 2, 5** | • `work-management/geo_data_analysis.md`<br>• `scripts/geo_superimpose.py`<br>• `docs/runbooks/geo_bulk_ingestion_sop.md`<br>• Embedded in `SPT-HELP` | • Automated Python/Node ETL pipeline specs (`scripts/geo_superimpose.py`) merging 176k Post Offices CSV + 19k GeoJSON polygons.<br>• Polygon centroid spatial interpolation for 69k post offices lacking coordinates.<br>• PostGIS spatial GIST indexing, and Firestore batch read-model generation.<br>• Support operator wireframe guide on `SPT-09.3` for dry-run validation, diffing, and committing geo datasets. |
| **FEAT-10.06** (Village Delivery & PUDO Agreement)<br>`US-10.06.01` – `US-10.06.04` | **Tier 1, 4, 5** | • `microservices/services/config-service/openapi.yaml`<br>• `docs/compliance/merchant_pudo_partner_agreement.md`<br>• Embedded in `MER-HELP`, `SUP-HELP`, `SPT-HELP` | • Merchant guide: Configuring village home delivery, working days, delivery days, and delivery charges on `MER-08`.<br>• Supplier guide: Configuring monthly parcel volume tiers and commission rates on `SUP-12`.<br>• Merchant PUDO Hub Partner Agreement: 72h holding SLA, care obligations, loss liability, and tiered commissions.<br>• Support guide: Configuring commission tiers on behalf of suppliers and dispatching notifications on `SPT-13`. |
| **FEAT-10.07** (Master Corridors & Route Oversight)<br>`US-10.07.01` – `US-10.07.03` | **Tier 1, 2, 5** | • `microservices/services/config-service/openapi.yaml`<br>• `docs/runbooks/master_corridor_and_route_governance.md`<br>• Embedded in `SPT-HELP` | • Specifications for Master Route Corridors (`supplierId: "GLOBAL"`) and vetted village stop sequences.<br>• Support console SOP for viewing and editing custom routes across all suppliers with audit trail.<br>• Unified deletion policy rulebook rejecting route deletions with 409 Conflict if active or scheduled gigs reference it (`ROUTE_IN_USE_BY_GIGS`). |

---

### EPIC-11: Platform Governance & Regulatory Compliance
**Bound Microservice**: `governance-service` (:4011) | **Database**: `governance_db`

| Feature / User Story | Applicable Tiers | Target Documentation Files | Exact Contents to be Added |
|---|:---:|---|---|
| **FEAT-11.01** (NPCI TPAP Regulatory Governance)<br>`US-11.01.01` | **Tier 1, 4** | • `docs/compliance/npci_tpap_blueprint.md` | • NPCI TPAP procedural guidelines, verified VPA registration, and audit trail specs. |
| **FEAT-11.02** (AML & Velocity Risk Engine)<br>`US-11.02.01` | **Tier 1, 2, 5** | • `docs/support-sop/aml_fraud_investigation_sop.md`<br>• Embedded in `SPT-HELP` | • Transaction velocity limits (max 5 orders/hr, ₹50k cash/day per driver).<br>• Support guide for auditing flagged high-risk transactions. |
| **FEAT-11.03** (Grievance Redressal & Ombudsman)<br>`US-11.03.01` | **Tier 4, 5** | • `docs/compliance/customer_grievance_policy.md`<br>• Embedded in `BUY-HELP`, `MER-HELP`, `SPT-HELP` | • Formal RBI/NPCI tiered customer grievance escalation matrix.<br>• In-app dispute ticket submission and resolution SLAs. |
| **FEAT-11.04** (Platform Terms of Service & Consent)<br>`US-11.04.01`, `US-11.04.02`, `US-11.04.03` | **Tier 1, 4, 5** | • `microservices/services/governance-service/openapi.yaml`<br>• `docs/compliance/platform_terms_of_service.md`<br>• `docs/compliance/privacy_data_protection_policy.md`<br>• `docs/compliance/intermediary_guidelines_disclosure.md`<br>• Embedded in `BUY-HELP`, `MER-HELP`, `SUP-HELP`, `VEH-HELP`, `SPT-HELP` | • API contract for `POST /v1/governance/policies/consent` with immutable cryptographic audit logging.<br>• Master Platform Terms of Service across Buyer, Merchant, Supplier, and Driver roles.<br>• Mandatory re-consent interceptor flow for policy updates under Consumer Protection E-Commerce Rules 2020. |

---

### EPIC-12: Gateway, CDC Sync & Cloud Infrastructure
**Bound Microservice**: `gateway-service` / `sync-engine` (:4013, :4050) | **Database**: `sync_db`

| Feature / User Story | Applicable Tiers | Target Documentation Files | Exact Contents to be Added |
|---|:---:|---|---|
| **FEAT-12.01** (API Gateway Perimeter & Rate Limiting)<br>`US-12.01.01` | **Tier 1, 2** | • `microservices/devops/gateway_architecture.md` | • Master API Gateway routing table, Firebase Auth JWT validation, internal header injection (`x-user-uid`, `x-user-role`, `X-Supplier-Context`), and Redis token-bucket rate limiting (300 req/min). |
| **FEAT-12.02** (Firebase App Check Attestation)<br>`US-12.02.01` | **Tier 1, 3** | • `android/docs/play_integrity_setup.md`<br>• `web/docs/recaptcha_enterprise_setup.md` | • SHA-256 fingerprint registration for Google Play Integrity.<br>• reCAPTCHA Enterprise site key setup for Web PWA. |
| **FEAT-12.03** (PostgreSQL Outbox CDC Sync Engine)<br>`US-12.03.01`, `US-12.03.02` | **Tier 1, 2** | • `microservices/services/sync-engine/README.md`<br>• `docs/runbooks/sync_engine_dlq_sop.md` | • Transactional outbox polling architecture (2000ms interval).<br>• Conflict resolution matrix: physical driver cash collection takes precedence over software cancellations.<br>• Dead-letter queue (`outbox_dead_letters`) management and alert runbook. |

---

### EPIC-13: Social Connect & Notification Channels
**Bound Microservice**: `social-connect-service` (:4012) | **Database**: `social_connect_db`

| Feature / User Story | Applicable Tiers | Target Documentation Files | Exact Contents to be Added |
|---|:---:|---|---|
| **FEAT-13.01** (Notification Preferences & Sync)<br>`US-13.01.01` | **Tier 1, 5** | • `microservices/services/social-connect-service/openapi.yaml`<br>• Embedded in `BUY-HELP`, `MER-HELP` | • User opt-in/opt-out API for WhatsApp, SMS, and In-App push notifications.<br>• In-app guide on managing communication preferences. |
| **FEAT-13.02** (WhatsApp Business Cloud HSM Templates)<br>`US-13.02.01` | **Tier 1, 4** | • `docs/compliance/whatsapp_template_catalog.md` | • Complete catalog of pre-approved Meta WhatsApp templates across Telugu, Hindi, and English.<br>• HSM variable parameters for order confirmations, delivery ETAs, and OTPs. |
| **FEAT-13.03** (Lifecycle Alerts & Live ETA)<br>`US-13.03.01` | **Tier 1, 5** | • `microservices/services/social-connect-service/README.md`<br>• Embedded in `BUY-HELP`, `MER-HELP` | • Outbox-driven delivery tracking WhatsApp notifications with live driver ETA links.<br>• In-app guide for buyers to monitor truck arrival and delivery ETAs. |
| **FEAT-13.04** (Dynamic Bill PDF Generation)<br>`US-13.04.01` | **Tier 1, 4, 5** | • `microservices/services/social-connect-service/openapi.yaml`<br>• `docs/compliance/tax_invoice_rendering.md`<br>• Embedded in `BUY-HELP`, `MER-HELP`, `SPT-HELP` | • Automated PDF tax invoice rendering engine specs and Cloud Storage streaming.<br>• Customer guide for downloading GST invoices from WhatsApp or in-app history. |

---

## 4. Definition of Done (DoD) Documentation Gate

No feature or user story in `work-management` is considered **DONE** or eligible for production deployment until all documentation requirements mapped in this matrix have been fulfilled:

1. **Code Deliverables**: Backend API endpoints, client UI screens, and DB migrations.
2. **Technical Docs (Tiers 1–3)**: Updated microservice `README.md`, generated `openapi.yaml`, and client runtime architecture guides committed in the pull request.
3. **Operational Runbooks (Tier 2 & 4)**: Associated SOP or compliance doc updated in `docs/runbooks/` or `docs/compliance/`.
4. **Embedded In-App Handbooks (Tier 5)**: User handbook markdown/JSON assets updated within the Web PWA (`web/src/handbooks/`), Android (`android/.../handbook/`), and iOS bundles so that end-users and support operators have live, offline-accessible documentation on day one.
