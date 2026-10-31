# Logikchain Use Case Wireframes & UI Mockups Specification

This document provides high-fidelity architectural wireframes and UI mockups for each core use case, synthesized directly from [`constitution/wireframes/`](../constitution/wireframes/), [`constitution/Logikchain_Architecture.md`](../constitution/Logikchain_Architecture.md), and the live Web PWA design system.

---

## Screen & Use Case Matrix

| Use Case ID | Screen ID | Role & Viewport | Title / Purpose | Key Circuit Breaker / Gate |
|---|---|---|---|---|
| **`UC-01A` / `UC-01`** | `SHR-02` | Public / All Roles (360px & Desktop) | Unified Multi-Persona Mobile Login & Quick Profile Onboarding | 10-Digit Mobile Regex & Bot-Free reCAPTCHA Gate |
| **`UC-01A`** | `SHR-04` | Public / All Roles (360px Mobile) | 6-Digit Cryptographic SMS OTP Verification | 3-Attempt Throttle, 15-Min Exponential Backoff |
| **`UC-01H` / `UC-02`** | `SHR-03` | Authenticated User (360px Mobile) | Progressive Role Elevation & Operations Switch Modal | Microservice RBAC Validation & Claims Invalidation |
| **`UC-OBS-01` / `UC-01G`**| `PUB-01` | Public / SRE (360px & Desktop) | Microservices & Database Mesh Telemetry | Zero-Trust Gateway Perimeter Gate |
| **`UC-ADM-01` / `UC-22`** | `SPT-08` | Support Console (1024px) | Geo-Hierarchy & Village Hub Registry | Unassigned Rural Corridor Gate |
| **`UC-ADM-02` / `UC-23`** | `SPT-10` | Support Console (1024px) | Subscription Plans & Platform Tariffs | Quota Ceiling Overdraft Gate |
| **`UC-ADM-03` / `UC-24`** | `SPT-12` | Support Console (1024px) | Statutory GST & Sec 194-O TDS Rules | Tax Withholding Threshold Gate |
| **`UC-OPS-01` / `UC-25`** | `SPT-02.5`| Support Console (1024px) | Supplier Bulk Ingestion & Dry-Run Gate | Malformed 14-char GSTIN Breaker |
| **`UC-OPS-02` / `UC-26`** | `SPT-01.P`| Support Console (1024px) | Support-as-Supplier Proxy Switcher | Dual-Header Audit Trail Enforcement |
| **`UC-FIN-01` / `UC-04`** | `MER-04` | Merchant PWA (360px Mobile) | Trade Credit Underwriting & 2-Phase Hold | Credit Headroom Overdraft Breaker (402) |
| **`UC-FIN-02` / `UC-05`** | `MER-05` | Merchant PWA (360px Mobile) | Dynamic UPI QR Checkout & Instant Webhook | Idempotent HMAC Payment Signature Gate |
| **`UC-ORD-01` / `UC-06`** | `DRV-04` | Driver Mobile PWA (360px) | Vehicle Departure Gate (Manifest Clearance) | Mandatory Pre-Trip Cargo Manifest (422) |
| **`UC-ORD-01` / `UC-06`** | `DRV-06` | Driver Mobile PWA (360px) | Physical Handover OTP Verification | Cryptographic 6-Digit SMS OTP Gate (401) |

---

## 0. Tier 1 Identity, Authentication & Role Onboarding Wireframes

### 0.1. `UC-01A`: Unified Multi-Persona Login & Pre-Onboarding (`SHR-02`)
* **Role**: All Personas (`ACT-BUY`, `ACT-MER`, `ACT-DRV`, `ACT-SUP`, `ACT-OPS`, `ACT-FIN`, `ACT-SRE`)
* **Route**: `/login`
* **Inspired By**: [`constitution/wireframes/Shared.md`](../constitution/wireframes/Shared.md) `SHR-02` and [`web/src/apps/shell/screens/AuthScreens.tsx`](../web/src/apps/shell/screens/AuthScreens.tsx)

