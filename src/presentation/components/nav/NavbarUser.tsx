import { Link } from 'react-router';
import { ShoppingCart, SignOut, UserCircle } from '@phosphor-icons/react';
import { useAuthStore } from '@/presentation/stores/useAuthStore';
import { selectCartCount, useCartStore } from '@/presentation/stores/useCartStore';
import { Button } from '@/components/ui/button';
import { SheetClose } from '@/components/ui/sheet';
import { NAV_USER } from './navConfig';
import {
  DesktopNav,
  MobileMenuSheet,
  NavbarShell,
  useLogout,
} from './shared';

/** Navbar user biasa: Katalog, Dashboard, keranjang, menu akun (/akun + keluar). */
export function NavbarUser() {
  const logout = useLogout();
  const email = useAuthStore((s) => s.email);
  const fullName = useAuthStore((s) => s.fullName);
  const cartCount = useCartStore(selectCartCount);

  return (
    <NavbarShell
      brandTo="/katalog"
      left={<DesktopNav items={NAV_USER} />}
      right={
        <>
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

          <div className="hidden items-center gap-1 md:flex">
            <Button
              asChild
              size="sm"
              variant="ghost"
              className="text-white hover:bg-white/10 hover:text-white"
            >
              <Link to="/akun">
                <UserCircle className="size-4" weight="duotone" />
                Akun
              </Link>
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="text-white hover:bg-white/10 hover:text-white"
              onClick={() => void logout()}
            >
              <SignOut className="size-4" weight="duotone" />
              Keluar
            </Button>
          </div>

          <MobileMenuSheet items={NAV_USER}>
            <p className="truncate px-3 text-sm text-muted-foreground">
              {fullName ?? email}
            </p>
            <SheetClose asChild>
              <Button asChild variant="outline" className="w-full justify-start">
                <Link to="/akun">
                  <UserCircle className="size-4" weight="duotone" />
                  Profil saya
                </Link>
              </Button>
            </SheetClose>
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
