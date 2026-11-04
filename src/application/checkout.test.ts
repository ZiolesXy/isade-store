import { describe, expect, it } from 'vitest';
import { CheckoutUseCase } from './checkout';
import type { ICheckoutGateway } from '../domain/repositories/ICheckoutGateway';
import type { CreateOrderInput, CreateOrderOutput } from '../domain/models/Order';
import {
  StockConflictError,
  ProductUnavailableError,
  TooManyPendingOrdersError,
  PaymentGatewayError,
  ValidationError,
} from '../domain/errors';

class MockCheckoutGateway implements ICheckoutGateway {
  private shouldFail: ((input: CreateOrderInput) => void) | null = null;
  private result: CreateOrderOutput | null = null;

  setResult(output: CreateOrderOutput) {
    this.result = output;
  }

  setShouldFail(fn: (input: CreateOrderInput) => void) {
    this.shouldFail = fn;
  }

  async createOrder(input: CreateOrderInput): Promise<CreateOrderOutput> {
    if (this.shouldFail) {
      this.shouldFail(input);
    }
    if (!this.result) throw new Error('No result set');
    return { ...this.result };
  }
}

describe('application/checkout', () => {
  describe('CheckoutUseCase.createOrder', () => {
    it('membuat order sukses melalui gateway', async () => {
      const gateway = new MockCheckoutGateway();
      gateway.setResult({
        orderId: 'order-1',
        status: 'pending',
        totalAmount: 150000,
        expiresAt: '2026-01-01T00:00:00Z',
        paymentMethod: 'WEB_MIDTRANS',
        snapToken: 'token-abc',
        redirectUrl: 'https://midtrans.com/redirect',
      });

      const useCase = new CheckoutUseCase(gateway);
      const output = await useCase.createOrder({
        items: [{ productId: 'prod-1', quantity: 2 }],
        paymentMethod: 'WEB_MIDTRANS',
        idempotencyKey: 'key-123',
      });

      expect(output.orderId).toBe('order-1');
      expect(output.status).toBe('pending');
      expect(output.totalAmount).toBe(150000);
    });

    it('menolak item kosong', async () => {
      const gateway = new MockCheckoutGateway();
      const useCase = new CheckoutUseCase(gateway);

      await expect(
        useCase.createOrder({
          items: [],
          paymentMethod: 'WEB_MIDTRANS',
          idempotencyKey: 'key-123',
        })
      ).rejects.toBeInstanceOf(ValidationError);
    });

    it('menolak lebih dari 20 item', async () => {
      const gateway = new MockCheckoutGateway();
      const useCase = new CheckoutUseCase(gateway);

      await expect(
        useCase.createOrder({
          items: Array.from({ length: 21 }, (_, i) => ({ productId: `prod-${i}`, quantity: 1 })),
          paymentMethod: 'WEB_MIDTRANS',
          idempotencyKey: 'key-123',
        })
      ).rejects.toBeInstanceOf(ValidationError);
    });

    it('menolak quantity di luar rentang 1-99', async () => {
      const gateway = new MockCheckoutGateway();
      const useCase = new CheckoutUseCase(gateway);

      await expect(
        useCase.createOrder({
          items: [{ productId: 'prod-1', quantity: 0 }],
          paymentMethod: 'WEB_MIDTRANS',
          idempotencyKey: 'key-123',
        })
      ).rejects.toBeInstanceOf(ValidationError);

      await expect(
        useCase.createOrder({
          items: [{ productId: 'prod-1', quantity: 100 }],
          paymentMethod: 'WEB_MIDTRANS',
          idempotencyKey: 'key-123',
        })
      ).rejects.toBeInstanceOf(ValidationError);
    });

    it('mengembalikan StockConflictError dari gateway', async () => {
      const gateway = new MockCheckoutGateway();
      gateway.setShouldFail(() => {
        throw new StockConflictError([
          { productId: 'prod-1', requested: 5, available: 2 },
        ]);
      });

      const useCase = new CheckoutUseCase(gateway);
      await expect(
        useCase.createOrder({
          items: [{ productId: 'prod-1', quantity: 5 }],
          paymentMethod: 'WEB_MIDTRANS',
          idempotencyKey: 'key-123',
        })
      ).rejects.toBeInstanceOf(StockConflictError);
    });

    it('mengembalikan ProductUnavailableError dari gateway', async () => {
      const gateway = new MockCheckoutGateway();
      gateway.setShouldFail(() => {
        throw new ProductUnavailableError('prod-2');
      });

      const useCase = new CheckoutUseCase(gateway);
      await expect(
        useCase.createOrder({
          items: [{ productId: 'prod-2', quantity: 1 }],
          paymentMethod: 'KASIR_CASH',
          idempotencyKey: 'key-123',
        })
      ).rejects.toBeInstanceOf(ProductUnavailableError);
    });

    it('mengembalikan TooManyPendingOrdersError dari gateway', async () => {
      const gateway = new MockCheckoutGateway();
      gateway.setShouldFail(() => {
        throw new TooManyPendingOrdersError();
      });

      const useCase = new CheckoutUseCase(gateway);
      await expect(
        useCase.createOrder({
          items: [{ productId: 'prod-1', quantity: 1 }],
          paymentMethod: 'KASIR_CASH',
          idempotencyKey: 'key-123',
        })
      ).rejects.toBeInstanceOf(TooManyPendingOrdersError);
    });

    it('mengembalikan PaymentGatewayError dari gateway', async () => {
      const gateway = new MockCheckoutGateway();
      gateway.setShouldFail(() => {
        throw new PaymentGatewayError('Midtrans down');
      });

      const useCase = new CheckoutUseCase(gateway);
      await expect(
        useCase.createOrder({
          items: [{ productId: 'prod-1', quantity: 1 }],
          paymentMethod: 'WEB_MIDTRANS',
          idempotencyKey: 'key-123',
        })
      ).rejects.toBeInstanceOf(PaymentGatewayError);
    });
  });
});
