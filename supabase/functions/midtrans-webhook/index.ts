// Placeholder untuk Tahap 3. Diganti oleh implementasi HandleNotificationUseCase.
import { serve } from "https://deno.land/std@0.223.0/http/server.ts";

serve(async (req) => {
  return new Response(JSON.stringify({ error: "not implemented" }), {
    status: 501,
    headers: { "Content-Type": "application/json" },
  });
});
