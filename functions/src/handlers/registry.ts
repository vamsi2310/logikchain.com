import type { CallContext } from "../auth/caller";

export type Handler = (ctx: CallContext) => Promise<unknown>;

const MODULE_BY_OPERATION: Record<string, string> = {
  createSupplier: "identity",
  convertBuyerToRole: "identity",
  updateUserProfile: "identity",
  disassociateMerchant: "identity",
  suspendUser: "identity",
  restoreUser: "identity",
  composeGig: "gigs",
  startGig: "gigs",
  updateGigLocation: "gigs",
  completeAndFinalizeGig: "gigs",
  suspendGig: "gigs",
  reassignGigDriver: "gigs",
  placeOrder: "orders",
  cancelOrder: "orders",
  markOrderDelivered: "orders",
  placeMerchantOrder: "orders",
  updateMerchantOrderStatus: "orders",
  cancelMerchantOrder: "orders",
  requestCreditIncrease: "credit",
  setMerchantCreditLimit: "credit",
  reviewCreditIncreaseRequest: "credit",
  setProvisionalCreditPolicy: "credit",
  createPaymentIntent: "payments",
  processPayment: "payments",
  refundOrder: "payments",
  issueCreditNote: "payments",
  requestPayout: "payouts",
  reviewPayoutRequest: "payouts",
  registerPayoutBeneficiary: "payouts",
  blockPayoutBeneficiary: "payouts",
  recordPayoutSettlement: "payouts",
  verifyManualPayout: "payouts",
  retryPayout: "payouts",
  resendHandoverCode: "cash",
  issueOfflineCodeBatch: "cash",
  authorizeVerificationFallback: "cash",
  initiateCreditRepayment: "cash",
  confirmCreditRepayment: "cash",
  getCashCustodySummary: "cash",
  declareCashHandover: "cash",
  confirmCashSettlement: "cash",
  raiseCashDiscrepancy: "cash",
  resolveCashDiscrepancy: "cash",
  getFinancialReport: "remaining",
  getFinanceReport: "remaining",
  exportFinanceReport: "remaining",
  scheduleFinanceReport: "remaining",
  getEntitlements: "remaining",
  previewPlanChange: "remaining",
  changeSubscriptionPlan: "remaining",
  registerDeviceToken: "remaining",
  acknowledgeGig: "remaining",
  adjustProductStock: "remaining",
  updateDriverPayRates: "remaining",
  requestVerificationFallback: "remaining",
  rejectVillageRequest: "remaining",
  reassignOrderMerchant: "remaining",
  resumeOrderOnGig: "remaining",
  extendSubscriptionGrace: "remaining",
  computeRouteMetrics: "remaining",
  upsertRoute: "remaining",
  getSystemHealth: "remaining",
  requestMyDataExport: "remaining",
  requestAccountDeletion: "remaining",
  subscribeToPlan: "remaining",
  assignSubscription: "remaining",
  cancelSubscription: "remaining",
  upsertCountry: "config",
  upsertState: "config",
  upsertDistrict: "config",
  requestVillage: "config",
  upsertVillage: "config",
  upsertSubscriptionPlan: "config",
  upsertPlanTariff: "config",
  upsertSubscriptionOffer: "config",
  upsertOfferDiscountCode: "config",
  deactivateConfigurationRecord: "config",
  listConfigurationCatalog: "config",
  upsertTaxProfile: "config",
  upsertTdsConfiguration: "config",
  recordTdsChallan: "config",
  issueTdsCertificate: "config",
  getTdsRegister: "config",
  runReconciliation: "reconciliation",
  resolveReconciliationException: "reconciliation",
  closeAccountingPeriod: "reconciliation",
  reopenAccountingPeriod: "reconciliation",
  handleGatewayWebhook: "webhooks",
  postDueCreditRelief: "scheduled",
};

export function hasHandler(operationId: string): boolean {
  return operationId in MODULE_BY_OPERATION;
}

export async function getHandler(operationId: string): Promise<Handler | null> {
  const moduleName = MODULE_BY_OPERATION[operationId];
  if (!moduleName) return null;

  let loaded: Record<string, unknown>;
  switch (moduleName) {
    case "identity":
      loaded = await import("./identity");
      break;
    case "gigs":
      loaded = await import("./gigs");
      break;
    case "orders":
      loaded = await import("./orders");
      break;
    case "credit":
      loaded = await import("./credit");
      break;
    case "cash":
      loaded = await import("./cash");
      break;
    case "payments":
      loaded = await import("./payments");
      break;
    case "payouts":
      loaded = await import("./payouts");
      break;
    case "remaining":
      loaded = await import("./remaining");
      break;
    case "config":
      loaded = await import("./config");
      break;
    case "reconciliation":
      loaded = await import("./reconciliation");
      break;
    case "scheduled":
      loaded = await import("./scheduled");
      break;
    case "webhooks":
      loaded = await import("./webhooks");
      break;
    default:
      return null;
  }
  const handler = loaded[operationId];
  return typeof handler === "function" ? (handler as Handler) : null;
}
