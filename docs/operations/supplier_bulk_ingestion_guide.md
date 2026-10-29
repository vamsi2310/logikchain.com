# Supplier Bulk Ingestion Data Dictionary & Operator Handbook

**Document ID**: `DOC-10.08.01`  
**Effective Date**: October 2026  
**Governing Standard**: FEAT-10.08 (Support Bulk Ingestion & Selective Entity Loader for Supplier Ecosystem Data)  
**Target Audience**: Platform Support Engineers, Operations Specialists, Supplier Onboarding Leads  

---

## 1. Overview
The Supplier Bulk Ingestion Engine (`SPT-02.5`) allows the Support team to onboard legacy enterprise supplier data and update active supplier fleets rapidly. Operators can choose to ingest the full 11-entity suite ("Select All") or cherry-pick specific subsets (e.g. Drivers only, or Inventory & Prices only).

---

## 2. The 11 Entity Categories & Required Schemas

### 1. Organization Details (`organization`)
- **Key Columns**: `businessName` (string, mandatory), `tradeName` (string), `regNumber` (CIN/ROC, string), `pan` (10 characters: `[A-Z]{5}[0-9]{4}[A-Z]{1}`), `address` (JSON / string).

### 2. Contact Details (`contact`)
- **Key Columns**: `contactName` (mandatory), `phone` (mandatory, format: `+91[6-9]\d{9}`), `dispatchEmail` (valid email), `hotline` (string), `emergencyContact` (string).

### 3. GST Details (`gst`)
- **Key Columns**: `gstin` (mandatory, 15 chars: `^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$`), `tradeClass` (Proprietorship / LLP / Pvt Ltd), `stateJurisdiction` (state code), `filingFrequency` (Monthly/Quarterly).
- **Validation**: Dry-run rejects any GSTIN with length $\ne 15$ or invalid checksum/character structure with `INVALID_GSTIN_FORMAT`.

### 4. Food License / FSSAI (`fssai`)
- **Key Columns**: `licenseNumber` (mandatory, 14 numeric digits: `^[0-9]{14}$`), `classification` (Wholesaler / Distributor), `issueDate` (ISO Date), `expiryDate` (ISO Date).

### 5. Inventory, Stock & Prices (`inventory`)
- **Key Columns**: `sku` (mandatory, unique per supplier), `title` (mandatory), `packagingUnit` (e.g. Box, Case, Kg), `baseWholesalePrice` (numeric $> 0$), `stockCount` (integer $\ge 0$).

### 6. Price History (`price_history`)
- **Key Columns**: `sku` (mandatory), `effectiveDate` (ISO timestamp), `wholesalePrice` (numeric), `promotionalPrice` (numeric optional).

### 7. Sales History Data (`sales_history`)
- **Key Columns**: `transactionId` (string), `region` (string), `routeId` (string), `villageId` (string), `sku` (string), `qty` (integer), `unitPrice` (numeric), `date` (ISO timestamp).

### 8. Routes (`routes`)
- **Key Columns**: `routeId` (mandatory), `name` (mandatory), `hubId` (string), `villageWaypoints` (array of valid village IDs), `turnaroundHours` (numeric), `distanceKm` (numeric).

### 9. Drivers & Driver Profiles (`drivers`)
- **Key Columns**: `driverName` (mandatory), `phone` (mandatory, `+91[6-9]\d{9}`), `licenseNumber` (string), `licenseExpiry` (ISO date), `emergencyPhone` (string).

### 10. Trucks & Vehicle Fleet (`trucks`)
- **Key Columns**: `regPlate` (e.g., `AP27TZ1234`), `chassisNumber` (string), `payloadKg` (numeric), `cubicFeet` (numeric), `fuelType` (Diesel / CNG / EV).

### 11. Merchants & Merchant Profiles (`merchants`)
- **Key Columns**: `storeName` (mandatory), `villageId` (mandatory, must exist in `villages`), `phone` (mandatory), `creditHeadroom` (numeric default 0), `isPudoHub` (boolean).

---

## 3. Workflow: Dry-Run Validation to Commit
1. **Selection**: Check desired checkboxes or toggle "Select All".
2. **File Upload**: Drop CSV or JSON datasets for selected categories.
3. **Dry-Run Validation (`/validate`)**:
   - The engine validates schema types, regular expressions, and foreign-key integrity.
   - If any record is invalid (e.g. 14-char GSTIN), status transitions to `VALIDATION_FAILED` and errors highlight offending row and column numbers. The commit button remains locked.
4. **Execution (`/bulk-import`)**:
   - Once validation passes with `VALID`, operator triggers ingestion.
   - Background worker persists records into domain databases and Cloud Firestore mirrors.
