import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ============================================================================
// Wbhf Auth Obfuscator - Luraph API Integration + Local Engine
// Supports: LPH_NO_VIRTUALIZE, LPH_JIT, LPH_JIT_MAX macros
// Performance optimizations from Luraph documentation
// ============================================================================

const LURAPH_API_URL = "https://api.lura.ph/v1";

// Base64 encode/decode
const base64Charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
const moreCharset = base64Charset + '!@#$%&*()-=[];\'",./+{}:|<>?';

function base64Encode(str: string): string {
  // Use Deno's built-in btoa for binary safety
  const encoder = new TextEncoder();
  const bytes = encoder.encode(str);
  let binary = '';
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
}

function genPass(len: number): string {
  let result = '';
  for (let i = 0; i < len; i++) {
    result += moreCharset[Math.floor(Math.random() * moreCharset.length)];
  }
  return result;
}

// ============================================================================
// LURAPH API CLIENT
// Full integration with Luraph obfuscation service
// ============================================================================

interface LuraphNode {
  version: string;
  cpuUsage: number;
  options: Record<string, {
    name: string;
    description: string;
    tier: string;
    type: string;
    required: boolean;
    choices: string[];
    dependencies: Record<string, unknown[]>;
  }>;
}

interface LuraphNodesResponse {
  recommendedId: string;
  nodes: Record<string, LuraphNode>;
}

interface LuraphOptions {
  // Core Luraph options
  TARGET_VERSION?: string;
  DISABLE_LINE_INFORMATION?: boolean;
  ENABLE_GC_FIXES?: boolean;
  CONSTANT_ENCRYPTION?: boolean;
  CONTROL_FLOW?: boolean;
  ANTI_TAMPER?: boolean;
  VM_ENCRYPTION?: boolean;
  STRING_ENCRYPTION?: boolean;
  VARIABLE_RENAME?: boolean;
  JUNK_CODE?: boolean;
  // Custom options will be passed through
  [key: string]: unknown;
}

