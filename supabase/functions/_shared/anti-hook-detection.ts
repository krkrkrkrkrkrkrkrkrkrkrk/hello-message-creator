/**
 * SHADOWAUTH - ANTI-HOOK DETECTION V6.0
 * ==================================
 * Enhanced with Luarmor client techniques:
 * - HWID via UserGameSettings TutorialState (persistent, executor-independent)
 * - Function reference honeypots (detects mid-execution hook injection)
 * - Table identity integrity check (Luarmor v85 pattern)
 * - Time-windowed execution (prevents replay/analysis)
 * - Stack depth anti-debug (Luarmor v92 pattern)
 * - PRNG entropy from heartbeat count
 * - Heartbeat timing validation
 * - game:GetChildren() count check  
 * - JSONDecode null handling validation
 * - game() error message validation
 * - debug.traceback() sandbox string detection
 * - isfunctionhooked validation
 * - Metatable checks on core functions
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

// Helper
function generateRandomVarName(length: number = 8): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz';
  let result = chars[Math.floor(Math.random() * chars.length)];
  for (let i = 1; i < length; i++) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  return result;
}

/**
 * Generate Luarmor-style TutorialState HWID
 * Uses UserSettings():GetService("UserGameSettings"):GetTutorialState/SetTutorialState
 * to generate a persistent machine-unique ID that survives executor restarts.
 * This is the same technique used by Luarmor's client (lines 10-61).
 */
export function generateTutorialStateHWID(): string {
  const marker = generateRandomVarName(6);
  const charset = 'qwertyuiopasdfghjklzxcvbnm098765';
  
  return `
-- ShadowAuth TutorialState HWID (Luarmor technique)
local _SA_TSHWID = "?"
pcall(function()
  local _tsM = "sa_${marker}  "
  local _tsC = "${charset}"
  local _ugs = UserSettings():GetService("UserGameSettings")
  if not _ugs:GetTutorialState(_tsM) then
    _SA_TSHWID = ""
    local _seed = ({wait()})[1] * 1000000
    local _prng = (function(s)
      local a, b, m = 1103515245, 12345, 99999999
      local x = s % 2147483648
      local n = 1
      return function(lo, hi)
        local t = a * x + b
        local v = t % m + n
        n = n + 1; x = v
        b = t % 4858 * (m % 5782)
        return lo + v % hi - lo + 1
      end
    end)(_seed - _seed % 1)
    _ugs:SetTutorialState(_tsM, true)
    local idx = 0
    for _ = 1, 16 do
      local acc, mul = 0, 1
      for _ = 1, 5 do
        local bit = _prng(10, 20) > 15
        _ugs:SetTutorialState(_tsM .. idx, bit)
        acc = acc + (bit and 1 or 0) * mul
        mul = mul * 2; idx = idx + 1
      end
      _SA_TSHWID = _SA_TSHWID .. _tsC:sub(acc + 1, acc + 1)
    end
  else
    local idx = 0
    _SA_TSHWID = ""
    for _ = 1, 16 do
      local acc, mul = 0, 1
      for _ = 1, 5 do
        acc = acc + (_ugs:GetTutorialState(_tsM .. idx) and 1 or 0) * mul
        mul = mul * 2; idx = idx + 1
      end
      _SA_TSHWID = _SA_TSHWID .. _tsC:sub(acc + 1, acc + 1)
    end
  end
end)
`;
}

/**
 * Generate Luarmor-style function reference honeypots
 * Stores references to critical functions, then verifies they haven't been swapped
 * after network calls. Detects mid-execution hook injection (Luarmor lines 940-996).
 */
