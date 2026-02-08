import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.2";
import { generateAntiHookCode, generateSafeLoadstring, generateEscapeSequences, generateAntiEnvLogCheck, generateCompactAntiEnvCheck, generateLuarmorStyleAntiEnvLog } from "../_shared/anti-hook-detection.ts";
import { splitIntoEncryptedChunks, signScript, encodeAsEscapeSequences, timingSafeEqual } from "../_shared/chunk-encryption.ts";
import { checkRateLimit, isBlacklisted, addToBlacklist } from "../_shared/deno-kv-store.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-shadow-sig, x-shadow-key, x-shadow-hwid",
  "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
  "Pragma": "no-cache",
};

const UNAUTHORIZED = "Unauthorized";

// Browser-friendly "no access" page (served only when request expects HTML)
const unauthorizedHTML = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Não autorizado</title>
  <style>
    :root{
      --bg1:#0a0a0f;
      --bg2:#0d1117;
      --bg3:#151922;
      --card:#12161ccc;
      --border:#2a344180;
      --muted:#8b949e;
      --muted2:#6e7681;
      --muted3:#484f58;
      --blue:#3b82f6;
      --blue2:#2563eb;
      --red:#ef4444;
      --white:#ffffff;
    }
    *{box-sizing:border-box}
    body{
      margin:0;
      min-height:100vh;
      display:flex;
      align-items:center;
      justify-content:center;
      padding:16px;
      color:var(--white);
      font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Inter,Helvetica,Arial,sans-serif;
      background:linear-gradient(135deg,var(--bg1),var(--bg2),var(--bg3));
      overflow:hidden;
    }
    .glow{
      position:fixed;
      inset:0;
      pointer-events:none;
      display:flex;
      align-items:center;
      justify-content:center;
    }
    .glow::before{
      content:"";
      width:600px;
      height:600px;
      border-radius:9999px;
      background:rgba(59,130,246,.06);
      filter:blur(60px);
      transform:translateZ(0);
    }
    .card{
      position:relative;
      width:100%;
      max-width:440px;
      background:var(--card);
      backdrop-filter:blur(18px);
      -webkit-backdrop-filter:blur(18px);
      border:1px solid var(--border);
      border-radius:16px;
      box-shadow:0 30px 80px rgba(0,0,0,.55);
    }
    .content{padding:32px;text-align:center}
    .badge{
      display:inline-flex;
      align-items:center;
      gap:8px;
      padding:8px 14px;
      border-radius:9999px;
      background:rgba(239,68,68,.10);
      border:1px solid rgba(239,68,68,.20);
      margin-bottom:22px;
    }
    .badge span{
      font-size:12px;
      font-weight:700;
      letter-spacing:.14em;
      text-transform:uppercase;
      color:rgba(248,113,113,1);
    }
    h1{
      margin:0 0 10px;
      font-size:22px;
      line-height:1.25;
      font-weight:800;
    }
    .sub{margin:0 0 14px;color:var(--muted);font-size:13px}
    .desc{margin:0 0 26px;color:var(--muted2);font-size:12px;line-height:1.55}
    .actions{
      display:flex;
      flex-direction:column;
      gap:10px;
      justify-content:center;
    }
    @media (min-width: 560px){
      .actions{flex-direction:row}
    }
    .btn{
      display:inline-flex;
      align-items:center;
      justify-content:center;
      gap:10px;
      padding:10px 14px;
      border-radius:10px;
      text-decoration:none;
      font-weight:650;
      font-size:13px;
      transition:transform .15s ease, box-shadow .15s ease, background .15s ease, border-color .15s ease;
      user-select:none;
      white-space:nowrap;
    }
    .btn:active{transform:translateY(1px)}
    .btn-outline{
      background:#1c2128;
      border:1px solid rgba(42,52,65,1);
      color:#c9d1d9;
    }
    .btn-outline:hover{
      background:#262c36;
      border-color:#3a4451;
      color:#fff;
    }
    .btn-primary{
      background:linear-gradient(90deg,var(--blue2),var(--blue));
      border:0;
      color:#fff;
      box-shadow:0 10px 30px rgba(59,130,246,.20);
    }
    .btn-primary:hover{
      box-shadow:0 10px 30px rgba(59,130,246,.30);
      filter:brightness(1.05);
    }
    .footer{
      margin-top:26px;
      padding-top:18px;
      border-top:1px solid rgba(42,52,65,.55);
      color:var(--muted3);
      font-size:10px;
      letter-spacing:.18em;
      text-transform:uppercase;
    }
    .footer b{color:rgba(96,165,250,1)}
    svg{width:16px;height:16px;flex:0 0 16px}
  </style>
</head>
<body>
  <div class="glow" aria-hidden="true"></div>
  <main class="card" role="main" aria-label="Não autorizado">
    <div class="content">
      <div class="badge">
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M12 2 4 5.5V11c0 5.25 3.5 9.5 8 11 4.5-1.5 8-5.75 8-11V5.5L12 2Z" stroke="rgba(248,113,113,1)" stroke-width="1.8"/>
          <path d="M9 9l6 6M15 9l-6 6" stroke="rgba(248,113,113,1)" stroke-width="1.8" stroke-linecap="round"/>
        </svg>
        <span>Access Denied</span>
      </div>

      <h1>This content is protected by ShadowAuth</h1>
      <p class="sub">You don't have permission to access this content.</p>
      <p class="desc">Você não tem permissão para visualizar este conteúdo no navegador. Protegido contra acesso não autorizado, reverse engineering e tampering.</p>

      <div class="actions">
        <a class="btn btn-outline" href="/">
          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M3 11.5 12 4l9 7.5V20a1.5 1.5 0 0 1-1.5 1.5H4.5A1.5 1.5 0 0 1 3 20v-8.5Z" stroke="rgba(201,209,217,1)" stroke-width="1.8" stroke-linejoin="round"/>
            <path d="M9.5 21.5v-7h5v7" stroke="rgba(201,209,217,1)" stroke-width="1.8" stroke-linecap="round"/>
          </svg>
          Return Home
        </a>
        <a class="btn btn-primary" href="/support">
          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M21 11.5c0 4.14-4.03 7.5-9 7.5a11.2 11.2 0 0 1-3.9-.69L3 20l1.42-3.02A6.6 6.6 0 0 1 3 11.5C3 7.36 7.03 4 12 4s9 3.36 9 7.5Z" stroke="rgba(255,255,255,1)" stroke-width="1.8" stroke-linejoin="round"/>
            <path d="M8 11.5h.01M12 11.5h.01M16 11.5h.01" stroke="rgba(255,255,255,1)" stroke-width="2.2" stroke-linecap="round"/>
          </svg>
          Contact ShadowAuth
        </a>
      </div>

      <div class="footer">
        Protected by <b>ShadowAuth</b> • Licensed Security
      </div>
    </div>
  </main>
