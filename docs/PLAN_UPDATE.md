# PLAN-UPDATE-v3 — Role Routing, Toggle Midtrans, Dashboard, Redesign (rev. 2: `/dashboard` untuk ketiga role)

Lanjutan dari `PRD-v2-ecommerce.md` (web pemesanan produk digital, role cashier, checkout Midtrans / bayar di kasir, tanpa pg_cron).

> **Catatan untuk AI/agent yang mengerjakan:** kerjakan per tahap secara berurutan. Setiap tahap selesai → tulis entri di `CHANGELOG.md` (apa yang dikerjakan, file yang berubah, keputusan penting), lalu lanjut ke tahap berikutnya. Jangan menyentuh tahap berikutnya sebelum acceptance criteria tahap ini terpenuhi.

---

## 0. Asumsi & hal yang perlu dikonfirmasi

- Nama env ditulis `ENABLE_MIDTTANS` di brief; plan ini memakai **`ENABLE_MIDTRANS`** (diduga typo). Jika memang sengaja `ENABLE_MIDTTANS`, ganti satu nama konstanta saja di `lib/config` (lihat Tahap 2).
- `/dashboard` = **satu route dashboard untuk ketiga role** (user, cashier, admin). Route yang sama, tetapi isi, layout, dan data ditentukan oleh pengecekan role di server (lihat Tahap 1 dan 3). `/akun` hanya untuk profil dan detail pesanan; `/cashier` tetap sebagai panel kerja kasir (scan & konfirmasi bayar).
- `/tinjau-pembayaran` dianggap **khusus admin** (review pembayaran, mis. bukti/transaksi bermasalah). Pembayaran tunai ditangani cashier di `/cashier`. Ubah di matriks akses bila ingin cashier ikut.
- `/produk` sekarang dipakai **admin** (kelola produk). Katalog publik untuk pelanggan dipindah ke **`/katalog`** agar tidak bentrok.
- Stack tidak diasumsikan; gunakan pola yang sesuai framework yang sudah dipakai (middleware / route guard / layout per grup route).

---

## Tahap 1 — Role & Routing

### Tujuan
Tiga area terpisah (user, cashier, admin), masing-masing dengan navbar dan isi dashboard sendiri. Semua role memakai route `/dashboard` sebagai dashboard; yang tampil ditentukan oleh role. Admin boleh masuk area cashier; sebaliknya tidak.

### Hierarki role
`admin` ⊃ `cashier` ⊃ (bukan user biasa). `user` terpisah: hanya area publik + area akun sendiri.

### Peta route

| Route | Akses | Isi |
|---|---|---|
| `/`, `/katalog/*`, `/checkout` | publik / user | katalog, keranjang, checkout |
| `/dashboard` | user, cashier, admin (harus login) | **dashboard per role**, dipilih server dari role (lihat di bawah) |
| `/akun` | user | profil dasar dan pengaturan akun |
| `/akun/pesanan/[id]` | user (pemilik) | detail + QR/halaman pesanan untuk discan kasir |
| `/cashier` | cashier, admin | panel kerja kasir: scan / cari pesanan, konfirmasi bayar tunai |
| `/produk` | admin | kelola produk digital (daftar, tambah, ubah, aktif/nonaktif) |
| `/tinjau-pembayaran` | admin | review / tindak lanjut pembayaran |
| `/users` | admin | kelola user & role |
| `/setting` | admin | pengaturan toko, status Midtrans (read-only dari env), dsb. |
| `/login`, `/logout` | publik | satu pintu login; redirect sesuai role |

### Redirect setelah login
- Semua role → `/dashboard` (atau halaman asal sebelum login, jika role-nya boleh mengaksesnya)

