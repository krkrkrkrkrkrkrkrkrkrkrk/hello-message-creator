import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { 
  Book, Key, Copy, Check, AlertTriangle, Loader2, 
  RefreshCw, Sparkles, FileText, ExternalLink, Code, ChevronRight,
  Search, MessageSquare, DollarSign, Lightbulb, Bot, Shield
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/dashboard/DashboardLayout";

const Documentation = () => {
  const navigate = useNavigate();
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [userApiKey, setUserApiKey] = useState<string | null>(null);
  const [session, setSession] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"api" | "guide">("api");
  const [activeSidebarItem, setActiveSidebarItem] = useState("what-is");
  const [regenerating, setRegenerating] = useState(false);

  useEffect(() => {
    const init = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      setSession(session);

      if (session?.user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("api_key")
          .eq("id", session.user.id)
          .maybeSingle();

        if (profile?.api_key) {
          setUserApiKey(profile.api_key);
        }
      }

      setAuthLoading(false);
    };

    init();
  }, []);

  const copyCode = (code: string, id: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(id);
    toast.success("Copied to clipboard!");
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const regenerateApiKey = async () => {
    if (!session?.user) return;
    setRegenerating(true);
    
    // Generate new API key
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let newKey = '';
    for (let i = 0; i < 32; i++) {
      newKey += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    
    const { error } = await supabase
      .from("profiles")
      .update({ api_key: newKey })
      .eq("id", session.user.id);

    if (error) {
      toast.error("Failed to regenerate API key");
    } else {
      setUserApiKey(newKey);
      toast.success("API key regenerated successfully!");
    }
    setRegenerating(false);
  };

  const SUPABASE_URL = (import.meta as any).env?.VITE_SUPABASE_URL || "";
  const displayApiKey = userApiKey || "YOUR_API_KEY";

  if (authLoading) {
    return (
      <DashboardLayout breadcrumb="Documentation" title="Documentation">
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  // Sidebar items for Dashboard Guide
  const sidebarItems = [
    { id: "what-is", label: "What is ShadowAuth?", icon: Shield },
    { id: "registering", label: "Getting Started", icon: FileText },
    { id: "dashboard", label: "Dashboard Overview", icon: Shield },
    { id: "scripts", label: "Managing Scripts", icon: Code },
    { id: "keys", label: "Key Management", icon: Key },
    { id: "revenue", label: "Revenue Methods", icon: DollarSign, hasChildren: true },
    { id: "client-apis", label: "Client API's", icon: Code, hasChildren: true },
    { id: "webhooks", label: "Webhooks", icon: ExternalLink },
    { id: "security", label: "Security Best Practices", icon: Shield },
    { id: "tips", label: "Tips & Tricks", icon: Lightbulb, hasChildren: true },
    { id: "discord-bots", label: "Discord Bots", icon: Bot, hasChildren: true },
    { id: "faq", label: "FAQ", icon: MessageSquare },
  ];

  return (
    <DashboardLayout breadcrumb="Documentation" title="Documentation">
      <div className="space-y-6">
        {/* Header Card */}
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-xl bg-primary/20 flex items-center justify-center">
            <Book className="w-7 h-7 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Documentation</h1>
            <p className="text-muted-foreground">Comprehensive guides for API integration and dashboard features</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-2">
          <Button
            variant={activeTab === "api" ? "default" : "ghost"}
            className={`gap-2 ${activeTab === "api" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
            onClick={() => setActiveTab("api")}
          >
            <Sparkles className="w-4 h-4" />
            API Documentation
          </Button>
          <Button
            variant={activeTab === "guide" ? "default" : "ghost"}
            className={`gap-2 ${activeTab === "guide" ? "bg-[#1e293b] text-foreground" : "text-muted-foreground hover:text-foreground"}`}
            onClick={() => setActiveTab("guide")}
          >
            <FileText className="w-4 h-4" />
            Dashboard Guide
          </Button>
        </div>

        {/* API Documentation Tab */}
        {activeTab === "api" && (
          <div className="space-y-6">
            {/* Your API Key Card - Pink/Purple Border */}
            <div className="rounded-xl bg-card border-2 border-pink-500/50 p-6" style={{ boxShadow: "0 0 30px rgba(236, 72, 153, 0.15)" }}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-pink-500/20 flex items-center justify-center">
                    <Key className="w-6 h-6 text-pink-400" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-foreground">Your API Key</h2>
                    <p className="text-sm text-muted-foreground">Use this key to authenticate your API requests</p>
                  </div>
                </div>
                <Button 
                  variant="default" 
                  className="bg-primary hover:bg-primary/90 gap-2"
                  onClick={regenerateApiKey}
                  disabled={regenerating}
                >
                  {regenerating ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <RefreshCw className="w-4 h-4" />
                  )}
                  Regenerate Key
                </Button>
              </div>

              {/* API Key Display */}
              <div className="rounded-lg bg-background/50 border border-dashed border-pink-500/30 p-4 flex items-center justify-between">
                <code className="text-sm text-muted-foreground font-mono">{displayApiKey}</code>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-muted-foreground hover:text-foreground"
                  onClick={() => copyCode(displayApiKey, "apikey")}
                >
                  {copiedCode === "apikey" ? (
                    <Check className="w-4 h-4 text-green-500" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </Button>
              </div>

              {/* Warning */}
              <div className="mt-4 flex items-center gap-2 text-yellow-500 text-sm">
                <AlertTriangle className="w-4 h-4" />
                Keep your API key secure. Do not share it publicly or commit it to version control.
              </div>
            </div>

            {/* API Endpoints */}
            <div className="rounded-xl bg-card border border-border p-6">
              <div className="flex items-center gap-3 mb-6">
                <Sparkles className="w-5 h-5 text-primary" />
                <h2 className="text-lg font-bold text-foreground">API Endpoints</h2>
              </div>
              <p className="text-muted-foreground mb-6">Use these endpoints to interact with the authentication system programmatically.</p>

              {/* GET /api/user */}
              <div className="space-y-6">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <span className="px-2 py-1 rounded text-xs font-bold bg-green-500/20 text-green-500">GET</span>
                    <code className="text-sm text-muted-foreground font-mono bg-secondary px-2 py-1 rounded">/api/user</code>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-muted-foreground hover:text-foreground"
                      onClick={() => copyCode("/api/user", "endpoint1")}
                    >
                      {copiedCode === "endpoint1" ? (
                        <Check className="w-3 h-3 text-green-500" />
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}
                    </Button>
                  </div>
                  <h3 className="font-semibold text-foreground mb-1">Get User Data</h3>
                  <p className="text-sm text-muted-foreground mb-4">Fetches authenticated user profile and their linked service.</p>

                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Code className="w-4 h-4 text-primary" />
                      <span className="font-medium">Example Request</span>
                    </div>
                    <div className="rounded-lg bg-background/50 border border-border p-4 overflow-x-auto">
                      <pre className="text-sm text-muted-foreground font-mono">{`curl -X GET "${SUPABASE_URL}/functions/v1/api/user" \\
  -H "Authorization: Bearer ${displayApiKey}" \\
  -H "Content-Type: application/json"`}</pre>
                    </div>
                  </div>
                </div>

                {/* POST /validate-key */}
                <div className="pt-6 border-t border-border">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="px-2 py-1 rounded text-xs font-bold bg-blue-500/20 text-blue-500">POST</span>
                    <code className="text-sm text-muted-foreground font-mono bg-secondary px-2 py-1 rounded">/validate-key</code>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-muted-foreground hover:text-foreground"
                      onClick={() => copyCode("/validate-key", "endpoint2")}
                    >
                      {copiedCode === "endpoint2" ? (
                        <Check className="w-3 h-3 text-green-500" />
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}
                    </Button>
                  </div>
                  <h3 className="font-semibold text-foreground mb-1">Validate License Key</h3>
                  <p className="text-sm text-muted-foreground mb-4">Validates a license key for a specific script with HWID binding.</p>

                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Code className="w-4 h-4 text-primary" />
                      <span className="font-medium">Example Request</span>
                    </div>
                    <div className="rounded-lg bg-background/50 border border-border p-4 overflow-x-auto">
                      <pre className="text-sm text-muted-foreground font-mono">{`curl -X POST "${SUPABASE_URL}/functions/v1/validate-key" \\
  -H "apikey: ${displayApiKey}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "key": "LICENSE_KEY",
    "script_id": "SCRIPT_ID",
    "hwid": "USER_HWID"
  }'`}</pre>
                    </div>
                  </div>
                </div>

                {/* GET /get-script */}
                <div className="pt-6 border-t border-border">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="px-2 py-1 rounded text-xs font-bold bg-green-500/20 text-green-500">GET</span>
                    <code className="text-sm text-muted-foreground font-mono bg-secondary px-2 py-1 rounded">/get-script/:script_id</code>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-muted-foreground hover:text-foreground"
                      onClick={() => copyCode("/get-script/:script_id", "endpoint3")}
                    >
                      {copiedCode === "endpoint3" ? (
                        <Check className="w-3 h-3 text-green-500" />
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}
                    </Button>
                  </div>
                  <h3 className="font-semibold text-foreground mb-1">Get Script Content</h3>
                  <p className="text-sm text-muted-foreground mb-4">Retrieves the obfuscated script content after successful validation.</p>

                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Code className="w-4 h-4 text-primary" />
                      <span className="font-medium">Example Request</span>
                    </div>
                    <div className="rounded-lg bg-background/50 border border-border p-4 overflow-x-auto">
                      <pre className="text-sm text-muted-foreground font-mono">{`curl -X GET "${SUPABASE_URL}/functions/v1/get-script/SCRIPT_ID" \\
  -H "apikey: ${displayApiKey}"`}</pre>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Dashboard Guide Tab */}
        {activeTab === "guide" && (
          <div className="rounded-xl bg-card border border-border overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-border">
              <div className="flex items-center gap-3">
                <FileText className="w-5 h-5 text-primary" />
                <div>
                  <h2 className="font-bold text-foreground">Dashboard Guide</h2>
                  <p className="text-sm text-muted-foreground">Comprehensive documentation for using all features of the dashboard.</p>
                </div>
              </div>
              <Button 
                variant="ghost" 
                className="gap-2 text-primary hover:text-primary"
                onClick={() => window.open('/documentation', '_blank')}
              >
                <ExternalLink className="w-4 h-4" />
                Open in New Tab
              </Button>
            </div>

            <div className="flex min-h-[500px]">
              {/* Sidebar */}
              <div className="w-64 border-r border-border bg-secondary/20 p-4">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
                    <Shield className="w-4 h-4 text-primary" />
                  </div>
                  <span className="font-semibold text-foreground">ShadowAuth Docs</span>
                </div>

                {/* Search */}
                <div className="relative mb-4">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search..."
                    className="pl-9 bg-background/50 border-border text-sm"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground bg-secondary px-1.5 py-0.5 rounded">Ctrl K</span>
                </div>

                {/* Navigation */}
                <nav className="space-y-1">
                  {sidebarItems.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => setActiveSidebarItem(item.id)}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors ${
                        activeSidebarItem === item.id
                          ? "bg-primary/10 text-primary"
                          : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <item.icon className="w-4 h-4" />
                        <span>{item.label}</span>
                      </div>
                      {item.hasChildren && (
                        <ChevronRight className="w-4 h-4" />
                      )}
                    </button>
                  ))}
                </nav>
              </div>

              {/* Content */}
              <div className="flex-1 p-6 overflow-y-auto">
                {activeSidebarItem === "what-is" && (
                  <>
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                          <Shield className="w-5 h-5 text-primary" />
                        </div>
                        <h1 className="text-2xl font-bold text-foreground">What is ShadowAuth?</h1>
                      </div>
                      <Button variant="outline" className="gap-2" onClick={() => copyCode("ShadowAuth documentation", "doc")}>
                        <Copy className="w-4 h-4" />
                        Copy
                      </Button>
                    </div>

                    <p className="text-sm text-muted-foreground mb-6">Last Updated: 01/28/2025</p>

                    <div className="prose prose-invert max-w-none">
                      <p className="text-muted-foreground leading-relaxed mb-6">
                        ShadowAuth is a free authentication service to monetize your scripts. ShadowAuth offers seamless integration, 
                        real-time analytics, and more! We have over 10 different methods to monetize your scripts, whether 
                        it's Linkvertise, Lootlabs, or something else! We also offer customization like no one else with 
                        everything you can imagine. If something's missing, feel free to suggest it in our{" "}
                        <a href="#" className="text-primary hover:underline">Discord</a> server!
                      </p>

                      <div className="rounded-lg bg-secondary/30 border border-border p-4 mb-6">
                        <div className="flex items-start gap-2">
                          <AlertTriangle className="w-4 h-4 text-muted-foreground mt-0.5" />
                          <p className="text-sm text-muted-foreground">
                            While the frontend design has slightly changed, the logic remains the same.
                          </p>
                        </div>
                      </div>

                      <div className="space-y-3 text-sm">
                        <p className="text-muted-foreground">
                          <span className="font-medium text-foreground">Website:</span>{" "}
                          <a href="#" className="text-primary hover:underline">https://shadowauth.dev/</a>
                        </p>
                        <p className="text-muted-foreground">
                          <span className="font-medium text-foreground">Discord:</span>{" "}
                          <a href="#" className="text-primary hover:underline">https://discord.gg/shadowauth</a>
                        </p>
                        <p className="text-muted-foreground">
                          <span className="font-medium text-foreground">Authors:</span>{" "}
                          <a href="#" className="text-primary hover:underline">@shadowdev</a>
                        </p>
                      </div>
                    </div>
                  </>
                )}

                {activeSidebarItem === "registering" && (
                  <>
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                        <FileText className="w-5 h-5 text-primary" />
                      </div>
                      <h1 className="text-2xl font-bold text-foreground">Getting Started</h1>
                    </div>
                    <div className="space-y-6">
                      <div className="prose prose-invert max-w-none">
                        <h3 className="text-lg font-semibold text-foreground mb-3">Step 1: Create Your Account</h3>
                        <ol className="list-decimal list-inside space-y-2 text-muted-foreground">
                          <li>Go to the ShadowAuth website and click "Get Started"</li>
                          <li>Sign up with your email address or Discord</li>
                          <li>Verify your email address through the confirmation link</li>
                          <li>Complete your profile setup with display name</li>
                        </ol>
                      </div>
                      
                      <div className="prose prose-invert max-w-none">
                        <h3 className="text-lg font-semibold text-foreground mb-3">Step 2: Create Your First Script</h3>
                        <ol className="list-decimal list-inside space-y-2 text-muted-foreground">
                          <li>Navigate to "Virtual Storage" from the sidebar</li>
                          <li>Click "Upload Script" or drag & drop your Lua file</li>
                          <li>Give your script a meaningful name</li>
                          <li>Copy the generated loader script</li>
                        </ol>
                      </div>
                      
                      <div className="prose prose-invert max-w-none">
                        <h3 className="text-lg font-semibold text-foreground mb-3">Step 3: Generate Keys</h3>
                        <ol className="list-decimal list-inside space-y-2 text-muted-foreground">
                          <li>Go to "Key Management" from the sidebar</li>
                          <li>Click "Generate Key" button</li>
                          <li>Select your script and configure duration</li>
                          <li>Distribute keys to your users</li>
                        </ol>
                      </div>
                      
                      <div className="rounded-lg bg-green-500/10 border border-green-500/30 p-4">
                        <h4 className="font-semibold text-green-500 mb-2">🎉 You're Ready!</h4>
                        <p className="text-sm text-muted-foreground">
                          Your script is now protected by ShadowAuth. Users will need a valid key to execute it.
                        </p>
                      </div>
                    </div>
                  </>
                )}

                {activeSidebarItem === "dashboard" && (
                  <>
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                        <Shield className="w-5 h-5 text-primary" />
                      </div>
                      <h1 className="text-2xl font-bold text-foreground">Dashboard Overview</h1>
                    </div>
                    <div className="space-y-6">
                      <p className="text-muted-foreground">
                        The Main Dashboard provides a comprehensive overview of your script's performance and user activity.
                      </p>
                      
                      <div className="space-y-4">
                        <div className="rounded-lg bg-secondary/30 border border-border p-4">
                          <h3 className="font-semibold text-foreground mb-2">📊 Key Performance Metrics</h3>
                          <ul className="text-sm text-muted-foreground space-y-1">
                            <li>• <strong>Total Executions</strong> - How many times your scripts have been run</li>
                            <li>• <strong>Total Keys</strong> - Number of active and generated keys</li>
                            <li>• <strong>Active Users</strong> - Unique users (by HWID) using your scripts</li>
                            <li>• <strong>Countries</strong> - Geographic distribution of your users</li>
                          </ul>
                        </div>
                        
                        <div className="rounded-lg bg-secondary/30 border border-border p-4">
                          <h3 className="font-semibold text-foreground mb-2">🗺️ Interactive World Map</h3>
                          <p className="text-sm text-muted-foreground">
                            Hover over countries to see execution counts and user distribution. Countries with more activity appear brighter.
                          </p>
                        </div>
                        
                        <div className="rounded-lg bg-secondary/30 border border-border p-4">
                          <h3 className="font-semibold text-foreground mb-2">📈 Activity Chart</h3>
                          <p className="text-sm text-muted-foreground">
                            Track daily executions and key generation over the past 7 days to identify trends.
                          </p>
                        </div>
                        
                        <div className="rounded-lg bg-secondary/30 border border-border p-4">
                          <h3 className="font-semibold text-foreground mb-2">🔐 User Distribution</h3>
                          <p className="text-sm text-muted-foreground">
                            Pie chart showing the ratio of premium vs standard keys in your system.
                          </p>
                        </div>
                      </div>
                    </div>
                  </>
                )}

                {activeSidebarItem === "scripts" && (
                  <>
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                        <Code className="w-5 h-5 text-blue-500" />
                      </div>
                      <h1 className="text-2xl font-bold text-foreground">Managing Scripts</h1>
                    </div>
                    <div className="space-y-6">
                      <div className="prose prose-invert max-w-none">
                        <h3 className="text-lg font-semibold text-foreground mb-3">Uploading Scripts</h3>
                        <p className="text-muted-foreground mb-4">
                          There are two ways to upload scripts to Virtual Storage:
                        </p>
                        <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                          <li><strong>Drag & Drop</strong> - Simply drag your .lua or .txt file into the upload area</li>
                          <li><strong>Manual Upload</strong> - Click "Manual Upload" and paste your script content</li>
                        </ul>
                      </div>
                      
                      <div className="prose prose-invert max-w-none">
                        <h3 className="text-lg font-semibold text-foreground mb-3">Script Actions</h3>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="rounded-lg bg-secondary/30 border border-border p-3">
                            <p className="font-medium text-foreground text-sm">Get Script</p>
                            <p className="text-xs text-muted-foreground">Copy the loader code</p>
                          </div>
                          <div className="rounded-lg bg-secondary/30 border border-border p-3">
                            <p className="font-medium text-foreground text-sm">View Obfuscated</p>
                            <p className="text-xs text-muted-foreground">See protected code</p>
                          </div>
                          <div className="rounded-lg bg-secondary/30 border border-border p-3">
                            <p className="font-medium text-foreground text-sm">Edit</p>
                            <p className="text-xs text-muted-foreground">Modify script content</p>
                          </div>
                          <div className="rounded-lg bg-secondary/30 border border-border p-3">
                            <p className="font-medium text-foreground text-sm">Download</p>
                            <p className="text-xs text-muted-foreground">Save as local file</p>
                          </div>
                        </div>
                      </div>
                      
                      <div className="rounded-lg bg-yellow-500/10 border border-yellow-500/30 p-4">
                        <h4 className="font-semibold text-yellow-500 mb-2">⚠️ Important</h4>
                        <p className="text-sm text-muted-foreground">
                          Always backup your original scripts. Once uploaded and obfuscated, the original code cannot be recovered from our servers.
                        </p>
                      </div>
                    </div>
                  </>
                )}

                {activeSidebarItem === "keys" && (
                  <>
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-10 h-10 rounded-lg bg-pink-500/20 flex items-center justify-center">
                        <Key className="w-5 h-5 text-pink-500" />
                      </div>
                      <h1 className="text-2xl font-bold text-foreground">Key Management</h1>
                    </div>
                    <div className="space-y-6">
                      <div className="prose prose-invert max-w-none">
                        <h3 className="text-lg font-semibold text-foreground mb-3">Key Types</h3>
                        <div className="space-y-3">
                          <div className="rounded-lg bg-secondary/30 border border-border p-4">
                            <h4 className="font-semibold text-primary mb-1">Lifetime Keys</h4>
                            <p className="text-sm text-muted-foreground">Never expire. Best for permanent customers or VIP access.</p>
                          </div>
                          <div className="rounded-lg bg-secondary/30 border border-border p-4">
                            <h4 className="font-semibold text-green-500 mb-1">Timed Keys</h4>
                            <p className="text-sm text-muted-foreground">Expire after set duration (days, months, years). Ideal for subscriptions.</p>
                          </div>
                        </div>
                      </div>
                      
                      <div className="prose prose-invert max-w-none">
                        <h3 className="text-lg font-semibold text-foreground mb-3">HWID Locking</h3>
                        <p className="text-muted-foreground">
                          When a key is first used, it binds to the user's hardware ID (HWID). This prevents key sharing.
                        </p>
                        <ul className="list-disc list-inside space-y-2 text-muted-foreground mt-3">
                          <li>Keys can be reset manually from the dashboard</li>
                          <li>Discord bot supports /resethwid command</li>
                          <li>Set cooldown periods between HWID resets</li>
                        </ul>
                      </div>
                      
                      <div className="prose prose-invert max-w-none">
                        <h3 className="text-lg font-semibold text-foreground mb-3">Batch Operations</h3>
                        <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                          <li>Generate up to 100 keys at once</li>
                          <li>Export keys to CSV for distribution</li>
                          <li>Delete all keys with one click (use with caution!)</li>
                        </ul>
                      </div>
                    </div>
                  </>
                )}

                {activeSidebarItem === "revenue" && (
                  <>
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
                        <DollarSign className="w-5 h-5 text-green-500" />
                      </div>
                      <h1 className="text-2xl font-bold text-foreground">Revenue Methods</h1>
                    </div>
                    <div className="space-y-6">
                      <p className="text-muted-foreground">
                        ShadowAuth supports multiple monetization methods. Configure them in Hub Settings.
                      </p>
                      
                      <div className="space-y-4">
                        <div className="rounded-lg bg-secondary/30 border border-border p-4">
                          <h3 className="font-semibold text-foreground mb-2">🔗 Linkvertise</h3>
                          <p className="text-sm text-muted-foreground mb-2">The most popular ad link monetization platform.</p>
                          <ul className="text-xs text-muted-foreground space-y-1">
                            <li>• Average CPM: $2-5 depending on region</li>
                            <li>• Daily payouts available</li>
                            <li>• Multiple bypass protection</li>
                          </ul>
                        </div>
                        
                        <div className="rounded-lg bg-secondary/30 border border-border p-4">
                          <h3 className="font-semibold text-foreground mb-2">💎 Lootlabs</h3>
                          <p className="text-sm text-muted-foreground mb-2">Alternative ad network with competitive rates.</p>
                          <ul className="text-xs text-muted-foreground space-y-1">
                            <li>• Higher CPM for certain regions</li>
                            <li>• CPA offers available</li>
                            <li>• Excellent support</li>
                          </ul>
                        </div>
                        
                        <div className="rounded-lg bg-secondary/30 border border-border p-4">
                          <h3 className="font-semibold text-foreground mb-2">👑 Premium Keys</h3>
                          <p className="text-sm text-muted-foreground mb-2">Sell keys directly through Discord or your website.</p>
                          <ul className="text-xs text-muted-foreground space-y-1">
                            <li>• 100% of revenue goes to you</li>
                            <li>• Set your own prices</li>
                            <li>• Accept crypto, PayPal, or Robux</li>
                          </ul>
                        </div>
                        
                        <div className="rounded-lg bg-secondary/30 border border-border p-4">
                          <h3 className="font-semibold text-foreground mb-2">🚀 Boosters</h3>
                          <p className="text-sm text-muted-foreground mb-2">Increase your earnings with speed and priority boosters.</p>
                          <ul className="text-xs text-muted-foreground space-y-1">
                            <li>• Speed Boost: Faster key validation</li>
                            <li>• Priority: Higher queue priority</li>
                            <li>• Capacity: More concurrent users</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </>
                )}

                {activeSidebarItem === "client-apis" && (
                  <>
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                        <Code className="w-5 h-5 text-blue-500" />
                      </div>
                      <h1 className="text-2xl font-bold text-foreground">Client API's</h1>
                    </div>
                    <div className="space-y-6">
                      <p className="text-muted-foreground">
                        ShadowAuth provides multiple client APIs for different platforms and use cases.
                      </p>
                      
                      <div className="space-y-4">
                        <div className="rounded-lg bg-secondary/30 border border-border p-4">
                          <h3 className="font-semibold text-foreground mb-3">Roblox Lua Loader</h3>
                          <div className="rounded-lg bg-background/50 border border-border p-3 overflow-x-auto">
                            <pre className="text-xs text-muted-foreground font-mono">{`script_key = "YOUR_KEY_HERE"
loadstring(game:HttpGet("API_URL/loader/SCRIPT_ID"))()`}</pre>
                          </div>
                        </div>
                        
                        <div className="rounded-lg bg-secondary/30 border border-border p-4">
                          <h3 className="font-semibold text-foreground mb-3">REST API Endpoints</h3>
                          <div className="space-y-2 text-sm text-muted-foreground">
                            <p><code className="bg-background px-2 py-0.5 rounded">POST /validate-key</code> - Validate a license key</p>
                            <p><code className="bg-background px-2 py-0.5 rounded">GET /get-script/:id</code> - Retrieve script content</p>
                            <p><code className="bg-background px-2 py-0.5 rounded">POST /heartbeat</code> - Keep session alive</p>
                            <p><code className="bg-background px-2 py-0.5 rounded">GET /get-session-status</code> - Check session state</p>
                          </div>
                        </div>
                        
                        <div className="rounded-lg bg-secondary/30 border border-border p-4">
                          <h3 className="font-semibold text-foreground mb-3">Response Codes</h3>
                          <div className="space-y-2 text-sm text-muted-foreground">
                            <p><span className="text-green-500">200</span> - Success</p>
                            <p><span className="text-yellow-500">401</span> - Invalid or expired key</p>
                            <p><span className="text-yellow-500">403</span> - HWID mismatch or banned</p>
                            <p><span className="text-red-500">429</span> - Rate limited</p>
                            <p><span className="text-red-500">500</span> - Server error</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </>
                )}

                {activeSidebarItem === "webhooks" && (
                  <>
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                        <ExternalLink className="w-5 h-5 text-purple-500" />
                      </div>
                      <h1 className="text-2xl font-bold text-foreground">Webhooks</h1>
                    </div>
                    <div className="space-y-6">
                      <p className="text-muted-foreground">
                        Receive real-time notifications when events happen in your system.
                      </p>
                      
                      <div className="space-y-4">
                        <div className="rounded-lg bg-secondary/30 border border-border p-4">
                          <h3 className="font-semibold text-foreground mb-2">Available Events</h3>
                          <ul className="text-sm text-muted-foreground space-y-1">
                            <li>• <code className="bg-background px-1 rounded">key.used</code> - When a key is first activated</li>
                            <li>• <code className="bg-background px-1 rounded">key.expired</code> - When a key expires</li>
                            <li>• <code className="bg-background px-1 rounded">script.executed</code> - Each script execution</li>
                            <li>• <code className="bg-background px-1 rounded">hwid.reset</code> - When HWID is reset</li>
                            <li>• <code className="bg-background px-1 rounded">user.banned</code> - When a user is banned</li>
                          </ul>
                        </div>
                        
                        <div className="rounded-lg bg-secondary/30 border border-border p-4">
                          <h3 className="font-semibold text-foreground mb-2">Discord Webhooks</h3>
                          <p className="text-sm text-muted-foreground">
                            Configure a Discord webhook URL in Hub Settings to receive embedded notifications in your server.
                          </p>
                        </div>
                      </div>
                    </div>
                  </>
                )}

                {activeSidebarItem === "security" && (
                  <>
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-10 h-10 rounded-lg bg-red-500/20 flex items-center justify-center">
                        <Shield className="w-5 h-5 text-red-500" />
                      </div>
                      <h1 className="text-2xl font-bold text-foreground">Security Best Practices</h1>
                    </div>
                    <div className="space-y-6">
                      <div className="space-y-4">
                        <div className="rounded-lg bg-secondary/30 border border-border p-4">
                          <h3 className="font-semibold text-foreground mb-2">🔐 API Key Security</h3>
                          <ul className="text-sm text-muted-foreground space-y-1">
                            <li>• Never share your API key publicly</li>
                            <li>• Regenerate keys if compromised</li>
                            <li>• Use environment variables in production</li>
                          </ul>
                        </div>
                        
                        <div className="rounded-lg bg-secondary/30 border border-border p-4">
                          <h3 className="font-semibold text-foreground mb-2">🛡️ HWID Protection</h3>
                          <ul className="text-sm text-muted-foreground space-y-1">
                            <li>• Enable HWID locking to prevent key sharing</li>
                            <li>• Set appropriate reset cooldowns (24h recommended)</li>
                            <li>• Monitor for suspicious reset patterns</li>
                          </ul>
                        </div>
                        
                        <div className="rounded-lg bg-secondary/30 border border-border p-4">
                          <h3 className="font-semibold text-foreground mb-2">🚨 Spy Detection</h3>
                          <ul className="text-sm text-muted-foreground space-y-1">
                            <li>• Enable spy warnings in script settings</li>
                            <li>• Set maximum warnings before auto-ban</li>
                            <li>• Review security events regularly</li>
                          </ul>
                        </div>
                        
                        <div className="rounded-lg bg-secondary/30 border border-border p-4">
                          <h3 className="font-semibold text-foreground mb-2">📊 Monitoring</h3>
                          <ul className="text-sm text-muted-foreground space-y-1">
                            <li>• Check Service Log for unusual activity</li>
                            <li>• Set up Discord webhooks for alerts</li>
                            <li>• Review connected sessions regularly</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </>
                )}

                {activeSidebarItem === "tips" && (
                  <>
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-10 h-10 rounded-lg bg-yellow-500/20 flex items-center justify-center">
                        <Lightbulb className="w-5 h-5 text-yellow-500" />
                      </div>
                      <h1 className="text-2xl font-bold text-foreground">Tips & Tricks</h1>
                    </div>
                    <div className="space-y-6">
                      <div className="space-y-4">
                        <div className="rounded-lg bg-secondary/30 border border-border p-4">
                          <h3 className="font-semibold text-foreground mb-2">💡 Maximize Revenue</h3>
                          <ul className="text-sm text-muted-foreground space-y-1">
                            <li>• Use multiple checkpoint providers for redundancy</li>
                            <li>• Offer premium keys as an alternative to ads</li>
                            <li>• Price keys competitively for your market</li>
                          </ul>
                        </div>
                        
                        <div className="rounded-lg bg-secondary/30 border border-border p-4">
                          <h3 className="font-semibold text-foreground mb-2">📈 Grow Your User Base</h3>
                          <ul className="text-sm text-muted-foreground space-y-1">
                            <li>• Provide excellent support in your Discord</li>
                            <li>• Regular script updates keep users engaged</li>
                            <li>• Consider free trials for new users</li>
                          </ul>
                        </div>
                        
                        <div className="rounded-lg bg-secondary/30 border border-border p-4">
                          <h3 className="font-semibold text-foreground mb-2">⚡ Performance Tips</h3>
                          <ul className="text-sm text-muted-foreground space-y-1">
                            <li>• Keep scripts optimized and lightweight</li>
                            <li>• Use obfuscation to protect your code</li>
                            <li>• Implement proper error handling</li>
                          </ul>
                        </div>
                        
                        <div className="rounded-lg bg-secondary/30 border border-border p-4">
                          <h3 className="font-semibold text-foreground mb-2">🤖 Automation</h3>
                          <ul className="text-sm text-muted-foreground space-y-1">
                            <li>• Set up Discord bot for automated key delivery</li>
                            <li>• Use webhooks for real-time notifications</li>
                            <li>• Automate HWID resets with cooldowns</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </>
                )}

                {activeSidebarItem === "discord-bots" && (
                  <>
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-10 h-10 rounded-lg bg-[#5865F2]/20 flex items-center justify-center">
                        <Bot className="w-5 h-5 text-[#5865F2]" />
                      </div>
                      <h1 className="text-2xl font-bold text-foreground">Discord Bots</h1>
                    </div>
                    <div className="space-y-6">
                      <p className="text-muted-foreground">
                        Integrate ShadowAuth with your Discord server for seamless key management.
                      </p>
                      
                      <div className="space-y-4">
                        <div className="rounded-lg bg-secondary/30 border border-border p-4">
                          <h3 className="font-semibold text-foreground mb-3">Available Commands</h3>
                          <div className="space-y-2 text-sm text-muted-foreground">
                            <p><code className="bg-background px-2 py-0.5 rounded">/resethwid [key]</code> - Reset a user's HWID binding</p>
                            <p><code className="bg-background px-2 py-0.5 rounded">/createkey [duration]</code> - Generate new keys</p>
                            <p><code className="bg-background px-2 py-0.5 rounded">/deletekey [key]</code> - Delete a specific key</p>
                            <p><code className="bg-background px-2 py-0.5 rounded">/bankey [key] [reason]</code> - Ban a key with reason</p>
                            <p><code className="bg-background px-2 py-0.5 rounded">/unbankey [key]</code> - Unban a previously banned key</p>
                            <p><code className="bg-background px-2 py-0.5 rounded">/keyinfo [key]</code> - View key details</p>
                            <p><code className="bg-background px-2 py-0.5 rounded">/stats</code> - View script statistics</p>
                            <p><code className="bg-background px-2 py-0.5 rounded">/redeem [code]</code> - Redeem a subscription code</p>
                          </div>
                        </div>
                        
                        <div className="rounded-lg bg-secondary/30 border border-border p-4">
                          <h3 className="font-semibold text-foreground mb-2">Setup Instructions</h3>
                          <ol className="text-sm text-muted-foreground space-y-2 list-decimal list-inside">
                            <li>Go to Hub Settings → Discord section</li>
                            <li>Enter your Discord Guild ID</li>
                            <li>Set the Manager Role ID for permissions</li>
                            <li>Configure the Log Channel for notifications</li>
                            <li>Add the bot to your server using the invite link</li>
                          </ol>
                        </div>
                        
                        <div className="rounded-lg bg-yellow-500/10 border border-yellow-500/30 p-4">
                          <h4 className="font-semibold text-yellow-500 mb-2">⚠️ Permissions</h4>
                          <p className="text-sm text-muted-foreground">
                            Only users with the Manager Role can execute bot commands. Regular users can only use /redeem.
                          </p>
                        </div>
                      </div>
                    </div>
                  </>
                )}

                {activeSidebarItem === "faq" && (
                  <>
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-10 h-10 rounded-lg bg-cyan-500/20 flex items-center justify-center">
                        <MessageSquare className="w-5 h-5 text-cyan-500" />
                      </div>
                      <h1 className="text-2xl font-bold text-foreground">Frequently Asked Questions</h1>
                    </div>
                    <div className="space-y-4">
                      <div className="rounded-lg bg-secondary/30 border border-border p-4">
                        <h3 className="font-semibold text-foreground mb-2">Is ShadowAuth free to use?</h3>
                        <p className="text-sm text-muted-foreground">
                          Yes! ShadowAuth offers a free tier. Premium plans unlock additional features like more scripts, higher rate limits, and priority support.
                        </p>
                      </div>
                      
                      <div className="rounded-lg bg-secondary/30 border border-border p-4">
                        <h3 className="font-semibold text-foreground mb-2">How do I reset a user's HWID?</h3>
                        <p className="text-sm text-muted-foreground">
                          Go to Key Management, find the key, and click the Reset HWID button. Or use the Discord bot command /resethwid.
                        </p>
                      </div>
                      
                      <div className="rounded-lg bg-secondary/30 border border-border p-4">
                        <h3 className="font-semibold text-foreground mb-2">What executors are supported?</h3>
                        <p className="text-sm text-muted-foreground">
                          ShadowAuth works with all major Roblox executors that support loadstring and HttpGet.
                        </p>
                      </div>
                      
                      <div className="rounded-lg bg-secondary/30 border border-border p-4">
                        <h3 className="font-semibold text-foreground mb-2">Can I use my own domain?</h3>
                        <p className="text-sm text-muted-foreground">
                          Custom domains are available on Enterprise plans. Contact support for setup instructions.
                        </p>
                      </div>
                      
                      <div className="rounded-lg bg-secondary/30 border border-border p-4">
                        <h3 className="font-semibold text-foreground mb-2">How do I prevent key leaking?</h3>
                        <p className="text-sm text-muted-foreground">
                          Enable HWID locking and set appropriate reset cooldowns. Use the spy detection feature to auto-ban suspicious activity.
                        </p>
                      </div>
                      
                      <div className="rounded-lg bg-secondary/30 border border-border p-4">
                        <h3 className="font-semibold text-foreground mb-2">What payment methods do you accept?</h3>
                        <p className="text-sm text-muted-foreground">
                          We accept credit cards, PayPal, and cryptocurrency through our payment processor.
                        </p>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Documentation;
