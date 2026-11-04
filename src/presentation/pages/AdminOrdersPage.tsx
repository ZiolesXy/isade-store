import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router';
import type { Order, OrderStatus } from '@/domain/models/Order';
import { di } from '@/di';
import { OrderStatusBadge } from '@/presentation/components/OrderStatusBadge';
import { EmptyState, ErrorState, RowSkeleton } from '@/presentation/components/states';
import { formatDateTime, formatRupiah } from '@/lib/format';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Label } from '@/components/ui/label';

const PAGE_SIZE = 15;

const STATUS_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'all', label: 'Semua status' },
  { value: 'needs_review', label: 'Perlu Ditinjau' },
  { value: 'pending', label: 'Menunggu Pembayaran' },
  { value: 'paid', label: 'Dibayar' },
  { value: 'expired', label: 'Kedaluwarsa' },
  { value: 'cancelled', label: 'Dibatalkan' },
  { value: 'failed', label: 'Gagal' },
];

export function AdminOrdersPage() {
  const [statusFilter, setStatusFilter] = useState('all');
  const [rows, setRows] = useState<Order[]>([]);
  const [page, setPage] = useState(1);
  const [hasNext, setHasNext] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (targetPage: number, status: string) => {
    setLoading(true);
    setError(null);
    try {
      const statusParam = status === 'all' ? undefined : status;
      // Satu baris ekstra untuk mendeteksi halaman berikutnya.
      const data = await di.orderRepository.listAll(targetPage, PAGE_SIZE + 1, statusParam);
      setHasNext(data.length > PAGE_SIZE);
      setRows(data.slice(0, PAGE_SIZE));
      setPage(targetPage);
    } catch {
      setError('Pesanan tidak berhasil dimuat.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(1, statusFilter);
  }, [load, statusFilter]);

  function methodLabel(order: Order): string {
    return order.paymentMethod === 'WEB_MIDTRANS'
      ? 'Bayar di Web (Midtrans)'
      : 'Bayar di Kasir (Cash)';
  }

  return (
    <section className="mx-auto max-w-6xl px-4 py-6">
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <h1 className="font-display text-xl font-bold">Daftar Pesanan</h1>
        <div className="ml-auto flex items-center gap-2">
          <Label htmlFor="status-filter" className="whitespace-nowrap">
            Filter status
          </Label>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger id="status-filter" className="w-52 bg-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {loading ? (
        <RowSkeleton rows={4} />
      ) : error ? (
        <ErrorState message={error} onRetry={() => void load(1, statusFilter)} />
      ) : rows.length === 0 ? (
        <EmptyState message="Belum ada pesanan untuk filter ini." />
      ) : (
        <div className="overflow-x-auto rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Kode</TableHead>
                <TableHead>Waktu dibuat</TableHead>
                <TableHead>Cara pembayaran</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((order) => (
                <TableRow key={order.id}>
                  <TableCell>
                    <Link to={`/orders/${order.id}`} className="font-mono text-xs hover:underline">
                      {order.id.slice(0, 8)}
                    </Link>
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-sm">
                    {formatDateTime(order.createdAt)}
                  </TableCell>
                  <TableCell className="text-sm">{methodLabel(order)}</TableCell>
                  <TableCell className="text-right font-medium">
                    {formatRupiah(order.totalAmount)}
                  </TableCell>
                  <TableCell>
                    <OrderStatusBadge status={order.status as OrderStatus} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {!loading && !error && (page > 1 || hasNext) ? (
        <div className="mt-4 flex items-center justify-center gap-3">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => void load(page - 1, statusFilter)}
          >
            Sebelumnya
          </Button>
          <span className="text-sm text-muted-foreground">Halaman {page}</span>
          <Button
            variant="outline"
            size="sm"
            disabled={!hasNext}
            onClick={() => void load(page + 1, statusFilter)}
          >
            Berikutnya
          </Button>
        </div>
      ) : null}
    </section>
  );
}
