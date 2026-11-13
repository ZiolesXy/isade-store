import { Link } from 'react-router';
import { House, SquaresFour } from '@phosphor-icons/react';
import { useAuthStore } from '@/presentation/stores/useAuthStore';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

/**
 * Halaman 403 untuk role yang tidak cukup (PLAN-UPDATE-v3 Tahap 1):
 * jelas, bukan 404 yang membingungkan dan bukan layar kosong.
 */
export function ForbiddenPage() {
  const userId = useAuthStore((s) => s.userId);
  return (
    <section className="mx-auto max-w-md px-4 py-16">
      <Card className="rounded-lg">
        <CardContent className="flex flex-col items-center gap-3 p-8 text-center">
          <p className="font-display text-4xl font-bold text-destructive">403</p>
          <h1 className="font-display text-lg font-semibold">Akses ditolak</h1>
          <p className="text-sm text-muted-foreground">
            Role kamu tidak memiliki izin untuk membuka halaman ini.
          </p>
          <div className="mt-2 flex flex-wrap justify-center gap-2">
            {userId ? (
              <Button asChild>
                <Link to="/dashboard">
                  <SquaresFour className="size-4" weight="duotone" />
                  Ke Dashboard
                </Link>
              </Button>
            ) : null}
            <Button asChild variant="outline">
              <Link to="/katalog">
                <House className="size-4" weight="duotone" />
                Ke Katalog
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
