import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-shadow-sig, x-handshake, x-session-key, x-timestamp, x-nonce",
  "Cache-Control": "no-store",
};

// ==================== SIMPLE OBFUSCATOR ====================

// XOR encode for watermark
function encStr(str: string, key: number): number[] {
  const nums: number[] = [];
  for (let i = 0; i < str.length; i++) {
    nums.push(str.charCodeAt(i) ^ ((key + i * 7) % 256));
  }
  return nums;
}

// Obfuscate Lua code with watermark
function obfuscateLua(code: string, keyId: string): string {
  const seed = Date.now() % 100000;
  
  // Watermark encoded in comment
  const wmData = encStr(`WM:${keyId}:${Date.now()}`, seed);
  const watermark = `--[[${wmData.join(",")}]]`;
  
  // Wrap in protected call
  const wrapped = `${watermark}
local _ok,_err=pcall(function()
${code}
end)
if not _ok then warn("[SA]",_err)end`;
  
  return wrapped;
}

// ==================== SECURITY FUNCTIONS ====================

function isExecutor(ua: string): boolean {
  const patterns = [/synapse/i, /krnl/i, /fluxus/i, /electron/i, /oxygen/i, /sentinel/i, 
    /celery/i, /arceus/i, /roblox/i, /comet/i, /trigon/i, /delta/i, /hydrogen/i, 
    /evon/i, /vegax/i, /jjsploit/i, /nihon/i, /zorara/i, /solara/i, /wave/i, /script-?ware/i];
  return patterns.some(p => p.test(ua));
}

async function signPayload(data: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), 
    { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(data));
  return btoa(String.fromCharCode(...new Uint8Array(sig))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

async function verifyHandshake(token: string, scriptId: string): Promise<boolean> {
  if (!token) return false;
  const secret = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return false;
  
  try {
    const expected = await signPayload(payload, secret);
    if (sig !== expected) return false;
    
    const decoded = JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/")));
    if (decoded.sid !== scriptId) return false;
    if (Math.floor(Date.now() / 1000) - decoded.iat > 60) return false;
    return true;
  } catch { return false; }
}

// Advanced encryption with derived key support
function xorEncrypt(data: string, key: string): string {
  const result: number[] = [];
  for (let i = 0; i < data.length; i++) {
    // Multi-layer XOR with position-based transformation
    const keyByte = key.charCodeAt(i % key.length);
    const posByte = (i * 7 + 13) % 256;
    result.push(data.charCodeAt(i) ^ keyByte ^ posByte);
  }
  return btoa(String.fromCharCode(...result));
}

// Generate a unique salt for key derivation (sent to client for HWID-based key derivation)
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
  
  const clientIP = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const ua = req.headers.get("user-agent") || "";

  // Log request helper
  const logRequest = async (status: number, errorMsg?: string) => {
    try {
      await supabase.from("api_requests").insert({
        endpoint: "validate-key",
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
    const { key, script_id, hwid, handshake_token, roblox_username, roblox_user_id, executor, session_key, timestamp, nonce } = body;
    scriptId = script_id;

    if (!key || !script_id) {
      await logRequest(400, "Missing parameters");
      return new Response(JSON.stringify({ valid: false, message: "Missing parameters" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const hsToken = req.headers.get("x-handshake") || handshake_token;
    if (!await verifyHandshake(hsToken, script_id)) {
      return new Response(JSON.stringify({ valid: false, message: "Invalid loader" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const rlKey = `${clientIP}:${key}`;
    const now = Date.now();
    const lastReq = rateLimit.get(rlKey) || 0;
    if (now - lastReq < 2000) {
      return new Response(JSON.stringify({ valid: false, message: "Too fast" }), {
        status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }
    rateLimit.set(rlKey, now);

    const { data: script } = await supabase
      .from("scripts")
      .select("id, name, content")
      .eq("id", script_id)
      .single();

    if (!script) {
      return new Response(JSON.stringify({ valid: false, message: "Script not found" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const { data: keyData } = await supabase
      .from("script_keys")
      .select("*")
      .eq("key_value", key)
      .eq("script_id", script_id)
      .single();

    if (!keyData) {
      await logRequest(401, "Invalid key");
      return new Response(JSON.stringify({ valid: false, message: "Invalid key" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
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

    await supabase.from("script_keys").update({ 
      execution_count: (keyData.execution_count || 0) + 1,
      used_at: new Date().toISOString()
    }).eq("id", keyData.id);

    await supabase.from("script_executions").insert({
      script_id, key_id: keyData.id, hwid: hashedHwid?.substring(0, 32),
      executor_ip: clientIP, executor_type: executor, roblox_username, roblox_user_id
    });

    // Obfuscate with watermark (keyData.id identifies the leaker)
    const obfuscatedScript = obfuscateLua(script.content, keyData.id);
    
    // Generate salt for client-side key derivation (HWID-based)
    const derivationSalt = generateSalt(keyData.id, hwid || "unknown", timestamp || Date.now());
    
    // Derive the actual encryption key from salt + hwid + session
    // This key is NEVER sent - client must derive it the same way
    const derivedKeySource = `${derivationSalt}${hwid || "unknown"}${session_key || ""}${timestamp || Date.now()}`;
    let derivedHash = 0;
    for (let i = 0; i < derivedKeySource.length; i++) {
      derivedHash = ((derivedHash * 31) ^ derivedKeySource.charCodeAt(i)) >>> 0;
      derivedHash = derivedHash % 2147483647;
    }
    
    // Generate 32-char key from hash seed
    let derivedKey = "";
    let seed = derivedHash;
    for (let i = 0; i < 32; i++) {
      seed = ((seed * 1103515245 + 12345) ^ seed) >>> 0;
      derivedKey += String.fromCharCode((seed % 95) + 32);
    }
    
    const encrypted = xorEncrypt(obfuscatedScript, derivedKey);

    console.log(`Key validated: ${key.substring(0, 8)}... for ${roblox_username} [Protected v3]`);
    
    // Log successful request
    await logRequest(200);

    return new Response(JSON.stringify({
      valid: true,
      script: encrypted,
      salt: derivationSalt, // Client uses this + HWID to derive the same key
      script_name: script.name,
      discord_id: keyData.discord_id,
      expires_at: keyData.expires_at,
      seconds_left: keyData.expires_at 
        ? Math.max(0, Math.floor((new Date(keyData.expires_at).getTime() - Date.now()) / 1000))
        : null
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (error: any) {
    console.error("Error:", error);
    await logRequest(500, error?.message || "Server error");
    return new Response(JSON.stringify({ valid: false, message: "Server error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
