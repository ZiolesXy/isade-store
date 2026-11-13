import type { ComponentType } from 'react';
import type { IconProps } from '@phosphor-icons/react';
import {
  CashRegister,
  ClipboardText,
  Gear,
  Package,
  Queue,
  SquaresFour,
  Storefront,
  Users,
} from '@phosphor-icons/react';

export type NavIcon = ComponentType<IconProps>;

export interface NavItem {
  to: string;
  label: string;
  icon: NavIcon;
}

/**
 * Item menu per role (PLAN-UPDATE-v3 Tahap 1). Satu file ini dipakai untuk
 * navbar sekaligus pemeriksaan akses/daftar route yang terproteksi.
 * Keranjang dan checkout sengaja tidak ada di navbar cashier dan admin.
 */
export const NAV_PUBLIC: NavItem[] = [
  { to: '/katalog', label: 'Katalog', icon: Storefront },
];

export const NAV_USER: NavItem[] = [
  { to: '/katalog', label: 'Katalog', icon: Storefront },
  { to: '/dashboard', label: 'Dashboard', icon: SquaresFour },
];

export const NAV_CASHIER: NavItem[] = [
  { to: '/dashboard', label: 'Dashboard', icon: SquaresFour },
  { to: '/cashier', label: 'Panel Kasir', icon: CashRegister },
  { to: '/dashboard#antrian', label: 'Antrian Bayar', icon: Queue },
];

export const NAV_ADMIN: NavItem[] = [
  { to: '/dashboard', label: 'Dashboard', icon: SquaresFour },
  { to: '/produk', label: 'Produk', icon: Package },
  { to: '/cashier', label: 'Cashier', icon: CashRegister },
  { to: '/tinjau-pembayaran', label: 'Tinjau Pembayaran', icon: ClipboardText },
  { to: '/users', label: 'Users', icon: Users },
  { to: '/setting', label: 'Setting', icon: Gear },
];
