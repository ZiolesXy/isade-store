import { Link } from 'react-router';
import { Plus } from '@phosphor-icons/react';
import type { Product } from '@/domain/models/Product';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatRupiah } from '@/lib/format';
import { getProductImageUrl } from '@/lib/productImage';

/** Ambang badge "Sisa N". DESIGN.md belum menentukan angkanya, dipatok 5 dan dicatat di changelog. */
export const LOW_STOCK_THRESHOLD = 5;

interface ProductCardProps {
  product: Product;
  onAddToCart: (product: Product) => void;
}

export function ProductCard({ product, onAddToCart }: ProductCardProps) {
  const imageUrl = getProductImageUrl(product.imagePath);
  const outOfStock = product.availableStock <= 0;
  const lowStock = !outOfStock && product.availableStock <= LOW_STOCK_THRESHOLD;

  return (
    <div className="flex flex-col overflow-hidden rounded-lg border bg-card">
      <Link
        to={`/katalog/${product.slug}`}
        className="block aspect-square w-full overflow-hidden bg-muted"
        aria-label={`Lihat detail ${product.title}`}
      >
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={product.title}
            className="h-full w-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-3xl font-display text-primary/40">
            {product.title.charAt(0).toUpperCase()}
          </div>
        )}
      </Link>

      <div className="flex flex-1 flex-col gap-1 p-3">
        <Link
          to={`/katalog/${product.slug}`}
          className="line-clamp-2 font-medium text-foreground hover:underline"
        >
          {product.title}
        </Link>
        <p className="text-sm font-semibold">{formatRupiah(product.price)}</p>

        {lowStock ? (
          <Badge variant="secondary">Sisa {product.availableStock}</Badge>
        ) : null}
        {outOfStock ? <Badge variant="outline">Stok habis</Badge> : null}

        <div className="mt-auto pt-2">
          <Button
            className="w-full bg-cta text-cta-foreground hover:bg-cta/90"
            disabled={outOfStock}
            onClick={() => onAddToCart(product)}
          >
            <Plus className="size-4" weight="bold" />
            {outOfStock ? (
              'Stok habis'
            ) : (
              <>
                {/* Layar sempit: label pendek agar tidak kepotong di grid 2 kolom. */}
                <span className="sm:hidden">Tambah</span>
                <span className="hidden sm:inline">Tambah ke Keranjang</span>
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
