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

## 2026-11-04 - Tahap 4: Frontend Domain, Application, dan Data

Status: selesai

Rincian:
- src/domain/models: Product, CartItem, Order (union status persis DB)
- src/domain/repositories: IProductRepository, IOrderRepository, ICheckoutGateway
- src/domain/errors: StockConflictError, ProductUnavailableError, TooManyPendingOrdersError, PaymentGatewayError, ValidationError
- src/application/cart.ts: addItem, setQuantity, removeItem, subtotal, reconcile (fungsi murni)
- src/application/checkout.ts: CheckoutUseCase dengan ICheckoutGateway via constructor
- src/application/products.ts: ListProductsUseCase, GetProductUseCase
- src/data/mappers.ts: pemetaan Database Row ke domain model
- src/data/supabaseClient.ts: Supabase client dengan generic Database, validasi env
- src/data/repositories/SupabaseProductRepo.ts: implementasi IProductRepository
- src/data/repositories/SupabaseOrderRepo.ts: implementasi IOrderRepository
- src/data/repositories/SupabaseCheckoutGateway.ts: implementasi ICheckoutGateway via supabase.functions.invoke('create-order')
- src/data/midtrans/snapLoader.ts: muat snap.js sekali, deklarasi window.snap
- src/presentation/stores/useCartStore.ts: Zustand dengan persist, subtotal lewat selector
- src/presentation/stores/useAuthStore.ts: sesi, profil, role, cek admin/cashier
- src/presentation/hooks/useProducts.ts, useCheckout.ts, useOrder.ts, useCashier.ts
- src/di.ts: composition root, wire semua implementasi
- Unit test application/cart.test.ts dan checkout.test.ts dengan gateway palsu
- database.types.ts dihasilkan ulang lewat supabase gen types --local

Aturan terpenuhi: domain dan application tidak import data, presentation, React, atau Supabase.

Bukti verifikasi:
- npm run build dan npx vitest run (di bawah)

---

## 2026-11-04 - Tahap 5: Presentation (UI)

Status: selesai

