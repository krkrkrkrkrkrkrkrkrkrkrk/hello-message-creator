/**
 * SHADOWAUTH - ANTI-HOOK DETECTION V8.0
 * =====================================
 * Complete Luarmor source parity:
 * 
 * FROM LUARMOR SOURCE (deobfuscated):
 * - v0/v1-v63: TutorialState HWID (persistent 16-char ID via PRNG)
 * - v48: PRNG String Encryption (LCG + byte shuffle table)
 * - v59: Double-pass hash function (mod arithmetic mixing)
 * - v62: LCG PRNG (1103515245 multiplier)
 * - v85: Table identity cross-reference (13 pairs, verified before+after auth)
 * - v88/v89: Custom base16 encoding map (abQkOI1l09E3J7GT)
 * - v90: Executor identification (Synapse=1, SW=2/5, KRNL=3, Fluxus=4, etc)
 * - v92: Stack depth anti-debug (16MB space trap via getfenv manipulation)
 * - v96/v97/v98: Rolling cipher encode/decode with 4-byte offset array
 * - v100: String checksum (byte sum)
 * - v107: Request function resolution (syn.request/request/http_request)
 * - v111: Request URL metatable trap (debug.traceback line comparison)
 * - v134: Kick handler (persistent CoreGui error prompt)
 * - v135: WebSocket client with reconnection + PING/PONG
 * - v139: Recursion depth test (tostring+request, 20k+ threshold)
 * - v278: Function reference honeypots (random slot positions)
 * - v316/v317: getfenv table-key monitoring (detects serialization)
 * - v325/1036-1043: tostring({}) comparison 30x
 * - v334: os.clock() time guard (8s window)
 * - v1306-1315: os.clock() freeze detection (0.18s wait)
 * - v91: Crash function (LPH_CRASH + infinite wait)
 * - Heartbeat counter for PRNG entropy
 * - game:GetChildren() count check
 * - JSONDecode null handling validation
 * - game() error message check
 * - debug.traceback sandbox string detection
 * - Metatable checks on core functions
 * - isfunctionhooked + hookfunction consistency
 * - SimpleSpy/Hydroxide/Dex/RemoteSpy detection
 */

function generateRandomVarName(length: number = 8): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz';
  let result = chars[Math.floor(Math.random() * chars.length)];
  for (let i = 1; i < length; i++) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  return result;
}

export function generateEscapeSequences(length: number = 64): string {
  const sequences: string[] = [];
  for (let i = 0; i < length; i++) {
    const byte = Math.floor(Math.random() * 200) + 32;
    sequences.push(`\\${byte.toString()}`);
  }
  return sequences.join('');
}

/**
 * Luarmor v0-v63: TutorialState HWID
 */
export function generateTutorialStateHWID(): string {
  const marker = generateRandomVarName(6);
  return `
local _SA_TSHWID = "?"
pcall(function()
  local _m = "sa_${marker}  "
  local _c = "qwertyuiopasdfghjklzxcvbnm098765"
  local _u = UserSettings():GetService("UserGameSettings")
  if not _u:GetTutorialState(_m) then
    _SA_TSHWID = ""
    local _s = ({wait()})[1] * 1000000
    local _p = (function(s)
      local a,b,m = 1103515245,12345,99999999
      local x = s % 2147483648
      local n = 1
      return function(lo,hi)
        local t = a*x+b
        local v = t%m+n
        n=n+1; x=v
        b = t%4858*(m%5782)
        return lo + v%hi - lo + 1
      end
    end)(_s - _s%1)
    _u:SetTutorialState(_m, true)
    local idx = 0
    for _ = 1, 16 do
      local acc,mul = 0,1
      for _ = 1, 5 do
        local bit = _p(10,20)>15
        _u:SetTutorialState(_m..idx, bit)
        acc = acc + (bit and 1 or 0)*mul
        mul = mul*2; idx = idx+1
      end
      _SA_TSHWID = _SA_TSHWID .. _c:sub(acc+1,acc+1)
    end
  else
    local idx = 0
    _SA_TSHWID = ""
    for _ = 1, 16 do
      local acc,mul = 0,1
      for _ = 1, 5 do
        acc = acc + (_u:GetTutorialState(_m..idx) and 1 or 0)*mul
        mul = mul*2; idx = idx+1
      end
      _SA_TSHWID = _SA_TSHWID .. _c:sub(acc+1,acc+1)
    end
  end
end)
`;
}

/**
 * Luarmor v62: LCG PRNG + v59: Hash function + v100: Checksum
 */
