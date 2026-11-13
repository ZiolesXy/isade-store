/**
 * Satu sumber kebenaran role di sisi client (PLAN-UPDATE-v3 Tahap 1).
 * Nilai role mengikuti kolom profiles.role: 'user' | 'cashier' | 'admin'.
 */

export const ROLES = ['user', 'cashier', 'admin'] as const;

export type Role = (typeof ROLES)[number];

export const ROLE_LABEL: Record<Role, string> = {
  user: 'User',
  cashier: 'Kasir',
  admin: 'Admin',
};

export function isRole(value: string | null | undefined): value is Role {
  return typeof value === 'string' && (ROLES as readonly string[]).includes(value);
}

/**
 * Guard role: admin lolos semua guard cashier (admin ⊃ cashier ⊃ bukan user biasa).
 * Contoh:
 *   hasRole('admin', 'cashier')   -> true   (admin boleh masuk area kasir)
 *   hasRole('cashier', 'admin')   -> false
 *   hasRole('user', 'user')       -> true
 *   hasRole('admin', 'user')      -> false  (admin bukan user biasa)
 */
export function hasRole(
  role: string | null | undefined,
  ...allowed: Role[]
): boolean {
  if (role === 'admin') {
    return allowed.includes('admin') || allowed.includes('cashier');
  }
  return isRole(role) && (allowed as string[]).includes(role);
}
