import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router';
import type { Order, OrderStatus } from '@/domain/models/Order';
import { di } from '@/di';
import { useCashier } from '@/presentation/hooks/useCashier';
import { OrderStatusBadge, STATUS_LABEL } from '@/presentation/components/OrderStatusBadge';
import { EmptyState, ErrorState, RowSkeleton } from '@/presentation/components/states';
import { formatDateTime, formatRupiah } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { toast } from 'sonner';

type ReviewAction = 'approve' | 'reject';

interface ReviewRow extends Order {
  reviewing: boolean;
  action: ReviewAction | null;
  catatan: string;
}

const PAGE_SIZE = 15;

export function AdminNeedsReviewPage() {
  const { verifyPayment } = useCashier();
  const [rows, setRows] = useState<ReviewRow[]>([]);
  const [page, setPage] = useState(1);
  const [hasNext, setHasNext] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (targetPage: number) => {
    setLoading(true);
    setError(null);
    try {
      const data = await di.orderRepository.listAll(targetPage, PAGE_SIZE + 1, 'needs_review');
      setHasNext(data.length > PAGE_SIZE);
      setRows(
        data.slice(0, PAGE_SIZE).map((order) => ({
          ...order,
          reviewing: false,
          action: null,
          catatan: '',
        }))
      );
      setPage(targetPage);
    } catch {
      setError('Gagal memuat daftar pesanan perlu ditinjau.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(1);
  }, [load]);

  async function handleReview(order: Order, action: ReviewAction) {
    setRows((prev) =>
      prev.map((r) =>
        r.id === order.id ? { ...r, reviewing: true, action } : r
      )
    );

    const result: OrderStatus = action === 'approve' ? 'paid' : 'failed';

    try {
      await verifyPayment({
        orderId: order.id,
        result,
        catatan: undefined,
      });

      setRows((prev) => prev.filter((r) => r.id !== order.id));

      toast.success(
        action === 'approve'
          ? 'Pesanan disetujui dan ditandai dibayar.'
          : 'Pesanan ditolak dan ditandai gagal.'
      );
    } catch (err) {
      setRows((prev) =>
        prev.map((r) =>
          r.id === order.id ? { ...r, reviewing: false, action: null } : r
        )
      );
      const message = err instanceof Error ? err.message : 'Tinjauan gagal.';
      toast.error(message);
    }
  }

  if (loading) {
    return <RowSkeleton rows={4} />;
  }

  if (error) {
    return <ErrorState message={error} onRetry={() => void load(1)} />;
  }

  if (rows.length === 0) {
    return (
      <section className="mx-auto max-w-5xl px-4 py-6">
        <div className="mb-6 flex items-center gap-2">
          <h1 className="font-display text-xl font-bold">Pesanan Perlu Ditinjau</h1>
        </div>
        <EmptyState message="Tidak ada pesanan yang perlu ditinjau saat ini." />
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-5xl px-4 py-6">
      <div className="mb-6 flex items-center gap-2">
        <h1 className="font-display text-xl font-bold">Pesanan Perlu Ditinjau</h1>
      </div>
      <p className="mb-6 text-sm text-muted-foreground">
        Berikut adalah pesanan dengan status <b>Perlu Ditinjau</b>. Pilih setujui
        (ditandai dibayar) atau tolak (ditandai gagal) untuk setiap pesanan.
      </p>

      <div className="overflow-x-auto rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Kode</TableHead>
              <TableHead className="text-left">Pelanggan</TableHead>
              <TableHead className="text-left">Metode</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead>Dibuat</TableHead>
              <TableHead className="text-center">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((order) => {
              const isReviewing = order.reviewing;
              const action = order.action;
              return (
                <TableRow key={order.id}>
                  <TableCell className="font-mono text-xs">
                    <Link to={`/orders/${order.id}`} className="hover:underline">
                      {order.id.slice(0, 8)}
                    </Link>
                  </TableCell>
                  <TableCell className="text-sm">{order.userId.slice(0, 8)}</TableCell>
                  <TableCell className="text-sm">
                    {order.paymentMethod === 'WEB_MIDTRANS'
                      ? 'Midtrans'
                      : 'Tunai (Kasir)'}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {formatRupiah(order.totalAmount)}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-sm">
                    {formatDateTime(order.createdAt)}
                  </TableCell>
                  <TableCell className="text-center">
                    {isReviewing ? (
                      <Button size="sm" disabled>
                        Memproses…
                      </Button>
                    ) : (
                      <div className="flex flex-wrap justify-center gap-1">
                        <Button
                          size="sm"
                          variant="default"
                          className="bg-green-600 text-white hover:bg-green-700 disabled:opacity-70"
                          onClick={() => void handleReview(order, 'approve')}
                          disabled={isReviewing}
                        >
                          Setujui
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => void handleReview(order, 'reject')}
                          disabled={isReviewing}
                        >
                          Tolak
                        </Button>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {page > 1 || hasNext ? (
        <div className="mt-4 flex items-center justify-center gap-3">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => void load(page - 1)}
          >
            Sebelumnya
          </Button>
          <span className="text-sm text-muted-foreground">
            Halaman {page}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={!hasNext}
            onClick={() => void load(page + 1)}
          >
            Berikutnya
          </Button>
        </div>
      ) : null}
    </section>
  );
}
