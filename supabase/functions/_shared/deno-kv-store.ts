/**
 * SHADOWAUTH - SUPABASE-BASED PERSISTENT STORE
 * =============================================
 * Uses Supabase tables instead of Deno KV (not available in Edge Functions)
 * Equivalent to Luarmor's Redis/Memcached backend
 */

import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.49.2";

// =====================================================
// SUPABASE CLIENT (using service role for backend ops)
// =====================================================

function getSupabase(): SupabaseClient {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );
}

// =====================================================
// IN-MEMORY FALLBACK STORES (per-request, not persistent)
// Used as fast cache layer, with DB as source of truth
// =====================================================

const localBlacklistCache = new Map<string, { expiresAt: number; reason: string }>();
const localSessionCache = new Map<string, SessionData>();
const localNonceCache = new Set<string>();
const localRequestHashCache = new Set<string>();

// =====================================================
// BLACKLIST STORE (DB-backed with local cache)
// =====================================================

export interface BlacklistEntry {
  ip: string;
  hwid?: string;
  reason: string;
  bannedAt: number;
  expiresAt: number;
}

export async function addToBlacklist(
  ip: string, 
  hwid?: string, 
  reason: string = "security_violation",
  ttlSeconds: number = 86400
): Promise<void> {
  const supabase = getSupabase();
  const now = Date.now();
  const expiresAt = new Date(now + (ttlSeconds * 1000));
  
  // Add to local cache
  localBlacklistCache.set(ip, { expiresAt: expiresAt.getTime(), reason });
  if (hwid) {
    localBlacklistCache.set(`hwid:${hwid}`, { expiresAt: expiresAt.getTime(), reason });
  }
  
  // Add to tamper_bans table (existing table)
  await supabase.from("tamper_bans").upsert({
    ip_address: ip,
    hwid: hwid || null,
    reason,
    banned_at: new Date().toISOString(),
    expires_at: expiresAt.toISOString(),
    script_id: "00000000-0000-0000-0000-000000000000", // System ban
  }, { onConflict: "ip_address,script_id" }).select();
  
  console.log(`[BLACKLIST] Added: IP=${ip}, HWID=${hwid || "none"}, reason=${reason}, TTL=${ttlSeconds}s`);
}

export async function isBlacklisted(ip: string, hwid?: string): Promise<{ blocked: boolean; entry?: BlacklistEntry }> {
  const now = Date.now();
  
  // Check local cache first (fast path)
  const ipCache = localBlacklistCache.get(ip);
  if (ipCache && ipCache.expiresAt > now) {
    return { 
      blocked: true, 
      entry: { ip, reason: ipCache.reason, bannedAt: now, expiresAt: ipCache.expiresAt } 
    };
  }
  
  if (hwid) {
    const hwidCache = localBlacklistCache.get(`hwid:${hwid}`);
    if (hwidCache && hwidCache.expiresAt > now) {
      return { 
        blocked: true, 
        entry: { ip, hwid, reason: hwidCache.reason, bannedAt: now, expiresAt: hwidCache.expiresAt } 
      };
    }
  }
  
  // Check DB (slower but persistent)
  const supabase = getSupabase();
  const { data } = await supabase
    .from("tamper_bans")
    .select("*")
    .or(`ip_address.eq.${ip}${hwid ? `,hwid.eq.${hwid}` : ""}`)
    .gt("expires_at", new Date().toISOString())
    .limit(1)
    .maybeSingle();
  
  if (data) {
    // Cache for future requests
    localBlacklistCache.set(ip, { 
      expiresAt: new Date(data.expires_at).getTime(), 
      reason: data.reason 
    });
    
    return {
      blocked: true,
      entry: {
        ip: data.ip_address,
        hwid: data.hwid,
        reason: data.reason,
        bannedAt: new Date(data.banned_at).getTime(),
        expiresAt: new Date(data.expires_at).getTime(),
      }
    };
  }
  
  return { blocked: false };
}

export async function removeFromBlacklist(ip: string, hwid?: string): Promise<void> {
  const supabase = getSupabase();
  
  localBlacklistCache.delete(ip);
  if (hwid) localBlacklistCache.delete(`hwid:${hwid}`);
  
  await supabase
    .from("tamper_bans")
    .delete()
    .eq("ip_address", ip);
}

// =====================================================
// SESSION STORE (In-memory with rotating tokens table)
// =====================================================

export interface SessionData {
  token: string;
  timestamp: number;
  scriptId: string;
  hwid: string;
  ip: string;
  webhookToken: string;
  rotationCount: number;
  requestHash?: string;
  salt?: string;
}

