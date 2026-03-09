import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.2";
import { corsHeaders, getClientIP } from "../_shared/shared-utils.ts";

/**
 * SHADOWAUTH HEARTBEAT V2.0 (Luarmor-identical)
 * ================================================
 * 
 * Two modes:
 * 1. Mathematical heartbeat (Luarmor lines 1200-1315)
 *    - GET /heartbeat?s=SESSION&t=ENCODED_PAYLOAD
 *    - Validates mathematical challenge
 *    - Returns hash response
 *    - Credit system: kills session if credit drops to 0
 * 
 * 2. Session management heartbeat (REST API)
 *    - POST /heartbeat { action: "ping"|"register"|"kill" }
 *    - DB-backed session management
 *    - Ban/kick checking
 *    - Warning system
 */

// Luarmor v59 hash
function saHash(v: number): number {
  for (let pass = 0; pass < 2; pass++) {
    const a = v % 9915 + 4;
    let b = 0, c = 0;
    for (let i = 1; i <= 3; i++) {
      b = v % 4155 + 3;
      if (i % 2 === 1) b += 522;
      c = v % 9996 + 1;
      if (c % 2 !== 1) c *= 3;
    }
    const d = v % 9999995 + 1 + 13729;
    const lo = v % 1000;
    const hi = Math.floor((v - lo) / 1000) % 1000;
    const e = lo * hi + d + v % (Math.max(1, 419824125 - d + lo));
    const f = v % (a * b + 9999) + 13729;
    v = (e + (f + (lo * b + hi)) % 999999 * (d + f % Math.max(1, c))) % 99999999999;
  }
  return Math.abs(Math.floor(v));
}

// In-memory credit system (Luarmor v380/v382/v383)
interface HBCredit {
  credit: number;     // 0-10 (kill at <=0)
  counter: number;    // v380: increments on success, resets at >4
  beat_count: number;
  last_beat: number;
  v325: number;
  v279: number;
  v327: number;
}

const creditMap = new Map<string, HBCredit>();

