// Ports untuk CreateOrderUseCase

export interface OrderGateway {
  prevalidate: (items: Array<{ product_id: string; quantity: number }>) => Promise<
    | { success: true }
    | { success: false; items: Array<{ product_id: string; requested: number; available: number }> }
  >;
  createOrderAtomic: (
    userId: string,
    items: Array<{ product_id: string; quantity: number }>,
    paymentMethod: string,
    idempotencyKey: string,
    ttlMinutes?: number
  ) => Promise<string>;
  findByIdempotencyKey: (userId: string, idempotencyKey: string) => Promise<string | null>;
  saveSnapToken: (orderId: string, snapToken: string, redirectUrl: string) => Promise<void>;
  markFailed: (orderId: string) => Promise<void>;
}

export interface PaymentGateway {
  createSnapTransaction: (
    orderId: string,
    totalAmount: number,
    items: Array<{ product_id: string; quantity: number }>
  ) => Promise<{ token: string; redirect_url: string }>;
}