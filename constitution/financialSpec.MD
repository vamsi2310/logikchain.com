# Financial Specification

## Purpose

Define financial reporting requirements for LogikChain, starting with profitability.

## Scope

- Financial reporting on profitability
- Related metrics derived from operational data (e.g. route average revenue)

## Status

Draft

## Content

### Profitability reporting

- Requirement: financial reporting on **profitability**.
- Report consumers (Support, Distributor, other roles): **TBD**
- Cadence (real-time, daily, monthly): **TBD**
- Dimensions (route, village, merchant, distributor, period): **TBD**

### Related operational inputs (from schema)

These fields from [databaseSchema.md](./databaseSchema.md) are relevant to financial views:

| Source | Field | Relevance |
|--------|-------|-----------|
| Routes | average Revenue | Input to revenue / profitability views |
| Routes | length | Operational cost / efficiency context (usage TBD) |
| Routes | round trip time | Operational efficiency context (usage TBD) |

### Calculations and formulas

- Profitability formula (revenue − cost, margins, etc.): **TBD**
- Cost sources: **TBD**

## Open Items

- [ ] Define profitability formula and cost model
- [ ] Specify report filters, dimensions, and export formats
- [ ] Clarify role-based access to financial reports
- [ ] Link payment gateway settlements ([thirdPartyIntegration.md](./thirdPartyIntegration.md))

## Related Documents

- [databaseSchema.md](./databaseSchema.md)
- [thirdPartyIntegration.md](./thirdPartyIntegration.md)
- [useCases.md](./useCases.md)
- [securityAndCompliance.md](./securityAndCompliance.md)
