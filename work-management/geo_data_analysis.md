# Geo Dataset Analysis & Superimposed Schema

## Dataset 1 — CSV (Post Office Master)
**Source**: Department of Posts, Ministry of Communications (data.gov.in)  
**Updated**: Monthly | **Data as on**: 10-09-2026

| Metric | Value |
|---|---|
| Total rows (post offices) | **176,946** |
| Unique pincodes | **18,593** |
| Unique states / UTs | **36** |
| Unique districts | **749** |
| Unique office names | **133,933** |
| Rows WITH lat/lng | **107,728** (60.9%) |
| Rows MISSING lat/lng | **69,218** (39.1%) |

### CSV Columns
`data_as_on`, `state`, `district`, `circle_name`, `region_name`, `division_name`, `office_name`, `pincode`, `office_type`, `delivery`, `latitude`, `longitude`

### Office Types
| Type | Count |
|---|---|
| Branch Office (BO) | 151,209 |
| Post Office (PO) | 24,919 |
| Head Office (HO) | 818 |

> **Key insight**: Each row is a *post office* (Branch/PO/HO) — not a village. Multiple post offices share the same pincode. Each post office is effectively a **delivery point / named locality**, which maps closely to our concept of a **village / service point**. Lat/lng is the centroid of that office.

---

## Dataset 2 — GeoJSON (Pincode Boundary Polygons)
**Source**: data.gov.in — All India Pincode Boundary GeoJSON  
**Updated**: As and When | **Data period**: 2025

| Metric | Value |
|---|---|
| File size | **86.14 MB** |
| Total features (pincodes) | **19,312** |
| Geometry type — Polygon | 18,324 |
| Geometry type — MultiPolygon | 988 |

### GeoJSON Feature Properties
`Pincode`, `Office_Name`, `Division`, `Region`, `Circle`

> **Key insight**: Each feature is a **pincode boundary polygon**. Properties are sparse — only the pincode, one office name, and postal hierarchy (Circle → Region → Division). **No lat/lng centroid, no district, no state** directly — those must be joined from the CSV.

---

## Overlap Analysis (Join Key = `pincode`)

| Category | Count | Meaning |
|---|---|---|
| Pincodes in **BOTH** datasets | **18,406** | ✅ Full record: polygon + post office detail |
| Pincodes in **GeoJSON only** | **906** | Has polygon boundary but no CSV post office match |
| Pincodes in **CSV only** | **187** | Has post office detail but no polygon |

> **95.4% of CSV pincodes have a polygon match. 95.3% of GeoJSON pincodes have a CSV match.**  
> The join is highly effective — only ~1,000 pincodes on either side are unmatched.

---

## Superimposed / Merged Dataset Schema

Join on `pincode` (string, zero-padded to 6 digits). For pincodes in both datasets, merge all fields. For pincodes in only one dataset, include available fields with NULLs for missing.

### Proposed `config_db.pincodes` Table Schema

```sql
CREATE TABLE pincodes (
  pincode          CHAR(6)        PRIMARY KEY,

  -- From GeoJSON
  boundary         GEOMETRY(MultiPolygon, 4326),   -- PostGIS polygon (always cast to Multi)
  geo_circle       TEXT,                           -- e.g. "Kerala"
  geo_region       TEXT,                           -- e.g. "Kochi"
  geo_division     TEXT,                           -- e.g. "Lakshadweep"

  -- Derived from CSV (aggregated per pincode)
  state            TEXT    NOT NULL,               -- e.g. "Andhra Pradesh"
  district         TEXT    NOT NULL,               -- e.g. "Krishna"

  -- Data quality flags
  has_polygon      BOOLEAN NOT NULL DEFAULT false,
  lat_lng_coverage NUMERIC(5,2),                   -- % of sub-offices with coordinates

  data_as_on       DATE,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_pincodes_boundary ON pincodes USING GIST (boundary);
CREATE INDEX idx_pincodes_state    ON pincodes (state);
CREATE INDEX idx_pincodes_district ON pincodes (district);
```

### Proposed `config_db.post_offices` Table Schema (sub-village resolution)

```sql
CREATE TABLE post_offices (
  office_id        UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  pincode          CHAR(6)       NOT NULL REFERENCES pincodes(pincode),

  -- From CSV
  office_name      TEXT    NOT NULL,              -- maps to "village / locality" name
  office_type      TEXT    NOT NULL,              -- 'BO' | 'PO' | 'HO'
  delivery         TEXT,                          -- 'Delivery' | 'Non-Delivery'
  circle_name      TEXT,
  region_name      TEXT,
  division_name    TEXT,

  -- Centroid (from CSV lat/lng — nullable for 39% of records)
  centroid         GEOMETRY(Point, 4326),

  -- Service eligibility (platform-specific, set by Support)
  service_eligible BOOLEAN NOT NULL DEFAULT false,

  data_as_on       DATE,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_post_offices_pincode  ON post_offices (pincode);
CREATE INDEX idx_post_offices_centroid ON post_offices USING GIST (centroid)
  WHERE centroid IS NOT NULL;
CREATE INDEX idx_post_offices_eligible ON post_offices (pincode)
  WHERE service_eligible = true;
```

---

## Data Quality Issues to Handle in ETL

| Issue | Scale | Mitigation |
|---|---|---|
| 39.1% of post offices missing lat/lng | 69,218 rows | Accept NULL centroid; fill via Google Maps Geocoding on-demand when Support registers a village |
| 906 pincodes in GeoJSON with no CSV match | 906 features | Insert pincode with polygon only; state/district = NULL, flagged for Support review |
| 187 pincodes in CSV with no polygon | 187 pincodes | Insert with NULL boundary, has_polygon = false; Support can manually upload GeoJSON later |
| Mixed geometry types (Polygon vs MultiPolygon) | 988 MultiPolygon | Cast all Polygon → `ST_Multi()` before insert so boundary column is uniformly MultiPolygon |
| GeoJSON lacks state/district fields | All 19,312 features | Join from CSV on pincode to populate state/district |

---

## User Location → Village Resolution Flow (Post-Merge)

```
User GPS (lat, lng)
  ↓
ST_Within(ST_MakePoint(lng, lat), pincodes.boundary)   → resolve pincode
  ↓
SELECT * FROM post_offices
  WHERE pincode = <resolved>
    AND service_eligible = true
  ORDER BY ST_Distance(centroid, ST_MakePoint(lng, lat))
  LIMIT 1                                              → nearest eligible post office = "village"
```

---

## Stories to Add to EPIC-10

| Story ID | Type | Description |
|---|---|---|
| `US-10.01.06` | User Story | Support operator bulk-seeds pincode + post office data via one-time ETL pipeline from official datasets |
| `US-10.01.07` | User Story | Support operator marks individual post offices as `service_eligible = true/false` from `SPT-10` to control where platform operates |
| `OPS-10.01.04` | DevOps | ETL script: join CSV + GeoJSON on `pincode`, normalise geometry to MultiPolygon, bulk-insert into `config_db.pincodes` + `config_db.post_offices` |
| `OPS-10.01.05` | DevOps | For post offices missing centroid: background job calls Google Maps Geocoding API to fill NULL centroids, up to quota per day |
| `DOC-10.01.02` | Documentation | Document the CSV/GeoJSON join logic, data quality gaps, and service eligibility flag management SOP |
