/**
 * SHADOWAUTH - CLIENT REPORTER CODE GENERATOR
 * =============================================
 * Generates Lua code that ONLY REPORTS data to server
 * Client NEVER makes security decisions - server does everything
 * 
 * This replaces the old anti-hook-detection.ts which tried to
 * make decisions client-side.
 */

// =====================================================
// HELPER FUNCTIONS
// =====================================================

function generateRandomVarName(length: number = 8): string {
  const chars = "abcdefghijklmnopqrstuvwxyz";
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
  return sequences.join("");
}

// =====================================================
// CLIENT REPORTER (Reports to server, doesn't decide)
// =====================================================

/**
 * Generate Lua code that collects environment data and reports to server
 * The CLIENT does NOT make any security decisions
 */
export function generateClientReporter(reportUrl: string): string {
  const varPrefix = generateRandomVarName(6);
  const collectorVar = `_${varPrefix}_col`;
  const dataVar = `_${varPrefix}_data`;
  const reportVar = `_${varPrefix}_rep`;
  
  return `
-- =====================================================
-- SHADOWAUTH CLIENT REPORTER V4.0
-- Reports raw data to server - server makes all decisions
-- =====================================================

local ${collectorVar} = function()
  local ${dataVar} = {
    timestamp = os.time(),
    environment = {},
    detected = {},
    executor_info = {},
  }
  
  -- 1. Collect environment info (RAW DATA ONLY)
  pcall(function()
    ${dataVar}.environment.has_getrenv = getrenv ~= nil
    ${dataVar}.environment.has_getgenv = getgenv ~= nil
    ${dataVar}.environment.has_hookfunction = hookfunction ~= nil
    ${dataVar}.environment.has_hookmetamethod = hookmetamethod ~= nil
    ${dataVar}.environment.has_getrawmetatable = getrawmetatable ~= nil
    ${dataVar}.environment.has_setreadonly = setreadonly ~= nil
    ${dataVar}.environment.has_isreadonly = isreadonly ~= nil
    ${dataVar}.environment.has_debug_info = debug and debug.info ~= nil
  end)
  
  -- 2. Collect potential hook tool signatures (for server analysis)
  local toolPatterns = {
    "SimpleSpy", "Hydroxide", "Dex", "RemoteSpy", "InfYield",
    "_G.SimpleSpy", "_G.Hydroxide", "_G.Dex", "_G.RemoteSpy",
  }
  
  for _, pattern in ipairs(toolPatterns) do
    pcall(function()
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
        table.insert(${dataVar}.detected, pattern)
      end
    end)
  end
  
  -- 3. Check CoreGui for known UIs (raw detection)
  pcall(function()
    local coreGui = game:GetService("CoreGui")
    for _, child in ipairs(coreGui:GetChildren()) do
      local name = child.Name:lower()
      for _, tool in ipairs({"hydroxide", "simplespy", "dex", "remotespy", "infiniteyield"}) do
        if name:find(tool) then
          table.insert(${dataVar}.detected, "ui_" .. tool)
        end
      end
    end
  end)
  
  -- 4. Collect executor info (for server logging)
  pcall(function()
    ${dataVar}.executor_info.identifyexecutor = identifyexecutor and identifyexecutor() or nil
    ${dataVar}.executor_info.getexecutorname = getexecutorname and getexecutorname() or nil
    ${dataVar}.executor_info.syn_present = syn ~= nil
    ${dataVar}.executor_info.fluxus_present = fluxus ~= nil
    ${dataVar}.executor_info.krnl_present = KRNL_LOADED ~= nil
  end)
  
  -- 5. Collect function integrity data (server will analyze patterns)
  pcall(function()
    local ls = loadstring
    local rls = getrenv and getrenv().loadstring or loadstring
    ${dataVar}.environment.loadstring_match = ls == rls
    
    if debug and debug.info then
      ${dataVar}.environment.loadstring_source = debug.info(ls, "s")
    end
  end)
  
  return ${dataVar}
end

-- Report function (sends to server for analysis)
local ${reportVar} = function(${dataVar})
  local H = game:GetService("HttpService")
  
  -- Try POST first
  local ok, result = pcall(function()
    return H:PostAsync("${reportUrl}", H:JSONEncode(${dataVar}), Enum.HttpContentType.ApplicationJson)
  end)
  
  -- Fallback to GET with encoded data
  if not ok then
    pcall(function()
      local encoded = H:UrlEncode(H:JSONEncode(${dataVar}))
      game:HttpGet("${reportUrl}?data=" .. encoded:sub(1, 2000))
    end)
  end
  
  return ok
end

-- Execute collection and report (NON-BLOCKING)
spawn(function()
  local data = ${collectorVar}()
  ${reportVar}(data)
end)

-- Return collected data for heartbeat use
_G.__SA_CLIENT_DATA = ${collectorVar}
`;
}