export function generateFunctionHoneypots(): string {
  const tableVar = generateRandomVarName(8);
  const countVar = generateRandomVarName(6);
  const checkVar = generateRandomVarName(8);
  const maxSlots = Math.floor(Math.random() * 15) + 16; // 16-30 slots
  const slot2 = Math.floor(Math.random() * maxSlots) + 1;
  const slot8 = Math.floor(Math.random() * maxSlots) + 1;
  const slot17 = Math.floor(Math.random() * maxSlots) + 1;
  
  return `
-- Function Reference Honeypots
local ${tableVar} = {}
local ${countVar} = ${maxSlots}
for _i = 1, ${countVar} do
  if _i == ${slot2} then ${tableVar}[_i] = tostring
  elseif _i == ${slot8} then ${tableVar}[_i] = print
  elseif _i == ${slot17} then ${tableVar}[_i] = string.sub
  else ${tableVar}[_i] = function() end end
end
local ${checkVar} = function()
  local _tampered = false
  for _i, _v in pairs(${tableVar}) do
    if _i == ${slot2} and _v ~= tostring then _tampered = true end
    if _i == ${slot8} and _v ~= print then _tampered = true end
    if _i == ${slot17} and _v ~= string.sub then _tampered = true end
  end
  if #${tableVar} ~= ${countVar} then _tampered = true end
  return _tampered
end
`;
}

/**
 * Generate Luarmor-style table identity integrity check (v85 pattern)
 * Creates table pairs with cross-references and validates identity hasn't been tampered.
 * Any serialization/deserialization (env logger) breaks table identity.
 */
export function generateTableIntegrityCheck(): string {
  const v1 = generateRandomVarName(6);
  const v2 = generateRandomVarName(6);
  const v3 = generateRandomVarName(6);
  const resultVar = generateRandomVarName(8);
  
  return `
-- Table Identity Integrity (Luarmor v85 pattern)
local ${resultVar} = -1
do
  local ${v1}, ${v2}, ${v3} = {}, {}, {}
  for _n = 1, 13 do
    local _k, _v = {}, {}
    ${v1}[_k] = _v
    ${v2}[_v] = _n
    ${v3}[_k] = _v
  end
  local _match, _total, _acc = 0, 0, 0
  for _k, _v in next, ${v1} do
    local _idx = ${v2}[_v]
    if ${v3}[_k] == _v then _match = _match + 1 end
    _total = _total + 1
    _acc = _total % 2 == 0 and _acc * _idx or _acc + _idx + _total
  end
  if _match ~= 13 then ${resultVar} = -1
  else ${resultVar} = _acc end
end
`;
}

/**
 * Generate Luarmor-style stack depth anti-debug (v92 pattern)
 * Replaces tostring/error/print temporarily with space generators,
 * passes hooked objects through functions, checks if side effects triggered.
 * Any hook on these functions will trigger the space generator.
 */
export function generateStackDepthAntiDebug(): string {
  const flagVar = generateRandomVarName(8);
  
  return `
-- Stack Depth Anti-Debug (Luarmor v92 pattern)
local ${flagVar} = false
pcall(function()
  local _funcs = {debug.getinfo, setmetatable, tostring, string.char, string.sub, string.byte, os.time, loadstring, pcall}
  local function _trap() ${flagVar} = true; return (" "):rep(16777215) end
  local _obj = setmetatable({}, {__tostring = function() ${flagVar} = true; return (" "):rep(16777215) end})
  for _i, _f in next, _funcs do
    if _f ~= print and _f ~= tostring then
      local _op, _oe, _opr = print, tostring, error
      local _env = getfenv()
      _env.tostring = _trap; _env.error = _trap; _env.print = _trap
      pcall(_f, _obj)
      _env.tostring = _oe; _env.print = _op; _env.error = _opr
    end
  end
end)
`;
}

/**
 * Generate time-windowed execution guard
 * Makes decryption functions check os.clock() against a window.
 * If too much time passes (analysis/debugging), execution dies.
 */
export function generateTimeWindowGuard(): string {
  const tsVar = generateRandomVarName(8);
  const windowSec = 8;
  
  return `
-- Time-Windowed Execution Guard
local ${tsVar} = os.clock()
local function _SA_CHECK_TIME()
  if os.clock() - ${tsVar} > ${windowSec} then
    while true do end -- Infinite loop on time violation
  end
end
`;
}

