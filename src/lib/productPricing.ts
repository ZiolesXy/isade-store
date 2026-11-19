import type { ProductDiscountType } from '../domain/models/Product'

/** Batas minimal harga jual setelah potongan. */
export const MIN_SELLING_PRICE = 1

/**
 * Menghitung harga jual final dari harga asli dan potongan.
 * Persentase dibulatkan ke rupiah terdekat; nominal tetap langsung dikurangi.
 * Tanpa potongan, harga final sama dengan harga asli.
 */
export function calculateFinalPrice(
  originalPrice: number,
  discountType: ProductDiscountType | null,
  discountValue: number | null
): number {
  if (discountType == null || discountValue == null || discountValue <= 0) {
    return originalPrice
  }

  const finalPrice =
    discountType === 'percent'
      ? originalPrice * (100 - Math.min(discountValue, 100)) / 100
      : originalPrice - discountValue

  return Math.max(MIN_SELLING_PRICE, Math.round(finalPrice))
}

/** Produk dianggap diskon hanya bila harga asli benar-benar di atas harga jual. */
export function hasDiscount(product: {
  price: number
  originalPrice: number | null
}): boolean {
  return product.originalPrice != null && product.originalPrice > product.price
}

/** Persentase potongan efektif untuk label badge, misalnya 20 untuk "-20%". */
export function discountPercent(product: {
  price: number
  originalPrice: number | null
}): number {
  if (!hasDiscount(product)) return 0
  const original = product.originalPrice as number
  return Math.round(((original - product.price) / original) * 100)
}

/** Nominal hemat dalam rupiah untuk label "Hemat Rp...". */
export function discountAmount(product: {
  price: number
  originalPrice: number | null
}): number {
  if (!hasDiscount(product)) return 0
  return (product.originalPrice as number) - product.price
}
