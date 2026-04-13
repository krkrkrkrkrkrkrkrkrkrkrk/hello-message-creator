import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.2";
// @ts-ignore - tweetnacl from esm.sh
import nacl from "https://esm.sh/tweetnacl@1.0.3";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// Store for dynamic bot token (set per request based on guild)
let currentBotToken: string = "";

// Convert hex string to Uint8Array
function hexToUint8Array(hex: string): Uint8Array {
  const matches = hex.match(/.{1,2}/g);
  if (!matches) return new Uint8Array();
  return new Uint8Array(matches.map((byte) => parseInt(byte, 16)));
}

async function verifyDiscordSignature(
  signature: string,
  timestamp: string,
  body: string,
  publicKey: string
): Promise<boolean> {
  if (!publicKey) {
    console.warn("No public key provided, skipping signature verification");
    return false;
  }
  
  // Clean the public key - remove whitespace, ensure only hex chars
  const cleanKey = publicKey.replace(/[^a-fA-F0-9]/g, '');
  
  if (cleanKey.length !== 64) {
    console.error(`Public key has invalid length: ${cleanKey.length} (original: ${publicKey.length}), expected 64 hex chars`);
    return false;
  }
  
  try {
    const signatureBytes = hexToUint8Array(signature);
    const publicKeyBytes = hexToUint8Array(cleanKey);
    const messageBytes = new TextEncoder().encode(timestamp + body);
    
    return nacl.sign.detached.verify(messageBytes, signatureBytes, publicKeyBytes);
  } catch (error) {
    console.error("Signature verification error:", error);
    return false;
  }
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-signature-ed25519, x-signature-timestamp",
};

const DISCORD_API = "https://discord.com/api/v10";

