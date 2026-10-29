# Master Route Corridor Design & Deletion Policy Standard Operating Procedure (SOP)

**Document ID**: `DOC-10.07.01`  
**Effective Date**: October 2026  
**Governing Standard**: FEAT-10.07 (Master Route Corridors, Supplier Route Oversight & Unified Deletion Policy)  

---

## 1. Objective
This SOP defines the authoring guidelines for regional standard master corridors, universal Support console oversight, supplier custom route editing, and the unified zero-referencing-gigs route deletion policy.

---

## 2. Standard Master Corridor Authoring Standards
1. **Regional Hub Tie-In**:
   - Every standard corridor (`supplierId: "GLOBAL"`, `isPreConfigured: true`) must originate from a verified logistics Hub (e.g., `hub_prakasam_central`) and terminate at a designated return depot or round-trip loop.
2. **Village Density & Sequencing**:
   - Waypoints must be selected from the authoritative village catalog (`config_db.villages`).
   - Village stop sequencing should minimize geometric backtrack distance and optimize for commercial road grade (NH, SH, MDR).
3. **Turnaround & Distance Calculation**:
   - System evaluates route mileage via Google Maps Distance Matrix API or calibrated rural transport models:
     $$\text{Turnaround Hours} = \frac{\text{Distance (km)}}{35\text{ km/h}} + (\text{Village Stop Count} \times 0.25\text{ h})$$
4. **Hub Visibility**:
   - Once published, standard corridors are immediately visible on `SPT-09.4` and accessible by all suppliers operating within that district/hub for composing delivery gigs (`SUP-03`).

---

## 3. Universal Support Route Oversight & Direct Editing
- **Support Visibility**: Support operators have administrative read access to all routes across all suppliers from `SPT-09.4` and `SPT-02.4`.
- **Direct Editing Protocol**:
  - Support operators may modify waypoint sequences, arrival offsets, and road detour corrections on behalf of suppliers.
  - Every modification made by Support is audit-logged in `governance_db.audit_events` and mirrored in real time to Cloud Firestore `/Routes/{routeId}`.

---

## 4. Unified Route Deletion Policy & Guardrails
- **The Zero-Gig Rule**: Under no circumstances can a route be deleted or archived if any active, pending, or scheduled delivery gigs currently reference that route ID.
- **Enforcement Mechanics**:
  1. Operator or Supplier requests `DELETE /v1/config/routes/{routeId}`.
  2. `config-service` queries `gigs-service` (`:4003`) to locate referencing gigs with status $\in \{\text{'scheduled'}, \text{'loading'}, \text{'in_transit'}, \text{'arrived'}\}$.
  3. If $\ge 1$ referencing gigs exist:
     - The request is immediately rejected with `409 Conflict`.
     - Error payload:
       ```json
       {
         "error": {
           "code": "ROUTE_IN_USE_BY_GIGS",
           "message": "Cannot delete route referenced by active or scheduled gigs",
           "details": {
             "routeId": "rte_001",
             "referencingGigIds": ["gig_krishna_01", "gig_krishna_02"]
           }
         }
       }
       ```
  4. If 0 referencing gigs exist:
     - Route status transitions to `archived`.
     - Route is hidden from new gig creation pickers.
