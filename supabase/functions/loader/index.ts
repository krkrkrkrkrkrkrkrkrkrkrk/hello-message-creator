import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.2";
import {
  generateAntiHookCode,
  generateSafeLoadstring,
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
import { checkRateLimit, isBlacklisted } from "../_shared/deno-kv-store.ts";
import {
  corsHeaders,
  isExecutor,
  isLikelyExecutorRequest,
  generateRandomVarName,
  generateScriptHash,
  generateSalt,
  obfuscateWithLuraph,
  getClientIP,
} from "../_shared/shared-utils.ts";

// =====================================================
// BROWSER "NO ACCESS" PAGE
// =====================================================
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

const loaderCache = new Map<string, { code: string; timestamp: number }>();
const LOADER_VERSION = "21.0.0";

// =====================================================
// PRNG STRING ENCRYPTION (Luarmor v48/v76 technique)
// Encrypts all string literals server-side, embeds decryptor in output
// =====================================================
function generatePRNGStringEncryptor(): { encrypt: (str: string, id: number) => string; decryptorCode: string } {
  // Build shuffled byte-to-char mapping (Luarmor v57)
  const indices = Array.from({ length: 256 }, (_, i) => i + 1);
  const mapping: Record<number, string> = {};
  while (indices.length > 0) {
    const idx = Math.floor(Math.random() * indices.length);
    const val = indices.splice(idx, 1)[0];
    mapping[val] = String.fromCharCode(val - 1);
  }

  // Serialize the mapping for Lua
  const mapEntries = Object.entries(mapping)
    .map(([k, v]) => {
      const charCode = v.charCodeAt(0);
      return `[${k}]="\\${charCode}"`;
    })
    .join(",");

  const encrypt = (str: string, id: number): string => {
    // PRNG state from Luarmor v76
    let seed = id % 35184372088832;
    let mult = (id % 255) + 2;
    const buffer: number[] = [];

    const nextByte = (): number => {
      if (buffer.length === 0) {
        seed = (seed * 169 + 7579774851987) % 35184372088832;
        do { mult = (mult * 27) % 257; } while (mult === 1);
        const shift = mult % 32;
        const raw = Math.floor(seed / Math.pow(2, 13 - (mult - shift) / 32)) % 4294967296 / Math.pow(2, shift);
        const combined = Math.floor(raw % 1 * 4294967296) + Math.floor(raw);
        const lo = combined % 65536;
        const hi = (combined - lo) / 65536;
        const b0 = lo % 256;
        const b1 = (lo - b0) / 256;
        const b2 = hi % 256;
        buffer.push(b0, b1, b2, (hi - b2) / 256);
      }
      return buffer.shift()!;
    };

    let result = "";
    let carry = 180;
    for (let i = 0; i < str.length; i++) {
      const encrypted = (str.charCodeAt(i) + nextByte() + carry) % 256;
      carry = encrypted;
      const mapped = mapping[encrypted + 1];
      if (mapped !== undefined) {
        result += mapped;
      } else {
        result += String.fromCharCode(encrypted);
      }
    }
    return result;
  };

  const decryptorCode = `
local _SA_STR_MAP = {${mapEntries}}
local _SA_STR_CACHE = {}
local _SA_STR_BUF = {}
local _SA_STR_SEED = 0
local _SA_STR_MULT = 2
local function _SA_STR_NEXT()
  if #_SA_STR_BUF == 0 then
    _SA_STR_SEED = (_SA_STR_SEED * 169 + 7579774851987) % 35184372088832
    repeat _SA_STR_MULT = _SA_STR_MULT * 27 % 257 until _SA_STR_MULT ~= 1
    local sh = _SA_STR_MULT % 32
    local raw = math.floor(_SA_STR_SEED / 2^(13-(_SA_STR_MULT-sh)/32)) % 4294967296 / 2^sh
    local combined = math.floor(raw%1*4294967296) + math.floor(raw)
    local lo = combined%65536
    local hi = (combined-lo)/65536
    local b0 = lo%256
    local b1 = (lo-b0)/256
    local b2 = hi%256
    _SA_STR_BUF = {b0,b1,b2,(hi-b2)/256}
  end
  return table.remove(_SA_STR_BUF)
end
local function _SA_D(data, id)
  if _SA_STR_CACHE[id] then return id end
  _SA_STR_BUF = {}
  _SA_STR_SEED = id % 35184372088832
  _SA_STR_MULT = id % 255 + 2
  local result = ""
  local carry = 180
  for i = 1, #data do
    local byte = (string.byte(data,i) + _SA_STR_NEXT() + carry) % 256
    carry = byte
    result = result .. (_SA_STR_MAP[byte+1] or string.char(byte))
  end
  _SA_STR_CACHE[id] = result
  return id
end
`;

  return { encrypt, decryptorCode };
}

// =====================================================
// SINGLE-FETCH LOADER (Luarmor architecture)
// One HTTP response contains ALL code. Only key validation is separate.
// =====================================================
function generateFullLoader(supabaseUrl: string, scriptId: string, initVersion: string): string {
  const funcName = generateRandomVarName(12);
  const sessionSalt = crypto.randomUUID().replace(/-/g, '').substring(0, 16);
  const reportUrl = `${supabaseUrl}/functions/v1/loader/${scriptId}?layer=report`;

  // Anti-hook code with report URL injected
  const antiHookCode = generateAntiHookCode().replace(/__REPORT_URL__/g, reportUrl);

  return `--[[ Protected Script ]]
local _SA_CLOCK = os.clock()

${generateSafeLoadstring()}
${generateCompactAntiEnvCheck()}
${generateLuarmorStyleAntiEnvLog()}

-- ======= ANTI-HOOK SCANNER =======
${antiHookCode}

-- ======= SECURITY MODULES (parallel init) =======
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
${generateWebSocketClient()}
${generateRecursionDepthTest()}
${generateStackDepthAntiDebug()}
${generateRequestMetatableTrap()}

-- ======= ADVANCED ANTI-DEBUG V20 =======
-- debug.info fingerprinting (detects debugger injection)
local _SA_DBG_SCORE = 0
pcall(function()
  if debug and debug.info then
    local ok, info = pcall(debug.info, 1, "sln")
    if ok and type(info) == "string" and (info:find("hook") or info:find("spy") or info:find("inject")) then
      _SA_DBG_SCORE = _SA_DBG_SCORE + 5
    end
  end
end)

-- hookmetamethod detection
pcall(function()
  if hookmetamethod then
    local t = setmetatable({}, {__index = function() return 42 end})
    local orig = t[1]
    if orig ~= 42 then _SA_DBG_SCORE = _SA_DBG_SCORE + 3 end
  end
end)

-- getrawmetatable trap
pcall(function()
  if getrawmetatable then
    local sentinel = newproxy(true)
    local mt = getmetatable(sentinel)
    mt.__tostring = function() return "sa_sentinel" end
    mt.__metatable = "locked"
    local raw = getrawmetatable(sentinel)
    if raw and raw.__tostring then
      local r = raw.__tostring()
      if r ~= "sa_sentinel" then _SA_DBG_SCORE = _SA_DBG_SCORE + 4 end
    end
  end
end)

-- clonefunction integrity
pcall(function()
  if clonefunction then
    local orig = print
    local cloned = clonefunction(orig)
    if type(cloned) ~= "function" then _SA_DBG_SCORE = _SA_DBG_SCORE + 3 end
    if rawequal and rawequal(orig, cloned) then _SA_DBG_SCORE = _SA_DBG_SCORE + 2 end
  end
end)

-- checkcaller detection (executor-specific)
pcall(function()
  if checkcaller then
    local isCaller = checkcaller()
    if not isCaller then _SA_DBG_SCORE = _SA_DBG_SCORE + 1 end
  end
end)

-- RemoteSpy / InfYield / Unnamed detection in CoreGui
pcall(function()
  local cg = game:GetService("CoreGui")
  for _, child in ipairs(cg:GetChildren()) do
    local n = child.Name:lower()
    if n:find("remotespy") or n:find("infyield") or n:find("unnamed") or n:find("serverspy") or n:find("scriptdumper") then
      _SA_DBG_SCORE = _SA_DBG_SCORE + 5
    end
  end
end)

-- _G pollution check (common logger pattern)
pcall(function()
  local suspicious_keys = {"__namecall_hook", "__index_hook", "RemoteSpy", "SimpleSpy", "HttpSpy", "ScriptDumper"}
  for _, k in ipairs(suspicious_keys) do
    if _G[k] ~= nil or (getgenv and getgenv()[k] ~= nil) then
      _SA_DBG_SCORE = _SA_DBG_SCORE + 3
      break
    end
  end
end)

if _SA_DBG_SCORE >= 6 then
  pcall(function()
    spawn(function()
      pcall(function()
        game:HttpGet("${reportUrl}?type=debug_detected&tools=score_" .. tostring(_SA_DBG_SCORE))
      end)
    end)
  end)
end

-- ======= MAIN =======
local ${funcName} = function()
  local Players = game:GetService("Players")
  local TweenService = game:GetService("TweenService")
  local H = game:GetService("HttpService")
  local P = Players.LocalPlayer
  local _SA_SHUTDOWN = false

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

  local function _SA_IMUL(a, b)
    local ah = bit32.rshift(a, 16)
    local al = bit32.band(a, 0xFFFF)
    local bl = bit32.band(b, 0xFFFF)
    local bh = bit32.rshift(b, 16)
    return bit32.band(al*bl + bit32.lshift(bit32.band(ah*bl + al*bh, 0xFFFF), 16), 0xFFFFFFFF)
  end

  local function _SA_FASTHASH(s)
    local h = 2166136261
    for i = 1, #s do
      h = bit32.bxor(h, string.byte(s, i))
      h = _SA_IMUL(h, 16777619)
    end
    return string.format("%08x", h)
  end

  local function _SA_VERIFY_RESPONSE(data)
    if not data or not data.salt or not data.timestamp or not data.session_token then return false end
    local mode = data.delivery_mode == "binary" and "binary" or "xor"
    local payloadHash = data.payload_hash or _SA_FASTHASH(mode == "binary" and (data.binary_stream or "") or (data.script or ""))
    local expected = _SA_FASTHASH(tostring(data.salt)..":"..tostring(data.timestamp)..":"..mode..":"..payloadHash..":"..tostring(data.session_token))
    if data.response_sig and data.response_sig ~= expected then return false end
    return true
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

  -- Timing: report how long init took
  local _initTime = os.clock() - _SA_CLOCK

  -- Parallel security checks (non-blocking, fast)
  local _securityOk = true
  local _securityChecks = {
    function()
      local ok = pcall(function()
        game:GetService("HttpService")
        game:GetService("RunService")
        game:GetService("Players")
        game:GetService("RbxAnalyticsService")
      end)
      if not ok then _securityOk = false; updateStatus("❌ Invalid environment", Color3.fromRGB(255,100,100)) end
    end,
    function()
      if _SA_CHECK_HONEYPOTS and _SA_CHECK_HONEYPOTS() then
        _securityOk = false; updateStatus("❌ Integrity failure", Color3.fromRGB(255,100,100))
      end
    end,
    function()
      pcall(function()
        if _SA_GETFENV_KEY and getfenv()[_SA_GETFENV_KEY] ~= _SA_GETFENV_VAL then
          _securityOk = false; updateStatus("❌ Environment tampered", Color3.fromRGB(255,100,100))
        end
      end)
    end,
    function()
      if _SA_DBG_SCORE and _SA_DBG_SCORE >= 8 then
        _securityOk = false; updateStatus("❌ Debug tools detected", Color3.fromRGB(255,100,100))
      end
    end,
  }

  for _, check in ipairs(_securityChecks) do pcall(check) end

  if not _securityOk then
    task.wait(1); closeGui(false); return
  end

  _SA_CHECK_TIME()

  return function()
    if _G.__SA then
      updateStatus("✅ Already executed", Color3.fromRGB(100,220,150))
      task.wait(0.2); closeGui(true); return
    end

    local K = script_key or (getgenv and getgenv().script_key)
    if not K then
      updateStatus("❌ No license key", Color3.fromRGB(255,100,100))
      task.wait(1.5); closeGui(false); error("No license key"); return
    end

    updateStatus("🔐 Validating...", Color3.fromRGB(100,180,255))

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
      timezone_offset = os.time(os.date("*t")) - os.time(os.date("!*t")),
      rng1 = math.random(),
      rng2 = math.random(10000, 99999),
      delivery_mode = "binary",
      init_time = _initTime,
      loader_version = "19"
    })

    local url = "${supabaseUrl}/functions/v1/validate-key-v2"
    local res

    -- Fast path: HttpService:PostAsync (no extra overhead)
    pcall(function()
      if H and H.PostAsync and Enum and Enum.HttpContentType then
        local resp = H:PostAsync(url, body, Enum.HttpContentType.ApplicationJson, false)
        if resp and #tostring(resp)>0 then res = {Body=resp} end
      end
    end)

    -- Fallback: request/http_request
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

      if data and data.valid and (data.script or data.binary_stream) and _SA_VERIFY_RESPONSE(data) then
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
        task.wait(0.15)

        local salt = data.salt or ""
        local key = data.dk or ""
        if #key < 1 then
          updateStatus("❌ Missing key", Color3.fromRGB(255,100,100))
          task.wait(1.5); closeGui(false); return
        end

        local code

        if data.binary_stream and data.delivery_mode=="binary" then
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

        -- Hash check removed: response_sig already validates integrity

        local fn = _SA_LOADSTRING(code)
        if fn then
          local authTime = os.clock() - _SA_CLOCK
          updateStatus("🚀 Executing...", Color3.fromRGB(100,220,150))
          print("[ShadowAuth] Authenticated in " .. string.format("%.3f", authTime) .. "s")
          task.wait(0.2)
          closeGui(true)
          _G.__SA = true

          -- Post-auth monitor (Luarmor-style clock freeze + env tamper)
          task.spawn(function()
            local baseClock = os.clock()
            while task.wait(0.18) do
              if (os.clock() - baseClock) > 12 then break end
              if _SA_CHECK_HONEYPOTS and _SA_CHECK_HONEYPOTS() then return end
              if _SA_GETFENV_KEY and getfenv()[_SA_GETFENV_KEY] ~= _SA_GETFENV_VAL then return end
              if _SA_TBL_ACC == -1 then return end
            end
          end)

          pcall(function() if string and string.dump then string.dump = function() return nil end end end)
          fn()
          code = nil
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
// BOOTSTRAP: Luarmor-grade obfuscated bootstrap
// All strings (URL, script ID, version) are XOR-encrypted
// Includes loadstring hook detection + _bsdata0 equivalent
// =====================================================

function xorEncryptString(str: string, key: number): string {
  const bytes: number[] = [];
  for (let i = 0; i < str.length; i++) {
    bytes.push(str.charCodeAt(i) ^ ((key + i * 7 + 13) % 256));
  }
  return bytes.map(b => `\\${b}`).join('');
}

function generateBsdata(scriptId: string, version: string): { luaDecl: string; key: number } {
  // Generate encrypted session data like Luarmor's _bsdata0
  const key = Math.floor(Math.random() * 200) + 50;
  const timestamp = Math.floor(Date.now() / 1000);
  const sessionSeed = Math.floor(Math.random() * 999999999);
  const checksum = (timestamp * 7 + sessionSeed) % 99999999;
  
  return {
    luaDecl: `_0x${sessionSeed.toString(16).slice(0,6)}={${timestamp},${sessionSeed},${checksum},"${xorEncryptString(scriptId, key)}","${xorEncryptString(version, key)}",${key}};`,
    key
  };
}

function generateBootstrap(supabaseUrl: string, scriptId: string, initVersion: string): string {
  const cacheFolder = `sc_${scriptId.substring(0, 8)}`;
  const cacheBuildVersion = `${initVersion}-lv${LOADER_VERSION}`;
  
  // XOR key for string encryption
  const xorKey = Math.floor(Math.random() * 200) + 30;
  
  // Encrypt sensitive strings
  const encUrl = xorEncryptString(`${supabaseUrl}/functions/v1/loader/${scriptId}?layer=full&v=${cacheBuildVersion}`, xorKey);
  const encFolder = xorEncryptString(cacheFolder, xorKey);
  const encVersion = xorEncryptString(cacheBuildVersion, xorKey);
  
  // Generate _bsdata0 equivalent
  const bsdata = generateBsdata(scriptId, cacheBuildVersion);
  
  // Random variable names
  const vDec = generateRandomVarName(8);
  const vLs = generateRandomVarName(6);
  const vF = generateRandomVarName(5);
  const vB = generateRandomVarName(5);
  const vA = generateRandomVarName(5);
  const vUrl = generateRandomVarName(7);
  const vHook = generateRandomVarName(6);

  // Bootstrap with:
  // 1. _bsdata0 encrypted session data
  // 2. loadstring hook detection (ce_like_loadstring_fn pattern)
  // 3. XOR-encrypted URL/folder/version (no plaintext strings)
  // 4. Cache with version-aware cleanup
  // 5. No identifying prefixes or labels
  return `${bsdata.luaDecl}
local ${vHook}=false;pcall(function()if ce_like_loadstring_fn then ${vHook}=true end end);
local ${vDec}=function(s,k)local r=""for i=1,#s do r=r..string.char(bit32.bxor(string.byte(s,i),(k+(i-1)*7+13)%256))end return r end;
local ${vLs}=loadstring;pcall(function()if ce_like_loadstring_fn then ${vLs}=ce_like_loadstring_fn end end);pcall(function()if getgenv then ${vLs}=getgenv().loadstring or ${vLs} end end);
pcall(function()local _tb=(debug.traceback()or""):lower()if _tb:find("unveilr")or _tb:find("httpspy")or _tb:find("crypta")or _tb:find("remotespy")then error()end end);
local ${vF}=${vDec}("${encFolder}",${xorKey});local ${vB}=${vDec}("${encVersion}",${xorKey});local ${vA};pcall(function()${vA}=readfile(${vF}.."/c-"..${vB}..".lua")end);if ${vA} and #${vA}>2000 then local ok,fn=pcall(${vLs},${vA});if ok and fn then return fn()end;${vA}=nil end;
if not ${vA} then pcall(makefolder,${vF});pcall(function()for _,v in pairs(listfiles('./'..${vF}))do pcall(delfile,v)end end);local ${vUrl}=${vDec}("${encUrl}",${xorKey});local ok,err=pcall(function()${vA}=game:HttpGet(${vUrl})end);if(not ok or not ${vA} or #${vA}<100)then local _u=${vUrl}.."&r="..tostring(math.floor(os.clock()*100000));pcall(function()${vA}=game:HttpGet(_u)end)end;if not ${vA} or #${vA}<100 then return end;pcall(function()writefile(${vF}.."/c-"..${vB}..".lua",${vA})end);local fn=${vLs}(${vA});if fn then return fn()end end`;
}

// =====================================================
// MAIN SERVER
// =====================================================
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const clientIP = getClientIP(req);
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

    // Roblox/HttpGet can sometimes encode query chars (like "?") into the path segment.
    // Example seen in logs: "<uuid>%3Flayer=full" which breaks UUID parsing.
    const pathParts = url.pathname.split("/").filter(Boolean);
    const rawLast = pathParts[pathParts.length - 1] ?? "";
    const decodedLast = decodeURIComponent(rawLast);

    let scriptId = decodedLast;
    let extraQuery = "";
    const qIndex = decodedLast.indexOf("?");
    if (qIndex !== -1) {
      scriptId = decodedLast.slice(0, qIndex);
      extraQuery = decodedLast.slice(qIndex + 1);
    }

    const sp = new URLSearchParams(url.searchParams);
    if (extraQuery) {
      const extra = new URLSearchParams(extraQuery);
      for (const [k, v] of extra.entries()) {
        if (!sp.has(k)) sp.set(k, v);
      }
    }

    const layerParam = sp.get("layer");
    const vParam = sp.get("v");

    // Guard early to avoid noisy DB errors
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(scriptId);
    if (!isUuid) {
      return new Response(`error("Invalid script id")`, {
        headers: { ...corsHeaders, "Content-Type": "text/plain" },
      });
    }

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

    console.log(`Loader v${LOADER_VERSION}: L${layerParam || "boot"}, Script: ${scriptId.substring(0, 8)}..., IP: ${clientIP}`);

    // =====================================================
    // FULL LOADER (single fetch — Luarmor architecture)
    // =====================================================
    if (layerParam === "full") {
      // Cache key includes loader version to invalidate on code changes
      const cacheKey = `full_${scriptId.substring(0, 8)}_${initVersion}_v${LOADER_VERSION}`;
      const cached = loaderCache.get(cacheKey);
      if (cached && (Date.now() - cached.timestamp) < 300000) {
        return new Response(cached.code, {
          headers: { ...corsHeaders, "Content-Type": "text/plain", "X-Build": "mem",
            "Cache-Control": "public, max-age=31536000, immutable" }
        });
      }

      // Check DB cache (version-aware: include loader version to bust stale builds)
      const dbVersion = `${initVersion}_lv${LOADER_VERSION}`;
      const { data: build } = await supabase
        .from("script_builds")
        .select("layer5")
        .eq("script_id", scriptId)
        .eq("version", dbVersion)
        .maybeSingle();

      if (build?.layer5 && build.layer5.length > 100) {
        loaderCache.set(cacheKey, { code: build.layer5, timestamp: Date.now() });
        return new Response(build.layer5, {
          headers: { ...corsHeaders, "Content-Type": "text/plain", "X-Build": "db",
            "Cache-Control": "public, max-age=31536000, immutable" }
        });
      }

      // Auto-purge ALL stale builds for this script (old loader versions)
      try {
        const { data: oldBuilds } = await supabase
          .from("script_builds")
          .select("version")
          .eq("script_id", scriptId);
        if (oldBuilds) {
          const staleVersions = oldBuilds
            .filter(b => b.version !== dbVersion)
            .map(b => b.version);
          if (staleVersions.length > 0) {
            await supabase
              .from("script_builds")
              .delete()
              .eq("script_id", scriptId)
              .in_("version", staleVersions);
            console.log(`[Cache] Purged ${staleVersions.length} stale builds for ${scriptId.substring(0, 8)}`);
          }
        }
      } catch (_e) { /* non-critical */ }

      // Generate + Luraph obfuscate
      const raw = generateFullLoader(supabaseUrl!, scriptId, initVersion);
      const luraphResult = await obfuscateWithLuraph(raw, `full_${scriptId.substring(0, 8)}`);
      const protected_ = luraphResult.code;

      loaderCache.set(cacheKey, { code: protected_, timestamp: Date.now() });

      // Persist to DB with version-aware key
      await supabase.from("script_builds").upsert({
        script_id: scriptId,
        version: dbVersion,
        layer5: protected_,
        updated_at: new Date().toISOString(),
      }, { onConflict: "script_id,version" });

      return new Response(protected_, {
        headers: { ...corsHeaders, "Content-Type": "text/plain", "X-Build": "miss",
          "Cache-Control": "public, max-age=31536000, immutable" }
      });
    }

    // =====================================================
    // PREBUILD
    // =====================================================
    if (layerParam === "prebuild") {
      await fetch(`${supabaseUrl}/functions/v1/loader/${scriptId}?layer=full&v=${initVersion}`, {
        headers: { "x-shadow-sig": "ShadowAuth-Prebuild" },
      });
      return new Response("ok", { headers: { ...corsHeaders, "Content-Type": "text/plain" } });
    }

    // =====================================================
    // REPORT ENDPOINT
    // =====================================================
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

    // =====================================================
    // LEGACY LAYER SUPPORT (backward compat)
    // Layers 2-5 now all redirect to full loader
    // =====================================================
    if (layerParam === "2" || layerParam === "3" || layerParam === "4" || layerParam === "5" || layerParam === "init" || layerParam === "core") {
      // Redirect to full loader for backward compat
      const fullUrl = `${supabaseUrl}/functions/v1/loader/${scriptId}?layer=full&v=${initVersion}`;
      const fullResp = await fetch(fullUrl, {
        headers: { "x-shadow-sig": "ShadowAuth-Internal" },
      });
      const code = await fullResp.text();
      return new Response(code, {
        headers: { ...corsHeaders, "Content-Type": "text/plain", "X-Layer": layerParam }
      });
    }

    // =====================================================
    // DEFAULT: BOOTSTRAP (Luarmor-style ultra-compact)
    // =====================================================
    const bootstrapCode = generateBootstrap(supabaseUrl!, scriptId, initVersion);
    return new Response(bootstrapCode, {
      headers: { ...corsHeaders, "Content-Type": "text/plain", "X-Layer": "boot" }
    });

  } catch (error) {
    console.error("Loader error:", error);
    return new Response(`error("Server error")`, {
      status: 500, headers: { ...corsHeaders, "Content-Type": "text/plain" }
    });
  }
});
