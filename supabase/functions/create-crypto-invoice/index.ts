import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-request-timestamp, x-request-nonce, x-request-signature, x-client-fingerprint, x-request-source",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREATE-CRYPTO-INVOICE] ${step}${detailsStr}`);
};

// Security: Rate limiting
const rateLimit = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(ip: string, max = 5, windowMs = 60000): boolean {
  const now = Date.now();
  const record = rateLimit.get(ip);
  
  if (!record || now > record.resetAt) {
    rateLimit.set(ip, { count: 1, resetAt: now + windowMs });
    return true;
  }
  
  if (record.count >= max) return false;
  record.count++;
  return true;
}

// Security: Validate timestamp to prevent replay attacks
function validateTimestamp(ts: string | null): boolean {
  if (!ts) return true; // Backwards compatibility
  const timestamp = parseInt(ts, 10);
  const now = Date.now();
  return !isNaN(timestamp) && Math.abs(now - timestamp) < 30000;
}

// Security: Detect suspicious user agents (Burp, Postman, etc)
function isSuspiciousUserAgent(ua: string): boolean {
  const suspicious = ['burp', 'postman', 'insomnia', 'curl', 'wget', 'httpie', 'python-requests', 'java/', 'okhttp'];
  const lower = ua.toLowerCase();
  return suspicious.some(s => lower.includes(s));
}

// Security: Nonce tracking to prevent replay attacks
const usedNonces = new Set<string>();
setInterval(() => usedNonces.clear(), 60000); // Clear every minute

function validateNonce(nonce: string | null): boolean {
  if (!nonce) return true; // Backwards compatibility
  if (usedNonces.has(nonce)) return false;
  usedNonces.add(nonce);
  return true;
}

// Enhanced disposable email detection
const DISPOSABLE_EMAIL_DOMAINS = [
  'tempmail.com', 'temp-mail.org', 'guerrillamail.com', 'guerrillamail.org',
  '10minutemail.com', '10minutemail.net', 'mailinator.com', 'maildrop.cc',
  'throwaway.email', 'trashmail.com', 'trashmail.net', 'fakeinbox.com',
  'tempinbox.com', 'getnada.com', 'mohmal.com', 'sharklasers.com',
  'spam4.me', 'grr.la', 'yopmail.com', 'yopmail.fr', 'tempail.com',
  'emailondeck.com', 'dispostable.com', 'mailnesia.com', 'mailcatch.com',
  'throwawaymail.com', 'mintemail.com', 'tempmailaddress.com', 'burnermail.io',
  'getairmail.com', 'tmpmail.org', 'tmpmail.net', 'email-fake.com',
  'fakemailgenerator.com', 'generator.email', 'mailsac.com', 'inboxalias.com',
  'tempr.email', 'discard.email', 'discardmail.com', 'spamgourmet.com',
  'mailexpire.com', 'mailmoat.com', 'mt2015.com', 'nada.email', 'pookmail.com',
  'binkmail.com', 'bobmail.info', 'chammy.info', 'devnullmail.com', 'letthemeatspam.com',
  'maildx.com', 'mailnull.com', 'meltmail.com', 'mytrashmail.com', 'nomail.xl.cx',
  'spamavert.com', 'spambox.us', 'spamcero.com', 'spamex.com', 'spamfree24.org',
  'spamspot.com', 'spamthis.co.uk', 'tempemail.net', 'trash-mail.at', 'trashmail.me',
  'wegwerfmail.de', 'wegwerfmail.net', 'wegwerfmail.org', 'mailtemp.info', 'tmpbox.net',
  'mail-temp.com', 'tempmailer.com', 'mailforspam.com', 'guerrillamailblock.com',
  'cock.li', 'waifu.club', 'tfwno.gf', '420blaze.it', 'aaathats3as.com',
  'disposableemailaddresses.com', 'disposableaddress.com', 'emailsensei.com',
  'fakemail.fr', 'filzmail.com', 'getonemail.com', 'guerrillamail.biz',
  'guerrillamail.de', 'guerrillamail.net', 'harakirimail.com', 'imstations.com',
  'jetable.org', 'kasmail.com', 'klzlv.com', 'kurzepost.de', 'lifebyfood.com',
  'lolito.tk', 'lookugly.com', 'lortemail.dk', 'mailcatch.com', 'mailde.de',
  'maileater.com', 'mailfreeonline.com', 'mailimate.com', 'mailmetrash.com',
  'mailshell.com', 'mailsiphon.com', 'mailzilla.com', 'mbx.cc', 'mega.zik.dj',
  'meinspamschutz.de', 'moncourrier.fr.nf', 'monemail.fr.nf', 'monmail.fr.nf',
  'nobulk.com', 'noclickemail.com', 'nogmailspam.info', 'nomail.pw', 'nomail.xl.cx',
  'nomorespamemails.com', 'nospam.ze.tc', 'nospamfor.us', 'nowmymail.com',
  'objectmail.com', 'obobbo.com', 'odnorazovoe.ru', 'oopi.org', 'ordinaryamerican.net',
  'pjjkp.com', 'proxymail.eu', 'quickinbox.com', 'rcpt.at', 'reallymymail.com',
  'recode.me', 'recursor.net', 'regbypass.com', 'rejectmail.com', 'rhyta.com',
  'rklips.com', 's0ny.net', 'safe-mail.net', 'safersignup.de', 'safetymail.info',
  'safetypost.de', 'saynotospams.com', 'selfdestructingmail.com', 'shitmail.me',
  'shortmail.net', 'sinnlos-mail.de', 'siteposter.net', 'slopsbox.com', 'smellfear.com',
  'snakemail.com', 'sogetthis.com', 'soodomail.com', 'soodonims.com', 'spambob.com'
];

