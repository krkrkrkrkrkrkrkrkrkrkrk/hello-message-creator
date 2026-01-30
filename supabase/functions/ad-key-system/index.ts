import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Provider-specific verification functions
async function verifyLinkvertise(apiToken: string, userId: string): Promise<boolean> {
  try {
    // Linkvertise API verification
    // https://publisher.linkvertise.com/dashboard#account -> Anti Bypassing
    const response = await fetch(`https://publisher.linkvertise.com/api/v1/redirect/link/${userId}/unlock`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${apiToken}`,
      },
    });
    const data = await response.json();
    return data.success === true || data.unlocked === true;
  } catch (e) {
    console.error("Linkvertise verification error:", e);
    return false;
  }
}

async function verifyLootlabs(apiToken: string, clickId: string): Promise<boolean> {
  try {
    // Lootlabs postback verification
    const response = await fetch(`https://api.lootlabs.gg/v1/verify?click_id=${clickId}`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${apiToken}`,
      },
    });
    const data = await response.json();
    return data.verified === true || data.status === "completed";
  } catch (e) {
    console.error("Lootlabs verification error:", e);
    return false;
  }
}

async function verifyWorkink(apiToken: string, linkId: string): Promise<boolean> {
  try {
    // Work.ink API verification
    const response = await fetch(`https://api.work.ink/v1/links/${linkId}/verify`, {
      method: "GET",
      headers: {
        "Authorization": apiToken,
      },
    });
    const data = await response.json();
    return data.completed === true;
  } catch (e) {
    console.error("Work.ink verification error:", e);
    return false;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const url = new URL(req.url);
    const action = url.searchParams.get("action");

    // Get client IP
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0] || 
               req.headers.get("cf-connecting-ip") || 
               "unknown";

    if (action === "start") {
      // Start a new ad key session
      const { script_id, hwid } = await req.json();

      if (!script_id) {
        return new Response(
          JSON.stringify({ error: "Script ID is required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Check if ad key system is enabled for this script
      const { data: settings } = await supabase
        .from("ad_key_settings")
        .select("*")
        .eq("script_id", script_id)
        .eq("enabled", true)
        .maybeSingle();

      if (!settings) {
        return new Response(
          JSON.stringify({ error: "Ad key system not enabled for this script" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Get checkpoints for this script
      const { data: checkpoints } = await supabase
        .from("ad_checkpoints")
        .select("id, checkpoint_order, provider, provider_url, anti_bypass_enabled")
        .eq("script_id", script_id)
        .order("checkpoint_order", { ascending: true });

      const totalSteps = checkpoints?.length || settings.checkpoint_count || 3;

      // Check for existing session from same IP/HWID
      let existingSession = null;
      if (hwid) {
        const { data } = await supabase
          .from("ad_key_sessions")
          .select("*")
          .eq("script_id", script_id)
          .eq("hwid", hwid)
          .is("completed_at", null)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        existingSession = data;
      }

      if (!existingSession) {
        const { data } = await supabase
          .from("ad_key_sessions")
          .select("*")
          .eq("script_id", script_id)
          .eq("ip_address", ip)
          .is("completed_at", null)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        existingSession = data;
      }

      if (existingSession) {
        // Check if session is stale (>70 minutes without activity)
        const lastActivity = new Date(existingSession.last_activity_at || existingSession.created_at);
        const now = new Date();
        const minutesSinceActivity = (now.getTime() - lastActivity.getTime()) / 1000 / 60;
        
        if (minutesSinceActivity > 70) {
          // Reset stale session
          await supabase
            .from("ad_key_sessions")
            .update({ 
              current_step: 0, 
              step1_completed_at: null,
              step2_completed_at: null,
              step3_completed_at: null,
              last_activity_at: now.toISOString()
            })
            .eq("id", existingSession.id);
          
          existingSession.current_step = 0;
        }

        // Return existing session progress with checkpoint info
        return new Response(
          JSON.stringify({
            session_token: existingSession.session_token,
            current_step: existingSession.current_step,
            total_steps: totalSteps,
            generated_key: existingSession.generated_key,
            completed: !!existingSession.completed_at,
            checkpoints: checkpoints?.map(c => ({
              order: c.checkpoint_order,
              provider: c.provider,
              url: c.provider_url,
              anti_bypass: c.anti_bypass_enabled
            })) || []
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Create new session
      const { data: newSession, error } = await supabase
        .from("ad_key_sessions")
        .insert({
          script_id,
          ip_address: ip,
          hwid: hwid || null,
          total_steps: totalSteps,
          last_activity_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) {
        console.error("Error creating session:", error);
        return new Response(
          JSON.stringify({ error: "Failed to create session" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({
          session_token: newSession.session_token,
          current_step: 0,
          total_steps: totalSteps,
          completed: false,
          checkpoints: checkpoints?.map(c => ({
            order: c.checkpoint_order,
            provider: c.provider,
            url: c.provider_url,
            anti_bypass: c.anti_bypass_enabled
          })) || []
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "get_checkpoint_url") {
      // Get redirect URL for a specific checkpoint
      const { session_token, step } = await req.json();

      if (!session_token || step === undefined) {
        return new Response(
          JSON.stringify({ error: "Session token and step are required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data: session } = await supabase
        .from("ad_key_sessions")
        .select("*")
        .eq("session_token", session_token)
        .maybeSingle();

      if (!session) {
        return new Response(
          JSON.stringify({ error: "Invalid session" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Get the checkpoint for this step
      const { data: checkpoint } = await supabase
        .from("ad_checkpoints")
        .select("*")
        .eq("script_id", session.script_id)
        .eq("checkpoint_order", step)
        .maybeSingle();

      if (!checkpoint) {
        // No specific checkpoint configured, use default flow
        return new Response(
          JSON.stringify({ 
            redirect_url: null,
            use_default_flow: true 
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Build redirect URL with callback
      const baseUrl = Deno.env.get("SUPABASE_URL");
      const callbackUrl = `${baseUrl}/functions/v1/ad-key-system?action=callback&token=${checkpoint.callback_token}&session=${session_token}&step=${step}`;
      
      let redirectUrl = checkpoint.provider_url;
      
      // Add dynamic target URL based on provider
      if (checkpoint.provider === "linkvertise") {
        // Linkvertise uses ?r= or &r= for target URL
        const separator = redirectUrl.includes("?") ? "&" : "?";
        redirectUrl = `${redirectUrl}${separator}r=${encodeURIComponent(callbackUrl)}`;
      } else if (checkpoint.provider === "lootlabs") {
        // Lootlabs uses ?destination= 
        const separator = redirectUrl.includes("?") ? "&" : "?";
        redirectUrl = `${redirectUrl}${separator}destination=${encodeURIComponent(callbackUrl)}`;
      } else if (checkpoint.provider === "workink") {
        // Work.ink uses ?url=
        const separator = redirectUrl.includes("?") ? "&" : "?";
        redirectUrl = `${redirectUrl}${separator}url=${encodeURIComponent(callbackUrl)}`;
      } else {
        // Custom provider - append callback directly
        const separator = redirectUrl.includes("?") ? "&" : "?";
        redirectUrl = `${redirectUrl}${separator}callback=${encodeURIComponent(callbackUrl)}`;
      }

      // Update session to track pending checkpoint
      await supabase
        .from("ad_key_sessions")
        .update({ 
          pending_checkpoint_id: checkpoint.id,
          checkpoint_started_at: new Date().toISOString(),
          last_activity_at: new Date().toISOString()
        })
        .eq("id", session.id);

      return new Response(
        JSON.stringify({
          redirect_url: redirectUrl,
          provider: checkpoint.provider,
          anti_bypass: checkpoint.anti_bypass_enabled
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "callback") {
      // Handle callback from ad provider
      const callbackToken = url.searchParams.get("token");
      const sessionToken = url.searchParams.get("session");
      const step = parseInt(url.searchParams.get("step") || "0");
      
      // Get additional verification params from providers
      const clickId = url.searchParams.get("click_id") || url.searchParams.get("CLICK_ID");
      const uniqueId = url.searchParams.get("unique_id") || url.searchParams.get("UNIQUE_ID");

      if (!callbackToken || !sessionToken) {
        // Redirect to error page
        return new Response(null, {
          status: 302,
          headers: { 
            ...corsHeaders, 
            "Location": `/get_key?error=invalid_callback` 
          }
        });
      }

      // Verify callback token matches checkpoint
      const { data: checkpoint } = await supabase
        .from("ad_checkpoints")
        .select("*")
        .eq("callback_token", callbackToken)
        .maybeSingle();

      if (!checkpoint) {
        return new Response(null, {
          status: 302,
          headers: { 
            ...corsHeaders, 
            "Location": `/get_key?error=invalid_token` 
          }
        });
      }

      // Get session
      const { data: session } = await supabase
        .from("ad_key_sessions")
        .select("*")
        .eq("session_token", sessionToken)
        .maybeSingle();

      if (!session) {
        return new Response(null, {
          status: 302,
          headers: { 
            ...corsHeaders, 
            "Location": `/get_key?error=invalid_session` 
          }
        });
      }

      // Verify with provider if anti-bypass is enabled
      let verified = true;
      if (checkpoint.anti_bypass_enabled && checkpoint.api_token) {
        if (checkpoint.provider === "linkvertise") {
          verified = await verifyLinkvertise(checkpoint.api_token, uniqueId || clickId || "");
        } else if (checkpoint.provider === "lootlabs") {
          verified = await verifyLootlabs(checkpoint.api_token, clickId || "");
        } else if (checkpoint.provider === "workink") {
          verified = await verifyWorkink(checkpoint.api_token, clickId || "");
        }
      }

      if (!verified) {
        return new Response(null, {
          status: 302,
          headers: { 
            ...corsHeaders, 
            "Location": `/get_key?for=${session.script_id}&error=verification_failed` 
          }
        });
      }

      // Complete the step
      const updates: Record<string, unknown> = {
        current_step: step,
        pending_checkpoint_id: null,
        checkpoint_started_at: null,
        last_activity_at: new Date().toISOString()
      };

      if (step === 1) updates.step1_completed_at = new Date().toISOString();
      if (step === 2) updates.step2_completed_at = new Date().toISOString();
      if (step === 3) updates.step3_completed_at = new Date().toISOString();

      // Check if all steps completed
      if (step >= session.total_steps) {
        // Generate key
        const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
        let key = "ADKEY-";
        for (let i = 0; i < 16; i++) {
          if (i > 0 && i % 4 === 0) key += "-";
          key += chars.charAt(Math.floor(Math.random() * chars.length));
        }

        // Get settings for key duration
        const { data: settings } = await supabase
          .from("ad_key_settings")
          .select("key_duration_hours")
          .eq("script_id", session.script_id)
          .maybeSingle();

        const keyExpiresAt = new Date();
        keyExpiresAt.setHours(keyExpiresAt.getHours() + (settings?.key_duration_hours ?? 24));

        updates.generated_key = key;
        updates.key_expires_at = keyExpiresAt.toISOString();
        updates.completed_at = new Date().toISOString();

        // Create script_key entry
        await supabase.from("script_keys").insert({
          script_id: session.script_id,
          key_value: key,
          expires_at: keyExpiresAt.toISOString(),
          duration_type: "ad_key",
          note: "Ad Key generated from ad system"
        });
      }

      await supabase
        .from("ad_key_sessions")
        .update(updates)
        .eq("id", session.id);

      // Redirect back to get_key page
      return new Response(null, {
        status: 302,
        headers: { 
          ...corsHeaders, 
          "Location": `/get_key?for=${session.script_id}` 
        }
      });
    }

    if (action === "complete_step") {
      // Manual step completion (for non-checkpoint or testing)
      const { session_token, step } = await req.json();

      if (!session_token || step === undefined) {
        return new Response(
          JSON.stringify({ error: "Session token and step are required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Get session
      const { data: session, error: sessionError } = await supabase
        .from("ad_key_sessions")
        .select("*")
        .eq("session_token", session_token)
        .maybeSingle();

      if (sessionError || !session) {
        console.error("Invalid session:", sessionError);
        return new Response(
          JSON.stringify({ error: "Invalid session" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (session.completed_at) {
        return new Response(
          JSON.stringify({
            current_step: session.total_steps,
            total_steps: session.total_steps,
            generated_key: session.generated_key,
            completed: true,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Validate step order
      if (step !== session.current_step + 1) {
        return new Response(
          JSON.stringify({ error: "Invalid step order" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Check if there's a checkpoint for this step that requires redirect
      const { data: checkpoint } = await supabase
        .from("ad_checkpoints")
        .select("id, provider_url, anti_bypass_enabled")
        .eq("script_id", session.script_id)
        .eq("checkpoint_order", step)
        .maybeSingle();

      if (checkpoint && checkpoint.provider_url) {
        // Checkpoint exists - require redirect flow
        return new Response(
          JSON.stringify({ 
            error: "This checkpoint requires completing the ad link",
            requires_redirect: true,
            checkpoint_id: checkpoint.id
          }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Load settings for duration
      const { data: settings, error: settingsError } = await supabase
        .from("ad_key_settings")
        .select("*")
        .eq("script_id", session.script_id)
        .maybeSingle();

      if (settingsError) console.error("Error loading ad key settings:", settingsError);

      const updates: Record<string, unknown> = {
        current_step: step,
        last_activity_at: new Date().toISOString()
      };

      // Record step completion time
      if (step === 1) updates.step1_completed_at = new Date().toISOString();
      if (step === 2) updates.step2_completed_at = new Date().toISOString();
      if (step === 3) updates.step3_completed_at = new Date().toISOString();

      // Check if all steps completed
      if (step >= session.total_steps) {
        // Generate key
        const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
        let key = "ADKEY-";
        for (let i = 0; i < 16; i++) {
          if (i > 0 && i % 4 === 0) key += "-";
          key += chars.charAt(Math.floor(Math.random() * chars.length));
        }

        const keyExpiresAt = new Date();
        keyExpiresAt.setHours(
          keyExpiresAt.getHours() + (settings?.key_duration_hours ?? 24)
        );

        updates.generated_key = key;
        updates.key_expires_at = keyExpiresAt.toISOString();
        updates.completed_at = new Date().toISOString();

        // Also create a script_key entry for this generated key
        await supabase.from("script_keys").insert({
          script_id: session.script_id,
          key_value: key,
          expires_at: keyExpiresAt.toISOString(),
          duration_type: "ad_key",
          note: `Ad Key generated from session ${session.id}`
        });
      }

      const { error: updateError } = await supabase
        .from("ad_key_sessions")
        .update(updates)
        .eq("id", session.id);

      if (updateError) {
        console.error("Error updating session:", updateError);
        return new Response(
          JSON.stringify({ error: "Failed to update session" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({
          current_step: step,
          total_steps: session.total_steps,
          generated_key: updates.generated_key || null,
          completed: step >= session.total_steps
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "verify_key") {
      const { key, script_id } = await req.json();

      if (!key || !script_id) {
        return new Response(
          JSON.stringify({ valid: false, error: "Key and script_id required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Check if key exists and is valid
      const { data: keyData } = await supabase
        .from("script_keys")
        .select("*")
        .eq("script_id", script_id)
        .eq("key_value", key)
        .eq("is_banned", false)
        .maybeSingle();

      if (!keyData) {
        return new Response(
          JSON.stringify({ valid: false, error: "Invalid key" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Check expiry
      if (keyData.expires_at && new Date(keyData.expires_at) < new Date()) {
        return new Response(
          JSON.stringify({ valid: false, error: "Key expired" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({
          valid: true,
          expires_at: keyData.expires_at,
          duration_type: keyData.duration_type
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "get_status") {
      const session_token = url.searchParams.get("session_token");

      if (!session_token) {
        return new Response(
          JSON.stringify({ error: "Session token required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data: session } = await supabase
        .from("ad_key_sessions")
        .select("*")
        .eq("session_token", session_token)
        .maybeSingle();

      if (!session) {
        return new Response(
          JSON.stringify({ error: "Session not found" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Get checkpoints
      const { data: checkpoints } = await supabase
        .from("ad_checkpoints")
        .select("checkpoint_order, provider, provider_url, anti_bypass_enabled")
        .eq("script_id", session.script_id)
        .order("checkpoint_order", { ascending: true });

      return new Response(
        JSON.stringify({
          current_step: session.current_step,
          total_steps: session.total_steps,
          generated_key: session.generated_key,
          completed: !!session.completed_at,
          key_expires_at: session.key_expires_at,
          checkpoints: checkpoints?.map(c => ({
            order: c.checkpoint_order,
            provider: c.provider,
            url: c.provider_url,
            anti_bypass: c.anti_bypass_enabled
          })) || []
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "reset_session") {
      // Allow users to reset their session (like Luarmor's "Forget Browser")
      const { session_token } = await req.json();

      if (!session_token) {
        return new Response(
          JSON.stringify({ error: "Session token required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { error } = await supabase
        .from("ad_key_sessions")
        .delete()
        .eq("session_token", session_token);

      if (error) {
        console.error("Error deleting session:", error);
        return new Response(
          JSON.stringify({ error: "Failed to reset session" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Invalid action" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Ad key system error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});