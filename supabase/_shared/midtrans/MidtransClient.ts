export interface MidtransConfig {
  isProduction: boolean;
  serverKey: string;
  clientKey: string;
}

export interface TransactionDetails {
  order_id: string;
  gross_amount: number;
}

export interface ItemDetails {
  id: string;
  price: number;
  quantity: number;
  name: string;
}

export interface CustomerDetails {
  first_name: string;
  email: string;
}

export interface SnapCreateRequest {
  transaction_details: TransactionDetails;
  item_details?: ItemDetails[];
  customer_details?: CustomerDetails;
  expiry?: {
    unit: string;
    duration: number;
  };
  callbacks?: {
    finish?: string;
  };
}

export interface SnapCreateResponse {
  token: string;
  redirect_url: string;
}

export interface SnapStatusResponse {
  transaction_status: string;
  fraud_status?: string;
}

export class MidtransClient {
  private config: MidtransConfig;

  constructor(config: MidtransConfig) {
    this.config = config;
  }

  async createTransaction(request: SnapCreateRequest): Promise<SnapCreateResponse> {
    const url = this.config.isProduction
      ? "https://app.midtrans.com/snap/v1/transactions"
      : "https://app.sandbox.midtrans.com/snap/v1/transactions";

    const authString = `${this.config.serverKey}:`;
    const authBase64 = btoa(authString);
    const authHeader = `Basic ${authBase64}`;

    const body = JSON.stringify({
      transaction_details: request.transaction_details,
      item_details: request.item_details,
      customer_details: request.customer_details,
      expiry: request.expiry,
      callbacks: request.callbacks,
    });

    const options: RequestInit = {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": authHeader,
      },
      body,
    };

    const response = await fetch(url, options);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Midtrans transaction creation failed");
    }

    return {
      token: data.token || "",
      redirect_url: data.redirect_url || "",
    };
  }

  async getTransactionStatus(orderId: string): Promise<SnapStatusResponse> {
    const url = this.config.isProduction
      ? `https://api.midtrans.com/v2/${orderId}/status`
      : `https://api.sandbox.midtrans.com/v2/${orderId}/status`;

    const authString = `${this.config.serverKey}:`;
    const authBase64 = btoa(authString);
    const authHeader = `Basic ${authBase64}`;

    const options: RequestInit = {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "Authorization": authHeader,
      },
    };

    const response = await fetch(url, options);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Midtrans status check failed");
    }

    return {
      transaction_status: data.transaction_status || "",
      fraud_status: data.fraud_status,
    };
  }
}