function validateEmail(email: string): { valid: boolean; error?: string } {
  // Basic format validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { valid: false, error: "Invalid email format" };
  }

  const domain = email.split('@')[1].toLowerCase();
  
  // Check common typos
  const typoPatterns: Record<string, string[]> = {
    'gmail.com': ['gmial.com', 'gmal.com', 'gmaill.com', 'gamil.com', 'gmali.com', 'gnail.com', 'gmail.co', 'gmail.cm'],
    'yahoo.com': ['yaho.com', 'yahooo.com', 'yhoo.com', 'yhaoo.com', 'yahoo.co', 'yahoo.cm'],
    'hotmail.com': ['hotmal.com', 'hotmial.com', 'hotmaill.com', 'hotmali.com', 'hotmail.co'],
    'outlook.com': ['outlok.com', 'outllok.com', 'outlookk.com', 'outlook.co'],
    'icloud.com': ['iclould.com', 'icoud.com', 'iclooud.com', 'icloud.co']
  };

  for (const [correct, typos] of Object.entries(typoPatterns)) {
    if (typos.includes(domain)) {
      return { valid: false, error: `Did you mean @${correct}?` };
    }
  }

  // Check disposable domains
  if (DISPOSABLE_EMAIL_DOMAINS.includes(domain)) {
    return { valid: false, error: "Temporary/disposable email addresses are not allowed" };
  }

  // Check suspicious patterns
  const localPart = email.split('@')[0];
  
  // Random long strings (likely generated)
  if (/^[a-z0-9]{20,}$/i.test(localPart)) {
    return { valid: false, error: "Please use a valid personal email address" };
  }

  // Only numbers
  if (/^\d+$/.test(localPart)) {
    return { valid: false, error: "Please use a valid personal email address" };
  }

  // Too short
  if (localPart.length < 3) {
    return { valid: false, error: "Email address is too short" };
  }

  // Check TLD
  const tld = domain.split('.').pop() || '';
  if (tld.length < 2) {
    return { valid: false, error: "Invalid email domain" };
  }

  // Suspicious TLDs often used for disposable emails
  const suspiciousTLDs = ['tk', 'ml', 'ga', 'cf', 'gq', 'xyz', 'top', 'click', 'link', 'work'];
  if (suspiciousTLDs.includes(tld) && !['google.com', 'microsoft.com'].some(d => domain.endsWith(d))) {
    logStep("Suspicious TLD detected", { domain, tld });
  }

  return { valid: true };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const clientIP = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || 
                   req.headers.get("cf-connecting-ip") || "unknown";
  const userAgent = req.headers.get("user-agent") || "";

  // Security: Rate limiting (stricter for payment endpoints)
  if (!checkRateLimit(clientIP, 5, 60000)) {
    logStep("Rate limited", { ip: clientIP });
    return new Response(JSON.stringify({ error: "Too many requests. Please try again later." }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 429,
    });
  }

  // Security: Block suspicious user agents
  if (isSuspiciousUserAgent(userAgent)) {
    logStep("Suspicious UA blocked", { ua: userAgent.substring(0, 50) });
    return new Response(JSON.stringify({ error: "Access denied" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 403,
    });
  }

  // Security: Validate timestamp
  const timestamp = req.headers.get("x-request-timestamp");
  if (!validateTimestamp(timestamp)) {
    logStep("Invalid timestamp", { timestamp });
    return new Response(JSON.stringify({ error: "Request expired" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }

  // Security: Validate nonce (prevent replay)
  const nonce = req.headers.get("x-request-nonce");
  if (!validateNonce(nonce)) {
    logStep("Duplicate nonce detected", { nonce });
    return new Response(JSON.stringify({ error: "Duplicate request" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  try {
    logStep("Function started");

    const body = await req.json();
    const { price_amount, plan_name, email, days, marketplace_product_id, is_marketplace } = body;
    logStep("Received request", { price_amount, plan_name, email, days, is_marketplace, marketplace_product_id });

    if (!price_amount || price_amount <= 0) {
      throw new Error("Valid price amount is required");
    }

    if (!email) {
      throw new Error("Email is required");
    }

    // Validate email
    const emailValidation = validateEmail(email);
    if (!emailValidation.valid) {
      throw new Error(emailValidation.error || "Invalid email");
    }

    const apiKey = Deno.env.get("NOWPAYMENTS_API_KEY");
    if (!apiKey) {
      throw new Error("Payment gateway not configured");
    }

    // Generate unique order ID
    const orderPrefix = is_marketplace ? "MP" : "SL";
    const orderId = `${orderPrefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
    
    // Get published URL for callbacks
    const baseUrl = "https://secure-lua-gateway.lovable.app";
    const successUrl = is_marketplace 
      ? `${baseUrl}/payment/pending?order_id=${orderId}&type=marketplace&product=${marketplace_product_id}`
      : `${baseUrl}/payment/pending?order_id=${orderId}`;
    const cancelUrl = is_marketplace ? `${baseUrl}/marketplace` : `${baseUrl}/pricing`;
    const ipnCallback = `${Deno.env.get("SUPABASE_URL")}/functions/v1/crypto-webhook`;

    const orderDescription = is_marketplace 
      ? `ShadowAuth Marketplace - ${plan_name}`
      : `ShadowAuth ${plan_name} Plan - ${days} days`;

    // Create invoice via NOWPayments API
    const invoiceResponse = await fetch("https://api.nowpayments.io/v1/invoice", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        price_amount: price_amount,
        price_currency: "usd",
        order_id: orderId,
        order_description: orderDescription,
        ipn_callback_url: ipnCallback,
        success_url: successUrl,
        cancel_url: cancelUrl,
        is_fixed_rate: true,
        is_fee_paid_by_user: false,
      }),
    });

    if (!invoiceResponse.ok) {
      const errorData = await invoiceResponse.text();
      logStep("NOWPayments API error", { status: invoiceResponse.status, error: errorData });
      throw new Error(`Payment gateway error: ${invoiceResponse.status}`);
    }

    const invoiceData = await invoiceResponse.json();
    logStep("Invoice created", { invoiceId: invoiceData.id, invoiceUrl: invoiceData.invoice_url });

    // Store payment record in database
    const { error: insertError } = await supabaseClient
      .from("crypto_payments")
      .insert({
        order_id: orderId,
        invoice_id: invoiceData.id,
        user_email: email,
        plan_name: plan_name,
        amount: price_amount,
        duration_days: is_marketplace ? 0 : days,
        status: "pending",
      });

    if (insertError) {
      logStep("Database insert error", { error: insertError.message });
      throw new Error("Failed to create payment record");
    }

    return new Response(JSON.stringify({ 
      invoice_url: invoiceData.invoice_url,
      invoice_id: invoiceData.id,
      order_id: orderId,
      redirect_url: successUrl,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