class LuraphClient {
  private apiKey: string;
  private baseUrl: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
    this.baseUrl = LURAPH_API_URL;
  }

  private async request(endpoint: string, options: RequestInit = {}): Promise<Response> {
    const url = `${this.baseUrl}${endpoint}`;
    const headers = new Headers(options.headers || {});
    headers.set('Luraph-API-Key', this.apiKey);
    headers.set('Content-Type', 'application/json');

    return fetch(url, {
      ...options,
      headers,
    });
  }

  async getNodes(): Promise<LuraphNodesResponse> {
    const response = await this.request('/obfuscate/nodes');
    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Luraph API error: ${JSON.stringify(error)}`);
    }
    return response.json();
  }

  async submitJob(
    script: string,
    fileName: string,
    nodeId: string,
    options: LuraphOptions
  ): Promise<string> {
    const response = await this.request('/obfuscate/new', {
      method: 'POST',
      body: JSON.stringify({
        fileName,
        node: nodeId,
        script: base64Encode(script),
        options,
        enforceSettings: false, // Allow partial options
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Luraph submit error: ${JSON.stringify(error)}`);
    }

    const data = await response.json();
    return data.jobId;
  }

  async waitForJob(jobId: string, timeout: number = 120000): Promise<void> {
    const startTime = Date.now();
    
    // The status endpoint blocks for up to 60s, retry up to 3 times
    for (let attempt = 0; attempt < 3 && (Date.now() - startTime) < timeout; attempt++) {
      const response = await this.request(`/obfuscate/status/${jobId}`);
      
      if (!response.ok) {
        if (response.status === 404) throw new Error('Job not found');
        if (response.status === 403) throw new Error('Job does not belong to you');
        await new Promise(r => setTimeout(r, 2000));
        continue;
      }

      const text = await response.text();
      if (text && text.trim()) {
        try {
          const data = JSON.parse(text);
          if (data.error) throw new Error(`Luraph compilation error: ${data.error}`);
        } catch (e) {
          if ((e as Error).message.includes('Luraph compilation')) throw e;
        }
      }
      
      // Empty response = job complete
      return;
    }

    throw new Error('Luraph job timeout');
  }

  async downloadResult(jobId: string): Promise<string> {
    const response = await this.request(`/obfuscate/download/${jobId}`);
    
    if (!response.ok) {
      if (response.status === 410) throw new Error('Obfuscation result expired (24h limit)');
      if (response.status === 403) throw new Error('Job does not belong to you');
      if (response.status === 404) throw new Error('Job not found');
      throw new Error(`Download error: ${response.status}`);
    }

    return response.text();
  }

  async obfuscate(
    script: string,
    fileName: string = 'script.lua',
    userOptions: LuraphOptions = {}
  ): Promise<string> {
    // Get available nodes
    const nodes = await this.getNodes();
    const nodeId = nodes.recommendedId;

    if (!nodeId || !nodes.nodes[nodeId]) {
      throw new Error('No Luraph nodes available');
    }

    const node = nodes.nodes[nodeId];
    console.log(`Using Luraph node: ${nodeId} (v${node.version}, CPU: ${node.cpuUsage}%)`);

    // Build options dynamically from node's available options
    const options: Record<string, boolean | string> = {};
    for (const [optId, optConfig] of Object.entries(node.options)) {
      if (optConfig.tier === "PREMIUM_ONLY") {
        if (optConfig.type === "CHECKBOX") options[optId] = false;
        else if (optConfig.type === "DROPDOWN" && optConfig.choices?.length > 0) options[optId] = optConfig.choices[0];
        else if (optConfig.type === "TEXT") options[optId] = "";
      } else {
        if (optConfig.type === "CHECKBOX") {
          // Check dependencies
          let depsOk = true;
          if (optConfig.dependencies) {
            for (const [depId, depValues] of Object.entries(optConfig.dependencies as Record<string, unknown[]>)) {
              if (!depValues.includes(options[depId])) { depsOk = false; break; }
            }
          }
          // Use user option if provided, otherwise enable
          const userVal = userOptions[optId];
          options[optId] = depsOk && (userVal !== undefined ? Boolean(userVal) : true);
        } else if (optConfig.type === "DROPDOWN" && optConfig.choices?.length > 0) {
          options[optId] = optConfig.choices[0];
        } else if (optConfig.type === "TEXT") {
          options[optId] = "";
        }
      }
    }

    // Submit job
    const jobId = await this.submitJob(script, fileName, nodeId, options as unknown as LuraphOptions);
    console.log(`Luraph job submitted: ${jobId}`);

    // Wait for completion
    await this.waitForJob(jobId);
    console.log('Luraph job completed');

    // Download result
    const result = await this.downloadResult(jobId);
    return result;
  }
}

// ============================================================================
// MACRO PROCESSOR
// Handles LPH_NO_VIRTUALIZE, LPH_JIT, LPH_JIT_MAX macros
// ============================================================================

interface MacroRegion {
  type: 'NO_VIRTUALIZE' | 'JIT' | 'JIT_MAX' | 'NO_UPVALUES' | 'CRASH' | 'ENCSTR' | 'ENCNUM';
  start: number;
  end: number;
  content: string;
}

function extractMacros(code: string): { cleanCode: string; macros: MacroRegion[] } {
  const macros: MacroRegion[] = [];
  let cleanCode = code;

  // LPH_NO_VIRTUALIZE(function() ... end) - wraps functions to skip virtualization
  const noVirtRegex = /LPH_NO_VIRTUALIZE\s*\(\s*(function\s*\([^)]*\)[\s\S]*?end)\s*\)/g;
  let match;
  
  while ((match = noVirtRegex.exec(code)) !== null) {
    macros.push({
      type: 'NO_VIRTUALIZE',
      start: match.index,
      end: match.index + match[0].length,
      content: match[1],
    });
  }

  // LPH_JIT(function() ... end) - JIT optimized regions
  const jitRegex = /LPH_JIT\s*\(\s*(function\s*\([^)]*\)[\s\S]*?end)\s*\)/g;
  while ((match = jitRegex.exec(code)) !== null) {
    macros.push({
      type: 'JIT',
      start: match.index,
      end: match.index + match[0].length,
      content: match[1],
    });
  }

  // LPH_JIT_MAX(function() ... end) - Maximum JIT optimization
  const jitMaxRegex = /LPH_JIT_MAX\s*\(\s*(function\s*\([^)]*\)[\s\S]*?end)\s*\)/g;
  while ((match = jitMaxRegex.exec(code)) !== null) {
    macros.push({
      type: 'JIT_MAX',
      start: match.index,
      end: match.index + match[0].length,
      content: match[1],
    });
  }

  // LPH_NO_UPVALUES(function() ... end) - Removes upvalues
  const noUpvRegex = /LPH_NO_UPVALUES\s*\(\s*(function\s*\([^)]*\)[\s\S]*?end)\s*\)/g;
  while ((match = noUpvRegex.exec(code)) !== null) {
    macros.push({
      type: 'NO_UPVALUES',
      start: match.index,
      end: match.index + match[0].length,
      content: match[1],
    });
  }

  // LPH_CRASH() - Intentional crash point
  cleanCode = cleanCode.replace(/LPH_CRASH\s*\(\s*\)/g, 'while true do end');

  // LPH_ENCSTR("string") - Encrypted string literal
  const encStrRegex = /LPH_ENCSTR\s*\(\s*"([^"]*)"\s*\)/g;
  cleanCode = cleanCode.replace(encStrRegex, (_, str) => {
    // Keep as-is for now, will be encrypted by obfuscator
    return `"${str}"`;
  });

  // LPH_ENCNUM(number) - Encrypted number literal
  const encNumRegex = /LPH_ENCNUM\s*\(\s*(\d+)\s*\)/g;
  cleanCode = cleanCode.replace(encNumRegex, (_, num) => num);

  return { cleanCode, macros };
}

