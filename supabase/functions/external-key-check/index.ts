import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.2";

/**
 * LUARMOR-COMPATIBLE EXTERNAL KEY CHECK API
 * For 3rd party non-Lua applications to validate keys
 * Uses SHA1 signatures like Luarmor
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, clienttime, clientnonce, clienthwid, executor-fingerprint, externalsignature",
  "Cache-Control": "no-store",
};

// SHA1 hash function
async function sha1(data: string): Promise<string> {
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(data);
  const hashBuffer = await crypto.subtle.digest("SHA-1", dataBuffer);
  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");
}

// Status codes like Luarmor
const STATUS_CODES = {
  KEY_VALID: "KEY_VALID",
  KEY_INVALID: "KEY_INVALID",
  KEY_EXPIRED: "KEY_EXPIRED",
  KEY_BANNED: "KEY_BANNED",
  KEY_HWID_MISMATCH: "KEY_HWID_MISMATCH",
  KEY_NOT_FOUND: "KEY_NOT_FOUND",
  INVALID_SIGNATURE: "INVALID_SIGNATURE",
  INVALID_REQUEST: "INVALID_REQUEST",
  RATE_LIMITED: "RATE_LIMITED",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  try {
    const url = new URL(req.url);
    const appName = url.searchParams.get("by");
    const keyToCheck = url.searchParams.get("key");

    const clientTime = req.headers.get("clienttime");
    const clientNonce = req.headers.get("clientnonce");
    const clientHwid = req.headers.get("clienthwid");
    const externalSignature = req.headers.get("externalsignature");

    // Validate required parameters
    if (!appName || !keyToCheck) {
      return new Response(JSON.stringify({
        code: STATUS_CODES.INVALID_REQUEST,
        message: "Missing required parameters: by, key"
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    if (!clientNonce || clientNonce.length !== 16) {
      return new Response(JSON.stringify({
        code: STATUS_CODES.INVALID_REQUEST,
        message: "Invalid clientnonce (must be 16 chars)"
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Find the key
    const { data: keyData } = await supabase
      .from("script_keys")
      .select("*, scripts!inner(id, name, user_id)")
      .eq("key_value", keyToCheck)
      .single();

    if (!keyData) {
      return new Response(JSON.stringify({
        code: STATUS_CODES.KEY_NOT_FOUND,
        message: "The provided key was not found."
      }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Get script secrets for signature validation
    const { data: secrets } = await supabase
      .from("script_secrets")
      .select("*")
      .eq("script_id", keyData.script_id)
      .single();

    // Validate signature if secrets exist
    if (secrets && externalSignature) {
      const expectedSignature = await sha1(
        clientNonce + 
        secrets.secret_n1 + 
        keyToCheck + 
        secrets.secret_n2 + 
        clientTime + 
        secrets.secret_n3 + 
        clientHwid
      );

      if (externalSignature !== expectedSignature) {
        return new Response(JSON.stringify({
          code: STATUS_CODES.INVALID_SIGNATURE,
          message: "Invalid request signature."
        }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }
    }

    // Check if banned
    if (keyData.is_banned) {
      return new Response(JSON.stringify({
        code: STATUS_CODES.KEY_BANNED,
        message: "This key has been banned."
      }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Check expiry
    if (keyData.expires_at && new Date(keyData.expires_at) < new Date()) {
      return new Response(JSON.stringify({
        code: STATUS_CODES.KEY_EXPIRED,
        message: "This key has expired."
      }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Check HWID
    if (clientHwid) {
      const data = new TextEncoder().encode(clientHwid + "shadowauth_v7");
      const hash = await crypto.subtle.digest("SHA-256", data);
      const hwidHash = Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, "0")).join("");

      if (keyData.hwid && keyData.hwid !== hwidHash) {
        return new Response(JSON.stringify({
          code: STATUS_CODES.KEY_HWID_MISMATCH,
          message: "HWID mismatch. This key is linked to a different device."
        }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      // Auto-link HWID if not set
      if (!keyData.hwid) {
        await supabase
          .from("script_keys")
          .update({ hwid: hwidHash })
          .eq("id", keyData.id);
      }
    }

    // Update execution count
    await supabase
      .from("script_keys")
      .update({ 
        execution_count: (keyData.execution_count || 0) + 1,
        used_at: new Date().toISOString()
      })
      .eq("id", keyData.id);

    // Generate response signature (Luarmor style)
    let responseSignature = null;
    if (secrets) {
      responseSignature = await sha1(
        clientNonce + 
        secrets.secret_n3 + 
        STATUS_CODES.KEY_VALID
      );
    }

    const response: Record<string, unknown> = {
      code: STATUS_CODES.KEY_VALID,
      message: "The provided key is valid.",
      data: {
        note: keyData.note || "ShadowAuth Key",
        total_executions: (keyData.execution_count || 0) + 1,
        auth_expire: keyData.expires_at 
          ? Math.floor(new Date(keyData.expires_at).getTime() / 1000)
          : -1,
        discord_id: keyData.discord_id,
      }
    };

    if (responseSignature) {
      response.signature = responseSignature;
    }

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (error) {
    console.error("External key check error:", error);
    return new Response(JSON.stringify({
      code: STATUS_CODES.INVALID_REQUEST,
      message: "Internal server error"
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
