// =====================================================
// LUASHIELD-STYLE SECURITY ENHANCEMENTS
// =====================================================

// Blacklist em memória - bloqueio instantâneo sem DB query
const BlacklistedIPs = new Set<string>();
const BlacklistedHWIDs = new Set<string>();

// Tracepath validation - sequência obrigatória de endpoints
// Previne replay attacks e requisições fora de ordem
const TracepathStore = new Map<string, {
  version?: boolean;
  info?: boolean;
  endpoints?: boolean;
  flags?: boolean;
  validate?: boolean;
  lastActivity: number;
}>();

// JSX Token - token de sessão com rotação de 15s
// Similar ao LuaShield's WhitelistJSXToken
const SessionTokens = new Map<string, {
  token: string;
  timestamp: number;
  scriptId: string;
  hwid: string;
  ip: string;
  webhookToken: string;
  rotationCount: number;
  requestHash?: string;
}>();

// WebSocket connection tokens (para anti-replay)
const WebsocketTokens = new Map<string, {
  token: string;
  ip: string;
  timestamp: number;
}>();

// Used request hashes - previne replay de requests idênticos
const UsedRequestHashes = new Set<string>();

// =====================================================
// SECURITY FUNCTIONS
// =====================================================

export function isBlacklisted(ip: string, hwid?: string): boolean {
  if (BlacklistedIPs.has(ip)) return true;
  if (hwid && BlacklistedHWIDs.has(hwid)) return true;
  return false;
}

export function addToBlacklist(ip: string, hwid?: string): void {
  BlacklistedIPs.add(ip);
  if (hwid) BlacklistedHWIDs.add(hwid);
  console.log(`BLACKLISTED: IP=${ip}, HWID=${hwid || "none"}`);
}

export function removeFromBlacklist(ip: string, hwid?: string): void {
  BlacklistedIPs.delete(ip);
  if (hwid) BlacklistedHWIDs.delete(hwid);
}

// =====================================================
// TRACEPATH VALIDATION
// Força sequência: version -> info -> endpoints -> flags -> validate
// =====================================================

export function initTracepath(hwid: string): void {
  TracepathStore.set(hwid, { 
    version: true, 
    lastActivity: Date.now() 
  });
}

export function checkTracepath(hwid: string, step: string): boolean {
  const trace = TracepathStore.get(hwid);
  if (!trace) return false;
  
  const stepOrder = ['version', 'info', 'endpoints', 'flags', 'validate'];
  const currentStepIndex = stepOrder.indexOf(step);
  
  if (currentStepIndex === -1) return false;
  
  // Verifica se o passo anterior foi completado
  if (currentStepIndex > 0) {
    const previousStep = stepOrder[currentStepIndex - 1];
    if (!(trace as Record<string, any>)[previousStep]) return false;
  }
  
  return true;
}

export function advanceTracepath(hwid: string, step: string): void {
  const trace = TracepathStore.get(hwid) || { lastActivity: Date.now() };
  (trace as any)[step] = true;
  trace.lastActivity = Date.now();
  TracepathStore.set(hwid, trace);
}

export function clearTracepath(hwid: string): void {
  TracepathStore.delete(hwid);
}

// =====================================================
// JSX TOKEN SYSTEM (15s TTL + Rotation)
// Similar ao LuaShield
// =====================================================

export function generateSessionToken(
  ip: string, 
  scriptId: string, 
  hwid: string
): { token: string; webhookToken: string } {
  const token = generateSecureToken(64);
  const webhookToken = generateSecureToken(50);
  
  SessionTokens.set(ip, {
    token,
    timestamp: Date.now(),
    scriptId,
    hwid,
    ip,
    webhookToken,
    rotationCount: 0
  });
  
  return { token, webhookToken };
}

export function validateSessionToken(ip: string, token: string, scriptId: string): boolean {
  const session = SessionTokens.get(ip);
  if (!session) return false;
  
  // Token expirado (15 segundos)
  if (Date.now() - session.timestamp > 15000) {
    SessionTokens.delete(ip);
    return false;
  }
  
  // Validar token e script
  if (session.token !== token || session.scriptId !== scriptId) {
    return false;
  }
  
  return true;
}