</body>
</html>`;

function wantsHtml(req: Request): boolean {
  const accept = (req.headers.get("accept") || "").toLowerCase();
  const ua = (req.headers.get("user-agent") || "").toLowerCase();
  // Browsers usually send Accept: text/html and UA with Mozilla/Chrome/Safari/Edge.
  if (accept.includes("text/html")) return true;
  if (/\bmozilla\b|\bchrome\b|\bsafari\b|\bedg\b|\bfirefox\b/.test(ua)) return true;
  return false;
}

function unauthorizedResponse(req: Request): Response {
  if (wantsHtml(req)) {
    return new Response(unauthorizedHTML, {
      status: 401,
      headers: {
        ...corsHeaders,
        "Content-Type": "text/html; charset=utf-8",
      },
    });
  }

  return new Response(UNAUTHORIZED, {
    status: 401,
    headers: { ...corsHeaders, "Content-Type": "text/plain" },
  });
}

function isExecutor(ua: string): boolean {
  const patterns = [/synapse/i, /krnl/i, /fluxus/i, /electron/i, /oxygen/i, /sentinel/i, 
    /celery/i, /arceus/i, /roblox/i, /comet/i, /trigon/i, /delta/i, /hydrogen/i, 
    /evon/i, /vegax/i, /jjsploit/i, /nihon/i, /zorara/i, /solara/i, /wave/i, /script-?ware/i];
  return patterns.some(p => p.test(ua));
}

const loaderCache = new Map<string, { code: string; timestamp: number }>();

const LOADER_TEMPLATE_VERSION = "17.0.0"; // Updated: Anti-Hook + Chunk Encryption + Deno KV
const ENABLE_LURAPH = true;
const LURAPH_API_URL = "https://api.lura.ph/v1";

// =====================================================
// LURAPH API CLIENT
// =====================================================
function base64EncodeScript(str: string): string {
  const encoder = new TextEncoder();
  const bytes = encoder.encode(str);
  let binary = '';
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
}

interface LuraphNodesResponse {
  recommendedId: string;
  nodes: Record<string, { version: string; cpuUsage: number }>;
}

class LuraphClient {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  private async request(endpoint: string, options: RequestInit = {}): Promise<Response> {
    const url = `${LURAPH_API_URL}${endpoint}`;
    const headers = new Headers(options.headers || {});
    headers.set('Luraph-API-Key', this.apiKey);
    headers.set('Content-Type', 'application/json');
    return fetch(url, { ...options, headers });
  }

  async getNodes(): Promise<LuraphNodesResponse> {
    const response = await this.request('/obfuscate/nodes');
    if (!response.ok) {
      throw new Error(`Luraph nodes error: ${response.status}`);
    }
    return response.json();
  }

  async submitJob(script: string, fileName: string, nodeId: string): Promise<string> {
    const response = await this.request('/obfuscate/new', {
      method: 'POST',
      body: JSON.stringify({
        fileName,
        node: nodeId,
        script: base64EncodeScript(script),
        options: {
          TARGET_VERSION: "Luau",
          DISABLE_LINE_INFORMATION: true,
          ENABLE_GC_FIXES: false,
          CONSTANT_ENCRYPTION: true,
          CONTROL_FLOW: true,
          VM_ENCRYPTION: true,
          STRING_ENCRYPTION: true,
        },
        enforceSettings: false,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Luraph submit error: ${error}`);
    }

    const data = await response.json();
    return data.jobId;
  }

  async waitForJob(jobId: string, timeout: number = 90000): Promise<void> {
    const startTime = Date.now();
    while (Date.now() - startTime < timeout) {
      const response = await this.request(`/obfuscate/status/${jobId}`);
      if (!response.ok) {
        await new Promise(r => setTimeout(r, 2000));
        continue;
      }
      const text = await response.text();
      if (text && text.trim()) {
        try {
          const data = JSON.parse(text);
          if (data.error) {
            throw new Error(`Luraph error: ${data.error}`);
          }
        } catch (e) {
          console.log('Luraph status response:', text.substring(0, 100));
        }
      }
      return;
    }
    throw new Error('Luraph job timeout');
  }

  async downloadResult(jobId: string): Promise<string> {
    const response = await this.request(`/obfuscate/download/${jobId}`);
    if (!response.ok) {
      throw new Error(`Luraph download error: ${response.status}`);
    }
    return response.text();
  }

  async obfuscate(script: string, fileName: string = 'loader.lua'): Promise<string> {
    const nodes = await this.getNodes();
    const nodeId = nodes.recommendedId;
    if (!nodeId) throw new Error('No Luraph nodes available');
    
    console.log(`Luraph: Using node ${nodeId}`);
    const jobId = await this.submitJob(script, fileName, nodeId);
    console.log(`Luraph: Job ${jobId} submitted, waiting...`);
    
    await this.waitForJob(jobId);
    console.log(`Luraph: Job completed, downloading...`);
    
    return this.downloadResult(jobId);
  }
}

function generateSalt(scriptId: string, clientIP: string): string {
  const combined = `${scriptId}:${clientIP}:${Date.now()}:shadowauth_loader_v${LOADER_TEMPLATE_VERSION}`;
  let hash = 0;
  for (let i = 0; i < combined.length; i++) {
    hash = ((hash << 5) - hash) + combined.charCodeAt(i);
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36) + crypto.randomUUID().replace(/-/g, '').substring(0, 16);
}

async function generateScriptHash(content: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(content);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("").substring(0, 32);
}

function generateRandomVarName(length: number = 8): string {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ_';
  const nums = '0123456789';
  let result = chars[Math.floor(Math.random() * chars.length)];
  for (let i = 1; i < length; i++) {
    result += (chars + nums)[Math.floor(Math.random() * (chars.length + nums.length))];
  }
  return result;
}

// =====================================================
// MULTI-LAYER DATA GENERATION (Like Luarmor's _bsdata0)
// =====================================================
function generateMultiLayerData(): {
  headerData: number[];
  headerHex: string;
  headerNum: number;
  headerStr: string;
  footerNum: number;
  footerHex: string;
  footerStr: string;
  checksum: number;
} {
  const headerData: number[] = [];
  for (let i = 0; i < 4; i++) {
    headerData.push(Math.floor(Math.random() * 4294967295));
  }
  
  const hexChars = '0123456789abcdef';
  
  let headerHex = '';
  for (let i = 0; i < 21; i++) {
    headerHex += String.fromCharCode(Math.floor(Math.random() * 200) + 32);
  }
  
  const headerNum = Math.floor(Math.random() * 99999999);
  
  let headerStr = '';
  for (let i = 0; i < 24; i++) {
    headerStr += String.fromCharCode(Math.floor(Math.random() * 200) + 32);
  }
  
  const footerNum = Math.floor(Math.random() * 2147483647);
  
  let footerHex = '';
  for (let i = 0; i < 200; i++) {
    footerHex += hexChars[Math.floor(Math.random() * 16)];
  }
  
  const patternChars = 'ABCDEFRL0123456789._-';
  let footerStr = '';
  for (let i = 0; i < 100; i++) {
    footerStr += patternChars[Math.floor(Math.random() * patternChars.length)];
  }
  
  const checksum = Math.floor(Math.random() * 99999999);
  
  return {
    headerData,
    headerHex,
    headerNum,
    headerStr,
    footerNum,
    footerHex,
    footerStr,
    checksum,
  };
}

