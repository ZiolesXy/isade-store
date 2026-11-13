import { Link } from 'react-router';
import { ArrowLeft, SignOut } from '@phosphor-icons/react';
import { useAuthStore } from '@/presentation/stores/useAuthStore';
import { Button } from '@/components/ui/button';
import { NAV_CASHIER } from './navConfig';
import {
  MobileMenuSheet,
  NavbarShell,
  cashierLinkClass,
  useLogout,
} from './shared';
import { NavLink } from 'react-router';


/**
 * Navbar cashier: ringkas dan mudah dijangkau jempol di tablet, tanpa
 * keranjang/checkout. Admin yang membuka /cashier tetap melihat navbar
 * cashier ditambah tombol "Kembali ke admin".
 */
export function NavbarCashier() {
  const logout = useLogout();
  const role = useAuthStore((s) => s.role);
  const email = useAuthStore((s) => s.email);
  const fullName = useAuthStore((s) => s.fullName);

  return (
    <NavbarShell
      brandTo="/dashboard"
      left={
        <nav className="ml-4 hidden items-center gap-1 md:flex" aria-label="Navigasi kasir">
          {NAV_CASHIER.map((item) => (
            <NavLink key={item.to + item.label} to={item.to} className={cashierLinkClass}>
              {item.label}
            </NavLink>
          ))}
        </nav>
      }
      right={
        <>
          {role === 'admin' ? (
            <Button
              asChild
              size="sm"
              variant="outline"
              className="border-white/40 bg-transparent text-white hover:bg-white/10 hover:text-white"
            >
              <Link to="/dashboard">
                <ArrowLeft className="size-4" weight="duotone" />
                Kembali ke admin
              </Link>
            </Button>
          ) : null}
          <span className="hidden max-w-40 truncate text-sm text-white/70 md:inline">
            {fullName ?? email}
          </span>
          <Button
            size="sm"
            variant="ghost"
            className="text-white hover:bg-white/10 hover:text-white"
            onClick={() => void logout()}
          >
            <SignOut className="size-4" weight="duotone" />
            Keluar
          </Button>
          <MobileMenuSheet items={NAV_CASHIER}>
            <p className="truncate px-3 text-sm text-muted-foreground">
              {fullName ?? email}
            </p>
            <Button variant="outline" onClick={() => void logout()}>
              <SignOut className="size-4" weight="duotone" />
              Keluar
            </Button>
          </MobileMenuSheet>
        </>
      }
    />
  );
}
