import { serve } from "https://deno.land/std@0.223.0/http/server.ts";
import { createCORSHandler } from "../../_shared/cors.ts";
import { successResponse, errorResponse } from "../../_shared/http.ts";
import { verifyPaymentCashierUseCase } from "./application/VerifyPaymentUseCase.ts";

serve(
  createCORSHandler(async (req: Request): Promise<Response> => {
    if (req.method !== "POST") {
      return errorResponse(
        "VALIDATION_ERROR",
        "Method tidak diizinkan, hanya POST",
        {},
        405
      );
    }

    try {
      const body = await req.json();

      if (!body.order_id || !body.result) {
        return errorResponse(
          "VALIDATION_ERROR",
          "Field wajib: order_id, result",
          { order_id: "wajib diisi", result: "wajib diisi" },
          400
        );
      }

      const result = await verifyPaymentCashierUseCase(
        {
          order_id: body.order_id,
          result: body.result,
          catatan: body.catatan,
        },
        req
      );

      return successResponse({
        order_id: body.order_id,
        status: result.status,
        paymentUpdated: result.paymentUpdated,
      });

    } catch (err: any) {
      const errorCode = err.message || "INTERNAL_ERROR";

      // Extract error code from message
      let status = 500;
      if (errorCode.includes("UNAUTHORIZED")) status = 401;
      if (errorCode.includes("FORBIDDEN")) status = 403;
      if (errorCode.includes("VALIDATION")) status = 400;

      return errorResponse(
        errorCode.split(":")[0] || "INTERNAL_ERROR",
        errorCode,
        {},
        status
      );
    }
  })
);