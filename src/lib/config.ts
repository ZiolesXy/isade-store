/**
 * Config env PLAN-UPDATE-v3 Tahap 2.
 * Satu-satunya tempat yang membaca flag Midtrans; komponen/route lain
 * mengambil nilai dari isMidtransEnabled di modul ini, bukan membaca
 * import.meta.env langsung.
 *
 * Client membaca VITE_ENABLE_MIDTRANS (dibake saat build, pengganti "props
 * dari server component" pada stack SPA). Server (Edge Function create-order)
 * membaca ENABLE_MIDTRANS sendiri dan tetap menolak metode Midtrans saat
 * false, jadi nilai di client tidak bisa dipakai menembus server.
 */

const raw = import.meta.env.VITE_ENABLE_MIDTRANS as string | undefined;

export function parseMidtransFlag(value: unknown): {
  enabled: boolean;
  invalid: boolean;
} {
  if (value === 'true') return { enabled: true, invalid: false };
  if (value === 'false') return { enabled: false, invalid: false };
  // Parse ketat: selain "true"/"false" dianggap false dan ditandai peringatan.
  return { enabled: false, invalid: true };
}

const parsed = parseMidtransFlag(raw);

if (parsed.invalid) {
  console.warn(
    `[config] VITE_ENABLE_MIDTRANS="${raw ?? 'tidak diset'}" tidak valid; dianggap false (hanya bayar di kasir). Set "true" atau "false".`
  );
}

export const isMidtransEnabled: boolean = parsed.enabled;
