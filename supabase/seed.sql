-- Seed data untuk pengembangan lokal.
-- Semua produk contoh diberi judul berawalan [CONTOH] supaya tidak lolos ke production.

insert into public.products (slug, title, description, price, stock, locked_stock, image_path, is_active)
values
  ('contoh-gantungan-kunci-1', '[CONTOH] Gantungan Kunci Tekno Mini', 'Gantungan kunci kecil berbentuk ikon teknologi, cocok untuk tas atau kunci rumah.', 25000, 10, 0, NULL, true),
  ('contoh-gantungan-kunci-2', '[CONTOH] Gantungan Kunci Akrilik Transparan', 'Gantungan kunci akrilik dengan desain minimalis dan transparan.', 35000, 5, 0, NULL, true),
  ('contoh-gantungan-kunci-3', '[CONTOH] Gantungan Kunci Kulit Sintetis', 'Gantungan kunci dari bahan kulit sintetis berkualitas dengan jahitan rapi.', 45000, 0, 0, NULL, true),
  ('contoh-gantungan-kunci-4', '[CONTOH] Gantungan Kunci LED Warna-Warni', 'Gantungan kunci dengan lampu LED yang bisa diatur warnanya.', 55000, 8, 0, NULL, true),
  ('contoh-gantungan-kunci-5', '[CONTOH] Gantungan Kunci Hias Motif Bunga', 'Gantungan kunci dengan hiasan bunga kain yang indah dan kerenn.', 30000, 1, 0, NULL, true),
  ('contoh-gantungan-kunci-6', '[CONTOH] Gantungan Kunci Edisi Terbatas', 'Gantungan kunci edisi terbatas dengan desain eksklusif, stok sangat terbatas.', 75000, 3, 0, NULL, true);
