import { Route } from "react-router-dom";
import { SplashScreen } from "@/shared/SplashScreen";
import {
  LoginScreen,
  LanguageScreen,
  OtpScreen,
  UnauthorizedScreen,
  RoleChangedScreen,
  LegalScreen,
} from "./screens/AuthScreens";
import {
  ProfileScreen,
  EditProfileScreen,
  NotificationsScreen,
  NotificationSettingsScreen,
  SecurityScreen,
  PermissionsScreen,
  VoiceScreen,
  SyncScreen,
  InstallScreen,
  HelpScreen,
} from "./screens/AccountScreens";
import { AccountGuard } from "@/shared/guard";

/** Auth + account chrome. Lives in the buyer entry so other role apps stay lite. */
export function shellRoutes() {
  return (
    <>
      <Route path="/" element={<SplashScreen />} />
      <Route path="/login" element={<LoginScreen />} />
      <Route path="/login/verify" element={<OtpScreen />} />
      <Route path="/language" element={<LanguageScreen />} />
      <Route path="/legal/:doc" element={<LegalScreen />} />
      <Route path="/unauthorized" element={<UnauthorizedScreen />} />
      <Route path="/role-changed" element={<RoleChangedScreen />} />
      <Route path="/profile" element={<AccountGuard><ProfileScreen /></AccountGuard>} />
      <Route path="/profile/edit" element={<AccountGuard><EditProfileScreen /></AccountGuard>} />
      <Route path="/profile/security" element={<AccountGuard><SecurityScreen /></AccountGuard>} />
      <Route path="/profile/permissions" element={<AccountGuard><PermissionsScreen /></AccountGuard>} />
      <Route path="/profile/voice" element={<AccountGuard><VoiceScreen /></AccountGuard>} />
      <Route path="/notifications" element={<AccountGuard><NotificationsScreen /></AccountGuard>} />
      <Route path="/notifications/settings" element={<AccountGuard><NotificationSettingsScreen /></AccountGuard>} />
      <Route path="/sync" element={<AccountGuard><SyncScreen /></AccountGuard>} />
      <Route path="/install" element={<AccountGuard><InstallScreen /></AccountGuard>} />
      <Route path="/help" element={<AccountGuard><HelpScreen /></AccountGuard>} />
    </>
  );
}
