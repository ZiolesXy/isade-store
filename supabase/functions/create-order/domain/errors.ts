// Error domain untuk UI
export class StockConflictError extends require("./entities").StockConflictError {
  constructor(items: Array<{ product_id: string; requested: number; available: number }>) {
    super(items);
  }
}

export class ProductUnavailableError extends require("./entities").ProductUnavailableError {
  constructor(productId: string) {
    super(productId);
  }
}

export class TooManyPendingOrdersError extends require("./entities").TooManyPendingOrdersError {
  constructor() {
    super();
  }
}

export class PaymentGatewayError extends require("./entities").PaymentGatewayError {
  constructor(message: string = "Payment gateway error") {
    super(message);
  }
}

export class ValidationError extends require("./entities").ValidationError {
  constructor(message: string, field?: string) {
    super(message, field);
  }
}