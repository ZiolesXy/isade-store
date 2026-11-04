create table public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete restrict,
  status text not null default 'pending'
    check (status in ('pending', 'paid', 'expired', 'cancelled', 'failed', 'needs_review')),
  subtotal bigint not null check (subtotal >= 0),
  total_amount bigint not null check (total_amount >= 0),
  payment_method text not null check (payment_method in ('WEB_MIDTRANS', 'KASIR_CASH')),
  idempotency_key text not null,
  snap_token text,
  snap_redirect_url text,
  payment_type text,
  midtrans_transaction_id text,
  expires_at timestamptz not null,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint orders_idempotency_unique unique (user_id, idempotency_key),
  constraint orders_total_consistent check (total_amount = subtotal)
);

create index orders_user_created_idx on public.orders (user_id, created_at desc);
create index orders_status_created_idx on public.orders (status, created_at desc);

create trigger orders_set_updated_at
  before update on public.orders
  for each row execute function public.set_updated_at();

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  product_id uuid not null references public.products (id) on delete restrict,
  title_snapshot text not null,
  unit_price bigint not null check (unit_price > 0),
  quantity integer not null check (quantity between 1 and 99),
  line_total bigint generated always as (unit_price * quantity) stored,
  constraint order_items_unique_product unique (order_id, product_id)
);

create index order_items_product_idx on public.order_items (product_id);

create table public.payment_events (
  id bigint generated always as identity primary key,
  order_id uuid not null references public.orders (id) on delete cascade,
  source text not null check (source in ('webhook', 'cashier', 'system')),
  transaction_status text,
  payload jsonb not null default '{}'::jsonb,
  received_at timestamptz not null default now()
);

create index payment_events_order_idx on public.payment_events (order_id, received_at desc);
