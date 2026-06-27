import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.2";
import { corsHeaders } from "../_shared/shared-utils.ts";

// Dashboard fire/poll:
//   - Lua scripts FIRE values (direction='up', script -> dashboard)
//   - Dashboard FIREs toggles (direction='down', dashboard -> script)
//   - Lua POLLs for 'down' updates
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  try {
    const body = await req.json();
    const { op, script_id, key_id, component_id, value, direction } = body;
    if (!script_id || !component_id) {
      return new Response(JSON.stringify({ ok: false, error: "missing params" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    if (op === "fire") {
      // Script -> dashboard (telemetry)
      await supabase.from("dashboard_components").upsert({
        script_id, key_id: key_id ?? null, component_id,
        value, direction: direction || "up",
        updated_at: new Date().toISOString(),
      }, { onConflict: "script_id,key_id,component_id" });
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    if (op === "poll") {
      // Script polls for dashboard-driven toggles
      const { data } = await supabase.from("dashboard_components")
        .select("value, updated_at").eq("script_id", script_id)
        .eq("key_id", key_id).eq("component_id", component_id)
        .eq("direction", "down").maybeSingle();
      return new Response(JSON.stringify({ ok: true, value: data?.value ?? null, updated_at: data?.updated_at ?? null }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    return new Response(JSON.stringify({ ok: false, error: "invalid op" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
