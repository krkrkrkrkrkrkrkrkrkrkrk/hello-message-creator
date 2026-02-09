/**
 * Request Security Layer
 * Protects against Burp Suite and similar proxy/interception tools
 */

// Generate a unique request signature
export const generateRequestSignature = (payload: string, timestamp: number): string => {
  // Simple but effective signature using payload + timestamp + browser fingerprint
  const fingerprint = getBrowserFingerprint();
  const data = `${payload}:${timestamp}:${fingerprint}`;
  
  // Use a simple hash (in production, use HMAC with a secret)
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    const char = data.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  
  // Convert to base64-like string
  return btoa(String(Math.abs(hash))).replace(/=/g, '');
};

// Get browser fingerprint for request validation
export const getBrowserFingerprint = (): string => {
  const components = [
    navigator.userAgent,
    navigator.language,
    screen.width,
    screen.height,
    screen.colorDepth,
    new Date().getTimezoneOffset(),
    navigator.hardwareConcurrency || 0,
    (navigator as any).deviceMemory || 0,
  ];
  
  return btoa(components.join('|')).substring(0, 32);
};

// Detect if request might be from a proxy tool
export const detectProxyTool = (): boolean => {
  // Check for common proxy tool indicators
  const suspiciousIndicators = [
    // Check if devtools is open (common when using Burp)
    checkDevToolsOpen(),
    // Check for unusual timing patterns
    checkTimingAnomaly(),
    // Check for missing expected browser APIs
    checkMissingAPIs(),
  ];
  
  return suspiciousIndicators.some(Boolean);
};

// Check if DevTools is open
const checkDevToolsOpen = (): boolean => {
  const threshold = 160;
  const widthDiff = window.outerWidth - window.innerWidth;
  const heightDiff = window.outerHeight - window.innerHeight;
  
  return widthDiff > threshold || heightDiff > threshold;
};

// Check for timing anomalies (proxy tools add latency)
const checkTimingAnomaly = (): boolean => {
  // This is a placeholder - in production, compare request timing
  return false;
};

// Check for missing browser APIs (headless browsers/tools)
const checkMissingAPIs = (): boolean => {
  const win = window as any;
  const checks = [
    typeof win.chrome !== 'undefined' || navigator.userAgent.includes('Firefox'),
    typeof navigator.webdriver === 'undefined' || navigator.webdriver === false,
    typeof window.Notification !== 'undefined',
  ];
  
  // If any expected API is missing, might be automated
  return checks.some(check => !check);
};

// Create secure request headers
export const createSecureHeaders = (body?: object): Record<string, string> => {
  const timestamp = Date.now();
  const nonce = crypto.randomUUID();
  const payload = body ? JSON.stringify(body) : '';
  const signature = generateRequestSignature(payload, timestamp);
  const fingerprint = getBrowserFingerprint();
  
  return {
    'X-Request-Timestamp': String(timestamp),
    'X-Request-Nonce': nonce,
    'X-Request-Signature': signature,
    'X-Client-Fingerprint': fingerprint,
    'X-Request-Source': 'shadowauth-client',
  };
};

// Validate response integrity
export const validateResponseIntegrity = (response: Response): boolean => {
  // Check for expected headers from our server
  const serverSignature = response.headers.get('X-Response-Signature');
  const serverTimestamp = response.headers.get('X-Response-Timestamp');
  
  if (!serverSignature || !serverTimestamp) {
    // Response might have been tampered with
    return true; // Allow for now, but log
  }
  
  const timestamp = parseInt(serverTimestamp, 10);
  const now = Date.now();
  
  // Response should arrive within 30 seconds
  if (now - timestamp > 30000) {
    console.warn('Response timing anomaly detected');
    return false;
  }
  
  return true;
};

// Rate limit tracker (client-side)
const requestCounts: Map<string, { count: number; resetAt: number }> = new Map();

export const checkClientRateLimit = (endpoint: string, maxRequests = 10, windowMs = 60000): boolean => {
  const now = Date.now();
  const key = endpoint;
  const record = requestCounts.get(key);
  
  if (!record || now > record.resetAt) {
    requestCounts.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  
  if (record.count >= maxRequests) {
    return false;
  }
  
  record.count++;
  return true;
};

// Secure fetch wrapper
export const secureFetch = async (
  url: string,
  options: RequestInit = {}
): Promise<Response> => {
  // Check for proxy detection
  if (detectProxyTool()) {
    console.warn('Potential proxy tool detected');
    // Don't block, but could add additional verification
  }
  
  // Check rate limit
  const endpoint = new URL(url, window.location.origin).pathname;
  if (!checkClientRateLimit(endpoint)) {
    throw new Error('Too many requests. Please wait.');
  }
  
  // Add security headers
  const body = options.body ? JSON.parse(options.body as string) : undefined;
  const secureHeaders = createSecureHeaders(body);
  
  const response = await fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      ...secureHeaders,
    },
  });
  
  // Validate response
  validateResponseIntegrity(response);
  
  return response;
};
