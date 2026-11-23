"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

/** Only ids and quantities are stored; prices always come from the server quote. */
export type CartItem = { product: number; quantity: number };

type CartState = {
  items: CartItem[];
  add: (product: number, quantity: number) => void;
  setQuantity: (product: number, quantity: number) => void;
  remove: (product: number) => void;
  clear: () => void;
};

export const useCart = create<CartState>()(
  persist(
    (set) => ({
      items: [],
      add: (product, quantity) =>
        set((state) => {
          const existing = state.items.find((i) => i.product === product);
          return {
            items: existing
              ? state.items.map((i) =>
                  i.product === product ? { ...i, quantity: i.quantity + quantity } : i,
                )
              : [...state.items, { product, quantity }],
          };
        }),
      setQuantity: (product, quantity) =>
        set((state) => ({
          items: state.items.map((i) =>
            i.product === product ? { ...i, quantity: Math.max(1, Math.floor(quantity)) } : i,
          ),
        })),
      remove: (product) =>
        set((state) => ({ items: state.items.filter((i) => i.product !== product) })),
      clear: () => set({ items: [] }),
    }),
    { name: "vuna-cart", version: 1, storage: createJSONStorage(() => localStorage) },
  ),
);

export function cartCount(items: CartItem[]): number {
  return items.length;
}
