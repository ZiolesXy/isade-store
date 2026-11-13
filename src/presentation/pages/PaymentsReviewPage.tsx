import { useCallback, useEffect, useState } from 'react';
import type { Database } from '@/data/database.types';
import { supabase } from '@/data/supabaseClient';
import { useCashier } from '@/presentation/hooks/useCashier';
import { OrderStatusBadge } from '@/presentation/components/OrderStatusBadge';
import { EmptyState, ErrorState, RowSkeleton } from '@/presentation/components/states';
import { formatDateTime, formatRupiah } from '@/lib/format';
import { hasRole } from '@/lib/roles';
import { useAuthStore } from '@/presentation/stores/useAuthStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { toast } from 'sonner';
import type { Order } from '@/domain/models/Order';

type OrderRow = Database['public']['Tables']['orders']['Row'];
type PaymentEventRow = Database['public']['Tables']['payment_events']['Row'];

type ReviewAction = 'approve' | 'reject';

type TabKey = 'needs_review' | 'pending' | 'failed' | 'expired' | 'cashier_paid';

const TABS: Array<{ key: TabKey; label: string }> = [
  { key: 'needs_review', label: 'Perlu Ditinjau' },
  { key: 'pending', label: 'Menunggu' },
  { key: 'failed', label: 'Gagal' },
  { key: 'expired', label: 'Kedaluwarsa' },
  { key: 'cashier_paid', label: 'Dikonfirmasi Kasir' },
];

const PAGE_SIZE = 15;

function orderFromRow(row: OrderRow): Order {
  return {
    id: row.id,
    userId: row.user_id,
    status: row.status as Order['status'],
    subtotal: row.subtotal,
    totalAmount: row.total_amount,
    paymentMethod: row.payment_method as Order['paymentMethod'],
    idempotencyKey: row.idempotency_key,
    snapToken: row.snap_token,
    snapRedirectUrl: row.snap_redirect_url,
    paymentType: row.payment_type,
    midtransTransactionId: row.midtrans_transaction_id,
    expiresAt: row.expires_at,
    paidAt: row.paid_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    items: [],
  };
}

interface ReviewRow {
  order: Order;
  userId: string;
}

/**
 * /tinjau-pembayaran (admin, PLAN-UPDATE-v3 Tahap 3): daftar pembayaran
 * dengan filter status, detail transaksi (payment_events = catatan audit
 * siapa/kapan), aksi setujui/tolak.
 */
