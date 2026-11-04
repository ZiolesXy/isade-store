import { supabase } from '../supabaseClient';
import type { CreateOrderInput, CreateOrderOutput } from '../../domain/models/Order';
import type { ICheckoutGateway } from '../../domain/repositories/ICheckoutGateway';
import {
  StockConflictError,
  ProductUnavailableError,
  TooManyPendingOrdersError,
  PaymentGatewayError,
  ValidationError,
} from '../../domain/errors';

interface CreateOrderResponse {
  order_id: string;
  status: string;
  total_amount: number;
  expires_at: string;
  payment_method: string;
  snap_token?: string;
  redirect_url?: string;
}

interface CreateOrderErrorBody {
  error: {
    code: string;
    message: string;
    fields?: Record<string, string>;
    items?: Array<{ product_id: string; requested: number; available: number }>;
  };
}

export class SupabaseCheckoutGateway implements ICheckoutGateway {
  async createOrder(input: CreateOrderInput): Promise<CreateOrderOutput> {
    const { data, error } = await supabase.functions.invoke<CreateOrderResponse>('create-order', {
      body: {
        items: input.items.map((i) => ({ product_id: i.productId, quantity: i.quantity })),
        payment_method: input.paymentMethod,
        idempotency_key: input.idempotencyKey,
      },
    });

    if (error) {
      // Error dari invoke (network, CORS, etc)
      throw new PaymentGatewayError(error.message || 'Gagal memanggil layanan pembelian');
    }

    if (!data) {
      throw new PaymentGatewayError('Respons kosong dari server');
    }

    // Jika respons adalah error JSON (4xx/5xx)
    const errorBody = data as unknown as CreateOrderErrorBody;
    if (errorBody && (errorBody as any).error) {
      const err = (errorBody as any).error;
      const items = Array.isArray(err.items) ? err.items : [];
      switch (err.code) {
        case 'STOCK_CONFLICT':
          throw new StockConflictError(
            items.map((it: any) => ({
              productId: it.product_id,
              requested: it.requested,
              available: it.available,
            }))
          );
        case 'PRODUCT_UNAVAILABLE':
          throw new ProductUnavailableError(err.message);
        case 'TOO_MANY_PENDING_ORDERS':
          throw new TooManyPendingOrdersError();
        case 'PAYMENT_GATEWAY_ERROR':
          throw new PaymentGatewayError(err.message || 'Gateway pembayaran gagal');
        case 'VALIDATION_ERROR':
          throw new ValidationError(err.message, Object.keys(err.fields || {})[0]);
        default:
          throw new PaymentGatewayError(err.message || 'Terjadi kesalahan internal');
      }
    }

    return {
      orderId: data.order_id,
      status: data.status as CreateOrderOutput['status'],
      totalAmount: data.total_amount,
      expiresAt: data.expires_at,
      paymentMethod: data.payment_method as CreateOrderOutput['paymentMethod'],
      snapToken: data.snap_token ?? undefined,
      redirectUrl: data.redirect_url ?? undefined,
    };
  }
}
