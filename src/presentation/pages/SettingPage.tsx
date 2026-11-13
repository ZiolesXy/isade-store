import { Link } from 'react-router';
import { CaretRight, Gear, Storefront } from '@phosphor-icons/react';
import { isMidtransEnabled } from '@/lib/config';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

/**
 * /setting (admin, PLAN-UPDATE-v3 Tahap 2 & 3): info toko dan status
 * integrasi Midtrans sebagai informasi saja; perubahan lewat env + redeploy.
 */
export function SettingPage() {
  return (
    <section className="mx-auto max-w-3xl px-4 py-6">
      <h1 className="mb-4 font-display text-xl font-bold">Setting</h1>

      <Card className="rounded-lg">
        <CardContent className="flex flex-col gap-3 p-4">
          <div className="flex items-center gap-2">
            <Storefront className="size-5 text-primary" weight="duotone" />
            <h2 className="font-display text-lg font-semibold">Info toko</h2>
          </div>
          <dl className="flex flex-col gap-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Nama toko</dt>
              <dd>Isade Store</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Jenis produk</dt>
              <dd>Produk digital (gantungan kunci)</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Pengiriman</dt>
              <dd>Tanpa pengiriman / ongkir</dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      <Card className="mt-3 rounded-lg">
        <CardContent className="flex flex-col gap-3 p-4">
          <div className="flex items-center gap-2">
            <Gear className="size-5 text-primary" weight="duotone" />
            <h2 className="font-display text-lg font-semibold">Integrasi Midtrans</h2>
            {isMidtransEnabled ? (
              <Badge variant="secondary" className="ml-auto">
                Aktif
              </Badge>
            ) : (
              <Badge variant="outline" className="ml-auto">
                Nonaktif
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            {isMidtransEnabled
              ? 'Checkout menawarkan dua pilihan: Bayar di Web (Midtrans) dan Bayar di Kasir.'
              : 'Hanya pembayaran di kasir yang tersedia di checkout.'}{' '}
            Status dibaca dari env, bukan dari halaman ini.
          </p>
          <ul className="flex flex-col gap-1 text-sm text-muted-foreground">
            <li>
              <span className="font-mono">VITE_ENABLE_MIDTRANS</span> &mdash; client
              (mengontrol pilihan di checkout), diubah lalu build ulang.
            </li>
            <li>
              <span className="font-mono">ENABLE_MIDTRANS</span> &mdash; server (Edge
              Function create-order menolak metode Midtrans saat false).
            </li>
            <li>
              Webhook Midtrans tetap menerima transaksi lama yang dibuat sebelum flag
              dimatikan.
            </li>
          </ul>
          <p className="text-xs text-muted-foreground">
            Untuk mengubah: set env di atas, lalu redeploy (deploy ulang Edge Function
            untuk env server).
          </p>
        </CardContent>
      </Card>

      <div className="mt-4 flex flex-wrap gap-2">
        <Button asChild variant="outline" size="sm">
          <Link to="/produk">
            Kelola Produk
            <CaretRight className="size-4" weight="duotone" />
          </Link>
        </Button>
        <Button asChild variant="outline" size="sm">
          <Link to="/users">
            Kelola User
            <CaretRight className="size-4" weight="duotone" />
          </Link>
        </Button>
      </div>
    </section>
  );
}
