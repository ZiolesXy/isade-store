import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { Minus, Plus, TrashSimple } from '@phosphor-icons/react';
import type { CartItem } from '@/domain/models/CartItem';
import type { CartChange } from '@/application/cart';
import type { PaymentMethod } from '@/domain/models/Order';
import {
  PaymentGatewayError,
  ProductUnavailableError,
  StockConflictError,
  TooManyPendingOrdersError,
} from '@/domain/errors';
import { di } from '@/di';
import { useCartStore, selectCartItems, selectCartTotal } from '@/presentation/stores/useCartStore';
import { useCheckout } from '@/presentation/hooks/useCheckout';
import { formatRupiah } from '@/lib/format';
import { getProductImageUrl } from '@/lib/productImage';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { EmptyState } from '@/presentation/components/states';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

function mapCheckoutError(
  error: unknown,
  items: CartItem[]
): { heading: string; lines: string[] } {
  if (error instanceof StockConflictError) {
    const lines = error.items.map((item) => {
      const title = items.find((i) => i.productId === item.productId)?.title ?? 'Produk';
      return `${title}: butuh ${item.requested}, tersisa ${item.available}.`;
    });
    return { heading: 'Stok berubah saat checkout.', lines };
  }
  if (error instanceof ProductUnavailableError) {
    return {
      heading: 'Ada produk di keranjang yang sudah tidak dijual.',
      lines: ['Hapus produk tersebut, lalu coba bayar lagi.'],
    };
  }
  if (error instanceof TooManyPendingOrdersError) {
    return {
      heading:
        'Kamu sudah memiliki 3 pesanan yang menunggu pembayaran.',
      lines: [
        'Selesaikan pembayaran pesanan sebelumnya, atau tunggu pesanan kedaluwarsa.',
      ],
    };
  }
  if (error instanceof PaymentGatewayError) {
    return { heading: 'Pembayaran Midtrans gagal dimulai.', lines: ['Coba bayar lagi.'] };
  }
  if (error instanceof Error && error.message === 'Keranjang kosong') {
    return { heading: 'Keranjang masih kosong.', lines: [] };
  }
  return { heading: 'Checkout tidak berhasil.', lines: ['Coba lagi.'] };
}

