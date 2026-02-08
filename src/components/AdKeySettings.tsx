import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, Loader2, Save, Zap, Link as LinkIcon, Clock, 
  ToggleLeft, ToggleRight, Settings, Plus, Trash2,
  ExternalLink, Shield, GripVertical
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface AdKeySettingsProps {
  scriptId: string;
  scriptName: string;
  isOpen: boolean;
  onClose: () => void;
}

interface AdKeyConfig {
  enabled: boolean;
  checkpoint_count: number;
  key_duration_hours: number;
  custom_provider_url: string | null;
  linkvertise_enabled: boolean;
}

interface Checkpoint {
  id?: string;
  checkpoint_order: number;
  provider: string;
  provider_url: string;
  api_token: string;
  anti_bypass_enabled: boolean;
}

const PROVIDERS = [
  { value: "linkvertise", label: "Linkvertise", icon: "🔗" },
  { value: "lootlabs", label: "Lootlabs", icon: "🎁" },
  { value: "workink", label: "Work.ink", icon: "💼" },
  { value: "shrtfly", label: "ShrtFly", icon: "✈️" },
  { value: "shrinkearn", label: "ShrinkEarn", icon: "💰" },
  { value: "custom", label: "Custom URL", icon: "🌐" },
];

const AdKeySettings = ({ scriptId, scriptName, isOpen, onClose }: AdKeySettingsProps) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState<AdKeyConfig>({
    enabled: false,
    checkpoint_count: 3,
    key_duration_hours: 24,
    custom_provider_url: null,
    linkvertise_enabled: false,
  });
  const [checkpoints, setCheckpoints] = useState<Checkpoint[]>([]);
  const [activeTab, setActiveTab] = useState<"general" | "checkpoints">("general");

  useEffect(() => {
    if (isOpen) {
      fetchSettings();
    }
  }, [isOpen, scriptId]);

  const fetchSettings = async () => {
    setLoading(true);

    // Fetch main settings
    const { data: settingsData } = await supabase
      .from("ad_key_settings")
      .select("*")
      .eq("script_id", scriptId)
      .maybeSingle();

    if (settingsData) {
      setConfig({
        enabled: settingsData.enabled,
        checkpoint_count: settingsData.checkpoint_count,
        key_duration_hours: settingsData.key_duration_hours,
        custom_provider_url: settingsData.custom_provider_url,
        linkvertise_enabled: settingsData.linkvertise_enabled || false,
      });
    }

    // Fetch checkpoints
    const { data: checkpointsData } = await supabase
      .from("ad_checkpoints")
      .select("*")
      .eq("script_id", scriptId)
      .order("checkpoint_order", { ascending: true });

    if (checkpointsData && checkpointsData.length > 0) {
      setCheckpoints(checkpointsData.map(c => ({
        id: c.id,
        checkpoint_order: c.checkpoint_order,
        provider: c.provider,
        provider_url: c.provider_url,
        api_token: c.api_token || "",
        anti_bypass_enabled: c.anti_bypass_enabled,
      })));
    }

    setLoading(false);
  };

  const saveSettings = async () => {
    setSaving(true);

    try {
      // Check if settings exist
      const { data: existing } = await supabase
        .from("ad_key_settings")
        .select("id")
        .eq("script_id", scriptId)
        .maybeSingle();

      let error;

      if (existing) {
        // Update
        const { error: updateError } = await supabase
          .from("ad_key_settings")
          .update({
            enabled: config.enabled,
            checkpoint_count: checkpoints.length > 0 ? checkpoints.length : config.checkpoint_count,
            key_duration_hours: config.key_duration_hours,
            custom_provider_url: config.custom_provider_url,
            linkvertise_enabled: config.linkvertise_enabled,
          })
          .eq("script_id", scriptId);
        error = updateError;
      } else {
        // Insert
        const { error: insertError } = await supabase
          .from("ad_key_settings")
          .insert({
            script_id: scriptId,
            enabled: config.enabled,
            checkpoint_count: checkpoints.length > 0 ? checkpoints.length : config.checkpoint_count,
            key_duration_hours: config.key_duration_hours,
            custom_provider_url: config.custom_provider_url,
            linkvertise_enabled: config.linkvertise_enabled,
          });
        error = insertError;
      }

      if (error) throw error;

      // Save checkpoints
      // First, get existing checkpoint IDs
      const { data: existingCheckpoints } = await supabase
        .from("ad_checkpoints")
        .select("id")
        .eq("script_id", scriptId);

      const existingIds = existingCheckpoints?.map(c => c.id) || [];
      const currentIds = checkpoints.filter(c => c.id).map(c => c.id!);
      const idsToDelete = existingIds.filter(id => !currentIds.includes(id));

      // Delete removed checkpoints
      if (idsToDelete.length > 0) {
        await supabase
          .from("ad_checkpoints")
          .delete()
          .in("id", idsToDelete);
      }

      // Upsert checkpoints
      for (const cp of checkpoints) {
        if (cp.id) {
          // Update existing
          await supabase
            .from("ad_checkpoints")
            .update({
              checkpoint_order: cp.checkpoint_order,
              provider: cp.provider,
              provider_url: cp.provider_url,
              api_token: cp.api_token || null,
              anti_bypass_enabled: cp.anti_bypass_enabled,
            })
            .eq("id", cp.id);
        } else {
          // Insert new
          await supabase
            .from("ad_checkpoints")
            .insert({
              script_id: scriptId,
              checkpoint_order: cp.checkpoint_order,
              provider: cp.provider,
              provider_url: cp.provider_url,
              api_token: cp.api_token || null,
              anti_bypass_enabled: cp.anti_bypass_enabled,
            });
        }
      }

      toast.success("Ad-Key settings saved!");
      onClose();
    } catch (err) {
      console.error("Error saving settings:", err);
      toast.error("Failed to save settings");
    }

    setSaving(false);
  };

  const addCheckpoint = () => {
    const newOrder = checkpoints.length + 1;
    setCheckpoints([...checkpoints, {
      checkpoint_order: newOrder,
      provider: "linkvertise",
      provider_url: "",
      api_token: "",
      anti_bypass_enabled: false,
    }]);
  };

  const removeCheckpoint = (index: number) => {
    const updated = checkpoints.filter((_, i) => i !== index);
    // Reorder remaining checkpoints
    updated.forEach((cp, i) => {
      cp.checkpoint_order = i + 1;
    });
    setCheckpoints(updated);
  };

  const updateCheckpoint = (index: number, field: keyof Checkpoint, value: string | boolean | number) => {
    const updated = [...checkpoints];
    updated[index] = { ...updated[index], [field]: value };
    setCheckpoints(updated);
  };

  const getKeySystemUrl = () => {
    const path = `/get_key?for=${encodeURIComponent(scriptId)}`;
    if (typeof window !== "undefined") return `${window.location.origin}${path}`;
    return path;
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="glass-card rounded-2xl w-full max-w-2xl border border-border/50 overflow-hidden max-h-[90vh] flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="relative bg-gradient-to-r from-primary/10 to-transparent p-6 border-b border-border/50 shrink-0">
            <div className="pointer-events-none absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
            <div className="relative flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 flex items-center justify-center">
                  <Zap className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h2 className="text-xl font-bold">Ad-Key System</h2>
                  <p className="text-sm text-muted-foreground">{scriptName}</p>
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={onClose}>
                <X className="w-5 h-5" />
              </Button>
            </div>
          </div>

          {/* Content */}
          {loading ? (
            <div className="p-8 flex items-center justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto">
              {/* Tabs */}
              <div className="flex border-b border-border/50 px-6">
                <button
                  onClick={() => setActiveTab("general")}
                  className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === "general"
                      ? "border-primary text-primary"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  }`}
                >
                  General Settings
                </button>
                <button
                  onClick={() => setActiveTab("checkpoints")}
                  className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === "checkpoints"
                      ? "border-primary text-primary"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Checkpoints ({checkpoints.length})
                </button>
              </div>

              <div className="p-6 space-y-6">
                {activeTab === "general" && (
                  <>
                    {/* Enable Toggle */}
                    <div className="flex items-center justify-between p-4 rounded-xl bg-background/60 border border-border/30">
                      <div className="flex items-center gap-3">
                        {config.enabled ? (
                          <ToggleRight className="w-5 h-5 text-primary" />
                        ) : (
                          <ToggleLeft className="w-5 h-5 text-muted-foreground" />
                        )}
                        <div>
                          <p className="font-medium">Enable Ad-Key System</p>
                          <p className="text-xs text-muted-foreground">
                            Require users to complete checkpoints to get a key
                          </p>
                        </div>
                      </div>
                      <Switch
                        checked={config.enabled}
                        onCheckedChange={(checked) => setConfig({ ...config, enabled: checked })}
                      />
                    </div>

                    {config.enabled && (
                      <>
                        {/* Key Duration */}
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <Label className="flex items-center gap-2">
                              <Clock className="w-4 h-4 text-muted-foreground" />
                              Key Duration
                            </Label>
                            <span className="text-sm font-mono bg-primary/10 px-2 py-1 rounded text-primary">
                              {config.key_duration_hours}h
                            </span>
                          </div>
                          <Slider
                            value={[config.key_duration_hours]}
                            onValueChange={(val) => setConfig({ ...config, key_duration_hours: val[0] })}
                            min={1}
                            max={168}
                            step={1}
                            className="w-full"
                          />
                          <p className="text-xs text-muted-foreground">
                            How long generated keys remain valid (1h to 7 days)
                          </p>
                        </div>

                        {/* Default Checkpoints (if no custom ones) */}
                        {checkpoints.length === 0 && (
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <Label className="flex items-center gap-2">
                                <Settings className="w-4 h-4 text-muted-foreground" />
                                Default Checkpoints
                              </Label>
                              <span className="text-sm font-mono bg-primary/10 px-2 py-1 rounded text-primary">
                                {config.checkpoint_count} steps
                              </span>
                            </div>
                            <Slider
                              value={[config.checkpoint_count]}
                              onValueChange={(val) => setConfig({ ...config, checkpoint_count: val[0] })}
                              min={1}
                              max={5}
                              step={1}
                              className="w-full"
                            />
                            <p className="text-xs text-muted-foreground">
                              Add custom checkpoints for real ad links (Linkvertise, Lootlabs, etc.)
                            </p>
                          </div>
                        )}

                        {/* Get Key URL */}
                        <div className="p-4 rounded-xl bg-gradient-to-r from-primary/10 to-transparent border border-primary/20">
                          <p className="text-xs text-muted-foreground mb-2">Key System URL (share with users)</p>
                          <div className="flex items-center gap-2">
                            <code className="flex-1 text-xs font-mono bg-background/50 px-3 py-2 rounded border border-border/30 truncate">
                              {getKeySystemUrl()}
                            </code>
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => {
                                navigator.clipboard.writeText(getKeySystemUrl());
                                toast.success("URL copied!");
                              }}
                            >
                              Copy
                            </Button>
                          </div>
                        </div>
                      </>
                    )}
                  </>
                )}

                {activeTab === "checkpoints" && (
                  <>
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold">Ad Checkpoints</h3>
                        <p className="text-sm text-muted-foreground">
                          Configure your monetization links (Linkvertise, Lootlabs, Work.ink, etc.)
                        </p>
                      </div>
                      <Button onClick={addCheckpoint} size="sm" className="gap-2">
                        <Plus className="w-4 h-4" />
                        Add Checkpoint
                      </Button>
                    </div>

                    {checkpoints.length === 0 ? (
                      <div className="text-center py-12 border border-dashed border-border/50 rounded-xl">
                        <Shield className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                        <p className="text-muted-foreground mb-2">No checkpoints configured</p>
                        <p className="text-sm text-muted-foreground mb-4">
                          Add checkpoints to monetize with ad links
                        </p>
                        <Button onClick={addCheckpoint} variant="outline" size="sm" className="gap-2">
                          <Plus className="w-4 h-4" />
                          Add First Checkpoint
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {checkpoints.map((cp, index) => (
                          <motion.div
                            key={index}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="p-4 rounded-xl bg-background/60 border border-border/30 space-y-4"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-bold">
                                  {cp.checkpoint_order}
                                </div>
                                <span className="font-medium">Checkpoint {cp.checkpoint_order}</span>
                              </div>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => removeCheckpoint(index)}
                                className="text-destructive hover:text-destructive"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <Label>Provider</Label>
                                <Select
                                  value={cp.provider}
                                  onValueChange={(v) => updateCheckpoint(index, "provider", v)}
                                >
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {PROVIDERS.map(p => (
                                      <SelectItem key={p.value} value={p.value}>
                                        <span className="flex items-center gap-2">
                                          <span>{p.icon}</span>
                                          <span>{p.label}</span>
                                        </span>
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>

                              <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                  <Label>Anti-Bypass</Label>
                                  <Switch
                                    checked={cp.anti_bypass_enabled}
                                    onCheckedChange={(v) => updateCheckpoint(index, "anti_bypass_enabled", v)}
                                  />
                                </div>
                                <p className="text-xs text-muted-foreground">
                                  Verify with provider API
                                </p>
                              </div>
                            </div>

                            <div className="space-y-2">
                              <Label>Provider URL</Label>
                              <Input
                                placeholder="https://link-target.net/123456/your-link"
                                value={cp.provider_url}
                                onChange={(e) => updateCheckpoint(index, "provider_url", e.target.value)}
                                className="font-mono text-sm"
                              />
                              <p className="text-xs text-muted-foreground">
                                Your {PROVIDERS.find(p => p.value === cp.provider)?.label} short URL
                              </p>
                            </div>

                            {cp.anti_bypass_enabled && (
                              <div className="space-y-2">
                                <Label>API Token (for anti-bypass)</Label>
                                <Input
                                  type="password"
                                  placeholder="Your provider API token"
                                  value={cp.api_token}
                                  onChange={(e) => updateCheckpoint(index, "api_token", e.target.value)}
                                  className="font-mono text-sm"
                                />
                                <p className="text-xs text-muted-foreground">
                                  Find this in your {PROVIDERS.find(p => p.value === cp.provider)?.label} dashboard settings
                                </p>
                              </div>
                            )}
                          </motion.div>
                        ))}
                      </div>
                    )}

                    {/* Info box */}
                    <div className="p-4 rounded-xl bg-primary/5 border border-primary/20">
                      <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
                        <ExternalLink className="w-4 h-4 text-primary" />
                        How it works
                      </h4>
                      <ul className="text-xs text-muted-foreground space-y-1">
                        <li>• Create links on your ad provider (Linkvertise, Lootlabs, etc.)</li>
                        <li>• Paste the short URL here as a checkpoint</li>
                        <li>• Enable anti-bypass and add your API token for verification</li>
                        <li>• Users will be redirected to complete each checkpoint</li>
                      </ul>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Footer Actions */}
          {!loading && (
            <div className="flex gap-3 p-6 border-t border-border/50 shrink-0">
              <Button variant="outline" className="flex-1" onClick={onClose}>
                Cancel
              </Button>
              <Button className="flex-1" onClick={saveSettings} disabled={saving}>
                {saving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Save Settings
                  </>
                )}
              </Button>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default AdKeySettings;