export function mapMidtransStatus(status: string): string {
  // Petakan status dari Midtrans ke status order internal
  switch (status.toLowerCase()) {
    case 'settlement':
      return 'paid';
    case 'capture':
      // capture dengan fraud_status accept menjadi paid
      // capture dengan fraud_status challenge tetap pending
      return 'pending'; // Akan divalidasi lebih lanjut di apply_payment_result
    case 'pending':
      return 'pending';
    case 'expire':
      return 'expired';
    case 'cancel':
      return 'cancelled';
    case 'deny':
    case 'failure':
      return 'failed';
    case 'refund':
    case 'partial_refund':
    case 'chargeback':
    case 'partial_chargeback':
      return 'needs_review';
    default:
      return 'pending';
  }
}