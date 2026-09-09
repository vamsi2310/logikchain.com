import { Navigate, Route, Routes } from "react-router-dom";
import { Guard } from "@/shared/guard";
import {
  SupportOpsScreen,
  SupportUsersScreen,
  SupportUserDetailScreen,
  CreateSupplierScreen,
  SuspendedOrdersScreen,
  VillageRequestsScreen,
  ConfigHomeScreen,
  CountriesScreen,
  StatesScreen,
  DistrictsScreen,
  VillagesScreen,
  HubsScreen,
  HubDetailScreen,
  PlansScreen,
  TariffsScreen,
  OffersScreen,
  CodesScreen,
  SupportSearchScreen,
  RecordDetailScreen,
  AuditLogScreen,
  CashConsoleScreen,
  DiscrepanciesScreen,
  MoneyExceptionsScreen,
  ReconciliationScreen,
  PeriodCloseScreen,
  TaxScreen,
  TdsScreen,
  SupportSubscriptionsScreen,
  SupportSimple,
} from "./screens/SupportScreens";
import {
  ProfileScreen,
  EditProfileScreen,
  SecurityScreen,
  PermissionsScreen,
  VoiceScreen,
  NotificationsScreen,
  NotificationSettingsScreen,
} from "@/apps/shell/screens/AccountScreens";
import { LegalScreen } from "@/apps/shell/screens/AuthScreens";

export function SupportRoutes() {
  return (
    <Routes>
      <Route path="/x/profile" element={<Guard app="support"><ProfileScreen /></Guard>} />
      <Route path="/x/profile/edit" element={<Guard app="support"><EditProfileScreen /></Guard>} />
      <Route path="/x/profile/security" element={<Guard app="support"><SecurityScreen /></Guard>} />
      <Route path="/x/profile/permissions" element={<Guard app="support"><PermissionsScreen /></Guard>} />
      <Route path="/x/profile/voice" element={<Guard app="support"><VoiceScreen /></Guard>} />
      <Route path="/x/notifications" element={<Guard app="support"><NotificationsScreen /></Guard>} />
      <Route path="/x/notifications/settings" element={<Guard app="support"><NotificationSettingsScreen /></Guard>} />
      <Route path="/x/legal/:doc" element={<LegalScreen />} />
      <Route path="/profile" element={<Navigate to="/x/profile" replace />} />
      <Route path="/profile/*" element={<Navigate to="/x/profile" replace />} />
      <Route path="/notifications" element={<Navigate to="/x/notifications" replace />} />
      <Route path="/legal/:doc" element={<LegalScreen />} />
      <Route path="/x/ops" element={<Guard app="support"><SupportOpsScreen /></Guard>} />
      <Route path="/x/users" element={<Guard app="support"><SupportUsersScreen /></Guard>} />
      <Route path="/x/users/new-supplier" element={<Guard app="support"><CreateSupplierScreen /></Guard>} />
      <Route path="/x/users/:userId" element={<Guard app="support"><SupportUserDetailScreen /></Guard>} />
      <Route path="/x/suppliers/:supplierId" element={<Guard app="support"><SupportUserDetailScreen /></Guard>} />
      <Route path="/x/orders/suspended" element={<Guard app="support"><SuspendedOrdersScreen /></Guard>} />
      <Route path="/x/villages/requests" element={<Guard app="support"><VillageRequestsScreen /></Guard>} />
      <Route path="/x/config" element={<Guard app="support"><ConfigHomeScreen /></Guard>} />
      <Route path="/x/config/countries" element={<Guard app="support"><CountriesScreen /></Guard>} />
      <Route path="/x/config/states" element={<Guard app="support"><StatesScreen /></Guard>} />
      <Route path="/x/config/districts" element={<Guard app="support"><DistrictsScreen /></Guard>} />
      <Route path="/x/config/villages" element={<Guard app="support"><VillagesScreen /></Guard>} />
      <Route path="/x/config/hubs" element={<Guard app="support"><HubsScreen /></Guard>} />
      <Route path="/x/config/hubs/:hubId" element={<Guard app="support"><HubDetailScreen /></Guard>} />
      <Route path="/x/config/plans" element={<Guard app="support"><PlansScreen /></Guard>} />
      <Route path="/x/config/tariffs" element={<Guard app="support"><TariffsScreen /></Guard>} />
      <Route path="/x/config/offers" element={<Guard app="support"><OffersScreen /></Guard>} />
      <Route path="/x/config/codes" element={<Guard app="support"><CodesScreen /></Guard>} />
      <Route path="/x/config/codes/:code/redemptions" element={<Guard app="support"><SupportSimple title="Redemptions" id="SPT-13.1" /></Guard>} />
      <Route path="/x/subscriptions" element={<Guard app="support"><SupportSubscriptionsScreen /></Guard>} />
      <Route path="/x/search" element={<Guard app="support"><SupportSearchScreen /></Guard>} />
      <Route path="/x/records/:collection/:id" element={<Guard app="support"><RecordDetailScreen /></Guard>} />
      <Route path="/x/audit" element={<Guard app="support"><AuditLogScreen /></Guard>} />
      <Route path="/x/cash" element={<Guard app="support"><CashConsoleScreen /></Guard>} />
      <Route path="/x/cash/discrepancies" element={<Guard app="support"><DiscrepanciesScreen /></Guard>} />
      <Route path="/x/cash/trail/:collection/:id" element={<Guard app="support"><SupportSimple title="Custody trail" id="SPT-19.2" /></Guard>} />
      <Route path="/x/money-exceptions" element={<Guard app="support"><MoneyExceptionsScreen /></Guard>} />
      <Route path="/x/money-exceptions/:queue" element={<Guard app="support"><MoneyExceptionsScreen /></Guard>} />
      <Route path="/x/reconciliation" element={<Guard app="support"><ReconciliationScreen /></Guard>} />
      <Route path="/x/reconciliation/:reconciliationRunId" element={<Guard app="support"><ReconciliationScreen /></Guard>} />
      <Route path="/x/reconciliation/exception/:exceptionId" element={<Guard app="support"><ReconciliationScreen /></Guard>} />
      <Route path="/x/period-close" element={<Guard app="support"><PeriodCloseScreen /></Guard>} />
      <Route path="/x/period-close/:accountingPeriodId" element={<Guard app="support"><PeriodCloseScreen /></Guard>} />
      <Route path="/x/config/tax" element={<Guard app="support"><TaxScreen /></Guard>} />
      <Route path="/x/config/tax/:supplierId" element={<Guard app="support"><TaxScreen /></Guard>} />
      <Route path="/x/config/tds" element={<Guard app="support"><TdsScreen /></Guard>} />
      <Route path="/x/config/tds/:financialYear/:quarter" element={<Guard app="support"><TdsScreen /></Guard>} />
      <Route path="*" element={<Navigate to="/x/ops" replace />} />
    </Routes>
  );
}
