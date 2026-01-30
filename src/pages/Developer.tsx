import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Copy, Check, RefreshCw, Key, Shield, Code } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const Developer = () => {
  const navigate = useNavigate();
  const [apiKey, setApiKey] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [regenerating, setRegenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [hasSession, setHasSession] = useState(false);

  useEffect(() => {
    fetchApiKey();
  }, []);

  const fetchApiKey = async () => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        setHasSession(false);
        return;
      }

      setHasSession(true);

      const { data, error } = await supabase
        .from("profiles")
        .select("api_key")
        .eq("id", session.user.id)
        .maybeSingle();

      if (error) throw error;
      setApiKey(data?.api_key || "");
    } catch (error: any) {
      toast.error("Failed to fetch API key");
    } finally {
      setLoading(false);
    }
  };

  const regenerateApiKey = async () => {
    setRegenerating(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        navigate("/auth");
        return;
      }

      // Generate new 32-char API key
      const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
      let newKey = "";
      for (let i = 0; i < 32; i++) {
        newKey += chars.charAt(Math.floor(Math.random() * chars.length));
      }

      const { error } = await supabase
        .from("profiles")
        .update({ api_key: newKey })
        .eq("id", session.user.id);

      if (error) throw error;

      setApiKey(newKey);
      toast.success("API key regenerated successfully");
    } catch (error: any) {
      toast.error("Failed to regenerate API key");
    } finally {
      setRegenerating(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(apiKey);
    setCopied(true);
    toast.success("API key copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  if (!loading && !hasSession) {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b border-border/50 backdrop-blur-xl bg-background/80 sticky top-0 z-50">
          <div className="container mx-auto px-4 py-4 flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/")}
              className="text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-xl font-bold text-foreground">API</h1>
              <p className="text-sm text-muted-foreground">Entre para ver sua API Key</p>
            </div>
          </div>
        </header>

        <main className="container mx-auto px-4 py-10 max-w-3xl">
          <div className="glass-card rounded-2xl p-8 border border-border/50">
            <h2 className="text-2xl font-bold text-foreground mb-2">Você não está logado</h2>
            <p className="text-muted-foreground mb-6">
              Faça login/crie conta para acessar sua API Key e suas integrações.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <Button variant="glow" onClick={() => navigate("/auth")}>Entrar / Criar conta</Button>
              <Button variant="outline" onClick={() => navigate("/#pricing")}>Ver planos</Button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/50 backdrop-blur-xl bg-background/80 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/settings")}
            className="text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-xl font-bold text-foreground">Developer Settings</h1>
            <p className="text-sm text-muted-foreground">Manage your API credentials</p>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        {/* API Key Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card p-8 rounded-2xl border border-primary/20"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 rounded-xl bg-primary/20">
              <Key className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-foreground">API Key</h2>
              <p className="text-muted-foreground">Use this key to authenticate API requests</p>
            </div>
          </div>

          {loading ? (
            <div className="animate-pulse h-12 bg-muted rounded-lg" />
          ) : (
            <div className="space-y-4">
              <div className="flex gap-3">
                <Input
                  type="text"
                  value={apiKey}
                  readOnly
                  className="font-mono text-sm bg-background/50 border-border/50"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={copyToClipboard}
                  className="shrink-0"
                >
                  {copied ? (
                    <Check className="h-4 w-4 text-green-500" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>

              <Button
                variant="outline"
                onClick={regenerateApiKey}
                disabled={regenerating}
                className="gap-2"
              >
                <RefreshCw className={`h-4 w-4 ${regenerating ? 'animate-spin' : ''}`} />
                {regenerating ? "Regenerating..." : "Regenerate API Key"}
              </Button>

              <div className="p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
                <p className="text-sm text-yellow-500">
                  <strong>Warning:</strong> Regenerating your API key will invalidate all existing integrations. 
                  Make sure to update your scripts after regeneration.
                </p>
              </div>
            </div>
          )}
        </motion.div>

        {/* Usage Guide */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass-card p-8 rounded-2xl border border-border/50 mt-6"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 rounded-xl bg-secondary/50">
              <Code className="h-6 w-6 text-foreground" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-foreground">Usage</h2>
              <p className="text-muted-foreground">How to use your API key</p>
            </div>
          </div>

          <div className="space-y-4">
            <p className="text-muted-foreground">
              Include your API key in the request headers when making API calls:
            </p>
            <pre className="p-4 rounded-lg bg-background/50 border border-border/50 overflow-x-auto">
              <code className="text-sm text-foreground font-mono">
{`Headers:
  apikey: ${apiKey || 'YOUR_API_KEY'}
  Content-Type: application/json`}
              </code>
            </pre>
          </div>
        </motion.div>

        {/* Security Notice */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="glass-card p-8 rounded-2xl border border-border/50 mt-6"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 rounded-xl bg-primary/10">
              <Shield className="h-6 w-6 text-primary" />
            </div>
            <h2 className="text-2xl font-bold text-foreground">Security</h2>
          </div>
          <ul className="space-y-2 text-muted-foreground">
            <li>• Never share your API key publicly or commit it to version control</li>
            <li>• The API key is tied to your account and all your scripts</li>
            <li>• If you suspect your key has been compromised, regenerate it immediately</li>
            <li>• Each user has one unique API key for all their scripts</li>
          </ul>
        </motion.div>
      </main>
    </div>
  );
};

export default Developer;
