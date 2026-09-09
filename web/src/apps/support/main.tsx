import { Kernel, mountApp } from "@/shared/bootstrap";
import { SupportRoutes } from "./routes";

mountApp(
  <Kernel>
    <SupportRoutes />
  </Kernel>,
);
