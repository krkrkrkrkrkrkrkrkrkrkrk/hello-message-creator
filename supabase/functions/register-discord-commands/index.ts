import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Define all slash commands - Luarmor-style complete set
const commands = [
  {
    name: "login",
    description: "Link your ShadowAuth account to this Discord server",
    options: [
      {
        name: "api_key",
        description: "Your ShadowAuth API key (find it in Developer Settings)",
        type: 3,
        required: true,
      },
    ],
  },
  {
    name: "setproject",
    description: "Set the active script for this server (shows your projects)",
    // No options - will show dropdown with user's projects
  },
  {
    name: "setbuyerrole",
    description: "Set the role to give to whitelisted users",
    options: [
      {
        name: "role",
        description: "The buyer role",
        type: 8,
        required: true,
      },
    ],
  },
  {
    name: "setmanagerrole",
    description: "Set the role for users who can manage keys",
    options: [
      {
        name: "role",
        description: "The manager role",
        type: 8,
        required: true,
      },
    ],
  },
  {
    name: "whitelist",
    description: "Whitelist a user and DM them their key",
    options: [
      {
        name: "user",
        description: "The user to whitelist",
        type: 6,
        required: true,
      },
      {
        name: "days",
        description: "Key duration in days (empty = lifetime)",
        type: 4,
        required: false,
      },
      {
        name: "note",
        description: "Note for this key",
        type: 3,
        required: false,
      },
    ],
  },
  {
    name: "unwhitelist",
    description: "Remove a user's key and access completely",
    options: [
      {
        name: "user",
        description: "The user to unwhitelist",
        type: 6,
        required: true,
      },
    ],
  },
  {
    name: "blacklist",
    description: "Ban a user's key and remove their access",
    options: [
      {
        name: "user",
        description: "The user to blacklist",
        type: 6,
        required: true,
      },
      {
        name: "reason",
        description: "Reason for the blacklist",
        type: 3,
        required: false,
      },
    ],
  },
  {
    name: "resethwid",
    description: "Reset your own HWID",
  },
  {
    name: "force-resethwid",
    description: "Force reset a user's HWID (manager only)",
    options: [
      {
        name: "user",
        description: "The user to reset HWID for",
        type: 6,
        required: true,
      },
    ],
  },
  {
    name: "getstats",
    description: "Get statistics for the current script",
  },
  {
    name: "getkey",
    description: "Get your script loader via DM",
  },
  {
    name: "controlpanel",
    description: "Create a control panel with buttons for users",
  },
  {
    name: "redeem",
    description: "Redeem a key to link it to your Discord",
    options: [
      {
        name: "key",
        description: "The key to redeem",
        type: 3,
        required: true,
      },
    ],
  },
  {
    name: "compensate",
    description: "Add days to all time-limited keys (owner only)",
    options: [
      {
        name: "days",
        description: "Number of days to add",
        type: 4,
        required: true,
      },
    ],
  },
  {
    name: "setlogs",
    description: "Set a webhook for logging all actions",
    options: [
      {
        name: "webhook",
        description: "Discord webhook URL",
        type: 3,
        required: true,
      },
    ],
  },
  {
    name: "mass-whitelist",
    description: "Whitelist all users with a specific role (owner only)",
    options: [
      {
        name: "role",
        description: "The role to whitelist",
        type: 8,
        required: true,
      },
      {
        name: "days",
        description: "Key duration in days (empty = lifetime)",
        type: 4,
        required: false,
      },
    ],
  },
];

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Get user_id and guild_id from request body
    let userId: string | null = null;
    let requestedGuildId: string | null = null;
    
    try {
      const body = await req.json();
      userId = body.user_id;
      requestedGuildId = body.guild_id;
    } catch {
      // No body or invalid JSON
    }

    if (!userId) {
      return new Response(
        JSON.stringify({ error: "user_id is required" }),
        { 
          status: 400, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    console.log("Registering Discord commands for user:", userId, "guild:", requestedGuildId);

    // Get the config for the specific guild_id if provided, otherwise get the most recent
    let configQuery = supabase
      .from("discord_servers")
      .select("bot_token, guild_id")
      .eq("user_id", userId)
      .not("bot_token", "is", null);
    
    if (requestedGuildId && /^\d+$/.test(requestedGuildId)) {
      // If a specific guild_id is requested, get that config
      configQuery = configQuery.eq("guild_id", requestedGuildId);
    }
    
    const { data: configs, error: configError } = await configQuery
      .order("created_at", { ascending: false });

    if (configError) {
      console.error("Error fetching config:", configError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch configuration" }),
        { 
          status: 500, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    if (!configs || configs.length === 0 || !configs[0]?.bot_token) {
      return new Response(
        JSON.stringify({ error: "No bot token configured for this server. Please save your bot credentials first." }),
        { 
          status: 400, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    const botToken = configs[0].bot_token;
    
    // Filter out placeholder guild_ids (pending_...) - only use real Discord snowflake IDs
    // Discord snowflakes are numeric strings, so we filter out anything that's not purely numeric
    const guildIds = Array.from(
      new Set(
        configs
          .map((c) => c.guild_id)
          .filter((id): id is string => 
            id != null && 
            !id.startsWith("pending_") && 
            /^\d+$/.test(id) // Only allow numeric snowflake IDs
          )
      )
    );

    // Get the bot's application ID by making a request to Discord
    const meResponse = await fetch("https://discord.com/api/v10/users/@me", {
      headers: {
        "Authorization": `Bot ${botToken}`,
      },
    });

    if (!meResponse.ok) {
      const error = await meResponse.text();
      console.error("Failed to get bot info:", error);
      return new Response(
        JSON.stringify({ error: "Invalid bot token. Please check your token and try again." }),
        { 
          status: 400, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    const botInfo = await meResponse.json();
    const applicationId = botInfo.id;

    console.log("Bot application ID:", applicationId);

    const putCommands = async (url: string) => {
      const resp = await fetch(url, {
        method: "PUT",
        headers: {
          "Authorization": `Bot ${botToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(commands),
      });

      if (!resp.ok) {
        const errorText = await resp.text();
        throw new Error(errorText);
      }

      return await resp.json();
    };

    // Register guild commands first (instant update in that server)
    const guildResults: Array<{ guild_id: string; commands: number }> = [];
    for (const guildId of guildIds) {
      // First, check if bot is in the guild
      const guildCheckResp = await fetch(`https://discord.com/api/v10/guilds/${guildId}`, {
        headers: { "Authorization": `Bot ${botToken}` },
      });
      
      if (!guildCheckResp.ok) {
        const guildError = await guildCheckResp.text();
        console.error("Bot not in guild or cannot access:", guildId, guildError);
        
        // Build OAuth2 invite URL for the user
        const inviteUrl = `https://discord.com/api/oauth2/authorize?client_id=${applicationId}&permissions=8&scope=bot%20applications.commands&guild_id=${guildId}`;
        
        return new Response(
          JSON.stringify({
            error: "Bot não está no servidor ou falta o scope applications.commands",
            guild_id: guildId,
            solution: "Re-adicione o bot usando o link abaixo (inclui bot + applications.commands)",
            invite_url: inviteUrl,
            details: guildError,
          }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      
      try {
        const guildData = await putCommands(
          `https://discord.com/api/v10/applications/${applicationId}/guilds/${guildId}/commands`
        );
        guildResults.push({ guild_id: guildId, commands: guildData.length ?? 0 });
        console.log("Guild commands registered:", guildId, guildData.length, "commands");
      } catch (e) {
        console.error("Failed to register guild commands:", guildId, e);
        
        const inviteUrl = `https://discord.com/api/oauth2/authorize?client_id=${applicationId}&permissions=8&scope=bot%20applications.commands&guild_id=${guildId}`;
        
        return new Response(
          JSON.stringify({
            error: "Falha ao registrar comandos - verifique se o bot foi adicionado com scope applications.commands",
            guild_id: guildId,
            solution: "Re-adicione o bot usando este link:",
            invite_url: inviteUrl,
            details: String(e),
          }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
    }

    // Skip global commands registration to avoid duplicates
    // Guild commands are instant and sufficient for user's own bot
    // Global commands would cause duplicates (guild + global both appear)

    return new Response(
      JSON.stringify({
        success: true,
        guilds_updated: guildResults.length,
        guilds: guildResults,
        message: "Commands registered to your server(s). They should appear instantly!",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error registering commands:", error);
    return new Response(
      JSON.stringify({ error: "Internal error" }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});
