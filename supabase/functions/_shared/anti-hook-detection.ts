/**
 * SHADOWAUTH - ANTI-HOOK DETECTION V5.0
 * ==================================
 * Enhanced with V3rmillion/Solfège forum techniques:
 * - Heartbeat timing validation
 * - game:GetChildren() count check  
 * - JSONDecode null handling validation
 * - game() error message validation
 * - _G → getfenv leak detection
 * - Instance method existence check
 * - debug.traceback() sandbox string detection
 * - isfunctionhooked validation
 * - getfenv(69) boundary check
 * - debug.info arity/name length checks
 */

// Generate Luarmor-style escape sequences
export function generateEscapeSequences(length: number = 64): string {
  const sequences: string[] = [];
  for (let i = 0; i < length; i++) {
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
-- SHADOWAUTH ANTI-HOOK DETECTION V5.1
-- Scoring system - tolerant of executor differences
-- =====================================================

local __SA_SUSPICION = 0

-- Phase 0: Heartbeat timing check
pcall(function()
  local _hbCount = 0
  local _hbConn = game:GetService("RunService").Heartbeat:Connect(function()
    _hbCount = _hbCount + 1
  end)
  repeat task.wait() until _hbCount >= 2
  if _hbConn then _hbConn:Disconnect() end
end)

-- Phase 1: Instance method check (HIGH confidence)
pcall(function()
  local _imOk = pcall(function()
    Instance.new("Part"):${generateRandomVarName(14)}("a")
  end)
  if _imOk then __SA_SUSPICION = __SA_SUSPICION + 5 end
end)

-- Phase 2: debug.traceback sandbox strings (HIGH confidence)
pcall(function()
  local _tb = (debug.traceback() or ""):lower()
  if _tb:find("sandbox") or _tb:find("unveilr") or _tb:find("httpspy") or _tb:find("envlog") or _tb:find("crypta") or _tb:find("25ms") or _tb:find("threaded") then
    __SA_SUSPICION = __SA_SUSPICION + 5
  end
end)

-- Phase 3: Metatable on core functions (HIGH confidence)
pcall(function()
  if getmetatable(require) then __SA_SUSPICION = __SA_SUSPICION + 3 end
  if getmetatable(print) then __SA_SUSPICION = __SA_SUSPICION + 3 end
  if getmetatable(error) then __SA_SUSPICION = __SA_SUSPICION + 2 end
end)

-- Phase 4: game:GetChildren count (MEDIUM confidence)
pcall(function()
  if #game:GetChildren() <= 4 then __SA_SUSPICION = __SA_SUSPICION + 2 end
end)

-- Phase 5: JSONDecode null handling (MEDIUM confidence)
pcall(function()
  local _jOk, _jRes = pcall(function()
    return game:GetService("HttpService"):JSONDecode('[42,"test",true,123,false,[321,null,"check"],null,["a"]]')
  end)
  if _jOk and _jRes and _jRes[6] and _jRes[6][2] ~= nil then __SA_SUSPICION = __SA_SUSPICION + 2 end
end)

-- Phase 6: _G → getfenv leak (LOW confidence - some executors differ)
pcall(function()
  local _gKey = "${generateRandomVarName(10)}"
  _G[_gKey] = "${generateRandomVarName(8)}"
  local _leaked = getfenv()[_gKey] ~= nil
  _G[_gKey] = nil
  if _leaked then __SA_SUSPICION = __SA_SUSPICION + 2 end
end)

-- Block if suspicion is high
if __SA_SUSPICION >= 5 then return nil end

local ${hookCheckVar} = function()
  local ${integrityVar} = true
  local ${spyScanVar} = {}
  
  -- Get real environment
  local ${realEnvVar} = getrenv and getrenv() or _G
  local ${originalLsVar} = ${realEnvVar}.loadstring or loadstring
  
  -- rawequal check
  if rawequal then
    if not rawequal(${originalLsVar}, loadstring) then
      ${spyScanVar}["loadstring_hooked"] = true
      ${integrityVar} = false
    end
    local httpGet = game.HttpGet
    if not rawequal(httpGet, game.HttpGet) then
      ${spyScanVar}["httpget_hooked"] = true
      ${integrityVar} = false
    end
    local getService = game.GetService
    if type(getService) ~= "function" then
      ${spyScanVar}["getservice_hooked"] = true
      ${integrityVar} = false
    end
  end
  
  -- SimpleSpy Detection
  local simpleSpyPatterns = {"_G.SimpleSpy","_G.SimpleSpyExecuted","SimpleSpy.GetRemotes","ss.GetRemotes","_G.SS"}
  for _, pattern in ipairs(simpleSpyPatterns) do
    local parts = {}
    for part in string.gmatch(pattern, "[^%.]+") do table.insert(parts, part) end
    local obj = _G
    local found = true
    for _, part in ipairs(parts) do
      if type(obj) == "table" and obj[part] ~= nil then obj = obj[part] else found = false break end
    end
    if found then ${spyScanVar}["simplespy"] = true ${integrityVar} = false break end
  end
  
  -- Hydroxide Detection
  pcall(function()
    local coreGui = game:GetService("CoreGui")
    if coreGui:FindFirstChild("Hydroxide") or coreGui:FindFirstChild("HydroxideUI") then
      ${spyScanVar}["hydroxide_ui"] = true
      ${integrityVar} = false
    end
  end)
  
  -- Dex Explorer Detection
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
  
  -- Remote Spy Detection
  for _, pattern in ipairs({"RemoteSpy","_G.RemoteSpy","RSconnections"}) do
    pcall(function()
      if _G[pattern] ~= nil then ${spyScanVar}["remotespy"] = true ${integrityVar} = false end
    end)
  end
  
  -- Hookcheck function detection
  pcall(function()
    if hookfunction or hookmetamethod then
      if isreadonly and not isreadonly(debug) then
        ${spyScanVar}["debug_modified"] = true
      end
    end
  end)
  
  return ${integrityVar}, ${spyScanVar}
end

local __SA_INTEGRITY, __SA_SPY_DETECTED = ${hookCheckVar}()

if not __SA_INTEGRITY then
  pcall(function()
    local H = game:GetService("HttpService")
    local detected = {}
    for k, v in pairs(__SA_SPY_DETECTED) do if v then table.insert(detected, k) end end
    spawn(function()
      pcall(function()
        game:HttpGet("__REPORT_URL__?type=hook_detected&tools=" .. table.concat(detected, ","))
      end)
    end)
  end)
end

_G.__SA_ANTI_HOOK = {
  integrity = __SA_INTEGRITY,
  detected = __SA_SPY_DETECTED,
  check = ${hookCheckVar},
  realLoadstring = (getrenv and getrenv() or _G).loadstring or loadstring,
}
`;
}

// Compact anti-env-log check for Layer 1 (tolerant - wraps risky checks in pcall)
export function generateCompactAntiEnvCheck(): string {
  const methodName = generateRandomVarName(14);
  
  // Layer 1 must be VERY tolerant - only block obvious env loggers, not legitimate executors
  // All checks wrapped in pcall to avoid killing script on unsupported features
  return `do local _hc=0;local _cn;pcall(function()_cn=game:GetService("RunService").Heartbeat:Connect(function()_hc=_hc+1 end)end)if _cn then repeat task.wait()until _hc>=2;pcall(function()_cn:Disconnect()end)end end;do local _s=0;pcall(function()if getmetatable(require)then _s=_s+1 end;if getmetatable(print)then _s=_s+1 end end);pcall(function()local _io=pcall(function()Instance.new("Part"):${methodName}("a")end)if _io then _s=_s+3 end end);pcall(function()local _tb=(debug.traceback()or""):lower()if _tb:find("sandbox")or _tb:find("unveilr")or _tb:find("httpspy")or _tb:find("crypta")or _tb:find("25ms")then _s=_s+3 end end);if _s>=3 then return nil end end;`;
}

// Luarmor-style advanced anti-env-log check for Layer 2 (scoring system - tolerant)
export function generateLuarmorStyleAntiEnvLog(): string {
  const methodName = generateRandomVarName(14);
  const gKey = generateRandomVarName(10);
  const gVal = generateRandomVarName(8);
  
  return `
-- ShadowAuth Anti-Environment Logger V5.1 (Scoring System)
-- Uses a score-based approach: only blocks if multiple indicators fire
-- This prevents false positives on legitimate executors (Wave, Volt, etc.)
do
  local _suspicion = 0
  
  -- Heartbeat timing (ensures real Roblox runtime)
  pcall(function()
    local _hbCnt = 0
    local _hbC = game:GetService("RunService").Heartbeat:Connect(function() _hbCnt = _hbCnt + 1 end)
    repeat task.wait() until _hbCnt >= 2
    if _hbC then _hbC:Disconnect() end
  end)
  
  -- HIGH CONFIDENCE: Metatable on core functions (definite hook)
  pcall(function()
    if getmetatable(require) then _suspicion = _suspicion + 3 end
    if getmetatable(print) then _suspicion = _suspicion + 3 end
    if getmetatable(error) then _suspicion = _suspicion + 2 end
  end)
  
  -- HIGH CONFIDENCE: Instance method must error
  pcall(function()
    local _imOk = pcall(function()
      Instance.new("Part"):${methodName}("a")
    end)
    if _imOk then _suspicion = _suspicion + 5 end
  end)
  
  -- HIGH CONFIDENCE: debug.traceback sandbox strings
  pcall(function()
    local _tb = (debug.traceback() or ""):lower()
    if _tb:find("sandbox") or _tb:find("unveilr") or _tb:find("httpspy") or _tb:find("envlog") or _tb:find("crypta") or _tb:find("25ms") or _tb:find("threaded") then
      _suspicion = _suspicion + 5
    end
  end)
  
  -- MEDIUM CONFIDENCE: Env logger variable probes
  pcall(function()
    local fenv = getfenv()
    local envLoggerVars = {
      "superflow_bytecode_ext0", "env_log", "_env_hook", 
      "script_spy", "remote_spy_hook", "_25mspredefine"
    }
    for _, varName in ipairs(envLoggerVars) do
      if fenv[varName] ~= nil or rawget(_G, varName) ~= nil then 
        _suspicion = _suspicion + 4
        break
      end
    end
  end)
  
  -- MEDIUM CONFIDENCE: JSONDecode null handling
  pcall(function()
    local _jOk, _jRes = pcall(function()
      return game:GetService("HttpService"):JSONDecode('[42,"t",true,123,false,[321,null,"chk"],null]')
    end)
    if _jOk and _jRes and _jRes[6] and _jRes[6][2] ~= nil then
      _suspicion = _suspicion + 2
    end
  end)
  
  -- LOW CONFIDENCE: debug.info C function checks (some executors differ)
  pcall(function()
    if debug and debug.info then
      local function _cChk(f)
        local ok, src = pcall(debug.info, f, "s")
        return not ok or src == "[C]"
      end
      if not _cChk(print) then _suspicion = _suspicion + 1 end
      if not _cChk(require) then _suspicion = _suspicion + 1 end
      
      -- Lua function reporting "[C]" is suspicious
      local _tf = function() end
      local _to, _ts = pcall(debug.info, _tf, "s")
      if _to and _ts == "[C]" then _suspicion = _suspicion + 2 end
    end
  end)
  
  -- LOW CONFIDENCE: game:GetChildren count
  pcall(function()
    if #game:GetChildren() <= 4 then _suspicion = _suspicion + 2 end
  end)
  
  -- LOW CONFIDENCE: _G → getfenv leak
  pcall(function()
    _G.${gKey} = "${gVal}"
    local _leaked = getfenv().${gKey} ~= nil
    _G.${gKey} = nil
    if _leaked then _suspicion = _suspicion + 2 end
  end)
  
  -- isfunctionhooked checks
  pcall(function()
    if isfunctionhooked then
      if http and http.request and isfunctionhooked(http.request) then _suspicion = _suspicion + 3 end
      if request and isfunctionhooked(request) then _suspicion = _suspicion + 3 end
    end
  end)
  
  -- BLOCK: Only if suspicion score is high enough (multiple indicators)
  -- Score >= 5 means at least one HIGH confidence or multiple MEDIUM/LOW
  if _suspicion >= 5 then return nil end
end
`;
}

// Generate anti-env-log check (kept for backward compat)
export function generateAntiEnvLogCheck(): string {
  return generateCompactAntiEnvCheck();
}

// Generate integrity verification code for the loader
export function generateIntegrityCheck(reportUrl: string): string {
  const code = generateAntiHookCode();
  return code.replace(/__REPORT_URL__/g, reportUrl);
}

// Generate Luarmor-style rawequal loadstring wrapper
export function generateSafeLoadstring(): string {
  return `
-- ShadowAuth Safe Loadstring v2.0
local _SA_LOADSTRING
do
  local _realLS = nil
  local _isHooked = false
  local function tryGetLoadstring()
    if getrenv then
      local ok, renv = pcall(getrenv)
      if ok and renv and type(renv) == "table" and renv.loadstring then return renv.loadstring, "getrenv" end
    end
    if getgenv then
      local ok, genv = pcall(getgenv)
      if ok and genv and type(genv) == "table" and genv.loadstring then return genv.loadstring, "getgenv" end
    end
    if _G and _G.loadstring then return _G.loadstring, "_G" end
    if loadstring then return loadstring, "direct" end
    return nil, "none"
  end
  _realLS, _source = tryGetLoadstring()
  if not _realLS then error("[ShadowAuth] No loadstring available in this executor") end
  if rawequal and loadstring then
    if not rawequal(_realLS, loadstring) then _isHooked = true end
  end
  _SA_LOADSTRING = function(code)
    if not code or type(code) ~= "string" then return nil, "Invalid code" end
    local ok, result = pcall(_realLS, code)
    if ok then return result else
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
