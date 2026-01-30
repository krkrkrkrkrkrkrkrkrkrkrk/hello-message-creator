import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-shadow-sig, x-shadow-key",
  "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
  "Pragma": "no-cache",
};

const UNAUTHORIZED = "Unauthorized";

function isExecutor(ua: string): boolean {
  const patterns = [/synapse/i, /krnl/i, /fluxus/i, /electron/i, /oxygen/i, /sentinel/i, 
    /celery/i, /arceus/i, /roblox/i, /comet/i, /trigon/i, /delta/i, /hydrogen/i, 
    /evon/i, /vegax/i, /jjsploit/i, /nihon/i, /zorara/i, /solara/i, /wave/i, /script-?ware/i];
  return patterns.some(p => p.test(ua));
}

const loaderRateLimit = new Map<string, { count: number; lastReset: number }>();
const loaderCache = new Map<string, { code: string; timestamp: number }>();

// =====================================================
// SHADOWAUTH LOADER v14.2.0 - WITH LURAPH INTEGRATION
// RNG Verification + Float Detection + Scope Counters
// Control Flow Flattening + Opaque Predicates + VM Layer
// =====================================================
const LOADER_TEMPLATE_VERSION = "15.0.0"; // Modern Discord Avatar UI + Real-time Kick Detection
const ENABLE_LURAPH = true; // ENABLED - Luraph bytecode VM protection
const LURAPH_API_URL = "https://api.lura.ph/v1";

// =====================================================
// LURAPH API CLIENT - Full Integration
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
      // Per Luraph docs: status endpoint returns empty response on success, JSON with error on failure
      const text = await response.text();
      if (text && text.trim()) {
        try {
          const data = JSON.parse(text);
          if (data.error) {
            throw new Error(`Luraph error: ${data.error}`);
          }
        } catch (e) {
          // Non-JSON response, continue
          console.log('Luraph status response (non-JSON):', text.substring(0, 100));
        }
      }
      return; // Empty = complete
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

// =====================================================
// ADVANCED OBFUSCATION ENGINE
// =====================================================

function generateRandomVarName(length: number = 8): string {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ_';
  const nums = '0123456789';
  let result = chars[Math.floor(Math.random() * chars.length)];
  for (let i = 1; i < length; i++) {
    result += (chars + nums)[Math.floor(Math.random() * (chars.length + nums.length))];
  }
  return result;
}

function generateRandomNumber(): number {
  return Math.floor(Math.random() * 9000000) + 1000000;
}

function encryptStringToTable(str: string, key: number): string {
  const encrypted: number[] = [];
  for (let i = 0; i < str.length; i++) {
    const salt = (i * 7 + 13) % 256;
    encrypted.push(str.charCodeAt(i) ^ ((key + salt) % 256));
  }
  return `{${encrypted.join(',')}}`;
}

function generateJunkCode(v: Record<string, string>): string {
  const patterns = [
    () => `local ${generateRandomVarName()} = function(a,b,c) return (a or b) and c or nil end`,
    () => `local ${generateRandomVarName()} = {${Array(5).fill(0).map(() => Math.random()).join(',')}}`,
    () => `if false then print(${Math.random()}) end`,
    () => `local ${generateRandomVarName()} = string.rep("", math.floor(0))`,
    () => `local ${generateRandomVarName()} = function() return math.random(1,99999) end`,
  ];
  return patterns[Math.floor(Math.random() * patterns.length)]();
}

function generateIntegrityHash(): number {
  return Math.floor(Math.random() * 2147483647);
}

// =====================================================
// MULTI-LAYER DATA GENERATION (LIKE LUARMOR)
// Generates encrypted data for multi-layer loading
// =====================================================
function generateMultiLayerData(content: string, salt: string, scriptId: string): {
  headerData: number[];
  headerHex: string;
  headerNum: number;
  headerStr: string;
  footerNum: number;
  footerHex: string;
  footerStr: string;
  checksum: number;
  encData: string;
  encKey: string;
} {
  // Generate random header data (like Luarmor's _bsdata0)
  const headerData: number[] = [];
  for (let i = 0; i < 4; i++) {
    headerData.push(Math.floor(Math.random() * 4294967295));
  }
  
  // Generate encrypted strings
  const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
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
  
  // Generate hex string like Luarmor
  let footerHex = '';
  for (let i = 0; i < 200; i++) {
    footerHex += hexChars[Math.floor(Math.random() * 16)];
  }
  
  // Generate pattern string like Luarmor (R1-.E3ECEAA024DE...)
  const patternChars = 'ABCDEFRL0123456789._-';
  let footerStr = '';
  for (let i = 0; i < 100; i++) {
    footerStr += patternChars[Math.floor(Math.random() * patternChars.length)];
  }
  
  const checksum = Math.floor(Math.random() * 99999999);
  
  // Generate encrypted content data
  const encKey = salt.substring(0, 16) + scriptId.substring(0, 8);
  
  // Simple XOR encryption for the loader chain data
  let encData = '';
  const dataToEncrypt = `shadowauth:${scriptId}:${Date.now()}`;
  for (let i = 0; i < dataToEncrypt.length; i++) {
    const charCode = dataToEncrypt.charCodeAt(i) ^ encKey.charCodeAt(i % encKey.length);
    encData += String.fromCharCode(charCode);
  }
  // Base64 encode
  encData = btoa(encData);
  
  return {
    headerData,
    headerHex,
    headerNum,
    headerStr,
    footerNum,
    footerHex,
    footerStr,
    checksum,
    encData,
    encKey
  };
}

// =====================================================
// RNG VERIFICATION FUNCTIONS (RBLXWHITELIST PATTERN)
// Server applies transformation, client verifies with inverse
// =====================================================
// f1(x) = 2x - 32 → f1^-1(y) = (y + 32) / 2
// f2(x) = 5x + 256 → f2^-1(y) = (y - 256) / 5
function transformRNG1(value: number): number {
  return (value * 2) - 32;
}

function transformRNG2(value: number): number {
  return (value * 5) + 256;
}

// =====================================================
// LAYER GENERATORS (LUARMOR MULTI-LAYER STYLE)
// =====================================================

function generateLayer2Bootstrapper(supabaseUrl: string, scriptId: string, initVersion: string, sessionSalt: string): string {
  const cacheFolder = `static_content_${Math.floor(Date.now() / 1000)}`;
  const version = `5.0.${Math.floor(Math.random() * 999)}`;
  
  return `--[[
    ShadowAuth V5 bootstrapper for scripts. 
    this code fetches & updates & encrypts & decrypts cached ShadowAuth scripts
    https://shadowauth.dev/
]]

local _SHADOWAUTH_VERSION = "${version}"
local _CACHE_FOLDER = "${cacheFolder}"
local _INIT_VERSION = "${initVersion}"

-- Anti-hook detection layer
local _native_loadstring = loadstring
local _native_getfenv = getfenv or function() return _G end
local _native_setfenv = setfenv or function(f,e) return f end
local _native_pcall = pcall
local _native_pairs = pairs
local _native_type = type
local _native_tostring = tostring
local _native_error = error
local _native_httpget = game.HttpGet

-- Hook detection
local function _detectHooks()
  if isfunctionhooked then
    if pcall(isfunctionhooked, loadstring) and isfunctionhooked(loadstring) then return true end
    if pcall(isfunctionhooked, getfenv) and isfunctionhooked(getfenv) then return true end
  end
  if getmetatable(loadstring) ~= nil then return true end
  if getmetatable(getfenv) ~= nil then return true end
  return false
end

-- XOR Decryption
local function _xorDecrypt(data, key)
  local result = {}
  for i = 1, #data do
    local keyByte = key:byte((i - 1) % #key + 1)
    result[i] = string.char(bit32.bxor(data:byte(i), keyByte))
  end
  return table.concat(result)
end

-- Base64 Decode
local function _base64Decode(input)
  local b = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
  input = input:gsub('[^'..b..'=]', '')
  return (input:gsub('.', function(x)
    if x == '=' then return '' end
    local r, f = '', (b:find(x) - 1)
    for i = 6, 1, -1 do r = r .. (f % 2 ^ i - f % 2 ^ (i - 1) > 0 and '1' or '0') end
    return r
  end):gsub('%d%d%d?%d?%d?%d?%d?%d?', function(x)
    if #x ~= 8 then return '' end
    local c = 0
    for i = 1, 8 do c = c + (x:sub(i, i) == '1' and 2 ^ (8 - i) or 0) end
    return string.char(c)
  end))
end

-- Cache management
local _cache = {}
local function _readCache(name)
  if _cache[name] then return _cache[name] end
  local ok, data = pcall(function()
    if readfile then
      return readfile(_CACHE_FOLDER .. "/" .. name)
    end
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

-- Fetch next layer
local function _fetchLayer3()
  local url = "${supabaseUrl}/functions/v1/loader/${scriptId}?layer=3&v=${initVersion}"
  local ok, layer3 = pcall(function()
    return game:HttpGet(url)
  end)
  if ok and layer3 and #layer3 > 100 then
    return layer3
  end
  return nil
end

local function _fetchLayer4()
  local url = "${supabaseUrl}/functions/v1/loader/${scriptId}?layer=4&v=${initVersion}"
  local ok, layer4 = pcall(function()
    return game:HttpGet(url)
  end)
  if ok and layer4 and #layer4 > 100 then
    return layer4
  end
  return nil
end

-- Main execution
if _detectHooks() then
  -- Return nothing if hooked
  return function() return nil end
end

-- Try cache first for Layer 3
local cachedLayer3 = _readCache("layer3-" .. _INIT_VERSION .. ".lua")
if cachedLayer3 and #cachedLayer3 > 1000 then
  local fn = _native_loadstring(cachedLayer3)
  if fn then 
    -- Layer 3 fetches Layer 4
    return fn() 
  end
end

-- Fetch Layer 3
local layer3Code = _fetchLayer3()
if layer3Code and #layer3Code > 100 then
  _writeCache("layer3-" .. _INIT_VERSION .. ".lua", layer3Code)
  local fn = _native_loadstring(layer3Code)
  if fn then 
    return fn() 
  end
end

-- Cleanup old cache
pcall(function() 
  for i,v in pairs(listfiles('./'..(_CACHE_FOLDER))) do 
    local m=v:match('(layer[%d][%w%-]*).lua$') 
    if m then pcall(delfile, _CACHE_FOLDER..'/'..m..'.lua') end 
  end 
end)

return function() error("Failed to load Layer 3") end
`;
}

