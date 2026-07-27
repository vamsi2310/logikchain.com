# Use Cases

## Purpose

Capture actor-driven use cases for LogikChain so product and engineering share a common functional baseline.

## Scope

- Actors identified in the data model
- Use cases derived from [Flows.md](./Flows.md) (FLOW-01–FLOW-09)
- Cross-cutting cases (notifications, OTP handover, payments, dues)

## Status

Draft — aligned to documented flows; each use case follows the shared template

## Content

### Actors

| Actor | Description |
|-------|-------------|
| Support | Platform administration: users, distributors, drivers, merchants |
| Distributor | Owns inventory, drivers, villages, routes; creates catalogs and gigs |
| Merchant | Receives gig notifications; browses catalog; orders; pays; tracks dues |
| Driver | Accepts gig handover via OTP; runs trip; delivers to and/or picks up from merchants |
| Buyer | Mobile-centric buyer: signup, login, choose village, browse active gigs, browse catalog, place order (pre-arrival), pickup package from merchant |

### Use case template

Every use case below uses this structure:

| Field | Content |
|-------|---------|
| ID | UC-xxx |
| Name | Short title |
| Actor(s) | Primary and secondary |
| Goal | What the actor achieves |
| Preconditions | Required state |
| Main flow | Steps |
| Alternate / exception flows | Variants |
| Related data | Entities / fields |
| Related APIs / integrations | Links |

### Flow → use case map

| Flow | Use cases |
|------|-----------|
| FLOW-01 Distributor setup | UC-D01, UC-D02, UC-D03, UC-D04 |
| FLOW-02 Catalog pamphlet | UC-D05, UC-M02 |
| FLOW-03 Gig lifecycle | UC-D06, UC-D07, UC-R01–UC-R06, UC-M01, UC-M05, UC-M05b |
| FLOW-04 Merchant gig notifications | UC-M01 |
| FLOW-05 Merchant order | UC-M02, UC-M03, UC-M04, UC-M05, UC-M08 |
| FLOW-06 Merchant dues and payment | UC-M06, UC-M07, UC-M09 |
| FLOW-07 Support user administration | UC-S01–UC-S05 |
| FLOW-08 Support entity oversight | UC-S06–UC-S11 |
| FLOW-09 Buyer signup / order / pickup | UC-B01, UC-B02, UC-B03, UC-B04, UC-B05, UC-B06 |

---

### Use cases by actor

#### Distributor

##### UC-D01 — Add inventory

| Field | Content |
|-------|---------|
| ID | UC-D01 |
| Name | Add inventory |
| Actor(s) | Distributor |
| Goal | Add inventory available for catalog and gigs |
| Preconditions | Distributor is authenticated and enabled |
| Main flow | 1. Open inventory management 2. Enter product details (Name, Price, Supplier) 3. Save inventory item |
| Alternate / exception flows | Validation failure → correct and retry; disabled user → blocked |
| Related data | Inventory, Distributor |
| Related APIs / integrations | FLOW-01; [databaseSchema.md](./databaseSchema.md); [Specification.md](./Specification.md) Distributor Inventory |

##### UC-D02 — Add driver

| Field | Content |
|-------|---------|
| ID | UC-D02 |
| Name | Add driver |
| Actor(s) | Distributor |
| Goal | Associate a driver with the distributor |
| Preconditions | Distributor authenticated and enabled; driver identity available |
| Main flow | 1. Open drivers 2. Add driver under distributor 3. Save association |
| Alternate / exception flows | Duplicate driver → reject or merge (**TBD**); disabled user → blocked |
| Related data | Driver, Distributor |
| Related APIs / integrations | FLOW-01; [Specification.md](./Specification.md) Distributor Drivers |

##### UC-D03 — Add villages

| Field | Content |
|-------|---------|
| ID | UC-D03 |
| Name | Add villages |
| Actor(s) | Distributor |
| Goal | Define villages served by the distributor |
| Preconditions | Distributor authenticated and enabled |
| Main flow | 1. Open villages 2. Add village (Name, location) 3. Save |
| Alternate / exception flows | Invalid location → reject; disabled user → blocked |
| Related data | Villages, Distributor |
| Related APIs / integrations | FLOW-01; maps provider (**TBD**); [databaseSchema.md](./databaseSchema.md) |

