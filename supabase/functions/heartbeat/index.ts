import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.2";
import {
  extractVerifiedData,
  analyzeSecurityServerSide,
  checkBanServerSide,
  checkRateLimitServerSide,
} from "../_shared/server-security.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-session-token",
  "Cache-Control": "no-store",
};

// =====================================================
// SESSION MANAGEMENT (Database-backed, not in-memory)
// =====================================================

interface HeartbeatSession {
  keyId: string;
  keyValue: string;
  scriptId: string;
  hwid: string;
  createdAt: string;
}

interface WebSocketSessionRow {
  session_token: string;
  script_id: string;
  key_id: string | null;
  hwid: string | null;
  ip_address: string;
  is_connected: boolean;
  status: string;
  kick_reason: string | null;
  created_at: string;
}

interface ScriptKeyRow {
  id: string;
  key_value: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function getSession(
  supabase: any,
  sessionToken: string
): Promise<HeartbeatSession | null> {
  // Check websocket_sessions table (database-backed)
  const { data } = await supabase
    .from("websocket_sessions")
    .select("*")
    .eq("session_token", sessionToken)
    .eq("is_connected", true)
    .maybeSingle();
  
  const wsData = data as WebSocketSessionRow | null;
  if (!wsData) return null;
  
  // Get key details
  let keyValue = "";
  if (wsData.key_id) {
    const { data: keyData } = await supabase
      .from("script_keys")
      .select("id, key_value")
      .eq("id", wsData.key_id)
      .maybeSingle();
    
    const keyRow = keyData as ScriptKeyRow | null;
    keyValue = keyRow?.key_value || "";
  }
  
  return {
    keyId: wsData.key_id || "",
    keyValue: keyValue,
    scriptId: wsData.script_id,
    hwid: wsData.hwid || "",
    createdAt: wsData.created_at,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function createSession(
  supabase: any,
  data: {
    scriptId: string;
    keyId: string;
    keyValue: string;
    hwid: string;
    ip: string;
    executor?: string;
    username?: string;
  }
): Promise<string> {
  const sessionToken = crypto.randomUUID();
  
  await supabase.from("websocket_sessions").insert({
    session_token: sessionToken,
    script_id: data.scriptId,
    key_id: data.keyId || null,
    hwid: data.hwid?.substring(0, 32) || null,
    ip_address: data.ip,
    executor: data.executor || null,
    username: data.username || null,
    is_connected: true,
    status: "active",
    last_heartbeat: new Date().toISOString(),
  });
  
  return sessionToken;
}

// =====================================================
// MAIN HANDLER
// =====================================================

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  // Extract VERIFIED data from request (server-side)
  const { verifiedIP, userAgent, requestFingerprint, timestamp } = extractVerifiedData(req);

  try {
    const sessionToken = req.headers.get("x-session-token");
    
    let body: Record<string, unknown> = {};
    try {
      body = await req.json();
    } catch {
      body = {};
    }

    const { 
      action, 
      hwid, 
      script_id, 
      detected_threats,  // CLIENT-REPORTED - NOT TRUSTED
      enable_warnings,
      key_id,
      key_value,
      executor,
      username,
    } = body as {
      action?: string;
      hwid?: string;
      script_id?: string;
      detected_threats?: string[];
      enable_warnings?: boolean;
      key_id?: string;
      key_value?: string;
      executor?: string;
      username?: string;
    };

    // =====================================================
    // RATE LIMITING (Server-side, DB-backed)
    // =====================================================
    const rateLimit = await checkRateLimitServerSide(
      `heartbeat:${verifiedIP}`,
      "heartbeat",
      120, // 120 requests per minute
      60
    );
    
    if (!rateLimit.allowed) {
      return new Response(
        JSON.stringify({ alive: false, reason: "rate_limited" }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // =====================================================
    // HANDLE ACTIONS
    // =====================================================
    switch (action) {
      case "ping": {
        if (!sessionToken) {
          return new Response(
            JSON.stringify({ alive: false, reason: "no_session" }),
            { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const session = await getSession(supabase, sessionToken);
        if (!session) {
          return new Response(
            JSON.stringify({ alive: false, reason: "session_expired" }),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // 1. CHECK BAN STATUS (SERVER-SIDE, DB-backed)
        const banCheck = await checkBanServerSide(session.scriptId, verifiedIP, hwid as string);
        if (banCheck.isBanned) {
          // Disconnect session
          await supabase
            .from("websocket_sessions")
            .update({ is_connected: false, status: "banned", disconnected_at: new Date().toISOString() })
            .eq("session_token", sessionToken);
          
          return new Response(
            JSON.stringify({ 
              alive: true,
              banned: true,
              ban_reason: banCheck.reason || "Access denied by server"
            }),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // 2. CHECK KICK STATUS (SERVER-SIDE, DB-backed)
        const { data: wsSession } = await supabase
          .from("websocket_sessions")
          .select("is_connected, status, kick_reason")
          .eq("session_token", sessionToken)
          .maybeSingle();
        
        if (wsSession && wsSession.status === "kicked") {
          return new Response(
            JSON.stringify({ 
              alive: true,
              kicked: true,
              kick_reason: wsSession.kick_reason || "Kicked by administrator"
            }),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // 3. CHECK KEY STATUS (SERVER-SIDE, DB-backed)
        const { data: keyData } = await supabase
          .from("script_keys")
          .select("is_banned, warning_count, note, expires_at")
          .eq("key_value", session.keyValue)
          .eq("script_id", session.scriptId)
          .maybeSingle();

        if (keyData?.is_banned) {
          let banReason = "Your license has been banned";
          if (keyData.note?.startsWith("Banned: ")) {
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

        // Check key expiration
        if (keyData?.expires_at && new Date(keyData.expires_at) < new Date()) {
          return new Response(
            JSON.stringify({ 
              alive: true,
              expired: true,
              message: "Your license has expired"
            }),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // 4. ANALYZE CLIENT-REPORTED DATA (SERVER DECIDES)
        // Client reports detected threats, SERVER analyzes and decides
        if (detected_threats && Array.isArray(detected_threats) && detected_threats.length > 0) {
          const analysis = await analyzeSecurityServerSide(
            session.scriptId,
            session.keyId,
            verifiedIP,
            {
              hwid: hwid as string,
              threats: detected_threats,
              executor: executor as string,
            }
          );

          // SERVER DECIDES: Should we ban?
          if (analysis.shouldBlock) {
            // Disconnect session
            await supabase
              .from("websocket_sessions")
              .update({ is_connected: false, status: "security_ban", disconnected_at: new Date().toISOString() })
              .eq("session_token", sessionToken);
            
            return new Response(
              JSON.stringify({ 
                alive: true,
                banned: true,
                ban_reason: `Security violation detected (score: ${analysis.anomalyScore})`
              }),
              { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }

          // SERVER DECIDES: Should we warn?
          if (analysis.action === "warning") {
            // Get script settings
            const { data: scriptData } = await supabase
              .from("scripts")
              .select("enable_spy_warnings, max_warnings")
              .eq("id", session.scriptId)
              .maybeSingle();

            const maxWarnings = scriptData?.max_warnings || 3;
            const currentWarnings = keyData?.warning_count || 0;

            // Auto-ban if max warnings exceeded (SERVER DECISION)
            if (currentWarnings >= maxWarnings) {
              await supabase
                .from("script_keys")
                .update({ is_banned: true, note: `Banned: Exceeded max warnings (${currentWarnings}/${maxWarnings})` })
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

            // Return warning (server instruction to client)
            return new Response(
              JSON.stringify({ 
                alive: true,
                show_warning: true,
                warning_tool: detected_threats[0] || "Unknown Tool",
                warning_count: currentWarnings,
                max_warnings: maxWarnings,
                serverTime: Date.now(),
                nextHeartbeat: 10000,
              }),
              { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }
        }

        // 5. UPDATE HEARTBEAT (DB)
        await supabase
          .from("websocket_sessions")
          .update({ 
            last_heartbeat: new Date().toISOString(),
            ip_address: verifiedIP,
          })
          .eq("session_token", sessionToken);

        // 6. RETURN SUCCESS (SERVER-CONTROLLED RESPONSE)
        return new Response(
          JSON.stringify({ 
            alive: true,
            serverTime: Date.now(),
            nextHeartbeat: 10000, // 10 seconds
            features: {
              antiCheat: true,
              premium: true,
            }
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "register": {
        // Create new session (DB-backed)
        if (!script_id) {
          return new Response(
            JSON.stringify({ success: false, error: "Missing script_id" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Check ban before creating session
        const banCheck = await checkBanServerSide(script_id, verifiedIP, hwid);
        if (banCheck.isBanned) {
          return new Response(
            JSON.stringify({ success: false, error: "Access denied", banned: true }),
            { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const newSessionToken = await createSession(supabase, {
          scriptId: script_id,
          keyId: key_id || "",
          keyValue: key_value || "",
          hwid: hwid || "",
          ip: verifiedIP,
          executor: executor,
          username: username,
        });

        return new Response(
          JSON.stringify({ 
            success: true, 
            session_token: newSessionToken,
            ttl: 30 * 60 * 1000, // 30 min
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "validate": {
        if (!sessionToken) {
          return new Response(
            JSON.stringify({ valid: false }),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const session = await getSession(supabase, sessionToken);
        if (!session) {
          return new Response(
            JSON.stringify({ valid: false }),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Validate session matches request (optional HWID check)
        const isValid = !hwid || session.hwid === hwid?.substring(0, 32);
        
        return new Response(
          JSON.stringify({ 
            valid: isValid,
            remaining: 30 * 60 * 1000, // Simplified - sessions don't expire by time
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "kill": {
        if (sessionToken) {
          await supabase
            .from("websocket_sessions")
            .update({ 
              is_connected: false, 
              status: "disconnected",
              disconnected_at: new Date().toISOString()
            })
            .eq("session_token", sessionToken);
        }
        
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
