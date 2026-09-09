import { setGlobalOptions } from "firebase-functions/v2";
import { FUNCTIONS_REGION } from "./runtime";
import { callable, api as httpApi, scheduledJob, payoutWorker, webhookHttps } from "./http/wrap";

setGlobalOptions({
  region: FUNCTIONS_REGION,
  minInstances: 0,
});

// Export names are operationIds in constitution/Logikchain_API_Specifications.md.
// 2nd gen only — do not import firebase-functions/v1.
// Function source never contains a project ID; read process.env.GCLOUD_PROJECT.

export const api = httpApi;

export const createSupplier = callable("createSupplier");
export const convertBuyerToRole = callable("convertBuyerToRole");
export const updateUserProfile = callable("updateUserProfile");
export const disassociateMerchant = callable("disassociateMerchant");
export const suspendUser = callable("suspendUser");
export const restoreUser = callable("restoreUser");

export const composeGig = callable("composeGig");
export const startGig = callable("startGig");
export const updateGigLocation = callable("updateGigLocation");
export const completeAndFinalizeGig = callable("completeAndFinalizeGig");
export const suspendGig = callable("suspendGig");
export const reassignGigDriver = callable("reassignGigDriver");

export const placeOrder = callable("placeOrder");
export const cancelOrder = callable("cancelOrder");
export const markOrderDelivered = callable("markOrderDelivered");
export const placeMerchantOrder = callable("placeMerchantOrder");
export const updateMerchantOrderStatus = callable("updateMerchantOrderStatus");
export const cancelMerchantOrder = callable("cancelMerchantOrder");

export const requestCreditIncrease = callable("requestCreditIncrease");
export const setMerchantCreditLimit = callable("setMerchantCreditLimit");
export const reviewCreditIncreaseRequest = callable("reviewCreditIncreaseRequest");
export const setProvisionalCreditPolicy = callable("setProvisionalCreditPolicy");

export const createPaymentIntent = callable("createPaymentIntent");
export const processPayment = callable("processPayment");
export const refundOrder = callable("refundOrder");
export const issueCreditNote = callable("issueCreditNote");

export const requestPayout = callable("requestPayout");
export const reviewPayoutRequest = callable("reviewPayoutRequest");
export const registerPayoutBeneficiary = callable("registerPayoutBeneficiary");
export const blockPayoutBeneficiary = callable("blockPayoutBeneficiary");
export const recordPayoutSettlement = callable("recordPayoutSettlement");
export const verifyManualPayout = callable("verifyManualPayout");
export const retryPayout = callable("retryPayout");
export const initiatePayoutTransfer = payoutWorker();

export const resendHandoverCode = callable("resendHandoverCode");
export const issueOfflineCodeBatch = callable("issueOfflineCodeBatch");
export const authorizeVerificationFallback = callable("authorizeVerificationFallback");
export const initiateCreditRepayment = callable("initiateCreditRepayment");
export const confirmCreditRepayment = callable("confirmCreditRepayment");
export const getCashCustodySummary = callable("getCashCustodySummary");
export const declareCashHandover = callable("declareCashHandover");
export const confirmCashSettlement = callable("confirmCashSettlement");
export const raiseCashDiscrepancy = callable("raiseCashDiscrepancy");
export const resolveCashDiscrepancy = callable("resolveCashDiscrepancy");

export const getFinancialReport = callable("getFinancialReport");
export const getFinanceReport = callable("getFinanceReport");
export const exportFinanceReport = callable("exportFinanceReport");
export const scheduleFinanceReport = callable("scheduleFinanceReport");
export const getEntitlements = callable("getEntitlements");
export const previewPlanChange = callable("previewPlanChange");
export const changeSubscriptionPlan = callable("changeSubscriptionPlan");

export const registerDeviceToken = callable("registerDeviceToken");
export const acknowledgeGig = callable("acknowledgeGig");
export const adjustProductStock = callable("adjustProductStock");
export const updateDriverPayRates = callable("updateDriverPayRates");
export const requestVerificationFallback = callable("requestVerificationFallback");
export const rejectVillageRequest = callable("rejectVillageRequest");
export const reassignOrderMerchant = callable("reassignOrderMerchant");
export const resumeOrderOnGig = callable("resumeOrderOnGig");
export const extendSubscriptionGrace = callable("extendSubscriptionGrace");
export const computeRouteMetrics = callable("computeRouteMetrics");
export const upsertRoute = callable("upsertRoute");
export const getSystemHealth = callable("getSystemHealth");
export const requestMyDataExport = callable("requestMyDataExport");
export const requestAccountDeletion = callable("requestAccountDeletion");

export const subscribeToPlan = callable("subscribeToPlan");
export const assignSubscription = callable("assignSubscription");
export const cancelSubscription = callable("cancelSubscription");

export const upsertCountry = callable("upsertCountry");
export const upsertState = callable("upsertState");
export const upsertDistrict = callable("upsertDistrict");
export const requestVillage = callable("requestVillage");
export const upsertVillage = callable("upsertVillage");
export const upsertSubscriptionPlan = callable("upsertSubscriptionPlan");
export const upsertPlanTariff = callable("upsertPlanTariff");
export const upsertSubscriptionOffer = callable("upsertSubscriptionOffer");
export const upsertOfferDiscountCode = callable("upsertOfferDiscountCode");
export const deactivateConfigurationRecord = callable("deactivateConfigurationRecord");
export const listConfigurationCatalog = callable("listConfigurationCatalog");
export const upsertTaxProfile = callable("upsertTaxProfile");
export const upsertTdsConfiguration = callable("upsertTdsConfiguration");
export const recordTdsChallan = callable("recordTdsChallan");
export const issueTdsCertificate = callable("issueTdsCertificate");
export const getTdsRegister = callable("getTdsRegister");

export const runReconciliation = callable("runReconciliation");
export const resolveReconciliationException = callable("resolveReconciliationException");
export const closeAccountingPeriod = callable("closeAccountingPeriod");
export const reopenAccountingPeriod = callable("reopenAccountingPeriod");

export const handleGatewayWebhook = webhookHttps("handleGatewayWebhook");

export const postDueCreditRelief = scheduledJob("postDueCreditRelief", "every 1 hours");
export const scheduledReconciliation = scheduledJob("runReconciliation", "every day 02:00");
