import { serve } from "https://deno.land/std@0.223.0/http/server.ts";

const accessControlAllowOrigins = Deno.env.get("ALLOWED_ORIGINS") || "";

export function createCORSHandler(handler: (req: Request) => Promise<Response>) {
  return async (req: Request): Promise<Response> => {
    // Origin dari REQUEST, bukan response.
    const origin = req.headers.get("origin") || "";
    const allowedOrigins = accessControlAllowOrigins
      ? accessControlAllowOrigins.split(",").map((o) => o.trim()).filter(Boolean)
      : [];

    const corsHeaders: Record<string, string> = {
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers":
        "Authorization, Content-Type, apikey, x-client-info",
      "Access-Control-Max-Age": "86400",
      Vary: "Origin",
    };

    // ALLOWED_ORIGINS kosong atau "*" => izinkan semua.
    // Selain itu, echo origin yang terdaftar
    // (Access-Control-Allow-Origin wajib satu origin, bukan daftar).
    const allowAll =
      !accessControlAllowOrigins || accessControlAllowOrigins.trim() === "*";
    if (allowAll) {
      corsHeaders["Access-Control-Allow-Origin"] = "*";
    } else if (origin && allowedOrigins.includes(origin)) {
      corsHeaders["Access-Control-Allow-Origin"] = origin;
    }

    // Handle CORS preflight
    if (req.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    // Execute the actual handler
    const res = await handler(req);

    // Add CORS headers to response
    for (const [key, value] of Object.entries(corsHeaders)) {
      res.headers.set(key, value);
    }

    return res;
  };
}