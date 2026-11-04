import { OrderGateway, PaymentGateway, SnapItemDetail } from "./ports.ts";
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
    input: CreateOrderInput,
    customer?: { email?: string }
  ): Promise<CreateOrderWebResponse | CreateOrderCashResponse> {
    // Validasi input
    if (!input.items || input.items.length === 0) {
      throw new ValidationError("Daftar item kosong", "items");
    }

    if (input.items.length > 20) {
      throw new ValidationError("Maksimum 20 jenis produk per order", "items_count");
    }

    for (const item of input.items) {
      if (!item.quantity || item.quantity < 1 || item.quantity > 99) {
        throw new ValidationError("Kuantitas harus antara 1 dan 99", "items_quantity");
      }
    }

    // Cek batas order pending per user
    const pendingCount = await this.orderGateway.countPendingOrders(userId);
    if (pendingCount >= 3) {
      throw new TooManyPendingOrdersError();
    }

    // Idempotency: jika order dengan key yang sama sudah punya snap token,
    // jangan buat transaksi Snap lagi (Midtrans menolak order_id ganda).
    const existingOrderId = await this.orderGateway.findByIdempotencyKey(userId, input.idempotency_key);
    if (existingOrderId && input.payment_method === "WEB_MIDTRANS") {
      const existing = await this.orderGateway.getOrderSnapshot(existingOrderId);
      if (existing?.snap_token) {
        return {
          order_id: existing.order_id,
          snap_token: existing.snap_token,
          redirect_url: existing.snap_redirect_url ?? "",
          total_amount: existing.total_amount,
          expires_at: existing.expires_at,
          payment_method: existing.payment_method,
        };
      }
    }

    // Pre-validasi stok sebelum membuat order (pesan konflik lebih informatif);
    // race condition tetap guarded oleh create_order_atomic.
    const stockValidation = await this.orderGateway.prevalidate(input.items);
    if (!stockValidation.success) {
      throw new StockConflictError(stockValidation.items);
    }

    // Buat order + kunci stok secara atomik lewat RPC.
    // Jika idempotency key sudah ada, RPC mengembalikan order lama.
    let orderId = await this.orderGateway.createOrderAtomic(
      userId,
      input.items,
      input.payment_method,
      input.idempotency_key
    );

    const snapshot = await this.orderGateway.getOrderSnapshot(orderId);
    if (!snapshot) {
      throw new PaymentGatewayError("Order berhasil dibuat tetapi gagal dibaca");
    }

    if (input.payment_method === "KASIR_CASH") {
      // Order Kasir Cash: tidak ada Midtrans, langsung pending menunggu verifikasi kasir.
      return {
        order_id: snapshot.order_id,
        status: snapshot.status,
        total_amount: snapshot.total_amount,
        expires_at: snapshot.expires_at,
        payment_method: snapshot.payment_method,
      };
    }

    if (input.payment_method !== "WEB_MIDTRANS") {
      throw new ValidationError("Payment method tidak valid", "payment_method");
    }

    if (snapshot.status !== "pending") {
      // Order sudah final (misal rusak oleh error sebelumnya): laporkan apa adanya.
      throw new PaymentGatewayError(`Order sudah berstatus ${snapshot.status}`);
    }

    // Midtrans: harga per item diambil dari DB (order_items), bukan dihitung ulang di klien.
    const itemDetails: SnapItemDetail[] = snapshot.items.map((it) => ({
      id: it.product_id,
      price: it.unit_price,
      quantity: it.quantity,
      name: it.title.substring(0, 50),
    }));

    try {
      const midtransResult = await this.paymentGateway.createSnapTransaction(
        snapshot.order_id,
        snapshot.total_amount,
        itemDetails,
        customer
      );

      await this.orderGateway.saveSnapToken(
        snapshot.order_id,
        midtransResult.token,
        midtransResult.redirect_url
      );

      return {
        order_id: snapshot.order_id,
        snap_token: midtransResult.token,
        redirect_url: midtransResult.redirect_url,
        total_amount: snapshot.total_amount,
        expires_at: snapshot.expires_at,
        payment_method: snapshot.payment_method,
      };
    } catch (err: any) {
      // Gagal membuat transaksi Midtrans: lepas lock stok dengan menandai order gagal.
      await this.orderGateway.markFailed(snapshot.order_id).catch(() => {});
      if (err instanceof PaymentGatewayError) {
        throw err;
      }
      throw new PaymentGatewayError(err?.message || "Gagal menghubungkan ke Midtrans");
    }
  }
}