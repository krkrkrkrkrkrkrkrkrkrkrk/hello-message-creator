/**
 * SHADOWAUTH - SERVER-SIDE SECURITY (100% Server Decisions)
 * ===========================================================
 * The client ONLY reports raw data. The SERVER decides everything.
 * 
 * Architecture:
 * - Client sends: IP, HWID, executor name, detected threats (raw data)
 * - Server verifies: IP from headers (trusted), patterns from DB
 * - Server decides: Ban, warning, allow based on SERVER-SIDE analysis
 * 
 * NEVER trust client-reported data for security decisions!
 */

import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.49.2";

// =====================================================
// SUPABASE CLIENT
// =====================================================

function getSupabase(): SupabaseClient {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );
}

// =====================================================
// SERVER-VERIFIED DATA EXTRACTION
// =====================================================

/**
 * Extract TRUSTED data from request (server-side verification)
 * This data comes from the network layer, NOT from client payload
 */
export function extractVerifiedData(req: Request): {
  verifiedIP: string;
  userAgent: string;
  requestFingerprint: string;
  timestamp: number;
} {
  // IP from reverse proxy/CDN headers (TRUSTED)
  const verifiedIP = 
    req.headers.get("cf-connecting-ip") ||  // Cloudflare
    req.headers.get("x-real-ip") ||         // Nginx
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || 
    "unknown";
  
  const userAgent = req.headers.get("user-agent") || "";
  
  // Create fingerprint from request characteristics
  const fingerprintData = [
    userAgent.substring(0, 100),
    req.headers.get("accept-language") || "",
    req.headers.get("accept-encoding") || "",
    verifiedIP.substring(0, 8), // Partial IP for privacy
  ].join("|");
  
  const requestFingerprint = hashString(fingerprintData);
  
  return {
    verifiedIP,
    userAgent,
    requestFingerprint,
    timestamp: Date.now(),
  };
}

// =====================================================
// SERVER-SIDE THREAT ANALYSIS
// =====================================================

export interface SecurityAnalysisResult {
  reportId: string | null;
  threatLevel: "none" | "low" | "medium" | "high" | "critical" | "blocked";
  action: "none" | "warning" | "temp_ban" | "perm_ban" | "already_banned";
  shouldBlock: boolean;
  banHours: number;
  anomalyScore: number;
  requestCount1h: number;
  uniqueIps1h: number;
}

/**
 * Analyze security using SERVER-SIDE data and patterns
 * Client-reported data is used as SIGNALS only, never trusted for decisions
 */
export async function analyzeSecurityServerSide(
  scriptId: string,
  keyId: string | null,
  verifiedIP: string,
  clientReportedData?: {
    hwid?: string;
    threats?: string[];
    executor?: string;
  }
): Promise<SecurityAnalysisResult> {
  const supabase = getSupabase();
  
  // Call the server-side analysis function in PostgreSQL
  const { data, error } = await supabase.rpc("analyze_security_report", {
    p_script_id: scriptId,
    p_key_id: keyId,
    p_verified_ip: verifiedIP,
    p_reported_hwid: clientReportedData?.hwid || null,
    p_reported_threats: clientReportedData?.threats || null,
    p_reported_executor: clientReportedData?.executor || null,
  });
  
  if (error) {
    console.error("[SECURITY] Analysis error:", error);
    // Default to allowing on error (fail open for availability)
    return {
      reportId: null,
      threatLevel: "none",
      action: "none",
      shouldBlock: false,
      banHours: 0,
      anomalyScore: 0,
      requestCount1h: 0,
      uniqueIps1h: 0,
    };
  }
  
  return {
    reportId: data?.report_id || null,
    threatLevel: data?.threat_level || "none",
    action: data?.action || "none",
    shouldBlock: data?.should_ban || false,
    banHours: data?.ban_hours || 0,
    anomalyScore: data?.anomaly_score || 0,
    requestCount1h: data?.request_count_1h || 0,
    uniqueIps1h: data?.unique_ips_1h || 0,
  };
}

