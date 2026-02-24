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
-- SHADOWAUTH ANTI-HOOK DETECTION V5.0
-- Enhanced with V3rmillion forum techniques
-- =====================================================

-- Phase 0: Heartbeat timing check (ensures real Roblox runtime)
do
  local _hbCount = 0
  local _hbConn = game:GetService("RunService").Heartbeat:Connect(function()
    _hbCount = _hbCount + 1
  end)
  repeat task.wait() until _hbCount >= 2
  if _hbConn then _hbConn:Disconnect() end
end

-- Phase 1: V3rmillion-style Environment Logger Detection
local ${envLogVar} = (function()
  -- Core function existence
  if not getmetatable or not setmetatable or not pcall or not debug or not rawget or not rawset then
    return false, "missing_core_functions"
  end
  
  -- rawset functionality (env loggers often break this)
  local rawsetOk = pcall(rawset, {}, " ", " ")
  if not rawsetOk then return false, "rawset_broken" end
  
  if not select then return false, "select_missing" end
  
  -- debug.info availability
  local debugInfoOk, debugInfo = pcall(rawget, debug, "info")
  if not debugInfoOk or not debugInfo then return false, "debug_info_missing" end
  
  -- C function source signature check
  local function isCFunction(fn)
    local ok, source = pcall(function() return debugInfo(fn, "s") end)
    return ok and source == "[C]"
  end
  
  if not isCFunction(print) then return false, "print_hooked" end
  if not isCFunction(require) then return false, "require_hooked" end
  if not isCFunction(pcall) then return false, "pcall_hooked" end
  if not isCFunction(rawget) then return false, "rawget_hooked" end
  if not isCFunction(rawset) then return false, "rawset_hooked" end
  
  -- debug.info arity check (V3rmillion: function name length must be > 1)
  local printNameLen = #(debugInfo(getfenv, "n") or "")
  if printNameLen <= 1 then return false, "debug_info_arity_fail" end
  local printNameLen2 = #(debugInfo(print, "n") or "")
  if printNameLen2 <= 1 then return false, "debug_info_name_fail" end
  
  -- debug.info arg count check on print
  local printArgInfo = {debugInfo(print, "a")}
  if printArgInfo[1] ~= 0 then return false, "print_arg_mismatch" end
  if printArgInfo[2] ~= true then return false, "print_vararg_mismatch" end
  
  -- getfenv(69) boundary check (must fail in real env)
  local gfOk = select(1, pcall(getfenv, 69))
  if gfOk == true then return false, "getfenv_boundary_fail" end
  
  -- game.GetService check
  if type(game) == "userdata" then
    local gameGetService = game.GetService
    if gameGetService and not isCFunction(gameGetService) then
      return false, "getservice_hooked"
    end
  end
  
  -- Lua function must NOT report "[C]"
  local testFn = function() end
  local testOk, testSrc = pcall(function() return debugInfo(testFn, "s") end)
  if testOk and testSrc == "[C]" then return false, "lua_fn_reports_c" end
  
  -- Coroutine wrap check (dead coroutine debug.info must fail)
  local coroCheckOk = select(1, pcall(debugInfo, coroutine.wrap(function() end)(), "s"))
  if coroCheckOk ~= false then return false, "coro_debug_fail" end
  
  return true, nil
end)()

if not ${envLogVar} then return nil end

-- Phase 2: debug.traceback sandbox string detection
do
  local _tb = (debug.traceback() or ""):lower()
  if _tb:find("sandbox") or _tb:find("unveilr") or _tb:find("httpspy") or _tb:find("envlog") or _tb:find("crypta") or _tb:find("25ms") or _tb:find("threaded") then
    return nil
  end
end

-- Phase 3: Instance method existence check (env loggers fake Instance.new)
do
  local _imOk = pcall(function()
    Instance.new("Part"):${generateRandomVarName(14)}("a")
  end)
  -- In real Roblox, calling a nonexistent method MUST error
  if _imOk then return nil end
end

-- Phase 4: game:GetChildren() count (real game has many services)
do
  local _gc = #game:GetChildren()
  if _gc <= 4 then return nil end
end

-- Phase 5: JSONDecode null handling (null must become nil in real Roblox)
do
  local _jOk, _jRes = pcall(function()
    return game:GetService("HttpService"):JSONDecode('[42,"test",true,123,false,[321,null,"check"],null,["a"]]')
  end)
  if not _jOk then return nil end
  if _jRes and _jRes[6] and _jRes[6][2] ~= nil then return nil end
