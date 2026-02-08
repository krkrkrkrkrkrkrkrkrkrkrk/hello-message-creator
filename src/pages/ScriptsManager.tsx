import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Database, Plus, Trash2, Eye, Code, 
  Loader2, Search, RefreshCw, Download, Edit, 
  Calendar, ExternalLink, Filter, Upload, FileText, Key
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import AdvancedScriptUpload from "@/components/scripts/AdvancedScriptUpload";
import SelectProviderModal from "@/components/scripts/SelectProviderModal";
import { getFunctionsBaseUrl } from "@/lib/functions-base-url";


interface Script {
  id: string;
  name: string;
  content: string;
  share_code: string;
  creator_ip: string | null;
  created_at: string;
  allowed_ips: string[] | null;
  key_provider_id: string | null;
}

export default function ScriptsManager() {
  const navigate = useNavigate();
  const [scripts, setScripts] = useState<Script[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterName, setFilterName] = useState("");
  const [filterDate, setFilterDate] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [creating, setCreating] = useState(false);
const [newScript, setNewScript] = useState({ name: "", content: "" });
  const [user, setUser] = useState<any>(null);
  const [editingScript, setEditingScript] = useState<Script | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editContent, setEditContent] = useState("");
  const [editName, setEditName] = useState("");
  const [saving, setSaving] = useState(false);
  
  // Key System modal state
  const [keySystemScript, setKeySystemScript] = useState<Script | null>(null);
  const [showKeySystemModal, setShowKeySystemModal] = useState(false);
  
  
  // Drag and drop state
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
        return;
      }
      setUser(session.user);
      await fetchScripts();
      setLoading(false);
    };
    init();

    // Real-time subscription for instant script updates
    const channel = supabase
      .channel('scripts_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'scripts',
        },
        () => {
          // Immediately refetch when any change happens
          fetchScripts();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [navigate]);

  const fetchScripts = async () => {
    const { data, error } = await supabase
      .from("scripts")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error) {
      setScripts(data || []);
    }
  };

  const createScript = async (name?: string, content?: string, settings?: any): Promise<void> => {
    const scriptName = name || newScript.name;
    const scriptContent = content || newScript.content;
    
    if (!scriptName || !scriptContent) {
      throw new Error("Script name and content are required");
    }

    setCreating(true);
    
    try {
      // Deduct 10 tokens for script upload
      const { data: tokenResult, error: tokenError } = await supabase.rpc("deduct_tokens", {
        p_user_id: user.id,
        p_amount: 10
      });

      if (tokenError) {
        console.error("Token deduction error:", tokenError);
        throw new Error("Error deducting tokens");
      }

      const result = tokenResult as Record<string, unknown>;
      if (!result.success) {
        throw new Error(result.reason as string || "Insufficient tokens. Upgrade your plan.");
      }
      // Step 1: Upload (get IP)
      let userIp = "";
      try {
        const response = await fetch("https://api.ipify.org?format=json");
        const data = await response.json();
        userIp = data.ip;
      } catch (e) {
        console.error("Failed to get IP");
      }

      let finalContent = scriptContent;
      
      // Step 2: Obfuscate if needed
      if (settings && settings.type !== "none") {
        try {
          const { data: obfuscateResult, error: obfuscateError } = await supabase.functions.invoke("obfuscate-script", {
            body: {
              script: scriptContent,
              fileName: `${scriptName}.lua`,
              obfuscationType: settings.type,
              settings: {
                stringEncryption: settings.stringEncryption,
                constantEncryption: settings.constantEncryption,
                controlFlowObfuscation: settings.controlFlowObfuscation,
                antiTamper: settings.antiTamper,
                vmScrambling: settings.vmScrambling,
                antiHttpSpy: settings.antiHttpSpy,
              }
            }
          });

          if (!obfuscateError && obfuscateResult?.obfuscatedScript) {
            finalContent = obfuscateResult.obfuscatedScript;
          }
        } catch (e) {
          console.error("Failed to obfuscate:", e);
        }
      }

      // Step 3: Insert to DB
      const { data: inserted, error } = await supabase.from("scripts").insert({
        user_id: user.id,
        name: scriptName,
        content: finalContent,
        creator_ip: userIp,
        allowed_ips: userIp ? [userIp] : [],
        loader_token: crypto.randomUUID(),
        key_provider_id: settings?.keyProviderId || null,
      }).select("id").maybeSingle();

      if (error) {
        throw error;
      }

      // Luarmor-style: prebuild layers 2-5 right after publish
      if (inserted?.id) {
        supabase.functions.invoke("prebuild-script", { body: { scriptId: inserted.id } })
          .catch(() => {});
      }

      // Step 4: CRITICAL - Immediately refetch to show the new script
      await fetchScripts();
      
      setNewScript({ name: "", content: "" });
      setShowModal(false);
    } finally {
      setCreating(false);
    }
  };

