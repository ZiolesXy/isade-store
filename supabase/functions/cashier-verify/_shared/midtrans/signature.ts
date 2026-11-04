export async function verifySignature(
  orderId: string,
  statusCode: string,
  grossAmount: string,
  signatureKey: string,
  receivedSignature: string
): Promise<boolean> {
  // Hitung SHA-512: SHA512(order_id + status_code + gross_amount + SERVER_KEY)
  // gunakan string persis dari payload (contoh gross_amount = "150000.00")
  const message = orderId + statusCode + grossAmount + signatureKey;
  
  const encoder = new TextEncoder();
  const data = encoder.encode(message);
  
  // Gunakan crypto.subtle untuk SHA-512
  const hashBuffer = await crypto.subtle.digest("SHA-512", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  
  // Bandingkan dengan signature_key yang diterima
  return hashHex === receivedSignature.toLowerCase();
}