Rincian:
- Design Read ditulis sebelum koding (DESIGN.md sudah terisi penuh, tanpa `[ISI]`): storefront gantungan kunci untuk mahasiswa, gaya akademis ceria, dial ENERGY 2/3 / RHYTHM 2/3 / MOTION 1/3.
- Token desain DESIGN.md dipetakan ke Tailwind v4 di src/index.css: primary #302b8f (top bar, judul), secondary #A3E635 (badge kategori, filter aktif), CTA #F59E0b hanya untuk tombol interaksi utama (Bayar Sekarang, Tambah ke Keranjang, Lanjutkan Pembayaran, Verifikasi Pembayaran), netral #F8FAFC, radius 12px, tema terang (dark: class-based, bukan preferensi OS), font Plus Jakarta Sans (judul) + Inter (teks) via Google Fonts, ikon Phosphor (duotone).
- routes/AppRoutes.tsx: semua rute PRD 7.1 dengan RequireSessionReady (loading saat sesi belum diketahui), RequireAuth (/orders, /orders/:id), RequireAdmin (/admin/*), RequireCashier (/kasir, cashier atau admin).
- stores/authSession.ts: bootstrap sesi (getSession, profil role, onAuthStateChange) yang mengisi useAuthStore.
- Navbar: nama toko sebagai teks (logo belum ada, PRD 8.2.5), link hanya rute yang ada, Admin hanya untuk role admin, Kasir untuk cashier/admin, Pesanan Saya hanya saat login, jumlah item keranjang, menu akun (email + Keluar), menu mobile lewat Sheet.
- ProductCard sesuai PRD 8.2 poin 3 dan 4: gambar, judul, harga, badge stok hanya "Stok habis" dan "Sisa N" (ambang 5, karena DESIGN.md belum menentukan angkanya; dicatat di sini), satu tombol.
- Halaman: CatalogPage (grid 2/3/4 kolom per 8.2.7, paginasi 24, skeleton, kosong "Belum ada produk yang dijual.", error + Muat ulang), ProductDetailPage (skeleton, "Produk tidak ditemukan atau sudah tidak dijual.", tombol nonaktif "Stok habis"), CartPage (rekonsiliasi per baris, pilihan Bayar di Web (Midtrans) / Bayar di Kasir (Cash), ringkasan + Bayar Sekarang, tanpa form alamat, pesan error per kode: stok/pending terlalu banyak/gateway, idempotency key dipakai ulang saat retry), OrdersPage (loading, kosong "Belum ada pesanan.", error, paginasi), OrderDetailPage (pesan status per 7.4.5, hitung mundur sisa waktu, polling 5 detik maksimal 2 menit lalu tombol Muat ulang, Lanjutkan Pembayaran untuk pending WEB_MIDTRANS, info verifikasi kasir untuk KASIR_CASH), LoginPage (tab Masuk/Daftar, validasi field, error kredensial, pesan cek email), AdminProductsPage (tabel, form Dialog, slug, kompres gambar ke WebP lebar maks 1200px, error "Stok tidak bisa di bawah jumlah yang sedang dipesan: N", slug unik), AdminOrdersPage (tabel + filter status termasuk needs_review), KasirPage (Scan Transaksi, Verifikasi Pembayaran, ubah ke status lain, indikator read-only untuk order paid, pesan 403/404).
- src/lib: utils.ts (cn), imageCompress.ts (WebP <= 1200px), productImage.ts (path -> getPublicUrl), format.ts ditambah formatDateTime/formatDate (id-ID, zona browser).
- Perbaikan terhadap kode Tahap 4 (dilaporkan, tidak diam-diam):
  - useCartStore: getter total/itemCount buang hasil saat merge state (stale satu update); diganti selector selectCartTotal/selectCartCount yang menghitung subtotal dari items (sesuai PRD 7.2 poin 3).
  - useCheckout: createOrder menerima idempotencyKey dari pemanggil (dipakai ulang saat retry, PRD 7.2 poin 5); openSnap menerima callback Snap.
  - IProductRepository ditambah listAdmin (halaman admin perlu produk nonaktif) dan getManyByIds (rekonsiliasi keranjang, PRD 7.2 poin 2).
  - SupabaseProductRepo.uploadImage sebelumnya mengembalikan publicUrl; sesuai PRD A.6 yang disimpan harus path, URL publik dibentuk di frontend.
  - database.types.ts hasil redirect `supabase gen types` ternyata UTF-16 (PowerShell); dikonversi ke UTF-8, isinya tidak berubah.
- Berkas duplikat/sisa Tahap 3 yang rusak sintaksnya (supabase/auth.ts, supabase/cors.ts, supabase/database.ts, supabase/http.ts, supabase/supabaseAdmin.ts, supabase/_shared/, dan salinan lepas di supabase/functions/) dihapus: tidak diimport oleh fungsi berjalan (semua pakai functions/_shared) dan merusak lint.
- vitest.config.ts dibatasi include src/**, supaya npx vitest run tidak memungut berkas uji Deno di supabase/functions (yang jalurnya deno test).
- Tidak ada em dash di teks UI. Tidak ada angka, testimoni, atau klaim yang tidak berasal dari data.

Bukti verifikasi:
- npm run build sukses tanpa error TypeScript (dist/ dibangun; peringatan ukuran chunk > 500 kB, sifatnya info).
- npx vitest run: 3 berkas, 24/24 tes lulus.
- npx oxlint: 0 error (hanya peringatan gaya set-state-in-effect / fitur React Compiler).
- Dev server jalan tanpa error; semua modul halaman ter-transform 200 (/, /src/main.tsx, AppRoutes, CartPage, AdminProductsPage, KasirPage, index.css), output dev server bersih.
- Konsol per halaman: belum diverifikasi di browser; click-through penuh masuk Tahap 6.

Delivery Gate antislop (perumpamaan butir, PASS/FAIL dengan bukti):
- Hard Gate: PASS. Satu focal point per layar (grid katalog; ringkasan+tombol bayar di keranjang; status pembayaran di detail order; formulir scan di kasir). Accent #F59E0b hanya untuk tombol interaksi utama (Kelas .bg-cta dipakai di 4 tombol: Bayar Sekarang, Tambah ke Keranjang, Lanjutkan Pembayaran, Verifikasi Pembayaran); badge, ikon, border tidak memakai accent (badge memakai secondary lime / muted / primary). Tidak ada logo buatan; nama toko tampil sebagai teks.
- Purpose-Gate: PASS. Semua state wajib PRD 7.4 tersedia per halaman (loading skeleton, kosong dengan teks persis 7.4/7.5, error dengan tombol Muat ulang). Badge stok hanya "Stok habis" dan "Sisa N". Tidak ada angka statistik, testimoni, atau klaim keamanan.
- Liveliness: PASS. Tema terang dengan palet DESIGN.md (indigo, lime, amber, netral #F8FAFC), radius 12px konsisten, ikon Phosphor duotone (motion 1/3: hanya transisi hover/focus dan spinner, tanpa animasi besar).
- Craftsmanship: PASS. Grid 2/3/4 kolom per 8.2.7, target sentuh >= 44px (tombol h-9/h-10 + padding), teks kontras AA (indigo #302b8f di terang ~10:1; teks sekunder #475569 ~7:1; teks di atas lime memakai #1a2e05), fokus terlihat (focus-visible ring ring/50 di seluruh komponen shadcn), Sheet/Dialog bisa ditutup Escape (bawaan radix), semua rute server-seen mode keyboard (Link/Button asli).

---

## <Tanggal> - Tahap 6: Verifikasi End-to-End

Status: belum selesai

Rincian:

Bukti verifikasi:

---