// =====================================================
// SERVER-SIDE BAN CHECK (Database-backed)
// =====================================================

export interface BanCheckResult {
  isBanned: boolean;
  reason: string | null;
  expiresAt: Date | null;
}

/**
 * Check if IP/HWID is banned - DATABASE query, not memory
 */
export async function checkBanServerSide(
  scriptId: string,
  verifiedIP: string,
  reportedHwid?: string
): Promise<BanCheckResult> {
  const supabase = getSupabase();
  
  const { data } = await supabase.rpc("is_tamper_banned", {
    p_script_id: scriptId,
    p_ip_address: verifiedIP,
    p_hwid: reportedHwid || null,
  });
  
  if (data && data.length > 0 && data[0].is_banned) {
    return {
      isBanned: true,
      reason: data[0].reason,
      expiresAt: data[0].expires_at ? new Date(data[0].expires_at) : null,
    };
  }
  
  return { isBanned: false, reason: null, expiresAt: null };
}

// =====================================================
// SERVER-SIDE RATE LIMITING (Database-backed)
// =====================================================

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
  blocked: boolean;
}

/**
 * Rate limiting using DATABASE, not in-memory
 */
export async function checkRateLimitServerSide(
  identifier: string,
  endpoint: string,
  maxRequests: number = 60,
  windowSeconds: number = 60
): Promise<RateLimitResult> {
  const supabase = getSupabase();
  const now = new Date();
  const windowStart = new Date(now.getTime() - windowSeconds * 1000);
  
  // Get or create rate limit record
  const { data: existing } = await supabase
    .from("rate_limits")
    .select("*")
    .eq("identifier", identifier)
    .eq("endpoint", endpoint)
    .maybeSingle();
  
  if (existing) {
    const firstAttempt = new Date(existing.first_attempt_at);
    
    // Check if within window
    if (firstAttempt > windowStart) {
      // Within window - check count
      if (existing.attempts >= maxRequests) {
        // Check if blocked
        if (existing.blocked_until && new Date(existing.blocked_until) > now) {
          return {
            allowed: false,
            remaining: 0,
            resetAt: new Date(existing.blocked_until),
            blocked: true,
          };
        }
        
        // Block for double the window
        const blockedUntil = new Date(now.getTime() + windowSeconds * 2000);
        await supabase.from("rate_limits").update({
          blocked_until: blockedUntil.toISOString(),
          last_attempt_at: now.toISOString(),
        }).eq("id", existing.id);
        
        return {
          allowed: false,
          remaining: 0,
          resetAt: blockedUntil,
          blocked: true,
        };
      }
      
      // Increment
      await supabase.from("rate_limits").update({
        attempts: existing.attempts + 1,
        last_attempt_at: now.toISOString(),
      }).eq("id", existing.id);
      
      return {
        allowed: true,
        remaining: maxRequests - existing.attempts - 1,
        resetAt: new Date(firstAttempt.getTime() + windowSeconds * 1000),
        blocked: false,
      };
    } else {
      // Window expired - reset
      await supabase.from("rate_limits").update({
        attempts: 1,
        first_attempt_at: now.toISOString(),
        last_attempt_at: now.toISOString(),
        blocked_until: null,
      }).eq("id", existing.id);
      
      return {
        allowed: true,
        remaining: maxRequests - 1,
        resetAt: new Date(now.getTime() + windowSeconds * 1000),
        blocked: false,
      };
    }
  } else {
    // Create new record
    await supabase.from("rate_limits").insert({
      identifier,
      endpoint,
      attempts: 1,
      first_attempt_at: now.toISOString(),
      last_attempt_at: now.toISOString(),
    });
    
    return {
      allowed: true,
      remaining: maxRequests - 1,
      resetAt: new Date(now.getTime() + windowSeconds * 1000),
      blocked: false,
    };
  }
}

// =====================================================
// SERVER-SIDE TRACEPATH (Database-backed)
// =====================================================

const STEP_ORDER = ["version", "info", "endpoints", "flags", "validate"] as const;
type TracepathStep = typeof STEP_ORDER[number];

