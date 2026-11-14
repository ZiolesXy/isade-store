import { Link } from 'react-router';
import { Button } from '@/components/ui/button';
import { NAV_PUBLIC } from './navConfig';
import { DesktopNav, MobileMenuSheet, NavbarShell } from './shared';

/** Navbar untuk pengunjung yang belum login: Katalog + Masuk/Daftar. */
export function NavbarPublic() {
  return (
    <NavbarShell
      brandTo="/katalog"
      left={<DesktopNav items={NAV_PUBLIC} />}
      right={
        <>
          <Button
            asChild
            size="sm"
            variant="ghost"
            className="text-white hover:bg-white/10"
          >
            <Link to="/login">Masuk</Link>
          </Button>
          <Button
            asChild
            size="sm"
            className="hidden bg-white/10 text-white hover:bg-white/20 md:inline-flex"
          >
            <Link to="/login?mode=register">Daftar</Link>
          </Button>
          <MobileMenuSheet items={NAV_PUBLIC}>
            <Button asChild className="w-full">
              <Link to="/login">Masuk / Daftar</Link>
            </Button>
          </MobileMenuSheet>
        </>
      }
    />
  );
}
