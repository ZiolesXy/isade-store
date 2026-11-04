// Composition root.
// Wire semua repository, gateway, use case, dan store di sini.
// Presentation layer hanya boleh mengakses lewat di.ts, tidak langsung menginstansiasi implementasi data.

import { SupabaseProductRepo } from './data/repositories/SupabaseProductRepo';
import { SupabaseOrderRepo } from './data/repositories/SupabaseOrderRepo';
import { SupabaseCheckoutGateway } from './data/repositories/SupabaseCheckoutGateway';
import { ListProductsUseCase, GetProductUseCase } from './application/products';
import { CheckoutUseCase } from './application/checkout';

// Singleton instances
const productRepository = new SupabaseProductRepo();
const orderRepository = new SupabaseOrderRepo();
const checkoutGateway = new SupabaseCheckoutGateway();

const listProductsUseCase = new ListProductsUseCase(productRepository);
const getProductUseCase = new GetProductUseCase(productRepository);
const checkoutUseCase = new CheckoutUseCase(checkoutGateway);

const MIDTRANS_CLIENT_KEY = import.meta.env.VITE_MIDTRANS_CLIENT_KEY || '';

export const di = {
  productRepository,
  orderRepository,
  checkoutGateway,
  listProductsUseCase,
  getProductUseCase,
  checkoutUseCase,
  midtransClientKey: MIDTRANS_CLIENT_KEY,
};

export type DI = typeof di;