### Perilaku `/dashboard` (pengecekan role)
- Route `/dashboard` hanya butuh login. Server membaca role lalu merender **satu** dari tiga tampilan: `DashboardUser`, `DashboardCashier`, `DashboardAdmin`. Tidak ada satu komponen besar berisi `if role` di sisi client.
- Data diambil di server sesuai role. Disarankan endpoint terpisah per role (mis. `/api/dashboard/user`, `/api/dashboard/cashier`, `/api/dashboard/admin`), masing-masing dengan guard sendiri. Request user ke endpoint cashier/admin ditolak 403.
- Role admin selalu melihat dashboard admin; tidak ada mode "lihat sebagai role lain".
- Karena satu URL dipakai tiga role, layout `/dashboard` memilih navbar berdasarkan role di server (`NavbarUser` / `NavbarCashier` / `NavbarAdmin`). Navbar tetap tiga komponen terpisah.

### Pekerjaan
1. Satu sumber kebenaran role (kolom `role` enum: `user | cashier | admin`) + helper `hasRole(user, ...roles)` dengan aturan "admin lolos semua guard cashier".
2. Guard di **dua lapis**: (a) middleware / route guard untuk redirect UX, (b) cek ulang di setiap API / server action / RLS policy. Guard UI saja tidak cukup.
3. Layout terpisah per area: `(public)`, `(cashier)`, `(admin)`, dan layout bersama untuk `/dashboard` serta `/akun` yang memilih navbar dari role. Navigasi tiap layout hanya menampilkan menu yang boleh diakses role itu. Admin yang membuka `/cashier` mendapat tautan kembali ke `/dashboard`.
4. Halaman 403 / redirect jelas saat role tidak cukup (bukan 404 yang membingungkan, bukan layar kosong).

### Navbar berbeda per role
Navbar dibuat sebagai **tiga komponen terpisah** (`NavbarUser`, `NavbarCashier`, `NavbarAdmin`), masing-masing dipasang di layout grupnya. Bukan satu navbar dengan `if role` di dalamnya, supaya item menu tidak bocor lintas role dan mudah dirawat. Item menu didefinisikan dalam satu file konfigurasi per role (label, route, ikon) dan dipakai untuk navbar sekaligus pemeriksaan akses.

| Role | Item navbar | Aksi di sisi kanan |
|---|---|---|
| Publik (belum login) | Katalog | Masuk, Daftar |
| User | Katalog, Dashboard (`/dashboard`) | Keranjang, menu akun (profil `/akun`, keluar) |
| Cashier | Dashboard (`/dashboard`), Panel kasir (`/cashier`), Antrian bayar di kasir | menu akun (nama, keluar) |
| Admin | Dashboard (`/dashboard`), Produk, Cashier, Tinjau pembayaran, Users, Setting | menu akun (nama, keluar) |

Aturan tambahan:
- Admin yang berada di `/cashier` tetap melihat **navbar cashier** (konteks kerja kasir) ditambah tombol "Kembali ke admin" → `/dashboard`.
- Item aktif ditandai sesuai route saat ini.
- Di mobile, navbar user berupa top bar sederhana; navbar admin berupa drawer/sidebar; navbar cashier tetap ringkas dan mudah dijangkau jempol di tablet.
- Keranjang dan tautan checkout tidak muncul di navbar cashier dan admin.

### Acceptance criteria
- User biasa membuka `/cashier`, `/produk`, `/users`, `/setting`, `/tinjau-pembayaran` → ditolak (redirect/403), dan API terkait menolak dengan 403.
- Cashier membuka `/produk`, `/users`, `/setting`, `/tinjau-pembayaran` → ditolak.
- User, cashier, dan admin membuka `/dashboard` → masing-masing melihat dashboard role-nya sendiri, tidak pernah dashboard role lain. Memanggil API dashboard role lain → 403.
- Admin bisa membuka semua route, termasuk `/cashier`.
- Belum login → diarahkan ke `/login` lalu kembali ke tujuan semula.
- Setiap role melihat navbar dengan item berbeda sesuai tabel; tidak ada item menu untuk route yang tidak boleh diakses role tersebut.

**CHANGELOG:** catat skema role, daftar guard, daftar route yang terproteksi.

