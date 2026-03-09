import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.2";
import {
  corsHeaders,
  getClientIP,
  isExecutor,
  hashHWID,
  fastHash32,
  generateSecureToken,
  xorEncrypt,
  deriveEncryptionKey,
  generateSalt,
  steganographicWatermark,
  obfuscateWithLuraph,
} from "../_shared/shared-utils.ts";
import { createBinaryStream, uint8ArrayToBase64, calculateChecksum } from "../_shared/binary-stream.ts";

/**
 * SHADOWAUTH 3-PHASE AUTH HANDSHAKE (Luarmor v3.4 identical)
 * ===========================================================
 * 
 * Phase 1: POST /init
 *   Client → Server: key, script_id, hwid, exec_id, tbl_acc, hb_count, LCG seeds, integrity data
 *   Server → Client: session_token, 16 server values (with mathematical offsets), auth verification string
 * 
 * Phase 2: POST /start  
 *   Client → Server: session_token, proof values (computed from Phase 1 response)
 *   Server → Client: encrypted script payload, decryption params, heartbeat config
 * 
 * Phase 3: GET /heartbeat (separate endpoint)
 *   Client → Server: mathematical challenge (encoded with rolling cipher)
 *   Server → Client: mathematical response (hash verification)
 * 
 * Luarmor source references:
 *   - init: lines 966-1001 (sends 11 encoded values, receives 16)
 *   - start: lines 1098-1110 (sends 5 encoded values, receives 9)
 *   - heartbeat: lines 1200-1270 (20s interval, math validation, credit system)
 */

// ==================== LUARMOR MATH FUNCTIONS ====================

// v59: Double-pass hash (lines 604-627)
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

// v62: LCG PRNG (lines 588-603)
function lcgRandom(seed: number) {
  let a = 1103515245, b = 12345, m = 99999999;
  let x = Math.abs(Math.floor(seed)) % 2147483648;
  let n = 1;
  return function (lo: number, hi: number): number {
    const t = a * x + b;
    const v = t % m + n;
    n++; x = Math.abs(v);
    b = t % 4859 * (m % 5781);
    return lo + Math.abs(v) % (hi - lo + 1);
  };
}

// ==================== SESSION STORE ====================

interface AuthSession {
  script_id: string;
  phase: number;
  key_value: string;
  key_id: string | null;
  hwid: string;
  exec_id: number;
  ip: string;
  created: number;
  // Mathematical seeds (Luarmor v275, v277-v281)
  v277: number;
  v279: number;
  v280: number;
  v281: number[];
  v275: number[];
  v325: number;
  v327: number;
  tbl_acc: number;
  suspicion: number;
  hb_count: number;
  rng1: number;
  rng2: number;
  // Server values sent in Phase 1
  server_values: number[];
  auth_string: string;
  // Phase 2 data
  decryption_key?: string;
  derivation_salt?: string;
  server_timestamp?: number;
}

const pendingSessions = new Map<string, AuthSession>();

