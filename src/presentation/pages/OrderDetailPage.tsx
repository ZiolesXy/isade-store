import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router';
import { QRCodeSVG } from 'qrcode.react';
import type { Order } from '@/domain/models/Order';
import { di } from '@/di';
import { useCheckout } from '@/presentation/hooks/useCheckout';
import { OrderStatusBadge, STATUS_LABEL } from '@/presentation/components/OrderStatusBadge';
import { ErrorState } from '@/presentation/components/states';
import { formatDateTime, formatRupiah } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';

const POLL_INTERVAL_MS = 5000;
const POLL_MAX_MS = 120000;

function statusMessage(order: Order, countdown: string): string {
  const expired = new Date(order.expiresAt).getTime() <= Date.now();

  switch (order.status) {
    case 'pending':
      if (order.paymentMethod === 'KASIR_CASH') {
        return 'Pesanan dibuat. Pembayaran tunai akan diverifikasi oleh kasir.';
      }
      if (expired) {
        return 'Waktu pembayaran sudah lewat. Status pesanan diperbarui saat Midtrans mengirim notifikasi kedaluwarsa.';
      }
      return `Menunggu pembayaran. ${countdown}`;
    case 'paid':
      return `Pembayaran diterima pada ${formatDateTime(order.paidAt ?? order.updatedAt)}.`;
    case 'expired':
      return 'Pesanan kedaluwarsa karena tidak dibayar sebelum jatuh tempo.';
    case 'cancelled':
      return 'Pesanan dibatalkan.';
    case 'failed':
      return 'Pembayaran gagal.';
    case 'needs_review':
      return 'Pesanan sedang ditinjau admin. Admin akan menghubuti kamu untuk tindak lanjut.';
  }
}

function remainingText(expiresAt: string): string {
  const ms = new Date(expiresAt).getTime() - Date.now();
  if (ms <= 0) return 'Waktu pembayaran sudah habis.';
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `Sisa waktu ${minutes}:${String(seconds).padStart(2, '0')}.`;
}

function DetailSkeleton() {
  return (
    <div className="mx-auto max-w-2xl space-y-4 px-4 py-6" aria-hidden="true">
      <Skeleton className="h-7 w-48" />
      <Skeleton className="h-16 w-full rounded-lg" />
      <Skeleton className="h-48 w-full rounded-lg" />
      <Skeleton className="h-24 w-full rounded-lg" />
    </div>
  );
}

