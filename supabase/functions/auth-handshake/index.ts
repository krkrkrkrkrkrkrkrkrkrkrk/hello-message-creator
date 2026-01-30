import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-shadow-sig, x-shadow-hwid",
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

// In-memory token store (tokens expire quickly)
const tokenStore = new Map<string, { scriptId: string; hwid: string; ip: string; expires: number; used: boolean }>();

// Clean expired tokens periodically
setInterval(() => {
  const now = Date.now();
  for (const [token, data] of tokenStore.entries()) {
    if (now > data.expires || data.used) {
      tokenStore.delete(token);
    }
  }
}, 10000);

function generateToken(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let token = '';
  for (let i = 0; i < 64; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}

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
      headers: { "Content-Type": "text/html; charset=utf-8" } 
    });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const body = await req.json();
    const { key, script_id, hwid } = body;

    if (!key || !script_id) {
      return new Response(JSON.stringify({ success: false, error: "Missing parameters" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Validate script exists
    const { data: script } = await supabase
      .from("scripts")
      .select("id, name")
      .eq("id", script_id)
      .maybeSingle();

    if (!script) {
      return new Response(JSON.stringify({ success: false, error: "Invalid script" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Validate key
    const { data: keyData } = await supabase
      .from("script_keys")
      .select("*")
      .eq("key_value", key)
      .eq("script_id", script_id)
      .maybeSingle();

    if (!keyData) {
      return new Response(JSON.stringify({ success: false, error: "Invalid key" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    if (keyData.is_banned) {
      return new Response(JSON.stringify({ success: false, error: "Key banned" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    if (keyData.expires_at && new Date(keyData.expires_at) < new Date()) {
      return new Response(JSON.stringify({ success: false, error: "Key expired" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // HWID validation
    if (keyData.hwid && hwid && keyData.hwid !== hwid) {
      return new Response(JSON.stringify({ success: false, error: "HWID mismatch" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Lock HWID on first use
    if (hwid && !keyData.hwid) {
      await supabase.from("script_keys").update({ hwid }).eq("id", keyData.id);
    }

    // Generate single-use token (expires in 30 seconds)
    const token = generateToken();
    tokenStore.set(token, {
      scriptId: script_id,
      hwid: hwid || "",
      ip: clientIP,
      expires: Date.now() + 30000,
      used: false
    });

    // Update key usage
    await supabase.from("script_keys").update({
      used_at: new Date().toISOString(),
      execution_count: (keyData.execution_count || 0) + 1
    }).eq("id", keyData.id);

    // Log execution
    await supabase.from("script_executions").insert({
      script_id,
      key_id: keyData.id,
      hwid: hwid || null,
      executor_ip: clientIP,
    });

    console.log("Token generated for script:", script_id, "IP:", clientIP);

    return new Response(JSON.stringify({ 
      success: true, 
      token,
      script_name: script.name,
      expires_at: keyData.expires_at,
      discord_id: keyData.discord_id
    }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (error) {
    console.error("Handshake error:", error);
    return new Response(JSON.stringify({ success: false, error: "Server error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});

// Export token store for the get-script function
export { tokenStore };