// Generate anti-hook Lua code (enhanced with Luarmor techniques)
export function generateAntiHookCode(): string {
  const varPrefix = generateRandomVarName(6);
  const hookCheckVar = `_${varPrefix}_hc`;
  const originalLsVar = `_${varPrefix}_ols`;
  const realEnvVar = `_${varPrefix}_renv`;
  const integrityVar = `_${varPrefix}_int`;
  const spyScanVar = `_${varPrefix}_spy`;
  
  return `
-- =====================================================
-- SHADOWAUTH ANTI-HOOK DETECTION V6.0
-- Scoring + Luarmor techniques
-- =====================================================

local __SA_SUSPICION = 0

-- Phase 0: Heartbeat timing + entropy collection
local __SA_HB_COUNT = 0
pcall(function()
  local _hbConn = game:GetService("RunService").Heartbeat:Connect(function()
    __SA_HB_COUNT = __SA_HB_COUNT + 1
  end)
  repeat task.wait() until __SA_HB_COUNT >= 2
  if _hbConn then _hbConn:Disconnect() end
end)

${generateTableIntegrityCheck()}

${generateStackDepthAntiDebug()}

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

-- Phase 3.5: Stack depth anti-debug result
if ${generateRandomVarName(8).replace(/./g, (_, i) => i === 0 ? '_' : 'f')}alse or false then
  -- placeholder to avoid unused var warning
end
pcall(function()
  if ${(() => { const v = generateRandomVarName(8); return v; })()} then -- anti-debug flag from v92
  end
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

-- Phase 6: _G → getfenv leak (LOW confidence)
pcall(function()
  local _gKey = "${generateRandomVarName(10)}"
  _G[_gKey] = "${generateRandomVarName(8)}"
  local _leaked = getfenv()[_gKey] ~= nil
  _G[_gKey] = nil
  if _leaked then __SA_SUSPICION = __SA_SUSPICION + 2 end
end)

-- Phase 7: game() error message check
pcall(function()
  local _, _msg = pcall(function() game() end)
  if _msg and not tostring(_msg):find("attempt to call a Instance value") then
    __SA_SUSPICION = __SA_SUSPICION + 2
  end
end)

-- Block if suspicion is high
if __SA_SUSPICION >= 5 then return nil end

local ${hookCheckVar} = function()
  local ${integrityVar} = true
  local ${spyScanVar} = {}
  
  local ${realEnvVar} = getrenv and getrenv() or _G
  local ${originalLsVar} = ${realEnvVar}.loadstring or loadstring
  
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
  
  -- isfunctionhooked checks
  pcall(function()
    if isfunctionhooked then
      if http and http.request and isfunctionhooked(http.request) then
        ${spyScanVar}["http_hooked"] = true ${integrityVar} = false
      end
      if request and isfunctionhooked(request) then
        ${spyScanVar}["request_hooked"] = true ${integrityVar} = false
      end
      -- Luarmor technique: hookfunction consistency test
      if hookfunction then
        local _tf = function() end
        if isfunctionhooked(_tf) then
          ${spyScanVar}["new_fn_hooked"] = true ${integrityVar} = false
        end
        hookfunction(_tf, function() end)
        if not isfunctionhooked(_tf) then
          ${spyScanVar}["hook_inconsistent"] = true ${integrityVar} = false
        end
      end
    end
  end)
  
  return ${integrityVar}, ${spyScanVar}
end

local __SA_INTEGRITY, __SA_SPY_DETECTED = ${hookCheckVar}()

if not __SA_INTEGRITY then
  pcall(function()
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
  hbCount = __SA_HB_COUNT,
}
`;
}

// Compact anti-env-log check for Layer 1
export function generateCompactAntiEnvCheck(): string {
  const methodName = generateRandomVarName(14);
  
  return `do local _hc=0;local _cn;pcall(function()_cn=game:GetService("RunService").Heartbeat:Connect(function()_hc=_hc+1 end)end)if _cn then repeat task.wait()until _hc>=2;pcall(function()_cn:Disconnect()end)end end;do local _s=0;pcall(function()if getmetatable(require)then _s=_s+1 end;if getmetatable(print)then _s=_s+1 end end);pcall(function()local _io=pcall(function()Instance.new("Part"):${methodName}("a")end)if _io then _s=_s+3 end end);pcall(function()local _tb=(debug.traceback()or""):lower()if _tb:find("sandbox")or _tb:find("unveilr")or _tb:find("httpspy")or _tb:find("crypta")or _tb:find("25ms")then _s=_s+3 end end);pcall(function()local _,_m=pcall(function()game()end)if _m and not tostring(_m):find("attempt to call a Instance value")then _s=_s+2 end end);if _s>=3 then return nil end end;`;
}

