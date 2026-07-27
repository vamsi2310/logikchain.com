# Security and Compliance

## Purpose

Define security controls and compliance expectations for LogikChain APIs, data, and third-party integrations.

## Scope

- Authentication and authorization
- User lifecycle (type change, delete, disable/enable)
- Data protection (Firebase Realtime Database)
- Secrets and third-party credentials
- OTP for gig handover
- Messaging compliance (SMS, WhatsApp, push)
- Audit via event logging

## Status

Draft

## Content

### Authentication and authorization

- Supported modes of authentication: **Google login**, **phone login**
- When any new user is signed up, the **users** table gets a new entry; **user type** defaults to `Buyer` and corresponding **collection reference** is set to `/Buyers/{uid}`. These are kept up to date in the users table.
- Users cannot switch roles. The role is auto-detected upon authentication based on their `user type` in the `Users` table.
- API token/session details: see [Specification.md](./Specification.md) (TBD)
- Role-based access: Support, Distributor, Merchant, Driver, Buyer
- Firebase security rules: **TBD**

### User administration (Support)

| Action | Effect |
|--------|--------|
| View all users | Support lists platform users |
| Edit user / change type | Updates user record and type (collection reference must stay consistent) |
| Delete user | Removes user |
| Disable user | User is **blocked from the platform** |
| Enable user | User is **unblocked on the platform** |

Disabled users must not authenticate or call protected APIs.

### Distributor graph edits (Support)

Support may edit a distributor by:

- Adding a village to a distributor
- Adding a merchant to a distributor
- Adding a driver to a distributor
- Additional edit actions: **TBD**

Access control must ensure only Support (or authorized roles) can perform these associations.

### OTP (gig handover)

- Distributor starts gig and assigns driver with OTP verification
- Driver submits OTP to take handover
- Delivery channel: see [thirdPartyIntegration.md](./thirdPartyIntegration.md)

#### Recommendation (baseline policy)

Gig handover OTPs protect a **physical custody transfer**, not account login. Policy balances field usability (driver may need a short window to open the app) with brute-force resistance.

| Control | Recommended value | Rationale |
|---------|-------------------|-----------|
| Code format | 6-digit numeric, cryptographically random | ~1M space; easy to read aloud at handover |
| Storage | Store **hash only** (e.g. SHA-256 of `otp + gigId + salt`); never log plaintext | Limits breach impact |
| Expiry | **10 minutes** from issue (or last regenerate) | Enough for yard handover; short enough to limit guessing window |
| Max verify attempts | **5 failed attempts** per issued OTP | Stops online guessing; common SMS-OTP practice |
| On attempt exhaustion | Invalidate OTP; gig stays **assigned but not handed over**; distributor must **re-issue** a new OTP | Clear recovery path; no silent unlock |
| On expiry | OTP invalid; same recovery — distributor re-issues | No late acceptance of stale codes |
| Regenerate / resend | Max **3** regenerations per gig assignment; **60s** cooldown between regenerations; each new code **invalidates** the previous | Limits SMS abuse; only one active code |
| Verify rate limit | Also throttle by driver account (e.g. 10 verify calls / minute) | Defense in depth beyond attempt counter |
| Success | Mark OTP consumed (single use); complete handover; audit event | Prevent replay |
| Error responses | Distinct client errors: `OTP_INVALID`, `OTP_EXPIRED`, `OTP_ATTEMPTS_EXCEEDED`, `OTP_RESEND_COOLDOWN` — do not reveal whether the code was “close” | Safer UX/API |

**Approach summary**

1. Issue OTP when distributor starts/assigns the gig; start the 10-minute clock.
2. Driver verifies; each failure increments `attemptCount`.
3. At 5 failures or after expiry → OTP dead; require distributor re-issue (counts toward regenerate cap).
4. Successful verify → one-time consume, handover complete, write audit/event log.

Optional later hardening (not required for v1): progressive delay after failure 3+, bind OTP to assigned `driverId` only, shorter expiry (5 min) if delivery is always in-app display (no SMS lag).

#### Status

**Recommended — adopt as constitution default** unless product chooses a documented exception (e.g. 15-minute expiry for sparse rural coverage).

### Data protection

- Primary store: Firebase Realtime Database ([databaseSchema.md](./databaseSchema.md))
- Environment separation: Development URL known; Test and Production URLs TBD
- Encryption in transit / at rest expectations: **TBD**
- PII handling (Buyers, Merchants, Drivers, etc.): **TBD**
- Financial data (dues, orders, payments) requires restricted access by role

### Secrets and integrations

Integrations that require secured credentials ([thirdPartyIntegration.md](./thirdPartyIntegration.md)):

- Payment gateway
- Maps provider
- Twilio (SMS / OTP candidate)
- Firebase Cloud Messaging
- WhatsApp Business API

Credential storage and rotation: **TBD** (see also [deploymentSpec.md](./deploymentSpec.md))

### Messaging and notification compliance

- SMS (Twilio): consent / opt-out rules **TBD**
- WhatsApp Business API: template and opt-in rules **TBD**
- Push (FCM): device permission and data minimization **TBD**
- Merchant gig notifications must only target relevant merchants (village / assignment scoped) — exact targeting rules **TBD**

### Audit and event log

- Event log entity exists in the database schema
- Recommended audit events:
  - Support user edit / type change / delete / disable / enable
  - Gig start, OTP handover, delivery, pickup
  - Order place / cancel
  - Payments
  - Auth failures
- Retention: **TBD**

## Open Items

- [ ] Define Firebase security rules per role
- [ ] Document secret management
- [x] OTP attempt limits and expiry — **recommended:** 5 attempts, 10 min expiry, 3 regenerations / 60s cooldown (see OTP section)
- [ ] Confirm OTP delivery channel (SMS vs in-app vs WhatsApp)
- [ ] List compliance regimes if applicable (e.g. regional privacy)
- [ ] Specify mandatory audit event schema

## Related Documents

- [Specification.md](./Specification.md)
- [databaseSchema.md](./databaseSchema.md)
- [thirdPartyIntegration.md](./thirdPartyIntegration.md)
- [deploymentSpec.md](./deploymentSpec.md)
- [monitoringAndLogging.md](./monitoringAndLogging.md)
- [useCases.md](./useCases.md)
- [Flows.md](./Flows.md)
- [uiAndNavigation.md](./uiAndNavigation.md)
