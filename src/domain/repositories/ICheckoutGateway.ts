import type { CreateOrderInput, CreateOrderOutput } from '../models/Order';

export interface ICheckoutGateway {
  createOrder(input: CreateOrderInput): Promise<CreateOrderOutput>;
}
