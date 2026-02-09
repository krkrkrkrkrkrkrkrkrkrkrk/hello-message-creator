/**
 * Binary Stream Delivery (Luarmor-identical)
 * 
 * Delivers scripts as encrypted byte streams instead of JSON
 * This bypasses common executor hooks that intercept JSON responses
 * 
 * Format:
 * - Header: [4 bytes length][2 bytes version][2 bytes flags]
 * - Chunks: [2 bytes index][2 bytes size][N bytes encrypted data]
 * - Footer: [4 bytes checksum][4 bytes total_size]
 */

// Binary protocol version
export const BINARY_VERSION = 0x0102; // v1.2

// Flags
export const FLAG_ENCRYPTED = 0x01;
export const FLAG_COMPRESSED = 0x02;
export const FLAG_CHUNKED = 0x04;
export const FLAG_SIGNED = 0x08;

/**
 * XOR encrypt bytes with position-based salt (Luarmor pattern)
 */
export function xorEncryptBytes(
  data: Uint8Array,
  key: string,
  salt?: string
): Uint8Array {
  const result = new Uint8Array(data.length);
  const keyBytes = new TextEncoder().encode(key);
  const saltBytes = salt ? new TextEncoder().encode(salt) : new Uint8Array(0);
  
  for (let i = 0; i < data.length; i++) {
    const keyByte = keyBytes[i % keyBytes.length];
    const saltByte = saltBytes.length > 0 ? saltBytes[i % saltBytes.length] : 0;
    const posSalt = ((i * 7 + 13) % 256);
    
    result[i] = data[i] ^ keyByte ^ posSalt ^ saltByte;
  }
  
  return result;
}

/**
 * Create binary header
 */
export function createBinaryHeader(
  totalSize: number,
  flags: number = FLAG_ENCRYPTED | FLAG_CHUNKED
): Uint8Array {
  const header = new Uint8Array(8);
  
  // Total size (4 bytes, big-endian)
  header[0] = (totalSize >> 24) & 0xFF;
  header[1] = (totalSize >> 16) & 0xFF;
  header[2] = (totalSize >> 8) & 0xFF;
  header[3] = totalSize & 0xFF;
  
  // Version (2 bytes)
  header[4] = (BINARY_VERSION >> 8) & 0xFF;
  header[5] = BINARY_VERSION & 0xFF;
  
  // Flags (2 bytes)
  header[6] = (flags >> 8) & 0xFF;
  header[7] = flags & 0xFF;
  
  return header;
}

/**
 * Create a binary chunk
 */
export function createBinaryChunk(
  index: number,
  data: Uint8Array,
  isLast: boolean = false
): Uint8Array {
  const chunk = new Uint8Array(4 + data.length);
  
  // Chunk index (2 bytes)
  chunk[0] = (index >> 8) & 0xFF;
  chunk[1] = index & 0xFF;
  
  // Chunk size with last flag (2 bytes, high bit = isLast)
  const size = data.length | (isLast ? 0x8000 : 0);
  chunk[2] = (size >> 8) & 0xFF;
  chunk[3] = size & 0xFF;
  
  // Data
  chunk.set(data, 4);
  
  return chunk;
}

/**
 * Create binary footer with checksum
 */
export function createBinaryFooter(totalSize: number, checksum: number): Uint8Array {
  const footer = new Uint8Array(8);
  
  // Checksum (4 bytes)
  footer[0] = (checksum >> 24) & 0xFF;
  footer[1] = (checksum >> 16) & 0xFF;
  footer[2] = (checksum >> 8) & 0xFF;
  footer[3] = checksum & 0xFF;
  
  // Total size confirmation (4 bytes)
  footer[4] = (totalSize >> 24) & 0xFF;
  footer[5] = (totalSize >> 16) & 0xFF;
  footer[6] = (totalSize >> 8) & 0xFF;
  footer[7] = totalSize & 0xFF;
  
  return footer;
}

/**
 * Calculate simple checksum
 */
export function calculateChecksum(data: Uint8Array): number {
  let checksum = 0;
  for (let i = 0; i < data.length; i++) {
    checksum = ((checksum * 31) + data[i]) >>> 0;
    checksum = checksum & 0x7FFFFFFF;
  }
  return checksum;
}

/**
 * Create complete binary stream from script content
 */
