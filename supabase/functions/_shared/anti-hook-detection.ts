/**
 * SHADOWAUTH - ANTI-HOOK DETECTION
 * ==================================
 * Luarmor-style anti-hook protection
 * Detects: SimpleSpy, Hydroxide, Dex, remote spy tools, Environment Loggers
 * 
 * Includes V3rmillion-style environment logger detection:
 * - Checks debug.info source signatures for C functions
 * - Validates core Lua functions aren't sandboxed/proxied
 */

// Generate Luarmor-style escape sequences
export function generateEscapeSequences(length: number = 64): string {
  const sequences: string[] = [];
  for (let i = 0; i < length; i++) {
    // Generate Luarmor-style octal escapes: \136\158\166...
    const byte = Math.floor(Math.random() * 200) + 32;
    sequences.push(`\\${byte.toString()}`);
  }
  return sequences.join('');
}

// Generate anti-hook Lua code (like Luarmor's getrenv + rawequal checks)
export function generateAntiHookCode(): string {
  const varPrefix = generateRandomVarName(6);
  const hookCheckVar = `_${varPrefix}_hc`;
  const originalLsVar = `_${varPrefix}_ols`;
  const realEnvVar = `_${varPrefix}_renv`;
  const integrityVar = `_${varPrefix}_int`;
  const spyScanVar = `_${varPrefix}_spy`;
  const envLogVar = `_${varPrefix}_env`;
  
  return `
-- =====================================================
-- SHADOWAUTH ANTI-HOOK DETECTION V4.0
-- Like Luarmor: getrenv + rawequal + spy scanning
-- + V3rmillion Environment Logger Detection
-- =====================================================

-- V3rmillion-style Environment Logger Detection (runs first, fastest exit)
local ${envLogVar} = (function()
  -- Quick environment sanity checks
  if not getmetatable or not setmetatable or not pcall or not debug or not rawget or not rawset then
    return false, "missing_core_functions"
  end
  
  -- Test rawset functionality (env loggers often break this)
  local rawsetOk = pcall(rawset, {}, " ", " ")
  if not rawsetOk then
    return false, "rawset_broken"
  end
  
  -- Check select exists
  if not select then
    return false, "select_missing"
  end
  
  -- Get debug.info safely
  local debugInfoOk, debugInfo = pcall(rawget, debug, "info")
  if not debugInfoOk or not debugInfo then
    return false, "debug_info_missing"
  end
  
  -- V3rmillion signature check: C functions must report "[C]" as source
  local function isCFunction(fn)
    local ok, source = pcall(function()
      return debugInfo(fn, "s")
    end)
    return ok and source == "[C]"
  end
  
  -- Critical functions that MUST be C functions
  if not isCFunction(print) then
    return false, "print_hooked"
  end
  
  if not isCFunction(require) then
    return false, "require_hooked"
  end
  
  if not isCFunction(pcall) then
    return false, "pcall_hooked"
  end
  
  if not isCFunction(rawget) then
    return false, "rawget_hooked"
  end
  
  if not isCFunction(rawset) then
    return false, "rawset_hooked"
  end
  
  -- Additional executor-specific checks
  if type(game) == "userdata" then
    -- In Roblox, check game methods
    local gameGetService = game.GetService
    if gameGetService and not isCFunction(gameGetService) then
      return false, "getservice_hooked"
    end
  end
  
  return true, nil
end)()

-- If environment is sandboxed (env logger detected), exit silently
if not ${envLogVar} then
  return nil
end

local ${hookCheckVar} = function()
  local ${integrityVar} = true
  local ${spyScanVar} = {}
  
  -- 1. Get real environment (bypasses _G proxies)
  local ${realEnvVar} = getrenv and getrenv() or _G
  local ${originalLsVar} = ${realEnvVar}.loadstring or loadstring
  
  -- 2. rawequal check (detects function wrappers/proxies)
  if rawequal then
    -- Check if loadstring is the original
    if not rawequal(${originalLsVar}, loadstring) then
      ${spyScanVar}["loadstring_hooked"] = true
      ${integrityVar} = false
    end
    
    -- Check game:HttpGet
    local httpGet = game.HttpGet
    if not rawequal(httpGet, game.HttpGet) then
      ${spyScanVar}["httpget_hooked"] = true
      ${integrityVar} = false
    end
    
    -- Check game.GetService
    local getService = game.GetService
    if type(getService) ~= "function" then
      ${spyScanVar}["getservice_hooked"] = true
      ${integrityVar} = false
    end
  end
  
  -- 3. SimpleSpy Detection
  local simpleSpyPatterns = {
    "_G.SimpleSpy",
    "_G.SimpleSpyExecuted",
    "SimpleSpy.GetRemotes",
    "ss.GetRemotes",
    "_G.SS",
  }
  
  for _, pattern in ipairs(simpleSpyPatterns) do
    local parts = {}
    for part in string.gmatch(pattern, "[^%.]+") do
      table.insert(parts, part)
    end
    
    local obj = _G
    local found = true
    for _, part in ipairs(parts) do
      if type(obj) == "table" and obj[part] ~= nil then
        obj = obj[part]
      else
        found = false
        break
      end
    end
    
    if found then
      ${spyScanVar}["simplespy"] = true
      ${integrityVar} = false
      break
    end
  end
  
  -- 4. Hydroxide Detection
  local hydroxidePatterns = {
    "Hydroxide",
    "HydroxideUI",
    "_G.Hydroxide",
    "getgenv().Hydroxide",
  }
  
  for _, pattern in ipairs(hydroxidePatterns) do
    pcall(function()
      local check = loadstring("return " .. pattern)
      if check then
        local result = check()
        if result ~= nil then
          ${spyScanVar}["hydroxide"] = true
          ${integrityVar} = false
        end
      end
    end)
  end
  
  -- Check CoreGui for Hydroxide UI
  pcall(function()
    local coreGui = game:GetService("CoreGui")
    if coreGui:FindFirstChild("Hydroxide") or coreGui:FindFirstChild("HydroxideUI") then
      ${spyScanVar}["hydroxide_ui"] = true
      ${integrityVar} = false
    end
  end)
  
  -- 5. Dex Explorer Detection
  local dexPatterns = {
    "Dex",
    "DexExplorer",
    "_G.Dex",
    "DEX_EXECUTED",
  }
  
  for _, pattern in ipairs(dexPatterns) do
    pcall(function()
      if _G[pattern] ~= nil or (getgenv and getgenv()[pattern] ~= nil) then
        ${spyScanVar}["dex"] = true
        ${integrityVar} = false
      end
    end)
  end
  
  -- Check for Dex in CoreGui
  pcall(function()
    local coreGui = game:GetService("CoreGui")
    for _, child in ipairs(coreGui:GetChildren()) do
      local name = child.Name:lower()
      if name:find("dex") or name:find("explorer") then
        ${spyScanVar}["dex_ui"] = true
        ${integrityVar} = false
      end
    end
  end)
  
  -- 6. Remote Spy Detection
  local remoteSpyPatterns = {
    "RemoteSpy",
    "_G.RemoteSpy",
    "getgenv().RemoteSpy",
    "RSconnections",
  }
  
  for _, pattern in ipairs(remoteSpyPatterns) do
    pcall(function()
      if _G[pattern] ~= nil then
        ${spyScanVar}["remotespy"] = true
        ${integrityVar} = false
      end
    end)
  end
  
  -- 7. Function signature check (detects wrapped functions)
  local function checkFunctionIntegrity(fn, expectedName)
    if type(fn) ~= "function" then return false end
    
    local info = debug and debug.info and debug.info(fn, "s") or nil
    if info then
      -- If source contains [C], it's a C function (original)
      -- Lua wrappers will have different sources
      return info == "[C]" or info:find("^=") ~= nil
    end
    
    return true -- Can't verify, assume safe
  end
  
  -- 8. Hookcheck function detection
  pcall(function()
    if hookfunction or hookmetamethod then
      -- These functions exist = executor has hook capability
      -- Check if they've been used on critical functions
      if isreadonly and not isreadonly(debug) then
        ${spyScanVar}["debug_modified"] = true
      end
    end
  end)
  
  return ${integrityVar}, ${spyScanVar}
end

-- Run check immediately
local __SA_INTEGRITY, __SA_SPY_DETECTED = ${hookCheckVar}()

if not __SA_INTEGRITY then
  -- Report to server (non-blocking)
  pcall(function()
    local H = game:GetService("HttpService")
    local detected = {}
    for k, v in pairs(__SA_SPY_DETECTED) do
      if v then table.insert(detected, k) end
    end
    
    spawn(function()
      pcall(function()
        game:HttpGet("__REPORT_URL__?type=hook_detected&tools=" .. table.concat(detected, ","))
      end)
    end)
  end)
end

-- Export for loader use
_G.__SA_ANTI_HOOK = {
  integrity = __SA_INTEGRITY,
  detected = __SA_SPY_DETECTED,
  check = ${hookCheckVar},
  realLoadstring = (getrenv and getrenv() or _G).loadstring or loadstring,
}
`;
}

