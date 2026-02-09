import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Key, Check, Loader2, List, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

interface Provider {
  id: string;
  name: string;
  key_duration_minutes: number;
}

interface SelectProviderModalProps {
  scriptId: string;
  scriptName: string;
  currentProviderId: string | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function SelectProviderModal({
  scriptId,
  scriptName,
  currentProviderId,
  isOpen,
  onClose,
}: SelectProviderModalProps) {
  const navigate = useNavigate();
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(currentProviderId);

  useEffect(() => {
    if (isOpen) {
      fetchProviders();
      setSelectedId(currentProviderId);
    }
  }, [isOpen, currentProviderId]);

  const fetchProviders = async () => {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const { data, error } = await supabase
      .from("key_system_providers")
      .select("id, name, key_duration_minutes")
      .eq("user_id", session.user.id)
      .order("name");

    if (!error) {
      setProviders(data || []);
    }
    setLoading(false);
  };

  const handleSave = async () => {
    setSaving(true);

    try {
      const { error } = await supabase
        .from("scripts")
        .update({ key_provider_id: selectedId })
        .eq("id", scriptId);

      if (error) throw error;

      toast.success(selectedId ? "Key system enabled!" : "Key system disabled");
      onClose();
    } catch (error: any) {
      toast.error(error.message || "Failed to update");
    } finally {
      setSaving(false);
    }
  };

  const formatDuration = (minutes: number) => {
    if (minutes < 60) return `${minutes} min`;
    if (minutes < 1440) return `${Math.floor(minutes / 60)}h`;
    return `${Math.floor(minutes / 1440)}d`;
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
          className="w-full max-w-md bg-card rounded-2xl border border-border overflow-hidden"
        >
          {/* Header */}
          <div className="p-6 border-b border-border">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center">
                  <Key className="w-5 h-5 text-amber-500" />
                </div>
                <div>
                  <h2 className="text-lg font-bold">Key System</h2>
                  <p className="text-sm text-muted-foreground">{scriptName}</p>
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={onClose}>
                <X className="w-5 h-5" />
              </Button>
            </div>
          </div>

          <div className="p-6 space-y-4">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : providers.length === 0 ? (
              <div className="text-center py-8">
                <List className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-50" />
                <p className="text-muted-foreground mb-4">No providers yet</p>
                <Button onClick={() => navigate("/providers")} className="gap-2">
                  <Plus className="w-4 h-4" />
                  Create Provider
                </Button>
              </div>
            ) : (
              <>
                {/* None Option */}
                <button
                  onClick={() => setSelectedId(null)}
                  className={`w-full p-4 rounded-lg border text-left transition-all ${
                    selectedId === null
                      ? "border-primary bg-primary/10"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">No Key System</p>
                      <p className="text-sm text-muted-foreground">Script runs without authentication</p>
                    </div>
                    {selectedId === null && <Check className="w-5 h-5 text-primary" />}
                  </div>
                </button>

                {/* Provider Options */}
                {providers.map((provider) => (
                  <button
                    key={provider.id}
                    onClick={() => setSelectedId(provider.id)}
                    className={`w-full p-4 rounded-lg border text-left transition-all ${
                      selectedId === provider.id
                        ? "border-primary bg-primary/10"
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{provider.name}</p>
                        <p className="text-sm text-muted-foreground">
                          Keys expire in {formatDuration(provider.key_duration_minutes)}
                        </p>
                      </div>
                      {selectedId === provider.id && <Check className="w-5 h-5 text-primary" />}
                    </div>
                  </button>
                ))}
              </>
            )}
          </div>

          {/* Footer */}
          <div className="p-6 border-t border-border flex justify-end gap-3">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving} className="gap-2">
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              Save
            </Button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
