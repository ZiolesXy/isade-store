-- verify_payment_cashier dipanggil Edge Function cashier-verify dengan JWT kasir
-- (is_cashier() di dalam RPC membaca auth.uid() dari caller). Berikan hak execute
-- ke authenticated; keamanan tetap terjaga karena RPC security definer
-- memeriksa is_cashier() sebelum mengubah apa pun.

grant execute on function public.verify_payment_cashier(uuid, text, text) to authenticated;
