// Supabase Admin Client untuk Edge Functions
// Dideploy dengan service_role key

export function createSupabaseAdminClient() {
  // Return supabase client dengan service_role key
  // Di lokal Supabase akan otomatis memiliki SUPABASE_SERVICE_ROLE_KEY
  const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

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

  // Create supabase client with service_role key
  // @ts-ignore - Supabase JS client
  const supabase = createClient(supabaseUrl, supabaseKey, {
    global: {
      headers: { Authorization: `Bearer ${supabaseKey}` },
    },
  });

  return supabase;
}