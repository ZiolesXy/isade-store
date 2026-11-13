import { useEffect } from 'react';
import { useNavigate } from 'react-router';
import { supabase } from '@/data/supabaseClient';
import { useAuthStore } from '@/presentation/stores/useAuthStore';
import { FullPageLoading } from '@/presentation/components/states';

/** /logout: satu pintu keluar dari navbar mana pun, lalu kembali ke katalog. */
export function LogoutPage() {
  const navigate = useNavigate();

  useEffect(() => {
    void (async () => {
      await supabase.auth.signOut();
      useAuthStore.getState().logout();
      navigate('/katalog', { replace: true });
    })();
  }, [navigate]);

  return <FullPageLoading />;
}
