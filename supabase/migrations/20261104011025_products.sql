create table public.products (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  title text not null check (char_length(title) between 1 and 120),
  description text not null default '',
  price bigint not null check (price > 0),
  stock integer not null default 0 check (stock >= 0),
  locked_stock integer not null default 0 check (locked_stock >= 0),
  available_stock integer generated always as (stock - locked_stock) stored,
  image_path text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint products_locked_le_stock check (locked_stock <= stock)
);

create index products_active_created_idx on public.products (is_active, created_at desc);

create trigger products_set_updated_at
  before update on public.products
  for each row execute function public.set_updated_at();
