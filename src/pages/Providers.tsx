import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  List, Plus, Clock, Trash2, Edit, Zap, 
  Loader2, RefreshCw, ChevronDown, Settings
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { 
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue 
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import ProviderModal from "@/components/providers/ProviderModal";

interface Provider {
  id: string;
  name: string;
  key_duration_minutes: number;
  created_at: string;
  checkpoints_count?: number;
}

export default function Providers() {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<"name" | "created_at">("name");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProvider, setEditingProvider] = useState<Provider | null>(null);

  useEffect(() => {
    fetchProviders();
  }, [sortBy]);

  const fetchProviders = async () => {
    setLoading(true);
    
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    // Fetch providers
    const { data: providersData, error } = await supabase
      .from("key_system_providers")
      .select("*")
      .eq("user_id", session.user.id)
      .order(sortBy, { ascending: sortBy === "name" });

    if (error) {
      toast.error("Failed to load providers");
      setLoading(false);
      return;
    }

    // Fetch checkpoint counts for each provider
    if (providersData && providersData.length > 0) {
      const providerIds = providersData.map(p => p.id);
      const { data: checkpointCounts } = await supabase
        .from("provider_checkpoints")
        .select("provider_id")
        .in("provider_id", providerIds);

      // Count checkpoints per provider
      const counts: Record<string, number> = {};
      checkpointCounts?.forEach(cp => {
        counts[cp.provider_id] = (counts[cp.provider_id] || 0) + 1;
      });

      setProviders(providersData.map(p => ({
        ...p,
        checkpoints_count: counts[p.id] || 0
      })));
    } else {
      setProviders([]);
    }

    setLoading(false);
  };

  const deleteProvider = async (id: string) => {
    if (!confirm("Are you sure you want to delete this provider? Scripts using it will no longer have a key system.")) {
      return;
    }

    const { error } = await supabase
      .from("key_system_providers")
      .delete()
      .eq("id", id);

    if (error) {
      toast.error("Failed to delete provider");
    } else {
      toast.success("Provider deleted");
      fetchProviders();
    }
  };

  const openEditModal = (provider: Provider) => {
    setEditingProvider(provider);
    setIsModalOpen(true);
  };

  const openNewModal = () => {
    setEditingProvider(null);
    setIsModalOpen(true);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setEditingProvider(null);
    fetchProviders();
  };

  const formatDuration = (minutes: number) => {
    if (minutes < 60) return `${minutes} min`;
    if (minutes < 1440) return `${Math.floor(minutes / 60)}h`;
    return `${Math.floor(minutes / 1440)}d`;
  };

  return (
    <DashboardLayout breadcrumb="Key System" title="Providers">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl border border-border/50 bg-card/50 backdrop-blur-sm p-6"
          style={{
            backgroundImage: "radial-gradient(circle at 1px 1px, hsl(var(--border)/0.3) 1px, transparent 0)",
            backgroundSize: "20px 20px"
          }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                <List className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">Providers</h1>
                <p className="text-muted-foreground text-sm">
                  {providers.length} Provider{providers.length !== 1 ? "s" : ""}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Select value={sortBy} onValueChange={(v) => setSortBy(v as "name" | "created_at")}>
                <SelectTrigger className="w-[140px] bg-secondary/50 border-border/50">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="name">Name ↑</SelectItem>
                  <SelectItem value="created_at">Date Created</SelectItem>
                </SelectContent>
              </Select>
              <Button onClick={openNewModal} className="gap-2 bg-primary hover:bg-primary/90">
                <Plus className="w-4 h-4" />
                New provider
              </Button>
            </div>
          </div>

          {/* Provider Usage Bar */}
          <div className="mt-6 p-4 rounded-lg bg-secondary/30 border border-border/30">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <List className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium">Provider Usage</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-primary/20 text-primary">
                  standard
                </span>
              </div>
              <span className="text-sm text-muted-foreground">{providers.length} / 20</span>
            </div>
            <div className="h-2 bg-secondary rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${(providers.length / 20) * 100}%` }}
                className="h-full bg-gradient-to-r from-green-500 to-emerald-400 rounded-full"
              />
            </div>
          </div>
        </motion.div>

        {/* Providers List */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : providers.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-xl border border-dashed border-border/50 bg-card/30 p-12 text-center"
          >
            <Settings className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-semibold mb-2">No providers yet</h3>
            <p className="text-muted-foreground mb-6">
              Create your first provider to start monetizing with LootLabs
            </p>
            <Button onClick={openNewModal} className="gap-2">
              <Plus className="w-4 h-4" />
              Create First Provider
            </Button>
          </motion.div>
        ) : (
          <div className="space-y-4">
            {providers.map((provider, index) => (
              <motion.div
                key={provider.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="rounded-xl border border-border/50 bg-card/50 backdrop-blur-sm p-6"
                style={{
                  backgroundImage: "radial-gradient(circle at 1px 1px, hsl(var(--border)/0.2) 1px, transparent 0)",
                  backgroundSize: "16px 16px"
                }}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
                      <List className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg">{provider.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        Provider #{provider.id.slice(-4).toUpperCase()}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Stats */}
                <div className="flex items-center gap-4 mb-4">
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-secondary/50 border border-border/30">
                    <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="text-sm">{formatDuration(provider.key_duration_minutes)}</span>
                  </div>
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-secondary/50 border border-border/30">
                    <List className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="text-sm">{provider.checkpoints_count || 0} Checkpoints</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="grid grid-cols-3 gap-3">
                  <Button
                    variant="outline"
                    className="w-full gap-2 bg-secondary/30 hover:bg-secondary/50"
                    onClick={() => openEditModal(provider)}
                  >
                    <Edit className="w-4 h-4" />
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full gap-2 bg-secondary/30 hover:bg-secondary/50"
                    onClick={() => {
                      const url = `${window.location.origin}/get_key?provider=${provider.id}`;
                      navigator.clipboard.writeText(url);
                      toast.success("Test URL copied!");
                    }}
                  >
                    <Zap className="w-4 h-4" />
                    Test
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full gap-2 text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/30"
                    onClick={() => deleteProvider(provider.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete
                  </Button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Provider Modal */}
      <ProviderModal
        isOpen={isModalOpen}
        onClose={handleModalClose}
        provider={editingProvider}
      />
    </DashboardLayout>
  );
}