async function discordRequest(endpoint: string, options: RequestInit = {}, botToken?: string) {
  const token = botToken || currentBotToken;
  if (!token) {
    throw new Error("No bot token available");
  }
  
  const url = `${DISCORD_API}${endpoint}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      "Authorization": `Bot ${token}`,
      "Content-Type": "application/json",
      ...options.headers,
    },
  });
  
  if (!res.ok) {
    const error = await res.text();
    console.error(`Discord API error: ${res.status} - ${error}`);
    throw new Error(`Discord API error: ${res.status}`);
  }
  
  return res.json();
}

// Send DM with optional components (buttons)
async function sendDM(userId: string, content: string | object, components?: any[]) {
  try {
    const channel = await discordRequest("/users/@me/channels", {
      method: "POST",
      body: JSON.stringify({ recipient_id: userId }),
    });
    
    const messageBody: any = typeof content === "string" 
      ? { content } 
      : { embeds: [content] };
    
    if (components) {
      messageBody.components = components;
    }
    
    await discordRequest(`/channels/${channel.id}/messages`, {
      method: "POST",
      body: JSON.stringify(messageBody),
    });
    
    return true;
  } catch (error) {
    console.error("Failed to send DM:", error);
    return false;
  }
}

async function addRole(guildId: string, userId: string, roleId: string) {
  try {
    await discordRequest(`/guilds/${guildId}/members/${userId}/roles/${roleId}`, {
      method: "PUT",
    });
    return true;
  } catch (error) {
    console.error("Failed to add role:", error);
    return false;
  }
}

async function removeRole(guildId: string, userId: string, roleId: string) {
  try {
    await discordRequest(`/guilds/${guildId}/members/${userId}/roles/${roleId}`, {
      method: "DELETE",
    });
    return true;
  } catch (error) {
    console.error("Failed to remove role:", error);
    return false;
  }
}

function generateKey(format: string | null): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let key = '';
  for (let i = 0; i < 16; i++) {
    key += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return format ? `${format}_${key}` : key.match(/.{1,4}/g)!.join('-');
}

// Get UTC timestamp string for embeds
function getUTCTimestamp(): string {
  const now = new Date();
  return now.toISOString();
}

function formatUTCDate(): string {
  const now = new Date();
  const day = String(now.getUTCDate()).padStart(2, '0');
  const month = String(now.getUTCMonth() + 1).padStart(2, '0');
  const year = now.getUTCFullYear();
  const hours = String(now.getUTCHours()).padStart(2, '0');
  const minutes = String(now.getUTCMinutes()).padStart(2, '0');
  return `${day}/${month}/${year}, ${hours}:${minutes} UTC`;
}

function createEmbed(title: string, description: string, color: number = 0x5865F2, fields?: any[]) {
  return {
    title,
    description,
    color,
    fields,
    footer: {
      text: "Wbhf Auth - Lua Whitelist System",
      icon_url: "https://cdn.discordapp.com/embed/avatars/0.png"
    },
    timestamp: getUTCTimestamp(),
  };
}

// Handle slash commands
async function handleSlashCommand(interaction: any, supabase: any) {
  const { name, options } = interaction.data;
  const guildId = interaction.guild_id;
  const userId = interaction.member?.user?.id || interaction.user?.id;
  const userName = interaction.member?.user?.username || interaction.user?.username;

  console.log(`Handling command: ${name} from user ${userId} in guild ${guildId}`);

  switch (name) {
    case "login": {
      const apiKey = options?.find((o: any) => o.name === "api_key")?.value;
      
      if (!apiKey) {
        return createEmbed("❌ Error", "Please provide your API key.", 0xFF0000);
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("id")
        .eq("api_key", apiKey)
        .maybeSingle();

      if (!profile) {
        return createEmbed("❌ Invalid API Key", "The provided API key is invalid.", 0xFF0000);
      }

      const { error } = await supabase
        .from("discord_servers")
        .upsert({
          guild_id: guildId,
          user_id: profile.id,
          api_key: apiKey,
          updated_at: new Date().toISOString(),
        }, { onConflict: "guild_id" });

      if (error) {
        console.error("Failed to save config:", error);
        return createEmbed("❌ Error", "Failed to save configuration.", 0xFF0000);
      }

      return createEmbed(
        "✅ Successfully Logged In",
        "Your Wbhf Auth account has been linked to this server.\n\nNext steps:\n• `/setproject` - Select a script\n• `/setbuyerrole` - Set buyer role\n• `/setmanagerrole` - Set manager role\n• `/controlpanel` - Create control panel",
        0x00FF00
      );
    }

    case "setproject": {
      const { data: config } = await supabase
        .from("discord_servers")
        .select("*, scripts(name)")
        .eq("guild_id", guildId)
        .maybeSingle();

      if (!config) {
        return createEmbed("❌ Not Logged In", "Please run `/login` first.", 0xFF0000);
      }

      // Get ALL scripts for this user
      const { data: allScripts } = await supabase
        .from("scripts")
        .select("id, name")
        .eq("user_id", config.user_id)
        .order("created_at", { ascending: false });

      if (!allScripts || allScripts.length === 0) {
        return createEmbed("❌ No Projects", "You don't have any projects yet. Create one in your dashboard first.", 0xFF0000);
      }

      // If only one project, auto-select it
      if (allScripts.length === 1) {
        await supabase
          .from("discord_servers")
          .update({ script_id: allScripts[0].id })
          .eq("guild_id", guildId);

        return createEmbed("✅ Project Set", `Active script: **${allScripts[0].name}**\n\n(Auto-selected - you only have one project)`, 0x00FF00);
      }

      // Show dropdown for multiple projects
      const selectOptions = allScripts.slice(0, 25).map((script: any) => ({
        label: script.name.slice(0, 100),
        value: script.id,
        description: script.id === config.script_id ? "✅ Currently selected" : undefined,
        default: script.id === config.script_id,
      }));

      return {
        embed: {
          title: "🎮 Select Project",
          description: `You have **${allScripts.length}** projects.\n\nSelect which project to use for this server.`,
          color: 0x5865F2,
          fields: [
            { 
              name: "Current Project", 
              value: config.scripts?.name || "Not Set", 
              inline: true 
            },
            { 
              name: "Total Projects", 
              value: `${allScripts.length}`, 
              inline: true 
            },
          ],
          footer: {
            text: `Select a project below • ${formatUTCDate()}`,
          },
        },
        components: [
          {
            type: 1,
            components: [
              {
                type: 3, // SELECT_MENU
                custom_id: "setproject_select",
                placeholder: "Choose a project...",
                min_values: 1,
                max_values: 1,
                options: selectOptions,
              },
            ],
          },
        ],
        isPublic: false,
      };
    }

    case "setbuyerrole": {
      const roleId = options?.find((o: any) => o.name === "role")?.value;
      
      const { error } = await supabase
        .from("discord_servers")
        .update({ buyer_role_id: roleId })
        .eq("guild_id", guildId);

      if (error) {
        return createEmbed("❌ Error", "Failed to set buyer role.", 0xFF0000);
      }

      return createEmbed("✅ Buyer Role Set", `Buyer role: <@&${roleId}>`, 0x00FF00);
    }

    case "setmanagerrole": {
      const roleId = options?.find((o: any) => o.name === "role")?.value;
      
      const { error } = await supabase
        .from("discord_servers")
        .update({ manager_role_id: roleId })
        .eq("guild_id", guildId);

      if (error) {
        return createEmbed("❌ Error", "Failed to set manager role.", 0xFF0000);
      }

      return createEmbed("✅ Manager Role Set", `Manager role: <@&${roleId}>`, 0x00FF00);
    }

    case "whitelist": {
      const targetUser = options?.find((o: any) => o.name === "user")?.value;
      const days = options?.find((o: any) => o.name === "days")?.value;
      const note = options?.find((o: any) => o.name === "note")?.value;

      const { data: config } = await supabase
        .from("discord_servers")
        .select("*, scripts(name)")
        .eq("guild_id", guildId)
        .maybeSingle();

      if (!config) {
        return createEmbed("❌ Not Configured", "Please run `/login` first.", 0xFF0000);
      }

      const memberRoles = interaction.member?.roles || [];
      const isManager = config.manager_role_id && memberRoles.includes(config.manager_role_id);
      const isOwner = config.user_id === userId;

      if (!isManager && !isOwner) {
        return createEmbed("❌ No Permission", "You need the manager role to use this command.", 0xFF0000);
      }

      // Get ALL scripts for this user
      const { data: allScripts } = await supabase
        .from("scripts")
        .select("id, name")
        .eq("user_id", config.user_id)
        .order("created_at", { ascending: false });

      // If user has multiple scripts and no project is set, show dropdown
      if (allScripts && allScripts.length > 1 && !config.script_id) {
        const selectOptions = allScripts.slice(0, 25).map((script: any) => ({
          label: script.name.slice(0, 100),
          value: `whitelist_select:${script.id}:${targetUser}:${days || "lifetime"}:${encodeURIComponent(note || "")}`,
          description: `Select this project to whitelist`,
        }));

        return {
          embed: {
            title: "🎮 Select Project",
            description: `You have **${allScripts.length}** projects.\n\nSelect which project to whitelist <@${targetUser}> on.`,
            color: 0x5865F2,
            fields: [
              { 
                name: "User to Whitelist", 
                value: `<@${targetUser}>`, 
                inline: true 
              },
              { 
                name: "Duration", 
                value: days ? `${days} days` : "Lifetime", 
                inline: true 
              },
            ],
            footer: {
              text: `Select a project below • ${formatUTCDate()}`,
            },
          },
          components: [
            {
              type: 1,
              components: [
                {
                  type: 3, // SELECT_MENU
                  custom_id: "whitelist_project_select",
                  placeholder: "Choose a project to whitelist on...",
                  min_values: 1,
                  max_values: 1,
                  options: selectOptions,
                },
              ],
            },
          ],
          isPublic: false,
        };
      }

      // If no script is set and only one script exists, use that one
      let scriptIdToUse = config.script_id;
      let scriptNameToUse = config.scripts?.name;
      
      if (!scriptIdToUse && allScripts && allScripts.length === 1) {
        scriptIdToUse = allScripts[0].id;
        scriptNameToUse = allScripts[0].name;
        // Auto-set the project
        await supabase
          .from("discord_servers")
          .update({ script_id: scriptIdToUse })
          .eq("guild_id", guildId);
      }

      if (!scriptIdToUse) {
        return createEmbed("❌ Not Configured", "Please run `/setproject` first.", 0xFF0000);
      }

      // Fetch Discord user info to get avatar
      let discordAvatarUrl: string | null = null;
      let discordUsername: string | null = null;
      try {
        const discordUser = await discordRequest(`/users/${targetUser}`);
        if (discordUser) {
          discordUsername = discordUser.username || discordUser.global_name;
          if (discordUser.avatar) {
            const avatarFormat = discordUser.avatar.startsWith("a_") ? "gif" : "png";
            discordAvatarUrl = `https://cdn.discordapp.com/avatars/${targetUser}/${discordUser.avatar}.${avatarFormat}?size=256`;
          } else {
            const defaultAvatarIndex = parseInt(targetUser) % 5;
            discordAvatarUrl = `https://cdn.discordapp.com/embed/avatars/${defaultAvatarIndex}.png`;
          }
          console.log(`Fetched Discord avatar for ${discordUsername}: ${discordAvatarUrl}`);
        }
      } catch (avatarErr) {
        console.error("Failed to fetch Discord user avatar:", avatarErr);
      }

      const keyValue = generateKey(null);
      const expiresAt = days ? new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString() : null;

      const { error } = await supabase
        .from("script_keys")
        .insert({
          script_id: scriptIdToUse,
          key_value: keyValue,
          discord_id: targetUser,
          discord_avatar_url: discordAvatarUrl,
          expires_at: expiresAt,
          duration_type: days ? "days" : "lifetime",
          note: note || `Whitelisted by ${userName} (${discordUsername || "Unknown"})`,
        });

      if (error) {
        console.error("Failed to create key:", error);
        return createEmbed("❌ Error", "Failed to create key.", 0xFF0000);
      }

      if (config.buyer_role_id) {
        await addRole(guildId, targetUser, config.buyer_role_id);
      }

      // Send DM with key info (user redeems in control panel)
      const dmEmbed = {
        title: "🎉 You've Been Whitelisted!",
        description: `You have been granted access to **${scriptNameToUse || "the script"}**!\n\n` +
          `⏱️ **Duration:** ${days ? `${days} days` : "Lifetime"}\n\n` +
          `Go to the server and use the **Control Panel** to redeem your key.`,
        color: 0x00FF00,
        fields: [
          { name: "🔑 Your Key", value: `\`\`\`${keyValue}\`\`\``, inline: false },
        ],
        footer: {
          text: `Wbhf Auth - Lua Whitelist System • ${formatUTCDate()}`,
        },
        timestamp: getUTCTimestamp(),
      };
      
      await sendDM(targetUser, dmEmbed);

      return createEmbed(
        "✅ User Whitelisted",
        `<@${targetUser}> has been whitelisted on **${scriptNameToUse}**!\n\n**Key:** \`${keyValue}\`\n**Duration:** ${days ? `${days} days` : "Lifetime"}\n**Avatar:** ${discordAvatarUrl ? "✓ Saved" : "Default"}`,
        0x00FF00
      );
    }

    case "blacklist": {
      const targetUser = options?.find((o: any) => o.name === "user")?.value;
      const reason = options?.find((o: any) => o.name === "reason")?.value;

      const { data: config } = await supabase
        .from("discord_servers")
        .select("*")
        .eq("guild_id", guildId)
        .maybeSingle();

      if (!config || !config.script_id) {
        return createEmbed("❌ Not Configured", "Please run `/login` and `/setproject` first.", 0xFF0000);
      }

      const memberRoles = interaction.member?.roles || [];
      const isManager = config.manager_role_id && memberRoles.includes(config.manager_role_id);
      const isOwner = config.user_id === userId;

      if (!isManager && !isOwner) {
        return createEmbed("❌ No Permission", "You need the manager role to use this command.", 0xFF0000);
      }

      // Find and ban user's key
      const { data: key } = await supabase
        .from("script_keys")
        .select("*")
        .eq("script_id", config.script_id)
        .eq("discord_id", targetUser)
        .maybeSingle();

      if (!key) {
        return createEmbed("❌ No Key Found", "This user doesn't have a key for this script.", 0xFF0000);
      }

      if (key.is_banned) {
        return createEmbed("⚠️ Already Banned", "This user's key is already banned.", 0xFFAA00);
      }

      const { error } = await supabase
        .from("script_keys")
        .update({ 
          is_banned: true,
          note: `${key.note || ""} | Banned by ${userName}${reason ? `: ${reason}` : ""}`.trim()
        })
        .eq("id", key.id);

      if (error) {
        console.error("Failed to ban key:", error);
        return createEmbed("❌ Error", "Failed to ban key.", 0xFF0000);
      }

      // Remove buyer role if set
      if (config.buyer_role_id) {
        await removeRole(guildId, targetUser, config.buyer_role_id);
      }

      // DM the user about the ban
      const dmEmbed = createEmbed(
        "🚫 You've Been Blacklisted",
        `Your access to the script has been revoked.\n\n${reason ? `**Reason:** ${reason}` : "No reason provided."}`,
        0xFF0000
      );
      await sendDM(targetUser, dmEmbed);

      return createEmbed(
        "🚫 User Blacklisted",
        `<@${targetUser}> has been blacklisted!\n\n**Key:** \`${key.key_value}\`\n${reason ? `**Reason:** ${reason}` : ""}`,
        0xFF0000
      );
    }

    case "resethwid": {
      const { data: config } = await supabase
        .from("discord_servers")
        .select("*")
        .eq("guild_id", guildId)
        .maybeSingle();

      if (!config || !config.script_id) {
        return createEmbed("❌ Not Configured", "Bot is not configured for this server.", 0xFF0000);
      }

      const { data: key } = await supabase
        .from("script_keys")
        .select("*")
        .eq("script_id", config.script_id)
        .eq("discord_id", userId)
        .maybeSingle();

      if (!key) {
        return createEmbed("❌ No Key Found", "You don't have a key for this script.", 0xFF0000);
      }

      if (key.last_hwid_reset) {
        const cooldownMs = (config.hwid_reset_cooldown_hours || 24) * 60 * 60 * 1000;
        const timeSinceReset = Date.now() - new Date(key.last_hwid_reset).getTime();
        
        if (timeSinceReset < cooldownMs) {
          const hoursLeft = Math.ceil((cooldownMs - timeSinceReset) / (60 * 60 * 1000));
          return createEmbed(
            "⏳ Cooldown Active",
            `You can reset your HWID again in **${hoursLeft} hours**.`,
            0xFFAA00
          );
        }
      }

      const { error } = await supabase
        .from("script_keys")
        .update({
          hwid: null,
          last_hwid_reset: new Date().toISOString(),
          hwid_reset_count: (key.hwid_reset_count || 0) + 1,
        })
        .eq("id", key.id);

      if (error) {
        return createEmbed("❌ Error", "Failed to reset HWID.", 0xFF0000);
      }

      return createEmbed(
        "✅ HWID Reset",
        "Your HWID has been reset.\nYou can now run the script and your new HWID will be automatically assigned.",
        0x00FF00
      );
    }

    case "force-resethwid": {
      const targetUser = options?.find((o: any) => o.name === "user")?.value;

      const { data: config } = await supabase
        .from("discord_servers")
        .select("*")
        .eq("guild_id", guildId)
        .maybeSingle();

      if (!config || !config.script_id) {
        return createEmbed("❌ Not Configured", "Bot is not configured.", 0xFF0000);
      }

      const memberRoles = interaction.member?.roles || [];
      const isManager = config.manager_role_id && memberRoles.includes(config.manager_role_id);
      
      if (!isManager) {
        return createEmbed("❌ No Permission", "You need the manager role.", 0xFF0000);
      }

      const { data: key } = await supabase
        .from("script_keys")
        .select("*")
        .eq("script_id", config.script_id)
        .eq("discord_id", targetUser)
        .maybeSingle();

      if (!key) {
        return createEmbed("❌ No Key Found", "User doesn't have a key.", 0xFF0000);
      }

      await supabase
        .from("script_keys")
        .update({ hwid: null })
        .eq("id", key.id);

      return createEmbed(
        "✅ HWID Force Reset",
        `<@${targetUser}>'s HWID has been reset.`,
        0x00FF00
      );
    }

    case "getstats": {
      const { data: config } = await supabase
        .from("discord_servers")
        .select("*, scripts(name)")
        .eq("guild_id", guildId)
        .maybeSingle();

      if (!config || !config.script_id) {
        return createEmbed("❌ Not Configured", "Bot is not configured.", 0xFF0000);
      }

      const { data: keys, count: totalKeys } = await supabase
        .from("script_keys")
        .select("*", { count: "exact" })
        .eq("script_id", config.script_id);

      const { count: totalExecutions } = await supabase
        .from("script_executions")
        .select("*", { count: "exact", head: true })
        .eq("script_id", config.script_id);

      const activeKeys = keys?.filter((k: any) => !k.is_banned).length || 0;
      const bannedKeys = keys?.filter((k: any) => k.is_banned).length || 0;
      const hwidLocked = keys?.filter((k: any) => k.hwid).length || 0;

      // Luarmor-style stats embed - responds in channel
      return {
        embed: {
          title: `📊 ${config.scripts?.name || "Script"} Statistics`,
          color: 0x2B2D31,
          fields: [
            { name: "Total Keys", value: `\`${totalKeys || 0}\` 🔑`, inline: true },
            { name: "Active Keys", value: `\`${activeKeys}\` ✅`, inline: true },
            { name: "Banned Keys", value: `\`${bannedKeys}\` 🚫`, inline: true },
            { name: "HWID Locked", value: `\`${hwidLocked}\` 🔒`, inline: true },
            { name: "Total Executions", value: `\`${totalExecutions || 0}\` 🔥`, inline: true },
          ],
          footer: {
            text: formatUTCDate(),
          },
        },
        components: [],
        isPublic: false, // Ephemeral - só o usuário vê
      };
    }

    case "getkey": {
      const { data: config } = await supabase
        .from("discord_servers")
        .select("*, scripts(name)")
        .eq("guild_id", guildId)
        .maybeSingle();

      if (!config || !config.script_id) {
        return createEmbed("❌ Not Configured", "Bot is not configured.", 0xFF0000);
      }

      const { data: key } = await supabase
        .from("script_keys")
        .select("*")
        .eq("script_id", config.script_id)
        .eq("discord_id", userId)
        .maybeSingle();

      if (!key) {
        return createEmbed("❌ No Key Found", "You don't have a key for this script.", 0xFF0000);
      }

      if (key.is_banned) {
        return createEmbed("🚫 Key Banned", "Your key has been banned.", 0xFF0000);
      }

      // Clean script loader with Wbhf Auth branding
      const loaderUrl = `${SUPABASE_URL}/functions/v1/loader/${config.script_id}`;
      const scriptLoader = `script_key = "${key.key_value}"\nloadstring(game:HttpGet("${loaderUrl}"))()`;
      
      // Respond in channel with ephemeral message (only user sees)
      return {
        embed: {
          title: "🔐 Wbhf Auth Script Loader",
          description: `**${config.scripts?.name || "Script"}**\n\n\`\`\`lua\n${scriptLoader}\n\`\`\`\n\n*Cole este código no seu executor para carregar o script.*`,
          color: 0x8B5CF6,
          fields: [
            { name: "📊 Execuções", value: `\`${key.execution_count || 0}\``, inline: true },
            { name: "⏱️ Expira", value: key.expires_at ? new Date(key.expires_at).toLocaleDateString('pt-BR') : "Nunca", inline: true },
            { name: "🔑 Key Status", value: key.hwid ? "🔒 HWID Locked" : "🔓 Unlocked", inline: true },
          ],
          footer: {
            text: "Wbhf Auth • Só você pode ver esta mensagem",
            icon_url: "https://cdn.discordapp.com/embed/avatars/5.png"
          },
        },
        components: [],
        isPublic: false, // Ephemeral
      };
    }

    case "controlpanel": {
      const { data: config } = await supabase
        .from("discord_servers")
        .select("*, scripts(name)")
        .eq("guild_id", guildId)
        .maybeSingle();

      if (!config) {
        return createEmbed("❌ Not Logged In", "Please run `/login` first.", 0xFF0000);
      }

      // Get ALL scripts for this user to show in dropdown
      const { data: allScripts } = await supabase
        .from("scripts")
        .select("id, name")
        .eq("user_id", config.user_id)
        .order("created_at", { ascending: false });

      const userName = interaction.member?.user?.username || "Unknown";

      // If user has multiple scripts, show dropdown to select
      if (allScripts && allScripts.length > 1) {
        const selectOptions = allScripts.slice(0, 25).map((script: any) => ({
          label: script.name.slice(0, 100),
          value: script.id,
          description: script.id === config.script_id ? "✅ Currently selected" : undefined,
          default: script.id === config.script_id,
        }));

        return {
          embed: {
            title: "🎮 Select Project",
            description: `You have **${allScripts.length}** projects.\n\nSelect a project from the dropdown below to create the control panel.`,
            color: 0x5865F2,
            fields: [
              { 
                name: "Current Project", 
                value: config.scripts?.name || "Not Set", 
                inline: true 
              },
              { 
                name: "Total Projects", 
                value: `${allScripts.length}`, 
                inline: true 
              },
            ],
            footer: {
              text: `Requested by ${userName} • ${formatUTCDate()}`,
            },
          },
          components: [
            {
              type: 1,
              components: [
                {
                  type: 3, // SELECT_MENU
                  custom_id: "select_project_panel",
                  placeholder: "Choose a project...",
                  min_values: 1,
                  max_values: 1,
                  options: selectOptions,
                },
              ],
            },
          ],
          isPublic: false, // Ephemeral - only user sees
        };
      }

      // Single script or no scripts - show regular panel
      const projectName = config.scripts?.name || "Not Set";

      if (!config.script_id) {
        return createEmbed("❌ No Project Set", "Please run `/setproject` to select a script first.", 0xFF0000);
      }

      // Return embed with buttons exactly like Luarmor
      return {
        embed: {
          title: `${projectName} Control Panel`,
          description: `This control panel is for the project: **${projectName}**\nIf you're a buyer, click on the buttons below to redeem your key, get the script or get your role`,
          color: 0x2B2D31,
          footer: {
            text: `Sent by ${userName} • ${formatUTCDate()}`,
          },
        },
        components: [
          {
            type: 1,
            components: [
              { type: 2, style: 4, label: "Redeem Key", emoji: { name: "🔑" }, custom_id: "redeem_key_modal" },
              { type: 2, style: 1, label: "Get Script", emoji: { name: "📄" }, custom_id: "get_script" },
              { type: 2, style: 3, label: "Get Role", emoji: { name: "👤" }, custom_id: "get_role" },
              { type: 2, style: 2, label: "Reset HWID", emoji: { name: "⚙️" }, custom_id: "reset_hwid" },
              { type: 2, style: 2, label: "Get Stats", emoji: { name: "📊" }, custom_id: "get_stats" },
            ],
          },
        ],
        isPublic: true,
      };
    }

    case "redeem": {
      const keyValue = options?.find((o: any) => o.name === "key")?.value;

      const { data: config } = await supabase
        .from("discord_servers")
        .select("*")
        .eq("guild_id", guildId)
        .maybeSingle();

      if (!config || !config.script_id) {
        return createEmbed("❌ Not Configured", "Bot is not configured.", 0xFF0000);
      }

      // Find the key
      const { data: key } = await supabase
        .from("script_keys")
        .select("*")
        .eq("script_id", config.script_id)
        .eq("key_value", keyValue)
        .maybeSingle();

      if (!key) {
        return createEmbed("❌ Invalid Key", "This key does not exist.", 0xFF0000);
      }

      if (key.is_banned) {
        return createEmbed("🚫 Key Banned", "This key has been banned.", 0xFF0000);
      }

      if (key.discord_id && key.discord_id !== userId) {
        return createEmbed("❌ Already Claimed", "This key belongs to another user.", 0xFF0000);
      }

      // Link key to user
      const { error } = await supabase
        .from("script_keys")
        .update({ discord_id: userId })
        .eq("id", key.id);

      if (error) {
        return createEmbed("❌ Error", "Failed to redeem key.", 0xFF0000);
      }

      // Add buyer role
      if (config.buyer_role_id) {
        await addRole(guildId, userId, config.buyer_role_id);
      }

      return createEmbed(
        "✅ Key Redeemed",
        `Your key has been linked to your Discord account!\n\n**Key:** \`${keyValue}\`\n${key.expires_at ? `**Expires:** ${new Date(key.expires_at).toLocaleDateString()}` : "**Duration:** Lifetime"}`,
        0x00FF00
      );
    }

    case "unwhitelist": {
      const targetUser = options?.find((o: any) => o.name === "user")?.value;

      const { data: config } = await supabase
        .from("discord_servers")
        .select("*")
        .eq("guild_id", guildId)
        .maybeSingle();

      if (!config || !config.script_id) {
        return createEmbed("❌ Not Configured", "Please run `/login` and `/setproject` first.", 0xFF0000);
      }

      const memberRoles = interaction.member?.roles || [];
      const isManager = config.manager_role_id && memberRoles.includes(config.manager_role_id);
      const isOwner = config.user_id === userId;

      if (!isManager && !isOwner) {
        return createEmbed("❌ No Permission", "You need the manager role.", 0xFF0000);
      }

      // Find and delete user's key
      const { data: key } = await supabase
        .from("script_keys")
        .select("*")
        .eq("script_id", config.script_id)
        .eq("discord_id", targetUser)
        .maybeSingle();

      if (!key) {
        return createEmbed("❌ No Key Found", "This user doesn't have a key.", 0xFF0000);
      }

      const { error } = await supabase
        .from("script_keys")
        .delete()
        .eq("id", key.id);

      if (error) {
        return createEmbed("❌ Error", "Failed to delete key.", 0xFF0000);
      }

      // Remove buyer role
      if (config.buyer_role_id) {
        await removeRole(guildId, targetUser, config.buyer_role_id);
      }

      // DM the user
      await sendDM(targetUser, createEmbed(
        "🗑️ Access Removed",
        "Your whitelist access has been removed.",
        0xFF0000
      ));

      return createEmbed(
        "✅ User Unwhitelisted",
        `<@${targetUser}>'s key has been deleted.`,
        0x00FF00
      );
    }

    case "compensate": {
      const days = options?.find((o: any) => o.name === "days")?.value;

      if (!days || days < 1) {
        return createEmbed("❌ Error", "Please specify a valid number of days.", 0xFF0000);
      }

      const { data: config } = await supabase
        .from("discord_servers")
        .select("*")
        .eq("guild_id", guildId)
        .maybeSingle();

      if (!config || !config.script_id) {
        return createEmbed("❌ Not Configured", "Please run `/login` and `/setproject` first.", 0xFF0000);
      }

      const memberRoles = interaction.member?.roles || [];
      const isOwner = config.user_id === userId;

      if (!isOwner) {
        return createEmbed("❌ No Permission", "Only the project owner can use this command.", 0xFF0000);
      }

      // Get all non-lifetime keys
      const { data: keys } = await supabase
        .from("script_keys")
        .select("id, expires_at")
        .eq("script_id", config.script_id)
        .not("expires_at", "is", null);

      if (!keys || keys.length === 0) {
        return createEmbed("❌ No Keys", "No time-limited keys found.", 0xFF0000);
      }

      let updated = 0;
      const msToAdd = days * 24 * 60 * 60 * 1000;

      for (const key of keys) {
        const currentExpiry = new Date(key.expires_at);
        const newExpiry = new Date(currentExpiry.getTime() + msToAdd);

        const { error } = await supabase
          .from("script_keys")
          .update({ expires_at: newExpiry.toISOString() })
          .eq("id", key.id);

        if (!error) updated++;
      }

      return createEmbed(
        "✅ Compensation Applied",
        `Added **${days} days** to **${updated}** keys.`,
        0x00FF00,
        [
          { name: "Keys Updated", value: `${updated}`, inline: true },
          { name: "Days Added", value: `${days}`, inline: true },
        ]
      );
    }

    case "setlogs": {
      const webhook = options?.find((o: any) => o.name === "webhook")?.value;

      const { data: config } = await supabase
        .from("discord_servers")
        .select("*")
        .eq("guild_id", guildId)
        .maybeSingle();

      if (!config) {
        return createEmbed("❌ Not Logged In", "Please run `/login` first.", 0xFF0000);
      }

      const memberRoles = interaction.member?.roles || [];
      const isManager = config.manager_role_id && memberRoles.includes(config.manager_role_id);
      const isOwner = config.user_id === userId;

      if (!isManager && !isOwner) {
        return createEmbed("❌ No Permission", "You need the manager role.", 0xFF0000);
      }

      // Validate webhook URL
      if (!webhook.startsWith("https://discord.com/api/webhooks/") && 
          !webhook.startsWith("https://discordapp.com/api/webhooks/")) {
        return createEmbed("❌ Invalid Webhook", "Please provide a valid Discord webhook URL.", 0xFF0000);
      }

      const { error } = await supabase
        .from("discord_servers")
        .update({ webhook_url: webhook })
        .eq("guild_id", guildId);

      if (error) {
        return createEmbed("❌ Error", "Failed to save webhook.", 0xFF0000);
      }

      // Test the webhook
      try {
        await fetch(webhook, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            embeds: [{
              title: "✅ Logs Connected",
              description: "Wbhf Auth logs are now connected to this channel.",
              color: 0x00FF00,
              timestamp: new Date().toISOString(),
              footer: { text: "Wbhf Auth - Lua Whitelist System" }
            }]
          })
        });
      } catch (e) {
        console.error("Failed to test webhook:", e);
      }

      return createEmbed(
        "✅ Logs Configured",
        "Webhook has been set. All commands and actions will be logged.",
        0x00FF00
      );
    }

    case "mass-whitelist": {
      const targetRole = options?.find((o: any) => o.name === "role")?.value;
      const days = options?.find((o: any) => o.name === "days")?.value;

      const { data: config } = await supabase
        .from("discord_servers")
        .select("*, scripts(name)")
        .eq("guild_id", guildId)
        .maybeSingle();

      if (!config || !config.script_id) {
        return createEmbed("❌ Not Configured", "Please run `/login` and `/setproject` first.", 0xFF0000);
      }

      const isOwner = config.user_id === userId;

      if (!isOwner) {
        return createEmbed("❌ No Permission", "Only the project owner can use this command.", 0xFF0000);
      }

      // Get all members with the role
      let members: any[] = [];
      try {
        const guildData = await discordRequest(`/guilds/${guildId}/members?limit=1000`);
        members = guildData.filter((m: any) => m.roles.includes(targetRole));
      } catch (e) {
        console.error("Failed to fetch members:", e);
        return createEmbed("❌ Error", "Failed to fetch guild members. Make sure the bot has the right permissions.", 0xFF0000);
      }

      if (members.length === 0) {
        return createEmbed("❌ No Members", "No members found with that role.", 0xFF0000);
      }

      // Get existing whitelisted Discord IDs
      const { data: existingKeys } = await supabase
        .from("script_keys")
        .select("discord_id")
        .eq("script_id", config.script_id);

      const existingIds = new Set(existingKeys?.map((k: any) => k.discord_id) || []);

      let created = 0;
      let skipped = 0;
      const expiresAt = days ? new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString() : null;

      for (const member of members) {
        const discordId = member.user.id;

        if (existingIds.has(discordId)) {
          skipped++;
          continue;
        }

        const keyValue = generateKey(null);

        const { error } = await supabase
          .from("script_keys")
          .insert({
            script_id: config.script_id,
            key_value: keyValue,
            discord_id: discordId,
            expires_at: expiresAt,
            duration_type: days ? "days" : "lifetime",
            note: `Mass whitelisted by ${userName}`,
          });

        if (!error) {
          created++;
          // Send DM to user
          const dmEmbed = {
            title: "🎉 You've Been Whitelisted!",
            description: `You have been granted access to **${config.scripts?.name || "the script"}**!`,
            color: 0x00FF00,
            fields: [
              { name: "🔑 Your Key", value: `\`\`\`${keyValue}\`\`\``, inline: false },
              { name: "⏱️ Duration", value: days ? `${days} days` : "Lifetime", inline: true },
            ],
            footer: { text: `Wbhf Auth - Lua Whitelist System • ${formatUTCDate()}` },
          };
          await sendDM(discordId, dmEmbed);
        }
      }

      return createEmbed(
        "✅ Mass Whitelist Complete",
        `Whitelisted **${created}** users from <@&${targetRole}>`,
        0x00FF00,
        [
          { name: "Created", value: `${created}`, inline: true },
          { name: "Skipped (Already Exist)", value: `${skipped}`, inline: true },
          { name: "Duration", value: days ? `${days} days` : "Lifetime", inline: true },
        ]
      );
    }

    // ══════════════════════════════════════════
    // ADMIN PANEL COMMANDS
    // ══════════════════════════════════════════

    case "admin-diagnostics": {
      // Fetch platform stats
      const { count: totalUsersCount } = await supabase.from("profiles").select("id", { count: "exact", head: true });
      const { count: totalScriptsCount } = await supabase.from("scripts").select("id", { count: "exact", head: true });
      const { count: totalKeysCount } = await supabase.from("script_keys").select("id", { count: "exact", head: true });
      const { count: pendingPaymentsCount } = await supabase.from("crypto_payments").select("id", { count: "exact", head: true }).eq("status", "pending");
      const { count: activeSubsCount } = await supabase.from("profiles").select("id", { count: "exact", head: true }).neq("subscription_plan", "free");

      const { data: recentUsers } = await supabase
        .from("profiles")
        .select("display_name, email, subscription_plan, created_at")
        .order("created_at", { ascending: false })
        .limit(5);

      const recentList = recentUsers?.map((u: any, i: number) => 
        `${i + 1}. **${u.display_name || u.email || "Unknown"}** — ${u.subscription_plan} (${new Date(u.created_at).toLocaleDateString()})`
      ).join("\n") || "None";

      return {
        embed: {
          title: "📊 Wbhf Auth — Admin Diagnostics",
          color: 0x5865F2,
          fields: [
            { name: "👥 Total Users", value: `${totalUsersCount ?? 0}`, inline: true },
            { name: "📜 Total Scripts", value: `${totalScriptsCount ?? 0}`, inline: true },
            { name: "🔑 Total Keys", value: `${totalKeysCount ?? 0}`, inline: true },
            { name: "💰 Active Subscriptions", value: `${activeSubsCount ?? 0}`, inline: true },
            { name: "⏳ Pending Payments", value: `${pendingPaymentsCount ?? 0}`, inline: true },
            { name: "\u200b", value: "\u200b", inline: true },
            { name: "📝 Recent Registrations", value: recentList, inline: false },
          ],
          footer: { text: `Wbhf Auth Admin • ${formatUTCDate()}` },
          timestamp: getUTCTimestamp(),
        },
        components: [],
        isPublic: false,
      };
    }

    case "admin-users": {
      const search = options?.find((o: any) => o.name === "search")?.value;
      
      let query = supabase
        .from("profiles")
        .select("display_name, email, subscription_plan, subscription_expires_at, discord_id, created_at")
        .order("created_at", { ascending: false })
        .limit(10);
      
      if (search) {
        query = query.or(`email.ilike.%${search}%,display_name.ilike.%${search}%`);
      }

      const { data: users } = await query;
      
      if (!users || users.length === 0) {
        return createEmbed("❌ No Users Found", search ? `No users matching "${search}"` : "No users found.", 0xFF0000);
      }

      const userList = users.map((u: any, i: number) => {
        const plan = u.subscription_plan || "free";
        const expires = u.subscription_expires_at ? new Date(u.subscription_expires_at).toLocaleDateString() : "N/A";
        const discord = u.discord_id ? `<@${u.discord_id}>` : "—";
        return `**${i + 1}. ${u.display_name || u.email || "Unknown"}**\n📧 ${u.email || "N/A"} | 📦 ${plan} | ⏰ ${expires} | 💬 ${discord}`;
      }).join("\n\n");

      return {
        embed: {
          title: `👥 Users ${search ? `matching "${search}"` : "(Recent)"}`,
          description: userList,
          color: 0x5865F2,
          footer: { text: `Showing ${users.length} users • ${formatUTCDate()}` },
        },
        components: [],
        isPublic: false,
      };
    }

    case "admin-ban": {
      const email = options?.find((o: any) => o.name === "email")?.value;
      const reason = options?.find((o: any) => o.name === "reason")?.value;

      const { data: profile } = await supabase
        .from("profiles")
        .select("id, user_id, display_name, subscription_plan")
        .eq("email", email)
        .maybeSingle();

      if (!profile) {
        return createEmbed("❌ User Not Found", `No user found with email: ${email}`, 0xFF0000);
      }

      // Remove subscription
      await supabase
        .from("profiles")
        .update({ subscription_plan: "free", subscription_expires_at: null, subscription_started_at: null })
        .eq("id", profile.id);

      // Ban all their keys
      const { data: userScripts } = await supabase.from("scripts").select("id").eq("user_id", profile.user_id);
      if (userScripts && userScripts.length > 0) {
        await supabase.from("script_keys").update({ is_banned: true }).in("script_id", userScripts.map((s: any) => s.id));
      }

      return createEmbed(
        "🔨 User Banned",
        `**${profile.display_name || email}**\n\n📧 ${email}\n📦 Was: ${profile.subscription_plan}\n📝 Reason: ${reason || "No reason"}\n🔑 All keys banned.`,
        0xFF0000
      );
    }

    case "admin-setplan": {
      const email = options?.find((o: any) => o.name === "email")?.value;
      const plan = options?.find((o: any) => o.name === "plan")?.value;
      const planDays = options?.find((o: any) => o.name === "days")?.value || 30;

      const { data: profile } = await supabase.from("profiles").select("id, display_name, subscription_plan").eq("email", email).maybeSingle();
      if (!profile) return createEmbed("❌ User Not Found", `No user: ${email}`, 0xFF0000);

      if (plan === "remove") {
        await supabase.from("profiles").update({ subscription_plan: "free", subscription_expires_at: null, subscription_started_at: null }).eq("id", profile.id);
        return createEmbed("✅ Subscription Removed", `**${profile.display_name || email}** → Free plan.`, 0x00FF00);
      }

      const expiresAt = new Date(Date.now() + planDays * 24 * 60 * 60 * 1000).toISOString();
      await supabase.from("profiles").update({ subscription_plan: plan, subscription_started_at: new Date().toISOString(), subscription_expires_at: expiresAt }).eq("id", profile.id);

      return createEmbed("✅ Plan Updated", `**${profile.display_name || email}**\n📦 ${plan} | ⏰ ${planDays} days | 📅 ${new Date(expiresAt).toLocaleDateString()}`, 0x00FF00);
    }

    case "admin-extend": {
      const email = options?.find((o: any) => o.name === "email")?.value;
      const extDays = options?.find((o: any) => o.name === "days")?.value;

      const { data: profile } = await supabase.from("profiles").select("id, display_name, subscription_plan, subscription_expires_at").eq("email", email).maybeSingle();
      if (!profile) return createEmbed("❌ User Not Found", `No user: ${email}`, 0xFF0000);

      const currentExpiry = profile.subscription_expires_at ? new Date(profile.subscription_expires_at) : new Date();
      const baseDate = currentExpiry > new Date() ? currentExpiry : new Date();
      const newExpiry = new Date(baseDate.getTime() + extDays * 24 * 60 * 60 * 1000);

      await supabase.from("profiles").update({ subscription_expires_at: newExpiry.toISOString() }).eq("id", profile.id);

      return createEmbed("✅ Extended", `**${profile.display_name || email}**\n📦 ${profile.subscription_plan} | +${extDays} days\n⏰ New: ${newExpiry.toLocaleDateString()}`, 0x00FF00);
    }

    case "admin-payments": {
      const { data: payments } = await supabase.from("crypto_payments").select("*").eq("status", "pending").order("created_at", { ascending: false }).limit(10);

      if (!payments || payments.length === 0) {
        return createEmbed("✅ No Pending Payments", "All payments processed.", 0x00FF00);
      }

      const paymentList = payments.map((p: any, i: number) => 
        `**${i + 1}.** \`${p.order_id}\`\n💰 $${p.amount} — ${p.plan_name} | 📅 ${new Date(p.created_at).toLocaleDateString()}`
      ).join("\n\n");

      return {
        embed: {
          title: `⏳ Pending Payments (${payments.length})`,
          description: paymentList + "\n\n**Use** `/admin-approve` **or** `/admin-reject`",
          color: 0xFFAA00,
          footer: { text: `Wbhf Auth Admin • ${formatUTCDate()}` },
        },
        components: [],
        isPublic: false,
      };
    }

    case "admin-approve": {
      const orderId = options?.find((o: any) => o.name === "order_id")?.value;
      const { data: payment } = await supabase.from("crypto_payments").select("*").eq("order_id", orderId).maybeSingle();

      if (!payment) return createEmbed("❌ Not Found", `No payment: ${orderId}`, 0xFF0000);
      if (payment.status !== "pending") return createEmbed("⚠️ Already Processed", `Status: ${payment.status}`, 0xFFAA00);

      const randomPart = crypto.randomUUID().replace(/-/g, '').substring(0, 16).toUpperCase();
      const newApiKey = `WBHF-${randomPart}`;
      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

      await supabase.from("crypto_payments").update({ status: "completed", api_key: newApiKey }).eq("id", payment.id);
      await supabase.from("subscription_codes").insert({ code: newApiKey, plan_name: payment.plan_name, duration_days: 30, price: payment.amount, is_used: false });

      if (payment.user_id) {
        await supabase.from("profiles").update({ subscription_plan: payment.plan_name, subscription_started_at: new Date().toISOString(), subscription_expires_at: expiresAt.toISOString() }).eq("user_id", payment.user_id);
      }

      return createEmbed("✅ Payment Approved", `**Order:** \`${orderId}\`\n💰 $${payment.amount} — ${payment.plan_name}\n🔑 Key: \`${newApiKey}\``, 0x00FF00);
    }

    case "admin-reject": {
      const orderId = options?.find((o: any) => o.name === "order_id")?.value;
      const { data: payment } = await supabase.from("crypto_payments").select("*").eq("order_id", orderId).maybeSingle();

      if (!payment) return createEmbed("❌ Not Found", `No payment: ${orderId}`, 0xFF0000);
      if (payment.status !== "pending") return createEmbed("⚠️ Already Processed", `Status: ${payment.status}`, 0xFFAA00);

      await supabase.from("crypto_payments").update({ status: "rejected" }).eq("id", payment.id);
      return createEmbed("❌ Payment Rejected", `**Order:** \`${orderId}\`\n💰 $${payment.amount} — ${payment.plan_name}`, 0xFF0000);
    }

    default:
      return createEmbed("❌ Unknown Command", "This command is not recognized.", 0xFF0000);
  }
}

