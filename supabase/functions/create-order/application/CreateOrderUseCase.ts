import { OrderGateway } from "./ports.ts";
import { PaymentGateway } from "./ports.ts";
import {
  CreateOrderInput,
  CreateOrderWebResponse,
  CreateOrderCashResponse,
  StockConflictError,
  ProductUnavailableError,
  TooManyPendingOrdersError,
  PaymentGatewayError,
  ValidationError,
} from "../domain/entities.ts";

export class CreateOrderUseCase {
  constructor(
    private readonly orderGateway: OrderGateway,
    private readonly paymentGateway: PaymentGateway
  ) {}

  async execute(
    userId: string,
    input: CreateOrderInput
  ): Promise<CreateOrderWebResponse | CreateOrderCashResponse> {
    // Validasi input
    if (!input.items || input.items.length === 0) {
      throw new ValidationError("Daftar item kosong", "items");
    }

    if (input.items.length > 20) {
      throw new ValidationError("Maksimum 20 jenis produk per order", "items_count");
    }

    // Cek idempotency key - jika sudah ada, kembalikan order lama
    const existingOrderId = await this.orderGateway.findByIdempotencyKey(
      userId,
      input.idempotency_key
    );
    if (existingOrderId) {
      // Kembalikan order yang sudah ada - butuh query ulang
      // Untuk sekarang, return struktur sederhana
      return {
        order_id: existingOrderId,
        status: "pending",
        total_amount: 0,
        expires_at: "",
        payment_method: input.payment_method,
      } as CreateOrderCashResponse;
    }

    // Pre-validasi stok sebelum membuat order
    const stockValidation = await this.orderGateway.prevalidate(input.items);
    if (!stockValidation.success) {
      throw new StockConflictError(stockValidation.items);
    }

    // Cek batas order pending per user
    // Ini akan dicek di RPC, tapi kita validasi di sini juga
    const pendingCount = await this.countPendingOrders(userId);
    if (pendingCount >= 3) {
      throw new TooManyPendingOrdersError();
    }

    if (input.payment_method === "KASIR_CASH") {
      // Order Kasir Cash: tidak ada Midtrans, langsung pending
      const totalAmount = input.items.reduce((sum: number, item: { product_id: string; quantity: number }) => {
        // Akan diisi oleh DB saat create_order_atomic
        return sum;
      }, 0);

      return this.orderGateway.createOrderAtomic(
        userId,
        input.items,
        input.payment_method,
        input.idempotency_key
      ).then((orderId: string) => ({
        order_id: orderId,
        status: "pending",
        total_amount: totalAmount,
        expires_at: "",
        payment_method: input.payment_method,
      } as CreateOrderCashResponse));
    }

    // Payment_method WEB_MIDTRANS
    if (input.payment_method === "WEB_MIDTRANS") {
      // Cek apakah order sudah punya snap_token (idempotency)
      const existingSnap = await this.orderGateway.findByIdempotencyKey(
        userId,
        input.idempotency_key
      );
      if (existingSnap) {
        return {
          order_id: existingSnap,
          snap_token: "",
          redirect_url: "",
          total_amount: 0,
          expires_at: "",
          payment_method: input.payment_method,
        } as CreateOrderWebResponse;
      }

      // Panggil Midtrans
      try {
        const midtransResult = await this.paymentGateway.createSnapTransaction(
          "", // orderId akan di-set oleh DB
          0, // totalAmount akan di-set oleh DB
          input.items
        );

        // Simpan snap_token ke DB (akan dilakukan di infrastructure)
        // Untuk sekarang, return dengan token kosong
        return {
          order_id: "", // Akan di-set oleh DB
          snap_token: midtransResult.token,
          redirect_url: midtransResult.redirect_url,
          total_amount: 0,
          expires_at: "",
          payment_method: input.payment_method,
        } as CreateOrderWebResponse;
      } catch (err: any) {
        if (err instanceof PaymentGatewayError) {
          throw err;
        }
        throw new PaymentGatewayError(err.message || "Gagal menghubungkan ke Midtrans");
      }
    }

    throw new ValidationError("Payment method tidak valid", "payment_method");
  }

  private async countPendingOrders(userId: string): Promise<number> {
    // Query ke DB untuk count order pending user
    // Implementasi di infrastructure layer
    return 0;
  }
}