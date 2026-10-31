# Logikchain End-to-End Numbered Use Cases Specification & Lifecycle Framework

## 1. Architectural 4-Phase Lifecycle

Every use case in Logikchain adheres to an immutable 4-phase execution lifecycle across all roles, client devices, and integration touchpoints:

```mermaid
flowchart LR
    P1["1. Test Data Setup\n(Seed mock entities, limits & tokens)"] --> P2["2. User Sign-In\n(OTP authentication & role claims)"]
    P2 --> P3["3. Core Business Flow\n(Transactions, gates & circuit breakers)"]
    P3 --> P4["4. User Sign-Out\n(Token purge & session isolation)"]
```

1. **Phase 1: Test Data Setup (`setupUseCaseTestData`)**: Pre-conditions and state initialization. Seeds designated entity identifiers (`userId`, `orderId`, `driverId`, `targetSupplierId`), credit limits, geocoded village hubs, and registers mock state payloads into client storage (`localStorage.setItem('lc_test_data_${number}', ...)`).
2. **Phase 2: User Sign-In (`performUserSignIn`)**: Explicit role-based authentication. Executes mobile phone number OTP entry (e.g. `8977848501` / `123123`) or mounts authenticated operator administrative sessions (`dev-token:test_operator_01:support`).
3. **Phase 3: Core Business Flow**: Execution of business transactions, inter-service API calls through API Gateway (`:30080`), database state mutations, and circuit breaker evaluation.
4. **Phase 4: Explicit User Sign-Out (`performUserSignOut`)**: Graceful session termination. Clears `lc_session_user`, `lc_dev_token`, `lc_test_role`, and `lc_support_supplier_context`, verifying clean transition back to the unauthenticated public layout.

---


### 1.1 Decoupled Test Data Architecture & Individual Ingress Framework

