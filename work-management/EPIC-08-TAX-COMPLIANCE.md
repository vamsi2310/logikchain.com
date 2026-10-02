# EPIC-08: Tax Compliance, GST Profiling & TDS Deductions

## Executive Summary
EPIC-08 enforces statutory tax compliance under Indian tax laws (GST and Income Tax Act TDS provisions, e.g., Sections 194C and 194O). It includes GSTIN state verification, tax profile creation, automatic withholding of TDS on driver earnings, government challan recording, quarterly tax registers, and Form 16A certificate generation.

---

## FEAT-08.01: Supplier Tax Profile & GSTIN Verification

### 1. Hierarchy & Metadata
- **Epic**: `EPIC-08`
- **Feature ID**: `FEAT-08.01`
- **Official Runtimes**: Support Ops Web Console (`web/x/index.html`), Functions
- **Screens**: [SPT-06 Tax Admin](file:///c:/Users/Admin/Downloads/logikchain/logikchain.com/constitution/wireframes/Support.md)
- **Functions / APIs**: `PUT /v1/tax-profiles/{taxProfileId}` (`upsertTaxProfile`)

### 2. Business Value & Problem Statement
Suppliers collect GST on behalf of the government and must be registered with a validated 15-character GSTIN. Tax profiles define the supplier's state jurisdiction, default GST rates, and invoice generation rules.

### 3. Acceptance Criteria (Gherkin)

```gherkin
Scenario: Upsert valid tax profile for regional supplier
  Given an authenticated Support administrator
  When submitting "PUT /v1/tax-profiles/tax_sup_01" with:
    | supplierId         | "sup_01"                  |
    | gstin              | "37AAAAA0000A1Z5"         |
    | registeredStateCode| "37"                      |
    | defaultGstRate     | 18                        |
    | status             | "active"                  |
    | effectiveFrom      | "2026-04-01T00:00:00.000Z"|
  Then response status is 200 OK
  And tax profile is activated
  And orders fulfilled by "sup_01" apply 18% GST (9% CGST + 9% SGST for intrastate, or 18% IGST for interstate)

Scenario: Invalid GSTIN checksum format rejected
  When submitting a tax profile with an invalid 12-digit string
  Then response status is 400 Bad Request with code "INVALID_GSTIN_FORMAT"
```

### 4. Developer Test Plan & Mapping
- **Bruno API Test**: `tests/bruno/12-tax/upsertTaxProfile/`.
- **UI E2E Test**: `tests/e2e/support/tax-profile-setup.spec.ts`.
- **Unit Tests**: Indian GSTIN 15-character checksum and state code regex validation.

---

## FEAT-08.02: TDS Withholding Rules & Automatic Deductions

### 1. Hierarchy & Metadata
- **Epic**: `EPIC-08`
- **Feature ID**: `FEAT-08.02`
- **Official Runtimes**: Support Ops Web Console, Functions
- **Functions / APIs**: `PUT /v1/tds-configurations/{configId}` (`upsertTdsConfiguration`)

### 2. Business Value & Problem Statement
Under Section 194C, payments to logistics contractors require TDS withholding (1% if valid PAN provided, 5% or 20% if PAN missing). The system must automatically deduct TDS on driver payout finalization.

### 3. Acceptance Criteria (Gherkin)

```gherkin
Scenario: Configure TDS rates and verify withholding on driver payout
  Given TDS configuration enabled with rateWithPan = 1% and rateWithoutPan = 5%
  When a driver with a valid PAN requests payout for ₹10,000
  Then TDS deduction of ₹100 (1%) is withheld into the TDS liability ledger
  And net payout disbursed to driver is ₹9,900
  And a deduction record is logged in "/TdsDeductions"
```

### 4. Developer Test Plan & Mapping
- **Bruno API Test**: `tests/bruno/12-tax/upsertTdsConfiguration/`.
- **Unit Tests**: TDS tax rounding and PAN format checker.

---

## FEAT-08.03: Government TDS Challan Batching

### 1. Hierarchy & Metadata
- **Epic**: `EPIC-08`
- **Feature ID**: `FEAT-08.03`
- **Official Runtimes**: Support Ops Web Console, Functions
- **Screens**: [SPT-07 TDS Remittance](file:///c:/Users/Admin/Downloads/logikchain/logikchain.com/constitution/wireframes/Support.md)
- **Functions / APIs**: `POST /v1/tds/challans` (`recordTdsChallan`)

### 2. Acceptance Criteria (Gherkin)

```gherkin
Scenario: Finance officer records government TDS challan payment
  Given 25 unremitted TDS deductions totaling ₹25,400 for September 2026
  When Support finance officer calls "POST /v1/tds/challans" with:
    | deductionIds | ["ded_01", "ded_02", ...] |
    | totalAmount  | 25400                     |
    | bsrCode      | "0210045"                 |
    | challanNo    | "99812"                   |
  Then response status is 201 Created
  And deduction records transition to status "remitted"
```

### 3. Developer Test Plan & Mapping
- **Bruno API Test**: `tests/bruno/12-tax/recordTdsChallan/`.
- **UI E2E Test**: `tests/e2e/support/tds-challan.spec.ts`.

---

## FEAT-08.04: TDS Certificates & Quarterly Tax Register

### 1. Hierarchy & Metadata
- **Epic**: `EPIC-08`
- **Feature ID**: `FEAT-08.04`
- **Official Runtimes**: Support Ops Web Console, Driver App, Functions
- **Functions / APIs**: `POST /v1/tds/certificates` (`issueTdsCertificate`), `GET /v1/tds/register` (`getTdsRegister`)

### 2. Acceptance Criteria (Gherkin)

```gherkin
Scenario: Issue quarterly Form 16A certificate for driver
  Given financial year "2026-27" and quarter "Q2"
  When Support issues certificate via "POST /v1/tds/certificates" for driver "usr_drv_01"
  Then a signed Form 16A PDF is generated
  And driver can download the certificate directly from screen "DRV-06"
```

### 3. Developer Test Plan & Mapping
- **Bruno API Test**: `tests/bruno/12-tax/issueTdsCertificate/` and `getTdsRegister/`.
- **Unit Tests**: PDF layout and quarterly tax summary math.
