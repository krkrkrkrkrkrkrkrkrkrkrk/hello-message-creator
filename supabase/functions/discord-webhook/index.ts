import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-api-key",
};

interface WebhookPayload {
  script_id: string;
  event_type: "key_validated" | "key_created" | "key_expired" | "hwid_reset" | "execution" | "custom";
  username?: string;
  hwid?: string;
  key?: string;
  expires_at?: string;
  is_premium?: boolean;
  ip_address?: string;
  executor?: string;
  country?: string;
  additional_info?: string;
  success?: boolean;
}

function createEmbed(payload: WebhookPayload): Record<string, unknown> {
  const eventColors: Record<string, number> = {
    key_validated: 0x00FF00, // Green
    key_created: 0x5865F2,   // Blurple
    key_expired: 0xFF6B6B,   // Red
    hwid_reset: 0xFFA500,    // Orange
    execution: 0x00D4FF,     // Cyan
    custom: 0x9B59B6,        // Purple
  };

  const eventTitles: Record<string, string> = {
    key_validated: "✅ Key Validated",
    key_created: "🔑 Key Created",
    key_expired: "⏰ Key Expired",
    hwid_reset: "🔄 HWID Reset",
    execution: "▶️ Script Executed",
    custom: "📢 Custom Event",
  };

  const fields: Array<{ name: string; value: string; inline: boolean }> = [];

  if (payload.username) {
    fields.push({ name: "👤 Username", value: payload.username, inline: true });
  }
  if (payload.key) {
    fields.push({ name: "🔑 Key", value: `\`${payload.key.substring(0, 20)}...\``, inline: true });
  }
  if (payload.executor) {
    fields.push({ name: "⚙️ Executor", value: payload.executor, inline: true });
  }
  if (payload.country) {
    fields.push({ name: "🌍 Country", value: payload.country, inline: true });
  }
  if (payload.ip_address) {
    fields.push({ name: "🌐 IP", value: `\`${payload.ip_address}\``, inline: true });
  }
  if (payload.hwid) {
    fields.push({ name: "💻 HWID", value: `\`${payload.hwid.substring(0, 16)}...\``, inline: true });
  }
  if (payload.expires_at) {
    fields.push({ name: "📅 Expires", value: new Date(payload.expires_at).toLocaleString(), inline: true });
  }
  if (payload.is_premium !== undefined) {
    fields.push({ name: "⭐ Premium", value: payload.is_premium ? "Yes" : "No", inline: true });
  }
  if (payload.additional_info) {
    fields.push({ name: "ℹ️ Info", value: payload.additional_info, inline: false });
  }

  return {
    embeds: [{
      title: eventTitles[payload.event_type] || "📢 Event",
      color: eventColors[payload.event_type] || 0x5865F2,
      fields,
      timestamp: new Date().toISOString(),
      footer: {
        text: "ShadowAuth • Powered by Luraph",
        icon_url: "https://cdn.discordapp.com/embed/avatars/0.png"
      }
    }]
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  try {
    const payload: WebhookPayload = await req.json();
    
    if (!payload.script_id || !payload.event_type) {
      return new Response(
        JSON.stringify({ error: "Missing script_id or event_type" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get script webhook settings
    const { data: script, error: scriptError } = await supabase
      .from("scripts")
      .select("discord_webhook_url, discord_webhook_enabled")
      .eq("id", payload.script_id)
      .single();

    if (scriptError || !script) {
      return new Response(
        JSON.stringify({ error: "Script not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!script.discord_webhook_enabled || !script.discord_webhook_url) {
      return new Response(
        JSON.stringify({ success: true, message: "Webhook disabled" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create Discord embed
    const embedPayload = createEmbed(payload);
    
    // Send to Discord
    const discordResponse = await fetch(script.discord_webhook_url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(embedPayload),
    });

    // Log the webhook attempt
    await supabase.from("webhook_logs").insert({
      script_id: payload.script_id,
      event_type: payload.event_type,
      payload: payload,
      status: discordResponse.ok ? "success" : "failed",
      response_code: discordResponse.status,
    });

    if (!discordResponse.ok) {
      const errorText = await discordResponse.text();
      console.error("Discord webhook failed:", errorText);
      return new Response(
        JSON.stringify({ error: "Discord webhook failed", details: errorText }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, message: "Webhook sent successfully" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    console.error("Webhook error:", error);
    const errorMessage = error instanceof Error ? error.message : "Internal server error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
