import type { ICheckoutGateway } from '../domain/repositories/ICheckoutGateway';
import type { CreateOrderInput, CreateOrderOutput } from '../domain/models/Order';
import { ValidationError } from '../domain/errors';

export class CheckoutUseCase {
  private readonly checkoutGateway: ICheckoutGateway;

  constructor(checkoutGateway: ICheckoutGateway) {
    this.checkoutGateway = checkoutGateway;
  }

  async createOrder(input: CreateOrderInput): Promise<CreateOrderOutput> {
    if (!input.items || input.items.length === 0) {
      throw new ValidationError('Daftar item kosong', 'items');
    }

    if (input.items.length > 20) {
      throw new ValidationError('Maksimum 20 jenis produk per order', 'items_count');
    }

    for (const item of input.items) {
      if (!item.quantity || item.quantity < 1 || item.quantity > 99) {
        throw new ValidationError('Kuantitas harus antara 1 dan 99', `items[${item.productId}].quantity`);
      }
    }

    return this.checkoutGateway.createOrder(input);
  }
}
