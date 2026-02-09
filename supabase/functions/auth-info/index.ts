import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.2";

/**
 * LUARMOR-STYLE INFO ENDPOINT
 * Step 2 of tracepath: version -> info -> endpoints -> flags -> validate
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-trace-id, x-session-id",
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
  const sessionId = req.headers.get("x-session-id");

  try {
    if (!sessionId) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: "Missing session_id - complete version step first" 
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Validate tracepath - must have completed step 1
    const { data: session } = await supabase
      .from("tracepath_sessions")
      .select("*")
      .eq("session_id", sessionId)
      .eq("is_valid", true)
      .single();

    if (!session) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: "Invalid session" 
      }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    if (session.current_step !== 1) {
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

    // Update tracepath to step 2
    await supabase
      .from("tracepath_sessions")
      .update({
        current_step: 2,
        step_info_at: new Date().toISOString(),
        hwid_hash: req.headers.get("x-hwid") || null,
      })
      .eq("session_id", sessionId);

    // Get script info
    const { data: script } = await supabase
      .from("scripts")
      .select("id, name, secure_core_enabled, anti_tamper_enabled, anti_debug_enabled, hwid_lock_enabled")
      .eq("id", session.script_id)
      .single();

    const response = {
      success: true,
      script_name: script?.name || "Unknown",
      features: {
        secure_core: script?.secure_core_enabled ?? true,
        anti_tamper: script?.anti_tamper_enabled ?? true,
        anti_debug: script?.anti_debug_enabled ?? true,
        hwid_lock: script?.hwid_lock_enabled ?? true,
      },
      server_time: Math.floor(Date.now() / 1000),
      next_step: "endpoints",
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (error) {
    console.error("Info error:", error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: "Internal error" 
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
