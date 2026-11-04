-- Perbaikan: sesi lama berada di akun yang dibuat sebelum trigger on_auth_user_created
-- (atau sebelum db reset) tidak punya baris di profiles, sehingga query profil
-- klien gagal dengan 406 (single() tanpa baris) dan role admin/cashier hilang.
--
-- Backfill idempotent: hanya menyisipkan profil yang belum ada.
insert into public.profiles (id, full_name)
select u.id, u.raw_user_meta_data ->> 'full_name'
from auth.users u
where not exists (select 1 from public.profiles p where p.id = u.id)
on conflict (id) do nothing;
