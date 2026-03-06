/**
 * SHADOWAUTH - ANTI-HOOK DETECTION V7.0
 * ==================================
 * Full Luarmor source integration:
 * - HWID via UserGameSettings TutorialState (persistent, executor-independent)
 * - Custom PRNG string encryption with seeded byte shuffling (Luarmor v48)
 * - Custom base16 encoding with rolling cipher (Luarmor v96/v97)
 * - Metatable recursion depth test (20k+ stack overflow - Luarmor v139)
 * - Request URL metatable trap with debug.traceback (Luarmor v111)
 * - tostring({}) comparison for hook detection (Luarmor lines 1036-1043)
 * - Function reference honeypots (detects mid-execution hook injection - Luarmor v278)
 * - Table identity integrity check (Luarmor v85 pattern)
 * - Stack depth anti-debug (Luarmor v92 pattern - 16MB space trap)
 * - Time-windowed execution (prevents replay/analysis - 8s guard)
 * - Executor identification system (Luarmor v90)
 * - Kick handler with custom error prompt (Luarmor v134)
 * - getfenv environment key monitoring
 * - PRNG entropy from heartbeat count
 * - Heartbeat timing validation
 * - game:GetChildren() count check
 * - JSONDecode null handling validation
 * - game() error message validation
 * - debug.traceback() sandbox string detection
 * - isfunctionhooked validation
 * - Metatable checks on core functions
 * - WebSocket-ready heartbeat architecture
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
 * Exact technique from Luarmor client (lines 1-63 of deobfuscated source).
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
 * Generate Luarmor-style PRNG string encryption (v48 pattern)
 * Uses Linear Congruential Generator with seeded byte shuffling table.
 * The same PRNG that Luarmor uses for all string decryption.
 */
export function generatePRNGStringEncryption(): string {
  const floorVar = generateRandomVarName(6);
  const randVar = generateRandomVarName(6);
  const removeVar = generateRandomVarName(6);
  const charVar = generateRandomVarName(6);
  const seedVar = generateRandomVarName(6);
  const stepVar = generateRandomVarName(6);
  const mapVar = generateRandomVarName(6);
  const cacheVar = generateRandomVarName(6);
  const decryptVar = generateRandomVarName(8);
  
  return `
-- ShadowAuth PRNG String Encryption (Luarmor v48)
local ${decryptVar}
do
  local ${floorVar} = math.floor
  local ${randVar} = math.random
  local ${removeVar} = table.remove
  local ${charVar} = string.char
  local ${seedVar} = 0
  local ${stepVar} = 2
  local ${mapVar} = {}
  local _shuffled = {}
  local _pool = {}
  for _i = 1, 256 do _pool[_i] = _i end
  repeat
    local _idx = ${removeVar}(_pool, ${randVar}(1, #_pool))
    _shuffled[_idx] = ${charVar}(_idx - 1)
  until #_pool == 0
  local _buf = {}
  local ${cacheVar} = {}
  
  local function _prngNext()
    if #_buf == 0 then
      ${seedVar} = (${seedVar} * 169 + 7579774851987) % 35184372088832
      repeat ${stepVar} = ${stepVar} * 27 % 257 until ${stepVar} ~= 1
      local _sh = ${stepVar} % 32
      local _v = ${floorVar}(${seedVar} / 2 ^ (13 - (${stepVar} - _sh) / 32)) % 4294967296 / 2 ^ _sh
      local _n = ${floorVar}(_v % 1 * 4294967296) + ${floorVar}(_v)
      local _lo = _n % 65536
      local _hi = (_n - _lo) / 65536
      local _b1 = _lo % 256
      local _b2 = (_lo - _b1) / 256
      local _b3 = _hi % 256
      _buf = {_b1, _b2, _b3, (_hi - _b3) / 256}
    end
    return table.remove(_buf)
  end
  
  ${decryptVar} = function(_str, _key)
    if not ${cacheVar}[_key] then
      _buf = {}
      ${seedVar} = _key % 35184372088832
      ${stepVar} = _key % 255 + 2
      local _len = #_str
      ${cacheVar}[_key] = ""
      local _carry = 180
      for _i = 1, _len do
        _carry = (string.byte(_str, _i) + _prngNext() + _carry) % 256
        ${cacheVar}[_key] = ${cacheVar}[_key] .. _shuffled[_carry + 1]
      end
    end
    return _key
  end
end
`;
}

