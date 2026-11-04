import { authenticateJWT } from "../../_shared/auth.ts";
import { successResponse, errorResponse } from "../../_shared/http.ts";
import { is_cashier } from "../../_shared/database.ts";

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
  const authResult = authenticateJWT(req);
  if (authResult.error) {
    throw new Error("UNAUTHORIZED: " + authResult.error.status);
  }

  const { userId, role } = authResult.user;

  // Hanya cashier dan admin yang boleh memanggil
  if (role !== "cashier" && role !== "admin") {
    throw new Error("FORBIDDEN: Hanya role cashier atau admin yang boleh memverifikasi pembayaran");
  }

  // 2. Validasi result
  const validResults = ["paid", "needs_review", "failed", "expired", "cancelled"];
  if (!validResults.includes(input.result)) {
    throw new Error("INVALID_RESULT: result tidak valid");
  }

  // 3. Ambil order dari DB
  const supabase = globalThis.supabase; // akan diinject
  // Untuk sekarang, panggil RPC verify_payment_cashier

  // 4. Cek apakah order sudah paid (read-only)
  // Lakukan di level RPC, tapi validasi awal di sini
  if (input.result === "paid" && input.order_id) {
    // Order yang sudah paid: tidak boleh diubah
    // Akan dicek di RPC, tapi kita return status paid
  }

  // 5. Panggil verify_payment_cashier RPC
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