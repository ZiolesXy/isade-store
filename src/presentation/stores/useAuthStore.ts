import { create } from 'zustand';
import type { Database } from '../../data/database.types';
import { toProfile } from '../../data/mappers';

type ProfileRow = Database['public']['Tables']['profiles']['Row'];

interface AuthState {
  userId: string | null;
  email: string | null;
  role: string | null;
  sessionReady: boolean;
  setSession: (userId: string | null, email: string | null, role: string | null) => void;
  setProfile: (row: ProfileRow | null) => void;
  setSessionReady: (ready: boolean) => void;
  isAdmin: boolean;
  isCashier: boolean;
  isCustomer: boolean;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  userId: null,
  email: null,
  role: null,
  sessionReady: false,

  setSession: (userId, email, role) =>
    set({ userId, email, role, sessionReady: true }),

  setProfile: (row) => {
    if (!row) return;
    const profile = toProfile(row);
    set({ role: profile.role, userId: profile.id });
  },

  setSessionReady: (ready) => set({ sessionReady: ready }),

  get isAdmin() {
    return get().role === 'admin';
  },

  get isCashier() {
    const r = get().role;
    return r === 'cashier' || r === 'admin';
  },

  get isCustomer() {
    return get().role === 'customer';
  },

  logout: () =>
    set({ userId: null, email: null, role: null, sessionReady: false }),
}));