const deleteScript = async (id: string) => {
    const { error } = await supabase.from("scripts").delete().eq("id", id);
    if (!error) {
      setScripts(scripts.filter((s) => s.id !== id));
    }
  };

  const openEditModal = (script: Script) => {
    setEditingScript(script);
    setEditName(script.name);
    setEditContent(script.content);
    setShowEditModal(true);
  };

  const saveEditedScript = async () => {
    if (!editingScript) return;
    
    setSaving(true);
    try {
      const { error } = await supabase
        .from("scripts")
        .update({ name: editName, content: editContent })
        .eq("id", editingScript.id);

      if (!error) {
        // Warm build cache after edit (Luarmor-style)
        supabase.functions.invoke("prebuild-script", { body: { scriptId: editingScript.id } })
          .catch(() => {});
        await fetchScripts();
        setShowEditModal(false);
        setEditingScript(null);
      }
    } finally {
      setSaving(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const generateRandomKey = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    const segments = [];
    for (let i = 0; i < 4; i++) {
      let segment = '';
      for (let j = 0; j < 4; j++) {
        segment += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      segments.push(segment);
    }
    return segments.join('-');
  };

  const getLoaderScript = async (scriptId: string): Promise<string> => {
    // Try to get a valid key for this script
    const { data: keys } = await supabase
      .from("script_keys")
      .select("key_value")
      .eq("script_id", scriptId)
      .eq("is_banned", false)
      .limit(1);
    
    const keyToUse = keys && keys.length > 0 
      ? keys[0].key_value 
      : "YOUR_KEY_HERE"; // Placeholder if no keys exist
    
    return `script_key="${keyToUse}"\n\nloadstring(game:HttpGet("${getFunctionsBaseUrl()}/loader/${scriptId}"))()`;
  };

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileUpload(files[0]);
    }
  };

  const handleFileUpload = async (file: File) => {
    // Accept .lua and .txt files
    const validExtensions = [".lua", ".txt"];
    const fileExt = file.name.substring(file.name.lastIndexOf(".")).toLowerCase();
    
    if (!validExtensions.includes(fileExt)) {
      return;
    }

    try {
      const content = await file.text();
      const name = file.name.replace(/\.(lua|txt)$/i, "");
      
      // Automatically create the script
      await createScript(name, content);
    } catch (error) {
      console.error("Failed to read file");
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileUpload(files[0]);
    }
  };

  const filteredScripts = scripts.filter(script => {
    const matchesSearch = script.name.toLowerCase().includes(search.toLowerCase()) ||
                         script.id.toLowerCase().includes(search.toLowerCase());
    const matchesName = !filterName || script.name === filterName;
    return matchesSearch && matchesName;
  });

  if (loading) {
    return (
      <DashboardLayout breadcrumb="Virtual Storage" title="Virtual Storage">
        <div className="animate-pulse space-y-6">
          <div className="h-28 bg-muted/50 rounded-xl" />
          <div className="h-12 bg-muted/50 rounded-xl w-64" />
          <div className="h-96 bg-muted/50 rounded-xl" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout breadcrumb="Virtual Storage" title="Virtual Storage">
      {/* Header Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl bg-blue-500 flex items-center justify-center">
              <Database className="w-7 h-7 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-foreground">Virtual Script Storage</h2>
              <p className="text-sm text-muted-foreground mt-1">Manage and organize your scripts</p>
            </div>
          </div>
          <Badge className="bg-primary/20 text-primary border-primary/30">
            {scripts.length} Scripts
          </Badge>
        </div>
      </motion.div>

      {/* Advanced Script Upload */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="mb-6"
      >
        <AdvancedScriptUpload 
          onUpload={async (file, name, content, settings) => {
            console.log("Upload settings:", settings);
            await createScript(name, content, settings);
          }}
          isCreating={creating}
        />
      </motion.div>

      {/* Script History Header */}
      <div className="flex items-center gap-3 mb-4">
        <div className="flex items-center gap-2 text-primary">
          <Code className="w-5 h-5" />
          <h3 className="font-bold text-lg">Script History</h3>
        </div>
      </div>

      {/* Script History Section */}
      <div className="rounded-xl bg-card border border-border overflow-hidden">
        <div className="p-4 flex items-center justify-between border-b border-border">
          <div className="flex items-center gap-3">
            <span className="text-primary font-mono text-lg">&lt;/&gt;</span>
            <h3 className="font-bold text-foreground">Script History</h3>
          </div>
          <Button variant="ghost" size="icon" onClick={fetchScripts} className="text-muted-foreground hover:text-foreground">
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>

        {/* Filters */}
        <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-4 border-b border-border">
          <div>
            <label className="text-xs text-muted-foreground mb-2 block font-medium">Search Scripts</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or filename..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 bg-secondary border-border"
              />
            </div>
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-2 block font-medium">Filter by Name</label>
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none z-10" />
              <Select value={filterName} onValueChange={(val) => setFilterName(val === "all" ? "" : val)}>
                <SelectTrigger className="bg-secondary border-border pl-10">
                  <SelectValue placeholder="Filter by script name..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Scripts</SelectItem>
                  {scripts.map(s => (
                    <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-2 block font-medium">Filter by Date</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              <Input
                type="date"
                value={filterDate}
                onChange={(e) => setFilterDate(e.target.value)}
                placeholder="mm/dd/yyyy"
                className="pl-10 bg-secondary border-border"
              />
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent border-border">
                <TableHead className="text-muted-foreground font-semibold text-xs uppercase">
                  <div className="flex items-center gap-2">
                    <span className="text-yellow-500">◆</span>
                    NAME
                  </div>
                </TableHead>
                <TableHead className="text-muted-foreground font-semibold text-xs uppercase">
                  <div className="flex items-center gap-2">
                    <Database className="w-4 h-4 text-primary" />
                    FILE NAME
                  </div>
                </TableHead>
                <TableHead className="text-muted-foreground font-semibold text-xs uppercase">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    CREATED
                  </div>
                </TableHead>
                <TableHead className="text-muted-foreground font-semibold text-xs uppercase text-right">
                  <div className="flex items-center justify-end gap-2">
                    <Code className="w-4 h-4 text-primary" />
                    ACTIONS
                  </div>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredScripts.map((script) => (
                <TableRow key={script.id} className="border-border hover:bg-secondary/30">
                  <TableCell className="max-w-[200px]">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-yellow-500/20 flex items-center justify-center shrink-0">
                        <span className="text-yellow-500">◆</span>
                      </div>
                      <span className="font-medium text-foreground truncate" title={script.name}>
                        {script.name.length > 20 ? script.name.slice(0, 20) + "..." : script.name}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="max-w-[250px]">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Database className="w-4 h-4 text-primary shrink-0" />
                      <span className="font-mono text-sm truncate" title={`${script.name}.lua`}>
                        {script.name.length > 25 ? script.name.slice(0, 25) + "...lua" : `${script.name}.lua`}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      {new Date(script.created_at).toLocaleDateString("en-US", { month: "numeric", day: "numeric", year: "numeric" })}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        size="sm"
                        className="h-8 px-3 text-xs bg-slate-600 hover:bg-slate-500 text-white"
                        onClick={async () => {
                          const loaderScript = await getLoaderScript(script.id);
                          copyToClipboard(loaderScript);
                        }}
                      >
                        <ExternalLink className="w-3 h-3 mr-1" />
                        Get Script
                      </Button>
                      <Button
                        size="sm"
                        className="h-8 px-3 text-xs bg-primary hover:bg-primary/90 text-white"
                        onClick={() => navigate(`/script/${script.share_code}`)}
                      >
                        <Eye className="w-3 h-3 mr-1" />
                        View Obfuscated Code
                      </Button>
                      <Button
                        size="sm"
                        className="h-8 px-3 text-xs bg-blue-600 hover:bg-blue-500 text-white"
                        onClick={() => openEditModal(script)}
                      >
                        <Edit className="w-3 h-3 mr-1" />
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        className="h-8 px-3 text-xs bg-green-600 hover:bg-green-500 text-white"
                        onClick={() => {
                          const blob = new Blob([script.content], { type: "text/plain" });
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement("a");
                          a.href = url;
                          a.download = `${script.name}.lua`;
                          a.click();
                        }}
                      >
                        <Download className="w-3 h-3 mr-1" />
                        Download
                      </Button>
                      <Button
                        size="sm"
                        className="h-8 px-3 text-xs bg-red-600 hover:bg-red-500 text-white"
                        onClick={() => deleteScript(script.id)}
                      >
                        <Trash2 className="w-3 h-3 mr-1" />
                        Delete
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {filteredScripts.length === 0 && (
          <div className="p-12 text-center">
            <Database className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
            <p className="text-muted-foreground">No scripts found</p>
            <Button className="mt-4 bg-primary hover:bg-primary/90" onClick={() => setShowModal(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Upload Script
            </Button>
          </div>
        )}
      </div>

      {/* Create Script Modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-lg bg-card rounded-2xl border border-border p-6"
            >
              <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                <Plus className="w-5 h-5 text-primary" />
                Upload New Script
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Script Name</label>
                  <Input
                    placeholder="My Script"
                    value={newScript.name}
                    onChange={(e) => setNewScript({ ...newScript, name: e.target.value })}
                    className="bg-secondary"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Script Content (Lua)</label>
                  <Textarea
                    placeholder="-- Your Lua script here"
                    value={newScript.content}
                    onChange={(e) => setNewScript({ ...newScript, content: e.target.value })}
                    className="bg-secondary font-mono text-sm min-h-[200px]"
                  />
                </div>

                <div className="flex gap-3">
                  <Button variant="outline" className="flex-1" onClick={() => setShowModal(false)}>
                    Cancel
                  </Button>
                  <Button className="flex-1" onClick={() => createScript()} disabled={creating}>
                    {creating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
                    Create Script
                  </Button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Edit Script Modal - Enhanced with Key System */}
      <AnimatePresence>
        {showEditModal && editingScript && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowEditModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-2xl bg-card rounded-2xl border border-border p-6 max-h-[90vh] overflow-y-auto"
            >
              <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                <Edit className="w-5 h-5 text-primary" />
                Edit Script
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Script Name</label>
                  <Input
                    placeholder="My Script"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="bg-secondary"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Script Content (Lua)</label>
                  <Textarea
                    placeholder="-- Your Lua script here"
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    className="bg-secondary font-mono text-sm min-h-[300px]"
                  />
                </div>

                {/* Key System Section */}
                <div className="pt-4 border-t border-border">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Key className="w-4 h-4 text-amber-500" />
                      <label className="text-sm font-medium">Key System</label>
                    </div>
                    <Badge variant={editingScript.key_provider_id ? "default" : "secondary"} className={editingScript.key_provider_id ? "bg-amber-500/20 text-amber-500" : ""}>
                      {editingScript.key_provider_id ? "Enabled" : "Disabled"}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mb-3">
                    Require users to enter a valid key before executing the script.
                  </p>
                  <Button
                    variant="outline"
                    className="w-full gap-2"
                    onClick={() => {
                      setKeySystemScript(editingScript);
                      setShowKeySystemModal(true);
                    }}
                  >
                    <Key className="w-4 h-4" />
                    {editingScript.key_provider_id ? "Change Key System Provider" : "Enable Key System"}
                  </Button>
                </div>

                <div className="flex gap-3 pt-2">
                  <Button variant="outline" className="flex-1" onClick={() => setShowEditModal(false)}>
                    Cancel
                  </Button>
                  <Button className="flex-1" onClick={saveEditedScript} disabled={saving}>
                    {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Edit className="w-4 h-4 mr-2" />}
                    Save Changes
                  </Button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Provider Selection Modal */}
      {keySystemScript && (
        <SelectProviderModal
          scriptId={keySystemScript.id}
          scriptName={keySystemScript.name}
          currentProviderId={keySystemScript.key_provider_id}
          isOpen={showKeySystemModal}
          onClose={() => {
            setShowKeySystemModal(false);
            // Refresh the editingScript if we came from edit modal
            if (editingScript && editingScript.id === keySystemScript.id) {
              fetchScripts().then(() => {
                // Find updated script and update editingScript
                const updatedScript = scripts.find(s => s.id === keySystemScript.id);
                if (updatedScript) {
                  setEditingScript(updatedScript);
                }
              });
            } else {
              fetchScripts();
            }
            setKeySystemScript(null);
          }}
        />
      )}

    </DashboardLayout>
  );
}