// Handle button and select menu interactions
async function handleButtonInteraction(interaction: any, supabase: any) {
  const customId = interaction.data.custom_id;
  const guildId = interaction.guild_id;
  const userId = interaction.member?.user?.id || interaction.user?.id;
  const userName = interaction.member?.user?.username || interaction.user?.username;

  console.log(`Handling button: ${customId} from user ${userId}`);

  // Handle project selection dropdown
  if (customId === "select_project_panel") {
    const selectedScriptId = interaction.data.values?.[0];
    
    if (!selectedScriptId) {
      return createEmbed("❌ Error", "No project selected.", 0xFF0000);
    }

    // Get config and verify ownership
    const { data: config } = await supabase
      .from("discord_servers")
      .select("*")
      .eq("guild_id", guildId)
      .maybeSingle();

    if (!config) {
      return createEmbed("❌ Not Logged In", "Please run `/login` first.", 0xFF0000);
    }

    // Verify the script belongs to this user
    const { data: script } = await supabase
      .from("scripts")
      .select("id, name")
      .eq("id", selectedScriptId)
      .eq("user_id", config.user_id)
      .maybeSingle();

    if (!script) {
      return createEmbed("❌ Invalid Project", "This project doesn't belong to you.", 0xFF0000);
    }

    // Update the server config with selected script
    await supabase
      .from("discord_servers")
      .update({ script_id: selectedScriptId })
      .eq("guild_id", guildId);

    // Return the control panel for the selected project
    return {
      embed: {
        title: `${script.name} Control Panel`,
        description: `This control panel is for the project: **${script.name}**\nIf you're a buyer, click on the buttons below to redeem your key, get the script or get your role`,
        color: 0x2B2D31,
        footer: {
          text: `Sent by ${userName} • ${formatUTCDate()}`,
        },
      },
      components: [
        {
          type: 1,
          components: [
            { type: 2, style: 4, label: "Redeem Key", emoji: { name: "🔑" }, custom_id: "redeem_key_modal" },
            { type: 2, style: 1, label: "Get Script", emoji: { name: "📄" }, custom_id: "get_script" },
            { type: 2, style: 3, label: "Get Role", emoji: { name: "👤" }, custom_id: "get_role" },
            { type: 2, style: 2, label: "Reset HWID", emoji: { name: "⚙️" }, custom_id: "reset_hwid" },
            { type: 2, style: 2, label: "Get Stats", emoji: { name: "📊" }, custom_id: "get_stats" },
          ],
        },
      ],
      isPublic: true,
    };
  }

  // Handle setproject dropdown selection
  if (customId === "setproject_select") {
    const selectedScriptId = interaction.data.values?.[0];
    
    if (!selectedScriptId) {
      return createEmbed("❌ Error", "No project selected.", 0xFF0000);
    }

    // Get config
    const { data: config } = await supabase
      .from("discord_servers")
      .select("*")
      .eq("guild_id", guildId)
      .maybeSingle();

    if (!config) {
      return createEmbed("❌ Not Logged In", "Please run `/login` first.", 0xFF0000);
    }

    // Verify the script belongs to this user
    const { data: script } = await supabase
      .from("scripts")
      .select("id, name")
      .eq("id", selectedScriptId)
      .eq("user_id", config.user_id)
      .maybeSingle();

    if (!script) {
      return createEmbed("❌ Invalid Project", "This project doesn't belong to you.", 0xFF0000);
    }

    // Update the server config with selected script
    await supabase
      .from("discord_servers")
      .update({ script_id: selectedScriptId })
      .eq("guild_id", guildId);

    return createEmbed("✅ Project Set", `Active script: **${script.name}**\n\nYou can now use commands like \`/whitelist\` and \`/controlpanel\` for this project.`, 0x00FF00);
  }

  // Handle whitelist project selection dropdown
  if (customId === "whitelist_project_select") {
    const selectedValue = interaction.data.values?.[0];
    
    if (!selectedValue) {
      return createEmbed("❌ Error", "No project selected.", 0xFF0000);
    }

    // Parse the value: whitelist_select:scriptId:targetUser:days:note
    const parts = selectedValue.split(":");
    if (parts.length < 4 || parts[0] !== "whitelist_select") {
      return createEmbed("❌ Error", "Invalid selection.", 0xFF0000);
    }

    const selectedScriptId = parts[1];
    const targetUser = parts[2];
    const daysStr = parts[3];
    const note = parts[4] ? decodeURIComponent(parts[4]) : null;
    const days = daysStr === "lifetime" ? null : parseInt(daysStr);

    // Get config and verify ownership
    const { data: config } = await supabase
      .from("discord_servers")
      .select("*, scripts(name)")
      .eq("guild_id", guildId)
      .maybeSingle();

    if (!config) {
      return createEmbed("❌ Not Logged In", "Please run `/login` first.", 0xFF0000);
    }

    // Verify the script belongs to this user
    const { data: script } = await supabase
      .from("scripts")
      .select("id, name")
      .eq("id", selectedScriptId)
      .eq("user_id", config.user_id)
      .maybeSingle();

    if (!script) {
      return createEmbed("❌ Invalid Project", "This project doesn't belong to you.", 0xFF0000);
    }

    // Update the server config with selected script
    await supabase
      .from("discord_servers")
      .update({ script_id: selectedScriptId })
      .eq("guild_id", guildId);

    // Fetch Discord user info to get avatar
    let discordAvatarUrl: string | null = null;
    let discordUsername: string | null = null;
    try {
      const discordUser = await discordRequest(`/users/${targetUser}`);
      if (discordUser) {
        discordUsername = discordUser.username || discordUser.global_name;
        if (discordUser.avatar) {
          const avatarFormat = discordUser.avatar.startsWith("a_") ? "gif" : "png";
          discordAvatarUrl = `https://cdn.discordapp.com/avatars/${targetUser}/${discordUser.avatar}.${avatarFormat}?size=256`;
        } else {
          const defaultAvatarIndex = parseInt(targetUser) % 5;
          discordAvatarUrl = `https://cdn.discordapp.com/embed/avatars/${defaultAvatarIndex}.png`;
        }
      }
    } catch (avatarErr) {
      console.error("Failed to fetch Discord user avatar:", avatarErr);
    }

    const keyValue = generateKey(null);
    const expiresAt = days ? new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString() : null;

    const { error } = await supabase
      .from("script_keys")
      .insert({
        script_id: selectedScriptId,
        key_value: keyValue,
        discord_id: targetUser,
        discord_avatar_url: discordAvatarUrl,
        expires_at: expiresAt,
        duration_type: days ? "days" : "lifetime",
        note: note || `Whitelisted by ${userName} (${discordUsername || "Unknown"})`,
      });

    if (error) {
      console.error("Failed to create key:", error);
      return createEmbed("❌ Error", "Failed to create key.", 0xFF0000);
    }

    if (config.buyer_role_id) {
      await addRole(guildId, targetUser, config.buyer_role_id);
    }

    // Send DM with key info
    const dmEmbed = {
      title: "🎉 You've Been Whitelisted!",
      description: `You have been granted access to **${script.name}**!\n\n` +
        `⏱️ **Duration:** ${days ? `${days} days` : "Lifetime"}\n\n` +
        `Go to the server and use the **Control Panel** to redeem your key.`,
      color: 0x00FF00,
      fields: [
        { name: "🔑 Your Key", value: `\`\`\`${keyValue}\`\`\``, inline: false },
      ],
      footer: {
        text: `Wbhf Auth - Lua Whitelist System • ${formatUTCDate()}`,
      },
      timestamp: getUTCTimestamp(),
    };
    
    await sendDM(targetUser, dmEmbed);

    return createEmbed(
      "✅ User Whitelisted",
      `<@${targetUser}> has been whitelisted on **${script.name}**!\n\n**Key:** \`${keyValue}\`\n**Duration:** ${days ? `${days} days` : "Lifetime"}\n**Avatar:** ${discordAvatarUrl ? "✓ Saved" : "Default"}`,
      0x00FF00
    );
  }

  // Handle DM redeem button (from whitelist DM)
  if (customId.startsWith("dm_redeem_")) {
    const keyValue = customId.replace("dm_redeem_", "");
    
    const { data: key } = await supabase
      .from("script_keys")
      .select("*")
      .eq("key_value", keyValue)
      .maybeSingle();

    if (!key) {
      return createEmbed("❌ Invalid Key", "This key no longer exists.", 0xFF0000);
    }

    if (key.is_banned) {
      return createEmbed("🚫 Key Banned", "This key has been banned.", 0xFF0000);
    }

    return createEmbed(
      "✅ Key Already Linked",
      `Your key is already linked to your account!\n\n**Key:** \`${keyValue}\`\n\nAdd this on top of your script:\n\`\`\`lua\nscript_key = "${keyValue}"\n\`\`\``,
      0x00FF00
    );
  }

  // Handle redeem key modal button
  if (customId === "redeem_key_modal") {
    return {
      type: "modal",
      modal: {
        title: "Redeem Your Key",
        custom_id: "redeem_key_submit",
        components: [
          {
            type: 1,
            components: [
              {
                type: 4,
                custom_id: "key_input",
                label: "Enter your license key",
                style: 1,
                min_length: 10,
                max_length: 50,
                placeholder: "XXXX-XXXX-XXXX-XXXX",
                required: true,
              },
            ],
          },
        ],
      },
    };
  }

  const { data: config } = await supabase
    .from("discord_servers")
    .select("*")
    .eq("guild_id", guildId)
    .maybeSingle();

  if (!config || !config.script_id) {
    return createEmbed("❌ Not Configured", "Bot is not configured for this server.", 0xFF0000);
  }

  switch (customId) {
    case "redeem_key": {
      return createEmbed(
        "🔑 Redeem Key",
        "Use the `/redeem` command with your key:\n`/redeem key:YOUR_KEY_HERE`",
        0x5865F2
      );
    }

    case "get_script": {
      const { data: keys, error: keyError } = await supabase
        .from("script_keys")
        .select("*, scripts(share_code)")
        .eq("script_id", config.script_id)
        .eq("discord_id", userId)
        .order("created_at", { ascending: false })
        .limit(1);

      if (keyError) {
        console.error("Failed to fetch key for get_script:", keyError);
        return createEmbed("❌ Error", "Failed to fetch your key. Please try again.", 0xFF0000);
      }

      const key = keys?.[0];

      if (!key) {
        return createEmbed("❌ No Key Found", "You don't have a key. Ask a manager to whitelist you or use `/redeem`.", 0xFF0000);
      }

      if (key.is_banned) {
        return createEmbed("🚫 Key Banned", "Your key has been banned.", 0xFF0000);
      }

      // Luarmor-style script format - uses LOADER endpoint
      const scriptLoader = `script_key="${key.key_value}";\nloadstring(game:HttpGet("${SUPABASE_URL}/functions/v1/loader/${config.script_id}"))()`;

      // Respond in channel with ephemeral message (only user sees)
      return {
        embed: {
          title: "Here is your script:",
          description: `\`\`\`lua\n${scriptLoader}\n\`\`\``,
          color: 0x2B2D31,
          fields: [
            { name: "📊 Total Executions", value: `\`${key.execution_count || 0}\``, inline: true },
            { name: "⏱️ Expires", value: key.expires_at ? new Date(key.expires_at).toLocaleDateString() : "Never", inline: true },
          ],
          footer: {
            text: "Só você pode ver esta mensagem • Ignorar mensagem",
          },
        },
        components: [],
        isPublic: false,
      };
    }

    case "get_role": {
      if (!config.buyer_role_id) {
        return createEmbed("❌ No Role Set", "Buyer role is not configured.", 0xFF0000);
      }

      const { data: keys, error: keyError } = await supabase
        .from("script_keys")
        .select("*")
        .eq("script_id", config.script_id)
        .eq("discord_id", userId)
        .order("created_at", { ascending: false })
        .limit(1);

      if (keyError) {
        console.error("Failed to fetch key for get_role:", keyError);
        return createEmbed("❌ Error", "Failed to fetch your key. Please try again.", 0xFF0000);
      }

      const key = keys?.[0];

      if (!key) {
        return createEmbed("❌ No Key Found", "You don't have a key.", 0xFF0000);
      }

      await addRole(guildId, userId, config.buyer_role_id);
      return createEmbed("✅ Role Added", `You now have the <@&${config.buyer_role_id}> role!`, 0x00FF00);
    }

    case "reset_hwid": {
      const { data: keys, error: keyError } = await supabase
        .from("script_keys")
        .select("*")
        .eq("script_id", config.script_id)
        .eq("discord_id", userId)
        .order("created_at", { ascending: false })
        .limit(1);

      if (keyError) {
        console.error("Failed to fetch key for reset_hwid:", keyError);
        return createEmbed("❌ Error", "Failed to fetch your key. Please try again.", 0xFF0000);
      }

      const key = keys?.[0];

      if (!key) {
        return createEmbed("❌ No Key Found", "You don't have a key.", 0xFF0000);
      }

      if (key.last_hwid_reset) {
        const cooldownMs = (config.hwid_reset_cooldown_hours || 24) * 60 * 60 * 1000;
        const timeSinceReset = Date.now() - new Date(key.last_hwid_reset).getTime();

        if (timeSinceReset < cooldownMs) {
          const hoursLeft = Math.ceil((cooldownMs - timeSinceReset) / (60 * 60 * 1000));
          return createEmbed("⏳ Cooldown", `Wait **${hoursLeft}h** before resetting again.`, 0xFFAA00);
        }
      }

      await supabase
        .from("script_keys")
        .update({
          hwid: null,
          last_hwid_reset: new Date().toISOString(),
          hwid_reset_count: (key.hwid_reset_count || 0) + 1,
        })
        .eq("id", key.id);

      // Luarmor-style success embed
      return {
        title: "Success!",
        description: "You have reset your HWID. You can now use the script",
        color: 0x00FF00,
        timestamp: getUTCTimestamp(),
        footer: {
          text: formatUTCDate(),
        },
      };
    }

    case "get_stats": {
      const { data: keys, error: keyError } = await supabase
        .from("script_keys")
        .select("*")
        .eq("script_id", config.script_id)
        .eq("discord_id", userId)
        .order("created_at", { ascending: false })
        .limit(1);

      if (keyError) {
        console.error("Failed to fetch key for get_stats:", keyError);
        return createEmbed("❌ Error", "Failed to fetch your key. Please try again.", 0xFF0000);
      }

      const key = keys?.[0];

      if (!key) {
        return createEmbed("❌ No Key Found", "You don't have a key.", 0xFF0000);
      }

      // Format time since last reset
      let lastResetText = "Never";
      if (key.last_hwid_reset) {
        const diff = Date.now() - new Date(key.last_hwid_reset).getTime();
        const seconds = Math.floor(diff / 1000);
        if (seconds < 60) lastResetText = `há ${seconds} segundos`;
        else if (seconds < 3600) lastResetText = `há ${Math.floor(seconds / 60)} minutos`;
        else if (seconds < 86400) lastResetText = `há ${Math.floor(seconds / 3600)} horas`;
        else lastResetText = `há ${Math.floor(seconds / 86400)} dias`;
      }

      // Luarmor-style stats embed
      const statsEmbed = {
        title: "Stats",
        color: 0x2B2D31,
        fields: [
          { name: "Total Executions:", value: `${key.execution_count || 0} 🔥`, inline: false },
          { name: "HWID Status:", value: key.hwid ? "Locked 🔒" : "Waiting to be assigned ⚠️", inline: false },
          { name: "Key:", value: `||${key.key_value}|| 🔐`, inline: false },
          { name: "Total HWID Resets:", value: `${key.hwid_reset_count || 0} ⚙️`, inline: false },
          { name: "Last Reset:", value: `${lastResetText} 📅`, inline: false },
          { name: "Expires At:", value: key.expires_at ? `${new Date(key.expires_at).toLocaleDateString()} 📅` : "Never 📅", inline: false },
          { name: "Banned:", value: key.is_banned ? "Yes 🚫" : "No ✅", inline: false },
        ],
        footer: {
          text: "Só você pode ver esta mensagem • Ignorar mensagem",
        },
      };

      if (key.note) {
        statsEmbed.fields.push({ name: "Note:", value: key.note, inline: false });
      }

      return statsEmbed;
    }

    default:
      return createEmbed("❌ Unknown Action", "This button action is not recognized.", 0xFF0000);
  }
}

