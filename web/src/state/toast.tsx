import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

export interface Toast {
  id: string;
  text: string;
}

const Ctx = createContext<{ toasts: Toast[]; push: (text: string) => void; dismiss: (id: string) => void } | null>(
  null,
);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const dismiss = useCallback((id: string) => {
    setToasts((xs) => xs.filter((t) => t.id !== id));
  }, []);
  const push = useCallback(
    (text: string) => {
      const id = `${Date.now()}`;
      setToasts((xs) => [...xs, { id, text }]);
      window.setTimeout(() => dismiss(id), 4000);
    },
    [dismiss],
  );
  const value = useMemo(() => ({ toasts, push, dismiss }), [toasts, push, dismiss]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useToast() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useToast");
  return ctx;
}
