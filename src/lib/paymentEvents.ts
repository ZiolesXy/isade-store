import type { Database } from '@/data/database.types';

export type OrderNoteRow =
  Database['public']['Functions']['list_order_notes']['Returns'][number];

/** Label sumber event pembayaran untuk ditampilkan ke user/admin. */
export function paymentSourceLabel(source: string): string {
  switch (source) {
    case 'cashier':
      return 'Kasir/Admin';
    case 'webhook':
      return 'Midtrans';
    case 'system':
      return 'Sistem';
    default:
      return source;
  }
}

/** Catatan yang tidak kosong saja, urut terbaru (sesuai RPC). */
export function orderNotes(rows: OrderNoteRow[]): OrderNoteRow[] {
  return rows.filter((row) => !!row.catatan?.trim());
}
