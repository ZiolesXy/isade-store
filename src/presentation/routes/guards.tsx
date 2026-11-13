// Guard route PLAN-UPDATE-v3 Tahap 1.
// Dua lapis: guard UI di sini untuk UX (redirect/403), keamanan asli ada di
// RLS Supabase dan cek role di Edge Functions (lihat supabase/migrations dan
// supabase/functions). Guard UI saja tidak cukup.
import { Navigate, Outlet } from 'react-router';
import { useAuthStore } from '../stores/useAuthStore';
import { FullPageLoading } from '../components/states';
import { ForbiddenPage } from '../pages/ForbiddenPage';
import { hasRole, type Role } from '@/lib/roles';

function SessionLoading() {
  return <FullPageLoading />;
}

function currentTarget(): string {
  return window.location.pathname + window.location.search;
}

/** Menunggu sesi selesai dicek sebelum memutuskan redirect. */
export function RequireSessionReady() {
  const sessionReady = useAuthStore((s) => s.sessionReady);
  if (!sessionReady) return <SessionLoading />;
  return <Outlet />;
}

/** Rute yang butuh login. Belum login -> /login lalu kembali ke tujuan semula. */
export function RequireAuth() {
  const sessionReady = useAuthStore((s) => s.sessionReady);
  const userId = useAuthStore((s) => s.userId);

  if (!sessionReady) return <SessionLoading />;
  if (!userId) {
    return (
      <Navigate to="/login" state={{ from: currentTarget() }} replace />
    );
  }
  return <Outlet />;
}

/**
 * Guard role generik: hasRole() menerapkan aturan admin ⊃ cashier.
 * Role tidak cukup -> halaman 403 (bukan redirect yang membingungkan).
 */
export function RequireRole({ roles }: { roles: Role[] }) {
  const sessionReady = useAuthStore((s) => s.sessionReady);
  const userId = useAuthStore((s) => s.userId);
  const role = useAuthStore((s) => s.role);

  if (!sessionReady) return <SessionLoading />;
  if (!userId) {
    return (
      <Navigate to="/login" state={{ from: currentTarget() }} replace />
    );
  }
  if (!hasRole(role, ...roles)) {
    return <ForbiddenPage />;
  }
  return <Outlet />;
}

export function RequireCashierRole() {
  return <RequireRole roles={['cashier']} />;
}

export function RequireAdminRole() {
  return <RequireRole roles={['admin']} />;
}

export function RequireUserRole() {
  return <RequireRole roles={['user']} />;
}