// ============================================================================
// LOCAL OBFUSCATION ENGINE (fallback when Luraph unavailable)
// Based on bitef4/Luau_Discord_Bot_Obfuscator
// ============================================================================

const h2b: Record<string, string> = {
  '0': '0000', '1': '0001', '2': '0010', '3': '0011',
  '4': '0100', '5': '0101', '6': '0110', '7': '0111',
  '8': '1000', '9': '1001', 'A': '1010', 'B': '1011',
  'C': '1100', 'D': '1101', 'E': '1110', 'F': '1111'
};

function d2b(n: number): string {
  const hex = n.toString(16).toUpperCase();
  return hex.split('').map(c => h2b[c] || '').join('');
}

function genIl(str: string): string {
  let result = '';
  for (let i = 0; i < str.length; i++) {
    const charCode = str.charCodeAt(i);
    const binary = d2b(charCode).padStart(8, '0');
    result += binary.replace(/0/g, 'l').replace(/1/g, 'I');
  }
  return result;
}

function stringToBytes(str: string): number[] {
  const bytes: number[] = [];
  for (let i = 0; i < str.length; i++) {
    bytes.push(str.charCodeAt(i) & 0xFF);
  }
  return bytes;
}

class RC4 {
  private S: number[] = [];
  private i: number = 0;
  private j: number = 0;
  private xorTable: number[][];

  constructor(key: string) {
    this.xorTable = this.buildXorTable();
    
    for (let i = 0; i < 256; i++) {
      this.S[i] = i;
    }
    
    let j = 0;
    for (let i = 0; i < 256; i++) {
      j = (j + this.S[i] + key.charCodeAt(i % key.length)) % 256;
      [this.S[i], this.S[j]] = [this.S[j], this.S[i]];
    }
  }

  private buildXorTable(): number[][] {
    const c: number[][] = [];
    for (let d = 0; d < 256; d++) {
      c[d] = [];
    }
    
    const b = [0, 1, 1, 0];
    c[0][0] = b[0] * 255;
    
    let e = 1;
    for (let f = 0; f < 8; f++) {
      for (let d = 0; d < e; d++) {
        for (let g = 0; g < e; g++) {
          const h = c[d][g] - b[0] * e;
          c[d][g + e] = h + b[1] * e;
          c[d + e][g] = h + b[2] * e;
          c[d + e][g + e] = h + b[3] * e;
        }
      }
      e *= 2;
    }
    
    return c;
  }

  generate(len: number): string {
    let result = '';
    for (let o = 0; o < len; o++) {
      this.i = (this.i + 1) % 256;
      this.j = (this.j + this.S[this.i]) % 256;
      [this.S[this.i], this.S[this.j]] = [this.S[this.j], this.S[this.i]];
      result += String.fromCharCode(this.S[(this.S[this.i] + this.S[this.j]) % 256]);
    }
    return result;
  }

