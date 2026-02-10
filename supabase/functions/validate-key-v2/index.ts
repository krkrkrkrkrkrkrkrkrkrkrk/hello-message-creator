import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.2";
import { 
  createBinaryStream, 
  uint8ArrayToBase64, 
  calculateChecksum 
} from "../_shared/binary-stream.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-shadow-sig, x-delivery-mode",
  "Cache-Control": "no-store",
};

// ==================== IP GEOLOCATION ====================
// Using ip-api.com free tier (no API key needed, 45 requests/minute limit)
async function getCountryFromIP(ip: string): Promise<string | null> {
  // Skip for localhost/private IPs
  if (ip === "unknown" || ip === "127.0.0.1" || ip.startsWith("192.168.") || ip.startsWith("10.")) {
    return null;
  }
  
  try {
    const response = await fetch(`http://ip-api.com/json/${ip}?fields=status,country,countryCode`, {
      signal: AbortSignal.timeout(3000) // 3 second timeout
    });
    
    if (response.ok) {
      const data = await response.json();
      if (data.status === "success" && data.country) {
        return data.country;
      }
    }
  } catch (e) {
    console.log("IP geolocation failed:", e);
  }
  
  return null;
}

// ==================== SECURITY FUNCTIONS ====================

function isExecutor(ua: string): boolean {
  const patterns = [/synapse/i, /krnl/i, /fluxus/i, /electron/i, /oxygen/i, /sentinel/i, 
    /celery/i, /arceus/i, /roblox/i, /comet/i, /trigon/i, /delta/i, /hydrogen/i, 
    /evon/i, /vegax/i, /jjsploit/i, /nihon/i, /zorara/i, /solara/i, /wave/i, /script-?ware/i, /volt/i];
  return patterns.some(p => p.test(ua));
}

function encStr(str: string, key: number): number[] {
  const nums: number[] = [];
  for (let i = 0; i < str.length; i++) {
    nums.push(str.charCodeAt(i) ^ ((key + i * 7) % 256));
  }
  return nums;
}

function obfuscateLua(code: string, keyId: string): string {
  const seed = Date.now() % 100000;
  const wmData = encStr(`WM:${keyId}:${Date.now()}`, seed);
  const watermark = `--[[${wmData.join(",")}]]`;
  
  // Return code with watermark only, no wrapper to avoid environment isolation issues
  return `${watermark}
${code}`;
}

function xorEncrypt(data: string, key: string): string {
  const encoder = new TextEncoder();
  const dataBytes = encoder.encode(data);
  const result = new Uint8Array(dataBytes.length);
  
  for (let i = 0; i < dataBytes.length; i++) {
    const keyByte = key.charCodeAt(i % key.length);
    const posByte = (i * 7 + 13) % 256;
    result[i] = dataBytes[i] ^ keyByte ^ posByte;
  }
  
  // Convert to base64 properly
  let binary = '';
  for (let i = 0; i < result.length; i++) {
    binary += String.fromCharCode(result[i]);
  }
  return btoa(binary);
}

function generateSalt(keyId: string, hwid: string, timestamp: number): string {
  const combined = `${keyId}:${hwid}:${timestamp}:shadowauth_v3`;
  let hash = 0;
  for (let i = 0; i < combined.length; i++) {
    hash = ((hash << 5) - hash) + combined.charCodeAt(i);
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36) + crypto.randomUUID().replace(/-/g, '').substring(0, 16);
}

async function hashHWID(hwid: string): Promise<string> {
  const data = new TextEncoder().encode(hwid + "shadowauth_v7");
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, "0")).join("");
}

// ==================== RNG TRANSFORMATION FUNCTIONS (RBLXWHITELIST PATTERN) ====================
// These must match the client's inverse functions
// f1(x) = 2x - 32 → Client inverse: f1^-1(y) = (y + 32) / 2
// f2(x) = 5x + 256 → Client inverse: f2^-1(y) = (y - 256) / 5
function transformRNG1(value: number): number {
  return (value * 2) - 32;
}

function transformRNG2(value: number): number {
  return (value * 5) + 256;
}

// Float detection - if math.random() was hooked to return integer, this detects it
function isFloat(value: number): boolean {
  return value % 1 !== 0;
}

const rateLimit = new Map<string, number>();