---

## Tahap 2 — Env `ENABLE_MIDTRANS`

### Aturan
- Key: `ENABLE_MIDTRANS`, nilai `true` / `false` (string, parse ketat; nilai selain itu dianggap `false` dan log peringatan saat boot).
- `true` → checkout menawarkan dua pilihan: **Bayar di web (Midtrans)** dan **Bayar di kasir**.
- `false` → checkout **hanya** menampilkan **Bayar di kasir**; tidak ada pilihan lain, tidak ada tombol Midtrans tersembunyi.

### Pekerjaan
1. Tambah ke `.env.example`:
   ```env
   # true  = pelanggan bisa bayar online via Midtrans atau di kasir
   # false = hanya bayar di kasir
   ENABLE_MIDTRANS=true
   ```
2. Buat satu modul config server-side (`lib/config`) yang membaca env sekali dan mengekspor `isMidtransEnabled`. Tidak ada komponen/route lain yang membaca `process.env.ENABLE_MIDTRANS` langsung.
3. UI checkout mengambil nilai ini dari server (props dari server component atau endpoint config), bukan dari bundle client yang bisa kedaluwarsa.
4. **Penegakan di server:** endpoint pembuatan pembayaran Midtrans menolak request (400/403) bila flag `false`, walaupun client mengirim `payment_method=midtrans`. Webhook Midtrans tetap diterima untuk transaksi lama yang sudah dibuat sebelum flag dimatikan.
5. Saat `false`, kunci Midtrans (`MIDTRANS_SERVER_KEY`, dst.) tidak wajib ada; aplikasi tidak boleh crash karena kunci kosong.
6. `/setting` menampilkan status saat ini (Aktif / Nonaktif) sebagai informasi saja; perubahan lewat env + redeploy.

### Acceptance criteria
- `false`: checkout hanya "Bayar di kasir"; POST manual dengan metode Midtrans ditolak.
- `true`: kedua pilihan muncul dan alur Midtrans berjalan seperti sebelumnya.
- Mengubah flag tidak merusak pesanan yang sudah ada.

**CHANGELOG:** catat nilai default, tempat flag dibaca, perilaku webhook saat flag `false`.

---

## Tahap 3 — Dashboard untuk tiga role (satu route `/dashboard`)

Semua role memakai route **`/dashboard`**, tetapi setiap role **wajib punya tampilan dan data dashboard sendiri** (dipilih server dari role, lihat Tahap 1):

| Role | Route dashboard | Fokus |
|---|---|---|
| User | `/dashboard` (tampilan user) | pesanan saya dan aksi pembayaran |
| Cashier | `/dashboard` (tampilan cashier) | antrian kasir dan ringkasan shift; pintu masuk ke `/cashier` |
| Admin | `/dashboard` (tampilan admin) | penjualan, pembayaran bermasalah, kendali sistem |

Isi dashboard dibuat sederhana dan berguna; hindari kartu statistik hiasan yang tidak bisa ditindaklanjuti.

### User — `/dashboard` (role `user`)
- Pesanan aktif (belum dibayar / menunggu kasir) paling atas, dengan aksi langsung: **Bayar sekarang** (jika Midtrans aktif) atau **Tunjukkan ke kasir** (buka QR/halaman pesanan).
- Riwayat pesanan + status.
- Tautan ke profil dasar di `/akun`.

### Cashier — `/dashboard` (role `cashier`)
- Tombol utama besar ke **panel kasir `/cashier`** (scan / cari pesanan lewat kode atau QR, lalu **konfirmasi pembayaran tunai**). Panel kerjanya tetap di `/cashier`.
- Daftar pesanan "bayar di kasir" yang menunggu, urut waktu.
- Ringkasan shift hari ini: jumlah transaksi dan total tunai yang dikonfirmasi.
- Tanpa akses ke pengaturan, user, atau laporan penuh.

