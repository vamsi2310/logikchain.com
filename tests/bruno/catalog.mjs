export const groups = [
  { id: "01-identity", name: "Identity", tag: "identity", seq: 1, docs: "Onboarding and access. Spec §1." },
  { id: "02-gigs", name: "Gigs", tag: "gigs", seq: 2, docs: "Gig lifecycle. Spec §2." },
  { id: "03-orders", name: "Orders", tag: "orders", seq: 3, docs: "Buyer orders. Spec §3." },
  { id: "04-merchant-orders", name: "Merchant orders", tag: "merchant-orders", seq: 4, docs: "Merchant bulk orders. Spec §3." },
  { id: "05-credit", name: "Credit", tag: "credit", seq: 5, docs: "Merchant credit line. Spec §4." },
  { id: "06-payments", name: "Payments", tag: "payments", seq: 6, docs: "Intents, capture, refunds, credit notes. Spec §4." },
  { id: "07-payouts", name: "Payouts", tag: "payouts", seq: 7, docs: "Beneficiaries and payouts. Spec §4B." },
  { id: "08-cash", name: "Cash", tag: "cash", seq: 8, docs: "Custody, handover, settlement. Spec §4A." },
  { id: "09-reports", name: "Reports", tag: "reports", seq: 9, docs: "Finance reports and entitlements. Spec §4." },
  { id: "10-subscriptions", name: "Subscriptions", tag: "subscriptions", seq: 10, docs: "Plans, assign, subscribe, cancel. Spec §5." },
  { id: "11-config", name: "Config", tag: "config", seq: 11, docs: "Geography and catalog. Spec §5." },
  { id: "12-tax", name: "Tax", tag: "tax", seq: 12, docs: "Tax profiles and TDS. Spec §5." },
  { id: "13-reconciliation", name: "Reconciliation", tag: "reconciliation", seq: 13, docs: "Runs, exceptions, periods. Spec §4." },
  { id: "14-ops", name: "Ops", tag: "ops", seq: 14, docs: "Devices, stock, routes, health, privacy. Spec §6–7." },
  { id: "15-webhooks", name: "Webhooks", tag: "webhook", seq: 15, docs: "Provider callbacks. Manual / emulator stubs only." },
];

