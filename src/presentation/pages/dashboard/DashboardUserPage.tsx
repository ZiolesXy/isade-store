import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router';
import { ArrowRight, CashRegister, CreditCard } from '@phosphor-icons/react';
import type { Order } from '@/domain/models/Order';
import { di } from '@/di';
import { useAuthStore } from '@/presentation/stores/useAuthStore';
import { isMidtransEnabled } from '@/lib/config';
import { OrderStatusBadge } from '@/presentation/components/OrderStatusBadge';
import { EmptyState, ErrorState, RowSkeleton } from '@/presentation/components/states';
import { formatDateTime, formatRupiah } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useCheckout } from '@/presentation/hooks/useCheckout';
import { toast } from 'sonner';

/**
 * Dashboard role user (PLAN-UPDATE-v3 Tahap 3):
 * pesanan aktif paling atas dengan aksi bayar/tunjukkan QR, lalu riwayat.
 */
export default function DashboardUserPage() {
  const userId = useAuthStore((s) => s.userId);
  const { openSnap } = useCheckout(di.checkoutGateway, di.midtransClientKey);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [payingId, setPayingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!userId) {
      setError('Sesi tidak valid. Silakan login lagi.');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      setOrders(await di.orderRepository.listMine(1, 50, userId));
    } catch {
      setError('Pesanan tidak berhasil dimuat.');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function payNow(order: Order) {
    if (!order.snapToken || payingId) return;
    setPayingId(order.id);
    try {
      await openSnap(order.snapToken);
    } catch {
      toast.error('Pembayaran Midtrans tidak berhasil dibuka. Coba lagi.');
    } finally {
      setPayingId(null);
    }
  }

  const activeOrders = orders.filter((o) => o.status === 'pending');
  const history = orders.filter((o) => o.status !== 'pending');

  return (
    <section className="mx-auto max-w-6xl px-4 py-6">
      <h1 className="mb-4 font-display text-xl font-bold">Dashboard</h1>

      <h2 className="mb-2 font-display text-lg font-semibold">Pesanan aktif</h2>
      {loading ? (
        <RowSkeleton rows={2} />
      ) : error ? (
        <ErrorState message={error} onRetry={() => void load()} />
      ) : activeOrders.length === 0 ? (
        <EmptyState
          message="Tidak ada pesanan yang menunggu pembayaran."
          action={
            <Button asChild variant="outline">
              <Link to="/katalog">Belanja di katalog</Link>
            </Button>
          }
        />
      ) : (
        <div className="flex flex-col gap-2">
          {activeOrders.map((order) => (
            <Card key={order.id} className="rounded-lg">
              <CardContent className="flex flex-wrap items-center gap-3 p-4">
                <span className="font-mono text-xs text-muted-foreground">
                  {order.id.slice(0, 8)}
                </span>
                <OrderStatusBadge status={order.status} />
                <span className="text-sm text-muted-foreground">
                  {formatDateTime(order.createdAt)}
                </span>
                <span className="font-semibold">{formatRupiah(order.totalAmount)}</span>
                <div className="ml-auto flex flex-wrap gap-2">
                  {order.paymentMethod === 'WEB_MIDTRANS' &&
                  isMidtransEnabled &&
                  order.snapToken ? (
                    <Button
                      className="bg-cta text-cta-foreground hover:bg-cta/90"
                      disabled={payingId === order.id}
                      onClick={() => void payNow(order)}
                    >
                      <CreditCard className="size-4" weight="duotone" />
                      {payingId === order.id ? 'Membuka...' : 'Bayar sekarang'}
                    </Button>
                  ) : null}
                  <Button asChild variant="outline">
                    <Link to={`/akun/pesanan/${order.id}`}>
                      <CashRegister className="size-4" weight="duotone" />
                      Tunjukkan ke kasir
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <h2 className="mb-2 mt-8 font-display text-lg font-semibold">Riwayat pesanan</h2>
      {!loading && !error ? (
        history.length === 0 ? (
          <EmptyState message="Belum ada pesanan selesai." />
        ) : (
          <div className="flex flex-col gap-2">
            {history.slice(0, 10).map((order) => (
              <Link
                key={order.id}
                to={`/akun/pesanan/${order.id}`}
                className="flex flex-wrap items-center gap-3 rounded-lg border bg-card px-4 py-3 transition-colors hover:bg-accent"
              >
                <span className="font-mono text-xs text-muted-foreground">
                  {order.id.slice(0, 8)}
                </span>
                <span className="text-sm text-muted-foreground">
                  {formatDateTime(order.createdAt)}
                </span>
                <OrderStatusBadge status={order.status} />
                <span className="ml-auto font-semibold">
                  {formatRupiah(order.totalAmount)}
                </span>
                <ArrowRight className="size-4 text-muted-foreground" />
              </Link>
            ))}
          </div>
        )
      ) : null}

      <div className="mt-6">
        <Button asChild variant="outline" size="sm">
          <Link to="/akun">Profil dan pengaturan akun</Link>
        </Button>
      </div>
    </section>
  );
}
