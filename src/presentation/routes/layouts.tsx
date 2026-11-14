// Layout per grup route (PLAN-UPDATE-v3 Tahap 1).
// Setiap layout memasang navbar komponen tersendiri sesuai role; item menu
// hanya rute yang boleh diakses role tersebut (lihat components/nav/navConfig.ts).
import { Outlet } from 'react-router';
import { useAuthStore } from '../stores/useAuthStore';
import { NavbarPublic } from '../components/nav/NavbarPublic';
import { NavbarUser } from '../components/nav/NavbarUser';
import { NavbarCashier } from '../components/nav/NavbarCashier';
import { NavbarAdmin } from '../components/nav/NavbarAdmin';

/** Area publik: navbar pengunjung untuk tamu, navbar user untuk yang sudah login. */
export function PublicLayout() {
  const userId = useAuthStore((s) => s.userId);
  return (
    <>
      {userId ? <NavbarUser /> : <NavbarPublic />}
      <Outlet />
    </>
  );
}

/** /dashboard dipakai tiga role: navbar dipilih server/client dari role. */
export function DashboardLayout() {
  const role = useAuthStore((s) => s.role);
  return (
    <>
      {role === 'admin' ? (
        <NavbarAdmin />
      ) : role === 'cashier' ? (
        <NavbarCashier />
      ) : (
        <NavbarUser />
      )}
      <Outlet />
    </>
  );
}

/** /akun bisa diakses semua role yang login; navbar menyesuaikan role. */
export function AccountLayout() {
  const role = useAuthStore((s) => s.role);
  return (
    <>
      {role === 'admin' ? (
        <NavbarAdmin />
      ) : role === 'cashier' ? (
        <NavbarCashier />
      ) : (
        <NavbarUser />
      )}
      <Outlet />
    </>
  );
}

/** /cashier: navbar kasir; admin otomatis dapat tombol "Kembali ke admin". */
export function CashierLayout() {
  return (
    <>
      <NavbarCashier />
      <Outlet />
    </>
  );
}

/** Area admin: /produk, /tinjau-pembayaran, /users, /setting. */
export function AdminLayout() {
  return (
    <>
      <NavbarAdmin />
      <Outlet />
    </>
  );
}
