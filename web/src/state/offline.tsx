import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

const Ctx = createContext<{ online: boolean }>({ online: true });

export function OfflineProvider({ children }: { children: ReactNode }) {
  const [online, setOnline] = useState(navigator.onLine);
  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);
  const value = useMemo(() => ({ online }), [online]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useOnline() {
  return useContext(Ctx);
}