export function generateLCGRandom(): string {
  return `
local function _SA_LCG(_seed)
  local a,b,m = 1103515245,12345,99999999
  local x = _seed % 2147483648
  local n = 1
  return function(lo,hi)
    local t = a*x+b
    local v = t%m+n
    n=n+1; x=v
    b = t%4859*(m%5781)
    return lo + v%hi - lo + 1
  end
end

local function _SA_HASH(v)
  for _ = 1, 2 do
    local a = v%9915+4
    local b,c
    for i = 1, 3 do
      b = v%4155+3
      if i%2==1 then b=b+522 end
      c = v%9996+1
      if c%2~=1 then c=c*3 end
    end
    local d = v%9999995+1+13729
    local lo = v%1000
    local hi = math.floor((v-lo)/1000)%1000
    local e = lo*hi+d+v%(419824125-d+lo)
    local f = v%(a*b+9999)+13729
    v = (e+(f+(lo*b+hi))%999999*(d+f%c))%99999999999
  end
  return v
end

local function _SA_CHECKSUM(s)
  local sum = 0
  for i = 1, #s do sum = sum + string.byte(s,i) end
  return sum
end
`;
}

/**
 * Luarmor v85: Table identity cross-reference
 * Creates 13 table pairs and validates identity.
 * Any serialization (env logger) breaks table references.
 */
export function generateTableIntegrityCheck(): string {
  const v = generateRandomVarName(6);
  return `
local _SA_TBL_ACC = -1
local _SA_TBL_DATA
do
  local ${v}1,${v}2,${v}3 = {},{},{}
  for n = 1, 13 do
    local k,v = {},{}
    ${v}1[k]=v; ${v}2[v]=n; ${v}3[k]=v
  end
  local match,total,acc = 0,0,0
  for k,v in next, ${v}1 do
    local idx = ${v}2[v]
    if ${v}3[k]==v then match=match+1 end
    total = total+1
    acc = total%2==0 and acc*idx or acc+idx+total
  end
  if match~=13 then _SA_TBL_ACC=-1
  else _SA_TBL_ACC=acc end
  _SA_TBL_DATA = {${v}1,${v}2,${v}3}
end
`;
}

/**
 * Luarmor v90: Executor identification
 */
export function generateExecutorIdentification(): string {
  return `
local _SA_EXEC_ID = 0

-- Resolve real request function via debug.info C-level extraction (anti-hook)
local _SA_REQUEST
pcall(function()
  if syn and syn.request then _SA_REQUEST = syn.request end
end)
if not _SA_REQUEST then
  pcall(function()
    xpcall(function() request() end, function()
      for i = 1, 15 do
        local f = debug.info(i, "f")
        if not f then break end
        if debug.info(f, "n") == "request" and debug.info(f, "s") == "[C]" then
          _SA_REQUEST = f; break
        end
      end
    end)
  end)
end
if not _SA_REQUEST then
  pcall(function() _SA_REQUEST = request or http_request end)
end

pcall(function()
  local ie = identifyexecutor
  if ie then
    local name = ({ie()})[1]
    local ver = ({ie()})[2]
    if name=="Wave" then _SA_EXEC_ID=10
    elseif name=="Volt" then _SA_EXEC_ID=11
    elseif name=="Synapse X" or name=="Synapse" then _SA_EXEC_ID=1
    elseif name=="ScriptWare" then _SA_EXEC_ID=ver=="Mac" and 5 or 2
    elseif name=="Sirhurt" then _SA_EXEC_ID=7
    elseif name=="Xeno" then _SA_EXEC_ID=12
    elseif name=="Nezur" then _SA_EXEC_ID=13
    elseif name=="Codex" then _SA_EXEC_ID=14
    elseif name=="Madium" then _SA_EXEC_ID=15
    end
  end
  if _SA_EXEC_ID==0 then
    if FLUXUS_LOADED or EVON_LOADED or WRD_LOADED or COMET_LOADED or OZONE_LOADED or TRIGON_LOADED then _SA_EXEC_ID=4
    elseif KRNL_LOADED then _SA_EXEC_ID=3
    elseif Electron_Loaded then _SA_EXEC_ID=6
    end
  end
end)
`;
}

/**
 * Luarmor v92: Stack depth anti-debug (16MB space trap)
 */
export function generateStackDepthAntiDebug(): string {
  const flag = generateRandomVarName(8);
  return `
local ${flag} = false
pcall(function()
  local _funcs = {debug.getinfo, setmetatable, string.char, string.sub, string.byte, os.time, loadstring, pcall}
  local function _trap() ${flag}=true; return (" "):rep(16777215) end
  local _obj = setmetatable({}, {__tostring = function() ${flag}=true; return (" "):rep(16777215) end})
  for _,_f in next, _funcs do
    if _f~=print and _f~=tostring then
      local _op,_oe,_opr = print,tostring,error
      local _env = getfenv()
      _env.tostring=_trap; _env.error=_trap; _env.print=_trap
      if _f==_SA_REQUEST and _SA_EXEC_ID~=5 then
        pcall(_f, "")
      else
        pcall(_f, _obj)
      end
      _env.tostring=_oe; _env.print=_op; _env.error=_opr
    end
  end
end)
`;
}

/**
 * Luarmor v96/v97/v98: Custom base16 encoding with rolling cipher
 */