##### UC-D04 — Add routes

| Field | Content |
|-------|---------|
| ID | UC-D04 |
| Name | Add routes |
| Actor(s) | Distributor |
| Goal | Define routes used for gigs |
| Preconditions | Distributor authenticated; villages exist as needed (UC-D03) |
| Main flow | 1. Open routes 2. Set Name, Villages[], length, round trip time, average Revenue 3. Save |
| Alternate / exception flows | Empty villages list → reject (**TBD**); disabled user → blocked |
| Related data | Routes, Villages, Distributor |
| Related APIs / integrations | FLOW-01; [databaseSchema.md](./databaseSchema.md) |

##### UC-D05 — Create pamphlet / product catalog

| Field | Content |
|-------|---------|
| ID | UC-D05 |
| Name | Create pamphlet / product catalog |
| Actor(s) | Distributor; Merchant (consumer via UC-M02) |
| Goal | Publish a product catalog pamphlet merchants can view |
| Preconditions | Inventory available (UC-D01 / FLOW-01) as required |
| Main flow | 1. Select inventory/catalog items 2. Create pamphlet / product catalog 3. Publish for merchants |
| Alternate / exception flows | Empty catalog → reject (**TBD**) |
| Related data | Pamphlet / Catalog, Inventory |
| Related APIs / integrations | FLOW-02; [Specification.md](./Specification.md) Pamphlet / Catalog |

##### UC-D06 — Create gig

| Field | Content |
|-------|---------|
| ID | UC-D06 |
| Name | Create gig |
| Actor(s) | Distributor |
| Goal | Create a new gig with delivery and/or pickup stops |
| Preconditions | FLOW-01 setup as required; driver available later for start; route/villages as needed |
| Main flow | 1. Create gig 2. Define stops (delivery, pickup, or mix) 3. Link route / villages / packages as required 4. Save gig |
| Alternate / exception flows | Incomplete stop definition → reject (**TBD**) |
| Related data | Gig, Routes, Villages, packages; stop type (delivery / pickup) |
| Related APIs / integrations | FLOW-03; [Specification.md](./Specification.md) Gigs |

##### UC-D07 — Start gig and assign driver (OTP)

| Field | Content |
|-------|---------|
| ID | UC-D07 |
| Name | Start gig and assign driver (OTP) |
| Actor(s) | Distributor (primary); Driver (secondary, verifies later) |
| Goal | Start the gig, assign a driver, and issue OTP for handover |
| Preconditions | Gig created (UC-D06); driver available under distributor |
| Main flow | 1. Distributor starts the gig 2. Assigns gig to a driver 3. System issues OTP 4. Merchants may receive **gig initiation** (UC-M01 / FLOW-04) |
| Alternate / exception flows | No driver → cannot start; regenerate OTP (max 3, 60s cooldown); OTP expiry 10 min — see [securityAndCompliance.md](./securityAndCompliance.md) |
| Related data | Gig, Driver, OTP |
| Related APIs / integrations | FLOW-03; OTP channel **TBD** ([thirdPartyIntegration.md](./thirdPartyIntegration.md)); FCM/SMS/WhatsApp for initiation |

---

#### Driver

##### UC-R01 — Gig handover with OTP

| Field | Content |
|-------|---------|
| ID | UC-R01 |
| Name | Gig handover with OTP |
| Actor(s) | Driver; Distributor (re-issue if needed) |
| Goal | Submit OTP and take custody of the gig |
| Preconditions | Gig started and assigned; OTP issued (UC-D07) |
| Main flow | 1. Driver enters OTP 2. System verifies 3. OTP consumed 4. Handover complete; driver owns active gig |
| Alternate / exception flows | `OTP_INVALID` (attempt++); `OTP_ATTEMPTS_EXCEEDED` (5 fails → invalidate, distributor re-issues); `OTP_EXPIRED` (10 min); `OTP_RESEND_COOLDOWN` |
| Related data | Gig, OTP, Driver |
| Related APIs / integrations | FLOW-03; [securityAndCompliance.md](./securityAndCompliance.md); [Specification.md](./Specification.md) Gig handover |

##### UC-R02 — Start trip