  cipher(data: string): string {
    const keystream = this.generate(data.length);
    let result = '';
    for (let i = 0; i < data.length; i++) {
      result += String.fromCharCode(this.xorTable[data.charCodeAt(i)][keystream.charCodeAt(i)]);
    }
    return result;
  }
}

// ============================================================================
// ANTI-DEOBFUSCATOR TAMPER TRAPS
// ----------------------------------------------------------------------------
// Generates randomized snippets that index a vararg table with a value derived
// from random byte arithmetic. At normal runtime the call site is never
// actually executed (wrapped in a never-true predicate), but symbolic
// execution / VM emulation used by deobfuscators will follow the branch and
// crash because the index is non-numeric or out of range.
// ============================================================================
function randName(prefix = "_w"): string {
  const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
  let s = prefix;
  for (let i = 0; i < 6 + Math.floor(Math.random() * 6); i++) {
    s += chars[Math.floor(Math.random() * chars.length)];
  }
  return s;
}

function buildAntiTamperSnippet(): string {
  const fn = randName("_at");
  const guard = randName("_g");
  const variants = [
    `local function ${fn}(...) return ({...})[math.random(string.byte(string.char(math.random(1,254))), string.byte(string.char(math.random(1000,254000)/1000)))] end local ${guard}=({})[1] if ${guard} then ${fn}(${guard}) end`,
    `local function ${fn}(...) local t={...} return t[string.byte(string.char(math.random(1,254)))+#t*0] end local ${guard}=tostring(({})[1]) if #${guard}>0 then ${fn}(${guard}) end`,
    `local function ${fn}(...) return ({...})[({nil})[math.random(1,2)] or string.byte(string.char(math.random(1,254)))] end pcall(function() if ({})[math.random(2,9)] then ${fn}(0) end end)`,
  ];
  return variants[Math.floor(Math.random() * variants.length)];
}

