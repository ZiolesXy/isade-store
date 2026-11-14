import { MidtransClient } from "../_shared/midtrans/MidtransClient.ts";
import {
  MidtransConfig,
  SnapCreateRequest,
  ItemDetails,
} from "../_shared/midtrans/MidtransClient.ts";
import {
  PaymentGateway,
  SnapItemDetail,
} from "../application/ports.ts";

export class MidtransPaymentGateway implements PaymentGateway {
  private client: MidtransClient;

  constructor(config: MidtransConfig) {
    this.client = new MidtransClient(config);
  }

  async createSnapTransaction(
    orderId: string,
    totalAmount: number,
    itemDetails: SnapItemDetail[],
    customer?: { email?: string }
  ): Promise<{ token: string; redirect_url: string }> {
    const items: ItemDetails[] = itemDetails.map((item) => ({
      id: item.id,
      // Harga per unit dan judul produk berasal dari DB (order_items).
      price: item.price,
      quantity: item.quantity,
      name: item.name.substring(0, 50),
    }));

    const request: SnapCreateRequest = {
      transaction_details: {
        order_id: orderId,
        gross_amount: totalAmount,
      },
      item_details: items,
      customer_details: {
        first_name: "",
        email: customer?.email ?? "",
      },
      expiry: {
        unit: "minutes",
        duration: 30,
      },
      callbacks: {
        finish: `${Deno.env.get("APP_URL")}/orders/${orderId}`,
      },
    };

    return this.client.createTransaction(request);
  }
}