// Handle modal submissions
async function handleModalSubmit(interaction: any, supabase: any) {
  const customId = interaction.data.custom_id;
  const guildId = interaction.guild_id;
  const userId = interaction.member?.user?.id || interaction.user?.id;

  console.log(`Handling modal: ${customId} from user ${userId}`);

  if (customId === "redeem_key_submit") {
    const keyValue = interaction.data.components?.[0]?.components?.[0]?.value;

    if (!keyValue) {
      return createEmbed("❌ Error", "Please enter a key.", 0xFF0000);
    }

    const { data: config } = await supabase
      .from("discord_servers")
      .select("*")
      .eq("guild_id", guildId)
      .maybeSingle();

    if (!config || !config.script_id) {
      return createEmbed("❌ Not Configured", "Bot is not configured.", 0xFF0000);
    }

    const { data: key } = await supabase
      .from("script_keys")
      .select("*")
      .eq("script_id", config.script_id)
      .eq("key_value", keyValue.trim())
      .maybeSingle();

    if (!key) {
      return createEmbed("❌ Invalid Key", "This key does not exist.", 0xFF0000);
    }

    if (key.is_banned) {
      return createEmbed("🚫 Key Banned", "This key has been banned.", 0xFF0000);
    }

    if (key.discord_id && key.discord_id !== userId) {
      return createEmbed("❌ Already Claimed", "This key belongs to another user.", 0xFF0000);
    }

    const { error } = await supabase
      .from("script_keys")
      .update({ discord_id: userId })
      .eq("id", key.id);

    if (error) {
      return createEmbed("❌ Error", "Failed to redeem key.", 0xFF0000);
    }

    if (config.buyer_role_id) {
      await addRole(guildId, userId, config.buyer_role_id);
    }

    return createEmbed(
      "✅ Key Redeemed Successfully!",
      `Your key has been linked to your Discord account!\n\n**Key:** \`${keyValue}\`\n${key.expires_at ? `**Expires:** ${new Date(key.expires_at).toLocaleDateString()}` : "**Duration:** Lifetime"}\n\nUse "Get Key" button to get your script loader.`,
      0x00FF00
    );
  }

  return createEmbed("❌ Unknown Modal", "This modal is not recognized.", 0xFF0000);
}

