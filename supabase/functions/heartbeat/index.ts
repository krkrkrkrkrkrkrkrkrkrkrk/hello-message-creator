import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-session-token",
  "Cache-Control": "no-store",
};

// Session store (in production, use Redis/DB)
const sessionStore = new Map<string, { 
  keyId: string;
  keyValue: string;
  scriptId: string;
  hwid: string;
  createdAt: number;
  lastHeartbeat: number;
  heartbeatCount: number;
  features: Record<string, boolean | number>;
  lastWarnCount: number;
}>();

// Clean expired sessions every 5 min
setInterval(() => {
  const now = Date.now();
  for (const [token, session] of sessionStore.entries()) {
    // Session expires after 30 min of no heartbeat
    if (now - session.lastHeartbeat > 30 * 60 * 1000) {
      sessionStore.delete(token);
    }
  }
}, 5 * 60 * 1000);

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const sessionToken = req.headers.get("x-session-token");
    
    if (!sessionToken) {
      return new Response(
        JSON.stringify({ alive: false, reason: "no_session" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let body;
    try {
      body = await req.json();
    } catch {
      body = {};
    }

    const { action, hwid, script_id, detected_threats, enable_warnings } = body;

    // Handle different heartbeat actions
    switch (action) {
      case "ping": {
        const session = sessionStore.get(sessionToken);
        if (!session) {
          return new Response(
            JSON.stringify({ alive: false, reason: "session_expired" }),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Update heartbeat
        session.lastHeartbeat = Date.now();
        session.heartbeatCount++;

        // CHECK IF SESSION WAS KICKED FROM DASHBOARD (websocket_sessions table)
        const { data: wsSession } = await supabase
          .from("websocket_sessions")
          .select("is_connected, status, kick_reason")
          .eq("session_token", sessionToken)
          .maybeSingle();
        
        // Also check by hwid + script_id if session_token not found
        let isKicked = false;
        let kickReason = "Kicked by administrator";
        
        if (wsSession) {
          if (!wsSession.is_connected && wsSession.status === "kicked") {
            isKicked = true;
            kickReason = wsSession.kick_reason || "Kicked by administrator";
          }
        } else if (session.hwid && session.scriptId) {
          // Fallback: check by hwid
          const { data: wsSessionByHwid } = await supabase
            .from("websocket_sessions")
            .select("is_connected, status, kick_reason")
            .eq("script_id", session.scriptId)
            .eq("hwid", session.hwid.substring(0, 32))
            .eq("status", "kicked")
            .maybeSingle();
          
          if (wsSessionByHwid) {
            isKicked = true;
            kickReason = wsSessionByHwid.kick_reason || "Kicked by administrator";
          }
        }
        
        // REAL-TIME KICK CHECK - Force game:Kick() on client
        if (isKicked) {
          // Clean up local session
          sessionStore.delete(sessionToken);
          
          return new Response(
            JSON.stringify({ 
              alive: true,
              kicked: true,
              kick_reason: kickReason
            }),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Check key status in real-time from database
        const { data: keyData } = await supabase
          .from("script_keys")
          .select("is_banned, warning_count, note")
          .eq("key_value", session.keyValue)
          .eq("script_id", session.scriptId)
          .maybeSingle();

        // Check script settings
        const { data: scriptData } = await supabase
          .from("scripts")
          .select("enable_spy_warnings, max_warnings")
          .eq("id", session.scriptId)
          .maybeSingle();

        const enableSpyWarnings = scriptData?.enable_spy_warnings !== false;
        const maxWarnings = scriptData?.max_warnings || 3;

        // REAL-TIME BAN CHECK - get reason from note field
        if (keyData?.is_banned) {
          // Extract reason from note (format: "Banned: reason")
          let banReason = "Your license has been banned for violating terms of service";
          if (keyData.note && keyData.note.startsWith("Banned: ")) {
            banReason = keyData.note.replace("Banned: ", "");
          }
          
          return new Response(
            JSON.stringify({ 
              alive: true,
              banned: true,
              ban_reason: banReason
            }),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Handle spy tool detection with warnings
        let showWarning = false;
        let warningTool = "";
        let currentWarnings = keyData?.warning_count || 0;

        if (detected_threats && Array.isArray(detected_threats) && detected_threats.length > 0 && enableSpyWarnings && enable_warnings) {
          warningTool = detected_threats[0] || "Suspicious Tool";
          
          // Check if we already warned this session
          const lastWarnCount = session.lastWarnCount || 0;
          
          if (currentWarnings > lastWarnCount) {
            showWarning = true;
            session.lastWarnCount = currentWarnings;
          }
          
          // Auto-ban if max warnings reached
          if (currentWarnings >= maxWarnings) {
            await supabase
              .from("script_keys")
              .update({ is_banned: true })
              .eq("key_value", session.keyValue);

            return new Response(
              JSON.stringify({ 
                alive: true,
                banned: true,
                ban_reason: `Auto-banned: Exceeded maximum warnings (${currentWarnings}/${maxWarnings})`
              }),
              { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }
        }
        
        // Update last_heartbeat in websocket_sessions for dashboard real-time updates
        if (session.hwid && session.scriptId) {
          supabase
            .from("websocket_sessions")
            .update({ last_heartbeat: new Date().toISOString() })
            .eq("script_id", session.scriptId)
            .eq("hwid", session.hwid.substring(0, 32))
            .eq("is_connected", true)
            .then(() => {});
        }

        // Dynamic feature flags (can be controlled per-session)
        const features = {
          ...session.features,
          antiCheat: true,
          premium: true,
          debugMode: false,
        };

        // Generate dynamic seed for variable behavior
        const seed = Math.floor(Date.now() / 60000) + session.heartbeatCount;

        return new Response(
          JSON.stringify({ 
            alive: true, 
            features,
            seed,
            serverTime: Date.now(),
            nextHeartbeat: 10000, // 10 seconds for real-time kick detection
            show_warning: showWarning,
            warning_tool: warningTool,
            warning_count: currentWarnings,
            max_warnings: maxWarnings
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "register": {
        // Register new session
        const token = crypto.randomUUID();
        sessionStore.set(token, {
          keyId: body.key_id || "",
          keyValue: body.key_value || "",
          scriptId: script_id || "",
          hwid: hwid || "",
          createdAt: Date.now(),
          lastHeartbeat: Date.now(),
          heartbeatCount: 0,
          lastWarnCount: 0,
          features: {
            antiCheat: true,
            premium: true
          }
        });

        return new Response(
          JSON.stringify({ 
            success: true, 
            session_token: token,
            ttl: 30 * 60 * 1000, // 30 min
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "validate": {
        const session = sessionStore.get(sessionToken);
        if (!session) {
          return new Response(
            JSON.stringify({ valid: false }),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Validate session matches request
        const isValid = session.hwid === hwid && session.scriptId === script_id;
        
        return new Response(
          JSON.stringify({ 
            valid: isValid,
            remaining: Math.max(0, 30 * 60 * 1000 - (Date.now() - session.createdAt))
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "kill": {
        // Terminate session
        sessionStore.delete(sessionToken);
        return new Response(
          JSON.stringify({ success: true }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      default:
        return new Response(
          JSON.stringify({ error: "invalid_action" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }

  } catch (error) {
    console.error("Heartbeat error:", error);
    return new Response(
      JSON.stringify({ alive: false, reason: "server_error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
