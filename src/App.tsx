import { BrowserRouter } from 'react-router';
import { AppRoutes } from './presentation/routes/AppRoutes';
import { Toaster } from './components/ui/sonner';

// Navbar tidak lagi dipasang global: tiap grup route memasang navbar role-nya
// masing-masing lewat layout (lihat presentation/routes/layouts.tsx).
export default function App() {
  return (
    <BrowserRouter>
      <div className="flex min-h-screen flex-col">
        <main className="flex-1">
          <AppRoutes />
        </main>
        <footer className="bg-primary py-4 text-center text-sm text-white/60">
          Isade Store &middot; Toko gantungan kunci
        </footer>
      </div>
      <Toaster position="top-center" />
    </BrowserRouter>
  );
}