/**
 * Generate minimal loadstring wrapper
 * This is still needed for the loader to work, but makes NO security decisions
 */
export function generateSafeLoadstring(): string {
  return `
-- ShadowAuth Safe Loadstring v3.0 (Minimal - no decisions)

local _SA_LOADSTRING

do
  local _realLS = nil
  
  -- Try multiple sources in order
  local function tryGetLoadstring()
    if getrenv then
      local ok, renv = pcall(getrenv)
      if ok and renv and type(renv) == "table" and renv.loadstring then
        return renv.loadstring
      end
    end
    
    if getgenv then
      local ok, genv = pcall(getgenv)
      if ok and genv and type(genv) == "table" and genv.loadstring then
        return genv.loadstring
      end
    end
    
    if _G and _G.loadstring then
      return _G.loadstring
    end
    
    return loadstring
  end
  
  _realLS = tryGetLoadstring()
  
  if not _realLS then
    error("[ShadowAuth] No loadstring available")
  end
  
  _SA_LOADSTRING = function(code)
    if not code or type(code) ~= "string" then
      return nil, "Invalid code"
    end
    
    local ok, result = pcall(_realLS, code)
    if ok then
      return result
    else
      return nil, result
    end
  end
end
`;
}

/**
 * Generate heartbeat code that reports to server
 * Server decides what to do based on the data
 */
export function generateHeartbeatReporter(heartbeatUrl: string, sessionToken: string): string {
  const varPrefix = generateRandomVarName(5);
  
  return `
-- ShadowAuth Heartbeat Reporter v3.0
-- Reports state to server, server decides actions

local _SA_HB_INTERVAL = 10
local _SA_HB_TOKEN = "${sessionToken}"
local _SA_HB_URL = "${heartbeatUrl}"

local function _sa_heartbeat()
  local H = game:GetService("HttpService")
  local Players = game:GetService("Players")
  local P = Players.LocalPlayer
  
  while wait(_SA_HB_INTERVAL) do
    local data = {
      action = "ping",
      hwid = _G.__SA_HWID or "",
      script_id = _G.__SA_SCRIPT_ID or "",
      detected_threats = {},
      enable_warnings = true,
      player_name = P and P.Name or "",
      player_id = P and P.UserId or 0,
      timestamp = os.time(),
    }
    
    -- Collect current threat data if available
    if _G.__SA_CLIENT_DATA then
      local ok, clientData = pcall(_G.__SA_CLIENT_DATA)
      if ok and clientData and clientData.detected then
        data.detected_threats = clientData.detected
      end
    end
    
    local ok, response = pcall(function()
      return H:RequestAsync({
        Url = _SA_HB_URL,
        Method = "POST",
        Headers = {
          ["Content-Type"] = "application/json",
          ["x-session-token"] = _SA_HB_TOKEN,
        },
        Body = H:JSONEncode(data),
      })
    end)
    
    if ok and response and response.Success then
      local responseData = H:JSONDecode(response.Body)
      
      -- SERVER DECIDES: kick
      if responseData.kicked then
        P:Kick(responseData.kick_reason or "Session terminated by server")
        break
      end
      
      -- SERVER DECIDES: ban
      if responseData.banned then
        P:Kick(responseData.ban_reason or "Access revoked")
        break
      end
      
      -- SERVER DECIDES: warning
      if responseData.show_warning then
        -- Show warning UI from server instruction
        _G.__SA_SHOW_WARNING(responseData.warning_tool, responseData.warning_count, responseData.max_warnings)
      end
      
      -- Update interval from server
      if responseData.nextHeartbeat then
        _SA_HB_INTERVAL = responseData.nextHeartbeat / 1000
      end
    elseif not ok then
      -- Connection failed - server decides on timeout
    end
  end
end

spawn(_sa_heartbeat)
`;
}
