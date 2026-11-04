import { supabase } from '../../data/supabaseClient';
import { useAuthStore } from '../stores/useAuthStore';

interface VerifyCashInput {
  orderId: string;
  result: 'paid' | 'needs_review' | 'failed' | 'expired' | 'cancelled';
  catatan?: string;
}

export function useCashier() {
  async function verifyPayment(input: VerifyCashInput) {
    const { userId } = useAuthStore.getState();
    if (!userId) {
      throw new Error('User belum login');
    }

    const { data, error } = await supabase.functions.invoke('cashier-verify', {
      body: {
        order_id: input.orderId,
        result: input.result,
        catatan: input.catatan ?? '',
      },
    });

    if (error) throw error;

    return data;
  }

  async function scanOrder(orderId: string) {
    const { data, error } = await supabase
      .from('orders')
      .select('id, status, payment_method, total_amount, created_at')
      .eq('id', orderId)
      .single();

    if (error) throw error;
    return data;
  }

  return { verifyPayment, scanOrder };
}
