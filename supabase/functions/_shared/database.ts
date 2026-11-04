// Database helper functions for Edge Functions
import { createSupabaseAdminClient } from "./supabaseAdmin.ts";

async function getSupabaseAdmin(): Promise<any> {
  // Dukung pola lama yang menaruh client di globalThis, lalu buat baru bila belum ada.
  const existing = (globalThis as any).supabaseAdmin;
  if (existing) return existing;

  const supabase = createSupabaseAdminClient();
  (globalThis as any).supabaseAdmin = supabase;
  return supabase;
}

export async function apply_payment_result(
  p_order_id: string,
  p_result: string,
  p_gross_amount: number,
  p_source: string,
  p_payload: any
): Promise<string> {
  const supabase = await getSupabaseAdmin();

  const { data, error } = await supabase.rpc("apply_payment_result", {
    p_order_id: p_order_id,
    p_result: p_result,
    p_gross_amount: p_gross_amount,
    p_source: p_source,
    p_payload: p_payload,
  });

  if (error) {
    throw new Error(error.message);
  }

  return data || p_result;
}

export async function is_cashier(): Promise<boolean> {
  const supabase = (globalThis as any).supabaseAuth;
  
  if (!supabase) {
    return false;
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (error || !profile) return false;

  return profile.role === "cashier" || profile.role === "admin";
}