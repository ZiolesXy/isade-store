import { Navigate, Route, Routes, useParams } from 'react-router';
import { useAuthSession } from '../stores/authSession';
import {
  RequireAuth,
  RequireCashierRole,
  RequireAdminRole,
  RequireSessionReady,
  RequireUserRole,
} from './guards';
import {
  AccountLayout,
  AdminLayout,
  CashierLayout,
  DashboardLayout,
  PublicLayout,
} from './layouts';
import { CatalogPage } from '../pages/CatalogPage';
import { ProductDetailPage } from '../pages/ProductDetailPage';
import { CartPage } from '../pages/CartPage';
import { LoginPage } from '../pages/LoginPage';
import { LogoutPage } from '../pages/LogoutPage';
import { AccountPage } from '../pages/AccountPage';
import { OrderDetailPage } from '../pages/OrderDetailPage';
import { KasirPage } from '../pages/KasirPage';
import { DashboardPage } from '../pages/dashboard/DashboardPage';
import { ProdukAdminPage } from '../pages/ProdukAdminPage';
import { PaymentsReviewPage } from '../pages/PaymentsReviewPage';
import { UsersAdminPage } from '../pages/UsersAdminPage';
import { AuditLogPage } from '../pages/AuditLogPage';
import { SettingPage } from '../pages/SettingPage';

/** Redirect dari route lama (PRD v2) ke peta route baru (PLAN-UPDATE-v3). */
function ProductSlugRedirect() {
  const { slug } = useParams<{ slug: string }>();
  return <Navigate to={`/katalog/${slug}`} replace />;
}

function OrderIdRedirect() {
  const { id } = useParams<{ id: string }>();
  return <Navigate to={`/akun/pesanan/${id}`} replace />;
}

/**
 * Peta route PLAN-UPDATE-v3 Tahap 1:
 * - publik/user: /, /katalog, /cart, /login
 * - dashboard satu route untuk user, cashier, admin (dipilih dari role)
 * - /akun user-only; /cashier cashier+admin; /produk, /tinjau-pembayaran,
 *   /users, /setting admin-only
 */
export function AppRoutes() {
  useAuthSession();

  return (
    <Routes>
      <Route element={<RequireSessionReady />}>
        <Route element={<PublicLayout />}>
          <Route path="/" element={<CatalogPage />} />
          <Route path="/katalog" element={<CatalogPage />} />
          <Route path="/katalog/:slug" element={<ProductDetailPage />} />
          <Route path="/cart" element={<CartPage />} />
          <Route path="/login" element={<LoginPage />} />
        </Route>

        <Route element={<RequireAuth />}>
          <Route path="/dashboard" element={<DashboardLayout />}>
            <Route index element={<DashboardPage />} />
          </Route>
        </Route>

        <Route element={<RequireUserRole />}>
          <Route path="/akun" element={<AccountLayout />}>
            <Route index element={<AccountPage />} />
            <Route path="pesanan/:id" element={<OrderDetailPage />} />
          </Route>
        </Route>

        <Route element={<RequireCashierRole />}>
          <Route path="/cashier" element={<CashierLayout />}>
            <Route index element={<KasirPage />} />
          </Route>
        </Route>

        <Route element={<RequireAdminRole />}>
          <Route element={<AdminLayout />}>
            <Route path="/produk" element={<ProdukAdminPage />} />
            <Route path="/tinjau-pembayaran" element={<PaymentsReviewPage />} />
            <Route path="/users" element={<UsersAdminPage />} />
            <Route path="/audit-log" element={<AuditLogPage />} />
            <Route path="/setting" element={<SettingPage />} />
          </Route>
        </Route>

        {/* Route lama tetap diarahkan agar tautan lama tidak mati. */}
        <Route path="/products/:slug" element={<ProductSlugRedirect />} />
        <Route path="/orders" element={<Navigate to="/dashboard" replace />} />
        <Route path="/orders/:id" element={<OrderIdRedirect />} />
        <Route path="/kasir" element={<Navigate to="/cashier" replace />} />
        <Route
          path="/admin/products"
          element={<Navigate to="/produk" replace />}
        />
        <Route
          path="/admin/orders"
          element={<Navigate to="/tinjau-pembayaran" replace />}
        />
        <Route
          path="/admin/needs-review"
          element={<Navigate to="/tinjau-pembayaran" replace />}
        />
        <Route path="/logout" element={<LogoutPage />} />

        <Route path="*" element={<Navigate to="/katalog" replace />} />
      </Route>
    </Routes>
  );
}
