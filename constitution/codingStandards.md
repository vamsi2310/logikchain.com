# Coding Standards

## Purpose

Establish coding conventions and quality rules for LogikChain so implementations stay consistent with the constitution (APIs, data, security).

## Scope

- Language / stack conventions (once stack is fixed)
- API and JSON consistency
- Error handling
- Naming aligned with domain entities
- Security hygiene

## Status

Draft

## Content

### Alignment with constitution

All code must respect:

| Area | Rule source |
|------|-------------|
| REST / WebSocket contracts | [Specification.md](./Specification.md) |
| JSON consistency | Same request/response and error shapes across REST and WebSocket |
| HTTP status codes | Standard usage per Specification |
| API versioning | Follow chosen scheme once documented |
| Data model names | Support, Distributor, Merchant, Driver, Buyer, GeminiAI, Routes, Villages, Event log |

### Suggested conventions (to confirm)

- Prefer explicit types / schemas for API payloads
- Do not invent alternate field names for documented entities (e.g. keep `average Revenue`, `round trip time` until schema is normalized)
- Centralize error formatting to one shared structure
- Keep third-party clients isolated behind integration modules ([thirdPartyIntegration.md](./thirdPartyIntegration.md))
- Never commit secrets; use environment config ([deploymentSpec.md](./deploymentSpec.md), [securityAndCompliance.md](./securityAndCompliance.md))

### Stack-specific standards

- Languages, frameworks, linters, formatters: **TBD**
- PR review checklist: **TBD**

### Domain naming reference

| Entity | Known fields |
|--------|----------------|
| Routes | Name, Villages[], length, round trip time, average Revenue |
| Villages | Name, location |

## Open Items

- [ ] Confirm tech stack and publish language-specific rules
- [ ] Normalize field naming (camelCase vs spaced labels) in schema + code
- [ ] Add lint / format / CI enforcement
- [ ] Document folder structure conventions

## Related Documents

- [Specification.md](./Specification.md)
- [databaseSchema.md](./databaseSchema.md)
- [architectureOverview.md](./architectureOverview.md)
- [securityAndCompliance.md](./securityAndCompliance.md)
- [testingStrategy.md](./testingStrategy.md)