export function rotateSessionToken(ip: string): string | null {
  const session = SessionTokens.get(ip);
  if (!session) return null;
  
  // Gera novo token
  const newToken = generateSecureToken(64);
  session.token = newToken;
  session.timestamp = Date.now();
  session.rotationCount++;
  
  SessionTokens.set(ip, session);
  return newToken;
}

export function getSessionData(ip: string): typeof SessionTokens extends Map<string, infer V> ? V | undefined : never {
  return SessionTokens.get(ip);
}

export function deleteSession(ip: string): void {
  SessionTokens.delete(ip);
}

// =====================================================
// REQUEST HASH VALIDATION
// Previne replay de requests idênticos
// =====================================================

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

export function validateRequestHash(hash: string): boolean {
  // Verifica se o hash já foi usado
  if (UsedRequestHashes.has(hash)) {
    return false; // Replay attack detectado
  }
  
  // Marca como usado
  UsedRequestHashes.add(hash);
  return true;
}

export function verifyRequestHash(
  receivedHash: string,
  key: string, 
  scriptId: string, 
  hwid: string, 
  timestamp: number,
  nonce: string
): boolean {
  const expectedHash = generateRequestHash(key, scriptId, hwid, timestamp, nonce);
  return receivedHash === expectedHash;
}

// =====================================================
// WEBSOCKET TOKEN (Anti-replay adicional)
// =====================================================

export function setWebsocketToken(ip: string, token: string): void {
  WebsocketTokens.set(ip === "::1" ? "127.0.0.1" : ip, {
    token,
    ip,
    timestamp: Date.now()
  });
}

export function getWebsocketToken(ip: string): string | undefined {
  const data = WebsocketTokens.get(ip === "::1" ? "127.0.0.1" : ip);
  return data?.token;
}

export function validateWebsocketToken(ip: string, receivedToken: string): boolean {
  const stored = WebsocketTokens.get(ip === "::1" ? "127.0.0.1" : ip);
  if (!stored) return false;
  
  // Token expira em 60 segundos
  if (Date.now() - stored.timestamp > 60000) {
    WebsocketTokens.delete(ip === "::1" ? "127.0.0.1" : ip);
    return false;
  }
  
  return stored.token === receivedToken;
}

export function clearWebsocketToken(ip: string): void {
  WebsocketTokens.delete(ip === "::1" ? "127.0.0.1" : ip);
}

// =====================================================
// FLAG GENERATION (Anti-tamper verification)
// =====================================================

export function generateFlag(): { fingerprint: string; numberId: number; reqId: string } {
  const fingerprint = generateSecureToken(32);
  const numberId = Math.floor(Math.random() * 99999999);
  const reqId = generateSecureToken(24);
  
  return { fingerprint, numberId, reqId };
}

export function verifyFlag(fingerprint: string, numberId: number): boolean {
  // Validação básica de formato
  if (!fingerprint || fingerprint.length !== 32) return false;
  if (typeof numberId !== 'number' || numberId < 0) return false;
  return true;
}

// =====================================================
// HELPERS
// =====================================================

function generateSecureToken(length: number): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export function hashString(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
}

// =====================================================
// CLEANUP - Executar periodicamente
// =====================================================

export function cleanupExpiredSessions(): void {
  const now = Date.now();
  
  // Limpa sessões expiradas (15s)
  for (const [ip, session] of SessionTokens.entries()) {
    if (now - session.timestamp > 15000) {
      SessionTokens.delete(ip);
    }
  }
  
  // Limpa tracepaths inativos (60s)
  for (const [hwid, trace] of TracepathStore.entries()) {
    if (now - trace.lastActivity > 60000) {
      TracepathStore.delete(hwid);
    }
  }
  
  // Limpa websocket tokens expirados (60s)
  for (const [ip, data] of WebsocketTokens.entries()) {
    if (now - data.timestamp > 60000) {
      WebsocketTokens.delete(ip);
    }
  }
  
  // Limpa request hashes antigos (a cada hora, limpa tudo para evitar memory leak)
  // Em produção real, usaria um bloom filter ou Redis com TTL
  if (UsedRequestHashes.size > 100000) {
    UsedRequestHashes.clear();
  }
}

// Executa cleanup a cada 5 segundos
setInterval(cleanupExpiredSessions, 5000);
