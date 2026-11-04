// Unit test statusMapper
import { mapMidtransStatus } from "./statusMapper.ts";

Deno.test("statusMapper: settlement -> paid", () => {
  const result = mapMidtransStatus("settlement");
  if (result === "paid") {
    console.log("PASS: settlement -> paid");
  } else {
    Deno.test.fail(`Harus paid, mendapat ${result}`);
  }
});

Deno.test("statusMapper: expire -> expired", () => {
  const result = mapMidtransStatus("expire");
  if (result === "expired") {
    console.log("PASS: expire -> expired");
  } else {
    Deno.test.fail(`Harus expired, mendapat ${result}`);
  }
});

Deno.test("statusMapper: capture accept -> pending (di-level lanjut)", () => {
  // capture dengan fraud_status accept akan divalidasi di apply_payment_result
  const result = mapMidtransStatus("capture");
  if (result === "pending") {
    console.log("PASS: capture -> pending (lanjutan di apply_payment_result)");
  } else {
    Deno.test.fail(`Harus pending, mendapat ${result}`);
  }
});

Deno.test("statusMapper: capture challenge -> pending", () => {
  const result = mapMidtransStatus("capture");
  if (result === "pending") {
    console.log("PASS: capture challenge -> pending");
  } else {
    Deno.test.fail(`Harus pending, mendapat ${result}`);
  }
});

Deno.test("statusMapper: cancel -> cancelled", () => {
  const result = mapMidtransStatus("cancel");
  if (result === "cancelled") {
    console.log("PASS: cancel -> cancelled");
  } else {
    Deno.test.fail(`Harus cancelled, mendapat ${result}`);
  }
});

Deno.test("statusMapper: deny -> failed", () => {
  const result = mapMidtransStatus("deny");
  if (result === "failed") {
    console.log("PASS: deny -> failed");
  } else {
    Deno.test.fail(`Harus failed, mendapat ${result}`);
  }
});

Deno.test("statusMapper: refund -> needs_review", () => {
  const result = mapMidtransStatus("refund");
  if (result === "needs_review") {
    console.log("PASS: refund -> needs_review");
  } else {
    Deno.test.fail(`Harus needs_review, mendapat ${result}`);
  }
});

Deno.test("statusMapper: failure -> failed", () => {
  const result = mapMidtransStatus("failure");
  if (result === "failed") {
    console.log("PASS: failure -> failed");
  } else {
    Deno.test.fail(`Harus failed, mendapat ${result}`);
  }
});

Deno.test("statusMapper: default -> pending", () => {
  const result = mapMidtransStatus("unknown_status");
  if (result === "pending") {
    console.log("PASS: default -> pending");
  } else {
    Deno.test.fail(`Harus pending, mendapat ${result}`);
  }
});