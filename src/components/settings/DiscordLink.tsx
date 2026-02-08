import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Bot, Link2, Check, Loader2, Unlink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const DiscordLink = () => {
  const [discordId, setDiscordId] = useState("");
  const [currentDiscordId, setCurrentDiscordId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchDiscordId();
  }, []);

  const fetchDiscordId = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("discord_id")
        .eq("id", user.id)
        .single();
      
      if (profile?.discord_id) {
        setCurrentDiscordId(profile.discord_id);
        setDiscordId(profile.discord_id);
      }
    }
    setLoading(false);
  };

  const handleLink = async () => {
    if (!discordId || discordId.length < 17) {
      toast.error("Please enter a valid Discord ID (17-19 digits)");
      return;
    }

    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      toast.error("Not authenticated");
      setSaving(false);
      return;
    }

    const { error } = await supabase
      .from("profiles")
      .update({ discord_id: discordId })
      .eq("id", user.id);

    if (error) {
      toast.error("Failed to link Discord ID");
    } else {
      setCurrentDiscordId(discordId);
      toast.success("Discord ID linked successfully!");
    }
    setSaving(false);
  };

  const handleUnlink = async () => {
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      toast.error("Not authenticated");
      setSaving(false);
      return;
    }

    const { error } = await supabase
      .from("profiles")
      .update({ discord_id: null })
      .eq("id", user.id);

    if (error) {
      toast.error("Failed to unlink Discord ID");
    } else {
      setCurrentDiscordId(null);
      setDiscordId("");
      toast.success("Discord ID unlinked!");
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="glass-card rounded-2xl p-6 border border-border/50">
        <div className="flex items-center justify-center py-4">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card rounded-2xl p-6 border border-border/50 mb-6"
    >
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-[#5865F2]/20 flex items-center justify-center">
          <Bot className="w-5 h-5 text-[#5865F2]" />
        </div>
        <div>
          <h2 className="text-lg font-bold">Link Discord Account</h2>
          <p className="text-sm text-muted-foreground">Connect your Discord ID for bot commands</p>
        </div>
      </div>

      {currentDiscordId ? (
        <div className="space-y-4">
          <div className="flex items-center gap-2 p-3 rounded-lg bg-green-500/10 border border-green-500/30">
            <Check className="w-4 h-4 text-green-500" />
            <span className="text-sm text-green-500 font-medium">Discord Linked</span>
          </div>
          
          <div className="flex items-center gap-2">
            <Input
              value={currentDiscordId}
              readOnly
              className="bg-background/50 font-mono"
            />
            <Button
              variant="destructive"
              size="icon"
              onClick={handleUnlink}
              disabled={saving}
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Unlink className="w-4 h-4" />}
            </Button>
          </div>

          <p className="text-xs text-muted-foreground">
            Your Discord commands like <code className="bg-background/50 px-1 rounded">/resethwid</code> will work automatically.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Discord User ID</label>
            <div className="flex gap-2">
              <Input
                placeholder="123456789012345678"
                value={discordId}
                onChange={(e) => setDiscordId(e.target.value.replace(/\D/g, ""))}
                className="bg-background/50 font-mono"
                maxLength={19}
              />
              <Button
                onClick={handleLink}
                disabled={saving || discordId.length < 17}
                variant="glow"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Link2 className="w-4 h-4" />}
                <span className="ml-2">Link</span>
              </Button>
            </div>
          </div>

          <div className="p-3 rounded-lg bg-muted/50 border border-border/30">
            <p className="text-xs text-muted-foreground mb-2">
              <strong>How to find your Discord ID:</strong>
            </p>
            <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside">
              <li>Enable Developer Mode in Discord Settings → Advanced</li>
              <li>Right-click on your username</li>
              <li>Click "Copy User ID"</li>
            </ol>
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default DiscordLink;