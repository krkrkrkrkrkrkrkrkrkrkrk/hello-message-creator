import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import { Code2, Shield, Shuffle, Zap, Lock, Copy, Check, Download, Settings2, Eye, EyeOff, Bug, Fingerprint, FileCode, Binary, Server } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { defaultSettings, ObfuscatorSettings, getObfuscationSteps } from "@/lib/lua-obfuscator";

const Obfuscator = () => {
  const { toast } = useToast();
  const [inputCode, setInputCode] = useState(`-- Example Lua code
local function greet(name)
    local message = "Hello, " .. name .. "!"
    print(message)
    return message
end

local result = greet("World")
print("Result: " .. result)`);
  const [outputCode, setOutputCode] = useState("");
  const [isObfuscating, setIsObfuscating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showSettings, setShowSettings] = useState(true);
  const [settings, setSettings] = useState<ObfuscatorSettings>(defaultSettings);

  const handleObfuscate = useCallback(async () => {
    if (!inputCode.trim()) {
      toast({
        title: "No code provided",
        description: "Please enter some Lua code to obfuscate.",
        variant: "destructive",
      });
      return;
    }

    setIsObfuscating(true);

    try {
      const { data, error } = await supabase.functions.invoke('obfuscate-lua', {
        body: {
          code: inputCode,
          options: {
            // Local engine options
            minify: settings.minify,
            renameVariables: settings.renameVariables,
            encryptStrings: settings.encryptStrings,
            controlFlow: settings.controlFlowObfuscation,
            constantEncryption: settings.constantEncryption,
            addJunkCode: settings.addJunkCode,
            wrapInVM: settings.wrapInVM,
            antiTamper: settings.antiTamper,
            antiDebug: settings.antiDebug,
            opaquePredicates: settings.opaquePredicates,
            multiLayerVM: settings.multiLayerVM,
            watermark: settings.watermark,
            // Luraph API options
            useLuraph: settings.useLuraph,
            targetVersion: settings.luraphTargetVersion,
            disableLineInfo: settings.luraphDisableLineInfo,
            enableGcFixes: settings.luraphEnableGcFixes,
            vmEncryption: settings.luraphVmEncryption,
            stringEncryption: settings.luraphStringEncryption,
          }
        }
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error || 'Obfuscation failed');

      setOutputCode(data.code);
      toast({
        title: "Obfuscation Complete",
        description: `Protected with ShadowAuth Engine. Ratio: ${data.stats?.ratio || 'N/A'}x | Size: ${data.stats?.obfuscatedSize || 'N/A'} bytes`,
      });
    } catch (error) {
      console.error('Obfuscation error:', error);
      toast({
        title: "Obfuscation Failed",
        description: error instanceof Error ? error.message : "An error occurred",
        variant: "destructive",
      });
    } finally {
      setIsObfuscating(false);
    }
  }, [inputCode, settings, toast]);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(outputCode);
    setCopied(true);
    toast({
      title: "Copied!",
      description: "Obfuscated code copied to clipboard.",
    });
    setTimeout(() => setCopied(false), 2000);
  }, [outputCode, toast]);

  const handleDownload = useCallback(() => {
    const blob = new Blob([outputCode], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "protected.lua";
    a.click();
    URL.revokeObjectURL(url);
    toast({
      title: "Downloaded!",
      description: "File saved as protected.lua",
    });
  }, [outputCode, toast]);

  const steps = getObfuscationSteps();

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="container mx-auto px-4 py-8 pt-24">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="p-3 rounded-xl bg-primary/10">
              <Shield className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-4xl font-bold">
              Shadow<span className="text-primary">Auth</span> Obfuscator
            </h1>
          </div>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Enterprise-grade Lua protection with <span className="text-primary font-semibold">ShadowAuth Engine</span> + <span className="text-primary font-semibold">Luraph API</span>.
            5-layer encryption, VM protection, control flow obfuscation. Supports <code className="bg-muted px-1 rounded text-xs">LPH_NO_VIRTUALIZE</code> macros.
          </p>
          <div className="flex items-center justify-center gap-2 mt-4 flex-wrap">
            <Badge variant="default" className="text-xs gap-1">
              <Server className="w-3 h-3" />
              Luraph API
            </Badge>
            <Badge variant="secondary" className="text-xs">LuaU Compatible</Badge>
            <Badge variant="secondary" className="text-xs">Roblox Ready</Badge>
            <Badge variant="secondary" className="text-xs">LPH Macros</Badge>
            <Badge variant="secondary" className="text-xs">FiveM Ready</Badge>
          </div>
        </motion.div>

        {/* Features Grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8"
        >
          {steps.map((step, index) => (
            <Card key={step.name} className="border-border/50 bg-card/50 backdrop-blur">
              <CardContent className="p-4 text-center">
                <div className="flex justify-center mb-2">
                  {index === 0 && <Shuffle className="w-5 h-5 text-primary" />}
                  {index === 1 && <Lock className="w-5 h-5 text-primary" />}
                  {index === 2 && <Code2 className="w-5 h-5 text-primary" />}
                  {index === 3 && <Binary className="w-5 h-5 text-primary" />}
                  {index === 4 && <Fingerprint className="w-5 h-5 text-primary" />}
                  {index === 5 && <Bug className="w-5 h-5 text-primary" />}
                </div>
                <h3 className="font-semibold text-xs">{step.name}</h3>
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{step.description}</p>
              </CardContent>
            </Card>
          ))}
        </motion.div>

        {/* Settings Panel */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-6"
        >
          <Button
            variant="outline"
            onClick={() => setShowSettings(!showSettings)}
            className="mb-4"
          >
            <Settings2 className="w-4 h-4 mr-2" />
            {showSettings ? "Hide Settings" : "Show Settings"}
            {showSettings ? <EyeOff className="w-4 h-4 ml-2" /> : <Eye className="w-4 h-4 ml-2" />}
          </Button>

          {showSettings && (
            <Card className="border-border/50 bg-card/50 backdrop-blur">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg">🔒 Protection Settings</CardTitle>
                <CardDescription>Configure your obfuscation preferences - All options enabled for maximum protection</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {/* Core Protection */}
                  <div className="space-y-4">
                    <h4 className="font-semibold text-sm text-primary">Core Protection</h4>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="renameVariables" className="text-sm">Variable Renaming</Label>
                      <Switch
                        id="renameVariables"
                        checked={settings.renameVariables}
                        onCheckedChange={(checked) => 
                          setSettings(s => ({ ...s, renameVariables: checked }))
                        }
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="encryptStrings" className="text-sm">String Encryption</Label>
                      <Switch
                        id="encryptStrings"
                        checked={settings.encryptStrings}
                        onCheckedChange={(checked) => 
                          setSettings(s => ({ ...s, encryptStrings: checked }))
                        }
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="addJunkCode" className="text-sm">Junk Code Injection</Label>
                      <Switch
                        id="addJunkCode"
                        checked={settings.addJunkCode}
                        onCheckedChange={(checked) => 
                          setSettings(s => ({ ...s, addJunkCode: checked }))
                        }
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="wrapInVM" className="text-sm">VM Protection</Label>
                      <Switch
                        id="wrapInVM"
                        checked={settings.wrapInVM}
                        onCheckedChange={(checked) => 
                          setSettings(s => ({ ...s, wrapInVM: checked }))
                        }
                      />
                    </div>
                  </div>

                  {/* Advanced Protection */}
                  <div className="space-y-4">
                    <h4 className="font-semibold text-sm text-primary">Advanced Protection</h4>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="controlFlow" className="text-sm">Control Flow</Label>
                      <Switch
                        id="controlFlow"
                        checked={settings.controlFlowObfuscation}
                        onCheckedChange={(checked) => 
                          setSettings(s => ({ ...s, controlFlowObfuscation: checked }))
                        }
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="constantEncrypt" className="text-sm">Constant Encryption</Label>
                      <Switch
                        id="constantEncrypt"
                        checked={settings.constantEncryption}
                        onCheckedChange={(checked) => 
                          setSettings(s => ({ ...s, constantEncryption: checked }))
                        }
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="antiTamper" className="text-sm">Anti-Tamper</Label>
                      <Switch
                        id="antiTamper"
                        checked={settings.antiTamper}
                        onCheckedChange={(checked) => 
                          setSettings(s => ({ ...s, antiTamper: checked }))
                        }
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="antiDebug" className="text-sm">Anti-Debug</Label>
                      <Switch
                        id="antiDebug"
                        checked={settings.antiDebug}
                        onCheckedChange={(checked) => 
                          setSettings(s => ({ ...s, antiDebug: checked }))
                        }
                      />
                    </div>
                  </div>

                  {/* Luraph API Integration */}
                  <div className="space-y-4">
                    <h4 className="font-semibold text-sm text-primary">🔥 Luraph API</h4>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="useLuraph" className="text-sm font-medium">Enable Luraph</Label>
                      <Switch
                        id="useLuraph"
                        checked={settings.useLuraph}
                        onCheckedChange={(checked) => 
                          setSettings(s => ({ ...s, useLuraph: checked }))
                        }
                      />
                    </div>
                    {settings.useLuraph && (
                      <>
                        <div className="flex items-center justify-between">
                          <Label htmlFor="luraphDisableLineInfo" className="text-sm">Disable Line Info</Label>
                          <Switch
                            id="luraphDisableLineInfo"
                            checked={settings.luraphDisableLineInfo}
                            onCheckedChange={(checked) => 
                              setSettings(s => ({ ...s, luraphDisableLineInfo: checked }))
                            }
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <Label htmlFor="luraphVmEncryption" className="text-sm">VM Encryption</Label>
                          <Switch
                            id="luraphVmEncryption"
                            checked={settings.luraphVmEncryption}
                            onCheckedChange={(checked) => 
                              setSettings(s => ({ ...s, luraphVmEncryption: checked }))
                            }
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <Label htmlFor="luraphStringEncryption" className="text-sm">String Encryption</Label>
                          <Switch
                            id="luraphStringEncryption"
                            checked={settings.luraphStringEncryption}
                            onCheckedChange={(checked) => 
                              setSettings(s => ({ ...s, luraphStringEncryption: checked }))
                            }
                          />
                        </div>
                      </>
                    )}
                  </div>

                  {/* Output Options */}
                  <div className="space-y-4">
                    <h4 className="font-semibold text-sm text-primary">Output Options</h4>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="minify" className="text-sm">Minify Output</Label>
                      <Switch
                        id="minify"
                        checked={settings.minify}
                        onCheckedChange={(checked) => 
                          setSettings(s => ({ ...s, minify: checked }))
                        }
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="preserveLines" className="text-sm">Preserve Lines</Label>
                      <Switch
                        id="preserveLines"
                        checked={settings.preserveLineInfo}
                        onCheckedChange={(checked) => 
                          setSettings(s => ({ ...s, preserveLineInfo: checked }))
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm">Watermark (Optional)</Label>
                      <Input
                        placeholder="Your name or ID"
                        value={settings.watermark}
                        onChange={(e) => 
                          setSettings(s => ({ ...s, watermark: e.target.value }))
                        }
                        className="text-sm"
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </motion.div>

        {/* Code Editor */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Tabs defaultValue="editor" className="w-full">
            <TabsList className="grid w-full max-w-md grid-cols-2 mx-auto mb-6">
              <TabsTrigger value="editor">
                <FileCode className="w-4 h-4 mr-2" />
                Editor
              </TabsTrigger>
              <TabsTrigger value="output" disabled={!outputCode}>
                <Shield className="w-4 h-4 mr-2" />
                Output
                {outputCode && <Badge variant="secondary" className="ml-2 text-xs">Ready</Badge>}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="editor">
              <Card className="border-border/50 bg-card/50 backdrop-blur">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Code2 className="w-5 h-5" />
                        Input Code
                      </CardTitle>
                      <CardDescription>Paste your Lua code here</CardDescription>
                    </div>
                    <Button
                      onClick={handleObfuscate}
                      disabled={isObfuscating}
                      size="lg"
                      className="min-w-[160px]"
                    >
                      {isObfuscating ? (
                        <>
                          <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin mr-2" />
                          Protecting...
                        </>
                      ) : (
                        <>
                          <Shield className="w-4 h-4 mr-2" />
                          Protect Code
                        </>
                      )}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <Textarea
                    value={inputCode}
                    onChange={(e) => setInputCode(e.target.value)}
                    placeholder="-- Paste your Lua code here..."
                    className="min-h-[400px] font-mono text-sm bg-background/50 resize-y"
                  />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="output">
              <Card className="border-border/50 bg-card/50 backdrop-blur">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Shield className="w-5 h-5 text-primary" />
                        Protected Code
                      </CardTitle>
                      <CardDescription>
                        {outputCode.length.toLocaleString()} characters • ShadowAuth Protected
                      </CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={handleCopy}>
                        {copied ? (
                          <Check className="w-4 h-4 mr-2" />
                        ) : (
                          <Copy className="w-4 h-4 mr-2" />
                        )}
                        {copied ? "Copied!" : "Copy"}
                      </Button>
                      <Button variant="outline" size="sm" onClick={handleDownload}>
                        <Download className="w-4 h-4 mr-2" />
                        Download
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <Textarea
                    value={outputCode}
                    readOnly
                    className="min-h-[400px] font-mono text-sm bg-background/50 resize-y"
                  />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </motion.div>

        {/* Info */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mt-8 text-center text-sm text-muted-foreground"
        >
          <p>
            🔒 Powered by ShadowAuth + Luraph Protection Engine • 
            Supports LPH_NO_VIRTUALIZE, LPH_JIT, LPH_JIT_MAX macros • 
            Enterprise-grade security
          </p>
        </motion.div>
      </main>

      <Footer />
    </div>
  );
};

export default Obfuscator;
