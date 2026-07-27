# Flows

## Purpose

Document end-to-end process and interaction flows across LogikChain actors, APIs, and integrations.

## Scope

- Gig lifecycle (create → assign OTP → trip → deliver and/or pick up)
- Merchant notification sequence
- Catalog → cart → order → receive / cancel
- Merchant dues and payment
- Support user and entity administration

## Status

Draft — primary flows captured from product context

## Content

### Flow template

1. **Name**
2. **Actors**
3. **Trigger**
4. **Preconditions**
5. **Steps**
6. **Postconditions**
7. **Errors / alternate paths**
8. **Related entities**

---

### FLOW-01 — Distributor setup (inventory, drivers, villages, routes)

| Field | Content |
|-------|---------|
| Actors | Distributor |
| Trigger | Distributor configures operations |
| Steps | 1. Add inventory 2. Add driver(s) 3. Add village(s) 4. Add route(s) |
| Postconditions | Distributor can create catalog and gigs |
| Related entities | Inventory, Driver, Villages, Routes, Distributor |
| Use cases | UC-D01–UC-D04 |

---

### FLOW-02 — Catalog pamphlet

| Field | Content |
|-------|---------|
| Actors | Distributor; Merchant (consumer) |
| Trigger | Distributor creates pamphlet / product catalog |
| Steps | 1. Distributor creates pamphlet from inventory/catalog 2. Merchants can view pamphlet |
| Postconditions | Catalog available for cart/order |
| Related entities | Pamphlet / Catalog, Inventory |
| Use cases | UC-D05, UC-M02 |

---

### FLOW-03 — Gig lifecycle (create → OTP handover → trip → delivery / pickup)

| Field | Content |
|-------|---------|
| Actors | Distributor, Driver, Merchant |
| Trigger | Distributor creates and starts a gig |
| Preconditions | Setup (FLOW-01) as required; driver available |
| Related entities | Gig, OTP, Driver, Routes, Villages, Merchant, packages; stop type (delivery / pickup) |
| Use cases | UC-D06, UC-D07, UC-R01–UC-R06, UC-M01, UC-M05, UC-M05b |

**Steps**

1. Distributor creates a new gig (stops may be **delivery**, **pickup**, or a mix)
2. Distributor starts the gig and assigns it to a driver with OTP verification
3. Driver submits OTP and takes gig handover
4. Driver starts the trip → merchants notified (**gig started**)
5. Driver reaches a village → merchants notified (**gig reached your village**; **gig reaching in n minutes** as applicable)
6. Driver reaches a merchant → merchant notified (**gig reached**)
7. At the merchant stop, driver completes the stop action:
   - **Delivery:** deliver packages → merchant notified (**products delivered**); merchant receives goods
   - **Pickup:** pick up packages → merchant notified (**products picked up**); merchant hands over goods

**Merchant notification timeline** (also FLOW-04)

| Step | Notification |
|------|----------------|
| Gig initiated / started by distributor | Gig initiation |
| Driver starts trip | Gig started |
| Approaching / at village | Gig reached your village; Gig reaching in n minutes |
| At merchant | Gig reached |
| Packages handed to merchant | Products delivered |
| Packages collected from merchant | Products picked up |

**Errors / alternate paths (OTP)** — policy in [securityAndCompliance.md](./securityAndCompliance.md):

| Condition | System behavior |
|-----------|-----------------|
| Wrong OTP | Increment attempt count; return `OTP_INVALID` |
| 5 failed attempts | Invalidate OTP (`OTP_ATTEMPTS_EXCEEDED`); distributor must re-issue |
| Past 10 minutes | Invalidate (`OTP_EXPIRED`); distributor must re-issue |
| Regenerate | New OTP; old invalid; max 3 regenerations; 60s cooldown (`OTP_RESEND_COOLDOWN`) |
| Success | Consume OTP; handover complete; audit event |

Other errors: gig cancel/reassign, failed delivery/pickup — **TBD**

