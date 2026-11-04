import { useCallback, useEffect, useState } from 'react';
import { CaretLeft, CaretRight } from '@phosphor-icons/react';
import type { Product } from '@/domain/models/Product';
import { di } from '@/di';
import { useCartStore } from '@/presentation/stores/useCartStore';
import type { ProductListResult } from '@/domain/models/Product';
import { ProductCard } from '@/presentation/components/ProductCard';
import { EmptyState, ErrorState } from '@/presentation/components/states';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';

const PAGE_SIZE = 24;

/** Grid catalog: 2 kolom di bawah 640px, 3 kolom di 640 sampai 1024px, 4 kolom di atasnya. */
const GRID_CLASS = 'grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4';

export function CatalogPage() {
  const add = useCartStore((s) => s.add);
  const [result, setResult] = useState<ProductListResult | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (targetPage: number) => {
    setLoading(true);
    setError(null);
    try {
      const res = await di.productRepository.list(targetPage, PAGE_SIZE);
      setResult(res);
      setPage(targetPage);
    } catch {
      setError('Produk tidak berhasil dimuat.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(1);
  }, [load]);

  function handleAdd(product: Product) {
    const before = useCartStore.getState().items.find((i) => i.productId === product.id);
    add(
      {
        productId: product.id,
        slug: product.slug,
        title: product.title,
        unitPrice: product.price,
        quantity: 1,
        imagePath: product.imagePath,
      },
      product.availableStock
    );
    const after = useCartStore.getState().items.find((i) => i.productId === product.id);
    // Stok tidak tercukupi: qty di keranjang terpotong, beri tahu pengguna.
    if ((!before && !after) || (before && after && after.quantity === before.quantity)) {
      toast.warning(`Stok ${product.title} tinggal ${product.availableStock}.`);
      return;
    }
    toast.success('Produk ditambahkan ke keranjang.');
  }

  const totalPages = result ? Math.max(1, Math.ceil(result.total / PAGE_SIZE)) : 1;

  if (loading) {
    return (
      <section className="mx-auto max-w-6xl px-4 py-6">
        <div className={GRID_CLASS} aria-hidden="true">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="aspect-square w-full rounded-lg" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          ))}
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="mx-auto max-w-6xl px-4 py-6">
        <ErrorState message={error} onRetry={() => void load(1)} />
      </section>
    );
  }

  if (!result || result.products.length === 0) {
    return (
      <section className="mx-auto max-w-6xl px-4 py-6">
        <EmptyState message="Belum ada produk yang dijual." />
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-6xl px-4 py-6">
      <h1 className="mb-4 font-display text-xl font-bold text-foreground">Katalog</h1>

      <div className={GRID_CLASS}>
        {result.products.map((p) => (
          <ProductCard key={p.id} product={p} onAddToCart={handleAdd} />
        ))}
      </div>

      {totalPages > 1 ? (
        <div className="mt-6 flex items-center justify-center gap-3">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => void load(page - 1)}
          >
            <CaretLeft className="size-4" weight="bold" /> Sebelumnya
          </Button>
          <span className="text-sm text-muted-foreground" aria-live="polite">
            Halaman {page} dari {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => void load(page + 1)}
          >
            Berikutnya <CaretRight className="size-4" weight="bold" />
          </Button>
        </div>
      ) : null}
    </section>
  );
}
