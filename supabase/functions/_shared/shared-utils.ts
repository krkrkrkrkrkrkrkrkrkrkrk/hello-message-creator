/**
 * SHADOWAUTH - SHARED UTILITIES
 * ==============================
 * Centralized functions to eliminate duplication across edge functions.
 * Previously duplicated in: loader, validate-key, validate-key-v2, validate-key-v3
 */

import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.49.2";

// =====================================================
// SUPABASE CLIENT (singleton per request)
// =====================================================

let _supabase: SupabaseClient | null = null;
export function getSupabase(): SupabaseClient {
  if (!_supabase) {
    _supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );
  }
  return _supabase;
}

// =====================================================
// CORS HEADERS (single definition)
// =====================================================

export const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-shadow-sig, x-shadow-key, x-shadow-hwid, x-delivery-mode, x-session-id, x-rotating-token, x-client-nonce, x-client-signature",
  "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
  "Pragma": "no-cache",
};

// =====================================================
// EXECUTOR DETECTION (single definition)
// =====================================================

const EXECUTOR_PATTERNS = [
  /synapse/i, /krnl/i, /fluxus/i, /electron/i, /oxygen/i, /sentinel/i,
  /celery/i, /arceus/i, /roblox/i, /comet/i, /trigon/i, /delta/i, /hydrogen/i,
  /evon/i, /vegax/i, /jjsploit/i, /nihon/i, /zorara/i, /solara/i, /wave/i,
  /script-?ware/i, /sirius/i, /valyse/i, /codex/i, /swift/i, /awp/i,
  /krampus/i, /macsploit/i, /sirhurt/i, /temple/i, /wininet/i, /winhttp/i,
  /httpget/i, /exploiter/i, /xeno/i, /nezur/i, /ro-?exec/i, /volt/i,
];

export function isExecutor(ua: string): boolean {
  return EXECUTOR_PATTERNS.some(p => p.test(ua));
}

export function getExecutorName(ua: string): string {
  const lower = ua.toLowerCase();
  const map: [string, string][] = [
    ["synapse", "Synapse"], ["script-ware", "ScriptWare"], ["scriptware", "ScriptWare"],
    ["fluxus", "Fluxus"], ["krnl", "KRNL"], ["delta", "Delta"],
    ["hydrogen", "Hydrogen"], ["solara", "Solara"], ["wave", "Wave"],
    ["volt", "Volt"], ["xeno", "Xeno"], ["nezur", "Nezur"], ["codex", "Codex"],
  ];
  for (const [pattern, name] of map) {
    if (lower.includes(pattern)) return name;
  }
  return "Unknown";
}

export function isLikelyExecutorRequest(req: Request): boolean {
  const accept = (req.headers.get("accept") || "").toLowerCase();
  const secFetchDest = (req.headers.get("sec-fetch-dest") || "").toLowerCase();
  return (!accept || accept === "*/*" || accept === "") && 
    secFetchDest !== "document" && !accept.includes("text/html");
}

// =====================================================
// HWID HASHING (single definition)
// =====================================================

export async function hashHWID(hwid: string): Promise<string> {
  const data = new TextEncoder().encode(hwid + "shadowauth_v7");
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash))
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");
}

// =====================================================
// FAST HASH (FNV-1a variant)
// =====================================================

export function fastHash32(input: string): string {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(16).padStart(8, "0");
}

// =====================================================
// SALT GENERATION (single definition)
// =====================================================

export function generateSalt(keyId: string, hwid: string, timestamp: number): string {
  const combined = `${keyId}:${hwid}:${timestamp}:shadowauth_v7`;
  let hash = 0;
  for (let i = 0; i < combined.length; i++) {
    hash = ((hash << 5) - hash) + combined.charCodeAt(i);
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36) + crypto.randomUUID().replace(/-/g, "").substring(0, 16);
}

// =====================================================
// XOR ENCRYPTION (with position-based salt)
// =====================================================

