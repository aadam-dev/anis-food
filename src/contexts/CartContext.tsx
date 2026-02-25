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

interface CartContextValue {
  items: OrderItem[];
  count: number;
  addItem: (menuItem: MenuItem, quantity?: number) => void;
  removeItem: (menuItemId: string) => void;
  updateQuantity: (menuItemId: string, quantity: number) => void;
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
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<OrderItem[]>(() => loadFromStorage());

  const refreshFromStorage = useCallback(() => {
    setItems(loadFromStorage());
  }, []);

  const addItem = useCallback((menuItem: MenuItem, quantity = 1) => {
    setItems((prev) => {
      const existing = prev.find((i) => i.menuItem.id === menuItem.id);
      let next: OrderItem[];
      if (existing) {
        next = prev.map((i) =>
          i.menuItem.id === menuItem.id
            ? { ...i, quantity: i.quantity + quantity }
            : i
        );
      } else {
        next = [...prev, { menuItem, quantity }];
      }
      saveToStorage(next);
      return next;
    });
  }, []);

  const removeItem = useCallback((menuItemId: string) => {
    setItems((prev) => {
      const next = prev.filter((i) => i.menuItem.id !== menuItemId);
      saveToStorage(next);
      return next;
    });
  }, []);

  const updateQuantity = useCallback((menuItemId: string, quantity: number) => {
    if (quantity <= 0) {
      setItems((prev) => {
        const next = prev.filter((i) => i.menuItem.id !== menuItemId);
        saveToStorage(next);
        return next;
      });
      return;
    }
    setItems((prev) => {
      const next = prev.map((i) =>
        i.menuItem.id === menuItemId ? { ...i, quantity } : i
      );
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
