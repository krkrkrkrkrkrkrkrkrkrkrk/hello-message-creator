import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-shadow-sig, x-shadow-token",
};

// Unauthorized HTML page (like Luarmor)
const unauthorizedHTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Unauthorized</title>
<style>
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;display:flex;justify-content:center;align-items:center;min-height:100vh;margin:0;background:#0a0a0a;color:#fff}
.container{text-align:center;padding:40px}
h1{font-size:72px;margin:0;color:#ef4444}
p{color:#888;margin-top:16px}
</style>
</head>
<body>
<div class="container">
<h1>401</h1>
<p>Unauthorized</p>
</div>
</body>
</html>`;

// In-memory token store (shared concept - in production use Redis/DB)
const tokenStore = new Map<string, { scriptId: string; hwid: string; ip: string; expires: number; used: boolean }>();

// Check if request is from a real Roblox executor
// Like Luarmor: ONLY allow known executors, block EVERYTHING else
function isFromExecutor(req: Request): { valid: boolean; execName?: string } {
  const ua = (req.headers.get("user-agent") || "").toLowerCase();
  const sig = req.headers.get("x-shadow-sig");
  
  // If has our signature header, allow
  if (sig === "ShadowAuth-Loader-v2") {
    return { valid: true, execName: "ShadowAuth" };
  }
  
  // Known Roblox executor patterns - ONLY these are allowed
  const executorPatterns = [
    { pattern: /synapse/i, name: "Synapse" },
    { pattern: /krnl/i, name: "KRNL" },
    { pattern: /script-?ware/i, name: "ScriptWare" },
    { pattern: /fluxus/i, name: "Fluxus" },
    { pattern: /electron/i, name: "Electron" },
    { pattern: /oxygen/i, name: "Oxygen" },
    { pattern: /sentinel/i, name: "Sentinel" },
    { pattern: /sirius/i, name: "Sirius" },
    { pattern: /valyse/i, name: "Valyse" },
    { pattern: /celery/i, name: "Celery" },
    { pattern: /arceus/i, name: "Arceus" },
    { pattern: /roblox/i, name: "Roblox" },
    { pattern: /comet/i, name: "Comet" },
    { pattern: /trigon/i, name: "Trigon" },
    { pattern: /delta/i, name: "Delta" },
    { pattern: /hydrogen/i, name: "Hydrogen" },
    { pattern: /evon/i, name: "Evon" },
    { pattern: /vegax/i, name: "VegaX" },
    { pattern: /jjsploit/i, name: "JJSploit" },
    { pattern: /nihon/i, name: "Nihon" },
    { pattern: /zorara/i, name: "Zorara" },
    { pattern: /macsploit/i, name: "Macsploit" },
    { pattern: /sirhurt/i, name: "SirHurt" },
    { pattern: /temple/i, name: "Temple" },
    { pattern: /codex/i, name: "Codex" },
    { pattern: /swift/i, name: "Swift" },
    { pattern: /awp/i, name: "AWP" },
    { pattern: /krampus/i, name: "Krampus" },
  ];
  
  for (const { pattern, name } of executorPatterns) {
    if (pattern.test(ua)) {
      return { valid: true, execName: name };
    }
  }
  
  // BLOCK EVERYTHING ELSE
  return { valid: false };
}

// Simple XOR encryption for runtime decryption
function encryptScript(script: string, key: string): string {
  let encrypted = '';
  for (let i = 0; i < script.length; i++) {
    encrypted += String.fromCharCode(script.charCodeAt(i) ^ key.charCodeAt(i % key.length));
  }
  return btoa(encrypted);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const clientIP = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || 
                   req.headers.get("cf-connecting-ip") || "unknown";

  // Block everything except Roblox executors - return Unauthorized HTML like Luarmor
  const execCheck = isFromExecutor(req);
  if (!execCheck.valid) {
    console.log("Blocked non-executor access from:", clientIP);
    return new Response(unauthorizedHTML, {
      status: 401,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabase = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const url = new URL(req.url);
    const pathParts = url.pathname.split('/').filter(Boolean);
    const scriptId = pathParts[pathParts.length - 1];
    const token = req.headers.get("x-shadow-token");

    if (!scriptId || scriptId === "get-script") {
      return new Response("Invalid request", { status: 400, headers: corsHeaders });
    }

    if (!token) {
      return new Response("Unauthorized", { status: 401, headers: corsHeaders });
    }

    // Validate token
    const tokenData = tokenStore.get(token);
    const now = Date.now();

    if (!tokenData) {
      console.log("Invalid token attempted");
      return new Response("Invalid token", { status: 401, headers: corsHeaders });
    }

    if (tokenData.used) {
      console.log("Token already used");
      tokenStore.delete(token);
      return new Response("Token expired", { status: 401, headers: corsHeaders });
    }

    if (now > tokenData.expires) {
      console.log("Token expired");
      tokenStore.delete(token);
      return new Response("Token expired", { status: 401, headers: corsHeaders });
    }

    if (tokenData.scriptId !== scriptId) {
      console.log("Token script mismatch");
      return new Response("Invalid token", { status: 401, headers: corsHeaders });
    }

    // Mark token as used (single-use)
    tokenData.used = true;
    tokenStore.delete(token);

    // Fetch script
    const { data: script, error } = await supabase
      .from("scripts")
      .select("content")
      .eq("id", scriptId)
      .maybeSingle();

    if (error || !script) {
      return new Response("Script not found", { status: 404, headers: corsHeaders });
    }

    // Encrypt the script content
    const encryptionKey = token.substring(0, 16);
    const encryptedContent = encryptScript(script.content, encryptionKey);

    // Return encrypted script with decryption loader
    const loader = `local e="${encryptedContent}"local k="${encryptionKey}"local function d(s,key)local r=""local b={}for i=1,#s do local c=s:sub(i,i)local n=0 if c>="A"and c<="Z"then n=c:byte()-65 elseif c>="a"and c<="z"then n=c:byte()-71 elseif c>="0"and c<="9"then n=c:byte()+4 elseif c=="+"then n=62 elseif c=="/"then n=63 end table.insert(b,n)end local o=""for i=1,#b,4 do local a,b,c,d=b[i]or 0,b[i+1]or 0,b[i+2]or 0,b[i+3]or 0 o=o..string.char(bit32.band(bit32.rshift(bit32.bor(bit32.lshift(a,18),bit32.lshift(b,12),bit32.lshift(c,6),d),16),255))o=o..string.char(bit32.band(bit32.rshift(bit32.bor(bit32.lshift(a,18),bit32.lshift(b,12),bit32.lshift(c,6),d),8),255))o=o..string.char(bit32.band(bit32.bor(bit32.lshift(a,18),bit32.lshift(b,12),bit32.lshift(c,6),d),255))end for i=1,#o do r=r..string.char(bit32.bxor(o:byte(i),key:byte((i-1)%#key+1)))end return r end loadstring(d(e,k))()`;

    console.log("Script delivered to:", clientIP);

    return new Response(loader, {
      headers: { ...corsHeaders, "Content-Type": "text/plain" },
    });

  } catch (error) {
    console.error("Error:", error);
    return new Response("Server error", { status: 500, headers: corsHeaders });
  }
});
