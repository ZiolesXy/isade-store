-- Perbaiki kemungkinan locked_stock negatif di verify_payment_cashier dan apply_payment_result.
-- Saat order sudah pernah expired/cancelled/failed (locked_stock sudah dilepaskan ke 0)
-- lalu berubah menjadi needs_review melalui pembayaran terlambat, penolakan status
-- via verify_payment_cashier mencoba mengurangi locked_stock lagi → pelanggaran check
-- constraint locked_stock >= 0 → error 500.
--
-- Menggunakan GREATEST(..., 0) sehingga operasi aman dan idempotent.

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

  -- if v_result = 'paid' and ABS(p_gross_amount - v_order.total_amount) > 100 then
  --   v_result := 'needs_review';
  -- end if;

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