/**
 * Check tracepath step - DATABASE validation
 */
export async function checkTracepathServerSide(
  sessionId: string,
  currentStep: TracepathStep
): Promise<{ valid: boolean; reason?: string }> {
  const supabase = getSupabase();
  
  const stepIndex = STEP_ORDER.indexOf(currentStep);
  if (stepIndex === -1) {
    return { valid: false, reason: "invalid_step" };
  }
  
  const { data: session } = await supabase
    .from("tracepath_sessions")
    .select("*")
    .eq("session_id", sessionId)
    .eq("is_valid", true)
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();
  
  if (!session) {
    // First step doesn't need prior session
    if (stepIndex === 0) {
      return { valid: true };
    }
    return { valid: false, reason: "no_session" };
  }
  
  // Verify sequence
  if (session.current_step < stepIndex) {
    // Must complete previous steps first
    return { valid: false, reason: "sequence_violation" };
  }
  
  return { valid: true };
}

/**
 * Advance tracepath - DATABASE update
 */
export async function advanceTracepathServerSide(
  sessionId: string,
  completedStep: TracepathStep
): Promise<void> {
  const supabase = getSupabase();
  const stepIndex = STEP_ORDER.indexOf(completedStep);
  const stepColumn = `step_${completedStep}_at`;
  
  await supabase
    .from("tracepath_sessions")
    .update({
      current_step: stepIndex + 1,
      [stepColumn]: new Date().toISOString(),
    })
    .eq("session_id", sessionId)
    .eq("is_valid", true);
}

// =====================================================
// SERVER-SIDE TOKEN VALIDATION (Database-backed)
// =====================================================

/**
 * Validate session token - DATABASE check
 */
export async function validateTokenServerSide(
  token: string,
  scriptId: string,
  verifiedIP: string
): Promise<{ valid: boolean; keyId?: string; hwidHash?: string }> {
  const supabase = getSupabase();
  
  const { data } = await supabase
    .from("rotating_tokens")
    .select("*")
    .eq("token", token)
    .eq("script_id", scriptId)
    .eq("is_valid", true)
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();
  
  if (!data) {
    return { valid: false };
  }
  
  // Optional: verify IP matches (can be disabled for mobile users)
  // if (data.ip_address && data.ip_address !== verifiedIP) {
  //   return { valid: false };
  // }
  
  return {
    valid: true,
    keyId: data.key_id,
    hwidHash: data.hwid_hash,
  };
}

/**
 * Create new session token - DATABASE insert
 */
export async function createTokenServerSide(
  scriptId: string,
  keyId: string,
  verifiedIP: string,
  hwidHash?: string,
  ttlSeconds: number = 30
): Promise<string> {
  const supabase = getSupabase();
  const token = generateSecureToken(64);
  const expiresAt = new Date(Date.now() + ttlSeconds * 1000);
  
  await supabase.from("rotating_tokens").insert({
    token,
    script_id: scriptId,
    key_id: keyId,
    ip_address: verifiedIP,
    hwid_hash: hwidHash?.substring(0, 32) || null,
    expires_at: expiresAt.toISOString(),
    is_valid: true,
    step: 0,
    max_step: 10,
  });
  
  return token;
}

/**
 * Rotate token - DATABASE update + insert
 */
export async function rotateTokenServerSide(
  oldToken: string,
  scriptId: string
): Promise<string | null> {
  const supabase = getSupabase();
  
  // Get old token data
  const { data: oldData } = await supabase
    .from("rotating_tokens")
    .select("*")
    .eq("token", oldToken)
    .eq("script_id", scriptId)
    .eq("is_valid", true)
    .maybeSingle();
  
  if (!oldData) {
    return null;
  }
  
  // Invalidate old token
  await supabase
    .from("rotating_tokens")
    .update({ is_valid: false, used_at: new Date().toISOString() })
    .eq("token", oldToken);
  
  // Create new token
  const newToken = generateSecureToken(64);
  const expiresAt = new Date(Date.now() + 30000);
  
  await supabase.from("rotating_tokens").insert({
    token: newToken,
    script_id: scriptId,
    key_id: oldData.key_id,
    ip_address: oldData.ip_address,
    hwid_hash: oldData.hwid_hash,
    expires_at: expiresAt.toISOString(),
    is_valid: true,
    step: (oldData.step || 0) + 1,
    max_step: oldData.max_step || 10,
  });
  
  return newToken;
}

