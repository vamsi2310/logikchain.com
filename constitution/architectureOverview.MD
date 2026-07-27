# Architecture Overview

## Purpose

Describe LogikChain system context, major components, and how they interact.

## Scope

- System context and actors
- Application / service components
- Data store
- Real-time and HTTP communication
- External integrations
- Core domain: gigs, catalog, orders, dues

## Status

Draft

## Content

### System context

LogikChain is a logistics / distribution platform. Distributors set up inventory, drivers, villages, and routes; publish product catalogs; and run **gigs** that may include **deliveries**, **pickups**, or both. Drivers take gig handover via **OTP**, run trips through villages, and deliver to and/or pick up from merchants. Merchants receive gig notifications, order from catalogs, track **dues** per distributor, and pay. Support administers users and entity associations.

Data is rooted in Firebase Realtime Database, exposed via REST and WebSocket APIs, and integrated with payments, maps, SMS, push notifications, and WhatsApp.

### Actors (from data model)

| Actor | Primary responsibilities |
|-------|--------------------------|
| Support | Users (view/edit type/delete/disable/enable); view/edit distributors; view drivers and gigs; view merchants and dues |
| Distributor | Inventory, drivers, villages, routes; pamphlet/catalog; create/start gigs; assign driver with OTP |
| Merchant | Gig notifications; catalog/cart/order; receive goods / hand over pickups; dues and past orders; cancel order; pay |
| Driver | OTP handover; start trip; reach village/merchant; deliver and/or pick up packages |
| Buyer | Present in model; responsibilities TBD |

### Core components (known)

| Component | Role |
|-----------|------|
| Firebase Realtime Database | Primary data store |
| REST APIs | Synchronous HTTP interfaces |
| WebSocket | Real-time messaging, location tracking, live catalog/gig status |
| GeminiAI | AI-related capability (node in database; behavior TBD) |
| Third-party services | Payment, maps, Twilio SMS, FCM, WhatsApp Business API |

### Domain concepts (known)

| Concept | Notes |
|---------|-------|
| Routes | Name, villages, length, round trip time, average revenue |
| Villages | Name, location |
| Inventory | product Name, Price, Supplier; added by distributor |
| Pamphlet / Catalog | Product catalog created by distributor; viewed by merchant |
| Gig | Created/started by distributor; assigned to driver with OTP; trip through villages to merchants; stops may be delivery, pickup, or both |
| OTP | Gig handover verification between distributor assignment and driver acceptance |
| Cart / Order | Merchant shopping and order lifecycle (place, cancel, history) |
| Dues | Merchant total dues against each distributor |
| Packages / delivery | Driver delivers packages to merchant |
| Packages / pickup | Driver picks up packages from merchant |
| Event log | System / domain event recording |
| services | Name (from earlier notes; usage TBD) |

### High-level diagram

```text
[ Support | Distributor | Merchant | Driver apps ]
                    |
              REST + WebSocket
                    |
        [ LogikChain services ] ---- [ GeminiAI ]
                    |
        [ Firebase Realtime Database ]
                    |
        [ Payment | Maps | Twilio/OTP | FCM | WhatsApp ]
```

Component boundaries and deployment topology: **TBD**

## Open Items

- [ ] Document service/module breakdown
- [ ] Clarify client apps (web, mobile) and ownership per actor
- [ ] Define how GeminiAI is used in the architecture
- [ ] Clarify `services` domain concept
- [ ] Environment topology (dev / test / prod)

## Related Documents

- [Specification.md](./Specification.md)
- [databaseSchema.md](./databaseSchema.md)
- [thirdPartyIntegration.md](./thirdPartyIntegration.md)
- [deploymentSpec.md](./deploymentSpec.md)
- [Flows.md](./Flows.md)
- [useCases.md](./useCases.md)
- [securityAndCompliance.md](./securityAndCompliance.md)
