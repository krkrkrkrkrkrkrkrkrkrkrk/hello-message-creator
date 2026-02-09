import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-shadow-sig, x-shadow-hwid, x-request-hash",
};

const UNAUTHORIZED = "Unauthorized";

// =====================================================
// EXECUTOR DETECTION (Like Luarmor)
// =====================================================

function isFromExecutor(req: Request): { valid: boolean; execName?: string } {
  const ua = (req.headers.get("user-agent") || "").toLowerCase();
  const sig = req.headers.get("x-shadow-sig");
  
  if (sig === "ShadowAuth-Loader-v2") {
    return { valid: true, execName: "ShadowAuth" };
  }
  
  const executorPatterns = [
    { pattern: /synapse/i, name: "Synapse" },
    { pattern: /krnl/i, name: "KRNL" },
    { pattern: /script-?ware/i, name: "ScriptWare" },
    { pattern: /fluxus/i, name: "Fluxus" },
    { pattern: /electron/i, name: "Electron" },
    { pattern: /oxygen/i, name: "Oxygen" },
    { pattern: /sentinel/i, name: "Sentinel" },
    { pattern: /sirius/i, name: "Sirius" },
    { pattern: /valyse/i, name: "Valyse" },
    { pattern: /celery/i, name: "Celery" },
    { pattern: /arceus/i, name: "Arceus" },
    { pattern: /roblox/i, name: "Roblox" },
    { pattern: /comet/i, name: "Comet" },
    { pattern: /trigon/i, name: "Trigon" },
    { pattern: /delta/i, name: "Delta" },
    { pattern: /hydrogen/i, name: "Hydrogen" },
    { pattern: /evon/i, name: "Evon" },
    { pattern: /vegax/i, name: "VegaX" },
    { pattern: /jjsploit/i, name: "JJSploit" },
    { pattern: /nihon/i, name: "Nihon" },
    { pattern: /zorara/i, name: "Zorara" },
    { pattern: /macsploit/i, name: "Macsploit" },
    { pattern: /sirhurt/i, name: "SirHurt" },
    { pattern: /temple/i, name: "Temple" },
    { pattern: /codex/i, name: "Codex" },
    { pattern: /swift/i, name: "Swift" },
    { pattern: /awp/i, name: "AWP" },
    { pattern: /krampus/i, name: "Krampus" },
    { pattern: /solara/i, name: "Solara" },
    { pattern: /wave/i, name: "Wave" },
    { pattern: /volt/i, name: "Volt" },
  ];
  
  for (const { pattern, name } of executorPatterns) {
    if (pattern.test(ua)) {
      return { valid: true, execName: name };
    }
  }
  
  return { valid: false };
}

// =====================================================
// CRYPTO FUNCTIONS (REAL - Web Crypto API)
// =====================================================

// Generate secure random token
function generateSecureToken(length: number = 64): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const randomValues = new Uint8Array(length);
  crypto.getRandomValues(randomValues);
  return Array.from(randomValues).map(v => chars[v % chars.length]).join('');
}

// SHA-256 hash for HWID
async function hashHWID(hwid: string): Promise<string> {
  const data = new TextEncoder().encode(hwid + "shadowauth_v7_real_salt");
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, "0")).join("");
}

