export class StockConflictError extends Error {
  public items: Array<{ productId: string; requested: number; available: number }>;

  constructor(items: Array<{ productId: string; requested: number; available: number }>) {
    super('Stok tidak mencukupi untuk satu atau lebih produk');
    this.name = 'StockConflictError';
    this.items = items;
  }
}

export class ProductUnavailableError extends Error {
  constructor(productId: string) {
    super(`Produk ${productId} tidak tersedia atau tidak aktif`);
    this.name = 'ProductUnavailableError';
  }
}

export class TooManyPendingOrdersError extends Error {
  constructor() {
    super('Anda sudah memiliki 3 order yang sedang menunggu pembayaran');
    this.name = 'TooManyPendingOrdersError';
  }
}

export class PaymentGatewayError extends Error {
  constructor(message: string = 'Gagal memproses pembayaran') {
    super(message);
    this.name = 'PaymentGatewayError';
  }
}

export class ValidationError extends Error {
  constructor(message: string, field?: string) {
    super(message);
    this.name = 'ValidationError';
    if (field) this.message = `${field}: ${message}`;
  }
}
