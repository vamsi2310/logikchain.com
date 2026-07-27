# LogikChain Constitution

Governing specifications for the LogikChain platform. Each document follows a shared template: **Purpose**, **Scope**, **Requirements / Content**, **Open Items**, and **Related Documents**.

| Document | Purpose |
|----------|---------|
| [architectureOverview.md](./architectureOverview.md) | System context, components, and high-level design |
| [Specification.md](./Specification.md) | API contracts: REST, WebSocket, auth, errors, versioning |
| [databaseSchema.md](./databaseSchema.md) | Firebase Realtime Database structure and entities |
| [Flows.md](./Flows.md) | End-to-end process and interaction flows |
| [useCases.md](./useCases.md) | Actor-driven use cases |
| [thirdPartyIntegration.md](./thirdPartyIntegration.md) | External services and integrations |
| [financialSpec.md](./financialSpec.md) | Profitability and financial reporting |
| [securityAndCompliance.md](./securityAndCompliance.md) | Security controls and compliance |
| [monitoringAndLogging.md](./monitoringAndLogging.md) | Observability, logs, and alerts |
| [uiAndNavigation.md](./uiAndNavigation.md) | User interface guidelines, mobile layouts, and navigation |
| [deploymentSpec.md](./deploymentSpec.md) | Environments and deployment |
| [testingStrategy.md](./testingStrategy.md) | Test approach and quality gates |
| [codingStandards.md](./codingStandards.md) | Coding conventions and quality rules |

## Document template

Every constitution file uses this structure:

```markdown
# <Title>

## Purpose
## Scope
## Status
## Content
## Open Items
## Related Documents
```

## Status legend

| Status | Meaning |
|--------|---------|
| Draft | Captured notes; needs expansion |
| In Progress | Sections being filled from product decisions |
| Stable | Agreed baseline for implementation |

## Current baseline (product context)

Primary journeys are captured in [useCases.md](./useCases.md) and [Flows.md](./Flows.md):

- Distributor setup → catalog → gig create/start with OTP assign
- Driver OTP handover → trip → village → merchant → delivery and/or pickup
- Merchant notifications, catalog/cart/order, dues, payment
- Buyer signup/login → choose village → browse active gigs with ETAs → place pre-arrival catalog orders → pickup package from merchant
- Support user admin and distributor/driver/merchant oversight
