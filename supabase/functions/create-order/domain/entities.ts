// Input CreateOrder
export interface CreateOrderInput {
  items: Array<{
    product_id: string;
    quantity: number;
  }>;
  payment_method: "WEB_MIDTRANS" | "KASIR_CASH";
  idempotency_key: string;
}

// Output CreateOrder (WEB_MIDTRANS)
export interface CreateOrderWebResponse {
  order_id: string;
  snap_token: string;
  redirect_url: string;
  total_amount: number;
  expires_at: string;
  payment_method: string;
}

// Output CreateOrder (KASIR_CASH)
export interface CreateOrderCashResponse {
  order_id: string;
  status: string;
  total_amount: number;
  expires_at: string;
  payment_method: string;
}

// Error domain types
export class StockConflictError extends Error {
  public items: Array<{ product_id: string; requested: number; available: number }>;

  constructor(items: Array<{ product_id: string; requested: number; available: number }>) {
    super("Stock conflict");
    this.name = "StockConflictError";
    this.items = items;
  }
}

export class ProductUnavailableError extends Error {
  constructor(productId: string) {
    super(`Produk dengan id ${productId} tidak tersedia atau tidak aktif`);
    this.name = "ProductUnavailableError";
  }
}

export class TooManyPendingOrdersError extends Error {
  constructor() {
    super("User sudah memiliki 3 order pending");
    this.name = "TooManyPendingOrdersError";
  }
}

export class PaymentGatewayError extends Error {
  constructor(message: string = "Payment gateway error") {
    super(message);
    this.name = "PaymentGatewayError";
  }
}

export class ValidationError extends Error {
  constructor(message: string, field?: string) {
    super(message);
    this.name = "ValidationError";
    if (field) this.message = `${field}: ${message}`;
  }
}

// Error codes mapping
export const ErrorCodeMapping: Record<string, number> = {
  INSUFFICIENT_STOCK: 409,
  PRODUCT_UNAVAILABLE: 409,
  INVALID_QUANTITY: 400,
  INVALID_ITEMS: 400,
  TOO_MANY_PENDING_ORDERS: 429,
  PAYMENT_GATEWAY_ERROR: 502,
  UNAUTHORIZED: 401,
  VALIDATION_ERROR: 400,
  IDempotencyKeyConflict: 409,
};