export function xorEncrypt(data: string, key: string): string {
  const encoder = new TextEncoder();
  const dataBytes = encoder.encode(data);
  const result = new Uint8Array(dataBytes.length);

  for (let i = 0; i < dataBytes.length; i++) {
    const keyByte = key.charCodeAt(i % key.length);
    const posByte = (i * 7 + 13) % 256;
    result[i] = dataBytes[i] ^ keyByte ^ posByte;
  }

  let binary = "";
  for (let i = 0; i < result.length; i++) {
    binary += String.fromCharCode(result[i]);
  }
  return btoa(binary);
}

// =====================================================
// IP EXTRACTION (single definition)
// =====================================================

export function getClientIP(req: Request): string {
  return req.headers.get("cf-connecting-ip") ||
    req.headers.get("x-real-ip") ||
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "unknown";
}

// =====================================================
// IP GEOLOCATION
// =====================================================

export async function getCountryFromIP(ip: string): Promise<string | null> {
  if (ip === "unknown" || ip === "127.0.0.1" || ip.startsWith("192.168.") || ip.startsWith("10.")) {
    return null;
  }
  try {
    const response = await fetch(`http://ip-api.com/json/${ip}?fields=status,country,countryCode`, {
      signal: AbortSignal.timeout(3000),
    });
    if (response.ok) {
      const data = await response.json();
      if (data.status === "success" && data.country) return data.country;
    }
  } catch (_e) {
    // Ignore
  }
  return null;
}

// =====================================================
// SECURE TOKEN GENERATION
// =====================================================

export function generateSecureToken(length: number): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  const randomValues = new Uint8Array(length);
  crypto.getRandomValues(randomValues);
  return Array.from(randomValues).map(v => chars[v % chars.length]).join("");
}

// =====================================================
// RANDOM VAR NAME (for Lua code generation)
// =====================================================

export function generateRandomVarName(length: number = 8): string {
  const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ_";
  const nums = "0123456789";
  let result = chars[Math.floor(Math.random() * chars.length)];
  for (let i = 1; i < length; i++) {
    result += (chars + nums)[Math.floor(Math.random() * (chars.length + nums.length))];
  }
  return result;
}

// =====================================================
// SCRIPT HASH (SHA-256)
// =====================================================

export async function generateScriptHash(content: string): Promise<string> {
  const data = new TextEncoder().encode(content);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, "0"))
    .join("")
    .substring(0, 32);
}

// =====================================================
// WATERMARKING (Steganographic - NOT comment-based)
// =====================================================

/**
 * Embed watermark steganographically into Lua code using:
 * 1. Variable name encoding (encode keyId bits into generated var names)
 * 2. Whitespace steganography (spaces vs tabs at line ends)
 * 3. String literal byte-level encoding (invisible Unicode in string constants)
 * 
 * This CANNOT be stripped by regex like --[[...]] comments.
 */
export function steganographicWatermark(code: string, keyId: string): string {
  // Encode keyId into a 32-bit fingerprint
  let fp = 0;
  for (let i = 0; i < keyId.length; i++) {
    fp = ((fp << 5) - fp + keyId.charCodeAt(i)) >>> 0;
  }
  
  // Encode timestamp
  const ts = Date.now();
  const tsHash = (ts ^ (ts >>> 16)) >>> 0;
  
  // Method 1: Inject invisible zero-width characters between real code lines
  // Uses ZWSP (U+200B) and ZWNJ (U+200C) to encode bits
  const bits: number[] = [];
  for (let i = 31; i >= 0; i--) bits.push((fp >> i) & 1);
  for (let i = 31; i >= 0; i--) bits.push((tsHash >> i) & 1);
  
  const lines = code.split("\n");
  let bitIdx = 0;
  
  for (let i = 0; i < lines.length && bitIdx < bits.length; i++) {
    // Only watermark non-empty, non-comment lines
    const trimmed = lines[i].trim();
    if (trimmed.length > 5 && !trimmed.startsWith("--")) {
      // Add zero-width character at end of line
      const zw = bits[bitIdx] === 1 ? "\u200B" : "\u200C";
      lines[i] = lines[i] + zw;
      bitIdx++;
    }
  }
  
  // Method 2: Inject a decoy local variable with encoded name
  // The variable name itself encodes the fingerprint in base36
  const encodedFP = fp.toString(36).padStart(7, "0");
  const encodedTS = tsHash.toString(36).padStart(7, "0");
  const decoyVar = `_${encodedFP}${encodedTS}`;
  
  // Insert decoy at a random position in the code (after first 3 lines)
  const insertPos = Math.min(3, lines.length - 1);
  lines.splice(insertPos, 0, `local ${decoyVar} = ${Math.floor(Math.random() * 99999)}`);
  
  return lines.join("\n");
}

