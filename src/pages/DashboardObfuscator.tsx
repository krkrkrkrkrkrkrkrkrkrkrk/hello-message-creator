import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { 
  Shield, Lock, Zap, Code, Copy, Check, Download, 
  Settings2, Loader2, Coins, AlertTriangle, Sparkles
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/dashboard/DashboardLayout";

interface ObfuscatorSettings {
  stringEncryption: boolean;
  constantEncryption: boolean;
  controlFlowObfuscation: boolean;
  antiTamper: boolean;
  vmScrambling: boolean;
  antiHttpSpy: boolean;
}

const TOKEN_COST = 50;

export default function DashboardObfuscator() {
  const [inputCode, setInputCode] = useState("");
  const [outputCode, setOutputCode] = useState("");
  const [isObfuscating, setIsObfuscating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [tokens, setTokens] = useState<number | null>(null);
  const [isPremium, setIsPremium] = useState(false);
  const [progress, setProgress] = useState(0);
  const [settings, setSettings] = useState<ObfuscatorSettings>({
    stringEncryption: true,
    constantEncryption: true,
    controlFlowObfuscation: true,
    antiTamper: true,
    vmScrambling: true,
    antiHttpSpy: true,
  });

  useEffect(() => {
    fetchUserTokens();
  }, []);

  const fetchUserTokens = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const { data } = await supabase
      .from("profiles")
      .select("tokens, subscription_plan, subscription_expires_at")
      .eq("id", session.user.id)
      .single();

    if (data) {
      setTokens(data.tokens || 0);
      const isEnterprisePlan = data.subscription_plan?.toLowerCase() === 'enterprise' && 
        data.subscription_expires_at && 
        new Date(data.subscription_expires_at) > new Date();
      setIsPremium(isEnterprisePlan);
    }
  };

  const handleObfuscate = useCallback(async () => {
    if (!inputCode.trim()) {
      toast.error("Paste your Lua code to obfuscate");
      return;
    }

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      toast.error("You need to be logged in");
      return;
    }

    setIsObfuscating(true);
    setProgress(0);
    setOutputCode("");

    try {
      // Deduct tokens first
      const { data: tokenResult, error: tokenError } = await supabase.rpc("deduct_tokens", {
        p_user_id: session.user.id,
        p_amount: TOKEN_COST
      });

      if (tokenError) {
        throw new Error("Error verifying tokens");
      }

      const result = tokenResult as Record<string, unknown>;
      if (!result.success) {
        toast.error(result.reason as string || "Insufficient tokens");
        setIsObfuscating(false);
        return;
      }

      // Animate progress
      const progressInterval = setInterval(() => {
        setProgress(prev => Math.min(prev + 5, 90));
      }, 200);

      // Call obfuscation endpoint
      const { data, error } = await supabase.functions.invoke('obfuscate-lua', {
        body: {
          code: inputCode,
          options: {
            useLuraph: true,
            encryptStrings: settings.stringEncryption,
            constantEncryption: settings.constantEncryption,
            controlFlow: settings.controlFlowObfuscation,
            antiTamper: settings.antiTamper,
            wrapInVM: settings.vmScrambling,
            antiDebug: settings.antiHttpSpy,
          }
        }
      });

      clearInterval(progressInterval);

      if (error) throw error;
      if (!data.success) throw new Error(data.error || 'Obfuscation failed');

      setProgress(100);
      setOutputCode(data.code);
      
      // Refresh token count
      await fetchUserTokens();

      toast.success("Obfuscation complete!", {
        description: `Ratio: ${data.stats?.ratio || 'N/A'}x | Size: ${data.stats?.obfuscatedSize || 'N/A'} bytes`,
      });
    } catch (error) {
      console.error('Obfuscation error:', error);
      toast.error(error instanceof Error ? error.message : "Obfuscation error");
    } finally {
      setIsObfuscating(false);
    }
  }, [inputCode, settings]);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(outputCode);
    setCopied(true);
    toast.success("Copied!");
    setTimeout(() => setCopied(false), 2000);
  }, [outputCode]);

  const handleDownload = useCallback(() => {
    const blob = new Blob([outputCode], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "protected.lua";
    a.click();
    URL.revokeObjectURL(url);
    toast.success("File downloaded as protected.lua");
  }, [outputCode]);

  const hasEnoughTokens = isPremium || (tokens !== null && tokens >= TOKEN_COST);

  return (
    <DashboardLayout breadcrumb="Obfuscator" title="Luraph Obfuscator">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
              <Shield className="w-7 h-7 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-foreground">Luraph Obfuscator</h2>
              <p className="text-sm text-muted-foreground">Advanced protection with VM encryption</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500/10 border border-amber-500/20">
              <Coins className="w-5 h-5 text-amber-500" />
              <span className="text-lg font-bold text-amber-500">
                {isPremium ? "∞" : tokens ?? "..."}
              </span>
              <span className="text-sm text-amber-500/70">tokens</span>
            </div>
            <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30 text-sm px-3 py-1">
              <Sparkles className="w-4 h-4 mr-1" />
              -{TOKEN_COST} tokens
            </Badge>
          </div>
        </div>
      </motion.div>

      {/* Warning if not enough tokens */}
      {!hasEnoughTokens && (
        <Alert className="mb-6 border-amber-500/30 bg-amber-500/10">
          <AlertTriangle className="w-4 h-4 text-amber-500" />
          <AlertDescription className="text-amber-500">
            You need {TOKEN_COST} tokens to obfuscate. Your tokens: {tokens ?? 0}.
            Upgrade your plan to get more tokens.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Input Section */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
        >
          <Card className="border-border bg-card/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Code className="w-4 h-4 text-primary" />
                Original Code
              </CardTitle>
              <CardDescription>Paste your Lua code here</CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                value={inputCode}
                onChange={(e) => setInputCode(e.target.value)}
                placeholder="-- Paste your Lua code here&#10;local function example()&#10;    print('Hello, World!')&#10;end"
                className="min-h-[300px] font-mono text-sm bg-secondary/50 resize-none"
              />
              <div className="flex items-center justify-between mt-4">
                <span className="text-xs text-muted-foreground">
                  {inputCode.split("\n").length} lines
                </span>
                <Button
                  onClick={handleObfuscate}
                  disabled={isObfuscating || !inputCode.trim() || !hasEnoughTokens}
                  className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
                >
                  {isObfuscating ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Obfuscating...
                    </>
                  ) : (
                    <>
                      <Lock className="w-4 h-4 mr-2" />
                      Obfuscar ({TOKEN_COST} tokens)
                    </>
                  )}
                </Button>
              </div>

              {isObfuscating && (
                <div className="mt-4">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-muted-foreground">Processing...</span>
                    <span className="text-primary font-medium">{progress}%</span>
                  </div>
                  <Progress value={progress} className="h-2" />
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Output Section */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
        >
          <Card className="border-border bg-card/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Shield className="w-4 h-4 text-green-500" />
                Protected Code
              </CardTitle>
              <CardDescription>Obfuscation result</CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                value={outputCode}
                readOnly
                placeholder="The obfuscated code will appear here..."
                className="min-h-[300px] font-mono text-sm bg-secondary/50 resize-none"
              />
              <div className="flex items-center justify-between mt-4">
                <span className="text-xs text-muted-foreground">
                  {outputCode ? `${outputCode.split("\n").length} lines` : "Waiting..."}
                </span>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCopy}
                    disabled={!outputCode}
                  >
                    {copied ? <Check className="w-4 h-4 mr-1" /> : <Copy className="w-4 h-4 mr-1" />}
                    {copied ? "Copied" : "Copy"}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleDownload}
                    disabled={!outputCode}
                  >
                    <Download className="w-4 h-4 mr-1" />
                    Download
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Settings */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="mt-6"
      >
        <Card className="border-border bg-card/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Settings2 className="w-4 h-4 text-primary" />
              Protection Settings
            </CardTitle>
            <CardDescription>Customize the Luraph protection level</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {[
                { id: "stringEncryption", label: "String Encryption", icon: Lock },
                { id: "constantEncryption", label: "Constant Encryption", icon: Zap },
                { id: "controlFlowObfuscation", label: "Control Flow", icon: Code },
                { id: "antiTamper", label: "Anti-Tamper", icon: Shield },
                { id: "vmScrambling", label: "VM Scrambling", icon: Sparkles },
                { id: "antiHttpSpy", label: "Anti-Debug", icon: AlertTriangle },
              ].map((setting) => (
                <div
                  key={setting.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-secondary/30 border border-border"
                >
                  <div className="flex items-center gap-2">
                    <setting.icon className="w-4 h-4 text-primary" />
                    <Label htmlFor={setting.id} className="text-xs font-medium cursor-pointer">
                      {setting.label}
                    </Label>
                  </div>
                  <Switch
                    id={setting.id}
                    checked={settings[setting.id as keyof ObfuscatorSettings]}
                    onCheckedChange={(checked) =>
                      setSettings((s) => ({ ...s, [setting.id]: checked }))
                    }
                  />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Features */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4"
      >
        {[
          { title: "VM Protection", desc: "Bytecode virtualization", color: "purple" },
          { title: "String Encryption", desc: "String encryption", color: "blue" },
          { title: "Control Flow", desc: "Flow obfuscation", color: "green" },
          { title: "Anti-Tamper", desc: "Modification detection", color: "red" },
        ].map((feature) => (
          <Card key={feature.title} className="border-border bg-card/30">
            <CardContent className="p-4 text-center">
              <div className={`w-10 h-10 mx-auto rounded-lg bg-${feature.color}-500/20 flex items-center justify-center mb-2`}>
                <Shield className={`w-5 h-5 text-${feature.color}-500`} />
              </div>
              <h4 className="font-semibold text-sm">{feature.title}</h4>
              <p className="text-xs text-muted-foreground">{feature.desc}</p>
            </CardContent>
          </Card>
        ))}
      </motion.div>
    </DashboardLayout>
  );
}
