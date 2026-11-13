import { SignOut } from '@phosphor-icons/react';
import { useAuthStore } from '@/presentation/stores/useAuthStore';
import { Button } from '@/components/ui/button';
import { NAV_ADMIN } from './navConfig';import {
  DesktopNav,
  MobileMenuSheet,
  NavbarShell,
  useLogout,
} from './shared';

/**
 * Navbar admin. Di mobile berupa drawer; di desktop menu horizontal.
 * Hanya item yang boleh diakses admin (Tahap 1).
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
          <MobileMenuSheet items={NAV_ADMIN}>
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
