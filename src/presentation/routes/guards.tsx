// Alur rute dan guard sesuai PRD bagian 7.1.
import { Navigate, Outlet, useLocation } from 'react-router';
import { useAuthStore } from '../stores/useAuthStore';
import { FullPageLoading } from '../components/states';

function SessionLoading() {
  return <FullPageLoading />;
}

/** Menunggu sesi selesai dicek sebelum memutuskan redirect, supaya tidak terlalu cepat pindah halaman. */
export function RequireSessionReady() {
  const sessionReady = useAuthStore((s) => s.sessionReady);
  if (!sessionReady) return <SessionLoading />;
  return <Outlet />;
}

/** Rute yang butuh login: /orders, /orders/:id. */
export function RequireAuth() {
  const sessionReady = useAuthStore((s) => s.sessionReady);
  const userId = useAuthStore((s) => s.userId);
  const location = useLocation();

  if (!sessionReady) return <SessionLoading />;
  if (!userId) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }
  return <Outlet />;
}

/** Rute admin: /admin/*. */
export function RequireAdmin() {
  const sessionReady = useAuthStore((s) => s.sessionReady);
  const userId = useAuthStore((s) => s.userId);
  const role = useAuthStore((s) => s.role);
  const location = useLocation();

  if (!sessionReady) return <SessionLoading />;
  if (!userId) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }
  if (role !== 'admin') {
    return <Navigate to="/" replace />;
  }
  return <Outlet />;
}

/** Rute kasir: /kasir, untuk cashier dan admin. */
export function RequireCashier() {
  const sessionReady = useAuthStore((s) => s.sessionReady);
  const userId = useAuthStore((s) => s.userId);
  const role = useAuthStore((s) => s.role);
  const location = useLocation();

  if (!sessionReady) return <SessionLoading />;
  if (!userId) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }
  if (role !== 'cashier' && role !== 'admin') {
    return <Navigate to="/" replace />;
  }
  return <Outlet />;
}