```
┌────────────────────────────────────────────────────────────────────────┐
│  🌐 India • EN ▾                                                      │
├────────────────────────────────────────────────────────────────────────┤
│                                                                        │
│  [Bharat Commerce Grid]             Sign In or Register                │
│  Access the Rural Network           ───────────────────                │
│  One unified identity connects      Country: [ India (+91)         ▾ ] │
│  you across mandi hubs, trade                                          │
│  credit lines & instant payouts.    Mobile Number:                     │
│                                     ┌──────┬─────────────────────────┐ │
│  ⚡ Zero Password Vulnerability     │ +91  │ 89778 48501             │ │
│  🇮🇳 Multilingual Regional Dialect   └──────┴─────────────────────────┘ │
│  🛡️ NPCI / UPI Escrow Protection                                       │
│                                     QUICK PROFILE SETUP (OPTIONAL)     │
│                                     Full Name:                         │
│                                     [ Ramesh Kumar                   ] │
│                                     Postal Pincode:                    │
│                                     [ 523273                         ] │
│                                                                        │
│                                     PRIMARY PLATFORM ROLE:             │
│                                     ┌────────────────┬───────────────┐ │
│                                     │ 🛒 Consumer    │ 🏪 Merchant   │ │
│                                     │ (Selected)     │               │ │
│                                     ├────────────────┼───────────────┤ │
│                                     │ 🛵 Fleet Rider │ 🏭 Supplier   │ │
│                                     └────────────────┴───────────────┘ │
│                                                                        │
│                                     [ Send Secure Verification Code ➔ ]│
│                                                                        │
│                                     ─────────────── or ─────────────── │
│                                     [ G  Continue with Google        ] │
│                                                                        │
│                                     Are you a mill depot?              │
│                                     [ Explore Supplier Portal ➔ ]      │
└────────────────────────────────────────────────────────────────────────┘
```

### 0.2. `UC-01A`: 6-Digit Cryptographic SMS OTP Verification (`SHR-04`)
* **Role**: All Personas (`ACT-BUY`, `ACT-MER`, `ACT-DRV`, `ACT-SUP`, etc.)
* **Route**: `/login/verify`
* **Inspired By**: [`constitution/wireframes/Shared.md`](../constitution/wireframes/Shared.md) `SHR-04`

```
┌────────────────────────────────────────┐
│ ← Back to Sign-In                      │
├────────────────────────────────────────┤
│                                        │
│  🔒 VERIFY SECURE LOGIN CODE           │
│  Enter the 6-digit code sent to        │
│  +91 89778 48501                       │
│                                        │
│  ┌───┐ ┌───┐ ┌───┐ ┌───┐ ┌───┐ ┌───┐   │
│  │ 1 │ │ 2 │ │ 3 │ │ 1 │ │ 2 │ │ 3 │   │
│  └───┘ └───┘ └───┘ └───┘ └───┘ └───┘   │
│                                        │
│  Resend code in 24s                    │
│                                        │
│  [ Verify Code & Sign In ➔ ]           │
│                                        │
│  🛡️ Security Notice:                   │
│  - Single-use cryptographic OTP        │
│  - Automatic claims generation         │
│  - Rate-limited to 3 attempts          │
└────────────────────────────────────────┘
```

### 0.3. `UC-01H`: Progressive Role Elevation Modal (`SHR-03`)
* **Role**: Authenticated Buyer &rarr; Merchant / Driver / Supplier
* **Route**: `/login` (Active Session State)
* **Inspired By**: [`web/src/apps/shell/screens/AuthScreens.tsx`](../web/src/apps/shell/screens/AuthScreens.tsx) `RoleSwitchForm`

```
┌────────────────────────────────────────┐
│ ● Active Session                       │
│ You are Signed In as Ramesh Kumar      │
│ Assigned Role: Consumer / Buyer        │
│ Assigned Village: village_kandukur     │
├────────────────────────────────────────┤
│                                        │
│ [🎧 Contact Support to Switch Role ▲ ] │
│ ┌────────────────────────────────────┐ │
│ │ Support Role Conversion Request    │ │
│ │ Contact operations to switch       │ │
│ │ platform role and permissions.     │ │
│ │                                    │ │
│ │ Target Role to Switch:             │ │
│ │ [ Kirana Merchant (🏪 Wholesale) ▾]│ │
│ │                                    │ │
│ │ Reason for Role Switch:            │ │
│ │ [ Registered kirana store owner    │ │
│ │   requesting merchant terminal.   ]│ │
│ │                                    │ │
│ │ [ Submit Role Switch Request ➔   ] │ │
│ └────────────────────────────────────┘ │
│                                        │
│ [ Open App ➔                         ] │
│ [ Sign Out & Switch Account          ] │
└────────────────────────────────────────┘
```

---

