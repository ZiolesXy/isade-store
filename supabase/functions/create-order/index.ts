import { serve } from "https://deno.land/std@0.223.0/http/server.ts";
import { createCORSHandler } from "../_shared/cors.ts";
import { authenticateJWT } from "../_shared/auth.ts";
import { successResponse, errorResponse } from "../_shared/http.ts";
import {
  CreateOrderInput,
  CreateOrderWebResponse,
  CreateOrderCashResponse,
  PaymentGatewayError,
} from "./domain/entities.ts";
import { CreateOrderUseCase } from "./application/CreateOrderUseCase.ts";
import { SupabaseOrderGateway } from "./infrastructure/SupabaseOrderGateway.ts";
import { MidtransPaymentGateway } from "./infrastructure/MidtransPaymentGateway.ts";

const MIDTRANS_SERVER_KEY = Deno.env.get("MIDTRANS_SERVER_KEY") || "";
const MIDTRANS_CLIENT_KEY = Deno.env.get("MIDTRANS_CLIENT_KEY") || "";
const IS_PRODUCTION = Deno.env.get("MIDTRANS_IS_PRODUCTION") === "true";

// Flag ENABLE_MIDTRANS (PLAN-UPDATE-v3 Tahap 2). Parse ketat:
// selain "true"/"false" dianggap false dan dicatat sebagai peringatan.
const ENABLE_MIDTRANS_RAW = Deno.env.get("ENABLE_MIDTRANS");
const MIDTRANS_ENABLED = ENABLE_MIDTRANS_RAW === "true";
if (ENABLE_MIDTRANS_RAW !== "true" && ENABLE_MIDTRANS_RAW !== "false") {
  console.warn(
    `[create-order] ENABLE_MIDTRANS="${ENABLE_MIDTRANS_RAW ?? "tidak diset"}" tidak valid; dianggap false.`
  );
}

// Saat flag false, kunci Midtrans tidak wajib ada: gateway asli tidak dibuat,
// tidak ada pemanggilan ke Midtrans, aplikasi tidak crash karena kunci kosong.
const gateway = MIDTRANS_ENABLED
  ? new MidtransPaymentGateway({
      serverKey: MIDTRANS_SERVER_KEY,
      clientKey: MIDTRANS_CLIENT_KEY,
      isProduction: IS_PRODUCTION,
    })
  : {
      createSnapTransaction: (): Promise<{ token: string; redirect_url: string }> =>
        Promise.reject(
          new PaymentGatewayError(
            "Midtrans dinonaktifkan lewat ENABLE_MIDTRANS=false"
          )
        ),
    };

const orderGateway = new SupabaseOrderGateway();

const useCase = new CreateOrderUseCase(orderGateway, gateway);

serve(
  createCORSHandler(async (req: Request): Promise<Response> => {
    // Parse body
    let body: any;
    try {
      body = await req.json();
    } catch {
      return errorResponse(
        "VALIDATION_ERROR",
        "Body JSON tidak valid",
        {},
        400
      );
    }

    // Extract JWT dari header Authorization
    const authResult = await authenticateJWT(req);
    if (authResult.error) {
      return authResult.error;
    }

    const { id: userId, role } = authResult.user;

    // Validasi payment_method
    if (!body.payment_method || !["WEB_MIDTRANS", "KASIR_CASH"].includes(body.payment_method)) {
      return errorResponse(
        "VALIDATION_ERROR",
        "payment_method wajib WEB_MIDTRANS atau KASIR_CASH",
        { payment_method: "pilihan WEB_MIDTRANS atau KASIR_CASH" },
        400
      );
    }

    // Penegakan flag di server (Tahap 2): walau client mengirim
    // payment_method=midtrans, request ditolak saat flag false (403).
    // Webhook Midtrans tidak terpengaruh: transaksi lama tetap diproses.
    if (body.payment_method === "WEB_MIDTRANS" && !MIDTRANS_ENABLED) {
      return errorResponse(
        "MIDTRANS_DISABLED",
        "Pembayaran Midtrans sedang dinonaktifkan. Gunakan bayar di kasir.",
        {},
        403
      );
    }

    // Validasi items
    if (!body.items || !Array.isArray(body.items)) {
      return errorResponse(
        "VALIDATION_ERROR",
        "items wajib berupa array",
        { items: "harus berupa array" },
        400
      );
    }

    const { payment_method, idempotency_key } = body;

    try {
      const result = await useCase.execute(userId, {
        items: body.items,
        payment_method,
        idempotency_key,
      }, { email: authResult.user.email ?? undefined });

      if (payment_method === "KASIR_CASH") {
        return successResponse({
          order_id: result.order_id,
          status: result.status,
          total_amount: result.total_amount,
          expires_at: result.expires_at,
          payment_method: result.payment_method,
        } as CreateOrderCashResponse);
      }

      if (payment_method === "WEB_MIDTRANS") {
        return successResponse({
          order_id: result.order_id,
          snap_token: result.snap_token,
          redirect_url: result.redirect_url,
          total_amount: result.total_amount,
          expires_at: result.expires_at,
          payment_method: result.payment_method,
        } as CreateOrderWebResponse);
      }

      throw new Error("Payment method tidak dikenali");

    } catch (err: any) {
      // Mapping error domain ke HTTP status
      const errorCode = err.name;
      const statusMap: Record<string, number> = {
        StockConflictError: 409,
        ProductUnavailableError: 409,
        TooManyPendingOrdersError: 429,
        PaymentGatewayError: 502,
        ValidationError: 400,
        UNAUTHORIZED: 401,
      };

      const status = statusMap[errorCode] || 500;
      const errorMessage = err.message || "Terjadi kesalahan internal";

      return errorResponse(
        errorCode || "INTERNAL_ERROR",
        errorMessage,
        err.fields || undefined,
        status
      );
    }
  })
);