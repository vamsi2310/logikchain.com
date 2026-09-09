import { Kernel, mountApp } from "@/shared/bootstrap";
import { MerchantRoutes } from "./routes";

mountApp(
  <Kernel>
    <MerchantRoutes />
  </Kernel>,
);