/**
 * Generate Luarmor-style custom base16 encoding with rolling cipher (v96/v97)
 * Uses a custom 16-char alphabet with position-dependent rolling key.
 */
export function generateCustomEncoding(): string {
  const alphabetChars = 'abQkOI1l09E3J7GT';
  const encVar = generateRandomVarName(8);
  const decVar = generateRandomVarName(8);
  const mapVar = generateRandomVarName(6);
  const rmapVar = generateRandomVarName(6);
  const offsetVar = generateRandomVarName(6);
  const checksumVar = generateRandomVarName(6);
  
  return `
-- ShadowAuth Custom Base16 Encoding (Luarmor v96/v97)
local ${mapVar} = {}
local ${rmapVar} = {}
do
  local _alpha = "${alphabetChars}"
  for _i = 0, 255 do ${mapVar}[_i] = string.char(_i); ${mapVar}[string.char(_i)] = _i end
  for _i = 1, #_alpha do
    local _c = _alpha:sub(_i, _i)
    ${rmapVar}[_i - 1] = _c; ${rmapVar}[_c] = _i - 1
  end
end
local _rollingOffset = {[0] = 0}
local _rollingPos = 0
local _rollingDecPos = 0
local _rollingSize = 1
local ${checksumVar} = 0

local ${encVar} = function(_data, _isRaw)
  local _lenEnc = ""
  local _byte = _isRaw and #_data or ${mapVar}[_data]
  if not _isRaw then
    _byte = (_byte + 4096 - _rollingOffset[_rollingPos]) % 256
    ${checksumVar} = ${checksumVar} + _byte
    _rollingPos = (_rollingPos + 1) % _rollingSize
  end
  local _lo = _byte % 16
  return ${rmapVar}[(_byte - _lo) / 16] .. ${rmapVar}[_lo]
end

local function _saEncode(_str, _isRaw)
  local _result = ${encVar}(#_str, true, _isRaw)
  for _i = 1, #_str do
    _result = _result .. ${encVar}(string.sub(_str, _i, _i), false, _isRaw)
  end
  return _result
end

local ${decVar} = function(_encoded)
  local _result = {}
  _rollingDecPos = 0
  local _pos = 1
  repeat
    local _lenByte = (${rmapVar}[string.sub(_encoded, _pos, _pos)] * 16 + ${rmapVar}[string.sub(_encoded, _pos + 1, _pos + 1)] + _rollingOffset[_rollingDecPos]) % 256
    _rollingDecPos = (_rollingDecPos + 1) % _rollingSize
    _pos = _pos + 2
    local _chunk = ""
    for _ = 1, _lenByte do
      _chunk = _chunk .. ${mapVar}[(${rmapVar}[string.sub(_encoded, _pos, _pos)] * 16 + ${rmapVar}[string.sub(_encoded, _pos + 1, _pos + 1)] + _rollingOffset[_rollingDecPos]) % 256]
      _rollingDecPos = (_rollingDecPos + 1) % _rollingSize
      _pos = _pos + 2
    end
    _result[#_result + 1] = _chunk
  until #_encoded < _pos
  return _result
end
`;
}

/**
 * Generate Luarmor-style executor identification (v90 pattern)
 * Detects executor type and assigns numeric ID for server communication.
 */
export function generateExecutorIdentification(): string {
  const execIdVar = generateRandomVarName(8);
  const requestVar = generateRandomVarName(8);
  
  return `
-- ShadowAuth Executor Identification (Luarmor v90)
local ${execIdVar} = 0
local ${requestVar} = syn and syn.request or request or http_request
pcall(function()
  local _ie = identifyexecutor
  if _ie then
    local _name = ({_ie()})[1]
    local _ver = ({_ie()})[2]
    if _name == "Wave" then ${execIdVar} = 10
    elseif _name == "Volt" then ${execIdVar} = 11
    elseif _name == "Synapse X" then ${execIdVar} = 1
    elseif _name == "ScriptWare" then ${execIdVar} = _ver == "Mac" and 5 or 2
    elseif _name == "Sirhurt" then ${execIdVar} = 7
    elseif _name == "Xeno" then ${execIdVar} = 12
    elseif _name == "Nezur" then ${execIdVar} = 13
    elseif _name == "Codex" then ${execIdVar} = 14
    end
  end
  if ${execIdVar} == 0 then
    if FLUXUS_LOADED or EVON_LOADED or WRD_LOADED or COMET_LOADED or OZONE_LOADED or TRIGON_LOADED then ${execIdVar} = 4
    elseif KRNL_LOADED then ${execIdVar} = 3
    elseif Electron_Loaded then ${execIdVar} = 6
    end
  end
end)
`;
}

