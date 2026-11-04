import { authenticateJWT } from "../../_shared/auth.ts";
import { successResponse, errorResponse } from "../../_shared/http.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export interface VerifyPaymentInput {
  order_id: string;
  result: "paid" | "needs_review" | "failed" | "expired" | "cancelled";
  catatan?: string;
}

export interface VerifyPaymentResult {
  status: string;
  orderStatus: string;
  paymentUpdated: boolean;
}

export async function verifyPaymentCashierUseCase(
  input: VerifyPaymentInput,
  req: Request
): Promise<VerifyPaymentResult> {
  // 1. Verifikasi JWT dan role
  const authResult = await authenticateJWT(req);
  if (authResult.error) {
    throw new Error("UNAUTHORIZED: " + authResult.error.status);
  }

  const { id: userId, role } = authResult.user;

  // Hanya cashier dan admin yang boleh memanggil
  if (role !== "cashier" && role !== "admin") {
    throw new Error("FORBIDDEN: Hanya role cashier atau admin yang boleh memverifikasi pembayaran");
  }

  // 2. Validasi result
  const validResults = ["paid", "needs_review", "failed", "expired", "cancelled"];
  if (!validResults.includes(input.result)) {
    throw new Error("INVALID_RESULT: result tidak valid");
  }

  // 3. Panggil RPC verify_payment_cashier dengan JWT kasir:
  //    is_cashier() di dalam RPC membaca auth.uid() dari caller JWT.
  const token = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
  const url = Deno.env.get("SUPABASE_URL") || "";
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") || "";
  if (!url || !anonKey) {
    throw new Error("INTERNAL_SUPABASE_CONFIG: SUPABASE_URL / SUPABASE_ANON_KEY tidak tersedia");
  }
  const supabase = createClient(url, anonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });

  const { data, error } = await supabase.rpc("verify_payment_cashier", {
    p_order_id: input.order_id,
    p_result: input.result,
    p_catatan: input.catatan,
  });

  if (error) {
    throw new Error(error.message || "Gagal verifikasi pembayaran");
  }

  return {
    status: data || input.result,
    orderStatus: data || input.result,
    paymentUpdated: true,
  };
}