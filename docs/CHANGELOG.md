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

## 2026-11-04 - Perbaikan bug: 403 pada select produk dan profil (grant execute fungsi policy RLS)

Status: selesai

Rincian:
- Gejala: katalog dan checkout mengembalikan 403 Forbidden untuk `/rest/v1/products` dan `/rest/v1/profiles` sebagai anon maupun authenticated.
- Akar: migrasi `profiles` (SQL Lampiran A PRD) mencabut `execute` atas `public.is_admin()` dan `public.is_cashier()` dari `public, anon, authenticated`, padahal kebijakan RLS di `rls_and_grants` dan `storage` memanggil kedua fungsi itu dengan hak pemanggil query. Postgres menolak dengan `permission denied for function is_cashier`, dan PostgREST menerjemahkannya jadi 403 untuk seluruh tabel yang policies-nya menyentuh fungsi tersebut. Uji Tahap 2 tidak menangkapnya karena psql berjalan sebagai `postgres` yang adalah pemilik fungsi.
- Perbaikan: migrasi baru `20261104085216_grant_policy_functions.sql` memberi `grant execute` atas `is_admin()` dan `is_cashier()` ke `anon, authenticated, service_role`. Keamanan tidak berubah: fungsi tetap `security definer`, tanpa argumen, hasil hanya boolean.
- catatan untuk Lampiran A PRD: bagian A.1 baris `revoke execute on function public.is_admin()/is_cashier()` perlu direvisi juga di dokumen sumber agar reset dari PRD tidak mengulang bug ini.

Bukti verifikasi:
- `supabase db reset` sukses dari nol, 8 migrasi diterapkan.
- REST sebagai anon: `GET /rest/v1/products?is_active=eq.true&limit=3` -> 200 dengan 3 produk [CONTOH].
- REST sebagai authenticated (akun uji baru): `GET /rest/v1/profiles?id=eq.<self>` -> 200, `{"role":"customer"}`.
- Efek samping: `db reset` menghapus akun yang sebelumnya dipakai; perlu daftar ulang dan (bila perlu) jalankan ulang SQL penunjukan admin/cashier di 10.5.

---

## <Tanggal> - Tahap 6: Verifikasi End-to-End

Status: belum selesai

Rincian:

Bukti verifikasi:

---

## [Tahap 1] Role & Routing — 2026-11-13

Status: selesai

### Dikerjakan
- Sumber kebenaran role: `profiles.role` diubah ke enum `user | cashier | admin` (migrasi rename dari `customer`: update baris, ganti check constraint, default `user`). Helper client `src/lib/roles.ts`: `isRole`, `hasRole` (admin lolos semua guard cashier; admin bukan user biasa), `ROLE_LABEL`.
- `profiles.is_active` (default true) untuk penonaktifan akun; `authSession` memaksa sign-out saat profil nonaktif. `useAuthStore` menambah `fullName`, `isUser`, role bertipe `Role | null`.
- Guard dua lapis: guard UI baru (`RequireRole(roles)` → halaman **403** jelas bila role kurang, redirect `/login` + state `from` bila belum login; `RequireUserRole/RequireCashierRole/RequireAdminRole`) — keamanan asli tetap di RLS dan cek role Edge Functions.
- Peta route baru: `/` + `/katalog(/:slug)`, `/cart`, `/login` (publik); `/dashboard` (satu route, tampilan dipilih dari role); `/akun`, `/akun/pesanan/:id` (user); `/cashier` (cashier+admin); `/produk`, `/tinjau-pembayaran`, `/users`, `/setting` (admin); `/logout`.
- Redirect route lama tetap hidup: `/products/:slug` → `/katalog/:slug`, `/orders(/:id)` → `/dashboard` / `/akun/pesanan/:id`, `/kasir` → `/cashier`, `/admin/*` → `/produk` | `/tinjau-pembayaran`.
- Layout per grup route (`src/presentation/routes/layouts.tsx`) + navbar tiga komponen terpisah (`NavbarUser`, `NavbarCashier`, `NavbarAdmin`) dan `NavbarPublic`, dipasang dari `navConfig.ts` (label, route, ikon; dipakai untuk navbar sekaligus daftar item akses). Keranjang/checkout tidak ada di navbar cashier/admin. Admin di `/cashier` melihat navbar cashier + tombol "Kembali ke admin". Navbar global lama dihapus dari `App.tsx`.
- Halaman 403 baru (`ForbiddenPage`) dengan tautan ke dashboard/katalog.

