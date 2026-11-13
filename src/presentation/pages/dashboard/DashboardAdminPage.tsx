import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router';
import {
  ArrowRight,
  CashRegister,
  ClipboardText,
  Gear,
  Package,
  Users,
} from '@phosphor-icons/react';
import { supabase } from '@/data/supabaseClient';
import { isMidtransEnabled } from '@/lib/config';
import { EmptyState, ErrorState, RowSkeleton } from '@/presentation/components/states';
import { formatDateTime, formatRupiah } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

type OrderStatusValues = 'pending' | 'needs_review' | 'failed' | 'expired';

interface PaidRow {
  total_amount: number;
  payment_method: string;
  paid_at: string | null;
}

interface CashierEvent {
  order_id: string;
  transaction_status: string | null;
  received_at: string;
}

interface AdminData {
  paid: PaidRow[];
  problems: Record<OrderStatusValues, number>;
  topProducts: Array<{ productId: string; title: string; qty: number }>;
  cashierEvents: CashierEvent[];
}

const PROBLEM_STATUSES: OrderStatusValues[] = [
  'pending',
  'needs_review',
  'failed',
  'expired',
];

function periodStartIso(kind: 'today' | 'week' | 'month'): string {
  const now = new Date();
  if (kind === 'today') {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    return d.toISOString();
  }
  if (kind === 'week') {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6);
    return d.toISOString();
  }
  return new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
}

/**
 * Dashboard role admin (PLAN-UPDATE-v3 Tahap 3).
 * Setiap kartu mencantumkan sumber query-nya agar angka bisa ditelusuri.
 */