export function createBinaryStream(
  script: string,
  encryptionKey: string,
  salt: string,
  chunkSize: number = 4096
): Uint8Array {
  // Encode script to bytes
  const scriptBytes = new TextEncoder().encode(script);
  
  // Encrypt
  const encrypted = xorEncryptBytes(scriptBytes, encryptionKey, salt);
  
  // Calculate total chunks
  const chunkCount = Math.ceil(encrypted.length / chunkSize);
  
  // Create header
  const header = createBinaryHeader(encrypted.length, FLAG_ENCRYPTED | FLAG_CHUNKED);
  
  // Create chunks
  const chunks: Uint8Array[] = [];
  for (let i = 0; i < chunkCount; i++) {
    const start = i * chunkSize;
    const end = Math.min(start + chunkSize, encrypted.length);
    const chunkData = encrypted.slice(start, end);
    const isLast = i === chunkCount - 1;
    
    chunks.push(createBinaryChunk(i, chunkData, isLast));
  }
  
  // Calculate checksum of original data
  const checksum = calculateChecksum(scriptBytes);
  
  // Create footer
  const footer = createBinaryFooter(encrypted.length, checksum);
  
  // Combine all parts
  const totalLength = header.length + 
    chunks.reduce((sum, c) => sum + c.length, 0) + 
    footer.length;
  
  const result = new Uint8Array(totalLength);
  let offset = 0;
  
  result.set(header, offset);
  offset += header.length;
  
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }
  
  result.set(footer, offset);
  
  return result;
}

/**
 * Convert Uint8Array to base64 for HTTP transport
 */
export function uint8ArrayToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Generate Lua decoder for binary stream
 */
export function generateBinaryDecoder(encryptionKey: string, salt: string): string {
  return `-- Binary Stream Decoder
local function _SA_B64DECODE(data)
  local b = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
  data = string.gsub(data, '[^'..b..'=]', '')
  return (data:gsub('.', function(x)
    if x == '=' then return '' end
    local r, f = '', (b:find(x) - 1)
    for i = 6, 1, -1 do r = r .. (f % 2^i - f % 2^(i-1) > 0 and '1' or '0') end
    return r
  end):gsub('%d%d%d%d%d%d%d%d', function(x)
    local c = 0
    for i = 1, 8 do c = c + (x:sub(i, i) == '1' and 2^(8-i) or 0) end
    return string.char(c)
  end))
end

local function _SA_XOR_DECRYPT(data, key, salt)
  local result = {}
  for i = 1, #data do
    local keyByte = string.byte(key, ((i - 1) % #key) + 1)
    local saltByte = salt and string.byte(salt, ((i - 1) % #salt) + 1) or 0
    local posSalt = ((i - 1) * 7 + 13) % 256
    result[i] = string.char(bit32.bxor(bit32.bxor(bit32.bxor(string.byte(data, i), keyByte), posSalt), saltByte))
  end
  return table.concat(result)
end

local function _SA_PARSE_BINARY(raw)
  local bytes = {}
  for i = 1, #raw do bytes[i] = string.byte(raw, i) end
  
  if #bytes < 16 then return nil, "Invalid binary stream" end
  
  -- Parse header (8 bytes)
  local totalSize = bit32.bor(
    bit32.lshift(bytes[1], 24),
    bit32.lshift(bytes[2], 16),
    bit32.lshift(bytes[3], 8),
    bytes[4]
  )
  local version = bit32.bor(bit32.lshift(bytes[5], 8), bytes[6])
  local flags = bit32.bor(bit32.lshift(bytes[7], 8), bytes[8])
  
  -- Parse chunks
  local offset = 9
  local chunks = {}
  
  while offset <= #bytes - 8 do
    local chunkIdx = bit32.bor(bit32.lshift(bytes[offset], 8), bytes[offset + 1])
    local sizeAndFlag = bit32.bor(bit32.lshift(bytes[offset + 2], 8), bytes[offset + 3])
    local isLast = bit32.band(sizeAndFlag, 0x8000) ~= 0
    local chunkSize = bit32.band(sizeAndFlag, 0x7FFF)
    
    offset = offset + 4
    
    local chunkData = {}
    for i = 1, chunkSize do
      chunkData[i] = string.char(bytes[offset + i - 1])
    end
    chunks[chunkIdx + 1] = table.concat(chunkData)
    
    offset = offset + chunkSize
    
    if isLast then break end
  end
  
  -- Reassemble
  local encrypted = table.concat(chunks)
  
  -- Decrypt
  local decrypted = _SA_XOR_DECRYPT(encrypted, "${encryptionKey}", "${salt}")
  
  return decrypted
end

local _SA_KEY = "${encryptionKey}"
local _SA_SALT = "${salt}"`;
}

/**
 * Generate simple binary stream response
 * For cases where we want single-response binary
 */
export function createSimpleBinaryPayload(
  script: string,
  key: string
): { payload: string; decoder: string } {
  const salt = crypto.randomUUID().replace(/-/g, '').substring(0, 16);
  const stream = createBinaryStream(script, key, salt);
  const payload = uint8ArrayToBase64(stream);
  const decoder = generateBinaryDecoder(key, salt);
  
  return { payload, decoder };
}
