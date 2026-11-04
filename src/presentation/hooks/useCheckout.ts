import type { ICheckoutGateway } from '../../domain/repositories/ICheckoutGateway';
import type { CreateOrderInput, CreateOrderOutput, PaymentMethod } from '../../domain/models/Order';
import { CheckoutUseCase } from '../../application/checkout';
import type { CartItem } from '../../domain/models/CartItem';
import { useCartStore } from '../stores/useCartStore';
import { loadSnap, isSnapReady } from '../../data/midtrans/snapLoader';

export function useCheckout(checkoutGateway: ICheckoutGateway, clientKey: string) {
  const checkoutUseCase = new CheckoutUseCase(checkoutGateway);

  async function createOrder(
    items: CartItem[],
    paymentMethod: PaymentMethod
  ): Promise<CreateOrderOutput> {
    if (items.length === 0) {
      throw new Error('Keranjang kosong');
    }

    const idempotencyKey = crypto.randomUUID();

    const input: CreateOrderInput = {
      items: items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
      paymentMethod,
      idempotencyKey,
    };

    const result = await checkoutUseCase.createOrder(input);

    // Kosongkan keranjang setelah order berhasil dibuat (stok sudah terkunci)
    useCartStore.getState().clear();

    return result;
  }

  async function openSnap(token: string): Promise<void> {
    if (!isSnapReady()) {
      await loadSnap(clientKey);
    }

    const win = typeof window !== 'undefined' ? (window as any) : null;
    if (win?.snap?.pay) {
      win.snap.pay(token);
    } else {
      throw new Error('Midtrans Snap tidak siap');
    }
  }

  return { createOrder, openSnap };
}
