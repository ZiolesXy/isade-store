-- Perbaikan bug Lampiran A (PRD): migrasi profiles mencabut execute
-- is_admin()/is_cashier() dari anon, authenticated, dan public.
-- Kebijakan RLS di rls_and_grants dan storage memanggil kedua fungsi itu
-- dengan hak pemanggil (querying user), sehingga setiap SELECT klien
-- gagal dengan "permission denied for function is_cashier" (PostgREST 403).
--
-- Solusi: beri execute eksplisit ke role klien. Fungsi tetap aman karena
-- security definer dan tidak butuh argumen; hasil hanya boolean berbasis
-- profils pemanggil.

grant execute on function public.is_admin() to anon, authenticated, service_role;
grant execute on function public.is_cashier() to anon, authenticated, service_role;