| Field | Content |
|-------|---------|
| ID | UC-R02 |
| Name | Start trip |
| Actor(s) | Driver; Merchant (notified) |
| Goal | Begin the gig trip after handover |
| Preconditions | Handover complete (UC-R01) |
| Main flow | 1. Driver starts trip 2. System updates gig status 3. Merchants notified **gig started** (UC-M01) |
| Alternate / exception flows | Trip start before handover → reject |
| Related data | Gig, Driver |
| Related APIs / integrations | FLOW-03, FLOW-04; notifications |

##### UC-R03 — Reach village

| Field | Content |
|-------|---------|
| ID | UC-R03 |
| Name | Reach village |
| Actor(s) | Driver; Merchant (notified) |
| Goal | Record arrival at a village on the route |
| Preconditions | Trip started (UC-R02) |
| Main flow | 1. Driver reaches village 2. System records progress 3. Merchants in village notified **gig reached your village**; optionally **gig reaching in n minutes** |
| Alternate / exception flows | ETA calculation / channel **TBD** |
| Related data | Gig, Villages, Merchant |
| Related APIs / integrations | FLOW-03, FLOW-04; maps (**TBD**) |

##### UC-R04 — Reach merchant

| Field | Content |
|-------|---------|
| ID | UC-R04 |
| Name | Reach merchant |
| Actor(s) | Driver; Merchant (notified) |
| Goal | Record arrival at a merchant stop |
| Preconditions | Trip in progress; merchant is a stop on the gig |
| Main flow | 1. Driver reaches merchant 2. System records arrival 3. Merchant notified **gig reached** |
| Alternate / exception flows | Wrong merchant / out of sequence — **TBD** |
| Related data | Gig, Merchant, stop |
| Related APIs / integrations | FLOW-03, FLOW-04 |

##### UC-R05 — Deliver packages

| Field | Content |
|-------|---------|
| ID | UC-R05 |
| Name | Deliver packages |
| Actor(s) | Driver; Merchant (receives goods) |
| Goal | Complete a **delivery** stop by delivering packages to the merchant |
| Preconditions | Driver at merchant (UC-R04); stop type = delivery |
| Main flow | 1. Driver delivers packages 2. System marks delivery complete 3. Merchant notified **products delivered** 4. Merchant receives goods (UC-M05) |
| Alternate / exception flows | Failed / partial delivery — **TBD** |
| Related data | Gig stop (delivery), packages, Merchant |
| Related APIs / integrations | FLOW-03, FLOW-04, FLOW-05 |

##### UC-R06 — Pick up packages

| Field | Content |
|-------|---------|
| ID | UC-R06 |
| Name | Pick up packages |
| Actor(s) | Driver; Merchant (hands over goods) |
| Goal | Complete a **pickup** stop by collecting packages from the merchant |
| Preconditions | Driver at merchant (UC-R04); stop type = pickup |
| Main flow | 1. Merchant hands over goods (UC-M05b) 2. Driver picks up packages 3. System marks pickup complete 4. Merchant notified **products picked up** |
| Alternate / exception flows | Failed / partial pickup — **TBD**; same gig may mix delivery and pickup stops |
| Related data | Gig stop (pickup), packages, Merchant |
| Related APIs / integrations | FLOW-03, FLOW-04 |

---

#### Merchant

##### UC-M01 — Receive gig notifications

| Field | Content |
|-------|---------|
| ID | UC-M01 |
| Name | Receive gig notifications |
| Actor(s) | Merchant; System |
| Goal | Stay informed through the gig lifecycle |
| Preconditions | Merchant relevant to gig (village / assignment scoped — rules **TBD**); notifications enabled |
| Main flow | System emits and merchant receives: gig initiation; gig started; gig reached your village; gig reaching in n minutes; gig reached; products delivered; products picked up |
| Alternate / exception flows | Channel unavailable → fallback **TBD**; muted / disabled merchant → no delivery |
| Related data | Gig events, Merchant |
| Related APIs / integrations | FLOW-03, FLOW-04; FCM / SMS / WhatsApp ([thirdPartyIntegration.md](./thirdPartyIntegration.md)) |

##### UC-M02 — View pamphlet / product catalog

