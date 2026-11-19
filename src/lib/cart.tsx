import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type CartItem = { productId: string; boxes: number };
type Ctx = {
  items: CartItem[];
  setBoxes: (productId: string, boxes: number) => void;
  remove: (productId: string) => void;
  clear: () => void;
  count: number;
};
const CartContext = createContext<Ctx | null>(null);
const KEY = "finasub-cart-v1";

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setItems(JSON.parse(raw));
    } catch {}
    setLoaded(true);
  }, []);
  useEffect(() => {
    if (loaded) localStorage.setItem(KEY, JSON.stringify(items));
  }, [items, loaded]);
  const setBoxes = (productId: string, boxes: number) =>
    setItems((cur) => {
      const b = Math.max(0, Math.min(100000, Math.floor(boxes || 0)));
      if (b === 0) return cur.filter((i) => i.productId !== productId);
      return cur.some((i) => i.productId === productId)
        ? cur.map((i) => (i.productId === productId ? { ...i, boxes: b } : i))
        : [...cur, { productId, boxes: b }];
    });
  return (
    <CartContext.Provider
      value={{
        items,
        setBoxes,
        remove: (id) => setItems((c) => c.filter((i) => i.productId !== id)),
        clear: () => setItems([]),
        count: items.reduce((s, i) => s + i.boxes, 0),
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const c = useContext(CartContext);
  if (!c) throw new Error("useCart outside CartProvider");
  return c;
}