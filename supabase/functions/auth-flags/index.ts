import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.2";

/**
 * LUARMOR-STYLE FLAGS ENDPOINT
 * Step 4 of tracepath: version -> info -> endpoints -> flags -> validate
 * Returns script configuration flags and generates rotating token
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-session-id, x-hwid",
  "Cache-Control": "no-store",
};

// Generate a secure token
function generateToken(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  const randomValues = new Uint8Array(32);
  crypto.getRandomValues(randomValues);
  for (let i = 0; i < 32; i++) {
    result += chars[randomValues[i] % chars.length];
  }
  return result;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const sessionId = req.headers.get("x-session-id");
  const hwid = req.headers.get("x-hwid");
  const clientIP = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || 
                   req.headers.get("cf-connecting-ip") || "unknown";

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

    // Validate tracepath - must have completed step 3
    const { data: session } = await supabase
      .from("tracepath_sessions")
      .select("*")
      .eq("session_id", sessionId)
      .eq("is_valid", true)
      .single();

    if (!session || session.current_step !== 3) {
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

    // Hash HWID
    let hwidHash = null;
    if (hwid) {
      const data = new TextEncoder().encode(hwid + "shadowauth_v7");
      const hash = await crypto.subtle.digest("SHA-256", data);
      hwidHash = Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, "0")).join("");
    }

    // Generate rotating token (TTL 15s like Luarmor)
    const rotatingToken = generateToken();
    
    await supabase.from("rotating_tokens").insert({
      token: rotatingToken,
      script_id: session.script_id,
      hwid_hash: hwidHash,
      ip_address: clientIP,
      step: 1,
      max_step: 5,
    });

    // Update tracepath to step 4
    await supabase
      .from("tracepath_sessions")
      .update({
        current_step: 4,
        step_flags_at: new Date().toISOString(),
        hwid_hash: hwidHash,
      })
      .eq("session_id", sessionId);

    // Get script flags
    const { data: script } = await supabase
      .from("scripts")
      .select("secure_core_enabled, anti_tamper_enabled, anti_debug_enabled, hwid_lock_enabled, enable_spy_warnings, max_warnings")
      .eq("id", session.script_id)
      .single();

    const response = {
      success: true,
      rotating_token: rotatingToken,
      token_ttl: 15, // 15 seconds like Luarmor
      flags: {
        secure_core: script?.secure_core_enabled ?? true,
        anti_tamper: script?.anti_tamper_enabled ?? true,
        anti_debug: script?.anti_debug_enabled ?? true,
        hwid_lock: script?.hwid_lock_enabled ?? true,
        spy_warnings: script?.enable_spy_warnings ?? true,
        max_warnings: script?.max_warnings ?? 3,
      },
      server_time: Math.floor(Date.now() / 1000),
      next_step: "validate",
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (error) {
    console.error("Flags error:", error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: "Internal error" 
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