| Field | Content |
|-------|---------|
| ID | UC-M02 |
| Name | View pamphlet / product catalog |
| Actor(s) | Merchant; Distributor (publisher) |
| Goal | View distributor pamphlet or product catalog |
| Preconditions | Catalog published (UC-D05 / FLOW-02); merchant authenticated and enabled |
| Main flow | 1. Merchant opens catalog 2. Views pamphlet / product catalog |
| Alternate / exception flows | No catalog for distributor → empty state |
| Related data | Pamphlet / Catalog |
| Related APIs / integrations | FLOW-02, FLOW-05 |

##### UC-M03 — Add items to cart

| Field | Content |
|-------|---------|
| ID | UC-M03 |
| Name | Add items to cart |
| Actor(s) | Merchant |
| Goal | Add catalog items to the cart |
| Preconditions | Catalog visible (UC-M02) |
| Main flow | 1. Select items 2. Add to cart 3. Cart updated |
| Alternate / exception flows | Out-of-stock / invalid item — **TBD** |
| Related data | Cart, Catalog items |
| Related APIs / integrations | FLOW-05 |

##### UC-M04 — Place order

| Field | Content |
|-------|---------|
| ID | UC-M04 |
| Name | Place order |
| Actor(s) | Merchant; Distributor (counterparty) |
| Goal | Place an order from the cart |
| Preconditions | Cart has items (UC-M03) |
| Main flow | 1. Review cart 2. Place order 3. Order recorded; may affect dues (**TBD**) |
| Alternate / exception flows | Empty cart → reject; placement failure → retry |
| Related data | Order, Cart, Dues |
| Related APIs / integrations | FLOW-05; [financialSpec.md](./financialSpec.md) |

##### UC-M05 — Receive goods

| Field | Content |
|-------|---------|
| ID | UC-M05 |
| Name | Receive goods |
| Actor(s) | Merchant; Driver |
| Goal | Receive goods after a delivery stop |
| Preconditions | Driver delivered packages (UC-R05); stop type = delivery |
| Main flow | 1. Packages delivered 2. Merchant receives goods 3. Order/fulfillment state updated as applicable |
| Alternate / exception flows | Dispute / short delivery — **TBD** |
| Related data | Order, Gig stop (delivery), Merchant |
| Related APIs / integrations | FLOW-03, FLOW-05 |

##### UC-M05b — Hand over pickup

| Field | Content |
|-------|---------|
| ID | UC-M05b |
| Name | Hand over pickup |
| Actor(s) | Merchant; Driver |
| Goal | Hand over goods for a pickup stop |
| Preconditions | Gig stop is pickup; driver reached merchant (UC-R04) |
| Main flow | 1. Merchant prepares goods 2. Hands over to driver 3. Driver completes pickup (UC-R06) |
| Alternate / exception flows | Goods unavailable — **TBD** |
| Related data | Gig stop (pickup), packages, Merchant |
| Related APIs / integrations | FLOW-03, FLOW-05 |

##### UC-M06 — View distributors and dues

| Field | Content |
|-------|---------|
| ID | UC-M06 |
| Name | View distributors and dues |
| Actor(s) | Merchant |
| Goal | See all distributors with total dues against each |
| Preconditions | Merchant authenticated and enabled |
| Main flow | 1. Open dues view 2. List distributors with total dues each |
| Alternate / exception flows | No dues → empty / zero list |
| Related data | Dues, Distributor, Merchant |
| Related APIs / integrations | FLOW-06; [financialSpec.md](./financialSpec.md) |

##### UC-M07 — View past orders for a distributor

| Field | Content |
|-------|---------|
| ID | UC-M07 |
| Name | View past orders for a distributor |
| Actor(s) | Merchant |
| Goal | Open a distributor and see all past orders |
| Preconditions | Merchant has relationship / history with distributor (or empty list) |
| Main flow | 1. Select distributor (from UC-M06 or list) 2. View past orders |
| Alternate / exception flows | No history → empty list |
| Related data | Order history, Distributor, Merchant |
| Related APIs / integrations | FLOW-06 |

##### UC-M08 — Cancel order

