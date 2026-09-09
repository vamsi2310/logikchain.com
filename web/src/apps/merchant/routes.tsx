import { Navigate, Route, Routes } from "react-router-dom";
import { Guard } from "@/shared/guard";
import {
  MerchantSetupScreen,
  MerchantGigsScreen,
  MerchantGigPickupsScreen,
  MerchantPickupDetailScreen,
  BulkCatalogScreen,
  BulkCheckoutScreen,
  MerchantOrdersScreen,
  MerchantOrderDetailScreen,
  MerchantHandoverCodeScreen,
  CreditDashboardScreen,
  CreditRepayScreen,
  CreditLedgerScreen,
  CreditCodesScreen,
  CreditRequestsScreen,
  ShopSettingsScreen,
  MerchantSubscriptionScreen,
  CashCollectScreen,
} from "./screens/MerchantScreens";

export function MerchantRoutes() {
  return (
    <Routes>
      <Route path="/m/setup" element={<Guard app="merchant"><MerchantSetupScreen /></Guard>} />
      <Route path="/m/gigs" element={<Guard app="merchant"><MerchantGigsScreen /></Guard>} />
      <Route path="/m/gigs/:gigId" element={<Guard app="merchant"><MerchantGigPickupsScreen /></Guard>} />
      <Route path="/m/pickups/:orderId" element={<Guard app="merchant"><MerchantPickupDetailScreen /></Guard>} />
      <Route path="/m/bulk/new" element={<Guard app="merchant"><BulkCatalogScreen /></Guard>} />
      <Route path="/m/bulk/review" element={<Guard app="merchant"><BulkCheckoutScreen /></Guard>} />
      <Route path="/m/orders" element={<Guard app="merchant"><MerchantOrdersScreen /></Guard>} />
      <Route path="/m/orders/:merchantOrderId" element={<Guard app="merchant"><MerchantOrderDetailScreen /></Guard>} />
      <Route path="/m/orders/:merchantOrderId/handover-code" element={<Guard app="merchant"><MerchantHandoverCodeScreen /></Guard>} />
      <Route path="/m/credit" element={<Guard app="merchant"><CreditDashboardScreen /></Guard>} />
      <Route path="/m/credit/repay" element={<Guard app="merchant"><CreditRepayScreen /></Guard>} />
      <Route path="/m/credit/collect/:custodyTransferId" element={<Guard app="merchant"><CashCollectScreen /></Guard>} />
      <Route path="/m/credit/ledger" element={<Guard app="merchant"><CreditLedgerScreen /></Guard>} />
      <Route path="/m/credit/codes" element={<Guard app="merchant"><CreditCodesScreen /></Guard>} />
      <Route path="/m/credit/requests" element={<Guard app="merchant"><CreditRequestsScreen /></Guard>} />
      <Route path="/m/shop" element={<Guard app="merchant"><ShopSettingsScreen /></Guard>} />
      <Route path="/m/subscription" element={<Guard app="merchant"><MerchantSubscriptionScreen /></Guard>} />
      <Route path="*" element={<Navigate to="/m/gigs" replace />} />
    </Routes>
  );
}
