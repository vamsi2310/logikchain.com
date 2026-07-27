# Database Schema

## Purpose

Describe LogikChain data storage on Firebase Realtime Database: environments, top-level entities, and known fields.

## Scope

- Database platform and environment URLs
- Top-level collections / tables
- Entity field notes captured to date
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
| Support | Top-level node |
| Distributor | Top-level node |
| Merchant | Top-level node |
| Driver | Top-level node |
| Buyer | Top-level node |
| GeminiAI | Top-level node |
| Routes | See fields below |
| Villages | See fields below |
| Event log | Top-level node for events |

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

- Purpose: record system or domain events.
- Schema fields: **TBD**

## Open Items

- [ ] Provide Test and Production database URLs
- [ ] Expand field schemas for Support, Distributor, Merchant, Driver, Buyer, GeminiAI
- [ ] Define Event log record shape
- [ ] Document relationships (e.g. Routes ↔ Villages ↔ actors)
- [ ] Security rules / access model (see securityAndCompliance)

## Related Documents

- [architectureOverview.md](./architectureOverview.md)
- [Specification.md](./Specification.md)
- [useCases.md](./useCases.md)
- [securityAndCompliance.md](./securityAndCompliance.md)
- [financialSpec.md](./financialSpec.md)
- [monitoringAndLogging.md](./monitoringAndLogging.md)
