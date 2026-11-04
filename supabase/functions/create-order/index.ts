import { serve } from "https://deno.land/std@0.223.0/http/server.ts";
import { createCORSHandler } from "../../_shared/cors.ts";
import { authenticateJWT } from "../../_shared/auth.ts";
import { successResponse, errorResponse } from "../../_shared/http.ts";
import {
  CreateOrderInput,
  CreateOrderWebResponse,
  CreateOrderCashResponse,
} from "./domain/entities.ts";
import { CreateOrderUseCase } from "./application/CreateOrderUseCase.ts";
import { SupabaseOrderGateway } from "./infrastructure/SupabaseOrderGateway.ts";
import { MidtransPaymentGateway } from "./infrastructure/MidtransPaymentGateway.ts";

const MIDTRANS_SERVER_KEY = Deno.env.get("MIDTRANS_SERVER_KEY") || "";
const IS_PRODUCTION = Deno.env.get("MIDTRANS_IS_PRODUCTION") === "true";

const gateway = new MidtransPaymentGateway({
  serverKey: MIDTRANS_SERVER_KEY,
  isProduction: IS_PRODUCTION,
});

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

    const { userId, role } = authResult.user;

    // Validasi payment_method
    if (!body.payment_method || !["WEB_MIDTRANS", "KASIR_CASH"].includes(body.payment_method)) {
      return errorResponse(
        "VALIDATION_ERROR",
        "payment_method wajib WEB_MIDTRANS atau KASIR_CASH",
        { payment_method: "pilihan WEB_MIDTRANS atau KASIR_CASH" },
        400
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
      });

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