## 1. `UC-OBS-01`: System Mesh Telemetry (`PUB-01`)
* **Role**: Platform SRE / Public Observer
* **Route**: `/status`
* **Inspired By**: [`constitution/Logikchain_Architecture.md`](../constitution/Logikchain_Architecture.md) §7 and [`web/src/apps/public/PublicStatusScreens.tsx`](../web/src/apps/public/PublicStatusScreens.tsx)

```
┌────────────────────────────────────────────────────────────────────────┐
│  LOGIKCHAIN   ● API Gateway: CONNECTED (Port 30080)       [Refresh]    │
├────────────────────────────────────────────────────────────────────────┤
│                                                                        │
│  ┌──────────────────────┐ ┌──────────────────────┐ ┌────────────────┐  │
│  │  Services Online     │ │  Database Mesh       │ │ Gateway Latency│  │
│  │  9 / 13 Healthy      │ │  9/13 Pools Active   │ │ 12 ms (p95)    │  │
│  └──────────────────────┘ └──────────────────────┘ └────────────────┘  │
│                                                                        │
│  MICROSERVICES & DATABASE MESH STATUS                                  │
│  ┌─────────┬───────────────────┬──────┬─────────┬──────────────┬──────┐│
│  │ EPIC    │ SERVICE NAME      │ PORT │ HEALTH  │ DB POOL      │ P95  ││
│  ├─────────┼───────────────────┼──────┼─────────┼──────────────┼──────┤│
│  │ EPIC-10 │ config-service    │:4010 │ ● ONLINE│ config_db    │ 4ms  ││
│  │ EPIC-12 │ gateway (CDC)     │:8080 │ ● ONLINE│ outbox_cdc   │ 1ms  ││
│  │ EPIC-01 │ identity-service  │:4001 │ ● ONLINE│ identity_db  │ 8ms  ││
│  │ EPIC-13 │ social-connect    │:4012 │ ● ONLINE│ social_db    │ 5ms  ││
│  │ EPIC-03 │ gigs-service      │:4003 │ ● ONLINE│ gigs_db      │ 11ms ││
│  │ EPIC-04 │ pamphlet-service  │:4004 │ ● ONLINE│ pamphlet_db  │ 7ms  ││
│  │ EPIC-08 │ credit-service    │:4008 │ ● ONLINE│ credit_db    │ 9ms  ││
│  │ EPIC-05 │ payments-service  │:4005 │ ● ONLINE│ payments_db  │ 12ms ││
│  │ EPIC-02 │ orders-service    │:4002 │ ● ONLINE│ orders_db    │ 14ms ││
│  │ EPIC-06 │ payouts-service   │:4006 │ ○ READY │ payouts_db   │ —    ││
│  │ EPIC-07 │ cash-service      │:4007 │ ○ READY │ cash_db      │ —    ││
│  │ EPIC-09 │ finance-service   │:4009 │ ○ READY │ finance_db   │ —    ││
│  │ EPIC-11 │ governance-service│:4011 │ ○ READY │ governance_db│ —    ││
│  └─────────┴───────────────────┴──────┴─────────┴──────────────┴──────┘│
└────────────────────────────────────────────────────────────────────────┘
```
* **Data Contract**:
  - `Shown`: Live probe metrics from `GET /health/services` via API Gateway `:30080`.
  - `Control [Refresh]`: Calls immediate bypass re-probe and restarts status pulse.

---

## 2. `UC-OPS-01`: Supplier Bulk Ingestion & Dry-Run Circuit Breaker (`SPT-02.5`)
* **Role**: Support Operator (`ACT-OPS`)
* **Route**: `/x/config/supplier-ingestion`
* **Inspired By**: [`constitution/wireframes/Support.md`](../constitution/wireframes/Support.md) `SPT-02.5`

