import { Kernel, mountApp } from "@/shared/bootstrap";
import { VehicleRoutes } from "./routes";

mountApp(
  <Kernel>
    <VehicleRoutes />
  </Kernel>,
);
