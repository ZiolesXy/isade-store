-- Halaman admin /audit-log membaca audit_log urut terbaru dengan paginasi.
-- Index created_at desc agar query "terbaru dulu" tetap murah saat tabel membesar.
-- Tulis ke audit_log tetap lewat trigger write_audit_log (tidak berubah di sini).

create index if not exists audit_log_created_at_idx
  on public.audit_log (created_at desc);