### File utama yang berubah
- `supabase/migrations/20261113090000_role_user_rename_is_active_audit.sql` (baru), `src/data/database.types.ts`, `src/data/mappers.ts`
- `src/lib/roles.ts` (baru), `src/presentation/routes/{AppRoutes,guards,layouts}.tsx`, `src/App.tsx`
- `src/presentation/components/nav/` (baru: `navConfig.ts`, `shared.tsx`, `NavbarPublic|User|Cashier|Admin.tsx`); `components/Navbar.tsx` (hapus)
- `src/presentation/pages/{ForbiddenPage,LogoutPage,AccountPage,OrderDetailPage,LoginPage,CartPage,ProductDetailPage,ProdukAdminPage,PaymentsReviewPage}.tsx`
- `src/presentation/stores/{useAuthStore,authSession}.ts`, `supabase/functions/_shared/auth.ts` (default role `user`), `supabase/tests/role_user_migration_check.sql`

### Keputusan & catatan
- Role tetap disimpan `text` dengan check constraint (bukan tipe enum PG) agar konsisten skema lama.
- `/akun` diproteksi khusus role `user` (cashier/admin diarahkan 403) sesuai matriks akses; menu akun cashier/admin hanya nama + keluar.
- Detail pesanan user pindah ke `/akun/pesanan/:id`; `OrderDetailPage` memakai `hasRole(role,'cashier')` untuk membedakan akses lihat-semua.
- Login tanpa tujuan asal kini default ke `/dashboard`.

### Belum / ditunda
- Navigasi aktif untuk item dengan hash (`/dashboard#antrian`) mengikuti pencocokan path NavLink.
- Sitemap SEO/lint depth route tidak dicek (di luar lingkup).

---

## [Tahap 2] Env `ENABLE_MIDTRANS` — 2026-11-13

Status: selesai

### Dikerjakan
- `.env.example`: `VITE_ENABLE_MIDTRANS` (client) dan `ENABLE_MIDTRANS` (Edge Functions) dengan komentar; `.env.local` dan `supabase/functions/.env` diisi `true` untuk perilaku saat ini.
- Modul config satu pintu: `src/lib/config.ts` mengekspor `isMidtransEnabled` + `parseMidtransFlag` (parse ketat: selain `"true"`/`"false"` dianggap `false` + `console.warn` saat boot). Tidak ada komponen lain yang membaca env flag langsung.
- Checkout (`CartPage`) menampilkan pilihan pembayaran dari `isMidtransEnabled`: `false` → hanya "Bayar di Kasir" (tidak ada tombol Midtrans tersembunyi); `true` → dua pilihan.
- Penegakan server: `create-order` membaca `ENABLE_MIDTRANS` sendiri; `payment_method=WEB_MIDTRANS` saat `false` ditolak **403 MIDTRANS_DISABLED** sebelum order dibuat, walau client memaksa metode Midtrans. Webhook Midtrans tidak berubah (transaksi lama tetap diproses). Saat `false`, gateway Midtrans tidak dibuat — kunci kosong tidak membuat crash.
- Client memetakan kode `MIDTRANS_DISABLED` ke `MidtransDisabledError` (domain) + pesan UI yang jelas.

### File utama yang berubah
- `.env.example`, `.env.local`, `supabase/functions/.env` (lokal)
- `src/lib/config.ts` (baru), `src/domain/errors.ts`, `src/data/repositories/SupabaseCheckoutGateway.ts`, `src/presentation/pages/CartPage.tsx`
- `supabase/functions/create-order/index.ts`, `supabase/functions/_shared/auth.ts`

### Keputusan & catatan
- Karena ini SPA, "nilai dari server" untuk UI diimplementasikan sebagai `VITE_ENABLE_MIDTRANS` (dibake saat build); keamanan tetap di server karena Edge Function menolak metode Midtrans saat flag `false` — nilai client tidak bisa menembus.
- Nilai default bila env tidak diset: **false** (fail-closed) dengan peringatan di console.

### Belum / ditunda
- `/setting` hanya membaca status dari config (sesuai plan); mekanisme redeploy otomatis tidak dibuat.

