import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.2";
import { 
  createBinaryStream, 
  uint8ArrayToBase64,
  xorEncryptBytes,
  calculateChecksum 
} from "../_shared/binary-stream.ts";

/**
 * Binary Stream Delivery Endpoint
 * 
 * Delivers scripts as encrypted binary streams instead of JSON
 * This bypasses common executor hooks that intercept text/JSON responses
 * 
 * Modes:
 * - stream: Returns binary stream directly
 * - base64: Returns base64-encoded binary (for HTTP compatibility)
 * - chunked: Returns chunked stream for large scripts
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-shadow-sig, x-shadow-token, x-shadow-hwid",
  "Cache-Control": "no-store, no-cache, must-revalidate",
};

// Executor detection
function isExecutor(ua: string): boolean {
  const patterns = [/synapse/i, /krnl/i, /fluxus/i, /electron/i, /oxygen/i, /sentinel/i, 
    /celery/i, /arceus/i, /roblox/i, /comet/i, /trigon/i, /delta/i, /hydrogen/i, 
    /evon/i, /vegax/i, /jjsploit/i, /nihon/i, /zorara/i, /solara/i, /wave/i, /script-?ware/i];
  return patterns.some(p => p.test(ua));
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const clientIP = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
                   req.headers.get("cf-connecting-ip") || "unknown";
  const ua = req.headers.get("user-agent") || "";

  // Only allow executors
  if (!isExecutor(ua)) {
    return new Response(new Uint8Array([0xFF, 0x00, 0x00, 0x00]), {
      status: 403,
      headers: { ...corsHeaders, "Content-Type": "application/octet-stream" }
    });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const url = new URL(req.url);
    const sessionToken = url.searchParams.get("t") || req.headers.get("x-shadow-token");
    const hwid = url.searchParams.get("h") || req.headers.get("x-shadow-hwid");
    const mode = url.searchParams.get("m") || "base64"; // stream, base64, chunked
    const chunkIndex = parseInt(url.searchParams.get("c") || "0");

    if (!sessionToken) {
      return new Response(new Uint8Array([0xFF, 0x01, 0x00, 0x00]), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/octet-stream" }
      });
    }

    // Validate session token
    const { data: session, error: sessionError } = await supabase
      .from("delivery_sessions")
      .select("*, scripts(content, name), script_keys(key_value)")
      .eq("session_token", sessionToken)
      .gt("last_activity", new Date(Date.now() - 60000).toISOString()) // 60 second window
      .maybeSingle();

    if (sessionError || !session) {
      console.log(`Invalid session: ${sessionToken.substring(0, 8)}... from ${clientIP}`);
      return new Response(new Uint8Array([0xFF, 0x02, 0x00, 0x00]), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/octet-stream" }
      });
    }

    // Verify HWID if provided
    if (hwid && session.hwid_hash && session.hwid_hash !== hwid.substring(0, 32)) {
      console.log(`HWID mismatch for session ${sessionToken.substring(0, 8)}...`);
      return new Response(new Uint8Array([0xFF, 0x03, 0x00, 0x00]), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/octet-stream" }
      });
    }

    // Get script content
    const scriptContent = session.scripts?.content;
    if (!scriptContent) {
      return new Response(new Uint8Array([0xFF, 0x04, 0x00, 0x00]), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/octet-stream" }
      });
    }

    // Generate encryption key from session data
    const encryptionKey = `${sessionToken.substring(0, 16)}:${session.context_hash}:${Date.now()}`;
    const salt = session.hwid_hash?.substring(0, 16) || crypto.randomUUID().replace(/-/g, '').substring(0, 16);

    // Handle different delivery modes
    if (mode === "chunked") {
      // Chunked delivery for large scripts
      const CHUNK_SIZE = 4096;
      const scriptBytes = new TextEncoder().encode(scriptContent);
      const totalChunks = Math.ceil(scriptBytes.length / CHUNK_SIZE);

      if (chunkIndex >= totalChunks) {
        // End of stream
        return new Response(new Uint8Array([0x00, 0xFF, 0xFF, 0xFF]), {
          status: 200,
          headers: { 
            ...corsHeaders, 
            "Content-Type": "application/octet-stream",
            "X-Chunk-Index": chunkIndex.toString(),
            "X-Chunk-Total": totalChunks.toString(),
            "X-Chunk-Complete": "true"
          }
        });
      }

      // Get chunk
      const start = chunkIndex * CHUNK_SIZE;
      const end = Math.min(start + CHUNK_SIZE, scriptBytes.length);
      const chunkData = scriptBytes.slice(start, end);

      // Encrypt chunk
      const chunkKey = `${encryptionKey}:${chunkIndex}`;
      const encrypted = xorEncryptBytes(chunkData, chunkKey, salt);

      // Update session activity
      await supabase
        .from("delivery_sessions")
        .update({ 
          last_activity: new Date().toISOString(),
          delivered_chunks: [...(session.delivered_chunks || []), chunkIndex]
        })
        .eq("id", session.id);

      return new Response(encrypted.buffer as ArrayBuffer, {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/octet-stream",
          "X-Chunk-Index": chunkIndex.toString(),
          "X-Chunk-Total": totalChunks.toString(),
          "X-Chunk-Key": chunkKey.substring(0, 8),
          "X-Salt": salt.substring(0, 8)
        }
      });
    }

    // Full binary stream
    const binaryStream = createBinaryStream(scriptContent, encryptionKey, salt);

    // Update session
    await supabase
      .from("delivery_sessions")
      .update({ 
        last_activity: new Date().toISOString(),
        delivered_chunks: [0] // Mark as fully delivered
      })
      .eq("id", session.id);

    console.log(`Binary delivery: ${session.scripts?.name} (${binaryStream.length} bytes) to ${clientIP}`);

    if (mode === "stream") {
      // Raw binary stream
      return new Response(binaryStream.buffer as ArrayBuffer, {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/octet-stream",
          "Content-Length": binaryStream.length.toString(),
          "X-Stream-Size": binaryStream.length.toString(),
          "X-Encryption-Key": encryptionKey.substring(0, 8) + "...",
          "X-Salt": salt.substring(0, 8) + "..."
        }
      });
    }

    // Base64 mode (default - for HTTP compatibility)
    const base64Stream = uint8ArrayToBase64(binaryStream);
    
    return new Response(JSON.stringify({
      stream: base64Stream,
      size: binaryStream.length,
      checksum: calculateChecksum(new TextEncoder().encode(scriptContent)),
      key_hint: encryptionKey.substring(0, 8),
      salt_hint: salt.substring(0, 8),
      mode: "binary_b64"
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (error) {
    console.error("Binary delivery error:", error);
    return new Response(new Uint8Array([0xFF, 0xFF, 0x00, 0x00]), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/octet-stream" }
    });
  }
});