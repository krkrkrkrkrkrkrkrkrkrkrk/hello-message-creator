/**
 * WSS Protocol - Luarmor-identical WebSocket Secure Communication
 * 
 * Features:
 * - Binary stream delivery (byte arrays, not JSON)
 * - XOR encryption with rotating keys
 * - Message-level rate limiting (30 msgs/10s)
 * - HMAC challenge-response handshake
 * - Timing-safe signature validation
 */

// ==================== BINARY ENCODING ====================

/**
 * Convert string to byte array (Uint8Array)
 */
export function stringToBytes(str: string): Uint8Array {
  const bytes = new Uint8Array(str.length);
  for (let i = 0; i < str.length; i++) {
    bytes[i] = str.charCodeAt(i);
  }
  return bytes;
}

/**
 * Convert byte array to string
 */
export function bytesToString(bytes: Uint8Array): string {
  let result = '';
  for (let i = 0; i < bytes.length; i++) {
    result += String.fromCharCode(bytes[i]);
  }
  return result;
}

/**
 * XOR encrypt/decrypt byte array with key
 */
export function xorBytes(data: Uint8Array, key: string): Uint8Array {
  const result = new Uint8Array(data.length);
  const keyBytes = stringToBytes(key);
  
  for (let i = 0; i < data.length; i++) {
    // XOR with key byte + position-based salt
    const keyByte = keyBytes[i % keyBytes.length];
    const posSalt = ((i * 7 + 13) % 256);
    result[i] = data[i] ^ keyByte ^ posSalt;
  }
  
  return result;
}

/**
 * Generate binary packet for WSS delivery
 * Format: [4 bytes length][1 byte type][N bytes payload]
 */
export function createBinaryPacket(type: number, payload: Uint8Array): Uint8Array {
  const length = payload.length;
  const packet = new Uint8Array(5 + length);
  
  // Write length as 4 bytes (big-endian)
  packet[0] = (length >> 24) & 0xFF;
  packet[1] = (length >> 16) & 0xFF;
  packet[2] = (length >> 8) & 0xFF;
  packet[3] = length & 0xFF;
  
  // Write type
  packet[4] = type;
  
  // Write payload
  packet.set(payload, 5);
  
  return packet;
}

/**
 * Parse binary packet from WSS
 */
export function parseBinaryPacket(data: Uint8Array): { type: number; payload: Uint8Array } | null {
  if (data.length < 5) return null;
  
  const length = (data[0] << 24) | (data[1] << 16) | (data[2] << 8) | data[3];
  const type = data[4];
  
  if (data.length < 5 + length) return null;
  
  return {
    type,
    payload: data.slice(5, 5 + length)
  };
}

// ==================== WSS MESSAGE TYPES ====================

export const WSSMessageType = {
  // Client → Server
  HANDSHAKE: 0x01,
  CHALLENGE_RESPONSE: 0x02,
  REQUEST_SCRIPT: 0x03,
  HEARTBEAT: 0x04,
  SECURITY_REPORT: 0x05,
  
  // Server → Client
  CHALLENGE: 0x10,
  AUTH_SUCCESS: 0x11,
  AUTH_FAIL: 0x12,
  SCRIPT_CHUNK: 0x20,
  SCRIPT_END: 0x21,
  KICK: 0x30,
  WARNING: 0x31,
  PONG: 0x40,
} as const;

// ==================== CHALLENGE-RESPONSE ====================

/**
 * Generate a random challenge for HMAC verification
 */