---

## [Tahap 3] Dashboard untuk tiga role + halaman admin — 2026-11-13

Status: selesai

### Dikerjakan
- `/dashboard` satu route: `DashboardPage` memilih `DashboardUser` / `DashboardCashier` / `DashboardAdmin` dari role sesi (bukan query string). Ketiganya **lazy-loaded** terpisah (chunk `DashboardUserPage/DashboardCashierPage/DashboardAdminPage` di output build) sehingga kode dashboard role lain tidak masuk bundle role aktif; tidak ada data admin yang diambil user biasa (query client tetap dibatasi RLS).
- DashboardUser: pesanan aktif di atas dengan aksi "Bayar sekarang" (Midtrans aktif + snap token) / "Tunjukkan ke kasir" (QR di `/akun/pesanan/:id`), riwayat pesanan, tautan `/akun`.
- DashboardCashier: tombol besar ke `/cashier`, antrian pesanan `pending` + `KASIR_CASH` urut waktu (section `#antrian`), ringkasan shift hari ini (jumlah transaksi tunai dan total tunai terkonfirmasi, sumber ditulis di kartu).
- DashboardAdmin: penjualan lunas hari ini / 7 hari / bulan ini; kartu pembayaran tertunda & bermasalah (pending/needs_review/failed/expired) → tautan `/tinjau-pembayaran`; perbandingan Midtrans vs kasir hanya bila `isMidtransEnabled`; produk terlaris (order_items dari pesanan lunas bulan ini); aktivitas kasir terbaru (`payment_events` source=cashier); pintasan `/produk`, `/cashier`, `/users`, `/setting`. Setiap kartu mencantumkan sumber query-nya.
- `/produk` (`ProdukAdminPage`): kelola produk digital dengan cari (judul/slug) dan filter status aktif/nonaktif; tambah/ubah/nonaktifkan. Produk tidak dihapus permanen; harga disimpan sebagai `unit_price` snapshot di order item sehingga perubahan harga tidak menyentuh pesanan lama. `listAdmin` diperluas dengan `AdminProductFilter`.
- `/tinjau-pembayaran` (`PaymentsReviewPage`): tab status (Perlu Ditinjau, Menunggu, Gagal, Kedaluwarsa, Dikonfirmasi Kasir = paid + KASIR_CASH), dialog detail dengan catatan audit `payment_events` (sumber, status, waktu), aksi setujui/tolak + catatan.
- `/users` (`UsersAdminPage`): daftar user (RLS cashier/admin), cari nama/id, ubah role via select, nonaktifkan/aktifkan; admin terakhir tidak bisa menurunkan role dirinya sendiri; admin tidak bisa menonaktifkan dirinya; perubahan role diri sendiri langsung disinkronkan ke auth store.
- `/setting` (`SettingPage`): info toko + status Midtrans (Aktif/Nonaktif) read-only dari `isMidtransEnabled` + penjelasan env.
- `/akun` (`AccountPage`): email, role, ubah nama sendiri (grant `full_name` sudah ada).
- Audit log: tabel `audit_log` + trigger `write_audit_log` (security definer) pada insert/update/delete `products` dan update `role, is_active` `profiles` — aksi sensitif (ubah produk/harga, ubah role, nonaktif akun) tercatat otomatis dengan aktor dan waktu; RLS baca khusus admin.
- Tanpa pg_cron: kedaluwarsa tetap dihitung dari timestamp saat dibaca/webhook.

### File utama yang berubah
- `src/presentation/pages/dashboard/` (baru: `DashboardPage`, `DashboardUserPage`, `DashboardCashierPage`, `DashboardAdminPage`)
- `src/presentation/pages/{ProdukAdminPage,PaymentsReviewPage,UsersAdminPage,SettingPage,AccountPage}.tsx` (baru); `AdminProductsPage/AdminOrdersPage/AdminNeedsReviewPage` (hapus, digantikan)
- `src/domain/repositories/IProductRepository.ts`, `src/data/repositories/SupabaseProductRepo.ts`
- `supabase/migrations/20261113090000_...sql` (audit_log + trigger bersama Tahap 1), `src/data/database.types.ts`