export function PaymentsReviewPage() {
  const { verifyPayment } = useCashier();
  const role = useAuthStore((s) => s.role);
  const canReview = hasRole(role, 'cashier');

  const [tab, setTab] = useState<TabKey>('needs_review');
  const [rows, setRows] = useState<ReviewRow[]>([]);
  const [page, setPage] = useState(1);
  const [hasNext, setHasNext] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [detail, setDetail] = useState<{ order: Order; events: PaymentEventRow[] } | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [catatan, setCatatan] = useState('');

  const load = useCallback(async (targetPage: number, activeTab: TabKey) => {
    setLoading(true);
    setError(null);
    try {
      const from = (targetPage - 1) * PAGE_SIZE;
      const to = from + PAGE_SIZE;
      let query = supabase
        .from('orders')
        .select('id,user_id,status,subtotal,total_amount,payment_method,idempotency_key,snap_token,snap_redirect_url,payment_type,midtrans_transaction_id,expires_at,paid_at,created_at,updated_at');
      if (activeTab === 'cashier_paid') {
        query = query.eq('status', 'paid').eq('payment_method', 'KASIR_CASH');
      } else {
        query = query.eq('status', activeTab);
      }
      const { data, error: queryError } = await query
        .order('created_at', { ascending: false })
        .range(from, to);
      if (queryError) throw queryError;

      setHasNext((data ?? []).length > PAGE_SIZE);
      setRows(
        (data ?? []).slice(0, PAGE_SIZE).map((row) => ({
          order: orderFromRow(row as OrderRow),
          userId: (row as OrderRow).user_id,
        }))
      );
      setPage(targetPage);
    } catch {
      setError('Daftar pembayaran tidak berhasil dimuat.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(1, tab);
  }, [load, tab]);

  async function openDetail(order: Order) {
    setDetailLoading(true);
    setCatatan('');
    try {
      const { data, error: eventsError } = await supabase
        .from('payment_events')
        .select('*')
        .eq('order_id', order.id)
        .order('received_at', { ascending: false });
      if (eventsError) throw eventsError;
      setDetail({ order, events: data ?? [] });
    } catch {
      toast.error('Detail transaksi tidak berhasil dimuat.');
    } finally {
      setDetailLoading(false);
    }
  }

  async function handleReview(order: Order, action: ReviewAction) {
    if (!canReview || busyId) return;
    setBusyId(order.id);
    try {
      await verifyPayment({
        orderId: order.id,
        result: action === 'approve' ? 'paid' : 'failed',
        catatan: catatan.trim() || undefined,
      });
      toast.success(
        action === 'approve'
          ? 'Pembayaran disetujui dan ditandai dibayar.'
          : 'Pembayaran ditolak dan ditandai gagal.'
      );
      setDetail(null);
      await load(page, tab);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Tinjauan gagal.';
      toast.error(message);
    } finally {
      setBusyId(null);
    }
  }

  const activeTabLabel = TABS.find((t) => t.key === tab)?.label ?? '';

  return (
    <section className="mx-auto max-w-5xl px-4 py-6">
      <h1 className="mb-4 font-display text-xl font-bold">Tinjau Pembayaran</h1>

      <div className="mb-4 flex flex-wrap gap-2" role="tablist" aria-label="Filter status pembayaran">
        {TABS.map((t) => (
          <Button
            key={t.key}
            size="sm"
            variant={tab === t.key ? 'default' : 'outline'}
            aria-pressed={tab === t.key}
            onClick={() => setTab(t.key)}
          >
            {t.label}
          </Button>
        ))}
      </div>

      <p className="mb-4 text-sm text-muted-foreground">
        Daftar pembayaran dengan status {activeTabLabel.toLowerCase()}. Buka detail untuk
        melihat catatan audit (payment_events: sumber, status, siapa/kapan).
      </p>

      {loading ? (
        <RowSkeleton rows={4} />
      ) : error ? (
        <ErrorState message={error} onRetry={() => void load(1, tab)} />
      ) : rows.length === 0 ? (
        <EmptyState message="Tidak ada pembayaran dengan status ini." />
      ) : (
        <div className="overflow-x-auto rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Kode</TableHead>
                <TableHead className="text-left">Pelanggan</TableHead>
                <TableHead className="text-left">Metode</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead>Dibuat</TableHead>
                <TableHead className="text-center">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map(({ order, userId }) => (
                <TableRow key={order.id}>
                  <TableCell className="font-mono text-xs">{order.id.slice(0, 8)}</TableCell>
                  <TableCell className="text-sm">{userId.slice(0, 8)}</TableCell>
                  <TableCell className="text-sm">
                    {order.paymentMethod === 'WEB_MIDTRANS' ? 'Midtrans' : 'Tunai (Kasir)'}
                  </TableCell>
                  <TableCell>
                    <OrderStatusBadge status={order.status} />
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {formatRupiah(order.totalAmount)}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-sm">
                    {formatDateTime(order.createdAt)}
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex flex-wrap justify-center gap-1">
                      <Button size="sm" variant="outline" onClick={() => void openDetail(order)}>
                        Detail
                      </Button>
                      {tab === 'needs_review' && canReview ? (
                        <>
                          <Button
                            size="sm"
                            className="bg-green-600 text-white hover:bg-green-700"
                            disabled={busyId === order.id}
                            onClick={() => void handleReview(order, 'approve')}
                          >
                            {busyId === order.id ? 'Memproses…' : 'Setujui'}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={busyId === order.id}
                            onClick={() => void handleReview(order, 'reject')}
                          >
                            Tolak
                          </Button>
                        </>
                      ) : null}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {page > 1 || hasNext ? (
        <div className="mt-4 flex items-center justify-center gap-3">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => void load(page - 1, tab)}
          >
            Sebelumnya
          </Button>
          <span className="text-sm text-muted-foreground">Halaman {page}</span>
          <Button
            variant="outline"
            size="sm"
            disabled={!hasNext}
            onClick={() => void load(page + 1, tab)}
          >
            Berikutnya
          </Button>
        </div>
      ) : null}

      <Dialog open={detail !== null || detailLoading} onOpenChange={(open) => !open && setDetail(null)}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              Detail Pembayaran {detail ? detail.order.id.slice(0, 8) : ''}
            </DialogTitle>
          </DialogHeader>
          {detail ? (
            <div className="flex flex-col gap-4 text-sm">
              <div className="flex flex-wrap items-center gap-2">
                <OrderStatusBadge status={detail.order.status} />
                <span className="font-semibold">
                  {formatRupiah(detail.order.totalAmount)}
                </span>
                <span className="text-muted-foreground">
                  {detail.order.paymentMethod === 'WEB_MIDTRANS' ? 'Midtrans' : 'Tunai (Kasir)'}
                </span>
                {detail.order.midtransTransactionId ? (
                  <span className="font-mono text-xs text-muted-foreground">
                    Midtrans: {detail.order.midtransTransactionId}
                  </span>
                ) : null}
              </div>

              <div className="overflow-x-auto rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Sumber</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Diterima</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {detail.events.map((e) => (
                      <TableRow key={e.id}>
                        <TableCell>{e.source}</TableCell>
                        <TableCell>{e.transaction_status ?? '-'}</TableCell>
                        <TableCell className="whitespace-nowrap text-xs">
                          {formatDateTime(e.received_at)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <p className="text-xs text-muted-foreground">
                payment_events adalah catatan audit: setiap perubahan tercatat dengan
                sumber (webhook/cashier/system), status, dan waktu.
              </p>

              {tab === 'needs_review' && canReview ? (
                <div className="flex flex-col gap-2 border-t pt-3">
                  <Label htmlFor="review-catatan">Catatan tinjauan (opsional)</Label>
                  <Input
                    id="review-catatan"
                    value={catatan}
                    onChange={(e) => setCatatan(e.target.value)}
                    placeholder="Misal: bukti transfer diperiksa, nominal sesuai"
                  />
                  <div className="flex flex-wrap gap-2">
                    <Button
                      className="bg-green-600 text-white hover:bg-green-700"
                      disabled={busyId === detail.order.id}
                      onClick={() => void handleReview(detail.order, 'approve')}
                    >
                      Setujui (ditandai dibayar)
                    </Button>
                    <Button
                      variant="outline"
                      disabled={busyId === detail.order.id}
                      onClick={() => void handleReview(detail.order, 'reject')}
                    >
                      Tolak (ditandai gagal)
                    </Button>
                  </div>
                </div>
              ) : null}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Memuat detail...</p>
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
}
