import { serve } from "https://deno.land/std@0.223.0/http/server.ts";

export function successResponse(data: any, status = 200): Response {
  return new Response(
    JSON.stringify(data),
    {
      status,
      headers: { "Content-Type": "application/json" },
    }
  );
}

export function errorResponse(code: string, message: string, fields?: Record<string, string>, status = 400): Response {
  const body = {
    error: {
      code,
      message,
      ...(fields && Object.keys(fields).length > 0 ? { fields } : {}),
    },
  };
  
  return new Response(
    JSON.stringify(body),
    {
      status,
      headers: { "Content-Type": "application/json" },
    }
  );
}