```
┌────────────────────────────────────────────────────────────────────────┐
│  LOGIKCHAIN SUPPORT CONSOLE   [Proxy: sup_ongole_01 ▾]       👤 Operator│
├────────────────────────────────────────────────────────────────────────┤
│  ← Back to Catalog   /   Supplier Bulk Ingestion (SPT-02.5)            │
│                                                                        │
│  Step 1: Upload Source Catalog                                         │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │  📄 supplier_catalog_prakasam_v2.xlsx (2.4 MB)        [ Replace ]│  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                                                        │
│  Step 2: Select Entity Categories to Ingest                            │
│  [x] Master Products (SKUs)     [x] Warehouse Inventory  [x] Pricing   │
│  [x] Statutory Tax / GSTIN      [x] Delivery Corridors   [x] Hub Docks │
│  [x] Payment QR Bindings        [x] Credit Terms Policy  [x] Tariffs   │
│                                                                        │
│  ┌─ CIRCUIT BREAKER TEST STATE ─────────────────────────────────────┐  │
│  │  (x) Inject 14-char Invalid GSTIN Simulation (Dry-Run Test)      │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                                                        │
│  [ Validate & Preview ]                                                │
│                                                                        │
│  ┌─ VALIDATION GATE REPORT ─────────────────────────────────────────┐  │
│  │  ⚠ STATUS: VALIDATION_FAILED (Pre-commit rejected)               │  │
│  │  Error Code: INVALID_GSTIN_FORMAT                                │  │
│  │  Detail: Line 42 GSTIN "37AAAAA0000A1Z" length is 14 (req: 15). │  │
│  │  Circuit Breaker: Database Commit is LOCKED.                     │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                                                        │
│  [ Start Bulk Ingestion (Disabled) ]                                   │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 3. `UC-OPS-02`: Support Proxy Impersonation Switcher (`SPT-01.P`)
* **Role**: Support Operator (`ACT-OPS`) acting on behalf of Rural Supplier (`ACT-SUP`)
* **Route**: `/x/ops`
* **Inspired By**: [`constitution/wireframes/Support.md`](../constitution/wireframes/Support.md) §Support-as-Supplier Proxy

```
┌────────────────────────────────────────────────────────────────────────┐
│  LOGIKCHAIN SUPPORT CONSOLE                                            │
│  ┌─ PROXY DELEGATION CONTEXT ────────────────────────────────────────┐ │
│  │  Acting on Behalf Of: [ sup_ongole_01 - Sri Lakshmi Agro ▾ ]      │ │
│  │  ● AUDIT ACTIVE: Mutations tagged with X-Actor-ID: ops_admin      │ │
│  │  ⚠ FINANCIAL MUTATION GATE: Banking/Payout modifications BLOCKED  │ │
│  └───────────────────────────────────────────────────────────────────┘ │
│                                                                        │
│  QUICK ACTIONS FOR SUPPLIER: sup_ongole_01                             │
│  [ Update Inventory Stock ]   [ Manage Credit Lines ]   [ Dispatch Hub]│
└────────────────────────────────────────────────────────────────────────┘
```

---

## 4. `UC-FIN-01`: Trade Credit 2-Phase Hold Gate (`MER-04`)
* **Role**: Rural Merchant (`ACT-MER`)
* **Viewport**: 360px Mobile PWA
* **Route**: `/m/checkout/credit`
* **Inspired By**: [`constitution/wireframes/Merchant.md`](../constitution/wireframes/Merchant.md) `MER-04`

```
┌────────────────────────────────────────┐
│ ← Checkout           Wholesale Credit  │
├────────────────────────────────────────┤
│ Supplier: Ongole Agro Cooperative      │
│ Order Total: ₹ 15,000.00               │
│                                        │
│ ┌─ CREDIT HEADROOM GATE ─────────────┐ │
│ │ Credit Limit:        ₹ 50,000.00   │ │
│ │ Current Balance:     ₹ 10,000.00   │ │
│ │ Active Holds:        ₹  5,000.00   │ │
│ │ ─────────────────────────────────  │ │
│ │ Available Headroom:  ₹ 35,000.00   │ │
│ │ Headroom Status:     ● SUFFICIENT  │ │
│ └────────────────────────────────────┘ │
│                                        │
│ Payment Terms: 14 Days Net (0% APR)   │
│ Due Date: 14 Nov 2026                  │
│                                        │
│ [ Authorize 2-Phase Credit Hold ]      │
│                                        │
│ ℹ Two-phase lock: Funds held for 15m   │
│   Committed permanently upon OTP delivery│
└────────────────────────────────────────┘
```
* **Circuit Breaker Condition**:
  - If `Order Total > Available Headroom`, UI highlights card in Red, displays `402 INSUFFICIENT_CREDIT_LIMIT`, and disables the authorize button.

---

## 5. `UC-FIN-02`: Dynamic UPI QR Instant Checkout (`MER-05`)
* **Role**: Rural Merchant / Buyer (`ACT-MER`)
* **Viewport**: 360px Mobile PWA
* **Route**: `/m/checkout/upi`
* **Inspired By**: [`constitution/wireframes/Merchant.md`](../constitution/wireframes/Merchant.md) `MER-05`

```
┌────────────────────────────────────────┐
│ ← Payment             Dynamic UPI QR   │
├────────────────────────────────────────┤
│ Amount to Pay: ₹ 3,250.00              │
│ Order Reference: ord_upi_882910        │
│                                        │
│ ┌────────────────────────────────────┐ │
│ │          ▄▄▄▄▄▄▄  ▄ ▄▄▄▄▄▄▄        │ │
│ │          █ ▄▄▄ █ ▄█ █ ▄▄▄ █        │ │
│ │          █ ███ █ ▄▄ █ ███ █        │ │
│ │          █▄▄▄▄▄█ █ █ █▄▄▄▄▄█        │ │
│ │          ▄▄ ▄  ▄▄ █▄▄ ▄  ▄▄        │ │
│ │          █▄▄▄▄▄█ ▄█ █▄█ █▄█        │ │
│ └────────────────────────────────────┘ │
│ Scan with PhonePe / GPay / Paytm / BHIM│
│                                        │
│ [ Open UPI Banking App ]               │
│                                        │
│ ⏱ Awaiting confirmation (Expires: 4:32)│
│ ● Status: LISTENING FOR WEBHOOK        │
│                                        │
│ ℹ Idempotent HMAC-SHA256 signature     │
│   verified via payments-service :4005  │
└────────────────────────────────────────┘
```

---

## 6. `UC-ORD-01` (Part A): Vehicle Departure Clearance Gate (`DRV-04`)
* **Role**: Transporter / Gig Driver (`ACT-DRV`)
* **Viewport**: 360px Mobile PWA
* **Route**: `/d/trips/departure-gate`
* **Inspired By**: [`constitution/wireframes/Driver.md`](../constitution/wireframes/Driver.md) `DRV-04`

```
┌────────────────────────────────────────┐
│ ← Trip #TRP-104       Departure Gate   │
├────────────────────────────────────────┤
│ Vehicle: AP-27-TY-1044 (Tata Ace)      │
│ Route: Ongole Hub → Chimakurthy        │
│ Cargo: 10x Cotton Hybrid Seed (450 kg) │
│                                        │
│ MANDATORY PRE-TRIP SAFETY CHECKLIST    │
│ [x] Physical cargo count verified      │
│ [x] Temperature check passed (24°C)    │
│ [x] Physical waybill manifest signed   │
│                                        │
│ ┌─ VEHICLE DEPARTURE GATE ───────────┐ │
│ │ Manifest Verified:   ● YES         │ │
│ │ Departure State:     CLEARED       │ │
│ └────────────────────────────────────┘ │
│                                        │
│ [ Confirm Departure & Start Transit ]  │
│                                        │
│ ⚠ Circuit Breaker: Unchecked manifest  │
│   triggers 422 VEHICLE_DEPARTURE_FAILED │
└────────────────────────────────────────┘
```

---

## 7. `UC-ORD-01` (Part B): Cryptographic Delivery Handover OTP (`DRV-06`)
* **Role**: Transporter / Gig Driver (`ACT-DRV`) & Merchant (`ACT-MER`)
* **Viewport**: 360px Mobile PWA
* **Route**: `/d/orders/handover`
* **Inspired By**: [`constitution/wireframes/Driver.md`](../constitution/wireframes/Driver.md) `DRV-06`

```
┌────────────────────────────────────────┐
│ ← Order Handover       Custody Final   │
├────────────────────────────────────────┤
│ Destination: Sri Lakshmi Kirana Stores │
│ Order ID: ord_17303102_44a             │
│ Total Package: 10 Bags Seeds           │
│                                        │
│ ENTER 6-DIGIT RECIPIENT OTP:           │
│ ┌───┐ ┌───┐ ┌───┐ ┌───┐ ┌───┐ ┌───┐   │
│ │ 9 │ │ 4 │ │ 8 │ │ 2 │ │ 1 │ │ 0 │   │
│ └───┘ └───┘ └───┘ └───┘ └───┘ └───┘   │
│                                        │
│ Merchant Signature:                    │
│ ┌────────────────────────────────────┐ │
│ │  ~ V. Krishna Rao (Signed)         │ │
│ └────────────────────────────────────┘ │
│                                        │
│ [ Verify OTP & Release Custody ]       │
│                                        │
│ 🔒 Cryptographic Handover Gate:        │
│   - Status updates to DELIVERED        │
│   - Releases Trade Credit / Escrow     │
│   - Rejection on wrong OTP (401)       │
└────────────────────────────────────────┘
```