| Field | Content |
|-------|---------|
| ID | UC-M08 |
| Name | Cancel order |
| Actor(s) | Merchant |
| Goal | Cancel a previously placed order |
| Preconditions | Order exists and is cancellable (rules **TBD**) |
| Main flow | 1. Select order 2. Cancel 3. Order status updated; dues impact **TBD** |
| Alternate / exception flows | Past cutoff / after dispatch → reject (**TBD**) |
| Related data | Order |
| Related APIs / integrations | FLOW-05; [financialSpec.md](./financialSpec.md) |

##### UC-M09 — Make payment

| Field | Content |
|-------|---------|
| ID | UC-M09 |
| Name | Make payment |
| Actor(s) | Merchant; Payment gateway |
| Goal | Make a payment toward dues / orders |
| Preconditions | Outstanding dues or payable order (**TBD** rules) |
| Main flow | 1. Review dues / amount 2. Initiate payment 3. Gateway processes 4. Dues update (**TBD**) |
| Alternate / exception flows | Payment failure / partial pay — **TBD** |
| Related data | Payment, Dues, Order |
| Related APIs / integrations | FLOW-06; payment gateway ([thirdPartyIntegration.md](./thirdPartyIntegration.md)); [financialSpec.md](./financialSpec.md) |

---

#### Support

##### UC-S01 — View all users

| Field | Content |
|-------|---------|
| ID | UC-S01 |
| Name | View all users |
| Actor(s) | Support |
| Goal | View all platform users |
| Preconditions | Support authenticated and enabled |
| Main flow | 1. Open users 2. List all users |
| Alternate / exception flows | Unauthorized → reject |
| Related data | Users |
| Related APIs / integrations | FLOW-07; [securityAndCompliance.md](./securityAndCompliance.md) |

##### UC-S02 — Edit user / change type

| Field | Content |
|-------|---------|
| ID | UC-S02 |
| Name | Edit user / change type |
| Actor(s) | Support |
| Goal | Edit a user and change user type |
| Preconditions | User exists (UC-S01) |
| Main flow | 1. Select user 2. Edit fields / change type 3. Keep users table type and collection reference consistent 4. Save |
| Alternate / exception flows | Invalid type → reject |
| Related data | Users (type, collection reference) |
| Related APIs / integrations | FLOW-07; [securityAndCompliance.md](./securityAndCompliance.md) |

##### UC-S03 — Delete user

| Field | Content |
|-------|---------|
| ID | UC-S03 |
| Name | Delete user |
| Actor(s) | Support |
| Goal | Delete a user |
| Preconditions | User exists |
| Main flow | 1. Select user 2. Delete 3. Audit event |
| Alternate / exception flows | Protected / last admin — **TBD** |
| Related data | Users |
| Related APIs / integrations | FLOW-07 |

##### UC-S04 — Disable user

| Field | Content |
|-------|---------|
| ID | UC-S04 |
| Name | Disable user |
| Actor(s) | Support |
| Goal | Disable a user so they are blocked from the platform |
| Preconditions | User exists and is currently enabled |
| Main flow | 1. Select user 2. Disable 3. User blocked from auth / protected APIs |
| Alternate / exception flows | Already disabled → no-op |
| Related data | Users (disabled / blocked flag) |
| Related APIs / integrations | FLOW-07; [securityAndCompliance.md](./securityAndCompliance.md) |

##### UC-S05 — Enable user

| Field | Content |
|-------|---------|
| ID | UC-S05 |
| Name | Enable user |
| Actor(s) | Support |
| Goal | Enable a user so they are unblocked on the platform |
| Preconditions | User exists and is disabled |
| Main flow | 1. Select user 2. Enable 3. User unblocked |
| Alternate / exception flows | Already enabled → no-op |
| Related data | Users (disabled / blocked flag) |
| Related APIs / integrations | FLOW-07; [securityAndCompliance.md](./securityAndCompliance.md) |

##### UC-S06 — View distributor

| Field | Content |
|-------|---------|
| ID | UC-S06 |
| Name | View distributor |
| Actor(s) | Support |
| Goal | View a distributor |
| Preconditions | Support authenticated; distributor exists |
| Main flow | 1. Select distributor 2. View details |
| Alternate / exception flows | Not found → error |
| Related data | Distributor |
| Related APIs / integrations | FLOW-08 |

##### UC-S07 — Edit distributor associations

