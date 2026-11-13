-- Uji cepat skema role baru (dihapus di akhir).
insert into auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at, role)
values ('11111111-1111-1111-1111-111111111111','u1@test.local','x', now(), now(), now(), 'authenticated');

insert into public.profiles (id, full_name) values ('11111111-1111-1111-1111-111111111111','Uji Satu');

select role, is_active from public.profiles where id = '11111111-1111-1111-1111-111111111111';

update public.profiles set role = 'cashier' where id = '11111111-1111-1111-1111-111111111111';
select role from public.profiles where id = '11111111-1111-1111-1111-111111111111';

do $$
begin
  begin
    update public.profiles set role = 'customer' where id = '11111111-1111-1111-1111-111111111111';
    raise notice 'GAGAL: nilai customer masih diterima';
  exception when check_violation then
    raise notice 'LULUS: role customer ditolak check constraint';
  end;
end $$;

select action, entity, details->>'role' as role_baru from public.audit_log order by id desc limit 3;

delete from auth.users where id = '11111111-1111-1111-1111-111111111111';
