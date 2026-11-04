import { serve } from "https://deno.land/std@0.223.0/http/server.ts";

const accessControlAllowOrigins = Deno.env.get("ALLOWED_ORIGINS") || "";

export function createCORSHandler(handler: (req: Request) => Promise<Response>) {
  return async (req: Request): Promise<Response> => {
    // Handle CORS preflight
    if (req.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": accessControlAllowOrigins || "*",
          "Access-Control-Allow-Methods": "POST, OPTIONS",
          "Access-Control-Allow-Headers": "Authorization, Content-Type",
          "Access-Control-Max-Age": "86400",
        },
      });
    }

    // Execute the actual handler
    const res = await handler(req);

    // Add CORS header to response
    if (accessControlAllowOrigins) {
      const origin = res.headers.get("origin") || "";
      const allowedOrigins = accessControlAllowOrigins.split(",");
      if (allowedOrigins.includes(origin)) {
        res.headers.set("Access-Control-Allow-Origin", origin);
      }
    } else {
      res.headers.set("Access-Control-Allow-Origin", "*");
    }

    return res;
  };
}