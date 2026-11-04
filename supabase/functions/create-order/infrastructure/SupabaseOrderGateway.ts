import { createSupabaseServerClient } from "../../supabaseAdmin.ts";

export class SupabaseOrderGateway implements OrderGateway {
  async prevalidate(items: Array<{ product_id: string; quantity: number }>) {
    const supabase = createSupabaseServerClient();

    // Cek setiap produk dan stok yang tersedia
    for (const item of items) {
      const { data: product, error } = await supabase
        .from("products")
        .select("id, stock, locked_stock, is_active")
        .eq("id", item.product_id)
        .single();

      if (error || !product) {
        return { success: false, items: [{ product_id: item.product_id, requested: item.quantity, available: 0 }] };
      }

      if (!product.is_active) {
        return { success: false, items: [{ product_id: item.product_id, requested: item.quantity, available: 0 }] };
      }

      const available = product.stock - product.locked_stock;
      if (item.quantity > available) {
        return { success: false, items: [{ product_id: item.product_id, requested: item.quantity, available }] };
      }
    }

    return { success: true };
  }

  async createOrderAtomic(
    userId: string,
    items: Array<{ product_id: string; quantity: number }>,
    paymentMethod: string,
    idempotencyKey: string,
    ttlMinutes = 30
  ): Promise<string> {
    const supabase = createSupabaseServerClient();

    // Insert order dengan RPC create_order_atomic melalui service_role
    // Gunakan fetch ke fungsi Edge
    const res = await supabase.rpc("create_order_atomic", {
      p_user_id: userId,
      p_items: JSON.stringify(items),
      p_payment_method: paymentMethod,
      p_idempotency_key: idempotencyKey,
      p_ttl_minutes: ttlMinutes,
    });

    // Return order_id
    return res as string;
  }

  async findByIdempotencyKey(userId: string, idempotencyKey: string): Promise<string | null> {
    const supabase = createSupabaseServerClient();

    const { data, error } = await supabase
      .from("orders")
      .select("id")
      .eq("user_id", userId)
      .eq("idempotency_key", idempotencyKey)
      .maybeSingle();

    if (error || !data) {
      return null;
    }

    return data.id;
  }

  async saveSnapToken(orderId: string, snapToken: string, redirectUrl: string): Promise<void> {
    const supabase = createSupabaseServerClient();

    await supabase
      .from("orders")
      .update({ snap_token: snapToken, snap_redirect_url: redirectUrl })
      .eq("id", orderId);
  }

  async markFailed(orderId: string): Promise<void> {
    const supabase = createSupabaseServerClient();

    await supabase
      .rpc("apply_payment_result", {
        p_order_id: orderId,
        p_result: "failed",
        p_gross_amount: 0,
        p_source: "system",
        p_payload: JSON.stringify({ error: "payment_gateway_failed" }),
      });
  }
}