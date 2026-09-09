import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

export interface CartLine {
  productId: string;
  name: string;
  price: number;
  unit: string;
  quantity: number;
  stock: number;
}

export interface CartState {
  uid: string;
  gigId: string;
  villageId: string;
  merchantId: string;
  pamphletId: string;
  supplierId: string;
  lines: CartLine[];
}

function key(uid: string) {
  return `lc.cart.${uid}`;
}

function load(uid: string): CartState | null {
  try {
    const raw = localStorage.getItem(key(uid));
    return raw ? (JSON.parse(raw) as CartState) : null;
  } catch {
    return null;
  }
}

function persist(cart: CartState | null) {
  if (!cart) return;
  localStorage.setItem(key(cart.uid), JSON.stringify(cart));
}

const Ctx = createContext<{
  cart: CartState | null;
  count: number;
  hydrate: (uid: string) => void;
  clear: () => void;
  setContext: (next: Omit<CartState, "lines">) => void;
  setQty: (productId: string, line: Omit<CartLine, "quantity">, qty: number) => void;
} | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [cart, setCart] = useState<CartState | null>(null);
  const hydrate = useCallback((uid: string) => setCart(load(uid)), []);
  const clear = useCallback(() => {
    if (cart) localStorage.removeItem(key(cart.uid));
    setCart(null);
  }, [cart]);
  const setContext = useCallback((next: Omit<CartState, "lines">) => {
    setCart((prev) => {
      const keep = prev && prev.gigId === next.gigId && prev.uid === next.uid ? prev.lines : [];
      const merged = { ...next, lines: keep };
      persist(merged);
      return merged;
    });
  }, []);
  const setQty = useCallback((productId: string, line: Omit<CartLine, "quantity">, qty: number) => {
    setCart((prev) => {
      if (!prev) return prev;
      const nextLines = prev.lines.filter((l) => l.productId !== productId);
      if (qty > 0) nextLines.push({ ...line, quantity: Math.min(qty, line.stock) });
      const next = { ...prev, lines: nextLines };
      persist(next);
      return next;
    });
  }, []);
  const count = cart?.lines.reduce((n, l) => n + l.quantity, 0) ?? 0;
  const value = useMemo(
    () => ({ cart, count, hydrate, clear, setContext, setQty }),
    [cart, count, hydrate, clear, setContext, setQty],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCart() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useCart");
  return ctx;
}