// =====================================================
// WOLF ASCII ART (Used in multiple layers)
// =====================================================
const WOLF_ASCII = `
				 .@%(/*,.......      ...,,*/(#%&@@.
			 (*   ,/(#%%&&@@@@&%((////(((##%###((/**,,.     ,//(&.
		   /* .%@@@@@@@@%,  .(&@@@&&&&&&@@@@@@&#(*,........*%@@@(.  ,#.
		 */ .&@@@@@@@*  (%,   *(&&@@@@@&%(*,.             .,*(#%(*@@&*  *,
		#, /@@@@@@* *&( ,&&/.,/#%&&@@@&(&@@@@@@@@@@@@#*,.....,/&@@@@@@@@( .%
	   #  #@@@@@*/@% .#%./(,.,/*,//*,.,/(*@@@@@@@@@@@@%@@@@@@@@@#.#@@@@@@&. %
	  /  &@@@@@@@@(%@# *&&*&@@@@#/&@@@@/%%.,%@@@@@@@%/@@&(,  ,,,...  *%@@@# *
	#  .&@@@@@@@@@@@,((%@@@@@#.    ,&@@#@@&* .&@@@@@&,.#@@@@/&@@%(@@@&(/,(&, /,
 (/   (@&&&%&@@@&/, ,@#(@@@@,        #@@/,&@& /@@@@@,%#%@@@@@(     *@@@@@&,%%. .
/  #/,#@@@&#(//#@@@/ %@@@&@@@(.    ,&@@(.*/*  %@@*   %@@@@@@%       (@@&(*...%&.
 ///@@&,  (&@@#,   /@/ ,*&@@@@#&@@%#%((%@&* /@@@@@@&. #@@@#&@@@&%%@@@@@@&,/(*@/#
%%.&@# .&@@@# /@@@@%&@@@&/.   ,/((/*,  ./&@@@@@@@@@@,*&(./%@@#*&@@@(#(....,&#*@/
@%.&& .&@@@&*    /&@@@@@@@@@@@@@@@@&@@#/(%@@@@@@@@@@&,  (@@@@@@@@@@@@/,@@@@@#.&*
&&,%% .&*    /@@@(.  ,(@@@@@&/(////#( /&@@@@@@@@@@@@@@@(  ,&@@@@@@@@&, (@@&*/@(/
.%*#@( /@@@@( *@@@@@@/     *%@@@@@@@&.,@& ,#, .&@@@@@@# .#*%&/,#@@@@*   *@@&/*&*
 .&/.#@@@@@@@,   *&@@%.,&@@&(,    ,(%@%&@@@@@@@@@(.*,  /@@@@@@@@@&,      %@@@@..
@* .%@@@@@@@@(       .   (@@@@@@@@(       .*(%&@@@@@@@@@@@@&(,  ./.*@%   /@@% ./
  @* .&@@@@@@&.             ./&@@@*.&@@@@@@@&, ,**,.    .,*(&(.%@@# %@*  ,@@% ,#
	&, /@@@@@@*                    .#@@@@@@@@*.%@@@@@(,@@@@@@& ,%(.      .&@% ,#
	  / *@@@@@#                                                           %@&.,#
	  (( .&@@@@*                                                          #@&.,#
	   .&. ,&@@@,                                                         (@&.,#
		  #. .%@@* /@@/                                                   /@&.,(
			./  #@%. %@&,,#,                                              /@@,./
			  *(  #@%. . (@@@@@%/,                                        /@@,.*
				//  %@&, *@@@@@@@@( (@%/.                                 #@@, (
				  #* .&@@#. (@@@@&.*@@@@@@@@%. */.                  *..%*.&@@, /
					@* .%@@@%, ,/ .@@@@@@@@@@,.%@@@@@% .&@@@* #@&..&@*,* %@@&. *
					   /  *&@@@@%,   *(&@@@@&. #@@@@@* #@@@% (@@* ,.   /@@@@* (
						 @#. .#@@@@@@&(,.                      .,*(%&@@@@@&..(
							 &(.   ./%@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@(. ((
								  ,#/*.       ..,,,,,,,,....          ,/#
`;

// =====================================================
// LAYER 1: Ultra-Compact Bootstrap (Luarmor-identical)
// Only ~6 lines visible - everything else in binary data
// =====================================================
function generateLayer1(supabaseUrl: string, scriptId: string, initVersion: string): string {
  const encData = generateMultiLayerData();
  // Stable cache folder (avoid daily cache misses)
  const cacheFolder = `static_content_${scriptId.substring(0, 8)}`;
  
  // Generate obfuscated binary data blob (like Luarmor's _bsdata0)
  const binaryBlob = generateBinaryDataBlob(scriptId, initVersion);
  
  // Luarmor-style anti-env-log check FIRST (identity checks + env logger probes + C function validation)
  // This runs before ANY other code to detect sandboxed environments
  const antiEnvCheck = generateCompactAntiEnvCheck();
  
  // Ultra-compact loader - matches Luarmor's ~6 line format with anti-env at start
  // CRITICAL: layer=2 to fetch the next layer, not loop back to layer 1
  return `${antiEnvCheck}_bsdata0={${encData.headerData.join(',')},"${binaryBlob.escapedKey}",${encData.headerNum},${encData.footerNum},"${binaryBlob.escapedSalt}","${encData.footerHex}","${binaryBlob.signature}",${encData.checksum}};
local f,b,a="${cacheFolder}","${initVersion}";pcall(function()a=readfile(f.."/init-"..b..".lua")end) if a and #a>2000 then a=loadstring(a) else a=nil; end;
if a then return a() else pcall(makefolder,f) a=game:HttpGet("${supabaseUrl}/functions/v1/loader/${scriptId}?layer=2&v=${initVersion}"..(_ca920af6193 or "")) writefile(f.."/init-"..b..".lua", a); 
pcall(function() for i,v in pairs(listfiles('./'..f)) do local m=v:match('(init[%w%-]*).lua$') if m and m~=('init-'..b) then pcall(delfile, f..'/'..m..'.lua') end end; end); return loadstring(a)() end
  `;
}

// Generate binary data blob with escape sequences (Luarmor pattern)
function generateBinaryDataBlob(scriptId: string, version: string): {
  escapedKey: string;
  escapedSalt: string;
  signature: string;
} {
  // Generate escape sequence string (like Luarmor's "\136\158\166...")
  const keyBytes: number[] = [];
  for (let i = 0; i < 21; i++) {
    keyBytes.push(Math.floor(Math.random() * 200) + 32);
  }
  const escapedKey = keyBytes.map(b => `\\${b}`).join('');
  
  const saltBytes: number[] = [];
  for (let i = 0; i < 24; i++) {
    saltBytes.push(Math.floor(Math.random() * 200) + 32);
  }
  const escapedSalt = saltBytes.map(b => `\\${b}`).join('');
  
  // Generate Luarmor-style signature pattern
  const sigChars = 'ABCDEFRL0123456789._-';
  let signature = '';
  for (let i = 0; i < 140; i++) {
    signature += sigChars[Math.floor(Math.random() * sigChars.length)];
  }
  
  return { escapedKey, escapedSalt, signature };
}


// LAYER 2: Bootstrapper (captured_2.lua)
// With getrenv + rawequal protection
// =====================================================
function generateLayer2(supabaseUrl: string, scriptId: string, initVersion: string): string {
  // Stable cache folder (avoid per-request churn)
  const cacheFolder = `static_content_${scriptId.substring(0, 8)}`;
  const version = `17.0.${Math.floor(Math.random() * 999)}`;
  const escapeSeq = generateEscapeSequences(24);
  
  // Get the Luarmor-style advanced anti-env-log check (more thorough for Layer 2)
  const antiEnvLogCheck = generateLuarmorStyleAntiEnvLog();
  
  return `--[[
        ShadowAuth V17 bootstrapper for scripts. 
 this code fetches & updates & encrypts & decrypts cached ShadowAuth scripts in the folder named static_content.../
        https://shadowauth.dev/
 Escape: ${escapeSeq}
]]

${antiEnvLogCheck}

${generateSafeLoadstring()}

local _SHADOWAUTH_VERSION = "${version}"
local _CACHE_FOLDER = "${cacheFolder}"
local _INIT_VERSION = "${initVersion}"
local _LAYER_COUNT = 7

-- Cache management
local _cache = {}
local function _readCache(name)
  if _cache[name] then return _cache[name] end
  local ok, data = pcall(function()
    if readfile then return readfile(_CACHE_FOLDER .. "/" .. name) end
  end)
  if ok and data and #data > 100 then
    _cache[name] = data
    return data
  end
  return nil
end

local function _writeCache(name, data)
  _cache[name] = data
  pcall(function()
    if makefolder then makefolder(_CACHE_FOLDER) end
    if writefile then writefile(_CACHE_FOLDER .. "/" .. name, data) end
  end)
end

-- Fetch Layer 3 via HTTP
local layer3Url = "${supabaseUrl}/functions/v1/loader/${scriptId}?layer=3&v=${initVersion}"
local ok, layer3Code = pcall(function()
  return game:HttpGet(layer3Url)
end)

if ok and layer3Code and #layer3Code > 100 then
  _writeCache("layer3-" .. _INIT_VERSION .. ".lua", layer3Code)
  local fn = _SA_LOADSTRING(layer3Code)
  if fn then return fn() end
  return error("[ShadowAuth] Layer 3 invalid")
end

return error("[ShadowAuth] Layer 3 unavailable")
`;
}

