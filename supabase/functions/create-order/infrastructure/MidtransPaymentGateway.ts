import { MidtransClient } from "../_shared/midtrans/MidtransClient.ts";
import {
  MidtransConfig,
  SnapCreateRequest,
  SnapCreateResponse,
} from "../_shared/midtrans/MidtransClient.ts";

export class MidtransPaymentGateway implements PaymentGateway {
  private client: MidtransClient;

  constructor(config: MidtransConfig) {
    this.client = new MidtransClient(config);
  }

  async createSnapTransaction(
    orderId: string,
    totalAmount: number,
    items: Array<{ product_id: string; quantity: number }>
  ): Promise<{ token: string; redirect_url: string }> {
    // Format item_details untuk Midtrans
    // Nama item dipotong maksimal 50 karakter
    const itemDetails = items.map(item => {
      const name = `Product ${item.product_id.slice(0, 20)}`;
      return {
        id: item.product_id,
        price: Math.round(totalAmount / items.reduce((s, i) => s + i.quantity, 0) || 1) || 0,
        quantity: item.quantity,
        name: name.substring(0, 50),
      };
    });

    // Pastikan jumlah price * quantity sama persis dengan gross_amount
    // Ini akan diverifikasi oleh Midtrans

    const request: SnapCreateRequest = {
      transaction_details: {
        order_id,
        gross_amount: totalAmount,
      },
      item_details: itemDetails,
      customer_details: {
        first_name: "",
        email: "",
      },
      expiry: {
        unit: "minutes",
        duration: 30,
      },
      callbacks: {
        finish: "/orders/[[order_id]]", // Akan diganti di runtime
      },
    };

    return this.client.createTransaction(request);
  }
}