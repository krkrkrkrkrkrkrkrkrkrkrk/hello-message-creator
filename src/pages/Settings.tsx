import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Settings as SettingsIcon,
  Shield,
  BarChart3,
  User,
  Link as LinkIcon,
  RefreshCw,
  Save,
  Loader2,
  Upload,
  Trash2,
  Bot,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { cn } from "@/lib/utils";

// Import tabs
import AccountTab from "@/components/settings/AccountTab";
import AnalyticsTab from "@/components/settings/AnalyticsTab";
import SecurityTab from "@/components/settings/SecurityTab";
import DiscordBotTab from "@/components/settings/DiscordBotTab";

type SettingsTab = "general" | "security" | "analytics" | "account" | "discord-bot";

const tabs: { id: SettingsTab; label: string; icon: React.ElementType }[] = [
  { id: "general", label: "General", icon: SettingsIcon },
  { id: "security", label: "Security", icon: Shield },
  { id: "analytics", label: "Analytics", icon: BarChart3 },
  { id: "discord-bot", label: "Discord Bot", icon: Bot },
  { id: "account", label: "Account", icon: User },
];

export default function HubSettings() {
  const [activeTab, setActiveTab] = useState<SettingsTab>("general");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // General settings state
  const [settings, setSettings] = useState({
    serviceName: "Shadow Hub",
    identifier: "shadowdevkit",
    discordUrl: "",
    keyPrefix: "shadow_",
    apiToken: "",
  });

  const generateApiToken = () => {
    const token = Array.from({ length: 32 }, () => 
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"
        .charAt(Math.floor(Math.random() * 62))
    ).join("");
    setSettings({ ...settings, apiToken: token });
    toast.success("New API token generated!");
  };

  const handleSave = async () => {
    setSaving(true);
    // Simulate save
    await new Promise(resolve => setTimeout(resolve, 1000));
    toast.success("Settings saved successfully!");
    setSaving(false);
  };

  return (
    <DashboardLayout breadcrumb="Hub Settings" title="Hub Settings">
      {/* Header Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl bg-primary/20 flex items-center justify-center">
              <SettingsIcon className="w-7 h-7 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-foreground">Hub Settings</h2>
              <p className="text-sm text-muted-foreground">Configure your key system and service settings</p>
            </div>
          </div>
          <Button variant="outline" className="gap-2">
            <RefreshCw className="w-4 h-4" />
            Refresh
          </Button>
        </div>
      </motion.div>

      {/* Tabs */}
      <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2">
        {tabs.map((tab) => (
          <Button
            key={tab.id}
            variant={activeTab === tab.id ? "default" : "ghost"}
            size="sm"
            className={cn(
              "gap-2 whitespace-nowrap",
              activeTab === tab.id 
                ? "bg-primary text-primary-foreground" 
                : "text-muted-foreground hover:text-foreground"
            )}
            onClick={() => setActiveTab(tab.id)}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </Button>
        ))}
      </div>

      {/* General Settings Tab */}
      {activeTab === "general" && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* Section Header */}
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
              <SettingsIcon className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="font-bold text-lg">General Settings</h3>
              <p className="text-sm text-muted-foreground">Configure your hub details and checkpoint settings</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Hub Details Card */}
            <div className="rounded-xl bg-card border border-border p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                  <SettingsIcon className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h4 className="font-bold">Hub Details</h4>
                  <p className="text-xs text-muted-foreground">Configure your service information</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                      <SettingsIcon className="w-3 h-3" />
                      Service Name <span className="text-destructive">*</span>
                    </label>
                    <Input
                      value={settings.serviceName}
                      onChange={(e) => setSettings({ ...settings, serviceName: e.target.value })}
                      placeholder="Shadow Hub"
                      className="bg-secondary border-border"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                      # Identifier <span className="text-destructive">*</span>
                    </label>
                    <Input
                      value={settings.identifier}
                      onChange={(e) => setSettings({ ...settings, identifier: e.target.value })}
                      placeholder="shadowdevkit"
                      className="bg-secondary border-border"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                      <LinkIcon className="w-3 h-3" />
                      Discord URL <span className="text-destructive">*</span>
                    </label>
                    <Input
                      value={settings.discordUrl}
                      onChange={(e) => setSettings({ ...settings, discordUrl: e.target.value })}
                      placeholder="https://discord.gg/..."
                      className="bg-secondary border-border"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                      # Key Prefix
                    </label>
                    <Input
                      value={settings.keyPrefix}
                      onChange={(e) => setSettings({ ...settings, keyPrefix: e.target.value })}
                      placeholder="shadow_"
                      className="bg-secondary border-border"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                    <LinkIcon className="w-3 h-3" />
                    Vanguard API Token
                  </label>
                  <div className="flex gap-2">
                    <Input
                      value={settings.apiToken}
                      onChange={(e) => setSettings({ ...settings, apiToken: e.target.value })}
                      placeholder="Your API token..."
                      className="bg-secondary border-border font-mono text-sm flex-1"
                    />
                    <Button 
                      variant="default"
                      className="bg-primary hover:bg-primary/90 gap-2"
                      onClick={generateApiToken}
                    >
                      <RefreshCw className="w-4 h-4" />
                      Generate
                    </Button>
                  </div>
                </div>

                <Button 
                  className="w-full bg-primary hover:bg-primary/90 gap-2"
                  onClick={handleSave}
                  disabled={saving}
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Save Changes
                </Button>
              </div>
            </div>

            {/* Service Logo Card */}
            <div className="space-y-6">
              <div className="rounded-xl bg-card border border-border p-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                    <Upload className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-bold">Service Logo</h4>
                    <p className="text-xs text-muted-foreground">Upload your logo for the GetKey page</p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground mb-2">Current Logo</p>
                    <div className="w-16 h-16 rounded-xl bg-secondary border border-border flex items-center justify-center">
                      <Shield className="w-8 h-8 text-primary" />
                    </div>
                  </div>

                  <div className="flex-1">
                    <div className="border-2 border-dashed border-border rounded-xl p-6 text-center hover:border-primary/50 transition-colors cursor-pointer">
                      <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">Drag & drop or click to upload</p>
                      <p className="text-xs text-muted-foreground mt-1">JPEG, PNG, GIF, WebP, SVG (Max 5MB)</p>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 mt-4">
                  <Button variant="outline" className="flex-1 gap-2">
                    <Upload className="w-4 h-4" />
                    Upload Logo
                  </Button>
                  <Button variant="destructive" size="icon">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* Checkpoint Settings */}
              <div className="rounded-xl bg-card border border-border p-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                    <Shield className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-bold">Checkpoint Settings</h4>
                    <p className="text-xs text-muted-foreground">Configure key expiration and checkpoints</p>
                  </div>
                </div>

                <div>
                  <label className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                    <User className="w-3 h-3" />
                    Auth Type <span className="text-destructive">*</span>
                  </label>
                  <Select defaultValue="ip">
                    <SelectTrigger className="bg-secondary border-border">
                      <SelectValue placeholder="Select auth type..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ip">IP Address</SelectItem>
                      <SelectItem value="hwid">HWID</SelectItem>
                      <SelectItem value="both">IP + HWID</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Account Tab */}
      {activeTab === "account" && <AccountTab />}

      {/* Analytics Tab */}
      {activeTab === "analytics" && <AnalyticsTab />}

      {/* Security Tab */}
      {activeTab === "security" && <SecurityTab />}

      {/* Discord Bot Tab */}
      {activeTab === "discord-bot" && <DiscordBotTab />}
    </DashboardLayout>
  );
}
