import { BrowserRouter } from 'react-router';
import { Navbar } from './presentation/components/Navbar';
import { AppRoutes } from './presentation/routes/AppRoutes';
import { Toaster } from './components/ui/sonner';

export default function App() {
  return (
    <BrowserRouter>
      <div className="flex min-h-screen flex-col">
        <Navbar />
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
