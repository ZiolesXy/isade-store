import { supabase } from '../data/supabaseClient';

/** Mengubah path file di bucket `products` menjadi URL publik. Path, bukan URL, yang disimpan di database. */
export function getProductImageUrl(imagePath: string | null | undefined): string | null {
  if (!imagePath) return null;
  return supabase.storage.from('products').getPublicUrl(imagePath).data.publicUrl;
}
