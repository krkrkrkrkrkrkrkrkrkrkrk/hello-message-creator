import { useState } from "react";
import { motion } from "framer-motion";
import { 
  Book, Copy, Check, Code, ChevronRight, ChevronDown,
  Search, Shield, Key, Zap, Bot, Webhook, Globe,
  FileText, Terminal, Lock, Users, BarChart3, ArrowRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Link } from "react-router-dom";

const SUPABASE_URL = (import.meta as any).env?.VITE_SUPABASE_URL || "https://your-project.supabase.co";

const DocsPublic = () => {
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState("getting-started");
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedSections, setExpandedSections] = useState<string[]>(["getting-started"]);

  const copyCode = (code: string, id: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(id);
    toast.success("Copied to clipboard!");
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const toggleSection = (id: string) => {
    setExpandedSections(prev => 
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    );
  };

  const sidebarSections = [
    {
      id: "getting-started",
      label: "Getting Started",
      icon: Zap,
      items: [
        { id: "what-is", label: "What is ShadowAuth?" },
        { id: "quick-start", label: "Quick Start Guide" },
        { id: "create-account", label: "Create an Account" },
      ]
    },
    {
      id: "core-concepts",
      label: "Core Concepts",
      icon: Shield,
      items: [
        { id: "scripts", label: "Scripts & Loaders" },
        { id: "keys", label: "License Keys" },
        { id: "hwid", label: "HWID Binding" },
        { id: "obfuscation", label: "Obfuscation" },
      ]
    },
    {
      id: "api-reference",
      label: "API Reference",
      icon: Code,
      items: [
        { id: "authentication", label: "Authentication" },
        { id: "validate-key", label: "Validate Key" },
        { id: "get-script", label: "Get Script" },
        { id: "webhooks", label: "Webhooks" },
      ]
    },
    {
      id: "integrations",
      label: "Integrations",
      icon: Bot,
      items: [
        { id: "discord-bot", label: "Discord Bot" },
        { id: "key-system", label: "Key System Providers" },
      ]
    },
  ];

  const renderContent = () => {
    switch (activeSection) {
      case "what-is":
        return (
          <div className="space-y-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
                <Shield className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-foreground">What is ShadowAuth?</h1>
                <p className="text-muted-foreground">Enterprise-grade protection for your Lua scripts</p>
              </div>
            </div>

            <div className="prose prose-invert max-w-none">
              <p className="text-muted-foreground leading-relaxed">
                ShadowAuth is the most advanced authentication and licensing platform for Roblox Lua scripts. 
                We provide military-grade security to protect your code from unauthorized access, 
                reverse engineering, and piracy.
              </p>

              <h2 className="text-xl font-bold text-foreground mt-8 mb-4">Key Features</h2>
              
              <div className="grid md:grid-cols-2 gap-4">
                {[
                  { icon: Lock, title: "HWID Locking", desc: "Bind licenses to specific devices" },
                  { icon: Key, title: "License Management", desc: "Create and manage unlimited keys" },
                  { icon: Shield, title: "Obfuscation", desc: "Powered by Luraph for maximum protection" },
                  { icon: Globe, title: "Global CDN", desc: "Fast delivery worldwide" },
                  { icon: Bot, title: "Discord Bot", desc: "Full integration with your server" },
                  { icon: BarChart3, title: "Analytics", desc: "Track executions and usage" },
                ].map((feature, i) => (
                  <div key={i} className="flex items-start gap-3 p-4 rounded-xl bg-card border border-border">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <feature.icon className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-medium text-foreground">{feature.title}</h3>
                      <p className="text-sm text-muted-foreground">{feature.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );

      case "quick-start":
        return (
          <div className="space-y-6">
            <h1 className="text-3xl font-bold text-foreground">Quick Start Guide</h1>
            <p className="text-muted-foreground">Get up and running in 5 minutes</p>

            <div className="space-y-8">
              {[
                {
                  step: 1,
                  title: "Create an Account",
                  description: "Sign up for a free account to get started.",
                  action: { label: "Sign Up", href: "/auth" }
                },
                {
                  step: 2,
                  title: "Create Your First Script",
                  description: "Go to the Scripts page and create a new script by uploading your Lua code."
                },
                {
                  step: 3,
                  title: "Generate License Keys",
                  description: "Create license keys for your users with custom expiration dates."
                },
                {
                  step: 4,
                  title: "Copy the Loader",
                  description: "Use the generated loader code in your executor to load the protected script."
                },
              ].map((item) => (
                <div key={item.step} className="flex gap-4">
                  <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold shrink-0">
                    {item.step}
                  </div>
                  <div>
                    <h3 className="font-bold text-foreground text-lg">{item.title}</h3>
                    <p className="text-muted-foreground mt-1">{item.description}</p>
                    {item.action && (
                      <Link to={item.action.href}>
                        <Button className="mt-3 gap-2" size="sm">
                          {item.action.label}
                          <ArrowRight className="w-4 h-4" />
                        </Button>
                      </Link>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );

      case "validate-key":
        return (
          <div className="space-y-6">
            <h1 className="text-3xl font-bold text-foreground">Validate Key API</h1>
            <p className="text-muted-foreground">Validate license keys programmatically</p>

            <div className="rounded-xl bg-card border border-border p-6 space-y-4">
              <div className="flex items-center gap-3">
                <span className="px-2 py-1 rounded text-xs font-bold bg-blue-500/20 text-blue-500">POST</span>
                <code className="text-sm text-muted-foreground font-mono">/functions/v1/validate-key</code>
              </div>

              <h3 className="font-bold text-foreground">Request Body</h3>
              <CodeBlock
                id="validate-body"
                code={`{
  "key": "LICENSE_KEY",
  "script_id": "SCRIPT_UUID",
  "hwid": "USER_HWID"
}`}
                onCopy={copyCode}
                copied={copiedCode}
              />

              <h3 className="font-bold text-foreground mt-6">Example (Lua)</h3>
              <CodeBlock
                id="validate-lua"
                code={`local HttpService = game:GetService("HttpService")

local response = request({
    Url = "${SUPABASE_URL}/functions/v1/validate-key",
    Method = "POST",
    Headers = {
        ["Content-Type"] = "application/json"
    },
    Body = HttpService:JSONEncode({
        key = "YOUR_LICENSE_KEY",
        script_id = "YOUR_SCRIPT_ID",
        hwid = game:GetService("RbxAnalyticsService"):GetClientId()
    })
})

local data = HttpService:JSONDecode(response.Body)
if data.valid then
    print("Key is valid!")
else
    print("Invalid key: " .. (data.error or "Unknown error"))
end`}
                onCopy={copyCode}
                copied={copiedCode}
              />

              <h3 className="font-bold text-foreground mt-6">Response</h3>
              <CodeBlock
                id="validate-response"
                code={`{
  "valid": true,
  "expires_at": "2025-12-31T23:59:59Z",
  "hwid_locked": true
}`}
                onCopy={copyCode}
                copied={copiedCode}
              />
            </div>
          </div>
        );

      default:
        return (
          <div className="space-y-6">
            <h1 className="text-3xl font-bold text-foreground">Documentation</h1>
            <p className="text-muted-foreground">
              Select a topic from the sidebar to view documentation.
            </p>

            <div className="grid md:grid-cols-2 gap-4 mt-8">
              {sidebarSections.map((section) => (
                <button
                  key={section.id}
                  onClick={() => {
                    toggleSection(section.id);
                    if (section.items.length > 0) {
                      setActiveSection(section.items[0].id);
                    }
                  }}
                  className="flex items-center gap-4 p-4 rounded-xl bg-card border border-border hover:border-primary/50 transition-colors text-left"
                >
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                    <section.icon className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-bold text-foreground">{section.label}</h3>
                    <p className="text-sm text-muted-foreground">
                      {section.items.length} topics
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        );
    }
  };

  return (
    <main className="min-h-screen bg-background">
      <Navbar />
      
      <div className="pt-20">
        <div className="container mx-auto px-6 py-12">
          <div className="flex gap-8">
            {/* Sidebar */}
            <aside className="w-64 shrink-0 hidden lg:block">
              <div className="sticky top-24 space-y-4">
                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search docs..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 bg-card border-border"
                  />
                </div>

                {/* Navigation */}
                <nav className="space-y-2">
                  {sidebarSections.map((section) => (
                    <div key={section.id}>
                      <button
                        onClick={() => toggleSection(section.id)}
                        className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium text-foreground hover:bg-secondary/50 transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <section.icon className="w-4 h-4 text-primary" />
                          <span>{section.label}</span>
                        </div>
                        {expandedSections.includes(section.id) ? (
                          <ChevronDown className="w-4 h-4 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-muted-foreground" />
                        )}
                      </button>
                      
                      {expandedSections.includes(section.id) && (
                        <div className="ml-6 mt-1 space-y-1">
                          {section.items.map((item) => (
                            <button
                              key={item.id}
                              onClick={() => setActiveSection(item.id)}
                              className={`w-full text-left px-3 py-1.5 rounded-lg text-sm transition-colors ${
                                activeSection === item.id
                                  ? "bg-primary/10 text-primary"
                                  : "text-muted-foreground hover:text-foreground"
                              }`}
                            >
                              {item.label}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </nav>

                {/* CTA */}
                <div className="p-4 rounded-xl bg-primary/10 border border-primary/20">
                  <h4 className="font-medium text-foreground mb-2">Need Help?</h4>
                  <p className="text-sm text-muted-foreground mb-3">
                    Join our Discord for support
                  </p>
                  <a
                    href="https://discord.gg/GE847sSjDV"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Button size="sm" className="w-full gap-2">
                      <Bot className="w-4 h-4" />
                      Join Discord
                    </Button>
                  </a>
                </div>
              </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 min-w-0">
              <motion.div
                key={activeSection}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
              >
                {renderContent()}
              </motion.div>
            </main>
          </div>
        </div>
      </div>

      <Footer />
    </main>
  );
};

const CodeBlock = ({ 
  id, 
  code, 
  onCopy, 
  copied 
}: { 
  id: string; 
  code: string; 
  onCopy: (code: string, id: string) => void;
  copied: string | null;
}) => (
  <div className="relative rounded-lg bg-background/50 border border-border overflow-hidden">
    <div className="absolute top-2 right-2">
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        onClick={() => onCopy(code, id)}
      >
        {copied === id ? (
          <Check className="w-4 h-4 text-emerald-500" />
        ) : (
          <Copy className="w-4 h-4" />
        )}
      </Button>
    </div>
    <pre className="p-4 overflow-x-auto text-sm text-muted-foreground font-mono">
      {code}
    </pre>
  </div>
);

export default DocsPublic;