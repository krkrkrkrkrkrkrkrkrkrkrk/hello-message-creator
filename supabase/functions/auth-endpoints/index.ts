import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.2";

/**
 * LUARMOR-STYLE ENDPOINTS ENDPOINT
 * Step 3 of tracepath: version -> info -> endpoints -> flags -> validate
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-session-id",
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

  const sessionId = req.headers.get("x-session-id");

  try {
    if (!sessionId) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: "Missing session_id" 
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Validate tracepath - must have completed step 2
    const { data: session } = await supabase
      .from("tracepath_sessions")
      .select("*")
      .eq("session_id", sessionId)
      .eq("is_valid", true)
      .single();

    if (!session || session.current_step !== 2) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: "Invalid tracepath sequence" 
      }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    if (new Date(session.expires_at) < new Date()) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: "Session expired" 
      }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Update tracepath to step 3
    await supabase
      .from("tracepath_sessions")
      .update({
        current_step: 3,
        step_endpoints_at: new Date().toISOString(),
      })
      .eq("session_id", sessionId);

    const baseUrl = Deno.env.get("SUPABASE_URL");

    const response = {
      success: true,
      endpoints: {
        version: `${baseUrl}/functions/v1/auth-version`,
        info: `${baseUrl}/functions/v1/auth-info`,
        endpoints: `${baseUrl}/functions/v1/auth-endpoints`,
        flags: `${baseUrl}/functions/v1/auth-flags`,
        validate: `${baseUrl}/functions/v1/validate-key-v3`,
        heartbeat: `${baseUrl}/functions/v1/heartbeat`,
        external_check: `${baseUrl}/functions/v1/external-key-check`,
      },
      server_time: Math.floor(Date.now() / 1000),
      next_step: "flags",
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (error) {
    console.error("Endpoints error:", error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: "Internal error" 
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
