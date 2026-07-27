# API Specification

## Purpose

Define LogikChain API contracts so clients and services share consistent data formats, authentication, endpoints, and error handling for REST and WebSocket.

## Scope

- Data formats
- Authentication methods
- Endpoint definitions (resource areas from product flows)
- Request and response shapes
- REST APIs
- WebSocket communication
- Error handling protocols
- Standard HTTP status codes
- Consistent JSON structures (REST and WebSocket)
- API versioning

## Status

Draft

## Content

### Data formats

- JSON is the standard payload format for REST and WebSocket messages.
- Structures must be consistent across REST responses and WebSocket events.

### Authentication methods

- Supported modes (from security constitution): **Google login**, **phone login**
- How credentials or tokens are passed on REST and WebSocket: **TBD**
- Disabled users must be rejected (blocked from platform)

### Endpoint definitions

Concrete paths **TBD**. Required resource areas from use cases / flows:

#### Distributor

| Area | Operations (conceptual) |
|------|-------------------------|
| Inventory | Add / manage inventory |
| Drivers | Add driver under distributor |
| Villages | Add villages |
| Routes | Add routes |
| Pamphlet / Catalog | Create product catalog pamphlet |
| Gigs | Create gig (delivery and/or pickup stops); start gig; assign driver; issue OTP |

#### Driver

| Area | Operations (conceptual) |
|------|-------------------------|
| Gig handover | Submit OTP; take handover |
| Trip | Start trip |
| Progress | Reach village; reach merchant |
| Delivery | Deliver packages to merchant |
| Pickup | Pick up packages from merchant |

#### Merchant

| Area | Operations (conceptual) |
|------|-------------------------|
| Catalog | View pamphlet / product catalog |
| Cart | Add items |
| Orders | Place order; cancel order; list past orders by distributor |
| Goods | Confirm / record receive goods |
| Dues | List distributors with total dues; dues detail |
| Payments | Make payment |

#### Buyer

| Area | Operations (conceptual) |
|------|-------------------------|
| Auth | Signup (default Buyer role); login (auto-detect role) |
| Villages | List available villages; select/save village preference |
| Live Gigs | List active live gigs with ETAs to buyer's village |
| Catalog | View product catalog of active gig |
| Orders | Place order (only if gig has not reached village); cancel order; view order history |
| Pickup | Confirm package pickup from merchant |

#### Support

| Area | Operations (conceptual) |
|------|-------------------------|
| Users | List; edit (incl. change type); delete; disable; enable |
| Distributors | View; edit associations (add village, merchant, driver; more TBD) |
| Drivers | View; view driver's gigs |
| Merchants | View; view dues to each distributor |

#### WebSocket / real-time events (conceptual)

| Event | Direction | Notes |
|-------|-----------|-------|
| Gig initiation | server → merchant | |
| Gig started | server → merchant | |
| Gig reached your village | server → merchant | |
| Gig reaching in n minutes | server → merchant | ETA |
| Gig reached | server → merchant | |
| Products delivered | server → merchant | Delivery stop |
| Products picked up | server → merchant | Pickup stop |
| Location / trip progress | driver → server → subscribers | Aligns with live tracking |

### Request and response

- Every REST endpoint documents request body, query/path params, and response body.
- WebSocket messages document event type, payload, and direction (client → server / server → client).

### REST APIs

- Standard request and response conventions apply to all REST endpoints.
- Use standard HTTP status codes (success, client error, server error).

### WebSocket

- WebSocket message envelopes use the same JSON conventions as REST where applicable.
- Connection lifecycle, heartbeat, and reconnect behavior: **TBD**
- Used for real-time messaging, location tracking, live catalog/gig status ([architectureOverview.md](./architectureOverview.md))

### Error handling protocols

- Errors return a consistent JSON structure for both REST and WebSocket.
- Error payload fields (code, message, details, correlation id): **TBD**
- Map failures to standard HTTP status codes on REST.
- OTP verification failures must return clear client errors: `OTP_INVALID`, `OTP_EXPIRED`, `OTP_ATTEMPTS_EXCEEDED`, `OTP_RESEND_COOLDOWN` ([securityAndCompliance.md](./securityAndCompliance.md)).

### API versioning

- Versioning strategy (URL path, header, or other): **TBD**
- Deprecation and compatibility rules: **TBD**

## Open Items

- [ ] Choose token/session model for Google and phone login
- [ ] Catalog exact REST paths and WebSocket event payloads
- [ ] Finalize shared JSON error schema
- [ ] Decide API versioning scheme
- [ ] Document WebSocket connection lifecycle
- [x] OTP verify/resend policy — **5 attempts / 10 min / 3 regenerations** (see security constitution); exact paths still TBD
- [ ] Specify OTP request/verify endpoint paths and payloads

## Related Documents

- [architectureOverview.md](./architectureOverview.md)
- [databaseSchema.md](./databaseSchema.md)
- [securityAndCompliance.md](./securityAndCompliance.md)
- [thirdPartyIntegration.md](./thirdPartyIntegration.md)
- [Flows.md](./Flows.md)
- [useCases.md](./useCases.md)
- [uiAndNavigation.md](./uiAndNavigation.md)
