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
  getOrderSnapshot: (orderId: string) => Promise<
    | {
        order_id: string;
        status: string;
        total_amount: number;
        expires_at: string;
        payment_method: string;
        items: Array<{ product_id: string; title: string; unit_price: number; quantity: number }>;
      }
    | null
  >;
  countPendingOrders: (userId: string) => Promise<number>;
  findByIdempotencyKey: (userId: string, idempotencyKey: string) => Promise<string | null>;
  saveSnapToken: (orderId: string, snapToken: string, redirectUrl: string) => Promise<void>;
  markFailed: (orderId: string) => Promise<void>;
}

/** Potongan order yang dikembalikan getOrderSnapshot. */
export interface OrderSnapshot {
  order_id: string;
  status: string;
  total_amount: number;
  expires_at: string;
  payment_method: string;
  snap_token: string | null;
  snap_redirect_url: string | null;
  items: Array<{ product_id: string; title: string; unit_price: number; quantity: number }>;
}

export interface SnapItemDetail {
  id: string;
  price: number;
  quantity: number;
  name: string;
}

export interface PaymentGateway {
  createSnapTransaction: (
    orderId: string,
    totalAmount: number,
    itemDetails: SnapItemDetail[],
    customer?: { email?: string }
  ) => Promise<{ token: string; redirect_url: string }>;
}