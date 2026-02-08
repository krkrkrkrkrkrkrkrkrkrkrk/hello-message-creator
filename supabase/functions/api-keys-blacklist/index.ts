import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * LUARMOR-STYLE BLACKLIST ENDPOINT
 * POST /api-keys-blacklist
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
    const { script_id, user_key, ban_reason, ban_expire } = body;

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
        message: "Script not found"
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

    // Call blacklist function
    const banExpireTimestamp = ban_expire && ban_expire !== -1 
      ? new Date(ban_expire * 1000).toISOString() 
      : null;

    const { data: result, error } = await supabase.rpc("blacklist_key", {
      p_key_id: key.id,
      p_ban_reason: ban_reason || "Banned by owner",
      p_ban_expire: banExpireTimestamp
    });

    if (error) {
      console.error("Blacklist error:", error);
      return new Response(JSON.stringify({
        success: false,
        message: "Error blacklisting key"
      }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    return new Response(JSON.stringify(result), {
      status: 200,
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