end

-- Phase 6: game() error message validation
do
  local _, _gMsg = pcall(function() game() end)
  if type(_gMsg) == "string" and not _gMsg:find("attempt to call a Instance value") then
    return nil
  end
end

-- Phase 7: _G → getfenv leak detection
do
  local _gKey = "${generateRandomVarName(10)}"
  _G[_gKey] = "${generateRandomVarName(8)}"
  local _leaked = getfenv()[_gKey] ~= nil
  _G[_gKey] = nil
  if _leaked then return nil end
end

-- Phase 8: game.ServiceAdded existence check
do
  if not game.ServiceAdded then return nil end
end

-- Phase 9: isfunctionhooked validation (if executor supports it)
do
  if isfunctionhooked then
    -- Check http functions
    pcall(function()
      if http and http.request and isfunctionhooked(http.request) then return nil end
      if request and isfunctionhooked(request) then return nil end
      if http_request and isfunctionhooked(http_request) then return nil end
    end)
    
    -- hookfunction + isfunctionhooked coherence test
    if hookfunction then
      local _testFn = function() end
      if isfunctionhooked(_testFn) then return nil end -- fresh function can't be hooked
      hookfunction(_testFn, function() end)
      if not isfunctionhooked(_testFn) then return nil end -- must detect hook
    end
  end
end

-- Phase 10: Metatable checks on core functions (must be nil)
do
  if getmetatable(require) then return nil end
  if getmetatable(print) then return nil end
  if getmetatable(error) then return nil end
end

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

// Compact anti-env-log check for Layer 1 (single-line, no comments)
export function generateCompactAntiEnvCheck(): string {
  const methodName = generateRandomVarName(14);
  const gKey = generateRandomVarName(10);
  const gVal = generateRandomVarName(8);
  
  return `do local _hc=0;local _cn=game:GetService("RunService").Heartbeat:Connect(function()_hc=_hc+1 end)repeat task.wait()until _hc>=2;if _cn then _cn:Disconnect()end end;do if require~=require or print~=print or pcall~=pcall then return nil end;if rawequal and(not rawequal(require,require)or not rawequal(print,print))then return nil end;if debug and debug.info then local function c(fn)local o,s=pcall(debug.info,fn,"s")return not o or s=="[C]"end;if not c(print)or not c(require)or not c(pcall)or not c(getfenv)then return nil end;local function lf()end;local lo,ls=pcall(debug.info,lf,"s")if lo and ls=="[C]"then return nil end end;if select(1,pcall(getfenv,69))==true then return nil end end;do local _io=pcall(function()Instance.new("Part"):${methodName}("a")end)if _io then return nil end end;do if #game:GetChildren()<=4 then return nil end end;do local _jo,_jr=pcall(function()return game:GetService("HttpService"):JSONDecode('[42,"t",true,1,false,[3,null,"c"],null]')end)if not _jo then return nil end;if _jr and _jr[6]and _jr[6][2]~=nil then return nil end end;do local _,_gm=pcall(function()game()end)if type(_gm)=="string"and not _gm:find("attempt to call a Instance value")then return nil end end;do _G.${gKey}="${gVal}";local _lk=getfenv().${gKey}~=nil;_G.${gKey}=nil;if _lk then return nil end end;do if getmetatable(require)or getmetatable(print)or getmetatable(error)then return nil end end;do local _tb=(debug.traceback()or""):lower()if _tb:find("sandbox")or _tb:find("unveilr")or _tb:find("httpspy")or _tb:find("crypta")or _tb:find("25ms")then return nil end end;`;
}