export function CartPage() {
  const items = useCartStore(selectCartItems);
  const setQty = useCartStore((s) => s.setQty);
  const remove = useCartStore((s) => s.remove);
  const total = useCartStore(selectCartTotal);
  const navigate = useNavigate();
  const { createOrder, openSnap } = useCheckout(di.checkoutGateway, di.midtransClientKey);

  const [checked, setChecked] = useState(false);
  const [reconcileError, setReconcileError] = useState<string | null>(null);
  const [changes, setChanges] = useState<CartChange[]>([]);
  const [stockLimit, setStockLimit] = useState<Record<string, number>>({});
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>(null);
  const [busy, setBusy] = useState(false);
  const [checkoutError, setCheckoutError] = useState<{ heading: string; lines: string[] } | null>(
    null
  );
  const idempotencyKeyRef = useRef<string | null>(null);
  const itemsRef = useRef(items);
  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  const reconcileCart = useCallback(async () => {
    const current = itemsRef.current;
    setReconcileError(null);
    setChecked(false);
    if (current.length === 0) {
      setChecked(true);
      return;
    }
    try {
      const fresh = await di.productRepository.getManyByIds(current.map((i) => i.productId));
      const limit: Record<string, number> = {};
      for (const p of fresh) limit[p.id] = Math.max(0, p.availableStock);
      const { changes: newChanges } = useCartStore.getState().reconcileWithProducts(fresh);
      setStockLimit(limit);
      setChanges(newChanges);
    } catch {
      setReconcileError('Produk di keranjang tidak berhasil diperiksa.');
    } finally {
      setChecked(true);
    }
  }, []);

  useEffect(() => {
    void reconcileCart();
  }, [reconcileCart]);

  function changeFor(productId: string): CartChange | undefined {
    return changes.find((c) => c.productId === productId);
  }

  async function handlePay() {
    if (busy) return;
    if (items.length === 0) {
      toast.error('Keranjang masih kosong.');
      return;
    }
    if (!paymentMethod) {
      toast.error('Pilih salah satu cara pembayaran dulu.');
      return;
    }

    setBusy(true);
    setCheckoutError(null);

    // Kunci idempotensi dipakai ulang kalau request yang sama diulang karena jaringan putus.
    if (!idempotencyKeyRef.current) {
      idempotencyKeyRef.current = crypto.randomUUID();
    }
    const snapshot = [...itemsRef.current];

    try {
      const result = await createOrder(snapshot, paymentMethod, idempotencyKeyRef.current);
      idempotencyKeyRef.current = null;

      if (result.paymentMethod === 'WEB_MIDTRANS' && result.snapToken) {
        // Status di halaman detail order selalu dibaca dari DB, callback Snap tidak dipakai untuk status.
        navigate(`/orders/${result.orderId}`);
        try {
          await openSnap(result.snapToken);
        } catch {
          toast.error('Pembayaran Midtrans tidak berhasil dibuka. Lanjutkan dari halaman pesanan.');
        }
      } else {
        navigate(`/orders/${result.orderId}`);
      }
    } catch (error) {
      setCheckoutError(mapCheckoutError(error, snapshot));
      if (error instanceof StockConflictError) {
        await reconcileCart();
      }
    } finally {
      setBusy(false);
    }
  }

  if (!checked) {
    return <div className="mx-auto max-w-6xl px-4 py-6">{/* Sinkronisasi keranjang */}</div>;
  }

  if (items.length === 0) {
    return (
      <section className="mx-auto max-w-6xl px-4 py-6">
        <EmptyState
          message="Keranjang masih kosong."
          action={
            <Button asChild variant="outline">
              <Link to="/">Lihat katalog</Link>
            </Button>
          }
        />
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-6xl px-4 py-6">
      <h1 className="mb-4 font-display text-xl font-bold">Keranjang</h1>

      <div className="grid gap-6 lg:grid-cols-[2fr,1fr]">
        <div className="flex flex-col gap-3">
          {reconcileError ? (
            <div className="flex items-center justify-between gap-3 rounded-md border border-destructive/40 bg-white px-4 py-3">
              <p className="text-sm text-destructive">{reconcileError}</p>
              <Button variant="outline" size="sm" onClick={() => void reconcileCart()}>
                Muat ulang
              </Button>
            </div>
          ) : null}

          {items.map((item) => {
            const change = changeFor(item.productId);
            const maxQty = Math.min(99, stockLimit[item.productId] ?? 99);
            return (
              <Card key={item.productId} className="rounded-lg">
                <CardContent className="flex gap-3 p-3">
                  <Link
                    to={`/products/${item.slug}`}
                    className="h-20 w-20 shrink-0 overflow-hidden rounded-md bg-muted"
                    aria-label={`Lihat ${item.title}`}
                  >
                    {getProductImageUrl(item.imagePath) ? (
                      <img
                        src={getProductImageUrl(item.imagePath) ?? ''}
                        alt={item.title}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center font-display text-xl text-primary/40">
                        {item.title.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </Link>

                  <div className="flex min-w-0 flex-1 flex-col gap-1">
                    <Link
                      to={`/products/${item.slug}`}
                      className="line-clamp-1 font-medium hover:underline"
                    >
                      {item.title}
                    </Link>
                    <p className="text-sm text-muted-foreground">
                      {formatRupiah(item.unitPrice)} per item
                    </p>

                    {change ? (
                      <p className="text-xs text-destructive" role="alert">
                        {change.message}. Kuantitas disesuaikan otomatis.
                      </p>
                    ) : null}

                    <div className="mt-1 flex items-center gap-2">
                      <div className="flex items-center rounded-md border">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          aria-label={`Kurangi jumlah ${item.title}`}
                          disabled={item.quantity <= 1}
                          onClick={() => setQty(item.productId, item.quantity - 1)}
                        >
                          <Minus className="size-3.5" weight="bold" />
                        </Button>
                        <span className="w-8 text-center text-sm" aria-live="polite">
                          {item.quantity}
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          aria-label={`Tambah jumlah ${item.title}`}
                          disabled={item.quantity >= maxQty}
                          onClick={() => setQty(item.productId, item.quantity + 1, maxQty)}
                        >
                          <Plus className="size-3.5" weight="bold" />
                        </Button>
                      </div>
                      <p className="ml-auto text-sm font-semibold">
                        {formatRupiah(item.unitPrice * item.quantity)}
                      </p>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label={`Hapus ${item.title}`}
                        onClick={() => remove(item.productId)}
                      >
                        <TrashSimple className="size-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <Card className="h-fit rounded-lg">
          <CardContent className="flex flex-col gap-4 p-4">
            <h2 className="font-display text-lg font-semibold">Ringkasan</h2>

            <div className="flex items-center justify-between border-b pb-3">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="font-semibold">{formatRupiah(total)}</span>
            </div>

            <fieldset className="flex flex-col gap-2">
              <legend className="mb-1 text-sm font-medium">
                Cara pembayaran
              </legend>
              {(
                [
                  {
                    value: 'WEB_MIDTRANS' as PaymentMethod,
                    title: 'Bayar di Web (Midtrans)',
                    description: 'Pembayaran lewat Midtrans Snap.',
                  },
                  {
                    value: 'KASIR_CASH' as PaymentMethod,
                    title: 'Bayar di Kasir (Cash)',
                    description: 'Bayar tunai di kasir, diverifikasi oleh kasir.',
                  },
                ]
              ).map((option) => (
                <label
                  key={option.value}
                  className={cn(
                    'flex cursor-pointer items-start gap-3 rounded-md border px-3 py-2.5 text-left transition-colors',
                    'focus-within:ring-2 focus-within:ring-ring/50',
                    paymentMethod === option.value
                      ? 'border-primary bg-accent'
                      : 'hover:bg-muted'
                  )}
                >
                  <input
                    type="radio"
                    name="payment-method"
                    value={option.value}
                    checked={paymentMethod === option.value}
                    onChange={() => setPaymentMethod(option.value)}
                    className="sr-only"
                  />
                  <span
                    aria-hidden="true"
                    className={cn(
                      'mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full border-2',
                      paymentMethod === option.value ? 'border-primary' : 'border-input'
                    )}
                  >
                    {paymentMethod === option.value ? (
                      <span className="size-2 rounded-full bg-primary" />
                    ) : null}
                  </span>
                  <span>
                    <span className="block text-sm font-medium">{option.title}</span>
                    <span className="block text-xs text-muted-foreground">
                      {option.description}
                    </span>
                  </span>
                </label>
              ))}
            </fieldset>

            {checkoutError ? (
              <div
                role="alert"
                className="rounded-md border border-destructive/40 bg-white px-3 py-2 text-sm"
              >
                <p className="font-medium text-destructive">{checkoutError.heading}</p>
                <ul className="mt-1 list-disc pl-4 text-muted-foreground">
                  {checkoutError.lines.map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
              </div>
            ) : null}

            <Button
              className="bg-cta text-cta-foreground hover:bg-cta/90"
              disabled={busy}
              onClick={() => void handlePay()}
            >
              {busy ? 'Memproses...' : 'Bayar Sekarang'}
            </Button>

            <p className="text-xs text-muted-foreground">
              Stok dikunci untuk pesanmu saat tombol ini ditekan.
            </p>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
