import type { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { WarningCircle } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';

interface FullPageLoadingProps {
  className?: string;
}

/** Layar tunggu saat sesi belum diketahui, dipakai oleh route guard. */
export function FullPageLoading({ className }: FullPageLoadingProps) {
  return (
    <div className={cn('flex min-h-[50vh] items-center justify-center', className)}>
      <div className="flex flex-col items-center gap-3 text-muted-foreground" aria-live="polite">
        <span className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        <p>Memuat...</p>
      </div>
    </div>
  );
}

/** Skeleton baris sejumlah n, dipakai halaman daftar saat loading. */
export function RowSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-2" aria-hidden="true">
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-14 w-full rounded-lg" />
      ))}
    </div>
  );
}

interface EmptyStateProps {
  message: string;
  action?: ReactNode;
}

export function EmptyState({ message, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed bg-white px-6 py-12 text-center">
      <p className="text-muted-foreground">{message}</p>
      {action}
    </div>
  );
}

interface ErrorStateProps {
  message?: string;
  onRetry?: () => void;
}

export function ErrorState({ message = 'Terjadi kesalahan saat memuat data.', onRetry }: ErrorStateProps) {
  return (
    <div
      role="alert"
      className="flex flex-col items-center gap-3 rounded-lg border border-destructive/30 bg-white px-6 py-12 text-center"
    >
      <WarningCircle className="size-7 text-destructive" weight="duotone" />
      <p className="text-muted-foreground">{message}</p>
      {onRetry ? (
        <Button variant="outline" onClick={onRetry}>
          Muat ulang
        </Button>
      ) : null}
    </div>
  );
}
