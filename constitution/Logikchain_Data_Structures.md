# Content type: TypeScript

export type UserRole = "buyer" | "merchant" | "vehicle" | "supplier" | "support";
/**
 * `unauthorized` is "never let in" — the state a self-registered account sits in before
 * anybody vouches for it. `suspended` is "was let in and has been stopped", which is a
 * different fact with a different exit: it carries an actor, a reason, and a stated way
 * back. Collapsing the two would make "we have not looked at you yet" and "we have looked
 * at you and stopped you" indistinguishable on every screen and in every rule.
 */
export type UserStatus = "approved" | "unauthorized" | "suspended";

export type SuspensionReasonCode =
  | "suspected_fraud"
  | "cash_not_settled"
  | "document_expired"
  | "safety_incident"
  | "abuse_or_conduct"
  | "duplicate_account"
  | "requested_by_user"
  | "other"; // Requires a free-text reason of its own

/**
 * How far a suspension reaches. A supplier may only ever impose `operational`; `platform`
 * is Support's. The distinction is what makes it safe to let a supplier stop a driver at
 * all: they can take somebody off the road in their own network without being able to
 * lock that person out of an account that may also serve another supplier.
 */
export type SuspensionScope = "operational" | "platform";
export type ConfigRecordStatus = "active" | "inactive";
export type BillingCycle = "monthly" | "quarterly" | "annual";
export type PlanStatus = "draft" | "active" | "retired";
export type TariffType = "flat" | "per_user" | "per_gig" | "per_order" | "percentage";
export type DiscountValueType = "percent" | "flat";
export type SubscriptionStatus = "active" | "past_due" | "cancelled" | "expired";
export type SubscriberRole = "supplier" | "merchant";
export type NotificationCategory =
  | "gig_arrival"
  | "gig_assignment"
  | "gig_suspension"
  | "order_status"
  | "credit"
  | "payout"
  | "subscription"
  | "support"
  | "cash_custody" // Cash collected, settlement due, settlement confirmed, discrepancy raised
  | "verification" // Handover code re-sent, verification failed on replay, fallback requested or authorised
  | "privacy"; // Data-export ready, deletion request received

export type PaymentMode = "online" | "cash_on_pickup";
export type MerchantOrderPaymentMode = "credit" | "online" | "cash_on_delivery";
export type PaymentIntentStatus = "created" | "pending" | "paid" | "failed" | "reversed";
/**
 * What a payment is *for*, which determines how the server derives its amount.
 * "merchant_order" is prepaying a specific bulk order and prices from that order's
 * totalPrice; "merchant_credit_repayment" pays down an existing balance and prices
 * from the credit profile. They are separate members because pricing a new order
 * off a credit balance, or a repayment off an order total, is wrong in both directions.
 */
export type PaymentPurpose =
  | "buyer_order"
  | "merchant_order"
  | "merchant_credit_repayment"
  | "subscription";

/**
 * A `PaymentIntent` is the authorisation to charge: server-priced, one per payable
 * target. A `PaymentTransaction` is one *attempt* to collect against it, and is the
 * accounting record. An intent that was retried three times has one intent and three
 * transactions, which is why a failed attempt can be evidenced without implying the
 * payer owes three times.
 */
export type PaymentTransactionStatus =
  | "initiated" // Record minted before the gateway is called; nothing charged yet
  | "pending" // Gateway acknowledged, terminal event not yet received
  | "succeeded" // Verified capture: order, amount, currency, and unconsumed provider id all matched
  | "failed" // Provider failure, signature failure, amount mismatch, or expiry
  | "partially_refunded"
  | "reversed"; // Fully refunded or charged back
export type PaymentInstrument = "upi" | "card" | "netbanking" | "wallet" | "cash";
export type PaymentFailureCategory =
  | "payer_cancelled"
  | "insufficient_funds"
  | "instrument_declined"
  | "authentication_failed"
  | "amount_mismatch"
  | "signature_invalid"
  | "provider_error"
  | "timeout"
  | "duplicate_attempt";

export type RefundReason =
  | "order_cancelled"
  | "order_suspended"
  | "duplicate_payment"
  | "overcollection"
  | "support_goodwill"
  | "subscription_reversal";
export type RefundTransactionStatus = "requested" | "processing" | "completed" | "failed";

/**
 * The rail a payout physically leaves on. `manual_bank_transfer` is a controlled
 * fallback, not a normal path: it is the only rail whose completion depends on a
 * human-entered UTR, and it therefore requires a second verifier.
 */
export type PayoutRail = "upi" | "imps" | "neft" | "rtgs" | "manual_bank_transfer";
export type PayoutTransactionStatus =
  | "approved" // Authorised by the managing supplier; no money has moved
  | "initiated" // Handed to the payout provider or, on the fallback rail, to a human
  | "processing" // Provider accepted and is in flight
  | "completed" // Provider success, or a verified UTR confirmed by a second actor
  | "failed" // Provider rejection, beneficiary invalid, or fallback abandoned
  | "reversed" // Credited back by the beneficiary bank after an apparent success
  | "cancelled"; // Withdrawn before initiation
export type PayoutFailureCategory =
  | "beneficiary_invalid"
  | "beneficiary_blocked"
  | "insufficient_float"
  | "rail_unavailable"
  | "provider_rejected"
  | "bank_returned"
  | "timeout"
  | "cancelled_by_approver";

export type BeneficiaryType = "upi" | "bank";
export type BeneficiaryVerificationStatus =
  | "unverified"
  | "pending_verification" // Penny drop or VPA lookup in flight
  | "verified"
  | "failed"
  | "blocked"; // Support or Supplier stopped payouts to this destination
export type BeneficiaryVerificationMethod = "vpa_lookup" | "penny_drop" | "manual_document" | "none";

export type ReconciliationSourceKind = "gateway_payment" | "gateway_payout" | "bank_statement";
export type ReconciliationMatchStatus =
  | "unreconciled" // Not yet run against a provider or bank source
  | "matched" // Platform, provider, and bank agree
  | "provider_matched" // Provider agrees, bank leg still outstanding
  | "exception" // A break is open against this record
  | "written_off"; // Break closed by a recorded, authorised decision
export type ReconciliationExceptionKind =
  | "missing_at_provider" // Platform says it happened, provider has no record
  | "missing_on_platform" // Provider or bank has a record the platform never created
  | "amount_mismatch"
  | "currency_mismatch"
  | "duplicate_at_provider"
  | "status_mismatch" // Platform succeeded, provider failed, or the reverse
  | "stale_pending" // Non-terminal past its ageing threshold
  | "unapplied_settlement" // Money in the bank not attributable to a transaction
  | "fee_variance"; // Provider fee or tax differs from the expected schedule
export type ReconciliationExceptionStatus = "open" | "investigating" | "resolved" | "written_off" | "escalated";
export type ReconciliationExceptionResolution =
  | "matched_manually"
  | "corrected_by_adjustment"
  | "refunded"
  | "retried"
  | "recovered_from_earnings"
  | "written_off"
  | "provider_credit_note"
  | "no_action_required";
export type ReconciliationRunStatus = "running" | "completed" | "failed";
export type AccountingPeriodStatus = "open" | "closing" | "closed" | "reopened";

/**
 * Which address decides the place of supply for a given document class. The rule is
 * configuration because it is a legal question with different answers per supply, and
 * a platform that hard-codes one state issues a wrong invoice the day it serves a
 * second one.
 */
export type PlaceOfSupplyBasis =
  | "recipient_registered_state" // B2B: the recipient's GST registration address
  | "recipient_delivery_state" // B2C goods: where movement of the goods terminates
  | "supplier_state" // Unregistered recipient with no recorded address on file
  | "service_performance_state"; // Subscription and platform services

export type SupplyType = "intra_state" | "inter_state";

/**
 * TDS sections the platform is configured to withhold under. Driver and contractor
 * payouts sit under 194C; 194J is retained for professional-service engagements the
 * platform may later pay through the same rail. The applicable section for any given
 * counterparty is a tax-adviser decision recorded in configuration, never a default
 * the product picks on its own.
 */
export type TdsSection = "194C" | "194J" | "none";
export type TdsDeductionStatus =
  | "accrued" // Withheld from a payout; not yet deposited
  | "deposited" // Covered by a challan
  | "returned" // Reported in a filed quarterly return
  | "certified" // Form 16A issued to the deductee
  | "reversed"; // Payout reversed, so the withholding is undone
export type TdsCertificateStatus = "pending" | "issued" | "revised";
export type TdsQuarter = "Q1" | "Q2" | "Q3" | "Q4";

/**
 * How long a class of record must be kept, and what may be shown while it is kept.
 * Retention is a class-level property rather than a per-record one so that a new
 * collection cannot quietly acquire an undefined retention.
 */
export type RetentionClass =
  | "statutory_financial" // Invoices, credit notes, transactions, ledgers, close packs
  | "statutory_tax" // TDS challans, certificates, GST return packs
  | "payment_evidence" // Raw webhook payloads, provider reports, bank statements
  | "beneficiary_secret" // Encrypted VPA, account number, PAN
  | "operational_audit" // AuditLogEntry and status event streams
  | "support_correspondence"
  | "derived_export"; // Generated CSV and PDF output

/**
 * The sub-ledgers that must tie back to a control account. Every financial record on
 * the platform belongs to exactly one, which is what makes "does the platform agree
 * with the bank" a question with an answer.
 */
export type SubLedger =
  | "buyer_collections"
  | "merchant_collections"
  | "subscription_collections"
  | "refunds"
  | "driver_payables"
  | "driver_payouts"
  | "merchant_credit"
  | "cash_custody"
  | "gateway_fees"
  | "taxes_withheld";

export type AuditEventCategory =
  | "payment"
  | "payout"
  | "refund"
  | "beneficiary"
  | "credit"
  | "cash"
  | "reconciliation"
  | "subscription"
  | "entitlement"
  | "configuration"
  | "account";
export type AuditActorKind = "user" | "system" | "provider_webhook" | "scheduled_job";

/**
 * Stable entitlement keys. `SubscriptionPlan.features[]` is display copy and may be
 * translated or rewritten; these are the strings server functions actually check, so
 * they are never renamed once published.
 */
export type FinanceEntitlement =
  | "finance.dashboard" // Balances, dues, and payment/payout status
  | "finance.transaction_history" // Full transaction list with provider references
  | "finance.statements" // Period statements and receipts in bulk
  | "finance.settlement_register" // Settlement, custody, and payout registers with provider legs
  | "finance.advanced_reports" // Ageing, cash-flow, spend, payout analysis
  | "finance.custom_date_range" // Reporting outside the rolling default window
  | "finance.exports" // CSV and PDF export of report and ledger output
  | "finance.scheduled_reports"
  | "finance.reconciliation" // Reconciliation workspace and exception handling
  | "finance.tax_reports" // GST and TDS packs
  | "finance.period_close"; // Period lock and close evidence

/**
 * Capabilities that exist outside the entitlement system entirely, because they are
 * a party's access to their own money and their own statutory documents. They are not
 * listed in any plan, cannot be removed by `upsertSubscriptionPlan`, and survive
 * `past_due`, cancellation, and expiry. Kept as a named constant so that "is this
 * gated?" has one answer rather than one per screen.
 *
 * `finance.dashboard` and `finance.transaction_history` appear in both this list and
 * `FinanceEntitlement`: they are always granted, and they are still enumerated as
 * entitlements so `getEntitlements` can report a complete position.
 */
export type BaselineFinanceCapability =
  | "own_balances" // Current dues, credit balance, reserved versus available
  | "own_transaction_status" // Payment, payout, refund, and repayment status with ids
  | "own_receipts_and_invoices" // Tax invoices, credit notes, payout advices
  | "own_statutory_evidence" // GST documents and TDS certificates addressed to the party
  | "own_subscription_billing" // Subscription invoices and billing history
  | "payout_self_service" // Register a destination and request a payout
  | "dispute_raising"; // Open a tracked payment, payout, or credit dispute

export type PlanEntitlementLimitKey =
  | "finance.report_history_days"
  | "finance.exports_per_month"
  | "finance.scheduled_reports"
  | "finance.reconciliation_rows_per_month"
  | "finance.retained_periods";

/**
 * The single verification vocabulary for every custody transfer on the platform:
 * buyer order handover, merchant bulk order handover, merchant cash repayment to a
 * driver, and driver cash settlement to a supplier. "strong" methods bind a secret
 * only the counterparty holds; "weak" methods are auditable fallbacks.
 */
export type VerificationMethod =
  | "otp" // Counterparty read out a live server-issued code (Order pickup code, MerchantOrder handover code)
  | "offline_code" // Counterparty read out the next unused code from a pre-issued offline batch
  | "photo"
  | "gallery"
  | "counter_signature" // Counterparty confirmed on the initiator's device; name and phone tail recorded
  | "support_override" // Fallback authorised in advance by Support or the owning Supplier
  | "code"; // Deprecated alias for "otp"; retained so existing proof payloads keep validating
export type VerificationStrength = "strong" | "weak";

export type CustodyTransferKind =
  | "order_handover" // Goods: driver or merchant to buyer
  | "bulk_order_handover" // Goods: driver to merchant
  | "credit_repayment" // Cash: merchant to driver, against outstanding credit
  | "cash_settlement"; // Cash: driver to supplier, at end of gig
export type CustodyTransferStatus = "pending" | "verified" | "expired" | "disputed" | "reversed";
export type CustodyPartyRole = "buyer" | "merchant" | "vehicle" | "supplier" | "support";

export type CashLedgerDirection = "collected" | "settled" | "adjustment";
export type CashLedgerSource =
  | "buyer_cod"
  | "merchant_bulk_cash"
  | "merchant_credit_repayment"
  | "settlement"
  | "shortfall"
  | "overage"
  | "waiver"
  | "recovery";
export type CashCustodyStatus = "in_custody" | "settled" | "disputed" | "written_off" | "reversed";

export type CashSettlementStatus = "pending" | "declared" | "settled" | "disputed" | "written_off";
export type CashVarianceKind = "none" | "shortfall" | "overage";
export type CashVarianceResolution =
  | "recover_from_earnings"
  | "carry_forward"
  | "waive"
  | "escalate_to_support";

export type CashDiscrepancyKind =
  | "shortfall"
  | "overage"
  | "unrecorded_collection"
  | "disputed_amount"
  | "failed_verification"
  /**
   * A verified merchant repayment whose relief ceiling elapsed before the driver settled.
   * The merchant's credit is restored anyway and the loss is booked here against the
   * holder, so the merchant is never left drawn on money they demonstrably paid.
   */
  | "unsettled_repayment"
  | "payout_query" // Driver asking Support/supplier to look at a named PayoutTransaction
  | "earning_query"; // Driver asking about a completed gig's computed pay
export type CashDiscrepancyStatus = "open" | "under_review" | "resolved" | "written_off";

/**
 * A cash repayment posts **two** transactions, not one, because it passes through a
 * state that neither "owed" nor "repaid" describes: the merchant has parted with the
 * cash, the supplier has not received it, and the credit line is not yet restored.
 * `repayment_cash_pending` names that state at collection; `repayment_cash_settled`
 * closes it at settlement and is the only entry that moves `creditUsed`. Reading the
 * ledger forwards therefore explains the balance at every intermediate point, which a
 * single entry booked at either end could not.
 */
