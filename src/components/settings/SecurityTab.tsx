import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { 
  Shield, 
  AlertTriangle, 
  Check, 
  X, 
  Eye, 
  RefreshCw,
  Loader2,
  Lock,
  Globe,
  Activity,
  Bug,
  Cpu,
  Webhook,
  Save,
  Zap,
  Bell
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface SecurityEvent {
  id: string;
  event_type: string;
  severity: string;
  ip_address: string;
  created_at: string;
  details: unknown;
}

interface Script {
  id: string;
  name: string;
  secure_core_enabled: boolean;
  anti_tamper_enabled: boolean;
  anti_debug_enabled: boolean;
  hwid_lock_enabled: boolean;
  enable_spy_warnings: boolean;
  discord_webhook_url: string | null;
  discord_webhook_enabled: boolean;
  execution_count: number;
}

export default function SecurityTab() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [events, setEvents] = useState<SecurityEvent[]>([]);
  const [scripts, setScripts] = useState<Script[]>([]);
  const [selectedScript, setSelectedScript] = useState<Script | null>(null);
  const [webhookUrl, setWebhookUrl] = useState("");

  useEffect(() => {
    fetchSecurityData();
  }, []);

  const fetchSecurityData = async () => {
    setLoading(true);
    
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      setLoading(false);
      return;
    }

    // Fetch user's scripts with security settings
    const { data: userScripts } = await supabase
      .from("scripts")
      .select("id, name, secure_core_enabled, anti_tamper_enabled, anti_debug_enabled, hwid_lock_enabled, enable_spy_warnings, discord_webhook_url, discord_webhook_enabled, execution_count")
      .eq("user_id", session.user.id)
      .order("created_at", { ascending: false });

    if (userScripts && userScripts.length > 0) {
      setScripts(userScripts as Script[]);
      setSelectedScript(userScripts[0] as Script);
      setWebhookUrl(userScripts[0].discord_webhook_url || "");
    }

    // Fetch security events
    const { data: securityEvents } = await supabase
      .from("security_events")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(10);

    setEvents(securityEvents || []);
    setLoading(false);
  };

  const updateSecuritySettings = async (field: string, value: boolean) => {
    if (!selectedScript) return;

    const updatedScript = { ...selectedScript, [field]: value };
    setSelectedScript(updatedScript);
    
    const { error } = await supabase
      .from("scripts")
      .update({ [field]: value })
      .eq("id", selectedScript.id);

    if (error) {
      toast.error("Failed to update security setting");
      setSelectedScript(selectedScript); // Revert
    } else {
      toast.success("Security setting updated!");
      setScripts(scripts.map(s => s.id === selectedScript.id ? updatedScript : s));
    }
  };

  const saveWebhookSettings = async () => {
    if (!selectedScript) return;
    setSaving(true);

    const { error } = await supabase
      .from("scripts")
      .update({ 
        discord_webhook_url: webhookUrl || null,
        discord_webhook_enabled: !!webhookUrl
      })
      .eq("id", selectedScript.id);

    if (error) {
      toast.error("Failed to save webhook settings");
    } else {
      toast.success("Webhook settings saved!");
      const updatedScript = { 
        ...selectedScript, 
        discord_webhook_url: webhookUrl || null,
        discord_webhook_enabled: !!webhookUrl
      };
      setSelectedScript(updatedScript);
      setScripts(scripts.map(s => s.id === selectedScript.id ? updatedScript : s));
    }
    setSaving(false);
  };

  const testWebhook = async () => {
    if (!selectedScript || !webhookUrl) {
      toast.error("Please enter a webhook URL first");
      return;
    }

    try {
      const { error } = await supabase.functions.invoke("discord-webhook", {
        body: {
          script_id: selectedScript.id,
          event_type: "custom",
          additional_info: "🧪 This is a test webhook from ShadowAuth Security Settings!",
          success: true
        }
      });

      if (error) throw error;
      toast.success("Test webhook sent!");
    } catch (e) {
      toast.error("Failed to send test webhook");
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'text-red-500 bg-red-500/10';
      case 'warning': return 'text-yellow-500 bg-yellow-500/10';
      default: return 'text-blue-500 bg-blue-500/10';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const securityFeatures = [
    { 
      key: "secure_core_enabled", 
      label: "Shadow Secure Core", 
      desc: "Multi-layer protection system (like Panda Secure Core)", 
      icon: Shield,
      badge: "CORE"
    },
    { 
      key: "anti_tamper_enabled", 
      label: "Anti-Tamper", 
      desc: "Detect script modifications", 
      icon: Lock 
    },
    { 
      key: "anti_debug_enabled", 
      label: "Anti-Debug", 
      desc: "Block debugging tools and spies", 
      icon: Bug 
    },
    { 
      key: "hwid_lock_enabled", 
      label: "HWID Lock", 
      desc: "Hardware-based authentication", 
      icon: Cpu 
    },
    { 
      key: "enable_spy_warnings", 
      label: "Spy Detection", 
      desc: "Detect and warn about spy tools", 
      icon: Eye 
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Script Selector */}
      {scripts.length > 1 && (
        <div className="flex items-center gap-3 flex-wrap">
          {scripts.map((script) => (
            <Button
              key={script.id}
              variant={selectedScript?.id === script.id ? "default" : "outline"}
              size="sm"
              onClick={() => {
                setSelectedScript(script);
                setWebhookUrl(script.discord_webhook_url || "");
              }}
            >
              {script.name}
            </Button>
          ))}
        </div>
      )}

      {/* Security Status Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {securityFeatures.map((item, i) => {
          const enabled = selectedScript?.[item.key as keyof Script] as boolean || false;
          return (
            <motion.div
              key={item.key}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="rounded-xl bg-card border border-border p-4"
            >
              <div className="flex items-center justify-between mb-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${enabled ? 'bg-green-500/10' : 'bg-secondary'}`}>
                  <item.icon className={`w-5 h-5 ${enabled ? 'text-green-500' : 'text-muted-foreground'}`} />
                </div>
                {item.badge && (
                  <Badge className="bg-primary/20 text-primary text-[10px]">{item.badge}</Badge>
                )}
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">{item.label}</p>
                  <p className="text-xs text-muted-foreground">{enabled ? 'Enabled' : 'Disabled'}</p>
                </div>
                {enabled ? (
                  <Check className="w-4 h-4 text-green-500" />
                ) : (
                  <X className="w-4 h-4 text-muted-foreground" />
                )}
              </div>
            </motion.div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Security Settings */}
        <div className="rounded-xl bg-card border border-border p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
              <Shield className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h4 className="font-bold">Shadow Secure Core</h4>
              <p className="text-xs text-muted-foreground">Enterprise-grade protection features</p>
            </div>
          </div>

          <div className="space-y-3">
            {securityFeatures.map((item) => {
              const enabled = selectedScript?.[item.key as keyof Script] as boolean || false;
              return (
                <div key={item.key} className="flex items-center justify-between p-3 rounded-lg bg-secondary/30">
                  <div className="flex items-center gap-3">
                    <item.icon className="w-5 h-5 text-primary" />
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium">{item.label}</p>
                        {item.badge && (
                          <Badge className="bg-primary/20 text-primary text-[8px] px-1">{item.badge}</Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">{item.desc}</p>
                    </div>
                  </div>
                  <Switch
                    checked={enabled}
                    onCheckedChange={(checked) => updateSecuritySettings(item.key, checked)}
                    disabled={!selectedScript}
                  />
                </div>
              );
            })}
          </div>
        </div>

        {/* Discord Webhook */}
        <div className="space-y-6">
          <div className="rounded-xl bg-card border border-border p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-lg bg-[#5865F2]/20 flex items-center justify-center">
                <Webhook className="w-5 h-5 text-[#5865F2]" />
              </div>
              <div>
                <h4 className="font-bold">Discord Webhook</h4>
                <p className="text-xs text-muted-foreground">Get notified on key validations</p>
              </div>
              {selectedScript?.discord_webhook_enabled && (
                <Badge className="ml-auto bg-green-500/20 text-green-500">Active</Badge>
              )}
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                  <Bell className="w-3 h-3" />
                  Webhook URL
                </label>
                <Input
                  value={webhookUrl}
                  onChange={(e) => setWebhookUrl(e.target.value)}
                  placeholder="https://discord.com/api/webhooks/..."
                  className="bg-secondary border-border font-mono text-xs"
                />
              </div>

              <div className="flex gap-2">
                <Button 
                  onClick={saveWebhookSettings} 
                  disabled={saving || !selectedScript}
                  className="flex-1 gap-2"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Save Webhook
                </Button>
                <Button 
                  variant="outline" 
                  onClick={testWebhook}
                  disabled={!webhookUrl || !selectedScript}
                  className="gap-2"
                >
                  <Zap className="w-4 h-4" />
                  Test
                </Button>
              </div>

              <p className="text-xs text-muted-foreground">
                Receive notifications when keys are validated, created, or expired.
              </p>
            </div>
          </div>

          {/* Execution Stats */}
          {selectedScript && (
            <div className="rounded-xl bg-card border border-border p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                  <Activity className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h4 className="font-bold">Execution Metrics</h4>
                  <p className="text-xs text-muted-foreground">{selectedScript.name}</p>
                </div>
              </div>
              <div className="text-center py-4">
                <p className="text-4xl font-bold text-primary">{selectedScript.execution_count || 0}</p>
                <p className="text-sm text-muted-foreground">Total Executions</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Security Events */}
      <div className="rounded-xl bg-card border border-border p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h4 className="font-bold">Security Events</h4>
              <p className="text-xs text-muted-foreground">Recent security activity</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={fetchSecurityData}>
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-60 overflow-y-auto">
          {events.length > 0 ? (
            events.map((event) => (
              <div key={event.id} className="flex items-center gap-3 p-3 rounded-lg bg-secondary/30">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${getSeverityColor(event.severity)}`}>
                  <AlertTriangle className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{event.event_type}</p>
                  <p className="text-xs text-muted-foreground">
                    {event.ip_address} • {new Date(event.created_at).toLocaleString()}
                  </p>
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-full flex flex-col items-center justify-center py-8 text-muted-foreground">
              <Shield className="w-12 h-12 mb-2 opacity-50" />
              <p className="text-sm">No security events</p>
              <p className="text-xs">Your system is secure</p>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