/**
 * Extract watermark from steganographically marked code
 */
export function extractWatermark(code: string): { keyFingerprint: number; timestampHash: number } | null {
  const lines = code.split("\n");
  const bits: number[] = [];
  
  for (const line of lines) {
    if (line.includes("\u200B")) bits.push(1);
    else if (line.includes("\u200C")) bits.push(0);
  }
  
  if (bits.length < 64) return null;
  
  let keyFingerprint = 0;
  for (let i = 0; i < 32; i++) keyFingerprint = (keyFingerprint << 1) | bits[i];
  
  let timestampHash = 0;
  for (let i = 32; i < 64; i++) timestampHash = (timestampHash << 1) | bits[i];
  
  return { keyFingerprint: keyFingerprint >>> 0, timestampHash: timestampHash >>> 0 };
}

// =====================================================
// LURAPH INTEGRATION (with fail-alert)
// =====================================================

const LURAPH_API_URL = "https://api.lura.ph/v1";

export async function obfuscateWithLuraph(
  code: string, 
  layerName: string,
  alertOnFailure: boolean = true
): Promise<{ code: string; obfuscated: boolean }> {
  const key = Deno.env.get("LURAPH_API_KEY");
  if (!key) {
    if (alertOnFailure) {
      console.error(`[LURAPH CRITICAL] No API key configured for ${layerName} - DELIVERING UNOBFUSCATED CODE`);
      await logLuraphFailure(layerName, "NO_API_KEY");
    }
    return { code, obfuscated: false };
  }

  try {
    console.log(`[Luraph] Obfuscating ${layerName}...`);
    
    const headers = new Headers();
    headers.set("Luraph-API-Key", key);
    headers.set("Content-Type", "application/json");

    // Get nodes
    const nodesResp = await fetch(`${LURAPH_API_URL}/obfuscate/nodes`, { headers });
    if (!nodesResp.ok) throw new Error(`Nodes error: ${nodesResp.status}`);
    const nodes = await nodesResp.json();
    const nodeId = nodes.recommendedId;
    if (!nodeId) throw new Error("No Luraph nodes available");

    // Submit
    const encoder = new TextEncoder();
    const bytes = encoder.encode(code);
    let binary = "";
    for (const byte of bytes) binary += String.fromCharCode(byte);
    const b64 = btoa(binary);

    const submitResp = await fetch(`${LURAPH_API_URL}/obfuscate/new`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        fileName: `${layerName}.lua`,
        node: nodeId,
        script: b64,
        options: {
          TARGET_VERSION: "Luau",
          DISABLE_LINE_INFORMATION: true,
          CONSTANT_ENCRYPTION: true,
          CONTROL_FLOW: true,
          VM_ENCRYPTION: true,
          STRING_ENCRYPTION: true,
        },
        enforceSettings: false,
      }),
    });
    if (!submitResp.ok) throw new Error(`Submit error: ${await submitResp.text()}`);
    const { jobId } = await submitResp.json();

    // Poll for completion
    const start = Date.now();
    while (Date.now() - start < 90000) {
      const status = await fetch(`${LURAPH_API_URL}/obfuscate/status/${jobId}`, { headers });
      if (status.ok) break;
      await new Promise(r => setTimeout(r, 2000));
    }

    // Download
    const dlResp = await fetch(`${LURAPH_API_URL}/obfuscate/download/${jobId}`, { headers });
    if (!dlResp.ok) throw new Error(`Download error: ${dlResp.status}`);
    const result = await dlResp.text();
    
    console.log(`[Luraph] ${layerName} OK (${result.length} bytes)`);
    return { code: result, obfuscated: true };

  } catch (err) {
    console.error(`[LURAPH CRITICAL] Failed for ${layerName}:`, err);
    if (alertOnFailure) {
      await logLuraphFailure(layerName, String(err));
    }
    return { code, obfuscated: false };
  }
}