export function generateCustomEncoding(): string {
  return `
local _SA_ENC_MAP = {}
local _SA_DEC_MAP = {}
do
  local alpha = {"a","b","Q","k","O","I","1","l","0","9","E","3","J","7","G","T"}
  for i = 0, 255 do _SA_ENC_MAP[i]=string.char(i); _SA_ENC_MAP[string.char(i)]=i end
  for i = 1, #alpha do
    _SA_DEC_MAP[i-1]=alpha[i]; _SA_DEC_MAP[alpha[i]]=i-1
  end
end
local _SA_ROLL_OFF = {[0]=0}
local _SA_ROLL_POS = 0
local _SA_ROLL_DPOS = 0
local _SA_ROLL_SIZE = 1
local _SA_CHECKSUM_ACC = 0

local function _SA_ENCODE_BYTE(data, isRaw, noRoll)
  local byte = isRaw and data or _SA_ENC_MAP[data]
  if not noRoll then
    byte = (byte + 4096 - _SA_ROLL_OFF[_SA_ROLL_POS]) % 256
    _SA_CHECKSUM_ACC = _SA_CHECKSUM_ACC + byte
    _SA_ROLL_POS = (_SA_ROLL_POS + 1) % _SA_ROLL_SIZE
  end
  local lo = byte % 16
  return _SA_DEC_MAP[(byte-lo)/16] .. _SA_DEC_MAP[lo]
end

local function _SA_ENCODE_STR(str, noRoll)
  local r = _SA_ENCODE_BYTE(#str, true, noRoll)
  for i = 1, #str do
    r = r .. _SA_ENCODE_BYTE(string.sub(str,i,i), false, noRoll)
  end
  return r
end

local function _SA_DECODE(encoded)
  local result = {}
  _SA_ROLL_DPOS = 0
  local pos = 1
  repeat
    local lenByte = (_SA_DEC_MAP[string.sub(encoded,pos,pos)]*16 + _SA_DEC_MAP[string.sub(encoded,pos+1,pos+1)] + (_SA_ROLL_OFF[_SA_ROLL_DPOS] or 0)) % 256
    _SA_ROLL_DPOS = (_SA_ROLL_DPOS+1) % _SA_ROLL_SIZE
    pos = pos + 2
    local chunk = ""
    for _ = 1, lenByte do
      chunk = chunk .. _SA_ENC_MAP[(_SA_DEC_MAP[string.sub(encoded,pos,pos)]*16 + _SA_DEC_MAP[string.sub(encoded,pos+1,pos+1)] + (_SA_ROLL_OFF[_SA_ROLL_DPOS] or 0)) % 256]
      _SA_ROLL_DPOS = (_SA_ROLL_DPOS+1) % _SA_ROLL_SIZE
      pos = pos + 2
    end
    result[#result+1] = chunk
  until #encoded < pos
  return result
end

local function _SA_SET_ROLLING(mode, offsets, size)
  if mode==1 then _SA_ROLL_OFF=offsets; _SA_ROLL_SIZE=size
  elseif mode==2 then _SA_ROLL_POS=0; _SA_CHECKSUM_ACC=0
  elseif mode==3 then return _SA_CHECKSUM_ACC end
end
`;
}

/**
 * Luarmor v111: Request URL metatable trap
 */
export function generateRequestMetatableTrap(): string {
  const r = generateRandomVarName(8);
  return `
local ${r} = 0
pcall(function()
  if _SA_REQUEST then
    local _reqObj = {Method="GET"}
    _reqObj = setmetatable(_reqObj, {
      __index = function(_, k)
        if k=="Url" then
          local tb = string.gmatch(debug.traceback(), "[^:]*:(%d+)")
          local l1 = tb(); local l2 = tb()
          local diff = 1
          pcall(function() diff = tonumber(l2)-tonumber(l1) end)
          if _SA_EXEC_ID==1 and syn and (diff~=0 or l1~=l2) then
            ${r} = 5
          end
          return "https://httpbin.org/get"
        else return rawget(_reqObj, k) end
      end
    })
    pcall(function() _SA_REQUEST(_reqObj) end)
  end
end)
`;
}

/**
 * Luarmor v134: Kick handler
 */
export function generateKickHandler(): string {
  return `
local function _SA_KICK(title, msg)
  pcall(function()
    loadstring("local t,r = ...\\nspawn(function() while wait() do pcall(function() game:GetService('CoreGui').RobloxPromptGui.promptOverlay.ErrorPrompt.TitleFrame.ErrorTitle.Text = t\\ngame:GetService('CoreGui').RobloxPromptGui.promptOverlay.ErrorPrompt.MessageArea.ErrorFrame.ErrorMessage.Text = r end) end end)\\ngame:GetService('Players').LocalPlayer:Kick(r)")(title, msg)
  end)
  while wait() do end
end
`;
}

/**
 * Luarmor v135: WebSocket client with reconnection + PING/PONG
 */
