import { describe, expect, it } from 'vitest';
import {
  addItem,
  setQuantity,
  removeItem,
  subtotal,
  reconcile,
} from './cart';
import type { CartItem } from '../domain/models/CartItem';
import type { Product } from '../domain/models/Product';

const baseItem: CartItem = {
  productId: 'prod-1',
  slug: 'produk-1',
  title: 'Produk 1',
  unitPrice: 10000,
  quantity: 1,
  imagePath: null,
};

describe('application/cart', () => {
  describe('addItem', () => {
    it('menambahkan item baru ke keranjang', () => {
      const cart: CartItem[] = [];
      const result = addItem(cart, baseItem);
      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({ productId: 'prod-1', quantity: 1 });
    });

    it('menaikkan quantity jika item sudah ada', () => {
      const cart: CartItem[] = [{ ...baseItem, quantity: 2 }];
      const result = addItem(cart, { ...baseItem, quantity: 3 });
      expect(result).toHaveLength(1);
      expect(result[0].quantity).toBe(5);
    });

    it('membatasi quantity maksimal 99', () => {
      const cart: CartItem[] = [{ ...baseItem, quantity: 98 }];
      const result = addItem(cart, { ...baseItem, quantity: 5 });
      expect(result[0].quantity).toBe(99);
    });
  });

  describe('setQuantity', () => {
    it('mengubah quantity item', () => {
      const cart: CartItem[] = [{ ...baseItem, quantity: 2 }];
      const result = setQuantity(cart, 'prod-1', 5);
      expect(result[0].quantity).toBe(5);
    });

    it('membatasi quantity minimal 1 dan maksimal 99', () => {
      const cart: CartItem[] = [{ ...baseItem, quantity: 5 }];
      expect(setQuantity(cart, 'prod-1', 0)[0].quantity).toBe(1);
      expect(setQuantity(cart, 'prod-1', 100)[0].quantity).toBe(99);
    });
  });

  describe('removeItem', () => {
    it('menghapus item dari keranjang', () => {
      const cart: CartItem[] = [
        { ...baseItem },
        { ...baseItem, productId: 'prod-2', title: 'Produk 2' },
      ];
      const result = removeItem(cart, 'prod-1');
      expect(result).toHaveLength(1);
      expect(result[0].productId).toBe('prod-2');
    });
  });

  describe('subtotal', () => {
    it('menghitung total semua item', () => {
      const cart: CartItem[] = [
        { ...baseItem, unitPrice: 10000, quantity: 2 },
        { ...baseItem, productId: 'prod-2', unitPrice: 25000, quantity: 1 },
      ];
      expect(subtotal(cart)).toBe(45000);
    });

    it('mengembalikan 0 untuk keranjang kosong', () => {
      expect(subtotal([])).toBe(0);
    });
  });

  describe('reconcile', () => {
    const products: Product[] = [
      {
        id: 'prod-1',
        slug: 'produk-1',
        title: 'Produk 1',
        description: '',
        price: 15000,
        stock: 10,
        lockedStock: 0,
        availableStock: 10,
        imagePath: null,
        isActive: true,
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z',
      },
      {
        id: 'prod-2',
        slug: 'produk-2',
        title: 'Produk 2',
        description: '',
        price: 20000,
        stock: 0,
        lockedStock: 0,
        availableStock: 0,
        imagePath: null,
        isActive: false,
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z',
      },
    ];

    it('mengembalikan cart tanpa perubahan jika semuanya OK', () => {
      const cart: CartItem[] = [{ ...baseItem, unitPrice: 10000, quantity: 1 }];
      const { cart: newCart, changes } = reconcile(cart, [
        { ...products[0], price: 10000 },
      ]);
      expect(newCart).toHaveLength(1);
      expect(changes).toHaveLength(0);
    });

    it('mendeteksi perubahan harga', () => {
      const cart: CartItem[] = [{ ...baseItem, unitPrice: 10000, quantity: 1 }];
      const { cart: newCart, changes } = reconcile(cart, products);
      expect(changes.some((c) => c.type === 'price_changed')).toBe(true);
      expect(newCart[0].unitPrice).toBe(15000);
    });

    it('menghapus produk yang tidak aktif', () => {
      const cart: CartItem[] = [
        { ...baseItem, productId: 'prod-1', quantity: 1 },
        { ...baseItem, productId: 'prod-2', quantity: 1 },
      ];
      const { cart: newCart, changes } = reconcile(cart, products);
      expect(newCart).toHaveLength(1);
      expect(newCart[0].productId).toBe('prod-1');
      expect(changes.some((c) => c.type === 'product_inactive' && c.productId === 'prod-2')).toBe(true);
    });

    it('menyesuaikan quantity jika stok tidak cukup', () => {
      const lowStockProducts: Product[] = [
        { ...products[0], availableStock: 2, stock: 2 },
      ];
      const cart: CartItem[] = [{ ...baseItem, quantity: 5 }];
      const { cart: newCart, changes } = reconcile(cart, lowStockProducts);
      expect(newCart[0].quantity).toBe(2);
      expect(changes.some((c) => c.type === 'stock_insufficient')).toBe(true);
    });
  });
});