// Generate V3rmillion-style compact anti-env-log check
export function generateAntiEnvLogCheck(): string {
  return `
-- V3rmillion Anti-Environment Logger (compact)
-- Detects sandboxed environments used by script analyzers
do
  local function _chk()
    if not getmetatable or not setmetatable or not pcall or not debug or not rawget or not rawset then return false end
    if not pcall(rawset, {}, " ", " ") then return false end
    if not select then return false end
    local ok, di = pcall(rawget, debug, "info")
    if not ok or not di then return false end
    local function isC(f) local s, r = pcall(function() return di(f, "s") end) return s and r == "[C]" end
    if not isC(print) or not isC(require) or not isC(pcall) or not isC(rawget) or not isC(rawset) then return false end
    return true
  end
  if not _chk() then return nil end
end
`;
}

// Generate Luarmor-style advanced anti-env-log check
// Based on leaked Luarmor techniques: identity checks, env logger probes, isolated execution
export function generateLuarmorStyleAntiEnvLog(): string {
  const obfuscatedVar = `_${generateRandomVarName(8)}`;
  
  return `
-- Luarmor-style Anti-Environment Logger V2
-- Identity checks + env logger signature detection + isolated wrapper
do
  local fenv = getfenv()
  
  -- 1. Identity checks (hooked functions fail these)
  if require ~= require then return nil end
  if print ~= print then return nil end
  if pcall ~= pcall then return nil end
  if loadstring ~= loadstring then return nil end
  if getfenv ~= getfenv then return nil end
  if setfenv ~= setfenv then return nil end
  
  -- 2. Probe for common env logger signatures
  local envLoggerVars = {
    "superflow_bytecode_ext0", "hi", "env_log", "_env_hook", 
    "script_spy", "remote_spy_hook", "_G_hook", "global_hook",
    "fenv_interceptor", "bytecode_dump", "debug_hook_active"
  }
  
  for _, varName in ipairs(envLoggerVars) do
    if fenv[varName] ~= nil then return nil end
    if rawget(_G, varName) ~= nil then return nil end
  end
  
  -- 3. Check if getfenv returns same table (env loggers often wrap it)
  local fenv1 = getfenv()
  local fenv2 = getfenv()
  if fenv1 ~= fenv2 then return nil end
  
  -- 4. rawequal checks on critical functions
  if rawequal then
    if not rawequal(require, require) then return nil end
    if not rawequal(print, print) then return nil end
    if not rawequal(loadstring, loadstring) then return nil end
  end
  
  -- 5. debug.info source check for C functions
  local function _cChk(f)
    if not debug or not debug.info then return true end -- can't verify, assume ok
    local ok, src = pcall(debug.info, f, "s")
    return not ok or src == "[C]"
  end
  
  if not _cChk(print) then return nil end
  if not _cChk(require) then return nil end
  if not _cChk(pcall) then return nil end
  if not _cChk(rawget) then return nil end
  if not _cChk(rawset) then return nil end
  if not _cChk(getfenv) then return nil end
  if not _cChk(setfenv) then return nil end
  if game and game.GetService then
    if not _cChk(game.GetService) then return nil end
  end
end
`;
}

