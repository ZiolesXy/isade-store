// Supabase Admin Client untuk Edge Functions
// Dideploy dengan secret key
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export function createSupabaseAdminClient() {
  // Nama env var yang benar-benar disuntikkan ke edge function:
  // CLI/hosted memakai nama legacy (SUPABASE_SERVICE_ROLE_KEY) walau isinya
  // bisa secret key baru. SUPABASE_SECRET_KEY (nama tanpa prefix) tidak
  // pernah disuntikkan — jangan hanya membaca nama itu.
  const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
  const supabaseKey =
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ||
    Deno.env.get("SUPABASE_SECRET_KEY") ||
    Deno.env.get("SUPABASE_INTERNAL_SECRET_KEY") ||
    "";

  if (!supabaseUrl || !supabaseKey) {
    // Fallback: return minimal client
    return {
      from: () => ({
        select: () => ({ single: () => Promise.resolve({ data: null, error: new Error("No config") }) }),
        rpc: () => Promise.resolve({ data: null, error: new Error("No config") }),
      }),
      auth: {
        getUser: () => Promise.resolve({ data: { user: null }, error: new Error("No config") }),
      },
    };
  }

  // Create supabase client dengan secret key
  // @ts-ignore - Supabase JS client
  const supabase = createClient(supabaseUrl, supabaseKey, {
    global: {
      headers: { Authorization: `Bearer ${supabaseKey}` },
    },
  });

  return supabase;
}