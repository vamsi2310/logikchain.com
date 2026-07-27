# Third-Party Integration

## Purpose

List and specify external services LogikChain depends on for payments, maps, messaging, and notifications.

## Scope

- Payment gateway
- Maps integration
- SMS (Twilio)
- Push notifications (Firebase Cloud Messaging)
- WhatsApp (WhatsApp Business API)

## Status

Draft

## Content

### Integration inventory

| Integration | Provider / technology | Purpose | Status |
|-------------|----------------------|---------|--------|
| Payment Gateway | **TBD** | Accept and process payments | Draft — provider not named |
| Maps | **TBD** | Location / mapping features | Draft — provider not named |
| SMS | Twilio | SMS messaging | Identified |
| Push notifications | Firebase Cloud Messaging (FCM) | App / device notifications | Identified |
| WhatsApp | WhatsApp Business API | WhatsApp messaging | Identified |

### Payment Gateway

- Provider: **TBD**
- Flows covered (collect, refund, settlement): **TBD**
- Credentials and environment keys: see deployment / security docs when defined

### Maps integration

- Provider: **TBD**
- Usage (routing, geocoding, display): **TBD**
- Aligns with Villages `location` and Routes data in [databaseSchema.md](./databaseSchema.md)

### SMS — Twilio

- Provider: Twilio
- Use cases (OTP, alerts, operational SMS): **TBD**
- Sender / number configuration: **TBD**

### Notifications — Firebase Cloud Messaging

- Provider: Firebase Cloud Messaging
- Target platforms (Android / iOS / web): **TBD**
- Topic vs device-token strategy: **TBD**

### WhatsApp — WhatsApp Business API

- Provider: WhatsApp Business API
- Message types and templates: **TBD**
- Opt-in / compliance constraints: see [securityAndCompliance.md](./securityAndCompliance.md)

## Open Items

- [ ] Name payment gateway provider
- [ ] Name maps provider
- [ ] Document credentials storage and rotation
- [ ] Define failure / retry behavior per integration
- [ ] Map each integration to use cases and flows

## Related Documents

- [Specification.md](./Specification.md)
- [Flows.md](./Flows.md)
- [useCases.md](./useCases.md)
- [securityAndCompliance.md](./securityAndCompliance.md)
- [deploymentSpec.md](./deploymentSpec.md)
- [financialSpec.md](./financialSpec.md)
