import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * LUARMOR-STYLE UNBAN ENDPOINT
 * GET /api-keys-unban?unban_token=...
 * No API key required - uses unban_token for authentication
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
  const unbanToken = url.searchParams.get("unban_token");

  if (!unbanToken) {
    return new Response(JSON.stringify({
      success: false,
      message: "unban_token is required"
    }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }

  try {
    // Call unban function
    const { data: result, error } = await supabase.rpc("unban_key_by_token", {
      p_unban_token: unbanToken
    });

    if (error) {
      console.error("Unban error:", error);
      return new Response(JSON.stringify({
        success: false,
        message: "Error processing unban"
      }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const status = result.success ? 200 : 404;
    return new Response(JSON.stringify(result), {
      status,
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