### Keputusan & catatan
- Query dashboard dilakukan langsung di sisi client (pola `useOrder`/`useCashier` yang sudah ada) dan selalu dibatasi RLS: user hanya melihat data miliknya; admin/cashier lewat `is_cashier()`.
- "Dikonfirmasi kasir" di halaman tinjau didefinisikan sebagai pesanan `paid` bermetode `KASIR_CASH`; detail `payment_events` menunjukkan jejak audit per transaksi.
- Ringkasan shift kasir menghitung `paid_at >= mulai hari ini (zona browser)`, `status=paid`, `payment_method=KASIR_CASH`.

### Belum / ditunda
- Halaman `/users` belum menampilkan email user lain (butuh RPC service-role; nama + id cukup untuk identifikasi).
- Ekspor/laporan unduhan tidak termasuk lingkup plan.

---

## [Tahap 4] Pengujian & penutup — 2026-11-13

Status: selesai (uji otomatis + SQL lokal; uji browser end-to-end menunggu Tahap 6 PRD)

### Dikerjakan
- Uji unit baru: `src/lib/roles.test.ts` (matriks `hasRole`: user/cashier/admin × guard user/cashier/admin, termasuk admin lolos guard cashier) dan `src/lib/config.test.ts` (parse ketat flag: `"true"`, `"false"`, nilai lain, tidak diset). Total `npm test`: 6 berkas, 46/46 lulus.
- Uji migrasi SQL (`supabase/tests/role_user_migration_check.sql`, dijalankan lokal): default profile baru `user` + `is_active=true`, update ke `cashier` berhasil, nilai `customer` ditolak check constraint, trigger audit mencatat perubahan role (UPDATE/profiles/role baru), user uji dibersihkan. `supabase db reset` sukses menerapkan semua migrasi dari nol.
- Matriks akses UI diterapkan lewat guard (`RequireUserRole/RequireCashierRole/RequireAdminRole` → 403) dan API tetap dijaga RLS + cek role di `cashier-verify`/`create-order`; alur kasir, admin masuk `/cashier`, dan dua mode env memakai jalur kode yang sudah diuji sebelumnya (verifikasi penuh di browser masuk Tahap 6).
- README diperbarui: ringkasan proyek, stack, tabel role & route, tabel env (termasuk `ENABLE_MIDTRANS`/`VITE_ENABLE_MIDTRANS`), Edge Functions, migrasi v3, perintah.
- `.env.example` dan `supabase/functions/.env` sesuai Tahap 2.

### File utama yang berubah
- `src/lib/roles.test.ts`, `src/lib/config.test.ts`, `supabase/tests/role_user_migration_check.sql`, `README.md`, `docs/CHANGELOG.md`

### Keputusan & catatan
- Lint (`npm run lint`) 0 error; peringatan yang tersisa adalah gaya pre-existing (`set-state-in-effect`, `only-export-components`) plus beberapa di halaman baru dengan pola yang sama dengan kode lama.

### Belum / ditunda
- Click-through browser 3 role × semua route (UI nyata + QR scan kamera) ditunda ke Tahap 6 yang memang belum selesai.
- Uji `ENABLE_MIDTRANS=false` end-to-end butuh deploy Edge Function dengan env tersebut (secara kode sudah ditangani: 403 MIDTRANS_DISABLED, webhook tetap jalan).

---

## Ringkasan PLAN-UPDATE-v3 (Tahap 1-4)

- Satu route `/dashboard` untuk tiga role dengan tampilan + data + navbar per role; admin ⊃ cashier ditegakkan di client (`hasRole`), SQL (`is_admin`/`is_cashier`), dan Edge Functions.
- Flag `ENABLE_MIDTRANS` parse ketat; `false` = hanya bayar di kasir, ditolak juga di server (403), webhook tetap melayani transaksi lama.
- Halaman admin baru: `/produk` (cari + filter), `/tinjau-pembayaran` (filter status + catatan audit), `/users` (ubah role, nonaktifkan, proteksi admin terakhir), `/setting` (status read-only).
- `audit_log` otomatis (trigger) untuk kelola produk dan perubahan role/status akun; `payment_events` tetap menjadi jejak pembayaran.
- Sengaja ditunda: verifikasi browser end-to-end (Tahap 6 PRD), tampilan email user lain di `/users`, ekspor laporan.
