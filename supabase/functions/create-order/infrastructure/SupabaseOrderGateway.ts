import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { OrderGateway } from "../application/ports.ts";
import {
  StockConflictError,
  TooManyPendingOrdersError,
  ProductUnavailableError,
  ValidationError,
} from "../domain/entities.ts";

export class SupabaseOrderGateway implements OrderGateway {
  private createClient() {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error("SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY tidak tersedia");
    }
    return createClient(supabaseUrl, serviceRoleKey, {
      global: {
        headers: { Authorization: `Bearer ${serviceRoleKey}` },
      },
    });
  }

  async prevalidate(items: Array<{ product_id: string; quantity: number }>) {
    const supabase = this.createClient();

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
    const supabase = this.createClient();

    const { data, error } = await supabase.rpc("create_order_atomic", {
      p_user_id: userId,
      // Kirim sebagai array JSON asli (p_items bertipe jsonb), bukan string ter-encode ganda.
      p_items: items,
      p_payment_method: paymentMethod,
      p_idempotency_key: idempotencyKey,
      p_ttl_minutes: ttlMinutes,
    });

    if (error) {
      await this.throwMappedRpcError(error, items);
    }

    if (!data) {
      throw new Error("create_order_atomic tidak mengembalikan order id");
    }

    // Return order_id (uuid)
    return data as string;
  }

  /** Ambil order beserta item-nya (harga & judul dari DB, bukan dari klien). */
  async getOrderSnapshot(orderId: string): Promise<{
    order_id: string;
    status: string;
    total_amount: number;
    expires_at: string;
    payment_method: string;
    snap_token: string | null;
    snap_redirect_url: string | null;
    items: Array<{ product_id: string; title: string; unit_price: number; quantity: number }>;
  } | null> {
    const supabase = this.createClient();

    const { data, error } = await supabase
      .from("orders")
      .select(
        "id, status, total_amount, expires_at, payment_method, snap_token, snap_redirect_url, order_items(product_id, title_snapshot, unit_price, quantity)"
      )
      .eq("id", orderId)
      .maybeSingle();

    if (error || !data) return null;

    return {
      order_id: data.id,
      status: data.status,
      total_amount: data.total_amount,
      expires_at: data.expires_at,
      payment_method: data.payment_method,
      snap_token: data.snap_token ?? null,
      snap_redirect_url: data.snap_redirect_url ?? null,
      items: (data.order_items ?? []).map((it: any) => ({
        product_id: it.product_id,
        title: it.title_snapshot,
        unit_price: it.unit_price,
        quantity: it.quantity,
      })),
    };
  }

  async findByIdempotencyKey(userId: string, idempotencyKey: string): Promise<string | null> {
    const supabase = this.createClient();

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

  async countPendingOrders(userId: string): Promise<number> {
    const supabase = this.createClient();

    const { count, error } = await supabase
      .from("orders")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("status", "pending");

    if (error) return 0;
    return count ?? 0;
  }

  async saveSnapToken(orderId: string, snapToken: string, redirectUrl: string): Promise<void> {
    const supabase = this.createClient();

    await supabase
      .from("orders")
      .update({ snap_token: snapToken, snap_redirect_url: redirectUrl })
      .eq("id", orderId);
  }

  async markFailed(orderId: string): Promise<void> {
    const supabase = this.createClient();

    await supabase.rpc("apply_payment_result", {
      p_order_id: orderId,
      p_result: "failed",
      p_gross_amount: 0,
      p_source: "system",
      p_payload: { error: "payment_gateway_failed" },
    });
  }

  /**
   * Pesan exception dari RPC (raise exception 'CODE') dianggap error generik oleh
   * supabase-js; terjemahkan kembali ke error domain supaya HTTP status-nya benar.
   */
  private async throwMappedRpcError(
    error: unknown,
    items: Array<{ product_id: string; quantity: number }>
  ): Promise<never> {
    const err = error as { message?: string; details?: string | null };
    const message = err?.message ?? "";

    if (message.includes("INSUFFICIENT_STOCK")) {
      // Stok bisa berubah antara prevalidate dan atomik (race).
      // Jalankan prevalidate ulang supaya pesannya berisi detail per produk.
      try {
        await this.prevalidate(items);
      } catch {
        // prevalidate tidak melempar; abaikan
      }
      const recheck = await this.prevalidate(items);
      if (!recheck.success) throw new StockConflictError(recheck.items);
      throw new StockConflictError(items.map((it) => ({ product_id: it.product_id, requested: it.quantity, available: 0 })));
    }

    if (message.includes("PRODUCT_UNAVAILABLE")) {
      throw new ProductUnavailableError(typeof err?.details === "string" ? err.details : "unknown");
    }

    if (message.includes("TOO_MANY_PENDING_ORDERS")) {
      throw new TooManyPendingOrdersError();
    }

    if (message.includes("INVALID_ITEMS") || message.includes("INVALID_QUANTITY")) {
      throw new ValidationError("Item tidak valid", "items");
    }

    throw new Error(message || "Gagal membuat order");
  }
}
