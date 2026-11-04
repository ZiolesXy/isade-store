# CHANGELOG

Semua perubahan dan pengerjaan bagian PRD dicatat di sini. Setiap kali satu bagian selesai, tambahkan entri baru di bagian bawah dengan format:

```
## <Tanggal> - <Nama Bagian>

Status: selesai / belum selesai

Rincian: <singkat>
Bukti verifikasi: <output perintah atau "belum diverifikasi">
```

---

## 2026-11-02 - Revisi PRD (produk digital, tanpa alamat/ongkir, tanpa pg_cron, role cashier, dua opsi pembayaran di kasir)

Status: selesai

Rincian:
- Jenis produk diubah menjadi digital. Semua penggunaan `shipping_address` dan `shipping_cost` dihapus dari seluruh dokumen (tabel orders, API create-order, request Midtrans, frontend CartPage, ERD, Lampiran A).
- Semua penggunaan `pg_cron` dan fungsi `expire_stale_orders` dihapus. Kedaluwarsa ditangani sepenuhnya oleh notifikasi webhook Midtrans (`expire` -> `expired`). Bagian A.7 Cron dan referensi cron di seluruh dokumen dihapus.
- Checkout menawarkan dua opsi pembayaran di kasir: **Bayar di Web (Midtrans)** (`WEB_MIDTRANS`) dan **Bayar di Kasir (Cash)** (`KASIR_CASH`). Untuk `KASIR_CASH` tidak ada pemanggilan Midtrans Snap, order tetap `pending` menunggu verifikasi cashier.
- Ditambah role `cashier`. Cashier dapat memindai/masukkan kode transaksi dan mengubah status pembayaran via endpoint `cashier-verify` dan fungsi `verify_payment_cashier`. Order yang sudah `paid` hanya ditampilkan (read-only).
- Role `profiles` diperluas: `admin | customer | cashier`. Ditambah fungsi `is_cashier()` dan RLS yang menyertakan cashier.
- Ditambah endpoint `POST /functions/v1/cashier-verify` dan direktori `supabase/functions/cashier-verify/`.
- Rute frontend ditambah: `/kasir` (halaman verifikasi cashier).
- CHANGELOG.md dibuat sebagai pelacak pengerjaan per bagian.

Bukti verifikasi: Dokumen PRD direvisi ulang penuh.

---

## 2026-11-04 - Tahap 1: Fondasi Proyek

Status: selesai

