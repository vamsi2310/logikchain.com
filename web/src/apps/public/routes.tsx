import { Route } from "react-router-dom";
import { PublicHomeScreen } from "./PublicHomeScreen";
import {
  PublicHowItWorksScreen,
  PublicMerchantScreen,
  PublicSupplierScreen,
  PublicRidersScreen,
} from "./PublicActorScreens";
import {
  PublicDownloadScreen,
  PublicStatusScreen,
  PublicRoadmapScreen,
} from "./PublicStatusScreens";
import {
  PublicLegalScreen,
  PublicHelpScreen,
  PublicSafetyScreen,
} from "./PublicLegalScreens";
import {
  PublicAboutScreen,
  PublicCommunityScreen,
  PublicContactScreen,
  PublicGrievanceScreen,
} from "./PublicCompanyScreens";
import { PublicLegalRouteWrapper } from "./PublicLegalRouteWrapper";
import { MarketingPortalScreen } from "@/apps/marketing/MarketingPortalScreen";
import { MicroservicesPortalScreen } from "@/apps/microservices/MicroservicesPortalScreen";
import { UserFlowsPortalScreen } from "@/apps/userflows/UserFlowsPortalScreen";
import { WorkManagementScreen } from "@/apps/workmanagement/WorkManagementScreen";

export function publicRoutes() {
  return (
    <>
      <Route path="/" element={<PublicHomeScreen />} />
      <Route path="/how-it-works" element={<PublicHowItWorksScreen />} />
      <Route path="/merchants" element={<PublicMerchantScreen />} />
      <Route path="/suppliers" element={<PublicSupplierScreen />} />
      <Route path="/riders" element={<PublicRidersScreen />} />
      <Route path="/fleet" element={<PublicRidersScreen />} />
      <Route path="/shop" element={<PublicHomeScreen />} />
      <Route path="/download" element={<PublicDownloadScreen />} />
      <Route path="/status" element={<PublicStatusScreen />} />
      <Route path="/roadmap" element={<PublicRoadmapScreen />} />
      <Route path="/changelog" element={<PublicRoadmapScreen />} />
      <Route path="/about" element={<PublicAboutScreen />} />
      <Route path="/community" element={<PublicCommunityScreen />} />
      <Route path="/social" element={<PublicCommunityScreen />} />
      <Route path="/contact" element={<PublicContactScreen />} />
      <Route path="/grievance" element={<PublicGrievanceScreen />} />
      <Route path="/disputes" element={<PublicGrievanceScreen />} />
      <Route path="/safety" element={<PublicSafetyScreen />} />
      <Route path="/pricing" element={<PublicHowItWorksScreen />} />
      <Route path="/public-help" element={<PublicHelpScreen />} />
      <Route path="/legal" element={<PublicLegalScreen />} />
      <Route path="/legal/:doc" element={<PublicLegalRouteWrapper />} />

      {/* Dedicated Module Websites / Portals */}
      <Route path="/marketing" element={<MarketingPortalScreen />} />
      <Route path="/marketing/campaigns" element={<MarketingPortalScreen />} />
      <Route path="/marketing/creatives" element={<MarketingPortalScreen />} />
      <Route path="/marketing/entry-points" element={<MarketingPortalScreen />} />
      <Route path="/microservices" element={<MicroservicesPortalScreen />} />
      <Route path="/microservices/architecture" element={<MicroservicesPortalScreen />} />
      <Route path="/user-flows" element={<UserFlowsPortalScreen />} />
      <Route path="/flows" element={<UserFlowsPortalScreen />} />
      <Route path="/work-management" element={<WorkManagementScreen />} />
      <Route path="/workmanagement" element={<WorkManagementScreen />} />
    </>
  );
}