// =====================================================
// LAYER 3: Anti-Hook Scanner + Loader (captured_3.lua)
// Runs full anti-hook detection before Layer 4
// =====================================================
function generateLayer3(supabaseUrl: string, scriptId: string, initVersion: string): string {
  const antiHookCode = generateAntiHookCode().replace(/__REPORT_URL__/g, 
    `${supabaseUrl}/functions/v1/loader/${scriptId}?layer=report`);
  
  return `--[[${WOLF_ASCII}
    ShadowAuth Protected Script - Layer 3
    Anti-Hook Detection + Integrity Verification
    https://shadowauth.dev/
]]

${generateSafeLoadstring()}

${antiHookCode}

-- Continue execution silently
print("[ShadowAuth] Loading...")

-- Fetch Layer 4 via HTTP
local _url4 = "${supabaseUrl}/functions/v1/loader/${scriptId}?layer=4&v=${initVersion}"
local _ok4, _code4 = pcall(function()
  return game:HttpGet(_url4)
end)

if _ok4 and _code4 and #_code4 > 500 then
  local fn = _SA_LOADSTRING(_code4)
  if fn then return fn() end
  return error("[ShadowAuth] Layer 4 invalid")
end

return error("[ShadowAuth] Layer 4 unavailable")
`;
}

// =====================================================
// LAYER 4: Luraph Protected Core (captured_4.lua)
// With getrenv + rawequal
// =====================================================
function generateLayer4Wrapper(supabaseUrl: string, scriptId: string, initVersion: string): string {
  const escapeSeq = generateEscapeSequences(16);
  
  return `--[[${WOLF_ASCII}
    ShadowAuth Protected Script - Layer 4 (Core)
    Escape: ${escapeSeq}
    https://shadowauth.dev/
]]

${generateSafeLoadstring()}

-- Fetch Layer 5 (validation layer)
local _url5 = "${supabaseUrl}/functions/v1/loader/${scriptId}?layer=5&v=${initVersion}"
local _ok5, _code5 = pcall(function()
  return game:HttpGet(_url5)
end)

if _ok5 and _code5 and #_code5 > 100 then
  local _fn5 = _SA_LOADSTRING(_code5)
  if _fn5 then
    return _fn5()
  end
  return error("[ShadowAuth] Layer 5 invalid")
end

return error("[ShadowAuth] Layer 5 unavailable")
`;
}

