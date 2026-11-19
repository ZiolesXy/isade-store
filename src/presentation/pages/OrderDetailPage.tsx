import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router';
import { QRCodeSVG } from 'qrcode.react';
import type { Order } from '@/domain/models/Order';
import { di } from '@/di';
import { supabase } from '@/data/supabaseClient';
import { useCheckout } from '@/presentation/hooks/useCheckout';
import { OrderStatusBadge, STATUS_LABEL } from '@/presentation/components/OrderStatusBadge';
import { ErrorState } from '@/presentation/components/states';
import { formatDateTime, formatRupiah } from '@/lib/format';
import { orderNotes, paymentSourceLabel, type OrderNoteRow } from '@/lib/paymentEvents';
import { hasRole } from '@/lib/roles';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { useAuthStore } from '@/presentation/stores/useAuthStore';

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

function qrHelperText(order: Order): string {
  const expired = new Date(order.expiresAt).getTime() <= Date.now();

  switch (order.status) {
    case 'pending':
      if (order.paymentMethod === 'KASIR_CASH') {
        return 'Tunjukkan QR Code ini kepada kasir untuk pembayaran tunai.';
      }
      if (expired) {
        return 'Waktu pembayaran web sudah lewat. Tunjukkan QR Code ini ke kasir untuk pengecekan pesanan.';
      }
      return 'Selesaikan pembayaran lewat web. QR Code ini juga bisa ditunjukkan ke kasir untuk pengecekan status.';
    case 'paid':
      return 'Pembayaran sudah diterima. QR Code tetap tersedia untuk pengecekan di kasir.';
    default:
      return 'QR Code ini berisi kode pesanan dan tetap bisa dipindai di kasir untuk pengecekan.';
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

function noteStatusLabel(status: string | null): string {
  if (!status) return '-';
  return (STATUS_LABEL as Record<string, string>)[status] ?? status;
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
  const { userId, role } = useAuthStore();

  const [order, setOrder] = useState<Order | null>(null);
  const [notes, setNotes] = useState<OrderNoteRow[]>([]);
  const [ownerName, setOwnerName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pollActive, setPollActive] = useState(false);

  const pollStartRef = useRef<number>(Date.now());
  const pollMaxedRef = useRef(false);

  const load = useCallback(async () => {
    if (!id) return;
    setError(null);
    if (!userId) {
      setError('Sesi tidak valid. Silakan login lagi.');
      setLoading(false);
      return;
    }
    try {
      // User biasa hanya boleh lihat pesanan sendiri; admin/kasir boleh lihat semua.
      const isOwnOnly = !hasRole(role, 'cashier');
      const loaded = await di.orderRepository.getById(id, isOwnOnly ? userId : undefined);
      setOrder(loaded);
      if (!loaded) {
        setNotes([]);
        setOwnerName(null);
        setError('Pesanan tidak ditemukan atau bukan milikmu.');
        return;
      }

      // Catatan kasir/admin diambil lewat RPC khusus (bukan payload mentah).
      const { data: noteRows, error: notesError } = await supabase.rpc('list_order_notes', {
        p_order_id: id,
      });
      setNotes(notesError ? [] : orderNotes(noteRows ?? []));

      // Admin/kasir melihat detail pesanan orang lain: tampilkan pemiliknya.
      if (hasRole(role, 'cashier') && loaded.userId !== userId) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', loaded.userId)
          .maybeSingle();
        setOwnerName(profile?.full_name ?? null);
      } else {
        setOwnerName(null);
      }
    } catch {
      setError('Pesanan tidak berhasil dimuat.');
    } finally {
      setLoading(false);
    }
  }, [id, userId, role]);

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
      {hasRole(role, 'cashier') ? (
        <p className="mt-1 text-sm text-muted-foreground">
          Pemilik pesanan: {ownerName?.trim() || '(tanpa nama)'}{' '}
          <span className="font-mono text-xs">({order.userId.slice(0, 8)})</span>
        </p>
      ) : null}

      {/* Focal point: status pembayaran. */}
      <div className="mt-4 rounded-lg border bg-card p-4" data-testid="order-status-message">
        <p className="font-semibold">
          {STATUS_LABEL[order.status]} &middot; {formatRupiah(order.totalAmount)}
        </p>
        <p className="mt-1 text-sm text-muted-foreground">{statusMessage(order, countdown)}</p>

        {/* QR berisi order_id: kasir cukup memindai lewat halaman Kasir (Kamera).
            Selalu tampil — untuk pembayaran tunai maupun pesanan yang dibayar lewat web. */}
        <div className="mt-3 flex flex-col items-center gap-2 rounded-md bg-muted px-3 py-3">
          <div className="rounded-md bg-white p-2">
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
          <p className="text-center text-sm text-muted-foreground">{qrHelperText(order)}</p>
        </div>

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

      {notes.length > 0 ? (
        <div className="mt-4 rounded-lg border bg-card p-4" data-testid="order-notes">
          <h2 className="font-display text-base font-semibold">Catatan Pembayaran</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Catatan dari kasir/admin saat memverifikasi pesanan ini.
          </p>
          <ul className="mt-3 flex flex-col gap-2">
            {notes.map((note) => (
              <li key={note.id} className="rounded-md border bg-muted/30 p-3">
                <p className="whitespace-pre-wrap text-sm">{note.catatan}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {paymentSourceLabel(note.source)} &middot;{' '}
                  {noteStatusLabel(note.transaction_status)} &middot;{' '}
                  {formatDateTime(note.received_at)}
                </p>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

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
            Pesanan dibuat {formatDateTime(order.createdAt)}
          </p>
          <div className="mt-2">
            <Button asChild variant="outline" size="sm">
              <Link to="/dashboard">Ke dashboard</Link>
            </Button>
          </div>
        </dl>
      </div>
    </section>
  );
}
