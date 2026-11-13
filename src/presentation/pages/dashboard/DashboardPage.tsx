import { lazy, Suspense } from 'react';
import { useAuthStore } from '@/presentation/stores/useAuthStore';
import { FullPageLoading } from '@/presentation/components/states';

// Kode dashboard role lain tidak ikut bundle role ini: masing-masing dimuat
// lazy sesuai role yang sedang login (PLAN-UPDATE-v3 Tahap 1 & 3).
const DashboardUserPage = lazy(() => import('./DashboardUserPage'));
const DashboardCashierPage = lazy(() => import('./DashboardCashierPage'));
const DashboardAdminPage = lazy(() => import('./DashboardAdminPage'));

/**
 * Satu route /dashboard untuk tiga role. Pemilihan tampilan dilakukan dari
 * role hasil pengecekan sesi (store), bukan dari query string; tidak ada
 * cara untuk memaksa menampilkan dashboard role lain.
 */
export function DashboardPage() {
  const role = useAuthStore((s) => s.role);

  return (
    <Suspense fallback={<FullPageLoading />}>
      {role === 'admin' ? (
        <DashboardAdminPage />
      ) : role === 'cashier' ? (
        <DashboardCashierPage />
      ) : (
        <DashboardUserPage />
      )}
    </Suspense>
  );
}
