# Third-Party Integration

## Purpose

List and specify external services LogikChain depends on for payments, maps, messaging, notifications, and OTP.

## Scope

- Payment gateway
- Maps integration
- SMS (Twilio)
- Push notifications (Firebase Cloud Messaging)
- WhatsApp (WhatsApp Business API)
- OTP for gig handover
- Merchant gig lifecycle notifications

## Status

Draft

## Content

### Integration inventory

| Integration | Provider / technology | Purpose | Status |
|-------------|----------------------|---------|--------|
| Payment Gateway | **TBD** | Merchant payments / dues settlement | Draft — provider not named |
| Maps | **TBD** | Location / routing; ETA (“reaching in n minutes”) | Draft — provider not named |
| SMS | Twilio | SMS messaging; candidate for OTP | Identified |
| Push notifications | Firebase Cloud Messaging (FCM) | Merchant gig notifications and alerts | Identified |
| WhatsApp | WhatsApp Business API | Messaging; candidate for notifications | Identified |

### Payment Gateway

- Provider: **TBD**
- Flows covered: merchant makes payment (collect); refund/settlement **TBD**
- Tied to merchant dues and order history ([financialSpec.md](./financialSpec.md))
- Credentials: see deployment / security docs when defined

### Maps integration

- Provider: **TBD**
- Usage: village/merchant location; trip progress; ETA for **gig reaching in n minutes**
- Aligns with Villages `location` and Routes ([databaseSchema.md](./databaseSchema.md))

### SMS — Twilio

- Provider: Twilio
- Use cases:
  - Candidate channel for **gig handover OTP**
  - Operational / alert SMS **TBD**
- Sender / number configuration: **TBD**

### Notifications — Firebase Cloud Messaging

- Provider: Firebase Cloud Messaging
- Primary use: **merchant gig lifecycle notifications**

| Notification | Trigger |
|--------------|---------|
| Gig initiation | Gig created / initiated |
| Gig started | Driver starts trip |
| Gig reached your village | Driver reaches merchant's village |
| Gig reaching in n minutes | ETA before arrival |
| Gig reached | Driver reaches merchant |
| Products delivered | Packages delivered (delivery stop) |
| Products picked up | Packages picked up (pickup stop) |

- Target platforms (Android / iOS / web): **TBD**
- Topic vs device-token strategy: **TBD**

### WhatsApp — WhatsApp Business API

- Provider: WhatsApp Business API
- Candidate channel for merchant notifications and/or OTP — **TBD**
- Message types and templates: **TBD**
- Opt-in / compliance: see [securityAndCompliance.md](./securityAndCompliance.md)

### OTP — gig handover

| Item | Notes |
|------|-------|
| Flow | Distributor starts gig and assigns driver → Driver submits OTP → handover |
| Delivery channel | SMS (Twilio), in-app, WhatsApp — **TBD** |
| Expiry / attempts | Per [securityAndCompliance.md](./securityAndCompliance.md): **10 min** expiry, **5** failed attempts, **3** regenerations with **60s** cooldown |
| Related flows | [Flows.md](./Flows.md) FLOW-03; UC-D07, UC-R01 |

## Open Items

- [ ] Name payment gateway provider
- [ ] Name maps provider
- [ ] Decide OTP delivery channel (expiry/attempts policy adopted in security constitution)
- [ ] Decide which merchant notifications go to FCM vs SMS vs WhatsApp
- [ ] Document credentials storage and rotation
- [ ] Define failure / retry behavior per integration

## Related Documents

- [Specification.md](./Specification.md)
- [Flows.md](./Flows.md)
- [useCases.md](./useCases.md)
- [securityAndCompliance.md](./securityAndCompliance.md)
- [deploymentSpec.md](./deploymentSpec.md)
- [financialSpec.md](./financialSpec.md)