To guarantee strict test isolation, reproducibility, and prevent hardcoded ad-hoc mock state in Playwright test files (`*.spec.ts`), all test data is strictly decoupled into dedicated TypeScript data modules under [`tests/e2e/data/`](file:///c:/Users/Admin/Downloads/logikchain/logikchain.com/tests/e2e/data/):

| Tier & Domain | Dedicated Test Data File | Primary Source Datastore & Microservice |
|---|---|---|
| **Tier 1: Identity & Personas** | [`tests/e2e/data/tier1-identity.data.ts`](file:///c:/Users/Admin/Downloads/logikchain/logikchain.com/tests/e2e/data/tier1-identity.data.ts) | PostgreSQL `identity_db.user_profiles` (`:4001`) & Firestore `/UserProfiles` |
| **Tier 2: Commerce & Working Capital** | [`tests/e2e/data/tier2-commerce.data.ts`](file:///c:/Users/Admin/Downloads/logikchain/logikchain.com/tests/e2e/data/tier2-commerce.data.ts) | PostgreSQL `credit_db`, `orders_db`, `payments_db` (`:4002`, `:4005`, `:4008`) |
| **Tier 3: Field Custody & Payouts** | [`tests/e2e/data/tier3-custody.data.ts`](file:///c:/Users/Admin/Downloads/logikchain/logikchain.com/tests/e2e/data/tier3-custody.data.ts) | PostgreSQL `cash_db.driver_custody_ledgers`, `payouts_db.beneficiaries` (`:4006`, `:4007`) |
| **Tier 4: General Ledger & TPAP AML** | [`tests/e2e/data/tier4-governance.data.ts`](file:///c:/Users/Admin/Downloads/logikchain/logikchain.com/tests/e2e/data/tier4-governance.data.ts) | PostgreSQL `governance_db.tpap_rules`, `ledger_db.journal_accounts`, `finance_db` (`:4009`, `:4011`) |
| **Tier 5: Platform Config & Operations** | [`tests/e2e/data/tier5-platform.data.ts`](file:///c:/Users/Admin/Downloads/logikchain/logikchain.com/tests/e2e/data/tier5-platform.data.ts) | PostgreSQL `geo_db`, `config_db.subscription_plans`, `supplier_db` (`:4010`) |
| **Tier 6: Refunds & Advanced Credit** | [`tests/e2e/data/tier6-refunds-credit.data.ts`](file:///c:/Users/Admin/Downloads/logikchain/logikchain.com/tests/e2e/data/tier6-refunds-credit.data.ts) | PostgreSQL `payments_db.refunds`, `credit_db.credit_agreements` (`:4005`, `:4008`) |

#### Standardized Individual Ingress Hook
In every Playwright test, test data is loaded at runtime via the individual use case hook:
```typescript
import { setupUseCaseTestData } from '../test-data-setup';

test('UC-XX: Use Case Title', async ({ page }) => {
  // Phase 1: Test Data Setup (invokes dedicated loader from tests/e2e/data/*.data.ts)
  const testData = await setupUseCaseTestData(page, 'UC-XX');
  // Access strongly-typed seed values
  const { userId, orderId, amount } = testData.seedValues;
  ...
});
```

---

## 2. Actor Personas

| Actor ID | Persona Role | Description & Primary Capabilities | Client Interface |
|---|---|---|---|
| **`ACT-BUY`** | **Rural Citizen / Consumer Buyer** | Browses local mandi runs, selects village hubs, places prepaid orders, and tracks deliveries. | PWA Mobile Web / `/shop` |
| **`ACT-MER`** | **Kirana Merchant / PUDO Hub** | Manages local inventory, requests wholesale trade credit lines, and completes OTP handovers. | Fullscreen Corridor `/m/gigs` |
| **`ACT-DRV`** | **Transporter / Fleet Driver** | Transports cargo, records CoD collections, passes vehicle departure gates, and turns in cash. | Driver PWA `/d/gigs` |
| **`ACT-SUP`** | **Regional Mill Supplier** | Publishes bulk wholesale inventory, manages credit limits, dispatches cargo, and receives disbursements. | Supplier Portal `/s/*` |
| **`ACT-OPS`** | **Support Operator** | Audits 4-tier geo-hierarchy, acts as proxy for suppliers, validates bulk catalog ingestion, and resolves disputes. | Support Console `/x/*` |
| **`ACT-FIN`** | **Finance & Compliance Officer**| Governs double-entry ledger, audits statutory GST/TDS tax deductions, and reviews 3-way reconciliations. | `/x/config/tax`, `/x/config/tds` |
| **`ACT-SRE`** | **Platform & DevOps Engineer** | Observes 13 microservices, 12 PostgreSQL database pools, and monitors automated E2E test runs. | `/status`, `/status/tests` |

---

## 3. Master Domain Segregation: Business vs. Technical Capability Use Cases

Logikchain organizes its end-to-end specifications and test architecture into two primary architectural domains:

### 2.1 The Two Pillars

| Domain Category | Architectural Focus | Primary Personas | Target Test Suite |
|:---|:---|:---|:---|
| **💼 Part I: Business Use Cases** (24 Use Cases) | Real-world commerce, trade credit, multi-persona user journeys, consignment delivery, cash custody, doorstep verification, dispute resolution, statutory returns, and subscription billing. | Rural Consumer, Kirana Merchant, Fleet Driver, Regional Mill Supplier, Customer Support Manager. | `tests/e2e/pwa/business/` |
| **⚙️ Part II: Technical Capability Use Cases** (18 Use Cases) | System infrastructure, zero-trust RBAC privilege elevation, automated fraud velocity streaming circuit breakers, double-entry zero-sum invariants, Vertex AI bank reconciliation, spatial geo-hierarchies, bulk ETL loaders, operator proxy delegation, and microservices mesh observability. | DevOps / SRE, Security Auditor, System Service Worker, Finance Compliance Officer, Automation Runner. | `tests/e2e/pwa/technical/` |

---

### 2.2 Traceability & Test Suite Mapping Matrix

| Use Case ID | Domain | Title | Actor | Target Spec File |
|:---|:---:|:---|:---|:---|
| `UC-01A` | 💼 **Business** | Rural Citizen / Consumer Buyer Signup & Phone OTP Login | Multiple / Business Personas | `tests/e2e/pwa/business/usecases-identity-business.spec.ts` |
| `UC-01B` | 💼 **Business** | Kirana Merchant Registration, Retail Profiling & Fullscreen Corridor Ingress | Multiple / Business Personas | `tests/e2e/pwa/business/usecases-identity-business.spec.ts` |
| `UC-01C` | 💼 **Business** | Fleet Transporter / Driver Signup, Vehicle Onboarding & Mobile PWA Ingress | Multiple / Business Personas | `tests/e2e/pwa/business/usecases-identity-business.spec.ts` |
| `UC-01D` | 💼 **Business** | Regional Mill Supplier Enterprise Registration, GSTIN Validation & Depot Portal Ingress | Multiple / Business Personas | `tests/e2e/pwa/business/usecases-identity-business.spec.ts` |
| `UC-01H` | 💼 **Business** | Progressive Role Elevation (Buyer to Merchant / Driver) with Operations Desk Verification | Multiple / Business Personas | `tests/e2e/pwa/business/usecases-identity-business.spec.ts` |
| `UC-01I` | 💼 **Business** | Multilingual Regional Dialect Selection (6 Languages) & Voice-Prompt Onboarding | Multiple / Business Personas | `tests/e2e/pwa/business/usecases-identity-business.spec.ts` |
| `UC-01` | 💼 **Business** | Rural Phone OTP Sign-In & Role Bootstrapping (Canonical Suite) | Multiple / Business Personas | `tests/e2e/pwa/business/usecases-identity-business.spec.ts` |
| `UC-02` | 💼 **Business** | Progressive Role Elevation to Kirana Merchant & Fullscreen App Launch (Canonical Suite) | Multiple / Business Personas | `tests/e2e/pwa/business/usecases-identity-business.spec.ts` |
| `UC-03` | 💼 **Business** | User Profile Village Selection & PostgreSQL Persistence (Canonical Suite) | Multiple / Business Personas | `tests/e2e/pwa/business/usecases-identity-business.spec.ts` |
| `UC-04` | 💼 **Business** | Trade Credit 2-Phase Hold & Headroom Circuit Breaker | Multiple / Business Personas | `tests/e2e/pwa/business/usecases-commerce.spec.ts` |
| `UC-05` | 💼 **Business** | Dynamic UPI QR Intent Generation & Webhook Settlement | Multiple / Business Personas | `tests/e2e/pwa/business/usecases-commerce.spec.ts` |
| `UC-06` | 💼 **Business** | End-to-End Order Creation, Vehicle Departure Gate & OTP Handover | Multiple / Business Personas | `tests/e2e/pwa/business/usecases-commerce.spec.ts` |
| `UC-07` | 💼 **Business** | Order Deliverable Verification, Doorstep Rejection & 72-Hour RTO Protocol | Multiple / Business Personas | `tests/e2e/pwa/business/usecases-commerce.spec.ts` |
| `UC-08` | 💼 **Business** | CoD Cash Collection, Custody Tracking & Daily Limit Guard | Multiple / Business Personas | `tests/e2e/pwa/business/usecases-custody-payouts.spec.ts` |
| `UC-09` | 💼 **Business** | End-of-Shift Cash Turn-In & Cryptographic Handover OTP Verification | Multiple / Business Personas | `tests/e2e/pwa/business/usecases-custody-payouts.spec.ts` |
| `UC-10` | 💼 **Business** | Cash Discrepancy & The Payout Custody Gate Circuit Breaker | Multiple / Business Personas | `tests/e2e/pwa/business/usecases-custody-payouts.spec.ts` |
| `UC-11` | 💼 **Business** | Bank Beneficiary Registration & KMS Account Encryption | Multiple / Business Personas | `tests/e2e/pwa/business/usecases-custody-payouts.spec.ts` |
| `UC-12` | 💼 **Business** | Cloud Tasks Asynchronous IMPS Bank Transfer & UTR Settlement | Multiple / Business Personas | `tests/e2e/pwa/business/usecases-custody-payouts.spec.ts` |
| `UC-13` | 💼 **Business** | Supplier Funds Tracking & Multi-Channel Allocation Governance | Multiple / Business Personas | `tests/e2e/pwa/business/usecases-custody-payouts.spec.ts` |
| `UC-16` | 💼 **Business** | Dispute SLA Tracking, 24-Hour Countdown & Regulatory Reporting | Multiple / Business Personas | `tests/e2e/pwa/business/usecases-governance-business.spec.ts` |
| `UC-20` | 💼 **Business** | Section 194C/194O TDS Deductions, Government Challan Settlement & Ledger Balancing | Multiple / Business Personas | `tests/e2e/pwa/business/usecases-governance-business.spec.ts` |
| `UC-21` | 💼 **Business** | Critical Path Roadmap Golden Path Integration | Multiple / Business Personas | `tests/e2e/pwa/business/usecases-governance-business.spec.ts` |
| `UC-23` | 💼 **Business** | Commercial SaaS Subscription Plans & Tiered Tariffs | Multiple / Business Personas | `tests/e2e/pwa/business/config-subscription-plans.spec.ts` |
| `UC-29` | 💼 **Business** | Automated Payment Refund & GST Credit Note Issuance | Multiple / Business Personas | `tests/e2e/pwa/business/usecases-refunds-credit.spec.ts` |
| `UC-30` | 💼 **Business** | Credit Repayment Settlement, Statement Generation & Post-Due Relief | Multiple / Business Personas | `tests/e2e/pwa/business/usecases-refunds-credit.spec.ts` |
| `UC-31` | 💼 **Business** | Trade Credit Agreement Acceptance, Aging Ledger & Default Lockdown | Multiple / Business Personas | `tests/e2e/pwa/business/usecases-refunds-credit.spec.ts` |
| `UC-01E` | ⚙️ **Technical** | Support Operations Specialist Console Authentication & RBAC Privilege Elevation | SRE / SecOps / System | `tests/e2e/pwa/technical/usecases-identity-technical.spec.ts` |
| `UC-01F` | ⚙️ **Technical** | Finance & Tax Compliance Officer Audit Sign-In, Dual-Control Access & Ledger Security | SRE / SecOps / System | `tests/e2e/pwa/technical/usecases-identity-technical.spec.ts` |
| `UC-01G` | ⚙️ **Technical** | Platform SRE & DevOps Engineer Zero-Trust Sign-In, Telemetry Session & Mesh Observability | SRE / SecOps / System | `tests/e2e/pwa/technical/usecases-identity-technical.spec.ts` |
| `UC-01J` | ⚙️ **Technical** | Federated Google OAuth Alternative Sign-In & Token Bootstrap | SRE / SecOps / System | `tests/e2e/pwa/technical/usecases-identity-technical.spec.ts` |
| `UC-01K` | ⚙️ **Technical** | Inactive / Suspended Account Lockout & Unauthorized Role Circuit Breaker | SRE / SecOps / System | `tests/e2e/pwa/technical/usecases-identity-technical.spec.ts` |
| `UC-14` | ⚙️ **Technical** | UPI TPAP Compliance, VPA Syntax Validation & Blacklist Rejection | SRE / SecOps / System | `tests/e2e/pwa/technical/usecases-governance-technical.spec.ts` |
| `UC-15` | ⚙️ **Technical** | Real-Time AML Fraud Velocity Interception & Account Freeze Gate | SRE / SecOps / System | `tests/e2e/pwa/technical/usecases-governance-technical.spec.ts` |
| `UC-17` | ⚙️ **Technical** | Multi-Role Versioned Clickwrap Policy Consent & Mandatory Re-Consent Gate | SRE / SecOps / System | `tests/e2e/pwa/technical/usecases-governance-technical.spec.ts` |
| `UC-18` | ⚙️ **Technical** | Double-Entry Platform General Ledger & Zero-Sum Invariance Invariant Gate | SRE / SecOps / System | `tests/e2e/pwa/technical/usecases-governance-technical.spec.ts` |
| `UC-19` | ⚙️ **Technical** | Nightly 3-Way Bank Reconciliation & Vertex AI Variance Analysis | SRE / SecOps / System | `tests/e2e/pwa/technical/usecases-governance-technical.spec.ts` |
| `UC-22` | ⚙️ **Technical** | Platform 4-Tier Geo-Hierarchy & Village Registry Management | SRE / SecOps / System | `tests/e2e/pwa/technical/config-geo-hierarchy.spec.ts` |
| `UC-24` | ⚙️ **Technical** | Statutory Commodity Tax Profiles & Regional GST Rates | SRE / SecOps / System | `tests/e2e/pwa/technical/config-geo-hierarchy.spec.ts` |
| `UC-25` | ⚙️ **Technical** | Supplier Bulk Ingestion & Selective Entity Loader | SRE / SecOps / System | `tests/e2e/pwa/technical/support-supplier-bulk-ingest.spec.ts` |
| `UC-26` | ⚙️ **Technical** | Support-as-Supplier Proxy Impersonation & Audit Trail | SRE / SecOps / System | `tests/e2e/pwa/technical/support-supplier-bulk-ingest.spec.ts` |
| `UC-27` | ⚙️ **Technical** | Microservices Mesh Health & Database Isolation Probes | SRE / SecOps / System | `tests/e2e/pwa/technical/status-services.spec.ts` |
| `UC-28` | ⚙️ **Technical** | Live E2E Test Runner, Results Review & Video Playback Console | SRE / SecOps / System | `tests/e2e/pwa/technical/status-services.spec.ts` |

---

## Part I: Business Use Cases (Commercial, Logistics & Value Flows)

The following 24 use cases specify the commercial, logistics, physical handover, financial settlement, and end-user journeys that drive the Logikchain rural supply chain platform. Every usecase is verified with dedicated test data in `tests/e2e/data/` and executed under `tests/e2e/pwa/business/`.

### Tier 1: End-User Onboarding & Identity Journeys
**Epic Scope:** EPIC-01: Multi-Persona Identity & Authentication  
**Automated Test Suite:** `tests/e2e/pwa/business/usecases-identity-business.spec.ts & user-flow-login-role-village.spec.ts`

#### `UC-01A`: Rural Citizen / Consumer Buyer Signup & Phone OTP Login

* **Actor**: `ACT-BUY` (Rural Consumer Buyer)
* **Test Data Specification (Source & Values)**:
  * **Test Data File**: [`tests/e2e/data/tier1-identity.data.ts`](file:///c:/Users/Admin/Downloads/logikchain/logikchain.com/tests/e2e/data/tier1-identity.data.ts)
  * **Datastore Source**: `PostgreSQL identity_db.user_profiles`
  * **Microservice**: `identity-service (:4001)`
  * **Sync Target / Endpoint**: `Cloud Firestore /UserProfiles/{uid}`
  * **Authentication Mechanism**: `10-digit mobile SMS OTP (+91 E.164) & reCAPTCHA Enterprise`
  * **Individual Ingress Hook**: `const testData = await setupUseCaseTestData(page, 'UC-01A');`
  * **Input Keys & Seed Values**:
    ```json
    {
      "userId": "usr_8977848501",
      "phone": "8977848501",
      "countryCode": "+91",
      "otpCode": "123123",
      "fullName": "Ramesh Kumar",
      "villageId": "village_peridepi_523273",
      "villageName": "Peridepi",
      "pincode": "523273",
      "assignedRole": "buyer",
      "sessionStatus": "approved"
    }
    ```
  * **Expected Outcomes**:
    ```json
    {
      "httpStatus": 200,
      "roleClaim": "buyer",
      "landingRoute": "/",
      "villageBadgeDisplay": "Peridepi (523273)",
      "activeBannerText": "Active Session - You are Signed In as Ramesh Kumar"
    }
    ```
* **Feature ID**: `FEAT-01.01`, `FEAT-01.06`
* **Prerequisites**: User has an active mobile device with cellular connectivity capable of receiving SMS messages.
* **Entrypoint Screen**: [`/login`](file:///c:/Users/Admin/Downloads/logikchain/logikchain.com/web/src/apps/shell/screens/AuthScreens.tsx#L183) &rarr; [`/login/verify`](file:///c:/Users/Admin/Downloads/logikchain/logikchain.com/web/src/apps/shell/screens/AuthScreens.tsx#L805)
* **Lifecycle**:
  1. **Phase 1: Test Data Setup (`setupUseCaseTestData`)**:
     - Injects active usecase identifier `UC-01A`.
     - Clears existing session cookies, `lc_session_user`, and `lc_dev_token`.
     - Prepares mock user payload: Phone `8977848501`, country `IN` (`+91`), village `village_peridepi_523273`, OTP `123123`.
  2. **Phase 2: User Sign-In (`performUserSignIn`)**:
     - User navigates to `/login`.
     - Selects country prefix (`+91` India) and enters 10-digit mobile number `8977848501`.
     - Enters optional quick profile intent: Full Name ("Ramesh Kumar"), Postal Pincode ("523273"), and primary role selection ("Consumer / Buyer").
     - Client serializes pre-onboarding intent to `sessionStorage.lc_pending_onboarding`.
     - User clicks "Send Secure Verification Code ➔"; invisible reCAPTCHA Enterprise validates bot-free request.
     - Telephony provider dispatches 6-digit cryptographic SMS OTP; client navigates to `/login/verify`.
     - User inputs 6 individual OTP digits (`1`, `2`, `3`, `1`, `2`, `3`) with auto-advancing focus.
     - Firebase Auth exchanges code for JWT ID token; client calls `identity-service` (`POST /v1/auth/bootstrap`).
     - `identity-service` inserts record into `identity_db.user_profiles` with default claims `{ role: 'buyer', status: 'approved' }`.
  3. **Phase 3: Core Business Flow**:
     - Client inspects returned claims and updates session profile.
     - Reads `sessionStorage.lc_pending_onboarding`, issues `PATCH /v1/users/:uid` to save full name, village, and postal address.
     - Verifies session banner display: "● Active Session - You are Signed In as Ramesh Kumar".
     - Buyer clicks "Open App ➔"; client redirects to Buyer Mandi home screen (`/` or `/home`).
     - Validates upcoming village logistics gigs arriving at Peridepi Hub.
  4. **Phase 4: Explicit User Sign-Out (`performUserSignOut`)**:
     - Buyer taps profile menu (`👤 SHR-07`), navigates to `/login`, and clicks "Sign Out & Switch Account".
     - System executes `signOut(getFirebaseAuth())`, removes `lc_session_user`, `lc_dev_token`, and `lc_test_role`.
     - Verifies clean return to unauthenticated public landing layout.
* **Circuit Breakers & Edge Cases**:
  - *Invalid OTP*: Displays red alert "Invalid verification code. 2 attempts remaining."
  - *Rate Limiting*: 3 consecutive failed OTP attempts triggers 15-minute cooldown timer.
* **Database & Services**: `identity-service` (:4001), API Gateway (:30080), PostgreSQL `identity_db.user_profiles`.
* **Automated Spec**: [`tests/e2e/pwa/user-flow-login-role-village.spec.ts`](file:///c:/Users/Admin/Downloads/logikchain/logikchain.com/tests/e2e/pwa/user-flow-login-role-village.spec.ts)

---

---

#### `UC-01B`: Kirana Merchant Registration, Retail Profiling & Fullscreen Corridor Ingress

* **Actor**: `ACT-MER` (Kirana Retail Merchant)
* **Test Data Specification (Source & Values)**:
  * **Test Data File**: [`tests/e2e/data/tier1-identity.data.ts`](file:///c:/Users/Admin/Downloads/logikchain/logikchain.com/tests/e2e/data/tier1-identity.data.ts)
  * **Datastore Source**: `PostgreSQL identity_db.user_profiles & credit_db.credit_profiles`
  * **Microservice**: `identity-service (:4001) & credit-service (:4008)`
  * **Sync Target / Endpoint**: `Cloud Firestore /UserProfiles/{uid}`
  * **Authentication Mechanism**: `Phone OTP + Role Intent Upgrade + Accreditation Approval`
  * **Individual Ingress Hook**: `const testData = await setupUseCaseTestData(page, 'UC-01B');`
  * **Input Keys & Seed Values**:
    ```json
    {
      "userId": "usr_8977848501",
      "phone": "8977848501",
      "role": "merchant",
      "storeName": "Sri Krishna Kirana Store",
      "villageId": "village_kandukur_523105",
      "targetSupplierId": "sup_ongole_01",
      "creditLineLimit": 100000,
      "corridorRoute": "/m/gigs",
      "devToken": "dev-token:usr_8977848501:merchant"
    }
    ```
  * **Expected Outcomes**:
    ```json
    {
      "fullscreenCorridorActive": true,
      "publicChromeHidden": true,
      "tabCount": 3,
      "tabs": [
        "Wholesale Restock (MER-02)",
        "PUDO Hub Pickups (MER-03)",
        "Trade Credit (MER-09)"
      ],
      "handoverCloseAppRedirect": "/"
    }
    ```
* **Feature ID**: `FEAT-01.01`, `FEAT-01.03`
* **Prerequisites**: Merchant operates a physical retail store in a serviced village corridor and holds a valid phone number.
* **Entrypoint Screen**: [`/login`](file:///c:/Users/Admin/Downloads/logikchain/logikchain.com/web/src/apps/shell/screens/AuthScreens.tsx#L183) &rarr; Fullscreen Corridor [`/m/gigs`](file:///c:/Users/Admin/Downloads/logikchain/logikchain.com/web/src/apps/merchant/MerchantApp.tsx)
* **Lifecycle**:
  1. **Phase 1: Test Data Setup (`setupUseCaseTestData`)**:
     - Seeds merchant profile `usr_8977848501`, business trade name "Sri Krishna Kirana Store", village hub `village_kandukur_523105`, and associated supplier `sup_ongole_01`.
     - Stages dev auth token `dev-token:usr_8977848501:merchant` with custom claim `role: merchant`.
  2. **Phase 2: User Sign-In (`performUserSignIn`)**:
     - Merchant navigates to `/login`.
     - Authenticates via mobile OTP with primary role selected as "Kirana Merchant".
     - Identity service verifies merchant accreditation, binds user profile to `village_kandukur_523105`, and sets Firebase custom claims `{ role: 'merchant', status: 'approved' }`.
     - UI renders active session banner with assigned role badge "Kirana Merchant".
  3. **Phase 3: Core Business Flow**:
     - Merchant clicks "Open App ➔" button; system evaluates `roleHome('merchant')` returning `/m/gigs`.
     - Client launches the dedicated **Fullscreen Merchant Corridor** (`/m/gigs`), hiding standard public chrome, footers, and voice banners.
     - Merchant accesses three dedicated bottom tabs:
       - **Gigs / Wholesale Restock (`MER-02`)**: Browses bulk wholesale catalogs from Sri Lakshmi Agro Depot (`sup_ongole_01`).
       - **PUDO Hub Pickups (`MER-03`)**: Validates 4-digit buyer handover pickup codes for village consumer parcel drops.
       - **Trade Credit Dashboard (`MER-09`)**: Inspects assigned ₹100,000 revolving credit limit, active 15-minute credit holds, and repayment ledger.
     - Merchant taps high-contrast "✕ Close App" handover button in top navigation bar, cleanly returning to public web shell.
  4. **Phase 4: Explicit User Sign-Out (`performUserSignOut`)**:
     - Navigates to account controls, clicks "Sign Out & Switch Account".
     - Clears merchant trade context, purges `localStorage.lc_dev_token`, and verifies redirect to `/login`.
* **Circuit Breakers & Edge Cases**:
  - *Unauthorized Elevation*: Attempting to access `/m/gigs` with a `buyer` token triggers immediate 403 redirect to `/login?unauthorized=true`.
  - *Corridor Session Lock*: Hardware back button is trapped inside the fullscreen corridor to prevent accidental mid-transaction exits.
* **Database & Services**: `identity-service` (:4001), `orders-service` (:4002), `credit-service` (:4008), PostgreSQL `identity_db`, `credit_db`.
* **Automated Spec**: [`tests/e2e/pwa/user-flow-login-role-village.spec.ts`](file:///c:/Users/Admin/Downloads/logikchain/logikchain.com/tests/e2e/pwa/user-flow-login-role-village.spec.ts)

---

---

#### `UC-01C`: Fleet Transporter / Driver Signup, Vehicle Onboarding & Mobile PWA Ingress

* **Actor**: `ACT-DRV` (Fleet Transporter / Route Driver)
* **Test Data Specification (Source & Values)**:
  * **Test Data File**: [`tests/e2e/data/tier1-identity.data.ts`](file:///c:/Users/Admin/Downloads/logikchain/logikchain.com/tests/e2e/data/tier1-identity.data.ts)
  * **Datastore Source**: `PostgreSQL identity_db.transporter_profiles & cash_db.driver_custody_ledgers`
  * **Microservice**: `identity-service (:4001) & fleet-service (:4007)`
  * **Sync Target / Endpoint**: `Cloud Firestore /DriverCustody/{driverId}`
  * **Authentication Mechanism**: `Phone OTP + Driving License + Vehicle Registration Number`
  * **Individual Ingress Hook**: `const testData = await setupUseCaseTestData(page, 'UC-01C');`
  * **Input Keys & Seed Values**:
    ```json
    {
      "driverId": "drv_ongole_01",
      "phone": "9876543211",
      "driverName": "Rural Transporter",
      "role": "vehicle",
      "vehicleNo": "AP-27-TY-4012",
      "vehicleModel": "Tata Ace Electric",
      "capacityKg": 1200,
      "initialCustodyBalance": 0,
      "dailyTransitCeiling": 50000,
      "corridorRoute": "/d/gigs",
      "devToken": "dev-token:drv_ongole_01:driver"
    }
    ```
  * **Expected Outcomes**:
    ```json
    {
      "pwaModeActive": true,
      "outdoorHighContrastTheme": true,
      "assignedRoleDisplay": "Fleet Rider",
      "custodyDisplay": "₹0 / ₹50,000 Transit Ceiling"
    }
    ```
* **Feature ID**: `FEAT-01.01`, `FEAT-01.03`, `FEAT-07.01`
* **Prerequisites**: Transporter holds a valid commercial driver's license and operates a registered transport vehicle (3-wheeler auto or pickup truck).
* **Entrypoint Screen**: [`/login`](file:///c:/Users/Admin/Downloads/logikchain/logikchain.com/web/src/apps/shell/screens/AuthScreens.tsx#L183) &rarr; Fullscreen Driver PWA [`/d/gigs`](file:///c:/Users/Admin/Downloads/logikchain/logikchain.com/web/src/apps/driver/DriverApp.tsx)
* **Lifecycle**:
  1. **Phase 1: Test Data Setup (`setupUseCaseTestData`)**:
     - Seeds driver identifier `drv_ongole_01`, phone `9876543211`, assigned vehicle `AP-27-TY-4012` (Tata Ace, 1.2 Ton), and base depot `sup_ongole_01`.
     - Injects active driver test session `dev-token:drv_ongole_01:driver` and initial cash custody balance of ₹0.
  2. **Phase 2: User Sign-In (`performUserSignIn`)**:
     - Transporter navigates to `/login`.
     - Enters mobile phone number, completes OTP verification, and selects "Fleet Rider / Driver" role.
     - Identity service verifies transporter profile, driving license record, and attaches custom claim `{ role: 'vehicle', status: 'approved' }`.
     - UI renders authenticated session badge showing "Assigned Role: Fleet Rider".
  3. **Phase 3: Core Business Flow**:
     - Driver taps "Open App ➔"; system evaluates `roleHome('vehicle')` returning `/d/gigs`.
     - Screen transitions into high-contrast, outdoor-readable **Driver PWA Corridor** (`/d/gigs`):
       - **Trip Route & Manifest (`DRV-02` / `DRV-03`)**: Reviews assigned Ongole &rarr; Chimakurthy &rarr; Podili corridor run.
       - **Vehicle Departure Gate (`DRV-04`)**: Confirms physical cargo payload checklist and digital waybill before transit clearance.
       - **CoD Cash-in-Hand Monitor (`DRV-10`)**: Displays live custody balance against the ₹50,000 daily transit ceiling.
       - **Earnings & Payouts Console (`DRV-07`)**: Reviews per-stop drop fees and verified instant shift payout balance.
     - Driver verifies GPS telemetry beacon ping and offline-first stop caching.
  4. **Phase 4: Explicit User Sign-Out (`performUserSignOut`)**:
     - Driver completes end-of-shift handover declaration, discharges cash balance, and executes sign-out.
     - System invalidates driver session tokens and resets UI to `/login`.
* **Circuit Breakers & Edge Cases**:
  - *Custody Hold Gate*: If unremitted CoD cash balance is greater than ₹0 at shift end, payout requests are blocked (`403 CASH_CUSTODY_DISCREPANCY_UNRESOLVED`).
  - *Departure Gate Lock*: Transit cannot be started without passing the cargo departure manifest checklist.
* **Database & Services**: `identity-service` (:4001), `gigs-service` (:4003), `cash-service` (:4007), PostgreSQL `identity_db`, `cash_db`.
* **Automated Spec**: [`tests/e2e/pwa/usecases-custody-payouts.spec.ts`](file:///c:/Users/Admin/Downloads/logikchain/logikchain.com/tests/e2e/pwa/usecases-custody-payouts.spec.ts)

---

---

#### `UC-01D`: Regional Mill Supplier Enterprise Registration, GSTIN Validation & Depot Portal Ingress

* **Actor**: `ACT-SUP` (Regional Mill Supplier / Warehouse Manager)
* **Test Data Specification (Source & Values)**:
  * **Test Data File**: [`tests/e2e/data/tier1-identity.data.ts`](file:///c:/Users/Admin/Downloads/logikchain/logikchain.com/tests/e2e/data/tier1-identity.data.ts)
  * **Datastore Source**: `PostgreSQL identity_db.supplier_entities & payouts_db.escrow_funds`
  * **Microservice**: `identity-service (:4001) & payouts-service (:4006)`
  * **Sync Target / Endpoint**: `Cloud Firestore /Suppliers/{supplierId}`
  * **Authentication Mechanism**: `Supplier Admin OTP / Corporate SSO + 15-char State GSTIN Check`
  * **Individual Ingress Hook**: `const testData = await setupUseCaseTestData(page, 'UC-01D');`
  * **Input Keys & Seed Values**:
    ```json
    {
      "targetSupplierId": "sup_ongole_01",
      "orgName": "Sri Lakshmi Agro Milling Corp",
      "gstin": "37AABCS1429B1Z8",
      "role": "supplier",
      "phone": "9876543212",
      "depotHub": "Ongole Central Mandi Depot",
      "escrowSettlementAccount": "ESCROW_SETTLEMENT_01",
      "devToken": "dev-token:sup_ongole_01:supplier"
    }
    ```
  * **Expected Outcomes**:
    ```json
    {
      "httpStatus": 200,
      "portalLanding": "/suppliers",
      "gstinFormatValid": true,
      "fundsSummaryVisible": true
    }
    ```
* **Feature ID**: `FEAT-01.02`, `FEAT-01.05`, `FEAT-10.08`
* **Prerequisites**: Wholesale business entity has an active corporate GSTIN registration, physical mill/depot facility, and commercial bank account.
* **Entrypoint Screen**: `/suppliers` &rarr; [`/s/dashboard`](file:///c:/Users/Admin/Downloads/logikchain/logikchain.com/web/src/apps/supplier/SupplierDashboard.tsx)
* **Lifecycle**:
  1. **Phase 1: Test Data Setup (`setupUseCaseTestData`)**:
     - Seeds enterprise supplier record `sup_ongole_01` ("Sri Lakshmi Agro Milling Corp").
     - Configures valid 15-character GSTIN `37AABCS1429B1Z8` (Andhra Pradesh State Code 37).
     - Injects supplier session token `dev-token:sup_ongole_01:supplier` with claims `{ role: 'supplier', orgId: 'sup_ongole_01' }`.
  2. **Phase 2: User Sign-In (`performUserSignIn`)**:
     - Warehouse manager navigates to `/suppliers` and clicks "Supplier Portal Sign-In".
     - Authenticates via enterprise phone OTP or registered corporate email credentials.
     - System validates organization status in `identity_db.suppliers`, ensuring KYC approval and active subscription tier.
     - Custom claims issued: `{ role: 'supplier', status: 'approved', organizationId: 'sup_ongole_01' }`.
  3. **Phase 3: Core Business Flow**:
     - Manager lands on the responsive desktop/tablet **Supplier Operations Portal** (`/s/dashboard`):
       - **Wholesale Inventory Master (`SUP-06`)**: Reviews milling stock levels (rice, pulses, oil, seeds), batches, and unit packaging.
       - **Corridor Route Dispatcher (`SUP-07` / `SUP-09`)**: Schedules multi-village fleet routes, assigns vehicles, and generates rolling stock pamphlets.
       - **Merchant Credit Underwriting Queue (`SUP-04.2`)**: Evaluates trade credit applications from Kirana merchants, assigns 7/14/30-day terms and credit ceilings.
       - **Driver Cash Turn-In Terminal (`SUP-16`)**: Reconciles incoming CoD cash packets against digital order manifests and issues cryptographic settlement OTPs.
  4. **Phase 4: Explicit User Sign-Out (`performUserSignOut`)**:
     - Manager clicks topbar organization profile avatar, selects "Log Out of Supplier Console".
     - System invalidates corporate JWT token, flushes cached supplier catalog state, and redirects to public supplier landing page.
* **Circuit Breakers & Edge Cases**:
  - *Invalid GSTIN Rejection*: System validates 15-character statutory format regex (`^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$`); malformed strings halt onboarding with `422 INVALID_GSTIN_FORMAT`.
  - *Delinquent Subscription Lockout*: If monthly SaaS platform subscription lapses, warehouse dispatch is frozen (`402 SUBSCRIPTION_PAYMENT_REQUIRED`).
* **Database & Services**: `identity-service` (:4001), `pamphlet-service` (:4004), `orders-service` (:4002), PostgreSQL `identity_db`, `pamphlet_db`.
* **Automated Spec**: [`tests/e2e/pwa/support-supplier-bulk-ingest.spec.ts`](file:///c:/Users/Admin/Downloads/logikchain/logikchain.com/tests/e2e/pwa/support-supplier-bulk-ingest.spec.ts)

---

---

#### `UC-01H`: Progressive Role Elevation (Buyer to Merchant / Driver) with Operations Desk Verification

* **Actors**: `ACT-BUY` (Requesting User), `ACT-OPS` (Operations Approver)
* **Test Data Specification (Source & Values)**:
  * **Test Data File**: [`tests/e2e/data/tier1-identity.data.ts`](file:///c:/Users/Admin/Downloads/logikchain/logikchain.com/tests/e2e/data/tier1-identity.data.ts)
  * **Datastore Source**: `PostgreSQL identity_db.user_profiles & support_db.upgrade_petitions`
  * **Microservice**: `identity-service (:4001) & support-service (:4010)`
  * **Sync Target / Endpoint**: `Cloud Firestore /RoleUpgrades/{ticketId}`
  * **Authentication Mechanism**: `Buyer JWT + Petition Form Submission + Ops Lead Counter-Signature`
  * **Individual Ingress Hook**: `const testData = await setupUseCaseTestData(page, 'UC-01H');`
  * **Input Keys & Seed Values**:
    ```json
    {
      "userId": "usr_8977848501",
      "phone": "8977848501",
      "initialRole": "buyer",
      "requestedRole": "merchant",
      "justificationReason": "Kirana store owner requesting terminal",
      "approvalStatus": "VERIFIED"
    }
    ```
  * **Expected Outcomes**:
    ```json
    {
      "httpStatus": 200,
      "elevatedRoleClaim": "merchant",
      "assignedRoleDisplay": "Kirana Merchant"
    }
    ```
* **Feature ID**: `FEAT-01.03`
* **Prerequisites**: User holds an active authenticated session with standard `buyer` claims.
* **Entrypoint Screen**: [`/login`](file:///c:/Users/Admin/Downloads/logikchain/logikchain.com/web/src/apps/shell/screens/AuthScreens.tsx#L371) (Contact Support Dialog)
* **Lifecycle**:
  1. **Phase 1: Test Data Setup (`setupUseCaseTestData`)**:
     - Authenticates user `usr_8977848501` as `buyer`.
     - Prepares role elevation request payload: Target role `merchant`, reason "Registered kirana store owner in Kandukur requesting merchant terminal privileges".
  2. **Phase 2: User Sign-In (`performUserSignIn`)**:
     - User visits `/login`, confirms active session with assigned role `Consumer / Buyer`.
  3. **Phase 3: Core Business Flow**:
     - User clicks "🎧 Contact Support to Switch Role" accordion button (`data-testid="contact-support-role-btn"`).
     - Form unfolds revealing `Target Role to Switch` dropdown and `Reason for Role Switch` textarea.
     - User selects `Kirana Merchant (🏪 Wholesale sourcing & credit)` and inputs store business justification.
     - Clicks "Submit Role Switch Request ➔" (`data-testid="submit-role-switch-btn"`).
     - Client calls `ops.convertBuyerToRole(user.uid, { targetRole: 'merchant', reason })` &rarr; API Gateway &rarr; `identity-service` (`POST /v1/users/:uid/roles`).
     - `identity-service` validates request, updates `identity_db.user_profiles.role = 'merchant'`, appends audit log, and sets Firebase custom claims `{ role: 'merchant' }`.
     - Client executes `refreshProfile()`; toast confirms: "Role updated to MERCHANT successfully via Support".
     - UI dynamic badge flips to "Assigned Role: Kirana Merchant".
     - User clicks "Open App ➔" and is smoothly routed into `/m/gigs`.
  4. **Phase 4: Explicit User Sign-Out (`performUserSignOut`)**:
     - Closes session and purges upgraded tokens.
* **Circuit Breakers & Edge Cases**:
  - *Duplicate Request Prevention*: Submitting a pending role request while one is in progress returns `409 ROLE_CONVERSION_ALREADY_PENDING`.
* **Database & Services**: `identity-service` (:4001), PostgreSQL `identity_db`.
* **Automated Spec**: [`tests/e2e/pwa/user-flow-login-role-village.spec.ts`](file:///c:/Users/Admin/Downloads/logikchain/logikchain.com/tests/e2e/pwa/user-flow-login-role-village.spec.ts)

---

---

#### `UC-01I`: Multilingual Regional Dialect Selection (6 Languages) & Voice-Prompt Onboarding

* **Actors**: `ACT-BUY` / `ALL` (Rural Citizen & Multi-Role Users)
* **Test Data Specification (Source & Values)**:
  * **Test Data File**: [`tests/e2e/data/tier1-identity.data.ts`](file:///c:/Users/Admin/Downloads/logikchain/logikchain.com/tests/e2e/data/tier1-identity.data.ts)
  * **Datastore Source**: `Client LocalStorage (lc_locale) & Static i18n Translation Catalogs`
  * **Microservice**: `web-pwa client shell`
  * **Sync Target / Endpoint**: `User Local Profile Storage`
  * **Authentication Mechanism**: `Public Client Preference Persistence`
  * **Individual Ingress Hook**: `const testData = await setupUseCaseTestData(page, 'UC-01I');`
  * **Input Keys & Seed Values**:
    ```json
    {
      "supportedLocales": [
        "te",
        "hi",
        "ta",
        "kn",
        "mr",
        "en"
      ],
      "targetLocale": "te",
      "targetLanguageName": "తెలుగు (Telugu)",
      "expectedNavHeading": "భాష",
      "voicePromptAsset": "/audio/te-onboarding-welcome.mp3"
    }
    ```
  * **Expected Outcomes**:
    ```json
    {
      "localStorageSavedKey": "lc_locale",
      "localStorageSavedVal": "te",
      "headingMatchesTelugu": true
    }
    ```
* **Feature ID**: `FEAT-01.01`, `FEAT-10.01`
* **Prerequisites**: Device supports web audio / SpeechSynthesis API.
* **Entrypoint Screen**: [`/language`](file:///c:/Users/Admin/Downloads/logikchain/logikchain.com/web/src/apps/shell/screens/AuthScreens.tsx#L15)
* **Lifecycle**:
  1. **Phase 1: Test Data Setup (`setupUseCaseTestData`)**:
     - Initializes client with default locale `en`.
     - Prepares target language selection: Telugu (`te`, తెలుగు).
  2. **Phase 2: User Sign-In (`performUserSignIn`)**:
     - User accesses `/login`, clicks on top-right dialect pill ("🌐 India • EN ▾").
     - Screen navigates to `/language`.
  3. **Phase 3: Core Business Flow**:
     - User views regional dialect grid featuring 6 supported languages:
       - **Telugu (తెలుగు)**: Primary dialect for Andhra Pradesh & Telangana mandis.
       - **Hindi (हिन्दी)**: Pan-India national dialect.
       - **Kannada (ಕನ್ನಡ)**: Karnataka border corridors.
       - **Tamil (தமிழ்)**: Southern distribution hubs.
       - **Marathi (मराठी)**: Western agrarian trade routes.
       - **English**: Corporate & administrative standard.
     - User clicks "Telugu (తెలుగు)"; UI immediately applies green highlight border and checkmark.
     - System updates i18n context, persists `localStorage.setItem('lc_locale', 'te')`, and updates user profile in `identity_db`.
     - User clicks "← Back to Sign-In"; all form labels, buttons, and voice prompt tooltips dynamically translate into Telugu.
     - User taps speaker icon (`🔊 SHR-11`); system speaks the welcome prompt in synthesized regional Telugu dialect.
  4. **Phase 4: Explicit User Sign-Out (`performUserSignOut`)**:
     - Verifies language preference remains persisted across logout/login cycles.
* **Circuit Breakers & Edge Cases**:
  - *Missing Translation Fallback*: If a specific string key is missing in a regional dialect, system safely cascades to English (`en`) without throwing runtime errors.
* **Database & Services**: Client i18n bundle (`LOCALES`), `identity-service` (:4001), PostgreSQL `identity_db`.
* **Automated Spec**: [`tests/e2e/pwa/user-flow-login-role-village.spec.ts`](file:///c:/Users/Admin/Downloads/logikchain/logikchain.com/tests/e2e/pwa/user-flow-login-role-village.spec.ts)

---

---

#### `UC-01`: Rural Phone OTP Sign-In & Role Bootstrapping (Canonical Suite)

* **Actor**: `ACT-BUY` (Consumer Buyer)
* **Test Data Specification (Source & Values)**:
  * **Test Data File**: [`tests/e2e/data/tier1-identity.data.ts`](file:///c:/Users/Admin/Downloads/logikchain/logikchain.com/tests/e2e/data/tier1-identity.data.ts)
  * **Datastore Source**: `PostgreSQL identity_db.user_profiles`
  * **Microservice**: `identity-service (:4001)`
  * **Sync Target / Endpoint**: `POST /v1/auth/bootstrap`
  * **Authentication Mechanism**: `Standard Role Token`
  * **Individual Ingress Hook**: `const testData = await setupUseCaseTestData(page, 'UC-01');`
  * **Input Keys & Seed Values**:
    ```json
    {
      "userId": "usr_8977848501",
      "phone": "8977848501",
      "otpCode": "123123",
      "villageId": "village_peridepi_523273"
    }
    ```
  * **Expected Outcomes**:
    ```json
    {}
    ```
* **Feature ID**: `FEAT-01.01`
* **Lifecycle**:
  1. **Test Data Setup**: Clears existing sessions, sets active usecase identifier `UC-01`, initializes phone `8977848501` and OTP `123123`.
  2. **User Sign-In**: User visits `/login`, enters phone `8977848501`, requests OTP, inputs `123123`, and validates session creation.
  3. **Core Flow**: Verifies default consumer claims, auth token generation, and renders buyer dashboard greeting.
  4. **User Sign-Out**: Clicks "Sign Out & Switch Account", verifies session token purge, and returns to login prompt.
* **Automated Spec**: [`tests/e2e/pwa/user-flow-login-role-village.spec.ts`](file:///c:/Users/Admin/Downloads/logikchain/logikchain.com/tests/e2e/pwa/user-flow-login-role-village.spec.ts)

---

#### `UC-02`: Progressive Role Elevation to Kirana Merchant & Fullscreen App Launch (Canonical Suite)

* **Actor**: `ACT-MER` (Kirana Merchant)
* **Test Data Specification (Source & Values)**:
  * **Test Data File**: [`tests/e2e/data/tier1-identity.data.ts`](file:///c:/Users/Admin/Downloads/logikchain/logikchain.com/tests/e2e/data/tier1-identity.data.ts)
  * **Datastore Source**: `PostgreSQL identity_db.user_profiles`
  * **Microservice**: `identity-service (:4001)`
  * **Sync Target / Endpoint**: `POST /v1/buyers/:uid/role`
  * **Authentication Mechanism**: `Standard Role Token`
  * **Individual Ingress Hook**: `const testData = await setupUseCaseTestData(page, 'UC-02');`
  * **Input Keys & Seed Values**:
    ```json
    {
      "userId": "usr_8977848501",
      "targetSupplierId": "sup_ongole_01",
      "corridor": "/m/gigs"
    }
    ```
  * **Expected Outcomes**:
    ```json
    {}
    ```
* **Feature ID**: `FEAT-01.03`
* **Lifecycle**:
  1. **Test Data Setup**: Seeds user profile `usr_8977848501` with pending merchant upgrade request and supplier context `sup_ongole_01`.
  2. **User Sign-In**: Authenticates merchant session via active token.
  3. **Core Flow**: Submits role elevation request via Support dialog, switches role to Kirana Merchant, launches fullscreen corridor (`/m/gigs`) hiding public chrome, and uses "✕ Close App" handover button to return to web root.
  4. **User Sign-Out**: Discharges merchant role, clears session tokens, and returns to unauthenticated state.
* **Automated Spec**: [`tests/e2e/pwa/user-flow-login-role-village.spec.ts`](file:///c:/Users/Admin/Downloads/logikchain/logikchain.com/tests/e2e/pwa/user-flow-login-role-village.spec.ts)

---

#### `UC-03`: User Profile Village Selection & PostgreSQL Persistence (Canonical Suite)

* **Actor**: `ACT-BUY` (Consumer Buyer)
* **Test Data Specification (Source & Values)**:
  * **Test Data File**: [`tests/e2e/data/tier1-identity.data.ts`](file:///c:/Users/Admin/Downloads/logikchain/logikchain.com/tests/e2e/data/tier1-identity.data.ts)
  * **Datastore Source**: `PostgreSQL identity_db.user_profiles`
  * **Microservice**: `identity-service (:4001)`
  * **Sync Target / Endpoint**: `PATCH /v1/users/:uid`
  * **Authentication Mechanism**: `Standard Role Token`
  * **Individual Ingress Hook**: `const testData = await setupUseCaseTestData(page, 'UC-03');`
  * **Input Keys & Seed Values**:
    ```json
    {
      "userId": "usr_8977848501",
      "villageId": "village_kandukur_523105"
    }
    ```
  * **Expected Outcomes**:
    ```json
    {}
    ```
* **Feature ID**: `FEAT-01.06`
* **Lifecycle**:
  1. **Test Data Setup**: Stages target village `village_kandukur_523105` and sets mock user state.
  2. **User Sign-In**: Authenticates buyer session.
  3. **Core Flow**: Navigates to `/profile/edit`, selects village `village_kandukur_523105`, saves changes, and verifies atomic PostgreSQL persistence in `identity_db.users` and UI badge updates.
  4. **User Sign-Out**: Explicitly executes sign-out, ensuring no state leakage across tests.
* **Automated Spec**: [`tests/e2e/pwa/user-flow-login-role-village.spec.ts`](file:///c:/Users/Admin/Downloads/logikchain/logikchain.com/tests/e2e/pwa/user-flow-login-role-village.spec.ts)

---

---

### Tier 2: Commerce, Working Capital & Consignment Fulfillment
**Epic Scope:** EPIC-02: Orders & Fulfillment, EPIC-05: Kirana Consignment, EPIC-08: Working Capital & Credit  
**Automated Test Suite:** `tests/e2e/pwa/business/usecases-commerce.spec.ts`

#### `UC-04`: Trade Credit 2-Phase Hold & Headroom Circuit Breaker

* **Actor**: `ACT-MER` (Kirana Merchant)
* **Test Data Specification (Source & Values)**:
  * **Test Data File**: [`tests/e2e/data/tier2-commerce.data.ts`](file:///c:/Users/Admin/Downloads/logikchain/logikchain.com/tests/e2e/data/tier2-commerce.data.ts)
  * **Datastore Source**: `PostgreSQL credit_db.merchant_credit_limits & credit_db.credit_holds`
  * **Microservice**: `credit-service (:4008)`
  * **Sync Target / Endpoint**: `Cloud Firestore /MerchantCreditLimits/{merchantId}`
  * **Authentication Mechanism**: `Bearer dev-token:usr_8977848501:merchant`
  * **Individual Ingress Hook**: `const testData = await setupUseCaseTestData(page, 'UC-04');`
  * **Input Keys & Seed Values**:
    ```json
    {
      "merchantId": "mer_test_04",
      "supplierId": "sup_ongole_01",
      "creditLimit": 50000,
      "riskTier": "LOW",
      "orderId": "ord_crd_04",
      "validHoldAmount": 15000,
      "excessiveHoldAmount": 60000,
      "holdTtlMinutes": 15,
      "authHeader": {
        "Authorization": "Bearer dev-token-support-admin",
        "x-client-platform": "web",
        "x-user-role": "support"
      }
    }
    ```
  * **Expected Outcomes**:
    ```json
    {
      "initialHoldStatus": "PENDING",
      "circuitBreakerHttpStatus": 402,
      "circuitBreakerErrorCode": "INSUFFICIENT_CREDIT_HEADROOM",
      "commitStatus": "COMMITTED",
      "remainingHeadroom": 35000
    }
    ```
* **Feature ID**: `FEAT-08.01`
* **Lifecycle**:
  1. **Test Data Setup**: Sets credit limit ₹100,000, current balance ₹0, hold amount ₹4,500, TTL 15 minutes.
  2. **User Sign-In**: Authenticates merchant credentials.
  3. **Core Flow**: Checks credit headroom via `credit-service` (:4008), places synchronous hold, verifies 15-min TTL, and tests circuit breaker rejection when hold exceeds available credit.
  4. **User Sign-Out**: Clears merchant trade context.
* **Automated Spec**: [`tests/e2e/pwa/usecases-commerce.spec.ts`](file:///c:/Users/Admin/Downloads/logikchain/logikchain.com/tests/e2e/pwa/usecases-commerce.spec.ts)

---

#### `UC-05`: Dynamic UPI QR Intent Generation & Webhook Settlement

* **Actor**: `ACT-MER` (Kirana Merchant)
* **Test Data Specification (Source & Values)**:
  * **Test Data File**: [`tests/e2e/data/tier2-commerce.data.ts`](file:///c:/Users/Admin/Downloads/logikchain/logikchain.com/tests/e2e/data/tier2-commerce.data.ts)
  * **Datastore Source**: `PostgreSQL orders_db.orders & payments_db.payment_intents`
  * **Microservice**: `orders-service (:4002) & payment-service (:4005)`
  * **Sync Target / Endpoint**: `Cloud Firestore /Orders/{orderId}`
  * **Authentication Mechanism**: `Bearer dev-token:usr_8977848501:merchant`
  * **Individual Ingress Hook**: `const testData = await setupUseCaseTestData(page, 'UC-05');`
  * **Input Keys & Seed Values**:
    ```json
    {
      "orderId": "ord_upi_523105",
      "buyerId": "usr_8977848501",
      "supplierId": "sup_ongole_01",
      "orderAmount": 12500,
      "currency": "INR",
      "lineItems": [
        {
          "sku": "rice_sona_masoori_25kg",
          "name": "Sona Masoori Rice 25kg",
          "qty": 10,
          "unitPrice": 1250
        }
      ],
      "gstSplits": {
        "cgst": 0,
        "sgst": 0
      },
      "upiVpaPayee": "logikchain.escrow@icici",
      "gatewayProvider": "RAZORPAY_UPI"
    }
    ```
  * **Expected Outcomes**:
    ```json
    {
      "upiIntentGenerated": true,
      "qrPayloadSigned": true,
      "webhookSettlementStatus": "SUCCESS",
      "orderStateUpdated": "PAID"
    }
    ```
* **Feature ID**: `FEAT-05.01`
* **Lifecycle**:
  1. **Test Data Setup**: Prepares order `ord_upi_523105`, total ₹12,500, currency INR.
  2. **User Sign-In**: Authenticates merchant session.
  3. **Core Flow**: Generates cryptographically signed dynamic UPI QR intent string via `payments-service` (:4005) and processes simulated HMAC-SHA256 PSP webhook callback with idempotent replay protection.
  4. **User Sign-Out**: Closes session.
* **Automated Spec**: [`tests/e2e/pwa/usecases-commerce.spec.ts`](file:///c:/Users/Admin/Downloads/logikchain/logikchain.com/tests/e2e/pwa/usecases-commerce.spec.ts)

---

#### `UC-06`: End-to-End Order Creation, Vehicle Departure Gate & OTP Handover

* **Actors**: `ACT-MER`, `ACT-DRV`
* **Test Data Specification (Source & Values)**:
  * **Test Data File**: [`tests/e2e/data/tier2-commerce.data.ts`](file:///c:/Users/Admin/Downloads/logikchain/logikchain.com/tests/e2e/data/tier2-commerce.data.ts)
  * **Datastore Source**: `PostgreSQL orders_db.shipments & fleet_db.manifests`
  * **Microservice**: `orders-service (:4002) & fleet-service (:4007)`
  * **Sync Target / Endpoint**: `Cloud Firestore /Shipments/{shipmentId}`
  * **Authentication Mechanism**: `Driver Auth + Merchant Cryptographic 4-Digit OTP Handshake`
  * **Individual Ingress Hook**: `const testData = await setupUseCaseTestData(page, 'UC-06');`
  * **Input Keys & Seed Values**:
    ```json
    {
      "orderId": "ord_b2b_kandukur_01",
      "driverId": "drv_kandukur_01",
      "vehicleNo": "AP-27-TY-4012",
      "manifestId": "mnf_ongole_kandukur_01",
      "handoverOtp": "4821",
      "consignmentAmount": 15400,
      "totalWeightKg": 450,
      "maxVehicleCapacityKg": 1200,
      "departureHubId": "hub_ongole_central",
      "destinationHubId": "village_kandukur_523105"
    }
    ```
  * **Expected Outcomes**:
    ```json
    {
      "payloadWithinCapacity": true,
      "departureGateStatus": "CLEARED",
      "otpVerificationStatus": "VERIFIED",
      "shipmentState": "DELIVERED"
    }
    ```
* **Feature ID**: `FEAT-02.01`
* **Lifecycle**:
  1. **Test Data Setup**: Prepares consignment line items, vehicle capacity limits, driver `drv_kandukur_01`, and 6-digit handover OTP.
  2. **User Sign-In**: Authenticates merchant ordering session.
  3. **Core Flow**: Submits order, validates cargo against vehicle capacity, clears vehicle departure gate, performs physical delivery, and validates delivery sign-off via master handover OTP.
  4. **User Sign-Out**: Terminates session.
* **Automated Spec**: [`tests/e2e/pwa/usecases-commerce.spec.ts`](file:///c:/Users/Admin/Downloads/logikchain/logikchain.com/tests/e2e/pwa/usecases-commerce.spec.ts)

---

#### `UC-07`: Order Deliverable Verification, Doorstep Rejection & 72-Hour RTO Protocol

* **Actors**: `ACT-BUY`, `ACT-MER`
* **Test Data Specification (Source & Values)**:
  * **Test Data File**: [`tests/e2e/data/tier2-commerce.data.ts`](file:///c:/Users/Admin/Downloads/logikchain/logikchain.com/tests/e2e/data/tier2-commerce.data.ts)
  * **Datastore Source**: `PostgreSQL orders_db.returns & support_db.disputes`
  * **Microservice**: `orders-service (:4002) & support-service (:4010)`
  * **Sync Target / Endpoint**: `Cloud Firestore /Returns/{returnId}`
  * **Authentication Mechanism**: `Buyer Signature + Driver Incident Verification`
  * **Individual Ingress Hook**: `const testData = await setupUseCaseTestData(page, 'UC-07');`
  * **Input Keys & Seed Values**:
    ```json
    {
      "orderId": "ord_rto_test_01",
      "supplierId": "sup_ongole_01",
      "lineItemId": "item_sugar_50kg_01",
      "rejectedQuantity": 1,
      "returnReason": "DAMAGED_PACKAGING_MOISTURE",
      "retentionHours": 72,
      "nonReturnableSkus": [
        "seeds_tomato_f1"
      ],
      "pudoDropLocation": "hub_ongole_central",
      "refundAction": "RELEASE_HOLD_IMMEDIATE"
    }
    ```
  * **Expected Outcomes**:
    ```json
    {
      "returnTicketCreated": true,
      "rtoScheduleSetHours": 72,
      "buyerHoldReleased": true,
      "consignmentStatus": "RTO_IN_TRANSIT"
    }
    ```
* **Feature ID**: `FEAT-02.04`
* **Lifecycle**:
  1. **Test Data Setup**: Stages returnable SKUs, 72-hour retention policy window, and delivery hub identifiers.
  2. **User Sign-In**: Authenticates buyer session.
  3. **Core Flow**: Audits deliverable standards (`/v1/orders/policies/deliverables`), executes line-item doorstep rejection before OTP signoff, and triggers automated 72-hour PUDO RTO return to supplier.
  4. **User Sign-Out**: Clears buyer session.
* **Automated Spec**: [`tests/e2e/pwa/usecases-commerce.spec.ts`](file:///c:/Users/Admin/Downloads/logikchain/logikchain.com/tests/e2e/pwa/usecases-commerce.spec.ts)

---

---

### Tier 3: Field Custody, Cash Management & Payouts
**Epic Scope:** EPIC-06: Payouts & Disbursements, EPIC-07: Cash Custody & Turn-In  
**Automated Test Suite:** `tests/e2e/pwa/business/usecases-custody-payouts.spec.ts`

#### `UC-08`: CoD Cash Collection, Custody Tracking & Daily Limit Guard

* **Actor**: `ACT-DRV` (Fleet Driver)
* **Test Data Specification (Source & Values)**:
  * **Test Data File**: [`tests/e2e/data/tier3-custody.data.ts`](file:///c:/Users/Admin/Downloads/logikchain/logikchain.com/tests/e2e/data/tier3-custody.data.ts)
  * **Datastore Source**: `PostgreSQL cash_db.driver_custody_ledgers`
  * **Microservice**: `cash-management-service (:4007)`
  * **Sync Target / Endpoint**: `Cloud Firestore /DriverCustody/{driverId}`
  * **Authentication Mechanism**: `Driver Mobile PWA Auth Token`
  * **Individual Ingress Hook**: `const testData = await setupUseCaseTestData(page, 'UC-08');`
  * **Input Keys & Seed Values**:
    ```json
    {
      "driverId": "drv_ongole_01",
      "orderId": "ord_cod_001",
      "initialCustodyBalance": 0,
      "collectionAmount": 14500,
      "dailyCeiling": 50000,
      "exceededCollectionAmount": 40000,
      "currency": "INR"
    }
    ```
  * **Expected Outcomes**:
    ```json
    {
      "initialBalance": 0,
      "postCollectionBalance": 14500,
      "circuitBreakerStatus": 422,
      "circuitBreakerCode": "TRANSIT_LIMIT_EXCEEDED",
      "custodyLocked": false
    }
    ```
* **Feature ID**: `FEAT-07.01`
* **Lifecycle**:
  1. **Test Data Setup**: Initializes driver custody ledger with ₹0 balance and ₹50,000 maximum daily transit ceiling.
  2. **User Sign-In**: Authenticates driver session.
  3. **Core Flow**: Records physical cash collections (`POST /v1/cash/collections`), verifies atomic balance increments, and triggers circuit breaker block when custody exceeds ₹50,000.
  4. **User Sign-Out**: Discharges mobile driver session.
* **Automated Spec**: [`tests/e2e/pwa/usecases-custody-payouts.spec.ts`](file:///c:/Users/Admin/Downloads/logikchain/logikchain.com/tests/e2e/pwa/usecases-custody-payouts.spec.ts)

---

#### `UC-09`: End-of-Shift Cash Turn-In & Cryptographic Handover OTP Verification

* **Actors**: `ACT-DRV`, `ACT-SUP`
* **Test Data Specification (Source & Values)**:
  * **Test Data File**: [`tests/e2e/data/tier3-custody.data.ts`](file:///c:/Users/Admin/Downloads/logikchain/logikchain.com/tests/e2e/data/tier3-custody.data.ts)
  * **Datastore Source**: `PostgreSQL cash_db.turn_in_transactions & depot_safe_ledgers`
  * **Microservice**: `cash-management-service (:4007)`
  * **Sync Target / Endpoint**: `Cloud Firestore /DepotTurnIns/{turnInId}`
  * **Authentication Mechanism**: `Driver Auth + Depot Cashier Counter-Verification OTP`
  * **Individual Ingress Hook**: `const testData = await setupUseCaseTestData(page, 'UC-09');`
  * **Input Keys & Seed Values**:
    ```json
    {
      "driverId": "drv_ongole_01",
      "depotId": "depot_ongole_central",
      "turnInAmount": 25000,
      "turnInOtp": "829104",
      "cashierEmployeeId": "emp_cashier_01",
      "denominations": {
        "d500": 40,
        "d200": 20,
        "d100": 10
      }
    }
    ```
  * **Expected Outcomes**:
    ```json
    {
      "turnInStatus": "CONFIRMED",
      "postTurnInCustodyBalance": 0,
      "depotCashSafeIncremented": 25000,
      "handoverReceiptGenerated": true
    }
    ```
* **Feature ID**: `FEAT-07.02`
* **Lifecycle**:
  1. **Test Data Setup**: Prepares driver custody balance ₹25,000 and cashier terminal ID.
  2. **User Sign-In**: Authenticates driver session.
  3. **Core Flow**: Driver triggers handover declaration, generates 6-digit cryptographic OTP, cashier confirms physical count, and system discharges custody balance to ₹0 with replay prevention.
  4. **User Sign-Out**: Terminates session.
* **Automated Spec**: [`tests/e2e/pwa/usecases-custody-payouts.spec.ts`](file:///c:/Users/Admin/Downloads/logikchain/logikchain.com/tests/e2e/pwa/usecases-custody-payouts.spec.ts)

---

#### `UC-10`: Cash Discrepancy & The Payout Custody Gate Circuit Breaker

* **Actors**: `ACT-SUP`, `ACT-DRV`, `ACT-OPS`
* **Test Data Specification (Source & Values)**:
  * **Test Data File**: [`tests/e2e/data/tier3-custody.data.ts`](file:///c:/Users/Admin/Downloads/logikchain/logikchain.com/tests/e2e/data/tier3-custody.data.ts)
  * **Datastore Source**: `PostgreSQL cash_db.discrepancies & payouts_db.custody_locks`
  * **Microservice**: `cash-management-service (:4007) & payouts-service (:4006)`
  * **Sync Target / Endpoint**: `Cloud Firestore /CustodyLocks/{driverId}`
  * **Authentication Mechanism**: `Driver Auth intercepted by Payout Custody Filter`
  * **Individual Ingress Hook**: `const testData = await setupUseCaseTestData(page, 'UC-10');`
  * **Input Keys & Seed Values**:
    ```json
    {
      "driverId": "drv_ongole_01",
      "expectedTurnInAmount": 14500,
      "actualRemittedAmount": 14300,
      "shortfallAmount": 200,
      "discrepancyReason": "SHORTAGE_COUNT",
      "withdrawalAttemptAmount": 5000
    }
    ```
  * **Expected Outcomes**:
    ```json
    {
      "discrepancyFlagged": true,
      "custodyGateLockActive": true,
      "withdrawalHttpStatus": 422,
      "withdrawalErrorCode": "PAYOUT_CUSTODY_GATE_LOCKED",
      "auditTicketDispatched": true
    }
    ```
* **Feature IDs**: `FEAT-07.03`, `FEAT-06.02`
* **Lifecycle**:
  1. **Test Data Setup**: Stages cash shortfall discrepancy record of ₹1,200.
  2. **User Sign-In**: Authenticates driver session.
  3. **Core Flow**: Logs cash shortage, flags driver custody lock, driver attempts earnings withdrawal, system **halts withdrawal with 403 `CASH_CUSTODY_DISCREPANCY_UNRESOLVED`**, support resolves dispute, and retry succeeds.
  4. **User Sign-Out**: Purges auth tokens.
* **Automated Spec**: [`tests/e2e/pwa/usecases-custody-payouts.spec.ts`](file:///c:/Users/Admin/Downloads/logikchain/logikchain.com/tests/e2e/pwa/usecases-custody-payouts.spec.ts)

---

#### `UC-11`: Bank Beneficiary Registration & KMS Account Encryption

* **Actor**: `ACT-DRV` (Fleet Driver)
* **Test Data Specification (Source & Values)**:
  * **Test Data File**: [`tests/e2e/data/tier3-custody.data.ts`](file:///c:/Users/Admin/Downloads/logikchain/logikchain.com/tests/e2e/data/tier3-custody.data.ts)
  * **Datastore Source**: `PostgreSQL payouts_db.beneficiaries (Google Cloud KMS Envelope Encrypted)`
  * **Microservice**: `payouts-service (:4006)`
  * **Sync Target / Endpoint**: `Cloud Firestore /Beneficiaries/{beneficiaryId}`
  * **Authentication Mechanism**: `Authenticated Transporter Session + KMS Data Encryption Key`
  * **Individual Ingress Hook**: `const testData = await setupUseCaseTestData(page, 'UC-11');`
  * **Input Keys & Seed Values**:
    ```json
    {
      "userId": "drv_ongole_01",
      "beneficiaryName": "Rural Transporter Drv",
      "accountNumberRaw": "50100234567890",
      "maskedAccountNumber": "**********7890",
      "ifscCode": "HDFC0001234",
      "bankName": "HDFC Bank Ltd",
      "kmsKeyRing": "logikchain-keyring",
      "kmsCryptoKey": "payout-accounts-kek",
      "pennyDropVerification": true
    }
    ```
  * **Expected Outcomes**:
    ```json
    {
      "httpStatus": 201,
      "plaintextAccountPersisted": false,
      "ciphertextLengthGtZero": true,
      "maskedDisplayCorrect": true,
      "beneficiaryStatus": "ACTIVE"
    }
    ```
* **Feature ID**: `FEAT-06.01`
* **Lifecycle**:
  1. **Test Data Setup**: Prepares test IFSC `HDFC0001234` and bank account number.
  2. **User Sign-In**: Authenticates driver session.
  3. **Core Flow**: Registers beneficiary bank details, encrypts account number via AES-256-GCM envelope encryption, runs penny-drop validation, and verifies masked PII display (`**********7890`).
  4. **User Sign-Out**: Closes driver session.
* **Automated Spec**: [`tests/e2e/pwa/usecases-custody-payouts.spec.ts`](file:///c:/Users/Admin/Downloads/logikchain/logikchain.com/tests/e2e/pwa/usecases-custody-payouts.spec.ts)

---

#### `UC-12`: Cloud Tasks Asynchronous IMPS Bank Transfer & UTR Settlement

* **Actor**: System / Cloud Tasks Runner
* **Test Data Specification (Source & Values)**:
  * **Test Data File**: [`tests/e2e/data/tier3-custody.data.ts`](file:///c:/Users/Admin/Downloads/logikchain/logikchain.com/tests/e2e/data/tier3-custody.data.ts)
  * **Datastore Source**: `PostgreSQL payouts_db.payout_disbursements & Google Cloud Tasks`
  * **Microservice**: `payouts-service (:4006)`
  * **Sync Target / Endpoint**: `Cloud Firestore /Disbursements/{payoutId}`
  * **Authentication Mechanism**: `Cloud Tasks Service Account OIDC + Internal Gateway Signature`
  * **Individual Ingress Hook**: `const testData = await setupUseCaseTestData(page, 'UC-12');`
  * **Input Keys & Seed Values**:
    ```json
    {
      "payoutId": "pay_disb_012",
      "driverId": "drv_ongole_01",
      "beneficiaryId": "ben_drv_ongole_01",
      "disbursementAmount": 8500,
      "transferChannel": "IMPS",
      "taskQueueName": "payout-disbursement-queue",
      "simulatedUtr": "UTR_BANK_928374102938"
    }
    ```
  * **Expected Outcomes**:
    ```json
    {
      "taskEnqueued": true,
      "bankResponseCode": "ACTC",
      "utrCodeRecorded": "UTR_BANK_928374102938",
      "payoutStatus": "SETTLED"
    }
    ```
* **Feature ID**: `FEAT-06.03`
* **Lifecycle**:
  1. **Test Data Setup**: Stages approved payout request of ₹8,500 with Section 194C 1% TDS deduction.
  2. **User Sign-In**: Authenticates task runner system session.
  3. **Core Flow**: Cloud Tasks worker decrypts bank credentials, calls banking mock gateway, captures immutable banking UTR reference, updates status to `SETTLED`, and writes CDC outbox event.
  4. **User Sign-Out**: Disconnects worker context.
* **Automated Spec**: [`tests/e2e/pwa/usecases-custody-payouts.spec.ts`](file:///c:/Users/Admin/Downloads/logikchain/logikchain.com/tests/e2e/pwa/usecases-custody-payouts.spec.ts)

---

#### `UC-13`: Supplier Funds Tracking & Multi-Channel Allocation Governance

* **Actors**: `ACT-OPS`, `ACT-SUP`
* **Test Data Specification (Source & Values)**:
  * **Test Data File**: [`tests/e2e/data/tier3-custody.data.ts`](file:///c:/Users/Admin/Downloads/logikchain/logikchain.com/tests/e2e/data/tier3-custody.data.ts)
  * **Datastore Source**: `PostgreSQL payouts_db.escrow_funds & ledger_db.journal_accounts`
  * **Microservice**: `payouts-service (:4006) & finance-service (:4009)`
  * **Sync Target / Endpoint**: `Cloud Firestore /SupplierEscrow/{supplierId}`
  * **Authentication Mechanism**: `Support Admin & Finance Controller Authorization`
  * **Individual Ingress Hook**: `const testData = await setupUseCaseTestData(page, 'UC-13');`
  * **Input Keys & Seed Values**:
    ```json
    {
      "targetSupplierId": "sup_ongole_01",
      "grossInflowAmount": 150000,
      "merchantPudoCommissionRate": 0.025,
      "merchantAllocationAmount": 3750,
      "driverDistanceKm": 120,
      "driverRatePerKm": 18,
      "driverAllocationAmount": 2160,
      "netSupplierSettlementAmount": 144090
    }
    ```
  * **Expected Outcomes**:
    ```json
    {
      "escrowGrossInflow": 150000,
      "pudoCommissionAllocated": 3750,
      "driverDistanceCompensated": 2160,
      "escrowFormulaBalanced": true
    }
    ```
* **Feature ID**: `FEAT-06.04`
* **Lifecycle**:
  1. **Test Data Setup**: Prepares supplier escrow balance ₹150,000 with merchant and driver allocations.
  2. **User Sign-In**: Authenticates support operator session.
  3. **Core Flow**: Audits supplier escrow breakdown into PUDO commissions and driver remuneration, verifies **Support Proxy Financial Guardrail (403 block on support role)**, and executes authorized admin disbursement.
  4. **User Sign-Out**: Terminates administrative session.
* **Automated Spec**: [`tests/e2e/pwa/usecases-custody-payouts.spec.ts`](file:///c:/Users/Admin/Downloads/logikchain/logikchain.com/tests/e2e/pwa/usecases-custody-payouts.spec.ts)

---

---

### Tier 4: Statutory Business Operations, Disputes & Tax Withholding
**Epic Scope:** EPIC-09: Financial Reconciliation, EPIC-11: Platform Governance & Disputes  
**Automated Test Suite:** `tests/e2e/pwa/business/usecases-governance-business.spec.ts`

#### `UC-16`: Dispute SLA Tracking, 24-Hour Countdown & Regulatory Reporting

* **Actor**: `ACT-OPS` (Support Dispute Specialist)
* **Test Data Specification (Source & Values)**:
  * **Test Data File**: [`tests/e2e/data/tier4-governance.data.ts`](file:///c:/Users/Admin/Downloads/logikchain/logikchain.com/tests/e2e/data/tier4-governance.data.ts)
  * **Datastore Source**: `PostgreSQL governance_db.disputes & Statutory Reports Cache`
  * **Microservice**: `governance-service (:4011)`
  * **Sync Target / Endpoint**: `Cloud Firestore /Disputes/{disputeId}`
  * **Authentication Mechanism**: `Dispute Management Specialist Credentials`
  * **Individual Ingress Hook**: `const testData = await setupUseCaseTestData(page, 'UC-16');`
  * **Input Keys & Seed Values**:
    ```json
    {
      "disputeId": "disp_npci_101",
      "orderId": "ord_dispute_101",
      "statutorySlaHours": 24,
      "disputeReason": "GOODS_NOT_RECEIVED",
      "chargebackAmount": 3200,
      "regulatoryFramework": "NPCI_UPI_DISPUTE_MANAGEMENT_v1.4",
      "reportExportFormat": "CSV_DAILY_REGULATORY"
    }
    ```
  * **Expected Outcomes**:
    ```json
    {
      "countdownTimerActive": true,
      "slaRemainingHoursLtOrEq": 24,
      "reportHeadersPresent": true,
      "regulatoryAuditRecordCreated": true
    }
    ```
* **Feature ID**: `FEAT-11.03`
* **Lifecycle**:
  1. **Test Data Setup**: Seeds active dispute order with 24-hour countdown window.
  2. **User Sign-In**: Authenticates support specialist session.
  3. **Core Flow**: Tracks dispute SLA progress, flags overdue breaches, and compiles daily statutory compliance export.
  4. **User Sign-Out**: Terminates session.
* **Automated Spec**: [`tests/e2e/pwa/usecases-governance-ledger.spec.ts`](file:///c:/Users/Admin/Downloads/logikchain/logikchain.com/tests/e2e/pwa/usecases-governance-ledger.spec.ts)

---

#### `UC-20`: Section 194C/194O TDS Deductions, Government Challan Settlement & Ledger Balancing

* **Actor**: `ACT-FIN` (Tax Auditor)
* **Test Data Specification (Source & Values)**:
  * **Test Data File**: [`tests/e2e/data/tier4-governance.data.ts`](file:///c:/Users/Admin/Downloads/logikchain/logikchain.com/tests/e2e/data/tier4-governance.data.ts)
  * **Datastore Source**: `PostgreSQL finance_db.tds_withholdings & government_challans`
  * **Microservice**: `finance-service (:4009)`
  * **Sync Target / Endpoint**: `Cloud Firestore /TDSChallans/{challanId}`
  * **Authentication Mechanism**: `Finance & Direct Tax Officer Certified Session`
  * **Individual Ingress Hook**: `const testData = await setupUseCaseTestData(page, 'UC-20');`
  * **Input Keys & Seed Values**:
    ```json
    {
      "disbursementGrossAmount": 50000,
      "tdsSection": "194C",
      "statutoryRate": 0.01,
      "calculatedDeduction": 500,
      "netDisbursement": 49500,
      "challanQuarter": "Q3_2026",
      "challanReference": "CH-2026-Q3-089"
    }
    ```
  * **Expected Outcomes**:
    ```json
    {
      "tdsWithheldCorrectly": 500,
      "netPaidDriver": 49500,
      "challanLiabilityIncremented": 500,
      "taxLedgerBalanced": true
    }
    ```
* **Feature ID**: `FEAT-09.03`
* **Lifecycle**:
  1. **Test Data Setup**: Prepares gross payout and turnover amounts for Section 194C (1% driver) and 194O (1% e-commerce).
  2. **User Sign-In**: Authenticates tax auditor session.
  3. **Core Flow**: Calculates statutory TDS deductions, posts to statutory withholding ledgers, and logs quarterly government challan payment settlement.
  4. **User Sign-Out**: Terminates session.
* **Automated Spec**: [`tests/e2e/pwa/usecases-governance-ledger.spec.ts`](file:///c:/Users/Admin/Downloads/logikchain/logikchain.com/tests/e2e/pwa/usecases-governance-ledger.spec.ts)

---

#### `UC-21`: Critical Path Roadmap Golden Path Integration

* **Actor**: Platform System / Lead Engineer
* **Test Data Specification (Source & Values)**:
  * **Test Data File**: [`tests/e2e/data/tier4-governance.data.ts`](file:///c:/Users/Admin/Downloads/logikchain/logikchain.com/tests/e2e/data/tier4-governance.data.ts)
  * **Datastore Source**: `Full Distributed Cluster (12 PostgreSQL DBs + Redis + Cloud Storage)`
  * **Microservice**: `API Gateway (:30080) & All 13 Microservices`
  * **Sync Target / Endpoint**: `Global System State`
  * **Authentication Mechanism**: `Platform Golden Path Test Suite Executor`
  * **Individual Ingress Hook**: `const testData = await setupUseCaseTestData(page, 'UC-21');`
  * **Input Keys & Seed Values**:
    ```json
    {
      "stagesVerified": [
        1,
        2,
        3,
        4,
        5,
        6,
        7,
        8,
        9,
        10
      ],
      "roadmapMilestone": "STAGE_10_GOLDEN_PATH_COMPLETE",
      "totalMicroservicesRequired": 13,
      "totalDatabasesRequired": 12
    }
    ```
  * **Expected Outcomes**:
    ```json
    {
      "allTiersPassed": true,
      "clusterMeshHealthy": true,
      "zeroRegressions": true
    }
    ```
* **Feature ID**: `FEAT-12.01`
* **Lifecycle**:
  1. **Test Data Setup**: Verifies readiness across all 6 architecture roadmap stages.
  2. **User Sign-In**: Authenticates system lead session.
  3. **Core Flow**: Verifies end-to-end golden path pipeline across all 6 architectural tiers.
  4. **User Sign-Out**: Terminates session.
* **Automated Spec**: [`tests/e2e/pwa/usecases-governance-ledger.spec.ts`](file:///c:/Users/Admin/Downloads/logikchain/logikchain.com/tests/e2e/pwa/usecases-governance-ledger.spec.ts)

---

---

### Tier 5: Commercial SaaS Subscription Plans & Tariffs
**Epic Scope:** EPIC-10: Master Configuration & SaaS Tariffs  
**Automated Test Suite:** `tests/e2e/pwa/business/config-subscription-plans.spec.ts`

#### `UC-23`: Commercial SaaS Subscription Plans & Tiered Tariffs

* **Actor**: `ACT-OPS` (Support Operator)
* **Test Data Specification (Source & Values)**:
  * **Test Data File**: [`tests/e2e/data/tier5-platform.data.ts`](file:///c:/Users/Admin/Downloads/logikchain/logikchain.com/tests/e2e/data/tier5-platform.data.ts)
  * **Datastore Source**: `PostgreSQL config_db.subscription_plans & config_db.platform_tariffs`
  * **Microservice**: `support-service (:4010)`
  * **Sync Target / Endpoint**: `Cloud Firestore /SubscriptionPlans`
  * **Authentication Mechanism**: `Commercial Operations Lead Session`
  * **Individual Ingress Hook**: `const testData = await setupUseCaseTestData(page, 'UC-23');`
  * **Input Keys & Seed Values**:
    ```json
    {
      "planTiers": [
        {
          "id": "plan_silver",
          "name": "Silver",
          "monthlyPrice": 499,
          "orderQuota": 100,
          "creditThreshold": 25000
        },
        {
          "id": "plan_gold",
          "name": "Gold",
          "monthlyPrice": 999,
          "orderQuota": 500,
          "creditThreshold": 100000
        },
        {
          "id": "plan_platinum",
          "name": "Platinum",
          "monthlyPrice": 2499,
          "orderQuota": 999999,
          "creditThreshold": 500000
        }
      ],
      "platformTakeRate": 0.015,
      "logisticsPerKmTariff": 12.5
    }
    ```
  * **Expected Outcomes**:
    ```json
    {
      "plansLoadedCount": 3,
      "goldCreditThreshold": 100000,
      "tariffsAuditPassed": true
    }
    ```
* **Feature ID**: `FEAT-10.02`
* **Lifecycle**:
  1. **Test Data Setup**: Stages subscription tiers (Silver, Gold, Platinum) and platform tariffs.
  2. **User Sign-In**: Authenticates support operator session.
  3. **Core Flow**: Audits subscription plans at `/x/config/plans`, reviews monthly GMV ceilings, and audits platform tariff controls at `/x/config/tariffs`.
  4. **User Sign-Out**: Executes explicit sign-out and purges tokens.
* **Automated Spec**: [`tests/e2e/pwa/config-subscription-plans.spec.ts`](file:///c:/Users/Admin/Downloads/logikchain/logikchain.com/tests/e2e/pwa/config-subscription-plans.spec.ts)

---

### Tier 7: Automated Returns, Credit Repayments & Revolving Terms Governance
**Epic Scope:** EPIC-05: Returns & Credit Notes, EPIC-08: Credit Repayment Ledger  
**Automated Test Suite:** `tests/e2e/pwa/business/usecases-refunds-credit.spec.ts`

#### `UC-29`: Automated Payment Refund & GST Credit Note Issuance

* **Actor**: `ACT-OPS`
* **Test Data Specification (Source & Values)**:
  * **Test Data File**: [`tests/e2e/data/tier6-refunds-credit.data.ts`](file:///c:/Users/Admin/Downloads/logikchain/logikchain.com/tests/e2e/data/tier6-refunds-credit.data.ts)
  * **Datastore Source**: `PostgreSQL payments_db.refunds & finance_db.credit_notes`
  * **Microservice**: `payment-service (:4005) & finance-service (:4009)`
  * **Sync Target / Endpoint**: `Cloud Firestore /Refunds/{refundId}`
  * **Authentication Mechanism**: `Support / Financial Mutation Authorized Token`
  * **Individual Ingress Hook**: `const testData = await setupUseCaseTestData(page, 'UC-29');`
  * **Input Keys & Seed Values**:
    ```json
    {
      "orderId": "ord_cancelled_8812",
      "refundAmount": 1450,
      "cancellationReason": "ORDER_CANCELLED_BY_CUSTOMER",
      "creditNoteFormat": "CN-2026-004812",
      "originalPaymentMode": "UPI"
    }
    ```
  * **Expected Outcomes**:
    ```json
    {
      "refundInitiated": true,
      "creditNoteGenerated": true,
      "ledgerRefundBalanced": true
    }
    ```
* **Feature ID**: `FEAT-05.03`
* **Automated Spec**: [`tests/e2e/pwa/usecases-refunds-credit.spec.ts`](file:///c:/Users/Admin/Downloads/logikchain/logikchain.com/tests/e2e/pwa/usecases-refunds-credit.spec.ts)

---

---

#### `UC-30`: Credit Repayment Settlement, Statement Generation & Post-Due Relief

* **Actor**: `ACT-MER`
* **Test Data Specification (Source & Values)**:
  * **Test Data File**: [`tests/e2e/data/tier6-refunds-credit.data.ts`](file:///c:/Users/Admin/Downloads/logikchain/logikchain.com/tests/e2e/data/tier6-refunds-credit.data.ts)
  * **Datastore Source**: `PostgreSQL credit_db.repayments & credit_db.statements`
  * **Microservice**: `credit-service (:4008)`
  * **Sync Target / Endpoint**: `Cloud Firestore /CreditStatements/{merchantId}`
  * **Authentication Mechanism**: `Kirana Merchant Token`
  * **Individual Ingress Hook**: `const testData = await setupUseCaseTestData(page, 'UC-30');`
  * **Input Keys & Seed Values**:
    ```json
    {
      "merchantId": "mer_rural_01",
      "supplierId": "sup_ongole_01",
      "repaymentAmount": 5000,
      "repaymentChannel": "UPI",
      "reliefExtensionDays": 14
    }
    ```
  * **Expected Outcomes**:
    ```json
    {
      "creditLimitRestored": true,
      "statementGenerated": true,
      "overdueFlagCleared": true
    }
    ```
* **Feature ID**: `FEAT-08.03`
* **Automated Spec**: [`tests/e2e/pwa/usecases-refunds-credit.spec.ts`](file:///c:/Users/Admin/Downloads/logikchain/logikchain.com/tests/e2e/pwa/usecases-refunds-credit.spec.ts)

---

---

#### `UC-31`: Trade Credit Agreement Acceptance, Aging Ledger & Default Lockdown

* **Actor**: `ACT-MER`
* **Test Data Specification (Source & Values)**:
  * **Test Data File**: [`tests/e2e/data/tier6-refunds-credit.data.ts`](file:///c:/Users/Admin/Downloads/logikchain/logikchain.com/tests/e2e/data/tier6-refunds-credit.data.ts)
  * **Datastore Source**: `PostgreSQL credit_db.credit_agreements & aging_ledgers`
  * **Microservice**: `credit-service (:4008)`
  * **Sync Target / Endpoint**: `Cloud Firestore /CreditAgreements/{merchantId}`
  * **Authentication Mechanism**: `Kirana Merchant Digital Consent Signature`
  * **Individual Ingress Hook**: `const testData = await setupUseCaseTestData(page, 'UC-31');`
  * **Input Keys & Seed Values**:
    ```json
    {
      "merchantId": "mer_rural_01",
      "supplierId": "sup_ongole_01",
      "agreementTermsVersion": "v2.1",
      "revolvingCycleDays": 14,
      "agingBuckets": [
        "CURRENT",
        "1_30_DAYS",
        "31_60_DAYS",
        "60_PLUS_DEFAULT"
      ],
      "defaultLockdownReason": "EXCEEDED_MAX_OVERDUE_WINDOW"
    }
    ```
  * **Expected Outcomes**:
    ```json
    {
      "agreementSigned": true,
      "agingBucketMapped": true,
      "defaultLockdownEnforcedOnOverdue": true
    }
    ```
* **Feature ID**: `FEAT-08.04`
* **Automated Spec**: [`tests/e2e/pwa/usecases-refunds-credit.spec.ts`](file:///c:/Users/Admin/Downloads/logikchain/logikchain.com/tests/e2e/pwa/usecases-refunds-credit.spec.ts)

---

## Part II: Technical Capability Use Cases (Architecture, Security & Governance)

The following 18 use cases validate system invariants, zero-trust security postures, streaming fraud circuit breakers, double-entry general ledger balance rules, automated Vertex AI variance analysis, spatial master data engines, and cluster telemetry. Every capability is verified with dedicated test data in `tests/e2e/data/` and executed under `tests/e2e/pwa/technical/`.

### Tier 1: Platform Infrastructure, Zero-Trust Access & Operator RBAC
**Epic Scope:** EPIC-01: Zero-Trust Security, Operator RBAC, OpenID Federation  
**Automated Test Suite:** `tests/e2e/pwa/technical/usecases-identity-technical.spec.ts`

#### `UC-01E`: Support Operations Specialist Console Authentication & RBAC Privilege Elevation

* **Actor**: `ACT-OPS` (Operations & Support Specialist)
* **Test Data Specification (Source & Values)**:
  * **Test Data File**: [`tests/e2e/data/tier1-identity.data.ts`](file:///c:/Users/Admin/Downloads/logikchain/logikchain.com/tests/e2e/data/tier1-identity.data.ts)
  * **Datastore Source**: `PostgreSQL identity_db.operator_rbac & support_db.audit_logs`
  * **Microservice**: `identity-service (:4001) & support-service (:4010)`
  * **Sync Target / Endpoint**: `Cloud Firestore /OperatorSessions/{operatorId}`
  * **Authentication Mechanism**: `Zero-Trust Dual Context Headers (x-user-role: support, x-client-platform: web)`
  * **Individual Ingress Hook**: `const testData = await setupUseCaseTestData(page, 'UC-01E');`
  * **Input Keys & Seed Values**:
    ```json
    {
      "userId": "test_operator_01",
      "role": "support",
      "rbacLevel": "TIER_2_OPERATIONS_LEAD",
      "authorizedConsoles": [
        "/x/ops",
        "/x/config",
        "/x/support"
      ],
      "devToken": "dev-token:test_operator_01:support",
      "proxyContextSupplier": "sup_ongole_01"
    }
    ```
  * **Expected Outcomes**:
    ```json
    {
      "topbarVisible": true,
      "topbarTitle": "Operations & Triage Console",
      "financialMutationBlocked": true
    }
    ```
* **Feature ID**: `FEAT-01.05`, `FEAT-10.04`
* **Prerequisites**: Support operator possesses corporate SSO or administrative developer credentials with designated operations role.
* **Entrypoint Screen**: [`/login`](file:///c:/Users/Admin/Downloads/logikchain/logikchain.com/web/src/apps/shell/screens/AuthScreens.tsx#L183) &rarr; [`/x/ops`](file:///c:/Users/Admin/Downloads/logikchain/logikchain.com/web/src/apps/support/SupportApp.tsx)
* **Lifecycle**:
  1. **Phase 1: Test Data Setup (`setupUseCaseTestData`)**:
     - Seeds operator identity `test_operator_01` ("Central Desk Specialist").
     - Configures role claim `support` and injects session token `dev-token:test_operator_01:support`.
     - Injects authorized supplier proxy targets (`sup_ongole_01`, `sup_krishna_01`).
  2. **Phase 2: User Sign-In (`performUserSignIn`)**:
     - Operator navigates directly to `/x/ops` or authenticates via `/login` with support credentials.
     - Gateway and Identity service verify operator claims: `user.role === 'support'`.
     - UI loads the specialized **1024px Two-Pane Operations Console** (`SPT-18`), verifying visible support topbar (`header.spt-topbar`).
  3. **Phase 3: Core Business Flow**:
     - Operator navigates across core support workspaces:
       - **Operations Dashboard (`SPT-01`)**: Triages suspended orders, delivery exceptions, and village hub route petitions.
       - **Master Geo-Hierarchy Registry (`SPT-05` / `/x/config/villages`)**: Manages Country, State, District, Village, and PUDO Hub records.
       - **Support-as-Supplier Proxy Delegation (`SPT-01.P`)**: Selects `sup_ongole_01` from the topbar proxy dropdown to assist rural mill owners with catalog editing.
       - **Universal Search & Audit Trail (`SPT-15`)**: Inspects immutable transaction trails with dual audit headers (`X-Actor-ID: test_operator_01`, `X-On-Behalf-Of: sup_ongole_01`).
     - System enforces the **Financial Mutation Proxy Lockout Gate**: Any attempt by support to execute bank payouts or balance releases is immediately rejected with HTTP 403 `FINANCIAL_MUTATION_PROXY_BLOCKED`.
  4. **Phase 4: Explicit User Sign-Out (`performUserSignOut`)**:
     - Operator clicks "Sign out" button in topbar header, confirms modal dialog.
     - System flushes `lc_support_supplier_context`, `lc_test_role`, and session tokens, returning cleanly to public root.
* **Circuit Breakers & Edge Cases**:
  - *Non-Support Access Block*: Normal buyers or merchants attempting to enter `/x/*` are caught by route guards and deflected to `/unauthorized`.
  - *Proxy Scope Enforcement*: Proxy mutations are strictly logged with immutable caller attribution in `identity_db.audit_logs`.
* **Database & Services**: `identity-service` (:4001), `config-service` (:4010), API Gateway (:30080), PostgreSQL `identity_db`, `config_db`.
* **Automated Spec**: [`tests/e2e/pwa/support-supplier-proxy.spec.ts`](file:///c:/Users/Admin/Downloads/logikchain/logikchain.com/tests/e2e/pwa/support-supplier-proxy.spec.ts), [`tests/e2e/pwa/config-geo-hierarchy.spec.ts`](file:///c:/Users/Admin/Downloads/logikchain/logikchain.com/tests/e2e/pwa/config-geo-hierarchy.spec.ts)

---

---

#### `UC-01F`: Finance & Tax Compliance Officer Audit Sign-In, Dual-Control Access & Ledger Security

* **Actor**: `ACT-FIN` (Finance Controller & Tax Compliance Officer)
* **Test Data Specification (Source & Values)**:
  * **Test Data File**: [`tests/e2e/data/tier1-identity.data.ts`](file:///c:/Users/Admin/Downloads/logikchain/logikchain.com/tests/e2e/data/tier1-identity.data.ts)
  * **Datastore Source**: `PostgreSQL ledger_db.journal_accounts & finance_db.balance_sheets`
  * **Microservice**: `finance-service (:4009)`
  * **Sync Target / Endpoint**: `Cloud Firestore /AuditLogs/{auditId}`
  * **Authentication Mechanism**: `Certified Auditor Credentials + Compliance Header Assertion`
  * **Individual Ingress Hook**: `const testData = await setupUseCaseTestData(page, 'UC-01F');`
  * **Input Keys & Seed Values**:
    ```json
    {
      "userId": "test_finance_01",
      "role": "finance",
      "complianceOfficer": true,
      "auditRoutes": [
        "/x/config/tax",
        "/x/config/tds"
      ],
      "balanceSheetEndpoint": "/v1/finance/reports",
      "devToken": "dev-token:test_finance_01:finance"
    }
    ```
  * **Expected Outcomes**:
    ```json
    {
      "httpStatus": 200,
      "reportType": "BALANCE_SHEET",
      "zeroSumInvariantVerified": true
    }
    ```
* **Feature ID**: `FEAT-09.01`, `FEAT-09.03`, `FEAT-10.03`, `FEAT-11.01`
* **Prerequisites**: Officer is authorized with statutory financial governance credentials, multi-factor authentication, and compliance claims.
* **Entrypoint Screen**: `/login` &rarr; `/x/config/tax` & `/x/config/tds`
* **Lifecycle**:
  1. **Phase 1: Test Data Setup (`setupUseCaseTestData`)**:
     - Seeds compliance officer identity `test_finance_01` ("Chief Compliance Auditor").
     - Configures role claims `{ role: 'support', complianceOfficer: true }` and token `dev-token:test_finance_01:support`.
     - Stages double-entry platform general ledger accounts (`1010-CASH`, `2010-ESCROW`, `4010-REVENUE`, `2110-TDS-194C`).
  2. **Phase 2: User Sign-In (`performUserSignIn`)**:
     - Officer authenticates via secure login; system validates statutory compliance role credentials.
     - Custom claims verified for financial ledger inspection and tax configuration authority.
     - Screen navigates to the Financial Governance Console.
  3. **Phase 3: Core Business Flow**:
     - Officer audits statutory and regulatory configurations:
       - **Commodity GST Tax Profiles (`/x/config/tax`)**: Audits 3-tier GST splits (0% essential grains, 5% pulses, 18% consumer goods).
       - **Statutory Withholding Rules (`/x/config/tds`)**: Audits Section 194C (1% driver contractor payout withholding) and Section 194O (1% e-commerce operator turnover withholding).
       - **Double-Entry General Ledger Invariance Gate (`UC-18`)**: Verifies mathematical zero-sum balance where $\sum \text{Debits} - \sum \text{Credits} = 0$, rejecting any unbalanced posting.
       - **Nightly 3-Way Bank Reconciliation (`UC-19`)**: Inspects automated matching across internal ledgers, banking statement lines, and PSP gateway logs.
       - **UPI TPAP VPA Validation & Blacklist Audit (`UC-14`)**: Inspects NPCI blacklist filters preventing fraudulent VPAs.
  4. **Phase 4: Explicit User Sign-Out (`performUserSignOut`)**:
     - Officer locks audit session, clicks "Sign Out", confirms administrative session termination.
     - System cleanses local storage security tokens and redirects to public screen.
* **Circuit Breakers & Edge Cases**:
  - *Zero-Sum Invariance Invariant*: Any financial mutation resulting in a non-zero ledger variance is stopped at the database trigger level with `500 GENERAL_LEDGER_VARIANCE_NON_ZERO`.
  - *Dual-Control Enforcement*: TDS rate adjustments require secondary approval before applying to live transactions.
* **Database & Services**: `finance-service` (:4009), `governance-service` (:4011), `config-service` (:4010), PostgreSQL `finance_db`, `governance_db`.
* **Automated Spec**: [`tests/e2e/pwa/usecases-governance-ledger.spec.ts`](file:///c:/Users/Admin/Downloads/logikchain/logikchain.com/tests/e2e/pwa/usecases-governance-ledger.spec.ts), [`tests/e2e/pwa/config-tax-profiles.spec.ts`](file:///c:/Users/Admin/Downloads/logikchain/logikchain.com/tests/e2e/pwa/config-tax-profiles.spec.ts)

---

---

#### `UC-01G`: Platform SRE & DevOps Engineer Zero-Trust Sign-In, Telemetry Session & Mesh Observability

* **Actor**: `ACT-SRE` (Platform / SRE & Infrastructure Engineer)
* **Test Data Specification (Source & Values)**:
  * **Test Data File**: [`tests/e2e/data/tier1-identity.data.ts`](file:///c:/Users/Admin/Downloads/logikchain/logikchain.com/tests/e2e/data/tier1-identity.data.ts)
  * **Datastore Source**: `PostgreSQL telemetry_db & Kubernetes Cluster Mesh Probes`
  * **Microservice**: `api-gateway (:30080)`
  * **Sync Target / Endpoint**: `Prometheus / Cloud Monitoring Metrics`
  * **Authentication Mechanism**: `SRE Zero-Trust Bearer Token + Mutual Gateway Handshake`
  * **Individual Ingress Hook**: `const testData = await setupUseCaseTestData(page, 'UC-01G');`
  * **Input Keys & Seed Values**:
    ```json
    {
      "userId": "test_sre_01",
      "role": "sre",
      "expectedMicroservicesCount": 13,
      "expectedDatabasePoolsCount": 12,
      "observabilityRoutes": [
        "/status",
        "/status/tests"
      ],
      "devToken": "dev-token:test_sre_01:sre_admin"
    }
    ```
  * **Expected Outcomes**:
    ```json
    {
      "httpStatus": 200,
      "activeServicesDiscovered": 13,
      "healthyPoolsCount": 12,
      "telemetryConnected": true
    }
    ```
* **Feature ID**: `FEAT-12.01`, `FEAT-12.02`
* **Prerequisites**: Infrastructure engineer possesses SRE operational claims and access to the private Kubernetes cluster perimeter.
* **Entrypoint Screen**: [`/status`](file:///c:/Users/Admin/Downloads/logikchain/logikchain.com/web/src/apps/public/PublicStatusScreens.tsx) &rarr; [`/status/tests`](file:///c:/Users/Admin/Downloads/logikchain/logikchain.com/web/src/apps/public/PublicStatusScreens.tsx)
* **Lifecycle**:
  1. **Phase 1: Test Data Setup (`setupUseCaseTestData`)**:
     - Stages live probe telemetry endpoints against Kubernetes NodePort API Gateway (`http://localhost:30080/health/services`).
     - Prepares E2E test results metadata and WebM execution video recordings.
     - Injects SRE telemetry session context.
  2. **Phase 2: User Sign-In (`performUserSignIn`)**:
     - SRE accesses the Platform Telemetry & Status portal (`/status`).
     - System verifies zero-trust perimeter connectivity to the Kubernetes cluster mesh.
     - Live connection pulse confirms active session.
  3. **Phase 3: Core Business Flow**:
     - SRE performs deep infrastructure and health audit across two specialized views:
       - **Microservices & Database Isolation Grid (`/status`)**:
         - Probes API Gateway `:30080` (Connected / Online).
         - Validates all 13 microservices reporting HTTP 200 OK (`identity`, `orders`, `gigs`, `pamphlet`, `payments`, `payouts`, `cash`, `credit`, `finance`, `config`, `governance`, `gateway`, `socialConnect`).
         - Validates 12 isolated PostgreSQL database connection pools reporting healthy connections.
         - Clicks "Refresh All Checks" to trigger concurrent live TCP health probes.
       - **Automated Test Runner & Video Inspection (`/status/tests`)**:
         - Inspects metrics cards: Total Use Cases, Passing Tests (100%), Active Test Suites, Recorded Video Artifacts.
         - Clicks "Watch Video" modal button on recorded test suites (`usecases-commerce.webm`, `usecases-custody-payouts.webm`, `usecases-governance-ledger.webm`).
         - Tests video streaming playback controls with speed adjustment (0.5x, 1x, 1.5x, 2x) via HTTP 206 partial content range requests.
         - Opens "View Execution Logs" to inspect step-by-step test assertion output.
  4. **Phase 4: Explicit User Sign-Out (`performUserSignOut`)**:
     - SRE closes telemetry observation session, purges monitoring tokens, and disconnects observer socket.
* **Circuit Breakers & Edge Cases**:
  - *Perimeter Gateway Outage*: If API Gateway drops, page immediately displays full-width amber/red alert with auto-retry exponential backoff.
  - *Database Pool Exhaustion*: If connection pool utilization exceeds 85%, service row flashes warning banner.
* **Database & Services**: All 13 Microservices, API Gateway (:30080), 12 PostgreSQL Databases, Vite Test Runner Plugin (`/recordings/*`).
* **Automated Spec**: [`tests/e2e/pwa/status-services.spec.ts`](file:///c:/Users/Admin/Downloads/logikchain/logikchain.com/tests/e2e/pwa/status-services.spec.ts), [`tests/e2e/pwa/status-test-runner.spec.ts`](file:///c:/Users/Admin/Downloads/logikchain/logikchain.com/tests/e2e/pwa/status-test-runner.spec.ts)

---

---

#### `UC-01J`: Federated Google OAuth Alternative Sign-In & Token Bootstrap

* **Actors**: `ALL` (Mobile & Desktop Users with Google Accounts)
* **Test Data Specification (Source & Values)**:
  * **Test Data File**: [`tests/e2e/data/tier1-identity.data.ts`](file:///c:/Users/Admin/Downloads/logikchain/logikchain.com/tests/e2e/data/tier1-identity.data.ts)
  * **Datastore Source**: `Firebase Authentication OpenID Connect & identity_db.user_profiles`
  * **Microservice**: `identity-service (:4001)`
  * **Sync Target / Endpoint**: `Cloud Firestore /UserProfiles/{uid}`
  * **Authentication Mechanism**: `Google OAuth 2.0 OpenID Connect Federation`
  * **Individual Ingress Hook**: `const testData = await setupUseCaseTestData(page, 'UC-01J');`
  * **Input Keys & Seed Values**:
    ```json
    {
      "userId": "usr_google_oauth_01",
      "email": "buyer.corporate@logikchain.com",
      "provider": "google.com",
      "role": "buyer",
      "displayName": "Enterprise Corporate Buyer"
    }
    ```
  * **Expected Outcomes**:
    ```json
    {
      "jwtClaimProvider": "google.com",
      "sessionCreated": true,
      "emailBoundToProfile": true
    }
    ```
* **Feature ID**: `FEAT-01.01`
* **Prerequisites**: User has an active Google Account and browser allows OAuth popups.
* **Entrypoint Screen**: [`/login`](file:///c:/Users/Admin/Downloads/logikchain/logikchain.com/web/src/apps/shell/screens/AuthScreens.tsx#L760)
* **Lifecycle**:
  1. **Phase 1: Test Data Setup (`setupUseCaseTestData`)**:
     - Prepares simulated Google OAuth response: `displayName: "Kalyan Chakravarthy"`, `email: "kalyan@logikchain.com"`.
  2. **Phase 2: User Sign-In (`performUserSignIn`)**:
     - User visits `/login`, bypasses phone input, and clicks "Continue with Google" branded button.
     - Firebase Auth triggers `signInWithPopup(GoogleAuthProvider)`.
     - User completes Google credential handshake; Firebase returns verified OAuth credential and JWT ID token.
  3. **Phase 3: Core Business Flow**:
     - Client calls `ops.bootstrapUser({ uid, email, displayName })`.
     - `identity-service` checks if user exists in `identity_db.user_profiles`. If new, it creates record with `email`, default role `buyer`, and status `approved`.
     - Custom claims are injected into the session token.
     - Client hydrates session state and routes user to home dashboard.
  4. **Phase 4: Explicit User Sign-Out (`performUserSignOut`)**:
     - User executes logout, revoking both Google and Firebase session credentials.
* **Circuit Breakers & Edge Cases**:
  - *Popup Blocked*: If browser blocks OAuth popup, client provides graceful fallback to redirect-based flow.
* **Database & Services**: Firebase Auth, `identity-service` (:4001), PostgreSQL `identity_db`.
* **Automated Spec**: [`tests/e2e/pwa/user-flow-login-role-village.spec.ts`](file:///c:/Users/Admin/Downloads/logikchain/logikchain.com/tests/e2e/pwa/user-flow-login-role-village.spec.ts)

---

---

#### `UC-01K`: Inactive / Suspended Account Lockout & Unauthorized Role Circuit Breaker

* **Actors**: `ALL` (Suspended or Restricted User Accounts)
* **Test Data Specification (Source & Values)**:
  * **Test Data File**: [`tests/e2e/data/tier1-identity.data.ts`](file:///c:/Users/Admin/Downloads/logikchain/logikchain.com/tests/e2e/data/tier1-identity.data.ts)
  * **Datastore Source**: `PostgreSQL identity_db.user_profiles`
  * **Microservice**: `identity-service (:4001) & api-gateway (:30080)`
  * **Sync Target / Endpoint**: `Cloud Firestore /SecurityLockouts/{uid}`
  * **Authentication Mechanism**: `Gateway App Check & Custom Claims Status Check`
  * **Individual Ingress Hook**: `const testData = await setupUseCaseTestData(page, 'UC-01K');`
  * **Input Keys & Seed Values**:
    ```json
    {
      "userId": "usr_suspended_01",
      "phone": "9876543299",
      "status": "suspended",
      "lockoutReason": "Disputed cash remittance discrepancy and unauthorized access attempts",
      "expectedStatusCode": 403,
      "lockoutRedirectRoute": "/unauthorized"
    }
    ```
  * **Expected Outcomes**:
    ```json
    {
      "httpStatus": 403,
      "errorCode": "ACCOUNT_SUSPENDED",
      "sessionTokenIssued": false
    }
    ```
* **Feature ID**: `FEAT-01.04`
* **Prerequisites**: User account has been administratively flagged with `status: 'suspended'` in `identity_db`.
* **Entrypoint Screen**: `/login` &rarr; [`/unauthorized`](file:///c:/Users/Admin/Downloads/logikchain/logikchain.com/web/src/apps/shell/screens/AuthScreens.tsx#L985)
* **Lifecycle**:
  1. **Phase 1: Test Data Setup (`setupUseCaseTestData`)**:
     - Stages suspended user record `usr_suspended_01` with status `suspended` and suspension reason "Disputed cash discrepancy on Trip #TRP-104".
  2. **Phase 2: User Sign-In (`performUserSignIn`)**:
     - Suspended user attempts phone OTP login or submits authentication token.
     - Identity service verifies user status in `identity_db.user_profiles`.
     - System discovers `status === 'suspended'`; immediately halts authentication pipeline.
  3. **Phase 3: Core Business Flow**:
     - API Gateway rejects token verification with HTTP 403 `ACCOUNT_SUSPENDED`.
     - Client catches 403 response, denies access to all protected workspaces (`/m/*`, `/d/*`, `/s/*`, `/x/*`), and navigates user to `/unauthorized`.
     - Screen renders high-contrast alert: "⚠️ Account Access Suspended".
     - Displays suspension reason and provides one-click "Contact Support Desk" appeal action.
  4. **Phase 4: Explicit User Sign-Out (`performUserSignOut`)**:
     - User clicks "Return to Login", purging any stale partial session tokens.
* **Circuit Breakers & Edge Cases**:
  - *Real-Time Token Revocation*: If an active user is suspended while logged in, the next authenticated API request receives HTTP 403, instantly ejecting them from the corridor to `/unauthorized`.
* **Database & Services**: `identity-service` (:4001), API Gateway (:30080), PostgreSQL `identity_db`.
* **Automated Spec**: [`tests/e2e/pwa/user-flow-login-role-village.spec.ts`](file:///c:/Users/Admin/Downloads/logikchain/logikchain.com/tests/e2e/pwa/user-flow-login-role-village.spec.ts)

---

---

### Tier 4: System Governance Invariant Gates, AML Stream & Ledger Invariance
**Epic Scope:** EPIC-09: Financial General Ledger, EPIC-11: Compliance, AML & Invariant Gates  
**Automated Test Suite:** `tests/e2e/pwa/technical/usecases-governance-technical.spec.ts`

#### `UC-14`: UPI TPAP Compliance, VPA Syntax Validation & Blacklist Rejection

* **Actor**: `ACT-OPS` (Compliance Officer)
* **Test Data Specification (Source & Values)**:
  * **Test Data File**: [`tests/e2e/data/tier4-governance.data.ts`](file:///c:/Users/Admin/Downloads/logikchain/logikchain.com/tests/e2e/data/tier4-governance.data.ts)
  * **Datastore Source**: `PostgreSQL governance_db.tpap_rules & Redis Blacklist Cache`
  * **Microservice**: `governance-service (:4011)`
  * **Sync Target / Endpoint**: `Cloud Firestore /TPAPRules/live`
  * **Authentication Mechanism**: `Compliance Officer / Payment System Header`
  * **Individual Ingress Hook**: `const testData = await setupUseCaseTestData(page, 'UC-14');`
  * **Input Keys & Seed Values**:
    ```json
    {
      "validVpa": "merchant.ongole@icici",
      "invalidCharactersVpa": "bad_vpa$$@bank",
      "blacklistedVpa": "fraudster@upi",
      "sanctionedBankHandles": [
        "@icici",
        "@axisbank",
        "@sbi",
        "@okhdfcbank"
      ],
      "maxVpaLength": 50,
      "vpaRegex": "^[a-zA-Z0-9.-]+@[a-zA-Z0-9]+$"
    }
    ```
  * **Expected Outcomes**:
    ```json
    {
      "validVpaAccepted": true,
      "invalidSyntaxHttpStatus": 400,
      "invalidSyntaxErrorCode": "INVALID_VPA_SYNTAX",
      "blacklistHttpStatus": 400,
      "blacklistErrorCode": "BLACKLISTED_VPA_HANDLE"
    }
    ```
* **Feature ID**: `FEAT-11.01`
* **Lifecycle**:
  1. **Test Data Setup**: Prepares valid and blacklisted VPA formats.
  2. **User Sign-In**: Authenticates compliance officer session.
  3. **Core Flow**: Validates NPCI TPAP guidelines, tests regex syntax validation, and rejects blacklisted handles.
  4. **User Sign-Out**: Terminates session.
* **Automated Spec**: [`tests/e2e/pwa/usecases-governance-ledger.spec.ts`](file:///c:/Users/Admin/Downloads/logikchain/logikchain.com/tests/e2e/pwa/usecases-governance-ledger.spec.ts)

---

#### `UC-15`: Real-Time AML Fraud Velocity Interception & Account Freeze Gate

* **Actor**: `ACT-OPS` (Compliance Officer)
* **Test Data Specification (Source & Values)**:
  * **Test Data File**: [`tests/e2e/data/tier4-governance.data.ts`](file:///c:/Users/Admin/Downloads/logikchain/logikchain.com/tests/e2e/data/tier4-governance.data.ts)
  * **Datastore Source**: `PostgreSQL governance_db.aml_velocity_windows`
  * **Microservice**: `governance-service (:4011)`
  * **Sync Target / Endpoint**: `Cloud Firestore /AMLAlerts/{alertId}`
  * **Authentication Mechanism**: `Internal Gateway Mesh Context Filter`
  * **Individual Ingress Hook**: `const testData = await setupUseCaseTestData(page, 'UC-15');`
  * **Input Keys & Seed Values**:
    ```json
    {
      "userId": "usr_suspicious_01",
      "velocitySlidingWindowSeconds": 60,
      "maxTransactionsPerWindow": 5,
      "maxAggregateAmountPerWindow": 50000,
      "simulatedBurstCount": 6,
      "simulatedBurstAmount": 75000,
      "calculatedRiskScore": 88,
      "riskThresholdToFreeze": 80
    }
    ```
  * **Expected Outcomes**:
    ```json
    {
      "velocityBreached": true,
      "riskScoreAssigned": 88,
      "accountFreezeTriggered": true,
      "freezeNotificationPublished": true
    }
    ```
* **Feature ID**: `FEAT-11.02`
* **Lifecycle**:
  1. **Test Data Setup**: Prepares rapid transaction sequence exceeding velocity threshold.
  2. **User Sign-In**: Authenticates compliance officer session.
  3. **Core Flow**: Intercepts high-velocity transactions (>5/minute or ₹50,000 single transaction), flags high risk score, and triggers automatic account freeze.
  4. **User Sign-Out**: Terminates session.
* **Automated Spec**: [`tests/e2e/pwa/usecases-governance-ledger.spec.ts`](file:///c:/Users/Admin/Downloads/logikchain/logikchain.com/tests/e2e/pwa/usecases-governance-ledger.spec.ts)

---

#### `UC-17`: Multi-Role Versioned Clickwrap Policy Consent & Mandatory Re-Consent Gate

* **Actor**: `ACT-OPS` (Legal & Compliance)
* **Test Data Specification (Source & Values)**:
  * **Test Data File**: [`tests/e2e/data/tier4-governance.data.ts`](file:///c:/Users/Admin/Downloads/logikchain/logikchain.com/tests/e2e/data/tier4-governance.data.ts)
  * **Datastore Source**: `PostgreSQL governance_db.policy_consents & terms_versions`
  * **Microservice**: `governance-service (:4011)`
  * **Sync Target / Endpoint**: `Cloud Firestore /LegalConsents/{userId}`
  * **Authentication Mechanism**: `Cryptographic User Signature + Policy Version Hash`
  * **Individual Ingress Hook**: `const testData = await setupUseCaseTestData(page, 'UC-17');`
  * **Input Keys & Seed Values**:
    ```json
    {
      "policyId": "TERMS_OF_SERVICE",
      "enforcedPolicyVersion": "v2.4",
      "userHistoricalVersion": "v2.1",
      "requireReConsentGate": true,
      "jurisdiction": "IN-AP",
      "consentPayload": {
        "timestamp": "2026-10-31T06:35:05.000Z",
        "ipAddress": "192.168.1.100",
        "userAgent": "Mozilla/5.0 Playwright E2E Headless"
      }
    }
    ```
  * **Expected Outcomes**:
    ```json
    {
      "reConsentGateIntercepts": true,
      "consentAccepted": true,
      "newConsentVersionRecorded": "v2.4",
      "accessGrantedPostConsent": true
    }
    ```
* **Feature ID**: `FEAT-11.04`
* **Lifecycle**:
  1. **Test Data Setup**: Stages policy versions (`v2.3` -> `v2.4`) across Buyer, Merchant, and Driver roles.
  2. **User Sign-In**: Authenticates compliance officer session.
  3. **Core Flow**: Audits versioned clickwrap records, triggers policy version bump, and validates mandatory re-consent gate blocking app access until acceptance.
  4. **User Sign-Out**: Terminates session.
* **Automated Spec**: [`tests/e2e/pwa/usecases-governance-ledger.spec.ts`](file:///c:/Users/Admin/Downloads/logikchain/logikchain.com/tests/e2e/pwa/usecases-governance-ledger.spec.ts)

---

#### `UC-18`: Double-Entry Platform General Ledger & Zero-Sum Invariance Invariant Gate

* **Actor**: `ACT-FIN` (Financial Controller)
* **Test Data Specification (Source & Values)**:
  * **Test Data File**: [`tests/e2e/data/tier4-governance.data.ts`](file:///c:/Users/Admin/Downloads/logikchain/logikchain.com/tests/e2e/data/tier4-governance.data.ts)
  * **Datastore Source**: `PostgreSQL ledger_db.journal_entries & ledger_db.general_ledger`
  * **Microservice**: `finance-service (:4009)`
  * **Sync Target / Endpoint**: `Cloud Firestore /GeneralLedger/{batchId}`
  * **Authentication Mechanism**: `Finance Controller Token + Zero-Sum Pre-Flight Validator`
  * **Individual Ingress Hook**: `const testData = await setupUseCaseTestData(page, 'UC-18');`
  * **Input Keys & Seed Values**:
    ```json
    {
      "batchId": "jrn_batch_108",
      "debitAccountId": "1010_ESCROW_SETTLEMENT",
      "creditAccountId": "2010_MERCHANT_PAYABLE",
      "balancedBatchAmount": 10000,
      "currency": "INR",
      "unbalancedBatchAmountDelta": 50
    }
    ```
  * **Expected Outcomes**:
    ```json
    {
      "balancedBatchStatus": "COMMITTED",
      "zeroSumVarianceDelta": 0,
      "unbalancedBatchHttpStatus": 422,
      "unbalancedBatchErrorCode": "LEDGER_INVARIANCE_VIOLATION"
    }
    ```
* **Feature ID**: `FEAT-09.01`
* **Lifecycle**:
  1. **Test Data Setup**: Prepares double-entry journal batch with debit and credit accounts.
  2. **User Sign-In**: Authenticates finance officer session.
  3. **Core Flow**: Validates immutable double-entry journal balance where total debits equal total credits, rejecting any transaction with non-zero mathematical variance.
  4. **User Sign-Out**: Terminates session.
* **Automated Spec**: [`tests/e2e/pwa/usecases-governance-ledger.spec.ts`](file:///c:/Users/Admin/Downloads/logikchain/logikchain.com/tests/e2e/pwa/usecases-governance-ledger.spec.ts)

---

#### `UC-19`: Nightly 3-Way Bank Reconciliation & Vertex AI Variance Analysis

* **Actor**: `ACT-FIN` (Financial Auditor)
* **Test Data Specification (Source & Values)**:
  * **Test Data File**: [`tests/e2e/data/tier4-governance.data.ts`](file:///c:/Users/Admin/Downloads/logikchain/logikchain.com/tests/e2e/data/tier4-governance.data.ts)
  * **Datastore Source**: `PostgreSQL finance_db.reconciliation_batches & GCS Bank Statements`
  * **Microservice**: `finance-service (:4009)`
  * **Sync Target / Endpoint**: `Cloud Firestore /Reconciliations/{batchId}`
  * **Authentication Mechanism**: `Automated 01:00 AM Cloud Scheduler Task Invocation`
  * **Individual Ingress Hook**: `const testData = await setupUseCaseTestData(page, 'UC-19');`
  * **Input Keys & Seed Values**:
    ```json
    {
      "reconciliationDate": "2026-10-31",
      "domainTransactionsCount": 120,
      "bankNodalStatementItemsCount": 120,
      "paymentGatewayLogItemsCount": 120,
      "matchedRecordsCount": 120,
      "unmatchedVariance": 0,
      "matchingToleranceRupees": 0
    }
    ```
  * **Expected Outcomes**:
    ```json
    {
      "reconciliationStatus": "RECONCILED_CLEAN",
      "matchedCount": 120,
      "varianceAmount": 0,
      "auditReportSigned": true
    }
    ```
* **Feature ID**: `FEAT-09.02`
* **Lifecycle**:
  1. **Test Data Setup**: Prepares domain ledger transactions, bank statement lines, and PSP gateway logs.
  2. **User Sign-In**: Authenticates auditor session.
  3. **Core Flow**: Executes automated 3-way reconciliation match, categorizes matching exceptions, and generates variance summary report.
  4. **User Sign-Out**: Terminates session.
* **Automated Spec**: [`tests/e2e/pwa/usecases-governance-ledger.spec.ts`](file:///c:/Users/Admin/Downloads/logikchain/logikchain.com/tests/e2e/pwa/usecases-governance-ledger.spec.ts)

---

### Tier 5: Master Data Infrastructure, Geo-Hierarchy & Tax Engine
**Epic Scope:** EPIC-10: Master Data & Platform Spatial Registries  
**Automated Test Suite:** `tests/e2e/pwa/technical/config-geo-hierarchy.spec.ts & config-tax-profiles.spec.ts`

#### `UC-22`: Platform 4-Tier Geo-Hierarchy & Village Registry Management

* **Actor**: `ACT-OPS` (Support Operator)
* **Test Data Specification (Source & Values)**:
  * **Test Data File**: [`tests/e2e/data/tier5-platform.data.ts`](file:///c:/Users/Admin/Downloads/logikchain/logikchain.com/tests/e2e/data/tier5-platform.data.ts)
  * **Datastore Source**: `PostgreSQL geo_db.countries, states, districts, villages, delivery_hubs`
  * **Microservice**: `support-service (:4010)`
  * **Sync Target / Endpoint**: `Cloud Firestore /GeoHierarchy/IN`
  * **Authentication Mechanism**: `Support Operator Session (dev-token:test_operator_01:support)`
  * **Individual Ingress Hook**: `const testData = await setupUseCaseTestData(page, 'UC-22');`
  * **Input Keys & Seed Values**:
    ```json
    {
      "country": {
        "code": "IN",
        "name": "India",
        "currency": "INR"
      },
      "state": {
        "code": "AP",
        "name": "Andhra Pradesh"
      },
      "district": {
        "code": "PRAKASAM",
        "name": "Prakasam"
      },
      "village": {
        "id": "village_kandukur_523105",
        "name": "Kandukur",
        "pincode": "523105",
        "populationBand": "10K_TO_50K",
        "assignedHubId": "hub_ongole_central"
      }
    }
    ```
  * **Expected Outcomes**:
    ```json
    {
      "villageFoundInRegistry": true,
      "hubAssociationValid": true,
      "geoHierarchyLevelCount": 4
    }
    ```
* **Feature ID**: `FEAT-10.01`
* **Lifecycle**:
  1. **Test Data Setup**: Prepares 4-tier geographic master data (Country: India, State: Andhra Pradesh, District: Prakasam, Village: Kandukur).
  2. **User Sign-In**: Authenticates support operator session.
  3. **Core Flow**: Navigates to `/x/config/villages`, audits village registry list items, verifies topbar, and navigates across Countries, States, Districts, and fulfillment Hubs.
  4. **User Sign-Out**: Opens operator dialog, clicks "Sign out", confirms logout, and clears session tokens.
* **Automated Spec**: [`tests/e2e/pwa/config-geo-hierarchy.spec.ts`](file:///c:/Users/Admin/Downloads/logikchain/logikchain.com/tests/e2e/pwa/config-geo-hierarchy.spec.ts)

---

#### `UC-24`: Statutory Commodity Tax Profiles & Regional GST Rates

* **Actor**: `ACT-FIN` (Compliance Officer)
* **Test Data Specification (Source & Values)**:
  * **Test Data File**: [`tests/e2e/data/tier5-platform.data.ts`](file:///c:/Users/Admin/Downloads/logikchain/logikchain.com/tests/e2e/data/tier5-platform.data.ts)
  * **Datastore Source**: `PostgreSQL config_db.tax_profiles & config_db.tds_rules`
  * **Microservice**: `finance-service (:4009)`
  * **Sync Target / Endpoint**: `Cloud Firestore /TaxProfiles`
  * **Authentication Mechanism**: `Certified Finance & Tax Officer Session`
  * **Individual Ingress Hook**: `const testData = await setupUseCaseTestData(page, 'UC-24');`
  * **Input Keys & Seed Values**:
    ```json
    {
      "gstCommodityCategories": [
        {
          "hsnCode": "1006",
          "description": "Paddy / Unpolished Rice",
          "ratePct": 0
        },
        {
          "hsnCode": "0713",
          "description": "Pulses & Lentils",
          "ratePct": 5
        },
        {
          "hsnCode": "2106",
          "description": "Packaged Processed Consumer Goods",
          "ratePct": 18
        }
      ],
      "tdsStatutoryProfiles": [
        {
          "section": "194C",
          "target": "TRANSPORT_CONTRACTOR",
          "ratePct": 1
        },
        {
          "section": "194O",
          "target": "ECOMMERCE_SELLER",
          "ratePct": 1
        }
      ]
    }
    ```
  * **Expected Outcomes**:
    ```json
    {
      "essentialCommoditiesZeroRated": true,
      "tdsRulesAlignedWithCBDT": true
    }
    ```
* **Feature ID**: `FEAT-10.03`
* **Lifecycle**:
  1. **Test Data Setup**: Stages commodity GST rates (0% essential grains, 5% pulses, 18% consumer goods) and Section 194C/194O TDS profiles.
  2. **User Sign-In**: Authenticates compliance officer session.
  3. **Core Flow**: Navigates to `/x/config/tax`, audits GST profiles, navigates to `/x/config/tds`, and reviews statutory withholding configuration.
  4. **User Sign-Out**: Executes explicit sign-out and purges tokens.
* **Automated Spec**: [`tests/e2e/pwa/config-tax-profiles.spec.ts`](file:///c:/Users/Admin/Downloads/logikchain/logikchain.com/tests/e2e/pwa/config-tax-profiles.spec.ts)

---

### Tier 5: Data Pipeline Ingestion & Operator Proxy Delegation
**Epic Scope:** EPIC-10: Data Pipelines, Bulk Ingestion & Support Delegation  
**Automated Test Suite:** `tests/e2e/pwa/technical/support-supplier-bulk-ingest.spec.ts & support-supplier-proxy.spec.ts`

#### `UC-25`: Supplier Bulk Ingestion & Selective Entity Loader

* **Actor**: `ACT-OPS` (Support Operator)
* **Test Data Specification (Source & Values)**:
  * **Test Data File**: [`tests/e2e/data/tier5-platform.data.ts`](file:///c:/Users/Admin/Downloads/logikchain/logikchain.com/tests/e2e/data/tier5-platform.data.ts)
  * **Datastore Source**: `PostgreSQL supplier_db.bulk_catalogs & Ingestion Staging Buckets`
  * **Microservice**: `support-service (:4010)`
  * **Sync Target / Endpoint**: `Cloud Storage gs://logikchain-bulk-ingest`
  * **Authentication Mechanism**: `Support Specialist Credentials`
  * **Individual Ingress Hook**: `const testData = await setupUseCaseTestData(page, 'UC-25');`
  * **Input Keys & Seed Values**:
    ```json
    {
      "targetSupplierId": "sup_ongole_01",
      "validGstin": "37AAAAA0000A1Z5",
      "invalidGstin": "37ABCDE0000Z1Z",
      "entityTypesCount": 11,
      "entityTypes": [
        "organization",
        "depots",
        "gst_certificates",
        "fssai_licenses",
        "bank_accounts",
        "skus",
        "wholesale_pricing",
        "transport_fleets",
        "drivers",
        "routes",
        "credit_terms"
      ]
    }
    ```
  * **Expected Outcomes**:
    ```json
    {
      "dryRunValid": true,
      "invalidGstinBlocked": true,
      "invalidGstinErrorCode": "INVALID_GSTIN_FORMAT",
      "commitButtonLockedOnError": true
    }
    ```
* **Feature ID**: `FEAT-10.08`
* **Lifecycle**:
  1. **Test Data Setup**: Stages 11-category supplier catalog spreadsheet for `sup_ongole_01` and 14-char invalid GSTIN payload.
  2. **User Sign-In**: Authenticates support operator session.
  3. **Core Flow**: Navigates to `/x/config/supplier-ingestion`, audits 11 entity category toggles, executes pre-flight dry-run validation, triggers invalid 14-character GSTIN error, verifies `VALIDATION_FAILED` alert, and validates commit button locking.
  4. **User Sign-Out**: Executes explicit sign-out and purges tokens.
* **Automated Spec**: [`tests/e2e/pwa/support-supplier-bulk-ingest.spec.ts`](file:///c:/Users/Admin/Downloads/logikchain/logikchain.com/tests/e2e/pwa/support-supplier-bulk-ingest.spec.ts)

---

#### `UC-26`: Support-as-Supplier Proxy Impersonation & Audit Trail

* **Actor**: `ACT-OPS` (Support Operator acting on behalf of `ACT-SUP`)
* **Test Data Specification (Source & Values)**:
  * **Test Data File**: [`tests/e2e/data/tier5-platform.data.ts`](file:///c:/Users/Admin/Downloads/logikchain/logikchain.com/tests/e2e/data/tier5-platform.data.ts)
  * **Datastore Source**: `PostgreSQL support_db.audit_logs & identity_db.user_profiles`
  * **Microservice**: `support-service (:4010)`
  * **Sync Target / Endpoint**: `Cloud Firestore /ProxySessions/{sessionId}`
  * **Authentication Mechanism**: `Support Operator Session with X-Supplier-Context Ingress Header`
  * **Individual Ingress Hook**: `const testData = await setupUseCaseTestData(page, 'UC-26');`
  * **Input Keys & Seed Values**:
    ```json
    {
      "operatorId": "test_operator_01",
      "impersonatedSupplierId": "sup_ongole_01",
      "allowedProxySuppliers": [
        "sup_ongole_01",
        "sup_krishna_01"
      ],
      "localStorageKey": "lc_support_supplier_context",
      "forbiddenProxyActions": [
        "POST /v1/payouts/withdraw",
        "POST /v1/credit/agreements/modify"
      ]
    }
    ```
  * **Expected Outcomes**:
    ```json
    {
      "proxyHeaderPersisted": true,
      "dualIdentityAuditLogged": true,
      "financialMutationsBlockedWith403": true
    }
    ```
* **Feature ID**: `FEAT-10.04`
* **Lifecycle**:
  1. **Test Data Setup**: Stages authorized proxy contexts (`sup_ongole_01`, `sup_krishna_01`).
  2. **User Sign-In**: Authenticates support operator session.
  3. **Core Flow**: Accesses proxy dropdown in `/x/ops` topbar, selects `sup_ongole_01`, confirms persistence of `lc_support_supplier_context`, verifies immutable dual audit headers, and tests financial mutation exclusion guardrail.
  4. **User Sign-Out**: Resets proxy context, signs out, and clears headers.
* **Automated Spec**: [`tests/e2e/pwa/support-supplier-proxy.spec.ts`](file:///c:/Users/Admin/Downloads/logikchain/logikchain.com/tests/e2e/pwa/support-supplier-proxy.spec.ts)

---

---

### Tier 6: Microservices Mesh Telemetry & Observability Console
**Epic Scope:** EPIC-12: Gateway Mesh Observability, Live Test Runner & Playback  
**Automated Test Suite:** `tests/e2e/pwa/technical/status-services.spec.ts & status-test-runner.spec.ts`

#### `UC-27`: Microservices Mesh Health & Database Isolation Probes

* **Actor**: `ACT-SRE` (Platform / SRE Engineer)
* **Test Data Specification (Source & Values)**:
  * **Test Data File**: [`tests/e2e/data/tier5-platform.data.ts`](file:///c:/Users/Admin/Downloads/logikchain/logikchain.com/tests/e2e/data/tier5-platform.data.ts)
  * **Datastore Source**: `All 12 Isolated PostgreSQL Database Pools`
  * **Microservice**: `API Gateway (:30080) & All 13 Microservices`
  * **Sync Target / Endpoint**: `Telemetry Prometheus Service Monitor`
  * **Authentication Mechanism**: `SRE Observability Session`
  * **Individual Ingress Hook**: `const testData = await setupUseCaseTestData(page, 'UC-27');`
  * **Input Keys & Seed Values**:
    ```json
    {
      "expectedServices": [
        "api-gateway",
        "identity-service",
        "orders-service",
        "inventory-service",
        "catalog-service",
        "payment-service",
        "payouts-service",
        "cash-management-service",
        "credit-service",
        "finance-service",
        "support-service",
        "governance-service",
        "notification-service"
      ],
      "expectedDatabasesCount": 12,
      "gatewayPort": 30080
    }
    ```
  * **Expected Outcomes**:
    ```json
    {
      "allServicesHttpStatus200": true,
      "allDatabasesConnected": true,
      "schemaIsolationVerified": true
    }
    ```
* **Feature ID**: `FEAT-12.01`
* **Lifecycle**:
  1. **Test Data Setup**: Probes API Gateway `:30080` (NodePort) and 13 backend microservice endpoints.
  2. **User Sign-In**: Connects SRE observer telemetry session.
  3. **Core Flow**: Navigates to `/status`, validates API Gateway connection status, confirms all 13 microservices online, audits active PostgreSQL database connections across 12 isolated database pools, and triggers live connection refresh.
  4. **User Sign-Out**: Disconnects telemetry observer session.
* **Automated Spec**: [`tests/e2e/pwa/status-services.spec.ts`](file:///c:/Users/Admin/Downloads/logikchain/logikchain.com/tests/e2e/pwa/status-services.spec.ts)

---

#### `UC-28`: Live E2E Test Runner, Results Review & Video Playback Console

* **Actor**: `ACT-SRE` (QA / Lead Engineer)
* **Test Data Specification (Source & Values)**:
  * **Test Data File**: [`tests/e2e/data/tier5-platform.data.ts`](file:///c:/Users/Admin/Downloads/logikchain/logikchain.com/tests/e2e/data/tier5-platform.data.ts)
  * **Datastore Source**: `recordings/test-results.json & recordings/*.webm`
  * **Microservice**: `Vite Dev Server & Test Runner Middleware (:5173)`
  * **Sync Target / Endpoint**: `Web Public Test Results`
  * **Authentication Mechanism**: `Operator / SRE UI Access`
  * **Individual Ingress Hook**: `const testData = await setupUseCaseTestData(page, 'UC-28');`
  * **Input Keys & Seed Values**:
    ```json
    {
      "testRunnerRoute": "/status/tests",
      "totalRegisteredSuites": 37,
      "supportedPlaybackSpeeds": [
        0.5,
        1,
        1.25,
        1.5,
        2
      ],
      "videoMimeType": "video/webm"
    }
    ```
  * **Expected Outcomes**:
    ```json
    {
      "videoPlaybackLoads": true,
      "rangeHeaderStreamStatus206": true,
      "speedChangeResponsive": true,
      "downloadLinkActive": true
    }
    ```
* **Feature ID**: `FEAT-12.02`
* **Lifecycle**:
  1. **Test Data Setup**: Stages test runner suite definitions, test duration metrics, and WebM video recordings.
  2. **User Sign-In**: Connects QA lead session.
  3. **Core Flow**: Navigates to `/status/tests`, audits metrics cards (Total Use Cases, Passing Tests, Video Recordings), opens WebM recording modal, tests playback speed controls (0.5x, 1x, 1.5x, 2x), inspects verified flow checkpoints, and reviews execution log modal.
  4. **User Sign-Out**: Closes QA console and purges session tokens.
* **Automated Spec**: [`tests/e2e/pwa/status-test-runner.spec.ts`](file:///c:/Users/Admin/Downloads/logikchain/logikchain.com/tests/e2e/pwa/status-test-runner.spec.ts)

---

---

