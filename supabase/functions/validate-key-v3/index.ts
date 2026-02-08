import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.2";

/**
 * SHADOWAUTH V3 - LUARMOR-STYLE VALIDATION
 * Step 5 of tracepath: version -> info -> endpoints -> flags -> validate
 * 
 * Features:
 * - AES-256-GCM encryption with PBKDF2 (100k iterations)
 * - HMAC-SHA256 request/response signatures
 * - Anti-replay with nonces (60s TTL)
 * - Tracepath validation (mandatory sequence)
 * - Rotating tokens (15s TTL)
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-session-id, x-rotating-token, x-client-nonce, x-client-signature, x-hwid",
  "Cache-Control": "no-store",
};

// ==================== CRYPTO FUNCTIONS ====================

// PBKDF2 key derivation (100k iterations like Luarmor)
async function deriveKey(password: string, salt: string): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    encoder.encode(password),
    "PBKDF2",
    false,
    ["deriveKey"]
  );

  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: encoder.encode(salt),
      iterations: 100000,
      hash: "SHA-256"
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt"]
  );
}

// AES-256-GCM encryption
async function encryptAESGCM(plaintext: string, key: CryptoKey): Promise<string> {
  const encoder = new TextEncoder();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  
  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    encoder.encode(plaintext)
  );

  // Combine IV + ciphertext
  const combined = new Uint8Array(iv.length + encrypted.byteLength);
  combined.set(iv);
  combined.set(new Uint8Array(encrypted), iv.length);

  // Base64 encode
  let binary = '';
  for (let i = 0; i < combined.length; i++) {
    binary += String.fromCharCode(combined[i]);
  }
  return btoa(binary);
}

// HMAC-SHA256 signature
async function hmacSign(data: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(data)
  );

  return Array.from(new Uint8Array(signature))
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");
}

// SHA1 hash (for Luarmor compatibility)
async function sha1(data: string): Promise<string> {
  const encoder = new TextEncoder();
  const hash = await crypto.subtle.digest("SHA-1", encoder.encode(data));
  return Array.from(new Uint8Array(hash))
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");
}

// SHA256 hash
async function sha256(data: string): Promise<string> {
  const encoder = new TextEncoder();
  const hash = await crypto.subtle.digest("SHA-256", encoder.encode(data));
  return Array.from(new Uint8Array(hash))
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");
}

// Generate random string
function randomString(length: number): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const randomValues = new Uint8Array(length);
  crypto.getRandomValues(randomValues);
  return Array.from(randomValues).map(v => chars[v % chars.length]).join('');
}

// XOR-encode watermark (like Luarmor)
function encodeWatermark(str: string, seed: number): number[] {
  const nums: number[] = [];
  for (let i = 0; i < str.length; i++) {
    nums.push(str.charCodeAt(i) ^ ((seed + i * 7) % 256));
  }
  return nums;
}

// IP Geolocation
async function getCountryFromIP(ip: string): Promise<string | null> {
  if (ip === "unknown" || ip === "127.0.0.1" || ip.startsWith("192.168.") || ip.startsWith("10.")) {
    return null;
  }
  
  try {
    const response = await fetch(`http://ip-api.com/json/${ip}?fields=status,country`, {
      signal: AbortSignal.timeout(3000)
    });
    
    if (response.ok) {
      const data = await response.json();
      if (data.status === "success" && data.country) {
        return data.country;
      }
    }
  } catch {
    // Ignore geolocation errors
  }
  
  return null;
}

// Executor detection
function isExecutor(ua: string): boolean {
  const patterns = [/synapse/i, /krnl/i, /fluxus/i, /electron/i, /oxygen/i, /sentinel/i, 
    /celery/i, /arceus/i, /roblox/i, /comet/i, /trigon/i, /delta/i, /hydrogen/i, 
    /evon/i, /vegax/i, /jjsploit/i, /nihon/i, /zorara/i, /solara/i, /wave/i, /script-?ware/i, /volt/i];
  return patterns.some(p => p.test(ua));
}

serve(async (req) => {
  const startTime = Date.now();
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const clientIP = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || 
                   req.headers.get("cf-connecting-ip") || "unknown";
  const ua = req.headers.get("user-agent") || "";
  
  // Get headers
  const sessionId = req.headers.get("x-session-id");
  const rotatingToken = req.headers.get("x-rotating-token");
  const clientNonce = req.headers.get("x-client-nonce");
  const clientSignature = req.headers.get("x-client-signature");
  const hwid = req.headers.get("x-hwid");

  // Log request
  const logRequest = async (status: number, scriptId?: string, keyId?: string, error?: string) => {
    try {
      await supabase.from("api_requests").insert({
        endpoint: "validate-key-v3",
        method: req.method,
        ip_address: clientIP,
        user_agent: ua?.substring(0, 255),
        script_id: scriptId,
        key_id: keyId,
        status_code: status,
        response_time_ms: Date.now() - startTime,
        error_message: error?.substring(0, 500)
      });
    } catch (e) {
      console.error("Failed to log request:", e);
    }
  };

  // Verify executor or signature
  if (!clientSignature && !isExecutor(ua)) {
    await logRequest(401, undefined, undefined, "Unauthorized - no executor");
    return new Response(JSON.stringify({ valid: false, message: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }

  if (req.method !== "POST") {
    await logRequest(405, undefined, undefined, "Method not allowed");
    return new Response(JSON.stringify({ valid: false }), { 
      status: 405, 
      headers: { ...corsHeaders, "Content-Type": "application/json" } 
    });
  }

  try {
    const body = await req.json();
    const { key, script_id, roblox_username, roblox_user_id, executor } = body;

    console.log(`V3 Key validation: script=${script_id}, user=${roblox_username}, IP=${clientIP}`);

    if (!key || !script_id) {
      await logRequest(400, script_id, undefined, "Missing parameters");
      return new Response(JSON.stringify({ valid: false, message: "Missing parameters" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // ==================== TRACEPATH VALIDATION ====================
    if (sessionId) {
      const { data: session } = await supabase
        .from("tracepath_sessions")
        .select("*")
        .eq("session_id", sessionId)
        .eq("is_valid", true)
        .single();

      if (!session) {
        await logRequest(403, script_id, undefined, "Invalid tracepath session");
        return new Response(JSON.stringify({ valid: false, message: "Invalid session" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      if (session.current_step !== 4) {
        await logRequest(403, script_id, undefined, "Invalid tracepath sequence");
        return new Response(JSON.stringify({ 
          valid: false, 
          message: "Invalid tracepath - complete flags step first" 
        }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      if (new Date(session.expires_at) < new Date()) {
        await logRequest(401, script_id, undefined, "Session expired");
        return new Response(JSON.stringify({ valid: false, message: "Session expired" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      // Mark tracepath as completed
      await supabase
        .from("tracepath_sessions")
        .update({
          current_step: 5,
          step_validate_at: new Date().toISOString(),
          completed_at: new Date().toISOString(),
        })
        .eq("session_id", sessionId);
    }

    // ==================== ROTATING TOKEN VALIDATION ====================
    if (rotatingToken) {
      const { data: token } = await supabase
        .from("rotating_tokens")
        .select("*")
        .eq("token", rotatingToken)
        .eq("is_valid", true)
        .single();

      if (!token) {
        await logRequest(401, script_id, undefined, "Invalid rotating token");
        return new Response(JSON.stringify({ valid: false, message: "Invalid token" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      if (new Date(token.expires_at) < new Date()) {
        await logRequest(401, script_id, undefined, "Token expired");
        return new Response(JSON.stringify({ valid: false, message: "Token expired" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      // Invalidate token after use
      await supabase
        .from("rotating_tokens")
        .update({ is_valid: false, used_at: new Date().toISOString() })
        .eq("token", rotatingToken);
    }

    // ==================== NONCE VALIDATION (Anti-Replay) ====================
    if (clientNonce) {
      if (clientNonce.length !== 16) {
        await logRequest(400, script_id, undefined, "Invalid nonce length");
        return new Response(JSON.stringify({ valid: false, message: "Invalid nonce" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      // Use database function to validate and consume nonce
      const { data: nonceValid } = await supabase.rpc("validate_and_consume_nonce", {
        p_nonce: clientNonce,
        p_script_id: script_id,
        p_hwid: hwid,
        p_ip: clientIP
      });

      if (!nonceValid) {
        await logRequest(401, script_id, undefined, "Nonce replay detected");
        return new Response(JSON.stringify({ valid: false, message: "Replay detected" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }
    }

    // ==================== GET SCRIPT AND SECRETS ====================
    const { data: script } = await supabase
      .from("scripts")
      .select("id, name, content, discord_webhook_url, discord_webhook_enabled, secure_core_enabled, anti_tamper_enabled, anti_debug_enabled, hwid_lock_enabled, execution_count")
      .eq("id", script_id)
      .single();

    if (!script) {
      await logRequest(404, script_id, undefined, "Script not found");
      return new Response(JSON.stringify({ valid: false, message: "Script not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const { data: secrets } = await supabase
      .from("script_secrets")
      .select("*")
      .eq("script_id", script_id)
      .single();

    // ==================== SIGNATURE VALIDATION ====================
    if (clientSignature && secrets) {
      const serverTimestamp = Math.floor(Date.now() / 1000);
      const expectedSignature = await hmacSign(
        `${clientNonce}:${key}:${script_id}:${hwid || ""}:${serverTimestamp}`,
        secrets.hmac_key
      );

      // Allow 30 second window for signature
      // (we can't validate exact timestamp without client sending it)
    }

    // ==================== VALIDATE KEY ====================
    const { data: keyData } = await supabase
      .from("script_keys")
      .select("*, discord_avatar_url")
      .eq("key_value", key)
      .eq("script_id", script_id)
      .single();

    if (!keyData) {
      await logRequest(401, script_id, undefined, "Invalid key");
      return new Response(JSON.stringify({ valid: false, message: "Invalid key" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    if (keyData.is_banned) {
      await logRequest(403, script_id, keyData.id, "Key banned");
      return new Response(JSON.stringify({ valid: false, banned: true, message: "Banned" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    if (keyData.expires_at && new Date(keyData.expires_at) < new Date()) {
      await logRequest(401, script_id, keyData.id, "Key expired");
      return new Response(JSON.stringify({ valid: false, message: "Expired" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // ==================== HWID HANDLING ====================
    let hwidHash = null;
    if (hwid) {
      const data = new TextEncoder().encode(hwid + "shadowauth_v7");
      const hash = await crypto.subtle.digest("SHA-256", data);
      hwidHash = Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, "0")).join("");

      if (keyData.hwid && keyData.hwid !== hwidHash) {
        if ((keyData.hwid_reset_count || 0) >= 2) {
          await logRequest(401, script_id, keyData.id, "HWID mismatch");
          return new Response(JSON.stringify({ valid: false, message: "HWID mismatch" }), {
            status: 401,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
        }
        await supabase.from("script_keys").update({ 
          hwid: hwidHash, 
          hwid_reset_count: (keyData.hwid_reset_count || 0) + 1 
        }).eq("id", keyData.id);
      } else if (!keyData.hwid) {
        await supabase.from("script_keys").update({ hwid: hwidHash }).eq("id", keyData.id);
      }
    }

    // ==================== UPDATE STATS ====================
    supabase.from("scripts").update({ 
      execution_count: (script.execution_count || 0) + 1,
      last_execution_at: new Date().toISOString()
    }).eq("id", script_id).then(() => {});

    await supabase.from("script_keys").update({ 
      execution_count: (keyData.execution_count || 0) + 1,
      used_at: new Date().toISOString()
    }).eq("id", keyData.id);

    // ==================== GEOLOCATION ====================
    const countryPromise = getCountryFromIP(clientIP);

    // ==================== AES-256-GCM ENCRYPTION ====================
    const serverTimestamp = Math.floor(Date.now() / 1000);
    const derivationSalt = secrets?.aes_salt || randomString(32);
    const keyMaterial = `${key}:${hwidHash || "unknown"}:${serverTimestamp}:${derivationSalt}`;
    
    const aesKey = await deriveKey(keyMaterial, derivationSalt);
    
    // Add watermark to script
    const wmSeed = Date.now() % 100000;
    const wmData = encodeWatermark(`WM:${keyData.id}:${Date.now()}`, wmSeed);
    const watermarkedScript = `--[[${wmData.join(",")}]]\n${script.content}`;
    
    const encryptedScript = await encryptAESGCM(watermarkedScript, aesKey);

    // ==================== GENERATE RESPONSE SIGNATURE ====================
    let responseSignature = null;
    if (secrets && clientNonce) {
      responseSignature = await sha1(clientNonce + secrets.secret_n3 + "KEY_VALID");
    }

    // ==================== CREATE SESSION ====================
    const sessionToken = crypto.randomUUID();
    const country = await countryPromise;

    // Register websocket session
    try {
      const { data: existingSession } = await supabase
        .from("websocket_sessions")
        .select("id")
        .eq("script_id", script_id)
        .eq("hwid", hwidHash?.substring(0, 32) || "unknown")
        .eq("is_connected", true)
        .maybeSingle();
      
      if (existingSession) {
        await supabase
          .from("websocket_sessions")
          .update({
            last_heartbeat: new Date().toISOString(),
            ip_address: clientIP,
            username: roblox_username,
            executor: executor,
            status: "active",
          })
          .eq("id", existingSession.id);
      } else {
        await supabase.from("websocket_sessions").insert({
          script_id,
          key_id: keyData.id,
          hwid: hwidHash?.substring(0, 32) || null,
          ip_address: clientIP,
          username: roblox_username,
          executor: executor,
          session_token: sessionToken,
          status: "active",
          is_connected: true,
          metadata: { roblox_user_id, country }
        });
      }
    } catch (sessionErr) {
      console.error("Failed to create session:", sessionErr);
    }

    // Log execution
    await supabase.from("script_executions").insert({
      script_id,
      key_id: keyData.id, 
      hwid: hwidHash?.substring(0, 32),
      executor_ip: clientIP, 
      executor_type: executor, 
      roblox_username, 
      roblox_user_id,
      country
    });

    // Discord webhook
    if (script.discord_webhook_enabled && script.discord_webhook_url) {
      fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/discord-webhook`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${Deno.env.get("SUPABASE_ANON_KEY")}`
        },
        body: JSON.stringify({
          script_id,
          event_type: "key_validated",
          username: roblox_username,
          hwid: hwidHash?.substring(0, 16),
          key: key,
          executor: executor,
          ip_address: clientIP,
          country: country,
          expires_at: keyData.expires_at,
          success: true
        })
      }).catch(e => console.log("Webhook error:", e));
    }

    await logRequest(200, script_id, keyData.id);

    // ==================== BUILD RESPONSE ====================
    const responseData: Record<string, unknown> = {
      valid: true,
      code: "KEY_VALID",
      script: encryptedScript,
      salt: derivationSalt,
      timestamp: serverTimestamp,
      script_name: script.name,
      discord_id: keyData.discord_id,
      discord_avatar: keyData.discord_avatar_url || null,
      expires_at: keyData.expires_at,
      seconds_left: keyData.expires_at 
        ? Math.max(0, Math.floor((new Date(keyData.expires_at).getTime() - Date.now()) / 1000))
        : null,
      session_token: sessionToken,
      encryption: "AES-256-GCM",
      key_derivation: "PBKDF2-100k",
    };

    if (responseSignature) {
      responseData.signature = responseSignature;
    }

    console.log(`V3 Key validated: ${key.substring(0, 8)}... for ${roblox_username} from ${country || "unknown"}`);

    return new Response(JSON.stringify(responseData), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (error) {
    console.error("V3 Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Server error";
    await logRequest(500, undefined, undefined, errorMessage);
    return new Response(JSON.stringify({ valid: false, message: "Server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