function generateLayer3Wrapper(supabaseUrl: string, scriptId: string, initVersion: string): string {
  const randomFunc = generateRandomVarName(12);
  
  return `--[[
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

    ShadowAuth Protected Script - Layer 3
    https://shadowauth.dev/
]]

-- Layer 3: Wrapper that fetches Layer 4 (protected core)
local ${randomFunc} = function()
  local _url = "${supabaseUrl}/functions/v1/loader/${scriptId}?layer=4&v=${initVersion}"
  local _ok, _code = pcall(function()
    return game:HttpGet(_url)
  end)
  
  if _ok and _code and #_code > 500 then
    local _fn = loadstring(_code)
    if _fn then
      return _fn()
    end
  end
  
  return function() error("Layer 4 unavailable") end
end

return ${randomFunc}()
`;
}

function generateLayer5Wrapper(): string {
  const randomFunc = generateRandomVarName(12);
  
  return `--[[
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

    ShadowAuth Protected Script - Layer 5 (Final Wrapper)
    This layer contains the actual protected execution
    https://shadowauth.dev/
]]

return setfenv(function(...) 
  return ${randomFunc}(...) 
end, setmetatable({ 
  ["${randomFunc}"] = ... 
}, { 
  __index = getfenv((...)) 
}))
`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const clientIP = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const ua = req.headers.get("user-agent") || "";
  const sig = req.headers.get("x-shadow-sig");
  
  const now = Date.now();
  const rlData = loaderRateLimit.get(clientIP) || { count: 0, lastReset: now };
  if (now - rlData.lastReset > 30000) {
    rlData.count = 0;
    rlData.lastReset = now;
  }
  rlData.count++;
  loaderRateLimit.set(clientIP, rlData);
  
  if (rlData.count > 5) {
    return new Response(UNAUTHORIZED, { 
      status: 401, 
      headers: { ...corsHeaders, "Content-Type": "text/plain" }
    });
  }

  if (!sig && !isExecutor(ua)) {
    return new Response(UNAUTHORIZED, { 
      status: 401, 
      headers: { ...corsHeaders, "Content-Type": "text/plain" }
    });
  }

  try {
    const url = new URL(req.url);
    const cacheOnly = url.searchParams.get("cache") === "1";
    const layerParam = url.searchParams.get("layer");
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

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const sessionSalt = generateSalt(scriptId, clientIP);

    console.log(`Loader v${LOADER_TEMPLATE_VERSION}: ${scriptId.substring(0, 8)}... IP: ${clientIP}`);

    const scriptHash = await generateScriptHash(`${LOADER_TEMPLATE_VERSION}:${script.content}:${script.updated_at}`);
    const initVersion = scriptHash.substring(0, 12);
    
    // =====================================================
    // MULTI-LAYER ROUTING (LUARMOR STYLE)
    // Each layer is a separate HTTP request
    // ALL LAYERS NOW PROTECTED WITH LURAPH FOR SECURITY
    // =====================================================
    
    // Cache key format: layer{N}_{scriptId}_{initVersion}
    const getLayerCacheKey = (layer: number) => `layer${layer}_${scriptId.substring(0, 8)}_${initVersion}`;
    
    // Helper to obfuscate with Luraph (with caching)
    async function obfuscateWithLuraph(code: string, layerName: string): Promise<string> {
      const luraphApiKey = Deno.env.get("LURAPH_API_KEY");
      if (!luraphApiKey || !ENABLE_LURAPH) {
        console.warn(`Luraph: No API key for ${layerName}, using raw code`);
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
        return code; // Fallback to raw
      }
    }
    
    // LAYER 2: Bootstrapper/Init - NOW PROTECTED WITH LURAPH
    if (layerParam === "init" || layerParam === "2") {
      console.log("Returning Layer 2: Bootstrapper");
      
      // Check cache for obfuscated Layer 2
      const cacheKey = getLayerCacheKey(2);
      const cachedL2 = loaderCache.get(cacheKey);
      if (cachedL2 && (Date.now() - cachedL2.timestamp) < 300000) { // 5 min cache
        return new Response(cachedL2.code, {
          headers: { ...corsHeaders, "Content-Type": "text/plain" }
        });
      }
      
      // Generate raw bootstrapper
      const rawLayer2 = generateLayer2Bootstrapper(supabaseUrl!, scriptId, initVersion, sessionSalt);
      
      // Obfuscate with Luraph
      const protectedLayer2 = await obfuscateWithLuraph(rawLayer2, `layer2_${scriptId.substring(0, 8)}`);
      
      // Cache
      loaderCache.set(cacheKey, { code: protectedLayer2, timestamp: Date.now() });
      
      return new Response(protectedLayer2, {
        headers: { ...corsHeaders, "Content-Type": "text/plain" }
      });
    }
    
    // LAYER 3: ASCII Art Wrapper 1 - NOW PROTECTED WITH LURAPH
    if (layerParam === "3") {
      console.log("Returning Layer 3: ASCII Wrapper 1");
      
      const cacheKey = getLayerCacheKey(3);
      const cachedL3 = loaderCache.get(cacheKey);
      if (cachedL3 && (Date.now() - cachedL3.timestamp) < 300000) {
        return new Response(cachedL3.code, {
          headers: { ...corsHeaders, "Content-Type": "text/plain" }
        });
      }
      
      const rawLayer3 = generateLayer3Wrapper(supabaseUrl!, scriptId, initVersion);
      const protectedLayer3 = await obfuscateWithLuraph(rawLayer3, `layer3_${scriptId.substring(0, 8)}`);
      
      loaderCache.set(cacheKey, { code: protectedLayer3, timestamp: Date.now() });
      
      return new Response(protectedLayer3, {
        headers: { ...corsHeaders, "Content-Type": "text/plain" }
      });
    }
    
    // LAYER 4: Main protected code (Luraph obfuscated - ~800KB)
    if (layerParam === "4" || layerParam === "core") {
      console.log("Returning Layer 4: Luraph Protected Code");
      
      // Check cache for Luraph code
      const { data: cachedLoader } = await supabase
        .from("obfuscated_loaders")
        .select("loader_code, script_hash")
        .eq("script_id", scriptId)
        .maybeSingle();
      
      if (cachedLoader && cachedLoader.script_hash === scriptHash && cachedLoader.loader_code) {
        const finalCode = cachedLoader.loader_code.replace(/__SESSION_SALT__/g, sessionSalt);
        return new Response(finalCode, {
          headers: { ...corsHeaders, "Content-Type": "text/plain" }
        });
      }
      
      // Generate if not cached - this will take time (Luraph)
      // Return pending and let next request pick up the cached version
      return new Response(`-- Layer 4 generating, please retry...\nreturn nil`, {
        headers: { ...corsHeaders, "Content-Type": "text/plain" }
      });
    }
    
    // LAYER 5: Final ASCII Wrapper (~2.4KB) - NOW PROTECTED
    if (layerParam === "5") {
      console.log("Returning Layer 5: Final ASCII Wrapper");
      
      const cacheKey = getLayerCacheKey(5);
      const cachedL5 = loaderCache.get(cacheKey);
      if (cachedL5 && (Date.now() - cachedL5.timestamp) < 300000) {
        return new Response(cachedL5.code, {
          headers: { ...corsHeaders, "Content-Type": "text/plain" }
        });
      }
      
      const rawLayer5 = generateLayer5Wrapper();
      const protectedLayer5 = await obfuscateWithLuraph(rawLayer5, `layer5_${scriptId.substring(0, 8)}`);
      
      loaderCache.set(cacheKey, { code: protectedLayer5, timestamp: Date.now() });
      
      return new Response(protectedLayer5, {
        headers: { ...corsHeaders, "Content-Type": "text/plain" }
      });
    }

    // =====================================================
    // LAYER 1: Initial small loader (like Luarmor's first capture)
    // This is what gets returned to loadstring(game:HttpGet(...))
    // =====================================================
    
    // Check if we have cached Luraph code (needed for layer 4 requests)
    const { data: cachedLoader } = await supabase
      .from("obfuscated_loaders")
      .select("loader_code, script_hash")
      .eq("script_id", scriptId)
      .maybeSingle();
    
    const hasCachedCode = cachedLoader && cachedLoader.script_hash === scriptHash && cachedLoader.loader_code;

    if (cacheOnly) {
      return new Response(`-- ShadowAuth loader: PENDING\nreturn "PENDING"`, {
        headers: { ...corsHeaders, "Content-Type": "text/plain" },
      });
    }
    
    // If we don't have cached Luraph code, we need to generate it
    if (!hasCachedCode) {
      console.log("Cache miss - generating enterprise-level protected loader...");

    // =====================================================
    // VARIABLE NAME GENERATION (ADVANCED OBFUSCATION)
    // =====================================================
    const v: Record<string, string> = {};
    const varNames = [
      'lua_print', 'lua_error', 'lua_setmetatable', 'lua_rawset', 'lua_rawget',
      'lua_pairs', 'lua_newproxy', 'lua_getmetatable', 'lua_typeof', 'lua_assert',
      'lua_tostring', 'bit32_lib', 'bit_bxor', 'bit_band', 'bit_bor', 'bit_lshift',
      'bit_rshift', 'os_clock', 'os_time', 'str_sub', 'math_floor', 'math_random',
      'global_env', 'start_time', 'http_request', 'get_hwid', 'handle_crash',
      'crash_code_0', 'crash_code_16', 'xpcall_count', 'check_setfenv', 'check_stack',
      'module_loader', 'cfg', 'anti', 'env', 'req', 'hwid', 'exec', 'b64', 'xor',
      'derive', 'main', 'ui', 'log', 'err', 'hash', 'decode', 'aes_sbox', 'aes_encrypt',
      'buffer_ops', 'integrity_check', 'native_cache', 'infinite_loop', 'junk_gen',
      'rotation_func', 'metatable_wrap', 'galois_mult', 'cipher_state',
      // v12 variables
      'vm_state', 'opcode_table', 'control_flow', 'state_machine', 'opaque_pred',
      'bytecode_vm', 'instruction_ptr', 'register_file', 'stack_ptr', 'vm_executor',
      'integrity_hash', 'tamper_detect', 'memory_check', 'runtime_verify',
      // v13 variables (RBLXWhitelist patterns)
      'rng1', 'rng2', 'rng_float', 'scope_counter', 'custom_equals', 'verify_rng',
      'enc_func_key', 'jump_check', 'auth_step', 'inverse_check', 'float_check'
    ];
    
    for (const name of varNames) {
      v[name] = generateRandomVarName(8 + Math.floor(Math.random() * 4));
    }

    const strKey = Math.floor(Math.random() * 200) + 50;
    const integrityValue = generateIntegrityHash();
    const magicNumber1 = generateRandomNumber();
    const magicNumber2 = generateRandomNumber();

    // =====================================================
    // ENTERPRISE-LEVEL LOADER CODE v13.0.0
    // RNG Verification + Float Detection + Scope Counters
    // Control Flow Flattening + VM Layer + Opaque Predicates
    // =====================================================
    // =====================================================
    // TROLLFACE ASCII ART FOR HOOK TROLL MODE
    // When hooks are detected, return this instead of real code
    // =====================================================
    const TROLLFACE_ART = `
--[[
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢀⣀⣀⣀⣀⣀⣀⣀⡀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⣀⣤⣶⣾⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣶⣤⣀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢀⣴⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣷⣄⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⣴⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣷⡀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⣼⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⡄⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⣼⣿⣿⣿⣿⣿⡿⠟⠛⠛⠛⠛⠛⠻⢿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⡀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢰⣿⣿⣿⣿⠟⠁⠀⠀⠀⠀⠀⠀⠀⠀⠀⠈⠻⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣧⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⣿⣿⣿⡿⠁⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠘⢿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⡄
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢸⣿⣿⡟⠀⠀⣀⣤⣴⣶⣶⣶⣶⣦⣤⣀⠀⠀⠀⠀⠈⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⡇
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢸⣿⣿⣇⣴⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣦⡀⠀⠀⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⡇
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠘⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣷⣾⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⠃
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢻⣿⣿⣿⣿⣿⡿⠻⣿⣿⣿⣿⠟⢿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⡟⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠈⢿⣿⣿⣿⡏⠀⠀⠈⠛⠛⠁⠀⠀⢹⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⡿⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠈⢿⣿⣿⣿⣆⠀⠀⣀⣀⠀⠀⢀⣾⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⡿⠁⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠻⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⠟⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠈⠛⢿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⡿⠟⠁⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠈⠙⠛⠻⠿⠿⠿⠿⠿⠿⠟⠛⠛⠋⠉⠁⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
                                                                                                        
       Problem? :)                                       
       ═══════════════════════════════════════           
       You tried to steal this script                    
       But you got trolled instead! HAHAHA               
                                                          
       Nice try kid, but ShadowAuth is                    
       one step ahead of you!                             
                                                          
       Your HWID has been logged.                         
       IP: LOGGED | HWID: LOGGED                          
                                                          
       ═══════════════════════════════════════           
       github.com/shadowauth | Protected by ShadowAuth    
]]

-- Fake encrypted data to look real
local _trolldata = {${Array(12).fill(0).map(() => Math.floor(Math.random() * 999999999)).join(',')}}
local _fake_decrypt = function(d,k) return nil end
local _null_func = function(...) return nil end

-- Look like real code but do nothing
setfenv(function(...) return _null_func(...) end, setmetatable({ ["_nullexec"] = _null_func }, { __index = getfenv((_null_func)) }))

-- The ultimate troll
return error("Nice try! This script is protected by ShadowAuth. You've been trolled! 🎭")
`;

    const loaderCode = `
-- ShadowAuth Loader v${LOADER_TEMPLATE_VERSION} - RBLXWhitelist Security
-- RNG Verification + Float Detection + Scope Counters + Custom Equality
-- Multi-layer security: Control Flow Flattening + Opaque Predicates + VM

-- =====================================================
-- CRITICAL: HOOK DETECTION + TROLL MODE
-- If hooks detected, return trollface instead of real code
-- =====================================================
do
  local _g = getgenv and getgenv() or _G
  local _ls = _g.loadstring or loadstring
  local _hooked = false
  local _capture_hooked = false
  
  -- Check 1: Function metatable (hooks often add metatables)
  if getmetatable(_ls) ~= nil then _hooked = true end
  
  -- Check 2: Function identity test (hooks may return different function)
  if _ls ~= loadstring and _g.loadstring == loadstring then _hooked = true end
  
  -- Check 3: isfunctionhooked if available
  if isfunctionhooked then
    local ok, h = pcall(isfunctionhooked, _ls)
    if ok and h then _hooked = true end
    local ok2, h2 = pcall(isfunctionhooked, loadstring)
    if ok2 and h2 then _hooked = true end
  end
  
  -- Check 4: getgenv itself hooked
  if getgenv then
    local gmt = getmetatable(getgenv)
    if gmt ~= nil then _hooked = true end
  end
  
  -- Check 5: debug.info check (hooks change source info)
  if debug and debug.info then
    local ok, src = pcall(function() return debug.info(_ls, "s") end)
    if ok and src and (src:lower():find("hook") or src:lower():find("spy") or src:lower():find("capture")) then
      _hooked = true
    end
  end
  
  -- Check 6: writefile/setclipboard hooks (TROLL MODE TARGET)
  if writefile then
    if isfunctionhooked then
      local ok, h = pcall(isfunctionhooked, writefile)
      if ok and h then _capture_hooked = true end
    end
    -- Check metatable on writefile
    if getmetatable(writefile) ~= nil then _capture_hooked = true end
  end
  
  if setclipboard then
    if isfunctionhooked then
      local ok, h = pcall(isfunctionhooked, setclipboard)
      if ok and h then _capture_hooked = true end
    end
    if getmetatable(setclipboard) ~= nil then _capture_hooked = true end
  end
  
  -- TROLL MODE: If capture hooks detected, return trollface
  if _capture_hooked or _hooked then
    -- Return the trollface art instead of crashing
    return loadstring([=[${TROLLFACE_ART.replace(/\\/g, '\\\\').replace(/\[/g, '\\[').replace(/\]/g, '\\]').replace(/=/g, '\\=')}]=])()
  end
end

-- =====================================================
-- NATIVE FUNCTION CACHE (CRITICAL: BEFORE ANY HOOKS)
-- =====================================================
local ${v.lua_print} = print
local ${v.lua_error} = error
local ${v.lua_setmetatable} = setmetatable
local ${v.lua_rawset} = rawset
local ${v.lua_rawget} = rawget
local ${v.lua_pairs} = pairs
local ${v.lua_newproxy} = newproxy
local ${v.lua_getmetatable} = getmetatable
local ${v.lua_typeof} = typeof
local ${v.lua_assert} = assert
local ${v.lua_tostring} = tostring
local ${v.bit32_lib} = bit32
local ${v.bit_bxor} = ${v.bit32_lib}.bxor
local ${v.bit_band} = ${v.bit32_lib}.band
local ${v.bit_bor} = ${v.bit32_lib}.bor
local ${v.bit_lshift} = ${v.bit32_lib}.lshift
local ${v.bit_rshift} = ${v.bit32_lib}.rshift
local ${v.os_clock} = os.clock
local ${v.os_time} = os.time
local ${v.str_sub} = string.sub
local ${v.math_floor} = math.floor
local ${v.math_random} = math.random
local ${v.global_env} = getfenv()
local ${v.start_time} = ${v.os_clock}()

-- =====================================================
-- SCOPE COUNTER (RBLXWHITELIST PATTERN - JUMP DETECTION)
-- Tracks authentication steps - if jumps occur, count is wrong
-- =====================================================
local ${v.scope_counter} = 0

-- =====================================================
-- CUSTOM EQUALITY FUNCTION (PREVENT EQ OPCODE HOOKS)
-- From RBLXWhitelist - prevents equality opcode manipulation
-- =====================================================
local function ${v.custom_equals}(a, b)
  -- nil check using table index
  if ({ [${v.lua_tostring}(a)] = true })["nil"] then
    return a == b
  end
  
  -- equality flipping detection
  if (a ~= a) or not (a == a) then
    while true do end
  end
  
  -- string comparison protection (concat hook detection)
  if type(a) == "string" and type(b) == "string" then
    if (a == a .. a) or (b == b .. b) then
      while true do end
    end
  end
  
  -- table-based equality check (bypass opcode hooks)
  return ({ [a] = true })[b] or false
end

-- =====================================================
-- CONTROL FLOW STATE MACHINE (FLATTENING)
-- =====================================================
local ${v.state_machine} = ${Math.floor(Math.random() * 10) + 1}
local ${v.control_flow} = {}

${v.control_flow}[1] = function() ${v.state_machine} = 2 end
${v.control_flow}[2] = function() ${v.state_machine} = 3 end
${v.control_flow}[3] = function() ${v.state_machine} = 4 end
${v.control_flow}[4] = function() ${v.state_machine} = 5 end
${v.control_flow}[5] = function() ${v.state_machine} = 6 end
${v.control_flow}[6] = function() ${v.state_machine} = 7 end
${v.control_flow}[7] = function() ${v.state_machine} = 8 end
${v.control_flow}[8] = function() ${v.state_machine} = 9 end
${v.control_flow}[9] = function() ${v.state_machine} = 10 end
${v.control_flow}[10] = function() ${v.state_machine} = 0 end

-- =====================================================
-- OPAQUE PREDICATES (ALWAYS TRUE/FALSE CONDITIONS)
-- These confuse static analysis tools
-- =====================================================
local ${v.opaque_pred} = {}
${v.opaque_pred}.always_true = function()
  local x = ${v.math_random}(1, 1000000)
  return x * x >= 0
end
${v.opaque_pred}.always_false = function()
  local x = ${v.math_random}(1, 1000000)
  return x * x < 0
end
${v.opaque_pred}.check = function(n)
  return (n * n + 1) > 0
end

${generateJunkCode(v)}

-- =====================================================
-- VIRTUAL MACHINE LAYER (INSTRUCTION EXECUTION)
-- =====================================================
local ${v.vm_state} = {
  registers = {},
  stack = {},
  ip = 1,
  running = true
}

local ${v.opcode_table} = {}
${v.opcode_table}[0x01] = function(a, b) ${v.vm_state}.registers[a] = b end
${v.opcode_table}[0x02] = function(a, b) ${v.vm_state}.registers[a] = ${v.vm_state}.registers[b] end
${v.opcode_table}[0x03] = function(a, b, c) ${v.vm_state}.registers[a] = ${v.vm_state}.registers[b] + (${v.vm_state}.registers[c] or 0) end
${v.opcode_table}[0x04] = function(a, b, c) ${v.vm_state}.registers[a] = ${v.bit_bxor}(${v.vm_state}.registers[b] or 0, ${v.vm_state}.registers[c] or 0) end
${v.opcode_table}[0x05] = function(a) table.insert(${v.vm_state}.stack, ${v.vm_state}.registers[a]) end
${v.opcode_table}[0x06] = function(a) ${v.vm_state}.registers[a] = table.remove(${v.vm_state}.stack) end
${v.opcode_table}[0xFF] = function() ${v.vm_state}.running = false end

local ${v.vm_executor} = function(bytecode)
  ${v.vm_state}.ip = 1
  ${v.vm_state}.running = true
  while ${v.vm_state}.running and ${v.vm_state}.ip <= #bytecode do
    local instr = bytecode[${v.vm_state}.ip]
    local op = ${v.opcode_table}[instr[1]]
    if op then op(instr[2], instr[3], instr[4]) end
    ${v.vm_state}.ip = ${v.vm_state}.ip + 1
  end
  return ${v.vm_state}.registers[1]
end

${generateJunkCode(v)}

-- =====================================================
-- SECURE HTTP REQUEST FUNCTION
-- =====================================================
local ${v.http_request} = request

-- =====================================================
-- HARDWARE ID FUNCTION
-- =====================================================
local ${v.get_hwid} = gethwid or function()
  return string.gsub(game:GetService("RbxAnalyticsService"):GetClientId(), "-", "")
end

-- =====================================================
-- CRASH HANDLERS (SAFE EXIT - NO FREEZING)
-- =====================================================
local ${v.script_terminated} = false

local ${v.infinite_loop} = function()
  -- Safe termination - just mark as done and return
  ${v.script_terminated} = true
  return nil
end

local ${v.handle_crash} = function(code)
  -- Silent crash handling
  ${v.script_terminated} = true
end

local ${v.crash_code_0} = function()
  ${v.handle_crash}(0)
  return nil
end

local ${v.crash_code_16} = function()
  ${v.handle_crash}(16)
  return nil
end

${generateJunkCode(v)}

-- =====================================================
-- RUNTIME INTEGRITY VERIFICATION
-- =====================================================
local ${v.integrity_hash} = ${integrityValue}
local ${v.tamper_detect} = function()
  local test_val = ${magicNumber1} + ${magicNumber2}
  if ${v.opaque_pred}.always_false() then
    ${v.crash_code_0}()
  end
  return test_val > 0
end

-- =====================================================
-- JUNK DATA GENERATOR
-- =====================================================
local ${v.junk_gen} = function(t)
  if t == "table" then
    local j = {}
    for i = 1, ${v.math_random}(2, 10) do
      j[${v.lua_tostring}({}) .. ${v.math_random}(1000000, 2000000)] = ${v.lua_tostring}({}) .. ${v.math_random}(1000000, 2000000)
    end
    return j
  end
  return nil
end

-- =====================================================
-- SETFENV TAMPER DETECTION
-- =====================================================
local ${v.check_setfenv} = function(func)
  return not pcall(function()
    setfenv(func, getfenv(func))
  end)
end

-- =====================================================
-- STACK OVERFLOW DETECTION (ANTI-WRAP HOOKS)
-- =====================================================
local ${v.check_stack} = function(func)
  for i = 1, 198 do
    func = coroutine.wrap(func)
  end
  local success, result = pcall(func)
  if not success and string.find(result, "C stack overflow") then
    return true
  end
  return false
end

${generateJunkCode(v)}

-- =====================================================
-- ROTATION FUNCTION (CONTROL FLOW OBFUSCATION)
-- =====================================================
local ${v.rotation_func} = function(val)
  local c = 0
  local id = function(fn) return function(x) return x end end
  return (function(value)
    c = c + 1
    if c == 82 then c = 0; return value end
    return id(function(x) return x end)(value)
  end)(val)
end

-- =====================================================
-- METATABLE WRAPPER (ANTI-TAMPER)
-- =====================================================
local ${v.metatable_wrap} = function(val)
  local c = 0
  local w = function(v) return { __index = function() return v end } end
  return (function(value)
    c = c + 1
    if c == 82 then c = 0; return value end
    return w({ __index = function() return value end }).__index()
  end)(val)
end

${generateJunkCode(v)}

-- =====================================================
-- XPCALL INTEGRITY VERIFICATION (AUTHGUARD PATTERN)
-- =====================================================
local ${v.xpcall_count} = 0

xpcall(${v.lua_tostring}, function()
  ${v.xpcall_count} = ${v.xpcall_count} + 1
end)

xpcall(${v.lua_setmetatable}, function()
  ${v.xpcall_count} = ${v.xpcall_count} + 1
end)

xpcall(setfenv, function()
  ${v.xpcall_count} = ${v.xpcall_count} + 1
end)

xpcall(pcall, function()
  ${v.xpcall_count} = ${v.xpcall_count} + 1
end)

-- Luau: these xpcalls should fail exactly 4 times
if ${v.xpcall_count} ~= 4 then
  ${v.handle_crash}(2)
  while true do end
end

${generateJunkCode(v)}

-- =====================================================
-- STRING DECRYPTION ENGINE
-- =====================================================
local function ${v.decode}(t, k)
  local r = {}
  for i = 1, #t do
    local salt = ((i-1) * 7 + 13) % 256
    r[i] = string.char(${v.bit_bxor}(t[i], (k + salt) % 256))
  end
  return table.concat(r)
end

-- =====================================================
-- ENCRYPTED CONFIGURATION
-- =====================================================
local ${v.cfg} = {
  api = ${v.decode}(${encryptStringToTable(supabaseUrl || "", strKey)}, ${strKey}),
  key = ${v.decode}(${encryptStringToTable(supabaseAnonKey, strKey)}, ${strKey}),
  sid = ${v.decode}(${encryptStringToTable(scriptId, strKey)}, ${strKey}),
  ssk = "__SESSION_SALT__",
  ep = ${v.decode}(${encryptStringToTable("/functions/v1/validate-key-v2", strKey)}, ${strKey}),
  sig = ${v.decode}(${encryptStringToTable("SA-v13-RNG", strKey)}, ${strKey}),
  ver = "${LOADER_TEMPLATE_VERSION}"
}

${generateJunkCode(v)}

-- =====================================================
-- HASH FUNCTION (INTEGRITY CHECKS)
-- =====================================================
local ${v.hash} = function(s)
  local h = 5381
  for i = 1, #s do
    h = ${v.bit_bxor}(${v.bit_lshift}(h, 5) + h, string.byte(s, i))
    h = h % 2147483647
  end
  return h
end

-- Integrity check constants
local ${generateRandomVarName()} = ${integrityValue}
local ${generateRandomVarName()} = ${magicNumber1}
local ${generateRandomVarName()} = ${magicNumber2}

${generateJunkCode(v)}

-- =====================================================
-- ANTI-HOOK DETECTION SYSTEM
-- =====================================================
local ${v.anti} = {}

${v.anti}.hooked = function(fn)
  if type(fn) ~= "function" then return true end
  
  if isfunctionhooked and type(isfunctionhooked) == "function" then
    local ok, hooked = pcall(isfunctionhooked, fn)
    if ok and hooked then return true end
  end
  
  if debug and debug.getinfo then
    local ok, info = pcall(debug.getinfo, fn, "S")
    if ok and info then
      if info.short_src and (info.short_src:find("hook") or info.short_src:find("spy")) then
        return true
      end
    end
  end
  
  if ${v.lua_getmetatable}(fn) then
    return true
  end
  
  return false
end

${v.anti}.restore = function(fn)
  if restorefunction and type(restorefunction) == "function" then
    pcall(restorefunction, fn)
  end
  if unhookfunction and type(unhookfunction) == "function" then
    pcall(unhookfunction, fn)
  end
end

${v.anti}.check = function()
  local funcs = {loadstring, getfenv, setfenv, pcall, xpcall, coroutine.wrap}
  for i = 1, #funcs do
    if funcs[i] and ${v.anti}.hooked(funcs[i]) then
      ${v.anti}.restore(funcs[i])
      if ${v.anti}.hooked(funcs[i]) then
        return false
      end
    end
  end
  return true
end

${generateJunkCode(v)}

-- =====================================================
-- ANTI-DEBUG DETECTION
-- =====================================================
local ${v.env} = {}

${v.env}.detectDebug = function()
  local spyNames = {"spyhook", "remotespy", "simplespy", "httpspy", "dex", "hydroxide"}
  for i = 1, #spyNames do
    if ${v.lua_rawget}(getgenv(), spyNames[i]) or ${v.lua_rawget}(getfenv(), spyNames[i]) then
      return true
    end
  end
  
  local debugNames = {"__DEBUG__", "__DEOBF__", "__SPY__", "__HOOK__", "__DUMP__"}
  for i = 1, #debugNames do
    if ${v.lua_rawget}(getgenv(), debugNames[i]) then
      return true
    end
  end
  
  return false
end

${v.env}.verify = function()
  local checks = {
    game ~= nil,
    workspace ~= nil,
    game.GetService ~= nil,
    ${v.lua_typeof}(game) == "Instance",
    game:IsA("DataModel")
  }
  
  for i = 1, #checks do
    if not checks[i] then return false end
  end
  
  local services = {"Players", "HttpService", "CoreGui"}
  for i = 1, #services do
    local ok, svc = pcall(function() return game:GetService(services[i]) end)
    if not ok or not svc then return false end
  end
  
  return true
end

${generateJunkCode(v)}

-- =====================================================
-- SECURE REQUEST FUNCTION
-- =====================================================
local function ${v.req}()
  local candidates = {}
  
  if ${v.http_request} and type(${v.http_request}) == "function" then 
    table.insert(candidates, {fn = ${v.http_request}, name = "request"})
  end
  if http_request and type(http_request) == "function" then 
    table.insert(candidates, {fn = http_request, name = "http_request"})
  end
  if syn and type(syn) == "table" and syn.request then 
    table.insert(candidates, {fn = syn.request, name = "syn.request"})
  end
  if http and type(http) == "table" and http.request then 
    table.insert(candidates, {fn = http.request, name = "http.request"})
  end
  if fluxus and type(fluxus) == "table" and fluxus.request then 
    table.insert(candidates, {fn = fluxus.request, name = "fluxus.request"})
  end
  
  for i = 1, #candidates do
    local fn = candidates[i].fn
    if fn and type(fn) == "function" then
      if ${v.anti}.hooked(fn) then
        ${v.anti}.restore(fn)
      end
      if not ${v.anti}.hooked(fn) then
        return fn
      end
    end
  end
  
  return nil
end

${generateJunkCode(v)}

-- =====================================================
-- HWID GENERATION
-- =====================================================
local function ${v.hwid}()
  local fns = {}
  if gethwid and type(gethwid) == "function" then table.insert(fns, gethwid) end
  if get_hwid and type(get_hwid) == "function" then table.insert(fns, get_hwid) end
  if getexecutorhwid and type(getexecutorhwid) == "function" then table.insert(fns, getexecutorhwid) end
  
  for i = 1, #fns do
    local ok, r = pcall(fns[i]) 
    if ok and r and #${v.lua_tostring}(r) > 10 then 
      return ${v.lua_tostring}(r) 
    end
  end
  
  local P = game:GetService("Players").LocalPlayer
  local fp = table.concat({
    ${v.lua_tostring}(game.PlaceId),
    ${v.lua_tostring}(P.UserId),
    ${v.lua_tostring}(P.AccountAge),
    ${v.lua_tostring}(game.JobId:sub(1, 8))
  }, "_")
  
  return "FP_" .. ${v.hash}(fp)
end

-- =====================================================
-- EXECUTOR IDENTIFICATION
-- =====================================================
local function ${v.exec}()
  if identifyexecutor then 
    local ok, n, ver = pcall(identifyexecutor) 
    if ok and n then return ${v.lua_tostring}(n) .. (ver and ("_" .. ${v.lua_tostring}(ver)) or "") end 
  end
  
  if syn then return "Synapse" end
  if KRNL_LOADED then return "KRNL" end
  if fluxus then return "Fluxus" end
  if Solara then return "Solara" end
  if Wave then return "Wave" end
  
  return "unknown"
end

${generateJunkCode(v)}

-- =====================================================
-- LOGGING (GUI ONLY - NO CONSOLE PRINTS)
-- =====================================================
local function ${v.log}(m) 
  -- Silent - all feedback via GUI only
end
local function ${v.err}(m) 
  -- Silent - all feedback via GUI only
end

-- =====================================================
-- BASE64 DECODE
-- =====================================================
local function ${v.b64}(d)
  local b = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
  d = d:gsub('[^' .. b .. '=]', '')
  return (d:gsub('.', function(x)
    if x == '=' then return '' end
    local r, f = '', (b:find(x) - 1)
    for i = 6, 1, -1 do r = r .. (f % 2^i - f % 2^(i-1) > 0 and '1' or '0') end
    return r
  end):gsub('%d%d%d?%d?%d?%d?%d?%d?', function(x)
    if #x ~= 8 then return '' end
    local c = 0
    for i = 1, 8 do c = c + (x:sub(i,i) == '1' and 2^(8-i) or 0) end
    return string.char(c)
  end))
end

-- =====================================================
-- XOR DECRYPT WITH POSITION SALT
-- =====================================================
local function ${v.xor}(e, k)
  local d = ${v.b64}(e)
  local r = {}
  for i = 1, #d do
    local kb = string.byte(k, ((i-1) % #k) + 1)
    local pb = ((i-1) * 7 + 13) % 256
    r[#r+1] = string.char(${v.bit_bxor}(${v.bit_bxor}(string.byte(d, i), kb), pb))
  end
  return table.concat(r)
end

-- =====================================================
-- KEY DERIVATION FUNCTION
-- =====================================================
local function ${v.derive}(salt, hw, sk, ts)
  local c = salt .. hw .. sk .. ${v.lua_tostring}(ts)
  local h = 0
  for i = 1, #c do 
    h = ${v.bit_bxor}(h * 31, string.byte(c, i)) 
    h = h % 2147483647 
  end
  local k = ""
  local s = h
  for i = 1, 32 do 
    s = ${v.bit_bxor}(s * 1103515245 + 12345, s) 
    k = k .. string.char((s % 95) + 32) 
  end
  return k
end

${generateJunkCode(v)}
${generateJunkCode(v)}

-- =====================================================
-- RNG VERIFICATION FUNCTION (RBLXWHITELIST PATTERN)
-- Verifies server response by checking inverse transformations
-- f1(x) = 2x - 32 → f1^-1(y) = (y + 32) / 2
-- f2(x) = 5x + 256 → f2^-1(y) = (y - 256) / 5
-- =====================================================
local function ${v.verify_rng}(original1, original2, transformed1, transformed2)
  -- Inverse of f1: (y + 32) / 2 should equal original1
  local inverse1 = (transformed1 + 32) / 2
  -- Inverse of f2: (y - 256) / 5 should equal original2
  local inverse2 = (transformed2 - 256) / 5
  
  -- Use custom equality to prevent opcode hooks
  local check1 = ${v.custom_equals}(inverse1, original1)
  local check2 = ${v.custom_equals}(inverse2, original2)
  
  return check1 and check2
end

-- =====================================================
-- FLOAT CHECK (DETECT RNG MANIPULATION)
-- math.random() returns floats - if hooked to return int, detected
-- =====================================================
local function ${v.float_check}(num)
  return (num % 1) ~= 0
end

-- =====================================================
-- MODERN PREMIUM LOADING UI v4.0 - WITH DISCORD AVATAR
-- Ultra-modern glassmorphism with user profile display
-- =====================================================
local function ${v.ui}(discordAvatar, discordUsername, scriptName)
  local CoreGui = game:GetService("CoreGui")
  local TweenService = game:GetService("TweenService")
  local Players = game:GetService("Players")
  
  pcall(function()
    if CoreGui:FindFirstChild("ShadowAuthLoader") then
      CoreGui:FindFirstChild("ShadowAuthLoader"):Destroy()
    end
  end)
  
  local ScreenGui = Instance.new("ScreenGui")
  ScreenGui.Name = "ShadowAuthLoader"
  ScreenGui.ZIndexBehavior = Enum.ZIndexBehavior.Sibling
  ScreenGui.IgnoreGuiInset = true
  ScreenGui.ResetOnSpawn = false
  
  pcall(function() ScreenGui.Parent = CoreGui end)
  if not ScreenGui.Parent then
    pcall(function()
      ScreenGui.Parent = Players.LocalPlayer:WaitForChild("PlayerGui")
    end)
  end
  
  -- Full screen background with blur simulation
  local Container = Instance.new("Frame")
  Container.Name = "Container"
  Container.Size = UDim2.new(1, 0, 1, 0)
  Container.BackgroundColor3 = Color3.fromRGB(0, 0, 0)
  Container.BackgroundTransparency = 0.3
  Container.BorderSizePixel = 0
  Container.Parent = ScreenGui
  
  -- Main card - taller to fit avatar
  local Card = Instance.new("Frame")
  Card.Name = "Card"
  Card.Size = UDim2.new(0, 420, 0, 320)
  Card.Position = UDim2.new(0.5, -210, 0.5, -160)
  Card.BackgroundColor3 = Color3.fromRGB(12, 12, 20)
  Card.BackgroundTransparency = 0.05
  Card.BorderSizePixel = 0
  Card.Parent = Container
  
  local CardCorner = Instance.new("UICorner")
  CardCorner.CornerRadius = UDim.new(0, 20)
  CardCorner.Parent = Card
  
  -- Animated gradient border
  local CardStroke = Instance.new("UIStroke")
  CardStroke.Color = Color3.fromRGB(139, 92, 246)
  CardStroke.Thickness = 2
  CardStroke.Transparency = 0.2
  CardStroke.Parent = Card
  
  -- Top accent bar with gradient
  local TopAccent = Instance.new("Frame")
  TopAccent.Size = UDim2.new(1, 0, 0, 4)
  TopAccent.Position = UDim2.new(0, 0, 0, 0)
  TopAccent.BackgroundColor3 = Color3.fromRGB(139, 92, 246)
  TopAccent.BorderSizePixel = 0
  TopAccent.Parent = Card
  
  local TopAccentGradient = Instance.new("UIGradient")
  TopAccentGradient.Color = ColorSequence.new({
    ColorSequenceKeypoint.new(0, Color3.fromRGB(99, 102, 241)),
    ColorSequenceKeypoint.new(0.5, Color3.fromRGB(139, 92, 246)),
    ColorSequenceKeypoint.new(1, Color3.fromRGB(168, 85, 247))
  })
  TopAccentGradient.Parent = TopAccent
  
  local TopAccentCorner = Instance.new("UICorner")
  TopAccentCorner.CornerRadius = UDim.new(0, 20)
  TopAccentCorner.Parent = TopAccent
  
  -- Avatar container with glow effect
  local AvatarGlow = Instance.new("Frame")
  AvatarGlow.Size = UDim2.new(0, 90, 0, 90)
  AvatarGlow.Position = UDim2.new(0.5, -45, 0, 30)
  AvatarGlow.BackgroundColor3 = Color3.fromRGB(139, 92, 246)
  AvatarGlow.BackgroundTransparency = 0.7
  AvatarGlow.BorderSizePixel = 0
  AvatarGlow.Parent = Card
  
  local AvatarGlowCorner = Instance.new("UICorner")
  AvatarGlowCorner.CornerRadius = UDim.new(1, 0)
  AvatarGlowCorner.Parent = AvatarGlow
  
  local AvatarFrame = Instance.new("Frame")
  AvatarFrame.Size = UDim2.new(0, 80, 0, 80)
  AvatarFrame.Position = UDim2.new(0.5, -40, 0, 35)
  AvatarFrame.BackgroundColor3 = Color3.fromRGB(30, 30, 50)
  AvatarFrame.BorderSizePixel = 0
  AvatarFrame.Parent = Card
  
  local AvatarCorner = Instance.new("UICorner")
  AvatarCorner.CornerRadius = UDim.new(1, 0)
  AvatarCorner.Parent = AvatarFrame
  
  local AvatarStroke = Instance.new("UIStroke")
  AvatarStroke.Color = Color3.fromRGB(139, 92, 246)
  AvatarStroke.Thickness = 3
  AvatarStroke.Parent = AvatarFrame
  
  -- Avatar image - Use Roblox player thumbnail (Discord CDN URLs don't work in Roblox)
  local AvatarImage = Instance.new("ImageLabel")
  AvatarImage.Size = UDim2.new(1, 0, 1, 0)
  AvatarImage.BackgroundTransparency = 1
  AvatarImage.ScaleType = Enum.ScaleType.Crop
  AvatarImage.Parent = AvatarFrame
  
  -- Use Roblox headshot thumbnail API which works reliably
  local userId = Players.LocalPlayer.UserId
  local thumbType = Enum.ThumbnailType.HeadShot
  local thumbSize = Enum.ThumbnailSize.Size150x150
  local avatarContent, isReady = Players:GetUserThumbnailAsync(userId, thumbType, thumbSize)
  AvatarImage.Image = avatarContent or ""
  
  local AvatarImageCorner = Instance.new("UICorner")
  AvatarImageCorner.CornerRadius = UDim.new(1, 0)
  AvatarImageCorner.Parent = AvatarImage
  
  -- Online indicator
  local OnlineIndicator = Instance.new("Frame")
  OnlineIndicator.Size = UDim2.new(0, 20, 0, 20)
  OnlineIndicator.Position = UDim2.new(1, -8, 1, -8)
  OnlineIndicator.BackgroundColor3 = Color3.fromRGB(34, 197, 94)
  OnlineIndicator.BorderSizePixel = 0
  OnlineIndicator.Parent = AvatarFrame
  
  local OnlineCorner = Instance.new("UICorner")
  OnlineCorner.CornerRadius = UDim.new(1, 0)
  OnlineCorner.Parent = OnlineIndicator
  
  local OnlineStroke = Instance.new("UIStroke")
  OnlineStroke.Color = Color3.fromRGB(12, 12, 20)
  OnlineStroke.Thickness = 3
  OnlineStroke.Parent = OnlineIndicator
  
  -- Username display
  local Username = Instance.new("TextLabel")
  Username.Name = "Username"
  Username.Size = UDim2.new(1, -40, 0, 28)
  Username.Position = UDim2.new(0, 20, 0, 125)
  Username.BackgroundTransparency = 1
  Username.Text = discordUsername or Players.LocalPlayer.Name
  Username.TextSize = 20
  Username.Font = Enum.Font.GothamBlack
  Username.TextColor3 = Color3.fromRGB(255, 255, 255)
  Username.Parent = Card
  
  -- Discord badge
  local DiscordBadge = Instance.new("Frame")
  DiscordBadge.Size = UDim2.new(0, 120, 0, 24)
  DiscordBadge.Position = UDim2.new(0.5, -60, 0, 155)
  DiscordBadge.BackgroundColor3 = Color3.fromRGB(88, 101, 242)
  DiscordBadge.BackgroundTransparency = 0.2
  DiscordBadge.BorderSizePixel = 0
  DiscordBadge.Parent = Card
  
  local DiscordBadgeCorner = Instance.new("UICorner")
  DiscordBadgeCorner.CornerRadius = UDim.new(0, 12)
  DiscordBadgeCorner.Parent = DiscordBadge
  
  local DiscordBadgeText = Instance.new("TextLabel")
  DiscordBadgeText.Size = UDim2.new(1, 0, 1, 0)
  DiscordBadgeText.BackgroundTransparency = 1
  DiscordBadgeText.Text = "✓ Discord Verified"
  DiscordBadgeText.TextSize = 11
  DiscordBadgeText.Font = Enum.Font.GothamBold
  DiscordBadgeText.TextColor3 = Color3.fromRGB(255, 255, 255)
  DiscordBadgeText.Parent = DiscordBadge
  
  -- Script name
  local ScriptName = Instance.new("TextLabel")
  ScriptName.Size = UDim2.new(1, -40, 0, 18)
  ScriptName.Position = UDim2.new(0, 20, 0, 188)
  ScriptName.BackgroundTransparency = 1
  ScriptName.Text = scriptName or "ShadowAuth"
  ScriptName.TextSize = 14
  ScriptName.Font = Enum.Font.GothamMedium
  ScriptName.TextColor3 = Color3.fromRGB(139, 92, 246)
  ScriptName.Parent = Card
  
  -- Status text
  local Status = Instance.new("TextLabel")
  Status.Name = "Status"
  Status.Size = UDim2.new(1, -40, 0, 18)
  Status.Position = UDim2.new(0, 20, 0, 215)
  Status.BackgroundTransparency = 1
  Status.Text = "Initializing secure connection..."
  Status.TextSize = 13
  Status.Font = Enum.Font.GothamMedium
  Status.TextColor3 = Color3.fromRGB(156, 163, 175)
  Status.Parent = Card
  
  -- Progress bar
  local ProgressBg = Instance.new("Frame")
  ProgressBg.Size = UDim2.new(0.8, 0, 0, 8)
  ProgressBg.Position = UDim2.new(0.1, 0, 0, 248)
  ProgressBg.BackgroundColor3 = Color3.fromRGB(30, 30, 50)
  ProgressBg.BorderSizePixel = 0
  ProgressBg.Parent = Card
  
  local ProgressCorner = Instance.new("UICorner")
  ProgressCorner.CornerRadius = UDim.new(1, 0)
  ProgressCorner.Parent = ProgressBg
  
  local ProgressFill = Instance.new("Frame")
  ProgressFill.Name = "Fill"
  ProgressFill.Size = UDim2.new(0, 0, 1, 0)
  ProgressFill.BackgroundColor3 = Color3.fromRGB(139, 92, 246)
  ProgressFill.BorderSizePixel = 0
  ProgressFill.Parent = ProgressBg
  
  local FillCorner = Instance.new("UICorner")
  FillCorner.CornerRadius = UDim.new(1, 0)
  FillCorner.Parent = ProgressFill
  
  local FillGradient = Instance.new("UIGradient")
  FillGradient.Color = ColorSequence.new({
    ColorSequenceKeypoint.new(0, Color3.fromRGB(99, 102, 241)),
    ColorSequenceKeypoint.new(0.5, Color3.fromRGB(139, 92, 246)),
    ColorSequenceKeypoint.new(1, Color3.fromRGB(168, 85, 247))
  })
  FillGradient.Parent = ProgressFill
  
  -- Version text
  local Version = Instance.new("TextLabel")
  Version.Size = UDim2.new(1, 0, 0, 14)
  Version.Position = UDim2.new(0, 0, 1, -26)
  Version.BackgroundTransparency = 1
  Version.Text = "ShadowAuth v${LOADER_TEMPLATE_VERSION} • Secure"
  Version.TextSize = 10
  Version.Font = Enum.Font.Gotham
  Version.TextColor3 = Color3.fromRGB(75, 85, 99)
  Version.Parent = Card
  
  -- Animate in
  Container.BackgroundTransparency = 1
  Card.Position = UDim2.new(0.5, -210, 0.5, -140)
  Card.BackgroundTransparency = 0.2
  
  TweenService:Create(Container, TweenInfo.new(0.5, Enum.EasingStyle.Quart), {BackgroundTransparency = 0.3}):Play()
  TweenService:Create(Card, TweenInfo.new(0.6, Enum.EasingStyle.Back, Enum.EasingDirection.Out), {
    Position = UDim2.new(0.5, -210, 0.5, -160),
    BackgroundTransparency = 0.05
  }):Play()
  
  -- Pulse animation for glow
  spawn(function()
    while AvatarGlow and AvatarGlow.Parent do
      TweenService:Create(AvatarGlow, TweenInfo.new(1.5, Enum.EasingStyle.Sine, Enum.EasingDirection.InOut), {
        BackgroundTransparency = 0.5
      }):Play()
      TweenService:Create(CardStroke, TweenInfo.new(1.5, Enum.EasingStyle.Sine, Enum.EasingDirection.InOut), {
        Transparency = 0.5
      }):Play()
      wait(1.5)
      TweenService:Create(AvatarGlow, TweenInfo.new(1.5, Enum.EasingStyle.Sine, Enum.EasingDirection.InOut), {
        BackgroundTransparency = 0.7
      }):Play()
      TweenService:Create(CardStroke, TweenInfo.new(1.5, Enum.EasingStyle.Sine, Enum.EasingDirection.InOut), {
        Transparency = 0.2
      }):Play()
      wait(1.5)
    end
  end)
  
  return {
    setStatus = function(t) 
      if Status and Status.Parent then 
        Status.Text = t 
      end 
    end,
    setProgress = function(p) 
      if ProgressFill and ProgressFill.Parent then
        TweenService:Create(ProgressFill, TweenInfo.new(0.3, Enum.EasingStyle.Quart), {
          Size = UDim2.new(math.clamp(p/100, 0, 1), 0, 1, 0)
        }):Play() 
      end
    end,
    setSuccess = function()
      if Status and Status.Parent then 
        Status.Text = "✓ Authentication successful"
        Status.TextColor3 = Color3.fromRGB(74, 222, 128)
      end
      if ProgressFill and ProgressFill.Parent then
        TweenService:Create(ProgressFill, TweenInfo.new(0.3), {
          BackgroundColor3 = Color3.fromRGB(74, 222, 128)
        }):Play()
      end
      if CardStroke and CardStroke.Parent then
        TweenService:Create(CardStroke, TweenInfo.new(0.3), {
          Color = Color3.fromRGB(74, 222, 128)
        }):Play()
      end
      if OnlineIndicator and OnlineIndicator.Parent then
        TweenService:Create(OnlineIndicator, TweenInfo.new(0.3), {
          BackgroundColor3 = Color3.fromRGB(74, 222, 128)
        }):Play()
      end
    end,
    setError = function(m)
      if Status and Status.Parent then 
        Status.Text = "✕ " .. (m or "Authentication failed")
        Status.TextColor3 = Color3.fromRGB(248, 113, 113)
      end
      if ProgressFill and ProgressFill.Parent then
        TweenService:Create(ProgressFill, TweenInfo.new(0.3), {
          BackgroundColor3 = Color3.fromRGB(248, 113, 113)
        }):Play()
      end
      if CardStroke and CardStroke.Parent then
        TweenService:Create(CardStroke, TweenInfo.new(0.3), {
          Color = Color3.fromRGB(248, 113, 113)
        }):Play()
      end
    end,
    destroy = function(delay)
      delay = delay or 1.2
      spawn(function()
        wait(delay)
        if ScreenGui and ScreenGui.Parent then
          TweenService:Create(Card, TweenInfo.new(0.4, Enum.EasingStyle.Back, Enum.EasingDirection.In), {
            Position = UDim2.new(0.5, -210, 0.5, -140),
            BackgroundTransparency = 1
          }):Play()
          TweenService:Create(Container, TweenInfo.new(0.45), {BackgroundTransparency = 1}):Play()
          wait(0.5)
          pcall(function() ScreenGui:Destroy() end)
        end
      end)
    end,
    getScreenGui = function()
      return ScreenGui
    end
  }
end

${generateJunkCode(v)}

-- =====================================================
-- MAIN EXECUTION FLOW WITH SCOPE COUNTERS
-- =====================================================
local function ${v.main}()
  local ${generateRandomVarName()} = ${v.junk_gen}("table")
  
  -- SCOPE COUNTER: Reset at start
  ${v.scope_counter} = 0
  
  -- Phase 1: Environment verification
  ${v.scope_counter} = ${v.scope_counter} + 1 -- Should be 1
  if not ${v.env}.verify() then
    ${v.err}("Invalid environment")
    return
  end
  
  -- Phase 2: Anti-debug check
  ${v.scope_counter} = ${v.scope_counter} + 1 -- Should be 2
  if ${v.env}.detectDebug() then
    ${v.err}("Debug detected")
    ${v.infinite_loop}()
    return
  end
  
  -- Phase 3: Anti-hook verification
  ${v.scope_counter} = ${v.scope_counter} + 1 -- Should be 3
  if not ${v.anti}.check() then
    ${v.err}("Hook detected")
    ${v.infinite_loop}()
    return
  end
  
  -- Initial UI with placeholder (will be updated after validation)
  local ui = ${v.ui}(nil, nil, nil)
  local H = game:GetService("HttpService")
  local P = game:GetService("Players").LocalPlayer
  
  ui.setStatus("Security check...")
  ui.setProgress(10)
  wait(0.15)
  
  -- Phase 4: Get license key
  ${v.scope_counter} = ${v.scope_counter} + 1 -- Should be 4
  local K = script_key or (getgenv and getgenv().script_key)
  if not K or #${v.lua_tostring}(K) < 5 then 
    ui.setError("No license key")
    ui.destroy(2)
    return 
  end
  
  ui.setStatus("Connecting...")
  ui.setProgress(25)
  
  -- Phase 5: Get clean request function
  ${v.scope_counter} = ${v.scope_counter} + 1 -- Should be 5
  local R = ${v.req}()
  if not R then 
    ui.setError("HTTP unavailable")
    ui.destroy(2)
    return 
  end
  
  ui.setStatus("Generating RNG values...")
  ui.setProgress(30)
  
  -- =====================================================
  -- RNG VALUES FOR RESPONSE VERIFICATION (RBLXWHITELIST)
  -- =====================================================
  ${v.scope_counter} = ${v.scope_counter} + 1 -- Should be 6
  
  -- Integer RNG values for transformation verification
  local ${v.rng1} = ${v.math_random}(1, 100000)
  local ${v.rng2} = ${v.math_random}(1, 100000)
  
  -- Float RNG value for manipulation detection
  -- math.random() returns a float (0-1), if hooked to return int, we detect it
  local ${v.rng_float} = ${v.math_random}()
  local ${v.rng1} = ${v.rng1} + ${v.rng_float} -- Add float to int for combined check
  
  ui.setStatus("Validating license...")
  ui.setProgress(40)
  
  ${v.scope_counter} = ${v.scope_counter} + 1 -- Should be 7
  local hw = ${v.hwid}()
  local ex = ${v.exec}()
  local ts = ${v.os_time}()
  
  local body = H:JSONEncode({
    key = K, 
    script_id = ${v.cfg}.sid, 
    hwid = hw,
    roblox_username = P.Name, 
    roblox_user_id = ${v.lua_tostring}(P.UserId),
    executor = ex, 
    session_key = ${v.cfg}.ssk, 
    timestamp = ts, 
    loader_version = ${v.cfg}.ver,
    -- RNG values for server transformation
    rng1 = ${v.rng1},
    rng2 = ${v.rng2}
  })
  
  local ok, res = pcall(function()
    return R({
      Url = ${v.cfg}.api .. ${v.cfg}.ep,
      Method = "POST",
      Headers = {
        ["Content-Type"] = "application/json",
        ["apikey"] = ${v.cfg}.key,
        ["authorization"] = "Bearer " .. ${v.cfg}.key,
        ["x-shadow-sig"] = ${v.cfg}.sig
      },
      Body = body
    })
  end)
  
  ui.setProgress(60)
  
  ${v.scope_counter} = ${v.scope_counter} + 1 -- Should be 8
  if not ok or not res then 
    ui.setError("Connection failed")
    ui.destroy(2)
    return 
  end
  
  local D
  pcall(function() D = H:JSONDecode(res.Body) end)
  if not D then 
    ui.setError("Invalid response")
    ui.destroy(2)
    return 
  end
  
  if D.banned then 
    ui.setError("License banned")
    ui.destroy(2)
    ${v.infinite_loop}()
    return 
  end
  
  if not D.valid then 
    ui.setError(D.message or "Invalid key")
    ui.destroy(2)
    return 
  end
  
  if not D.script then 
    ui.setError("Script unavailable")
    ui.destroy(2)
    return 
  end
  
  -- =====================================================
  -- RNG VERIFICATION (RBLXWHITELIST PATTERN)
  -- Verify server transformed our RNG values correctly
  -- =====================================================
  ${v.scope_counter} = ${v.scope_counter} + 1 -- Should be 9
  
  ui.setStatus("Verifying response...")
  ui.setProgress(65)
  
  if D.t1 and D.t2 then
    if not ${v.verify_rng}(${v.rng1}, ${v.rng2}, D.t1, D.t2) then
      ui.setError("Response verification failed")
      ui.destroy(2)
      ${v.infinite_loop}()
      return
    end
  end
  
  -- Float check: detect RNG manipulation on server side
  -- Server checks if rng1 contains a float component
  if D.rng_tamper then
    ui.setError("RNG manipulation detected")
    ui.destroy(2)
    ${v.infinite_loop}()
    return
  end
  
  -- =====================================================
  -- SCOPE COUNTER VERIFICATION (JUMP ATTACK DETECTION)
  -- If any jumps occurred, scope_counter won't be 9
  -- =====================================================
  ${v.scope_counter} = ${v.scope_counter} + 1 -- Should be 10
  
  if not ${v.custom_equals}(${v.scope_counter}, 10) then
    ui.setError("Jump detected")
    ui.destroy(2)
    ${v.infinite_loop}()
    return
  end
  
  -- =====================================================
  -- RECREATE UI WITH DISCORD AVATAR & USERNAME
  -- =====================================================
  ui.destroy(0.1)
  wait(0.2)
  
  local discordAvatar = D.discord_avatar
  local discordUsername = D.discord_username
  local scriptName = D.script_name
  local sessionToken = D.session_token
  
  ui = ${v.ui}(discordAvatar, discordUsername, scriptName)
  
  ui.setStatus("Decrypting...")
  ui.setProgress(75)
  
  local dk = ${v.derive}(D.salt or "", hw, ${v.cfg}.ssk, D.timestamp or ts)
  local code = ${v.xor}(D.script, dk)
  
  if not code or #code < 10 then 
    ui.setError("Decryption failed")
    ui.destroy(2)
    return 
  end
  
  ui.setStatus("Compiling...")
  ui.setProgress(90)
  
  -- Set globals
  _G.__SA = true
  _G.__SA_V = ${v.cfg}.ver
  _G.__SA_HW = hw
  _G.__SA_SESSION = sessionToken
  
  local fn, ce = loadstring(code)
  if fn then
    ui.setProgress(100)
    ui.setSuccess()
    ui.destroy(1.5)
    
    -- =====================================================
    -- HEARTBEAT LOOP WITH REAL-TIME KICK DETECTION
    -- Checks server every 10 seconds for kick command
    -- =====================================================
    spawn(function()
      local heartbeatUrl = ${v.cfg}.api .. "/functions/v1/heartbeat"
      local heartbeatInterval = 10 -- seconds
      
      while _G.__SA do
        wait(heartbeatInterval)
        
        local hbOk, hbRes = pcall(function()
          return R({
            Url = heartbeatUrl,
            Method = "POST",
            Headers = {
              ["Content-Type"] = "application/json",
              ["x-session-token"] = sessionToken or ""
            },
            Body = H:JSONEncode({
              action = "ping",
              hwid = hw,
              script_id = ${v.cfg}.sid
            })
          })
        end)
        
        if hbOk and hbRes and hbRes.Body then
          local hbData
          pcall(function() hbData = H:JSONDecode(hbRes.Body) end)
          
          if hbData then
            -- CHECK FOR KICK COMMAND FROM SERVER
            if hbData.kicked then
              _G.__SA = false
              local kickReason = hbData.kick_reason or "You have been kicked by the administrator"
              pcall(function()
                P:Kick("\\n\\n🛡️ ShadowAuth\\n\\n" .. kickReason .. "\\n\\n")
              end)
              break
            end
            
            -- CHECK FOR BAN
            if hbData.banned then
              _G.__SA = false
              local banReason = hbData.ban_reason or "Your license has been revoked"
              pcall(function()
                P:Kick("\\n\\n🛡️ ShadowAuth\\n\\n" .. banReason .. "\\n\\n")
              end)
              break
            end
            
            -- Update heartbeat interval if server specifies
            if hbData.nextHeartbeat then
              heartbeatInterval = math.max(5, math.min(60, hbData.nextHeartbeat / 1000))
            end
          end
        end
      end
    end)
    
    local s, e = pcall(fn)
    if s then 
      ${v.log}("success")
    elseif ${v.lua_tostring}(e):find("yield") then 
      ${v.log}("launched")
    else 
      ${v.err}("runtime: " .. ${v.lua_tostring}(e):sub(1,50)) 
    end
  else 
    ui.setError("Compile failed")
    ui.destroy(2)
    ${v.err}("compile: " .. ${v.lua_tostring}(ce):sub(1,50)) 
  end
end

${generateJunkCode(v)}
${generateJunkCode(v)}

-- Execute with error handling in coroutine
local ${v.module_loader} = coroutine.wrap(function()
  local ok, err = pcall(${v.main})
  if not ok then
    warn("[ShadowAuth] " .. ${v.lua_tostring}(err):sub(1, 100))
  end
end)
${v.module_loader}()
`;

    const rawLoaderCode = loaderCode.trim();
    
    // =====================================================
    // LURAPH OBFUSCATION - Convert to bytecode VM
    // =====================================================
    let luraphObfuscatedCode = rawLoaderCode;
    
    if (ENABLE_LURAPH) {
      const luraphApiKey = Deno.env.get("LURAPH_API_KEY");
      if (luraphApiKey) {
        try {
          console.log("Luraph: Starting bytecode VM obfuscation...");
          const luraph = new LuraphClient(luraphApiKey);
          luraphObfuscatedCode = await luraph.obfuscate(rawLoaderCode, `loader_${scriptId.substring(0, 8)}.lua`);
          console.log("Luraph: SUCCESS - Loader converted to bytecode VM");
        } catch (luraphError) {
          console.error("Luraph failed, using local protection:", luraphError);
          luraphObfuscatedCode = rawLoaderCode;
        }
      } else {
        console.warn("Luraph: No API key found, using local protection");
      }
    }

    // =====================================================
    // MULTI-LAYER SYSTEM (LIKE LUARMOR)
    // Layer 1: Small loader (returned to user)
    // Layer 2: Init/Bootstrapper (large, manages cache)
    // Layer 3: ASCII art wrapper (wolf/logo)
    // Layer 4: Luraph obfuscated code
    // Layer 5: Final ASCII wrapper
    // =====================================================
    
    // Generate unique identifiers for this session
    const initVersion = crypto.randomUUID().replace(/-/g, '').substring(0, 12);
    const encryptedData = generateMultiLayerData(script.content, sessionSalt, scriptId);
    const randomFuncName1 = generateRandomVarName(8);
    const randomFuncName2 = generateRandomVarName(8);
    
    // =====================================================
    // LAYER 5: Final wrapper with ASCII art (innermost)
    // This is what gets captured if someone tries to extract
    // =====================================================
    const WOLF_ASCII_ART = ` --[[
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

]] return setfenv(function(...) return ${randomFuncName1}(...) end, setmetatable({ ["${randomFuncName1}"] = ... }, { __index = getfenv((...)) })) `;

    // =====================================================
    // LAYER 3: Another ASCII art wrapper
    // =====================================================
    const LAYER3_WRAPPER = ` --[[
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

]] return setfenv(function(...) return ${randomFuncName2}(...) end, setmetatable({ ["${randomFuncName2}"] = ... }, { __index = getfenv((...)) })) `;

    // =====================================================
    // LAYER 2: Init/Bootstrapper (large, like Luarmor's v4_init)
    // This manages cache and decryption - gets captured as large file
    // =====================================================
    const BOOTSTRAPPER_CODE = `--[[
        ShadowAuth V5 bootstrapper for scripts. 
 this code fetches & updates & encrypts & decrypts cached ShadowAuth scripts in the folder named static_content.../
        https://shadowauth.dev/

]]

local _SHADOWAUTH_VERSION = "5.0.${Math.floor(Math.random() * 999)}"
local _CACHE_FOLDER = "static_content_${Math.floor(Date.now() / 1000)}"
local _INIT_VERSION = "${initVersion}"

-- Anti-hook detection layer
local _native_loadstring = loadstring
local _native_getfenv = getfenv or function() return _G end
local _native_setfenv = setfenv or function(f,e) return f end
local _native_pcall = pcall
local _native_pairs = pairs
local _native_type = type
local _native_tostring = tostring
local _native_error = error

-- Hook detection
local function _detectHooks()
  if isfunctionhooked then
    if pcall(isfunctionhooked, loadstring) and isfunctionhooked(loadstring) then return true end
    if pcall(isfunctionhooked, getfenv) and isfunctionhooked(getfenv) then return true end
  end
  if getmetatable(loadstring) ~= nil then return true end
  if getmetatable(getfenv) ~= nil then return true end
  return false
end

-- Encryption utilities
local function _xorDecrypt(data, key)
  local result = {}
  for i = 1, #data do
    local keyByte = key:byte((i - 1) % #key + 1)
    result[i] = string.char(bit32.bxor(data:byte(i), keyByte))
  end
  return table.concat(result)
end

local function _base64Decode(input)
  local b = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
  input = input:gsub('[^'..b..'=]', '')
  return (input:gsub('.', function(x)
    if x == '=' then return '' end
    local r, f = '', (b:find(x) - 1)
    for i = 6, 1, -1 do r = r .. (f % 2 ^ i - f % 2 ^ (i - 1) > 0 and '1' or '0') end
    return r
  end):gsub('%d%d%d?%d?%d?%d?%d?%d?', function(x)
    if #x ~= 8 then return '' end
    local c = 0
    for i = 1, 8 do c = c + (x:sub(i, i) == '1' and 2 ^ (8 - i) or 0) end
    return string.char(c)
  end))
end

-- Cache management
local _cache = {}
local function _readCache(name)
  if _cache[name] then return _cache[name] end
  local ok, data = pcall(function()
    if readfile then
      return readfile(_CACHE_FOLDER .. "/" .. name)
    end
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

-- Main execution
local _encData = ${JSON.stringify(encryptedData.encData)}
local _encKey = ${JSON.stringify(encryptedData.encKey)}

-- Verify integrity before execution
if _detectHooks() then
  -- Return wolf art if hooked (they capture this)
  return loadstring([=[${WOLF_ASCII_ART.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}]=])
end

-- Try cache first
local cachedInit = _readCache("init-" .. _INIT_VERSION .. ".lua")
if cachedInit and #cachedInit > 2000 then
  local fn = _native_loadstring(cachedInit)
  if fn then return fn() end
end

-- Fetch and execute protected code
local protectedCode = _base64Decode(_encData)
local decrypted = _xorDecrypt(protectedCode, _encKey)

-- Cache for future use
_writeCache("init-" .. _INIT_VERSION .. ".lua", decrypted)

-- Execute the inner layer
return _native_loadstring(decrypted)()
`;

    // =====================================================
    // GENERATE AND RETURN LAYER 1 (Initial small loader)
    // =====================================================
    const encDataLayer1 = generateMultiLayerData(script.content, sessionSalt, scriptId);
    
    const INITIAL_LOADER = `-- Do not save this file
-- Always use the loadstring 
  _bsdata0={${encDataLayer1.headerData.join(',')},"${encDataLayer1.headerHex}",${encDataLayer1.headerNum},"${encDataLayer1.headerStr}",${encDataLayer1.footerNum},"${encDataLayer1.footerHex}","${encDataLayer1.footerStr}",${encDataLayer1.checksum}};
local f,b,a="static_content_${Math.floor(Date.now() / 1000)}","${initVersion}";pcall(function()a=readfile(f.."/init-"..b..".lua")end) if a and #a>2000 then a=loadstring(a) else a=nil; end;
if a then return a() else pcall(makefolder,f) a=game:HttpGet("${supabaseUrl}/functions/v1/loader/${scriptId}?layer=2&v=${initVersion}"..(_sa920af6193 or "")) writefile(f.."/init-"..b..".lua", a); 
pcall(function() for i,v in pairs(listfiles('./'..f)) do local m=v:match('(init[%w%-]*).lua$') if m and m~=('init-'..b) then pcall(delfile, f..'/'..m..'.lua') end end; end); return loadstring(a)() end
  `;

    // Store the Luraph-obfuscated code for layer requests
    await supabase
      .from("obfuscated_loaders")
      .upsert(
        {
          script_id: scriptId,
          script_hash: scriptHash,
          loader_code: luraphObfuscatedCode,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "script_id" }
      );

    console.log("Returning Layer 1: Initial loader (small)");
    return new Response(INITIAL_LOADER.replace(/__SESSION_SALT__/g, sessionSalt), {
      headers: { ...corsHeaders, "Content-Type": "text/plain" }
    });
    
    } // Close if (!hasCachedCode)
    
    // If we have cached code, just return Layer 1 with cached data
    console.log("Returning Layer 1 from cache");
    const encryptedDataCached = generateMultiLayerData(script.content, sessionSalt, scriptId);
    
    const CACHED_LAYER1 = `-- Do not save this file
-- Always use the loadstring 
  _bsdata0={${encryptedDataCached.headerData.join(',')},"${encryptedDataCached.headerHex}",${encryptedDataCached.headerNum},"${encryptedDataCached.headerStr}",${encryptedDataCached.footerNum},"${encryptedDataCached.footerHex}","${encryptedDataCached.footerStr}",${encryptedDataCached.checksum}};
local f,b,a="static_content_${Math.floor(Date.now() / 1000)}","${initVersion}";pcall(function()a=readfile(f.."/init-"..b..".lua")end) if a and #a>2000 then a=loadstring(a) else a=nil; end;
if a then return a() else pcall(makefolder,f) a=game:HttpGet("${supabaseUrl}/functions/v1/loader/${scriptId}?layer=2&v=${initVersion}"..(_sa920af6193 or "")) writefile(f.."/init-"..b..".lua", a); 
pcall(function() for i,v in pairs(listfiles('./'..f)) do local m=v:match('(init[%w%-]*).lua$') if m and m~=('init-'..b) then pcall(delfile, f..'/'..m..'.lua') end end; end); return loadstring(a)() end
  `;
    
    return new Response(CACHED_LAYER1.replace(/__SESSION_SALT__/g, sessionSalt), {
      headers: { ...corsHeaders, "Content-Type": "text/plain" }
    });

  } catch (error) {
    console.error("Loader error:", error);
    return new Response(`error("Server error")`, { 
      status: 500, 
      headers: { ...corsHeaders, "Content-Type": "text/plain" } 
    });
  }
});
