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
// WATERMARKING (ASCII-safe for executor compatibility)
// =====================================================

/**
 * Embed watermark in Lua code without invisible Unicode characters.
 * NOTE: Some executors fail to parse scripts containing U+200B/U+200C,
 * so watermarking must remain strictly ASCII-safe.
 */
export function steganographicWatermark(code: string, keyId: string): string {
  let fp = 0;
  for (let i = 0; i < keyId.length; i++) {
    fp = ((fp << 5) - fp + keyId.charCodeAt(i)) >>> 0;
  }

  const ts = Date.now();
  const tsHash = (ts ^ (ts >>> 16)) >>> 0;

  const lines = code.split("\n");
  const encodedFP = fp.toString(36).padStart(7, "0");
  const encodedTS = tsHash.toString(36).padStart(7, "0");
  const markerVar = `_sa_wm_${encodedFP}_${encodedTS}`;

  const insertPos = Math.min(3, Math.max(0, lines.length - 1));
  lines.splice(insertPos, 0, `local ${markerVar} = ${Math.floor(Math.random() * 99999)}`);

  return lines.join("\n");
}

/**
 * Extract watermark from ASCII marker variable.
 */
export function extractWatermark(code: string): { keyFingerprint: number; timestampHash: number } | null {
  const match = code.match(/\blocal\s+_sa_wm_([0-9a-z]{7})_([0-9a-z]{7})\s*=\s*\d+/i);
  if (!match) return null;

  const keyFingerprint = parseInt(match[1], 36) >>> 0;
  const timestampHash = parseInt(match[2], 36) >>> 0;

  if (Number.isNaN(keyFingerprint) || Number.isNaN(timestampHash)) return null;
  return { keyFingerprint, timestampHash };
}

// =====================================================
// LUA MINIFIER (Luarmor-style pre-obfuscation compression)
// Strips comments, excess whitespace, empty lines
// =====================================================

export function minifyLua(code: string): string {
  let result = code;

  // Remove block comments --[[ ... ]]
  result = result.replace(/--\[\[[\s\S]*?\]\]/g, '');

  // Remove single-line comments (but not inside strings)
  // Process line by line to handle strings correctly
  const lines = result.split('\n');
  const minifiedLines: string[] = [];

  for (const line of lines) {
    let processed = '';
    let inSingleQuote = false;
    let inDoubleQuote = false;
    let inBracketStr = false;
    let i = 0;

    while (i < line.length) {
      const ch = line[i];
      const next = line[i + 1];

      // Handle escape sequences inside strings
      if ((inSingleQuote || inDoubleQuote) && ch === '\\') {
        processed += ch + (next || '');
        i += 2;
        continue;
      }

      // Toggle string states
      if (ch === "'" && !inDoubleQuote && !inBracketStr) {
        inSingleQuote = !inSingleQuote;
        processed += ch;
        i++;
        continue;
      }
      if (ch === '"' && !inSingleQuote && !inBracketStr) {
        inDoubleQuote = !inDoubleQuote;
        processed += ch;
        i++;
        continue;
      }

      // Detect comment outside strings
      if (!inSingleQuote && !inDoubleQuote && !inBracketStr && ch === '-' && next === '-') {
        // Check for block comment start
        if (line.substring(i + 2, i + 4) === '[[') {
          break; // Rest handled by block comment removal above
        }
        break; // Line comment - skip rest of line
      }

      processed += ch;
      i++;
    }

    // Trim trailing whitespace
    const trimmed = processed.trimEnd();
    if (trimmed.length > 0) {
      // Compress multiple spaces to single (outside strings - simplified)
      minifiedLines.push(trimmed);
    }
  }

  // Join with semicolons where possible for density
  result = minifiedLines.join('\n');

  // Remove empty lines
  result = result.replace(/\n{2,}/g, '\n');

  // Trim leading/trailing
  result = result.trim();

  return result;
}

