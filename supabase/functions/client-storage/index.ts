import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.2";
import { corsHeaders } from "../_shared/shared-utils.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  try {
    const { op, script_id, key_id, hwid, storage_id, value, overwrite } = await req.json();
    if (!script_id || !key_id || !storage_id) {
      return new Response(JSON.stringify({ ok: false, error: "missing params" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    if (op === "get") {
      const { data } = await supabase.from("client_storage")
        .select("value").eq("script_id", script_id).eq("key_id", key_id)
        .eq("storage_id", storage_id).maybeSingle();
      return new Response(JSON.stringify({ ok: true, value: data?.value ?? null }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }
    if (op === "delete") {
      await supabase.from("client_storage").delete()
        .eq("script_id", script_id).eq("key_id", key_id).eq("storage_id", storage_id);
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }
    if (op === "set") {
      if (overwrite === false) {
        const { data: existing } = await supabase.from("client_storage")
          .select("id").eq("script_id", script_id).eq("key_id", key_id)
          .eq("storage_id", storage_id).maybeSingle();
        if (existing) {
          return new Response(JSON.stringify({ ok: false, error: "exists" }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
        }
      }
      await supabase.from("client_storage").upsert({
        script_id, key_id, hwid: hwid?.substring(0, 64) ?? null,
        storage_id, value, updated_at: new Date().toISOString(),
      }, { onConflict: "script_id,key_id,storage_id" });
      return new Response(JSON.stringify({ ok: true }), {
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
