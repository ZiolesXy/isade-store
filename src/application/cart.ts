import type { CartItem } from '../domain/models/CartItem';
import type { Product } from '../domain/models/Product';

export interface CartChange {
  type: 'price_changed' | 'stock_insufficient' | 'product_inactive';
  productId: string;
  message: string;
  newQuantity?: number;
  availableStock?: number;
}

/** Batas kuantitas: 99, atau stok produk bila diketahui. */
export function maxQuantityFor(availableStock?: number): number {
  if (availableStock == null) return 99;
  return Math.min(99, Math.max(0, availableStock));
}

export function addItem(
  cart: CartItem[],
  item: CartItem,
  availableStock?: number
): CartItem[] {
  const cap = maxQuantityFor(availableStock);
  if (cap < 1) return cart; // stok habis: jangan tambahkan apa pun

  const existing = cart.find((i) => i.productId === item.productId);
  if (existing) {
    return cart.map((i) =>
      i.productId === item.productId
        ? { ...i, quantity: Math.min(i.quantity + item.quantity, cap) }
        : i
    );
  }
  return [...cart, { ...item, quantity: Math.min(item.quantity, cap) }];
}

export function setQuantity(
  cart: CartItem[],
  productId: string,
  quantity: number,
  availableStock?: number
): CartItem[] {
  const cap = maxQuantityFor(availableStock);
  if (cap < 1) return removeItem(cart, productId); // stok habis: keluarkan dari keranjang
  return cart.map((i) =>
    i.productId === productId
      ? { ...i, quantity: Math.min(Math.max(quantity, 1), cap) }
      : i
  );
}

export function removeItem(cart: CartItem[], productId: string): CartItem[] {
  return cart.filter((i) => i.productId !== productId);
}

export function subtotal(cart: CartItem[]): number {
  return cart.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0);
}

export function reconcile(
  cart: CartItem[],
  freshProducts: Product[]
): { cart: CartItem[]; changes: CartChange[] } {
  const productMap = new Map(freshProducts.map((p) => [p.id, p]));
  const changes: CartChange[] = [];
  const newCart: CartItem[] = [];

  for (const item of cart) {
    const product = productMap.get(item.productId);
    if (!product) {
      changes.push({
        type: 'product_inactive',
        productId: item.productId,
        message: 'Produk tidak lagi tersedia',
      });
      continue;
    }

    if (!product.isActive) {
      changes.push({
        type: 'product_inactive',
        productId: item.productId,
        message: 'Produk tidak aktif',
      });
      continue;
    }

    let qty = item.quantity;

    if (product.availableStock < qty) {
      changes.push({
        type: 'stock_insufficient',
        productId: item.productId,
        message: `Sisa stok hanya ${product.availableStock}`,
        availableStock: product.availableStock,
        newQuantity: product.availableStock,
      });
      qty = product.availableStock;
    }

    if (product.price !== item.unitPrice) {
      changes.push({
        type: 'price_changed',
        productId: item.productId,
        message: 'Harga berubah',
      });
    }

    if (qty > 0) {
      newCart.push({ ...item, unitPrice: product.price, quantity: qty });
    }
  }

  return { cart: newCart, changes };
}
