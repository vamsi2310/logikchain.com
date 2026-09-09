import { Kernel, mountApp } from "@/shared/bootstrap";
import { BuyerRoutes } from "./routes";

mountApp(
  <Kernel>
    <BuyerRoutes />
  </Kernel>,
);
