import { useState, type ReactNode } from 'react';
import { Link, NavLink, useNavigate } from 'react-router';
import { List } from '@phosphor-icons/react';
import { supabase } from '@/data/supabaseClient';
import { useAuthStore } from '@/presentation/stores/useAuthStore';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import type { NavItem } from './navConfig';

/** Kerangka header bersama; isi kiri/kanan ditentukan tiap navbar role. */
export function NavbarShell({
  brandTo,
  left,
  right,
}: {
  brandTo: string;
  left?: ReactNode;
  right: ReactNode;
}) {
  return (
    <header className="sticky top-0 z-40 bg-primary">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-2 px-4">
        <Link to={brandTo} className="font-display text-lg font-bold text-white">
          Isade Store
        </Link>
        {left}
        <div className="ml-auto flex items-center gap-2">{right}</div>
      </div>
    </header>
  );
}

export function desktopLinkClass({ isActive }: { isActive: boolean }): string {
  return cn(
    'rounded-md px-3 py-2 text-sm text-white/80 transition-colors hover:bg-white/10 hover:text-white',
    isActive && 'bg-white/15 text-white'
  );
}

/** Kasir bekerja dengan jempol di tablet: target sentuh lebih besar. */
export function cashierLinkClass({ isActive }: { isActive: boolean }): string {
  return cn(
    'rounded-md px-4 py-2.5 text-base font-medium text-white/80 transition-colors hover:bg-white/10 hover:text-white',
    isActive && 'bg-white/15 text-white'
  );
}

export function mobileLinkClass({ isActive }: { isActive: boolean }): string {
  return cn(
    'rounded-md px-3 py-2.5 text-base text-foreground hover:bg-accent',
    isActive && 'bg-accent font-medium text-accent-foreground'
  );
}

export function DesktopNav({ items }: { items: NavItem[] }) {
  return (
    <nav className="ml-6 hidden items-center gap-1 md:flex" aria-label="Navigasi utama">
      {items.map((item) => (
        <NavLink key={item.to + item.label} to={item.to} className={desktopLinkClass}>
          {item.label}
        </NavLink>
      ))}
    </nav>
  );
}

export function useLogout(): () => Promise<void> {
  return async () => {
    await supabase.auth.signOut();
    logout();
    // Full reload, bukan SPA navigate: semua store (keranjang, dsb.) ikut reset.
    window.location.assign('/katalog');
  };
}

/** Drawer mobile generik: daftar item role + footer (menu akun / tombol masuk). */
export function MobileMenuSheet({
  items,
  children,
}: {
  items: NavItem[];
  children?: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Sheet open={open} onOpenChange={setOpen}>
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
          {items.map((item) => (
            <SheetClose asChild key={item.to + item.label}>
              <NavLink to={item.to} className={mobileLinkClass}>
                {item.label}
              </NavLink>
            </SheetClose>
          ))}
        </nav>
        <div className="mt-auto flex flex-col gap-2 px-4 pb-6">{children}</div>
      </SheetContent>
    </Sheet>
  );
}
