create or replace function public.create_order_atomic(
  p_user_id uuid,
  p_items jsonb,
  p_payment_method text,
  p_idempotency_key text,
  p_ttl_minutes integer default 30
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order_id uuid;
  v_subtotal bigint := 0;
  v_item record;
  v_product public.products%rowtype;
begin
  select id into v_order_id
    from public.orders
   where user_id = p_user_id and idempotency_key = p_idempotency_key;
  if found then
    return v_order_id;
  end if;

  if jsonb_typeof(p_items) <> 'array'
     or jsonb_array_length(p_items) = 0
     or jsonb_array_length(p_items) > 20 then
    raise exception 'INVALID_ITEMS' using errcode = 'P0001';
  end if;

  if (select count(*) from public.orders
       where user_id = p_user_id and status = 'pending') >= 3 then
    raise exception 'TOO_MANY_PENDING_ORDERS' using errcode = 'P0001';
  end if;

  insert into public.orders (
    user_id, subtotal, total_amount,
    payment_method, idempotency_key, expires_at
  )
  values (
    p_user_id, 0, 0,
    p_payment_method, p_idempotency_key,
    now() + make_interval(mins => p_ttl_minutes)
  )
  returning id into v_order_id;

  -- Urut per product_id supaya dua transaksi mengunci baris dengan urutan sama (cegah deadlock).
  for v_item in
    select (e ->> 'product_id')::uuid as product_id,
           sum((e ->> 'quantity')::integer) as quantity
      from jsonb_array_elements(p_items) as e
     group by 1
     order by 1
  loop
    if v_item.quantity is null or v_item.quantity < 1 or v_item.quantity > 99 then
      raise exception 'INVALID_QUANTITY' using errcode = 'P0001', detail = v_item.product_id::text;
    end if;

    update public.products
       set locked_stock = locked_stock + v_item.quantity
     where id = v_item.product_id
       and is_active
       and stock - locked_stock >= v_item.quantity
    returning * into v_product;

    if not found then
      if exists (select 1 from public.products where id = v_item.product_id and is_active) then
        raise exception 'INSUFFICIENT_STOCK' using errcode = 'P0001', detail = v_item.product_id::text;
      else
        raise exception 'PRODUCT_UNAVAILABLE' using errcode = 'P0001', detail = v_item.product_id::text;
      end if;
    end if;

    insert into public.order_items (order_id, product_id, title_snapshot, unit_price, quantity)
    values (v_order_id, v_product.id, v_product.title, v_product.price, v_item.quantity);

    v_subtotal := v_subtotal + v_product.price * v_item.quantity;
  end loop;

  update public.orders
     set subtotal = v_subtotal,
         total_amount = v_subtotal
   where id = v_order_id;

  return v_order_id;
end;
$$;

create or replace function public.apply_payment_result(
  p_order_id uuid,
  p_result text,
  p_gross_amount bigint,
  p_source text,
  p_payload jsonb
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order public.orders%rowtype;
  v_result text := p_result;
begin
  if p_result not in ('paid', 'expired', 'cancelled', 'failed', 'needs_review') then
    raise exception 'INVALID_RESULT' using errcode = 'P0001';
  end if;

  select * into v_order from public.orders where id = p_order_id for update;
  if not found then
    raise exception 'ORDER_NOT_FOUND' using errcode = 'P0001';
  end if;

  insert into public.payment_events (order_id, source, transaction_status, payload)
  values (p_order_id, p_source, p_payload ->> 'transaction_status', coalesce(p_payload, '{}'::jsonb));

  if v_order.status <> 'pending' then
    -- Pembayaran masuk setelah status sudah berubah: jangan ubah stok otomatis.
    if p_result = 'paid' and v_order.status in ('expired', 'cancelled', 'failed') then
      update public.orders set status = 'needs_review' where id = p_order_id;
      return 'needs_review';
    end if;
    return v_order.status;
  end if;

  perform 1
     from public.products
    where id in (select product_id from public.order_items where order_id = p_order_id)
    order by id
      for update;

  if v_result = 'paid' and ABS(p_gross_amount - v_order.total_amount) > 100 then
    v_result := 'needs_review';
  end if;

  -- Produk digital: tidak ada stok fisik yang dikurangi.
  -- locked_stock hanya dilepas untuk status non-paid.
  if v_result = 'paid' then
    -- Produk digital: stok berkurang (terjual) dan locked_stock dilepas.
    update public.products as p
       set stock = greatest(p.stock - oi.quantity, 0),
           locked_stock = greatest(p.locked_stock - oi.quantity, 0)
      from public.order_items as oi
     where oi.order_id = p_order_id and p.id = oi.product_id;

    update public.orders
       set status = 'paid',
           paid_at = now(),
           payment_type = p_payload ->> 'payment_type',
           midtrans_transaction_id = p_payload ->> 'transaction_id'
     where id = p_order_id;

  elsif v_result in ('expired', 'cancelled', 'failed') then
    update public.products as p
       set locked_stock = greatest(p.locked_stock - oi.quantity, 0)
      from public.order_items as oi
     where oi.order_id = p_order_id and p.id = oi.product_id;

    update public.orders set status = v_result where id = p_order_id;

  else
    update public.orders set status = 'needs_review' where id = p_order_id;
  end if;

  return v_result;
end;
$$;

create or replace function public.verify_payment_cashier(
  p_order_id uuid,
  p_result text,
  p_catatan text
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order public.orders%rowtype;
begin
  if p_result not in ('paid', 'needs_review', 'failed', 'expired', 'cancelled') then
    raise exception 'INVALID_RESULT' using errcode = 'P0001';
  end if;

  if not public.is_cashier() then
    raise exception 'FORBIDDEN' using errcode = 'P0001';
  end if;

  select * into v_order from public.orders where id = p_order_id for update;
  if not found then
    raise exception 'ORDER_NOT_FOUND' using errcode = 'P0001';
  end if;

  insert into public.payment_events (order_id, source, transaction_status, payload)
  values (p_order_id, 'cashier', p_result, jsonb_build_object('catatan', p_catatan, 'verified_by', auth.uid()));

  -- Order yang sudah dibayar: hanya ditampilkan, tidak boleh diubah.
  if v_order.status = 'paid' then
    return 'paid';
  end if;

  if p_result = 'paid' then
    update public.orders
       set status = 'paid',
           paid_at = now()
     where id = p_order_id;

  elsif p_result in ('failed', 'expired', 'cancelled') then
    -- Gunakan GREATEST agar locked_stock tidak negatif jika stok
    -- sudah dilepaskan sebelumnya (order pernah expired/cancelled/failed
    -- lalu berubah menjadi needs_review melalui pembayaran terlambat).
    update public.products as p
       set locked_stock = greatest(p.locked_stock - oi.quantity, 0)
      from public.order_items as oi
     where oi.order_id = p_order_id and p.id = oi.product_id;

    update public.orders set status = p_result where id = p_order_id;

  else
    update public.orders set status = 'needs_review' where id = p_order_id;
  end if;

  return p_result;
end;
$$;

revoke execute on function public.create_order_atomic(uuid, jsonb, text, text, integer)
  from public, anon, authenticated;
revoke execute on function public.apply_payment_result(uuid, text, bigint, text, jsonb)
  from public, anon, authenticated;
revoke execute on function public.verify_payment_cashier(uuid, text, text)
  from public, anon, authenticated;

grant execute on function public.create_order_atomic(uuid, jsonb, text, text, integer) to service_role;
grant execute on function public.apply_payment_result(uuid, text, bigint, text, jsonb) to service_role;
grant execute on function public.verify_payment_cashier(uuid, text, text) to service_role;
