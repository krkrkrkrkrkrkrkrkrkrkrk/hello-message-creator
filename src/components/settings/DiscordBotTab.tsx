import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { 
  Bot, 
  Copy, 
  Check, 
  ExternalLink, 
  Key, 
  Shield, 
  Link2,
  Terminal,
  AlertCircle,
  ArrowRight,
  Zap,
  MessageSquare,
  Users,
  Sparkles,
  Save,
  Eye,
  EyeOff,
  Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const DiscordBotTab = () => {
  const [copied, setCopied] = useState<string | null>(null);
  const [botToken, setBotToken] = useState("");
  const [publicKey, setPublicKey] = useState("");
  const [guildId, setGuildId] = useState("");
  const [showToken, setShowToken] = useState(false);
  const [showPublicKey, setShowPublicKey] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [hasExistingConfig, setHasExistingConfig] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const interactionsUrl = `${supabaseUrl}/functions/v1/discord-bot`;
  const registerCommandsUrl = `${supabaseUrl}/functions/v1/register-discord-commands`;

  useEffect(() => {
    loadExistingConfig();
  }, []);

  const loadExistingConfig = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: config } = await supabase
        .from("discord_servers")
        .select("bot_token, public_key, guild_id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (config) {
        setHasExistingConfig(true);
        if (config.bot_token) setBotToken(config.bot_token);
        if (config.public_key) setPublicKey(config.public_key);
        // Only set guild_id if it's a real snowflake (not a placeholder)
        if (config.guild_id && /^\d+$/.test(config.guild_id)) {
          setGuildId(config.guild_id);
        }
      }
    } catch (error) {
      console.error("Error loading config:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const saveCredentials = async () => {
    if (!botToken.trim() || !publicKey.trim()) {
      toast.error("Please fill in both fields");
      return;
    }

    setIsSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("You need to be logged in");
        return;
      }

      // Get user's API key
      const { data: profile } = await supabase
        .from("profiles")
        .select("api_key")
        .eq("id", user.id)
        .single();

      if (!profile?.api_key) {
        toast.error("Please generate an API key first in the Developer tab");
        return;
      }

      // Check if user already has a config
      const { data: existingConfig } = await supabase
        .from("discord_servers")
        .select("id, guild_id")
        .eq("user_id", user.id)
        .maybeSingle();

      // Determine the guild_id to use
      const finalGuildId = guildId.trim() && /^\d+$/.test(guildId.trim()) 
        ? guildId.trim() 
        : existingConfig?.guild_id || `pending_${user.id}_${Date.now()}`;

      if (existingConfig) {
        // Update existing config
        const { error } = await supabase
          .from("discord_servers")
          .update({
            bot_token: botToken.trim(),
            public_key: publicKey.trim(),
            guild_id: finalGuildId,
            updated_at: new Date().toISOString(),
          })
          .eq("id", existingConfig.id);

        if (error) throw error;
      } else {
        // Create new config
        const { error } = await supabase
          .from("discord_servers")
          .insert({
            user_id: user.id,
            api_key: profile.api_key,
            guild_id: finalGuildId,
            bot_token: botToken.trim(),
            public_key: publicKey.trim(),
          });

        if (error) throw error;
      }

      setHasExistingConfig(true);
      toast.success("Bot credentials saved successfully!");
    } catch (error: any) {
      console.error("Error saving credentials:", error);
      toast.error(error.message || "Error saving credentials");
    } finally {
      setIsSaving(false);
    }
  };

  const registerCommands = async () => {
    if (!botToken.trim()) {
      toast.error("Please save the Bot Token first");
      return;
    }

    if (!guildId.trim() || !/^\d+$/.test(guildId.trim())) {
      toast.error("Please enter a valid Discord Server ID (Guild ID) first");
      return;
    }

    setIsRegistering(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("You need to be logged in");
        return;
      }

      // First, make sure the guild_id is saved in the database
      const { data: existingConfig } = await supabase
        .from("discord_servers")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (existingConfig) {
        await supabase
          .from("discord_servers")
          .update({ guild_id: guildId.trim() })
          .eq("id", existingConfig.id);
      }

      const response = await supabase.functions.invoke("register-discord-commands", {
        body: { user_id: user.id, guild_id: guildId.trim() }
      });

      if (response.error) {
        // Try to parse error body from the response
        let errorBody = null;
        try {
          const errorData = response.error as any;
          if (errorData?.context?.body) {
            errorBody = JSON.parse(errorData.context.body);
          }
        } catch {}

        if (errorBody?.invite_url) {
          toast.error(
            <div className="flex flex-col gap-2">
              <p className="font-medium">{errorBody.error || "Bot não está no servidor"}</p>
              <p className="text-sm">{errorBody.solution}</p>
              <a 
                href={errorBody.invite_url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-primary underline flex items-center gap-1"
              >
                Adicionar Bot ao Servidor <ExternalLink className="w-3 h-3" />
              </a>
            </div>,
            { duration: 15000 }
          );
          return;
        }
        throw new Error(response.error.message);
      }

      // Check if response data has error with invite_url
      if (response.data?.error && response.data?.invite_url) {
        toast.error(
          <div className="flex flex-col gap-2">
            <p className="font-medium">{response.data.error}</p>
            <p className="text-sm">{response.data.solution}</p>
            <a 
              href={response.data.invite_url} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-primary underline flex items-center gap-1"
            >
              Adicionar Bot ao Servidor <ExternalLink className="w-3 h-3" />
            </a>
          </div>,
          { duration: 15000 }
        );
        return;
      }

      toast.success("Commands registered successfully!");
    } catch (error: any) {
      console.error("Error registering commands:", error);
      toast.error(error.message || "Error registering commands");
    } finally {
      setIsRegistering(false);
    }
  };

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    toast.success("Copied to clipboard!");
    setTimeout(() => setCopied(null), 2000);
  };

  const detailedSteps = [
    {
      step: 1,
      title: "Create Discord Application",
      icon: Sparkles,
      color: "text-blue-500",
      bgColor: "bg-blue-500/10",
      borderColor: "border-blue-500/20",
      description: "Go to the Discord Developer Portal and create a new application",
      details: [
        "Go to discord.com/developers/applications",
        "Click 'New Application' in the top right corner",
        "Name your application (e.g., My Hub Bot)",
        "Accept the terms of service and click 'Create'",
      ],
      link: "https://discord.com/developers/applications",
      linkText: "Open Discord Developer Portal",
      warning: null,
    },
    {
      step: 2,
      title: "Copy Public Key",
      icon: Key,
      color: "text-yellow-500",
      bgColor: "bg-yellow-500/10",
      borderColor: "border-yellow-500/20",
      description: "Copy the Public Key from your application",
      details: [
        "On your application's 'General Information' page",
        "Find the 'PUBLIC KEY' field",
        "Click 'Copy' or copy manually",
        "Paste it in the 'Discord Public Key' field above",
      ],
      warning: "⚠️ The Public Key is different from the Bot Token! Don't confuse them.",
      image: null,
    },
    {
      step: 3,
      title: "Create Bot and Copy Token",
      icon: Bot,
      color: "text-[#5865F2]",
      bgColor: "bg-[#5865F2]/10",
      borderColor: "border-[#5865F2]/20",
      description: "Create the bot and copy the token",
      details: [
        "In the left menu, click 'Bot'",
        "Click 'Add Bot' and confirm",
        "Under 'TOKEN', click 'Reset Token' to generate a new one",
        "Copy the token immediately (it only appears once!)",
        "Paste it in the 'Discord Bot Token' field above",
        "Enable 'MESSAGE CONTENT INTENT' if you want to read messages",
      ],
      warning: "🔒 NEVER share your Bot Token! It gives full access to your bot.",
    },
    {
      step: 4,
      title: "Save Credentials",
      icon: Save,
      color: "text-green-500",
      bgColor: "bg-green-500/10",
      borderColor: "border-green-500/20",
      description: "Save the credentials in the system",
      details: [
        "Fill in the Bot Token and Public Key in the fields above",
        "Click 'Save Bot Credentials'",
        "Wait for the success confirmation",
      ],
      warning: null,
    },
    {
      step: 5,
      title: "Configure Interactions Endpoint URL",
      icon: Link2,
      color: "text-primary",
      bgColor: "bg-primary/10",
      borderColor: "border-primary/20",
      description: "Paste the interactions URL in your Discord application",
      details: [
        "Go back to 'General Information' in the Developer Portal",
        "Scroll down to find 'INTERACTIONS ENDPOINT URL'",
        "Paste the URL below in the field",
        "Click outside the field or press Enter to save",
        "Discord will automatically validate the URL",
        "If a green check ✓ appears, you're all set!",
      ],
      copyValue: interactionsUrl,
      copyLabel: "Interactions Endpoint URL",
      warning: "⚠️ You MUST save credentials (Step 4) BEFORE configuring this URL!",
    },
    {
      step: 6,
      title: "Invite Bot to Server",
      icon: Users,
      color: "text-purple-500",
      bgColor: "bg-purple-500/10",
      borderColor: "border-purple-500/20",
      description: "Generate the invite link and add the bot to your server",
      details: [
        "In the left menu, click 'OAuth2' > 'URL Generator'",
        "In SCOPES, select: bot and applications.commands",
        "In BOT PERMISSIONS, select: Administrator",
        "Copy the generated URL at the bottom",
        "Open the URL in a new tab and select your server",
        "Authorize the bot to join the server",
      ],
      oauthScopes: ["bot", "applications.commands"],
      permissions: ["Administrator"],
    },
    {
      step: 7,
      title: "Register Slash Commands",
      icon: Terminal,
      color: "text-orange-500",
      bgColor: "bg-orange-500/10",
      borderColor: "border-orange-500/20",
      description: "Register the bot commands on Discord",
      details: [
        "After saving credentials and inviting the bot",
        "Click the 'Register Commands' button above",
        "This registers slash commands (/whitelist, /blacklist, etc)",
        "Commands update instantly on your server (guild)",
        "Globally it may take up to 1 hour to appear",
      ],
      warning: null,
    },
  ];

  const availableCommands = [
    { name: "/login", description: "Link your ShadowAuth account to this server", params: "api_key" },
    { name: "/setproject", description: "Set the active script for this server", params: "(dropdown selection)" },
    { name: "/setbuyerrole", description: "Set the buyer role", params: "role" },
    { name: "/setmanagerrole", description: "Set the manager role", params: "role" },
    { name: "/whitelist", description: "Create key and send via DM", params: "user, days?, note?" },
    { name: "/unwhitelist", description: "Remove a user's access", params: "user" },
    { name: "/blacklist", description: "Ban a user's key", params: "user, reason?" },
    { name: "/resethwid", description: "Reset your own HWID", params: "-" },
    { name: "/force-resethwid", description: "Reset another user's HWID (manager)", params: "user" },
    { name: "/getstats", description: "Show script statistics", params: "-" },
    { name: "/getkey", description: "Receive the loader via DM", params: "-" },
    { name: "/redeem", description: "Redeem a key to your Discord", params: "key" },
    { name: "/controlpanel", description: "Create a control panel with buttons", params: "-" },
    { name: "/compensate", description: "Add days to all time-limited keys (owner)", params: "days" },
    { name: "/mass-whitelist", description: "Whitelist all users with a role (owner)", params: "role, days?" },
  ];

  const troubleshooting = [
    { 
      problem: "Interactions Endpoint URL gives error when saving", 
      solution: "Make sure you saved credentials (Bot Token and Public Key) BEFORE configuring the URL on Discord." 
    },
    { 
      problem: "Bot doesn't respond to commands", 
      solution: "Check if the Bot Token and Public Key are correct. Try saving again." 
    },
    { 
      problem: "Commands don't appear on Discord", 
      solution: "Click 'Register Commands' again. On your server it should update instantly; globally it may take up to 1h." 
    },
    { 
      problem: "401 Unauthorized error", 
      solution: "The Bot Token is incorrect or expired. Generate a new token in the Developer Portal and save again." 
    },
    { 
      problem: "Signature validation error", 
      solution: "The Public Key is incorrect. Copy it again from the General Information page and save." 
    },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <div className="w-14 h-14 rounded-xl bg-[#5865F2]/20 flex items-center justify-center">
          <Bot className="w-7 h-7 text-[#5865F2]" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-foreground">Discord Bot</h2>
          <p className="text-sm text-muted-foreground">
            Create and configure your own Discord bot to manage keys
          </p>
        </div>
      </div>

      {/* Bot Credentials Form */}
      <div className="rounded-xl bg-gradient-to-br from-[#5865F2]/10 to-[#5865F2]/5 border border-[#5865F2]/30 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-lg bg-[#5865F2]/20 flex items-center justify-center">
            <Shield className="w-5 h-5 text-[#5865F2]" />
          </div>
          <div>
            <h3 className="font-bold text-lg">Bot Credentials</h3>
            <p className="text-sm text-muted-foreground">
              {hasExistingConfig ? "Update" : "Configure"} your Discord bot credentials
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="bot-token" className="text-sm font-medium flex items-center gap-2">
              <Key className="w-4 h-4 text-yellow-500" />
              Discord Bot Token
            </Label>
            <div className="relative">
              <Input
                id="bot-token"
                type={showToken ? "text" : "password"}
                value={botToken}
                onChange={(e) => setBotToken(e.target.value)}
                placeholder="Paste your bot token here..."
                className="pr-10 font-mono text-sm"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8"
                onClick={() => setShowToken(!showToken)}
              >
                {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Found at: Discord Developer Portal → Bot → Token
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="public-key" className="text-sm font-medium flex items-center gap-2">
              <Shield className="w-4 h-4 text-green-500" />
              Discord Public Key
            </Label>
            <div className="relative">
              <Input
                id="public-key"
                type={showPublicKey ? "text" : "password"}
                value={publicKey}
                onChange={(e) => setPublicKey(e.target.value)}
                placeholder="Paste your application public key here..."
                className="pr-10 font-mono text-sm"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8"
                onClick={() => setShowPublicKey(!showPublicKey)}
              >
                {showPublicKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Found at: Discord Developer Portal → General Information → Public Key
            </p>
          </div>

          {/* Guild ID Field */}
          <div className="space-y-2">
            <Label htmlFor="guild-id" className="text-sm font-medium flex items-center gap-2">
              <Users className="w-4 h-4 text-purple-500" />
              Discord Server ID (Guild ID)
            </Label>
            <Input
              id="guild-id"
              type="text"
              value={guildId}
              onChange={(e) => setGuildId(e.target.value)}
              placeholder="e.g., 123456789012345678"
              className="font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground">
              Right-click your server → Copy Server ID. Required for instant command updates.
            </p>
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              onClick={saveCredentials}
              disabled={isSaving || !botToken.trim() || !publicKey.trim()}
              className="flex-1 bg-[#5865F2] hover:bg-[#4752C4]"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Save Bot Credentials
                </>
              )}
            </Button>

            <Button
              onClick={registerCommands}
              disabled={isRegistering || !hasExistingConfig}
              variant="outline"
              className="border-[#5865F2]/50 text-[#5865F2] hover:bg-[#5865F2]/10"
            >
              {isRegistering ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Registering...
                </>
              ) : (
                <>
                  <Terminal className="w-4 h-4 mr-2" />
                  Register Commands
                </>
              )}
            </Button>
          </div>

          {hasExistingConfig && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-green-500/10 border border-green-500/20">
              <Check className="w-4 h-4 text-green-500" />
              <span className="text-sm text-green-600 dark:text-green-400">
                Credentials configured! Now set up the Interactions URL on Discord.
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Quick Copy Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-xl bg-primary/5 border border-primary/20 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Link2 className="w-4 h-4 text-primary" />
            <span className="text-sm font-semibold text-primary">Interactions Endpoint URL</span>
          </div>
          <p className="text-xs text-muted-foreground mb-3">
            Paste at: Discord App → General Information → Interactions Endpoint URL
          </p>
          <div className="flex gap-2">
            <Input
              value={interactionsUrl}
              readOnly
              className="font-mono text-xs bg-background/50"
            />
            <Button
              variant="outline"
              size="icon"
              onClick={() => copyToClipboard(interactionsUrl, "interactions")}
              className="shrink-0"
            >
              {copied === "interactions" ? (
                <Check className="h-4 w-4 text-green-500" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>

        <div className="rounded-xl bg-orange-500/5 border border-orange-500/20 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Zap className="w-4 h-4 text-orange-500" />
            <span className="text-sm font-semibold text-orange-500">Status</span>
          </div>
          <p className="text-xs text-muted-foreground mb-3">
            {hasExistingConfig 
              ? "Bot configured! Use the commands on your server."
              : "Save credentials to start using the bot."
            }
          </p>
          <div className={`flex items-center gap-2 p-2 rounded-lg ${hasExistingConfig ? 'bg-green-500/10 border border-green-500/20' : 'bg-yellow-500/10 border border-yellow-500/20'}`}>
            {hasExistingConfig ? (
              <>
                <Check className="w-4 h-4 text-green-500" />
                <span className="text-sm text-green-600 dark:text-green-400">Bot Configured</span>
              </>
            ) : (
              <>
                <AlertCircle className="w-4 h-4 text-yellow-500" />
                <span className="text-sm text-yellow-600 dark:text-yellow-400">Awaiting Configuration</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Step by Step Guide */}
      <div className="rounded-xl bg-card border border-border p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-lg bg-[#5865F2]/20 flex items-center justify-center">
            <MessageSquare className="w-5 h-5 text-[#5865F2]" />
          </div>
          <div>
            <h3 className="font-bold text-lg">Step by Step Guide</h3>
            <p className="text-sm text-muted-foreground">Follow each step carefully</p>
          </div>
        </div>

        <div className="space-y-4">
          {detailedSteps.map((item, index) => (
            <motion.div
              key={item.step}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              className={`rounded-xl ${item.bgColor} border ${item.borderColor} overflow-hidden`}
            >
              <div className="p-4">
                <div className="flex items-start gap-4">
                  <div className={`w-10 h-10 rounded-lg ${item.bgColor} flex items-center justify-center shrink-0`}>
                    <item.icon className={`w-5 h-5 ${item.color}`} />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-xs font-bold ${item.color} bg-background/50 px-2 py-0.5 rounded`}>
                        STEP {item.step}
                      </span>
                      <h4 className="font-bold text-sm">{item.title}</h4>
                    </div>
                    <p className="text-xs text-muted-foreground mb-3">{item.description}</p>
                    
                    {/* Details List */}
                    <ul className="space-y-1.5 mb-3">
                      {item.details.map((detail, i) => (
                        <li key={i} className="flex items-start gap-2 text-xs text-foreground/80">
                          <ArrowRight className="w-3 h-3 mt-0.5 text-muted-foreground shrink-0" />
                          <span>{detail}</span>
                        </li>
                      ))}
                    </ul>

                    {/* Warning */}
                    {item.warning && (
                      <div className="flex items-start gap-2 p-2 rounded-lg bg-yellow-500/10 border border-yellow-500/20 mb-3">
                        <AlertCircle className="w-4 h-4 text-yellow-500 shrink-0 mt-0.5" />
                        <p className="text-xs text-yellow-600 dark:text-yellow-400">{item.warning}</p>
                      </div>
                    )}

                    {/* Copy Value */}
                    {item.copyValue && (
                      <div className="space-y-1">
                        <span className="text-xs text-muted-foreground">{item.copyLabel}:</span>
                        <div className="flex gap-2">
                          <Input
                            value={item.copyValue}
                            readOnly
                            className="font-mono text-xs bg-background/70 h-8"
                          />
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => copyToClipboard(item.copyValue!, `step-${item.step}`)}
                            className="h-8 px-2"
                          >
                            {copied === `step-${item.step}` ? (
                              <Check className="h-3 w-3 text-green-500" />
                            ) : (
                              <Copy className="h-3 w-3" />
                            )}
                          </Button>
                        </div>
                      </div>
                    )}

                    {/* OAuth Scopes */}
                    {item.oauthScopes && (
                      <div className="flex flex-wrap gap-2 mt-3">
                        <span className="text-xs text-muted-foreground">Scopes:</span>
                        {item.oauthScopes.map((scope) => (
                          <code key={scope} className="text-xs px-2 py-0.5 rounded bg-background/50 text-purple-500">
                            {scope}
                          </code>
                        ))}
                      </div>
                    )}

                    {/* Link */}
                    {item.link && (
                      <a
                        href={item.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-primary hover:underline mt-3"
                      >
                        <ExternalLink className="w-3 h-3" />
                        {item.linkText}
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Available Commands */}
      <div className="rounded-xl bg-card border border-border p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-lg bg-orange-500/20 flex items-center justify-center">
            <Terminal className="w-5 h-5 text-orange-500" />
          </div>
          <div>
            <h3 className="font-bold text-lg">Available Commands</h3>
            <p className="text-sm text-muted-foreground">All bot slash commands</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {availableCommands.map((cmd) => (
            <div key={cmd.name} className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
              <code className="text-xs font-mono text-primary bg-primary/10 px-2 py-1 rounded shrink-0">
                {cmd.name}
              </code>
              <div className="min-w-0">
                <p className="text-xs text-foreground/80">{cmd.description}</p>
                <p className="text-xs text-muted-foreground mt-0.5">Params: {cmd.params}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Troubleshooting */}
      <div className="rounded-xl bg-card border border-border p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-lg bg-red-500/20 flex items-center justify-center">
            <AlertCircle className="w-5 h-5 text-red-500" />
          </div>
          <div>
            <h3 className="font-bold text-lg">Troubleshooting</h3>
            <p className="text-sm text-muted-foreground">Common errors and how to fix them</p>
          </div>
        </div>

        <Accordion type="single" collapsible className="space-y-2">
          {troubleshooting.map((item, index) => (
            <AccordionItem key={index} value={`item-${index}`} className="border rounded-lg px-4">
              <AccordionTrigger className="text-sm font-medium hover:no-underline">
                <span className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-500" />
                  {item.problem}
                </span>
              </AccordionTrigger>
              <AccordionContent>
                <div className="flex items-start gap-2 p-3 rounded-lg bg-green-500/10">
                  <Check className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                  <p className="text-sm text-foreground/80">{item.solution}</p>
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </motion.div>
  );
};

export default DiscordBotTab;