| Field | Content |
|-------|---------|
| ID | UC-S07 |
| Name | Edit distributor associations |
| Actor(s) | Support |
| Goal | Edit distributor by adding village, merchant, and/or driver |
| Preconditions | Distributor exists (UC-S06) |
| Main flow | 1. Open distributor 2. Add village and/or merchant and/or driver 3. Save associations |
| Alternate / exception flows | Further edit actions **TBD**; duplicate association → reject (**TBD**) |
| Related data | Distributor, Villages, Merchant, Driver |
| Related APIs / integrations | FLOW-08 |

##### UC-S08 — View driver

| Field | Content |
|-------|---------|
| ID | UC-S08 |
| Name | View driver |
| Actor(s) | Support |
| Goal | View a driver |
| Preconditions | Support authenticated; driver exists |
| Main flow | 1. Select driver 2. View details |
| Alternate / exception flows | Not found → error |
| Related data | Driver |
| Related APIs / integrations | FLOW-08 |

##### UC-S09 — View driver's gigs

| Field | Content |
|-------|---------|
| ID | UC-S09 |
| Name | View driver's gigs |
| Actor(s) | Support |
| Goal | View gigs assigned to / executed by a driver |
| Preconditions | Driver exists (UC-S08) |
| Main flow | 1. Open driver 2. List driver's gigs |
| Alternate / exception flows | No gigs → empty list |
| Related data | Driver, Gig |
| Related APIs / integrations | FLOW-08 |

##### UC-S10 — View merchant

| Field | Content |
|-------|---------|
| ID | UC-S10 |
| Name | View merchant |
| Actor(s) | Support |
| Goal | View a merchant |
| Preconditions | Support authenticated; merchant exists |
| Main flow | 1. Select merchant 2. View details |
| Alternate / exception flows | Not found → error |
| Related data | Merchant |
| Related APIs / integrations | FLOW-08 |

##### UC-S11 — View merchant dues

| Field | Content |
|-------|---------|
| ID | UC-S11 |
| Name | View merchant dues |
| Actor(s) | Support |
| Goal | View the merchant's dues to each distributor |
| Preconditions | Merchant exists (UC-S10) |
| Main flow | 1. Open merchant 2. View dues per distributor |
| Alternate / exception flows | No dues → empty / zero list |
| Related data | Dues, Merchant, Distributor |
| Related APIs / integrations | FLOW-08; FLOW-06 (same dues concept as UC-M06); [financialSpec.md](./financialSpec.md) |

---

#### Buyer

##### UC-B01 — Buyer signup

| Field | Content |
|-------|---------|
| ID | UC-B01 |
| Name | Buyer signup |
| Actor(s) | Buyer |
| Goal | Register a new account on the mobile application |
| Preconditions | None |
| Main flow | 1. Open signup screen 2. Enter registration details (Name, Phone/Google credentials) 3. Submit form 4. System creates user record with default type `Buyer` |
| Alternate / exception flows | Validation errors → correct and retry |
| Related data | Users, Buyer |
| Related APIs / integrations | FLOW-09; [databaseSchema.md](./databaseSchema.md) |

##### UC-B02 — Buyer login and role auto-detect

| Field | Content |
|-------|---------|
| ID | UC-B02 |
| Name | Buyer login and role auto-detect |
| Actor(s) | Buyer |
| Goal | Log in and load the role-specific mobile interface |
| Preconditions | User is registered and enabled |
| Main flow | 1. Open login screen 2. Authenticate via Google or Phone 3. System validates credentials 4. System checks `user type` in `Users` table 5. System mounts the Buyer shell and navigation |
| Alternate / exception flows | Disabled user → block access; Invalid credentials → error |
| Related data | Users, Buyer |
| Related APIs / integrations | FLOW-09; [securityAndCompliance.md](./securityAndCompliance.md) |

##### UC-B03 — Choose village

| Field | Content |
|-------|---------|
| ID | UC-B03 |
| Name | Choose village |
| Actor(s) | Buyer |
| Goal | Select a village to filter gigs and catalogs |
| Preconditions | Buyer is logged in |
| Main flow | 1. Open village selection screen 2. Search or browse available villages 3. Select village 4. System saves village preference to Buyer profile |
| Alternate / exception flows | No villages available → empty state |
| Related data | Buyer, Villages |
| Related APIs / integrations | FLOW-09; [uiAndNavigation.md](./uiAndNavigation.md) |

