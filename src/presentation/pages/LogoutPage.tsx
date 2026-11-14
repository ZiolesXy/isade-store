import { useEffect } from 'react';
import { supabase } from '@/data/supabaseClient';
import { useAuthStore } from '@/presentation/stores/useAuthStore';
import { FullPageLoading } from '@/presentation/components/states';

/** /logout: satu pintu keluar dari navbar mana pun, lalu kembali ke katalog. */
export function LogoutPage() {
  useEffect(() => {
    void (async () => {
      await supabase.auth.signOut();
      useAuthStore.getState().logout();
      // Full reload agar seluruh store client ikut ter-reset.
      window.location.assign('/katalog');
    })();
  }, []);

  return <FullPageLoading />;
}
