import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Upload, FileText, Shield, Zap, Code, Lock, 
  ChevronDown, ChevronUp, Check, X, Cloud,
  Settings, Cpu, Eye, Loader2, CheckCircle2, Edit3
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import MonacoLuaEditor from "@/components/MonacoLuaEditor";

export interface ObfuscationSettings {
  type: "luraph" | "none";
  antiHttpSpy: boolean;
  antiTamper: boolean;
  vmScrambling: boolean;
  constantEncryption: boolean;
  controlFlowObfuscation: boolean;
  stringEncryption: boolean;
  bypassSyntaxCheck: boolean;
}

interface AdvancedScriptUploadProps {
  onUpload: (file: File | null, name: string, content: string, settings: ObfuscationSettings) => Promise<void>;
  isCreating: boolean;
}

type UploadStep = "idle" | "uploading" | "processing" | "obfuscating" | "finalizing" | "done";

export default function AdvancedScriptUpload({ onUpload, isCreating }: AdvancedScriptUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [scriptContent, setScriptContent] = useState("");
  const [scriptName, setScriptName] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showEditor, setShowEditor] = useState(false);
  const [uploadStep, setUploadStep] = useState<UploadStep>("idle");
  const [progress, setProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [settings, setSettings] = useState<ObfuscationSettings>({
    type: "luraph",
    antiHttpSpy: true,
    antiTamper: true,
    vmScrambling: true,
    constantEncryption: true,
    controlFlowObfuscation: true,
    stringEncryption: true,
    bypassSyntaxCheck: true,
  });

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      await processFile(files[0]);
    }
  };

  const processFile = async (file: File) => {
    const validExtensions = [".lua", ".txt"];
    const fileExt = file.name.substring(file.name.lastIndexOf(".")).toLowerCase();
    if (!validExtensions.includes(fileExt)) return;
    
    const content = await file.text();
    setSelectedFile(file);
    setScriptContent(content);
    if (!scriptName) {
      setScriptName(file.name.replace(/\.(lua|txt)$/i, ""));
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      await processFile(files[0]);
    }
  };

  const handleSubmit = async () => {
    if (!scriptContent.trim()) return;
    
    // Start upload UI
    setUploadStep("uploading");
    setProgress(0);
    
    // Quick initial progress animation (0-25%)
    for (let i = 0; i <= 25; i += 5) {
      await new Promise(r => setTimeout(r, 50));
      setProgress(i);
    }
    
    setUploadStep("processing");
    
    // Start the actual upload and track progress
    try {
      // Progress slowly while waiting for real upload
      const progressInterval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 90) return prev; // Cap at 90% until done
          const step = uploadStep === "processing" ? 2 : 
                       uploadStep === "obfuscating" ? 1 : 0.5;
          return Math.min(prev + step, 90);
        });
      }, 200);
      
      // Simulate step changes based on time
      setTimeout(() => setUploadStep("obfuscating"), 1000);
      setTimeout(() => setUploadStep("finalizing"), 3000);
      
      // Actually perform the upload and wait for it
      await onUpload(selectedFile, scriptName || "My Script", scriptContent, settings);
      
      // Upload complete - finish progress
      clearInterval(progressInterval);
      setProgress(100);
      setUploadStep("done");
      
      // Reset after showing success
      setTimeout(() => {
        handleClear();
      }, 1500);
    } catch (error) {
      console.error("Upload failed:", error);
      setUploadStep("idle");
      setProgress(0);
    }
  };

  const handleClear = () => {
    setSelectedFile(null);
    setScriptContent("");
    setScriptName("");
    setUploadStep("idle");
    setProgress(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const getStepStatus = (step: UploadStep) => {
    const steps: UploadStep[] = ["uploading", "processing", "obfuscating", "finalizing"];
    const currentIndex = steps.indexOf(uploadStep);
    const stepIndex = steps.indexOf(step);
    
    if (uploadStep === "done") return "done";
    if (stepIndex < currentIndex) return "done";
    if (stepIndex === currentIndex) return "active";
    return "pending";
  };

  const lineCount = scriptContent.split("\n").length;

  // Upload progress modal
  if (uploadStep !== "idle") {
    return (
      <div className="rounded-xl bg-card border border-border overflow-hidden">
        <div className="p-8">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
              <Cloud className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground">
                {uploadStep === "done" ? "Upload Complete!" : "Uploading Script"}
              </h2>
              <p className="text-sm text-muted-foreground">
                {uploadStep === "done" 
                  ? "Your script has been securely stored" 
                  : "Uploading your script to the server..."}
              </p>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mb-6">
            <div className="flex justify-between mb-2">
              <span className="text-sm text-muted-foreground">Progress</span>
              <span className="text-sm font-bold text-primary">{progress}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>

          {/* Steps */}
          <div className="space-y-3">
            {[
              { id: "uploading" as const, label: "Upload", icon: Upload },
              { id: "processing" as const, label: "Process Libraries", icon: Cpu },
              { id: "obfuscating" as const, label: "Obfuscate", icon: Lock },
              { id: "finalizing" as const, label: "Finalize", icon: CheckCircle2 },
            ].map((step) => {
              const status = getStepStatus(step.id);
              return (
                <div key={step.id} className="flex items-center gap-3">
                  <div className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center transition-colors",
                    status === "done" ? "bg-green-500" :
                    status === "active" ? "bg-primary animate-pulse" :
                    "bg-muted"
                  )}>
                    {status === "done" ? (
                      <Check className="w-4 h-4 text-white" />
                    ) : status === "active" ? (
                      <Loader2 className="w-4 h-4 text-white animate-spin" />
                    ) : (
                      <step.icon className="w-4 h-4 text-muted-foreground" />
                    )}
                  </div>
                  <span className={cn(
                    "text-sm font-medium",
                    status === "done" ? "text-green-500" :
                    status === "active" ? "text-primary" :
                    "text-muted-foreground"
                  )}>
                    {step.label}
                  </span>
                </div>
              );
            })}
          </div>

          <p className="text-xs text-muted-foreground text-center mt-6">
            Please wait while we process your script. This may take a moment for large files.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl bg-card border border-border overflow-hidden">
      {/* Header */}
      <div className="p-5 border-b border-border bg-gradient-to-r from-primary/5 to-transparent">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
            <Upload className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-foreground">Upload Script</h2>
            <p className="text-sm text-muted-foreground">Secure upload with obfuscation</p>
          </div>
        </div>
      </div>

      <div className="p-5 space-y-5">
        {/* Drop Zone */}
        <div
          className={cn(
            "rounded-lg border-2 border-dashed transition-all cursor-pointer p-6",
            isDragging 
              ? "border-primary bg-primary/5 scale-[1.01]" 
              : selectedFile
              ? "border-green-500/50 bg-green-500/5"
              : "border-border hover:border-primary/50 hover:bg-muted/30"
          )}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <div className="flex items-center gap-4">
            <div className={cn(
              "w-12 h-12 rounded-lg flex items-center justify-center",
              selectedFile ? "bg-green-500/20" : "bg-muted"
            )}>
              {selectedFile ? (
                <Check className="w-6 h-6 text-green-500" />
              ) : (
                <FileText className="w-6 h-6 text-muted-foreground" />
              )}
            </div>
            <div className="flex-1">
              <p className="font-medium text-foreground">
                {selectedFile ? selectedFile.name : "Drop your Lua script here"}
              </p>
              <p className="text-sm text-muted-foreground">
                {selectedFile 
                  ? `${lineCount} lines • Ready to upload`
                  : "or click to browse (.lua, .txt)"}
              </p>
            </div>
            {selectedFile && (
              <Button
                variant="ghost"
                size="icon"
                onClick={(e) => {
                  e.stopPropagation();
                  handleClear();
                }}
                className="text-muted-foreground hover:text-destructive"
              >
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".lua,.txt"
            onChange={handleFileSelect}
            className="hidden"
          />
        </div>

        {/* Script Name & Preview */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label className="text-xs font-medium mb-1.5 block text-muted-foreground">SCRIPT NAME</Label>
            <Input
              value={scriptName}
              onChange={(e) => setScriptName(e.target.value)}
              placeholder="My Awesome Script"
              className="bg-muted/50"
            />
          </div>
          <div>
            <Label className="text-xs font-medium mb-1.5 block text-muted-foreground">PREVIEW</Label>
            <div className="h-9 px-3 rounded-md bg-muted/50 border border-border flex items-center justify-between text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Code className="w-4 h-4" />
                <span>{lineCount} lines</span>
              </div>
              {scriptContent && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-xs text-primary hover:text-primary/80"
                  onClick={() => setShowEditor(!showEditor)}
                >
                  <Edit3 className="w-3 h-3 mr-1" />
                  {showEditor ? "Hide" : "Edit"}
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Monaco Editor - Only shows when Edit is clicked */}
        <AnimatePresence>
          {showEditor && scriptContent && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="rounded-lg border border-border overflow-hidden">
                <MonacoLuaEditor
                  value={scriptContent}
                  onChange={setScriptContent}
                  height="250px"
                  minimap={false}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Quick Obfuscation Selection */}
        <div>
          <Label className="text-xs font-medium mb-2 block text-muted-foreground">OBFUSCATION</Label>
          <div className="grid grid-cols-2 gap-3">
            {[
              { id: "luraph" as const, name: "Luraph", desc: "Advanced protection with VM encryption", color: "primary" },
              { id: "none" as const, name: "None", desc: "Upload without obfuscation", color: "gray" },
            ].map((opt) => (
              <motion.button
                key={opt.id}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setSettings({ ...settings, type: opt.id })}
                className={cn(
                  "p-4 rounded-xl border-2 text-left transition-all",
                  settings.type === opt.id
                    ? opt.color === "primary" 
                      ? "border-primary bg-primary/10 shadow-lg shadow-primary/20" 
                      : "border-muted-foreground/50 bg-muted/50"
                    : "border-border hover:border-primary/50 hover:bg-muted/30"
                )}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-sm">{opt.name}</span>
                  <Badge className={cn(
                    "text-[10px]",
                    opt.color === "primary" ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"
                  )}>
                    Free
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">{opt.desc}</p>
              </motion.button>
            ))}
          </div>
        </div>

        {/* Advanced Toggle */}
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="flex items-center gap-2 text-sm text-primary hover:text-primary/80 transition-colors w-full"
        >
          <Settings className="w-4 h-4" />
          <span className="font-medium">Security Options</span>
          {showAdvanced ? <ChevronUp className="w-4 h-4 ml-auto" /> : <ChevronDown className="w-4 h-4 ml-auto" />}
        </button>

        {/* Advanced Options */}
        <AnimatePresence>
          {showAdvanced && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="rounded-lg bg-muted/30 border border-border p-4 space-y-3">
                {[
                  { key: "antiHttpSpy", label: "Anti-HTTP Spy", desc: "Block request interception", icon: Shield },
                  { key: "antiTamper", label: "Anti-Tamper", desc: "Detect script modifications", icon: Lock },
                  { key: "vmScrambling", label: "VM Scrambling", desc: "Randomize virtual machine", icon: Cpu },
                  { key: "constantEncryption", label: "Constant Encryption", desc: "Encrypt all constants", icon: Zap },
                  { key: "controlFlowObfuscation", label: "Control Flow", desc: "Obfuscate code flow", icon: Code },
                  { key: "stringEncryption", label: "String Encryption", desc: "Encrypt all strings", icon: Eye },
                ].map((opt) => (
                  <div key={opt.key} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <opt.icon className="w-4 h-4 text-muted-foreground" />
                      <div>
                        <span className="text-sm font-medium">{opt.label}</span>
                        <p className="text-xs text-muted-foreground">{opt.desc}</p>
                      </div>
                    </div>
                    <Switch
                      checked={settings[opt.key as keyof ObfuscationSettings] as boolean}
                      onCheckedChange={(checked) => setSettings({ ...settings, [opt.key]: checked })}
                    />
                  </div>
                ))}
                
                {/* Bypass Syntax Check */}
                <div className="pt-3 border-t border-border">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Zap className="w-4 h-4 text-yellow-500" />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">Bypass Syntax Check</span>
                          <Badge className="bg-yellow-500/20 text-yellow-500 text-[8px]">Advanced</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">Skip validation for custom syntax</p>
                      </div>
                    </div>
                    <Switch
                      checked={settings.bypassSyntaxCheck}
                      onCheckedChange={(checked) => setSettings({ ...settings, bypassSyntaxCheck: checked })}
                    />
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Submit Button */}
        <Button
          onClick={handleSubmit}
          disabled={!scriptContent.trim() || isCreating}
          className="w-full h-11 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
        >
          {isCreating ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <Upload className="w-4 h-4 mr-2" />
              Upload & Obfuscate Script
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