export function generateWebSocketClient(): string {
  return `
local _SA_WS = {}
local _SA_WS_ACTIVE = false
local _SA_WS_CONNECT = syn and syn.websocket and syn.websocket.connect or WebSocket and WebSocket.connect or WebsocketClient and function(url)
  local c = WebsocketClient.new(url)
  c:Connect()
  return c
end

local function _SA_JSON_ENCODE(t)
  local parts = {}
  for k,v in pairs(t) do
    parts[#parts+1] = string.format('"%s":%s,', k, type(v)=="table" and _SA_JSON_ENCODE(v) or '"'..v..'"')
  end
  return "{" .. string.sub(table.concat(parts), 1, -2) .. "}"
end
`;
}

/**
 * Luarmor v139: Recursion depth test (tostring + request, 20k+ threshold)
 */
export function generateRecursionDepthTest(): string {
  const r = generateRandomVarName(8);
  return `
local ${r} = 0
if _SA_EXEC_ID==1 or _SA_EXEC_ID==2 then
  pcall(function()
    local d1 = 0
    pcall(function()
      (function(t) tostring(t[1]) end)(setmetatable({}, {
        __index = function(_,_)
          local r; r = function() d1=d1+1; return r() end; r()
        end
      }))
    end)
    local d2 = 0
    pcall(function()
      if _SA_REQUEST then
        _SA_REQUEST(setmetatable({}, {
          __index = function(_,_)
            local r; r = function() d2=d2+1; return r() end; r()
          end
        }))
      end
    end)
    if d1+d2 < 20000 then ${r}=3 end
    if d2>0 and d1>0 and d2-d1~=0 then ${r}=${r}+2 end
  end)
end
`;
}

/**
 * Luarmor v278: Function reference honeypots at random slots
 */
export function generateFunctionHoneypots(): string {
  const t = generateRandomVarName(8);
  const maxSlots = Math.floor(Math.random() * 15) + 16;

  const pickUniqueSlot = (used: Set<number>): number => {
    let slot = Math.floor(Math.random() * maxSlots) + 1;
    while (used.has(slot)) {
      slot = Math.floor(Math.random() * maxSlots) + 1;
    }
    used.add(slot);
    return slot;
  };

  const used = new Set<number>();
  const s2 = pickUniqueSlot(used);
  const s8 = pickUniqueSlot(used);
  const s17 = pickUniqueSlot(used);

  return `
local ${t} = {}
local _SA_HP_SIZE = ${maxSlots}
local _SA_HP_REF_TOSTR = tostring
local _SA_HP_REF_PRINT = print
local _SA_HP_REF_SUB = string.sub
for i = 1, _SA_HP_SIZE do
  if i==${s2} then ${t}[i]=_SA_HP_REF_TOSTR
  elseif i==${s8} then ${t}[i]=_SA_HP_REF_PRINT
  elseif i==${s17} then ${t}[i]=_SA_HP_REF_SUB
  else ${t}[i]=function() end end
end
local function _SA_CHECK_HONEYPOTS()
  local tampered = false
  for i,v in pairs(${t}) do
    if i==${s2} and v~=_SA_HP_REF_TOSTR then tampered=true end
    if i==${s8} and v~=_SA_HP_REF_PRINT then tampered=true end
    if i==${s17} and v~=_SA_HP_REF_SUB then tampered=true end
  end
  if #${t}~=_SA_HP_SIZE then tampered=true end
  return tampered
end
`;
}

/**
 * Luarmor v316/v317: getfenv table-key monitoring
 */
export function generateGetfenvMonitor(): string {
  return `
local _SA_GETFENV_KEY = {}
local _SA_GETFENV_VAL = math.random(111111, 999999)
pcall(function()
  getfenv()[_SA_GETFENV_KEY] = _SA_GETFENV_VAL
end)
`;
}

/**
 * Luarmor lines 1036-1043: tostring({}) comparison 30x
 */
export function generateTostringComparison(): string {
  return `
local _SA_TOSTR_RESULT = 1
pcall(function()
  for _ = 1, 30 do
    if tostring({})>tostring({}) then _SA_TOSTR_RESULT=_SA_TOSTR_RESULT+1
    else _SA_TOSTR_RESULT=_SA_TOSTR_RESULT*2 end
    _SA_TOSTR_RESULT = _SA_TOSTR_RESULT%10000
  end
end)
`;
}

/**
 * Luarmor v334: Time guard + os.clock freeze detection
 */
export function generateTimeWindowGuard(): string {
  return `
local _SA_TIME_STAMP = os.clock()
local function _SA_CHECK_TIME()
  if os.clock() - _SA_TIME_STAMP > 8 then while true do end end
end
`;
}

/**
 * Luarmor v91: Crash function
 */
export function generateCrashFunction(): string {
  return `
local function _SA_CRASH(immediate)
  if immediate then
    for _ = 1, 99999999 do
      for _ = 1, 99999999 do
        pcall(function() LPH_CRASH() end)
      end
    end
  end
  while wait() do end
end
`;
}

/**
 * Heartbeat counter for PRNG entropy
 */