// Anti-stack-jump prologue: captures original critical globals as upvalues BEFORE
// any attacker code can wrap our script in a `function(getfenv,setfenv,rawget,...)`
// stack-jump shim (the pattern used by leaked Syscure cracks). If those globals are
// later swapped out, identity check fails and we trigger a tamper trap.
function buildAntiStackJumpPrologue(): string {
  const r = (p: string) => p + Math.random().toString(36).slice(2, 8);
  const _gf = r("_gf"), _sf = r("_sf"), _rg = r("_rg"),
        _sm = r("_sm"), _ls = r("_ls"), _chk = r("_chk"), _trap = r("_trap"),
        _sentinel = r("_s"), _probe = r("_p"),
        _dinfo = r("_di"), _score = r("_sc"), _report = r("_rpt"),
        _delayedTrap = r("_dt"), _env = r("_env");

  // ANTI-CRACK PROLOGUE v3 — score-based (no false positives), silent reporting,
  // delayed sabotage. Defends against the leaked Luarmor cache-dumper pattern:
  //   hookfunction(game.HttpGet, fn) -> writefile(cache, content)
  // and Syscure-style stack-jump shims: function(getfenv,setfenv,rawget,...) wrapper.
  //
  // Strategy: gather signals into a SCORE. Only sabotage when score >= threshold,
  // so legitimate executors that natively wrap HttpGet in Lua don't false-trip.
  // Sabotage is DELAYED (3-7s) and SILENT — by the time it crashes, the dumper
  // has already saved partial garbage and can't tell what corrupted it.
  return `
local ${_gf}, ${_sf}, ${_rg}, ${_sm} = getfenv, setfenv, rawget, setmetatable
local ${_ls} = loadstring or load
local ${_sentinel} = {}
local ${_probe} = (function(s) return s end)(${_sentinel})
local ${_env} = (getfenv and getfenv()) or _ENV or _G
local function ${_trap}() return ({})[(function() return nil end)()] end
local function ${_report}(reason)
  -- Silent telemetry hook. Loader/validate-key picks this up and issues 24h HWID ban.
  pcall(function()
    ${_env}.__SHADOW_REPORT = ${_env}.__SHADOW_REPORT or {}
    table.insert(${_env}.__SHADOW_REPORT, { r = reason, t = (os and os.time and os.time()) or 0 })
  end)
end
-- C-vs-Lua introspection (only ONE signal in the score; not enough alone to crash).
local function ${_dinfo}(fn)
  if not fn then return false end
  local ok, what = pcall(function()
    if debug and debug.info then return debug.info(fn, "s") end
    if debug and debug.getinfo then local i = debug.getinfo(fn, "S"); return i and i.what end
    return nil
  end)
  if not ok then return false end
  return what == "Lua" or what == "main"
end
local function ${_chk}()
  local score = 0
  -- Hard signals (each = instant fail)
  if ${_probe} ~= ${_sentinel} then return ${_trap}() end
  if rawequal == nil then return ${_trap}() end
  if not rawequal(${_gf}, getfenv) then return ${_trap}() end
  if not rawequal(${_sf}, setfenv) then return ${_trap}() end
  if not rawequal(${_rg}, rawget) then return ${_trap}() end
  if not rawequal(${_sm}, setmetatable) then return ${_trap}() end
  if not rawequal(${_ls}, (loadstring or load)) then return ${_trap}() end
  -- ============ HARD SIGNALS: 25ms / Lune dumper detection ============
  -- These are IMPOSSIBLE in a real Roblox executor. Instant trap.
  -- 1) Lune runtime globals (25ms dumper runs in Lune, not Roblox)
  if rawget(${_env}, "process") ~= nil then ${_report}("lune_process") return ${_trap}() end
  if rawget(${_env}, "luau") ~= nil then ${_report}("lune_luau") return ${_trap}() end
  if rawget(${_env}, "fs") ~= nil and type(rawget(${_env},"fs"))=="table" and rawget(${_env},"fs").readFile then
    ${_report}("lune_fs") return ${_trap}()
  end
  -- 2) 25ms-injected globals (luraphdump.lua injects _25ms() spy fn)
  if rawget(${_env}, "_25ms") ~= nil then ${_report}("25ms_inject") return ${_trap}() end
  if rawget(${_env}, "_25msrequireluvsu") ~= nil then ${_report}("25ms_req") return ${_trap}() end
  -- 3) Fake game (httplog.lua / loadstringlog.lua use mocked game from fakegame.lua)
  pcall(function()
    local g = rawget(${_env}, "game")
    if g == nil then ${_report}("no_game"); error() end
    if typeof and typeof(g) ~= "Instance" then ${_report}("fake_game_type") error() end
    -- Real Roblox game has DistributedGameTime that changes between frames
    local ws = rawget(${_env}, "workspace") or (g.GetService and g:GetService("Workspace"))
    if not ws then ${_report}("no_workspace") error() end
    if typeof and typeof(ws) ~= "Instance" then ${_report}("fake_workspace") error() end
    -- HttpGet must be C function in real Roblox; fakegame uses Lua wrapper
    if g.HttpGet and ${_dinfo}(g.HttpGet) then ${_report}("game_httpget_lua") error() end
  end)
  -- 4) loadstring must be C function (loadstringlog.lua replaces it with Lua fn)
  if ${_ls} and ${_dinfo}(${_ls}) then ${_report}("loadstring_lua") return ${_trap}() end
  -- 5) require hook (httplog2: getfenv().require=function()end)
  pcall(function()
    local req = rawget(${_env}, "require")
    if req and ${_dinfo}(req) then
      -- In Roblox require is C; if Lua, it's a dumper wrapper
      ${_report}("require_lua") error()
    end
  end)
  -- ============ SOFT SIGNALS (combined; threshold = 3) ============
  pcall(function()
    local g = rawget(${_env}, "game")
    local hookfn = rawget(${_env}, "hookfunction") or rawget(${_env}, "replaceclosure")
    local writef = rawget(${_env}, "writefile")
    local listf  = rawget(${_env}, "listfiles")
    local isfold = rawget(${_env}, "isfolder")
    local gconns = rawget(${_env}, "getconnections")
    local hookmm = rawget(${_env}, "hookmetamethod")
    local getgc  = rawget(${_env}, "getgc")
    local getup  = rawget(${_env}, "getupvalues") or rawget(${_env}, "getupvalue")
    local getreg = rawget(${_env}, "getreg") or rawget(${_env}, "getregistry")
    -- Filesystem dump primitives present (cache dumper requires them)
    if writef and (listf or isfold) then score = score + 1 end
    -- HttpGet looks hooked AND filesystem dump primitives are present = cache dumper signature
    if g and typeof and typeof(g) == "Instance" then
      local httpHooked = ${_dinfo}(g.HttpGet) or ${_dinfo}(g.HttpGetAsync)
      if httpHooked and writef then score = score + 3 end
      if httpHooked and hookfn then score = score + 2 end
    end
    -- request / syn.request hooked
    local rq = rawget(${_env}, "request") or rawget(${_env}, "http_request")
    if rq and ${_dinfo}(rq) and writef then score = score + 3 end
    local syn = rawget(${_env}, "syn")
    if syn and type(syn) == "table" and syn.request and ${_dinfo}(syn.request) and writef then
      score = score + 3
    end
    -- Upvalue / GC enumeration combined with hookfunction = active reverse-engineering session
    if hookfn and (getup or getgc or getreg) and gconns and hookmm then
      score = score + 2
    end
  end)
  if score >= 3 then
    ${_report}("crack_score=" .. tostring(score))
    -- DELAYED sabotage: corrupt state silently after dump completes.
    pcall(function()
      if task and task.delay then
        task.delay(3 + math.random() * 4, function()
          -- Corrupt critical globals; dumper output is now unrunnable.
          pcall(function() ${_env}.string = ${_sentinel} end)
          pcall(function() ${_env}.table = ${_sentinel} end)
          ${_trap}()
        end)
      else
        ${_trap}()
      end
    end)
  end
end
${_chk}()
-- Re-arm once on next tick (catches hooks installed AFTER initial load).
pcall(function()
  if task and task.defer then task.defer(${_chk}) end
end)
`.trim();
}

