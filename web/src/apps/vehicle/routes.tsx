import { Navigate, Route, Routes } from "react-router-dom";
import { Guard } from "@/shared/guard";
import {
  DriverSetupScreen,
  DriverGigsScreen,
  DriverGigAckScreen,
  DriverStopsScreen,
  DriverTrackingScreen,
  DriverEarningsScreen,
  DriverPayoutScreen,
  DriverPayoutHistoryScreen,
  DriverCashScreen,
  DriverVehicleScreen,
  DriverPlaceholder,
} from "./screens/DriverScreens";

export function VehicleRoutes() {
  return (
    <Routes>
      <Route path="/d/setup" element={<Guard app="vehicle"><DriverSetupScreen /></Guard>} />
      <Route path="/d/gigs" element={<Guard app="vehicle"><DriverGigsScreen /></Guard>} />
      <Route path="/d/gigs/:gigId" element={<Guard app="vehicle"><DriverGigAckScreen /></Guard>} />
      <Route path="/d/gigs/:gigId/stop/:index" element={<Guard app="vehicle"><DriverStopsScreen /></Guard>} />
      <Route path="/d/tracking" element={<Guard app="vehicle"><DriverTrackingScreen /></Guard>} />
      <Route path="/d/tracking/uploads" element={<Guard app="vehicle"><DriverPlaceholder title="Proof queue" id="DRV-05.1" /></Guard>} />
      <Route path="/d/earnings" element={<Guard app="vehicle"><DriverEarningsScreen /></Guard>} />
      <Route path="/d/earnings/gig/:gigId" element={<Guard app="vehicle"><DriverPlaceholder title="Gig earnings" id="DRV-07.1" /></Guard>} />
      <Route path="/d/earnings/payout" element={<Guard app="vehicle"><DriverPayoutScreen /></Guard>} />
      <Route path="/d/earnings/payout/history" element={<Guard app="vehicle"><DriverPayoutHistoryScreen /></Guard>} />
      <Route path="/d/earnings/payout/destination" element={<Guard app="vehicle"><DriverPlaceholder title="Payout destination" id="DRV-08.3" /></Guard>} />
      <Route path="/d/cash" element={<Guard app="vehicle"><DriverCashScreen /></Guard>} />
      <Route path="/d/cash/collect/:merchantId" element={<Guard app="vehicle"><DriverPlaceholder title="Collect cash" id="DRV-10.1" /></Guard>} />
      <Route path="/d/cash/handover/:settlementId" element={<Guard app="vehicle"><DriverPlaceholder title="Handover" id="DRV-10.2" /></Guard>} />
      <Route path="/d/cash/settlement/:settlementId" element={<Guard app="vehicle"><DriverPlaceholder title="Settlement" id="DRV-10.3" /></Guard>} />
      <Route path="/d/vehicle" element={<Guard app="vehicle"><DriverVehicleScreen /></Guard>} />
      <Route path="*" element={<Navigate to="/d/gigs" replace />} />
    </Routes>
  );
}
