import { supabase } from '../../data/supabaseClient';

interface OrderPollOptions {
  orderId: string;
  intervalMs?: number;
  maxDurationMs?: number;
  onStatusChange: (status: string) => void;
}

export function useOrder() {
  let pollTimer: ReturnType<typeof setInterval> | null = null;
  let startTime: number | null = null;

  async function fetchOrder(orderId: string) {
    const { data, error } = await supabase
      .from('orders')
      .select('id, status, snap_token, payment_method, expires_at, updated_at')
      .eq('id', orderId)
      .single();

    if (error) throw error;
    return data;
  }

  function startPolling({ orderId, intervalMs = 5000, maxDurationMs = 120000, onStatusChange }: OrderPollOptions) {
    startTime = Date.now();

    pollTimer = setInterval(async () => {
      try {
        const order = await fetchOrder(orderId);
        onStatusChange(order.status);

        // Stop polling if no longer pending
        if (order.status !== 'pending') {
          stopPolling();
          return;
        }

        // Stop if max duration reached
        if (startTime && Date.now() - startTime > maxDurationMs) {
          stopPolling();
        }
      } catch {
        // Silent error, keep polling
      }
    }, intervalMs);
  }

  function stopPolling() {
    if (pollTimer) {
      clearInterval(pollTimer);
      pollTimer = null;
    }
    startTime = null;
  }

  return { startPolling, stopPolling };
}