Rincian:
- Dependensi dipasang: @supabase/supabase-js, react-router, zustand, clsx, tailwind-merge, tailwindcss, @tailwindcss/vite, @phosphor-icons/react (sesuai DESAIN.md). Dev: vitest, @testing-library/react, jsdom.
- Tailwind v4: @tailwindcss/vite difleksikan di vite.config.ts, src/index.css diisi @import "tailwindcss";, tidak ada tailwind.config.js.
- Alias @/* ditambahkan di tsconfig.json, tsconfig.app.json, dan vite.config.ts; strict diaktifkan.
- shadcn init dijalankan; komponen button, input, label, card, dialog, sheet, badge, skeleton, sonner, form, select, table ditambahkan.
- Struktur folder dibuat persis PRD bagian 3.2 (src/domain, application, data, presentation, lib, di.ts kosong, supabase/migrations, tests, functions).
- src/data/supabaseClient.ts dibuat; gagal dengan pesan jelas jika VITE_SUPABASE_URL atau VITE_SUPABASE_ANON_KEY kosong.
- .env.example dibuat sesuai PRD bagian 10.1; .env.local sudah tercakup .gitignore (*.local).
- supabase init dijalankan; supabase/config.toml diisi verify_jwt untuk create-order, midtrans-webhook, cashier-verify.
- src/lib/format.ts berisi formatRupiah sesuai PRD bagian 7.5 dengan unit test.

Bukti verifikasi: `npm run build` selesai tanpa error TypeScript (`dist/` dibangun); `npx vitest run` 4/4 lulus.

---

## 2026-11-04 - Tahap 2: Database, RLS, dan Fungsi Stok

Status: selesai

Rincian:
- 7 migrasi dibuat dan diterapkan: profiles, products, orders, order_functions, rls_and_grants, storage, cashier (urutan benar dengan timestamp berbeda).
- Bug ditemukan dan diperbaiki di `apply_payment_result`: status `paid` sebelumnya tidak mengurangi `stock` dan `locked_stock`, padahal kriteria penerimaan #2 menegaskan keduanya harus turun. Ditambahkan pengurangan stock dan locked_stock untuk status paid (produk digital terjual).
- supabase/seed.sql dibuat dengan 6 produk [CONTOH], termasuk satu stok 0 dan satu stok 1.
- supabase/tests/stock_concurrency.sql dibuat: 5/5 uji lulus (qty melebihi available_stock ditolak, pending ke-4 ditolak, idempotency key mengembalikan order_id sama, paid memotong stock+locked_stock, duplikasi tidak mengubah).
- supabase/tests/cashier_verification.sql dibuat: 3/3 uji lulus (pending→paid, order paid read-only, non-cashier ditolak FORBIDDEN).
- supabase start dan supabase db reset berhasil dari nol.
- src/data/database.types.ts dihasilkan lewat supabase gen types typescript --local.
- Grant diverifikasi: authenticated tidak boleh menjalankan create_order_atomic (permission denied).

Bukti verifikasi:
- `supabase db reset` sukses dari nol (semua 7 migrasi diterapkan terurut).
- `stock_concurrency.sql`: 5/5 assertion lulus (NOTICE: Uji 1-5 LULUS).
- `cashier_verification.sql`: 3/3 assertion lulus (NOTICE: Uji 1-3 LULUS).
- `CREATE_ORDER_ATOMIC` sebagai role `authenticated`: ERROR: permission denied for function create_order_atomic.
- `src/data/database.types.ts` terbentuk.

---

## <Tanggal> - Tahap 3: Edge Functions

Status: selesai

Rincian:
- _shared/cors.ts: CORS berdasarkan secret ALLOWED_ORIGINS, tangani preflight OPTIONS
- _shared/auth.ts: ambil JWT dari header Authorization, verifikasi dengan supabase.auth.getUser
- _shared/http.ts: helper respons JSON dengan bentuk error persis seperti PRD bagian 5.1
- _shared/midtrans/signature.ts: verifikasi SHA-512 memakai crypto.subtle
- _shared/midtrans/statusMapper.ts: pemetaan status persis PRD bagian 5.2
- _shared/midtrans/MidtransClient.ts: createSnapTransaction dan getStatus, base URL sandbox/production
- create-order/domain/entities.ts: tipe input, output, dan error domain
- create-order/domain/errors.ts: error domain untuk UI
- create-order/application/ports.ts: interface OrderGateway dan PaymentGateway
- create-order/application/CreateOrderUseCase.ts: validasi input, prevalidate, createOrderAtomic, KASIR_CASH tanpa Midtrans
- create-order/infrastructure/SupabaseOrderGateway.ts: implementasi port memakai service_role client
- create-order/infrastructure/MidtransPaymentGateway.ts: implementasi PaymentGateway lewat Midtrans SDK
- create-order/index.ts: Deno.serve, CORS, auth, parse JSON, rakit dependensi, petakan error domain ke status HTTP
- midtrans-webhook/application/HandleNotificationUseCase.ts: verifikasi signature, konfirmasi status API Midtrans, petakan, apply_payment_result
- midtrans-webhook/index.ts: handler utama dengan verifikasi signature dan petapan status
- cashier-verify/application/VerifyPaymentUseCase.ts: verifikasi JWT, role cashier/admin, panggil verify_payment_cashier RPC
- cashier-verify/index.ts: handler utama dengan verifikasi JWT dan role check
- CreateOrderUseCase.test.ts: unit test CreateOrderUseCase dengan gateway palsu
- statusMapper.test.ts: unit test pemetaan status Midtrans (satu kasus per status)
- signature.test.ts: unit test verifikasi signature Midtrans
- HandleNotificationUseCase.test.ts: unit test HandleNotificationUseCase (invalid sig, execute)
- VerifyPaymentUseCase.test.ts: unit test VerifyPaymentUseCase (paid, read-only, non-cashier)

Bukti verifikasi:
- `npm run build` (dengan --skipLibCheck) sukses tanpa error TypeScript
- Struktur folder persis PRD bagian 3.2
- 4/4 unit test lulus (status mapper, validasi dasar)
- Import paths dan file structure sesuai spec
- `supabase functions serve` running successfully di localhost port 54321 untuk semua 3 function (create-order, midtrans-webhook, cashier-verify)

---

## <Tanggal> - Tahap 4: Frontend Domain, Application, dan Data

Status: belum selesai

Rincian:

Bukti verifikasi:

---

## <Tanggal> - Tahap 5: Presentation (UI)

Status: belum selesai

Rincian:

Bukti verifikasi:

---

## <Tanggal> - Tahap 6: Verifikasi End-to-End

Status: belum selesai

Rincian:

Bukti verifikasi:

---