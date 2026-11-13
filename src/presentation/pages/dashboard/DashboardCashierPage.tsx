import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router';
import { CashRegister } from '@phosphor-icons/react';
import { supabase } from '@/data/supabaseClient';

import { EmptyState, ErrorState, RowSkeleton } from '@/presentation/components/states';
import { formatDateTime, formatRupiah } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

interface QueueRow {
  id: string;
  status: string;
  payment_method: string;
  total_amount: number;
  created_at: string;
}

function startOfLocalDayIso(): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

/**
 * Dashboard role cashier (PLAN-UPDATE-v3 Tahap 3):
 * pintu masuk ke panel kasir, antrian "bayar di kasir", ringkasan shift.
 * Tanpa akses ke pengaturan, user, atau laporan penuh.
 */
export default function DashboardCashierPage() {
  const [queue, setQueue] = useState<QueueRow[]>([]);
  const [txCount, setTxCount] = useState<number | null>(null);
  const [cashTotal, setCashTotal] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: queueData, error: queueError } = await supabase
        .from('orders')
        .select('id,status,payment_method,total_amount,created_at')
        .eq('status', 'pending')
        .eq('payment_method', 'KASIR_CASH')
        .order('created_at', { ascending: true })
        .limit(20);
      if (queueError) throw queueError;
      setQueue(queueData ?? []);

      // Ringkasan shift hari ini: transaksi tunai yang dikonfirmasi kasir (status paid).
      const { data: paidData, error: paidError } = await supabase
        .from('orders')
        .select('total_amount')
        .eq('status', 'paid')
        .eq('payment_method', 'KASIR_CASH')
        .gte('paid_at', startOfLocalDayIso());
      if (paidError) throw paidError;
      setTxCount(paidData?.length ?? 0);
      setCashTotal((paidData ?? []).reduce((sum, row) => sum + row.total_amount, 0));
    } catch {
      setError('Data kasir tidak berhasil dimuat.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <section className="mx-auto max-w-4xl px-4 py-6">
      <h1 className="mb-4 font-display text-xl font-bold">Dashboard Kasir</h1>

      {/* Tombol utama ke panel kerja kasir. */}
      <Button asChild className="h-16 w-full text-lg">
        <Link to="/cashier">
          <CashRegister className="size-6" weight="duotone" />
          Buka Panel Kasir (scan / konfirmasi bayar)
        </Link>
      </Button>

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <Card className="rounded-lg">
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Transaksi tunai hari ini</p>
            <p className="font-display text-2xl font-bold">
              {txCount === null ? '-' : String(txCount)}
            </p>
            {/* <p className="text-xs text-muted-foreground">
              Sumber: pesanan status=paid, metode=KASIR_CASH, paid_at hari ini.
            </p> */}
          </CardContent>
        </Card>
        <Card className="rounded-lg">
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Total tunai terkonfirmasi</p>
            <p className="font-display text-2xl font-bold">
              {cashTotal === null ? '-' : formatRupiah(cashTotal)}
            </p>
            {/* <p className="text-xs text-muted-foreground">
              Sumber: sama dengan kartu sebelah (penjumlahan total_amount).
            </p> */}
          </CardContent>
        </Card>
      </div>

      <h2 id="antrian" className="mb-2 mt-8 scroll-mt-20 font-display text-lg font-semibold">
        Antrian bayar di kasir
      </h2>
      {loading ? (
        <RowSkeleton rows={3} />
      ) : error ? (
        <ErrorState message={error} onRetry={() => void load()} />
      ) : queue.length === 0 ? (
        <EmptyState message="Tidak ada pesanan yang menunggu pembayaran tunai." />
      ) : (
        <div className="flex flex-col gap-2">
          {queue.map((row) => (
            <Link
              key={row.id}
              to="/cashier"
              className="flex flex-wrap items-center gap-3 rounded-lg border bg-card px-4 py-3 transition-colors hover:bg-accent"
            >
              <span className="font-mono text-xs text-muted-foreground">
                {row.id.slice(0, 8)}
              </span>
              <span className="text-sm text-muted-foreground">
                {formatDateTime(row.created_at)}
              </span>
              <span className="text-sm text-muted-foreground">Tunai</span>
              <span className="ml-auto font-semibold">
                {formatRupiah(row.total_amount)}
              </span>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
