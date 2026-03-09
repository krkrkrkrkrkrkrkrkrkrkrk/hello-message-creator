import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.2";
import {
  generateAntiHookCode,
  generateSafeLoadstring,
  generateEscapeSequences,
  generateCompactAntiEnvCheck,
  generateLuarmorStyleAntiEnvLog,
  generateTutorialStateHWID,
  generateFunctionHoneypots,
  generateTimeWindowGuard,
  generateExecutorIdentification,
  generateKickHandler,
  generateHeartbeatCounter,
  generateLCGRandom,
  generateRecursionDepthTest,
  generateRequestMetatableTrap,
  generateTostringComparison,
  generateGetfenvMonitor,
  generateCustomEncoding,
  generateTableIntegrityCheck,
  generateStackDepthAntiDebug,
  generateCrashFunction,
  generateWebSocketClient,
} from "../_shared/anti-hook-detection.ts";
import { splitIntoEncryptedChunks, signScript, encodeAsEscapeSequences, timingSafeEqual } from "../_shared/chunk-encryption.ts";
import { checkRateLimit, isBlacklisted, addToBlacklist } from "../_shared/deno-kv-store.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-shadow-sig, x-shadow-key, x-shadow-hwid",
  "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
  "Pragma": "no-cache",
};

// Browser "no access" page
const unauthorizedHTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Access Denied</title>
  <style>
    :root{--bg1:#0a0a0f;--bg2:#0d1117;--bg3:#151922;--card:#12161ccc;--border:#2a344180;--muted:#8b949e;--muted2:#6e7681;--muted3:#484f58;--blue:#3b82f6;--blue2:#2563eb;--red:#ef4444;--white:#fff}
    *{box-sizing:border-box}
    body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:16px;color:var(--white);font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Inter,sans-serif;background:linear-gradient(135deg,var(--bg1),var(--bg2),var(--bg3));overflow:hidden}
    .glow{position:fixed;inset:0;pointer-events:none;display:flex;align-items:center;justify-content:center}
    .glow::before{content:"";width:600px;height:600px;border-radius:9999px;background:rgba(59,130,246,.06);filter:blur(60px)}
    .card{position:relative;width:100%;max-width:440px;background:var(--card);backdrop-filter:blur(18px);border:1px solid var(--border);border-radius:16px;box-shadow:0 30px 80px rgba(0,0,0,.55)}
    .content{padding:32px;text-align:center}
    .badge{display:inline-flex;align-items:center;gap:8px;padding:8px 14px;border-radius:9999px;background:rgba(239,68,68,.10);border:1px solid rgba(239,68,68,.20);margin-bottom:22px}
    .badge span{font-size:12px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:rgba(248,113,113,1)}
    h1{margin:0 0 10px;font-size:22px;line-height:1.25;font-weight:800}
    .sub{margin:0 0 14px;color:var(--muted);font-size:13px}
    .desc{margin:0 0 26px;color:var(--muted2);font-size:12px;line-height:1.55}
    .actions{display:flex;flex-direction:column;gap:10px;justify-content:center}
    @media(min-width:560px){.actions{flex-direction:row}}
    .btn{display:inline-flex;align-items:center;justify-content:center;gap:10px;padding:10px 14px;border-radius:10px;text-decoration:none;font-weight:650;font-size:13px;transition:transform .15s,box-shadow .15s,background .15s;user-select:none;white-space:nowrap}
    .btn:active{transform:translateY(1px)}
    .btn-outline{background:#1c2128;border:1px solid rgba(42,52,65,1);color:#c9d1d9}
    .btn-outline:hover{background:#262c36;border-color:#3a4451;color:#fff}
    .btn-primary{background:linear-gradient(90deg,var(--blue2),var(--blue));border:0;color:#fff;box-shadow:0 10px 30px rgba(59,130,246,.20)}
    .btn-primary:hover{box-shadow:0 10px 30px rgba(59,130,246,.30);filter:brightness(1.05)}
    .footer{margin-top:26px;padding-top:18px;border-top:1px solid rgba(42,52,65,.55);color:var(--muted3);font-size:10px;letter-spacing:.18em;text-transform:uppercase}
    .footer b{color:rgba(96,165,250,1)}
    svg{width:16px;height:16px;flex:0 0 16px}
  </style>
</head>
<body>
  <div class="glow" aria-hidden="true"></div>
  <main class="card" role="main">
    <div class="content">
      <div class="badge">
        <svg viewBox="0 0 24 24" fill="none"><path d="M12 2 4 5.5V11c0 5.25 3.5 9.5 8 11 4.5-1.5 8-5.75 8-11V5.5L12 2Z" stroke="rgba(248,113,113,1)" stroke-width="1.8"/><path d="M9 9l6 6M15 9l-6 6" stroke="rgba(248,113,113,1)" stroke-width="1.8" stroke-linecap="round"/></svg>
        <span>Access Denied</span>
      </div>
      <h1>This content is protected by ShadowAuth</h1>
      <p class="sub">You don't have permission to access this content.</p>
      <p class="desc">This content is protected by ShadowAuth. You cannot see the text in the browser.</p>
      <div class="actions">
        <a class="btn btn-outline" href="/"><svg viewBox="0 0 24 24" fill="none"><path d="M3 11.5 12 4l9 7.5V20a1.5 1.5 0 0 1-1.5 1.5H4.5A1.5 1.5 0 0 1 3 20v-8.5Z" stroke="rgba(201,209,217,1)" stroke-width="1.8" stroke-linejoin="round"/><path d="M9.5 21.5v-7h5v7" stroke="rgba(201,209,217,1)" stroke-width="1.8" stroke-linecap="round"/></svg>Return Home</a>
        <a class="btn btn-primary" href="/support"><svg viewBox="0 0 24 24" fill="none"><path d="M21 11.5c0 4.14-4.03 7.5-9 7.5a11.2 11.2 0 0 1-3.9-.69L3 20l1.42-3.02A6.6 6.6 0 0 1 3 11.5C3 7.36 7.03 4 12 4s9 3.36 9 7.5Z" stroke="#fff" stroke-width="1.8" stroke-linejoin="round"/><path d="M8 11.5h.01M12 11.5h.01M16 11.5h.01" stroke="#fff" stroke-width="2.2" stroke-linecap="round"/></svg>Contact ShadowAuth</a>
      </div>
      <div class="footer">Protected by <b>ShadowAuth</b> • Licensed Security</div>
    </div>
  </main>
</body>
</html>`;

function wantsHtml(req: Request): boolean {
  const accept = (req.headers.get("accept") || "").toLowerCase();
  const ua = (req.headers.get("user-agent") || "").toLowerCase();
  const secFetchDest = (req.headers.get("sec-fetch-dest") || "").toLowerCase();
  if (secFetchDest === "document") return true;
  if (accept.includes("text/html")) return true;
  if (/\bmozilla\b|\bchrome\b|\bsafari\b|\bedg\b|\bfirefox\b/.test(ua)) return true;
  return false;
}

function unauthorizedResponse(req: Request): Response {
  if (wantsHtml(req)) {
    return new Response(unauthorizedHTML, {
      status: 200,
      headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" }
    });
  }
  return new Response("Unauthorized", { status: 401, headers: { ...corsHeaders, "Content-Type": "text/plain" } });
}

function isExecutor(ua: string): boolean {
  const p = [/synapse/i,/krnl/i,/fluxus/i,/electron/i,/oxygen/i,/sentinel/i,/celery/i,/arceus/i,/roblox/i,/comet/i,/trigon/i,/delta/i,/hydrogen/i,/evon/i,/vegax/i,/jjsploit/i,/nihon/i,/zorara/i,/solara/i,/wave/i,/script-?ware/i,/wininet/i,/winhttp/i,/httpget/i,/exploiter/i,/macsploit/i,/calamari/i,/sirhurt/i,/protosmasher/i,/xeno/i,/codex/i,/nezur/i,/ro-?exec/i];
  return p.some(r => r.test(ua));
}

function isLikelyExecutorRequest(req: Request): boolean {
  const accept = (req.headers.get("accept") || "").toLowerCase();
  const secFetchDest = (req.headers.get("sec-fetch-dest") || "").toLowerCase();
  if (!accept || accept === "*/*" || accept === "") {
    if (secFetchDest !== "document" && !accept.includes("text/html")) return true;
  }
  return false;
}

const loaderCache = new Map<string, { code: string; timestamp: number }>();
const LOADER_VERSION = "18.0.0";
const ENABLE_LURAPH = true;
const LURAPH_API_URL = "https://api.lura.ph/v1";

function base64EncodeScript(str: string): string {
  const encoder = new TextEncoder();
  const bytes = encoder.encode(str);
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

class LuraphClient {
  private apiKey: string;
  constructor(apiKey: string) { this.apiKey = apiKey; }

  private async request(endpoint: string, options: RequestInit = {}): Promise<Response> {
    const headers = new Headers(options.headers || {});
    headers.set('Luraph-API-Key', this.apiKey);
    headers.set('Content-Type', 'application/json');
    return fetch(`${LURAPH_API_URL}${endpoint}`, { ...options, headers });
  }

  async obfuscate(script: string, fileName: string = 'loader.lua'): Promise<string> {
    const nodesResp = await this.request('/obfuscate/nodes');
    if (!nodesResp.ok) throw new Error(`Luraph nodes error: ${nodesResp.status}`);
    const nodes = await nodesResp.json();
    const nodeId = nodes.recommendedId;
    if (!nodeId) throw new Error('No Luraph nodes');

    const submitResp = await this.request('/obfuscate/new', {
      method: 'POST',
      body: JSON.stringify({
        fileName, node: nodeId,
        script: base64EncodeScript(script),
        options: {
          TARGET_VERSION: "Luau", DISABLE_LINE_INFORMATION: true,
          CONSTANT_ENCRYPTION: true, CONTROL_FLOW: true,
          VM_ENCRYPTION: true, STRING_ENCRYPTION: true,
        },
        enforceSettings: false,
      }),
    });
    if (!submitResp.ok) throw new Error(`Luraph submit: ${await submitResp.text()}`);
    const { jobId } = await submitResp.json();

    const start = Date.now();
    while (Date.now() - start < 90000) {
      const status = await this.request(`/obfuscate/status/${jobId}`);
      if (status.ok) break;
      await new Promise(r => setTimeout(r, 2000));
    }

    const dlResp = await this.request(`/obfuscate/download/${jobId}`);
    if (!dlResp.ok) throw new Error(`Luraph download: ${dlResp.status}`);
    return dlResp.text();
  }
}

async function obfuscateWithLuraph(code: string, layerName: string): Promise<string> {
  const key = Deno.env.get("LURAPH_API_KEY");
  if (!key || !ENABLE_LURAPH) return code;
  try {
    console.log(`Luraph: ${layerName}...`);
    const result = await new LuraphClient(key).obfuscate(code, `${layerName}.lua`);
    console.log(`Luraph: ${layerName} OK`);
    return result;
  } catch (err) {
    console.error(`Luraph failed ${layerName}:`, err);
    return code;
  }
}

function generateRandomVarName(length: number = 8): string {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ_';
  const nums = '0123456789';
  let result = chars[Math.floor(Math.random() * chars.length)];
  for (let i = 1; i < length; i++) result += (chars + nums)[Math.floor(Math.random() * (chars.length + nums.length))];
  return result;
}

function generateSalt(scriptId: string, clientIP: string): string {
  const combined = `${scriptId}:${clientIP}:${Date.now()}:shadowauth_v${LOADER_VERSION}`;
  let hash = 0;
  for (let i = 0; i < combined.length; i++) {
    hash = ((hash << 5) - hash) + combined.charCodeAt(i);
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36) + crypto.randomUUID().replace(/-/g, '').substring(0, 16);
}

async function generateScriptHash(content: string): Promise<string> {
  const data = new TextEncoder().encode(content);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, "0")).join("").substring(0, 32);
}

function generateBinaryDataBlob(): { escapedKey: string; escapedSalt: string; signature: string } {
  const keyBytes: number[] = [];
  for (let i = 0; i < 21; i++) keyBytes.push(Math.floor(Math.random() * 200) + 32);
  const saltBytes: number[] = [];
  for (let i = 0; i < 24; i++) saltBytes.push(Math.floor(Math.random() * 200) + 32);
  const sigChars = 'ABCDEFRL0123456789._-';
  let signature = '';
  for (let i = 0; i < 80; i++) signature += sigChars[Math.floor(Math.random() * sigChars.length)];
  return {
    escapedKey: keyBytes.map(b => `\\${b}`).join(''),
    escapedSalt: saltBytes.map(b => `\\${b}`).join(''),
    signature,
  };
}

// =====================================================
// LAYER 1: Ultra-Compact Bootstrap (Luarmor-identical ~4 lines)
// =====================================================
function generateLayer1(
  supabaseUrl: string,
  scriptId: string,
  initVersion: string,
  compatQuery: string,
): string {
  const blob = generateBinaryDataBlob();
  const cacheFolder = `sc_${scriptId.substring(0, 8)}`;
  const antiEnv = generateCompactAntiEnvCheck();
  const headerData = Array.from({ length: 4 }, () => Math.floor(Math.random() * 4294967295));

  return `${antiEnv}
_bd0={${headerData.join(",")},"${blob.escapedKey}",${Math.floor(Math.random() * 99999999)},"${blob.escapedSalt}","${blob.signature}"};
local f,b="${cacheFolder}","${initVersion}";local a;pcall(function()a=readfile(f.."/i-"..b..".lua")end) if a and #a>2000 then a=loadstring(a) else a=nil end;
if a then return a() else pcall(makefolder,f);local ok,err=pcall(function() a=game:HttpGet("${supabaseUrl}/functions/v1/loader/${scriptId}?layer=2&v=${initVersion}${compatQuery}") end);if not ok then warn("[ShadowAuth] Layer 2 fetch failed: "..tostring(err)) return end;if not a or #a<100 then warn("[ShadowAuth] Layer 2 empty response") return end;pcall(function()writefile(f.."/i-"..b..".lua",a)end);
pcall(function()for _,v in pairs(listfiles('./'..f))do local m=v:match('(i[%w%-]*).lua$')if m and m~=('i-'..b)then pcall(delfile,f..'/'..m..'.lua')end end end);local fn,lerr=loadstring(a);if fn then return fn() else warn("[ShadowAuth] Layer 2 loadstring failed: "..tostring(lerr)) end end`;
}

// =====================================================
// LAYER 2: Bootstrapper with anti-env scoring
// =====================================================
function generateLayer2(
  supabaseUrl: string,
  scriptId: string,
  initVersion: string,
  compatQuery: string,
): string {
  const cacheFolder = `sc_${scriptId.substring(0, 8)}`;
  const esc = generateEscapeSequences(16);

  return `--[[ ShadowAuth V18 bootstrapper. Escape: ${esc} ]]

${generateLuarmorStyleAntiEnvLog()}

${generateSafeLoadstring()}

local _CF = "${cacheFolder}"
local _IV = "${initVersion}"

local function _rc(n)
  local ok,d = pcall(function() if readfile then return readfile(_CF.."/"..n) end end)
  if ok and d and #d>100 then return d end
end

local function _wc(n,d)
  pcall(function() if makefolder then makefolder(_CF) end; if writefile then writefile(_CF.."/"..n,d) end end)
end

local ok,c3 = pcall(function()
  return game:HttpGet("${supabaseUrl}/functions/v1/loader/${scriptId}?layer=3&v=${initVersion}${compatQuery}")
end)

if ok and c3 and #c3>100 then
  _wc("l3-".._IV..".lua", c3)
  local fn = _SA_LOADSTRING(c3)
  if fn then return fn() end
end

return error("[ShadowAuth] Layer 3 unavailable")
`;
}

// =====================================================
// LAYER 3: Anti-Hook Scanner (full Luarmor parity)
// =====================================================
function generateLayer3(
  supabaseUrl: string,
  scriptId: string,
  initVersion: string,
  compatQuery: string,
): string {
  const antiHookCode = generateAntiHookCode().replace(
    /__REPORT_URL__/g,
    `${supabaseUrl}/functions/v1/loader/${scriptId}?layer=report`,
  );

  return `--[[ ShadowAuth Layer 3 - Anti-Hook V8.0 ]]

${generateSafeLoadstring()}

${antiHookCode}

local ok,c4 = pcall(function()
  return game:HttpGet("${supabaseUrl}/functions/v1/loader/${scriptId}?layer=4&v=${initVersion}${compatQuery}")
end)

if ok and c4 and #c4>100 then
  local fn = _SA_LOADSTRING(c4)
  if fn then return fn() end
end

return error("[ShadowAuth] Layer 4 unavailable")
`;
}

// =====================================================
// LAYER 4: Bridge to Layer 5
// =====================================================
function generateLayer4(
  supabaseUrl: string,
  scriptId: string,
  initVersion: string,
  compatQuery: string,
): string {
  return `--[[ ShadowAuth Layer 4 ]]

${generateSafeLoadstring()}

local ok,c5 = pcall(function()
  return game:HttpGet("${supabaseUrl}/functions/v1/loader/${scriptId}?layer=5&v=${initVersion}${compatQuery}")
end)

if ok and c5 and #c5>100 then
  local fn = _SA_LOADSTRING(c5)
  if fn then return fn() end
end

return error("[ShadowAuth] Layer 5 unavailable")
`;
}

// =====================================================
// LAYER 5: Validation + GUI + Script Execution
// All Luarmor techniques integrated directly
// =====================================================
function generateLayer5(supabaseUrl: string, scriptId: string, initVersion: string): string {
  const funcName = generateRandomVarName(12);
  const sessionSalt = crypto.randomUUID().replace(/-/g, '').substring(0, 16);

  return `--[[ ShadowAuth Layer 5 - Validation V8.0 ]]

${generateSafeLoadstring()}
${generateTutorialStateHWID()}
${generateExecutorIdentification()}
${generateHeartbeatCounter()}
${generateLCGRandom()}
${generateTableIntegrityCheck()}
${generateCustomEncoding()}
${generateFunctionHoneypots()}
${generateTimeWindowGuard()}
${generateGetfenvMonitor()}
${generateTostringComparison()}
${generateKickHandler()}
${generateCrashFunction()}

local ${funcName} = function()
  local Players = game:GetService("Players")
  local TweenService = game:GetService("TweenService")
  local H = game:GetService("HttpService")
  local P = Players.LocalPlayer
  
  -- GUI
  local gui, mainFrame, statusLabel, expiryLabel
  local function createGui()
    pcall(function()
      if game:GetService("CoreGui"):FindFirstChild("ShadowAuthLoader") then
        game:GetService("CoreGui"):FindFirstChild("ShadowAuthLoader"):Destroy()
      end
    end)
    
    gui = Instance.new("ScreenGui")
    gui.Name = "ShadowAuthLoader"
    gui.ResetOnSpawn = false
    gui.ZIndexBehavior = Enum.ZIndexBehavior.Sibling
    pcall(function() gui.Parent = game:GetService("CoreGui") end)
    if not gui.Parent then gui.Parent = P:WaitForChild("PlayerGui") end
    
    local blur = Instance.new("Frame")
    blur.Name = "Blur"
    blur.Size = UDim2.new(1,0,1,0)
    blur.BackgroundColor3 = Color3.fromRGB(0,0,0)
    blur.BackgroundTransparency = 0.4
    blur.BorderSizePixel = 0
    blur.Parent = gui
    
    mainFrame = Instance.new("Frame")
    mainFrame.Name = "Card"
    mainFrame.Size = UDim2.new(0,320,0,160)
    mainFrame.Position = UDim2.new(0.5,-160,0.5,-80)
    mainFrame.BackgroundColor3 = Color3.fromRGB(20,20,30)
    mainFrame.BackgroundTransparency = 0.15
    mainFrame.BorderSizePixel = 0
    mainFrame.Parent = gui
    
    Instance.new("UICorner", mainFrame).CornerRadius = UDim.new(0,16)
    local stroke = Instance.new("UIStroke", mainFrame)
    stroke.Color = Color3.fromRGB(100,180,255)
    stroke.Transparency = 0.5
    stroke.Thickness = 1.5
    
    local avatarFrame = Instance.new("Frame")
    avatarFrame.Size = UDim2.new(0,60,0,60)
    avatarFrame.Position = UDim2.new(0,20,0,20)
    avatarFrame.BackgroundColor3 = Color3.fromRGB(40,50,70)
    avatarFrame.BorderSizePixel = 0
    avatarFrame.Parent = mainFrame
    Instance.new("UICorner", avatarFrame).CornerRadius = UDim.new(1,0)
    
    local avatar = Instance.new("ImageLabel")
    avatar.Size = UDim2.new(1,-4,1,-4)
    avatar.Position = UDim2.new(0,2,0,2)
    avatar.BackgroundTransparency = 1
    avatar.Parent = avatarFrame
    Instance.new("UICorner", avatar).CornerRadius = UDim.new(1,0)
    pcall(function()
      avatar.Image = Players:GetUserThumbnailAsync(P.UserId, Enum.ThumbnailType.HeadShot, Enum.ThumbnailSize.Size150x150)
    end)
    
    local username = Instance.new("TextLabel")
    username.Size = UDim2.new(0,200,0,24)
    username.Position = UDim2.new(0,95,0,22)
    username.BackgroundTransparency = 1
    username.Font = Enum.Font.GothamBold
    username.TextSize = 16
    username.TextColor3 = Color3.fromRGB(255,255,255)
    username.TextXAlignment = Enum.TextXAlignment.Left
    username.Text = P.Name
    username.Parent = mainFrame
    
    expiryLabel = Instance.new("TextLabel")
    expiryLabel.Size = UDim2.new(0,200,0,16)
    expiryLabel.Position = UDim2.new(0,95,0,48)
    expiryLabel.BackgroundTransparency = 1
    expiryLabel.Font = Enum.Font.Gotham
    expiryLabel.TextSize = 11
    expiryLabel.TextColor3 = Color3.fromRGB(140,180,220)
    expiryLabel.TextXAlignment = Enum.TextXAlignment.Left
    expiryLabel.Text = "Validating..."
    expiryLabel.Parent = mainFrame
    
    statusLabel = Instance.new("TextLabel")
    statusLabel.Size = UDim2.new(1,-40,0,30)
    statusLabel.Position = UDim2.new(0,20,1,-44)
    statusLabel.BackgroundTransparency = 1
    statusLabel.Font = Enum.Font.GothamMedium
    statusLabel.TextSize = 13
    statusLabel.TextColor3 = Color3.fromRGB(100,200,150)
    statusLabel.TextXAlignment = Enum.TextXAlignment.Left
    statusLabel.Text = "⏳ Connecting..."
    statusLabel.Parent = mainFrame
    
    local brand = Instance.new("TextLabel")
    brand.Size = UDim2.new(0,100,0,14)
    brand.Position = UDim2.new(1,-110,0,70)
    brand.BackgroundTransparency = 1
    brand.Font = Enum.Font.GothamBold
    brand.TextSize = 9
    brand.TextColor3 = Color3.fromRGB(80,140,200)
    brand.Text = "SHADOWAUTH"
    brand.TextXAlignment = Enum.TextXAlignment.Right
    brand.Parent = mainFrame
    
    mainFrame.BackgroundTransparency = 1
    blur.BackgroundTransparency = 1
    TweenService:Create(blur, TweenInfo.new(0.3), {BackgroundTransparency=0.4}):Play()
    TweenService:Create(mainFrame, TweenInfo.new(0.4, Enum.EasingStyle.Back), {BackgroundTransparency=0.15}):Play()
  end
  
  local function updateStatus(text, color)
    if statusLabel then statusLabel.Text=text; if color then statusLabel.TextColor3=color end end
  end
  
  local function closeGui(success)
    if gui then
      local dur = success and 0.8 or 0.3
      if mainFrame then
        TweenService:Create(mainFrame, TweenInfo.new(dur, Enum.EasingStyle.Back, Enum.EasingDirection.In), {
          Position=UDim2.new(0.5,-160,-0.5,0), BackgroundTransparency=1
        }):Play()
      end
      local b = gui:FindFirstChild("Blur")
      if b then TweenService:Create(b, TweenInfo.new(dur), {BackgroundTransparency=1}):Play() end
      task.delay(dur+0.1, function() pcall(function() gui:Destroy() end) end)
    end
  end
  
  pcall(createGui)
  
  -- Verify honeypots not tampered
  if _SA_CHECK_HONEYPOTS and _SA_CHECK_HONEYPOTS() then
    updateStatus("❌ Integrity failure", Color3.fromRGB(255,100,100))
    task.wait(1.5)
    closeGui(false)
    return
  end
  
  -- Verify getfenv key
  pcall(function()
    if _SA_GETFENV_KEY and getfenv()[_SA_GETFENV_KEY] ~= _SA_GETFENV_VAL then
      updateStatus("❌ Environment tampered", Color3.fromRGB(255,100,100))
      task.wait(1.5)
      closeGui(false)
      return
    end
  end)
  
  -- Time check
  _SA_CHECK_TIME()
  
  return function()
    if _G.__SA then
      updateStatus("✅ Already executed", Color3.fromRGB(100,220,150))
      task.wait(0.2)
      closeGui(true)
      return
    end

    local K = script_key or (getgenv and getgenv().script_key)
    if not K then
      updateStatus("❌ No license key", Color3.fromRGB(255,100,100))
      task.wait(1.5)
      closeGui(false)
      error("No license key")
      return
    end
    
    updateStatus("🔐 Validating key...", Color3.fromRGB(100,180,255))
    
    local hw = gethwid and gethwid() or game:GetService("RbxAnalyticsService"):GetClientId():gsub("-","")
    local tshw = _SA_TSHWID or "?"
    local sKey = "${sessionSalt}"
    
    local body = H:JSONEncode({
      key = K,
      script_id = "${scriptId}",
      hwid = hw,
      tshwid = tshw,
      roblox_username = P.Name,
      roblox_user_id = tostring(P.UserId),
      executor = identifyexecutor and identifyexecutor() or "unknown",
      session_key = sKey,
      hb_count = __SA_HB_COUNT or 0,
      exec_id = _SA_EXEC_ID or 0,
      tbl_acc = _SA_TBL_ACC or 0,
      tostr_result = _SA_TOSTR_RESULT or 0,
      delivery_mode = "binary"
    })
    
    local url = "${supabaseUrl}/functions/v1/validate-key-v2"
    local res
    
    pcall(function()
      if H and H.PostAsync and Enum and Enum.HttpContentType then
        local resp = H:PostAsync(url, body, Enum.HttpContentType.ApplicationJson, false)
        if resp and #tostring(resp)>0 then res = {Body=resp} end
      end
    end)
    
    if not res then
      local req = request or http_request or (syn and syn.request)
      if not req then
        updateStatus("❌ HTTP unavailable", Color3.fromRGB(255,100,100))
        task.wait(1.5); closeGui(false); error("HTTP unavailable"); return
      end
      res = req({Url=url, Method="POST", Headers={["Content-Type"]="application/json",["x-shadow-sig"]="ShadowAuth-v2"}, Body=body})
    end
    
    if res and res.Body then
      local okD,data = pcall(function() return H:JSONDecode(res.Body) end)
      if not okD then
        updateStatus("❌ Validation failed", Color3.fromRGB(255,100,100))
        task.wait(1.5); closeGui(false); return
      end
      
      if data and data.valid and (data.script or data.binary_stream) then
        updateStatus("✅ Key valid!", Color3.fromRGB(100,220,150))
        
        if data.seconds_left then
          local d = math.floor(data.seconds_left/86400)
          local h = math.floor((data.seconds_left%86400)/3600)
          if d>0 then expiryLabel.Text="⏱ "..d.." days, "..h.." hours left"
          elseif h>0 then expiryLabel.Text="⏱ "..h.." hours left"
          else expiryLabel.Text="⏱ "..math.floor(data.seconds_left/60).." min left" end
        else
          expiryLabel.Text="♾️ Lifetime"
        end
        
        updateStatus("📦 Loading...", Color3.fromRGB(100,180,255))
        task.wait(0.3)
        
        local salt = data.salt or ""
        local dk = salt..hw..sKey..tostring(data.timestamp or os.time())
        local h = 0
        for i = 1, #dk do h = bit32.bxor(h*31, string.byte(dk,i)); h = h%2147483647 end
        local key = ""
        local s = h
        for i = 1, 32 do
          s = bit32.bxor(s*1103515245+12345, s)
          key = key..string.char((s%95)+32)
        end
        
        local code
        
        if data.binary_stream and data.delivery_mode=="binary" then
          updateStatus("📡 Binary stream...", Color3.fromRGB(100,180,255))
          local b64 = data.binary_stream
          local alpha = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/"
          local dt = {}
          for i=1,64 do dt[alpha:sub(i,i)]=i-1 end
          local raw = {}
          for i=1,#b64,4 do
            local a=dt[b64:sub(i,i)]or 0
            local b=dt[b64:sub(i+1,i+1)]or 0
            local c=dt[b64:sub(i+2,i+2)]or 0
            local d=dt[b64:sub(i+3,i+3)]or 0
            local n=a*262144+b*4096+c*64+d
            table.insert(raw, bit32.band(bit32.rshift(n,16),255))
            if b64:sub(i+2,i+2)~="=" then table.insert(raw, bit32.band(bit32.rshift(n,8),255)) end
            if b64:sub(i+3,i+3)~="=" then table.insert(raw, bit32.band(n,255)) end
          end
          
          if #raw<16 then
            updateStatus("❌ Invalid binary", Color3.fromRGB(255,100,100))
            task.wait(1.5); closeGui(false); return
          end
          
          local offset = 9
          local chunks = {}
          while offset<=#raw-8 do
            local ci = bit32.bor(bit32.lshift(raw[offset],8), raw[offset+1])
            local sf = bit32.bor(bit32.lshift(raw[offset+2],8), raw[offset+3])
            local isLast = bit32.band(sf,0x8000)~=0
            local cs = bit32.band(sf,0x7FFF)
            offset = offset+4
            local cd = {}
            for i=1,cs do if offset+i-1<=#raw then cd[i]=raw[offset+i-1] end end
            chunks[ci+1] = cd
            offset = offset+cs
            if isLast then break end
          end
          
          local encrypted = {}
          for _,chunk in ipairs(chunks) do
            for _,byte in ipairs(chunk) do table.insert(encrypted,byte) end
          end
          
          local decrypted = {}
          for i=1,#encrypted do
            local kb = key:byte((i-1)%#key+1)
            local sb = salt:byte((i-1)%#salt+1) or 0
            local ps = ((i-1)*7+13)%256
            decrypted[i] = string.char(bit32.bxor(bit32.bxor(bit32.bxor(encrypted[i],kb),ps),sb))
          end
          code = table.concat(decrypted)
        else
          local b64 = data.script
          local alpha = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/"
          local dt = {}
          for i=1,64 do dt[alpha:sub(i,i)]=i-1 end
          local decoded = {}
          for i=1,#b64,4 do
            local a=dt[b64:sub(i,i)]or 0
            local b=dt[b64:sub(i+1,i+1)]or 0
            local c=dt[b64:sub(i+2,i+2)]or 0
            local d=dt[b64:sub(i+3,i+3)]or 0
            local n=a*262144+b*4096+c*64+d
            table.insert(decoded, string.char(bit32.band(bit32.rshift(n,16),255)))
            if b64:sub(i+2,i+2)~="=" then table.insert(decoded, string.char(bit32.band(bit32.rshift(n,8),255))) end
            if b64:sub(i+3,i+3)~="=" then table.insert(decoded, string.char(bit32.band(n,255))) end
          end
          local enc = table.concat(decoded)
          local dec = {}
          for i=1,#enc do
            local kb = key:byte((i-1)%#key+1)
            local ps = ((i-1)*7+13)%256
            dec[i] = string.char(bit32.bxor(bit32.bxor(enc:byte(i),kb),ps))
          end
          code = table.concat(dec)
        end
        
        local fn = _SA_LOADSTRING(code)
        if fn then
          updateStatus("🚀 Executing...", Color3.fromRGB(100,220,150))
          task.wait(0.5)
          closeGui(true)
          _G.__SA = true
          fn()
        else
          updateStatus("❌ Failed to load", Color3.fromRGB(255,100,100))
          task.wait(1.5); closeGui(false)
        end
      else
        local msg = data and data.message or "Validation failed"
        updateStatus("❌ "..msg, Color3.fromRGB(255,100,100))
        task.wait(2); closeGui(false)
      end
    else
      updateStatus("❌ Server unavailable", Color3.fromRGB(255,100,100))
      task.wait(1.5); closeGui(false)
    end
  end
end

local _result = ${funcName}()
if type(_result)=="function" then return _result()
else return _result end
`;
}

// =====================================================
// MAIN SERVER
// =====================================================
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const clientIP = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const ua = req.headers.get("user-agent") || "";
  const sig = req.headers.get("x-shadow-sig");
  const hwid = req.headers.get("x-shadow-hwid") || "";

  const blacklistCheck = await isBlacklisted(clientIP, hwid);
  if (blacklistCheck.blocked) return unauthorizedResponse(req);

  const rateLimit = await checkRateLimit(`loader:${clientIP}`, 30, 30000);
  if (!rateLimit.allowed) return unauthorizedResponse(req);

  if (!sig && !isExecutor(ua) && !isLikelyExecutorRequest(req)) {
    return unauthorizedResponse(req);
  }

  try {
    const url = new URL(req.url);
    const layerParam = url.searchParams.get("layer");
    const vParam = url.searchParams.get("v");
    const pathParts = url.pathname.split("/").filter(Boolean);
    const scriptId = pathParts[pathParts.length - 1];

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: script, error: fetchError } = await supabase
      .from("scripts")
      .select("id, name, content, updated_at")
      .or(`id.eq.${scriptId},loader_token.eq.${scriptId}`)
      .maybeSingle();

    if (fetchError) console.error(`DB error:`, fetchError);

    if (!script) {
      return new Response(`error("Script [${scriptId}] not found")`, {
        headers: { ...corsHeaders, "Content-Type": "text/plain" }
      });
    }

    const initVersion = (vParam?.trim()) || await generateScriptHash(script.content);
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const sessionSalt = generateSalt(scriptId, clientIP);

    const compat = (() => {
      const c = (url.searchParams.get("compat") || "").trim().toLowerCase();
      return c === "1" || c === "true";
    })();
    const compatQuery = compat ? "&compat=1" : "";

    console.log(
      `Loader v${LOADER_VERSION}: L${layerParam || "1"}, Script: ${scriptId.substring(0, 8)}..., IP: ${clientIP}${compat ? " (compat)" : ""}`,
    );

    // Build cache helpers
    const fetchBuild = async () => {
      const { data } = await supabase
        .from("script_builds")
        .select("layer2, layer3, layer4, layer5")
        .eq("script_id", scriptId)
        .eq("version", initVersion)
        .maybeSingle();
      return data as null | Record<string, string>;
    };

    const upsertBuild = async (layer: number, code: string) => {
      const patch: Record<string, unknown> = {
        script_id: scriptId,
        version: initVersion,
        updated_at: new Date().toISOString(),
      };
      patch[`layer${layer}`] = code;
      await supabase.from("script_builds").upsert(patch, { onConflict: "script_id,version" });
    };

    const cacheKey = (l: number, isCompat: boolean) =>
      `l${l}_${scriptId.substring(0, 8)}_${initVersion}_${isCompat ? "compat" : "default"}`;

    const serveLayer = async (num: number, generator: () => string, opts: { compat: boolean }) => {
      const key = `layer${num}`;

      // IMPORTANT: compat responses must NOT touch persistent build cache (avoid poisoning cached builds)
      if (!opts.compat) {
        const build = await fetchBuild();
        if (build?.[key] && build[key].length > 100) {
          return new Response(build[key], {
            headers: {
              ...corsHeaders,
              "Content-Type": "text/plain",
              "X-Layer": String(num),
              "X-Build": "hit",
              "X-Compat": "0",
              "Cache-Control": "public, max-age=31536000, immutable",
            },
          });
        }
      }

      // Try memory cache
      const ck = cacheKey(num, opts.compat);
      const cached = loaderCache.get(ck);
      if (cached && Date.now() - cached.timestamp < 300000) {
        return new Response(cached.code, {
          headers: {
            ...corsHeaders,
            "Content-Type": "text/plain",
            "X-Layer": String(num),
            "X-Build": "mem",
            "X-Compat": opts.compat ? "1" : "0",
            "Cache-Control": opts.compat ? "no-store" : undefined,
          } as Record<string, string>,
        });
      }

      // Generate (+ optional Luraph)
      const raw = generator();
      const finalCode = opts.compat ? raw : await obfuscateWithLuraph(raw, `layer${num}_${scriptId.substring(0, 8)}`);

      loaderCache.set(ck, { code: finalCode, timestamp: Date.now() });

      if (!opts.compat) {
        await upsertBuild(num, finalCode);
      }

      return new Response(finalCode, {
        headers: {
          ...corsHeaders,
          "Content-Type": "text/plain",
          "X-Layer": String(num),
          "X-Build": "miss",
          "X-Compat": opts.compat ? "1" : "0",
          "Cache-Control": opts.compat ? "no-store" : "public, max-age=31536000, immutable",
        },
      });
    };

    // LAYER ROUTING
    if (layerParam === "2" || layerParam === "init") {
      return await serveLayer(2, () => generateLayer2(supabaseUrl!, scriptId, initVersion, compatQuery), { compat });
    }

    if (layerParam === "3") {
      return await serveLayer(3, () => generateLayer3(supabaseUrl!, scriptId, initVersion, compatQuery), { compat });
    }

    if (layerParam === "4" || layerParam === "core") {
      return await serveLayer(4, () => generateLayer4(supabaseUrl!, scriptId, initVersion, compatQuery), { compat });
    }

    if (layerParam === "5") {
      return await serveLayer(5, () => generateLayer5(supabaseUrl!, scriptId, initVersion), { compat });
    }

    // Prebuild
    if (layerParam === "prebuild") {
      for (const L of [2, 3, 4, 5]) {
        await fetch(`${supabaseUrl}/functions/v1/loader/${scriptId}?layer=${L}&v=${initVersion}`, {
          headers: { "x-shadow-sig": "ShadowAuth-Prebuild" },
        });
      }
      return new Response("ok", { headers: { ...corsHeaders, "Content-Type": "text/plain" } });
    }

    // Report endpoint
    if (layerParam === "report") {
      const type = url.searchParams.get("type") || "unknown";
      const tools = url.searchParams.get("tools") || "";
      console.log(`[REPORT] ${type}: ${tools} from ${clientIP}`);
      await supabase.from("security_events").insert({
        event_type: type,
        ip_address: clientIP,
        script_id: scriptId,
        severity: "high",
        details: { tools, ua, hwid },
      });
      return new Response("ok", { headers: { ...corsHeaders, "Content-Type": "text/plain" } });
    }

    // DEFAULT: LAYER 1
    const layer1Code = generateLayer1(supabaseUrl!, scriptId, initVersion, compatQuery);
    return new Response(layer1Code, {
      headers: { ...corsHeaders, "Content-Type": "text/plain", "X-Layer": "1", "X-Compat": compat ? "1" : "0" },
    });

  } catch (error) {
    console.error("Loader error:", error);
    return new Response(`error("Server error")`, {
      status: 500, headers: { ...corsHeaders, "Content-Type": "text/plain" }
    });
  }
});