// Get bot credentials for a specific guild from database
async function getBotCredentials(supabase: any, guildId: string): Promise<{ botToken: string; publicKey: string } | null> {
  const { data: config } = await supabase
    .from("discord_servers")
    .select("bot_token, public_key")
    .eq("guild_id", guildId)
    .maybeSingle();

  if (config?.bot_token && config?.public_key) {
    return { botToken: config.bot_token, publicKey: config.public_key };
  }
  return null;
}

// Try to find credentials by checking all configured servers
async function findCredentialsByPublicKey(supabase: any, body: string, signature: string, timestamp: string): Promise<{ botToken: string; publicKey: string; guildId: string } | null> {
  // Get all configured servers with credentials
  const { data: servers, error } = await supabase
    .from("discord_servers")
    .select("guild_id, bot_token, public_key, user_id")
    .not("bot_token", "is", null)
    .not("public_key", "is", null);

  if (error) {
    console.error("Error fetching servers:", error);
    return null;
  }

  if (!servers || servers.length === 0) {
    console.log("No servers found with bot credentials");
    return null;
  }

  console.log(`Found ${servers.length} server(s) with credentials`);

  // Try each server's public key to verify signature
  for (const server of servers) {
    if (server.public_key && server.bot_token) {
      console.log(`Trying to verify with public key for user ${server.user_id}, guild ${server.guild_id}`);
      console.log(`Public key length: ${server.public_key.length}, expected: 64`);
      
      const isValid = await verifyDiscordSignature(signature, timestamp, body, server.public_key);
      console.log(`Signature valid: ${isValid}`);
      
      if (isValid) {
        return {
          botToken: server.bot_token,
          publicKey: server.public_key,
          guildId: server.guild_id
        };
      }
    }
  }

  console.log("No matching credentials found for signature");
  return null;
}

