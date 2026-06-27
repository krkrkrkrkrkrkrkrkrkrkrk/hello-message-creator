import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.2";
import { corsHeaders } from "../_shared/shared-utils.ts";

// WBHF_SECURE_REQUEST proxy. Hides destination URL from HTTP spies by
// terminating the outbound request on our edge. Per-script host allowlist
// enforced via secure_proxy_allowlist (empty allowlist = wide open for that script).
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  try {
    const { script_id, request: r } = await req.json();
    if (!script_id || !r || !r.Url) {
      return new Response(JSON.stringify({ ok: false, error: "missing params" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Check allowlist
    const { data: allow } = await supabase.from("secure_proxy_allowlist")
      .select("host").eq("script_id", script_id);
    if (allow && allow.length > 0) {
      const host = (() => { try { return new URL(r.Url).host; } catch { return ""; } })();
      const ok = allow.some((a: { host: string }) => host === a.host || host.endsWith("." + a.host));
      if (!ok) {
        return new Response(JSON.stringify({ ok: false, error: "host not allowed" }), {
          status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }
    }

    const upstream = await fetch(r.Url, {
      method: r.Method || "GET",
      headers: r.Headers || {},
      body: r.Body || undefined,
    });
    const body = await upstream.text();
    return new Response(JSON.stringify({
      ok: true, StatusCode: upstream.status, Body: body,
      Headers: Object.fromEntries(upstream.headers.entries()),
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