export default function DashboardAdminPage() {
  const [data, setData] = useState<AdminData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const monthStart = periodStartIso('month');

      // Sumber kartu penjualan + perbandingan metode: pesanan lunas bulan ini.
      const { data: paid, error: paidError } = await supabase
        .from('orders')
        .select('total_amount,payment_method,paid_at')
        .eq('status', 'paid')
        .gte('paid_at', monthStart);
      if (paidError) throw paidError;

      // Sumber kartu pembayaran bermasalah/tertunda: hitung per status.
      const { data: problemRows, error: problemError } = await supabase
        .from('orders')
        .select('status')
        .in('status', PROBLEM_STATUSES);
      if (problemError) throw problemError;

      // Sumber produk terlaris: item pesanan lunas bulan ini.
      const { data: itemRows, error: itemError } = await supabase
        .from('order_items')
        .select('product_id,title_snapshot,quantity,orders!inner(status,paid_at)')
        .eq('orders.status', 'paid')
        .gte('orders.paid_at', monthStart);
      if (itemError) throw itemError;

      // Aktivitas kasir terbaru: payment_events dari sumber cashier.
      const { data: events, error: eventsError } = await supabase
        .from('payment_events')
        .select('order_id,transaction_status,received_at')
        .eq('source', 'cashier')
        .order('received_at', { ascending: false })
        .limit(6);
      if (eventsError) throw eventsError;

      const perProduct = new Map<string, { title: string; qty: number }>();
      for (const row of itemRows ?? []) {
        const entry = perProduct.get(row.product_id) ?? {
          title: row.title_snapshot,
          qty: 0,
        };
        entry.qty += row.quantity;
        perProduct.set(row.product_id, entry);
      }

      const problems = { pending: 0, needs_review: 0, failed: 0, expired: 0 };
      for (const row of problemRows ?? []) {
        const key = row.status as OrderStatusValues;
        if (key in problems) problems[key] += 1;
      }

      setData({
        paid: paid ?? [],
        problems,
        topProducts: [...perProduct.entries()]
          .map(([productId, v]) => ({ productId, ...v }))
          .sort((a, b) => b.qty - a.qty)
          .slice(0, 5),
        cashierEvents: events ?? [],
      });
    } catch {
      setError('Data dashboard tidak berhasil dimuat.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  function salesFor(kind: 'today' | 'week' | 'month'): {
    count: number;
    total: number;
  } {
    const start = new Date(periodStartIso(kind)).getTime();
    const rows = (data?.paid ?? []).filter(
      (r) => r.paid_at !== null && new Date(r.paid_at).getTime() >= start
    );
    return {
      count: rows.length,
      total: rows.reduce((sum, r) => sum + r.total_amount, 0),
    };
  }

  function methodSplit(): { midtrans: number; cash: number } {
    let midtrans = 0;
    let cash = 0;
    for (const r of data?.paid ?? []) {
      if (r.payment_method === 'WEB_MIDTRANS') midtrans += 1;
      else cash += 1;
    }
    return { midtrans, cash };
  }

  const view = data;

  const shortcuts: Array<{ to: string; label: string; icon: typeof Package }> = [
    { to: '/produk', label: 'Kelola Produk', icon: Package },
    { to: '/cashier', label: 'Panel Kasir', icon: CashRegister },
    { to: '/users', label: 'Kelola User', icon: Users },
    { to: '/setting', label: 'Setting', icon: Gear },
  ];

  return (
    <section className="mx-auto max-w-6xl px-4 py-6">
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <h1 className="font-display text-xl font-bold">Dashboard Admin</h1>
        <Button
          variant="outline"
          size="sm"
          className="ml-auto"
          onClick={() => void load()}
        >
          Muat ulang
        </Button>
      </div>

      {loading ? (
        <RowSkeleton rows={5} />
      ) : error ? (
        <ErrorState message={error} onRetry={() => void load()} />
      ) : view ? (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            {(
              [
                { key: 'today', label: 'Hari ini' },
                { key: 'week', label: '7 hari' },
                { key: 'month', label: 'Bulan ini' },
              ] as const
            ).map((p) => {
              const s = salesFor(p.key);
              return (
                <Card key={p.key} className="rounded-lg">
                  <CardContent className="p-4">
                    <p className="text-sm text-muted-foreground">
                      Penjualan lunas {p.label}
                    </p>
                    <p className="font-display text-2xl font-bold">
                      {formatRupiah(s.total)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {s.count} transaksi &middot; sumber: orders status=paid,
                      paid_at periode ini
                    </p>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <Card className="rounded-lg">
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <ClipboardText className="size-5 text-primary" weight="duotone" />
                  <p className="font-semibold">Pembayaran tertunda &amp; bermasalah</p>
                </div>
                <ul className="mt-2 flex flex-col gap-1 text-sm">
                  <li>Menunggu bayar: {view.problems.pending}</li>
                  <li>Perlu ditinjau: {view.problems.needs_review}</li>
                  <li>Gagal: {view.problems.failed}</li>
                  <li>Kedaluwarsa: {view.problems.expired}</li>
                </ul>
                {/* <p className="mt-1 text-xs text-muted-foreground">
                  Sumber: orders per status (pending, needs_review, failed, expired).
                </p> */}
                <Button asChild variant="outline" size="sm" className="mt-3">
                  <Link to="/tinjau-pembayaran">
                    Tinjau pembayaran
                    <ArrowRight className="size-4" weight="duotone" />
                  </Link>
                </Button>
              </CardContent>
            </Card>

            {isMidtransEnabled ? (
              <Card className="rounded-lg">
                <CardContent className="p-4">
                  <p className="font-semibold">Midtrans vs Kasir (lunas, bulan ini)</p>
                  <ul className="mt-2 flex flex-col gap-1 text-sm">
                    <li>Midtrans: {methodSplit().midtrans} transaksi</li>
                    <li>Kasir (tunai): {methodSplit().cash} transaksi</li>
                  </ul>
                  {/* <p className="mt-1 text-xs text-muted-foreground">
                    Sumber: orders status=paid, payment_method bulan ini.
                  </p> */}
                </CardContent>
              </Card>
            ) : (
              <Card className="rounded-lg">
                <CardContent className="p-4">
                  <p className="font-semibold">Midtrans nonaktif</p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Semua pembayaran berjalan lewat kasir. Status diatur lewat env
                    ENABLE_MIDTRANS.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>

          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <Card className="rounded-lg">
              <CardContent className="p-4">
                <p className="font-semibold">Produk terlaris (bulan ini)</p>
                {view.topProducts.length === 0 ? (
                  <EmptyState message="Belum ada penjualan bulan ini." />
                ) : (
                  <ol className="mt-2 flex flex-col gap-1 text-sm">
                    {view.topProducts.map((p) => (
                      <li key={p.productId} className="flex justify-between gap-2">
                        <span className="line-clamp-1">{p.title}</span>
                        <span className="shrink-0 text-muted-foreground">
                          {p.qty} terjual
                        </span>
                      </li>
                    ))}
                  </ol>
                )}
                {/* <p className="mt-1 text-xs text-muted-foreground">
                  Sumber: order_items dari orders status=paid bulan ini.
                </p> */}
              </CardContent>
            </Card>

            <Card className="rounded-lg">
              <CardContent className="p-4">
                <p className="font-semibold">Aktivitas kasir terbaru</p>
                {view.cashierEvents.length === 0 ? (
                  <EmptyState message="Belum ada verifikasi kasir." />
                ) : (
                  <ul className="mt-2 flex flex-col gap-1 text-sm">
                    {view.cashierEvents.map((e) => (
                      <li key={`${e.order_id}-${e.received_at}`} className="flex justify-between gap-2">
                        <span className="font-mono text-xs">{e.order_id.slice(0, 8)}</span>
                        <span>{e.transaction_status ?? '-'}</span>
                        <span className="text-muted-foreground">
                          {formatDateTime(e.received_at)}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
                {/* <p className="mt-1 text-xs text-muted-foreground">
                  Sumber: payment_events source=cashier (terbaru dulu).
                </p> */}
              </CardContent>
            </Card>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {shortcuts.map((s) => (
              <Button key={s.to} asChild variant="outline" size="sm">
                <Link to={s.to}>
                  <s.icon className="size-4" weight="duotone" />
                  {s.label}
                </Link>
              </Button>
            ))}
          </div>
        </>
      ) : null}
    </section>
  );
}