// Cleanup stale sessions every 5 min
setInterval(() => {
  const now = Date.now();
  for (const [id, s] of pendingSessions) {
    if (now - s.created > 300000) pendingSessions.delete(id);
  }
}, 300000);

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const clientIP = getClientIP(req);
  const ua = req.headers.get("user-agent") || "";

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  try {
    const body = await req.json();
    const phase = body.phase || "init";

    // ==================== PHASE 1: INIT ====================
    if (phase === "init") {
      const {
        key, script_id, hwid, tshwid, exec_id, tbl_acc, tostr_result,
        hb_count, rng1, rng2, roblox_username, roblox_user_id, executor,
        // Client LCG seeds (Luarmor v275, v277-v281)
        v277: cv277, v279: cv279, v280: cv280, v281: cv281, v275: cv275,
        suspicion_code, timezone_offset
      } = body;

      if (!key || !script_id) {
        return new Response(JSON.stringify({ error: "Missing parameters" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      // Validate script
      const { data: script } = await supabase
        .from("scripts")
        .select("id, name, content, heartbeat_enabled, ffa_mode, discord_webhook_enabled, discord_webhook_url")
        .eq("id", script_id)
        .single();

      if (!script) {
        return new Response("err", { headers: { ...corsHeaders, "Content-Type": "text/plain" } });
      }

      // Validate key
      const { data: keyData } = await supabase
        .from("script_keys")
        .select("*")
        .eq("key_value", key)
        .eq("script_id", script_id)
        .single();

      if (!keyData) {
        return new Response("!Invalid key", { headers: { ...corsHeaders, "Content-Type": "text/plain" } });
      }

      if (keyData.is_banned) {
        const reason = keyData.note?.startsWith("Banned:") ? keyData.note.replace("Banned: ", "") : "Access denied";
        return new Response(`!${reason};;lrm_is_diff_msg`, {
          headers: { ...corsHeaders, "Content-Type": "text/plain" }
        });
      }

      if (keyData.expires_at && new Date(keyData.expires_at) < new Date()) {
        return new Response("!Your key has expired", {
          headers: { ...corsHeaders, "Content-Type": "text/plain" }
        });
      }

      // HWID lock
      const hashedHwid = hwid ? await hashHWID(hwid) : null;
      if (hashedHwid && keyData.hwid && keyData.hwid !== hashedHwid) {
        return new Response("!HWID mismatch. Reset your HWID in the dashboard.", {
          headers: { ...corsHeaders, "Content-Type": "text/plain" }
        });
      }
      if (hashedHwid && !keyData.hwid) {
        await supabase.from("script_keys").update({ hwid: hashedHwid }).eq("id", keyData.id);
      }

      // Generate session
      const sessionToken = crypto.randomUUID();
      const rng = lcgRandom(Date.now() % 999999);

      // Client values (or defaults)
      const v277 = cv277 || rng(111111, 999999);
      const v279 = cv279 || rng(111111, 999999);
      const v280 = cv280 || rng(1, 1234) * rng(2, 1235);
      const v281 = cv281 || [rng(100000, 1000000), rng(100000, 1000000), rng(100000, 1000000)];
      const v275 = cv275 || [rng(100000, 1000000), rng(1111, 32768), rng(3333, 15625), rng(10000, 1000000)];
      const v325 = rng(111111, 999999);

      // Server values (Luarmor v319[1-16])
      const sv = Array.from({ length: 16 }, () => rng(100000, 1000000));

      // Auth verification string (Luarmor v319[11] = hash(v281[3]+8474) .. hash(v281[1]+31) .. hash(v281[2]+4491))
      const authStr = `${saHash(v281[2] + 8474)}${saHash(v281[0] + 31)}${saHash(v281[1] + 4491)}`;

      // Store session
      const session: AuthSession = {
        script_id, phase: 1, key_value: key, key_id: keyData.id,
        hwid: hashedHwid || tshwid || "unknown", exec_id: exec_id || 0,
        ip: clientIP, created: Date.now(),
        v277, v279, v280, v281, v275, v325, v327: sv[9],
        tbl_acc: tbl_acc || 0, suspicion: suspicion_code || 0,
        hb_count: hb_count || 0, rng1: rng1 || 0, rng2: rng2 || 0,
        server_values: sv, auth_string: authStr,
      };
      pendingSessions.set(sessionToken, session);

      // Create DB session
      await supabase.from("websocket_sessions").insert({
        script_id, hwid: (hashedHwid || tshwid || "unknown").substring(0, 32),
        ip_address: clientIP, username: roblox_username, executor,
        status: "init", is_connected: true,
      });

      // Build response (Luarmor: array of 16 values with mathematical offsets)
      const secondsLeft = keyData.expires_at
        ? Math.max(0, Math.floor((new Date(keyData.expires_at).getTime() - Date.now()) / 1000))
        : -1;

      const response = {
        s: sessionToken,
        v: [
          sv[0] + v279,           // [0]: client subtracts v279 → gets sv[0] (v40)
          sv[1],                   // [1]: rolling cipher param
          sv[2] + v281[1],         // [2]: client subtracts v281[2] → gets sv[2]
          sv[3] + v277,            // [3]: client subtracts v277 → gets sv[3] (v39)
          sv[4] + v281[2],         // [4]: client subtracts v281[3]
          sv[5],                   // [5]: used for decryption
          sv[6],                   // [6]: rolling cipher
          sv[7] + v281[0],         // [7]: client subtracts v281[1]
          sv[8],                   // [8]: rolling cipher
          sv[9],                   // [9]: v327 (nonce)
          authStr,                 // [10]: auth verification
          sessionToken,            // [11]: session token
          sv[12],                  // [12]: server nonce
          secondsLeft,             // [13]: seconds left
          keyData.note || 0,       // [14]: key_days
          keyData.discord_id || "Not specified", // [15]: note/discord
        ],
        he: script.heartbeat_enabled || false,
        n: script.name,
        vr: "3.4",
      };

      console.log(`[INIT] s=${sessionToken.substring(0, 8)}... key=${key.substring(0, 8)}... ip=${clientIP}`);

      return new Response(JSON.stringify(response), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // ==================== PHASE 2: START ====================
    if (phase === "start") {
      const { s: sessionToken, proof } = body;

      const session = pendingSessions.get(sessionToken);
      if (!session || session.phase !== 1) {
        return new Response("err", { headers: { ...corsHeaders, "Content-Type": "text/plain" } });
      }

      session.phase = 2;

      // Fetch script content for delivery
      const { data: script } = await supabase
        .from("scripts")
        .select("id, name, content")
        .eq("id", session.script_id)
        .single();

      if (!script) {
        return new Response("err", { headers: { ...corsHeaders, "Content-Type": "text/plain" } });
      }

      // Watermark + encrypt
      const keyIdForWatermark = session.key_id || crypto.randomUUID();
      const watermarked = steganographicWatermark(script.content, keyIdForWatermark);

      const serverTimestamp = Math.floor(Date.now() / 1000);
      const derivationSalt = generateSalt(keyIdForWatermark, session.hwid, serverTimestamp);
      const derivedKey = deriveEncryptionKey(derivationSalt, session.hwid, sessionToken, serverTimestamp);

      session.decryption_key = derivedKey;
      session.derivation_salt = derivationSalt;
      session.server_timestamp = serverTimestamp;

      // Binary delivery
      const binaryStream = createBinaryStream(watermarked, derivedKey, derivationSalt);
      const binaryPayload = uint8ArrayToBase64(binaryStream);
      const binaryChecksum = calculateChecksum(new TextEncoder().encode(watermarked));
      const scriptHash = fastHash32(watermarked);
      const payloadHash = fastHash32(binaryPayload);

      const responseSig = fastHash32(`${derivationSalt}:${serverTimestamp}:binary:${payloadHash}:${sessionToken}`);

      // Generate Phase 2 server values (Luarmor v328[1-9])
      const rng = lcgRandom(Date.now() % 999999 + session.v325);
      const p2v = Array.from({ length: 9 }, () => rng(100000, 1000000));

      // Auth verification for Phase 2 (Luarmor line 1122)
      const v281_4 = session.v281[3] || rng(100000, 1000000);
      const v281_5 = session.v281[4] || rng(100000, 1000000);
      const p2auth = `${saHash(v281_5 + 181)}${saHash(v281_4 + fastHash32(session.hwid || "?").length)}${saHash((session.v281[5] || rng(100000, 1000000)) + session.v281[1])}`;

      // Log execution
      await supabase.from("script_executions").insert({
        script_id: session.script_id, key_id: session.key_id,
        hwid: session.hwid.substring(0, 32), executor_ip: session.ip,
        executor_type: session.exec_id > 0 ? `exec_${session.exec_id}` : "unknown",
        roblox_username: body.roblox_username,
      });

      // Update DB session
      await supabase.from("websocket_sessions")
        .update({ status: "authenticated", last_heartbeat: new Date().toISOString() })
        .eq("script_id", session.script_id)
        .eq("hwid", session.hwid.substring(0, 32))
        .eq("status", "init");

      // Increment execution count (fire-and-forget)
      supabase.from("scripts").update({
        execution_count: (await supabase.from("scripts").select("execution_count").eq("id", session.script_id).single()).data?.execution_count + 1 || 1
      }).eq("id", session.script_id).then(() => {});

      // Update key usage
      await supabase.from("script_keys").update({
        used_at: new Date().toISOString(),
      }).eq("id", session.key_id);

      const secondsLeft = body.expires_at
        ? Math.max(0, Math.floor((new Date(body.expires_at).getTime() - Date.now()) / 1000))
        : null;

      const response = {
        authenticated: true,
        s: sessionToken,
        // Script delivery
        binary_stream: binaryPayload,
        binary_checksum: binaryChecksum,
        delivery_mode: "binary",
        salt: derivationSalt,
        timestamp: serverTimestamp,
        script_hash: scriptHash,
        payload_hash: payloadHash,
        response_sig: responseSig,
        script_name: script.name,
        session_token: sessionToken,
        // Phase 2 values
        v: p2v,
        auth: p2auth,
        // Key info
        seconds_left: secondsLeft,
        discord_id: body.discord_id,
        // Heartbeat config
        hb_interval: 20000,
        hb_v325: session.v325,
        hb_v279: session.v279,
        hb_v327: session.v327,
      };

      console.log(`[START] s=${sessionToken.substring(0, 8)}... script=${session.script_id.substring(0, 8)}... auth=true`);

      return new Response(JSON.stringify(response), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // ==================== PHASE 3: HEARTBEAT ====================
    if (phase === "heartbeat") {
      const { s: sessionToken, v384, v385, checksum } = body;

      const session = pendingSessions.get(sessionToken);
      if (!session) {
        return new Response("NOT_FOUND", { headers: { ...corsHeaders, "Content-Type": "text/plain" } });
      }

      if (session.phase < 2) {
        return new Response("FAIL", { headers: { ...corsHeaders, "Content-Type": "text/plain" } });
      }

      // Validate mathematical challenge (Luarmor line 1249)
      // Expected: hash(v384*v385%100000 + v325 + 8410)
      const expectedRaw = ((v384 || 0) * (v385 || 0)) % 100000 + session.v325 + 8410;
      const responseVal = saHash(expectedRaw);

      // Update DB heartbeat
      await supabase.from("websocket_sessions")
        .update({ last_heartbeat: new Date().toISOString(), status: "active" })
        .eq("script_id", session.script_id)
        .eq("hwid", session.hwid.substring(0, 32))
        .eq("is_connected", true);

      console.log(`[HB] s=${sessionToken.substring(0, 8)}... v384=${v384} v385=${v385} → ${responseVal}`);

      return new Response(String(responseVal), {
        headers: { ...corsHeaders, "Content-Type": "text/plain" }
      });
    }

    return new Response(JSON.stringify({ error: "Unknown phase" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (error) {
    console.error("[HANDSHAKE] Error:", error);
    return new Response("err", {
      status: 500, headers: { ...corsHeaders, "Content-Type": "text/plain" }
    });
  }
});