export async function createSession(
  ip: string,
  scriptId: string,
  hwid: string,
  ttlSeconds: number = 15
): Promise<{ token: string; webhookToken: string }> {
  const supabase = getSupabase();
  
  const token = generateSecureToken(64);
  const webhookToken = generateSecureToken(50);
  const expiresAt = new Date(Date.now() + (ttlSeconds * 1000));
  
  const session: SessionData = {
    token,
    timestamp: Date.now(),
    scriptId,
    hwid,
    ip,
    webhookToken,
    rotationCount: 0,
  };
  
  // Local cache
  localSessionCache.set(ip, session);
  
  // DB persistence via rotating_tokens
  await supabase.from("rotating_tokens").insert({
    token,
    script_id: scriptId,
    hwid_hash: hwid,
    ip_address: ip,
    expires_at: expiresAt.toISOString(),
    step: 0,
    max_step: 10,
    is_valid: true,
  });
  
  return { token, webhookToken };
}

export async function getSession(ip: string): Promise<SessionData | null> {
  // Check local cache first
  const cached = localSessionCache.get(ip);
  if (cached && Date.now() - cached.timestamp < 15000) {
    return cached;
  }
  
  // Check DB
  const supabase = getSupabase();
  const { data } = await supabase
    .from("rotating_tokens")
    .select("*")
    .eq("ip_address", ip)
    .eq("is_valid", true)
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  
  if (!data) return null;
  
  const session: SessionData = {
    token: data.token,
    timestamp: new Date(data.created_at).getTime(),
    scriptId: data.script_id,
    hwid: data.hwid_hash || "",
    ip: data.ip_address || ip,
    webhookToken: "",
    rotationCount: data.step || 0,
  };
  
  localSessionCache.set(ip, session);
  return session;
}

export async function validateSession(
  ip: string, 
  token: string, 
  scriptId: string
): Promise<boolean> {
  const session = await getSession(ip);
  
  if (!session) return false;
  if (session.token !== token) return false;
  if (session.scriptId !== scriptId) return false;
  
  return true;
}

export async function rotateSessionToken(ip: string): Promise<string | null> {
  const session = await getSession(ip);
  if (!session) return null;
  
  const supabase = getSupabase();
  const newToken = generateSecureToken(64);
  
  // Invalidate old token
  await supabase
    .from("rotating_tokens")
    .update({ is_valid: false })
    .eq("token", session.token);
  
  // Create new token
  const expiresAt = new Date(Date.now() + 15000);
  await supabase.from("rotating_tokens").insert({
    token: newToken,
    script_id: session.scriptId,
    hwid_hash: session.hwid,
    ip_address: ip,
    expires_at: expiresAt.toISOString(),
    step: session.rotationCount + 1,
    max_step: 10,
    is_valid: true,
  });
  
  // Update local cache
  session.token = newToken;
  session.timestamp = Date.now();
  session.rotationCount++;
  localSessionCache.set(ip, session);
  
  return newToken;
}

export async function deleteSession(ip: string): Promise<void> {
  const supabase = getSupabase();
  localSessionCache.delete(ip);
  
  await supabase
    .from("rotating_tokens")
    .update({ is_valid: false })
    .eq("ip_address", ip);
}

// =====================================================
// TRACEPATH STORE (Using tracepath_sessions table)
// =====================================================

export interface TracepathData {
  version: boolean;
  info: boolean;
  endpoints: boolean;
  flags: boolean;
  validate: boolean;
  lastActivity: number;
}

const STEP_ORDER = ['version', 'info', 'endpoints', 'flags', 'validate'] as const;

export async function initTracepath(hwid: string): Promise<void> {
  // Tracepath is managed via tracepath_sessions table in auth-version endpoint
  console.log(`[TRACEPATH] Init for HWID: ${hwid.substring(0, 8)}...`);
}

export async function checkTracepath(hwid: string, step: string): Promise<boolean> {
  const supabase = getSupabase();
  const currentStepIndex = STEP_ORDER.indexOf(step as typeof STEP_ORDER[number]);
  
  if (currentStepIndex === -1) return false;
  
  // Check tracepath_sessions table
  const { data } = await supabase
    .from("tracepath_sessions")
    .select("*")
    .eq("hwid_hash", hwid)
    .eq("is_valid", true)
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  
  if (!data) return currentStepIndex === 0; // Allow first step
  
  // Verify step sequence
  return data.current_step >= currentStepIndex;
}

export async function advanceTracepath(hwid: string, step: string): Promise<void> {
  const supabase = getSupabase();
  const stepIndex = STEP_ORDER.indexOf(step as typeof STEP_ORDER[number]);
  
  if (stepIndex === -1) return;
  
  const stepColumn = `step_${step}_at`;
  
  await supabase
    .from("tracepath_sessions")
    .update({
      current_step: stepIndex + 1,
      [stepColumn]: new Date().toISOString(),
    })
    .eq("hwid_hash", hwid)
    .eq("is_valid", true);
}

export async function clearTracepath(hwid: string): Promise<void> {
  const supabase = getSupabase();
  
  await supabase
    .from("tracepath_sessions")
    .update({ is_valid: false })
    .eq("hwid_hash", hwid);
}

