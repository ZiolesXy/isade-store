import { serve } from "https://deno.land/std@0.223.0/http/server.ts";
import { createSupabaseAdminClient } from "../supabaseAdmin.ts";

export interface AuthUser {
  id: string;
  email: string | null;
  role: string;
}

export function authenticateJWT(req: Request): { user: AuthUser; error: Response | null } {
  const authHeader = req.headers.get("Authorization") || "";
  
  if (!authHeader.startsWith("Bearer ")) {
    return { user: { id: "", email: null, role: "customer" }, error: new Response(
      JSON.stringify({ error: { code: "UNAUTHORIZED", message: "Token Bearer tidak ditemukan" } }),
      { status: 401, headers: { "Content-Type": "application/json" } }
    );
  }

  const token = authHeader.substring(7);
  
  try {
    const supabase = createSupabaseAdminClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return { user: { id: "", email: null, role: "customer" }, error: new Response(
        JSON.stringify({ error: { code: "UNAUTHORIZED", message: "Token tidak valid" } }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    // Ambil role dari profiles table
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      return { user: { id: "", email: null, role: "customer" }, error: new Response(
        JSON.stringify({ error: { code: "UNAUTHORIZED", message: "Profil tidak ditemukan" } }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    return { 
      user: { 
        id: user.id, 
        email: user.email, 
        role: profile.role 
      }, 
      error: null 
    };
  } catch (err) {
    return { user: { id: "", email: null, role: "customer" }, error: new Response(
      JSON.stringify({ error: { code: "UNAUTHORIZED", message: "Internal auth error" } }),
      { status: 401, headers: { "Content-Type": "application/json" } }
    );
  }
}