export type CreditTransactionType =
  | "draw" // placeMerchantOrder consumed credit
  | "release" // cancelMerchantOrder returned credit
  | "repayment_cash_pending" // confirmCreditRepayment: cash verified into a driver's custody; creditUsed unchanged
  | "repayment_cash_settled" // confirmCashSettlement: supplier received it; creditUsed relieved here
  | "repayment_online" // processPayment: gateway-confirmed repayment, relieved immediately
  | "limit_change" // setMerchantCreditLimit or reviewCreditIncreaseRequest
  | "provisional_grant" // Supplier-capped spending room lent against a pending cash repayment
  | "provisional_release" // The same room withdrawn when the repayment settles or is written off
  | "adjustment" // Support correction, always carries a reason and an actor
  | "reversal"; // Reverses an earlier transaction by id
export type ConfigurationCollection =
  | "countries"
  | "states"
  | "districts"
  | "subscriptionPlans"
  | "planTariffs"
  | "subscriptionOffers"
  | "offerDiscountCodes";

export interface UserProfile {
  id: string;
  role: UserRole;
  status: UserStatus;
  name?: string;
  photoUrl?: string; // Cloud Storage URL (under /profiles/{userId}/); public read, owner write
  phone?: string;
  email?: string;
  createdAt?: string;
  address?: string;
  countryId?: string; // References Country.id; drives phone prefix validation
  selectedMerchantId?: string;
  permissions?: {
    location: boolean;
    sms: boolean;
    audio: boolean;
    camera: boolean;
  };
  villageId?: string;
  supplierId?: string;
  shopDetails?: string;
  contactInfo?: string;
  location?: string;
  gstin?: string; // India GSTIN (GST Registration Number) for Suppliers/Merchants
  panNumber?: string; // Masked in reads; required before a payout crosses the TDS threshold
  activeSubscriptionId?: string; // Current platform subscription for suppliers/merchants
  /**
   * The driver's current payout destination is a `BeneficiaryAccount` document, not a
   * free-text string. The profile carries only the pointer and a masked label, so a
   * profile read can render "where my money goes" without exposing an account number,
   * and a destination change is an event with its own record rather than a field edit.
   */
  activeBeneficiaryId?: string; // References BeneficiaryAccount.id
  payoutMethod?: {
    type: BeneficiaryType;
    maskedLabel: string; // "ravi****@okhdfcbank" or "HDFC ••••4521 · IFSC HDFC0001234"
    verificationStatus: BeneficiaryVerificationStatus;
  };
  vehicleNumber?: string; // Driver vehicle registration number
  vehicleType?: string; // Driver vehicle class (e.g., "Tempo", "Mini truck")
  vehicleCapacityKg?: number; // Payload the vehicle is rated for; DRV-09
  locale?: string; // BCP 47, e.g. "te-IN". SHR-03 / SHR-11 persist this here, not only on-device.
  notificationPrefs?: {
    mutedCategories: NotificationCategory[];
    sound: boolean;
  };
  /**
   * Supplier-only. Written by `updateDriverPayRates`, read by `completeAndFinalizeGig`.
   * Not on the self-service profile allow-list — these numbers are payroll.
   */
  driverPay?: {
    baseTripAmount: number;
    perKm: number;
    perDelivery: number;
  };
  deviceTokens?: DeviceToken[]; // Registered FCM tokens for push delivery
  /**
   * Present whenever `status` is `"suspended"`, and retained after restoration so the
   * history of a stopped account survives the un-stopping. Written only by `suspendUser`
   * and `restoreUser`; denied to every client by the security rules, because an account
   * that can clear its own suspension is not suspended.
   */
  suspension?: SuspensionRecord;
}

/**
 * The evidence behind a stopped account. A suspension with no author, no reason, and no
 * stated way back is indistinguishable from a bug, and the person on the receiving end
 * has no way to argue with it — which is why every field here except the optional ones is
 * required before the status flips.
 */
export interface SuspensionRecord {
  scope: SuspensionScope;
  reasonCode: SuspensionReasonCode;
  reason: string; // Shown verbatim to the suspended user; never an internal code
  internalNote?: string; // Support-only context, never returned to the suspended user
  suspendedBy: string; // UID of the actor
  suspendedByRole: "supplier" | "support";
  suspendedAt: string;
  /**
   * What the suspended person must do, or wait for, to be restored. Required, because
   * "contact support" is not a path and a suspension without one is a deletion nobody
   * called a deletion.
   */
  restorePath: string;
  autoRestoreAt?: string; // Set for time-boxed suspensions; a scheduled job restores at this instant
  /**
   * The custody consequences the suspension triggered, recorded at the moment it was
   * imposed. A suspended driver holding cash is the case this exists for: the settlement
   * that was opened, the gig that was halted, and the orders that need another driver are
   * named here so nobody has to reconstruct them later.
   */
  custodyPlan?: SuspensionCustodyPlan;
  restoredBy?: string;
  restoredAt?: string;
  restoreNote?: string;
}

/**
 * What happened to the money and the work when an account was stopped mid-flight.
 * Suspension must never be a way to make an obligation disappear, in either direction:
 * the platform does not lose track of its cash, and the suspended person does not lose
 * their earnings.
 */
export interface SuspensionCustodyPlan {
  cashInCustodyAtSuspension: number;
  settlementId?: string; // Opened for that cash so it has a named way home
  gigId?: string; // The gig halted, if any
  suspendedOrderIds: string[]; // Orders moved to "suspended" pending reassignment
  pendingRepaymentIds: string[]; // CustodyTransfer ids whose merchant relief is still owed
  reassignedToDriverId?: string; // Set once a replacement takes the route
  /**
   * True while the suspended party still owes a settlement. While this is true the
   * suspension leaves exactly one capability intact — handing the cash back — because a
   * suspension that blocks the return of the money guarantees the money never returns.
   */
  settlementOutstanding: boolean;
}

export interface Hub {
  id: string;
  name: string;
  countryId: string;
  stateId: string;
  districtId: string;
  country: string; // Denormalized Country.name
  state: string; // Denormalized State.name
  district: string; // Denormalized District.name
  villages: Village[];
}

export interface Country {
  id: string;
  name: string;
  isoCode: string; // ISO 3166-1 alpha-2 (e.g., "IN")
  isoCode3: string; // ISO 3166-1 alpha-3 (e.g., "IND")
  numericCode: string; // ISO 3166-1 numeric (e.g., "356")
  mobilePrefix: string; // International dialing prefix (e.g., "+91")
  phoneNumberLength: number; // National significant number length excluding prefix
  phoneValidationRegex?: string;
  currencyCode: string; // ISO 4217 (e.g., "INR")
  currencySymbol: string; // e.g., "₹"
  timezone: string; // IANA timezone (e.g., "Asia/Kolkata")
  status: ConfigRecordStatus;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  supportPhone?: string; // National number Support publishes on SHR-14. India seed: a synthetic desk line, never a personal mobile.
  supportHours?: string; // IST display, e.g. "09:00–18:00"
}