// Luarmor-style advanced anti-env-log check for Layer 2
export function generateLuarmorStyleAntiEnvLog(): string {
  const methodName = generateRandomVarName(14);
  const gKey = generateRandomVarName(10);
  const gVal = generateRandomVarName(8);
  
  return `
-- ShadowAuth Anti-Environment Logger V5.0
-- Heartbeat + Identity + C-function + Instance + JSONDecode + traceback + isfunctionhooked
do
  -- Heartbeat timing (ensures real Roblox runtime, not static analysis)
  local _hbCnt = 0
  local _hbC = game:GetService("RunService").Heartbeat:Connect(function() _hbCnt = _hbCnt + 1 end)
  repeat task.wait() until _hbCnt >= 2
  if _hbC then _hbC:Disconnect() end
  
  local fenv = getfenv()
  
  -- Identity checks
  if require ~= require then return nil end
  if print ~= print then return nil end
  if pcall ~= pcall then return nil end
  if loadstring ~= loadstring then return nil end
  if getfenv ~= getfenv then return nil end
  if setfenv ~= setfenv then return nil end
  
  -- getfenv(69) boundary (must fail)
  if select(1, pcall(getfenv, 69)) == true then return nil end
  
  -- Metatable checks (core functions must have no metatable)
  if getmetatable(require) then return nil end
  if getmetatable(print) then return nil end
  if getmetatable(error) then return nil end
  
  -- Env logger variable probes
  local envLoggerVars = {
    "superflow_bytecode_ext0", "hi", "env_log", "_env_hook", 
    "script_spy", "remote_spy_hook", "_G_hook", "global_hook",
    "fenv_interceptor", "bytecode_dump", "debug_hook_active",
    "_25mspredefine"
  }
  for _, varName in ipairs(envLoggerVars) do
    if fenv[varName] ~= nil then return nil end
    if rawget(_G, varName) ~= nil then return nil end
  end
  
  -- getfenv consistency
  local fenv1 = getfenv()
  local fenv2 = getfenv()
  if fenv1 ~= fenv2 then return nil end
  
  -- rawequal checks
  if rawequal then
    if not rawequal(require, require) then return nil end
    if not rawequal(print, print) then return nil end
    if not rawequal(loadstring, loadstring) then return nil end
  end
  
  -- debug.info C function source check
  local function _cChk(f)
    if not debug or not debug.info then return true end
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
  
  -- Lua function must NOT report "[C]"
  local _tf = function() end
  local _to, _ts = pcall(debug.info, _tf, "s")
  if _to and _ts == "[C]" then return nil end
  
  -- Dead coroutine debug.info must fail
  local _co = select(1, pcall(debug.info, coroutine.wrap(function() end)(), "s"))
  if _co ~= false then return nil end
  
  -- debug.info arity checks
  if debug and debug.info then
    local _na = #((debug.info(getfenv, "n")) or "")
    if _na <= 1 then return nil end
    local _nb = #((debug.info(print, "n")) or "")
    if _nb <= 1 then return nil end
    local _pa = {debug.info(print, "a")}
    if _pa[1] ~= 0 then return nil end
    if _pa[2] ~= true then return nil end
  end
  
  -- Instance method check (nonexistent method must error)
  local _imOk = pcall(function()
    Instance.new("Part"):${methodName}("a")
  end)
  if _imOk then return nil end
  
  -- game:GetChildren count (real game has many services)
  if #game:GetChildren() <= 4 then return nil end
  
  -- JSONDecode null handling (null → nil in real Roblox)
  local _jOk, _jRes = pcall(function()
    return game:GetService("HttpService"):JSONDecode('[42,"t",true,123,false,[321,null,"chk"],null,["a"]]')
  end)
  if not _jOk then return nil end
  if _jRes and _jRes[6] and _jRes[6][2] ~= nil then return nil end
  
  -- game() error message validation
  local _, _gMsg = pcall(function() game() end)
  if type(_gMsg) == "string" and not _gMsg:find("attempt to call a Instance value") then
    return nil
  end
  
  -- _G → getfenv leak detection
  _G.${gKey} = "${gVal}"
  local _leaked = getfenv().${gKey} ~= nil
  _G.${gKey} = nil
  if _leaked then return nil end
  
  -- game.ServiceAdded must exist
  if not game.ServiceAdded then return nil end
  
  -- debug.traceback sandbox string detection
  local _tb = (debug.traceback() or ""):lower()
  if _tb:find("sandbox") or _tb:find("unveilr") or _tb:find("httpspy") or _tb:find("envlog") or _tb:find("crypta") or _tb:find("25ms") or _tb:find("threaded") then
    return nil
  end
  
  -- isfunctionhooked checks (if executor supports it)
  if isfunctionhooked then
    pcall(function()
      if http and http.request and isfunctionhooked(http.request) then return nil end
      if request and isfunctionhooked(request) then return nil end
      if http_request and isfunctionhooked(http_request) then return nil end
    end)
    if hookfunction then
      local _tf2 = function() end
      if isfunctionhooked(_tf2) then return nil end
      hookfunction(_tf2, function() end)
      if not isfunctionhooked(_tf2) then return nil end
    end
  end
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