export function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { openSnap } = useCheckout(di.checkoutGateway, di.midtransClientKey);

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pollActive, setPollActive] = useState(false);

  const pollStartRef = useRef<number>(Date.now());
  const pollMaxedRef = useRef(false);

  const load = useCallback(async () => {
    if (!id) return;
    setError(null);
    try {
      const loaded = await di.orderRepository.getById(id);
      setOrder(loaded);
      if (!loaded) setError('Pesanan tidak ditemukan atau bukan milikmu.');
    } catch {
      setError('Pesanan tidak berhasil dimuat.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  // Polling hanya untuk order pending: tiap 5 detik, maksimal 2 menit (PRD bagian 7.3 poin 5).
  // Setelah itu, tampilkan tombol muat ulang manual.
  useEffect(() => {
    if (!id || order?.status !== 'pending' || pollMaxedRef.current) return;

    const timer = setInterval(() => {
      void load();
      if (Date.now() - pollStartRef.current > POLL_MAX_MS) {
        pollMaxedRef.current = true;
        setPollActive(false);
      }
    }, POLL_INTERVAL_MS);

    setPollActive(true);
    return () => clearInterval(timer);
  }, [id, order?.status, load]);

  // Hitung mundur sisa waktu pembayaran untuk order pending WEB_MIDTRANS.
  const [countdown, setCountdown] = useState('');
  useEffect(() => {
    if (!order || order.status !== 'pending' || order.paymentMethod !== 'WEB_MIDTRANS') return;
    setCountdown(remainingText(order.expiresAt));
    const timer = setInterval(() => setCountdown(remainingText(order.expiresAt)), 1000);
    return () => clearInterval(timer);
  }, [order]);

  async function continuePayment() {
    if (!order?.snapToken) return;
    try {
      await openSnap(order.snapToken);
    } catch {
      toast.error('Pembayaran Midtrans tidak berhasil dibuka. Coba lagi.');
    }
  }

  if (loading) {
    return <DetailSkeleton />;
  }

  if (error || !order) {
    return (
      <section className="mx-auto max-w-2xl px-4 py-6">
        <ErrorState message={error ?? 'Pesanan tidak ditemukan.'} />
      </section>
    );
  }

  const canContinuePayment =
    order.status === 'pending' &&
    order.paymentMethod === 'WEB_MIDTRANS' &&
    !!order.snapToken &&
    new Date(order.expiresAt).getTime() > Date.now();

  return (
    <section className="mx-auto max-w-2xl px-4 py-6">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="font-display text-xl font-bold">Detail Pesanan</h1>
        <OrderStatusBadge status={order.status} />
      </div>
      <p className="mt-1 font-mono text-xs text-muted-foreground">Kode pesanan: {order.id}</p>

      {/* Focal point: status pembayaran. */}
      <div className="mt-4 rounded-lg border bg-card p-4" data-testid="order-status-message">
        <p className="font-semibold">
          {STATUS_LABEL[order.status]} &middot; {formatRupiah(order.totalAmount)}
        </p>
        <p className="mt-1 text-sm text-muted-foreground">{statusMessage(order, countdown)}</p>

        {order.status === 'pending' && order.paymentMethod === 'KASIR_CASH' ? (
          <div className="mt-3 flex flex-col items-center gap-2 rounded-md bg-muted px-3 py-3">
            <div className="rounded-md bg-white p-2">
              {/* QR berisi order_id agar kasir cukup memindai lewat halaman Kasir (Kamera). */}
              <QRCodeSVG
                value={order.id}
                size={160}
                level="M"
                marginSize={2}
                title={`QR Code pesanan ${order.id}`}
                aria-label={`QR Code pesanan ${order.id}`}
              />
            </div>
            <p className="font-mono text-xs">{order.id}</p>
            <p className="text-center text-sm text-muted-foreground">
              Tunjukkan QR Code ini kepada kasir untuk pembayaran tunai.
            </p>
          </div>
        ) : null}

        {canContinuePayment ? (
          <div className="mt-3">
            <Button
              className="bg-cta text-cta-foreground hover:bg-cta/90"
              onClick={() => void continuePayment()}
            >
              Lanjutkan Pembayaran
            </Button>
          </div>
        ) : null}

        {order.status === 'pending' && !pollActive ? (
          <Button
            variant="outline"
            size="sm"
            className="mt-3"
            onClick={() => {
              pollStartRef.current = Date.now();
              pollMaxedRef.current = false;
              setPollActive(true);
              void load();
            }}
          >
            Muat ulang
          </Button>
        ) : null}
      </div>

      <div className="mt-4 rounded-lg border bg-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50 text-left">
              <th className="px-4 py-2 font-medium">Produk</th>
              <th className="px-2 py-2 text-center font-medium">Jumlah</th>
              <th className="px-4 py-2 text-right font-medium">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            {order.items.map((item) => (
              <tr key={item.id} className="border-b last:border-0">
                <td className="px-4 py-2">
                  <p className="font-medium">{item.titleSnapshot}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatRupiah(item.unitPrice)} per item
                  </p>
                </td>
                <td className="px-2 py-2 text-center">{item.quantity}</td>
                <td className="px-4 py-2 text-right">{formatRupiah(item.lineTotal)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <dl className="flex flex-col gap-1 p-4 text-sm">
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Subtotal</dt>
            <dd>{formatRupiah(order.subtotal)}</dd>
          </div>
          <div className="flex justify-between border-t pt-2 font-semibold">
            <dt>Total</dt>
            <dd>{formatRupiah(order.totalAmount)}</dd>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Metode pembayaran:{' '}
            {order.paymentMethod === 'WEB_MIDTRANS'
              ? 'Bayar di Web (Midtrans)'
              : order.paymentType
                ? `Bayar di Web (Midtrans, ${order.paymentType})`
                : 'Bayar di Kasir (Cash)'}
          </p>
          <p className="mt-2 text-xs text-muted-foreground">
            Pesanan dibuat {formatDateTime(order.createdAt)} &middot; Pengumuman status selalu dibaca
            dari database, bukan dari notifikasi browser.
          </p>
          <div className="mt-2">
            <Button asChild variant="outline" size="sm">
              <Link to="/orders">Semua pesanan</Link>
            </Button>
          </div>
        </dl>
      </div>
    </section>
  );
}
