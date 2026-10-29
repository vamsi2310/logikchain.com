# India Pincode Hierarchy & Boundary Parquet Integration Guide

This document specifies the technical architecture, data model, and API integration for the **India Postal Pincode Hierarchy and Polygon Boundaries Dataset** embedded in `config-service`.

---

## 1. Dataset Overview

- **Source File**: `microservices/services/config-service/india-pin-codes-boundary-circle-region-division-postal-office-wise-polygons-boundaries-of-each-pin-code-in-india.parquet`
- **File Size**: ~19.8 MB
- **Total Registered Pincodes**: 19,312 distinct pincodes
- **Hierarchy Depth**:
  - **23 Postal Circles** (representing States and administrative postal regions)
  - **48 Postal Regions**
  - **478 Postal Divisions**
  - **19,312 Post Offices / Pincodes** with polygon boundary geometries (`WKB` geometry)
- **Engine**: In-process DuckDB OLAP engine querying the compressed Parquet dataset with sub-5ms latency and zero external database overhead.

---

## 2. API Endpoints (`config-service` - Port 4010)

The microservice exposes high-performance cascading dropdown APIs designed for onboarding forms, KYC verification, merchant serviceability checks, and corridor mapping:

### 1. `GET /v1/config/postal/circles`
Returns all top-level postal circles with their total pincode count.

**Response**:
```json
{
  "success": true,
  "count": 23,
  "data": [
    { "circle": "Andhra Pradesh", "totalPincodes": 1150 },
    { "circle": "Karnataka", "totalPincodes": 1420 },
    { "circle": "Kerala", "totalPincodes": 980 },
    { "circle": "Maharashtra", "totalPincodes": 2210 }
  ]
}
```

---

### 2. `GET /v1/config/postal/regions?circle=Kerala`
Returns cascading regions under a specific circle.

**Response**:
```json
{
  "success": true,
  "filter": { "circle": "Kerala" },
  "count": 3,
  "data": [
    { "region": "Calicut", "circle": "Kerala", "totalPincodes": 320 },
    { "region": "Kochi", "circle": "Kerala", "totalPincodes": 380 },
    { "region": "Trivandrum", "circle": "Kerala", "totalPincodes": 280 }
  ]
}
```

---

### 3. `GET /v1/config/postal/divisions?circle=Kerala&region=Kochi`
Returns postal divisions within the selected region.

**Response**:
```json
{
  "success": true,
  "filter": { "circle": "Kerala", "region": "Kochi" },
  "count": 8,
  "data": [
    { "division": "Alwaye", "region": "Kochi", "circle": "Kerala", "totalPincodes": 55 },
    { "division": "Ernakulam", "region": "Kochi", "circle": "Kerala", "totalPincodes": 72 },
    { "division": "Lakshadweep", "region": "Kochi", "circle": "Kerala", "totalPincodes": 10 }
  ]
}
```

---

### 4. `GET /v1/config/postal/pincodes?search=682553`
Looks up pincodes, post offices, and their administrative hierarchy with search, pagination (`limit`, `offset`), and circle/region filters.

**Query Parameters**:
- `search`: Substring search on pincode, office name, division, or circle
- `pincode`: Pincode prefix filter (e.g. `560`)
- `circle`: Specific postal circle
- `region`: Specific region
- `division`: Specific postal division
- `limit`: Number of records (default 50, max 500)
- `offset`: Pagination offset

**Response**:
```json
{
  "success": true,
  "total": 1,
  "pincodes": [
    {
      "pincode": "682553",
      "officeName": "Agathi S.O",
      "division": "Lakshadweep",
      "region": "Kochi",
      "circle": "Kerala"
    }
  ]
}
```

---

## 3. Frontend & Gateway Integration

- **API Gateway Routing**: Requests to `http://localhost:4000/api/v1/config/postal/*` proxy transparently to `config-service:4010`.
- **UI Form Integration**:
  - Used in `/login` and `/profile/edit` to autocomplete pincodes.
  - Used in Merchant/Supplier registration screens to validate corridor boundaries and generate cascading dropdowns: `Circle ➔ Region ➔ Division ➔ Pincode`.

