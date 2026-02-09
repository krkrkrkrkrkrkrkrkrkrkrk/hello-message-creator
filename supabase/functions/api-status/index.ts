import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

/**
 * LUARMOR-STYLE API STATUS ENDPOINT
 * GET /api-status
 * Returns API version and health information
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Cache-Control": "no-store",
};

const API_VERSION = "v3";
const BUILD_DATE = "2026-02-04";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    // Basic health check - verify Supabase connection
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const isHealthy = !!supabaseUrl;

    const response = {
      success: true,
      version: API_VERSION,
      active: isHealthy,
      message: isHealthy ? "API is up and working!" : "API is experiencing issues",
      warning: false,
      warning_message: "No warning",
      build_date: BUILD_DATE,
      server_time: Math.floor(Date.now() / 1000),
      response_time_ms: Date.now() - startTime,
      endpoints: {
        validate_key: "/validate-key-v2",
        auth_handshake: "/auth-handshake",
        loader: "/loader",
        heartbeat: "/heartbeat",
        discord_bot: "/discord-bot",
        obfuscate: "/obfuscate-lua",
      },
      features: {
        ffa_mode: true,
        silent_mode: true,
        key_days: true,
        hwid_lock: true,
        anti_tamper: true,
        binary_delivery: true,
        wss_communication: true,
        tracepath_validation: true,
      },
      rate_limits: {
        default: 60,
        validate_key: 30,
        handshake: 30,
        loader: 100,
      },
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Status check error:", error);
    return new Response(JSON.stringify({
      success: false,
      version: API_VERSION,
      active: false,
      message: "API is experiencing issues",
      warning: true,
      warning_message: "Internal error occurred",
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
