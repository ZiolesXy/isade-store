import { useAuthSession } from '../stores/authSession';
import { Navigate, Route, Routes } from 'react-router';
import {
  RequireAdmin,
  RequireAuth,
  RequireCashier,
  RequireSessionReady,
} from './guards';
import { CatalogPage } from '../pages/CatalogPage';
import { ProductDetailPage } from '../pages/ProductDetailPage';
import { CartPage } from '../pages/CartPage';
import { OrdersPage } from '../pages/OrdersPage';
import { OrderDetailPage } from '../pages/OrderDetailPage';
import { LoginPage } from '../pages/LoginPage';
import { AdminProductsPage } from '../pages/AdminProductsPage';
import { AdminOrdersPage } from '../pages/AdminOrdersPage';
import { KasirPage } from '../pages/KasirPage';

/** All rute PRD bagian 7.1. */
export function AppRoutes() {
  useAuthSession();

  return (
    <Routes>
      <Route element={<RequireSessionReady />}>
        <Route path="/" element={<CatalogPage />} />
        <Route path="/products/:slug" element={<ProductDetailPage />} />
        <Route path="/cart" element={<CartPage />} />
        <Route path="/login" element={<LoginPage />} />

        <Route element={<RequireAuth />}>
          <Route path="/orders" element={<OrdersPage />} />
          <Route path="/orders/:id" element={<OrderDetailPage />} />
        </Route>

        <Route element={<RequireAdmin />}>
          <Route path="/admin/products" element={<AdminProductsPage />} />
          <Route path="/admin/orders" element={<AdminOrdersPage />} />
        </Route>

        <Route element={<RequireCashier />}>
          <Route path="/kasir" element={<KasirPage />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
