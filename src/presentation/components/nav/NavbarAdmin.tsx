import { Link } from 'react-router';
import { SignOut, UserCircle } from '@phosphor-icons/react';
import { useAuthStore } from '@/presentation/stores/useAuthStore';
import { Button } from '@/components/ui/button';
import { SheetClose } from '@/components/ui/sheet';
import { NAV_ADMIN } from './navConfig';
import {
  DesktopNav,
  MobileMenuSheet,
  NavbarShell,
  useLogout,
} from './shared';

/**
 * Navbar admin. Di mobile berupa drawer; di desktop menu horizontal.
 * Menu akun di sisi kanan mengikuti pola NavbarUser: tombol ikon Akun
 * (desktop) dan "Profil saya" di footer sheet (mobile).
 */
export function NavbarAdmin() {
  const logout = useLogout();
  const email = useAuthStore((s) => s.email);
  const fullName = useAuthStore((s) => s.fullName);

  return (
    <NavbarShell
      brandTo="/dashboard"
      left={<DesktopNav items={NAV_ADMIN} />}
      right={
        <>
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

          <MobileMenuSheet items={NAV_ADMIN}>
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