// =====================================================
// CRYPTO HELPERS (Server-side)
// =====================================================

function generateSecureToken(length: number): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  const randomValues = new Uint8Array(length);
  crypto.getRandomValues(randomValues);
  return Array.from(randomValues).map(v => chars[v % chars.length]).join("");
}

function hashString(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
}

/**
 * HMAC-SHA256 for token signing (Web Crypto API)
 */
export async function signPayload(data: string, secret: string): Promise<string> {
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

/**
 * Verify HMAC signature
 */
export async function verifySignature(data: string, signature: string, secret: string): Promise<boolean> {
  const expected = await signPayload(data, secret);
  
  // Timing-safe comparison
  if (expected.length !== signature.length) return false;
  
  let diff = 0;
  for (let i = 0; i < expected.length; i++) {
    diff |= expected.charCodeAt(i) ^ signature.charCodeAt(i);
  }
  
  return diff === 0;
}

/**
 * Hash HWID with salt (SHA-256)
 */
export async function hashHWID(hwid: string): Promise<string> {
  const data = new TextEncoder().encode(hwid + "shadowauth_v7_server_salt");
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, "0")).join("");
}

// =====================================================
// EXECUTOR DETECTION (Server-side pattern matching)
// =====================================================

const EXECUTOR_PATTERNS = [
  { pattern: /synapse/i, name: "Synapse" },
  { pattern: /krnl/i, name: "KRNL" },
  { pattern: /script-?ware/i, name: "ScriptWare" },
  { pattern: /fluxus/i, name: "Fluxus" },
  { pattern: /delta/i, name: "Delta" },
  { pattern: /hydrogen/i, name: "Hydrogen" },
  { pattern: /solara/i, name: "Solara" },
  { pattern: /wave/i, name: "Wave" },
  { pattern: /oxygen/i, name: "Oxygen" },
  { pattern: /sentinel/i, name: "Sentinel" },
  { pattern: /sirius/i, name: "Sirius" },
  { pattern: /celery/i, name: "Celery" },
  { pattern: /arceus/i, name: "Arceus" },
  { pattern: /comet/i, name: "Comet" },
  { pattern: /trigon/i, name: "Trigon" },
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
  { pattern: /volt/i, name: "Volt" },
  { pattern: /electron/i, name: "Electron" },
  { pattern: /roblox/i, name: "Roblox" },
];

/**
 * Detect executor from User-Agent (SERVER-SIDE verification)
 */
export function detectExecutorFromUA(userAgent: string): { 
  isExecutor: boolean; 
  name: string | null;
} {
  const ua = userAgent.toLowerCase();
  
  for (const { pattern, name } of EXECUTOR_PATTERNS) {
    if (pattern.test(ua)) {
      return { isExecutor: true, name };
    }
  }
  
  return { isExecutor: false, name: null };
}

/**
 * Validate request comes from executor (SERVER-SIDE check)
 */
export function validateExecutorRequest(req: Request): {
  valid: boolean;
  executor: string | null;
  reason?: string;
} {
  const sig = req.headers.get("x-shadow-sig");
  const ua = req.headers.get("user-agent") || "";
  
  // Check for ShadowAuth signature
  if (sig === "ShadowAuth-Loader-v2") {
    return { valid: true, executor: "ShadowAuth" };
  }
  
  // Check User-Agent patterns
  const detection = detectExecutorFromUA(ua);
  if (detection.isExecutor) {
    return { valid: true, executor: detection.name };
  }
  
  return { valid: false, executor: null, reason: "not_executor" };
}