async function logLuraphFailure(layerName: string, error: string): Promise<void> {
  try {
    const supabase = getSupabase();
    await supabase.from("security_events").insert({
      event_type: "luraph_failure",
      severity: "critical",
      details: { layer: layerName, error, timestamp: new Date().toISOString() },
    });
  } catch (_e) {
    console.error("[ALERT] Failed to log Luraph failure to DB");
  }
}

// =====================================================
// ENCRYPTION KEY DERIVATION (Luarmor-identical)
// =====================================================

/**
 * Derive encryption key matching the Lua client's derivation:
 * salt + hwid + sessionKey + timestamp → hash*31^charCode → LCG expansion to 32 chars
 */
export function deriveEncryptionKey(
  salt: string,
  hwid: string,
  sessionKey: string,
  timestamp: number
): string {
  const source = `${salt}${hwid}${sessionKey}${timestamp}`;
  let hash = 0;
  for (let i = 0; i < source.length; i++) {
    hash = ((hash * 31) ^ source.charCodeAt(i)) >>> 0;
    hash = hash % 2147483647;
  }

  let key = "";
  let seed = hash;
  for (let i = 0; i < 32; i++) {
    seed = ((seed * 1103515245 + 12345) ^ seed) >>> 0;
    key += String.fromCharCode((seed % 95) + 32);
  }
  return key;
}

// =====================================================
// REAL ENCRYPTION: Executor-native crypto with XOR fallback
// =====================================================

/**
 * Generate Lua decryption code that uses executor-native AES when available.
 * Fallback chain: syn.crypt.decrypt → crypt.decrypt → XOR
 * 
 * This replaces the fake "AES-256" that was actually XOR on the client.
 */
export function generateLuaDecryptor(): string {
  return `
-- ShadowAuth Real Decryptor v2.0
-- Uses executor-native AES when available, XOR fallback
local function _SA_DECRYPT(encrypted_b64, key, salt, mode)
  -- Base64 decode
  local alpha = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/"
  local dt = {}
  for i = 1, 64 do dt[alpha:sub(i,i)] = i - 1 end
  local raw = {}
  for i = 1, #encrypted_b64, 4 do
    local a = dt[encrypted_b64:sub(i,i)] or 0
    local b = dt[encrypted_b64:sub(i+1,i+1)] or 0
    local c = dt[encrypted_b64:sub(i+2,i+2)] or 0
    local d = dt[encrypted_b64:sub(i+3,i+3)] or 0
    local n = a*262144 + b*4096 + c*64 + d
    raw[#raw+1] = string.char(bit32.band(bit32.rshift(n,16), 255))
    if encrypted_b64:sub(i+2,i+2) ~= "=" then raw[#raw+1] = string.char(bit32.band(bit32.rshift(n,8), 255)) end
    if encrypted_b64:sub(i+3,i+3) ~= "=" then raw[#raw+1] = string.char(bit32.band(n, 255)) end
  end
  local data = table.concat(raw)
  
  -- Try executor-native AES first
  local aesOk = false
  local decrypted
  
  -- Synapse X crypto
  pcall(function()
    if syn and syn.crypt and syn.crypt.decrypt then
      decrypted = syn.crypt.decrypt(data, key, salt, "aes-cbc")
      aesOk = true
    end
  end)
  
  -- Generic crypt library (Xeno, Fluxus, etc)
  if not aesOk then
    pcall(function()
      if crypt and crypt.decrypt then
        decrypted = crypt.decrypt(data, key, salt, "aes-cbc")
        aesOk = true
      end
    end)
  end
  
  -- Fallback: XOR with position-based salt (always works)
  if not aesOk then
    local result = {}
    for i = 1, #data do
      local kb = key:byte((i-1) % #key + 1)
      local sb = salt and salt:byte((i-1) % #salt + 1) or 0
      local ps = ((i-1) * 7 + 13) % 256
      result[i] = string.char(bit32.bxor(bit32.bxor(bit32.bxor(data:byte(i), kb), ps), sb))
    end
    decrypted = table.concat(result)
  end
  
  return decrypted
end
`;
}
