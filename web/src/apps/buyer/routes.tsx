import { Navigate, Route, Routes } from "react-router-dom";
import { Guard } from "@/shared/guard";
import { shellRoutes } from "@/apps/shell/routes";
import { BuyerSetupScreen } from "./screens/SetupScreens";
import { BuyerHomeScreen, GigDetailScreen, PamphletScreen } from "./screens/HomeScreens";
import {
  CartScreen,
  CheckoutScreen,
  PaymentProcessingScreen,
  PickupCodeScreen,
  OrdersScreen,
  OrderDetailScreen,
  InvoiceScreen,
  RefundScreen,
  ReceiptScreen,
} from "./screens/OrderScreens";

export function BuyerRoutes() {
  return (
    <Routes>
      {shellRoutes()}
      <Route path="/setup" element={<Guard app="buyer"><BuyerSetupScreen /></Guard>} />
      <Route path="/home" element={<Guard app="buyer"><BuyerHomeScreen /></Guard>} />
      <Route path="/gigs/:gigId" element={<Guard app="buyer"><GigDetailScreen /></Guard>} />
      <Route path="/gigs/:gigId/pamphlet" element={<Guard app="buyer"><PamphletScreen /></Guard>} />
      <Route path="/cart" element={<Guard app="buyer"><CartScreen /></Guard>} />
      <Route path="/checkout" element={<Guard app="buyer"><CheckoutScreen /></Guard>} />
      <Route path="/checkout/processing" element={<Guard app="buyer"><PaymentProcessingScreen /></Guard>} />
      <Route path="/orders" element={<Guard app="buyer"><OrdersScreen /></Guard>} />
      <Route path="/orders/:orderId" element={<Guard app="buyer"><OrderDetailScreen /></Guard>} />
      <Route path="/orders/:orderId/pickup-code" element={<Guard app="buyer"><PickupCodeScreen /></Guard>} />
      <Route path="/orders/:orderId/invoice" element={<Guard app="buyer"><InvoiceScreen /></Guard>} />
      <Route path="/orders/:orderId/refund" element={<Guard app="buyer"><RefundScreen /></Guard>} />
      <Route path="/orders/:orderId/receipt" element={<Guard app="buyer"><ReceiptScreen /></Guard>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
