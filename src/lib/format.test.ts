import { describe, expect, it } from 'vitest'
import { formatRupiah } from './format'

const rupiah = new Intl.NumberFormat('id-ID', {
  style: 'currency',
  currency: 'IDR',
  maximumFractionDigits: 0,
})

describe('formatRupiah', () => {
  it('mengformat nol dan nilai kosong', () => {
    expect(formatRupiah(0)).toBe(rupiah.format(0))
    expect(formatRupiah(null)).toBe('Rp0')
    expect(formatRupiah(undefined)).toBe('Rp0')
  })

  it('mengformat bilangan bulat rupiah tanpa desimal', () => {
    expect(formatRupiah(150000)).toBe(rupiah.format(150000))
    expect(formatRupiah(1000000)).toBe(rupiah.format(1000000))
    expect(formatRupiah(123456789)).toBe(rupiah.format(123456789))
  })

  it('mengaccept bigint', () => {
    expect(formatRupiah(150000n)).toBe(rupiah.format(150000))
  })

  it('membulatkan koma ke nol desimal', () => {
    expect(formatRupiah(150000.99)).toBe(rupiah.format(150000.99))
  })
})
