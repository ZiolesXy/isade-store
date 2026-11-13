import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router';
import { CashRegister } from '@phosphor-icons/react';
import { supabase } from '@/data/supabaseClient';

import { ErrorState } from '@/presentation/components/states';
import { formatRupiah } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

function startOfLocalDayIso(): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

/**
 * Dashboard role cashier (PLAN-UPDATE-v3 Tahap 3):
 * pintu masuk ke panel kasir dan ringkasan shift.
 * Tanpa akses ke pengaturan, user, atau laporan penuh.
 */
export default function DashboardCashierPage() {
  const [txCount, setTxCount] = useState<number | null>(null);
  const [cashTotal, setCashTotal] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
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

      {error ? (
        <div className="mt-6">
          <ErrorState message={error} onRetry={() => void load()} />
        </div>
      ) : (
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
      )}
    </section>
  );
}
