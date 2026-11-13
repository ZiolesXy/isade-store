# Isade Store

Web pemesanan produk digital (gantungan kunci) untuk mahasiswa: katalog publik, keranjang, checkout dengan dua opsi pembayaran (Midtrans atau tunai di kasir), panel kasir, dan dashboard per role. Sesuai `docs/PRD-v2-ecommerce.md` dan `docs/PLAN_UPDATE.md` (v3).

## Stack

- React 19 + Vite + TypeScript (SPA), react-router v8
- Tailwind CSS v4, komponen shadcn/radix, ikon Phosphor
- Supabase: Auth, Postgres (RLS), Storage, Edge Functions
- Midtrans Snap (sandbox/production), QR (`qrcode.react`, `@yudiel/react-qr-scanner`)
- State: zustand; test: vitest

## Role

Sumber kebenaran role: kolom `profiles.role` (`user | cashier | admin`). Helper client: `src/lib/roles.ts` (`hasRole`), helper DB: `is_admin()` / `is_cashier()` (admin lolos semua guard cashier).

| Area | Akses |
|---|---|
| `/`, `/katalog`, `/katalog/:slug`, `/cart`, `/login` | publik / user |
| `/dashboard` | user, cashier, admin (satu route, tampilan dipilih dari role) |
| `/akun`, `/akun/pesanan/:id` | user |
| `/cashier` | cashier, admin |
| `/produk`, `/tinjau-pembayaran`, `/users`, `/setting` | admin |

Guard dua lapis: guard UI (`src/presentation/routes/guards.tsx`, redirect/403) + keamanan asli di RLS Supabase dan cek role di Edge Functions. Guard UI saja tidak cukup.

## Env

Salin `.env.example` ke `.env.local` (client) dan set secret Edge Function lewat `supabase/functions/.env` atau `supabase secrets set`:

| Variabel | Sisi | Keterangan |
|---|---|---|
| `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` | client | wajib |
| `VITE_MIDTRANS_CLIENT_KEY`, `VITE_MIDTRANS_IS_PRODUCTION` | client | Midtrans Snap |
| `VITE_ENABLE_MIDTRANS` | client | `true` = checkout menawarkan Midtrans + kasir; `false` = hanya bayar di kasir (parse ketat, selain `true`/`false` dianggap `false` + peringatan) |
| `MIDTRANS_SERVER_KEY`, `MIDTRANS_CLIENT_KEY`, `MIDTRANS_IS_PRODUCTION` | Edge Functions | kredensial Midtrans |
| `ENABLE_MIDTRANS` | Edge Functions | server menolak `payment_method=WEB_MIDTRANS` (403 `MIDTRANS_DISABLED`) saat `false`; webhook tetap menerima transaksi lama; kunci Midtrans tidak wajib saat `false` |
| `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | Edge Functions | klien service role |
| `ORDER_TTL_MINUTES`, `ALLOWED_ORIGINS`, `APP_URL` | Edge Functions | TTL pesanan, CORS, URL callback |

## Edge Functions

- `create-order` — validasi, RPC `create_order_atomic`, Snap untuk `WEB_MIDTRANS`
- `midtrans-webhook` — verifikasi signature, RPC `apply_payment_result`
- `cashier-verify` — verifikasi pembayaran tunai (role cashier/admin), RPC `verify_payment_cashier`

## Database

Migrasi di `supabase/migrations/`. Poin penting v3:

- Role enum `user | cashier | admin` (rename dari `customer`), default `user`
- `profiles.is_active` — nonaktifkan akun; sesi akun nonaktif langsung ditandai keluar
- `audit_log` — trigger otomatis untuk kelola produk dan perubahan role/is_active (siapa, kapan, isi sebelum/sesudah); baca khusus admin
- Policy `profiles_update_admin` + grant kolom `role`, `is_active`

## Perintah

```bash
npm run dev       # dev server
npm run build     # tsc -b + vite build
npm run lint      # oxlint
npm test          # vitest run
supabase db reset # reset DB lokal + migrasi + seed
supabase functions serve  # jalankan Edge Functions lokal (butuh supabase/functions/.env)
```

Uji SQL tambahan: `supabase/tests/*.sql` (psql), uji Deno: `deno test` di `supabase/functions/*`.

## Dokumen

- `docs/PRD-v2-ecommerce.md`, `docs/DESIGN.md`, `docs/PLAN_UPDATE.md`
- `docs/CHANGELOG.md` — catatan pengerjaan per tahap
