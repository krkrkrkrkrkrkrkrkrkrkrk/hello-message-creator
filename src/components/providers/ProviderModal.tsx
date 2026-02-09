import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Save, Plus, Trash2, Loader2, Clock, Link as LinkIcon, List } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Provider {
  id: string;
  name: string;
  key_duration_minutes: number;
  created_at: string;
}

interface Checkpoint {
  id?: string;
  provider_url: string;
  checkpoint_type: string;
  checkpoint_order: number;
  api_token?: string;
  anti_bypass_enabled?: boolean;
}

interface ProviderModalProps {
  isOpen: boolean;
  onClose: () => void;
  provider?: Provider | null;
}

const CHECKPOINT_TYPES = [
  { value: "linkvertise", label: "Linkvertise" },
  { value: "lootlabs", label: "LootLabs" },
  { value: "workink", label: "Work.ink" },
  { value: "custom", label: "Custom URL" },
];

export default function ProviderModal({ isOpen, onClose, provider }: ProviderModalProps) {
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [keyDuration, setKeyDuration] = useState("1440"); // 24 hours in minutes
  const [checkpoints, setCheckpoints] = useState<Checkpoint[]>([]);
  const [loadingCheckpoints, setLoadingCheckpoints] = useState(false);

  useEffect(() => {
    if (provider) {
      setName(provider.name);
      setKeyDuration(provider.key_duration_minutes.toString());
      loadCheckpoints(provider.id);
    } else {
      setName("");
      setKeyDuration("1440");
      setCheckpoints([]);
    }
  }, [provider, isOpen]);

  const loadCheckpoints = async (providerId: string) => {
    setLoadingCheckpoints(true);
    const { data, error } = await supabase
      .from("provider_checkpoints")
      .select("*")
      .eq("provider_id", providerId)
      .order("checkpoint_order");

    if (!error && data) {
      setCheckpoints(data);
    }
    setLoadingCheckpoints(false);
  };

  const addCheckpoint = () => {
    setCheckpoints([
      ...checkpoints,
      {
        provider_url: "",
        checkpoint_type: "lootlabs",
        checkpoint_order: checkpoints.length + 1,
        anti_bypass_enabled: false,
      },
    ]);
  };

  const removeCheckpoint = (index: number) => {
    setCheckpoints(checkpoints.filter((_, i) => i !== index));
  };

  const updateCheckpoint = (index: number, field: keyof Checkpoint, value: any) => {
    const updated = [...checkpoints];
    updated[index] = { ...updated[index], [field]: value };
    setCheckpoints(updated);
  };

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error("Please enter a provider name");
      return;
    }

    setSaving(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("Not authenticated");
        return;
      }

      let providerId = provider?.id;

      if (provider) {
        // Update existing provider
        const { error } = await supabase
          .from("key_system_providers")
          .update({
            name,
            key_duration_minutes: parseInt(keyDuration),
          })
          .eq("id", provider.id);

        if (error) throw error;
      } else {
        // Create new provider
        const { data, error } = await supabase
          .from("key_system_providers")
          .insert({
            name,
            key_duration_minutes: parseInt(keyDuration),
            user_id: session.user.id,
          })
          .select()
          .single();

        if (error) throw error;
        providerId = data.id;
      }

      // Delete existing checkpoints and re-insert
      if (providerId) {
        await supabase
          .from("provider_checkpoints")
          .delete()
          .eq("provider_id", providerId);

        if (checkpoints.length > 0) {
          const checkpointsToInsert = checkpoints.map((cp, index) => ({
            provider_id: providerId,
            provider_url: cp.provider_url,
            checkpoint_type: cp.checkpoint_type,
            checkpoint_order: index + 1,
            api_token: cp.api_token || null,
            anti_bypass_enabled: cp.anti_bypass_enabled || false,
          }));

          const { error: cpError } = await supabase
            .from("provider_checkpoints")
            .insert(checkpointsToInsert);

          if (cpError) throw cpError;
        }
      }

      toast.success(provider ? "Provider updated!" : "Provider created!");
      onClose();
    } catch (error: any) {
      toast.error(error.message || "Failed to save provider");
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-card rounded-2xl border border-border"
        >
          {/* Header */}
          <div className="sticky top-0 bg-card border-b border-border p-6 flex items-center justify-between z-10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                <List className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h2 className="text-xl font-bold">
                  {provider ? "Edit Provider" : "New Provider"}
                </h2>
                <p className="text-sm text-muted-foreground">
                  Configure your key system provider
                </p>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="w-5 h-5" />
            </Button>
          </div>

          <div className="p-6 space-y-6">
            {/* Basic Info */}
            <div className="space-y-4">
              <div>
                <Label>Provider Name</Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="My Provider"
                  className="mt-1.5 bg-secondary"
                />
              </div>

              <div>
                <Label>Key Duration</Label>
                <Select value={keyDuration} onValueChange={setKeyDuration}>
                  <SelectTrigger className="mt-1.5 bg-secondary">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="60">1 Hour</SelectItem>
                    <SelectItem value="360">6 Hours</SelectItem>
                    <SelectItem value="720">12 Hours</SelectItem>
                    <SelectItem value="1440">24 Hours</SelectItem>
                    <SelectItem value="4320">3 Days</SelectItem>
                    <SelectItem value="10080">7 Days</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Checkpoints */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold">Checkpoints</h3>
                  <p className="text-sm text-muted-foreground">
                    Add monetization steps
                  </p>
                </div>
                <Button onClick={addCheckpoint} variant="outline" size="sm" className="gap-2">
                  <Plus className="w-4 h-4" />
                  Add Checkpoint
                </Button>
              </div>

              {loadingCheckpoints ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                </div>
              ) : checkpoints.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground border border-dashed border-border rounded-lg">
                  <p>No checkpoints added</p>
                  <p className="text-sm">Add checkpoints to monetize your key system</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {checkpoints.map((checkpoint, index) => (
                    <div
                      key={index}
                      className="p-4 rounded-lg bg-secondary/30 border border-border space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Checkpoint #{index + 1}</span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => removeCheckpoint(index)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label className="text-xs">Type</Label>
                          <Select
                            value={checkpoint.checkpoint_type}
                            onValueChange={(v) => updateCheckpoint(index, "checkpoint_type", v)}
                          >
                            <SelectTrigger className="mt-1 bg-secondary">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {CHECKPOINT_TYPES.map((type) => (
                                <SelectItem key={type.value} value={type.value}>
                                  {type.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label className="text-xs">URL</Label>
                          <Input
                            value={checkpoint.provider_url}
                            onChange={(e) => updateCheckpoint(index, "provider_url", e.target.value)}
                            placeholder="https://..."
                            className="mt-1 bg-secondary"
                          />
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <Label className="text-xs">Anti-Bypass Protection</Label>
                        <Switch
                          checked={checkpoint.anti_bypass_enabled}
                          onCheckedChange={(v) => updateCheckpoint(index, "anti_bypass_enabled", v)}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="sticky bottom-0 bg-card border-t border-border p-6 flex justify-end gap-3">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving} className="gap-2">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {provider ? "Save Changes" : "Create Provider"}
            </Button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
