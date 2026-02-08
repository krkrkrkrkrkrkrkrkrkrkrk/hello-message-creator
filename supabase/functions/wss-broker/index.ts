import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.2";
import {
  generateChallenge,
  verifyChallengeResponse,
  createBinaryPacket,
  createEncryptedChunks,
  WSSMessageType,
  stringToBytes,
  checkMessageRateLimit,
  checkDuplicateConnection,
  generateWSSClient,
} from "../_shared/wss-protocol.ts";

/**
 * WSS Broker - Orchestrates WebSocket Secure connections
 * 
 * This edge function:
 * 1. Generates WSS session tokens
 * 2. Creates HMAC challenges
 * 3. Returns minimal WSS bootstrap code
 * 4. Validates keys and prepares binary payloads
 * 
 * The actual WebSocket server runs on Deno Deploy (WSS_SERVER_URL)
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-shadow-sig, x-shadow-key, x-shadow-hwid",
  "Cache-Control": "no-store, no-cache, must-revalidate",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const clientIP = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
                   req.headers.get("cf-connecting-ip") || "unknown";

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabase = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const wssServerUrl = Deno.env.get("WSS_SERVER_URL") || "wss://shadowauth-wss.deno.dev";

    const url = new URL(req.url);
    const action = url.searchParams.get("action") || "init";

    // ==================== ACTION: INIT (Get WSS bootstrap) ====================
    if (action === "init") {
      const body = await req.json().catch(() => ({}));
      const { script_id, key, hwid, executor } = body;

      if (!script_id || !key) {
        return new Response(
          JSON.stringify({ error: "Missing script_id or key" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Check for duplicate connection attempts
      const connId = `${clientIP}:${script_id}:${hwid || "unknown"}`;
      if (checkDuplicateConnection(connId, 5000)) {
        return new Response(
          JSON.stringify({ error: "Connection too fast, wait 5 seconds" }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Validate key
      const { data: keyData, error: keyError } = await supabase
        .from("script_keys")
        .select("*, scripts(*)")
        .eq("key_value", key)
        .eq("script_id", script_id)
        .maybeSingle();

      if (keyError || !keyData) {
        await supabase.from("security_events").insert({
          event_type: "invalid_key_wss",
          severity: "warning",
          ip_address: clientIP,
          script_id,
          details: { key_prefix: key.substring(0, 8), executor }
        });

        return new Response(
          JSON.stringify({ error: "Invalid key" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Check if key is banned
      if (keyData.is_banned) {
        return new Response(
          JSON.stringify({ error: "Key is banned" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Check key expiry
      if (keyData.expires_at && new Date(keyData.expires_at) < new Date()) {
        return new Response(
          JSON.stringify({ error: "Key expired" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Check HWID binding
      if (keyData.hwid && keyData.hwid !== hwid && keyData.scripts?.hwid_lock_enabled) {
        await supabase.from("security_events").insert({
          event_type: "hwid_mismatch_wss",
          severity: "warning",
          ip_address: clientIP,
          script_id,
          key_id: keyData.id,
          details: { expected_hwid: keyData.hwid?.substring(0, 8), actual_hwid: hwid?.substring(0, 8) }
        });

        return new Response(
          JSON.stringify({ error: "HWID mismatch" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Bind HWID if not set
      if (!keyData.hwid && hwid && keyData.scripts?.hwid_lock_enabled) {
        await supabase
          .from("script_keys")
          .update({ hwid, used_at: new Date().toISOString() })
          .eq("id", keyData.id);
      }

      // Generate session token and challenge
      const sessionToken = crypto.randomUUID().replace(/-/g, '') + 
                          crypto.randomUUID().replace(/-/g, '').substring(0, 16);
      const challenge = generateChallenge();

      // Get script secrets for HMAC
      const { data: secrets } = await supabase
        .from("script_secrets")
        .select("hmac_key")
        .eq("script_id", script_id)
        .maybeSingle();

      const hmacKey = secrets?.hmac_key || crypto.randomUUID();

      // Store session in rotating_tokens for WSS server to validate
      await supabase.from("rotating_tokens").insert({
        token: sessionToken,
        script_id,
        key_id: keyData.id,
        hwid_hash: hwid,
        ip_address: clientIP,
        expires_at: new Date(Date.now() + 60000).toISOString(), // 60 second window
        step: 1,
        max_step: 1,
      });

      // Store challenge for verification
      await supabase.from("auth_nonces").insert({
        nonce: challenge,
        script_id,
        client_hwid: hwid,
        ip_address: clientIP,
        expires_at: new Date(Date.now() + 30000).toISOString(), // 30 second window
      });

      // Generate WSS client code
      const wssClient = generateWSSClient(
        wssServerUrl,
        script_id,
        sessionToken,
        hmacKey,
        challenge
      );

      // Calculate seconds left for expiry display
      let secondsLeft: number | null = null;
      if (keyData.expires_at) {
        secondsLeft = Math.floor((new Date(keyData.expires_at).getTime() - Date.now()) / 1000);
      }

      console.log(`WSS session created for ${clientIP} -> ${script_id} [${executor || 'unknown'}]`);

      return new Response(
        JSON.stringify({
          valid: true,
          wss_client: wssClient,
          session_token: sessionToken,
          wss_url: wssServerUrl,
          seconds_left: secondsLeft,
          discord_username: keyData.discord_id ? `Discord User` : null,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ==================== ACTION: PREPARE (Pre-encrypt script for WSS) ====================
    if (action === "prepare") {
      const token = url.searchParams.get("token");
      const scriptId = url.searchParams.get("script_id");

      if (!token || !scriptId) {
        return new Response(
          JSON.stringify({ error: "Missing parameters" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Validate token
      const { data: tokenData, error: tokenError } = await supabase
        .from("rotating_tokens")
        .select("*")
        .eq("token", token)
        .eq("script_id", scriptId)
        .eq("is_valid", true)
        .maybeSingle();

      if (tokenError || !tokenData) {
        return new Response(
          JSON.stringify({ error: "Invalid token" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Fetch script
      const { data: script } = await supabase
        .from("scripts")
        .select("content, name")
        .eq("id", scriptId)
        .maybeSingle();

      if (!script) {
        return new Response(
          JSON.stringify({ error: "Script not found" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Create encrypted chunks
      const derivedKey = `${token}:${tokenData.hwid_hash || 'unknown'}:${Date.now()}`;
      const chunks = createEncryptedChunks(script.content, derivedKey, 4096);

      // Mark token as used
      await supabase
        .from("rotating_tokens")
        .update({ is_valid: false, used_at: new Date().toISOString() })
        .eq("id", tokenData.id);

      // Return chunks as base64 for WSS server to forward
      const chunksBase64 = chunks.map(chunk => {
        let binary = '';
        for (let i = 0; i < chunk.length; i++) {
          binary += String.fromCharCode(chunk[i]);
        }
        return btoa(binary);
      });

      return new Response(
        JSON.stringify({
          chunks: chunksBase64,
          chunk_count: chunks.length,
          derived_key: derivedKey,
          script_size: script.content.length,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Unknown action" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("WSS Broker error:", error);
    return new Response(
      JSON.stringify({ error: "Server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
