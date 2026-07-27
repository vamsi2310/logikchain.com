# Database Schema

## Purpose

Describe LogikChain data storage on Firebase Realtime Database: environments, top-level entities, and known fields.

## Scope

- Database platform and environment URLs
- Top-level collections / tables
- Entity field notes and relationships from product flows
- Event logging

## Status

Draft

## Content

### Platform

| Item | Value |
|------|-------|
| Database | Firebase Realtime Database |

### Environments

| Environment | URL |
|-------------|-----|
| Development | `https://logikchaindevelopment-default-rtdb.asia-southeast1.firebasedatabase.app/` |
| Test | *(not yet specified)* |
| Production | *(not yet specified)* |

### Top-level entities

| Entity | Notes |
|--------|-------|
| Users | Platform users; type + reference to role collection ([securityAndCompliance.md](./securityAndCompliance.md)) |
| Support | Top-level node |
| Distributor | Top-level node; owns inventory, drivers, villages, routes, catalogs, gigs |
| Merchant | Top-level node; cart, orders, dues per distributor |
| Driver | Top-level node; assigned gigs, OTP handover |
| Buyer | Top-level node |
| GeminiAI | Top-level node |
| Inventory | Products managed by distributor |
| Pamphlet / Catalog | Product catalog created by distributor |
| Gig | Run created/started by distributor, executed by driver; stops may be **delivery**, **pickup**, or both |
| Cart | Merchant cart |
| Order | Merchant orders (place, cancel, history) |
| Dues | Merchant total dues per distributor |
| OTP | Gig handover verification |
| Routes | See fields below |
| Villages | See fields below |
| Event log | Top-level node for events |

### Users

| Field / concern | Notes |
|-----------------|-------|
| user type | Support, Distributor, Merchant, Driver, Buyer (changeable by Support) |
| collection reference | Points at corresponding role collection |
| disabled / blocked | Support can disable (block) or enable (unblock) |

### Inventory

| Field | Notes |
|-------|-------|
| product Name | From architecture notes |
| Price | From architecture notes |
| Supplier | From architecture notes |
| owner | Distributor who added inventory |

### Pamphlet / Catalog

| Field / concern | Notes |
|-----------------|-------|
| owner | Distributor |
| contents | Product catalog / pamphlet for merchants to view |

Exact item schema: **TBD**

### Gig

| Field / concern | Notes |
|-----------------|-------|
| creator | Distributor |
| assigned driver | Driver after assignment |
| status | e.g. created, started, in transit, at village, at merchant, completed — **TBD enum** |
| route / villages | Linked route and village stops |
| OTP | Used for driver handover |
| stops | Per-merchant (or per-location) actions on the gig |
| stop type | **delivery** and/or **pickup** (a gig may include either or both) |
| packages / deliveries | Goods delivered to merchants |
| packages / pickups | Goods collected from merchants |

### OTP (gig handover)

| Field / concern | Notes |
|-----------------|-------|
| purpose | Distributor starts gig → assigns driver → driver submits OTP to take handover |
| format | 6-digit numeric |
| storage | Hash only (never plaintext) |
| expiry | **10 minutes** from issue / last regenerate ([securityAndCompliance.md](./securityAndCompliance.md)) |
| maxAttempts | **5** failed verifies → invalidate |
| regenerateLimit | **3** per gig assignment; **60s** cooldown; new code invalidates old |
| attemptCount | Integer; reset only when a new OTP is issued |
| status | issued / consumed / expired / locked |
| boundTo | Gig id + assigned driver id |

### Cart / Order

| Entity | Notes |
|--------|-------|
| Cart | Merchant adds catalog items |
| Order | Placed by merchant; can be cancelled; past orders listed per distributor |
| Receive goods | After driver delivery |
| Hand over pickup | After driver pickup |

### Dues

| Field / concern | Notes |
|-----------------|-------|
| merchant | Merchant identity |
| distributor | Distributor identity |
| total dues | Aggregate amount owed by merchant to that distributor |
| order history | Past orders when merchant opens a distributor |

### Distributor associations

Support (and distributor setup flows) associate:

| Association | Direction |
|-------------|-----------|
| Village → Distributor | Add village to distributor |
| Merchant → Distributor | Add merchant to distributor |
| Driver → Distributor | Add driver to distributor |

### Routes

| Field | Type / notes |
|-------|----------------|
| Name | Route name |
| Villages | Array of villages on the route |
| length | Route length |
| round trip time | Round-trip duration |
| average Revenue | Average revenue for the route |

### Villages

| Field | Type / notes |
|-------|----------------|
| Name | Village name |
| location | Geographic / location data |

### Event log

- Purpose: record system or domain events (gig state changes, orders, payments, Support admin actions recommended).
- Schema fields: **TBD**

### Relationship sketch

```text
Distributor
  ├── Inventory
  ├── Pamphlet / Catalog
  ├── Drivers
  ├── Villages
  ├── Routes (Villages[], …)
  └── Gigs ──OTP──> Driver
                      │
                      └── stops ──> Merchant
                            ├── delivery
                            └── pickup
                                           ├── Cart / Orders
                                           └── Dues per Distributor
```

## Open Items

- [ ] Provide Test and Production database URLs
- [ ] Finalize field schemas for Gig status, stop type (delivery/pickup), Catalog items, Order, Dues, OTP
- [ ] Define Event log record shape
- [ ] Normalize Inventory vs Catalog item models
- [ ] Security rules / access model (see securityAndCompliance)

## Related Documents

- [architectureOverview.md](./architectureOverview.md)
- [Specification.md](./Specification.md)
- [useCases.md](./useCases.md)
- [Flows.md](./Flows.md)
- [securityAndCompliance.md](./securityAndCompliance.md)
- [financialSpec.md](./financialSpec.md)
- [monitoringAndLogging.md](./monitoringAndLogging.md)
