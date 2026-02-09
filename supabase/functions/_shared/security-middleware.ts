/**
 * Security Middleware for Edge Functions
 * Protects against request tampering, replay attacks, and abuse
 */

// Validate request timestamp (prevent replay attacks)
export const validateTimestamp = (timestamp: string | null): { valid: boolean; error?: string } => {
  if (!timestamp) {
    return { valid: false, error: 'Missing timestamp' };
  }

  const requestTime = parseInt(timestamp, 10);
  const now = Date.now();
  const maxAge = 30000; // 30 seconds

  if (isNaN(requestTime)) {
    return { valid: false, error: 'Invalid timestamp format' };
  }

  if (now - requestTime > maxAge) {
    return { valid: false, error: 'Request expired' };
  }

  if (requestTime > now + 5000) {
    return { valid: false, error: 'Request from future' };
  }

  return { valid: true };
};

// Validate request signature
export const validateSignature = (
  signature: string | null,
  payload: string,
  timestamp: string,
  fingerprint: string
): boolean => {
  if (!signature) return false;

  // Recreate the signature using the same algorithm as client
  const data = `${payload}:${timestamp}:${fingerprint}`;
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    const char = data.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }

  const expectedSignature = btoa(String(Math.abs(hash))).replace(/=/g, '');
  return signature === expectedSignature;
};

// Check for suspicious patterns in headers
export const detectSuspiciousHeaders = (headers: Headers): { suspicious: boolean; reasons: string[] } => {
  const reasons: string[] = [];

  // Check User-Agent
  const userAgent = headers.get('user-agent') || '';
  const suspiciousAgents = [
    'burp',
    'postman',
    'insomnia',
    'curl',
    'wget',
    'httpie',
    'python-requests',
    'java/',
    'okhttp',
  ];

  for (const agent of suspiciousAgents) {
    if (userAgent.toLowerCase().includes(agent)) {
      reasons.push(`Suspicious user-agent: ${agent}`);
    }
  }

  // Check for missing expected headers
  if (!headers.get('accept-language')) {
    reasons.push('Missing accept-language header');
  }

  if (!headers.get('sec-fetch-site')) {
    reasons.push('Missing sec-fetch headers');
  }

  // Check origin/referer
  const origin = headers.get('origin');
  const referer = headers.get('referer');

  if (!origin && !referer) {
    reasons.push('Missing origin and referer');
  }

  return {
    suspicious: reasons.length > 2, // Allow some missing headers
    reasons,
  };
};

// Rate limiting store (in-memory, consider Redis for production)
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

export const checkRateLimit = (
  identifier: string,
  maxRequests: number = 60,
  windowMs: number = 60000
): { allowed: boolean; remaining: number; resetAt: number } => {
  const now = Date.now();
  const record = rateLimitStore.get(identifier);

  if (!record || now > record.resetAt) {
    const resetAt = now + windowMs;
    rateLimitStore.set(identifier, { count: 1, resetAt });
    return { allowed: true, remaining: maxRequests - 1, resetAt };
  }

  if (record.count >= maxRequests) {
    return { allowed: false, remaining: 0, resetAt: record.resetAt };
  }

  record.count++;
  return { allowed: true, remaining: maxRequests - record.count, resetAt: record.resetAt };
};

// Nonce tracking to prevent replay
const usedNonces = new Set<string>();
const nonceCleanupInterval = 60000; // 1 minute

// Clean old nonces periodically
setInterval(() => {
  usedNonces.clear();
}, nonceCleanupInterval);

export const validateNonce = (nonce: string | null): boolean => {
  if (!nonce) return false;
  if (usedNonces.has(nonce)) return false;
  usedNonces.add(nonce);
  return true;
};

// IP reputation check (simplified)
const blockedIPs = new Set<string>();
const suspiciousIPs = new Map<string, number>();

export const checkIPReputation = (ip: string): { blocked: boolean; suspicious: boolean } => {
  if (blockedIPs.has(ip)) {
    return { blocked: true, suspicious: true };
  }

  const suspicionScore = suspiciousIPs.get(ip) || 0;
  return { blocked: false, suspicious: suspicionScore > 5 };
};

export const incrementSuspicion = (ip: string, amount: number = 1): void => {
  const current = suspiciousIPs.get(ip) || 0;
  const newScore = current + amount;
  
  if (newScore > 10) {
    blockedIPs.add(ip);
    suspiciousIPs.delete(ip);
  } else {
    suspiciousIPs.set(ip, newScore);
  }
};

// Main security check function
export const performSecurityCheck = (req: Request): {
  passed: boolean;
  error?: string;
  warnings: string[];
} => {
  const warnings: string[] = [];
  const headers = req.headers;

  // 1. Timestamp validation
  const timestamp = headers.get('x-request-timestamp');
  const timestampCheck = validateTimestamp(timestamp);
  if (!timestampCheck.valid) {
    return { passed: false, error: timestampCheck.error, warnings };
  }

  // 2. Nonce validation (prevent replay)
  const nonce = headers.get('x-request-nonce');
  if (nonce && !validateNonce(nonce)) {
    return { passed: false, error: 'Duplicate request detected', warnings };
  }

  // 3. Check for suspicious headers
  const headerCheck = detectSuspiciousHeaders(headers);
  if (headerCheck.suspicious) {
    warnings.push(...headerCheck.reasons);
    // Don't block, but log for monitoring
  }

  // 4. Check request source
  const source = headers.get('x-request-source');
  if (source !== 'shadowauth-client') {
    warnings.push('Unknown request source');
  }

  // 5. Rate limiting by IP
  const ip = headers.get('x-forwarded-for')?.split(',')[0] || 
             headers.get('cf-connecting-ip') || 
             'unknown';
  
  const rateLimit = checkRateLimit(ip);
  if (!rateLimit.allowed) {
    return { passed: false, error: 'Rate limit exceeded', warnings };
  }

  // 6. IP reputation
  const ipCheck = checkIPReputation(ip);
  if (ipCheck.blocked) {
    return { passed: false, error: 'Access denied', warnings };
  }
  if (ipCheck.suspicious) {
    warnings.push('Suspicious IP detected');
  }

  return { passed: true, warnings };
};

// CORS headers with security
export const getSecureCorsHeaders = (origin: string | null): Record<string, string> => {
  const allowedOrigins = [
    'https://secure-lua-gateway.lovable.app',
    'https://id-preview--a2405488-7a3c-4552-bc2f-f5f1863a3997.lovable.app',
  ];

  // In development, allow localhost
  if (origin?.includes('localhost') || origin?.includes('127.0.0.1')) {
    allowedOrigins.push(origin);
  }

  const isAllowed = origin && allowedOrigins.some(allowed => origin.startsWith(allowed.replace('https://', '')));

  return {
    'Access-Control-Allow-Origin': isAllowed ? origin! : allowedOrigins[0],
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Request-Timestamp, X-Request-Nonce, X-Request-Signature, X-Client-Fingerprint, X-Request-Source',
    'Access-Control-Max-Age': '86400',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
  };
};

// Generate response signature
export const generateResponseSignature = (): Record<string, string> => {
  const timestamp = Date.now().toString();
  const signature = btoa(timestamp).substring(0, 16);
  
  return {
    'X-Response-Timestamp': timestamp,
    'X-Response-Signature': signature,
  };
};
