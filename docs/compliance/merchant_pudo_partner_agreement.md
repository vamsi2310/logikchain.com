# Village PUDO Hub Partner Agreement & Commission Governance Policy

**Document ID**: `DOC-10.06.01`  
**Effective Date**: October 2026  
**Governing Standard**: Logikchain Rural Logistics Network (FEAT-10.06)  
**Parties**: Logikchain Platform, Registered Regional Supplier, Partner Kirana Merchant  

---

## 1. Purpose & Scope
This Agreement governs the commercial and operational relationship between Regional Suppliers, the Logikchain Platform, and Village Kirana Merchants designated as Pick-Up / Drop-Off (PUDO) Hubs. Kirana stores in rural villages act as vital hyper-local aggregators and last-mile delivery terminals for rural e-commerce and wholesale goods.

---

## 2. PUDO Hub Operational Obligations & Storage Standards
1. **Physical Storage Care**:
   - The Merchant shall maintain a dedicated, clean, dry, and rodent-free staging area inside or adjacent to their store for incoming parcel cartons.
   - Perishable and non-perishable goods must be segregated to avoid contamination.
2. **Holding SLAs (72-Hour Threshold)**:
   - Parcels deposited by Field Delivery Drivers must be retained for customer pickup for a maximum holding duration of **72 hours**.
   - If uncollected within 72 hours, the Merchant shall mark the parcel as "Pickup Expired" on `MER-08` and hand it back to the next scheduled vehicle gig for reverse logistics processing.
3. **Identity Verification & OTP Handover**:
   - The Merchant shall never hand over a parcel without verifying the 4-digit buyer handover OTP or authorized digital pickup code.

---

## 3. Tiered PUDO Commission Framework
Commissions are calculated monthly based on verified packages successfully received, held, and handed over to buyers:

| Volume Tier | Monthly Volume (Parcels) | Commission Rate (INR / Parcel) |
|---|---|---|
| **Tier 1 (Base)** | 1 – 50 parcels | ₹8.00 |
| **Tier 2 (Growth)** | 51 – 200 parcels | ₹12.00 |
| **Tier 3 (High Volume)** | 201+ parcels | ₹15.00 |

*Note: Suppliers may customize these rates via `SUP-12` or request platform Support adjustments via `SPT-13`.*

---

## 4. Merchant Village Home Delivery Services
Merchants opting to offer last-mile home delivery within their village boundary (`MER-08`) can set:
- **Service Status**: Active / Inactive
- **Delivery Fee**: Nominal flat fee (typically ₹10 – ₹30 per delivery order)
- **Schedule**: Defined operating days (e.g., Monday, Wednesday, Friday)

Home delivery fees are settled directly from buyers or credited to merchant payout balances upon OTP confirmation.

---

## 5. Loss, Damage & Liability Indemnification
1. **Intact Seal Guarantee**: Drivers and merchants inspect parcel tamper-evident seals upon vehicle arrival (`MER-04`). Damage discovered after acceptance with intact seal is the liability of the Supplier/Logikchain.
2. **Missing In-Store Parcels**: If a parcel is lost while under Merchant custody, the wholesale landed cost of the item will be deducted from the Merchant's revolving trade credit headroom or monthly commission balance.
3. **Force Majeure**: Severe flood, fire, or catastrophic rural weather events substantiated by Support review will exempt the partner from penalty.

---

## 6. Monthly Settlement Schedule
- **Cycle**: Monthly reconciliation closing on the last day of each calendar month.
- **Disbursement**: Automated batch transfer to Merchant's verified bank account or UPI VPA by the 5th day of the subsequent month via `payouts-service`.
- **Statutory Withholding**: TDS under Section 194O (1% for PAN-verified merchants, 5% without PAN) will be deducted at source and reflected in the quarterly TDS certificate (`tds-configs`).