// =====================================================
// LAYER 5: Validation Wrapper (HTTP mode - stable)
// With modern glassmorphism GUI + getrenv protection
// =====================================================
function generateLayer5(supabaseUrl: string, scriptId: string, initVersion: string): string {
  const funcName = generateRandomVarName(12);
  const sessionSalt = crypto.randomUUID().replace(/-/g, '').substring(0, 16);
  const escapeSeq = generateEscapeSequences(20);
  
  return `--[[${WOLF_ASCII}
    ShadowAuth Protected Script - Layer 5 (Validation)
    Escape: ${escapeSeq}
    https://shadowauth.dev/
]]

${generateSafeLoadstring()}

local ${funcName} = function()
  local Players = game:GetService("Players")
  local TweenService = game:GetService("TweenService")
  local H = game:GetService("HttpService")
  local P = Players.LocalPlayer
  
  -- ========================================
  -- MODERN GUI (Glassmorphism)
  -- ========================================
  local gui, mainFrame, statusLabel, avatarImage, usernameLabel, expiryLabel
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
    
    -- Background blur effect
    local blur = Instance.new("Frame")
    blur.Name = "Blur"
    blur.Size = UDim2.new(1, 0, 1, 0)
    blur.BackgroundColor3 = Color3.fromRGB(0, 0, 0)
    blur.BackgroundTransparency = 0.4
    blur.BorderSizePixel = 0
    blur.Parent = gui
    
    -- Main card (glassmorphism)
    mainFrame = Instance.new("Frame")
    mainFrame.Name = "MainCard"
    mainFrame.Size = UDim2.new(0, 320, 0, 180)
    mainFrame.Position = UDim2.new(0.5, -160, 0.5, -90)
    mainFrame.BackgroundColor3 = Color3.fromRGB(20, 20, 30)
    mainFrame.BackgroundTransparency = 0.15
    mainFrame.BorderSizePixel = 0
    mainFrame.Parent = gui
    
    local corner = Instance.new("UICorner")
    corner.CornerRadius = UDim.new(0, 16)
    corner.Parent = mainFrame
    
    local stroke = Instance.new("UIStroke")
    stroke.Color = Color3.fromRGB(100, 180, 255)
    stroke.Transparency = 0.5
    stroke.Thickness = 1.5
    stroke.Parent = mainFrame
    
    -- Gradient glow
    local gradient = Instance.new("UIGradient")
    gradient.Color = ColorSequence.new({
      ColorSequenceKeypoint.new(0, Color3.fromRGB(30, 40, 60)),
      ColorSequenceKeypoint.new(1, Color3.fromRGB(15, 20, 35))
    })
    gradient.Rotation = 45
    gradient.Parent = mainFrame
    
    -- Avatar container
    local avatarFrame = Instance.new("Frame")
    avatarFrame.Name = "AvatarFrame"
    avatarFrame.Size = UDim2.new(0, 70, 0, 70)
    avatarFrame.Position = UDim2.new(0, 24, 0, 24)
    avatarFrame.BackgroundColor3 = Color3.fromRGB(40, 50, 70)
    avatarFrame.BorderSizePixel = 0
    avatarFrame.Parent = mainFrame
    
    local avatarCorner = Instance.new("UICorner")
    avatarCorner.CornerRadius = UDim.new(1, 0)
    avatarCorner.Parent = avatarFrame
    
    local avatarStroke = Instance.new("UIStroke")
    avatarStroke.Color = Color3.fromRGB(80, 160, 240)
    avatarStroke.Thickness = 2
    avatarStroke.Parent = avatarFrame
    
    avatarImage = Instance.new("ImageLabel")
    avatarImage.Name = "Avatar"
    avatarImage.Size = UDim2.new(1, -4, 1, -4)
    avatarImage.Position = UDim2.new(0, 2, 0, 2)
    avatarImage.BackgroundTransparency = 1
    avatarImage.Image = ""
    avatarImage.Parent = avatarFrame
    
    local avatarImgCorner = Instance.new("UICorner")
    avatarImgCorner.CornerRadius = UDim.new(1, 0)
    avatarImgCorner.Parent = avatarImage
    
    -- Username
    usernameLabel = Instance.new("TextLabel")
    usernameLabel.Name = "Username"
    usernameLabel.Size = UDim2.new(0, 190, 0, 28)
    usernameLabel.Position = UDim2.new(0, 110, 0, 24)
    usernameLabel.BackgroundTransparency = 1
    usernameLabel.Font = Enum.Font.GothamBold
    usernameLabel.TextSize = 18
    usernameLabel.TextColor3 = Color3.fromRGB(255, 255, 255)
    usernameLabel.TextXAlignment = Enum.TextXAlignment.Left
    usernameLabel.Text = P.Name
    usernameLabel.Parent = mainFrame
    
    -- Expiry label
    expiryLabel = Instance.new("TextLabel")
    expiryLabel.Name = "Expiry"
    expiryLabel.Size = UDim2.new(0, 190, 0, 18)
    expiryLabel.Position = UDim2.new(0, 110, 0, 54)
    expiryLabel.BackgroundTransparency = 1
    expiryLabel.Font = Enum.Font.Gotham
    expiryLabel.TextSize = 12
    expiryLabel.TextColor3 = Color3.fromRGB(140, 180, 220)
    expiryLabel.TextXAlignment = Enum.TextXAlignment.Left
    expiryLabel.Text = "Validating..."
    expiryLabel.Parent = mainFrame
    
    -- Status label
    statusLabel = Instance.new("TextLabel")
    statusLabel.Name = "Status"
    statusLabel.Size = UDim2.new(1, -48, 0, 40)
    statusLabel.Position = UDim2.new(0, 24, 1, -56)
    statusLabel.BackgroundTransparency = 1
    statusLabel.Font = Enum.Font.GothamMedium
    statusLabel.TextSize = 14
    statusLabel.TextColor3 = Color3.fromRGB(100, 200, 150)
    statusLabel.TextXAlignment = Enum.TextXAlignment.Left
    statusLabel.Text = "⏳ Connecting..."
    statusLabel.Parent = mainFrame
    
    -- Brand
    local brand = Instance.new("TextLabel")
    brand.Size = UDim2.new(0, 100, 0, 16)
    brand.Position = UDim2.new(1, -110, 0, 78)
    brand.BackgroundTransparency = 1
    brand.Font = Enum.Font.GothamBold
    brand.TextSize = 10
    brand.TextColor3 = Color3.fromRGB(80, 140, 200)
    brand.Text = "SHADOWAUTH"
    brand.TextXAlignment = Enum.TextXAlignment.Right
    brand.Parent = mainFrame
    
    -- Initial animation
    mainFrame.BackgroundTransparency = 1
    blur.BackgroundTransparency = 1
    TweenService:Create(blur, TweenInfo.new(0.3), {BackgroundTransparency = 0.4}):Play()
    TweenService:Create(mainFrame, TweenInfo.new(0.4, Enum.EasingStyle.Back), {BackgroundTransparency = 0.15}):Play()
    
    -- Load Roblox avatar as default
    pcall(function()
      local thumb = Players:GetUserThumbnailAsync(P.UserId, Enum.ThumbnailType.HeadShot, Enum.ThumbnailSize.Size150x150)
      if thumb then avatarImage.Image = thumb end
    end)
  end
  
  local function updateStatus(text, color)
    if statusLabel then
      statusLabel.Text = text
      if color then statusLabel.TextColor3 = color end
    end
  end
  
  local function updateExpiry(text)
    if expiryLabel then expiryLabel.Text = text end
  end
  
  local function closeGui(success)
    if gui then
      local dur = success and 0.8 or 0.3
      if mainFrame then
        TweenService:Create(mainFrame, TweenInfo.new(dur, Enum.EasingStyle.Back, Enum.EasingDirection.In), {
          Position = UDim2.new(0.5, -160, -0.5, 0),
          BackgroundTransparency = 1
        }):Play()
      end
      local blur = gui:FindFirstChild("Blur")
      if blur then
        TweenService:Create(blur, TweenInfo.new(dur), {BackgroundTransparency = 1}):Play()
      end
      task.delay(dur + 0.1, function() pcall(function() gui:Destroy() end) end)
    end
  end
  
  -- Create GUI immediately
  pcall(createGui)
  
  -- Fetch Layer 6 (SuperflowBytecode) - silent load
  pcall(function()
    local code6 = game:HttpGet("${supabaseUrl}/functions/v1/loader/${scriptId}?layer=6&v=${initVersion}")
    if code6 and #code6 > 10000 then
      _G.__SA_SUPERFLOW_VERIFIED = true
      pcall(function() _SA_LOADSTRING(code6)() end)
    end
  end)
  
  -- Fetch Layer 7 (Kick Handler) - silent load
  pcall(function()
    local code7 = game:HttpGet("${supabaseUrl}/functions/v1/loader/${scriptId}?layer=7&v=${initVersion}")
    if code7 and #code7 > 10 then
      _G.__SA_KICK_HANDLER = _SA_LOADSTRING(code7)
    end
  end)
  
  -- Validation
  return function()
    -- Prevent running auth/validation multiple times in the same session
    if _G.__SA then
      updateStatus("✅ Already executed", Color3.fromRGB(100, 220, 150))
      task.wait(0.2)
      closeGui(true)
      return
    end

    local K = script_key or (getgenv and getgenv().script_key)
    
    if not K then
      updateStatus("❌ No license key", Color3.fromRGB(255, 100, 100))
      task.wait(1.5)
      closeGui(false)
      error("No license key provided")
      return
    end
    
    updateStatus("🔐 Validating key...", Color3.fromRGB(100, 180, 255))
    
    local hw = gethwid and gethwid() or game:GetService("RbxAnalyticsService"):GetClientId():gsub("-", "")
    local sessionKey = "${sessionSalt}"
    
    local body = H:JSONEncode({
      key = K,
      script_id = "${scriptId}",
      hwid = hw,
      roblox_username = P.Name,
      roblox_user_id = tostring(P.UserId),
      executor = identifyexecutor and identifyexecutor() or "unknown",
      session_key = sessionKey,
      rng1 = math.random(1, 100000) + math.random(),
      rng2 = math.random(1, 100000),
      delivery_mode = "binary" -- Request binary stream delivery
    })
    
    local _validateUrl = "${supabaseUrl}/functions/v1/validate-key-v2"
    local res

    -- Prefer Roblox HttpService (often faster than executor request on first DNS/TLS)
    pcall(function()
      if H and H.PostAsync and Enum and Enum.HttpContentType then
        local bodyStr = body
        if type(bodyStr) ~= "string" then bodyStr = H:JSONEncode(bodyStr) end
        local resp = H:PostAsync(_validateUrl, bodyStr, Enum.HttpContentType.ApplicationJson, false)
        if resp and #tostring(resp) > 0 then
          res = { Body = resp }
        end
      end
    end)

    -- Fallback to executor request (supports custom headers)
    if not res then
      local req = request or http_request or (syn and syn.request)
      if not req then
        updateStatus("❌ HTTP unavailable", Color3.fromRGB(255, 100, 100))
        task.wait(1.5)
        closeGui(false)
        error("HTTP unavailable")
        return
      end

      res = req({
        Url = _validateUrl,
        Method = "POST",
        Headers = {
          ["Content-Type"] = "application/json",
          ["x-shadow-sig"] = "ShadowAuth-Loader-v2",
          ["x-delivery-mode"] = "binary"
        },
        Body = body
      })
    end
    
    if res and res.Body then
      local okDecode, data = pcall(function()
        return H:JSONDecode(res.Body)
      end)

      if not okDecode then
        updateStatus("❌ Validation failed", Color3.fromRGB(255, 100, 100))
        task.wait(1.5)
        closeGui(false)
        error("Validation failed")
        return
      end

      if data and data.valid and (data.script or data.binary_stream) then
        updateStatus("✅ Key valid!", Color3.fromRGB(100, 220, 150))
        
        -- Update expiry display
        if data.seconds_left then
          local d = math.floor(data.seconds_left / 86400)
          local h = math.floor((data.seconds_left % 86400) / 3600)
          if d > 0 then
            updateExpiry("⏱ " .. d .. " days, " .. h .. " hours left")
          elseif h > 0 then
            updateExpiry("⏱ " .. h .. " hours left")
          else
            updateExpiry("⏱ " .. math.floor(data.seconds_left / 60) .. " minutes left")
          end
        else
          updateExpiry("♾️ Lifetime access")
        end
        
        -- Update username with Discord if available
        if data.discord_username then
          usernameLabel.Text = data.discord_username
        end
        
        updateStatus("📦 Loading script...", Color3.fromRGB(100, 180, 255))
        task.wait(0.3)
        
        -- Derive key using server's salt + timestamp
        local salt = data.salt or ""
        local serverTs = data.timestamp or os.time()
        local dk = salt .. hw .. sessionKey .. tostring(serverTs)
        
        local h = 0
        for i = 1, #dk do
          h = bit32.bxor(h * 31, string.byte(dk, i))
          h = h % 2147483647
        end
        
        local key = ""
        local s = h
        for i = 1, 32 do
          s = bit32.bxor(s * 1103515245 + 12345, s)
          key = key .. string.char((s % 95) + 32)
        end
        
        local code
        
        -- ========================================
        -- BINARY STREAM DELIVERY (Luarmor-identical)
        -- ========================================
        if data.binary_stream and data.delivery_mode == "binary" then
          updateStatus("📡 Binary stream...", Color3.fromRGB(100, 180, 255))
          
          -- Base64 decode binary stream
          local b64 = data.binary_stream
          local alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/"
          local decTable = {}
          for i = 1, 64 do decTable[alphabet:sub(i,i)] = i - 1 end
          
          local rawBytes = {}
          for i = 1, #b64, 4 do
            local a = decTable[b64:sub(i,i)] or 0
            local b = decTable[b64:sub(i+1,i+1)] or 0
            local c = decTable[b64:sub(i+2,i+2)] or 0
            local d = decTable[b64:sub(i+3,i+3)] or 0
            local n = a * 262144 + b * 4096 + c * 64 + d
            table.insert(rawBytes, bit32.band(bit32.rshift(n, 16), 255))
            if b64:sub(i+2,i+2) ~= "=" then table.insert(rawBytes, bit32.band(bit32.rshift(n, 8), 255)) end
            if b64:sub(i+3,i+3) ~= "=" then table.insert(rawBytes, bit32.band(n, 255)) end
          end
          
          -- Parse binary header (8 bytes)
          if #rawBytes < 16 then
            updateStatus("❌ Invalid binary", Color3.fromRGB(255, 100, 100))
            task.wait(1.5)
            closeGui(false)
            error("Invalid binary stream")
            return
          end
          
          local totalSize = bit32.bor(
            bit32.lshift(rawBytes[1], 24),
            bit32.lshift(rawBytes[2], 16),
            bit32.lshift(rawBytes[3], 8),
            rawBytes[4]
          )
          
          -- Parse chunks
          local offset = 9
          local chunks = {}
          
          while offset <= #rawBytes - 8 do
            local chunkIdx = bit32.bor(bit32.lshift(rawBytes[offset], 8), rawBytes[offset + 1])
            local sizeAndFlag = bit32.bor(bit32.lshift(rawBytes[offset + 2], 8), rawBytes[offset + 3])
            local isLast = bit32.band(sizeAndFlag, 0x8000) ~= 0
            local chunkSize = bit32.band(sizeAndFlag, 0x7FFF)
            
            offset = offset + 4
            
            local chunkData = {}
            for i = 1, chunkSize do
              if offset + i - 1 <= #rawBytes then
                chunkData[i] = rawBytes[offset + i - 1]
              end
            end
            chunks[chunkIdx + 1] = chunkData
            
            offset = offset + chunkSize
            if isLast then break end
          end
          
          -- Reassemble encrypted data
          local encrypted = {}
          for _, chunk in ipairs(chunks) do
            for _, byte in ipairs(chunk) do
              table.insert(encrypted, byte)
            end
          end
          
          -- XOR decrypt with position + salt
          local decrypted = {}
          for i = 1, #encrypted do
            local keyByte = key:byte((i - 1) % #key + 1)
            local saltByte = salt:byte((i - 1) % #salt + 1) or 0
            local posSalt = ((i - 1) * 7 + 13) % 256
            decrypted[i] = string.char(bit32.bxor(bit32.bxor(bit32.bxor(encrypted[i], keyByte), posSalt), saltByte))
          end
          
          code = table.concat(decrypted)
          
        else
          -- Legacy XOR mode
          local b64 = data.script
          local alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/"
          local decTable = {}
          for i = 1, 64 do decTable[alphabet:sub(i,i)] = i - 1 end
          
          local decoded = {}
          for i = 1, #b64, 4 do
            local a = decTable[b64:sub(i,i)] or 0
            local b = decTable[b64:sub(i+1,i+1)] or 0
            local c = decTable[b64:sub(i+2,i+2)] or 0
            local d = decTable[b64:sub(i+3,i+3)] or 0
            local n = a * 262144 + b * 4096 + c * 64 + d
            table.insert(decoded, string.char(bit32.band(bit32.rshift(n, 16), 255)))
            if b64:sub(i+2,i+2) ~= "=" then table.insert(decoded, string.char(bit32.band(bit32.rshift(n, 8), 255))) end
            if b64:sub(i+3,i+3) ~= "=" then table.insert(decoded, string.char(bit32.band(n, 255))) end
          end
          local encrypted = table.concat(decoded)
          
          -- XOR decrypt with position salt
          local decrypted = {}
          for i = 1, #encrypted do
            local keyByte = key:byte((i - 1) % #key + 1)
            local posSalt = ((i - 1) * 7 + 13) % 256
            decrypted[i] = string.char(bit32.bxor(bit32.bxor(encrypted:byte(i), keyByte), posSalt))
          end
          
          code = table.concat(decrypted)
        end
        
        local fn = _SA_LOADSTRING(code) -- Uses getrenv protected loadstring
        
        if fn then
          updateStatus("🚀 Executing...", Color3.fromRGB(100, 220, 150))
          task.wait(0.5)
          closeGui(true)
          _G.__SA = true
          fn()
        else
          updateStatus("❌ Failed to load", Color3.fromRGB(255, 100, 100))
          task.wait(1.5)
          closeGui(false)
          error("Failed to load script")
        end
      else
        local msg = data and data.message or "Validation failed"
        updateStatus("❌ " .. msg, Color3.fromRGB(255, 100, 100))
        task.wait(2)
        closeGui(false)
        error(msg)
      end
    else
      updateStatus("❌ Server unavailable", Color3.fromRGB(255, 100, 100))
      task.wait(1.5)
      closeGui(false)
      error("Server unavailable")
    end
  end
end

local _result = ${funcName}()
if type(_result) == "function" then
  return _result()
else
  return _result
end
`;
}

