import type { Database } from './database.types';

type ProductRow = Database['public']['Tables']['products']['Row'];
type OrderRow = Database['public']['Tables']['orders']['Row'];
type OrderItemRow = Database['public']['Tables']['order_items']['Row'];
type ProfileRow = Database['public']['Tables']['profiles']['Row'];

export function toProduct(row: ProductRow): import('../domain/models/Product').Product {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    description: row.description,
    price: row.price,
    stock: row.stock,
    lockedStock: row.locked_stock,
    availableStock: row.available_stock ?? 0,
    imagePath: row.image_path,
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function toOrder(
  orderRow: OrderRow,
  items: OrderItemRow[] = []
): import('../domain/models/Order').Order {
  return {
    id: orderRow.id,
    userId: orderRow.user_id,
    status: orderRow.status as import('../domain/models/Order').OrderStatus,
    subtotal: orderRow.subtotal,
    totalAmount: orderRow.total_amount,
    paymentMethod: orderRow.payment_method as import('../domain/models/Order').PaymentMethod,
    idempotencyKey: orderRow.idempotency_key,
    snapToken: orderRow.snap_token ?? null,
    snapRedirectUrl: orderRow.snap_redirect_url ?? null,
    paymentType: orderRow.payment_type ?? null,
    midtransTransactionId: orderRow.midtrans_transaction_id ?? null,
    expiresAt: orderRow.expires_at,
    paidAt: orderRow.paid_at ?? null,
    createdAt: orderRow.created_at,
    updatedAt: orderRow.updated_at,
    items: items.map((it) => ({
      id: it.id,
      orderId: it.order_id,
      productId: it.product_id,
      titleSnapshot: it.title_snapshot,
      unitPrice: it.unit_price,
      quantity: it.quantity,
      lineTotal: it.line_total ?? 0,
    })),
  };
}

export function toProfile(row: ProfileRow): {
  id: string;
  fullName: string | null;
  role: string;
  createdAt: string;
  updatedAt: string;
} {
  return {
    id: row.id,
    fullName: row.full_name,
    role: row.role,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
