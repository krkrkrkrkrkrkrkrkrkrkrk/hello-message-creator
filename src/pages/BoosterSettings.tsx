import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Zap, Plus, Settings, Trash2, Edit, Power, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { toast } from "sonner";

interface Booster {
  id: string;
  name: string;
  type: "speed" | "priority" | "capacity";
  multiplier: number;
  enabled: boolean;
  created_at: string;
}

export default function BoosterSettings() {
  const [boosters, setBoosters] = useState<Booster[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newBooster, setNewBooster] = useState({ name: "", type: "speed" as const, multiplier: 2 });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchBoosters();
  }, []);

  const fetchBoosters = () => {
    setLoading(true);
    const stored = localStorage.getItem("shadow_boosters");
    if (stored) {
      setBoosters(JSON.parse(stored));
    }
    setLoading(false);
  };

  const saveBoosters = (newBoosters: Booster[]) => {
    localStorage.setItem("shadow_boosters", JSON.stringify(newBoosters));
    setBoosters(newBoosters);
  };

  const handleAddBooster = () => {
    if (!newBooster.name) {
      toast.error("Please enter a booster name");
      return;
    }

    setSaving(true);
    const booster: Booster = {
      id: crypto.randomUUID(),
      name: newBooster.name,
      type: newBooster.type,
      multiplier: newBooster.multiplier,
      enabled: true,
      created_at: new Date().toISOString(),
    };

    const updated = [booster, ...boosters];
    saveBoosters(updated);
    setNewBooster({ name: "", type: "speed", multiplier: 2 });
    setShowAddModal(false);
    setSaving(false);
    toast.success("Booster created successfully!");
  };

  const toggleBooster = (id: string) => {
    const updated = boosters.map(b => 
      b.id === id ? { ...b, enabled: !b.enabled } : b
    );
    saveBoosters(updated);
    toast.success("Booster status updated");
  };

  const deleteBooster = (id: string) => {
    const updated = boosters.filter(b => b.id !== id);
    saveBoosters(updated);
    toast.success("Booster deleted");
  };

  const getBoosterIcon = (type: string) => {
    switch (type) {
      case "speed": return "⚡";
      case "priority": return "🚀";
      case "capacity": return "📦";
      default: return "✨";
    }
  };

  const getBoosterColor = (type: string) => {
    switch (type) {
      case "speed": return "bg-yellow-500/20 text-yellow-500";
      case "priority": return "bg-blue-500/20 text-blue-500";
      case "capacity": return "bg-green-500/20 text-green-500";
      default: return "bg-primary/20 text-primary";
    }
  };

  return (
    <DashboardLayout breadcrumb="Booster Settings" title="Booster Settings">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl bg-primary/20 flex items-center justify-center">
              <Zap className="w-7 h-7 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-foreground">Booster Settings</h2>
              <p className="text-sm text-muted-foreground">Configure performance boosters for your services</p>
            </div>
          </div>
          <Button className="gap-2" onClick={() => setShowAddModal(true)}>
            <Plus className="w-4 h-4" />
            Add Booster
          </Button>
        </div>
      </motion.div>

      {/* Boosters List */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : boosters.length === 0 ? (
        <div className="rounded-xl bg-card border border-border p-12 text-center">
          <Zap className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
          <h3 className="text-xl font-bold mb-2">No Boosters Configured</h3>
          <p className="text-muted-foreground mb-4">Set up boosters to enhance your service</p>
          <Button className="gap-2" onClick={() => setShowAddModal(true)}>
            <Settings className="w-4 h-4" />
            Configure Booster
          </Button>
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          {boosters.map((booster, index) => (
            <motion.div
              key={booster.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className="rounded-xl bg-card border border-border p-4"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center text-2xl">
                    {getBoosterIcon(booster.type)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-foreground">{booster.name}</h3>
                      <Badge className={getBoosterColor(booster.type)}>
                        {booster.type}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {booster.multiplier}x multiplier • Created {new Date(booster.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">
                      {booster.enabled ? "Active" : "Inactive"}
                    </span>
                    <Switch
                      checked={booster.enabled}
                      onCheckedChange={() => toggleBooster(booster.id)}
                    />
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-blue-400 hover:text-blue-300 hover:bg-blue-500/10"
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={() => deleteBooster(booster.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      )}

      {/* Add Booster Modal */}
      {showAddModal && (
        <div 
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setShowAddModal(false)}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="rounded-xl bg-card border border-border p-6 w-full max-w-md"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-xl font-bold mb-4">Add New Booster</h3>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Booster Name</label>
                <Input
                  placeholder="Speed Boost"
                  value={newBooster.name}
                  onChange={(e) => setNewBooster({ ...newBooster, name: e.target.value })}
                  className="bg-secondary border-border"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Type</label>
                <div className="flex gap-2">
                  {["speed", "priority", "capacity"].map((type) => (
                    <Button
                      key={type}
                      variant={newBooster.type === type ? "default" : "outline"}
                      className="flex-1 capitalize"
                      onClick={() => setNewBooster({ ...newBooster, type: type as any })}
                    >
                      {getBoosterIcon(type)} {type}
                    </Button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Multiplier</label>
                <Input
                  type="number"
                  min={1}
                  max={10}
                  value={newBooster.multiplier}
                  onChange={(e) => setNewBooster({ ...newBooster, multiplier: parseInt(e.target.value) || 1 })}
                  className="bg-secondary border-border"
                />
              </div>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => setShowAddModal(false)}>
                  Cancel
                </Button>
                <Button className="flex-1 bg-primary" onClick={handleAddBooster} disabled={saving}>
                  {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
                  Add Booster
                </Button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </DashboardLayout>
  );
}
