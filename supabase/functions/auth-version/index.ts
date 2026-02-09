import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.2";

/**
 * LUARMOR-STYLE VERSION ENDPOINT
 * Step 1 of tracepath: version -> info -> endpoints -> flags -> validate
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-trace-id, x-client-nonce",
  "Cache-Control": "no-store",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const clientIP = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || 
                   req.headers.get("cf-connecting-ip") || "unknown";

  try {
    const url = new URL(req.url);
    const scriptId = url.searchParams.get("script_id");

    if (!scriptId) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: "Missing script_id" 
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Generate session ID for tracepath
    const sessionId = crypto.randomUUID() + "-" + Date.now().toString(36);

    // Create tracepath session (step 1)
    await supabase.from("tracepath_sessions").insert({
      session_id: sessionId,
      script_id: scriptId,
      ip_address: clientIP,
      current_step: 1,
      step_version_at: new Date().toISOString(),
    });

    const response = {
      success: true,
      version: "3.0.0",
      api_version: "v3",
      session_id: sessionId,
      server_time: Math.floor(Date.now() / 1000),
      next_step: "info",
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (error) {
    console.error("Version error:", error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: "Internal error" 
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