// =====================================================
// LURAPH INTEGRATION V2 (full API spec compliance)
// API docs: https://api.lura.ph/v1
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
      console.error(`[LURAPH CRITICAL] No API key configured for ${layerName}`);
      await logLuraphFailure(layerName, "NO_API_KEY");
    }
    return { code, obfuscated: false };
  }

  try {
    console.log(`[Luraph] Obfuscating ${layerName} (${code.length} bytes)...`);
    
    const headers: HeadersInit = {
      "Luraph-API-Key": key,
      "Content-Type": "application/json",
    };

    // Step 1: Get available nodes
    const nodesResp = await fetch(`${LURAPH_API_URL}/obfuscate/nodes`, { headers });
    if (!nodesResp.ok) {
      const err = await nodesResp.text();
      throw new Error(`Nodes fetch failed [${nodesResp.status}]: ${err}`);
    }
    const nodesData = await nodesResp.json();
    const nodeId = nodesData.recommendedId;
    if (!nodeId || !nodesData.nodes[nodeId]) throw new Error("No Luraph nodes available");
    
    const node = nodesData.nodes[nodeId];
    console.log(`[Luraph] Using node ${nodeId} (v${node.version}, CPU: ${node.cpuUsage}%)`);

    // Step 2: Build options dynamically from node's available options
    const options: Record<string, boolean | string> = {};
    for (const [optId, optConfig] of Object.entries(node.options as Record<string, any>)) {
      if (optConfig.tier === "PREMIUM_ONLY") {
        // Set default for premium options we may not have access to
        if (optConfig.type === "CHECKBOX") options[optId] = false;
        else if (optConfig.type === "DROPDOWN" && optConfig.choices?.length > 0) options[optId] = optConfig.choices[0];
        else if (optConfig.type === "TEXT") options[optId] = "";
      } else {
        // Enable all CUSTOMER_ONLY options we have access to
        if (optConfig.type === "CHECKBOX") {
          // Check dependencies
          let depsOk = true;
          if (optConfig.dependencies) {
            for (const [depId, depValues] of Object.entries(optConfig.dependencies as Record<string, any[]>)) {
              if (!depValues.includes(options[depId])) { depsOk = false; break; }
            }
          }
          options[optId] = depsOk;
        } else if (optConfig.type === "DROPDOWN" && optConfig.choices?.length > 0) {
          options[optId] = optConfig.choices[0];
        } else if (optConfig.type === "TEXT") {
          options[optId] = "";
        }
      }
    }

    // Step 3: Base64 encode the script
    const encoder = new TextEncoder();
    const bytes = encoder.encode(code);
    let binary = "";
    for (const byte of bytes) binary += String.fromCharCode(byte);
    const b64Script = btoa(binary);

    // Step 4: Submit obfuscation job
    const submitResp = await fetch(`${LURAPH_API_URL}/obfuscate/new`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        fileName: `${layerName}.lua`,
        node: nodeId,
        script: b64Script,
        options,
        enforceSettings: false,
        useTokens: false,
      }),
    });
    
    if (!submitResp.ok) {
      const errData = await submitResp.json().catch(() => ({ errors: [{ message: "Unknown" }] }));
      const errMsgs = errData.errors?.map((e: any) => `${e.param ? e.param + ": " : ""}${e.message}`).join("; ");
      throw new Error(`Submit failed [${submitResp.status}]: ${errMsgs}`);
    }
    
    const { jobId } = await submitResp.json();
    console.log(`[Luraph] Job ${jobId} submitted for ${layerName}`);

    // Step 5: Wait for completion (blocking endpoint, 60s timeout, retry up to 3 times)
    let completed = false;
    for (let attempt = 0; attempt < 3 && !completed; attempt++) {
      const statusResp = await fetch(`${LURAPH_API_URL}/obfuscate/status/${jobId}`, { headers });
      
      if (!statusResp.ok) {
        if (statusResp.status === 404) throw new Error("Job not found");
        await new Promise(r => setTimeout(r, 2000));
        continue;
      }
      
      const statusText = await statusResp.text();
      if (statusText && statusText.trim()) {
        try {
          const statusData = JSON.parse(statusText);
          if (statusData.error) {
            throw new Error(`Luraph compilation error: ${statusData.error}`);
          }
        } catch (e) {
          if ((e as Error).message.includes("Luraph compilation")) throw e;
        }
      }
      completed = true;
    }
    
    if (!completed) throw new Error("Job status timeout after 3 attempts");

    // Step 6: Download result
    const dlResp = await fetch(`${LURAPH_API_URL}/obfuscate/download/${jobId}`, { headers });
    if (!dlResp.ok) {
      if (dlResp.status === 410) throw new Error("Job result expired (24h limit)");
      throw new Error(`Download failed [${dlResp.status}]`);
    }
    
    const result = await dlResp.text();
    console.log(`[Luraph] ${layerName} OK: ${code.length} → ${result.length} bytes (${((result.length/code.length)*100).toFixed(0)}%)`);
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
