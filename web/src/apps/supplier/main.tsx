import { Kernel, mountApp } from "@/shared/bootstrap";
import { SupplierRoutes } from "./routes";

mountApp(
  <Kernel>
    <SupplierRoutes />
  </Kernel>,
);
