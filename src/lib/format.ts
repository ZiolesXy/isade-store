export function formatRupiah(amount: number | bigint | null | undefined): string {
  if (amount == null) {
    return 'Rp0'
  }
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(Number(amount))
}