##### UC-B04 — Browse active live gigs

| Field | Content |
|-------|---------|
| ID | UC-B04 |
| Name | Browse active live gigs |
| Actor(s) | Buyer |
| Goal | View in-transit gigs with ETAs to the selected village |
| Preconditions | Buyer is logged in; village is selected (UC-B03) |
| Main flow | 1. Open Home screen 2. View active gigs on route to selected village 3. View estimated time of arrival (ETA) for each gig |
| Alternate / exception flows | No active gigs → empty state |
| Related data | Buyer, Gig, Villages |
| Related APIs / integrations | FLOW-09; [uiAndNavigation.md](./uiAndNavigation.md) |

##### UC-B05 — Place order on catalog

| Field | Content |
|-------|---------|
| ID | UC-B05 |
| Name | Place order on catalog |
| Actor(s) | Buyer |
| Goal | Browse products and place an order before the gig reaches the village |
| Preconditions | Buyer is logged in; village is selected; active gig catalog is published |
| Main flow | 1. Open Catalog screen 2. Browse product pamphlet 3. Add items to cart 4. Place order 5. System verifies gig has *not yet reached* the village 6. Order is recorded and linked to the gig |
| Alternate / exception flows | Gig already reached village → reject order placement; Empty cart → reject |
| Related data | Buyer, Gig, Catalog, Cart, Order |
| Related APIs / integrations | FLOW-09; [databaseSchema.md](./databaseSchema.md) |

##### UC-B06 — Pickup package from merchant

| Field | Content |
|-------|---------|
| ID | UC-B06 |
| Name | Pickup package from merchant |
| Actor(s) | Buyer; Merchant (fulfillment partner) |
| Goal | Collect delivered packages from the local merchant |
| Preconditions | Order is delivered to merchant (UC-R05) |
| Main flow | 1. Buyer receives notification of package arrival 2. Buyer visits merchant 3. Merchant verifies buyer identity/order 4. Merchant hands over package 5. Package marked as picked up |
| Alternate / exception flows | Package not found → dispute/support ticket |
| Related data | Buyer, Order, Merchant |
| Related APIs / integrations | FLOW-09; [uiAndNavigation.md](./uiAndNavigation.md) |

### Cross-cutting

| Concern | Linked use cases | Flows |
|---------|------------------|-------|
| Distributor setup | UC-D01–UC-D04 | FLOW-01 |
| Catalog | UC-D05, UC-M02, UC-B05 | FLOW-02, FLOW-05, FLOW-09 |
| OTP gig handover | UC-D07, UC-R01 | FLOW-03 |
| Gig trip + delivery/pickup | UC-R02–UC-R06, UC-M05, UC-M05b, UC-B06 | FLOW-03, FLOW-09 |
| Merchant gig notifications | UC-M01 | FLOW-03, FLOW-04 |
| Orders and cart | UC-M02–UC-M05, UC-M08, UC-B05 | FLOW-05, FLOW-09 |
| Dues and payments | UC-M06, UC-M07, UC-M09, UC-S11 | FLOW-06, FLOW-08 |
| User admin / block | UC-S01–UC-S05, UC-B02 | FLOW-07, FLOW-09 |
| Entity oversight | UC-S06–UC-S11 | FLOW-08 |
| Buyer flows | UC-B01–UC-B06 | FLOW-09 |

## Open Items

- [x] Buyer use cases — **Completed**: Added UC-B01 to UC-B06.
- [ ] Complete Support distributor edit actions beyond village / merchant / driver
- [ ] Order cancel rules and payment vs dues settlement rules
- [ ] Notification channel per merchant event
- [ ] Map each UC to concrete API paths in [Specification.md](./Specification.md)
- [ ] Confirm whether Inventory fields are Name/Price/Supplier only

## Related Documents

- [Flows.md](./Flows.md)
- [databaseSchema.md](./databaseSchema.md)
- [Specification.md](./Specification.md)
- [thirdPartyIntegration.md](./thirdPartyIntegration.md)
- [financialSpec.md](./financialSpec.md)
- [securityAndCompliance.md](./securityAndCompliance.md)
- [uiAndNavigation.md](./uiAndNavigation.md)
