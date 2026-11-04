import { verifySignature } from "../../_shared/midtrans/signature.ts";
import { mapMidtransStatus } from "../../_shared/midtrans/statusMapper.ts";
import { MidtransClient } from "../../_shared/midtrans/MidtransClient.ts";
import {
  apply_payment_result,
} from "../../_shared/database.ts";

export interface HandleNotificationUseCaseInput {
  order_id: string;
  status_code: string;
  gross_amount: string;
  signature_key: string;
  payload: any;
}

export async function handleNotificationUseCase(
  input: HandleNotificationUseCaseInput
): Promise<{ status: string; result: string }> {
  const { order_id, status_code, gross_amount, signature_key, payload } = input;

  // 1. Verifikasi signature
  const isValid = await verifySignature(
    order_id,
    status_code,
    gross_amount,
    signature_key,
    String(payload.signature_key || '')
  );

  if (!isValid) {
    // Signature tidak valid - reject, tidak ada perubahan data
    return { status: "rejected", result: "invalid_signature" };
  }

  // 2. Konfirmasi status ke API Midtrans
  const config = {
    serverKey: Deno.env.get("MIDTRANS_SERVER_KEY") || "",
    clientKey: Deno.env.get("MIDTRANS_CLIENT_KEY") || "",
    isProduction: Deno.env.get("MIDTRANS_IS_PRODUCTION") === "true",
  };
  const midtransClient = new MidtransClient(config);

  const statusResponse = await midtransClient.getTransactionStatus(order_id);
  const confirmedStatus = statusResponse.transaction_status;

  // 3. Petakan status Midtrans ke status order internal
  const mappedStatus = mapMidtransStatus(confirmedStatus);

  // 4. Panggil apply_payment_result di DB
  try {
    const dbResult = await apply_payment_result(
      order_id,
      mappedStatus,
      parseInt(gross_amount.replace(/[^0-9]/g, ""), 10),
      "webhook",
      payload
    );

    return { status: "success", result: dbResult };
  } catch (err) {
    return { status: "error", result: "database_error" };
  }
}