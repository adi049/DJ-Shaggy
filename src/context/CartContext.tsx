import { createContext, useContext, useEffect, useMemo, useState, ReactNode } from 'react';
import type { CartItem } from '../lib/types';

interface CartCtx {
  items: CartItem[];
  count: number;
  subtotal: number;
  add: (item: Omit<CartItem, 'key'>) => boolean;
  remove: (key: string) => void;
  clear: () => void;
  has: (type: string, id: number) => boolean;
}

const Ctx = createContext<CartCtx>({
  items: [], count: 0, subtotal: 0,
  add: () => false, remove: () => {}, clear: () => {}, has: () => false,
});

const STORAGE = 'djs_cart_v1';

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(() => {
    try { return JSON.parse(localStorage.getItem(STORAGE) || '[]'); } catch { return []; }
  });

  useEffect(() => {
    localStorage.setItem(STORAGE, JSON.stringify(items));
  }, [items]);

  const api = useMemo<CartCtx>(() => ({
    items,
    count: items.length,
    subtotal: items.reduce((s, i) => s + i.price, 0),
    add: (item) => {
      const key = `${item.type}-${item.id}`;
      if (items.some((i) => i.key === key)) return false;
      setItems((prev) => [...prev, { ...item, key }]);
      return true;
    },
    remove: (key) => setItems((prev) => prev.filter((i) => i.key !== key)),
    clear: () => setItems([]),
    has: (type, id) => items.some((i) => i.key === `${type}-${id}`),
  }), [items]);

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
}

export const useCart = () => useContext(Ctx);
