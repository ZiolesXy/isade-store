import type { OrderStatus } from '@/domain/models/Order';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export const STATUS_LABEL: Record<OrderStatus, string> = {
  pending: 'Menunggu Pembayaran',
  paid: 'Dibayar',
  expired: 'Kedaluwarsa',
  cancelled: 'Dibatalkan',
  failed: 'Gagal',
  needs_review: 'Perlu Ditinjau',
};

function statusClass(status: OrderStatus): string {
  switch (status) {
    case 'pending':
      return 'bg-primary text-primary-foreground';
    case 'paid':
      return 'bg-secondary text-secondary-foreground';
    case 'failed':
    case 'cancelled':
      return 'bg-destructive text-white';
    case 'expired':
      return 'bg-muted text-muted-foreground border-border';
    case 'needs_review':
      return 'bg-amber-100 text-amber-900';
  }
}

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  return (
    <Badge
      variant="outline"
      className={cn('border-transparent', statusClass(status))}
      data-testid="order-status-badge"
    >
      {STATUS_LABEL[status]}
    </Badge>
  );
}