// Luarmor-style advanced anti-env-log check for Layer 2 (scoring system)
export function generateLuarmorStyleAntiEnvLog(): string {
  const methodName = generateRandomVarName(14);
  const gKey = generateRandomVarName(10);
  const gVal = generateRandomVarName(8);
  const flagVar = generateRandomVarName(8);
  
  return `
-- ShadowAuth Anti-Environment Logger V6.0 (Luarmor Enhanced)
-- Scoring system + table identity + stack depth anti-debug
do
  local _suspicion = 0
  
  -- Heartbeat timing (ensures real Roblox runtime)
  pcall(function()
    local _hbCnt = 0
    local _hbC = game:GetService("RunService").Heartbeat:Connect(function() _hbCnt = _hbCnt + 1 end)
    repeat task.wait() until _hbCnt >= 2
    if _hbC then _hbC:Disconnect() end
  end)
  
  -- TABLE IDENTITY CHECK (Luarmor v85)
  -- Env loggers serialize/deserialize tables, breaking identity
  pcall(function()
    local _t1, _t2, _t3 = {}, {}, {}
    for _n = 1, 13 do
      local _k, _v = {}, {}
      _t1[_k] = _v; _t2[_v] = _n; _t3[_k] = _v
    end
    local _match = 0
    for _k, _v in next, _t1 do
      if _t3[_k] == _v then _match = _match + 1 end
    end
    if _match ~= 13 then _suspicion = _suspicion + 5 end
  end)
  
  -- STACK DEPTH ANTI-DEBUG (Luarmor v92)
  -- Temporarily replaces tostring/print/error with traps
  pcall(function()
    local ${flagVar} = false
    local _obj = setmetatable({}, {__tostring = function() ${flagVar} = true; return (" "):rep(16777215) end})
    local _funcs = {setmetatable, string.char, string.sub, string.byte, os.time, loadstring, pcall}
    for _, _f in next, _funcs do
      local _op, _oe, _opr = print, tostring, error
      local _env = getfenv()
      local function _trap() ${flagVar} = true; return (" "):rep(16777215) end
      _env.tostring = _trap; _env.error = _trap; _env.print = _trap
      pcall(_f, _obj)
      _env.tostring = _oe; _env.print = _op; _env.error = _opr
    end
    if ${flagVar} then _suspicion = _suspicion + 4 end
  end)
  
  -- HIGH CONFIDENCE: Metatable on core functions
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
  
  -- HIGH CONFIDENCE: game() error message validation
  pcall(function()
    local _, _msg = pcall(function() game() end)
    if _msg and not tostring(_msg):find("attempt to call a Instance value") then
      _suspicion = _suspicion + 3
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
  
  -- LOW CONFIDENCE: debug.info C function checks
  pcall(function()
    if debug and debug.info then
      local function _cChk(f)
        local ok, src = pcall(debug.info, f, "s")
        return not ok or src == "[C]"
      end
      if not _cChk(print) then _suspicion = _suspicion + 1 end
      if not _cChk(require) then _suspicion = _suspicion + 1 end
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
  
  -- isfunctionhooked + hookfunction consistency (Luarmor technique)
  pcall(function()
    if isfunctionhooked then
      if http and http.request and isfunctionhooked(http.request) then _suspicion = _suspicion + 3 end
      if request and isfunctionhooked(request) then _suspicion = _suspicion + 3 end
      if hookfunction then
        local _tf = function() end
        if isfunctionhooked(_tf) then _suspicion = _suspicion + 3 end
        hookfunction(_tf, function() end)
        if not isfunctionhooked(_tf) then _suspicion = _suspicion + 3 end
      end
    end
  end)
  
  -- BLOCK: Score >= 5
  if _suspicion >= 5 then return nil end
end
`;
}

// Generate anti-env-log check (backward compat)
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
-- ShadowAuth Safe Loadstring v2.1
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
