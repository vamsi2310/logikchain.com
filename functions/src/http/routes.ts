export interface RouteDef {
  method: string;
  pattern: RegExp;
  operationId: string;
  params: string[];
}

function r(method: string, path: string, operationId: string): RouteDef {
  const params: string[] = [];
  const regex = path.replace(/\{([^}]+)\}/g, (_, name: string) => {
    params.push(name);
    return "([^/]+)";
  });
  return { method, pattern: new RegExp(`^${regex}$`), operationId, params };
}

/** Normative catalog from constitution/Logikchain_API_Specifications.md §0B */
export const routes: RouteDef[] = [
  r("POST", "/v1/suppliers", "createSupplier"),
  r("POST", "/v1/buyers/{buyerId}/role", "convertBuyerToRole"),
  r("PATCH", "/v1/users/{userId}", "updateUserProfile"),
  r("POST", "/v1/merchants/{merchantId}:disassociate", "disassociateMerchant"),
  r("POST", "/v1/users/{userId}/suspension", "suspendUser"),
  r("DELETE", "/v1/users/{userId}/suspension", "restoreUser"),
  r("POST", "/v1/gigs", "composeGig"),
  r("POST", "/v1/gigs/{gigId}:start", "startGig"),
  r("PATCH", "/v1/gigs/{gigId}/location", "updateGigLocation"),
  r("POST", "/v1/gigs/{gigId}:complete", "completeAndFinalizeGig"),
  r("POST", "/v1/gigs/{gigId}:suspend", "suspendGig"),
  r("PATCH", "/v1/gigs/{gigId}/driver", "reassignGigDriver"),
  r("POST", "/v1/orders", "placeOrder"),
  r("POST", "/v1/orders/{orderId}:cancel", "cancelOrder"),
  r("POST", "/v1/orders/{orderId}:deliver", "markOrderDelivered"),
  r("POST", "/v1/merchant-orders", "placeMerchantOrder"),
  r("PATCH", "/v1/merchant-orders/{merchantOrderId}/status", "updateMerchantOrderStatus"),
  r("POST", "/v1/merchant-orders/{merchantOrderId}:cancel", "cancelMerchantOrder"),
  r("POST", "/v1/credit-profiles/{merchantId}/increase-requests", "requestCreditIncrease"),
  r("PUT", "/v1/credit-profiles/{merchantId}/limit", "setMerchantCreditLimit"),
  r("PATCH", "/v1/credit-increase-requests/{requestId}", "reviewCreditIncreaseRequest"),
  r("POST", "/v1/payment-intents", "createPaymentIntent"),
  r("POST", "/v1/payment-intents/{intentId}:capture", "processPayment"),
  r("POST", "/v1/orders/{orderId}/refunds", "refundOrder"),
  r("POST", "/v1/payout-requests", "requestPayout"),
  r("PATCH", "/v1/payout-requests/{payoutRequestId}", "reviewPayoutRequest"),
  r("GET", "/v1/reports/financial", "getFinancialReport"),
  r("GET", "/v1/reports/finance", "getFinanceReport"),
  r("POST", "/v1/reports/finance/exports", "exportFinanceReport"),
  r("POST", "/v1/reports/finance/schedules", "scheduleFinanceReport"),
  r("GET", "/v1/entitlements", "getEntitlements"),
  r("GET", "/v1/subscriptions/{subscriptionId}/preview", "previewPlanChange"),
  r("PATCH", "/v1/subscriptions/{subscriptionId}/plan", "changeSubscriptionPlan"),
  r("POST", "/v1/handover-codes:resend", "resendHandoverCode"),
  r("POST", "/v1/verification-code-batches", "issueOfflineCodeBatch"),
  r("POST", "/v1/verification-fallbacks", "authorizeVerificationFallback"),
  r("POST", "/v1/credit-repayments", "initiateCreditRepayment"),
  r("POST", "/v1/credit-repayments/{transferId}:confirm", "confirmCreditRepayment"),
  r("GET", "/v1/cash/custody", "getCashCustodySummary"),
  r("POST", "/v1/cash-settlements/{settlementId}:declare", "declareCashHandover"),
  r("POST", "/v1/cash-settlements/{settlementId}:confirm", "confirmCashSettlement"),
  r("POST", "/v1/cash-discrepancies", "raiseCashDiscrepancy"),
  r("PATCH", "/v1/cash-discrepancies/{discrepancyId}", "resolveCashDiscrepancy"),
  r("PUT", "/v1/credit-profiles/{merchantId}/provisional-policy", "setProvisionalCreditPolicy"),
  r("POST", "/v1/beneficiaries", "registerPayoutBeneficiary"),
  r("POST", "/v1/beneficiaries/{beneficiaryId}:block", "blockPayoutBeneficiary"),
  r("POST", "/v1/webhooks/payout-settlement", "recordPayoutSettlement"),
  r("POST", "/v1/payouts/{payoutTransactionId}:verify-manual", "verifyManualPayout"),
  r("POST", "/v1/payouts/{payoutTransactionId}:retry", "retryPayout"),
  r("POST", "/v1/webhooks/gateway", "handleGatewayWebhook"),
  r("POST", "/v1/reconciliation-runs", "runReconciliation"),
  r("PATCH", "/v1/reconciliation-exceptions/{exceptionId}", "resolveReconciliationException"),
  r("POST", "/v1/accounting-periods/{periodId}:close", "closeAccountingPeriod"),
  r("POST", "/v1/accounting-periods/{periodId}:reopen", "reopenAccountingPeriod"),
  r("POST", "/v1/credit-notes", "issueCreditNote"),
  r("PUT", "/v1/tax-profiles/{taxProfileId}", "upsertTaxProfile"),
  r("PUT", "/v1/tds-configurations/{configId}", "upsertTdsConfiguration"),
  r("POST", "/v1/tds/challans", "recordTdsChallan"),
  r("POST", "/v1/tds/certificates", "issueTdsCertificate"),
  r("GET", "/v1/tds/register", "getTdsRegister"),
  r("PUT", "/v1/config/countries/{countryId}", "upsertCountry"),
  r("PUT", "/v1/config/states/{stateId}", "upsertState"),
  r("PUT", "/v1/config/districts/{districtId}", "upsertDistrict"),
  r("POST", "/v1/config/village-requests", "requestVillage"),
  r("PUT", "/v1/config/villages/{villageId}", "upsertVillage"),
  r("PUT", "/v1/config/plans/{planId}", "upsertSubscriptionPlan"),
  r("PUT", "/v1/config/tariffs/{tariffId}", "upsertPlanTariff"),
  r("PUT", "/v1/config/offers/{offerId}", "upsertSubscriptionOffer"),
  r("PUT", "/v1/config/discount-codes/{codeId}", "upsertOfferDiscountCode"),
  r("PATCH", "/v1/config/{collection}/{recordId}:deactivate", "deactivateConfigurationRecord"),
  r("GET", "/v1/config/catalog", "listConfigurationCatalog"),
  r("POST", "/v1/subscriptions", "assignSubscription"),
  r("POST", "/v1/subscriptions:self", "subscribeToPlan"),
  r("POST", "/v1/subscriptions/{subscriptionId}:cancel", "cancelSubscription"),
  r("POST", "/v1/devices", "registerDeviceToken"),
  r("POST", "/v1/gigs/{gigId}:acknowledge", "acknowledgeGig"),
  r("POST", "/v1/products/{productId}/stock", "adjustProductStock"),
  r("PUT", "/v1/suppliers/{supplierId}/driver-pay", "updateDriverPayRates"),
  r("POST", "/v1/verification-fallbacks:request", "requestVerificationFallback"),
  r("POST", "/v1/config/village-requests/{requestId}:reject", "rejectVillageRequest"),
  r("PATCH", "/v1/orders/{orderId}/merchant", "reassignOrderMerchant"),
  r("PATCH", "/v1/orders/{orderId}/gig", "resumeOrderOnGig"),
  r("POST", "/v1/subscriptions/{subscriptionId}:extend-grace", "extendSubscriptionGrace"),
  r("POST", "/v1/routes:compute-metrics", "computeRouteMetrics"),
  r("PUT", "/v1/routes/{routeId}", "upsertRoute"),
  r("GET", "/v1/ops/health", "getSystemHealth"),
  r("POST", "/v1/me/data-export", "requestMyDataExport"),
  r("POST", "/v1/me/deletion", "requestAccountDeletion"),
];

export function matchRoute(method: string, path: string): { operationId: string; params: Record<string, string> } | null {
  const pathname = path.split("?")[0].replace(/\/+$/, "") || "/";
  for (const route of routes) {
    if (route.method !== method) continue;
    const m = pathname.match(route.pattern);
    if (!m) continue;
    const params: Record<string, string> = {};
    route.params.forEach((name, i) => {
      params[name] = decodeURIComponent(m[i + 1]);
    });
    return { operationId: route.operationId, params };
  }
  return null;
}