// (Duplicate generateLayer5HTTPFallback removed - using single generateLayer5)

// =====================================================
// LAYER 6: SuperflowBytecode (captured_6.lua) - Valid Lua only
// This must be valid Lua code, NOT JSON, to avoid parse errors
// =====================================================
function generateLayer6(scriptId: string, salt: string): string {
  const targetSize = 100 * 1024; // 100KB - reduced for performance
  
  const hexChars = '0123456789abcdef';
  const generateHexBlock = (size: number): string => {
    let result = '';
    for (let i = 0; i < size; i++) {
      result += hexChars[Math.floor(Math.random() * 16)];
    }
    return result;
  };
  
  // Generate random numbers for "bytecode" look
  const generateFakeNumbers = (count: number): string => {
    const nums: number[] = [];
    for (let i = 0; i < count; i++) {
      nums.push(Math.floor(Math.random() * 256));
    }
    return nums.join(',');
  };
  
  // IMPORTANT: Return valid Lua code, not JSON
  const luaCode = `--[=[
SHADOWAUTH SUPERFLOW BYTECODE V7.0
==================================
This file contains ShadowAuth's proprietary SuperflowBytecode protection.
Protected by: ShadowAuth Enterprise Security
Timestamp: ${new Date().toISOString()}
Script: ${scriptId.substring(0, 8)}
Hash: ${generateHexBlock(64)}
]=]

local _G = _G
local _sf_data = {
  magic = {0x1B, 0x4C, 0x75, 0x61, 0x53, 0x00},
  version = ${Math.floor(Math.random() * 100)},
  flags = ${Math.floor(Math.random() * 65535)},
  timestamp = ${Date.now()},
  hash = "${generateHexBlock(64)}",
  signature = "${generateHexBlock(128)}",
  bytecode = {${generateFakeNumbers(500)}},
  constants = {"${generateHexBlock(16)}", "${generateHexBlock(16)}", "${generateHexBlock(16)}"},
}

-- Padding data (anti-extraction)
local _sf_padding = [[
${' '.repeat(Math.max(0, targetSize - 2000))}
]]

-- Verification
local _sf_verified = true
_G.__SA_SUPERFLOW_VERIFIED = _sf_verified
_G.__SA_SF_HASH = "${generateHexBlock(32)}"

return function()
  return _sf_verified, _G.__SA_SF_HASH
end`;

  return luaCode;
}