serve(async (req) => {
  const startTime = Date.now();
  let statusCode = 200;
  let scriptId: string | null = null;
  let keyId: string | null = null;
  
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );
  
  const clientIP = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || 
                   req.headers.get("cf-connecting-ip") || "unknown";
  const ua = req.headers.get("user-agent") || "";

  // Log request helper
  const logRequest = async (status: number, errorMsg?: string) => {
    try {
      await supabase.from("api_requests").insert({
        endpoint: "validate-key-v2",
        method: req.method,
        ip_address: clientIP,
        user_agent: ua?.substring(0, 255),
        script_id: scriptId,
        key_id: keyId,
        status_code: status,
        response_time_ms: Date.now() - startTime,
        error_message: errorMsg?.substring(0, 500)
      });
    } catch (e) {
      console.error("Failed to log request:", e);
    }
  };

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const sig = req.headers.get("x-shadow-sig");
  
  if (!sig && !isExecutor(ua)) {
    await logRequest(401, "Unauthorized - incompatible executor");
    return new Response(JSON.stringify({ valid: false, message: "Executor is incompatible. Use Volt or Wave." }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (req.method !== "POST") {
    await logRequest(405, "Method not allowed");
    return new Response(JSON.stringify({ valid: false }), { 
      status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } 
    });
  }

  try {
    const body = await req.json();
    console.log("Received request body:", JSON.stringify(body).substring(0, 200));
    
    const { key, script_id, hwid, roblox_username, roblox_user_id, executor, session_key, timestamp, rng1, rng2, delivery_mode } = body;
    scriptId = script_id;
    
    // Check delivery mode preference
    const useBinaryDelivery = delivery_mode === "binary" || req.headers.get("x-delivery-mode") === "binary";

    console.log(`Key validation request: key=${key?.substring(0,8)}..., script=${script_id}, user=${roblox_username}, IP=${clientIP}, binary=${useBinaryDelivery}`);

    if (!key || !script_id) {
      console.log("Missing parameters - key:", !!key, "script_id:", !!script_id);
      await logRequest(400, "Missing parameters");
      return new Response(JSON.stringify({ valid: false, message: "Missing parameters" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Rate limiting
    const rlKey = `${clientIP}:${key}`;
    const now = Date.now();
    const lastReq = rateLimit.get(rlKey) || 0;
    if (now - lastReq < 2000) {
      return new Response(JSON.stringify({ valid: false, message: "Too fast" }), {
        status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }
    rateLimit.set(rlKey, now);

    // ==================== IP GEOLOCATION (ASYNC) ====================
    // Start geolocation lookup early, don't await yet
    const countryPromise = getCountryFromIP(clientIP);

    // ==================== RNG TAMPERING DETECTION (RBLXWHITELIST PATTERN) ====================
    // If rng1 was sent, check if it contains a float component
    // math.random() returns float, if hooked to return int we detect manipulation
    let rngTamper = false;
    if (typeof rng1 === "number" && rng1 > 0) {
      // rng1 should contain a float component from math.random()
      // If it's a clean integer, the RNG was likely hooked
      if (!isFloat(rng1)) {
        console.log(`RNG TAMPERING DETECTED: rng1=${rng1} is not a float`);
        rngTamper = true;
      }
    }

    // SINGLE QUERY: Fetch script with content and settings INCLUDING Luarmor modes
    const { data: script, error: scriptError } = await supabase
      .from("scripts")
      .select("id, name, content, discord_webhook_url, discord_webhook_enabled, secure_core_enabled, anti_tamper_enabled, anti_debug_enabled, hwid_lock_enabled, execution_count, ffa_mode, silent_mode, heartbeat_enabled, lightning_mode")
      .eq("id", script_id)
      .single();

    if (scriptError) {
      console.error("Script fetch error:", scriptError);
    }

    if (!script) {
      return new Response(JSON.stringify({ valid: false, message: "Script not found" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }
    
    // Update execution count on script
    supabase.from("scripts").update({ 
      execution_count: (script.execution_count || 0) + 1
    }).eq("id", script_id).then(() => {});  // Fire and forget

    // ==================== FFA MODE (LUARMOR) ====================
    // If FFA mode is enabled, skip key validation entirely
    interface KeyDataType {
      id: string | null;
      key_value: string;
      hwid: string | null;
      discord_id: string | null;
      discord_avatar_url: string | null;
      expires_at: string | null;
      is_banned: boolean;
      execution_count: number;
      note: string | null;
      key_days: number | null;
      activated_at: string | null;
      ban_expire: string | null;
      ban_reason: string | null;
      hwid_reset_count: number;
      status: string | null;
      unban_token: string | null;
      total_resets: number;
      last_reset: string | null;
    }
    
    let keyData: KeyDataType;
    let discordUsername: string | null = null;
    
    if (false) { // ffa_mode not yet implemented
      console.log(`FFA mode enabled for script ${script_id} - skipping key validation`);
      // Create fake key data for FFA mode
      keyData = {
        id: null,
        key_value: "FFA_MODE",
        hwid: null,
        discord_id: null,
        discord_avatar_url: null,
        expires_at: null,
        is_banned: false,
        execution_count: 0,
        note: null,
        key_days: null,
        activated_at: null,
        ban_expire: null,
        ban_reason: null,
        hwid_reset_count: 0,
        status: null,
        unban_token: null,
        total_resets: 0,
        last_reset: null
      };
    } else {
      // Validate key - include all Luarmor fields
      const { data: fetchedKey } = await supabase
        .from("script_keys")
        .select("*")
        .eq("key_value", key)
        .eq("script_id", script_id)
        .single();

      if (!fetchedKey) {
        await logRequest(401, "Invalid key");
        return new Response(JSON.stringify({ valid: false, message: "Invalid key" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }
      
      keyData = fetchedKey as KeyDataType;
      
      // Fetch Discord username if we have discord_id
      if (keyData.discord_id) {
        discordUsername = keyData.note?.match(/\(([^)]+)\)$/)?.[1] || null;
      }
    }
    
    keyId = keyData.id;

    // ==================== BAN CHECKS (LUARMOR) ====================
    if (keyData.is_banned) {
      // Check if ban has expired (Luarmor temporary ban feature)
      if (keyData.ban_expire && new Date(keyData.ban_expire) < new Date()) {
        // Ban expired - auto-unban
        if (keyData.id) {
          await supabase.from("script_keys").update({
            is_banned: false,
            status: keyData.hwid ? "active" : "reset",
            ban_reason: null,
            ban_expire: null,
            unban_token: null
          }).eq("id", keyData.id);
          console.log(`Auto-unbanned key ${keyData.id} - ban expired`);
        }
      } else {
        return new Response(JSON.stringify({ 
          valid: false, 
          banned: true, 
          message: keyData.ban_reason || "Banned",
          ban_expire: keyData.ban_expire
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }
    }

    // ==================== KEY_DAYS ACTIVATION (LUARMOR) ====================
    // If key has key_days but no activated_at, this is first use - activate it
    if (keyData.key_days && !keyData.activated_at && keyData.id) {
      const activationResult = await supabase.rpc("activate_key_on_first_use", {
        p_key_id: keyData.id
      });
      if (activationResult.data?.expires_at) {
        keyData.expires_at = activationResult.data.expires_at;
        keyData.activated_at = activationResult.data.activated_at;
        console.log(`Key activated with key_days: ${keyData.key_days} days, expires: ${keyData.expires_at}`);
      }
    }

    if (keyData.expires_at && new Date(keyData.expires_at) < new Date()) {
      return new Response(JSON.stringify({ valid: false, message: "Expired" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // HWID handling (skip for FFA mode)
    const hashedHwid = hwid ? await hashHWID(hwid) : null;
    if (keyData.id) {
      if (hashedHwid && keyData.hwid && keyData.hwid !== hashedHwid) {
        if ((keyData.hwid_reset_count || 0) >= 2) {
          return new Response(JSON.stringify({ valid: false, message: "HWID mismatch" }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
        }
        await supabase.from("script_keys").update({ 
          hwid: hashedHwid, 
          hwid_reset_count: (keyData.hwid_reset_count || 0) + 1 
        }).eq("id", keyData.id);
      } else if (hashedHwid && !keyData.hwid) {
        await supabase.from("script_keys").update({ hwid: hashedHwid }).eq("id", keyData.id);
      }

      // Update execution stats
      await supabase.from("script_keys").update({ 
        execution_count: (keyData.execution_count || 0) + 1,
        used_at: new Date().toISOString()
      }).eq("id", keyData.id);
    }

    // ==================== GET COUNTRY FROM IP (AWAIT RESULT) ====================
    const country = await countryPromise;
    console.log(`IP ${clientIP} -> Country: ${country || "unknown"}`);

    // ==================== CREATE/UPDATE WEBSOCKET SESSION (PANDAAUTH PATTERN) ====================
    // Register the session for real-time Active Sessions monitoring
    const sessionToken = crypto.randomUUID();
    
    try {
      // Check if there's an existing session for this HWID+Script combo
      const { data: existingSession } = await supabase
        .from("websocket_sessions")
        .select("id")
        .eq("script_id", script_id)
        .eq("hwid", hashedHwid?.substring(0, 32) || "unknown")
        .eq("is_connected", true)
        .maybeSingle();
      
      if (existingSession) {
        // Update existing session
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
        // Create new session
        await supabase.from("websocket_sessions").insert({
          script_id,
          hwid: hashedHwid?.substring(0, 32) || null,
          ip_address: clientIP,
          username: roblox_username,
          executor: executor,
          status: "active",
          is_connected: true,
        });
      }
      console.log(`Session registered for ${roblox_username} (${clientIP})`);
    } catch (sessionErr) {
      console.error("Failed to create session:", sessionErr);
      // Don't fail the request if session creation fails
    }

    // Log execution WITH COUNTRY
    await supabase.from("script_executions").insert({
      script_id,
      key_id: keyData.id, 
      hwid: hashedHwid?.substring(0, 32),
      executor_ip: clientIP, 
      executor_type: executor, 
      roblox_username,
      country: country || null
    });

    // ==================== DISCORD WEBHOOK (PANDAAUTH PATTERN) ====================
    // Send webhook notification if enabled (fire and forget)
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
          hwid: hashedHwid?.substring(0, 16),
          key: key,
          executor: executor,
          ip_address: clientIP,
          country: country,
          expires_at: keyData.expires_at,
          success: true
        })
      }).catch(e => console.log("Webhook fire-and-forget error:", e));
    }

    // Obfuscate with watermark
    const keyIdForWatermark = keyData.id || crypto.randomUUID();
    const obfuscatedScript = obfuscateLua(script.content, keyIdForWatermark);
    
    // Generate salt for client-side key derivation
    const serverTimestamp = Math.floor(Date.now() / 1000);
    const derivationSalt = generateSalt(keyIdForWatermark, hwid || "unknown", serverTimestamp);
    
    // Derive encryption key
    const derivedKeySource = `${derivationSalt}${hwid || "unknown"}${session_key || ""}${serverTimestamp}`;
    let derivedHash = 0;
    for (let i = 0; i < derivedKeySource.length; i++) {
      derivedHash = ((derivedHash * 31) ^ derivedKeySource.charCodeAt(i)) >>> 0;
      derivedHash = derivedHash % 2147483647;
    }
    
    let derivedKey = "";
    let seed = derivedHash;
    for (let i = 0; i < 32; i++) {
      seed = ((seed * 1103515245 + 12345) ^ seed) >>> 0;
      derivedKey += String.fromCharCode((seed % 95) + 32);
    }
    
    // ==================== BINARY STREAM DELIVERY ====================
    let encrypted: string;
    let binaryPayload: string | null = null;
    let binaryChecksum: number | null = null;
    
    if (useBinaryDelivery) {
      // Binary stream mode (Luarmor-identical)
      const binaryStream = createBinaryStream(obfuscatedScript, derivedKey, derivationSalt);
      binaryPayload = uint8ArrayToBase64(binaryStream);
      binaryChecksum = calculateChecksum(new TextEncoder().encode(obfuscatedScript));
      encrypted = ""; // Not used in binary mode
      console.log(`Binary stream: ${binaryStream.length} bytes, checksum: ${binaryChecksum}`);
    } else {
      // Legacy XOR mode
      encrypted = xorEncrypt(obfuscatedScript, derivedKey);
    }
    
    // ==================== RNG TRANSFORMATION (RBLXWHITELIST PATTERN) ====================
    let transformedRNG1: number | null = null;
    let transformedRNG2: number | null = null;
    
    if (typeof rng1 === "number" && typeof rng2 === "number") {
      transformedRNG1 = transformRNG1(rng1);
      transformedRNG2 = transformRNG2(rng2);
      console.log(`RNG Verification: rng1=${rng1} -> t1=${transformedRNG1}, rng2=${rng2} -> t2=${transformedRNG2}`);
    }

    console.log(`Key validated (v2): ${key.substring(0, 8)}... for ${roblox_username} from ${country || "unknown"}`);
    
    await logRequest(200);

    // Build response based on delivery mode
    const responseData: Record<string, unknown> = {
      valid: true,
      salt: derivationSalt,
      timestamp: serverTimestamp,
      script_name: script.name,
      discord_id: keyData.discord_id,
      discord_avatar: keyData.discord_avatar_url || null,
      discord_username: discordUsername,
      expires_at: keyData.expires_at,
      seconds_left: keyData.expires_at 
        ? Math.max(0, Math.floor((new Date(keyData.expires_at).getTime() - Date.now()) / 1000))
        : null,
      session_token: sessionToken
    };
    
    // Add script payload based on delivery mode
    if (useBinaryDelivery && binaryPayload) {
      responseData.binary_stream = binaryPayload;
      responseData.binary_checksum = binaryChecksum;
      responseData.delivery_mode = "binary";
    } else {
      responseData.script = encrypted;
      responseData.delivery_mode = "xor";
    }
    
    // Add RNG transformation results for client verification
    if (transformedRNG1 !== null && transformedRNG2 !== null) {
      responseData.t1 = transformedRNG1;
      responseData.t2 = transformedRNG2;
    }
    
    // Add RNG tampering flag
    if (rngTamper) {
      responseData.rng_tamper = true;
    }
    
    console.log("Response fields:", Object.keys(responseData).join(", "));
    
    return new Response(JSON.stringify(responseData), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (error: unknown) {
    console.error("Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Server error";
    await logRequest(500, errorMessage);
    return new Response(JSON.stringify({ valid: false, message: "Server error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
