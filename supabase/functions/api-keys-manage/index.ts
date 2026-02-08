import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * LUARMOR-STYLE KEY MANAGEMENT API
 * Supports: CREATE, UPDATE, DELETE, GET, RESET HWID, BLACKLIST, UNBAN
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const url = new URL(req.url);
  const pathParts = url.pathname.split("/").filter(Boolean);
  
  // Extract API key from Authorization header
  const apiKey = req.headers.get("Authorization")?.replace("Bearer ", "");
  
  if (!apiKey) {
    return new Response(JSON.stringify({
      success: false,
      message: "Missing API key in Authorization header"
    }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }

  // Validate API key and get user
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, api_key, subscription_plan")
    .eq("api_key", apiKey)
    .maybeSingle();

  if (!profile) {
    return new Response(JSON.stringify({
      success: false,
      message: "Invalid API key! Visit https://shadowauth.dev/ to get access."
    }), {
      status: 403,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }

  try {
    const method = req.method;
    const scriptId = url.searchParams.get("script_id");

    // =========================================
    // GET /api-keys-manage?script_id=...
    // Get users/keys with filters
    // =========================================
    if (method === "GET") {
      if (!scriptId) {
        return new Response(JSON.stringify({
          success: false,
          message: "script_id is required"
        }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      // Verify script ownership
      const { data: script } = await supabase
        .from("scripts")
        .select("id")
        .eq("id", scriptId)
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

      // Get filter params (Luarmor-style)
      const discordId = url.searchParams.get("discord_id");
      const userKey = url.searchParams.get("user_key");
      const identifier = url.searchParams.get("identifier");
      const search = url.searchParams.get("search");
      const from = parseInt(url.searchParams.get("from") || "0");
      const until = parseInt(url.searchParams.get("until") || "100");

      // Use the new function for paginated results
      const { data: users, error } = await supabase.rpc("get_keys_paginated", {
        p_script_id: scriptId,
        p_search: search,
        p_discord_id: discordId,
        p_user_key: userKey,
        p_identifier: identifier,
        p_from: from,
        p_until: until
      });

      if (error) {
        console.error("Error fetching keys:", error);
        return new Response(JSON.stringify({
          success: false,
          message: "Error fetching users"
        }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      return new Response(JSON.stringify({
        success: true,
        message: "Success!",
        users: users || []
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // =========================================
    // POST /api-keys-manage - Create key
    // =========================================
    if (method === "POST") {
      const body = await req.json();
      const { script_id, identifier, discord_id, note, key_days, auth_expire } = body;

      if (!script_id) {
        return new Response(JSON.stringify({
          success: false,
          message: "script_id is required"
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

      // Check for duplicate discord_id
      if (discord_id) {
        const { data: existing } = await supabase
          .from("script_keys")
          .select("id")
          .eq("script_id", script_id)
          .eq("discord_id", discord_id)
          .maybeSingle();

        if (existing) {
          return new Response(JSON.stringify({
            success: false,
            message: "Discord ID already exists."
          }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
        }
      }

      // Calculate expires_at
      let expiresAt = null;
      let keyDaysValue = null;
      
      if (key_days && !identifier && !discord_id) {
        // key_days mode: will be activated on first use
        keyDaysValue = key_days;
      } else if (key_days) {
        // Has identifier/discord_id: activate immediately
        expiresAt = new Date(Date.now() + key_days * 24 * 60 * 60 * 1000).toISOString();
      } else if (auth_expire) {
        expiresAt = new Date(auth_expire * 1000).toISOString();
      }

      // Generate key
      const keyValue = Array.from(crypto.getRandomValues(new Uint8Array(16)))
        .map(b => b.toString(16).padStart(2, "0")).join("");

      const { data: newKey, error } = await supabase
        .from("script_keys")
        .insert({
          script_id: script_id,
          key_value: keyValue,
          hwid: identifier || null,
          discord_id: discord_id || null,
          note: note || null,
          key_days: keyDaysValue,
          expires_at: expiresAt,
          activated_at: (identifier || discord_id) ? new Date().toISOString() : null,
          status: identifier ? "active" : "reset"
        })
        .select("key_value")
        .single();

      if (error) {
        console.error("Error creating key:", error);
        return new Response(JSON.stringify({
          success: false,
          message: "Error creating key"
        }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      return new Response(JSON.stringify({
        success: true,
        message: "Success!",
        user_key: newKey.key_value
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // =========================================
    // PATCH /api-keys-manage - Update key
    // =========================================
    if (method === "PATCH") {
      const body = await req.json();
      const { script_id, user_key, identifier, discord_id, note, auth_expire } = body;

      if (!script_id || !user_key) {
        return new Response(JSON.stringify({
          success: false,
          message: "script_id and user_key are required"
        }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      // Build update object
      const updateData: Record<string, unknown> = {};
      if (identifier !== undefined) updateData.hwid = identifier;
      if (discord_id !== undefined) updateData.discord_id = discord_id;
      if (note !== undefined) updateData.note = note;
      if (auth_expire !== undefined) {
        updateData.expires_at = auth_expire === -1 ? null : new Date(auth_expire * 1000).toISOString();
      }

      const { error } = await supabase
        .from("script_keys")
        .update(updateData)
        .eq("key_value", user_key)
        .eq("script_id", script_id);

      if (error) {
        return new Response(JSON.stringify({
          success: false,
          message: "Error updating key"
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
    }

    // =========================================
    // DELETE /api-keys-manage?script_id=...&user_key=...
    // =========================================
    if (method === "DELETE") {
      const userKey = url.searchParams.get("user_key");

      if (!scriptId || !userKey) {
        return new Response(JSON.stringify({
          success: false,
          message: "script_id and user_key are required"
        }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      const { error, count } = await supabase
        .from("script_keys")
        .delete()
        .eq("key_value", userKey)
        .eq("script_id", scriptId);

      if (error || count === 0) {
        return new Response(JSON.stringify({
          success: false,
          message: "Key not found"
        }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      return new Response(JSON.stringify({
        success: true,
        message: "User has been deleted!"
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    return new Response(JSON.stringify({
      success: false,
      message: "Method not allowed"
    }), {
      status: 405,
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