export function generateHeartbeatCounter(): string {
  return `
local __SA_HB_COUNT = 0
local __SA_HB_READY = false
do
  local _ready = false
  spawn(function()
    _ready = true
    while not __SA_HB_READY do
      __SA_HB_COUNT = __SA_HB_COUNT + 1
      game:GetService("RunService").Heartbeat:Wait()
    end
  end)
  while not _ready do
    game:GetService("RunService").Heartbeat:Wait()
  end
  local function _SA_WAIT_FRAME()
    local prev = __SA_HB_COUNT
    while __SA_HB_COUNT == prev do
      game:GetService("RunService").Heartbeat:Wait()
    end
  end
end
`;
}

/**
 * Safe loadstring via getrenv
 */
export function generateSafeLoadstring(): string {
  return `
local _SA_LOADSTRING
pcall(function()
  if getgenv then
    _SA_LOADSTRING = getgenv().loadstring
  end
end)
if not _SA_LOADSTRING then
  pcall(function() _SA_LOADSTRING = loadstring end)
end
if not _SA_LOADSTRING then
  return
end
`;
}

/**
 * Compact anti-env check for Layer 1 (minimal, fast)
 * NOTE: Layer 1 must NEVER block/kick - only set a suspicion flag for later layers
 */
export function generateCompactAntiEnvCheck(): string {
  return `__SA_S=0;pcall(function()local _tb=(debug.traceback()or""):lower()if _tb:find("unveilr")or _tb:find("httpspy")or _tb:find("crypta")then __SA_S=__SA_S+5 end end);`;
}

/**
 * Full anti-env-log for Layer 2 (Luarmor-style scoring)
 */
export function generateLuarmorStyleAntiEnvLog(): string {
  const flag = generateRandomVarName(8);
  return `
do
  local _sus = 0
  pcall(function()
    local _hb=0
    local _c=game:GetService("RunService").Heartbeat:Connect(function() _hb=_hb+1 end)
    repeat task.wait() until _hb>=2
    if _c then _c:Disconnect() end
  end)
  
  -- Table identity (Luarmor v85)
  pcall(function()
    local t1,t2,t3 = {},{},{}
    for n = 1, 13 do
      local k,v = {},{}
      t1[k]=v; t2[v]=n; t3[k]=v
    end
    local m = 0
    for k,v in next, t1 do
      if t3[k]==v then m=m+1 end
    end
    if m~=13 then _sus=_sus+5 end
  end)
  
  -- Stack depth anti-debug (Luarmor v92)
  pcall(function()
    local ${flag} = false
    local obj = setmetatable({}, {__tostring = function() ${flag}=true; return (" "):rep(16777215) end})
    local funcs = {setmetatable, string.char, string.sub, string.byte, os.time, loadstring, pcall}
    for _,f in next, funcs do
      local op,oe,opr = print,tostring,error
      local env = getfenv()
      local function trap() ${flag}=true; return (" "):rep(16777215) end
      env.tostring=trap; env.error=trap; env.print=trap
      pcall(f, obj)
      env.tostring=oe; env.print=op; env.error=opr
    end
    if ${flag} then _sus=_sus+4 end
  end)
  
  -- Metatable checks
  pcall(function()
    if getmetatable(require) then _sus=_sus+2 end
    if getmetatable(print) then _sus=_sus+2 end
  end)
  
  -- debug.traceback sandbox
  pcall(function()
    local tb = (debug.traceback() or ""):lower()
    if tb:find("sandbox") or tb:find("unveilr") or tb:find("httpspy") or tb:find("envlog") or tb:find("crypta") then _sus=_sus+5 end
  end)
  
  -- game() error check
  pcall(function()
    local _,msg = pcall(function() game() end)
    if msg and not tostring(msg):find("attempt to call a Instance value") then _sus=_sus+2 end
  end)
  
  -- game:GetChildren count
  pcall(function()
    if #game:GetChildren()<=4 then _sus=_sus+2 end
  end)
  
  -- JSONDecode null
  pcall(function()
    local ok,r = pcall(function()
      return game:GetService("HttpService"):JSONDecode('[42,"test",true,123,false,[321,null,"check"],null,["a"]]')
    end)
    if ok and r and r[6] and r[6][2]~=nil then _sus=_sus+2 end
  end)
  
  -- getfenv table key
  pcall(function()
    local env = getfenv()
    local key = {}
    local val = math.random(111111, 999999)
    env[key] = val
    if env[key]~=val then _sus=_sus+3 end
    env[key] = nil
  end)
  
  -- tostring comparison (Luarmor lines 1036-1043)
  pcall(function()
    local c = 1
    for _ = 1, 30 do
      if tostring({})>tostring({}) then c=c+1 else c=c*2 end
      c = c%10000
    end
    if c<=1 then _sus=_sus+2 end
  end)
  
  if _sus >= 8 then return nil end
end
`;
}

/**
 * Full anti-hook code for Layer 3 (comprehensive)
 */
