import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.2";
import {
  isBlacklisted,
  addToBlacklist,
  checkTracepath,
  advanceTracepath,
  initTracepath,
  clearTracepath,
  generateSessionToken,
  validateSessionToken,
  rotateSessionToken,
  getSessionData,
  deleteSession,
  validateRequestHash,
  generateRequestHash,
  verifyRequestHash,
  setWebsocketToken,
  getWebsocketToken,
  validateWebsocketToken,
  clearWebsocketToken,
  generateFlag,
  hashString,
  cleanupExpiredSessions
} from "./security.ts";
import {
  sha256,
  hmacSign,
  hmacVerify,
  randomToken,
  xorEncrypt,
  generateDerivationSalt,
  deriveEncryptionKey,
  hashHWID,
  obfuscateLua,
  createWatermark
} from "./crypto.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-shadow-sig, x-handshake, x-session-key, x-timestamp, x-nonce, x-request-hash, x-websocket-id",
  "Cache-Control": "no-store",
};

// ==================== EXECUTOR DETECTION ====================

function isExecutor(ua: string): boolean {
  const patterns = [/synapse/i, /krnl/i, /fluxus/i, /electron/i, /oxygen/i, /sentinel/i, 
    /celery/i, /arceus/i, /roblox/i, /comet/i, /trigon/i, /delta/i, /hydrogen/i, 
    /evon/i, /vegax/i, /jjsploit/i, /nihon/i, /zorara/i, /solara/i, /wave/i, /script-?ware/i,
    /sirius/i, /valyse/i, /codex/i, /swift/i, /awp/i, /krampus/i, /macsploit/i, /sirhurt/i,
    /temple/i];
  return patterns.some(p => p.test(ua));
}

function getExploitName(ua: string): string {
  const lower = ua.toLowerCase();
  if (lower.includes('sx') || lower.includes('synx')) return 'Synapse';
  if (lower.includes('script-ware') || lower.includes('scriptware')) return 'ScriptWare';
  if (lower.includes('fluxus')) return 'Fluxus';
  if (lower.includes('krnl')) return 'KRNL';
  if (lower.includes('delta')) return 'Delta';
  if (lower.includes('hydrogen')) return 'Hydrogen';
  if (lower.includes('solara')) return 'Solara';
  if (lower.includes('wave')) return 'Wave';
  return 'Unknown';
}

// ==================== HANDSHAKE VERIFICATION ====================

async function verifyHandshake(token: string, scriptId: string): Promise<boolean> {
  if (!token) return false;
  const secret = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  const parts = token.split(".");
  if (parts.length !== 2) return false;
  
  const [payload, sig] = parts;
  
  try {
    const isValid = await hmacVerify(payload, sig, secret);
    if (!isValid) return false;
    
    const decoded = JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/")));
    if (decoded.sid !== scriptId) return false;
    if (Math.floor(Date.now() / 1000) - decoded.iat > 60) return false;
    return true;
  } catch { 
    return false; 
  }
}

// ==================== RATE LIMITING ====================

const rateLimit = new Map<string, { count: number; lastReset: number }>();

function checkRateLimit(key: string, maxRequests: number = 60, windowMs: number = 60000): boolean {
  const now = Date.now();
  const data = rateLimit.get(key) || { count: 0, lastReset: now };
  
  if (now - data.lastReset > windowMs) {
    data.count = 0;
    data.lastReset = now;
  }
  
  data.count++;
  rateLimit.set(key, data);
  
  return data.count <= maxRequests;
}

