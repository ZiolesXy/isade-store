import { describe, expect, it } from 'vitest';
import { ROLES, hasRole, isRole, type Role } from './roles';

describe('lib/roles', () => {
  it('ROLES persis user, cashier, admin', () => {
    expect([...ROLES]).toEqual(['user', 'cashier', 'admin']);
  });

  describe('isRole', () => {
    it('mengenali nilai valid', () => {
      expect(isRole('user')).toBe(true);
      expect(isRole('cashier')).toBe(true);
      expect(isRole('admin')).toBe(true);
    });

    it('menolak nilai lain', () => {
      expect(isRole('customer')).toBe(false);
      expect(isRole('')).toBe(false);
      expect(isRole(null)).toBe(false);
      expect(isRole(undefined)).toBe(false);
    });
  });

  describe('hasRole (admin ⊃ cashier, user terpisah)', () => {
    const cases: Array<[string | null | undefined, Role[], boolean]> = [
      ['user', ['user'], true],
      ['user', ['cashier'], false],
      ['user', ['admin'], false],
      ['cashier', ['cashier'], true],
      ['cashier', ['cashier', 'admin'], true],
      ['cashier', ['admin'], false],
      ['cashier', ['user'], false],
      ['admin', ['admin'], true],
      // Admin lolos semua guard cashier.
      ['admin', ['cashier'], true],
      ['admin', ['cashier', 'admin'], true],
      // Admin bukan user biasa.
      ['admin', ['user'], false],
      [null, ['user'], false],
      ['customer', ['user'], false],
    ];

    for (const [role, allowed, expected] of cases) {
      it(`hasRole(${String(role)}, [${allowed.join(', ')}]) = ${expected}`, () => {
        expect(hasRole(role, ...allowed)).toBe(expected);
      });
    }
  });
});
