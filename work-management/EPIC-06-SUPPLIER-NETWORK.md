# EPIC-06: Supplier Catalog, Multi-Village Route Network & Pamphlet Distribution

## Executive Summary
EPIC-06 empowers regional suppliers to administer their logistics network. Runtimes include the responsive Web PWA (`web/s/index.html`) optimized for desktop displays ($\ge 1024\text{px}$) and field phones. Core capabilities include product inventory and stock adjustments, route geometry definition, pamphlet curation, driver pay rate configuration, and automated financial report generation.

---

## FEAT-06.01: Supplier Master Catalog & Stock Adjustments

### 1. Hierarchy & Metadata
- **Epic**: `EPIC-06`
- **Feature ID**: `FEAT-06.01`
- **Official Runtimes**: Supplier Web PWA (`web/s/index.html` Official), Functions
- **Screens**: [SUP-08 Inventory & Catalog](file:///c:/Users/Admin/Downloads/logikchain/logikchain.com/constitution/wireframes/Supplier.md#SUP-08), [SUP-08.1 Stock Adjust](file:///c:/Users/Admin/Downloads/logikchain/logikchain.com/constitution/wireframes/Supplier.md#SUP-08)
- **Functions / APIs**: `POST /v1/products/{productId}/stock` (`adjustProductStock`)

### 2. Business Value & Problem Statement
Suppliers manage physical warehouse stock. When warehouse batches arrive, or spoilage occurs, inventory counts must update immediately with an audit trail explaining the delta.

### 3. Users in Use Case
- **Primary Actor**: Supplier Inventory Controller (`role: supplier`).
- **Downstream**: Gig dispatchers, village buyers, and merchants.

### 4. Acceptance Criteria (Gherkin)

```gherkin
Scenario: Supplier adjusts product warehouse stock with delta
  Given an authenticated supplier
  When supplier calls "POST /v1/products/prod_rice_25kg/stock" with:
    | mode   | "delta"                            |
    | value  | 50                                 |
    | reason | "Received distributor truckload B4" |
  Then product warehouse stock increases by 50
  And an entry is recorded in "/StockAuditLogs"
```

### 5. Developer Test Plan & Mapping
- **Bruno API Test**: `tests/bruno/14-ops/adjustProductStock/`.
- **UI E2E Test**: `tests/e2e/supplier/stock-adjustment.spec.ts`.
- **Unit Tests**: Stock delta vs absolute mode calculation ($stock \ge 0$).

---

## FEAT-06.02: Multi-Village Route Topology & Waypoint Metrics

### 1. Hierarchy & Metadata
- **Epic**: `EPIC-06`
- **Feature ID**: `FEAT-06.02`
- **Official Runtimes**: Supplier Web PWA (Desktop $\ge 1024\text{px}$), Functions
- **Screens**: [SUP-10 Routes Admin](file:///c:/Users/Admin/Downloads/logikchain/logikchain.com/constitution/wireframes/Supplier.md#SUP-10)
- **Functions / APIs**: `PUT /v1/routes/{routeId}` (`upsertRoute`), `POST /v1/routes:compute-metrics` (`computeRouteMetrics`)

### 2. Business Value & Problem Statement
Rural roads can have unpredictable transit times and mileage. Suppliers define fixed route sequences linking multiple villages, integrating Google Maps Routes API to calculate realistic distance and driving durations.

### 3. Acceptance Criteria (Gherkin)

```gherkin
Scenario: Supplier defines a 4-village delivery route with auto-computed metrics
  Given supplier on desktop screen "SUP-10"
  When supplier creates route "rte_ongole_circuit_1" sequencing:
    | villageId         | lat    | lng    |
    | "vil_karavadi"    | 15.530 | 80.020 |
    | "vil_pelluru"     | 15.545 | 80.050 |
    | "vil_koppolu"     | 15.560 | 80.070 |
  And triggers route metric computation
  Then total distance is computed in kilometers
  And estimated total driving time is computed
  And route document is saved in status "active"
```

### 4. Developer Test Plan & Mapping
- **Bruno API Test**: `tests/bruno/14-ops/upsertRoute/` and `computeRouteMetrics/`.
- **UI E2E Test**: `tests/e2e/supplier/route-creation.spec.ts`.
- **Unit Tests**: Route sequence duplicate detector.

---

## FEAT-06.03: Digital Pamphlet Composition & Publishing

### 1. Hierarchy & Metadata
- **Epic**: `EPIC-06`
- **Feature ID**: `FEAT-06.03`
- **Official Runtimes**: Supplier Web PWA, Functions
- **Screens**: [SUP-11 Pamphlets](file:///c:/Users/Admin/Downloads/logikchain/logikchain.com/constitution/wireframes/Supplier.md#SUP-11), [SUP-12 Pamphlet Editor](file:///c:/Users/Admin/Downloads/logikchain/logikchain.com/constitution/wireframes/Supplier.md#SUP-12)
- **Functions / APIs**: `/Pamphlets` CRUD triggers

### 2. Business Value & Problem Statement
A "Pamphlet" is a curated digital flyer of products offered on a specific route or day, allowing suppliers to promote seasonal products, clear excess inventory, and set promotional prices.

### 3. Acceptance Criteria (Gherkin)

```gherkin
Scenario: Supplier publishes seasonal pamphlet for upcoming festival
  Given supplier is editing pamphlet "pmp_diwali_specials" on "SUP-12"
  When supplier adds 15 curated products with promotional pricing
  And sets active date range "2026-10-10" to "2026-10-25"
  And clicks "Publish Pamphlet"
  Then status transitions to "published"
  And pamphlet becomes selectable during Gig Composition "FEAT-02.01"
```

### 4. Developer Test Plan & Mapping
- **UI E2E Test**: `tests/e2e/supplier/pamphlet-workflow.spec.ts`.
- **Unit Tests**: Pamphlet product price override validator.

---

## FEAT-06.04: Driver Compensation Rate Cards

### 1. Hierarchy & Metadata
- **Epic**: `EPIC-06`
- **Feature ID**: `FEAT-06.04`
- **Official Runtimes**: Supplier Web PWA, Functions
- **Screens**: [SUP-09 Driver Pay Rates](file:///c:/Users/Admin/Downloads/logikchain/logikchain.com/constitution/wireframes/Supplier.md#SUP-09)
- **Functions / APIs**: `PUT /v1/suppliers/{id}/driver-pay` (`updateDriverPayRates`)

### 2. Acceptance Criteria (Gherkin)

```gherkin
Scenario: Supplier updates vehicle driver compensation formula
  Given an authenticated supplier
  When supplier puts to "/v1/suppliers/sup_01/driver-pay" with:
    | baseTripAmount | 250 |
    | perKm          | 8   |
    | perDelivery    | 15  |
  Then response status is 200 OK
  And subsequent completed gigs calculate driver payout using these updated parameters
```

### 3. Developer Test Plan & Mapping
- **Bruno API Test**: `tests/bruno/14-ops/updateDriverPayRates/`.
- **Unit Tests**: Driver trip fare calculation formula unit test.

---

## FEAT-06.05: Supplier Financial Analytics & Export Schedules

### 1. Hierarchy & Metadata
- **Epic**: `EPIC-06`
- **Feature ID**: `FEAT-06.05`
- **Official Runtimes**: Supplier Web PWA, Functions
- **Screens**: [SUP-02 Supplier Dashboard](file:///c:/Users/Admin/Downloads/logikchain/logikchain.com/constitution/wireframes/Supplier.md#SUP-02), [SUP-14 Finance Reports](file:///c:/Users/Admin/Downloads/logikchain/logikchain.com/constitution/wireframes/Supplier.md#SUP-14)
- **Functions / APIs**: `GET /v1/reports/financial` (`getFinancialReport`), `GET /v1/reports/finance` (`getFinanceReport`), `POST /v1/reports/finance/exports` (`exportFinanceReport`), `POST /v1/reports/finance/schedules` (`scheduleFinanceReport`), `GET /v1/entitlements` (`getEntitlements`)

### 2. Acceptance Criteria (Gherkin)

```gherkin
Scenario: Supplier exports weekly collections report to CSV
  Given an authenticated supplier with active subscription entitlement "finance.dashboard"
  When supplier posts to "/v1/reports/finance/exports" with:
    | reportType | "collections_summary" |
    | format     | "csv"                 |
    | startDate  | "2026-09-01"          |
    | endDate    | "2026-09-30"          |
  Then response status is 200 OK
  And returns a signed Cloud Storage URL to download the CSV export
```

### 3. Developer Test Plan & Mapping
- **Bruno API Test**: `tests/bruno/09-reports/getFinancialReport/`, `exportFinanceReport/`, `scheduleFinanceReport/`, and `getEntitlements/`.
- **UI E2E Test**: `tests/e2e/supplier/finance-reporting.spec.ts`.
- **Unit Tests**: CSV serialization and currency formatting in Indian Lakhs/Crores.
