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
    description: "Set the active script for this server",
    options: [
      {
        name: "script_id",
        description: "The Script ID from your dashboard",
        type: 3,
        required: true,
      },
    ],
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

    // Get user_id from request body
    let userId: string | null = null;
    
    try {
      const body = await req.json();
      userId = body.user_id;
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

    console.log("Registering Discord commands for user:", userId);

    // Get the user's discord server config with bot token
    const { data: config, error: configError } = await supabase
      .from("discord_servers")
      .select("bot_token")
      .eq("user_id", userId)
      .not("bot_token", "is", null)
      .maybeSingle();

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

    if (!config?.bot_token) {
      return new Response(
        JSON.stringify({ error: "No bot token configured. Please save your bot credentials first." }),
        { 
          status: 400, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    // Get the bot's application ID by making a request to Discord
    const meResponse = await fetch("https://discord.com/api/v10/users/@me", {
      headers: {
        "Authorization": `Bot ${config.bot_token}`,
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

    // Register global commands
    const response = await fetch(
      `https://discord.com/api/v10/applications/${applicationId}/commands`,
      {
        method: "PUT",
        headers: {
          "Authorization": `Bot ${config.bot_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(commands),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.error("Failed to register commands:", error);
      return new Response(
        JSON.stringify({ error: "Failed to register commands", details: error }),
        { 
          status: 500, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    const data = await response.json();
    console.log("Commands registered successfully:", data.length, "commands");

    return new Response(
      JSON.stringify({ success: true, commands: data.length }),
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