// Generate ultra-compact inline check for Layer 1 (single line, no comments)
export function generateCompactAntiEnvCheck(): string {
  return `do local f=getfenv()if require~=require or print~=print or pcall~=pcall then return nil end;for _,v in ipairs({"superflow_bytecode_ext0","hi","env_log","_env_hook","bytecode_dump"})do if f[v]~=nil or rawget(_G,v)~=nil then return nil end end;if rawequal and(not rawequal(require,require)or not rawequal(print,print))then return nil end;if debug and debug.info then local function c(fn)local o,s=pcall(debug.info,fn,"s")return not o or s=="[C]"end;if not c(print)or not c(require)or not c(pcall)or not c(getfenv)then return nil end end end;`;
}

// Generate integrity verification code for the loader
export function generateIntegrityCheck(reportUrl: string): string {
  const code = generateAntiHookCode();
  return code.replace(/__REPORT_URL__/g, reportUrl);
}

// Generate Luarmor-style rawequal loadstring wrapper with robust fallback
export function generateSafeLoadstring(): string {
  return `
-- ShadowAuth Safe Loadstring v2.0
-- Robust fallback chain for all executor types

local _SA_LOADSTRING

do
  local _realLS = nil
  local _isHooked = false
  
  -- Try multiple sources in order of preference
  -- 1. getrenv().loadstring (most secure, bypasses _G hooks)
  -- 2. getgenv().loadstring (executor global env)
  -- 3. _G.loadstring (global)
  -- 4. loadstring (direct reference)
  
  local function tryGetLoadstring()
    -- Method 1: getrenv (real environment)
    if getrenv then
      local ok, renv = pcall(getrenv)
      if ok and renv and type(renv) == "table" and renv.loadstring then
        return renv.loadstring, "getrenv"
      end
    end
    
    -- Method 2: getgenv (executor environment)
    if getgenv then
      local ok, genv = pcall(getgenv)
      if ok and genv and type(genv) == "table" and genv.loadstring then
        return genv.loadstring, "getgenv"
      end
    end
    
    -- Method 3: _G.loadstring
    if _G and _G.loadstring then
      return _G.loadstring, "_G"
    end
    
    -- Method 4: Direct loadstring
    if loadstring then
      return loadstring, "direct"
    end
    
    return nil, "none"
  end
  
  _realLS, _source = tryGetLoadstring()
  
  if not _realLS then
    error("[ShadowAuth] No loadstring available in this executor")
  end
  
  -- Check for hooks using rawequal if available
  if rawequal and loadstring then
    if not rawequal(_realLS, loadstring) then
      _isHooked = true
      -- Keep using _realLS (the unhooked version)
    end
  end
  
  -- Create the wrapper function
  _SA_LOADSTRING = function(code)
    if not code or type(code) ~= "string" then
      return nil, "Invalid code"
    end
    
    local ok, result = pcall(_realLS, code)
    if ok then
      return result
    else
      -- Fallback: try other methods if primary fails
      for _, method in ipairs({loadstring, _G.loadstring}) do
        if method and method ~= _realLS then
          local ok2, result2 = pcall(method, code)
          if ok2 then return result2 end
        end
      end
      return nil, result
    end
  end
end
`;
}

// Helper
function generateRandomVarName(length: number = 8): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz';
  let result = chars[Math.floor(Math.random() * chars.length)];
  for (let i = 1; i < length; i++) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  return result;
}
