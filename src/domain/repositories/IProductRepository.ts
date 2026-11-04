import type { Product, ProductInput, ProductUpdateInput, ProductListResult } from '../models/Product';

export interface IProductRepository {
  list(page: number, pageSize: number): Promise<ProductListResult>;
  getBySlug(slug: string): Promise<Product | null>;
  create(input: ProductInput): Promise<Product>;
  update(id: string, input: ProductUpdateInput): Promise<Product>;
  setActive(id: string, isActive: boolean): Promise<Product>;
  uploadImage(id: string, file: File): Promise<string>;
}
