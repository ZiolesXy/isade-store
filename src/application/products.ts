import type { IProductRepository } from '../domain/repositories/IProductRepository';
import type { Product, ProductListResult } from '../domain/models/Product';

export class ListProductsUseCase {
  private readonly productRepository: IProductRepository;

  constructor(productRepository: IProductRepository) {
    this.productRepository = productRepository;
  }

  async execute(page: number, pageSize: number): Promise<ProductListResult> {
    return this.productRepository.list(page, pageSize);
  }
}

export class GetProductUseCase {
  private readonly productRepository: IProductRepository;

  constructor(productRepository: IProductRepository) {
    this.productRepository = productRepository;
  }

  async execute(slug: string): Promise<Product | null> {
    return this.productRepository.getBySlug(slug);
  }
}
