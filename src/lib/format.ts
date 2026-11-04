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

/** Tanggal + jam penuh, zona waktu browser, bahasa Indonesia. */
export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return '-'
  return new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(iso))
}

/** Tanggal saja, zona waktu browser, bahasa Indonesia. */
export function formatDate(iso: string | null | undefined): string {
  if (!iso) return '-'
  return new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'medium',
  }).format(new Date(iso))
}