// =====================================================
// NONCE STORE (Using used_nonces table)
// =====================================================

export async function isNonceUsed(nonce: string): Promise<boolean> {
  // Check local cache first
  if (localNonceCache.has(nonce)) return true;
  
  const supabase = getSupabase();
  const { data } = await supabase
    .from("used_nonces")
    .select("id")
    .eq("nonce", nonce)
    .limit(1)
    .maybeSingle();
  
  if (data) {
    localNonceCache.add(nonce);
    return true;
  }
  
  return false;
}

export async function markNonceUsed(nonce: string, ttlSeconds: number = 300): Promise<void> {
  localNonceCache.add(nonce);
  
  const supabase = getSupabase();
  await supabase.from("used_nonces").insert({
    nonce,
    timestamp: Date.now(),
    session_key: `nonce_${Date.now()}`,
    script_id: "00000000-0000-0000-0000-000000000000",
  }).select();
  
  // Cleanup old nonces periodically (5 minute TTL)
  if (Math.random() < 0.01) { // 1% chance to cleanup
    const cutoff = new Date(Date.now() - (ttlSeconds * 1000));
    await supabase
      .from("used_nonces")
      .delete()
      .lt("used_at", cutoff.toISOString());
  }
}

// =====================================================
// REQUEST HASH STORE (In-memory with periodic cleanup)
// =====================================================

export async function isRequestHashUsed(hash: string): Promise<boolean> {
  return localRequestHashCache.has(hash);
}

export async function markRequestHashUsed(hash: string, ttlSeconds: number = 60): Promise<void> {
  localRequestHashCache.add(hash);
  
  // Auto-cleanup after TTL
  setTimeout(() => {
    localRequestHashCache.delete(hash);
  }, ttlSeconds * 1000);
}

// =====================================================
// WEBSOCKET TOKEN STORE (In-memory)
// =====================================================

export interface WebsocketTokenData {
  token: string;
  ip: string;
  timestamp: number;
}

const websocketTokens = new Map<string, WebsocketTokenData>();

export async function setWebsocketToken(ip: string, token: string): Promise<void> {
  const normalizedIP = ip === "::1" ? "127.0.0.1" : ip;
  
  websocketTokens.set(normalizedIP, {
    token,
    ip: normalizedIP,
    timestamp: Date.now(),
  });
}

export async function getWebsocketToken(ip: string): Promise<string | undefined> {
  const normalizedIP = ip === "::1" ? "127.0.0.1" : ip;
  const data = websocketTokens.get(normalizedIP);
  
  if (!data) return undefined;
  if (Date.now() - data.timestamp > 60000) {
    websocketTokens.delete(normalizedIP);
    return undefined;
  }
  
  return data.token;
}

export async function validateWebsocketToken(ip: string, receivedToken: string): Promise<boolean> {
  const token = await getWebsocketToken(ip);
  if (!token) return false;
  return token === receivedToken;
}

// =====================================================
// RATE LIMIT STORE (Using rate_limits table)
// =====================================================

export interface RateLimitData {
  count: number;
  resetAt: number;
}

const rateLimitCache = new Map<string, RateLimitData>();

export async function checkRateLimit(
  identifier: string,
  maxRequests: number = 60,
  windowMs: number = 60000
): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
  const now = Date.now();
  const cached = rateLimitCache.get(identifier);
  
  if (cached && now < cached.resetAt) {
    if (cached.count >= maxRequests) {
      return { allowed: false, remaining: 0, resetAt: cached.resetAt };
    }
    cached.count++;
    return { allowed: true, remaining: maxRequests - cached.count, resetAt: cached.resetAt };
  }
  
  // New window
  const resetAt = now + windowMs;
  rateLimitCache.set(identifier, { count: 1, resetAt });
  
  // Persist to DB for cross-instance limiting
  const supabase = getSupabase();
  await supabase.from("rate_limits").upsert({
    identifier,
    endpoint: "loader",
    attempts: 1,
    first_attempt_at: new Date().toISOString(),
    last_attempt_at: new Date().toISOString(),
  }, { onConflict: "identifier,endpoint" });
  
  return { allowed: true, remaining: maxRequests - 1, resetAt };
}

// =====================================================
// HELPER FUNCTIONS
// =====================================================

function generateSecureToken(length: number): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const randomValues = new Uint8Array(length);
  crypto.getRandomValues(randomValues);
  return Array.from(randomValues).map(v => chars[v % chars.length]).join('');
}

export function generateRequestHash(
  key: string,
  scriptId: string,
  hwid: string,
  timestamp: number,
  nonce: string
): string {
  const data = `${key}:${scriptId}:${hwid}:${timestamp}:${nonce}`;
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    hash = ((hash << 5) - hash) + data.charCodeAt(i);
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36) + timestamp.toString(36);
}

export function hashString(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
}