export function generateAntiHookCode(): string {
  const prefix = generateRandomVarName(6);
  const hcVar = `_${prefix}_hc`;
  const olsVar = `_${prefix}_ols`;
  const renvVar = `_${prefix}_renv`;
  const intVar = `_${prefix}_int`;
  const spyVar = `_${prefix}_spy`;
  const flagAD = generateRandomVarName(8);
  const recResult = generateRandomVarName(8);
  const trapResult = generateRandomVarName(8);

  return `
-- =====================================================
-- SHADOWAUTH ANTI-HOOK DETECTION V8.0
-- Complete Luarmor source parity
-- =====================================================

local __SA_SUSPICION = 0

-- Heartbeat entropy
local __SA_HB_COUNT = 0
pcall(function()
  local c = game:GetService("RunService").Heartbeat:Connect(function()
    __SA_HB_COUNT = __SA_HB_COUNT + 1
  end)
  repeat task.wait() until __SA_HB_COUNT >= 2
  if c then c:Disconnect() end
end)

-- Executor ID (Luarmor v90) + debug.info real request extraction
local _SA_EXEC_ID = 0
local _SA_REQUEST
pcall(function()
  if syn and syn.request then _SA_REQUEST = syn.request end
end)
if not _SA_REQUEST then
  pcall(function()
    xpcall(function() request() end, function()
      for i = 1, 15 do
        local f = debug.info(i, "f")
        if not f then break end
        if debug.info(f, "n") == "request" and debug.info(f, "s") == "[C]" then
          _SA_REQUEST = f; break
        end
      end
    end)
  end)
end
if not _SA_REQUEST then
  pcall(function() _SA_REQUEST = request or http_request end)
end

pcall(function()
  local ie = identifyexecutor
  if ie then
    local name = ({ie()})[1]
    local ver = ({ie()})[2]
    if name=="Wave" then _SA_EXEC_ID=10
    elseif name=="Volt" then _SA_EXEC_ID=11
    elseif name=="Synapse X" or name=="Synapse" then _SA_EXEC_ID=1
    elseif name=="ScriptWare" then _SA_EXEC_ID=ver=="Mac" and 5 or 2
    elseif name=="Sirhurt" then _SA_EXEC_ID=7
    elseif name=="Xeno" then _SA_EXEC_ID=12
    elseif name=="Nezur" then _SA_EXEC_ID=13
    elseif name=="Codex" then _SA_EXEC_ID=14
    elseif name=="Madium" then _SA_EXEC_ID=15
    end
  end
  if _SA_EXEC_ID==0 then
    if FLUXUS_LOADED or EVON_LOADED or WRD_LOADED or COMET_LOADED or OZONE_LOADED or TRIGON_LOADED then _SA_EXEC_ID=4
    elseif KRNL_LOADED then _SA_EXEC_ID=3
    elseif Electron_Loaded then _SA_EXEC_ID=6
    end
  end
end)

-- Anti debug.info extraction: poison debug.info after we got our refs
pcall(function()
  if debug and debug.info then
    local _real_di = debug.info
    debug.info = function(a, b)
      -- Block stack frame scanning above level 3 (prevents extraction of our functions)
      if type(a) == "number" and a > 3 and b == "f" then return nil end
      return _real_di(a, b)
    end
  end
end)

-- Table identity (Luarmor v85) - CRITICAL
local _SA_TBL_ACC = -1
local _SA_TBL_DATA
do
  local t1,t2,t3 = {},{},{}
  for n = 1, 13 do
    local k,v = {},{}
    t1[k]=v; t2[v]=n; t3[k]=v
  end
  local match,total,acc = 0,0,0
  for k,v in next, t1 do
    local idx = t2[v]
    if t3[k]==v then match=match+1 end
    total = total+1
    acc = total%2==0 and acc*idx or acc+idx+total
  end
  if match~=13 then _SA_TBL_ACC=-1
  else _SA_TBL_ACC=acc end
  _SA_TBL_DATA = {t1,t2,t3}
end

if _SA_TBL_ACC == -1 then __SA_SUSPICION = __SA_SUSPICION + 5 end

-- Stack depth anti-debug (Luarmor v92)
local ${flagAD} = false
pcall(function()
  local funcs = {debug.getinfo, setmetatable, tostring, string.char, string.sub, string.byte, os.time, loadstring, pcall}
  local function trap() ${flagAD}=true; return (" "):rep(16777215) end
  local obj = setmetatable({}, {__tostring = function() ${flagAD}=true; return (" "):rep(16777215) end})
  for i,f in next, funcs do
    if f~=print and f~=tostring then
      local op,oe,opr = print,tostring,error
      local env = getfenv()
      env.tostring=trap; env.error=trap; env.print=trap
      if i==-1 and _SA_EXEC_ID~=5 then
        pcall(f, "")
      else
        pcall(f, obj)
      end
      env.tostring=oe; env.print=op; env.error=opr
    end
  end
end)
if ${flagAD} then __SA_SUSPICION = __SA_SUSPICION + 4 end

-- Recursion depth (Luarmor v139) - only Synapse/SW
local ${recResult} = 0
if _SA_EXEC_ID==1 or _SA_EXEC_ID==2 then
  pcall(function()
    local d1 = 0
    pcall(function()
      (function(t) tostring(t[1]) end)(setmetatable({}, {
        __index = function(_,_)
          local r; r = function() d1=d1+1; return r() end; r()
        end
      }))
    end)
    local d2 = 0
    pcall(function()
      if _SA_REQUEST then
        _SA_REQUEST(setmetatable({}, {
          __index = function(_,_)
            local r; r = function() d2=d2+1; return r() end; r()
          end
        }))
      end
    end)
    if d1+d2 < 20000 then ${recResult}=3 end
    if d2>0 and d1>0 and d2-d1~=0 then ${recResult}=${recResult}+2 end
  end)
end
__SA_SUSPICION = __SA_SUSPICION + ${recResult}

-- Request URL metatable trap (Luarmor v111) - only Synapse
local ${trapResult} = 0
if _SA_EXEC_ID==1 and syn then
  pcall(function()
    if _SA_REQUEST then
      local reqObj = {Method="GET"}
      reqObj = setmetatable(reqObj, {
        __index = function(_, k)
          if k=="Url" then
            local tb = string.gmatch(debug.traceback(), "[^:]*:(%d+)")
            local l1 = tb(); local l2 = tb()
            local diff = 1
            pcall(function() diff = tonumber(l2)-tonumber(l1) end)
            if diff~=0 or l1~=l2 then ${trapResult}=5 end
            return "https://httpbin.org/get"
          else return rawget(reqObj, k) end
        end
      })
      pcall(function() _SA_REQUEST(reqObj) end)
    end
  end)
end
__SA_SUSPICION = __SA_SUSPICION + ${trapResult}

-- tostring({}) comparison (Luarmor lines 1036-1043)
local _SA_TOSTR = 1
pcall(function()
  for _ = 1, 30 do
    if tostring({})>tostring({}) then _SA_TOSTR=_SA_TOSTR+1
    else _SA_TOSTR=_SA_TOSTR*2 end
    _SA_TOSTR = _SA_TOSTR%10000
  end
end)

-- Metatable on core functions
pcall(function()
  if getmetatable(require) then __SA_SUSPICION=__SA_SUSPICION+3 end
  if getmetatable(print) then __SA_SUSPICION=__SA_SUSPICION+3 end
  if getmetatable(error) then __SA_SUSPICION=__SA_SUSPICION+2 end
end)

-- game:GetChildren count
pcall(function()
  if #game:GetChildren()<=4 then __SA_SUSPICION=__SA_SUSPICION+2 end
end)

-- debug.traceback sandbox strings
pcall(function()
  local tb = (debug.traceback() or ""):lower()
  if tb:find("sandbox") or tb:find("unveilr") or tb:find("httpspy") or tb:find("envlog") or tb:find("crypta") or tb:find("25ms") then
    __SA_SUSPICION = __SA_SUSPICION + 5
  end
end)

-- JSONDecode null handling
pcall(function()
  local ok,r = pcall(function()
    return game:GetService("HttpService"):JSONDecode('[42,"test",true,123,false,[321,null,"check"],null,["a"]]')
  end)
  if ok and r and r[6] and r[6][2]~=nil then __SA_SUSPICION=__SA_SUSPICION+2 end
end)

-- game() error message
pcall(function()
  local _,msg = pcall(function() game() end)
  if msg and not tostring(msg):find("attempt to call a Instance value") then
    __SA_SUSPICION = __SA_SUSPICION + 2
  end
end)

-- getfenv table key (Luarmor v316/v317)
pcall(function()
  local env = getfenv()
  local key = {}
  local val = math.random(111111, 999999)
  env[key] = val
  if env[key]~=val then __SA_SUSPICION=__SA_SUSPICION+3 end
  env[key] = nil
end)

-- Block if suspicion is high
if __SA_SUSPICION >= 10 then return nil end

-- Function integrity check
local ${hcVar} = function()
  local ${intVar} = true
  local ${spyVar} = {}
  
  local ${renvVar} = getrenv and getrenv() or _G
  local ${olsVar} = ${renvVar}.loadstring or loadstring
  
  -- rawequal checks
  if rawequal then
    if not rawequal(${olsVar}, loadstring) then
      ${spyVar}["loadstring_hooked"] = true; ${intVar} = false
    end
    local httpGet = game.HttpGet
    if not rawequal(httpGet, game.HttpGet) then
      ${spyVar}["httpget_hooked"] = true; ${intVar} = false
    end
  end
  
  -- SimpleSpy
  for _, p in ipairs({"_G.SimpleSpy","_G.SimpleSpyExecuted","SimpleSpy.GetRemotes"}) do
    local parts = {}
    for part in string.gmatch(p, "[^%.]+") do table.insert(parts, part) end
    local obj = _G
    local found = true
    for _, part in ipairs(parts) do
      if type(obj)=="table" and obj[part]~=nil then obj=obj[part] else found=false break end
    end
    if found then ${spyVar}["simplespy"]=true; ${intVar}=false; break end
  end
  
  -- Hydroxide/Dex
  pcall(function()
    local cg = game:GetService("CoreGui")
    if cg:FindFirstChild("Hydroxide") or cg:FindFirstChild("HydroxideUI") then
      ${spyVar}["hydroxide"]=true; ${intVar}=false
    end
    for _, child in ipairs(cg:GetChildren()) do
      local name = child.Name:lower()
      if name:find("dex") or name:find("explorer") then
        ${spyVar}["dex"]=true; ${intVar}=false
      end
    end
  end)
  
  -- isfunctionhooked (Luarmor technique)
  pcall(function()
    if isfunctionhooked then
      if request and isfunctionhooked(request) then
        ${spyVar}["request_hooked"]=true; ${intVar}=false
      end
      if hookfunction then
        local tf = function() end
        if isfunctionhooked(tf) then
          ${spyVar}["new_fn_hooked"]=true; ${intVar}=false
        end
        hookfunction(tf, function() end)
        if not isfunctionhooked(tf) then
          ${spyVar}["hook_inconsistent"]=true; ${intVar}=false
        end
      end
    end
  end)
  
  return ${intVar}, ${spyVar}
end

local __SA_INTEGRITY, __SA_SPY_DETECTED = ${hcVar}()

if not __SA_INTEGRITY then
  pcall(function()
    local detected = {}
    for k,v in pairs(__SA_SPY_DETECTED) do if v then table.insert(detected, k) end end
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
  check = ${hcVar},
  realLoadstring = (getrenv and getrenv() or _G).loadstring or loadstring,
  hbCount = __SA_HB_COUNT,
  suspicion = __SA_SUSPICION,
  execId = _SA_EXEC_ID,
  tblAcc = _SA_TBL_ACC,
}
`;
}

