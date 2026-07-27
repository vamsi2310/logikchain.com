# Architecture Overview

## Purpose

Describe LogikChain system context, major components, and how they interact.

## Scope

- System context and actors
- Application / service components
- Data store
- Real-time and HTTP communication
- External integrations

## Status

Draft

## Content

### System context

LogikChain is a logistics / distribution platform with roles and data rooted in Firebase Realtime Database, exposed via REST and WebSocket APIs, and integrated with payments, maps, SMS, push notifications, and WhatsApp.

### Actors (from data model)


| Actor       | Source                                   |
| ----------- | ---------------------------------------- |
| Support     | [databaseSchema.md](./databaseSchema.md) |
| Distributor | [databaseSchema.md](./databaseSchema.md) |
| Merchant    | [databaseSchema.md](./databaseSchema.md) |
| Driver      | [databaseSchema.md](./databaseSchema.md) |
| Buyer       | [databaseSchema.md](./databaseSchema.md) |




### Core components (known)


| Component                  | Role                                                         |
| -------------------------- | ------------------------------------------------------------ |
| Firebase Realtime Database | Primary data store                                           |
| REST APIs                  | Synchronous HTTP interfaces                                  |
| WebSocket                  | Real-time messaging, location tracking, live catalog status. |
| GeminiAI                   | AI-related capability (node in database; behavior TBD)       |
| Third-party services       | Payment, maps, Twilio SMS, FCM, WhatsApp Business API        |




### Domain concepts (known)


| Concept   | Notes                                                    |
| --------- | -------------------------------------------------------- |
| Routes    | Name, villages, length, round trip time, average revenue |
| Villages  | Name, location                                           |
| Event log | System / domain event recording                          |
| Inventory | product Name, Price, Supplier                            |
| services  | Name                                                     |




### High-level diagram

```text
[ Clients / Apps ]
        |
   REST + WebSocket
        |
[ LogikChain services ] ---- [ GeminiAI ]
        |
[ Firebase Realtime Database ]
        |
[ Payment | Maps | Twilio | FCM | WhatsApp ]
```

Component boundaries and deployment topology: **TBD**

## Open Items

- [ ] Document service/module breakdown
- [ ] Clarify client apps (web, mobile) and ownership per actor
- [ ] Define how GeminiAI is used in the architecture
- [ ] Environment topology (dev / test / prod)



## Related Documents

- [Specification.md](./Specification.md)
- [databaseSchema.md](./databaseSchema.md)
- [thirdPartyIntegration.md](./thirdPartyIntegration.md)
- [deploymentSpec.md](./deploymentSpec.md)
- [Flows.md](./Flows.md)
- [securityAndCompliance.md](./securityAndCompliance.md)

