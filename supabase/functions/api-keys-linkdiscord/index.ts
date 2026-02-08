import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * LUARMOR-STYLE LINK DISCORD ENDPOINT
 * POST /api-keys-linkdiscord
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
    const { script_id, user_key, discord_id, force } = body;

    if (!script_id || !user_key || !discord_id) {
      return new Response(JSON.stringify({
        success: false,
        message: "script_id, user_key, and discord_id are required"
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Validate discord_id format (should be numeric string)
    if (!/^\d{17,19}$/.test(discord_id)) {
      return new Response(JSON.stringify({
        success: false,
        message: "Invalid discord ID"
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
      .select("id, discord_id")
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

    // Check if already has discord linked
    if (key.discord_id && !force) {
      return new Response(JSON.stringify({
        success: false,
        message: "This key already has a discord linked to it"
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Check if another key has this discord_id
    const { data: existingKey } = await supabase
      .from("script_keys")
      .select("id")
      .eq("script_id", script_id)
      .eq("discord_id", discord_id)
      .neq("id", key.id)
      .maybeSingle();

    if (existingKey) {
      return new Response(JSON.stringify({
        success: false,
        message: "There's another key that's linked to same discord ID"
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Update the key
    const { error } = await supabase
      .from("script_keys")
      .update({ discord_id })
      .eq("id", key.id);

    if (error) {
      console.error("Link discord error:", error);
      return new Response(JSON.stringify({
        success: false,
        message: "Error linking discord"
      }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    return new Response(JSON.stringify({
      success: true,
      message: "Success!"
    }), {
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
