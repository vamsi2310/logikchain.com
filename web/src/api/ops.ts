import { api } from "./client";
import type { CatalogResponse } from "@/types/domain";

function path(template: string, params: Record<string, string> = {}): string {
  return template.replace(/\{(\w+)\}/g, (_, k: string) => encodeURIComponent(params[k] ?? ""));
}

export const ops = {
  listConfigurationCatalog: (query?: Record<string, string | number | boolean | undefined>) =>
    api.get<CatalogResponse>("/v1/config/catalog", query),

  updateUserProfile: (userId: string, body: Record<string, unknown>) =>
    api.patch<{ success: boolean; userId: string; updatedFields: string[] }>(
      path("/v1/users/{userId}", { userId }),
      body,
    ),

  registerDeviceToken: (body: Record<string, unknown>) =>
    api.post<{ success: boolean }>("/v1/devices", body),

  convertBuyerToRole: (buyerId: string, body: Record<string, unknown>) =>
    api.post(path("/v1/buyers/{buyerId}/role", { buyerId }), body),

  createSupplier: (body: Record<string, unknown>) => api.post("/v1/suppliers", body),

  suspendUser: (userId: string, body: Record<string, unknown>) =>
    api.post(path("/v1/users/{userId}/suspension", { userId }), body),

  restoreUser: (userId: string) =>
    api.delete(path("/v1/users/{userId}/suspension", { userId })),

  placeOrder: (body: Record<string, unknown>) => api.post("/v1/orders", body),

  cancelOrder: (orderId: string, body?: Record<string, unknown>) =>
    api.post(path("/v1/orders/{orderId}:cancel", { orderId }), body),

  markOrderDelivered: (orderId: string, body: Record<string, unknown>, idempotencyKey?: string) =>
    api.post(path("/v1/orders/{orderId}:deliver", { orderId }), body, { idempotencyKey }),

  resendHandoverCode: (body: Record<string, unknown>) =>
    api.post("/v1/handover-codes:resend", body),

  createPaymentIntent: (body: Record<string, unknown>) => api.post("/v1/payment-intents", body),

  processPayment: (intentId: string, body: Record<string, unknown>) =>
    api.post(path("/v1/payment-intents/{intentId}:capture", { intentId }), body),

  refundOrder: (orderId: string, body: Record<string, unknown>) =>
    api.post(path("/v1/orders/{orderId}/refunds", { orderId }), body),

  placeMerchantOrder: (body: Record<string, unknown>) => api.post("/v1/merchant-orders", body),

  updateMerchantOrderStatus: (merchantOrderId: string, body: Record<string, unknown>) =>
    api.patch(path("/v1/merchant-orders/{merchantOrderId}/status", { merchantOrderId }), body),

  cancelMerchantOrder: (merchantOrderId: string, body?: Record<string, unknown>) =>
    api.post(path("/v1/merchant-orders/{merchantOrderId}:cancel", { merchantOrderId }), body),

  requestCreditIncrease: (merchantId: string, body: Record<string, unknown>) =>
    api.post(path("/v1/credit-profiles/{merchantId}/increase-requests", { merchantId }), body),

  setMerchantCreditLimit: (merchantId: string, body: Record<string, unknown>) =>
    api.put(path("/v1/credit-profiles/{merchantId}/limit", { merchantId }), body),

  reviewCreditIncreaseRequest: (requestId: string, body: Record<string, unknown>) =>
    api.patch(path("/v1/credit-increase-requests/{requestId}", { requestId }), body),

  initiateCreditRepayment: (body: Record<string, unknown>) =>
    api.post("/v1/credit-repayments", body),

  confirmCreditRepayment: (transferId: string, body: Record<string, unknown>) =>
    api.post(path("/v1/credit-repayments/{transferId}:confirm", { transferId }), body),

  composeGig: (body: Record<string, unknown>) => api.post("/v1/gigs", body),

  startGig: (gigId: string, body?: Record<string, unknown>) =>
    api.post(path("/v1/gigs/{gigId}:start", { gigId }), body),

  acknowledgeGig: (gigId: string, body?: Record<string, unknown>) =>
    api.post(path("/v1/gigs/{gigId}:acknowledge", { gigId }), body),

  completeAndFinalizeGig: (gigId: string, body?: Record<string, unknown>) =>
    api.post(path("/v1/gigs/{gigId}:complete", { gigId }), body),

  suspendGig: (gigId: string, body: Record<string, unknown>) =>
    api.post(path("/v1/gigs/{gigId}:suspend", { gigId }), body),

  reassignGigDriver: (gigId: string, body: Record<string, unknown>) =>
    api.patch(path("/v1/gigs/{gigId}/driver", { gigId }), body),

  requestPayout: (body: Record<string, unknown>) => api.post("/v1/payout-requests", body),

  reviewPayoutRequest: (payoutRequestId: string, body: Record<string, unknown>) =>
    api.patch(path("/v1/payout-requests/{payoutRequestId}", { payoutRequestId }), body),

  registerPayoutBeneficiary: (body: Record<string, unknown>) =>
    api.post("/v1/beneficiaries", body),

  getCashCustodySummary: (query?: Record<string, string | number | boolean | undefined>) =>
    api.get("/v1/cash/custody", query),

  declareCashHandover: (settlementId: string, body: Record<string, unknown>) =>
    api.post(path("/v1/cash-settlements/{settlementId}:declare", { settlementId }), body),

  confirmCashSettlement: (settlementId: string, body: Record<string, unknown>) =>
    api.post(path("/v1/cash-settlements/{settlementId}:confirm", { settlementId }), body),

  raiseCashDiscrepancy: (body: Record<string, unknown>) =>
    api.post("/v1/cash-discrepancies", body),

  resolveCashDiscrepancy: (discrepancyId: string, body: Record<string, unknown>) =>
    api.patch(path("/v1/cash-discrepancies/{discrepancyId}", { discrepancyId }), body),

  getFinancialReport: (query?: Record<string, string | number | boolean | undefined>) =>
    api.get("/v1/reports/financial", query),

  getFinanceReport: (query?: Record<string, string | number | boolean | undefined>) =>
    api.get("/v1/reports/finance", query),

  getEntitlements: () => api.get("/v1/entitlements"),

  subscribeToPlan: (body: Record<string, unknown>) => api.post("/v1/subscriptions:self", body),

  assignSubscription: (body: Record<string, unknown>) => api.post("/v1/subscriptions", body),

  cancelSubscription: (subscriptionId: string, body?: Record<string, unknown>) =>
    api.post(path("/v1/subscriptions/{subscriptionId}:cancel", { subscriptionId }), body),

  changeSubscriptionPlan: (subscriptionId: string, body: Record<string, unknown>) =>
    api.patch(path("/v1/subscriptions/{subscriptionId}/plan", { subscriptionId }), body),

  previewPlanChange: (subscriptionId: string, query?: Record<string, string | number | boolean | undefined>) =>
    api.get(path("/v1/subscriptions/{subscriptionId}/preview", { subscriptionId }), query),

  upsertCountry: (countryId: string, body: Record<string, unknown>) =>
    api.put(path("/v1/config/countries/{countryId}", { countryId }), body),

  upsertState: (stateId: string, body: Record<string, unknown>) =>
    api.put(path("/v1/config/states/{stateId}", { stateId }), body),

  upsertDistrict: (districtId: string, body: Record<string, unknown>) =>
    api.put(path("/v1/config/districts/{districtId}", { districtId }), body),

  requestVillage: (body: Record<string, unknown>) =>
    api.post("/v1/config/village-requests", body),

  upsertVillage: (villageId: string, body: Record<string, unknown>) =>
    api.put(path("/v1/config/villages/{villageId}", { villageId }), body),

  rejectVillageRequest: (requestId: string, body: Record<string, unknown>) =>
    api.post(path("/v1/config/village-requests/{requestId}:reject", { requestId }), body),

  upsertSubscriptionPlan: (planId: string, body: Record<string, unknown>) =>
    api.put(path("/v1/config/plans/{planId}", { planId }), body),

  upsertPlanTariff: (tariffId: string, body: Record<string, unknown>) =>
    api.put(path("/v1/config/tariffs/{tariffId}", { tariffId }), body),

  upsertSubscriptionOffer: (offerId: string, body: Record<string, unknown>) =>
    api.put(path("/v1/config/offers/{offerId}", { offerId }), body),

  upsertOfferDiscountCode: (codeId: string, body: Record<string, unknown>) =>
    api.put(path("/v1/config/discount-codes/{codeId}", { codeId }), body),

  deactivateConfigurationRecord: (collection: string, recordId: string, body?: Record<string, unknown>) =>
    api.patch(path("/v1/config/{collection}/{recordId}:deactivate", { collection, recordId }), body),

  adjustProductStock: (productId: string, body: Record<string, unknown>) =>
    api.post(path("/v1/products/{productId}/stock", { productId }), body),

  updateDriverPayRates: (supplierId: string, body: Record<string, unknown>) =>
    api.put(path("/v1/suppliers/{supplierId}/driver-pay", { supplierId }), body),

  upsertRoute: (routeId: string, body: Record<string, unknown>) =>
    api.put(path("/v1/routes/{routeId}", { routeId }), body),

  computeRouteMetrics: (body: Record<string, unknown>) =>
    api.post("/v1/routes:compute-metrics", body),

  issueOfflineCodeBatch: (body: Record<string, unknown>) =>
    api.post("/v1/verification-code-batches", body),

  authorizeVerificationFallback: (body: Record<string, unknown>) =>
    api.post("/v1/verification-fallbacks", body),

  requestVerificationFallback: (body: Record<string, unknown>) =>
    api.post("/v1/verification-fallbacks:request", body),

  runReconciliation: (body?: Record<string, unknown>) =>
    api.post("/v1/reconciliation-runs", body),

  resolveReconciliationException: (exceptionId: string, body: Record<string, unknown>) =>
    api.patch(path("/v1/reconciliation-exceptions/{exceptionId}", { exceptionId }), body),

  closeAccountingPeriod: (periodId: string, body?: Record<string, unknown>) =>
    api.post(path("/v1/accounting-periods/{periodId}:close", { periodId }), body),

  reopenAccountingPeriod: (periodId: string, body?: Record<string, unknown>) =>
    api.post(path("/v1/accounting-periods/{periodId}:reopen", { periodId }), body),

  issueCreditNote: (body: Record<string, unknown>) => api.post("/v1/credit-notes", body),

  upsertTaxProfile: (taxProfileId: string, body: Record<string, unknown>) =>
    api.put(path("/v1/tax-profiles/{taxProfileId}", { taxProfileId }), body),

  upsertTdsConfiguration: (configId: string, body: Record<string, unknown>) =>
    api.put(path("/v1/tds-configurations/{configId}", { configId }), body),

  recordTdsChallan: (body: Record<string, unknown>) => api.post("/v1/tds/challans", body),

  issueTdsCertificate: (body: Record<string, unknown>) => api.post("/v1/tds/certificates", body),

  getTdsRegister: (query?: Record<string, string | number | boolean | undefined>) =>
    api.get("/v1/tds/register", query),

  getSystemHealth: () => api.get("/v1/ops/health"),

  requestMyDataExport: (body?: Record<string, unknown>) => api.post("/v1/me/data-export", body),

  requestAccountDeletion: (body?: Record<string, unknown>) => api.post("/v1/me/deletion", body),

  disassociateMerchant: (merchantId: string, body: Record<string, unknown>) =>
    api.post(path("/v1/merchants/{merchantId}:disassociate", { merchantId }), body),

  reassignOrderMerchant: (orderId: string, body: Record<string, unknown>) =>
    api.patch(path("/v1/orders/{orderId}/merchant", { orderId }), body),

  resumeOrderOnGig: (orderId: string, body: Record<string, unknown>) =>
    api.patch(path("/v1/orders/{orderId}/gig", { orderId }), body),
};
