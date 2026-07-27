# Use Cases

## Purpose

Capture actor-driven use cases for LogikChain so product and engineering share a common functional baseline.

## Scope

- Actors identified in the data model
- Use cases per actor
- Cross-cutting cases (notifications, payments, reporting)

## Status

Draft

## Content

### Actors

| Actor | Description |
|-------|-------------|
| Support | Platform support role |
| Distributor | Distribution role |
| Merchant | Merchant role |
| Driver | Driver role |
| Buyer | Buyer role |

*(Role responsibilities beyond names are TBD.)*

### Use case template

For each use case:

| Field | Content |
|-------|---------|
| ID | UC-xxx |
| Name | Short title |
| Actor(s) | Primary and secondary |
| Goal | What the actor achieves |
| Preconditions | Required state |
| Main flow | Steps |
| Alternate / exception flows | Variants |
| Related data | Entities / fields |
| Related APIs / integrations | Links |

### Use cases by actor

#### Support

*(None documented yet.)*

#### Distributor

*(None documented yet.)*

#### Merchant

*(None documented yet.)*

#### Driver

*(None documented yet.)*

#### Buyer

*(None documented yet.)*

### Cross-cutting candidates

From existing constitution notes:

| Candidate | Source |
|-----------|--------|
| View or manage routes and villages | databaseSchema |
| Receive SMS / push / WhatsApp notifications | thirdPartyIntegration |
| Process payments | thirdPartyIntegration |
| View profitability reporting | financialSpec |
| Interact with GeminiAI features | databaseSchema / architecture |

## Open Items

- [ ] Write primary use cases per actor
- [ ] Assign IDs and priorities
- [ ] Link each use case to Flows and API Specification

## Related Documents

- [Flows.md](./Flows.md)
- [databaseSchema.md](./databaseSchema.md)
- [Specification.md](./Specification.md)
- [thirdPartyIntegration.md](./thirdPartyIntegration.md)
- [financialSpec.md](./financialSpec.md)
