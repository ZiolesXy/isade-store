import { Gear, Storefront } from '@phosphor-icons/react';
import { isMidtransEnabled } from '@/lib/config';
import { Badge } from '@/components/ui/badge';
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
              <dd>Gantungan kunci</dd>
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
              ? 'Checkout menawarkan dua pilihan: Bayar di Web dan Bayar di Kasir.'
              : 'Saat ini hanya pembayaran di kasir yang tersedia di checkout.'}{' '}
          </p>
        </CardContent>
      </Card>
    </section>
  );
}