```text
Distributor                Driver                 Merchant
    |                        |                       |
    |-- create gig --------->|                       |
    |   (delivery/pickup)    |                       |
    |-- start + assign OTP ->|                       |
    |                        |                       |
    |                   give OTP / handover          |
    |                        |-- start trip -------->| notify: gig started
    |                        |-- reach village ----->| notify: village / ETA
    |                        |-- reach merchant ---->| notify: gig reached
    |                        |-- deliver OR pickup ->| notify: delivered / picked up
```
---

### FLOW-04 — Merchant gig notifications

| Field | Content |
|-------|---------|
| Actors | System → Merchant |
| Trigger | Gig state changes in FLOW-03 |
| Steps | Emit: initiation, started, reached village, reaching in n minutes, reached, products delivered, products picked up |
| Channel | FCM / SMS / WhatsApp — **TBD** |
| Use cases | UC-M01 |

---

### FLOW-05 — Merchant order (catalog → cart → order → receive / cancel)

| Field | Content |
|-------|---------|
| Actors | Merchant, Driver (fulfillment), Distributor (catalog) |
| Trigger | Merchant browses catalog |
| Related entities | Catalog, Cart, Order |
| Use cases | UC-M02–UC-M05, UC-M08 |

**Steps**

1. Merchant views pamphlet / product catalog
2. Merchant adds items to cart
3. Merchant places order
4. Merchant receives goods (after driver delivery) or hands over goods (after driver pickup), **or**
5. Merchant cancels order (rules **TBD**)

---

### FLOW-06 — Merchant dues and payment

| Field | Content |
|-------|---------|
| Actors | Merchant; Payment gateway |
| Trigger | Merchant reviews financial position or pays |
| Related entities | Dues, Order history, Payment |
| Use cases | UC-M06, UC-M07, UC-M09 |

**Steps**

1. Merchant sees all distributors with **total dues** against each distributor
2. Merchant opens a distributor and sees all **past orders**
3. Merchant makes a payment
4. Dues update rules after payment — **TBD**

---

### FLOW-07 — Support user administration

| Field | Content |
|-------|---------|
| Actors | Support |
| Trigger | Support manages platform users |
| Related entities | Users, user type, enable/disable flag |
| Use cases | UC-S01–UC-S05 |

**Steps**

1. View all users
2. Edit user (including change type)
3. Delete user
4. Disable user → blocked from platform
5. Enable user → unblocked on platform

Aligns with users table + type + collection reference ([securityAndCompliance.md](./securityAndCompliance.md)).

---

### FLOW-08 — Support entity oversight

| Field | Content |
|-------|---------|
| Actors | Support |
| Trigger | Support inspects or edits operational entities |
| Use cases | UC-S06–UC-S11 |

**Steps**

1. View a distributor
2. Edit distributor associations:
   - Add village to distributor
   - Add merchant to distributor
   - Add driver to distributor
   - Further edits **TBD**
3. View a driver
4. View a driver's gigs
5. View a merchant
6. View the merchant's dues to each distributor

---

## Open Items

- [ ] OTP delivery channel (expiry/attempts policy set in securityAndCompliance)
- [ ] Gig cancel / reassign / failed delivery or pickup paths
- [ ] How mixed delivery+pickup gigs are sequenced and inventoried
- [ ] Order cancel eligibility windows
- [ ] How “reaching in n minutes” is computed (maps / GPS)
- [ ] Whether ordering is only during an active village gig visit
- [ ] Map flows to REST / WebSocket events ([Specification.md](./Specification.md))

## Related Documents

- [useCases.md](./useCases.md)
- [Specification.md](./Specification.md)
- [databaseSchema.md](./databaseSchema.md)
- [thirdPartyIntegration.md](./thirdPartyIntegration.md)
- [architectureOverview.md](./architectureOverview.md)
- [financialSpec.md](./financialSpec.md)
