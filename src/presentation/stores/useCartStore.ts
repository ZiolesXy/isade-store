import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { CartItem } from '../../domain/models/CartItem';
import { addItem, setQuantity, removeItem, subtotal, reconcile } from '../../application/cart';
import type { Product } from '../../domain/models/Product';

interface CartState {
  items: CartItem[];
  add: (item: CartItem) => void;
  setQty: (productId: string, quantity: number) => void;
  remove: (productId: string) => void;
  clear: () => void;
  setItems: (items: CartItem[]) => void;
  itemSubtotal: (productId: string) => number;
  total: number;
  itemCount: number;
  reconcileWithProducts: (freshProducts: Product[]) => { changes: ReturnType<typeof reconcile>['changes'] };
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],

      add: (item) => set((state) => ({ items: addItem(state.items, item) })),

      setQty: (productId, quantity) =>
        set((state) => ({ items: setQuantity(state.items, productId, quantity) })),

      remove: (productId) => set((state) => ({ items: removeItem(state.items, productId) })),

      clear: () => set({ items: [] }),

      setItems: (items) => set({ items }),

      itemSubtotal: (productId) => {
        const item = get().items.find((i) => i.productId === productId);
        return item ? item.unitPrice * item.quantity : 0;
      },

      get total() {
        return subtotal(get().items);
      },

      get itemCount() {
        return get().items.reduce((sum, i) => sum + i.quantity, 0);
      },

      reconcileWithProducts: (freshProducts) => {
        const { cart, changes } = reconcile(get().items, freshProducts);
        set({ items: cart });
        return { changes };
      },
    }),
    { name: 'isade-cart-storage' }
  )
);
