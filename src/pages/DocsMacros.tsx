import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Copy, Check } from "lucide-react";
import { Link } from "react-router-dom";

const MACROS = [
  { name: "WBHF_BLACKLIST(<reason>)", info: "Blacklist current key/HWID with reason. Halts execution." },
  { name: "WBHF_INIT(<function>)", info: "Run a closure before main auth logic (e.g. anti-cheat bypasses)." },
  { name: "WBHF_VMIFY(<function>)", info: "Virtualize the input function during obfuscation (heavy)." },
  { name: "WBHF_ENCSTR(<string>)", info: "Encrypt the string at obfuscation, hides it from constant dumps." },
  { name: "WBHF_DASHBOARD:Connect(<id>, <fn>)", info: "Subscribe to a dashboard component (toggles, settings)." },
  { name: "WBHF_DASHBOARD:Fire(<id>, <value>)", info: "Push telemetry from script to dashboard." },
  { name: "WBHF_SAVE_VALUE(<id>, <value>, <overwrite>)", info: "Persist cloud storage value per key/HWID." },
  { name: "WBHF_GET_VALUE(<id>)", info: "Read cloud storage value." },
  { name: "WBHF_DELETE_VALUE(<id>)", info: "Delete cloud storage value." },
  { name: "WBHF_SECURE_REQUEST(<request>)", info: "E2E-encrypted HTTP relay; hides destination URL from spies." },
];

const RUNTIME = [
  ["WBHF_DISCORD", "Discord username linked to the key, or 'unknown'."],
  ["WBHF_DISCORD_ID", "Discord ID linked to the key, or 0."],
  ["WBHF_KEYNOTE", "Note attached to the key."],
  ["WBHF_EXECUTIONS", "Total executions for the current key."],
  ["WBHF_SCRIPT_EXECUTIONS", "Total executions for the script."],
  ["WBHF_FINGERPRINT", "Executor-provided HWID."],
  ["WBHF_TIMELEFT", "Seconds until expiry. Updates live."],
  ["WBHF_PREMIUM", "true for permanent/whitelisted keys."],
  ["WBHF_SCRIPT_NAME", "Script name from the dashboard."],
  ["WBHF_SCRIPT_VERSION", "Auto-updating script version."],
  ["WBHF_SESSION_ID", "Current session ID."],
  ["WBHF_SESSION_COUNT", "Active sessions for the script."],
];

const DEV_STUB = `if not LPH_OBFUSCATED then
  -- Removed automatically when obfuscated through Wbhf Auth
  WBHF_ENCSTR = function(s) return s end
  WBHF_INIT = function(f) if type(f)=="function" then task.spawn(f) end end
  WBHF_VMIFY = function(f) return f end
  WBHF_BLACKLIST = function(r) error("[WBHF_BLACKLIST] " .. tostring(r)) end

  WBHF_DISCORD = "unknown"
  WBHF_DISCORD_ID = 0
  WBHF_KEYNOTE = ""
  WBHF_EXECUTIONS = 1
  WBHF_SCRIPT_EXECUTIONS = 1
  WBHF_FINGERPRINT = (gethwid and gethwid()) or "dev"
  WBHF_TIMELEFT = 0
  WBHF_PREMIUM = true
  WBHF_SCRIPT_NAME = "Dev Stub"
  WBHF_SCRIPT_VERSION = 1
  WBHF_SESSION_ID = "dev"
  WBHF_SESSION_COUNT = 1

  WBHF_SAVE_VALUE = function() return true end
  WBHF_GET_VALUE = function() return nil end
  WBHF_DELETE_VALUE = function() end
  WBHF_SECURE_REQUEST = function(d) return (request or http_request)(d) end
  WBHF_DASHBOARD = { Connect = function() end, Fire = function() end }
end`;

const EXAMPLE = `-- Hide constants
local url = WBHF_ENCSTR("https://api.example.com")

-- Run an anti-cheat bypass before auth completes
WBHF_INIT(function() print("pre-auth init") end)

-- Greet the user with runtime variables
print("Welcome " .. WBHF_DISCORD .. " (" .. WBHF_EXECUTIONS .. " executions)")

-- Cloud-saved kill count
local kills = WBHF_GET_VALUE("kills") or 0
WBHF_SAVE_VALUE("kills", kills + 1, true)

-- Dashboard toggle
WBHF_DASHBOARD:Connect("autofarm", function(enabled)
    getgenv().AutoFarm = enabled
end)

WBHF_DASHBOARD:Fire("kills", kills)

-- Virtualize a sensitive function
local checkKey = WBHF_VMIFY(function() return true end)

-- Secure outbound request
WBHF_SECURE_REQUEST({ Url = url, Method = "GET" })`;

function CopyBlock({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="relative group">
      <pre className="bg-muted/50 rounded-md p-4 overflow-x-auto text-xs"><code>{code}</code></pre>
      <Button
        size="sm" variant="ghost" className="absolute top-2 right-2 opacity-0 group-hover:opacity-100"
        onClick={() => { navigator.clipboard.writeText(code); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
      >
        {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
      </Button>
    </div>
  );
}

export default function DocsMacros() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-5xl mx-auto px-6 py-12">
        <Link to="/docs" className="text-sm text-muted-foreground hover:text-foreground">← Docs</Link>
        <h1 className="text-4xl font-bold mt-4 mb-2">Macros & Runtime Variables</h1>
        <p className="text-muted-foreground mb-8">
          WBHF_* macros are LuaProt-compatible. They are processed server-side: when your script
          contains them, a runtime prelude with real values is auto-injected before obfuscation.
        </p>

        <h2 className="text-2xl font-semibold mt-10 mb-4">Macros</h2>
        <Card className="divide-y">
          {MACROS.map(m => (
            <div key={m.name} className="p-4 grid grid-cols-1 md:grid-cols-[1fr_2fr] gap-2">
              <code className="text-sm font-mono text-primary">{m.name}</code>
              <span className="text-sm text-muted-foreground">{m.info}</span>
            </div>
          ))}
        </Card>

        <h2 className="text-2xl font-semibold mt-10 mb-4">Runtime Variables</h2>
        <Card className="divide-y">
          {RUNTIME.map(([n, d]) => (
            <div key={n} className="p-4 grid grid-cols-1 md:grid-cols-[1fr_2fr] gap-2">
              <code className="text-sm font-mono text-primary">{n}</code>
              <span className="text-sm text-muted-foreground">{d}</span>
            </div>
          ))}
        </Card>
        <p className="text-xs text-destructive mt-2">⚠ Overwriting runtime variables will crash the script.</p>

        <h2 className="text-2xl font-semibold mt-10 mb-4">Example</h2>
        <CopyBlock code={EXAMPLE} />

        <h2 className="text-2xl font-semibold mt-10 mb-4">Development Stub</h2>
        <p className="text-sm text-muted-foreground mb-3">
          Paste this at the top of your script during local testing so macros and runtime
          variables work outside the obfuscator. Wbhf Auth strips it automatically during build.
        </p>
        <CopyBlock code={DEV_STUB} />
      </div>
    </div>
  );
}
