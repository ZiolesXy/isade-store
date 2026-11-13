// Supabase Admin Client untuk Edge Functions
// Dideploy dengan secret key
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export function createSupabaseAdminClient() {
  // Return supabase client dengan secret key
  // Di lokal Supabase akan otomatis memiliki SUPABASE_SECRET_KEY
  const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
  const supabaseKey = Deno.env.get("SUPABASE_SECRET_KEY") || "";

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