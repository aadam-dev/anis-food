"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import type { OrderItem, MenuItem } from "@/types";

const STORAGE_KEY = "orderItems";

type MenuSize = NonNullable<MenuItem["sizes"]>[number];

/** One cart line per dish per size: a small and a large are separate lines. */
export function cartLineKey(line: { menuItem: { id: string }; size?: { id: string } }): string {
  return `${line.menuItem.id}:${line.size?.id ?? ""}`;
}

interface CartContextValue {
  items: OrderItem[];
  count: number;
  /** For a dish with sizes, pass the size picked. */
  addItem: (menuItem: MenuItem, quantity?: number, size?: MenuSize) => void;
  /** Lines are addressed by `cartLineKey`. */
  removeItem: (lineKey: string) => void;
  updateQuantity: (lineKey: string, quantity: number) => void;
  clearCart: () => void;
  refreshFromStorage: () => void;
}

const CartContext = createContext<CartContextValue | null>(null);

function loadFromStorage(): OrderItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveToStorage(items: OrderItem[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    // Private mode or a full disk: the cart still works for this visit.
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<OrderItem[]>(() => loadFromStorage());

  const refreshFromStorage = useCallback(() => {
    setItems(loadFromStorage());
  }, []);

  const addItem = useCallback((menuItem: MenuItem, quantity = 1, size?: MenuSize) => {
    // The line carries the size's name and price, so every summary, receipt
    // and WhatsApp message reads right without knowing about sizes.
    const line: OrderItem = size
      ? {
          menuItem: { ...menuItem, name: `${menuItem.name} (${size.label})`, price: size.price, sizes: undefined },
          size: { id: size.id, label: size.label },
          quantity,
        }
      : { menuItem, quantity };
    const key = cartLineKey(line);
    setItems((prev) => {
      const existing = prev.find((i) => cartLineKey(i) === key);
      const next = existing
        ? prev.map((i) => (cartLineKey(i) === key ? { ...i, quantity: i.quantity + quantity } : i))
        : [...prev, line];
      saveToStorage(next);
      return next;
    });
  }, []);

  const removeItem = useCallback((lineKey: string) => {
    setItems((prev) => {
      const next = prev.filter((i) => cartLineKey(i) !== lineKey);
      saveToStorage(next);
      return next;
    });
  }, []);

  const updateQuantity = useCallback((lineKey: string, quantity: number) => {
    setItems((prev) => {
      const next =
        quantity <= 0
          ? prev.filter((i) => cartLineKey(i) !== lineKey)
          : prev.map((i) => (cartLineKey(i) === lineKey ? { ...i, quantity } : i));
      saveToStorage(next);
      return next;
    });
  }, []);

  const clearCart = useCallback(() => {
    setItems([]);
    saveToStorage([]);
  }, []);

  const count = items.reduce((sum, i) => sum + i.quantity, 0);

  const value: CartContextValue = {
    items,
    count,
    addItem,
    removeItem,
    updateQuantity,
    clearCart,
    refreshFromStorage,
  };

  return (
    <CartContext.Provider value={value}>{children}</CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) {
    throw new Error("useCart must be used within CartProvider");
  }
  return ctx;
}
