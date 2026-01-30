import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-shadow-sig",
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
    await logRequest(401, "Unauthorized - no executor");
    return new Response("Unauthorized", { status: 401 });
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
    
    const { key, script_id, hwid, roblox_username, roblox_user_id, executor, session_key, timestamp, rng1, rng2 } = body;
    scriptId = script_id;

    console.log(`Key validation request: key=${key?.substring(0,8)}..., script=${script_id}, user=${roblox_username}, IP=${clientIP}`);

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

    // SINGLE QUERY: Fetch script with content and settings
    const { data: script } = await supabase
      .from("scripts")
      .select("id, name, content, discord_webhook_url, discord_webhook_enabled, secure_core_enabled, anti_tamper_enabled, anti_debug_enabled, hwid_lock_enabled, execution_count")
      .eq("id", script_id)
      .single();

    if (!script) {
      return new Response(JSON.stringify({ valid: false, message: "Script not found" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }
    
    // Update execution count on script
    supabase.from("scripts").update({ 
      execution_count: (script.execution_count || 0) + 1,
      last_execution_at: new Date().toISOString()
    }).eq("id", script_id).then(() => {});  // Fire and forget

    // Validate key - include discord_avatar_url
    const { data: keyData } = await supabase
      .from("script_keys")
      .select("*, discord_avatar_url")
      .eq("key_value", key)
      .eq("script_id", script_id)
      .single();

    if (!keyData) {
      await logRequest(401, "Invalid key");
      return new Response(JSON.stringify({ valid: false, message: "Invalid key" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }
    
    // Fetch Discord username if we have discord_id
    let discordUsername: string | null = null;
    if (keyData.discord_id) {
      // We don't have bot token here, so just use the stored info
      discordUsername = keyData.note?.match(/\(([^)]+)\)$/)?.[1] || null;
    }
    
    keyId = keyData.id;

    if (keyData.is_banned) {
      return new Response(JSON.stringify({ valid: false, banned: true, message: "Banned" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    if (keyData.expires_at && new Date(keyData.expires_at) < new Date()) {
      return new Response(JSON.stringify({ valid: false, message: "Expired" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // HWID handling
    const hashedHwid = hwid ? await hashHWID(hwid) : null;
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
          key_id: keyData.id,
          hwid: hashedHwid?.substring(0, 32) || null,
          ip_address: clientIP,
          username: roblox_username,
          executor: executor,
          session_token: sessionToken,
          status: "active",
          is_connected: true,
          metadata: {
            roblox_user_id,
            country,
            loader_version: body.loader_version || "unknown"
          }
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
      roblox_user_id,
      country: country // NOW POPULATED!
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
    const obfuscatedScript = obfuscateLua(script.content, keyData.id);
    
    // Generate salt for client-side key derivation
    const serverTimestamp = Math.floor(Date.now() / 1000);
    const derivationSalt = generateSalt(keyData.id, hwid || "unknown", serverTimestamp);
    
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
    
    const encrypted = xorEncrypt(obfuscatedScript, derivedKey);

    // ==================== RNG TRANSFORMATION (RBLXWHITELIST PATTERN) ====================
    // Transform the RNG values so client can verify with inverse functions
    let transformedRNG1: number | null = null;
    let transformedRNG2: number | null = null;
    
    if (typeof rng1 === "number" && typeof rng2 === "number") {
      transformedRNG1 = transformRNG1(rng1);
      transformedRNG2 = transformRNG2(rng2);
      console.log(`RNG Verification: rng1=${rng1} -> t1=${transformedRNG1}, rng2=${rng2} -> t2=${transformedRNG2}`);
    }

    console.log(`Key validated (v2): ${key.substring(0, 8)}... for ${roblox_username} from ${country || "unknown"}`);
    console.log(`Encrypted script length: ${encrypted.length}, salt: ${derivationSalt.substring(0,16)}..., ts: ${serverTimestamp}`);
    
    await logRequest(200);

    const responseData: Record<string, unknown> = {
      valid: true,
      script: encrypted,
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
      // Session token for heartbeat system
      session_token: sessionToken
    };
    
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
