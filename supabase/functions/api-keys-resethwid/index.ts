import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * LUARMOR-STYLE RESET HWID ENDPOINT
 * POST /api-keys-resethwid
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({
      success: false,
      message: "Method not allowed"
    }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  // Extract API key
  const apiKey = req.headers.get("Authorization")?.replace("Bearer ", "");
  
  if (!apiKey) {
    return new Response(JSON.stringify({
      success: false,
      message: "Missing API key"
    }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }

  // Validate API key
  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("api_key", apiKey)
    .maybeSingle();

  if (!profile) {
    return new Response(JSON.stringify({
      success: false,
      message: "Invalid API key"
    }), {
      status: 403,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }

  try {
    const body = await req.json();
    const { script_id, user_key, force } = body;

    if (!script_id || !user_key) {
      return new Response(JSON.stringify({
        success: false,
        message: "script_id and user_key are required"
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Verify script ownership
    const { data: script } = await supabase
      .from("scripts")
      .select("id")
      .eq("id", script_id)
      .eq("user_id", profile.id)
      .maybeSingle();

    if (!script) {
      return new Response(JSON.stringify({
        success: false,
        message: "Script not found or unauthorized"
      }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Get the key
    const { data: key } = await supabase
      .from("script_keys")
      .select("id")
      .eq("key_value", user_key)
      .eq("script_id", script_id)
      .maybeSingle();

    if (!key) {
      return new Response(JSON.stringify({
        success: false,
        message: "User key doesn't exist"
      }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Call reset function
    const { data: result, error } = await supabase.rpc("reset_key_hwid", {
      p_key_id: key.id,
      p_force: force === true
    });

    if (error) {
      console.error("Reset HWID error:", error);
      return new Response(JSON.stringify({
        success: false,
        message: "Error resetting HWID"
      }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    return new Response(JSON.stringify(result), {
      status: result.success ? 200 : 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (error) {
    console.error("API error:", error);
    return new Response(JSON.stringify({
      success: false,
      message: "Internal server error"
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
