// WBHF_* macro processor — LuaProt-compatible parity layer.
// Rewrites macros in user scripts before obfuscation and injects a runtime
// prelude that defines helpers and runtime variables with real values.

export interface MacroContext {
  scriptId: string;
  keyId: string;
  keyValue: string;
  hwid: string;
  sessionId: string;
  sessionCount: number;
  scriptName: string;
  scriptVersion: number;
  scriptExecutions: number;
  userExecutions: number;
  discordName: string;
  discordId: string | number;
  keyNote: string;
  timeLeft: number;
  premium: boolean;
  apiBase: string; // e.g. https://<ref>.supabase.co/functions/v1
}

export interface MacroScanResult {
  hasMacros: boolean;
  usesBlacklist: boolean;
  usesDashboard: boolean;
  usesStorage: boolean;
  usesSecureRequest: boolean;
  usesVmify: boolean;
  usesInit: boolean;
  usesEncStr: boolean;
}

const luaStr = (s: unknown) => {
  const t = String(s ?? "");
  return '"' + t.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\n/g, "\\n").replace(/\r/g, "\\r") + '"';
};

export function scanMacros(src: string): MacroScanResult {
  return {
    hasMacros: /WBHF_[A-Z_]+/.test(src),
    usesBlacklist: /WBHF_BLACKLIST\s*\(/.test(src),
    usesDashboard: /WBHF_DASHBOARD\s*[:.]/.test(src),
    usesStorage: /WBHF_(SAVE|GET|DELETE)_VALUE\s*\(/.test(src),
    usesSecureRequest: /WBHF_SECURE_REQUEST\s*\(/.test(src),
    usesVmify: /WBHF_VMIFY\s*\(/.test(src),
    usesInit: /WBHF_INIT\s*\(/.test(src),
    usesEncStr: /WBHF_ENCSTR\s*\(/.test(src),
  };
}

/**
 * Build the Lua prelude that provides runtime variables and helper functions.
 * The prelude is prepended to the user's source BEFORE obfuscation so the
 * obfuscator processes the helpers along with the script.
 */
export function buildRuntimePrelude(ctx: MacroContext): string {
  return `-- ===== WBHF Runtime Prelude (auto-injected) =====
local _WBHF = {
  script_id = ${luaStr(ctx.scriptId)},
  key_id = ${luaStr(ctx.keyId)},
  key = ${luaStr(ctx.keyValue)},
  hwid = ${luaStr(ctx.hwid)},
  session_id = ${luaStr(ctx.sessionId)},
  api = ${luaStr(ctx.apiBase)},
}

-- Runtime variables
WBHF_DISCORD = ${luaStr(ctx.discordName || "unknown")}
WBHF_DISCORD_ID = ${typeof ctx.discordId === "number" ? ctx.discordId : luaStr(ctx.discordId || "0")}
WBHF_KEYNOTE = ${luaStr(ctx.keyNote || "")}
WBHF_EXECUTIONS = ${ctx.userExecutions | 0}
WBHF_SCRIPT_EXECUTIONS = ${ctx.scriptExecutions | 0}
WBHF_FINGERPRINT = ${luaStr(ctx.hwid)}
WBHF_TIMELEFT = ${ctx.timeLeft | 0}
WBHF_PREMIUM = ${ctx.premium ? "true" : "false"}
WBHF_SCRIPT_NAME = ${luaStr(ctx.scriptName)}
WBHF_SCRIPT_VERSION = ${ctx.scriptVersion | 0}
WBHF_SESSION_ID = ${luaStr(ctx.sessionId)}
WBHF_SESSION_COUNT = ${ctx.sessionCount | 0}

-- HTTP helper (executor-agnostic)
local function _wbhf_http(method, url, body)
  local req = (syn and syn.request) or (http and http.request) or http_request or request
  local headers = { ["Content-Type"] = "application/json" }
  local ok, res = pcall(req, { Url = url, Method = method, Headers = headers, Body = body and game:GetService("HttpService"):JSONEncode(body) or nil })
  if not ok or not res then return nil end
  local body_str = res.Body or res.body or ""
  local ok2, decoded = pcall(function() return game:GetService("HttpService"):JSONDecode(body_str) end)
  return ok2 and decoded or body_str
end

-- WBHF_ENCSTR: identity at runtime (Luraph rewrites the literal)
WBHF_ENCSTR = function(s) return s end

-- WBHF_INIT: run closure before main logic
WBHF_INIT = function(fn) if type(fn) == "function" then pcall(fn) end end

-- WBHF_VMIFY: identity placeholder (Luraph virtualization happens at obfuscation)
WBHF_VMIFY = function(fn) return fn end

-- WBHF_BLACKLIST: blacklists current key/HWID
WBHF_BLACKLIST = function(reason)
  _wbhf_http("POST", _WBHF.api .. "/api-keys-blacklist", {
    script_id = _WBHF.script_id, key_id = _WBHF.key_id, hwid = _WBHF.hwid,
    reason = tostring(reason or "macro"),
  })
  error("[WBHF] Blacklisted: " .. tostring(reason or ""), 0)
end

-- WBHF_SAVE/GET/DELETE_VALUE: cloud storage
WBHF_SAVE_VALUE = function(id, value, overwrite)
  local r = _wbhf_http("POST", _WBHF.api .. "/client-storage", {
    op = "set", script_id = _WBHF.script_id, key_id = _WBHF.key_id, hwid = _WBHF.hwid,
    storage_id = id, value = value, overwrite = overwrite ~= false,
  })
  return r and r.ok == true
end
WBHF_GET_VALUE = function(id)
  local r = _wbhf_http("POST", _WBHF.api .. "/client-storage", {
    op = "get", script_id = _WBHF.script_id, key_id = _WBHF.key_id, hwid = _WBHF.hwid, storage_id = id,
  })
  return r and r.value
end
WBHF_DELETE_VALUE = function(id)
  _wbhf_http("POST", _WBHF.api .. "/client-storage", {
    op = "delete", script_id = _WBHF.script_id, key_id = _WBHF.key_id, hwid = _WBHF.hwid, storage_id = id,
  })
end

-- WBHF_DASHBOARD: real-time component bus
local _wbhf_handlers = {}
WBHF_DASHBOARD = {
  Connect = function(_, name, fn)
    _wbhf_handlers[name] = fn
    task.spawn(function()
      while true do
        local r = _wbhf_http("POST", _WBHF.api .. "/dashboard-fire", {
          op = "poll", script_id = _WBHF.script_id, key_id = _WBHF.key_id, component_id = name,
        })
        if r and r.value ~= nil and _wbhf_handlers[name] then
          pcall(_wbhf_handlers[name], r.value)
        end
        task.wait(2)
      end
    end)
  end,
  Fire = function(_, name, value)
    _wbhf_http("POST", _WBHF.api .. "/dashboard-fire", {
      op = "fire", script_id = _WBHF.script_id, key_id = _WBHF.key_id,
      component_id = name, value = value,
    })
  end,
}

-- WBHF_SECURE_REQUEST: E2E-style proxied HTTP
WBHF_SECURE_REQUEST = function(data)
  return _wbhf_http("POST", _WBHF.api .. "/secure-proxy", {
    script_id = _WBHF.script_id, key_id = _WBHF.key_id, hwid = _WBHF.hwid, request = data,
  })
end

-- TIMELEFT live update
if WBHF_TIMELEFT > 0 then
  task.spawn(function()
    while WBHF_TIMELEFT > 0 do task.wait(1); WBHF_TIMELEFT = WBHF_TIMELEFT - 1 end
  end)
end
-- ===== End Prelude =====
`;
}

/**
 * Process macros in user source. Currently the runtime helpers handle
 * everything; this keeps a hook for future static rewrites (e.g. inline
 * WBHF_ENCSTR rotation). Returns the source unchanged for now.
 */
export function processMacros(src: string, _ctx: MacroContext): string {
  return src;
}

export function injectPrelude(src: string, ctx: MacroContext): string {
  return buildRuntimePrelude(ctx) + "\n" + src;
}
