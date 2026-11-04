import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router';
import type { Order } from '@/domain/models/Order';
import { di } from '@/di';
import { OrderStatusBadge } from '@/presentation/components/OrderStatusBadge';
import { EmptyState, ErrorState, RowSkeleton } from '@/presentation/components/states';
import { formatDateTime, formatRupiah } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { CaretLeft, CaretRight } from '@phosphor-icons/react';

const PAGE_SIZE = 10;

export function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [page, setPage] = useState(1);
  const [hasNext, setHasNext] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (targetPage: number) => {
    setLoading(true);
    setError(null);
    try {
      // Minta satu baris ekstra untuk mengetahui ada halaman berikutnya.
      const rows = await di.orderRepository.listMine(targetPage, PAGE_SIZE + 1);
      setHasNext(rows.length > PAGE_SIZE);
      setOrders(rows.slice(0, PAGE_SIZE));
      setPage(targetPage);
    } catch {
      setError('Pesanan tidak berhasil dimuat.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(1);
  }, [load]);

  return (
    <section className="mx-auto max-w-6xl px-4 py-6">
      <h1 className="mb-4 font-display text-xl font-bold">Pesanan Saya</h1>

      {loading ? (
        <RowSkeleton rows={3} />
      ) : error ? (
        <ErrorState message={error} onRetry={() => void load(1)} />
      ) : orders.length === 0 ? (
        <EmptyState message="Belum ada pesanan." />
      ) : (
        <div className="flex flex-col gap-2">
          {orders.map((order) => (
            <Link
              key={order.id}
              to={`/orders/${order.id}`}
              className="flex flex-wrap items-center gap-3 rounded-lg border bg-card px-4 py-3 transition-colors hover:bg-accent"
            >
              <span className="font-mono text-xs text-muted-foreground">
                {order.id.slice(0, 8)}
              </span>
              <span className="text-sm text-muted-foreground">
                {formatDateTime(order.createdAt)}
              </span>
              <OrderStatusBadge status={order.status} />
              <span className="text-sm text-muted-foreground">
                {order.items.length} item
              </span>
              <span className="ml-auto font-semibold">{formatRupiah(order.totalAmount)}</span>
            </Link>
          ))}
        </div>
      )}

      {!loading && !error && (page > 1 || hasNext) ? (
        <div className="mt-4 flex items-center justify-center gap-3">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => void load(page - 1)}
          >
            <CaretLeft className="size-4" weight="bold" /> Sebelumnya
          </Button>
          <span className="text-sm text-muted-foreground">Halaman {page}</span>
          <Button
            variant="outline"
            size="sm"
            disabled={!hasNext}
            onClick={() => void load(page + 1)}
          >
            Berikutnya <CaretRight className="size-4" weight="bold" />
          </Button>
        </div>
      ) : null}
    </section>
  );
}