export interface State {
  id: string;
  countryId: string;
  name: string;
  code: string; // Administrative code (e.g., "AP")
  status: ConfigRecordStatus;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export interface District {
  id: string;
  countryId: string;
  stateId: string;
  name: string;
  code?: string;
  status: ConfigRecordStatus;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  description: string;
  targetRole: SubscriberRole;
  status: PlanStatus;
  features: string[]; // Display copy only; never read by an authorization check
  /**
   * The keys server functions actually enforce. A feature named in `features[]` but
   * absent here is marketing, not access, and the gate will refuse it. Entitlements are
   * role-scoped: `finance.reconciliation` and `finance.period_close` on a merchant-targeted
   * plan are rejected by `upsertSubscriptionPlan` because no merchant screen can consume
   * them. The role matrix and the safe default composition are in
   * `constitution/Logikchain_Financial_Controls.md` §9.
   */
  entitlements: FinanceEntitlement[];
  entitlementLimits?: Partial<Record<PlanEntitlementLimitKey, number>>; // -1 means unlimited
  maxHubs?: number; // undefined or -1 means unlimited
  maxRoutes?: number;
  maxGigsPerMonth?: number;
  maxMerchants?: number;
  maxDrivers?: number;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export interface PlanTariff {
  id: string;
  planId: string;
  name: string;
  billingCycle: BillingCycle;
  currencyCode: string;
  countryId?: string; // Optional country-specific pricing
  basePrice: number;
  tariffType: TariffType;
  unitPrice?: number; // Used when tariffType is usage-based
  gstRate: number;
  status: ConfigRecordStatus;
  effectiveFrom: string;
  effectiveTo?: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export interface OfferEligibilityCriteria {
  eligibleRoles?: SubscriberRole[];
  eligibleCountryIds?: string[];
  eligiblePlanIds?: string[];
  newSubscribersOnly?: boolean;
  firstSubscriptionOnly?: boolean;
  minTenureMonths?: number;
  minCompletedGigs?: number;
}

export interface SubscriptionOffer {
  id: string;
  name: string;
  description: string;
  planId: string;
  tariffId?: string;
  discountType: DiscountValueType;
  discountValue: number;
  eligibility: OfferEligibilityCriteria;
  maxRedemptions?: number;
  maxRedemptionsPerUser?: number;
  redemptionCount: number;
  validFrom: string;
  validTo: string;
  status: ConfigRecordStatus;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export interface OfferDiscountCode {
  id: string;
  offerId: string;
  code: string; // Unique, case-insensitive promo code
  maxUses?: number;
  usedCount: number;
  status: ConfigRecordStatus;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export interface PlatformSubscription {
  id: string;
  subscriberId: string;
  subscriberRole: SubscriberRole;
  planId: string;
  tariffId: string;
  offerId?: string;
  discountCode?: string;
  status: SubscriptionStatus;
  currencyCode: string;
  listPrice: number;
  discountAmount: number;
  billedAmount: number;
  gstAmount: number;
  /**
   * The entitlement set resolved from the plan at the moment the period was paid for,
   * frozen for the period. A Support edit to the plan mid-period does not silently
   * remove a capability the subscriber has already paid for; it applies from the next
   * renewal, and `pendingEntitlements` shows the subscriber what will change.
   */
  activeEntitlements: FinanceEntitlement[];
  entitlementLimits?: Partial<Record<PlanEntitlementLimitKey, number>>;
  pendingPlanId?: string; // Set by a scheduled downgrade; applies at currentPeriodEnd
  pendingEntitlements?: FinanceEntitlement[];
  gracePeriodEndsAt?: string; // Set when status becomes "past_due"; entitlements survive until then
  gracePeriodGrantedBy?: string; // Support UID when a grace extension was granted manually
  lastPaymentTransactionId?: string; // Evidence that the current period was paid for
  startedAt: string;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelledAt?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * A subscription period billed to a subscriber. Subscription revenue is revenue, so a
 * period gets the same treatment as an order: a server-priced amount, a GST breakdown,
 * an invoice number that is never rewritten, and a `PaymentTransaction` behind it.
 */
export interface SubscriptionInvoice {
  id: string;
  subscriptionId: string;
  subscriberId: string;
  subscriberRole: SubscriberRole;
  planId: string;
  tariffId: string;
  invoiceNumber: string; // "SUB-" + YYMMDD + daily sequence
  invoiceDate: string;
  periodStart: string;
  periodEnd: string;
  currencyCode: string;
  listPrice: number;
  discountAmount: number;
  taxableValue: number;
  gstRate: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  totalAmount: number;
  placeOfSupply: string;
  paymentIntentId?: string;
  paymentTransactionId?: string;
  status: "issued" | "paid" | "failed" | "credited";
  creditNoteId?: string; // Set when the period was cancelled or refunded
  createdAt: string;
}

export interface Village {
  id: string;
  lgdCode: string;
  name: string;
  pincode: string;
  panchayat: string;
  mandal: string;
  district: string;
  state: string;
  location: {
    latitude: number;
    longitude: number;
  };
  population?: number;
  tier?: string;
  description?: string;
}

export interface VillageRequest {
  id: string;
  requestedBy: string; // UID of the requesting Buyer/Merchant/Supplier
  requesterRole: UserRole;
  name: string;
  pincode: string;
  panchayat?: string;
  mandal?: string;
  district: string;
  state: string;
  location?: {
    latitude: number;
    longitude: number;
  };
  notes?: string;
  status: "pending_support_review" | "approved" | "rejected";
  createdAt: string;
  reviewedBy?: string; // Support UID that actioned the request
  reviewedAt?: string;
  createdVillageId?: string; // Village.id created on approval
  rejectionReason?: string;
}

export interface Product {
  id: string;
  supplierId: string;
  name: string;
  category: string;
  price: number;
  stock: number;
  unit: string;
  hsnCode: string;
  imageUrl?: string; // Cloud Storage URL (under /products/{supplierId}/{productId}/); public read, supplier write
  lowStockAlert?: number; // Supplier-owned threshold. Not stock. SUP-06 sorts on stock <= this.
}

export interface Route {
  id: string;
  supplierId: string;
  name: string;
  origin: string;
  destination: string;
  length: number;
  duration: number;
  villages: Array<{
    villageId: string; // References Village.id
    name: string;
    journeyTimeFromOrigin: number;
    location: {
      latitude: number;
      longitude: number;
    };
  }>;
}

export interface Discount {
  code: string;
  supplierId: string;
  name: string;
  description: string;
  discountPercent: number;
  eligibleCategory: string;
  minOrderValue: number;
  maxOrderValue: number;
}

export interface Pamphlet {
  id: string;
  supplierId: string;
  title: string;
  subtitle: string;
  promotedProducts: Array<{
    productId: string;
    name: string;
    originalPrice: number;
    discountedPrice: number;
    currentStock: number;
    totalStock: number;
    unitOfMeasure: string;
    volumeAddedToCart: number;
    slogan: string;
  }>;
  createdAt: string;
}

export interface Gig {
  id: string;
  title: string;
  supplierId: string;
  supplierName: string;
  routeId: string;
  routeName: string;
  villages: Array<{
    villageId: string; // References Village.id
    name: string;
    location: {
      latitude: number;
      longitude: number;
    };
  }>; // Ordered copy of the Route villages; carries coordinates for on-device geofencing
  villageIds: string[]; // Denormalized villages[].villageId — the BUY-04 / MER-02 query index. composeGig writes this; clients do not.
  merchantIds: string[]; // Merchants served by this Gig, in village order
  vehicleId: string;
  driverName: string;
  pamphletId: string;
  date: string;
  arrivingTimes: Record<string, string>;
  assignedAt: string; // composeGig timestamp — DRV-02.1 "assigned"
  routeLengthKm: number; // Copied from Route.length at compose
  driverAcknowledgedAt?: string; // acknowledgeGig; advisory, does not gate startGig
  driverProblemNote?: string; // Optional note on acknowledgeGig
  status: "created" | "started" | "completed" | "suspended";
  currentVillageIndex: number;
  currentVillageStatus: "arriving" | "reached" | "left" | "none";
  suspensionReason?: string; // Populated when status is "suspended"
  suspendedAt?: string;
}

export interface OrderItem {
  productId: string;
  name: string;
  quantity: number;
  price: number;
  hsnCode: string;
  unit: string; // Unit Quantity Code (UQC) copied from Product.unit
}

/**
 * Client-submitted evidence for a custody transfer. One shape for goods and for cash,
 * so a single verification component and a single server validator cover every hop.
 */
export interface VerificationInput {
  method: VerificationMethod;
  photoUrl?: string; // Cloud Storage URL; required when method is "photo" or "gallery"
  confirmationCode?: string; // Required when method is "otp"/"code" or "offline_code"
  codeBatchId?: string; // Required when method is "offline_code"; VerificationCodeBatch.id
  codeCounter?: number; // Required when method is "offline_code"; single-use index within the batch
  witnessName?: string; // Required when method is "counter_signature"
  witnessPhoneTail?: string; // Last 4 digits of the counterparty's registered phone
  fallbackAuthorizationId?: string; // Required when method is "support_override"
  fallbackReason?: string; // Required for every "weak" method; shown verbatim in the audit log
  capturedAt: string; // Device clock at the physical moment of handover, preserved across an offline replay
}

export interface VerificationRecord {
  method: VerificationMethod;
  strength: VerificationStrength; // Server-derived: "strong" for otp/code/offline_code, "weak" otherwise
  photoUrl?: string;
  confirmationCode?: string; // Stored masked as the last 2 digits; the full code is never echoed back
  codeBatchId?: string;
  codeCounter?: number;
  witnessName?: string;
  witnessPhoneTail?: string;
  fallbackAuthorizationId?: string;
  fallbackReason?: string;
  capturedAt: string; // Device timestamp supplied by the client
  capturedBy: string; // Server-set UID of the party that captured the evidence
  verifiedAt: string; // Server timestamp at which verification succeeded
}

/**
 * `DeliveryProofInput` and `DeliveryProof` are retained as aliases so existing
 * order-delivery contracts keep their names. There is exactly one verification shape.
 */
export type DeliveryProofInput = VerificationInput;
export type DeliveryProof = VerificationRecord;

/**
 * A batch of single-use offline verification codes issued to the party that must
 * *authorise* a transfer: merchants (credit repayment) and suppliers (cash settlement).
 * Plaintext codes exist only on that party's device; the server stores salted hashes.
 * Codes are burned by counter, which is what makes an offline handover un-replayable.
 */
export interface VerificationCodeBatch {
  id: string;
  ownerId: string; // UID the codes were issued to
  ownerRole: CustodyPartyRole;
  purpose: CustodyTransferKind; // "bulk_order_handover", "credit_repayment" or "cash_settlement"; never "order_handover", whose codes are per-order
  codeHashes: string[]; // HMAC-SHA256 of each 6-digit code under salt plus HANDOVER_CODE_HASH_PEPPER, indexed by counter
  salt: string; // Per-batch, server-only; never returned to any client
  usedCounters: number[]; // Counters already burned; a repeat is CODE_REPLAYED
  issuedAt: string;
  expiresAt: string; // 30 days from issue
  status: "active" | "exhausted" | "expired" | "revoked";
}

/**
 * A pre-authorised, expiring, single-target permission to close a custody transfer
 * with a weak verification method. Granted only by Support or the owning Supplier,
 * always with a reason, so a bypass is a record rather than a silence.
 */
export interface VerificationFallbackAuthorization {
  id: string;
  transferKind: CustodyTransferKind;
  orderId?: string;
  merchantOrderId?: string;
  custodyTransferId?: string;
  settlementId?: string;
  grantedTo: string; // UID permitted to use the fallback, usually the driver
  grantedBy: string; // Support or Supplier UID
  grantedByRole: "supplier" | "support";
  reason: string;
  expiresAt: string; // Two hours from issue
  consumedAt?: string;
  consumedByTransferId?: string;
  status: "active" | "consumed" | "expired" | "revoked";
  createdAt: string;
}

/**
 * The secret half of a handover, kept out of the parent document so that the party who
 * must *ask* for the code cannot read it. There are four locations, one per transfer
 * kind, each readable only by the counterparty who must authorise it and by Support:
 *   /Orders/{orderId}/private/pickup                  buyer
 *   /MerchantOrders/{merchantOrderId}/private/handover merchant
 *   /CustodyTransfers/{transferId}/private/code        merchant, for a credit repayment
 *   /CashSettlements/{settlementId}/private/code       supplier
 * No client ever writes one.
 */
export interface HandoverCodeRecord {
  code: string; // 6 digits, unique among the open orders at the same merchant
  issuedAt: string;
  lastSentAt?: string;
  sendCount: number; // resendHandoverCode is capped at 3 per order per hour
  failedAttempts: number; // Capped at 5, after which only photo or fallback proof remains
}

/**
 * One verified, two-sided, timestamped handover. Every movement of goods or cash
 * between two parties produces exactly one of these, and every CashLedgerEntry
 * points back at the transfer that justifies it.
 */
export interface CustodyTransfer {
  id: string;
  kind: CustodyTransferKind;
  status: CustodyTransferStatus;
  gigId?: string; // Absent for online repayments and out-of-gig settlements
  supplierId: string; // The party whose money or goods are ultimately in play
  fromPartyId: string;
  fromRole: CustodyPartyRole;
  toPartyId: string;
  toRole: CustodyPartyRole;
  orderId?: string;
  merchantOrderId?: string;
  settlementId?: string;
  cashAmount?: number; // Present when the transfer moves physical cash
  currency: "INR";
  verification?: VerificationRecord; // Absent only while status is "pending"
  challengeExpiresAt?: string; // Pending cash transfers expire after 30 minutes
  cashLedgerEntryId?: string; // Written on verification
  creditTransactionId?: string; // Written on verification of a credit repayment
  idempotencyKey: string; // Client-generated; a replay returns the original transfer
  initiatedAt: string;
  verifiedAt?: string;
  capturedAt?: string; // Device timestamp of the physical handover
  notes?: string;
  createdAt: string;
}

/**
 * Append-only cash custody ledger. Never updated in place except to move `status`
 * and stamp `settlementId`. The answer to "who is holding how much of whose money"
 * is the sum of entries where holderId matches and status is "in_custody".
 */
export interface CashLedgerEntry {
  id: string;
  direction: CashLedgerDirection;
  source: CashLedgerSource;
  status: CashCustodyStatus;
  amount: number; // Always positive; `direction` carries the sign
  currency: "INR";
  supplierId: string; // Owner of the money
  holderId: string; // Party physically holding it, usually the driver
  holderRole: CustodyPartyRole;
  gigId?: string;
  orderId?: string;
  merchantOrderId?: string;
  merchantId?: string;
  buyerId?: string;
  custodyTransferId: string; // The verified handover that justifies this entry
  settlementId?: string; // Set when the entry is swept into a settlement
  reversalOfEntryId?: string;
  reversedByEntryId?: string;
  capturedAt: string; // Device timestamp of the physical event
  recordedAt: string; // Server timestamp
  recordedBy: string; // UID that submitted the transfer
  note?: string;
}

export interface CashSettlementLine {
  source: CashLedgerSource;
  label: string; // "Buyer cash orders", "Merchant credit repayments", "Merchant bulk cash"
  entryCount: number;
  amount: number;
}

/**
 * The end-of-gig reconciliation between one driver and one supplier. Three amounts are
 * stored, never one: what the ledger expected, what the driver declared, and what the
 * supplier counted. A settlement is closed by two different actors.
 */
export interface CashSettlement {
  id: string;
  gigId: string;
  supplierId: string;
  driverId: string;
  status: CashSettlementStatus;
  currency: "INR";
  expectedAmount: number; // Server-computed sum of in-custody CashLedgerEntry rows
  breakdown: CashSettlementLine[];
  ledgerEntryIds: string[]; // The exact entries this settlement closes
  declaredAmount?: number; // What the driver said they were handing over
  declaredAt?: string;
  countedAmount?: number; // What the supplier counted on receipt
  confirmedAt?: string;
  confirmedBy?: string; // Supplier or Support UID
  variance?: number; // countedAmount - expectedAmount
  varianceKind?: CashVarianceKind;
  varianceResolution?: CashVarianceResolution;
  varianceNote?: string;
  discrepancyId?: string; // Set when the variance was escalated
  settlementCodeIssuedAt?: string; // Supplier-held OTP; the code itself lives in the private subdocument
  custodyTransferId?: string;
  /**
   * Why this settlement exists. `gig_completion` is the ordinary case; `gig_suspension`
   * and `driver_suspension` are opened out of cycle because the cash needed a way home
   * before the gig could end normally. The reason is stored rather than inferred, because
   * an out-of-cycle settlement is worked differently: nobody is standing at the counter.
   */
  origin: "gig_completion" | "gig_suspension" | "driver_suspension";
  openedAt: string;
  createdAt: string;
}

/**
 * A contested or unexplained amount, with an owner and an outcome. Any of the three
 * parties can raise one; Support and the owning Supplier can resolve one.
 */
export interface CashDiscrepancy {
  id: string;
  kind: CashDiscrepancyKind;
  status: CashDiscrepancyStatus;
  amount: number;
  currency: "INR";
  supplierId: string;
  raisedBy: string;
  raisedByRole: CustodyPartyRole;
  againstPartyId: string; // The party the amount is claimed from or against
  gigId?: string;
  settlementId?: string;
  custodyTransferId?: string;
  orderId?: string;
  merchantOrderId?: string;
  merchantId?: string;
  driverId?: string;
  description: string;
  evidenceUrls?: string[];
  resolution?: CashVarianceResolution;
  resolutionNote?: string;
  resolvedBy?: string;
  resolvedAt?: string;
  createdAt: string;
}

/**
 * Append-only credit ledger. `CreditProfile` holds the running scalars for cheap reads;
 * this collection is the evidence trail behind every one of them, which is what makes a
 * disputed balance answerable.
 */
export interface CreditTransaction {
  id: string;
  merchantId: string;
  supplierId: string;
  type: CreditTransactionType;
  amount: number; // Always positive; `type` carries the direction
  currency: "INR";
  creditUsedAfter: number;
  creditLimitAfter: number;
  creditAvailableAfter: number;
  /**
   * The pending-repayment and provisional scalars as they stood after this entry. Stored
   * on every entry, not only the repayment ones, because the question a reader asks of a
   * credit ledger is "what was the position at this row" and a scalar that only some rows
   * carry cannot answer it.
   */
  pendingRepaymentsAfter: number;
  provisionalCreditGrantedAfter: number;
  merchantOrderId?: string;
  paymentIntentId?: string;
  custodyTransferId?: string;
  settlementId?: string; // Present on repayment_cash_settled and provisional_release
  creditIncreaseRequestId?: string;
  duesSettled?: string[]; // CreditPaymentDue ids this transaction cleared
  /**
   * On `repayment_cash_settled`, the `repayment_cash_pending` entry it discharges. On
   * `provisional_release`, the `provisional_grant` it withdraws. This is what lets the
   * two halves of a cash repayment be read as one movement without either half being
   * rewritten.
   */
  settlesTransactionId?: string;
  reversalOfTransactionId?: string;
  actorId: string; // UID that caused the movement
  actorRole: CustodyPartyRole;
  reason?: string; // Mandatory for "adjustment" and "reversal"
  recordedAt: string;
}

/**
 * The server's record of an intended gateway payment, created before the gateway is
 * called and transitioned exactly once. Doubles as the idempotency key for
 * processPayment and for the Razorpay webhook.
 */
export interface PaymentIntent {
  id: string; // Equals the gateway payment reference
  status: PaymentIntentStatus;
  purpose: PaymentPurpose;
  amount: number; // Server-derived, never taken from the client
  currency: "INR";
  payerId: string;
  orderId?: string;
  merchantOrderId?: string; // Required when purpose is "merchant_order"
  merchantId?: string;
  supplierId?: string;
  subscriptionId?: string;
  duesTargeted?: string[]; // CreditPaymentDue ids the repayment is allocated against
  gatewayOrderId?: string;
  gatewayEventIds: string[]; // Webhook event ids already applied; a repeat is a no-op
  failureReason?: string;
  attemptCount: number; // PaymentTransactions raised against this intent
  latestPaymentTransactionId?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * One attempt to collect money against a `PaymentIntent`, and the accounting record of
 * that attempt. Append-only in substance: `status` advances through the lifecycle and
 * every advance also appends a `PaymentStatusEvent`, but no field is ever rewritten to
 * hide what an earlier state said.
 *
 * The separation from `PaymentIntent` matters at audit time. An intent answers "what
 * were they asked to pay"; a transaction answers "what actually happened at the
 * gateway, when, on whose instruction, and with which provider reference".
 */
export interface PaymentTransaction {
  id: string; // Internal, platform-minted; never the gateway's identifier
  paymentIntentId: string;
  purpose: PaymentPurpose;
  subLedger: SubLedger;
  status: PaymentTransactionStatus;
  instrument: PaymentInstrument;
  amount: number; // Server-derived; equals PaymentIntent.amount at initiation
  currency: "INR";
  capturedAmount?: number; // What the provider actually captured
  refundedAmount: number; // Running total across all RefundTransactions
  providerFee?: number;
  providerTax?: number;
  netSettlementAmount?: number; // capturedAmount − providerFee − providerTax
  payerId: string;
  payeeSupplierId?: string; // The supplier whose revenue this is, where one exists
  orderId?: string;
  merchantOrderId?: string;
  merchantId?: string;
  subscriptionId?: string;
  subscriptionInvoiceId?: string;
  gatewayOrderId?: string;
  gatewayPaymentId?: string; // Unique across the collection; a repeat is a duplicate
  gatewaySignature?: string; // Stored hashed, never echoed
  gatewayEventIds: string[]; // Applied webhook event ids; a repeat is a no-op
  idempotencyKey: string; // Client- or server-generated; a replay returns this record
  failureCategory?: PaymentFailureCategory;
  failureReason?: string; // Provider text, retained verbatim for dispute evidence
  reconciliation: ReconciliationStamp;
  initiatedAt: string;
  succeededAt?: string;
  failedAt?: string;
  providerSettledAt?: string; // When the provider says the money left their float
  bankSettledAt?: string; // When it landed in the platform's bank account
  createdAt: string;
  updatedAt: string;
}

/**
 * Append-only status history. Stored at
 * /PaymentTransactions/{transactionId}/events/{eventId} and never updated or deleted,
 * so "when did this become paid, and on what evidence" is answerable years later.
 */
export interface PaymentStatusEvent {
  id: string;
  transactionId: string;
  fromStatus?: PaymentTransactionStatus;
  toStatus: PaymentTransactionStatus;
  trigger: "client_callback" | "provider_webhook" | "provider_poll" | "support_action" | "scheduled_job";
  providerEventId?: string;
  providerEventType?: string; // "payment.captured", "payment.failed", "refund.processed"
  actorId: string; // UID, or "system" for automated transitions
  actorKind: AuditActorKind;
  amount?: number;
  reason?: string; // Mandatory for support_action
  rawPayloadRef?: string; // Cloud Storage pointer to the stored provider payload
  correlationId: string;
  occurredAt: string; // Provider or device time
  recordedAt: string; // Server time
}

/**
 * Money going back out to a payer. A refund is not a negative payment: it has its own
 * provider reference, its own settlement leg, and its own GST credit-note consequence.
 */
export interface RefundTransaction {
  id: string;
  paymentTransactionId: string;
  orderId?: string;
  merchantOrderId?: string;
  subscriptionInvoiceId?: string;
  status: RefundTransactionStatus;
  reasonCode: RefundReason;
  reasonNote: string;
  amount: number;
  currency: "INR";
  isPartial: boolean;
  gatewayRefundId?: string;
  gatewayEventIds: string[];
  idempotencyKey: string;
  creditNoteId?: string; // GST credit note raised against the original invoice
  requestedBy: string;
  requestedByRole: UserRole;
  approvedBy?: string; // Required above the configured refund approval threshold
  approvedAt?: string;
  failureReason?: string;
  reconciliation: ReconciliationStamp;
  requestedAt: string;
  completedAt?: string;
}

/**
 * A verified payout destination, held apart from the profile so that changing where
 * money goes is an event with an owner, a verification result, and a cooling period,
 * rather than a text edit on a profile screen.
 *
 * `accountNumberEncrypted` and `vpaEncrypted` are the only fields holding the full
 * value, are encrypted at rest with a KMS-held key, and are never returned to any
 * client, Support included. Every read path renders `maskedLabel`.
 */
export interface BeneficiaryAccount {
  id: string;
  ownerId: string; // Driver UID today; the shape also fits a future supplier payout
  ownerRole: "vehicle" | "supplier";
  type: BeneficiaryType;
  status: "active" | "superseded" | "blocked";
  verificationStatus: BeneficiaryVerificationStatus;
  verificationMethod: BeneficiaryVerificationMethod;
  verifiedName?: string; // Name returned by the VPA lookup or penny drop
  nameMatchScore?: number; // 0–100 against UserProfile.name; below the floor requires review
  maskedLabel: string; // The only representation any client ever receives
  // UPI variant
  vpaEncrypted?: string;
  vpaHandle?: string; // "@okhdfcbank"; safe to show, useful for support triage
  // Bank variant
  accountNumberEncrypted?: string;
  accountNumberLast4?: string;
  ifsc?: string; // Public routing data; validated against the 11-character IFSC format
  bankName?: string;
  branchName?: string;
  accountHolderName?: string; // As declared by the driver, before verification
  accountType?: "savings" | "current";
  fingerprint: string; // Salted hash of the normalised destination; detects duplicates across users
  duplicateOfBeneficiaryId?: string; // Set when the fingerprint already exists elsewhere
  coolingPeriodEndsAt?: string; // Payouts are held until this passes
  supersededByBeneficiaryId?: string;
  supersedesBeneficiaryId?: string;
  blockedReason?: string;
  blockedBy?: string;
  createdBy: string; // The driver, or Support acting with a recorded reason
  createdAt: string;
  verifiedAt?: string;
  lastUsedAt?: string;
}

/**
 * The frozen copy of a destination taken at payout request time. An approver looks at
 * this, and the transfer goes to this. A later profile edit cannot retarget an approved
 * payout, because the approved payout no longer refers to the profile.
 */
export interface BeneficiarySnapshot {
  beneficiaryId: string;
  type: BeneficiaryType;
  maskedLabel: string;
  verificationStatus: BeneficiaryVerificationStatus;
  verifiedName?: string;
  ifsc?: string;
  accountNumberLast4?: string;
  vpaHandle?: string;
  fingerprint: string;
  snapshotAt: string;
}

/**
 * One disbursement, one-to-one with an approved `DriverPayoutRequest`. Approval creates
 * this record in `approved`; it is not money that has moved. Only a provider success or
 * an independently verified UTR moves it to `completed`.
 */
export interface PayoutTransaction {
  id: string;
  payoutRequestId: string;
  driverId: string;
  supplierId: string; // The supplier whose float funds the payout
  subLedger: SubLedger; // Always "driver_payouts"
  status: PayoutTransactionStatus;
  rail: PayoutRail;
  grossAmount: number; // The approved request amount
  recoveryAmount: number; // Confirmed shortfalls netted off, mirrored in CashLedgerEntries
  tdsAmount: number; // Withheld under the TDS module when it is enabled and applicable
  netAmount: number; // grossAmount − recoveryAmount − tdsAmount; the figure that leaves
  currency: "INR";
  beneficiary: BeneficiarySnapshot;
  providerTransferId?: string; // Payout provider's own reference
  providerBatchId?: string;
  utr?: string; // Bank UTR; mandatory before "completed" on every rail
  utrSource?: "provider" | "manual_entry";
  requestedAt: string;
  approvedBy: string; // Supplier or Support UID; never the driver
  approvedByRole: "supplier" | "support";
  approvedAt: string;
  approvalNote?: string;
  initiatedBy: string; // Always a server function; recorded as "system"
  initiatedAt?: string;
  completedAt?: string;
  /**
   * Manual-rail completion needs two people: the actor who entered the UTR and a second
   * who checked it against the bank. `verifiedBy` must differ from `utrEnteredBy`.
   */
  utrEnteredBy?: string;
  verifiedBy?: string;
  verifiedAt?: string;
  failureCategory?: PayoutFailureCategory;
  failureReason?: string;
  retryOfPayoutTransactionId?: string;
  retriedByPayoutTransactionId?: string;
  reversalReference?: string; // Bank return reference when money comes back
  duesRestoredAt?: string; // When the reservation was released back to pendingDues
  idempotencyKey: string;
  reconciliation: ReconciliationStamp;
  createdAt: string;
  updatedAt: string;
}

/**
 * Append-only payout history at /PayoutTransactions/{payoutTransactionId}/events.
 * A payout that a driver says never arrived is answered from here.
 */
export interface PayoutStatusEvent {
  id: string;
  payoutTransactionId: string;
  fromStatus?: PayoutTransactionStatus;
  toStatus: PayoutTransactionStatus;
  trigger: "supplier_action" | "system_initiation" | "provider_webhook" | "provider_poll" | "manual_verification" | "support_action" | "scheduled_job";
  providerEventId?: string;
  providerEventType?: string;
  actorId: string;
  actorKind: AuditActorKind;
  utr?: string;
  amount?: number;
  reason?: string;
  rawPayloadRef?: string;
  correlationId: string;
  occurredAt: string;
  recordedAt: string;
}

/**
 * Carried by every record that has to tie out to a provider and a bank. Kept as one
 * shape so a reconciliation run can treat payments, refunds, and payouts identically.
 */
export interface ReconciliationStamp {
  status: ReconciliationMatchStatus;
  lastRunId?: string;
  matchedAt?: string;
  providerReference?: string; // The provider row this matched against
  bankReference?: string; // The bank statement line this matched against
  exceptionId?: string; // Open ReconciliationException, when status is "exception"
  varianceAmount?: number; // Platform amount minus provider or bank amount
}

/**
 * One execution of the daily three-way reconciliation. A run is evidence: it names the
 * window it covered, the sources it read, what it matched, and what it could not.
 */
export interface ReconciliationRun {
  id: string;
  periodDate: string; // The business date reconciled, in IST
  status: ReconciliationRunStatus;
  sources: Array<{
    kind: ReconciliationSourceKind;
    reference: string; // Provider report id or bank statement id
    rowCount: number;
    totalAmount: number;
    ingestedAt: string;
  }>;
  platformCounts: Partial<Record<SubLedger, { count: number; amount: number }>>;
  matchedCount: number;
  matchedAmount: number;
  exceptionCount: number;
  exceptionAmount: number;
  openingControlBalance: number;
  closingControlBalance: number;
  startedAt: string;
  completedAt?: string;
  triggeredBy: string; // "scheduled_job" or a Support UID for a manual re-run
  failureReason?: string;
}

/**
 * A break. Every one has an owner, an age, an SLA, and exactly one permitted set of
 * resolutions. An exception is never closed by being ignored; `written_off` is a
 * decision with an actor and a reason attached, which silence is not.
 */
export interface ReconciliationException {
  id: string;
  runId: string;
  kind: ReconciliationExceptionKind;
  status: ReconciliationExceptionStatus;
  subLedger: SubLedger;
  severity: "low" | "medium" | "high" | "critical";
  amount: number;
  varianceAmount: number;
  currency: "INR";
  paymentTransactionId?: string;
  refundTransactionId?: string;
  payoutTransactionId?: string;
  cashLedgerEntryId?: string;
  providerReference?: string;
  bankReference?: string;
  supplierId?: string;
  counterpartyId?: string; // The buyer, merchant, or driver the money concerns
  description: string;
  evidenceRefs?: string[]; // Cloud Storage pointers to provider rows and statements
  assignedTo?: string; // Support UID
  slaDueAt: string;
  firstSeenAt: string;
  ageDays: number; // Recomputed by the run; drives the aged queue
  resolution?: ReconciliationExceptionResolution;
  resolutionNote?: string;
  resolvedBy?: string;
  resolvedAt?: string;
  linkedAdjustmentIds?: string[]; // CreditTransaction or CashLedgerEntry corrections raised
  createdAt: string;
}

/**
 * An accounting period and its close evidence. Closing is what turns a set of records
 * into a statement somebody is willing to sign.
 */
export interface AccountingPeriod {
  id: string; // "2026-08"
  supplierId?: string; // Absent for the platform-level period
  status: AccountingPeriodStatus;
  periodStart: string;
  periodEnd: string;
  cutoffAt: string; // The instant after which activity belongs to the next period
  subLedgerTotals: Partial<Record<SubLedger, { count: number; amount: number }>>;
  controlAccountBalance: number;
  bankBalance: number;
  unreconciledCount: number;
  unreconciledAmount: number;
  acknowledgedExceptionIds: string[]; // Open breaks the closer explicitly accepted
  evidencePackRef?: string; // Cloud Storage pointer to the downloadable close pack
  closedBy?: string;
  closedAt?: string;
  reopenedBy?: string;
  reopenedAt?: string;
  reopenReason?: string;
}

/**
 * The control account a sub-ledger ties out to, and the rule for what "tied out" means
 * for it. Without this, a sub-ledger total is a number with nothing to be wrong
 * against. The chart is the set of `ControlAccounts` documents themselves, one per
 * `SubLedger` key, each carrying its own tie-out rule in the fields below. The control
 * that a failed tie-out is an exception rather than a log line is normative in
 * `constitution/Logikchain_Financial_Controls.md`. This record is what the reconciliation run and
 * the close pack actually read.
 */
export interface ControlAccount {
  id: string; // Matches the SubLedger key it governs
  subLedger: SubLedger;
  name: string;
  /**
   * Where the counter-balance lives. `bank` means the balance must equal a bank
   * figure; `provider` means the payment provider's float or payable; `internal`
   * means it nets against another sub-ledger rather than an external statement.
   */
  counterparty: "bank" | "provider" | "internal" | "third_party_custody";
  normalBalance: "debit" | "credit";
  tieOutSourceKind?: ReconciliationSourceKind;
  offsetSubLedger?: SubLedger; // Set when counterparty is "internal"
  toleranceAmount: number; // Absolute rupee variance treated as matched, usually 0
  status: ConfigRecordStatus;
  updatedAt: string;
  updatedBy: string;
}

/**
 * The retention and redaction rule for one class of record. Deletion is not the
 * default outcome: most classes are kept for their statutory minimum and then
 * reviewed, and only `beneficiary_secret` is destroyed on schedule, because the
 * obligation to hold a bank account number ends long before the obligation to hold
 * the payout it funded.
 */
export interface RetentionPolicy {
  id: string; // The RetentionClass key
  retentionClass: RetentionClass;
  collections: string[]; // The Firestore collections or storage prefixes governed
  minimumRetentionYears: number; // Read from configuration, never compiled in
  /**
   * What happens at expiry. `destroy` removes the record; `redact` strips identified
   * fields and keeps the rest; `review` blocks automated action and raises a Support
   * task, which is the correct outcome wherever a live dispute or assessment exists.
   */
  expiryAction: "destroy" | "redact" | "review";
  redactedFields?: string[]; // Required when expiryAction is "redact"
  encryptedAtRest: boolean;
  maskedInReads: boolean; // True wherever only a maskedLabel may leave the server
  scrubbedFromLogs: boolean;
  /**
   * Retention runs from this anchor, not from the write date. A payout's clock starts
   * at the close of the financial year it settled in, so a March payout and an April
   * payout do not expire eleven months apart.
   */
  clockStartsAt: "financial_year_end" | "record_date" | "relationship_end";
  legalHoldSupported: boolean; // Disputes and assessments suspend expiry
  status: ConfigRecordStatus;
  updatedAt: string;
  updatedBy: string;
}

/**
 * Immutable record of every privileged or money-moving action. `allow write: if false`
 * for every client and for Support: entries are written only by the functions that
 * perform the action they describe, in the same transaction, so an action that
 * succeeded without an audit entry is impossible rather than merely discouraged.
 */
export interface AuditLogEntry {
  id: string;
  category: AuditEventCategory;
  action: string; // The function name plus the verb: "reviewPayoutRequest.approve"
  actorId: string; // UID, or "system"
  actorRole: UserRole | "system";
  actorKind: AuditActorKind;
  onBehalfOfId?: string; // Set when Support acted for a user; never impersonation
  targetCollection: string;
  targetId: string;
  supplierId?: string; // Scopes the entry so a supplier can read their own network's trail
  correlationId: string; // Shared by every entry produced by one request
  requestId?: string;
  before?: Record<string, unknown>; // Only the fields that changed
  after?: Record<string, unknown>;
  amount?: number;
  currency?: "INR";
  reasonCode?: string;
  reason?: string; // Mandatory for overrides, adjustments, write-offs, and grace grants
  source: "app" | "support_console" | "cloud_function" | "webhook" | "scheduled_job";
  ipHash?: string;
  userAgentHash?: string;
  occurredAt: string;
  recordedAt: string;
}

/**
 * Counts a subscriber's consumption of a metered finance entitlement inside the current
 * billing period. Read by the gate before an export or a scheduled report runs, and
 * shown back to the subscriber so a limit is never discovered only at the point of
 * refusal.
 */
export interface FinanceEntitlementUsage {
  id: string; // `${subscriptionId}:${periodStart}`
  subscriptionId: string;
  subscriberId: string;
  subscriberRole: SubscriberRole;
  periodStart: string;
  periodEnd: string;
  counters: Partial<Record<PlanEntitlementLimitKey, number>>;
  lastUsedAt?: string;
  updatedAt: string;
}

export interface Order {
  id: string;
  gigId: string;
  supplierId: string; // Copied from the Gig at placeOrder — SUP-11 / SUP-02 query index
  buyer: string;
  village: string;
  merchantId: string;
  items: OrderItem[];
  discount?: Discount;
  subTotal: number; // Order amount before GST
  gstRate: number; // GST Rate percentage (e.g. 18 for 18%)
  gstAmount: number; // Calculated GST amount
  totalPrice: number; // subTotal + gstAmount
  supplierGstNumber: string; // GSTIN of the managing supplier
  currency: "INR";
  paymentMode: PaymentMode; // "cash_on_pickup" makes this order a cash-custody source
  paymentStatus: "paid" | "pending" | "refund_pending" | "refunded";
  deliveryStatus: "placed" | "reached_merchant" | "delivered" | "cancelled" | "suspended";
  /**
   * The pickup code itself lives at /Orders/{orderId}/private/pickup as a
   * HandoverCodeRecord, readable only by the buyer and Support. The driver and the
   * merchant see only that a code was issued, never its value — otherwise the party
   * being verified could verify itself.
   */
  pickupCodeIssuedAt: string; // Set by placeOrder
  pickupCodeLastSentAt?: string; // Updated by resendHandoverCode
  paymentIntentId?: string; // Set for online prepayment
  /**
   * The successful collection behind `paymentStatus: "paid"`. An order marked paid with
   * no transaction id is a reconciliation exception by definition, and the daily run
   * raises it as one rather than trusting the flag.
   */
  paymentTransactionId?: string;
  cashLedgerEntryId?: string; // Set when a driver records the COD collection
  cashCollectedAmount?: number; // Cash actually taken at handover; equals totalPrice on a clean COD
  custodyTransferId?: string; // The verified handover that closed this order
  deliveryProof?: DeliveryProof; // Written by markOrderDelivered
  refundId?: string; // Razorpay refund identifier on the most recent refund
  refundTransactionIds?: string[]; // Every RefundTransaction raised against this order
  refundedAmount?: number; // Cumulative across partial refunds
  refundedAt?: string;
  suspensionReason?: string; // Populated when deliveryStatus is "suspended"
  createdAt: string;
  invoiceNumber: string;
  invoiceDate: string;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  supplierName: string;
  supplierAddress: string;
  recipientName: string;
  recipientAddress: string;
  recipientShippingAddress: string;
  recipientGstNumber?: string;
  /**
   * Resolved at placement from the supplier's registered state and the recipient's
   * delivery state through the configured place-of-supply rule, then frozen. It is not
   * a constant: an inter-state supply produces IGST, and hard-coding one state produces
   * a wrong invoice the moment the platform serves a second one.
   */
  placeOfSupply: string;
  placeOfSupplyStateCode: string; // GST state code, e.g. "37" for Andhra Pradesh
  supplyType: "intra_state" | "inter_state";
  creditNoteId?: string; // GST credit note issued on cancellation or refund
  authorizedSignatory: string;
}

/**
 * A GST credit note against an already-issued invoice. Invoices are never rewritten,
 * so a cancelled or refunded order is corrected by issuing one of these against it and
 * reporting it in the same return period.
 */
export interface CreditNote {
  id: string;
  creditNoteNumber: string; // "CN-" + YYMMDD + daily sequence
  creditNoteDate: string;
  againstInvoiceNumber: string;
  againstInvoiceDate: string;
  orderId?: string;
  merchantOrderId?: string;
  subscriptionInvoiceId?: string;
  supplierId: string;
  supplierGstNumber: string;
  recipientName: string;
  recipientGstNumber?: string;
  placeOfSupply: string;
  placeOfSupplyStateCode: string;
  supplyType: "intra_state" | "inter_state";
  reasonCode: RefundReason;
  reason: string;
  taxableValue: number;
  gstRate: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  totalAmount: number;
  isPartial: boolean;
  refundTransactionId?: string;
  /**
   * The GST return period the credit note must be reported in. A credit note raised
   * against a closed accounting period is still reported in the period it was issued,
   * which is why this is stored rather than derived from the invoice date.
   */
  reportingPeriod: string; // "2026-08"
  againstAccountingPeriodId: string; // The period the original invoice sat in
  issuedBy: string;
  issuedAt: string;
}

/**
 * The tax registration and place-of-supply configuration for one supplying entity.
 * Every GST figure on the platform is resolved through one of these at document time
 * and then frozen onto the document. Nothing recomputes tax from live configuration
 * later: a rate change must not silently rewrite last quarter's invoices.
 */
export interface TaxProfile {
  id: string;
  supplierId: string; // The supplying entity; one profile per GSTIN
  gstin: string;
  legalName: string;
  tradeName?: string;
  registeredStateName: string;
  registeredStateCode: string; // GST state code, e.g. "37"
  registrationType: "regular" | "composition" | "unregistered";
  /**
   * The basis used to resolve place of supply per document class. Configured, not
   * assumed: a buyer order delivered in the supplier's own state is intra-state, and
   * the same catalogue sold across a border is not.
   */
  placeOfSupplyBasis: {
    buyerOrder: PlaceOfSupplyBasis;
    merchantOrder: PlaceOfSupplyBasis;
    subscription: PlaceOfSupplyBasis;
  };
  defaultGstRate: number; // Applied where a product carries no rate of its own
  /**
   * Reverse-charge and export handling are declared rather than inferred. A profile
   * that does not support a case refuses the document instead of issuing an invoice
   * whose tax treatment nobody chose.
   */
  reverseChargeSupported: boolean;
  exportSupplySupported: boolean;
  invoiceNumberPrefix: string; // Per-supplier, per-financial-year gapless series
  creditNoteNumberPrefix: string;
  authorizedSignatory: string;
  status: ConfigRecordStatus;
  effectiveFrom: string;
  effectiveTo?: string;
  createdAt: string;
  updatedAt: string;
  updatedBy: string;
}

/**
 * The TDS withholding module for driver and contractor payouts. It is deliberately a
 * configurable module with an explicit `enabled` switch and a recorded adviser
 * confirmation, because whether this platform is the person obliged to deduct is a
 * question of the contracting model, not of software. Shipping withholding on by
 * default would deduct tax the platform may have no authority to deduct; shipping it
 * absent would leave no way to comply once it does.
 */
export interface TdsConfiguration {
  id: string;
  enabled: boolean; // Default false until confirmed
  section: TdsSection;
  deductorTan?: string; // Required when enabled
  deductorPan?: string;
  rateWithPan: number; // Percentage
  rateWithoutPan: number; // The higher non-PAN rate
  singlePaymentThreshold: number; // Withhold when one payout exceeds this
  annualThreshold: number; // Withhold on all payouts once cumulative FY value exceeds this
  financialYearStartMonth: number; // 4 for the Indian financial year
  /**
   * Whether crossing the annual threshold applies retrospectively to earlier payouts
   * in the same year. This changes the arithmetic materially and is a tax-adviser
   * decision, so the product records the answer instead of choosing one.
   */
  appliesRetrospectivelyOnThresholdBreach: boolean;
  requirePanBeforePayout: boolean;
  /**
   * Named confirmation that a qualified adviser reviewed this configuration. The
   * module refuses to run with `enabled: true` and no confirmation, so nobody can
   * turn statutory withholding on as a convenience setting.
   */
  adviserConfirmedBy?: string;
  adviserConfirmedAt?: string;
  adviserReference?: string;
  status: ConfigRecordStatus;
  effectiveFrom: string;
  effectiveTo?: string;
  updatedAt: string;
  updatedBy: string;
}

/**
 * One withholding event against one payout. Immutable: a correction is another
 * deduction of the opposite sign, never an edit, because the original figure was
 * already reported to the deductee.
 */
export interface TdsDeduction {
  id: string;
  payoutTransactionId: string;
  driverId: string;
  supplierId: string;
  section: TdsSection;
  financialYear: string; // "2026-27"
  quarter: TdsQuarter;
  panProvided: boolean;
  panLast4?: string; // Full PAN is encrypted on the profile and never returned
  grossAmount: number;
  rateApplied: number;
  tdsAmount: number;
  netPaidAmount: number;
  thresholdBasis: "single_payment" | "annual_cumulative" | "retrospective_catch_up";
  cumulativeFyGrossBefore: number;
  cumulativeFyTdsBefore: number;
  status: TdsDeductionStatus;
  challanId?: string;
  certificateId?: string;
  reversalOfDeductionId?: string; // Set on a negative correction
  configurationId: string; // The TdsConfiguration version that decided this figure
  subLedger: "taxes_withheld";
  createdAt: string;
}

/**
 * Evidence that withheld tax was deposited. Until a deduction is covered by one of
 * these, the platform is holding somebody else's money, and the close pack says so.
 */
export interface TdsChallan {
  id: string;
  challanNumber: string; // Bank challan identification number
  bsrCode: string;
  depositDate: string;
  financialYear: string;
  quarter: TdsQuarter;
  section: TdsSection;
  totalAmount: number;
  deductionIds: string[];
  evidenceRef: string; // Cloud Storage pointer to the stamped challan
  recordedBy: string;
  recordedAt: string;
}

/**
 * A Form 16A issued to a deductee for a quarter. The driver can always read their own,
 * on any plan and after cancellation, because it is their tax document rather than a
 * platform report.
 */
export interface TdsCertificate {
  id: string;
  certificateNumber: string;
  driverId: string;
  financialYear: string;
  quarter: TdsQuarter;
  section: TdsSection;
  grossAmount: number;
  tdsAmount: number;
  deductionIds: string[];
  challanIds: string[];
  returnAcknowledgementNumber?: string; // Quarterly return the certificate was drawn from
  status: TdsCertificateStatus;
  documentRef?: string; // Cloud Storage pointer to the issued PDF
  supersedesCertificateId?: string; // Set on a revised certificate
  issuedBy?: string;
  issuedAt?: string;
}

export interface MerchantOrder {
  id: string;
  gigId: string; // The run this bulk load rides on. placeMerchantOrder requires it.
  merchantId: string;
  merchantName: string;
  supplierId: string;
  supplierName: string;
  items: OrderItem[];
  discount?: Discount;
  subTotal: number; // Order amount before GST
  gstRate: number; // GST Rate percentage (e.g. 18 for 18%)
  gstAmount: number; // Calculated GST amount
  totalPrice: number; // subTotal + gstAmount
  supplierGstNumber: string; // GSTIN of the supplier
  currency: "INR";
  paymentMode: MerchantOrderPaymentMode;
  paidWithCredit: boolean; // True when placeMerchantOrder drew on the merchant's credit line; mirrors paymentMode === "credit"
  status: "placed" | "reached" | "delivered" | "cancelled" | "suspended";
  /**
   * As with Order.pickupCode, the handover code lives at
   * /MerchantOrders/{merchantOrderId}/private/handover and is readable only by the
   * merchant and Support. The delivering driver can request a resend but never a read.
   */
  handoverCodeIssuedAt: string; // Set by placeMerchantOrder
  handoverCodeLastSentAt?: string;
  creditTransactionId?: string; // The "draw" transaction, when paymentMode is "credit"
  paymentIntentId?: string; // Set when paymentMode is "online"
  paymentTransactionId?: string; // The successful collection, when paymentMode is "online"
  cashLedgerEntryId?: string; // Set when paymentMode is "cash_on_delivery" and the driver collects
  cashCollectedAmount?: number;
  custodyTransferId?: string; // The verified handover that closed this order
  deliveryProof?: DeliveryProof; // Written by updateMerchantOrderStatus when status becomes "delivered"
  suspensionReason?: string; // Populated when status is "suspended"
  createdAt: string;
  invoiceNumber: string;
  invoiceDate: string;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  supplierAddress: string;
  recipientName: string;
  recipientAddress: string;
  recipientShippingAddress: string;
  recipientGstNumber?: string;
  placeOfSupply: string;
  placeOfSupplyStateCode: string;
  supplyType: "intra_state" | "inter_state";
  creditNoteId?: string;
  authorizedSignatory: string;
}

export interface CreditPaymentMade {
  id: string;
  amount: number;
  date: string;
  method: "cash_to_driver" | "online" | "adjustment";
  creditTransactionId: string; // Evidence trail for this repayment; the pending entry for cash
  custodyTransferId?: string; // Present for cash_to_driver
  paymentIntentId?: string; // Present for online
  paymentTransactionId?: string; // Present for online; the reconciled collection record
  /**
   * False while a cash repayment is still in a driver's custody. **A repayment with
   * `settled: false` has not relieved credit.** The merchant's statement therefore shows
   * it as paid-and-pending rather than as a reduction, and the two figures are never
   * added together.
   */
  settled: boolean;
  settledCreditTransactionId?: string; // The repayment_cash_settled entry that relieved it
  settledAt?: string;
  reliefDueBy?: string; // Ceiling by which relief posts regardless of the driver reaching the hub
}

export interface CreditPaymentDue {
  id: string;
  amount: number;
  dueDate: string;
  status: "pending" | "overdue" | "paid";
}

export interface CreditProfile {
  merchantId: string;
  supplierId: string; // The supplier extending the credit; authorises every limit change
  creditLimit: number;
  creditUsed: number;
  /**
   * `creditLimit - creditUsed + provisionalCreditGranted`. Recomputed server-side in the
   * same transaction as any component; never client-written. The provisional term is
   * additive rather than folded into creditUsed so that a merchant, a supplier, and an
   * auditor can all see how much of the room on offer is real headroom and how much is
   * being lent against cash the supplier has not yet counted.
   */
  creditAvailable: number;
  /**
   * Cash the merchant has handed to a driver against a verified receipt, which the
   * supplier has not yet counted. **Credit is not relieved here.** `creditUsed` stays
   * where it was until `confirmCashSettlement`, so this figure is a pending repayment,
   * not an already-applied one. It exists so all three parties can see the same money in
   * flight and so the same debt cannot be collected twice: the payable balance a driver
   * may ask for is `creditUsed - pendingRepayments`.
   */
  pendingRepayments: number;
  /**
   * Spending room the supplier has chosen to lend back against `pendingRepayments` while
   * the cash is in transit, capped at `provisionalCreditCap`. Zero unless the supplier
   * opted in per merchant. This is a deliberate, bounded, and separately displayed
   * exposure rather than an implicit overdraft: it is added to `creditAvailable`, it
   * carries `provisional_grant` and `provisional_release` entries in the credit ledger,
   * and it appears on the supplier's risk display as money at risk with a named driver.
   */
  provisionalCreditGranted: number;
  provisionalCreditCap: number; // Supplier-set absolute ceiling in INR; 0 disables the allowance entirely
  provisionalCreditEnabled: boolean; // Defaults to false; only the owning supplier may turn it on
  lastTransactionId?: string; // Head of the CreditTransactions chain, for optimistic concurrency
  paymentsMade: CreditPaymentMade[];
  paymentsDue: CreditPaymentDue[];
  updatedAt: string;
}

/**
 * A denormalised summary row for the driver's payment history list. The authoritative
 * record is `PayoutTransaction`; this exists so the wallet screen can render without
 * reading a second collection, and it never carries a status the transaction does not.
 */
export interface DriverPayment {
  id: string;
  payoutTransactionId: string;
  amount: number; // Net amount that left, matching PayoutTransaction.netAmount
  date: string;
  status: PayoutTransactionStatus;
  rail: PayoutRail;
  utr?: string;
  destinationLabel: string; // Masked
}

/**
 * `pending` here means "awaiting the supplier's decision", and nothing else. Once a
 * request is approved, its money-movement state lives on the `PayoutTransaction`;
 * conflating the two is what previously let "approved" read as "paid".
 */
export interface DriverPayoutRequest {
  id: string;
  amount: number;
  date: string;
  status: "pending" | "approved" | "rejected" | "cancelled";
  destination: BeneficiarySnapshot; // Frozen at request time
  payoutTransactionId?: string; // Created on approval
  cashInCustodyAtRequest: number; // Recorded so an approver can see whether cash was outstanding
  beneficiaryCoolingUntil?: string; // Non-null when the destination changed recently
  reviewedBy?: string; // Supplier or Support UID that actioned the request
  reviewedAt?: string;
  reviewNote?: string;
  rejectionReason?: string;
}

export interface DriverEarning {
  driverId: string;
  supplierId: string;
  totalEarnings: number;
  /**
   * Withdrawable now. `requestPayout` moves money out of here and into
   * `reservedForPayout`; it does not delete it. A rejected or permanently failed payout
   * returns the amount here atomically, so a driver's balance is always
   * `pendingDues + reservedForPayout` until money actually leaves.
   */
  pendingDues: number;
  reservedForPayout: number; // Requested or in-flight, not yet settled
  lifetimePaidOut: number;
  /**
   * Supplier money currently in the driver's pocket, derived from CashLedgerEntries
   * with status "in_custody". Payouts are blocked while this exceeds zero on a
   * completed gig, so a driver cannot cash out earnings while holding unsettled cash.
   */
  cashInCustody: number;
  cashRecoverable: number; // Confirmed shortfalls resolved as "recover_from_earnings", not yet recovered
  tdsWithheldThisFinancialYear: number; // Drives threshold monitoring when the TDS module is on
  grossPaidThisFinancialYear: number;
  openSettlementIds: string[];
  activeBeneficiaryId?: string;
  payoutMethod?: {
    type: BeneficiaryType;
    maskedLabel: string;
    verificationStatus: BeneficiaryVerificationStatus;
  };
  payments: DriverPayment[];
  payoutRequests: DriverPayoutRequest[];
  updatedAt: string;
}

export interface CreditIncreaseRequest {
  id: string;
  merchantId: string;
  supplierId: string; // Managing supplier — SUP-04.3 query index. Written by requestCreditIncrease.
  requestedAmount: number; // Additional credit requested on top of the current creditLimit
  reason: string;
  status: "pending_supplier_approval" | "approved" | "rejected";
  createdAt: string;
  reviewedBy?: string; // Supplier or Support UID that actioned the request
  reviewedAt?: string;
  approvedAmount?: number; // Additional credit actually granted; may be less than requestedAmount
  rejectionReason?: string;
}

export interface DeviceToken {
  token: string; // FCM registration token
  platform: "web" | "android" | "ios";
  updatedAt: string;
}

export interface Notification {
  id: string;
  userId: string; // Recipient UID
  category: NotificationCategory;
  title: string;
  body: string;
  deepLink?: string; // In-app route the notification opens
  relatedEntityId?: string; // Gig, Order, MerchantOrder, or request ID
  read: boolean;
  createdAt: string;
}

export interface CreateSupplierRequest {
  email: string;
  name: string;
  phone: string;
  countryId?: string;
  location?: string;
}

export interface CreateSupplierResponse {
  success: boolean;
  supplierId: string;
}

export interface ConvertBuyerToRoleRequest {
  buyerId: string;
  targetRole: "merchant" | "vehicle";
}

export interface ConvertBuyerToRoleResponse {
  success: boolean;
  userId: string;
  newRole: "merchant" | "vehicle";
  /**
   * Which runtime is official for the new role. `"android"` (vehicle) means the
   * PWA must hand off into the Play app rather than unlock driver chrome.
   * `"web"` (merchant) means the PWA remains legal. See `constitution/Logikchain_Architecture.md`.
   */
  officialClient: "web" | "android";
}

export interface UpdateUserProfileRequest {
  userId?: string; // Support-only; defaults to the caller's own UID
  name?: string;
  address?: string;
  contactInfo?: string;
  location?: string;
  villageId?: string;
  selectedMerchantId?: string;
  shopDetails?: string;
  gstin?: string;
  /**
   * `payoutMethod` is deliberately absent. A payout destination is money movement, not a
   * preference, and moves only through `registerPayoutBeneficiary` so that verification,
   * duplicate detection, the cooling period, and the notification all run.
   */
  panNumber?: string;
  vehicleNumber?: string;
  vehicleType?: string;
  permissions?: {
    location: boolean;
    sms: boolean;
    audio: boolean;
    camera: boolean;
  };
}

export interface UpdateUserProfileResponse {
  success: boolean;
  userId: string;
  updatedFields: string[];
}

export interface DisassociateMerchantRequest {
  merchantId: string;
  reason: string;
}

export interface DisassociateMerchantResponse {
  success: boolean;
  suspendedOrderIds: string[];
  suspendedMerchantOrderIds: string[];
}

export interface ComposeGigRequest {
  title: string;
  routeId: string;
  vehicleId: string;
  pamphletId: string;
  merchantIds: string[]; // Merchants served on this Gig; must belong to the calling supplier
  date: string;
  arrivingTimes: Record<string, string>;
}

export interface ComposeGigResponse {
  success: boolean;
  gigId: string;
}

export interface StartGigRequest {
  gigId: string;
}

export interface StartGigResponse {
  success: boolean;
  startedAt: string;
}

export interface UpdateGigLocationRequest {
  gigId: string;
  currentVillageIndex: number;
  currentVillageStatus: "arriving" | "reached" | "left";
}

export interface UpdateGigLocationResponse {
  success: boolean;
}

export interface CompleteAndFinalizeGigRequest {
  gigId: string;
}

export interface CompleteAndFinalizeGigResponse {
  success: boolean;
  totalEarnings: number;
  cashToHandOver: number; // Sum of the driver's in_custody ledger entries for this gig; 0 when nothing was collected
  settlementId?: string; // The CashSettlement opened for cashToHandOver; absent when cashToHandOver is 0
}

export interface SuspendGigRequest {
  gigId: string;
  reason: string;
}

export interface SuspendGigResponse {
  success: boolean;
  suspendedAt: string;
  suspendedOrderIds: string[];
}

export interface ReassignGigDriverRequest {
  gigId: string;
  vehicleId: string; // Replacement driver UID
}

export interface ReassignGigDriverResponse {
  success: boolean;
  gigId: string;
  driverName: string;
  resumeVillageIndex: number; // Last visited currentVillageIndex the new driver resumes from
}

export interface PlaceOrderRequest {
  gigId: string;
  village: string;
  merchantId: string;
  items: Array<{ productId: string; quantity: number }>;
  discountCode?: string;
  paymentMode: PaymentMode;
}

export interface PlaceOrderResponse {
  success: boolean;
  orderId: string;
  subTotal: number;
  gstAmount: number;
  totalPrice: number;
  pickupCode: string; // Returned once, to the placing buyer only, and never readable from Order
  paymentIntentId?: string; // Present when paymentMode is "online"
}

export interface CancelOrderRequest {
  orderId: string;
}

export interface CancelOrderResponse {
  success: boolean;
}

export interface MarkOrderDeliveredRequest {
  orderId: string;
  proof: DeliveryProofInput;
  cashCollected?: number; // Required when Order.paymentMode is "cash_on_pickup"
  idempotencyKey: string; // Stable across offline replays of the same physical handover
}

export interface MarkOrderDeliveredResponse {
  success: boolean;
  deliveredAt: string;
  custodyTransferId: string;
  cashLedgerEntryId?: string;
  cashInCustody: number; // The driver's running custody total after this handover
}

export interface PlaceMerchantOrderRequest {
  supplierId: string;
  items: Array<{ productId: string; quantity: number }>;
  discountCode?: string;
  paymentMode: MerchantOrderPaymentMode;
  payWithCredit: boolean; // Retained for compatibility; must equal paymentMode === "credit"
}

export interface PlaceMerchantOrderResponse {
  success: boolean;
  merchantOrderId: string;
  subTotal: number;
  gstAmount: number;
  totalPrice: number;
  handoverCode: string; // Returned once, to the placing merchant only
  creditTransactionId?: string;
  paymentIntentId?: string;
  creditAvailable: number;
}

export interface UpdateMerchantOrderStatusRequest {
  merchantOrderId: string;
  status: "reached" | "delivered";
  proof?: DeliveryProofInput; // Required when status is "delivered"
  cashCollected?: number; // Required when status is "delivered" and paymentMode is "cash_on_delivery"
  idempotencyKey?: string; // Required when status is "delivered"
}

export interface UpdateMerchantOrderStatusResponse {
  success: boolean;
  status: "reached" | "delivered";
  updatedAt: string;
  custodyTransferId?: string;
  cashLedgerEntryId?: string;
  cashInCustody?: number;
}

export interface ResendHandoverCodeRequest {
  orderId?: string; // Exactly one target of the four must be supplied
  merchantOrderId?: string;
  custodyTransferId?: string; // A pending credit repayment
  settlementId?: string;
  channel: "sms" | "voice"; // Voice call-out for low-literacy or SMS-blocked recipients
}

export interface ResendHandoverCodeResponse {
  success: boolean;
  sentTo: string; // Masked recipient phone, e.g. "+91 ****3456"
  sendCount: number;
  nextResendAvailableAt: string;
}

export interface IssueOfflineCodeBatchRequest {
  purpose: "bulk_order_handover" | "credit_repayment" | "cash_settlement";
  count?: number; // Defaults to 20, capped at 50
}

export interface IssueOfflineCodeBatchResponse {
  success: boolean;
  batchId: string;
  codes: Array<{ counter: number; code: string }>; // Returned once, to the owner only
  expiresAt: string;
}

export interface AuthorizeVerificationFallbackRequest {
  transferKind: CustodyTransferKind;
  orderId?: string;
  merchantOrderId?: string;
  custodyTransferId?: string;
  settlementId?: string;
  grantedTo: string; // Driver UID that will use the fallback
  reason: string;
}

export interface AuthorizeVerificationFallbackResponse {
  success: boolean;
  authorizationId: string;
  expiresAt: string;
}

export interface InitiateCreditRepaymentRequest {
  merchantId: string; // The paying merchant, resolved from the driver's gig
  gigId: string;
  amount: number;
  duesTargeted?: string[]; // CreditPaymentDue ids; defaults to oldest-first allocation
  idempotencyKey: string;
}

export interface InitiateCreditRepaymentResponse {
  success: boolean;
  custodyTransferId: string;
  amount: number;
  outstandingBefore: number;
  challengeExpiresAt: string;
  codeSentTo: string; // Masked merchant phone
}

export interface ConfirmCreditRepaymentRequest {
  custodyTransferId: string;
  proof: VerificationInput;
  idempotencyKey: string;
}

export interface ConfirmCreditRepaymentResponse {
  success: boolean;
  creditTransactionId: string; // The repayment_cash_pending entry
  cashLedgerEntryId: string;
  creditUsed: number; // Unchanged by this call; returned so the merchant's screen cannot imply otherwise
  creditAvailable: number; // Moves only by the provisional grant, if the supplier enabled one
  pendingRepayments: number;
  provisionalCreditGranted: number;
  reliefDueBy: string; // When credit is restored at the latest, settlement or not
  cashInCustody: number; // Driver's running total
}

export interface SuspendUserRequest {
  userId: string;
  scope: SuspensionScope;
  reasonCode: SuspensionReasonCode;
  reason: string;
  internalNote?: string;
  restorePath: string;
  autoRestoreAt?: string;
  /**
   * Set on a second call to proceed once the caller has seen the custody consequences the
   * first call returned. A suspension that would halt a gig or strand cash refuses without
   * it, so nobody stops a driver mid-route without being told what that does to the money.
   */
  acknowledgeCustodyPlan?: boolean;
  reassignToDriverId?: string; // Optional replacement driver for the halted gig
  idempotencyKey: string;
}

export interface SuspendUserResponse {
  success: boolean;
  userId: string;
  status: UserStatus;
  suspension?: SuspensionRecord;
  /**
   * Returned instead of applying the suspension when consequences exist and
   * `acknowledgeCustodyPlan` was not set. `success` is false and nothing was written.
   */
  requiresCustodyAcknowledgement?: boolean;
  custodyPlan?: SuspensionCustodyPlan;
  refreshTokensRevokedAt?: string; // When the server invalidated the user's refresh tokens
  claimsEffectiveWithinSeconds?: number; // Worst-case delay before a live ID token stops reading
}

export interface RestoreUserRequest {
  userId: string;
  restoreNote: string;
  idempotencyKey: string;
}

export interface RestoreUserResponse {
  success: boolean;
  userId: string;
  status: UserStatus;
  outstandingSettlementIds: string[]; // Restoration does not clear these; they are returned so nobody assumes it did
}

export interface SetProvisionalCreditPolicyRequest {
  merchantId: string;
  enabled: boolean;
  cap: number; // Absolute INR ceiling; must be 0 when enabled is false
  reason: string;
}

export interface SetProvisionalCreditPolicyResponse {
  success: boolean;
  merchantId: string;
  provisionalCreditEnabled: boolean;
  provisionalCreditCap: number;
  provisionalCreditGranted: number; // Recomputed immediately against current pendingRepayments
  creditAvailable: number;
  creditTransactionId?: string; // Present when the change moved the granted figure
}

/**
 * How wide a custody question is being asked. The narrow scopes answer "what does
 * this one person owe me", the wide ones answer "how much of my money is out there".
 * A supplier may only ask for their own network; only Support may ask "platform".
 */
export type CashCustodyScope =
  | "settlement"
  | "gig"
  | "driver"
  | "merchant"
  | "supplier"
  | "platform";

export interface GetCashCustodySummaryRequest {
  scope?: CashCustodyScope; // Defaults to "settlement", "gig", "driver" or "merchant" per the id supplied; defaults to "gig" when none is
  gigId?: string; // Defaults to the caller's active or most recently completed gig
  driverId?: string; // Supplier or Support only
  merchantId?: string; // Supplier or Support only
  supplierId?: string; // Required for "supplier" scope; supplier callers are pinned to their own id and may not name another
  settlementId?: string;
  agedOverHours?: number; // Restricts the wide scopes to settlements open longer than this
  weakProofOnly?: boolean; // Restricts to entries whose verification strength is "weak"
}

/**
 * One row of a wide-scope rollup: a party and what they are holding. Present only
 * for the "supplier" and "platform" scopes, where the answer is a list of holders
 * rather than a single person's ledger.
 */
export interface CashCustodyHolderSummary {
  holderId: string;
  holderName: string;
  holderRole: CustodyPartyRole;
  supplierId?: string;
  amountInCustody: number;
  weakProofAmount: number;
  openSettlementIds: string[];
  oldestOpenSettlementAt?: string;
  openDiscrepancyCount: number;
}

export interface GetCashCustodySummaryResponse {
  scope: CashCustodyScope; // Echoes what the server actually answered
  gigId?: string;
  driverId?: string; // Absent for the "supplier" and "platform" scopes
  driverName?: string;
  supplierId?: string; // Absent for the "platform" scope
  expectedAmount: number; // The total in custody for the scope asked
  weakProofAmount: number; // How much of expectedAmount rests on a weak proof
  breakdown: CashSettlementLine[]; // By source for narrow scopes; by holder-role for wide ones
  entries: CashLedgerEntry[]; // Populated for narrow scopes only; empty for wide ones
  holders?: CashCustodyHolderSummary[]; // Populated for "supplier" and "platform" only
  settlementId?: string;
  settlementStatus?: CashSettlementStatus;
  openSettlementCount: number;
  openDiscrepancyCount: number;
  oldestOpenSettlementAt?: string;
  asOf: string; // Server timestamp; the figure both parties are quoting
}

export interface DeclareCashHandoverRequest {
  settlementId: string;
  declaredAmount: number;
  varianceNote?: string; // Required when declaredAmount differs from expectedAmount
  idempotencyKey: string;
}

export interface DeclareCashHandoverResponse {
  success: boolean;
  settlementId: string;
  status: CashSettlementStatus;
  expectedAmount: number;
  declaredAmount: number;
  variance: number;
  challengeExpiresAt: string;
}

export interface ConfirmCashSettlementRequest {
  settlementId: string;
  countedAmount: number;
  proof: VerificationInput; // Supplier-side confirmation; driver submits the supplier's code
  varianceResolution?: CashVarianceResolution; // Required when countedAmount !== expectedAmount
  varianceNote?: string;
  idempotencyKey: string;
}

export interface ConfirmCashSettlementResponse {
  success: boolean;
  settlementId: string;
  status: CashSettlementStatus;
  expectedAmount: number;
  countedAmount: number;
  variance: number;
  varianceKind: CashVarianceKind;
  discrepancyId?: string;
  cashInCustody: number; // Driver's remaining custody after the sweep
}

export interface RaiseCashDiscrepancyRequest {
  kind: CashDiscrepancyKind;
  amount: number;
  againstPartyId: string;
  gigId?: string;
  settlementId?: string;
  custodyTransferId?: string;
  orderId?: string;
  merchantOrderId?: string;
  description: string;
  evidenceUrls?: string[];
}

export interface RaiseCashDiscrepancyResponse {
  success: boolean;
  discrepancyId: string;
  status: CashDiscrepancyStatus;
}

export interface ResolveCashDiscrepancyRequest {
  discrepancyId: string;
  resolution: CashVarianceResolution;
  adjustedAmount?: number; // Defaults to CashDiscrepancy.amount
  resolutionNote: string;
}

export interface ResolveCashDiscrepancyResponse {
  success: boolean;
  discrepancyId: string;
  status: "resolved" | "written_off";
  cashLedgerEntryId?: string; // The adjustment entry that balances the ledger
  creditTransactionId?: string; // Present when the resolution touched a merchant's credit
}

export interface CancelMerchantOrderRequest {
  merchantOrderId: string;
  reason?: string;
}

export interface CancelMerchantOrderResponse {
  success: boolean;
  creditReleased: number; // Credit returned to creditAvailable, 0 for non-credit orders
}

export interface RequestCreditIncreaseRequest {
  requestedAmount: number;
  reason: string;
}

export interface RequestCreditIncreaseResponse {
  success: boolean;
  requestId: string;
}

export interface SetMerchantCreditLimitRequest {
  merchantId: string;
  creditLimit: number; // Absolute new limit in INR, not a delta
  note?: string;
}

export interface SetMerchantCreditLimitResponse {
  success: boolean;
  creditLimit: number;
  creditAvailable: number;
}

export interface ReviewCreditIncreaseRequestRequest {
  requestId: string;
  decision: "approve" | "reject";
  approvedAmount?: number; // Additional credit granted; defaults to requestedAmount on approval
  rejectionReason?: string; // Required when decision is "reject"
}

export interface ReviewCreditIncreaseRequestResponse {
  success: boolean;
  status: "approved" | "rejected";
  creditLimit: number;
  creditAvailable: number;
}

export interface CreatePaymentIntentRequest {
  purpose: PaymentPurpose;
  orderId?: string; // Required when purpose is "buyer_order"
  merchantOrderId?: string; // Required when purpose is "merchant_order"
  subscriptionId?: string; // Required when purpose is "subscription"
  amount?: number; // Only honoured for "merchant_credit_repayment"; clamped to the outstanding balance
  duesTargeted?: string[];
}

export interface CreatePaymentIntentResponse {
  success: boolean;
  paymentIntentId: string;
  paymentTransactionId: string; // The attempt record; shown to the payer as their reference
  gatewayOrderId: string;
  amount: number; // Server-derived amount the client must present to the gateway
  currency: "INR";
  reused: boolean; // True when an open intent was returned instead of a new one
}

/**
 * Confirms a PaymentIntent the server already priced. `amount` is deliberately absent:
 * the authoritative figure is PaymentIntent.amount, and a mismatch between the intent
 * and the gateway payload is rejected as AMOUNT_MISMATCH rather than reconciled.
 */
export interface ProcessPaymentRequest {
  paymentIntentId: string;
  paymentTransactionId: string;
  gatewayPaymentId: string;
  gatewaySignature: string; // HMAC over gatewayOrderId + gatewayPaymentId; mandatory
}

export interface ProcessPaymentResponse {
  success: boolean;
  transactionStatus: PaymentIntentStatus;
  paymentTransactionId: string;
  paymentTransactionStatus: PaymentTransactionStatus;
  /**
   * Deliberately distinct from `success`. A call can succeed and return
   * `paymentTransactionStatus: "pending"`, which the UI must render as "waiting for the
   * bank", never as "paid". Only "succeeded" is money received.
   */
  gatewayPaymentId?: string;
  creditTransactionId?: string; // Present when the intent was a credit repayment
  creditUsed?: number;
  creditAvailable?: number;
  activatedEntitlements?: FinanceEntitlement[]; // Present when the intent was a subscription
}

export interface RefundOrderRequest {
  orderId: string;
  amount?: number; // Defaults to the full Order.totalPrice, less amounts already refunded
  reasonCode: RefundReason;
  reason: string;
  idempotencyKey: string;
}

export interface RefundOrderResponse {
  success: boolean;
  refundTransactionId: string;
  refundId: string; // Gateway reference; absent until the provider accepts
  refundedAmount: number;
  cumulativeRefundedAmount: number;
  isPartial: boolean;
  creditNoteId?: string; // Raised in the same transaction for a taxable supply
  requiresApproval: boolean; // True when the amount is above the configured threshold
  paymentStatus: "refund_pending" | "refunded";
}

export interface RegisterPayoutBeneficiaryRequest {
  type: BeneficiaryType;
  vpa?: string; // Required when type is "upi"
  accountNumber?: string; // Required when type is "bank"
  accountNumberConfirm?: string; // Must match; a mistyped account number pays a stranger
  ifsc?: string;
  accountHolderName?: string;
  accountType?: "savings" | "current";
  stepUpToken: string; // Proof of a fresh OTP re-authentication, required for every change
  idempotencyKey: string;
}

export interface RegisterPayoutBeneficiaryResponse {
  success: boolean;
  beneficiaryId: string;
  maskedLabel: string;
  verificationStatus: BeneficiaryVerificationStatus;
  verifiedName?: string;
  nameMatchScore?: number;
  coolingPeriodEndsAt?: string; // Payouts are held until this passes
  supersededBeneficiaryId?: string;
}

export interface BlockPayoutBeneficiaryRequest {
  beneficiaryId: string;
  reason: string;
}

export interface BlockPayoutBeneficiaryResponse {
  success: boolean;
  beneficiaryId: string;
  status: "blocked";
  heldPayoutTransactionIds: string[]; // Payouts stopped by this block
}

export interface RequestPayoutRequest {
  amount: number;
  idempotencyKey: string;
}

export interface RequestPayoutResponse {
  success: boolean;
  payoutRequestId: string;
  amount: number;
  destination: BeneficiarySnapshot; // Masked echo, so the driver can confirm where money is going
  pendingDues: number; // After the reservation
  reservedForPayout: number;
  beneficiaryCoolingUntil?: string;
}

export interface ReviewPayoutRequestRequest {
  driverId: string;
  payoutRequestId: string;
  decision: "approve" | "reject";
  approvalNote?: string;
  rejectionReason?: string; // Required when decision is "reject"
  acknowledgedBeneficiaryLabel?: string; // The masked label the approver saw; a mismatch aborts
}

export interface ReviewPayoutRequestResponse {
  success: boolean;
  status: "approved" | "rejected";
  payoutTransactionId?: string; // Present on approval; status is "approved", not "completed"
  netAmount?: number;
  recoveryAmount?: number;
  tdsAmount?: number;
  pendingDues: number;
  reservedForPayout: number;
}

/**
 * Server-only. Hands an approved payout to the rail. Never callable by a client: the
 * actor that authorises a transfer is not the actor that sends it.
 */
export interface InitiatePayoutTransferRequest {
  payoutTransactionId: string;
  rail?: PayoutRail; // Defaults to the rail resolved from the beneficiary type
  idempotencyKey: string;
}

export interface InitiatePayoutTransferResponse {
  success: boolean;
  payoutTransactionId: string;
  status: PayoutTransactionStatus;
  providerTransferId?: string;
}

/**
 * The only path to `completed`. Called by the payout provider's webhook, by the poller,
 * or — on the manual fallback rail — by a Support actor entering a UTR, which then
 * still requires `verifyManualPayout` before the payout is complete.
 */
export interface RecordPayoutSettlementRequest {
  payoutTransactionId: string;
  outcome: "success" | "failure" | "reversal";
  utr?: string; // Mandatory on success
  providerTransferId?: string;
  providerEventId?: string;
  providerSignature?: string; // Mandatory on the webhook path
  failureCategory?: PayoutFailureCategory;
  failureReason?: string;
  reversalReference?: string;
  settledAt?: string;
}

export interface RecordPayoutSettlementResponse {
  success: boolean;
  payoutTransactionId: string;
  status: PayoutTransactionStatus;
  utr?: string;
  duesRestored?: number; // Non-zero when a failure released the reservation
  pendingDues?: number;
  exceptionId?: string; // Raised when the outcome could not be applied cleanly
}

export interface VerifyManualPayoutRequest {
  payoutTransactionId: string;
  utr: string; // Re-entered independently; must match what was recorded
  bankReference?: string;
  note: string;
}

export interface VerifyManualPayoutResponse {
  success: boolean;
  payoutTransactionId: string;
  status: "completed";
  verifiedBy: string;
  verifiedAt: string;
}

export interface RetryPayoutRequest {
  payoutTransactionId: string;
  reason: string;
  beneficiaryId?: string; // Only when the original destination was the cause of failure
}

export interface RetryPayoutResponse {
  success: boolean;
  originalPayoutTransactionId: string;
  retryPayoutTransactionId: string;
  status: PayoutTransactionStatus;
}

/**
 * The signed provider endpoint. One function handles payments, refunds, payouts, and
 * subscription charges, because they share one requirement: verify, de-duplicate,
 * then apply exactly once.
 */
export interface GatewayWebhookRequest {
  eventId: string;
  eventType: string; // "payment.captured", "payout.processed", "refund.processed", …
  signature: string; // x-razorpay-signature, HMAC-SHA256 over the raw body
  payload: Record<string, unknown>;
  createdAt: number; // Provider epoch seconds; used for the staleness window
}

export interface GatewayWebhookResponse {
  success: boolean;
  applied: boolean; // False for a duplicate or an ignored event type
  reason?: "duplicate_event" | "unhandled_event" | "stale_event" | "no_matching_record";
  transactionId?: string;
}

export interface RunReconciliationRequest {
  periodDate: string; // Business date in IST
  sources?: ReconciliationSourceKind[]; // Defaults to all three
  force?: boolean; // Re-runs a completed date; Support only, recorded in the audit log
}

export interface RunReconciliationResponse {
  success: boolean;
  runId: string;
  status: ReconciliationRunStatus;
  matchedCount: number;
  matchedAmount: number;
  exceptionCount: number;
  exceptionAmount: number;
  exceptionIdsBySeverity: Record<"low" | "medium" | "high" | "critical", string[]>;
}

export interface ResolveReconciliationExceptionRequest {
  exceptionId: string;
  resolution: ReconciliationExceptionResolution;
  resolutionNote: string; // Mandatory; shown in the close pack
  adjustmentAmount?: number;
  linkedTransactionId?: string; // The provider or platform record it was matched to
}

export interface ResolveReconciliationExceptionResponse {
  success: boolean;
  exceptionId: string;
  status: ReconciliationExceptionStatus;
  linkedAdjustmentIds: string[];
}

export interface CloseAccountingPeriodRequest {
  periodId: string; // "2026-08"
  supplierId?: string;
  acknowledgedExceptionIds: string[]; // Every still-open break must be listed explicitly
  note?: string;
}

export interface CloseAccountingPeriodResponse {
  success: boolean;
  periodId: string;
  status: AccountingPeriodStatus;
  closedBy: string;
  closedAt: string;
  evidencePackRef: string;
  unreconciledCount: number;
  unreconciledAmount: number;
}

export interface ReopenAccountingPeriodRequest {
  periodId: string;
  supplierId?: string;
  reason: string;
}

export interface ReopenAccountingPeriodResponse {
  success: boolean;
  periodId: string;
  status: "reopened";
}

export interface IssueCreditNoteRequest {
  orderId?: string;
  merchantOrderId?: string;
  subscriptionInvoiceId?: string;
  reasonCode: RefundReason;
  reason: string;
  taxableValue?: number; // Defaults to the full invoice; supplied for a partial credit
  refundTransactionId?: string;
}

export interface IssueCreditNoteResponse {
  success: boolean;
  creditNoteId: string;
  creditNoteNumber: string;
  totalAmount: number;
  reportingPeriod: string;
}

export interface UpsertTaxProfileRequest {
  id?: string;
  supplierId: string;
  gstin: string;
  legalName: string;
  tradeName?: string;
  registeredStateCode: string;
  registrationType: "regular" | "composition" | "unregistered";
  placeOfSupplyBasis: TaxProfile["placeOfSupplyBasis"];
  defaultGstRate: number;
  reverseChargeSupported?: boolean;
  exportSupplySupported?: boolean;
  invoiceNumberPrefix: string;
  creditNoteNumberPrefix: string;
  authorizedSignatory: string;
  effectiveFrom: string;
  effectiveTo?: string;
  status?: ConfigRecordStatus;
}

export interface UpsertTaxProfileResponse {
  success: boolean;
  taxProfileId: string;
  /**
   * A worked example per document class using the profile as saved, so the effect of a
   * place-of-supply change is visible before the next invoice proves it.
   */
  resolutionPreview: Array<{
    documentClass: "buyer_order" | "merchant_order" | "subscription";
    exampleRecipientStateCode: string;
    resolvedPlaceOfSupply: string;
    resolvedSupplyType: SupplyType;
    taxHeads: Array<"CGST" | "SGST" | "IGST">;
  }>;
}

export interface UpsertTdsConfigurationRequest {
  enabled: boolean;
  section: TdsSection;
  deductorTan?: string;
  rateWithPan: number;
  rateWithoutPan: number;
  singlePaymentThreshold: number;
  annualThreshold: number;
  appliesRetrospectivelyOnThresholdBreach: boolean;
  requirePanBeforePayout: boolean;
  adviserConfirmedBy?: string;
  adviserReference?: string;
  effectiveFrom: string;
  reason: string; // Mandatory; a withholding change is never an unexplained edit
}

export interface UpsertTdsConfigurationResponse {
  success: boolean;
  configurationId: string;
  /**
   * How many drivers currently sit above each threshold under the saved settings, so
   * the commercial and cash-flow effect of enabling withholding is visible before the
   * first payout proves it.
   */
  impact: {
    driversAboveAnnualThreshold: number;
    driversWithoutPan: number;
    estimatedMonthlyWithholding: number;
  };
}

export interface RecordTdsChallanRequest {
  challanNumber: string;
  bsrCode: string;
  depositDate: string;
  financialYear: string;
  quarter: TdsQuarter;
  section: TdsSection;
  totalAmount: number;
  deductionIds: string[];
  evidenceRef: string;
}

export interface RecordTdsChallanResponse {
  success: boolean;
  challanId: string;
  coveredDeductionCount: number;
  uncoveredAmount: number; // Accrued withholding still without a challan
}

export interface IssueTdsCertificateRequest {
  driverId: string;
  financialYear: string;
  quarter: TdsQuarter;
  returnAcknowledgementNumber: string;
  supersedesCertificateId?: string;
}

export interface IssueTdsCertificateResponse {
  success: boolean;
  certificateId: string;
  certificateNumber: string;
  grossAmount: number;
  tdsAmount: number;
  documentRef: string;
}

export interface GetTdsRegisterRequest {
  financialYear: string;
  quarter?: TdsQuarter;
  driverId?: string;
  status?: TdsDeductionStatus;
}

export interface GetTdsRegisterResponse {
  financialYear: string;
  quarter?: TdsQuarter;
  configurationEnabled: boolean;
  rows: Array<{
    deductionId: string;
    driverId: string;
    driverName: string;
    panProvided: boolean;
    grossAmount: number;
    tdsAmount: number;
    status: TdsDeductionStatus;
    challanNumber?: string;
    certificateNumber?: string;
    payoutTransactionId: string;
    deductedAt: string;
  }>;
  totals: { grossAmount: number; tdsAmount: number; deposited: number; uncovered: number };
  driversMissingPan: number;
  tieOut: { subLedger: "taxes_withheld"; controlBalance: number; registerTotal: number; balanced: boolean };
}

export type FinanceReportType =
  | "collections_summary"
  | "transaction_register"
  | "sub_ledger_statement"
  | "settlement_register"
  | "merchant_ageing"
  | "driver_payout_analysis"
  | "cash_flow"
  | "supplier_spend"
  | "repayment_allocation"
  | "gateway_fee_and_gst"
  | "tax_pack"
  | "tds_register"
  | "reconciliation_summary"
  | "credit_ledger" // SUP-04.5 / MER-09.3 export
  | "order_register" // SUP-11 / SPT-03 export
  | "payout_evidence" // SUP-05.3 download
  | "subscription_register"; // SPT-14 export

export interface GetFinanceReportRequest {
  reportType: FinanceReportType;
  startDate: string;
  endDate: string;
  level?: "gig" | "route" | "merchant" | "village" | "driver" | "hub";
  id?: string;
  subLedgers?: SubLedger[];
  groupBy?: "day" | "week" | "month";
}

export interface GetFinanceReportResponse {
  reportType: FinanceReportType;
  generatedAt: string;
  periodStart: string;
  periodEnd: string;
  currency: "INR";
  columns: Array<{ key: string; label: string; type: "text" | "amount" | "count" | "date" }>;
  rows: Array<Record<string, string | number>>;
  totals: Record<string, number>;
  /**
   * Every report that touches money states what it ties back to. A report whose totals
   * do not equal its control account is returned with `tieOut.balanced: false` and the
   * variance named, rather than being quietly presented as fact.
   */
  tieOut: {
    controlAccount: SubLedger;
    controlBalance: number;
    reportTotal: number;
    balanced: boolean;
    varianceAmount: number;
  };
  truncated: boolean; // True when the plan's report-history limit clipped the range
  entitlementUsed: FinanceEntitlement;
}

/**
 * Retained for compatibility. `getFinancialReport` is the operational revenue summary
 * available to every subscribed Supplier; `getFinanceReport` is the gated finance suite.
 */
export interface GetFinancialReportRequest {
  level: "gig" | "route" | "merchant" | "village";
  id: string;
  startDate: string;
  endDate: string;
}

export interface GetFinancialReportResponse {
  revenue: number;
  ordersCount: number;
  averageOrderValue: number;
  topProducts: Array<{ productId: string; name: string; quantity: number }>;
}

export interface ExportFinanceReportRequest {
  reportType: FinanceReportType;
  format: "csv" | "pdf";
  startDate: string;
  endDate: string;
  level?: "gig" | "route" | "merchant" | "village" | "driver" | "hub";
  id?: string;
}

export interface ExportFinanceReportResponse {
  success: boolean;
  exportId: string;
  downloadUrl: string; // Signed, short-lived
  expiresAt: string;
  rowCount: number;
  exportsUsedThisPeriod: number;
  exportsAllowedThisPeriod: number; // -1 means unlimited
}

export interface ScheduleFinanceReportRequest {
  reportType: FinanceReportType;
  frequency: "daily" | "weekly" | "monthly";
  format: "csv" | "pdf";
  recipients: string[]; // Must be users the caller may share with; validated server-side
  enabled: boolean;
  scheduleId?: string; // Supplied to update or disable an existing schedule
}

export interface ScheduleFinanceReportResponse {
  success: boolean;
  scheduleId: string;
  nextRunAt: string;
  schedulesUsed: number;
  schedulesAllowed: number;
}

export interface GetEntitlementsRequest {
  subscriberId?: string; // Support only; defaults to the caller
}

export interface GetEntitlementsResponse {
  subscriptionId?: string;
  planId?: string;
  planName?: string;
  subscriberRole: SubscriberRole;
  status: SubscriptionStatus;
  currentPeriodEnd?: string;
  gracePeriodEndsAt?: string;
  /**
   * Every finance entitlement the product knows about, each marked granted or not, with
   * the cheapest plan that would grant it. This is what lets a screen show a locked tool
   * with a real upgrade path instead of hiding it and confusing the user.
   */
  entitlements: Array<{
    key: FinanceEntitlement;
    granted: boolean;
    requiredPlanId?: string;
    requiredPlanName?: string;
  }>;
  limits: Array<{
    key: PlanEntitlementLimitKey;
    allowed: number; // -1 means unlimited
    used: number;
    resetsAt: string;
  }>;
  pendingPlanId?: string;
  pendingEffectiveAt?: string;
}

export interface PreviewPlanChangeRequest {
  subscriberId?: string; // Support only; defaults to the caller
  planId: string;
  tariffId: string;
  discountCode?: string;
}

export interface PreviewPlanChangeResponse {
  changeType: "upgrade" | "downgrade" | "same_plan" | "reactivation";
  currentPlanId?: string;
  targetPlanId: string;
  listPrice: number;
  discountAmount: number;
  prorationCredit: number; // Unused value of the current period, on an upgrade
  taxableValue: number;
  gstRate: number;
  gstAmount: number;
  amountPayableNow: number;
  effectiveFrom: string; // Immediate on an upgrade, currentPeriodEnd on a downgrade
  entitlementsGained: FinanceEntitlement[];
  entitlementsLost: FinanceEntitlement[];
  limitsReduced: Array<{ key: PlanEntitlementLimitKey; from: number; to: number }>;
  /**
   * What the subscriber will no longer be able to do, in their own terms, before they
   * confirm. A downgrade that silently deletes scheduled reports is a support ticket.
   */
  warnings: string[];
  blockedReasons: string[]; // Non-empty means the change cannot proceed
}

export interface ChangeSubscriptionPlanRequest {
  planId: string;
  tariffId: string;
  discountCode?: string;
  acknowledgedEntitlementsLost?: FinanceEntitlement[]; // Must match the preview on a downgrade
  idempotencyKey: string;
}

export interface ChangeSubscriptionPlanResponse {
  success: boolean;
  subscriptionId: string;
  changeType: "upgrade" | "downgrade" | "reactivation";
  paymentIntentId?: string; // Present when money is due now
  amountPayableNow: number;
  effectiveFrom: string;
  activeEntitlements: FinanceEntitlement[];
  pendingEntitlements?: FinanceEntitlement[];
}

export interface UpsertCountryRequest {
  id?: string;
  name: string;
  isoCode: string;
  isoCode3: string;
  numericCode: string;
  mobilePrefix: string;
  phoneNumberLength: number;
  phoneValidationRegex?: string;
  currencyCode: string;
  currencySymbol: string;
  timezone: string;
  status?: ConfigRecordStatus;
}

export interface UpsertCountryResponse {
  success: boolean;
  countryId: string;
}

export interface UpsertStateRequest {
  id?: string;
  countryId: string;
  name: string;
  code: string;
  status?: ConfigRecordStatus;
}

export interface UpsertStateResponse {
  success: boolean;
  stateId: string;
}

export interface UpsertDistrictRequest {
  id?: string;
  countryId: string;
  stateId: string;
  name: string;
  code?: string;
  status?: ConfigRecordStatus;
}

export interface UpsertDistrictResponse {
  success: boolean;
  districtId: string;
}

export interface RequestVillageRequest {
  name: string;
  pincode: string;
  panchayat?: string;
  mandal?: string;
  district: string;
  state: string;
  location?: {
    latitude: number;
    longitude: number;
  };
  notes?: string;
}

export interface RequestVillageResponse {
  success: boolean;
  requestId: string;
}

export interface UpsertVillageRequest {
  id?: string;
  lgdCode: string;
  name: string;
  pincode: string;
  panchayat: string;
  mandal: string;
  district: string;
  state: string;
  location: {
    latitude: number;
    longitude: number;
  };
  population?: number;
  tier?: string;
  description?: string;
  hubId?: string; // Optional Hub to attach the village to
  requestId?: string; // VillageRequest resolved by this upsert
}

export interface UpsertVillageResponse {
  success: boolean;
  villageId: string;
}

export interface UpsertSubscriptionPlanRequest {
  id?: string;
  name: string;
  description: string;
  targetRole: SubscriberRole;
  status?: PlanStatus;
  features: string[];
  entitlements: FinanceEntitlement[];
  entitlementLimits?: Partial<Record<PlanEntitlementLimitKey, number>>;
  maxHubs?: number;
  maxRoutes?: number;
  maxGigsPerMonth?: number;
  maxMerchants?: number;
  maxDrivers?: number;
}

export interface UpsertSubscriptionPlanResponse {
  success: boolean;
  planId: string;
  /**
   * Subscribers who will lose an entitlement at their next renewal because this edit
   * removed it. Support sees the blast radius before publishing, not afterwards.
   */
  affectedSubscriberCount: number;
  entitlementsRemoved: FinanceEntitlement[];
}

export interface UpsertPlanTariffRequest {
  id?: string;
  planId: string;
  name: string;
  billingCycle: BillingCycle;
  currencyCode: string;
  countryId?: string;
  basePrice: number;
  tariffType: TariffType;
  unitPrice?: number;
  gstRate: number;
  status?: ConfigRecordStatus;
  effectiveFrom: string;
  effectiveTo?: string;
}

export interface UpsertPlanTariffResponse {
  success: boolean;
  tariffId: string;
}

export interface UpsertSubscriptionOfferRequest {
  id?: string;
  name: string;
  description: string;
  planId: string;
  tariffId?: string;
  discountType: DiscountValueType;
  discountValue: number;
  eligibility: OfferEligibilityCriteria;
  maxRedemptions?: number;
  maxRedemptionsPerUser?: number;
  validFrom: string;
  validTo: string;
  status?: ConfigRecordStatus;
}

export interface UpsertSubscriptionOfferResponse {
  success: boolean;
  offerId: string;
}

export interface UpsertOfferDiscountCodeRequest {
  id?: string;
  offerId: string;
  code: string;
  maxUses?: number;
  status?: ConfigRecordStatus;
}

export interface UpsertOfferDiscountCodeResponse {
  success: boolean;
  discountCodeId: string;
}

export interface DeactivateConfigurationRecordRequest {
  collection: ConfigurationCollection;
  id: string;
}

export interface DeactivateConfigurationRecordResponse {
  success: boolean;
}

export interface ListConfigurationCatalogRequest {
  includeInactive?: boolean;
  types?: ConfigurationCollection[];
  countryId?: string;
  stateId?: string;
  planId?: string;
  offerId?: string;
}

export interface ListConfigurationCatalogResponse {
  countries: Country[];
  states: State[];
  districts: District[];
  subscriptionPlans: SubscriptionPlan[];
  planTariffs: PlanTariff[];
  subscriptionOffers: SubscriptionOffer[];
  offerDiscountCodes: OfferDiscountCode[];
}

export interface AssignSubscriptionRequest {
  subscriberId: string;
  planId: string;
  tariffId: string;
  discountCode?: string;
}

export interface AssignSubscriptionResponse {
  success: boolean;
  subscriptionId: string;
  billedAmount: number;
  gstAmount: number;
  status: SubscriptionStatus; // "past_due" until the first period is paid for
  paymentIntentId?: string;
  activeEntitlements: FinanceEntitlement[];
}

export interface SubscribeToPlanRequest {
  planId: string;
  tariffId: string;
  discountCode?: string;
  idempotencyKey: string;
}

export interface SubscribeToPlanResponse {
  success: boolean;
  subscriptionId: string;
  billedAmount: number;
  gstAmount: number;
  amountPayableNow: number;
  /**
   * Entitlements are not granted here. The subscription is created `past_due`, the
   * intent is returned, and `processPayment` activates it on a verified capture.
   * Granting on creation would hand out paid capability to anyone who abandons checkout.
   */
  paymentIntentId: string;
  status: SubscriptionStatus;
  currentPeriodEnd: string;
}

export interface CancelSubscriptionRequest {
  subscriptionId: string;
  reason?: string;
}

export interface CancelSubscriptionResponse {
  success: boolean;
  status: "cancelled";
  cancelledAt: string;
  accessUntil: string; // Equals PlatformSubscription.currentPeriodEnd
}

export interface RegisterDeviceTokenRequest {
  token: string;
  platform: "web" | "android" | "ios";
  revoke?: boolean; // Removes the token on sign-out
}

export interface RegisterDeviceTokenResponse {
  success: boolean;
  tokenCount: number;
}

/**
 * Driver or merchant asking the owning supplier to allow weak proof on one handover.
 * Does not grant anything. `authorizeVerificationFallback` consumes a pending request
 * when `requestId` is supplied.
 */
export interface VerificationFallbackRequest {
  id: string;
  requestedBy: string;
  requesterRole: "vehicle" | "merchant";
  supplierId: string;
  transferKind: CustodyTransferKind;
  orderId?: string;
  merchantOrderId?: string;
  custodyTransferId?: string;
  settlementId?: string;
  reason: string;
  status: "pending" | "granted" | "rejected";
  createdAt: string;
  resolvedBy?: string;
  resolvedAt?: string;
  authorizationId?: string;
}

export interface DataExportRequest {
  id: string;
  userId: string;
  status: "queued" | "ready" | "failed" | "expired";
  createdAt: string;
  readyAt?: string;
  expiresAt?: string;
  downloadUrl?: string; // Signed, short-lived; never stored on a client-readable field after expiry
}

export interface AccountDeletionRequest {
  id: string;
  userId: string;
  reason?: string;
  status: "pending_support_review" | "approved" | "refused";
  createdAt: string;
  blockingReason?: string; // e.g. open settlement — INVALID_STATE named for the client
  reviewedBy?: string;
  reviewedAt?: string;
}

/**
 * Storage folder category prefixes per constitution/Logikchain_Architecture.md §3.1
 */
export type StorageFolderCategory =
  | "profiles"
  | "products"
  | "proofs"
  | "documents"
  | "exports"
  | "system";

/**
 * Categories for statutory and verification documents stored under /documents/{userId}/{category}/
 */
export type DocumentCategory =
  | "kyc"
  | "pan"
  | "gstin"
  | "license"
  | "vehicle_rc"
  | "tax"
  | "invoice"
  | "other";

export interface StorageFileMetadata {
  storagePath: string;
  downloadUrl: string;
  contentType: string;
  sizeBytes: number;
  uploadedAt: string;
  uploadedBy: string;
}