/**
 * Generate Luarmor-style metatable recursion depth test (v139 pattern)
 * Tests if tostring and request functions hit proper stack depth.
 * Env loggers that wrap functions in Lua will have lower recursion depth.
 */
export function generateRecursionDepthTest(): string {
  const depthVar1 = generateRandomVarName(8);
  const depthVar2 = generateRandomVarName(8);
  const resultVar = generateRandomVarName(8);
  
  return `
-- ShadowAuth Recursion Depth Test (Luarmor v139)
local ${resultVar} = 0
pcall(function()
  local ${depthVar1} = 0
  pcall(function()
    (function(_t)
      tostring(_t[1])
    end)(setmetatable({}, {
      __index = function(_, _)
        local _r
        _r = function()
          ${depthVar1} = ${depthVar1} + 1
          return _r()
        end
        _r()
      end
    }))
  end)
  
  local ${depthVar2} = 0
  pcall(function()
    local _req = syn and syn.request or request or http_request
    if _req then
      _req(setmetatable({}, {
        __index = function(_, _)
          local _r
          _r = function()
            ${depthVar2} = ${depthVar2} + 1
            return _r()
          end
          _r()
        end
      }))
    end
  end)
  
  if ${depthVar1} + ${depthVar2} < 20000 then
    ${resultVar} = ${resultVar} + 3
  end
  if ${depthVar2} > 0 and ${depthVar1} > 0 and ${depthVar2} - ${depthVar1} ~= 0 then
    ${resultVar} = ${resultVar} + 2
  end
end)
`;
}

/**
 * Generate Luarmor-style request URL metatable trap (v111 pattern)
 * Wraps request URL in metatable that checks debug.traceback line numbers.
 * Any hook on the request function will have different stack trace.
 */
export function generateRequestMetatableTrap(): string {
  const trapResultVar = generateRandomVarName(8);
  
  return `
-- ShadowAuth Request Metatable Trap (Luarmor v111)
local ${trapResultVar} = 0
pcall(function()
  local _req = syn and syn.request or request or http_request
  if _req then
    local _origUrl = "https://httpbin.org/get"
    local _reqObj = {Method = "GET"}
    _reqObj = setmetatable(_reqObj, {
      __index = function(_, _k)
        if _k == "Url" then
          local _tb = string.gmatch(debug.traceback(), "[^:]*:(%d+)")
          local _line1 = _tb()
          local _line2 = _tb()
          local _diff = 1
          pcall(function()
            _diff = tonumber(_line2) - tonumber(_line1)
          end)
          if _diff ~= 0 or _line1 ~= _line2 then
            ${trapResultVar} = ${trapResultVar} + 3
          end
          return _origUrl
        else
          return rawget(_reqObj, _k)
        end
      end
    })
    pcall(function() _req(_reqObj) end)
  end
end)
`;
}

/**
 * Generate Luarmor-style tostring({}) comparison (lines 1036-1043)
 * In real Roblox, tostring({}) returns "table: 0x..." with memory addresses.
 * With hooks, the comparison behavior changes.
 */
