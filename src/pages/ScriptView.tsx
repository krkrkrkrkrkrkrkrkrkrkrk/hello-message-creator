import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Shield, Lock, Code, Copy, Check, AlertTriangle, Loader2, 
  Globe, Plus, Trash2, Save, ShieldCheck, ShieldX, X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface WhitelistedIP {
  ip: string;
  name: string;
}

const ScriptView = () => {
  const { shareCode } = useParams();
  const [script, setScript] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [userIp, setUserIp] = useState("");
  const [isOwner, setIsOwner] = useState(false);
  const [isWhitelisted, setIsWhitelisted] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  
  // IP Management
  const [whitelistedIps, setWhitelistedIps] = useState<WhitelistedIP[]>([]);
  const [newIpName, setNewIpName] = useState("");
  const [newIpAddress, setNewIpAddress] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);

  useEffect(() => {
    const init = async () => {
      try {
        // Get user IP first
        const ipResponse = await fetch("https://api.ipify.org?format=json");
        const ipData = await ipResponse.json();
        setUserIp(ipData.ip);
        setNewIpAddress(ipData.ip);

        // Check if user is logged in
        const { data: { session } } = await supabase.auth.getSession();

        // Fetch script
        const { data: scriptData, error: scriptError } = await supabase
          .from("scripts")
          .select("*")
          .eq("share_code", shareCode)
          .maybeSingle();

        if (scriptError || !scriptData) {
          setError("Script not found");
          setLoading(false);
          return;
        }

        setScript(scriptData);

        // Check if user is owner
        const owner = session?.user?.id === scriptData.user_id;
        setIsOwner(owner);

        // Parse allowed IPs
        const allowedIps = scriptData.allowed_ips || [];
        const parsedIps: WhitelistedIP[] = allowedIps.map((ip: string, idx: number) => ({
          ip,
          name: `IP ${idx + 1}`
        }));
        setWhitelistedIps(parsedIps);

        // Check if current IP is whitelisted
        const whitelisted = allowedIps.includes(ipData.ip);
        setIsWhitelisted(whitelisted);

        // Log the view
        await supabase.from("script_views").insert({
          script_id: scriptData.id,
          viewer_ip: ipData.ip,
          can_view_source: owner || whitelisted,
        });

      } catch (e) {
        console.error("Error:", e);
        setError("Failed to load script");
      }
      setLoading(false);
    };

    init();
  }, [shareCode]);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(script.content);
    setCopied(true);
    toast.success("Script copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  const addMyIp = () => {
    if (!userIp) return;
    
    const exists = whitelistedIps.some(w => w.ip === userIp);
    if (exists) {
      toast.error("Your IP is already whitelisted");
      return;
    }

    setWhitelistedIps([...whitelistedIps, { ip: userIp, name: "My IP" }]);
    toast.success("IP added! Click Save Changes to apply.");
  };

  const addCustomIp = () => {
    if (!newIpAddress) {
      toast.error("Please enter an IP address");
      return;
    }

    const exists = whitelistedIps.some(w => w.ip === newIpAddress);
    if (exists) {
      toast.error("This IP is already whitelisted");
      return;
    }

    setWhitelistedIps([...whitelistedIps, { 
      ip: newIpAddress, 
      name: newIpName || `IP ${whitelistedIps.length + 1}` 
    }]);
    setShowAddModal(false);
    setNewIpName("");
    toast.success("IP added! Click Save Changes to apply.");
  };

  const removeIp = (ip: string) => {
    setWhitelistedIps(whitelistedIps.filter(w => w.ip !== ip));
    toast.success("IP removed! Click Save Changes to apply.");
  };

  const saveChanges = async () => {
    setSaving(true);
    
    const ips = whitelistedIps.map(w => w.ip);
    
    const { error } = await supabase
      .from("scripts")
      .update({ allowed_ips: ips })
      .eq("id", script.id);

    if (error) {
      toast.error("Failed to save changes");
    } else {
      toast.success("Changes saved successfully!");
      setIsWhitelisted(ips.includes(userIp));
    }
    
    setSaving(false);
  };

  const canViewContent = isOwner || isWhitelisted;

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !script) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <div className="w-20 h-20 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-6">
            <AlertTriangle className="w-10 h-10 text-destructive" />
          </div>
          <h1 className="text-2xl font-bold mb-2">Script Not Found</h1>
          <p className="text-muted-foreground mb-6">
            This script doesn't exist or has been removed.
          </p>
          <Link to="/">
            <Button variant="glow">Go Home</Button>
          </Link>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Background effects */}
      <div className="absolute inset-0 bg-gradient-radial from-primary/5 via-transparent to-transparent" />

      {/* Header */}
      <header className="border-b border-border/50 bg-background/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <Shield className="w-8 h-8 text-primary" />
            <span className="text-xl font-bold">
              Shadow<span className="text-primary">Auth</span>
            </span>
          </Link>
          <Link to="/auth">
            <Button variant="outline" size="sm">
              Sign In
            </Button>
          </Link>
        </div>
      </header>

      {/* Content */}
      <main className="container mx-auto px-4 py-12 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-4xl mx-auto"
        >
          {/* Owner Controls - IP Whitelist */}
          {isOwner && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass-card rounded-xl p-6 border border-border/50 mb-6"
            >
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-lg font-bold text-primary">Whitelisted IPs for API access</h2>
                  <p className="text-sm text-muted-foreground">
                    You must whitelist the IP address of your server/pc in order to view the script content.
                  </p>
                </div>
                <Button variant="glow" size="sm" onClick={() => setShowAddModal(true)}>
                  WHITELIST
                </Button>
              </div>

              {/* IP Table */}
              <div className="bg-background/60 rounded-lg border border-border/30 overflow-hidden">
                <div className="grid grid-cols-3 gap-4 p-3 border-b border-border/30 bg-background/40">
                  <span className="text-xs font-semibold text-muted-foreground uppercase">Name</span>
                  <span className="text-xs font-semibold text-muted-foreground uppercase">IP Address</span>
                  <span className="text-xs font-semibold text-muted-foreground uppercase text-right">Actions</span>
                </div>
                
                {whitelistedIps.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground">
                    <Globe className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No IPs whitelisted yet</p>
                  </div>
                ) : (
                  whitelistedIps.map((item, idx) => (
                    <div key={idx} className="grid grid-cols-3 gap-4 p-3 border-b border-border/20 last:border-0 hover:bg-background/40 transition-colors">
                      <span className="text-sm">{item.name}</span>
                      <span className="text-sm font-mono text-muted-foreground">{item.ip}</span>
                      <div className="flex justify-end">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-destructive hover:text-destructive"
                          onClick={() => removeIp(item.ip)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Quick Add My IP */}
              <div className="flex gap-3 mt-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={addMyIp}
                  className="flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Add My IP ({userIp})
                </Button>
                <Button
                  variant="glow"
                  size="sm"
                  onClick={saveChanges}
                  disabled={saving}
                  className="flex items-center gap-2"
                >
                  {saving ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  Save Changes
                </Button>
              </div>
            </motion.div>
          )}

          {/* Script info */}
          <div className="glass-card rounded-xl p-6 border border-border/50 mb-6">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                <Code className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">{script.name}</h1>
                <p className="text-muted-foreground text-sm">
                  Created {new Date(script.created_at).toLocaleDateString()}
                </p>
              </div>
            </div>

            {/* Access status */}
            <div className={`rounded-lg p-4 ${canViewContent ? 'bg-green-500/10 border border-green-500/20' : 'bg-destructive/10 border border-destructive/20'}`}>
              <div className="flex items-center gap-3">
                {canViewContent ? (
                  <ShieldCheck className="w-5 h-5 text-green-500" />
                ) : (
                  <ShieldX className="w-5 h-5 text-destructive" />
                )}
                <div>
                  <p className={`font-medium ${canViewContent ? 'text-green-500' : 'text-destructive'}`}>
                    {canViewContent ? "Unlocked" : "Blocked"}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {canViewContent 
                      ? "Your IP is whitelisted. You can view the source code."
                      : "Your IP is not whitelisted. Contact the script owner for access."}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Source Locker */}
          <div className="glass-card rounded-xl border border-border/50 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 bg-background/50 border-b border-border/50">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center">
                  <Lock className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <span className="text-sm font-medium">Source Locker</span>
                  <p className="text-xs text-muted-foreground">
                    {canViewContent ? "Unlocked" : "Locked"}
                  </p>
                </div>
              </div>
              {canViewContent && (
                <Button variant="ghost" size="sm" onClick={copyToClipboard}>
                  {copied ? (
                    <Check className="w-4 h-4 text-green-500" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </Button>
              )}
            </div>
            
            {/* Content */}
            <div className="p-4 font-mono text-sm overflow-x-auto min-h-[300px]">
              {canViewContent ? (
                <pre className="whitespace-pre-wrap text-foreground">
                  {script.content}
                </pre>
              ) : (
                <div className="flex flex-col items-center justify-center h-full min-h-[250px]">
                  <div className="w-16 h-16 rounded-xl bg-muted/50 flex items-center justify-center mb-4">
                    <Lock className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">Source Locker</h3>
                  <p className="text-muted-foreground text-center mb-4">Locked</p>
                  <div className="bg-destructive/10 text-destructive px-4 py-2 rounded-lg text-sm">
                    🔒 Your IP ({userIp}) is not whitelisted
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Info */}
          <div className="text-center mt-8">
            <p className="text-muted-foreground text-sm">
              Protected by <span className="text-primary font-semibold">ShadowAuth</span>
            </p>
          </div>
        </motion.div>
      </main>

      {/* Add IP Modal */}
      <AnimatePresence>
        {showAddModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowAddModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="glass-card rounded-2xl p-6 w-full max-w-md border border-border/50"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold">Whitelist IP</h2>
                <Button variant="ghost" size="icon" onClick={() => setShowAddModal(false)}>
                  <X className="w-5 h-5" />
                </Button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Name (optional)</label>
                  <Input
                    placeholder="e.g., My Server, Home PC"
                    value={newIpName}
                    onChange={(e) => setNewIpName(e.target.value)}
                    className="bg-background/50"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">IP Address</label>
                  <Input
                    placeholder="e.g., 192.168.1.1"
                    value={newIpAddress}
                    onChange={(e) => setNewIpAddress(e.target.value)}
                    className="bg-background/50 font-mono"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Your current IP: {userIp}
                  </p>
                </div>

                <div className="flex gap-3 pt-4">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => setShowAddModal(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="glow"
                    className="flex-1"
                    onClick={addCustomIp}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add IP
                  </Button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ScriptView;
