export type ProductStatus = 'active' | 'inactive';

/** Jenis potongan harga: persentase dari harga asli, atau nominal tetap. */
export type ProductDiscountType = 'percent' | 'fixed';

export interface Product {
  id: string;
  slug: string;
  title: string;
  description: string;
  /** Harga jual final setelah potongan. */
  price: number;
  /** Harga asli sebelum potongan; null bila produk tidak sedang diskon. */
  originalPrice: number | null;
  discountType: ProductDiscountType | null;
  discountValue: number | null;
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
  originalPrice: number | null;
  discountType: ProductDiscountType | null;
  discountValue: number | null;
  stock: number;
  imagePath: string | null;
  isActive: boolean;
}

export interface ProductUpdateInput {
  slug?: string;
  title?: string;
  description?: string;
  price?: number;
  originalPrice?: number | null;
  discountType?: ProductDiscountType | null;
  discountValue?: number | null;
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