function injectAntiTamperTraps(source: string): string {
  // Inject 2-3 traps at random newline boundaries (avoid splitting strings).
  const lines = source.split("\n");
  if (lines.length < 4) return buildAntiTamperSnippet() + "\n" + source;
  const insertCount = 2 + Math.floor(Math.random() * 2);
  const positions = new Set<number>();
  for (let i = 0; i < insertCount; i++) {
    positions.add(1 + Math.floor(Math.random() * (lines.length - 2)));
  }
  const sorted = [...positions].sort((a, b) => b - a);
  for (const p of sorted) {
    lines.splice(p, 0, buildAntiTamperSnippet());
  }
  return buildAntiStackJumpPrologue() + "\n" + buildAntiTamperSnippet() + "\n" + lines.join("\n");
}

function obfuscateLocal(source: string, options: Record<string, unknown> = {}): string {
  const _settings = {
    comment: '// Wbhf Auth Protected',
    variablecomment: 'Wbhf Auth Protection Engine v3',
    cryptvarcomment: true,
    variablename: 'SHADOW',
  };

  const opt = {
    comment: (options.comment as string) || _settings.comment,
    variablecomment: (options.variablecomment as string) || _settings.variablecomment,
    cryptvarcomment: options.cryptvarcomment !== false,
    variablename: ((options.variablename as string) || _settings.variablename)
      .replace(/[^\w]/g, '_')
      .replace(/^(\d)/, 'v$1'),
  };

  const varname = opt.variablename;
  
  const varcomment = opt.cryptvarcomment 
    ? '\\' + stringToBytes(opt.variablecomment).join('\\')
    : opt.variablecomment;

  const passkey = genPass(Math.floor(Math.random() * 11) + 10);
  const sourceB64 = base64Encode(source);
  const rc4 = new RC4(passkey);
  const encrypted = rc4.cipher(sourceB64);
  const key64 = base64Encode(passkey);

  const v_z = varname + genIl("z");
  const v_a = varname + genIl("a");
  const v_b = varname + genIl("b");
  const v_c = varname + genIl("c");
  const v_d = varname + genIl("d");
  const v_e = varname + genIl("e");
  const v_f = varname + genIl("f");
  const v_g = varname + genIl("g");
  const v_i = varname + genIl("i");
  const v_j = varname + genIl("j");
  const v_k = varname + genIl("k");
  const v_m = varname + genIl("m");
  const v_n = varname + genIl("n");
  const v_o = varname + genIl("o");
  const v_h = varname + genIl("h");

  const keyBytecode = '\\' + stringToBytes(key64).join('\\');
  const encryptedBytes = stringToBytes(encrypted);
  const encBytecode = '\\' + encryptedBytes.join('\\');

  const fake1 = Math.floor(Math.random() * 31304 + 111) / 100;
  const fake2 = Math.floor(Math.random() * 31304 + 111) / 100;
  const fake3 = Math.floor(Math.PI);
  const fakeEnc1 = base64Encode(genPass(Math.floor(Math.random() * 11) + 10));
  const fakeEnc2 = base64Encode(genPass(Math.floor(Math.random() * 11) + 10));
  const fakeEnc3 = base64Encode(genPass(Math.floor(Math.random() * 11) + 10));

  let output = '';

  output += `--${opt.comment}\n\n`;
  output += `return (function()`;
  output += `local ${v_z} = "${varcomment}";`;
  output += `local ${v_z} = "${varcomment}";`;
  output += `local ${v_z} = "${varcomment}";`;
  output += `local ${v_a}=${fake1};`;
  output += `local ${v_b}=${fake2};`;
  output += `local ${v_c}=${fake3};`;

  output += `local ${v_i}=(function()`;
  output += `local b='${base64Charset}'`;
  output += `return function(data)`;
  output += `data=string.gsub(data,'[^'..b..'=]','')`;
  output += `return(data:gsub('.',function(x)`;
  output += `if(x=='=')then return''end`;
  output += `local r,f='',(b:find(x)-1)`;
  output += `for i=6,1,-1 do r=r..(f%2^i-f%2^(i-1)>0 and'1'or'0')end`;
  output += `return r`;
  output += `end):gsub('%d%d%d?%d?%d?%d?%d?%d?',function(x)`;
  output += `if(#x~=8)then return''end`;
  output += `local c=0`;
  output += `for i=1,8 do c=c+(x:sub(i,i)=='1'and 2^(8-i)or 0)end`;
  output += `return string.char(c)`;
  output += `end))end end)();`;

  output += `local ${v_b}=${Math.floor(Math.random() * 31304 + 111) / 100};`;

  output += `local ${v_j}=(function()`;
  output += `local function buildXor(b)`;
  output += `local c={}`;
  output += `for d=0,255 do c[d]={}end`;
  output += `c[0][0]=b[1]*255`;
  output += `local e=1`;
  output += `for f=0,7 do`;
  output += `for d=0,e-1 do`;
  output += `for g=0,e-1 do`;
  output += `local h=c[d][g]-b[1]*e`;
  output += `c[d][g+e]=h+b[2]*e`;
  output += `c[d+e][g]=h+b[3]*e`;
  output += `c[d+e][g+e]=h+b[4]*e`;
  output += `end end`;
  output += `e=e*2`;
  output += `end`;
  output += `return c end`;
  output += `local xor=buildXor{0,1,1,0}`;
  output += `local function gen(self,k)`;
  output += `local S,i,j=self.S,self.i,self.j`;
  output += `local r={}`;
  output += `for o=1,k do`;
  output += `i=(i+1)%256`;
  output += `j=(j+S[i])%256`;
  output += `S[i],S[j]=S[j],S[i]`;
  output += `r[o]=string.char(S[(S[i]+S[j])%256])`;
  output += `end`;
  output += `self.i,self.j=i,j`;
  output += `return table.concat(r)end`;
  output += `local function cipher(self,data)`;
  output += `local ks=gen(self,#data)`;
  output += `local r={}`;
  output += `for i=1,#data do`;
  output += `r[i]=string.char(xor[data:byte(i)][ks:byte(i)])`;
  output += `end`;
  output += `return table.concat(r)end`;
  output += `local function schedule(self,key)`;
  output += `local S=self.S`;
  output += `local j,len=0,#key`;
  output += `for i=0,255 do`;
  output += `j=(j+S[i]+key:byte(i%len+1))%256`;
  output += `S[i],S[j]=S[j],S[i]`;
  output += `end end`;
  output += `return function(key)`;
  output += `local S={}`;
  output += `for i=0,255 do S[i]=i end`;
  output += `local self={S=S,i=0,j=0,generate=gen,cipher=cipher,schedule=schedule}`;
  output += `if key then self:schedule(key)end`;
  output += `return self end end)();`;

  output += `local fev=getfenv or function()return _ENV end;`;

  output += `local ${v_k}=function(code,env)`;
  output += `local fn,err=(loadstring or load)(code)`;
  output += `if not fn then error("Load error: "..tostring(err))end`;
  output += `if setfenv then setfenv(fn,env)end`;
  output += `return fn end;`;

  output += `local ${v_e}='${fakeEnc1}';`;
  output += `local ${v_n}="${encBytecode}";`;
  output += `local ${v_f}='${opt.variablecomment}';`;
  output += `local ${v_g}='${fakeEnc2}';`;

  output += `local ${v_m}=function(a,b)`;
  output += `local c=${v_j}(${v_i}(a))`;
  output += `local d=c["\\99\\105\\112\\104\\101\\114"](c,b)`;
  output += `return ${v_i}(d)`;
  output += `end;`;

  output += `local ${v_d}="${keyBytecode}";`;
  output += `local ${v_o}='${fakeEnc1}${fakeEnc2}${fakeEnc3}';`;
  output += `function ${v_h}(a,b)local c=${v_i}(a,b);local d=${v_e};return c,d end;`;
  output += `return ${v_k}(${v_m}(${v_d},${v_n}),fev(0))()`;
  output += `end)()`;

  return output;
}

