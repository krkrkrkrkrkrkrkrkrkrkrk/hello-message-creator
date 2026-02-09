import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-shadow-sig",
  "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
  "Pragma": "no-cache",
};

async function sha256_32hex(data: string): Promise<string> {
  const encoder = new TextEncoder();
  const hashBuffer = await crypto.subtle.digest("SHA-256", encoder.encode(data));
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("").substring(0, 32);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const scriptId = (body?.scriptId || body?.script_id || "").toString();

    if (!scriptId || scriptId.length < 30) {
      return new Response(JSON.stringify({ ok: false, error: "missing_script_id" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabase = createClient(
      supabaseUrl,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: script, error: scriptErr } = await supabase
      .from("scripts")
      .select("id, content")
      .eq("id", scriptId)
      .maybeSingle();

    if (scriptErr || !script) {
      return new Response(JSON.stringify({ ok: false, error: "script_not_found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const version = await sha256_32hex(script.content || "");
    const t0 = Date.now();

    // Warm layers 2-5. Loader will persist into script_builds.
    const layers = ["2", "3", "4", "5"] as const;
    const results: Array<{ layer: string; status: number; ms: number }> = [];

    for (const layer of layers) {
      const start = Date.now();
      const res = await fetch(`${supabaseUrl}/functions/v1/loader/${scriptId}?layer=${layer}&v=${version}`, {
        headers: { "x-shadow-sig": "ShadowAuth-Prebuild" },
      });
      results.push({ layer, status: res.status, ms: Date.now() - start });
    }

    return new Response(JSON.stringify({
      ok: true,
      scriptId,
      version,
      totalMs: Date.now() - t0,
      results,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: "server_error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

