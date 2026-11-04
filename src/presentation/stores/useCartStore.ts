import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { CartItem } from '../../domain/models/CartItem';
import { addItem, setQuantity, removeItem, subtotal, reconcile } from '../../application/cart';
import type { Product } from '../../domain/models/Product';

interface CartState {
  items: CartItem[];
  add: (item: CartItem, availableStock?: number) => void;
  setQty: (productId: string, quantity: number, availableStock?: number) => void;
  remove: (productId: string) => void;
  clear: () => void;
  setItems: (items: CartItem[]) => void;
  reconcileWithProducts: (freshProducts: Product[]) => { changes: ReturnType<typeof reconcile>['changes'] };
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],

      add: (item, availableStock) =>
        set((state) => ({ items: addItem(state.items, item, availableStock) })),

      setQty: (productId, quantity, availableStock) =>
        set((state) => ({ items: setQuantity(state.items, productId, quantity, availableStock) })),

      remove: (productId) => set((state) => ({ items: removeItem(state.items, productId) })),

      clear: () => set({ items: [] }),

      setItems: (items) => set({ items }),

      reconcileWithProducts: (freshProducts) => {
        const { cart, changes } = reconcile(get().items, freshProducts);
        set({ items: cart });
        return { changes };
      },
    }),
    { name: 'isade-cart-storage' }
  )
);

// Subtotal dihitung lewat selector, tidak disimpan di state (PRD bagian 7.2 poin 3).
export const selectCartItems = (state: CartState): CartItem[] => state.items;

export const selectCartTotal = (state: CartState): number => subtotal(state.items);

export const selectCartCount = (state: CartState): number =>
  state.items.reduce((sum, item) => sum + item.quantity, 0);
