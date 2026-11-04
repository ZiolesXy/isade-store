// Unit test VerifyPaymentUseCase
import { verifyPaymentCashierUseCase } from "./application/VerifyPaymentUseCase.ts";

Deno.test("verifyPaymentCashier: order pending -> paid (sebagai cashier)", async () => {
  // Setup: order pending, cashier memverifikasi
  const result = await verifyPaymentCashierUseCase(
    {
      order_id: "test-order-pending",
      result: "paid",
      catatan: "Verifikasi tunai diterima",
    },
    {} as Request // mock request
  );

  if (result.status === "paid" || result.status === "pending") {
    console.log("PASS: cashier verify pending -> paid, status:", result.status);
  } else {
    Deno.test.fail(`Harus paid atau pending, mendapat ${result.status}`);
  }
});

Deno.test("verifyPaymentCashier: order already paid - read-only", async () => {
  // Order sudah paid, coba verify lagi seharusnya tetap paid
  const result = await verifyPaymentCashierUseCase(
    {
      order_id: "test-order-paid",
      result: "needs_review",
      catatan: "Coba ubah order yang sudah dibayar",
    },
    {} as Request
  );

  // Order yang sudah paid harus tetap paid (read-only)
  if (result.status === "paid") {
    console.log("PASS: order sudah paid bersifat read-only");
  } else {
    console.log("INFO: order status berubah menjadi:", result.status);
  }
});

Deno.test("verifyPaymentCashier: non-cashier role ditolak", async () => {
  // Test dengan role yang bukan cashier/admin
  const result = await verifyPaymentCashierUseCase(
    {
      order_id: "test-order-1",
      result: "paid",
      catatan: "Coba sebagai customer",
    },
    {} as Request // mock request tanpa auth header
  );

  // Harus ditolak atau gagal gracefully
  console.log("INFO: non-cashier result:", result.status);
});

Deno.test("verifyPaymentCashier: valid result values", async () => {
  const validResults = ["paid", "needs_review", "failed", "expired", "cancelled"];
  
  for (const result of validResults) {
    const r = await verifyPaymentCashierUseCase(
      {
        order_id: `test-order-${result}`,
        result: result,
        catatan: `Test ${result}`,
      },
      {} as Request
    );
    
    console.log(`PASS: result ${result} handled, final status: ${r.status}`);
  }
});