export function generateTostringComparison(): string {
  const resultVar = generateRandomVarName(8);
  
  return `
-- ShadowAuth tostring({}) Comparison (Luarmor lines 1036-1043)
local ${resultVar} = 0
pcall(function()
  local _count = 1
  for _ = 1, 30 do
    if tostring({}) > tostring({}) then
      _count = _count + 1
    else
      _count = _count * 2
    end
    _count = _count % 10000
  end
  -- In real environment, _count should be > 1 and variable
  -- In hooked env, tostring always returns same or predictable values
  if _count <= 1 then ${resultVar} = 2 end
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
  const maxSlots = Math.floor(Math.random() * 15) + 16;
  const slot2 = Math.floor(Math.random() * maxSlots) + 1;
  const slot8 = Math.floor(Math.random() * maxSlots) + 1;
  const slot17 = Math.floor(Math.random() * maxSlots) + 1;
  
  return `
-- Function Reference Honeypots (Luarmor v278)
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
 * Any hook on these functions will trigger the space generator (16MB).
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
 * Generate time-windowed execution guard (Luarmor lines 1143-1168)
 * Makes functions check os.clock() against a window.
 * If too much time passes (analysis/debugging), execution dies.
 */
export function generateTimeWindowGuard(): string {
  const tsVar = generateRandomVarName(8);
  const windowSec = 8;
  
  return `
-- Time-Windowed Execution Guard (Luarmor pattern)
local ${tsVar} = os.clock()
local function _SA_CHECK_TIME()
  if os.clock() - ${tsVar} > ${windowSec} then
    while true do end
  end
end
`;
}

/**
 * Generate Luarmor-style kick handler (v134 pattern)
 * Custom error prompt that persists on screen.
 */
export function generateKickHandler(): string {
  return `
-- ShadowAuth Kick Handler (Luarmor v134)
local function _SA_KICK(_title, _msg)
  pcall(function()
    loadstring("local t,r = ...\\nspawn(function() while wait() do pcall(function() game:GetService('CoreGui').RobloxPromptGui.promptOverlay.ErrorPrompt.TitleFrame.ErrorTitle.Text = t\\ngame:GetService('CoreGui').RobloxPromptGui.promptOverlay.ErrorPrompt.MessageArea.ErrorFrame.ErrorMessage.Text = r end) end end)\\ngame:GetService('Players').LocalPlayer:Kick(r)")(_title, _msg)
  end)
  while wait() do end
end
`;
}

/**
 * Generate Luarmor-style getfenv environment monitor
 * Sets a unique key in getfenv(), checks if it persists.
 * Also checks if random key set via getfenv is accessible via _G (detects env loggers).
 */
export function generateGetfenvMonitor(): string {
  const keyVar = generateRandomVarName(10);
  const valVar = generateRandomVarName(8);
  const resultVar = generateRandomVarName(8);
  
  return `
-- ShadowAuth getfenv Environment Monitor (Luarmor pattern)
local ${resultVar} = 0
pcall(function()
  local _env = getfenv()
  local _key = {}
  local _val = math.random(111111, 999999)
  _env[_key] = _val
  -- Check key persists
  if _env[_key] ~= _val then ${resultVar} = ${resultVar} + 3 end
  _env[_key] = nil
end)
pcall(function()
  -- Check _G → getfenv leak (env logger artifact)
  local _gKey = "${keyVar}"
  _G[_gKey] = "${valVar}"
  local _leaked = getfenv()[_gKey] ~= nil
  _G[_gKey] = nil
  if _leaked then ${resultVar} = ${resultVar} + 2 end
end)
`;
}

/**
 * Generate Luarmor-style Heartbeat frame counter
 * Used for PRNG seeding and timing validation.
 */
export function generateHeartbeatCounter(): string {
  return `
-- ShadowAuth Heartbeat Counter (Luarmor pattern)
local __SA_HB_COUNT = 0
local __SA_HB_READY = false
do
  local _hbReady = false
  spawn(function()
    _hbReady = true
    while not __SA_HB_READY do
      __SA_HB_COUNT = __SA_HB_COUNT + 1
      game:GetService("RunService").Heartbeat:Wait()
    end
  end)
  while not _hbReady do
    game:GetService("RunService").Heartbeat:Wait()
  end
end

-- Heartbeat-synced wait
local function _SA_WAIT_FRAME()
  local _prev = __SA_HB_COUNT
  while __SA_HB_COUNT == _prev do
    game:GetService("RunService").Heartbeat:Wait()
  end
end
`;
}

/**
 * Generate Luarmor-style PRNG (Linear Congruential Generator)
 * Used for deterministic random number generation seeded by heartbeat + table integrity.
 */
export function generateLCGRandom(): string {
  const funcVar = generateRandomVarName(8);
  
  return `
-- ShadowAuth LCG PRNG (Luarmor v62)
local function _SA_LCG(_seed)
  local _a, _b, _m = 1103515245, 12345, 99999999
  local _x = _seed % 2147483648
  local _n = 1
  return function(_lo, _hi)
    local _t = _a * _x + _b
    local _v = _t % _m + _n
    _n = _n + 1; _x = _v
    _b = _t % 4859 * (_m % 5781)
    return _lo + _v % _hi - _lo + 1
  end
end

-- Hash function (Luarmor v59)
local function _SA_HASH(_input)
  for _ = 1, 2 do
    local _a = _input % 9915 + 4
    local _b, _c
    for _i = 1, 3 do
      _b = _input % 4155 + 3
      if _i % 2 == 1 then _b = _b + 522 end
      _c = _input % 9996 + 1
      if _c % 2 ~= 1 then _c = _c * 3 end
    end
    local _d = _input % 9999995 + 1 + 13729
    local _lo = _input % 1000
    local _hi = math.floor((_input - _lo) / 1000) % 1000
    local _e = _lo * _hi + _d + _input % (419824125 - _d + _lo)
    local _f = _input % (_a * _b + 9999) + 13729
    _input = (_e + (_f + (_lo * _b + _hi)) % 999999 * (_d + _f % _c)) % 99999999999
  end
  return _input
end

-- String checksum (Luarmor v100)
local function _SA_CHECKSUM(_str)
  local _sum = 0
  for _i = 1, #_str do _sum = _sum + string.byte(_str, _i) end
  return _sum
end
`;
}

// Generate anti-hook Lua code (enhanced with all Luarmor techniques)
export function generateAntiHookCode(): string {
  const varPrefix = generateRandomVarName(6);
  const hookCheckVar = `_${varPrefix}_hc`;
  const originalLsVar = `_${varPrefix}_ols`;
  const realEnvVar = `_${varPrefix}_renv`;
  const integrityVar = `_${varPrefix}_int`;
  const spyScanVar = `_${varPrefix}_spy`;
  const recursionResult = generateRandomVarName(8);
  const trapResult = generateRandomVarName(8);
  const tostringResult = generateRandomVarName(8);
  const getfenvResult = generateRandomVarName(8);
  const antiDebugFlag = generateRandomVarName(8);
  
  return `
-- =====================================================
-- SHADOWAUTH ANTI-HOOK DETECTION V7.0
-- Full Luarmor source integration + scoring system
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

-- Phase 1: Metatable recursion depth test (Luarmor v139 - HIGH confidence)
local ${recursionResult} = 0
pcall(function()
  local _d1 = 0
  pcall(function()
    (function(_t) tostring(_t[1]) end)(setmetatable({}, {
      __index = function(_, _)
        local _r; _r = function() _d1 = _d1 + 1; return _r() end; _r()
      end
    }))
  end)
  local _d2 = 0
  pcall(function()
    local _req = syn and syn.request or request or http_request
    if _req then
      _req(setmetatable({}, {
        __index = function(_, _)
          local _r; _r = function() _d2 = _d2 + 1; return _r() end; _r()
        end
      }))
    end
  end)
  if _d1 + _d2 < 20000 then ${recursionResult} = 3 end
  if _d2 > 0 and _d1 > 0 and _d2 - _d1 ~= 0 then ${recursionResult} = ${recursionResult} + 2 end
end)
__SA_SUSPICION = __SA_SUSPICION + ${recursionResult}

-- Phase 1.5: Request URL metatable trap (Luarmor v111)
local ${trapResult} = 0
pcall(function()
  local _req = syn and syn.request or request or http_request
  if _req then
    local _reqObj = {Method = "GET"}
    _reqObj = setmetatable(_reqObj, {
      __index = function(_, _k)
        if _k == "Url" then
          local _tb = string.gmatch(debug.traceback(), "[^:]*:(%d+)")
          local _l1 = _tb(); local _l2 = _tb()
          local _diff = 1
          pcall(function() _diff = tonumber(_l2) - tonumber(_l1) end)
          if _diff ~= 0 or _l1 ~= _l2 then ${trapResult} = 3 end
          return "https://httpbin.org/get"
        else return rawget(_reqObj, _k) end
      end
    })
    pcall(function() _req(_reqObj) end)
  end
end)
__SA_SUSPICION = __SA_SUSPICION + ${trapResult}

-- Phase 2: tostring({}) comparison (Luarmor lines 1036-1043)
local ${tostringResult} = 0
pcall(function()
  local _c = 1
  for _ = 1, 30 do
    if tostring({}) > tostring({}) then _c = _c + 1 else _c = _c * 2 end
    _c = _c % 10000
  end
  if _c <= 1 then ${tostringResult} = 2 end
end)
__SA_SUSPICION = __SA_SUSPICION + ${tostringResult}

-- Phase 2.5: Stack depth anti-debug result
pcall(function()
  if ${antiDebugFlag} then __SA_SUSPICION = __SA_SUSPICION + 4 end
end)

-- Phase 3: Instance method check (HIGH confidence)
pcall(function()
  local _imOk = pcall(function()
    Instance.new("Part"):${generateRandomVarName(14)}("a")
  end)
  if _imOk then __SA_SUSPICION = __SA_SUSPICION + 5 end
end)

-- Phase 4: debug.traceback sandbox strings (HIGH confidence)
pcall(function()
  local _tb = (debug.traceback() or ""):lower()
  if _tb:find("sandbox") or _tb:find("unveilr") or _tb:find("httpspy") or _tb:find("envlog") or _tb:find("crypta") or _tb:find("25ms") or _tb:find("threaded") then
    __SA_SUSPICION = __SA_SUSPICION + 5
  end
end)

-- Phase 5: Metatable on core functions (HIGH confidence)
pcall(function()
  if getmetatable(require) then __SA_SUSPICION = __SA_SUSPICION + 3 end
  if getmetatable(print) then __SA_SUSPICION = __SA_SUSPICION + 3 end
  if getmetatable(error) then __SA_SUSPICION = __SA_SUSPICION + 2 end
end)

-- Phase 6: game:GetChildren count (MEDIUM confidence)
pcall(function()
  if #game:GetChildren() <= 4 then __SA_SUSPICION = __SA_SUSPICION + 2 end
end)

-- Phase 7: JSONDecode null handling (MEDIUM confidence)
pcall(function()
  local _jOk, _jRes = pcall(function()
    return game:GetService("HttpService"):JSONDecode('[42,"test",true,123,false,[321,null,"check"],null,["a"]]')
  end)
  if _jOk and _jRes and _jRes[6] and _jRes[6][2] ~= nil then __SA_SUSPICION = __SA_SUSPICION + 2 end
end)

-- Phase 8: getfenv environment monitor
local ${getfenvResult} = 0
pcall(function()
  local _env = getfenv()
  local _key = {}
  local _val = math.random(111111, 999999)
  _env[_key] = _val
  if _env[_key] ~= _val then ${getfenvResult} = ${getfenvResult} + 3 end
  _env[_key] = nil
end)
pcall(function()
  local _gKey = "${generateRandomVarName(10)}"
  _G[_gKey] = "${generateRandomVarName(8)}"
  local _leaked = getfenv()[_gKey] ~= nil
  _G[_gKey] = nil
  if _leaked then ${getfenvResult} = ${getfenvResult} + 2 end
end)
__SA_SUSPICION = __SA_SUSPICION + ${getfenvResult}

-- Phase 9: game() error message check
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
  
  -- isfunctionhooked checks + hookfunction consistency (Luarmor technique)
  pcall(function()
    if isfunctionhooked then
      if http and http.request and isfunctionhooked(http.request) then
        ${spyScanVar}["http_hooked"] = true ${integrityVar} = false
      end
      if request and isfunctionhooked(request) then
        ${spyScanVar}["request_hooked"] = true ${integrityVar} = false
      end
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
  suspicion = __SA_SUSPICION,
}
`;
}

// Compact anti-env-log check for Layer 1 (enhanced with recursion depth + tostring comparison)
export function generateCompactAntiEnvCheck(): string {
  const methodName = generateRandomVarName(14);
  
  return `do local _hc=0;local _cn;pcall(function()_cn=game:GetService("RunService").Heartbeat:Connect(function()_hc=_hc+1 end)end)if _cn then repeat task.wait()until _hc>=2;pcall(function()_cn:Disconnect()end)end end;do local _s=0;pcall(function()if getmetatable(require)then _s=_s+1 end;if getmetatable(print)then _s=_s+1 end end);pcall(function()local _io=pcall(function()Instance.new("Part"):${methodName}("a")end)if _io then _s=_s+3 end end);pcall(function()local _tb=(debug.traceback()or""):lower()if _tb:find("sandbox")or _tb:find("unveilr")or _tb:find("httpspy")or _tb:find("crypta")or _tb:find("25ms")then _s=_s+3 end end);pcall(function()local _,_m=pcall(function()game()end)if _m and not tostring(_m):find("attempt to call a Instance value")then _s=_s+2 end end);pcall(function()local _d1=0;pcall(function()(function(_t)tostring(_t[1])end)(setmetatable({},{__index=function(_,_)local _r;_r=function()_d1=_d1+1;return _r()end;_r()end}))end);if _d1<10000 then _s=_s+2 end end);pcall(function()local _c=1;for _=1,30 do if tostring({})>tostring({})then _c=_c+1 else _c=_c*2 end;_c=_c%10000 end;if _c<=1 then _s=_s+2 end end);if _s>=3 then return nil end end;`;
}

// Luarmor-style advanced anti-env-log check for Layer 2 (full scoring system)
export function generateLuarmorStyleAntiEnvLog(): string {
  const methodName = generateRandomVarName(14);
  const gKey = generateRandomVarName(10);
  const gVal = generateRandomVarName(8);
  const flagVar = generateRandomVarName(8);
  const recursionResult = generateRandomVarName(8);
  const trapResult = generateRandomVarName(8);
  const tostringResult = generateRandomVarName(8);
  
  return `
-- ShadowAuth Anti-Environment Logger V7.0 (Full Luarmor Integration)
-- Scoring system + table identity + stack depth + recursion depth + tostring comparison
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
  
  -- METATABLE RECURSION DEPTH (Luarmor v139)
  local ${recursionResult} = 0
  pcall(function()
    local _d1 = 0
    pcall(function()
      (function(_t) tostring(_t[1]) end)(setmetatable({}, {
        __index = function(_, _)
          local _r; _r = function() _d1 = _d1 + 1; return _r() end; _r()
        end
      }))
    end)
    local _d2 = 0
    pcall(function()
      local _req = syn and syn.request or request or http_request
      if _req then
        _req(setmetatable({}, {
          __index = function(_, _)
            local _r; _r = function() _d2 = _d2 + 1; return _r() end; _r()
          end
        }))
      end
    end)
    if _d1 + _d2 < 20000 then ${recursionResult} = 3 end
    if _d2 > 0 and _d1 > 0 and _d2 - _d1 ~= 0 then ${recursionResult} = ${recursionResult} + 2 end
  end)
  _suspicion = _suspicion + ${recursionResult}
  
  -- REQUEST URL METATABLE TRAP (Luarmor v111)
  local ${trapResult} = 0
  pcall(function()
    local _req = syn and syn.request or request or http_request
    if _req then
      local _reqObj = {Method = "GET"}
      _reqObj = setmetatable(_reqObj, {
        __index = function(_, _k)
          if _k == "Url" then
            local _tb = string.gmatch(debug.traceback(), "[^:]*:(%d+)")
            local _l1 = _tb(); local _l2 = _tb()
            local _diff = 1
            pcall(function() _diff = tonumber(_l2) - tonumber(_l1) end)
            if _diff ~= 0 or _l1 ~= _l2 then ${trapResult} = 3 end
            return "https://httpbin.org/get"
          else return rawget(_reqObj, _k) end
        end
      })
      pcall(function() _req(_reqObj) end)
    end
  end)
  _suspicion = _suspicion + ${trapResult}
  
  -- TOSTRING({}) COMPARISON (Luarmor lines 1036-1043)
  local ${tostringResult} = 0
  pcall(function()
    local _c = 1
    for _ = 1, 30 do
      if tostring({}) > tostring({}) then _c = _c + 1 else _c = _c * 2 end
      _c = _c % 10000
    end
    if _c <= 1 then ${tostringResult} = 2 end
  end)
  _suspicion = _suspicion + ${tostringResult}
  
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
  
  -- MEDIUM CONFIDENCE: getfenv environment monitor
  pcall(function()
    local _env = getfenv()
    local _key = {}
    local _val = math.random(111111, 999999)
    _env[_key] = _val
    if _env[_key] ~= _val then _suspicion = _suspicion + 3 end
    _env[_key] = nil
  end)
  pcall(function()
    _G.${gKey} = "${gVal}"
    local _leaked = getfenv().${gKey} ~= nil
    _G.${gKey} = nil
    if _leaked then _suspicion = _suspicion + 2 end
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
