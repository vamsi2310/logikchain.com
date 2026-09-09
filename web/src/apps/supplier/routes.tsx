import { Navigate, Route, Routes } from "react-router-dom";
import { Guard } from "@/shared/guard";
import {
  SupplierDashboardScreen,
  SupplierVillagesScreen,
  SupplierMerchantsScreen,
  SupplierMerchantDetailScreen,
  SupplierDriversScreen,
  SupplierDriverDetailScreen,
  SupplierInventoryScreen,
  SupplierRoutesScreen,
  SupplierRouteBuilderScreen,
  SupplierPamphletsScreen,
  SupplierGigComposerScreen,
  SupplierGigsScreen,
  SupplierGigDetailScreen,
  SupplierOrdersScreen,
  SupplierOrderDetailScreen,
  SupplierFinanceScreen,
  SupplierReportScreen,
  SupplierPayoutsScreen,
  SupplierCashScreen,
  SupplierCashConfirmScreen,
  SupplierSimple,
  SupplierConvertScreen,
  CreditRequestsQueueScreen,
} from "./screens/SupplierScreens";

export function SupplierRoutes() {
  return (
    <Routes>
      <Route path="/s/setup" element={<Guard app="supplier"><SupplierSimple title="Supplier setup" id="SUP-01" /></Guard>} />
      <Route path="/s/settings" element={<Guard app="supplier"><SupplierSimple title="Business settings" id="SUP-01.1" /></Guard>} />
      <Route path="/s/dashboard" element={<Guard app="supplier"><SupplierDashboardScreen /></Guard>} />
      <Route path="/s/villages" element={<Guard app="supplier"><SupplierVillagesScreen /></Guard>} />
      <Route path="/s/merchants" element={<Guard app="supplier"><SupplierMerchantsScreen /></Guard>} />
      <Route path="/s/merchants/:merchantId" element={<Guard app="supplier"><SupplierMerchantDetailScreen /></Guard>} />
      <Route path="/s/merchants/:merchantId/ledger" element={<Guard app="supplier"><SupplierSimple title="Merchant ledger" id="SUP-04.5" /></Guard>} />
      <Route path="/s/credit-requests" element={<Guard app="supplier"><CreditRequestsQueueScreen /></Guard>} />
      <Route path="/s/drivers" element={<Guard app="supplier"><SupplierDriversScreen /></Guard>} />
      <Route path="/s/drivers/:driverId" element={<Guard app="supplier"><SupplierDriverDetailScreen /></Guard>} />
      <Route path="/s/payouts" element={<Guard app="supplier"><SupplierPayoutsScreen /></Guard>} />
      <Route path="/s/payouts/:payoutTransactionId" element={<Guard app="supplier"><SupplierSimple title="Payout" id="SUP-05.3" /></Guard>} />
      <Route path="/s/inventory" element={<Guard app="supplier"><SupplierInventoryScreen /></Guard>} />
      <Route path="/s/discounts" element={<Guard app="supplier"><SupplierSimple title="Discounts" id="SUP-06.2" /></Guard>} />
      <Route path="/s/routes" element={<Guard app="supplier"><SupplierRoutesScreen /></Guard>} />
      <Route path="/s/routes/:routeId" element={<Guard app="supplier"><SupplierRouteBuilderScreen /></Guard>} />
      <Route path="/s/pamphlets" element={<Guard app="supplier"><SupplierPamphletsScreen /></Guard>} />
      <Route path="/s/pamphlets/:pamphletId" element={<Guard app="supplier"><SupplierSimple title="Pamphlet builder" id="SUP-08.1" /></Guard>} />
      <Route path="/s/gigs/new" element={<Guard app="supplier"><SupplierGigComposerScreen /></Guard>} />
      <Route path="/s/gigs" element={<Guard app="supplier"><SupplierGigsScreen /></Guard>} />
      <Route path="/s/gigs/:gigId" element={<Guard app="supplier"><SupplierGigDetailScreen /></Guard>} />
      <Route path="/s/orders" element={<Guard app="supplier"><SupplierOrdersScreen /></Guard>} />
      <Route path="/s/orders/:orderId" element={<Guard app="supplier"><SupplierOrderDetailScreen /></Guard>} />
      <Route path="/s/report" element={<Guard app="supplier"><SupplierReportScreen /></Guard>} />
      <Route path="/s/finance" element={<Guard app="supplier"><SupplierFinanceScreen /></Guard>} />
      <Route path="/s/ai" element={<Guard app="supplier"><SupplierSimple title="AI assistant" id="SUP-14" body="Vertex runs on Functions. No Gemini key in the PWA." /></Guard>} />
      <Route path="/s/plans" element={<Guard app="supplier"><SupplierSimple title="Plans" id="SUP-15" /></Guard>} />
      <Route path="/s/cash" element={<Guard app="supplier"><SupplierCashScreen /></Guard>} />
      <Route path="/s/cash/:settlementId" element={<Guard app="supplier"><SupplierCashConfirmScreen /></Guard>} />
      <Route path="/s/cash/:settlementId/variance" element={<Guard app="supplier"><SupplierSimple title="Variance" id="SUP-16.2" /></Guard>} />
      <Route path="/s/fallbacks" element={<Guard app="supplier"><SupplierSimple title="Fallbacks" id="SUP-16.3" /></Guard>} />
      <Route path="/s/convert" element={<Guard app="supplier"><SupplierConvertScreen /></Guard>} />
      <Route path="*" element={<Navigate to="/s/dashboard" replace />} />
    </Routes>
  );
}