// ==================== MAIN HANDLER ====================

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

  // ==================== SECURITY CHECKS ====================
  
  // 1. Check instant blacklist (in-memory, no DB query)
  if (isBlacklisted(clientIP)) {
    await logRequest(403, "Blacklisted");
    return new Response(JSON.stringify({ valid: false, message: "Access denied" }), {
      status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }

  const sig = req.headers.get("x-shadow-sig");
  
  // 2. Executor check
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
    const { 
      key, 
      script_id, 
      hwid, 
      handshake_token, 
      roblox_username, 
      roblox_user_id, 
      executor, 
      session_key, 
      timestamp, 
      nonce,
      request_hash,      // NEW: LuaShield-style request hash
      websocket_id,      // NEW: WebSocket session token
      tracepath_step     // NEW: Current tracepath step
    } = body;
    
    scriptId = script_id;

    if (!key || !script_id) {
      await logRequest(400, "Missing parameters");
      return new Response(JSON.stringify({ valid: false, message: "Missing parameters" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // 3. Rate limiting (per IP:key combination)
    const rlKey = `${clientIP}:${key}`;
    if (!checkRateLimit(rlKey, 30, 60000)) {
      await logRequest(429, "Rate limited");
      return new Response(JSON.stringify({ valid: false, message: "Too fast" }), {
        status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // 4. Handshake verification
    const hsToken = req.headers.get("x-handshake") || handshake_token;
    if (!await verifyHandshake(hsToken, script_id)) {
      addToBlacklist(clientIP); // Blacklist on invalid handshake
      await logRequest(403, "Invalid handshake");
      return new Response(JSON.stringify({ valid: false, message: "Invalid loader" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // 5. Request hash validation (anti-replay)
    if (request_hash && nonce && timestamp) {
      if (!verifyRequestHash(request_hash, key, script_id, hwid || '', timestamp, nonce)) {
        addToBlacklist(clientIP);
        await logRequest(403, "Invalid request hash");
        return new Response(JSON.stringify({ valid: false, message: "Security check failed" }), {
          status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }
      
      if (!validateRequestHash(request_hash)) {
        await logRequest(403, "Replay attack detected");
        return new Response(JSON.stringify({ valid: false, message: "Replay detected" }), {
          status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }
    }

    // 6. WebSocket token validation (if provided)
    if (websocket_id) {
      const storedWsToken = getWebsocketToken(clientIP);
      if (storedWsToken && websocket_id !== storedWsToken) {
        addToBlacklist(clientIP);
        await logRequest(403, "Invalid WebSocket token");
        return new Response(JSON.stringify({ valid: false, message: "Session mismatch" }), {
          status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }
    }

    // 7. Tracepath validation (if hwid provided)
    if (hwid && tracepath_step) {
      if (!checkTracepath(hwid, tracepath_step)) {
        await logRequest(403, "Invalid tracepath");
        return new Response(JSON.stringify({ valid: false, message: "Sequence error" }), {
          status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }
    }

    // ==================== DATABASE QUERIES ====================

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

    // ==================== HWID VALIDATION ====================

    const hashedHwid = hwid ? await hashHWID(hwid) : null;
    
    if (hashedHwid && keyData.hwid && keyData.hwid !== hashedHwid) {
      // HWID mismatch - check reset count
      if ((keyData.hwid_reset_count || 0) >= 2) {
        return new Response(JSON.stringify({ valid: false, message: "HWID mismatch" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }
      // Auto-reset with increment
      await supabase.from("script_keys").update({ 
        hwid: hashedHwid, 
        hwid_reset_count: (keyData.hwid_reset_count || 0) + 1 
      }).eq("id", keyData.id);
    } else if (hashedHwid && !keyData.hwid) {
      // First use - lock HWID
      await supabase.from("script_keys").update({ hwid: hashedHwid }).eq("id", keyData.id);
    }

    // ==================== UPDATE STATS ====================

    await supabase.from("script_keys").update({ 
      execution_count: (keyData.execution_count || 0) + 1,
      used_at: new Date().toISOString()
    }).eq("id", keyData.id);

    await supabase.from("script_executions").insert({
      script_id, 
      key_id: keyData.id, 
      hwid: hashedHwid?.substring(0, 32),
      executor_ip: clientIP, 
      executor_type: executor || getExploitName(ua), 
      roblox_username, 
      roblox_user_id
    });

    // ==================== GENERATE PROTECTED RESPONSE ====================

    // Generate session tokens (LuaShield-style)
    const { token: jsxToken, webhookToken } = generateSessionToken(clientIP, script_id, hwid || '');
    
    // Set websocket token for future validation
    const wsToken = randomToken(32);
    setWebsocketToken(clientIP, wsToken);
    
    // Initialize tracepath for this HWID
    if (hwid) {
      initTracepath(hwid);
      advanceTracepath(hwid, 'validate');
    }
    
    // Generate flag for anti-tamper
    const flag = generateFlag();

    // Obfuscate script with watermark (keyId identifies the leaker)
    const obfuscatedScript = obfuscateLua(script.content, keyData.id);
    
    // Generate salt for client-side key derivation (HWID-based)
    const derivationSalt = generateDerivationSalt(keyData.id, hwid || "unknown", timestamp || Date.now());
    
    // Derive the actual encryption key (client must derive it the same way)
    const derivedKey = deriveEncryptionKey(derivationSalt, hwid || "unknown", session_key || "", timestamp || Date.now());
    
    // Encrypt the script
    const encrypted = xorEncrypt(obfuscatedScript, derivedKey);

    console.log(`Key validated: ${key.substring(0, 8)}... for ${roblox_username} [Protected v4 + LuaShield]`);
    
    // Log successful request
    await logRequest(200);

    // ==================== LUASHIELD-STYLE RESPONSE ====================
    
    return new Response(JSON.stringify({
      valid: true,
      script: encrypted,
      salt: derivationSalt,
      script_name: script.name,
      discord_id: keyData.discord_id,
      expires_at: keyData.expires_at,
      seconds_left: keyData.expires_at 
        ? Math.max(0, Math.floor((new Date(keyData.expires_at).getTime() - Date.now()) / 1000))
        : null,
      // LuaShield-style security tokens
      jsx_token: jsxToken,
      webhook_token: webhookToken,
      websocket_id: wsToken,
      flag: {
        fingerprint: flag.fingerprint,
        number_id: flag.numberId,
        req_id: flag.reqId
      },
      // Metadata
      execution_count: (keyData.execution_count || 0) + 1,
      hwid_locked: !!keyData.hwid,
      exploit: executor || getExploitName(ua)
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (error: any) {
    console.error("Error:", error);
    await logRequest(500, error?.message || "Server error");
    return new Response(JSON.stringify({ valid: false, message: "Server error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});

// Cleanup expired sessions periodically
setInterval(cleanupExpiredSessions, 5000);
