import { useState } from 'react';
import { supabase } from '../../data/supabaseClient';
import { useAuthStore } from './useAuthStore';

type Unsubscribe = () => void;

let started = false;
let unsubscribe: Unsubscribe | null = null;

/** Mengisi useAuthStore dari sesi Supabase: getUser (validasi server), profil (role), dan onAuthStateChange. */
export function initAuthSession(): Unsubscribe {
  if (started && unsubscribe) return unsubscribe;
  started = true;

  const store = useAuthStore.getState();

  supabase.auth
    .getUser()
    .then(({ data, error }) => {
      const user = data?.user;
      if (error || !user) {
        // Token tidak valid lagi (misal DB di-reset saat sesi masih tersimpan).
        // getSession() hanya membaca localStorage dan tidak menolak token mati,
        // sehingga request berikutnya gagal 401 tanpa jejak. Bersihkan sesi.
        void supabase.auth.signOut();
        return;
      }

      store.setSession(user.id, user.email ?? null, null);
      return supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle()
        .then(({ data: profile }) => {
          // Profil bisa saja belum ada (misal DB di-reset saat sesi masih tersimpan);
          // jangan blok aplikasi, cukup lanjut tanpa role.
          if (profile) store.setProfile(profile);
        });
    })
    .catch(() => {
      // Sesuatu gagal membaca sesi: tampilkan aplikasi tetap sebagai tamu.
    })
    .finally(() => {
      useAuthStore.getState().setSessionReady(true);
    });

  const { data } = supabase.auth.onAuthStateChange(async (event, session) => {
    if (event === 'SIGNED_IN' && session) {
      store.setSession(session.user.id, session.user.email ?? null, null);
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .maybeSingle();
      if (profile) store.setProfile(profile);
      useAuthStore.getState().setSessionReady(true);
    }
    if (event === 'SIGNED_OUT') {
      store.logout();
      useAuthStore.getState().setSessionReady(true);
    }
  });

  unsubscribe = () => data.subscription.unsubscribe();
  return unsubscribe;
}

/** Hook pemanggil initAuthSession sekali di pohon React. */
export function useAuthSession() {
  const [initialised] = useState(() => initAuthSession());
  return () => initialised();
}
