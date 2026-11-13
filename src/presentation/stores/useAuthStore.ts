import { create } from 'zustand';
import type { Database } from '../../data/database.types';
import { toProfile } from '../../data/mappers';
import { isRole, type Role } from '../../lib/roles';

type ProfileRow = Database['public']['Tables']['profiles']['Row'];

interface AuthState {
  userId: string | null;
  email: string | null;
  fullName: string | null;
  role: Role | null;
  sessionReady: boolean;
  setSession: (
    userId: string | null,
    email: string | null,
    role: Role | null
  ) => void;
  setProfile: (row: ProfileRow | null) => void;
  setSessionReady: (ready: boolean) => void;
  isAdmin: boolean;
  isCashier: boolean;
  isUser: boolean;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  userId: null,
  email: null,
  fullName: null,
  role: null,
  sessionReady: false,

  setSession: (userId, email, role) =>
    set({ userId, email, role, sessionReady: true }),

  setProfile: (row) => {
    if (!row) return;
    const profile = toProfile(row);
    set({
      role: isRole(profile.role) ? profile.role : null,
      userId: profile.id,
      fullName: profile.fullName,
    });
  },

  setSessionReady: (ready) => set({ sessionReady: ready }),

  get isAdmin() {
    return get().role === 'admin';
  },

  get isCashier() {
    const r = get().role;
    return r === 'cashier' || r === 'admin';
  },

  get isUser() {
    return get().role === 'user';
  },

  logout: () =>
    set({ userId: null, email: null, fullName: null, role: null, sessionReady: false }),
}));
