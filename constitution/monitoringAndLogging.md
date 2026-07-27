# Monitoring and Logging

## Purpose

Define how LogikChain is observed in production and lower environments: logs, metrics, alerts, and the domain event log.

## Scope

- Application and API logging
- Domain Event log (database)
- Metrics and health
- Alerting
- Correlation with REST / WebSocket traffic

## Status

Draft

## Content

### Domain event log

- Entity: **Event log** in Firebase Realtime Database ([databaseSchema.md](./databaseSchema.md))
- Intended use: record system or domain events
- High-value events from product flows:
  - Gig: initiation, start, OTP handover, reach village, reach merchant, products delivered, products picked up
  - Orders: place, cancel, receive goods
  - Payments and dues changes
  - Support: user edit/type change/delete/disable/enable; distributor association edits
- Schema, retention, and query patterns: **TBD**

### Application / API logging

- Log what (requests, errors, auth failures, integration calls): **TBD**
- Structured log format aligned with API error JSON ([Specification.md](./Specification.md)): **TBD**
- Correlation / request IDs: **TBD**

### Integration observability

Monitor health and failures for ([thirdPartyIntegration.md](./thirdPartyIntegration.md)):

- Payment gateway
- Maps
- Twilio SMS
- Firebase Cloud Messaging
- WhatsApp Business API

### Metrics and alerts

- Key metrics (latency, error rate, DB connectivity): **TBD**
- Alert channels (email, SMS, push, WhatsApp): **TBD**
- On-call / ownership: **TBD**

## Open Items

- [ ] Finalize Event log schema
- [ ] Choose logging/metrics stack
- [ ] Define SLOs and alert thresholds
- [ ] Document dashboards for profitability vs operational health (see financialSpec)

## Related Documents

- [databaseSchema.md](./databaseSchema.md)
- [Specification.md](./Specification.md)
- [deploymentSpec.md](./deploymentSpec.md)
- [securityAndCompliance.md](./securityAndCompliance.md)
- [thirdPartyIntegration.md](./thirdPartyIntegration.md)
