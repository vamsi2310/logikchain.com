import { StrictMode, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { initFirebase } from "@/firebase/app";
import { isFirebaseConfigured } from "@/config/env";
import { LocaleProvider } from "@/state/locale";
import { ToastProvider } from "@/state/toast";
import { OfflineProvider } from "@/state/offline";
import { CartProvider } from "@/state/cart";
import { SessionProvider } from "@/state/session";
import { ToastHost } from "@/ui/overlays";
import { MissingConfig } from "@/shared/MissingConfig";
import "@/styles/tokens.css";
import "@/styles/app.css";
import "@/pwa";

/** Shared providers — every role app mounts through this. */
export function Kernel({ children }: { children: ReactNode }) {
  return (
    <LocaleProvider>
      <ToastProvider>
        <OfflineProvider>
          <CartProvider>
            <SessionProvider>
              <BrowserRouter>
                {children}
                <ToastHost />
              </BrowserRouter>
            </SessionProvider>
          </CartProvider>
        </OfflineProvider>
      </ToastProvider>
    </LocaleProvider>
  );
}

export function mountApp(node: ReactNode): void {
  const root = document.getElementById("root");
  if (!root) return;
  if (!isFirebaseConfigured()) {
    createRoot(root).render(
      <StrictMode>
        <MissingConfig />
      </StrictMode>,
    );
    return;
  }
  initFirebase();
  createRoot(root).render(<StrictMode>{node}</StrictMode>);
}
