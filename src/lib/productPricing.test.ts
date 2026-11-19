import { describe, expect, it } from 'vitest'
import {
  calculateFinalPrice,
  discountAmount,
  discountPercent,
  hasDiscount,
} from './productPricing'

describe('calculateFinalPrice', () => {
  it('mengembalikan harga asli bila tanpa potongan', () => {
    expect(calculateFinalPrice(100000, null, null)).toBe(100000)
    expect(calculateFinalPrice(100000, 'percent', 0)).toBe(100000)
  })

  it('menghitung potongan persentase', () => {
    expect(calculateFinalPrice(100000, 'percent', 20)).toBe(80000)
    expect(calculateFinalPrice(99000, 'percent', 10)).toBe(89100)
    expect(calculateFinalPrice(100000, 'percent', 100)).toBe(1)
  })

  it('menghitung potongan nominal tetap', () => {
    expect(calculateFinalPrice(100000, 'fixed', 15000)).toBe(85000)
    expect(calculateFinalPrice(100000, 'fixed', 99999)).toBe(1)
  })

  it('membulatkan hasil persentase ke rupiah terdekat', () => {
    expect(calculateFinalPrice(10000, 'percent', 33)).toBe(6700)
  })
})

describe('hasDiscount', () => {
  it('hanya benar jika harga asli di atas harga jual', () => {
    expect(hasDiscount({ price: 80000, originalPrice: 100000 })).toBe(true)
    expect(hasDiscount({ price: 100000, originalPrice: 100000 })).toBe(false)
    expect(hasDiscount({ price: 100000, originalPrice: null })).toBe(false)
  })
})

describe('label potongan', () => {
  it('menghitung persentase efektif dan nominal hemat', () => {
    const product = { price: 80000, originalPrice: 100000 }
    expect(discountPercent(product)).toBe(20)
    expect(discountAmount(product)).toBe(20000)
  })

  it('nol bila tidak ada potongan', () => {
    const product = { price: 100000, originalPrice: null }
    expect(discountPercent(product)).toBe(0)
    expect(discountAmount(product)).toBe(0)
  })
})
