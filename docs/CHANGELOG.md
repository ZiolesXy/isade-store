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

## Template entri berikutnya (salin saat satu bagian selesai)

## <Tanggal> - Tahap 1: Fondasi Proyek

Status: belum selesai

Rincian:

Bukti verifikasi:

---

## <Tanggal> - Tahap 2: Database, RLS, dan Fungsi Stok

Status: belum selesai

Rincian:

Bukti verifikasi:

---

## <Tanggal> - Tahap 3: Edge Functions

Status: belum selesai

Rincian:

Bukti verifikasi:

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