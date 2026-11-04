import { serve } from "https://deno.land/std@0.223.0/http/server.ts";
import { createCORSHandler } from "../_shared/cors.ts";
import { successResponse, errorResponse } from "../_shared/http.ts";
import { handleNotificationUseCase } from "./application/HandleNotificationUseCase.ts";

serve(
  createCORSHandler(async (req: Request): Promise<Response> => {
    // Only POST method allowed
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

      // Validasi field yang wajib
      if (!body.order_id || !body.status_code || !body.gross_amount || !body.signature_key) {
        return errorResponse(
          "VALIDATION_ERROR",
          "Field wajib: order_id, status_code, gross_amount, signature_key",
          {},
          400
        );
      }

      const result = await handleNotificationUseCase({
        order_id: body.order_id,
        status_code: body.status_code,
        gross_amount: body.gross_amount,
        signature_key: body.signature_key,
        payload: body,
      });

      if (result.status === "rejected") {
        return errorResponse(
          "VALIDATION_ERROR",
          "Signature verifikasi gagal, reject",
          {},
          401
        );
      }

      if (result.status === "error") {
        // Kembalikan 500 agar Midtrans mengulang notifikasi
        return errorResponse(
          "INTERNAL_ERROR",
          "Error internal saat memproses notifikasi",
          {},
          500
        );
      }

      // sukses diproses (including no-op)
      return successResponse({
        order_id: body.order_id,
        status: result.result,
      });

    } catch (err: any) {
      return errorResponse(
        "INTERNAL_ERROR",
        "Internal server error",
        {},
        500
      );
    }
  })
);