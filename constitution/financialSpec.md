# Financial Specification

## Purpose

Define financial reporting and money-movement requirements for LogikChain: profitability, merchant dues, orders, and payments.

## Scope

- Financial reporting on profitability
- Merchant dues per distributor
- Order history as financial context
- Merchant payments
- Related metrics from operational data (e.g. route average revenue)

## Status

Draft

## Content

### Profitability reporting

- Requirement: financial reporting on **profitability**.
- Report consumers (Support, Distributor, other roles): **TBD**
- Cadence (real-time, daily, monthly): **TBD**
- Dimensions (route, village, merchant, distributor, period): **TBD**

### Merchant dues

From product flows ([useCases.md](./useCases.md), [Flows.md](./Flows.md)):

| Requirement | Detail |
|-------------|--------|
| Merchant view | See **all distributors** with **total dues** against each distributor |
| Merchant drill-down | Open a distributor → see **all past orders** |
| Support view | View a merchant's dues to each distributor |
| Payment | Merchant makes a payment (settlement against dues / orders — rules TBD) |

### Orders and dues relationship

| Event | Expected financial effect |
|-------|---------------------------|
| Merchant places order | May increase dues to distributor — **TBD** |
| Merchant cancels order | May reverse or adjust dues — **TBD** |
| Merchant receives goods | Confirmation for fulfillment; dues timing **TBD** |
| Merchant makes payment | Reduces outstanding dues — **TBD** (full/partial) |

### Related operational inputs (from schema)

| Source | Field | Relevance |
|--------|-------|-----------|
| Routes | average Revenue | Input to revenue / profitability views |
| Routes | length | Operational cost / efficiency context (usage TBD) |
| Routes | round trip time | Operational efficiency context (usage TBD) |
| Dues | total per distributor | Merchant and Support financial views |
| Orders | past orders | Drill-down under a distributor |

### Calculations and formulas

- Profitability formula (revenue − cost, margins, etc.): **TBD**
- Cost sources: **TBD**
- Dues aggregation formula: **TBD**

### Payment integration

- Merchant payment uses payment gateway ([thirdPartyIntegration.md](./thirdPartyIntegration.md))
- Settlement posting back to dues ledger: **TBD**

## Open Items

- [ ] Define profitability formula and cost model
- [ ] Define dues calculation and when balances update
- [ ] Specify partial payment and refund behavior
- [ ] Specify report filters, dimensions, and export formats
- [ ] Clarify role-based access to financial reports

## Related Documents

- [databaseSchema.md](./databaseSchema.md)
- [thirdPartyIntegration.md](./thirdPartyIntegration.md)
- [useCases.md](./useCases.md)
- [Flows.md](./Flows.md)
- [securityAndCompliance.md](./securityAndCompliance.md)
