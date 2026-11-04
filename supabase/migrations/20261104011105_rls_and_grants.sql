alter table public.profiles enable row level security;
alter table public.products enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.payment_events enable row level security;

create policy "profiles_select_own_or_admin_cashier" on public.profiles
  for select to authenticated
  using (id = (select auth.uid()) or (select public.is_cashier()));

create policy "profiles_update_own" on public.profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

revoke insert, update, delete on public.profiles from anon, authenticated;
grant update (full_name) on public.profiles to authenticated;

create policy "products_select_active_or_admin_cashier" on public.products
  for select to anon, authenticated
  using (is_active or (select public.is_cashier()));

create policy "products_insert_admin" on public.products
  for insert to authenticated
  with check ((select public.is_admin()));

create policy "products_update_admin" on public.products
  for update to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

create policy "products_delete_admin" on public.products
  for delete to authenticated
  using ((select public.is_admin()));

revoke insert, update on public.products from anon, authenticated;
grant insert (slug, title, description, price, stock, image_path, is_active)
  on public.products to authenticated;
grant update (slug, title, description, price, stock, image_path, is_active)
  on public.products to authenticated;

create policy "orders_select_own_or_admin_cashier" on public.orders
  for select to authenticated
  using (user_id = (select auth.uid()) or (select public.is_cashier()));

revoke insert, update, delete on public.orders from anon, authenticated;

create policy "order_items_select_own_or_admin_cashier" on public.order_items
  for select to authenticated
  using (
    exists (
      select 1 from public.orders as o
       where o.id = order_items.order_id
         and (o.user_id = (select auth.uid()) or (select public.is_cashier()))
    )
  );

revoke insert, update, delete on public.order_items from anon, authenticated;

create policy "payment_events_select_admin_cashier" on public.payment_events
  for select to authenticated
  using ((select public.is_cashier()));

revoke insert, update, delete on public.payment_events from anon, authenticated;
