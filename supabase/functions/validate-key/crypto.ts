// =====================================================
// CRYPTOGRAPHIC UTILITIES - LUASHIELD STYLE
// =====================================================

// SHA-512 hash (stronger than SHA-256)
export async function sha512(input: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const hashBuffer = await crypto.subtle.digest('SHA-512', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// SHA-256 hash
export async function sha256(input: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// HMAC-SHA256 signing
export async function hmacSign(data: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(data));
  return btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

// HMAC-SHA256 verification
export async function hmacVerify(data: string, signature: string, secret: string): Promise<boolean> {
  const expected = await hmacSign(data, secret);
  return expected === signature;
}

// Generate secure random token
export function randomToken(length: number = 50): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  const randomValues = new Uint32Array(length);
  crypto.getRandomValues(randomValues);
  for (let i = 0; i < length; i++) {
    result += chars[randomValues[i] % chars.length];
  }
  return result;
}

// XOR encode string (for watermarks)
export function xorEncode(str: string, key: number): number[] {
  const nums: number[] = [];
  for (let i = 0; i < str.length; i++) {
    nums.push(str.charCodeAt(i) ^ ((key + i * 7) % 256));
  }
  return nums;
}

// Multi-layer XOR encryption with position-based transformation
export function xorEncrypt(data: string, key: string): string {
  const result: number[] = [];
  for (let i = 0; i < data.length; i++) {
    const keyByte = key.charCodeAt(i % key.length);
    const posByte = (i * 7 + 13) % 256;
    result.push(data.charCodeAt(i) ^ keyByte ^ posByte);
  }
  return btoa(String.fromCharCode(...result));
}

// Multi-layer XOR decryption
export function xorDecrypt(encryptedBase64: string, key: string): string {
  try {
    const encrypted = atob(encryptedBase64);
    let result = '';
    for (let i = 0; i < encrypted.length; i++) {
      const keyByte = key.charCodeAt(i % key.length);
      const posByte = (i * 7 + 13) % 256;
      result += String.fromCharCode(encrypted.charCodeAt(i) ^ keyByte ^ posByte);
    }
    return result;
  } catch {
    return '';
  }
}

// Generate salt for key derivation (HWID-based)
export function generateDerivationSalt(keyId: string, hwid: string, timestamp: number): string {
  const combined = `${keyId}:${hwid}:${timestamp}:shadowauth_v3`;
  let hash = 0;
  for (let i = 0; i < combined.length; i++) {
    hash = ((hash << 5) - hash) + combined.charCodeAt(i);
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36) + crypto.randomUUID().replace(/-/g, '').substring(0, 16);
}

// Derive encryption key from salt + hwid + session
export function deriveEncryptionKey(salt: string, hwid: string, sessionKey: string, timestamp: number): string {
  const source = `${salt}${hwid}${sessionKey}${timestamp}`;
  let hash = 0;
  for (let i = 0; i < source.length; i++) {
    hash = ((hash * 31) ^ source.charCodeAt(i)) >>> 0;
    hash = hash % 2147483647;
  }
  
  // Generate 32-char key from hash seed
  let key = '';
  let seed = hash;
  for (let i = 0; i < 32; i++) {
    seed = ((seed * 1103515245 + 12345) ^ seed) >>> 0;
    key += String.fromCharCode((seed % 95) + 32);
  }
  return key;
}

// Hash HWID with salt
export async function hashHWID(hwid: string): Promise<string> {
  return sha256(hwid + 'shadowauth_v7');
}

// Encode JSON with optional encryption
export function encodeJSON(data: object, encryptKey?: string): string {
  const json = JSON.stringify(data);
  if (encryptKey) {
    return xorEncrypt(json, encryptKey);
  }
  return json;
}

// Decode JSON with optional decryption
export function decodeJSON<T = any>(data: string, decryptKey?: string): T | null {
  try {
    let json = data;
    if (decryptKey) {
      json = xorDecrypt(data, decryptKey);
    }
    return JSON.parse(json);
  } catch {
    return null;
  }
}

// Watermark with key ID for leak detection
export function createWatermark(keyId: string): string {
  const seed = Date.now() % 100000;
  const wmData = xorEncode(`WM:${keyId}:${Date.now()}`, seed);
  return `--[[${wmData.join(',')}]]`;
}

// Simple obfuscation with watermark
export function obfuscateLua(code: string, keyId: string): string {
  const watermark = createWatermark(keyId);
  
  return `${watermark}
local _ok,_err=pcall(function()
${code}
end)
if not _ok then warn("[SA]",_err)end`;
}
