import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

/**
 * SHADOWAUTH validate-key V3 — DEPRECATED
 * ========================================
 * All validation now handled by validate-key-v2.
 * This endpoint forwards to v2 transparently.
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-session-id, x-rotating-token, x-client-nonce, x-client-signature, x-hwid",
  "Cache-Control": "no-store",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method === "POST") {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const v2Url = `${supabaseUrl}/functions/v1/validate-key-v2`;

    try {
      const body = await req.text();
      
      // Map v3 headers to v2 headers
      const v2Response = await fetch(v2Url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-shadow-sig": req.headers.get("x-client-signature") || req.headers.get("x-shadow-sig") || "",
          "user-agent": req.headers.get("user-agent") || "",
          "x-forwarded-for": req.headers.get("x-forwarded-for") || "",
          "cf-connecting-ip": req.headers.get("cf-connecting-ip") || "",
        },
        body,
      });

      const responseBody = await v2Response.text();
      return new Response(responseBody, {
        status: v2Response.status,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
          "X-Deprecated": "true",
          "X-Forwarded-To": "validate-key-v2",
        },
      });
    } catch (err) {
      console.error("[v3→v2 forward] Error:", err);
      return new Response(JSON.stringify({ valid: false, message: "Service temporarily unavailable" }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  }

  return new Response(JSON.stringify({ valid: false, message: "Use validate-key-v2", deprecated: true }), {
    status: 410,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
