/**
 * SHADOWAUTH - CHUNK ENCRYPTION
 * ===============================
 * Luarmor-style splitIntoEncryptedChunks with AES per-chunk
 * Plus HMAC-SHA256 signatures with timing-safe comparison
 */

// =====================================================
// TIMING-SAFE COMPARISON (Prevents timing attacks)
// =====================================================

export function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    // Still do comparison to prevent timing leak
    let result = 0;
    for (let i = 0; i < Math.max(a.length, b.length); i++) {
      result |= (a.charCodeAt(i % a.length) || 0) ^ (b.charCodeAt(i % b.length) || 0);
    }
    return false;
  }
  
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

export function timingSafeEqualBytes(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) {
    let result = 0;
    for (let i = 0; i < Math.max(a.length, b.length); i++) {
      result |= (a[i % a.length] || 0) ^ (b[i % b.length] || 0);
    }
    return false;
  }
  
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a[i] ^ b[i];
  }
  return result === 0;
}

// =====================================================
// HMAC-SHA256 SIGNATURES
// =====================================================

export async function generateHMAC(key: string, data: string): Promise<string> {
  const encoder = new TextEncoder();
  
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    encoder.encode(key),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  
  const signature = await crypto.subtle.sign(
    "HMAC",
    cryptoKey,
    encoder.encode(data)
  );
  
  return arrayBufferToHex(signature);
}

export async function verifyHMAC(key: string, data: string, expectedSig: string): Promise<boolean> {
  const actualSig = await generateHMAC(key, data);
  return timingSafeEqual(actualSig, expectedSig);
}

// Sign a script with HMAC-SHA256
export async function signScript(
  scriptContent: string,
  secretKey: string,
  metadata: {
    scriptId: string;
    timestamp: number;
    hwid?: string;
  }
): Promise<{ signature: string; signedData: string }> {
  const signedData = JSON.stringify({
    content_hash: await sha256(scriptContent),
    script_id: metadata.scriptId,
    timestamp: metadata.timestamp,
    hwid: metadata.hwid || '',
  });
  
  const signature = await generateHMAC(secretKey, signedData);
  
  return { signature, signedData };
}

export async function verifyScriptSignature(
  scriptContent: string,
  signature: string,
  secretKey: string,
  metadata: {
    scriptId: string;
    timestamp: number;
    hwid?: string;
  }
): Promise<boolean> {
  const signedData = JSON.stringify({
    content_hash: await sha256(scriptContent),
    script_id: metadata.scriptId,
    timestamp: metadata.timestamp,
    hwid: metadata.hwid || '',
  });
  
  return verifyHMAC(secretKey, signedData, signature);
}

// =====================================================
// CHUNK ENCRYPTION (AES-256-GCM per chunk)
// =====================================================

export interface EncryptedChunk {
  index: number;
  iv: string;
  data: string;
  tag: string; // Auth tag for integrity
  size: number;
}

export interface ChunkedScript {
  chunks: EncryptedChunk[];
  totalChunks: number;
  signature: string;
  salt: string;
  timestamp: number;
}

// PBKDF2 key derivation
async function deriveChunkKey(
  password: string,
  salt: string,
  chunkIndex: number
): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  
  // Add chunk index to salt for per-chunk key derivation
  const chunkSalt = salt + ':chunk:' + chunkIndex;
  
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    encoder.encode(password),
    "PBKDF2",
    false,
    ["deriveKey"]
  );
  
  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: encoder.encode(chunkSalt),
      iterations: 100000,
      hash: "SHA-256"
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

// Split script into encrypted chunks
export async function splitIntoEncryptedChunks(
  scriptContent: string,
  password: string,
  chunkSize: number = 4096 // 4KB chunks
): Promise<ChunkedScript> {
  const salt = generateSecureToken(32);
  const timestamp = Date.now();
  const chunks: EncryptedChunk[] = [];
  
  // Add padding to script to obscure actual size
  const paddedContent = scriptContent + generatePadding(1024);
  
  // Split into chunks
  const chunkCount = Math.ceil(paddedContent.length / chunkSize);
  
  for (let i = 0; i < chunkCount; i++) {
    const start = i * chunkSize;
    const end = Math.min(start + chunkSize, paddedContent.length);
    const chunkData = paddedContent.slice(start, end);
    
    // Derive unique key for this chunk
    const chunkKey = await deriveChunkKey(password, salt, i);
    
    // Generate random IV for each chunk
    const iv = crypto.getRandomValues(new Uint8Array(12));
    
    // Encrypt chunk with AES-256-GCM
    const encoder = new TextEncoder();
    const encrypted = await crypto.subtle.encrypt(
      { name: "AES-GCM", iv },
      chunkKey,
      encoder.encode(chunkData)
    );
    
    // GCM mode includes auth tag in the output
    const encryptedArray = new Uint8Array(encrypted);
    const ciphertext = encryptedArray.slice(0, -16);
    const authTag = encryptedArray.slice(-16);
    
    chunks.push({
      index: i,
      iv: arrayBufferToBase64(iv),
      data: arrayBufferToBase64(ciphertext),
      tag: arrayBufferToBase64(authTag),
      size: chunkData.length,
    });
  }
  
  // Generate signature for the entire chunked data
  const chunkHashes = await Promise.all(
    chunks.map(c => sha256(c.data))
  );
  const signature = await generateHMAC(password, chunkHashes.join(':'));
  
  return {
    chunks,
    totalChunks: chunks.length,
    signature,
    salt,
    timestamp,
  };
}

