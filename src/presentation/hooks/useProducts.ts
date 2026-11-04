import type { IProductRepository } from '../../domain/repositories/IProductRepository';
import type { Product } from '../../domain/models/Product';
import { ListProductsUseCase, GetProductUseCase } from '../../application/products';
import type { ProductListResult } from '../../domain/models/Product';

export function useProducts(productRepository: IProductRepository) {
  const listUseCase = new ListProductsUseCase(productRepository);
  const getUseCase = new GetProductUseCase(productRepository);

  async function list(page: number, pageSize: number): Promise<ProductListResult> {
    return listUseCase.execute(page, pageSize);
  }

  async function getBySlug(slug: string): Promise<Product | null> {
    return getUseCase.execute(slug);
  }

  return { list, getBySlug };
}
