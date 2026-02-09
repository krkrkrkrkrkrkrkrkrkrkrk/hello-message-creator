import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Key, Plus, Copy, Trash2, Edit,
  Loader2, Check, Search, Download, RefreshCw, Monitor
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import DashboardLayout from "@/components/dashboard/DashboardLayout";

interface ScriptKey {
  id: string;
  key_value: string;
  hwid: string | null;
  is_banned: boolean;
  expires_at: string | null;
  created_at: string;
  used_at: string | null;
  note: string | null;
  key_format: string | null;
  duration_type: string | null;
  discord_id: string | null;
  script_id: string;
}

interface Script {
  id: string;
  name: string;
}

const Keys = () => {
  const navigate = useNavigate();
  const { scriptId } = useParams();
  const [keys, setKeys] = useState<ScriptKey[]>([]);
  const [scripts, setScripts] = useState<Script[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [search, setSearch] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [activeTab, setActiveTab] = useState<"generated" | "active" | "keyless">("active");
  
  // Key generation options
  const [selectedScriptId, setSelectedScriptId] = useState<string>("");
  const [keyFormat, setKeyFormat] = useState("");
  const [durationType, setDurationType] = useState<"days" | "months" | "years" | "lifetime">("lifetime");
  const [durationValue, setDurationValue] = useState(30);
  const [keyQuantity, setKeyQuantity] = useState(1);
  const [discordId, setDiscordId] = useState("");

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate("/auth");
      } else {
        fetchData();
      }
    });
  }, [navigate, scriptId]);

  const fetchData = async () => {
    // Fetch user's scripts
    const { data: scriptsData } = await supabase
      .from("scripts")
      .select("id, name");
    
    if (scriptsData) {
      setScripts(scriptsData);
      if (scriptsData.length > 0 && !selectedScriptId) {
        setSelectedScriptId(scriptId || scriptsData[0].id);
      }
    }

    // Fetch keys
    if (scriptId) {
      const { data, error } = await supabase
        .from("script_keys")
        .select("*")
        .eq("script_id", scriptId)
        .order("created_at", { ascending: false });

      if (error) {
        toast.error("Failed to fetch keys");
      } else {
        setKeys(data || []);
      }
    } else if (scriptsData && scriptsData.length > 0) {
      const scriptIds = scriptsData.map(s => s.id);
      const { data, error } = await supabase
        .from("script_keys")
        .select("*")
        .in("script_id", scriptIds)
        .order("created_at", { ascending: false });

      if (error) {
        toast.error("Failed to fetch keys");
      } else {
        setKeys(data || []);
      }
    }
    
    setLoading(false);
  };

  const generateRandomKey = (format: string) => {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let key = '';
    for (let i = 0; i < 32; i++) {
      key += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return format ? `${format}_${key}` : `shadowauth_${key}`;
  };

  const calculateExpiry = () => {
    if (durationType === "lifetime") return null;
    
    const now = new Date();
    switch (durationType) {
      case "days":
        now.setDate(now.getDate() + durationValue);
        break;
      case "months":
        now.setMonth(now.getMonth() + durationValue);
        break;
      case "years":
        now.setFullYear(now.getFullYear() + durationValue);
        break;
    }
    return now.toISOString();
  };

  const createKeys = async () => {
    const targetScriptId = scriptId || selectedScriptId;
    if (!targetScriptId) {
      toast.error("Please select a script first");
      return;
    }
    
    // Limit to 100 keys max to prevent crashes
    const safeQuantity = Math.min(keyQuantity, 100);
    if (keyQuantity > 100) {
      toast.warning("Limited to 100 keys per batch to prevent issues");
    }
    
    setCreating(true);

    const keysToCreate = [];
    for (let i = 0; i < safeQuantity; i++) {
      keysToCreate.push({
        script_id: targetScriptId,
        key_value: generateRandomKey(keyFormat),
        key_format: keyFormat || null,
        duration_type: durationType,
        expires_at: calculateExpiry(),
        discord_id: discordId || null,
      });
    }

    const { error } = await supabase
      .from("script_keys")
      .insert(keysToCreate);

    if (error) {
      console.error("Error creating keys:", error);
      toast.error("Failed to create keys: " + error.message);
    } else {
      toast.success(`${safeQuantity} key(s) created successfully!`);
      setShowGenerateModal(false);
      setDiscordId("");
      setKeyFormat("");
      setKeyQuantity(1);
      // Stay on current tab - don't switch
      fetchData();
    }
    setCreating(false);
  };

  const deleteKey = async (keyId: string) => {
    const { error } = await supabase
      .from("script_keys")
      .delete()
      .eq("id", keyId);

    if (error) {
      toast.error("Failed to delete key");
    } else {
      toast.success("Key deleted");
      setKeys(keys.filter(k => k.id !== keyId));
    }
  };

  const copyKey = (keyValue: string) => {
    navigator.clipboard.writeText(keyValue);
    setCopiedId(keyValue);
    toast.success("Key copied!");
    setTimeout(() => setCopiedId(null), 2000);
  };

  const exportKeys = () => {
    const csvContent = keys.map(k => k.key_value).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `keys-export.csv`;
    a.click();
    toast.success("Keys exported!");
  };

  const filteredKeys = keys.filter(key => 
    key.key_value.toLowerCase().includes(search.toLowerCase()) ||
    key.note?.toLowerCase().includes(search.toLowerCase())
  );

  const activeKeys = filteredKeys.filter(k => !k.is_banned);
  const hwidLockedKeys = filteredKeys.filter(k => k.hwid);

  const getDisplayKeys = () => {
    switch (activeTab) {
      case "active": return activeKeys;
      case "keyless": return hwidLockedKeys;
      default: return filteredKeys;
    }
  };

  if (loading) {
    return (
      <DashboardLayout breadcrumb="Key Management" title="Key Management">
        <div className="animate-pulse space-y-6">
          <div className="h-20 bg-muted/50 rounded-xl" />
          <div className="h-12 bg-muted/50 rounded-xl w-64" />
          <div className="h-96 bg-muted/50 rounded-xl" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout breadcrumb="Key Management" title="Key Management">
      {/* Key Management Header */}
      <div className="mb-6">
        <h2 className="text-xl font-bold text-foreground">Key Management</h2>
        <p className="text-sm text-muted-foreground">Manage your API keys, active keys, and keyless access in one place</p>
      </div>

      {/* Header Card - Panda Auth Style */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6"
      >
        <div className="rounded-xl bg-card border border-border p-5">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-pink-500/20 flex items-center justify-center">
                <Key className="w-6 h-6 text-pink-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-foreground">Key Management Dashboard</h3>
                <p className="text-sm text-muted-foreground">Total Keys: {keys.length}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button 
                className="bg-green-500 hover:bg-green-600 text-white"
                onClick={() => setShowGenerateModal(true)}
              >
                <Plus className="w-4 h-4 mr-2" />
                Generate Key
              </Button>
              <Button variant="outline" className="border-border" onClick={exportKeys}>
                <Download className="w-4 h-4 mr-2" />
                Export Keys
              </Button>
              <Button variant="outline" className="border-border" onClick={fetchData}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh
              </Button>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Tabs - Panda Auth Style */}
      <div className="flex items-center gap-1 mb-6 border-b border-border">
        <button
          onClick={() => setActiveTab("generated")}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors border-b-2 -mb-px ${
            activeTab === "generated" 
              ? "border-primary text-foreground" 
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Key className="w-4 h-4" />
          Generated Keys ({filteredKeys.length})
        </button>
        <button
          onClick={() => setActiveTab("active")}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors border-b-2 -mb-px ${
            activeTab === "active" 
              ? "border-primary text-primary" 
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Key className="w-4 h-4" />
          Active Keys ({activeKeys.length})
        </button>
        <button
          onClick={() => setActiveTab("keyless")}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors border-b-2 -mb-px ${
            activeTab === "keyless" 
              ? "border-primary text-foreground" 
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Monitor className="w-4 h-4" />
          Keyless Access ({hwidLockedKeys.length})
        </button>
      </div>

      {/* Keys Table Card - Panda Auth Style */}
      <div className="rounded-xl bg-card border border-border overflow-hidden">
        <div className="p-4 flex items-center justify-between border-b border-border">
          <h3 className="font-semibold text-foreground">
            {activeTab === "generated" ? "Generated" : activeTab === "active" ? "Active" : "Keyless"} Keys ({getDisplayKeys().length})
          </h3>
          <div className="flex items-center gap-3">
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={async () => {
                if (!confirm(`Are you sure you want to delete ALL ${getDisplayKeys().length} keys? This cannot be undone.`)) return;
                const keysToDelete = getDisplayKeys().map(k => k.id);
                if (keysToDelete.length === 0) {
                  toast.error("No keys to delete");
                  return;
                }
                const { error } = await supabase
                  .from("script_keys")
                  .delete()
                  .in("id", keysToDelete);
                if (error) {
                  toast.error("Failed to delete keys");
                } else {
                  toast.success(`${keysToDelete.length} keys deleted`);
                  fetchData();
                }
              }}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete All
            </Button>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search keys..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 w-56 bg-secondary border-border"
              />
            </div>
            <Button className="bg-primary hover:bg-primary/90 text-primary-foreground">
              Search
            </Button>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent border-border bg-secondary/30">
                <TableHead className="text-muted-foreground font-semibold text-xs uppercase">KEY</TableHead>
                <TableHead className="text-muted-foreground font-semibold text-xs uppercase">PREFIX</TableHead>
                <TableHead className="text-muted-foreground font-semibold text-xs uppercase">HWID</TableHead>
                <TableHead className="text-muted-foreground font-semibold text-xs uppercase">NOTE</TableHead>
                <TableHead className="text-muted-foreground font-semibold text-xs uppercase">EXPIRES</TableHead>
                <TableHead className="text-muted-foreground font-semibold text-xs uppercase">PREMIUM</TableHead>
                <TableHead className="text-muted-foreground font-semibold text-xs uppercase">HWID LOCKED</TableHead>
                <TableHead className="text-muted-foreground font-semibold text-xs uppercase">ACTIONS</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {getDisplayKeys().map((key) => (
                <TableRow key={key.id} className="border-border hover:bg-secondary/20">
                  <TableCell className="font-mono text-xs text-foreground">
                    <div className="flex items-center gap-2">
                      <span className="truncate max-w-[300px]">{key.key_value}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-muted-foreground hover:text-foreground"
                        onClick={() => copyKey(key.key_value)}
                      >
                        {copiedId === key.key_value ? (
                          <Check className="w-3 h-3 text-green-500" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                      </Button>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {key.key_format || <span className="text-muted-foreground/50">No Prefix</span>}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm font-mono">
                    {key.hwid ? `${key.hwid.slice(0, 12)}...` : "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {key.note || "—"}
                  </TableCell>
                  <TableCell className="text-sm">
                    {key.expires_at ? (
                      <span className={new Date(key.expires_at) < new Date() ? "text-destructive" : "text-foreground"}>
                        {new Date(key.expires_at).toLocaleDateString("en-US", { 
                          month: "short", day: "numeric", year: "numeric" 
                        })}
                      </span>
                    ) : (
                      <span className="text-green-500">Lifetime</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge className={`text-xs ${
                      key.duration_type === "lifetime" 
                        ? "bg-primary/20 text-primary" 
                        : "bg-green-500/20 text-green-500"
                    }`}>
                      {key.duration_type === "lifetime" ? "Premium" : "Standard"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge className={`text-xs ${
                      key.hwid 
                        ? "bg-green-500/20 text-green-500" 
                        : "bg-secondary text-muted-foreground"
                    }`}>
                      {key.hwid ? "On" : "Off"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-blue-400 hover:text-blue-300 hover:bg-blue-500/10"
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => deleteKey(key.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {getDisplayKeys().length === 0 && (
          <div className="p-12 text-center">
            <Key className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
            <p className="text-muted-foreground">No keys found</p>
            <Button className="mt-4 bg-green-500 hover:bg-green-600 text-white" onClick={() => setShowGenerateModal(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Generate Key
            </Button>
          </div>
        )}
      </div>

      {/* Generate Key Modal */}
      <AnimatePresence>
        {showGenerateModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowGenerateModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="rounded-2xl bg-card border border-border p-8 w-full max-w-md"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="text-2xl font-bold mb-6 text-foreground">Generate Keys</h2>

              <div className="space-y-4">
                {/* Script Selection - Only show if no scriptId in URL */}
                {!scriptId && (
                  <div>
                    <label className="text-sm font-medium mb-2 block text-foreground">Select Script *</label>
                    <Select value={selectedScriptId} onValueChange={setSelectedScriptId}>
                      <SelectTrigger className="bg-secondary border-border">
                        <SelectValue placeholder="Choose a script..." />
                      </SelectTrigger>
                      <SelectContent>
                        {scripts.map((script) => (
                          <SelectItem key={script.id} value={script.id}>
                            {script.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {scripts.length === 0 && (
                      <p className="text-xs text-destructive mt-1">No scripts found. Create a script first.</p>
                    )}
                  </div>
                )}

                <div>
                  <label className="text-sm font-medium mb-2 block text-foreground">Key Prefix (optional)</label>
                  <Input
                    placeholder="e.g., premium"
                    value={keyFormat}
                    onChange={(e) => setKeyFormat(e.target.value)}
                    className="bg-secondary border-border"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block text-foreground">Duration Type</label>
                  <Select value={durationType} onValueChange={(val) => setDurationType(val as any)}>
                    <SelectTrigger className="bg-secondary border-border">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="lifetime">Lifetime</SelectItem>
                      <SelectItem value="days">Days</SelectItem>
                      <SelectItem value="months">Months</SelectItem>
                      <SelectItem value="years">Years</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {durationType !== "lifetime" && (
                  <div>
                    <label className="text-sm font-medium mb-2 block text-foreground">Duration Value</label>
                    <Input
                      type="number"
                      min={1}
                      value={durationValue}
                      onChange={(e) => setDurationValue(parseInt(e.target.value) || 1)}
                      className="bg-secondary border-border"
                    />
                  </div>
                )}

                <div>
                  <label className="text-sm font-medium mb-2 block text-foreground">Quantity</label>
                  <Input
                    type="number"
                    min={1}
                    max={100}
                    value={keyQuantity}
                    onChange={(e) => setKeyQuantity(parseInt(e.target.value) || 1)}
                    className="bg-secondary border-border"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block text-foreground">Discord ID (optional)</label>
                  <Input
                    placeholder="Discord user ID"
                    value={discordId}
                    onChange={(e) => setDiscordId(e.target.value)}
                    className="bg-secondary border-border"
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <Button
                    variant="outline"
                    className="flex-1 border-border"
                    onClick={() => setShowGenerateModal(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    className="flex-1 bg-green-500 hover:bg-green-600 text-white"
                    onClick={createKeys}
                    disabled={creating || (!scriptId && !selectedScriptId)}
                  >
                    {creating ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <Plus className="w-4 h-4 mr-2" />
                        Generate
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </DashboardLayout>
  );
};

export default Keys;