// Decrypt a single chunk
export async function decryptChunk(
  chunk: EncryptedChunk,
  password: string,
  salt: string
): Promise<string> {
  const chunkKey = await deriveChunkKey(password, salt, chunk.index);
  
  const iv = base64ToArrayBuffer(chunk.iv);
  const ciphertext = base64ToArrayBuffer(chunk.data);
  const authTag = base64ToArrayBuffer(chunk.tag);
  
  // Combine ciphertext and auth tag for GCM decryption
  const combined = new Uint8Array(ciphertext.byteLength + authTag.byteLength);
  combined.set(new Uint8Array(ciphertext), 0);
  combined.set(new Uint8Array(authTag), ciphertext.byteLength);
  
  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: new Uint8Array(iv) },
    chunkKey,
    combined
  );
  
  return new TextDecoder().decode(decrypted);
}

// Verify chunked script integrity
export async function verifyChunkedScript(
  chunkedScript: ChunkedScript,
  password: string
): Promise<boolean> {
  const chunkHashes = await Promise.all(
    chunkedScript.chunks.map(c => sha256(c.data))
  );
  const expectedSignature = await generateHMAC(password, chunkHashes.join(':'));
  
  return timingSafeEqual(chunkedScript.signature, expectedSignature);
}

// =====================================================
// ESCAPE SEQUENCES (Luarmor-style \136\158\166...)
// =====================================================

export function encodeAsEscapeSequences(str: string): string {
  let result = '';
  for (let i = 0; i < str.length; i++) {
    const code = str.charCodeAt(i);
    result += '\\' + code.toString();
  }
  return result;
}

export function decodeEscapeSequences(escaped: string): string {
  return escaped.replace(/\\(\d+)/g, (_, code) => String.fromCharCode(parseInt(code, 10)));
}

// Generate Lua code that decodes escape sequences
export function generateEscapeDecoder(escapedData: string, varName: string = '_decoded'): string {
  return `
local ${varName} = ""
local _esc = "${escapedData}"
for code in string.gmatch(_esc, "\\\\(%d+)") do
  ${varName} = ${varName} .. string.char(tonumber(code))
end
`;
}

// =====================================================
// HELPER FUNCTIONS
// =====================================================

async function sha256(data: string): Promise<string> {
  const encoder = new TextEncoder();
  const hashBuffer = await crypto.subtle.digest("SHA-256", encoder.encode(data));
  return arrayBufferToHex(hashBuffer);
}

function arrayBufferToHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

function arrayBufferToBase64(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

function generateSecureToken(length: number): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const randomValues = new Uint8Array(length);
  crypto.getRandomValues(randomValues);
  return Array.from(randomValues).map(v => chars[v % chars.length]).join('');
}

function generatePadding(maxSize: number): string {
  const size = Math.floor(Math.random() * maxSize) + 100;
  const padding = new Uint8Array(size);
  crypto.getRandomValues(padding);
  return '\n--[[' + arrayBufferToBase64(padding) + ']]';
}

// =====================================================
// LUA CHUNK DECRYPTOR GENERATOR
// =====================================================

export function generateLuaChunkDecryptor(chunkedScript: ChunkedScript, password: string): string {
  // Generate Lua code that can decrypt chunks client-side
  // Note: This is a simplified version for Roblox executors
  
  const chunksJson = JSON.stringify(chunkedScript.chunks.map(c => ({
    i: c.index,
    d: c.data,
    iv: c.iv,
  })));
  
  return `
-- ShadowAuth Chunk Decryptor
local H = game:GetService("HttpService")
local chunks = H:JSONDecode('${chunksJson}')
local salt = "${chunkedScript.salt}"
local password = "${password}"

local function b64d(s)
  local alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/"
  local decTable = {}
  for i = 1, 64 do decTable[alphabet:sub(i,i)] = i - 1 end
  
  local decoded = {}
  for i = 1, #s, 4 do
    local a = decTable[s:sub(i,i)] or 0
    local b = decTable[s:sub(i+1,i+1)] or 0
    local c = decTable[s:sub(i+2,i+2)] or 0
    local d = decTable[s:sub(i+3,i+3)] or 0
    local n = a * 262144 + b * 4096 + c * 64 + d
    table.insert(decoded, string.char(bit32.band(bit32.rshift(n, 16), 255)))
    if s:sub(i+2,i+2) ~= "=" then table.insert(decoded, string.char(bit32.band(bit32.rshift(n, 8), 255))) end
    if s:sub(i+3,i+3) ~= "=" then table.insert(decoded, string.char(bit32.band(n, 255))) end
  end
  return table.concat(decoded)
end

local function deriveKey(pw, sl, idx)
  local key = pw .. sl .. tostring(idx)
  local h = 0
  for i = 1, #key do
    h = bit32.bxor(h * 31, string.byte(key, i))
    h = h % 2147483647
  end
  local derived = ""
  local s = h
  for _ = 1, 32 do
    s = bit32.bxor(s * 1103515245 + 12345, s)
    derived = derived .. string.char((s % 95) + 32)
  end
  return derived
end

local function xorDecrypt(data, key)
  local result = {}
  for i = 1, #data do
    local keyByte = key:byte((i - 1) % #key + 1)
    result[i] = string.char(bit32.bxor(data:byte(i), keyByte))
  end
  return table.concat(result)
end

local decryptedScript = ""
for _, chunk in ipairs(chunks) do
  local key = deriveKey(password, salt, chunk.i)
  local data = b64d(chunk.d)
  local decrypted = xorDecrypt(data, key)
  decryptedScript = decryptedScript .. decrypted
end

local fn = loadstring(decryptedScript)
if fn then fn() end
`;
}
