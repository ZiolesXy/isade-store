export type ProductStatus = 'active' | 'inactive';

export interface Product {
  id: string;
  slug: string;
  title: string;
  description: string;
  price: number;
  stock: number;
  lockedStock: number;
  availableStock: number;
  imagePath: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ProductInput {
  slug: string;
  title: string;
  description: string;
  price: number;
  stock: number;
  imagePath: string | null;
  isActive: boolean;
}

export interface ProductUpdateInput {
  slug?: string;
  title?: string;
  description?: string;
  price?: number;
  stock?: number;
  imagePath?: string | null;
  isActive?: boolean;
}

export interface ProductListResult {
  products: Product[];
  total: number;
  page: number;
  pageSize: number;
}