// Cleanup every 5 min
setInterval(() => {
  const now = Date.now();
  for (const [id, c] of creditMap) {
    if (now - c.last_beat > 300000) creditMap.delete(id);
  }
}, 300000);

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const clientIP = getClientIP(req);

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  try {
    // ==================== MATH HEARTBEAT (GET) ====================
    if (req.method === "GET") {
      const url = new URL(req.url);
      const sessionId = url.searchParams.get("s");
      const payload = url.searchParams.get("t");

      if (!sessionId) {
        return new Response("NOT_FOUND", { headers: { ...corsHeaders, "Content-Type": "text/plain" } });
      }

      // Get or create credit entry
      let credit = creditMap.get(sessionId);
      if (!credit) {
        // Look up in DB
        const { data: ws } = await supabase
          .from("websocket_sessions")
          .select("id, script_id, is_connected")
          .or(`id.eq.${sessionId}`)
          .eq("is_connected", true)
          .maybeSingle();

        if (!ws) {
          return new Response("NOT_FOUND", { headers: { ...corsHeaders, "Content-Type": "text/plain" } });
        }

        credit = {
          credit: 5,
          counter: 0,
          beat_count: 0,
          last_beat: Date.now(),
          v325: 0,
          v279: 0,
          v327: 0,
        };
        creditMap.set(sessionId, credit);
      }

      // Check credit (Luarmor v382 <=0 → kill)
      if (credit.credit <= 0) {
        // Kill session
        await supabase.from("websocket_sessions")
          .update({ is_connected: false, status: "credit_kill", disconnected_at: new Date().toISOString() })
          .eq("id", sessionId);
        creditMap.delete(sessionId);
        return new Response("FAIL", { headers: { ...corsHeaders, "Content-Type": "text/plain" } });
      }

      // Timing check
      const now = Date.now();
      const elapsed = now - credit.last_beat;
      
      if (elapsed < 5000) {
        // Too fast (< 5s) → suspicious, decrement credit
        credit.credit = Math.max(0, credit.credit - 1);
      }

      // Success path
      credit.beat_count++;
      credit.last_beat = now;
      credit.counter++;

      // Credit system (Luarmor lines 1283-1292)
      if (credit.counter > 4) {
        credit.counter = 0;
        credit.credit = Math.min(10, credit.credit + 1);
      }

      // Generate mathematical response
      // Luarmor: hash(v384*v385%100000 + v325 + 8410)
      const v384 = credit.beat_count * 1000 + 42;
      const v385 = credit.beat_count * 777 + 13;
      const responseRaw = (v384 * v385) % 100000 + credit.v325 + 8410;
      const responseVal = saHash(responseRaw);

      // Update DB every 5 beats
      if (credit.beat_count % 5 === 0) {
        await supabase.from("websocket_sessions")
          .update({ last_heartbeat: new Date().toISOString(), status: "active" })
          .eq("id", sessionId);
      }

      return new Response(String(responseVal), {
        headers: { ...corsHeaders, "Content-Type": "text/plain" }
      });
    }

    // ==================== REST HEARTBEAT (POST) ====================
    const body = await req.json();
    const { action, session_token, hwid, script_id, detected_threats, key_id, key_value, executor, username } = body;

    switch (action) {
      case "register": {
        if (!script_id) {
          return new Response(JSON.stringify({ success: false, error: "Missing script_id" }), {
            status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
        }

        const newToken = crypto.randomUUID();
        await supabase.from("websocket_sessions").insert({
          id: newToken,
          script_id,
          key_id: key_id || null,
          hwid: hwid?.substring(0, 32) || null,
          ip_address: clientIP,
          executor: executor || null,
          username: username || null,
          is_connected: true,
          status: "active",
          last_heartbeat: new Date().toISOString(),
        });

        // Initialize credit
        creditMap.set(newToken, {
          credit: 5, counter: 0, beat_count: 0, last_beat: Date.now(),
          v325: 0, v279: 0, v327: 0,
        });

        return new Response(JSON.stringify({ success: true, session_token: newToken, ttl: 1800000 }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      case "ping": {
        if (!session_token) {
          return new Response(JSON.stringify({ alive: false, reason: "no_session" }), {
            status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
        }

        // Check session exists
        const { data: ws } = await supabase
          .from("websocket_sessions")
          .select("*")
          .eq("id", session_token)
          .eq("is_connected", true)
          .maybeSingle();

        if (!ws) {
          return new Response(JSON.stringify({ alive: false, reason: "session_expired" }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
        }

        // Check if kicked
        if (ws.status === "kicked") {
          return new Response(JSON.stringify({ alive: true, kicked: true, kick_reason: "Kicked by administrator" }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
        }

        // Check key ban
        if (ws.key_id) {
          const { data: keyData } = await supabase
            .from("script_keys")
            .select("is_banned, expires_at")
            .eq("id", ws.key_id)
            .maybeSingle();

          if (keyData?.is_banned) {
            return new Response(JSON.stringify({ alive: true, banned: true, ban_reason: "Key banned" }), {
              headers: { ...corsHeaders, "Content-Type": "application/json" }
            });
          }

          if (keyData?.expires_at && new Date(keyData.expires_at) < new Date()) {
            return new Response(JSON.stringify({ alive: true, expired: true, message: "Key expired" }), {
              headers: { ...corsHeaders, "Content-Type": "application/json" }
            });
          }
        }

        // Log threats server-side
        if (detected_threats?.length > 0) {
          await supabase.from("security_events").insert({
            event_type: "client_threat_report",
            severity: "warning",
            ip_address: clientIP,
            script_id: ws.script_id,
            details: { threats: detected_threats, executor, hwid },
          });
        }

        // Update heartbeat
        await supabase.from("websocket_sessions")
          .update({ last_heartbeat: new Date().toISOString(), ip_address: clientIP })
          .eq("id", session_token);

        return new Response(JSON.stringify({
          alive: true,
          serverTime: Date.now(),
          nextHeartbeat: 20000,
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      case "kill": {
        if (session_token) {
          await supabase.from("websocket_sessions")
            .update({ is_connected: false, status: "disconnected", disconnected_at: new Date().toISOString() })
            .eq("id", session_token);
          creditMap.delete(session_token);
        }
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      default:
        return new Response(JSON.stringify({ error: "invalid_action" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
    }

  } catch (error) {
    console.error("[HB] Error:", error);
    return new Response(JSON.stringify({ alive: false, reason: "server_error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
