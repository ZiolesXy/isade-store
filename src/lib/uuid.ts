/**
 * Penghasil UUID v4 yang aman dipakai di semua konteks.
 *
 * `crypto.randomUUID()` hanya tersedia di secure context (HTTPS atau localhost),
 * jadi halaman non-HTTPS (misal dev via IP LAN atau domain HTTP) melempar
 * "crypto.randomUUID is not a function". Kode ini mundur bertahap:
 *
 * 1. Jalur cepat: `crypto.randomUUID()` bila ada.
 * 2. Bangun UUID v4 dari `crypto.getRandomValues()` — tetap tersedia di
 *    konteks tidak aman di semua browser modern.
 * 3. Cadangan terakhir untuk lingkungan tanpa Web Crypto (legacy/uji).
 */
export function randomUUID(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    const bytes = crypto.getRandomValues(new Uint8Array(16));
    // Paksa versi 4 dan variant RFC 4122 sesuai spesifikasi UUID.
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0'));
    return [
      hex.slice(0, 4).join(''),
      hex.slice(4, 6).join(''),
      hex.slice(6, 8).join(''),
      hex.slice(8, 10).join(''),
      hex.slice(10, 16).join(''),
    ].join('-');
  }

  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