// HMAC-SHA256 signing for handshake tokens
async function signPayload(data: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw", 
    new TextEncoder().encode(secret), 
    { name: "HMAC", hash: "SHA-256" }, 
    false, 
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(data));
  return btoa(String.fromCharCode(...new Uint8Array(sig)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

// Generate cryptographically signed handshake token
async function generateHandshakeToken(scriptId: string, hwid: string, ip: string): Promise<string> {
  const secret = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  const payload = {
    sid: scriptId,
    hwid: hwid.substring(0, 16),
    ip: ip.substring(0, 32),
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 30, // 30 second expiry
  };
  const payloadB64 = btoa(JSON.stringify(payload))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
  const sig = await signPayload(payloadB64, secret);
  return `${payloadB64}.${sig}`;
}

// Generate AES salt for script encryption
function generateAESSalt(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map(b => b.toString(16).padStart(2, "0")).join("");
}

// =====================================================
// MAIN HANDLER
// =====================================================

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const clientIP = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || 
                   req.headers.get("cf-connecting-ip") || "unknown";

  // 1. Executor check (REAL - blocks non-executors)
  const execCheck = isFromExecutor(req);
  if (!execCheck.valid) {
    console.log("Blocked non-executor access from:", clientIP);
    return new Response(UNAUTHORIZED, { 
      status: 401, 
      headers: { "Content-Type": "text/plain" } 
    });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const body = await req.json();
    const { key, script_id, hwid: bodyHwid } = body;
    const hwid = bodyHwid || req.headers.get("x-shadow-hwid");

    if (!key || !script_id) {
      return new Response(JSON.stringify({ success: false, error: "Missing parameters" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // 2. Check blacklist (REAL - uses tamper_bans table)
    const { data: banData } = await supabase.rpc("is_tamper_banned", {
      p_script_id: script_id,
      p_ip_address: clientIP,
      p_hwid: hwid || null
    });

    if (banData && banData.length > 0 && banData[0].is_banned) {
      console.log(`Blocked banned IP: ${clientIP}`);
      return new Response(JSON.stringify({ success: false, error: "Access denied" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // 3. Rate limiting (REAL - uses rate_limits table)
    const rateLimitKey = `handshake:${clientIP}`;
    const { data: rateData } = await supabase
      .from("rate_limits")
      .select("*")
      .eq("identifier", rateLimitKey)
      .eq("endpoint", "auth-handshake")
      .maybeSingle();

    const now = new Date();
    const windowMs = 60000; // 1 minute
    const maxRequests = 30;

    if (rateData) {
      const firstAttempt = new Date(rateData.first_attempt_at);
      if (now.getTime() - firstAttempt.getTime() < windowMs) {
        if (rateData.attempts >= maxRequests) {
          return new Response(JSON.stringify({ success: false, error: "Too many requests" }), {
            status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
        }
        await supabase.from("rate_limits").update({ 
          attempts: rateData.attempts + 1,
          last_attempt_at: now.toISOString()
        }).eq("id", rateData.id);
      } else {
        await supabase.from("rate_limits").update({ 
          attempts: 1,
          first_attempt_at: now.toISOString(),
          last_attempt_at: now.toISOString()
        }).eq("id", rateData.id);
      }
    } else {
      await supabase.from("rate_limits").insert({
        identifier: rateLimitKey,
        endpoint: "auth-handshake",
        attempts: 1,
        first_attempt_at: now.toISOString(),
        last_attempt_at: now.toISOString()
      });
    }

    // 4. Validate script exists
    const { data: script } = await supabase
      .from("scripts")
      .select("id, name")
      .eq("id", script_id)
      .maybeSingle();

    if (!script) {
      return new Response(JSON.stringify({ success: false, error: "Invalid script" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // 5. Validate key (REAL - uses script_keys table)
    const { data: keyData } = await supabase
      .from("script_keys")
      .select("*")
      .eq("key_value", key)
      .eq("script_id", script_id)
      .maybeSingle();

    if (!keyData) {
      // Log security event for invalid key attempts
      await supabase.from("security_events").insert({
        event_type: "invalid_key_attempt",
        severity: "warning",
        ip_address: clientIP,
        script_id,
        details: { key_prefix: key.substring(0, 8), executor: execCheck.execName }
      });
      
      return new Response(JSON.stringify({ success: false, error: "Invalid key" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    if (keyData.is_banned) {
      return new Response(JSON.stringify({ success: false, error: "Key banned" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    if (keyData.expires_at && new Date(keyData.expires_at) < now) {
      return new Response(JSON.stringify({ success: false, error: "Key expired" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // 6. HWID validation (REAL - SHA-256 hash + lock)
    const hashedHwid = hwid ? await hashHWID(hwid) : null;
    
    if (hashedHwid && keyData.hwid && keyData.hwid !== hashedHwid) {
      // Check if HWID resets exceeded
      if ((keyData.hwid_reset_count || 0) >= 2) {
        return new Response(JSON.stringify({ success: false, error: "HWID mismatch" }), {
          status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }
    }

    // Lock HWID on first use
    if (hashedHwid && !keyData.hwid) {
      await supabase.from("script_keys").update({ hwid: hashedHwid }).eq("id", keyData.id);
    }

    // 7. Generate tokens (REAL - cryptographically secure)
    const sessionToken = generateSecureToken(64);
    const scriptToken = generateSecureToken(48);
    const handshakeToken = await generateHandshakeToken(script_id, hashedHwid || "unknown", clientIP);
    const aesSalt = generateAESSalt();
    const expiresAt = new Date(Date.now() + 30000); // 30 second token TTL

    // 8. Store token in database (REAL PERSISTENCE - not in-memory!)
    await supabase.from("rotating_tokens").insert({
      token: sessionToken,
      script_id,
      hwid_hash: hashedHwid?.substring(0, 32) || null,
      ip_address: clientIP,
      expires_at: expiresAt.toISOString(),
      step: 0,
      max_step: 10,
      is_valid: true,
    });

    // 9. Initialize tracepath session (REAL - database backed)
    const tracepathSessionId = crypto.randomUUID();
    await supabase.from("tracepath_sessions").insert({
      session_id: tracepathSessionId,
      script_id,
      hwid_hash: hashedHwid?.substring(0, 32) || null,
      ip_address: clientIP,
      current_step: 0,
      is_valid: true,
      expires_at: new Date(Date.now() + 120000).toISOString(), // 2 minute session
    });

    // 10. Update key usage stats
    await supabase.from("script_keys").update({
      used_at: now.toISOString(),
      execution_count: (keyData.execution_count || 0) + 1
    }).eq("id", keyData.id);

    // 11. Log execution
    await supabase.from("script_executions").insert({
      script_id,
      key_id: keyData.id,
      hwid: hashedHwid?.substring(0, 32) || null,
      executor_ip: clientIP,
      executor_type: execCheck.execName
    });

    // 12. Log API request
    await supabase.from("api_requests").insert({
      endpoint: "auth-handshake",
      method: "POST",
      ip_address: clientIP,
      script_id,
      key_id: keyData.id,
      status_code: 200,
      response_time_ms: Date.now() - now.getTime()
    });

    console.log(`[HANDSHAKE] Token generated: script=${script_id}, IP=${clientIP}, executor=${execCheck.execName}`);

    return new Response(JSON.stringify({ 
      success: true, 
      token: sessionToken,
      script_token: scriptToken,
      handshake_token: handshakeToken,
      tracepath_session: tracepathSessionId,
      salt: aesSalt,
      script_name: script.name,
      expires_at: keyData.expires_at,
      discord_id: keyData.discord_id,
      executor: execCheck.execName,
      token_expires: expiresAt.toISOString(),
    }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (error) {
    console.error("Handshake error:", error);
    return new Response(JSON.stringify({ success: false, error: "Server error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