serve(async (req) => {
  console.log("=== Discord Bot Request Received ===");
  console.log("Method:", req.method);
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const signature = req.headers.get("x-signature-ed25519") || "";
    const timestamp = req.headers.get("x-signature-timestamp") || "";
    const body = await req.text();
    
    console.log("Signature present:", !!signature, "length:", signature.length);
    console.log("Timestamp:", timestamp);
    console.log("Body length:", body.length);

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    
    // First try: find credentials from database
    let credentials = await findCredentialsByPublicKey(supabase, body, signature, timestamp);
    
    // Fallback: try the global DISCORD_PUBLIC_KEY secret for initial PING validation
    if (!credentials) {
      const globalPublicKey = Deno.env.get("DISCORD_PUBLIC_KEY");
      if (globalPublicKey) {
        console.log("Trying global DISCORD_PUBLIC_KEY fallback...");
        const isValid = await verifyDiscordSignature(signature, timestamp, body, globalPublicKey);
        if (isValid) {
          console.log("Global public key verified! This is likely a PING from Discord.");
          const interaction = JSON.parse(body);
          if (interaction.type === 1) {
            console.log("Responding to PING with global key");
            return new Response(JSON.stringify({ type: 1 }), {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }
          // For non-PING, we need bot token from DB
          const globalBotToken = Deno.env.get("DISCORD_BOT_TOKEN");
          if (globalBotToken) {
            credentials = { botToken: globalBotToken, publicKey: globalPublicKey, guildId: interaction.guild_id || "" };
          }
        }
      }
    }
    
    console.log("Credentials found:", !!credentials);
    
    if (!credentials) {
      console.error("Invalid signature - no matching credentials found");
      return new Response("Invalid signature", { status: 401 });
    }

    // Set the current bot token for this request
    currentBotToken = credentials.botToken;
    
    const interaction = JSON.parse(body);
    console.log("Received interaction type:", interaction.type, "from guild:", interaction.guild_id);

    // Ping response - for validation, we already verified the signature
    if (interaction.type === 1) {
      console.log("Responding to PING");
      return new Response(JSON.stringify({ type: 1 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let responseData: any;

    // Handle slash commands (type 2)
    if (interaction.type === 2) {
      responseData = await handleSlashCommand(interaction, supabase);
    }
    // Handle button clicks (type 3)
    else if (interaction.type === 3) {
      responseData = await handleButtonInteraction(interaction, supabase);
    }
    // Handle modal submissions (type 5)
    else if (interaction.type === 5) {
      responseData = await handleModalSubmit(interaction, supabase);
    }
    else {
      responseData = createEmbed("❌ Error", "Unknown interaction type.", 0xFF0000);
    }

    // Check if it's a modal response
    if (responseData.type === "modal") {
      return new Response(JSON.stringify({
        type: 9, // MODAL
        data: responseData.modal,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Format response - ephemeral by default (flags: 64), unless isPublic
    let response;
    const isPublic = responseData.isPublic === true;
    
    if (responseData.embed && 'components' in responseData) {
      response = {
        type: 4,
        data: {
          embeds: [responseData.embed],
          components: responseData.components || [],
          flags: isPublic ? 0 : 64, // Ephemeral unless public
        },
      };
    } else {
      response = {
        type: 4,
        data: {
          embeds: [responseData],
          flags: 64, // EPHEMERAL - only the user can see
        },
      };
    }

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Discord bot error:", error);
    return new Response(
      JSON.stringify({
        type: 4,
        data: {
          embeds: [createEmbed("❌ Error", "An internal error occurred.", 0xFF0000)],
          flags: 64,
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