// =====================================================
// LAYER 7: Kick Handler (captured_7.lua)
// Error/kick handling script
// =====================================================
function generateLayer7(): string {
  return `local t,r = ...
spawn(function() while wait() do pcall(function() game:GetService("CoreGui").RobloxPromptGui.promptOverlay.ErrorPrompt.TitleFrame.ErrorTitle.Text = t
game:GetService("CoreGui").RobloxPromptGui.promptOverlay.ErrorPrompt.MessageArea.ErrorFrame.ErrorMessage.Text = r end) end end)
game:GetService('Players').LocalPlayer:Kick(r)
`;
}

// =====================================================
// HELPER: Obfuscate with Luraph
// =====================================================
async function obfuscateWithLuraph(code: string, layerName: string): Promise<string> {
  const luraphApiKey = Deno.env.get("LURAPH_API_KEY");
  if (!luraphApiKey || !ENABLE_LURAPH) {
    console.warn(`Luraph: No API key for ${layerName}`);
    return code;
  }
  
  try {
    console.log(`Luraph: Obfuscating ${layerName}...`);
    const luraph = new LuraphClient(luraphApiKey);
    const obfuscated = await luraph.obfuscate(code, `${layerName}.lua`);
    console.log(`Luraph: SUCCESS - ${layerName} protected`);
    return obfuscated;
  } catch (err) {
    console.error(`Luraph failed for ${layerName}:`, err);
    return code;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const clientIP = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const ua = req.headers.get("user-agent") || "";
  const sig = req.headers.get("x-shadow-sig");
  const hwid = req.headers.get("x-shadow-hwid") || "";
  
  // Check blacklist using Deno KV (persistent)
  const blacklistCheck = await isBlacklisted(clientIP, hwid);
  if (blacklistCheck.blocked) {
    console.log(`[KV] Blocked blacklisted: IP=${clientIP}, HWID=${hwid}`);
    return unauthorizedResponse(req);
  }
  
  // Rate limiting using Deno KV (persistent)
  const rateLimit = await checkRateLimit(`loader:${clientIP}`, 30, 30000);
  if (!rateLimit.allowed) {
    console.log(`[KV] Rate limited: IP=${clientIP}`);
    return unauthorizedResponse(req);
  }

  if (!sig && !isExecutor(ua)) {
    return unauthorizedResponse(req);
  }

  try {
    const url = new URL(req.url);
    const layerParam = url.searchParams.get("layer");
    const vParam = url.searchParams.get("v");
    const pathParts = url.pathname.split("/").filter(Boolean);
    const scriptId = pathParts[pathParts.length - 1];

    if (!scriptId || scriptId.length < 30) {
      return new Response(`error("Invalid")`, { headers: { ...corsHeaders, "Content-Type": "text/plain" } });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: script } = await supabase
      .from("scripts")
      .select("id, name, content, updated_at")
      .eq("id", scriptId)
      .single();

    if (!script) {
      return new Response(`error("Not found")`, { headers: { ...corsHeaders, "Content-Type": "text/plain" } });
    }

    // IMPORTANT: Make initVersion stable per script content (fixes cache misses / slow loads).
    // If caller provided `v=...`, respect it; otherwise derive from script content hash.
    const initVersion = (vParam && vParam.trim())
      ? vParam.trim()
      : await generateScriptHash(script.content);

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const sessionSalt = generateSalt(scriptId, clientIP);

    console.log(`Loader v${LOADER_TEMPLATE_VERSION}: Layer ${layerParam || "1"}, Script: ${scriptId.substring(0, 8)}..., IP: ${clientIP}`);

    // =====================================================
    // PERSISTENT BUILD CACHE (Luarmor-style)
    // =====================================================
    const buildKey = { script_id: scriptId, version: initVersion };
    const fetchBuild = async () => {
      const { data } = await supabase
        .from("script_builds")
        .select("layer2, layer3, layer4, layer5")
        .eq("script_id", buildKey.script_id)
        .eq("version", buildKey.version)
        .maybeSingle();
      return data as null | { layer2?: string; layer3?: string; layer4?: string; layer5?: string };
    };

    const upsertBuildLayer = async (layer: 2 | 3 | 4 | 5, code: string) => {
      const patch: Record<string, unknown> = {
        script_id: buildKey.script_id,
        version: buildKey.version,
        updated_at: new Date().toISOString(),
      };
      patch[`layer${layer}`] = code;
      await supabase
        .from("script_builds")
        .upsert(patch, { onConflict: "script_id,version" });
    };

    // =====================================================
    // LAYER ROUTING - Each layer is a separate HTTP response
    // =====================================================
    
    const getLayerCacheKey = (layer: number) => `layer${layer}_${scriptId.substring(0, 8)}_${initVersion}`;
    
    // LAYER 2: Bootstrapper
    if (layerParam === "2" || layerParam === "init") {
      console.log("Returning Layer 2: Bootstrapper");

      // Serve persisted build if available
      const build = await fetchBuild();
      if (build?.layer2 && build.layer2.length > 100) {
        return new Response(build.layer2, {
          headers: {
            ...corsHeaders,
            "Content-Type": "text/plain",
            "X-Layer": "2",
            "X-Build": "hit",
            "Cache-Control": "public, max-age=31536000, immutable",
          }
        });
      }
      
      const cacheKey = getLayerCacheKey(2);
      const cached = loaderCache.get(cacheKey);
      if (cached && (Date.now() - cached.timestamp) < 300000) {
        return new Response(cached.code, {
          headers: { ...corsHeaders, "Content-Type": "text/plain", "X-Layer": "2", "X-Build": "mem" }
        });
      }
      
      const rawCode = generateLayer2(supabaseUrl!, scriptId, initVersion);
      const protectedCode = await obfuscateWithLuraph(rawCode, `layer2_${scriptId.substring(0, 8)}`);
      
      loaderCache.set(cacheKey, { code: protectedCode, timestamp: Date.now() });
      // Persist for future (Luarmor-style)
      await upsertBuildLayer(2, protectedCode);
      
      return new Response(protectedCode, {
        headers: {
          ...corsHeaders,
          "Content-Type": "text/plain",
          "X-Layer": "2",
          "X-Build": "miss",
          "Cache-Control": "public, max-age=31536000, immutable",
        }
      });
    }
    
    // LAYER 3: ASCII Wrapper 1
    if (layerParam === "3") {
      console.log("Returning Layer 3: ASCII Wrapper 1");

      const build = await fetchBuild();
      if (build?.layer3 && build.layer3.length > 100) {
        return new Response(build.layer3, {
          headers: {
            ...corsHeaders,
            "Content-Type": "text/plain",
            "X-Layer": "3",
            "X-Build": "hit",
            "Cache-Control": "public, max-age=31536000, immutable",
          }
        });
      }
      
      const cacheKey = getLayerCacheKey(3);
      const cached = loaderCache.get(cacheKey);
      if (cached && (Date.now() - cached.timestamp) < 300000) {
        return new Response(cached.code, {
          headers: { ...corsHeaders, "Content-Type": "text/plain", "X-Layer": "3", "X-Build": "mem" }
        });
      }
      
      const rawCode = generateLayer3(supabaseUrl!, scriptId, initVersion);
      const protectedCode = await obfuscateWithLuraph(rawCode, `layer3_${scriptId.substring(0, 8)}`);
      
      loaderCache.set(cacheKey, { code: protectedCode, timestamp: Date.now() });
      await upsertBuildLayer(3, protectedCode);
      
      return new Response(protectedCode, {
        headers: {
          ...corsHeaders,
          "Content-Type": "text/plain",
          "X-Layer": "3",
          "X-Build": "miss",
          "Cache-Control": "public, max-age=31536000, immutable",
        }
      });
    }
    
    // LAYER 4: Core (Luraph Protected)
    if (layerParam === "4" || layerParam === "core") {
      console.log("Returning Layer 4: Luraph Protected Core");

      const build = await fetchBuild();
      if (build?.layer4 && build.layer4.length > 100) {
        return new Response(build.layer4.replace(/__SESSION_SALT__/g, sessionSalt), {
          headers: {
            ...corsHeaders,
            "Content-Type": "text/plain",
            "X-Layer": "4",
            "X-Build": "hit",
            "Cache-Control": "public, max-age=31536000, immutable",
          }
        });
      }
      
      const cacheKey = getLayerCacheKey(4);
      const cached = loaderCache.get(cacheKey);
      if (cached && (Date.now() - cached.timestamp) < 300000) {
        const code = cached.code.replace(/__SESSION_SALT__/g, sessionSalt);
        return new Response(code, {
          headers: { ...corsHeaders, "Content-Type": "text/plain", "X-Layer": "4", "X-Build": "mem" }
        });
      }
      
      const rawCode = generateLayer4Wrapper(supabaseUrl!, scriptId, initVersion);
      const protectedCode = await obfuscateWithLuraph(rawCode, `layer4_${scriptId.substring(0, 8)}`);
      
      loaderCache.set(cacheKey, { code: protectedCode, timestamp: Date.now() });
      await upsertBuildLayer(4, protectedCode);
      
      const finalCode = protectedCode.replace(/__SESSION_SALT__/g, sessionSalt);
      return new Response(finalCode, {
        headers: {
          ...corsHeaders,
          "Content-Type": "text/plain",
          "X-Layer": "4",
          "X-Build": "miss",
          "Cache-Control": "public, max-age=31536000, immutable",
        }
      });
    }
    
    // LAYER 5: Validation Wrapper
    if (layerParam === "5") {
      console.log("Returning Layer 5: Validation Wrapper");

      const build = await fetchBuild();
      if (build?.layer5 && build.layer5.length > 100) {
        return new Response(build.layer5.replace(/__SESSION_SALT__/g, sessionSalt), {
          headers: {
            ...corsHeaders,
            "Content-Type": "text/plain",
            "X-Layer": "5",
            "X-Build": "hit",
            "Cache-Control": "public, max-age=31536000, immutable",
          }
        });
      }
      
      const cacheKey = getLayerCacheKey(5);
      const cached = loaderCache.get(cacheKey);
      if (cached && (Date.now() - cached.timestamp) < 300000) {
        const code = cached.code.replace(/__SESSION_SALT__/g, sessionSalt);
        return new Response(code, {
          headers: { ...corsHeaders, "Content-Type": "text/plain", "X-Layer": "5", "X-Build": "mem" }
        });
      }
      
      const rawCode = generateLayer5(supabaseUrl!, scriptId, initVersion);
      const protectedCode = await obfuscateWithLuraph(rawCode, `layer5_${scriptId.substring(0, 8)}`);
      
      loaderCache.set(cacheKey, { code: protectedCode, timestamp: Date.now() });
      await upsertBuildLayer(5, protectedCode);
      
      const finalCode = protectedCode.replace(/__SESSION_SALT__/g, sessionSalt);
      return new Response(finalCode, {
        headers: {
          ...corsHeaders,
          "Content-Type": "text/plain",
          "X-Layer": "5",
          "X-Build": "miss",
          "Cache-Control": "public, max-age=31536000, immutable",
        }
      });
    }

    // Prebuild endpoint: warms persistent cache for layers 2-5
    if (layerParam === "prebuild") {
      console.log("Prebuild requested");
      // Force-generate layers (they will persist via upsertBuildLayer)
      for (const L of ["2", "3", "4", "5"] as const) {
        await fetch(`${supabaseUrl}/functions/v1/loader/${scriptId}?layer=${L}&v=${initVersion}`, {
          headers: { "x-shadow-sig": "ShadowAuth-Prebuild" },
        });
      }
      return new Response("ok", {
        headers: { ...corsHeaders, "Content-Type": "text/plain" }
      });
    }
    
    // LAYER 6: SuperflowBytecode (16MB)
    if (layerParam === "6" || layerParam === "superflow" || layerParam === "bytecode") {
      console.log("Returning Layer 6: SuperflowBytecode (16MB)");
      
      const cacheKey = `superflow_${scriptId.substring(0, 8)}_${initVersion}`;
      const cached = loaderCache.get(cacheKey);
      if (cached && (Date.now() - cached.timestamp) < 600000) {
        console.log(`Layer 6 cache hit: ${cached.code.length} bytes`);
        return new Response(cached.code, {
          headers: { 
            ...corsHeaders, 
            "Content-Type": "text/plain",
            "X-Layer": "6-superflow",
            "X-Size": cached.code.length.toString()
          }
        });
      }
      
      const superflowCode = generateLayer6(scriptId, sessionSalt);
      loaderCache.set(cacheKey, { code: superflowCode, timestamp: Date.now() });
      
      console.log(`SuperflowBytecode generated: ${(superflowCode.length / 1024 / 1024).toFixed(2)}MB`);
      
      return new Response(superflowCode, {
        headers: { 
          ...corsHeaders, 
          "Content-Type": "text/plain",
          "X-Layer": "6-superflow",
          "X-Size": superflowCode.length.toString()
        }
      });
    }
    
    // LAYER 7: Kick Handler
    if (layerParam === "7" || layerParam === "kick") {
      console.log("Returning Layer 7: Kick Handler");
      const kickCode = generateLayer7();
      return new Response(kickCode, {
        headers: { ...corsHeaders, "Content-Type": "text/plain", "X-Layer": "7" }
      });
    }
    
    // =====================================================
    // DEFAULT: LAYER 1 - Initial Loader
    // =====================================================
    console.log("Returning Layer 1: Initial Loader");
    const layer1Code = generateLayer1(supabaseUrl!, scriptId, initVersion);
    
    return new Response(layer1Code, {
      headers: { ...corsHeaders, "Content-Type": "text/plain", "X-Layer": "1" }
    });

  } catch (error) {
    console.error("Loader error:", error);
    return new Response(`error("Server error")`, { 
      status: 500, 
      headers: { ...corsHeaders, "Content-Type": "text/plain" } 
    });
  }
});
