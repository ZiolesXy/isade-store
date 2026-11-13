import type { Product, ProductInput, ProductUpdateInput, ProductListResult } from '../models/Product';

export interface AdminProductFilter {
  /** Cari di judul atau slug (ilike). */
  search?: string;
  /** undefined = semua; true = aktif saja; false = nonaktif saja. */
  isActive?: boolean;
}

export interface IProductRepository {
  list(page: number, pageSize: number): Promise<ProductListResult>;
  /** Untuk halaman admin: memuat semua produk, termasuk yang nonaktif, dengan cari/filter. */
  listAdmin(page: number, pageSize: number, filter?: AdminProductFilter): Promise<ProductListResult>;
  /** Untuk rekonsiliasi keranjang: ambil ulang produk berdasarkan id. */
  getManyByIds(ids: string[]): Promise<Product[]>;
  getBySlug(slug: string): Promise<Product | null>;
  create(input: ProductInput): Promise<Product>;
  update(id: string, input: ProductUpdateInput): Promise<Product>;
  setActive(id: string, isActive: boolean): Promise<Product>;
  /** Mengunggah gambar ke bucket `products` dan mengembalikan path file (bukan URL). */
  uploadImage(id: string, file: File): Promise<string>;
}
