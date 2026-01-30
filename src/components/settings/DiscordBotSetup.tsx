import { useState } from "react";
import { motion } from "framer-motion";
import { Bot, Copy, Check, ExternalLink, Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

const DiscordBotSetup = () => {
  const [copied, setCopied] = useState<string | null>(null);

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const interactionsUrl = `${supabaseUrl}/functions/v1/discord-bot`;

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    toast.success("Copied to clipboard!");
    setTimeout(() => setCopied(null), 2000);
  };

  const steps = [
    {
      step: 1,
      title: "Create Discord Application",
      description: "Go to the Discord Developer Portal and create a new application",
      link: "https://discord.com/developers/applications",
      linkText: "Discord Developer Portal"
    },
    {
      step: 2,
      title: "Create Bot",
      description: "In your application, go to 'Bot' section and create a bot. Save the Bot Token.",
    },
    {
      step: 3,
      title: "Get Public Key",
      description: "Copy the 'Public Key' from the General Information page of your application.",
    },
    {
      step: 4,
      title: "Configure Interactions URL",
      description: "In General Information, paste this URL in 'Interactions Endpoint URL':",
      copyValue: interactionsUrl,
    },
    {
      step: 5,
      title: "Invite Bot to Server",
      description: "Go to OAuth2 > URL Generator, select 'bot' and 'applications.commands' scopes, then 'Administrator' permission. Use the generated URL to invite.",
    },
    {
      step: 6,
      title: "Register Commands",
      description: "After setting up secrets, call the register commands endpoint:",
      copyValue: `${supabaseUrl}/functions/v1/register-discord-commands`,
    }
  ];

  const requiredPermissions = [
    "Send Messages",
    "Send Messages in Threads", 
    "Embed Links",
    "Manage Roles",
    "Use Slash Commands",
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card rounded-2xl p-6 border border-border/50"
    >
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 rounded-xl bg-[#5865F2]/20 flex items-center justify-center">
          <Bot className="w-6 h-6 text-[#5865F2]" />
        </div>
        <div>
          <h2 className="text-xl font-bold">Discord Bot Setup</h2>
          <p className="text-sm text-muted-foreground">Configure your own Discord bot</p>
        </div>
      </div>

      {/* Interactions URL - Highlighted */}
      <div className="mb-6 p-4 rounded-xl bg-primary/5 border border-primary/20">
        <div className="flex items-center gap-2 mb-2">
          <Settings2 className="w-4 h-4 text-primary" />
          <span className="text-sm font-semibold text-primary">Interactions Endpoint URL</span>
        </div>
        <p className="text-xs text-muted-foreground mb-3">
          Paste this URL in your Discord Application → General Information → Interactions Endpoint URL
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

      {/* Step by Step Guide */}
      <div className="space-y-4 mb-6">
        <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Setup Guide</h3>
        {steps.map((item) => (
          <div key={item.step} className="flex gap-4 p-3 rounded-lg bg-background/50 border border-border/30">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <span className="text-sm font-bold text-primary">{item.step}</span>
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-medium text-sm">{item.title}</h4>
              <p className="text-xs text-muted-foreground mt-1">{item.description}</p>
              
              {item.link && (
                <a
                  href={item.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-primary hover:underline mt-2"
                >
                  {item.linkText}
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
              
              {item.copyValue && (
                <div className="flex gap-2 mt-2">
                  <Input
                    value={item.copyValue}
                    readOnly
                    className="font-mono text-xs bg-background/70 h-8"
                  />
                  <Button
                    variant="ghost"
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
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Required Permissions */}
      <div className="p-4 rounded-xl bg-background/50 border border-border/30">
        <h4 className="font-medium text-sm mb-3">Required Bot Permissions</h4>
        <div className="flex flex-wrap gap-2">
          {requiredPermissions.map((perm) => (
            <span
              key={perm}
              className="px-2 py-1 text-xs rounded-md bg-primary/10 text-primary border border-primary/20"
            >
              {perm}
            </span>
          ))}
        </div>
      </div>

      {/* Bot Invite Link Generator */}
      <div className="mt-4 p-4 rounded-xl bg-[#5865F2]/5 border border-[#5865F2]/20">
        <p className="text-xs text-muted-foreground mb-2">
          <strong>Quick Tip:</strong> For the bot invite URL, use these OAuth2 settings:
        </p>
        <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
          <li>Scopes: <code className="bg-background/50 px-1 rounded">bot</code>, <code className="bg-background/50 px-1 rounded">applications.commands</code></li>
          <li>Permissions: <code className="bg-background/50 px-1 rounded">Administrator</code> (recommended for full functionality)</li>
        </ul>
      </div>
    </motion.div>
  );
};

export default DiscordBotSetup;
