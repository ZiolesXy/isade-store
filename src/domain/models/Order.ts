export type OrderStatus = 'pending' | 'paid' | 'expired' | 'cancelled' | 'failed' | 'needs_review';
export type PaymentMethod = 'WEB_MIDTRANS' | 'KASIR_CASH';

export interface OrderItem {
  id: string;
  orderId: string;
  productId: string;
  titleSnapshot: string;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
}

export interface Order {
  id: string;
  userId: string;
  status: OrderStatus;
  subtotal: number;
  totalAmount: number;
  paymentMethod: PaymentMethod;
  idempotencyKey: string;
  snapToken: string | null;
  snapRedirectUrl: string | null;
  paymentType: string | null;
  midtransTransactionId: string | null;
  expiresAt: string;
  paidAt: string | null;
  createdAt: string;
  updatedAt: string;
  items: OrderItem[];
}

export interface CreateOrderInput {
  items: Array<{ productId: string; quantity: number }>;
  paymentMethod: PaymentMethod;
  idempotencyKey: string;
}

export interface CreateOrderOutput {
  orderId: string;
  status: OrderStatus;
  totalAmount: number;
  expiresAt: string;
  paymentMethod: PaymentMethod;
  snapToken?: string | null;
  redirectUrl?: string | null;
}