export function generateChallenge(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Generate expected response for a challenge
 */
export async function generateChallengeResponse(
  challenge: string,
  hmacKey: string,
  hwid: string,
  timestamp: number
): Promise<string> {
  const data = `${challenge}:${hwid}:${timestamp}`;
  const encoder = new TextEncoder();
  
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    encoder.encode(hmacKey),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  
  const signature = await crypto.subtle.sign(
    'HMAC',
    cryptoKey,
    encoder.encode(data)
  );
  
  return Array.from(new Uint8Array(signature))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Verify challenge response (timing-safe)
 */
export async function verifyChallengeResponse(
  challenge: string,
  response: string,
  hmacKey: string,
  hwid: string,
  timestamp: number,
  maxAge: number = 30000 // 30 seconds
): Promise<boolean> {
  // Check timestamp freshness
  const now = Date.now();
  if (Math.abs(now - timestamp) > maxAge) {
    return false;
  }
  
  const expected = await generateChallengeResponse(challenge, hmacKey, hwid, timestamp);
  
  // Timing-safe comparison
  if (expected.length !== response.length) return false;
  let result = 0;
  for (let i = 0; i < expected.length; i++) {
    result |= expected.charCodeAt(i) ^ response.charCodeAt(i);
  }
  return result === 0;
}

// ==================== SCRIPT CHUNKING ====================

/**
 * Split script into encrypted chunks for binary delivery
 * Each chunk is XOR encrypted with a derived key
 */
export function createEncryptedChunks(
  script: string,
  baseKey: string,
  chunkSize: number = 4096
): Uint8Array[] {
  const scriptBytes = stringToBytes(script);
  const chunks: Uint8Array[] = [];
  
  for (let i = 0; i < scriptBytes.length; i += chunkSize) {
    const end = Math.min(i + chunkSize, scriptBytes.length);
    const chunk = scriptBytes.slice(i, end);
    
    // Derive unique key for each chunk
    const chunkKey = `${baseKey}:chunk:${chunks.length}:${Date.now()}`;
    const encryptedChunk = xorBytes(chunk, chunkKey);
    
    // Create packet with chunk index header
    const header = new Uint8Array(4);
    header[0] = (chunks.length >> 8) & 0xFF;
    header[1] = chunks.length & 0xFF;
    header[2] = (end === scriptBytes.length) ? 1 : 0; // is_last flag
    header[3] = 0; // reserved
    
    const packet = new Uint8Array(header.length + encryptedChunk.length);
    packet.set(header);
    packet.set(encryptedChunk, header.length);
    
    chunks.push(packet);
  }
  
  return chunks;
}

// ==================== RATE LIMITING ====================

interface RateLimitEntry {
  count: number;
  windowStart: number;
}

const rateLimits = new Map<string, RateLimitEntry>();

/**
 * Check WSS message rate limit (30 messages per 10 seconds)
 */
export function checkMessageRateLimit(
  identifier: string,
  maxMessages: number = 30,
  windowMs: number = 10000
): { allowed: boolean; remaining: number } {
  const now = Date.now();
  let entry = rateLimits.get(identifier);
  
  // Clean up old entries periodically
  if (rateLimits.size > 10000) {
    for (const [key, val] of rateLimits) {
      if (now - val.windowStart > windowMs * 2) {
        rateLimits.delete(key);
      }
    }
  }
  
  if (!entry || now - entry.windowStart > windowMs) {
    entry = { count: 1, windowStart: now };
    rateLimits.set(identifier, entry);
    return { allowed: true, remaining: maxMessages - 1 };
  }
  
  if (entry.count >= maxMessages) {
    return { allowed: false, remaining: 0 };
  }
  
  entry.count++;
  return { allowed: true, remaining: maxMessages - entry.count };
}

// ==================== ANTI-DUPLICATE CONNECTION ====================

const recentConnections = new Map<string, number>();

/**
 * Check if this is a duplicate connection (same IP/Session within 5s)
 */
export function checkDuplicateConnection(
  identifier: string,
  cooldownMs: number = 5000
): boolean {
  const now = Date.now();
  const lastConnection = recentConnections.get(identifier);
  
  // Clean up old entries
  if (recentConnections.size > 5000) {
    for (const [key, timestamp] of recentConnections) {
      if (now - timestamp > cooldownMs * 2) {
        recentConnections.delete(key);
      }
    }
  }
  
  if (lastConnection && now - lastConnection < cooldownMs) {
    return true; // Duplicate
  }
  
  recentConnections.set(identifier, now);
  return false;
}

// ==================== LUA CODE GENERATORS ====================

/**
 * Generate Lua code for WSS client (minimal bootstrap)
 * This is the 5-line loader that connects via WebSocket
 */
export function generateWSSBootstrap(
  wssUrl: string,
  scriptId: string,
  sessionToken: string
): string {
  return `-- ShadowAuth WSS Bootstrap v1
local W = (syn and syn.websocket) or WebSocket
if not W then return error("[SA] WSS not supported") end
local s = W.connect("${wssUrl}?s=${scriptId}&t=${sessionToken}")
s.OnMessage:Connect(function(m) local f=loadstring(m) if f then f() end end)
s.OnClose:Wait()`;
}

/**
 * Generate Lua code for binary stream decryption
 */
export function generateBinaryDecoder(derivedKey: string): string {
  return `-- ShadowAuth Binary Decoder
local function _SA_DECODE(bytes, key)
  local r = {}
  for i = 1, #bytes do
    local kb = key:byte((i - 1) % #key + 1)
    local ps = ((i - 1) * 7 + 13) % 256
    r[i] = string.char(bit32.bxor(bit32.bxor(bytes[i], kb), ps))
  end
  return table.concat(r)
end
local _SA_KEY = "${derivedKey}"`;
}

/**
 * Generate complete WSS client with binary handling
 */
export function generateWSSClient(
  wssUrl: string,
  scriptId: string,
  sessionToken: string,
  hmacKey: string,
  challenge: string
): string {
  return `--[[
  ShadowAuth WSS Client v1 (Luarmor-identical)
  Binary stream + HMAC challenge-response
]]

local H = game:GetService("HttpService")
local Players = game:GetService("Players")
local P = Players.LocalPlayer

-- WSS connection
local W = (syn and syn.websocket) or WebSocket
if not W then
  return error("[ShadowAuth] WebSocket not supported by this executor")
end

local hw = (gethwid and gethwid()) or game:GetService("RbxAnalyticsService"):GetClientId():gsub("-","")
local ts = os.time() * 1000

-- HMAC challenge response
local function hmacSha256(key, data)
  -- Simplified HMAC for Lua (uses executor's crypto if available)
  if syn and syn.crypt and syn.crypt.hmac then
    return syn.crypt.hmac(data, key, "sha256")
  end
  -- Fallback: basic hash
  local h = 0
  for i = 1, #data do
    h = bit32.bxor(h * 31, data:byte(i))
    h = h % 2147483647
  end
  for i = 1, #key do
    h = bit32.bxor(h * 17, key:byte(i))
    h = h % 2147483647
  end
  local result = ""
  for i = 1, 64 do
    result = result .. string.format("%x", (h + i) % 16)
  end
  return result
end

local challenge = "${challenge}"
local hmacKey = "${hmacKey}"
local response = hmacSha256(hmacKey, challenge .. ":" .. hw .. ":" .. tostring(ts))

-- Connect to WSS
local url = "${wssUrl}?s=${scriptId}&t=${sessionToken}&r=" .. response .. "&ts=" .. tostring(ts) .. "&hw=" .. hw
local socket

local function connect()
  local ok, s = pcall(function()
    return W.connect(url)
  end)
  
  if not ok or not s then
    return error("[ShadowAuth] WSS connection failed")
  end
  
  socket = s
  
  -- Chunk buffer for binary reassembly
  local chunks = {}
  local expectedChunks = 0
  
  socket.OnMessage:Connect(function(msg)
    -- Parse binary packet
    local bytes = {}
    for i = 1, #msg do
      bytes[i] = msg:byte(i)
    end
    
    if #bytes < 5 then return end
    
    local pktLen = bit32.bor(
      bit32.lshift(bytes[1], 24),
      bit32.lshift(bytes[2], 16),
      bit32.lshift(bytes[3], 8),
      bytes[4]
    )
    local pktType = bytes[5]
    
    -- Script chunk (0x20)
    if pktType == 0x20 then
      local chunkIdx = bit32.bor(bit32.lshift(bytes[6], 8), bytes[7])
      local isLast = bytes[8] == 1
      
      local chunkData = {}
      for i = 10, #bytes do
        chunkData[#chunkData + 1] = bytes[i]
      end
      chunks[chunkIdx + 1] = chunkData
      
      if isLast then
        expectedChunks = chunkIdx + 1
      end
    
    -- Script end (0x21)
    elseif pktType == 0x21 then
      -- Reassemble and decrypt
      local fullData = {}
      for i = 1, expectedChunks do
        if chunks[i] then
          for _, b in ipairs(chunks[i]) do
            fullData[#fullData + 1] = b
          end
        end
      end
      
      -- XOR decrypt
      local key = response .. hw .. tostring(ts)
      local decrypted = {}
      for i = 1, #fullData do
        local kb = key:byte((i - 1) % #key + 1)
        local ps = ((i - 1) * 7 + 13) % 256
        decrypted[i] = string.char(bit32.bxor(bit32.bxor(fullData[i], kb), ps))
      end
      
      local code = table.concat(decrypted)
      local fn = (getrenv and getrenv().loadstring or loadstring)(code)
      if fn then
        pcall(fn)
      end
      
      socket:Close()
    
    -- Kick (0x30)
    elseif pktType == 0x30 then
      local reason = ""
      for i = 6, #bytes do
        reason = reason .. string.char(bytes[i])
      end
      socket:Close()
      error("[ShadowAuth] Kicked: " .. reason)
    
    -- Warning (0x31)
    elseif pktType == 0x31 then
      local msg = ""
      for i = 6, #bytes do
        msg = msg .. string.char(bytes[i])
      end
      warn("[ShadowAuth] Warning: " .. msg)
    end
  end)
  
  socket.OnClose:Connect(function()
    -- Connection closed
  end)
end

connect()`;
}
