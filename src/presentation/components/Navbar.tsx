import { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router';
import { List, ShoppingCart, SignOut } from '@phosphor-icons/react';
import { supabase } from '@/data/supabaseClient';
import { useAuthStore } from '@/presentation/stores/useAuthStore';
import { selectCartCount, useCartStore } from '@/presentation/stores/useCartStore';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetClose,
} from '@/components/ui/sheet';
import { cn } from '@/lib/utils';

interface NavLinkItem {
  to: string;
  label: string;
  visible: boolean;
}

/** Kerangka menu sesuai PRD bagian 7.1: hanya rute yang ada; Kasir untuk cashier/admin; Admin untuk admin. */
function useNavLinks(): NavLinkItem[] {
  const userId = useAuthStore((s) => s.userId);
  const role = useAuthStore((s) => s.role);

  return [
    { to: '/', label: 'Katalog', visible: true },
    { to: '/cart', label: 'Keranjang', visible: true },
    { to: '/orders', label: 'Pesanan Saya', visible: !!userId },
    {
      to: '/kasir',
      label: 'Kasir',
      visible: role === 'cashier' || role === 'admin',
    },
    { to: '/admin/products', label: 'Admin', visible: role === 'admin' },
    {
      to: '/admin/needs-review',
      label: 'Tinjau Pembayaran',
      visible: role === 'admin',
    },
  ];
}

function DesktopLink({ item, onNavigate }: { item: NavLinkItem; onNavigate?: () => void }) {
  return (
    <NavLink
      to={item.to}
      onClick={onNavigate}
      className={({ isActive }) =>
        cn(
          'rounded-md px-3 py-2 text-sm text-white/80 transition-colors hover:bg-white/10 hover:text-white',
          isActive && 'bg-white/15 text-white'
        )
      }
    >
      {item.label}
    </NavLink>
  );
}

export function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const userId = useAuthStore((s) => s.userId);
  const email = useAuthStore((s) => s.email);
  const logout = useAuthStore((s) => s.logout);
  const cartCount = useCartStore(selectCartCount);
  const navigate = useNavigate();
  const links = useNavLinks();

  async function handleLogout() {
    await supabase.auth.signOut();
    logout();
    setMenuOpen(false);
    navigate('/');
  }

  return (
    <header className="sticky top-0 z-40 bg-primary">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-2 px-4">
        <Link to="/" className="font-display text-lg font-bold text-white">
          Isade Store
        </Link>

        <nav className="ml-6 hidden items-center gap-1 md:flex" aria-label="Navigasi utama">
          {links
            .filter((l) => l.visible)
            .map((l) => (
              <DesktopLink key={l.to} item={l} />
            ))}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <Link
            to="/cart"
            className="relative rounded-md p-2 text-white transition-colors hover:bg-white/10"
            aria-label={`Keranjang, ${cartCount} item`}
          >
            <ShoppingCart className="size-5" weight="duotone" />
            {cartCount > 0 ? (
              <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-secondary px-1 text-[11px] font-semibold text-secondary-foreground">
                {cartCount > 99 ? '99+' : cartCount}
              </span>
            ) : null}
          </Link>

          {!userId ? (
            <Button
              asChild
              size="sm"
              className="hidden bg-white/10 text-white hover:bg-white/20 md:inline-flex"
            >
              <Link to="/login">Masuk</Link>
            </Button>
          ) : (
            <div className="hidden items-center gap-2 md:flex">
              <span className="max-w-40 truncate text-sm text-white/70">{email}</span>
              <Button
                size="sm"
                variant="ghost"
                className="text-white hover:bg-white/10 hover:text-white"
                onClick={handleLogout}
              >
                <SignOut className="size-4" weight="duotone" />
                Keluar
              </Button>
            </div>
          )}

          <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="text-white hover:bg-white/10 md:hidden"
                aria-label="Buka menu"
              >
                <List className="size-5" weight="duotone" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-72">
              <SheetHeader>
                <SheetTitle className="font-display text-primary">Isade Store</SheetTitle>
              </SheetHeader>
              <nav className="flex flex-col gap-1 px-4" aria-label="Navigasi utama">
                {links
                  .filter((l) => l.visible)
                  .map((l) => (
                    <SheetClose asChild key={l.to}>
                      <NavLink
                        to={l.to}
                        className={({ isActive }) =>
                          cn(
                            'rounded-md px-3 py-2.5 text-base text-foreground hover:bg-accent',
                            isActive && 'bg-accent font-medium text-accent-foreground'
                          )
                        }
                      >
                        {l.label}
                      </NavLink>
                    </SheetClose>
                  ))}
              </nav>
              <div className="mt-auto flex flex-col gap-2 px-4 pb-6">
                {userId ? (
                  <>
                    <p className="px-3 text-sm text-muted-foreground">{email}</p>
                    <Button variant="outline" onClick={handleLogout}>
                      <SignOut className="size-4" weight="duotone" />
                      Keluar
                    </Button>
                  </>
                ) : (
                  <SheetClose asChild>
                    <Button asChild className="w-full">
                      <Link to="/login">Masuk</Link>
                    </Button>
                  </SheetClose>
                )}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
