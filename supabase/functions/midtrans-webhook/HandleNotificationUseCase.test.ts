// Unit test HandleNotificationUseCase
import { handleNotificationUseCase } from "./application/HandleNotificationUseCase.ts";

Deno.test("handleNotificationUseCase: signature invalid", async () => {
  const result = await handleNotificationUseCase({
    order_id: "test-order-1",
    status_code: "settlement",
    gross_amount: "150000.00",
    signature_key: "wrong-key",
    payload: { signature_key: "wrong-key", transaction_status: "settlement" },
  });

  if (result.status === "rejected") {
    console.log("PASS: invalid signature rejected");
  } else {
    Deno.test.fail(`Harus rejected, mendapat ${result.status}`);
  }
});

Deno.test("handleNotificationUseCase: function executes", async () => {
  try {
    const result = await handleNotificationUseCase({
      order_id: "test-order-1",
      status_code: "settlement",
      gross_amount: "150000.00",
      signature_key: "correct-key",
      payload: { signature_key: "correct-key", transaction_status: "settlement" },
    });

    console.log("PASS: handleNotificationUseCase executes, status:", result.status);
  } catch (err) {
    Deno.test.fail(`Harus tidak throw error, mendapat: ${err}`);
  }
});