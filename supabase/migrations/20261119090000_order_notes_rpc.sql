-- Catatan pembayaran untuk pemilik pesanan.
--
-- Tabel payment_events menyimpan payload mentah (termasuk payload webhook
-- Midtrans yang berisi signature_key), jadi user biasa TIDAK diberi akses
-- langsung ke tabel. Sebagai gantinya, RPC security definer ini hanya
-- mengembalikan catatan yang ditulis kasir/admin beserta sumber, status, dan
-- waktu — cukup untuk halaman detail pesanan user.
--
-- Admin/cashier tetap bisa membaca tabel payment_events lewat policy yang
-- sudah ada (payment_events_select_admin_cashier).

create or replace function public.list_order_notes(p_order_id uuid)
returns table (
  id bigint,
  source text,
  transaction_status text,
  catatan text,
  received_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1
      from public.orders as o
     where o.id = p_order_id
       and (o.user_id = auth.uid() or public.is_cashier())
  ) then
    raise exception 'FORBIDDEN' using errcode = 'P0001';
  end if;

  return query
    select
      e.id,
      e.source,
      e.transaction_status,
      coalesce(
        nullif(btrim(e.payload ->> 'catatan'), ''),
        nullif(btrim(e.payload ->> 'message'), ''),
        nullif(btrim(e.payload ->> 'note'), ''),
        nullif(btrim(e.payload ->> 'status_message'), '')
      ) as catatan,
      e.received_at
    from public.payment_events as e
    where e.order_id = p_order_id
    order by e.received_at desc;
end;
$$;

revoke execute on function public.list_order_notes(uuid) from public, anon;
grant execute on function public.list_order_notes(uuid) to authenticated;
