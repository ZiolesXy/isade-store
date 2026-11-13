import { useCallback, useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router';
import { Minus, Plus } from '@phosphor-icons/react';
import type { Product } from '@/domain/models/Product';
import { di } from '@/di';
import { useCartStore } from '@/presentation/stores/useCartStore';
import { useAuthStore } from '@/presentation/stores/useAuthStore';
import { formatRupiah } from '@/lib/format';
import { getProductImageUrl } from '@/lib/productImage';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { LOW_STOCK_THRESHOLD } from '@/presentation/components/ProductCard';
import { toast } from 'sonner';

export function ProductDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const add = useCartStore((s) => s.add);
  const navigate = useNavigate();
  const location = useLocation();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);

  const load = useCallback(async () => {
    if (!slug) return;
    setLoading(true);
    setError(null);
    try {
      const p = await di.productRepository.getBySlug(slug);
      setProduct(p);
    } catch {
      setError('Produk tidak berhasil dimuat.');
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return (
      <section className="mx-auto grid max-w-6xl gap-6 px-4 py-6 md:grid-cols-2" aria-hidden="true">
        <Skeleton className="aspect-square w-full rounded-lg" />
        <div className="space-y-3">
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="h-6 w-1/3" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="mx-auto max-w-6xl px-4 py-6">
        <div className="flex flex-col items-center gap-3 rounded-lg border border-destructive/30 bg-white px-6 py-12 text-center">
          <p className="text-muted-foreground">{error}</p>
          <Button variant="outline" onClick={() => void load()}>
            Muat ulang
          </Button>
        </div>
      </section>
    );
  }

  if (!product || !product.isActive) {
    return (
      <section className="mx-auto max-w-6xl px-4 py-6">
        <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed bg-white px-6 py-12 text-center">
          <p className="text-muted-foreground">
            Produk tidak ditemukan atau sudah tidak dijual.
          </p>
          <Button asChild variant="outline">
            <Link to="/katalog">Kembali ke katalog</Link>
          </Button>
        </div>
      </section>
    );
  }

  const outOfStock = product.availableStock <= 0;
  const maxQuantity = Math.min(99, product.availableStock);
  const current = product;

  function handleAdd() {
    if (outOfStock) return;
    const { sessionReady, userId } = useAuthStore.getState();
    if (sessionReady && !userId) {
      navigate('/login', {
        state: { from: location.pathname + location.search },
        replace: true,
      });
      toast.info('Silakan masuk untuk menambahkan produk ke keranjang.');
      return;
    }
    add(
      {
        productId: current.id,
        slug: current.slug,
        title: current.title,
        unitPrice: current.price,
        quantity,
        imagePath: current.imagePath,
      },
      current.availableStock
    );
    const added = useCartStore.getState().items.find((i) => i.productId === current.id);
    if (added && added.quantity < quantity) {
      toast.warning(`Stok hanya tersisa ${current.availableStock}. Kuantitas disesuaikan.`);
    } else {
      toast.success('Produk ditambahkan ke keranjang.');
    }
  }

  return (
    <section className="mx-auto grid max-w-6xl gap-6 px-4 py-6 md:grid-cols-2">
      <div className="aspect-square w-full overflow-hidden rounded-lg border bg-white">
        {getProductImageUrl(product.imagePath) ? (
          <img
            src={getProductImageUrl(product.imagePath) ?? ''}
            alt={product.title}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-6xl font-display text-primary/40">
            {product.title.charAt(0).toUpperCase()}
          </div>
        )}
      </div>

      <div className="flex flex-col gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold">{product.title}</h1>
          <p className="mt-1 text-xl font-semibold text-foreground">
            {formatRupiah(product.price)}
          </p>
        </div>

        {outOfStock ? (
          <Badge variant="outline">Stok habis</Badge>
        ) : product.availableStock <= LOW_STOCK_THRESHOLD ? (
          <Badge variant="secondary">Sisa {product.availableStock}</Badge>
        ) : null}

        {product.description ? (
          <p className="whitespace-pre-line text-sm leading-6 text-muted-foreground">
            {product.description}
          </p>
        ) : null}

        <div className="mt-auto flex flex-wrap items-center gap-3">
          {!outOfStock ? (
            <div className="flex items-center rounded-md border" aria-label="Jumlah">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                disabled={quantity <= 1}
                aria-label="Kurangi jumlah"
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              >
                <Minus className="size-4" weight="bold" />
              </Button>
              <span className="w-10 text-center text-sm" aria-live="polite">
                {quantity}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                disabled={quantity >= maxQuantity}
                aria-label="Tambah jumlah"
                onClick={() => setQuantity((q) => Math.min(maxQuantity, q + 1))}
              >
                <Plus className="size-4" weight="bold" />
              </Button>
            </div>
          ) : null}

          <Button
            className="bg-cta text-cta-foreground hover:bg-cta/90"
            disabled={outOfStock}
            onClick={handleAdd}
          >
            <Plus className="size-4" weight="bold" />
            {outOfStock ? 'Stok habis' : 'Tambah ke Keranjang'}
          </Button>
        </div>
      </div>
    </section>
  );
}