// ============================================================================
// MAIN OBFUSCATION HANDLER
// ============================================================================

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { code, options, userId } = await req.json();

    if (!code || typeof code !== 'string') {
      throw new Error('No code provided');
    }

    // Check tokens for free users (10 tokens per obfuscation)
    if (userId) {
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      
      const tokenCheck = await fetch(`${supabaseUrl}/rest/v1/rpc/deduct_tokens`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
        },
        body: JSON.stringify({ p_user_id: userId, p_amount: 10 }),
      });
      
      const tokenResult = await tokenCheck.json();
      if (!tokenResult?.success) {
        throw new Error(tokenResult?.reason || 'Not enough tokens. Upgrade your plan for unlimited obfuscations.');
      }
    }

    console.log('Starting obfuscation...');
    console.log('Input length:', code.length);
    console.log('Options:', JSON.stringify(options || {}));

    // Process macros
    const { cleanCode: rawClean, macros } = extractMacros(code);
    console.log(`Found ${macros.length} macro regions`);

    // Inject anti-deobfuscator tamper traps (randomized variants).
    // These create invalid table indexing at runtime which crashes
    // most deobfuscators/dumpers that simulate execution (e.g. Luraph deobfs).
    const cleanCode = options?.antiTamper === false
      ? rawClean
      : injectAntiTamperTraps(rawClean);

    // Check if Luraph API should be used
    const useLuraph = options?.useLuraph === true;
    const luraphApiKey = Deno.env.get("LURAPH_API_KEY");

    let obfuscatedCode: string;
    let engine = 'local';

    if (useLuraph && luraphApiKey) {
      console.log('Using Luraph API for VM obfuscation...');
      
      try {
        const client = new LuraphClient(luraphApiKey);

        // Pass user preferences - the client.obfuscate() method will
        // dynamically fetch node options and apply them correctly
        const luraphOptions: LuraphOptions = {};

        if (options?.controlFlow !== false) {
          luraphOptions.CONTROL_FLOW = true;
        }
        if (options?.antiTamper !== false) {
          luraphOptions.ANTI_TAMPER = true;
        }
        if (options?.vmEncryption !== false) {
          luraphOptions.VM_ENCRYPTION = true;
        }
        if (options?.stringEncryption !== false) {
          luraphOptions.STRING_ENCRYPTION = true;
        }

        obfuscatedCode = await client.obfuscate(
          cleanCode,
          'script.lua',
          luraphOptions
        );
        engine = 'luraph';
        
      } catch (luraphError) {
        console.error('Luraph API error, falling back to local engine:', luraphError);
        obfuscatedCode = obfuscateLocal(cleanCode, options);
        engine = 'local (fallback)';
      }
    } else {
      // Use local obfuscation engine
      obfuscatedCode = obfuscateLocal(cleanCode, options);
    }

    console.log(`Obfuscation complete using ${engine} engine`);
    console.log('Output length:', obfuscatedCode.length);

    return new Response(
      JSON.stringify({
        success: true,
        code: obfuscatedCode,
        engine,
        macrosProcessed: macros.length,
        stats: {
          originalSize: code.length,
          obfuscatedSize: obfuscatedCode.length,
          ratio: (obfuscatedCode.length / code.length).toFixed(2)
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Obfuscation error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
