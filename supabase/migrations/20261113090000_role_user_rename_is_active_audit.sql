-- PLAN-UPDATE-v3 Tahap 1: sumber kebenaran role.
-- 1) Enum role: 'user' | 'cashier' | 'admin' (sebelumnya 'customer').
-- 2) is_active untuk penonaktifan akun.
-- 3) Admin boleh mengubah role/is_active user lain (policy RLS + grant kolom).
-- 4) audit_log: catatan otomatis aksi sensitif (produk, perubahan role/is_active).
-- 5) Fungsi has_role() untuk dipakai policy baru bila diperlukan (admin lolos guard cashier
--    sudah dicakup is_cashier(); is_admin() tetap untuk guard admin).

update public.profiles set role = 'user' where role = 'customer';

alter table public.profiles drop constraint profiles_role_check;
alter table public.profiles add constraint profiles_role_check
  check (role in ('admin', 'user', 'cashier'));

alter table public.profiles alter column role set default 'user';

alter table public.profiles add column is_active boolean not null default true;

-- Admin mengelola user: ubah role dan aktif/nonaktif.
create policy "profiles_update_admin" on public.profiles
  for update to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

grant update (role, is_active, full_name) on public.profiles to authenticated;

-- Tabel audit log. Baris hanya ditulis lewat trigger security definer;
-- authenticated tidak punya insert/update/delete langsung.
create table public.audit_log (
  id bigint generated always as identity primary key,
  actor_id uuid references auth.users (id) on delete set null,
  action text not null,
  entity text not null,
  entity_id text,
  details jsonb,
  created_at timestamptz not null default now()
);

alter table public.audit_log enable row level security;

create policy "audit_log_select_admin" on public.audit_log
  for select to authenticated
  using ((select public.is_admin()));

revoke insert, update, delete on public.audit_log from anon, authenticated;

create or replace function public.write_audit_log()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.audit_log (actor_id, action, entity, entity_id, details)
  values (
    auth.uid(),
    tg_op,
    tg_table_name,
    coalesce(to_jsonb(new) ->> 'id', to_jsonb(old) ->> 'id'),
    case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end
  );
  return coalesce(new, old);
end;
$$;

revoke execute on function public.write_audit_log() from public, anon, authenticated;

-- Aksi sensitif yang diaudit: kelola produk (tambah/ubah/nonaktif) dan
-- perubahan role / status aktif akun. Verifikasi pembayaran sudah tercatat
-- di payment_events (verified_by + received_at).
create trigger products_audit_log
  after insert or update or delete on public.products
  for each row execute function public.write_audit_log();

create trigger profiles_role_audit_log
  after update of role, is_active on public.profiles
  for each row execute function public.write_audit_log();