### Admin — `/dashboard` (role `admin`)
- Penjualan hari ini / 7 hari / bulan ini (pesanan lunas saja).
- Pembayaran tertunda & bermasalah → tautan ke `/tinjau-pembayaran`.
- Perbandingan Midtrans vs kasir (hanya tampil bila `ENABLE_MIDTRANS=true`).
- Produk terlaris, aktivitas cashier terbaru.
- Pintasan ke `/produk`, `/cashier`, `/users`, `/setting`.

### Halaman admin lain
- **`/produk`**: daftar produk digital dengan cari dan filter (aktif/nonaktif). Aksi: tambah, ubah (nama, deskripsi, harga, file/akses digital), aktif/nonaktifkan. Produk yang pernah dipesan tidak dihapus permanen, hanya dinonaktifkan agar riwayat pesanan tetap utuh. Perubahan harga tidak mengubah pesanan yang sudah dibuat (simpan harga saat pesan di item pesanan). Hanya admin yang bisa membuka halaman dan API-nya. Karena produk digital, tanpa kolom alamat, berat, atau ongkir.
- **`/tinjau-pembayaran`**: daftar pembayaran dengan filter status (menunggu, gagal, kedaluwarsa, dikonfirmasi kasir), detail transaksi, aksi tinjau/setujui/tolak, dan catatan audit (siapa, kapan).
- **`/users`**: daftar user, cari, ubah role (`user/cashier/admin`), nonaktifkan akun. Admin tidak bisa menurunkan role dirinya sendiri bila dia admin terakhir.
- **`/setting`**: info toko, status integrasi Midtrans (dari env), preferensi lain yang relevan.

### Catatan teknis
- Tanpa pg_cron (sesuai PRD-v2): kedaluwarsa pembayaran dihitung dari timestamp saat dibaca / saat webhook, bukan job terjadwal.
- Data dashboard diambil lewat query terfilter per role di server; jangan kirim data admin ke client cashier atau user, dan jangan sertakan kode komponen dashboard role lain di bundle yang dikirim ke role tersebut.

### Acceptance criteria
- Satu route `/dashboard` menampilkan dashboard berbeda sesuai role (tabel di atas), dan tidak bisa dipaksa menampilkan dashboard role lain lewat query string atau API.
- Setiap angka di dashboard admin bisa ditelusuri ke daftar sumbernya.
- Aksi sensitif (ubah role, tinjau pembayaran, ubah produk/harga) tercatat di audit log.
- Admin bisa menambah, mengubah, dan menonaktifkan produk di `/produk`; produk nonaktif hilang dari `/katalog` tetapi tetap muncul di riwayat pesanan lama.

**CHANGELOG:** catat query/endpoint per dashboard dan tabel audit log.

---

## Tahap 4 — Pengujian & penutup

- Uji matriks akses: 3 role × semua route × (UI + API).
- Uji `/dashboard`: login sebagai tiap role, pastikan tampilan dan data sesuai role, dan API dashboard role lain mengembalikan 403.
- Uji navbar: login sebagai tiap role dan pastikan item menu sesuai tabel Tahap 1.
- Uji `/produk`: tambah, ubah harga, nonaktifkan; pastikan pesanan lama tidak berubah.
- Uji dua mode env: `ENABLE_MIDTRANS=true` dan `false`, untuk checkout end-to-end.
- Uji alur kasir: user pilih bayar di kasir → cashier scan → konfirmasi → status user ikut berubah.
- Uji admin masuk `/cashier` dan menjalankan alur kasir.
- Perbarui `README` (route, role, env) dan `.env.example`.

**CHANGELOG:** entri penutup berisi ringkasan seluruh perubahan v3 dan hal yang sengaja ditunda.

---

## Format `CHANGELOG.md` (per tahap)

```md
## [Tahap N] Judul tahap — YYYY-MM-DD
### Dikerjakan
- ...
### File utama yang berubah
- ...
### Keputusan & catatan
- ...
### Belum / ditunda
- ...
```