export const operations = [
  // 01 identity
  { id: "createSupplier", group: "01-identity", method: "post", path: "/v1/suppliers", role: "support", successFields: ["success", "supplierId"], body: { email: "bruno-supplier-{{runId}}@logikchain.test", name: "Bruno Supplier {{runId}}", phone: "+919000000001", countryId: "{{seedCountryId}}" } },
  { id: "convertBuyerToRole", group: "01-identity", method: "post", path: "/v1/buyers/{buyerId}/role", role: "supplier", successFields: ["success"], body: { buyerId: "{{buyerId}}", targetRole: "merchant" } },
  { id: "updateUserProfile", group: "01-identity", method: "patch", path: "/v1/users/{userId}", role: "buyer", successFields: ["success", "userId"], body: { userId: "{{userId}}", name: "Bruno Buyer {{runId}}", locale: "en-IN" } },
  { id: "disassociateMerchant", group: "01-identity", method: "post", path: "/v1/merchants/{merchantId}:disassociate", role: "supplier", successFields: ["success"], body: { merchantId: "{{merchantId}}", reason: "bruno disassociate {{runId}}" } },
  { id: "suspendUser", group: "01-identity", method: "post", path: "/v1/users/{userId}/suspension", role: "support", idempotency: true, teardown: "restoreUser", successFields: ["success"], body: { userId: "{{userId}}", scope: "operational", reasonCode: "other", reason: "bruno suspend {{runId}}", restorePath: "contact support", acknowledgeCustodyPlan: true, idempotencyKey: "{{idempotencyKey}}" } },
  { id: "restoreUser", group: "01-identity", method: "delete", path: "/v1/users/{userId}/suspension", role: "support", idempotency: true, successFields: ["success"], body: { userId: "{{userId}}", restoreNote: "bruno restore {{runId}}", idempotencyKey: "{{idempotencyKey}}" } },

  // 02 gigs
  { id: "composeGig", group: "02-gigs", method: "post", path: "/v1/gigs", role: "supplier", successFields: ["success", "gigId"], body: { title: "Bruno gig {{runId}}", routeId: "{{routeId}}", vehicleId: "{{vehicleId}}", pamphletId: "{{pamphletId}}", merchantIds: ["{{merchantId}}"], date: "2026-09-10", arrivingTimes: {} } },
  { id: "startGig", group: "02-gigs", method: "post", path: "/v1/gigs/{gigId}:start", role: "vehicle", successFields: ["success"], body: { gigId: "{{gigId}}" } },
  { id: "updateGigLocation", group: "02-gigs", method: "patch", path: "/v1/gigs/{gigId}/location", role: "vehicle", successFields: ["success"], body: { gigId: "{{gigId}}", latitude: 15.512, longitude: 80.042, capturedAt: "2026-09-09T12:00:00.000Z" } },
  { id: "completeAndFinalizeGig", group: "02-gigs", method: "post", path: "/v1/gigs/{gigId}:complete", role: "vehicle", money: true, successFields: ["success"], body: { gigId: "{{gigId}}" } },
  { id: "suspendGig", group: "02-gigs", method: "post", path: "/v1/gigs/{gigId}:suspend", role: "supplier", successFields: ["success"], body: { gigId: "{{gigId}}", reason: "bruno suspend gig {{runId}}" } },
  { id: "reassignGigDriver", group: "02-gigs", method: "patch", path: "/v1/gigs/{gigId}/driver", role: "supplier", successFields: ["success"], body: { gigId: "{{gigId}}", vehicleId: "{{vehicleId}}" } },
  { id: "acknowledgeGig", group: "02-gigs", method: "post", path: "/v1/gigs/{gigId}:acknowledge", role: "vehicle", successFields: ["success"], body: { gigId: "{{gigId}}" } },

  // 03 orders
  { id: "placeOrder", group: "03-orders", method: "post", path: "/v1/orders", role: "buyer", money: true, teardown: "cancelOrder", successFields: ["success", "orderId"], body: { gigId: "{{gigId}}", village: "{{villageId}}", merchantId: "{{merchantId}}", items: [{ productId: "{{productId}}", quantity: 1 }], paymentMode: "cash_on_pickup" } },
  { id: "cancelOrder", group: "03-orders", method: "post", path: "/v1/orders/{orderId}:cancel", role: "buyer", successFields: ["success"], body: { orderId: "{{orderId}}" } },
  { id: "markOrderDelivered", group: "03-orders", method: "post", path: "/v1/orders/{orderId}:deliver", role: "vehicle", idempotency: true, money: true, successFields: ["success"], body: { orderId: "{{orderId}}", proof: { method: "otp", confirmationCode: "{{pickupCode}}" }, cashCollected: 1, idempotencyKey: "{{idempotencyKey}}" } },
  { id: "reassignOrderMerchant", group: "03-orders", method: "patch", path: "/v1/orders/{orderId}/merchant", role: "support", body: { orderId: "{{orderId}}", merchantId: "{{merchantId}}", reason: "bruno reassign {{runId}}" } },
  { id: "resumeOrderOnGig", group: "03-orders", method: "patch", path: "/v1/orders/{orderId}/gig", role: "support", body: { orderId: "{{orderId}}", gigId: "{{gigId}}", reason: "bruno resume {{runId}}" } },

  // 04 merchant orders
  { id: "placeMerchantOrder", group: "04-merchant-orders", method: "post", path: "/v1/merchant-orders", role: "merchant", money: true, teardown: "cancelMerchantOrder", successFields: ["success", "merchantOrderId"], body: { gigId: "{{gigId}}", supplierId: "{{supplierId}}", items: [{ productId: "{{productId}}", quantity: 1 }], paymentMode: "cash", payWithCredit: false } },
  { id: "updateMerchantOrderStatus", group: "04-merchant-orders", method: "patch", path: "/v1/merchant-orders/{merchantOrderId}/status", role: "vehicle", idempotency: true, money: true, body: { merchantOrderId: "{{merchantOrderId}}", status: "delivered", proof: { method: "otp", confirmationCode: "{{handoverCode}}" }, idempotencyKey: "{{idempotencyKey}}" } },
  { id: "cancelMerchantOrder", group: "04-merchant-orders", method: "post", path: "/v1/merchant-orders/{merchantOrderId}:cancel", role: "merchant", successFields: ["success"], body: { merchantOrderId: "{{merchantOrderId}}" } },

  // 05 credit
  { id: "requestCreditIncrease", group: "05-credit", method: "post", path: "/v1/credit-profiles/{merchantId}/increase-requests", role: "merchant", successFields: ["success"], body: { merchantId: "{{merchantId}}", requestedLimit: 5000, reason: "bruno increase {{runId}}" } },
  { id: "setMerchantCreditLimit", group: "05-credit", method: "put", path: "/v1/credit-profiles/{merchantId}/limit", role: "supplier", money: true, successFields: ["success"], body: { merchantId: "{{merchantId}}", creditLimit: 5000, reason: "bruno limit {{runId}}" } },
  { id: "reviewCreditIncreaseRequest", group: "05-credit", method: "patch", path: "/v1/credit-increase-requests/{requestId}", role: "supplier", money: true, body: { requestId: "{{requestId}}", decision: "approve", approvedAmount: 5000 } },
  { id: "setProvisionalCreditPolicy", group: "05-credit", method: "put", path: "/v1/credit-profiles/{merchantId}/provisional-policy", role: "supplier", teardown: "disableProvisional", body: { merchantId: "{{merchantId}}", enabled: true, cap: 500, reason: "bruno provisional {{runId}}" } },

  // 06 payments
  { id: "createPaymentIntent", group: "06-payments", method: "post", path: "/v1/payment-intents", role: "buyer", money: true, idempotency: true, successFields: ["success"], body: { purpose: "buyer_order", orderId: "{{orderId}}", idempotencyKey: "{{idempotencyKey}}" } },
  { id: "processPayment", group: "06-payments", method: "post", path: "/v1/payment-intents/{intentId}:capture", role: "buyer", money: true, successFields: ["success"], body: { paymentIntentId: "{{intentId}}", razorpayPaymentId: "{{razorpayPaymentId}}", razorpaySignature: "{{razorpaySignature}}" } },
  { id: "refundOrder", group: "06-payments", method: "post", path: "/v1/orders/{orderId}/refunds", role: "support", money: true, idempotency: true, body: { orderId: "{{orderId}}", amount: 1, reasonCode: "other", reasonNote: "bruno refund {{runId}}", idempotencyKey: "{{idempotencyKey}}" } },
  { id: "issueCreditNote", group: "06-payments", method: "post", path: "/v1/credit-notes", role: "support", money: true, body: { orderId: "{{orderId}}", reason: "bruno credit note {{runId}}" } },

  // 07 payouts
  { id: "registerPayoutBeneficiary", group: "07-payouts", method: "post", path: "/v1/beneficiaries", role: "vehicle", money: true, successFields: ["success"], body: { type: "upi", vpa: "bruno{{runId}}@okaxis", stepUpToken: "{{stepUpToken}}" } },
  { id: "blockPayoutBeneficiary", group: "07-payouts", method: "post", path: "/v1/beneficiaries/{beneficiaryId}:block", role: "supplier", body: { beneficiaryId: "{{beneficiaryId}}", reason: "bruno block {{runId}}" } },
  { id: "requestPayout", group: "07-payouts", method: "post", path: "/v1/payout-requests", role: "vehicle", money: true, idempotency: true, successFields: ["success"], body: { amount: 100, idempotencyKey: "{{idempotencyKey}}" } },
  { id: "reviewPayoutRequest", group: "07-payouts", method: "patch", path: "/v1/payout-requests/{payoutRequestId}", role: "supplier", money: true, body: { driverId: "{{vehicleId}}", payoutRequestId: "{{payoutRequestId}}", decision: "reject", rejectionReason: "bruno reject {{runId}}" } },
  { id: "verifyManualPayout", group: "07-payouts", method: "post", path: "/v1/payouts/{payoutTransactionId}:verify-manual", role: "support", money: true, manual: true, body: { payoutTransactionId: "{{payoutTransactionId}}", utr: "{{utr}}" } },
  { id: "retryPayout", group: "07-payouts", method: "post", path: "/v1/payouts/{payoutTransactionId}:retry", role: "supplier", money: true, body: { payoutTransactionId: "{{payoutTransactionId}}" } },

  // 08 cash
  { id: "resendHandoverCode", group: "08-cash", method: "post", path: "/v1/handover-codes:resend", role: "buyer", body: { orderId: "{{orderId}}", channel: "sms" } },
  { id: "issueOfflineCodeBatch", group: "08-cash", method: "post", path: "/v1/verification-code-batches", role: "merchant", successFields: ["success"], body: { purpose: "bulk_order_handover", count: 5 } },
  { id: "authorizeVerificationFallback", group: "08-cash", method: "post", path: "/v1/verification-fallbacks", role: "supplier", body: { transferKind: "order_handover", orderId: "{{orderId}}", grantedTo: "{{vehicleId}}", reason: "bruno fallback {{runId}}" } },
  { id: "requestVerificationFallback", group: "08-cash", method: "post", path: "/v1/verification-fallbacks:request", role: "vehicle", body: { transferKind: "order_handover", orderId: "{{orderId}}", reason: "bruno request fallback {{runId}}" } },
  { id: "initiateCreditRepayment", group: "08-cash", method: "post", path: "/v1/credit-repayments", role: "vehicle", money: true, idempotency: true, body: { merchantId: "{{merchantId}}", gigId: "{{gigId}}", amount: 100, idempotencyKey: "{{idempotencyKey}}" } },
  { id: "confirmCreditRepayment", group: "08-cash", method: "post", path: "/v1/credit-repayments/{transferId}:confirm", role: "vehicle", money: true, body: { custodyTransferId: "{{custodyTransferId}}", proof: { method: "otp", confirmationCode: "{{repaymentCode}}" } } },
  { id: "getCashCustodySummary", group: "08-cash", method: "get", path: "/v1/cash/custody", role: "vehicle", smoke: true, query: "scope=self" },
  { id: "declareCashHandover", group: "08-cash", method: "post", path: "/v1/cash-settlements/{settlementId}:declare", role: "vehicle", money: true, body: { settlementId: "{{settlementId}}", declaredAmount: 100, proof: { method: "otp", confirmationCode: "{{settlementCode}}" } } },
  { id: "confirmCashSettlement", group: "08-cash", method: "post", path: "/v1/cash-settlements/{settlementId}:confirm", role: "supplier", money: true, body: { settlementId: "{{settlementId}}", countedAmount: 100, proof: { method: "otp", confirmationCode: "{{settlementCode}}" } } },
  { id: "raiseCashDiscrepancy", group: "08-cash", method: "post", path: "/v1/cash-discrepancies", role: "vehicle", money: true, body: { settlementId: "{{settlementId}}", amount: 10, kind: "shortfall", reason: "bruno discrepancy {{runId}}" } },
  { id: "resolveCashDiscrepancy", group: "08-cash", method: "patch", path: "/v1/cash-discrepancies/{discrepancyId}", role: "support", money: true, body: { discrepancyId: "{{discrepancyId}}", resolution: "write_off", reason: "bruno resolve {{runId}}" } },

  // 09 reports
  { id: "getFinancialReport", group: "09-reports", method: "get", path: "/v1/reports/financial", role: "supplier", query: "level=village&id={{villageId}}&startDate=2026-09-01&endDate=2026-09-30" },
  { id: "getFinanceReport", group: "09-reports", method: "get", path: "/v1/reports/finance", role: "supplier", query: "reportType=collections_summary&startDate=2026-09-01&endDate=2026-09-30" },
  { id: "exportFinanceReport", group: "09-reports", method: "post", path: "/v1/reports/finance/exports", role: "supplier", body: { reportType: "collections_summary", format: "csv", startDate: "2026-09-01", endDate: "2026-09-30" } },
  { id: "scheduleFinanceReport", group: "09-reports", method: "post", path: "/v1/reports/finance/schedules", role: "supplier", body: { reportType: "collections_summary", cadence: "weekly", format: "csv" } },
  { id: "getEntitlements", group: "09-reports", method: "get", path: "/v1/entitlements", role: "supplier", smoke: true },

  // 10 subscriptions
  { id: "previewPlanChange", group: "10-subscriptions", method: "get", path: "/v1/subscriptions/{subscriptionId}/preview", role: "supplier", query: "planId={{planId}}&tariffId={{tariffId}}" },
  { id: "changeSubscriptionPlan", group: "10-subscriptions", method: "patch", path: "/v1/subscriptions/{subscriptionId}/plan", role: "supplier", money: true, body: { subscriptionId: "{{subscriptionId}}", planId: "{{planId}}", tariffId: "{{tariffId}}", acknowledgedEntitlementsLost: [] } },
  { id: "assignSubscription", group: "10-subscriptions", method: "post", path: "/v1/subscriptions", role: "support", money: true, teardown: "cancelSubscription", successFields: ["success"], body: { subscriberId: "{{supplierId}}", planId: "{{planId}}", tariffId: "{{tariffId}}" } },
  { id: "subscribeToPlan", group: "10-subscriptions", method: "post", path: "/v1/subscriptions:self", role: "supplier", money: true, idempotency: true, teardown: "cancelSubscription", body: { planId: "{{planId}}", tariffId: "{{tariffId}}", idempotencyKey: "{{idempotencyKey}}" } },
  { id: "cancelSubscription", group: "10-subscriptions", method: "post", path: "/v1/subscriptions/{subscriptionId}:cancel", role: "supplier", successFields: ["success"], body: { subscriptionId: "{{subscriptionId}}", reason: "bruno cancel {{runId}}" } },
  { id: "extendSubscriptionGrace", group: "10-subscriptions", method: "post", path: "/v1/subscriptions/{subscriptionId}:extend-grace", role: "support", body: { subscriptionId: "{{subscriptionId}}", extraDays: 3, reason: "bruno grace {{runId}}" } },

  // 11 config
  { id: "upsertCountry", group: "11-config", method: "put", path: "/v1/config/countries/{countryId}", role: "support", pathBinds: { countryId: "country_bruno_" }, teardown: "deactivate", teardownCollection: "countries", teardownRecordVar: "countryId", successFields: ["success"], body: { id: "country_bruno_{{runId}}", name: "Bruno Land {{runId}}", isoCode: "BQ", isoCode3: "BQL", numericCode: "999", mobilePrefix: "+299", phoneNumberLength: 8, currencyCode: "INR", currencySymbol: "₹", timezone: "Asia/Kolkata", status: "active" } },
  { id: "upsertState", group: "11-config", method: "put", path: "/v1/config/states/{stateId}", role: "support", pathBinds: { stateId: "state_bruno_" }, teardown: "deactivate", teardownCollection: "states", teardownRecordVar: "stateId", successFields: ["success"], body: { id: "state_bruno_{{runId}}", countryId: "{{countryId}}", name: "Bruno State {{runId}}", code: "BR", status: "active" } },
  { id: "upsertDistrict", group: "11-config", method: "put", path: "/v1/config/districts/{districtId}", role: "support", pathBinds: { districtId: "district_bruno_" }, teardown: "deactivate", teardownCollection: "districts", teardownRecordVar: "districtId", successFields: ["success"], body: { id: "district_bruno_{{runId}}", countryId: "{{countryId}}", stateId: "{{stateId}}", name: "Bruno District {{runId}}", code: "BRD", status: "active" } },
  { id: "requestVillage", group: "11-config", method: "post", path: "/v1/config/village-requests", role: "buyer", successFields: ["success"], body: { name: "Bruno Village {{runId}}", pincode: "523157", district: "Prakasam", state: "Andhra Pradesh" } },
  { id: "upsertVillage", group: "11-config", method: "put", path: "/v1/config/villages/{villageId}", role: "support", pathBinds: { villageId: "village_bruno_" }, teardown: "deactivate", teardownCollection: "villages", teardownRecordVar: "villageId", successFields: ["success"], body: { id: "village_bruno_{{runId}}", lgdCode: "999999", name: "Bruno Village {{runId}}", pincode: "523157", panchayat: "Bruno", mandal: "Bruno", district: "Prakasam", state: "Andhra Pradesh", location: { latitude: 15.51, longitude: 80.04 }, status: "active" } },
  { id: "rejectVillageRequest", group: "11-config", method: "post", path: "/v1/config/village-requests/{requestId}:reject", role: "support", body: { requestId: "{{requestId}}", rejectionReason: "bruno reject village {{runId}}" } },
  { id: "upsertSubscriptionPlan", group: "11-config", method: "put", path: "/v1/config/plans/{planId}", role: "support", pathBinds: { planId: "plan_bruno_" }, teardown: "deactivate", teardownCollection: "plans", teardownRecordVar: "planId", body: { id: "plan_bruno_{{runId}}", name: "Bruno Plan", targetRole: "supplier", status: "draft", features: ["bruno"], entitlements: ["finance.dashboard"] } },
  { id: "upsertPlanTariff", group: "11-config", method: "put", path: "/v1/config/tariffs/{tariffId}", role: "support", pathBinds: { tariffId: "tariff_bruno_" }, teardown: "deactivate", teardownCollection: "tariffs", teardownRecordVar: "tariffId", body: { id: "tariff_bruno_{{runId}}", planId: "{{planId}}", countryId: "{{seedCountryId}}", billingCycle: "monthly", currencyCode: "INR", listPrice: 99, gstRate: 18, status: "draft" } },
  { id: "upsertSubscriptionOffer", group: "11-config", method: "put", path: "/v1/config/offers/{offerId}", role: "support", pathBinds: { offerId: "offer_bruno_" }, teardown: "deactivate", teardownCollection: "offers", teardownRecordVar: "offerId", body: { id: "offer_bruno_{{runId}}", name: "Bruno Offer", status: "draft", valueType: "percent", value: 10 } },
  { id: "upsertOfferDiscountCode", group: "11-config", method: "put", path: "/v1/config/discount-codes/{codeId}", role: "support", pathBinds: { codeId: "code_bruno_" }, teardown: "deactivate", teardownCollection: "discount-codes", teardownRecordVar: "codeId", body: { id: "code_bruno_{{runId}}", offerId: "{{offerId}}", code: "BRUNO{{runId}}", status: "draft" } },
  { id: "deactivateConfigurationRecord", group: "11-config", method: "patch", path: "/v1/config/{collection}/{recordId}:deactivate", role: "support", body: { collection: "countries", recordId: "{{countryId}}", reason: "bruno deactivate {{runId}}" } },
  { id: "listConfigurationCatalog", group: "11-config", method: "get", path: "/v1/config/catalog", role: "any", smoke: true, query: "types=countries" },

  // 12 tax
  { id: "upsertTaxProfile", group: "12-tax", method: "put", path: "/v1/tax-profiles/{taxProfileId}", role: "support", money: true, successFields: ["success"], body: { taxProfileId: "tax_bruno_{{runId}}", supplierId: "{{supplierId}}", gstin: "37AAAAA0000A1Z5", registeredStateCode: "37", defaultGstRate: 18, status: "active", effectiveFrom: "2026-04-01T00:00:00.000Z" } },
  { id: "upsertTdsConfiguration", group: "12-tax", method: "put", path: "/v1/tds-configurations/{configId}", role: "support", money: true, body: { configId: "tds_bruno_{{runId}}", enabled: false, rateWithPan: 1, rateWithoutPan: 5, reason: "bruno tds {{runId}}" } },
  { id: "recordTdsChallan", group: "12-tax", method: "post", path: "/v1/tds/challans", role: "support", money: true, body: { deductionIds: ["{{deductionId}}"], totalAmount: 1 } },
  { id: "issueTdsCertificate", group: "12-tax", method: "post", path: "/v1/tds/certificates", role: "support", money: true, body: { driverId: "{{vehicleId}}", financialYear: "2026-27", quarter: "Q2" } },
  { id: "getTdsRegister", group: "12-tax", method: "get", path: "/v1/tds/register", role: "support", smoke: true, query: "financialYear=2026-27" },

  // 13 reconciliation
  { id: "runReconciliation", group: "13-reconciliation", method: "post", path: "/v1/reconciliation-runs", role: "support", money: true, body: { periodId: "2026-09" } },
  { id: "resolveReconciliationException", group: "13-reconciliation", method: "patch", path: "/v1/reconciliation-exceptions/{exceptionId}", role: "support", money: true, body: { exceptionId: "{{exceptionId}}", resolution: "matched", reason: "bruno resolve {{runId}}" } },
  { id: "closeAccountingPeriod", group: "13-reconciliation", method: "post", path: "/v1/accounting-periods/{periodId}:close", role: "support", money: true, body: { periodId: "2026-08" } },
  { id: "reopenAccountingPeriod", group: "13-reconciliation", method: "post", path: "/v1/accounting-periods/{periodId}:reopen", role: "support", money: true, body: { periodId: "2026-08", reason: "bruno reopen {{runId}}" } },

  // 14 ops
  { id: "registerDeviceToken", group: "14-ops", method: "post", path: "/v1/devices", role: "buyer", teardown: "revokeDevice", successFields: ["success"], body: { token: "bruno-{{runId}}", platform: "web" } },
  { id: "adjustProductStock", group: "14-ops", method: "post", path: "/v1/products/{productId}/stock", role: "supplier", body: { productId: "{{productId}}", mode: "delta", value: 1, reason: "bruno stock {{runId}}" } },
  { id: "updateDriverPayRates", group: "14-ops", method: "put", path: "/v1/suppliers/{supplierId}/driver-pay", role: "supplier", body: { supplierId: "{{supplierId}}", baseTripAmount: 100, perKm: 5, perDelivery: 10 } },
  { id: "computeRouteMetrics", group: "14-ops", method: "post", path: "/v1/routes:compute-metrics", role: "supplier", body: { origin: { latitude: 15.51, longitude: 80.04 }, destination: { latitude: 15.52, longitude: 80.05 } } },
  { id: "upsertRoute", group: "14-ops", method: "put", path: "/v1/routes/{routeId}", role: "supplier", pathBinds: { routeId: "rte_bruno_" }, successFields: ["success"], body: { routeId: "rte_bruno_{{runId}}", name: "Bruno route {{runId}}", villages: [{ villageId: "{{villageId}}", location: { latitude: 15.51, longitude: 80.04 } }] } },
  { id: "getSystemHealth", group: "14-ops", method: "get", path: "/v1/ops/health", role: "support", smoke: true },
  { id: "requestMyDataExport", group: "14-ops", method: "post", path: "/v1/me/data-export", role: "buyer", successFields: ["success"], body: {} },
  { id: "requestAccountDeletion", group: "14-ops", method: "post", path: "/v1/me/deletion", role: "buyer", body: { reason: "bruno deletion {{runId}}" } },

  // 15 webhooks
  { id: "handleGatewayWebhook", group: "15-webhooks", method: "post", path: "/v1/webhooks/gateway", role: "none", webhook: true, manual: true, money: true, body: { event: "payment.captured", payload: {} } },
  { id: "recordPayoutSettlement", group: "15-webhooks", method: "post", path: "/v1/webhooks/payout-settlement", role: "none", webhook: true, manual: true, money: true, body: { event: "payout.processed", payload: {} } },
];