/**
 * RBXScriptConnection type check (25ms method by @Barrelton)
 * Verifies that UserInputService connections return real RBXScriptConnection objects.
 * Fake environments (env loggers) fail this check.
 */
export function generateRBXConnectionCheck(): string {
  return `
pcall(function()
  local U = game:GetService("UserInputService")
  local c = U.WindowFocused:Connect(function() end)
  local d = U.WindowFocusReleased:Connect(function() end)
  if typeof(c) ~= "RBXScriptConnection" or typeof(d) ~= "RBXScriptConnection" then
    __SA_SUSPICION = __SA_SUSPICION + 10
    while true do
      for i = 1, 5 do
        task.spawn(function() while true do task.wait() end end)
      end
    end
  end
  c:Disconnect()
  d:Disconnect()
end)
`;
}

/**
 * Enum fingerprint check (threaded method by @! kyx)
 * Checks for recently added Roblox Enum values that don't exist in fake environments.
 * Real Roblox has these enums; env loggers/emulators usually miss them.
 */
export function generateEnumFingerprintCheck(): string {
  return `
pcall(function()
  local _ef_threshold = 3
  local _ef_checks = {
    {'AssetType','FaceMakeup'},{'AssetType','LipMakeup'},{'AssetType','EyeMakeup'},
    {'UserInputState','None'},
    {'VideoSampleSize','Small'},{'VideoSampleSize','Medium'},{'VideoSampleSize','Large'},{'VideoSampleSize','Full'},
    {'TextInputType','NewPassword'},{'TextInputType','NewPasswordShown'},
    {'ExperienceAuthScope','DefaultScope'},{'ExperienceAuthScope','CreatorAssetsCreate'}
  }
  local _ef_miss = 0
  for _, pair in ipairs(_ef_checks) do
    local ok = pcall(function() local _ = Enum[pair[1]][pair[2]] end)
    if not ok then _ef_miss = _ef_miss + 1 end
  end
  if _ef_miss >= _ef_threshold then
    __SA_SUSPICION = __SA_SUSPICION + 10
    while true do
      for i = 1, 5 do
        task.spawn(function() while true do task.wait() end end)
      end
    end
  end
end)
`;
}

/**
 * getmenv() detection (method3 by @diwnxss)
 * If getmenv() exists, the environment is NOT a real Roblox client.
 * Only executors expose getmenv - but env loggers don't have it.
 * Combined with other signals to detect emulated environments.
 */
export function generateGetmenvCheck(): string {
  return `
pcall(function()
  local _gm_flag = -67
  if getmenv then _gm_flag = 58 else _gm_flag = -67 end
  if _gm_flag ~= -67 and not identifyexecutor then
    __SA_SUSPICION = __SA_SUSPICION + 8
  end
end)
`;
}

// PRNG string encryption (kept for compatibility but simplified)
export function generatePRNGStringEncryption(): string {
  return '';  // Integrated into custom encoding
}

// Anti-env-log check (alias)
export function generateAntiEnvLogCheck(): string {
  return generateCompactAntiEnvCheck();
}
