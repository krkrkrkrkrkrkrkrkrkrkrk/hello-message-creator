import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Code, Plus, History, Copy, Download, Save, 
  Bot, X, Lightbulb, Bug, Sparkles, Send,
  FileCode, Clock, Maximize2, Minimize2, RefreshCw, Trash2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import ReactMarkdown from "react-markdown";
import MonacoLuaEditor from "@/components/MonacoLuaEditor";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface CodeFile {
  id: string;
  name: string;
  content: string;
  lastModified: Date;
  language: string;
}

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

const CodeEditor = () => {
  const [selectedFile, setSelectedFile] = useState<CodeFile | null>(null);
  const [code, setCode] = useState("");
  const [showAIPanel, setShowAIPanel] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [aiInput, setAiInput] = useState("");
  const [aiMessages, setAiMessages] = useState<ChatMessage[]>([]);
  const [isAiThinking, setIsAiThinking] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [newFileName, setNewFileName] = useState("");
  const [showNewFileDialog, setShowNewFileDialog] = useState(false);
  const [isCreatingFile, setIsCreatingFile] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  const { data: scripts, isLoading } = useQuery({
    queryKey: ["user-scripts-editor"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      
      const { data, error } = await supabase
        .from("scripts")
        .select("id, name, content, updated_at")
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
  });

  const files: CodeFile[] = scripts?.map(script => ({
    id: script.id,
    name: script.name + ".lua",
    content: script.content,
    lastModified: new Date(script.updated_at),
    language: "lua",
  })) || [];

  useEffect(() => {
    if (scripts && scripts.length > 0 && !selectedFile) {
      const firstFile: CodeFile = {
        id: scripts[0].id,
        name: scripts[0].name + ".lua",
        content: scripts[0].content,
        lastModified: new Date(scripts[0].updated_at),
        language: "lua",
      };
      setSelectedFile(firstFile);
      setCode(scripts[0].content);
    }
  }, [scripts, selectedFile]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [aiMessages]);

  const handleFileSelect = (file: CodeFile) => {
    setSelectedFile(file);
    setCode(file.content);
    setShowHistory(false);
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(code);
    toast.success("Copied!");
  };

  const handleDownload = () => {
    if (!selectedFile) return;
    const blob = new Blob([code], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = selectedFile.name;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Downloaded!");
  };

  const handleSave = async () => {
    if (!selectedFile) return;
    
    try {
      const { error } = await supabase
        .from("scripts")
        .update({ content: code, updated_at: new Date().toISOString() })
        .eq("id", selectedFile.id);
      
      if (error) throw error;
      toast.success("Saved!");
      queryClient.invalidateQueries({ queryKey: ["user-scripts-editor"] });
    } catch {
      toast.error("Failed to save");
    }
  };

  const handleCreateNewFile = async () => {
    if (!newFileName.trim()) {
      toast.error("Enter a file name");
      return;
    }

    setIsCreatingFile(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const fileName = newFileName.replace(/\.lua$/i, "");
      
      const { data, error } = await supabase
        .from("scripts")
        .insert({
          name: fileName,
          content: `-- ${fileName}.lua\n\nprint("Hello, World!")`,
          user_id: user.id,
          loader_token: crypto.randomUUID(),
        })
        .select()
        .single();

      if (error) throw error;

      toast.success("File created!");
      setNewFileName("");
      setShowNewFileDialog(false);
      queryClient.invalidateQueries({ queryKey: ["user-scripts-editor"] });

      if (data) {
        const newFile: CodeFile = {
          id: data.id,
          name: data.name + ".lua",
          content: data.content,
          lastModified: new Date(data.updated_at),
          language: "lua",
        };
        setSelectedFile(newFile);
        setCode(data.content);
      }
    } catch {
      toast.error("Failed to create file");
    } finally {
      setIsCreatingFile(false);
    }
  };

  const handleAIQuery = async (query: string) => {
    if (!query.trim()) return;
    
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: "user",
      content: query,
      timestamp: new Date(),
    };
    
    setAiMessages(prev => [...prev, userMessage]);
    setAiInput("");
    setIsAiThinking(true);

    try {
      const allFilesContext = files.map(file => 
        `--- File: ${file.name} ---\n${file.content}`
      ).join("\n\n");

      const systemPrompt = `You are an expert Roblox Lua scripting assistant. You have deep knowledge of:

ROBLOX API & SERVICES:
- game, workspace, Players, ReplicatedStorage, ServerStorage, ServerScriptService
- RemoteEvents, RemoteFunctions, BindableEvents
- TweenService, RunService, UserInputService, Debris
- DataStoreService, MessagingService, MarketplaceService
- Humanoid, Character, Parts, Models, GUI elements

EXECUTOR FUNCTIONS (exploits/scripts):
- getgenv(), getrenv(), getfenv() - environment access
- hookfunction(), hookmetamethod() - hooking
- getrawmetatable(), setrawmetatable() - metatable manipulation
- loadstring(), getscriptbytecode(), decompile()
- fireclickdetector(), firetouchinterest(), fireproximityprompt()
- getsenv(), getcallingscript(), checkcaller()
- Drawing library, syn, fluxus, krnl APIs
- printidentity() - prints current identity/security level
- getnamecallmethod(), newcclosure()
- request/http_request, WebSocket

CURRENT FILE: ${selectedFile?.name || "None"}
\`\`\`lua
${code}
\`\`\`

ALL FILES:
${allFilesContext}

RULES:
- Keep responses SHORT and CONCISE
- Use \`\`\`lua for code blocks
- Focus on practical Roblox solutions
- Explain executor-specific functions when asked
- Always respond in the same language as the user`;

      const { data, error } = await supabase.functions.invoke('ai-assistant', {
        body: {
          messages: [
            { role: "system", content: systemPrompt },
            ...aiMessages.map(m => ({ role: m.role, content: m.content })),
            { role: "user", content: query }
          ]
        }
      });

      if (error) throw error;

      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: data?.response || "Error processing request.",
        timestamp: new Date(),
      };
      
      setAiMessages(prev => [...prev, assistantMessage]);
    } catch {
      setAiMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "Error processing request. Try again.",
        timestamp: new Date(),
      }]);
    } finally {
      setIsAiThinking(false);
    }
  };

  const quickPrompts = [
    { icon: Lightbulb, label: "Explain code" },
    { icon: Bug, label: "Find bugs" },
    { icon: Sparkles, label: "Optimize" },
  ];

  const formatTime = (date: Date) => {
    const diff = Date.now() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return "Now";
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h`;
    return date.toLocaleDateString();
  };

  return (
    <DashboardLayout breadcrumb="Pages / Code Editor" title="Code Editor">
      <div className="h-[calc(100vh-2rem)] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
              <Code className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-lg font-semibold">Code Editor</h1>
              <p className="text-[11px] text-muted-foreground">AI-powered Lua development</p>
            </div>
          </div>
          
          <Button
            variant={showAIPanel ? "default" : "outline"}
            size="sm"
            onClick={() => setShowAIPanel(!showAIPanel)}
            className="gap-1.5 text-xs"
          >
            <Bot className="w-3.5 h-3.5" />
            AI
          </Button>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex gap-3 min-h-0">
          {/* Editor */}
          <motion.div 
            className={`flex-1 flex flex-col bg-card rounded-lg border border-border overflow-hidden ${isFullscreen ? 'fixed inset-3 z-50' : ''}`}
          >
            {/* Tabs */}
            <div className="flex items-center gap-2 px-3 py-1.5 border-b border-border bg-muted/20">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowHistory(!showHistory)}
                className={`h-7 gap-1.5 text-xs ${showHistory ? 'bg-muted' : ''}`}
              >
                <History className="w-3.5 h-3.5" />
                Files
              </Button>
              
              <Dialog open={showNewFileDialog} onOpenChange={setShowNewFileDialog}>
                <DialogTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-7 w-7">
                    <Plus className="w-3.5 h-3.5" />
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-sm">
                  <DialogHeader>
                    <DialogTitle className="text-sm">New Lua File</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-3 py-3">
                    <div className="flex items-center gap-2">
                      <Input
                        value={newFileName}
                        onChange={(e) => setNewFileName(e.target.value)}
                        placeholder="filename"
                        className="flex-1 h-8 text-sm"
                        onKeyDown={(e) => e.key === 'Enter' && handleCreateNewFile()}
                      />
                      <span className="text-xs text-muted-foreground">.lua</span>
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" size="sm" onClick={() => setShowNewFileDialog(false)}>
                        Cancel
                      </Button>
                      <Button size="sm" onClick={handleCreateNewFile} disabled={isCreatingFile}>
                        {isCreatingFile ? <RefreshCw className="w-3 h-3 animate-spin" /> : "Create"}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>

              <div className="flex-1 flex items-center gap-1 overflow-x-auto">
                {selectedFile && (
                  <div className="flex items-center gap-1.5 px-2 py-1 bg-background rounded border border-border text-xs">
                    <FileCode className="w-3 h-3 text-primary" />
                    <span className="font-medium">{selectedFile.name}</span>
                  </div>
                )}
              </div>

              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setIsFullscreen(!isFullscreen)}>
                {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
              </Button>
            </div>

            <div className="flex-1 flex min-h-0">
              {/* File List */}
              <AnimatePresence>
                {showHistory && (
                  <motion.div
                    initial={{ width: 0, opacity: 0 }}
                    animate={{ width: 180, opacity: 1 }}
                    exit={{ width: 0, opacity: 0 }}
                    className="border-r border-border bg-muted/10 overflow-hidden"
                  >
                    <ScrollArea className="h-full p-2">
                      <div className="space-y-1">
                        {files.map((file) => (
                          <button
                            key={file.id}
                            onClick={() => handleFileSelect(file)}
                            className={`w-full text-left p-2 rounded text-xs transition-colors ${
                              selectedFile?.id === file.id 
                                ? 'bg-primary/10 text-primary' 
                                : 'hover:bg-muted'
                            }`}
                          >
                            <div className="flex items-center gap-1.5">
                              <FileCode className="w-3 h-3" />
                              <span className="truncate">{file.name}</span>
                            </div>
                            <div className="flex items-center gap-1 mt-0.5 text-[10px] text-muted-foreground">
                              <Clock className="w-2.5 h-2.5" />
                              {formatTime(file.lastModified)}
                            </div>
                          </button>
                        ))}
                      </div>
                    </ScrollArea>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Code Area */}
              <div className="flex-1 flex flex-col min-w-0 min-h-0">
                <div className="flex items-center justify-between px-3 py-1.5 border-b border-border shrink-0">
                  <div className="flex items-center gap-1.5">
                    <Badge className="bg-blue-600 text-[10px] px-1.5 py-0">LUA</Badge>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="sm" onClick={handleCopyCode} className="h-6 gap-1 text-[10px] px-2">
                      <Copy className="w-3 h-3" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={handleDownload} className="h-6 gap-1 text-[10px] px-2">
                      <Download className="w-3 h-3" />
                    </Button>
                    <Button size="sm" onClick={handleSave} className="h-6 gap-1 text-[10px] px-2 bg-green-600 hover:bg-green-700">
                      <Save className="w-3 h-3" />
                    </Button>
                  </div>
                </div>

                <div className="flex-1 min-h-[400px]">
                  {isLoading ? (
                    <div className="flex items-center justify-center h-full bg-background">
                      <RefreshCw className="w-5 h-5 animate-spin text-muted-foreground" />
                    </div>
                  ) : (
                    <MonacoLuaEditor
                      key={selectedFile?.id || "default"}
                      value={code}
                      onChange={setCode}
                      height="100%"
                      minimap={true}
                    />
                  )}
                </div>
              </div>
            </div>
          </motion.div>

          {/* AI Panel */}
          <AnimatePresence>
            {showAIPanel && !isFullscreen && (
              <motion.div
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: 320, opacity: 1 }}
                exit={{ width: 0, opacity: 0 }}
                className="bg-card rounded-lg border border-border flex flex-col overflow-hidden"
              >
                {/* AI Header */}
                <div className="flex items-center justify-between px-3 py-2 border-b border-border">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-primary/20 flex items-center justify-center">
                      <Bot className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <h3 className="text-xs font-medium">Shadow AI</h3>
                      <p className="text-[9px] text-muted-foreground flex items-center gap-1">
                        <span className="w-1 h-1 rounded-full bg-green-500" />
                        Online
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-0.5">
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setAiMessages([])}>
                      <Trash2 className="w-3 h-3" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setShowAIPanel(false)}>
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                </div>

                {/* Messages */}
                <ScrollArea className="flex-1 p-3">
                  {aiMessages.length === 0 ? (
                    <div className="text-center py-4">
                      <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center mx-auto mb-3">
                        <Bot className="w-6 h-6 text-primary" />
                      </div>
                      <p className="text-xs font-medium mb-1">AI Code Assistant</p>
                      <p className="text-[10px] text-muted-foreground mb-4">
                        Analyzes {files.length} file{files.length !== 1 ? 's' : ''}
                      </p>
                      
                      <div className="space-y-1.5">
                        {quickPrompts.map((prompt, i) => (
                          <button
                            key={i}
                            onClick={() => handleAIQuery(prompt.label)}
                            className="w-full flex items-center gap-2 p-2 rounded-lg bg-muted/50 hover:bg-muted transition-colors text-left text-xs"
                          >
                            <prompt.icon className="w-3.5 h-3.5 text-muted-foreground" />
                            <span>{prompt.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {aiMessages.map((msg) => (
                        <div
                          key={msg.id}
                          className={`flex gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
                        >
                          <div className={`w-6 h-6 rounded flex items-center justify-center flex-shrink-0 ${
                            msg.role === 'user' ? 'bg-primary' : 'bg-muted'
                          }`}>
                            {msg.role === 'user' ? (
                              <span className="text-[9px] font-bold text-primary-foreground">U</span>
                            ) : (
                              <Bot className="w-3 h-3" />
                            )}
                          </div>
                          <div className={`flex-1 rounded-lg overflow-hidden ${
                            msg.role === 'user' 
                              ? 'bg-primary text-primary-foreground' 
                              : 'bg-muted'
                          }`}>
                            <div className="p-2">
                              {msg.role === 'user' ? (
                                <p className="text-[11px]">{msg.content}</p>
                              ) : (
                                <div className="prose prose-xs dark:prose-invert max-w-none text-[11px] leading-relaxed
                                  prose-p:my-1 prose-headings:my-1.5 prose-headings:text-xs prose-headings:font-semibold
                                  prose-ul:my-1 prose-ol:my-1 prose-li:my-0 prose-li:text-[11px]
                                  prose-pre:my-1.5 prose-pre:p-2 prose-pre:bg-background/50 prose-pre:text-[10px] prose-pre:rounded
                                  prose-code:text-[10px] prose-code:bg-background/30 prose-code:px-1 prose-code:py-0.5 prose-code:rounded
                                  prose-code:before:content-none prose-code:after:content-none">
                                  <ReactMarkdown>{msg.content}</ReactMarkdown>
                                </div>
                              )}
                            </div>
                            <div className={`px-2 py-1 text-[9px] border-t ${
                              msg.role === 'user' 
                                ? 'border-primary-foreground/20 text-primary-foreground/60' 
                                : 'border-border text-muted-foreground'
                            }`}>
                              {formatTime(msg.timestamp)}
                            </div>
                          </div>
                        </div>
                      ))}
                      {isAiThinking && (
                        <div className="flex gap-2">
                          <div className="w-6 h-6 rounded bg-muted flex items-center justify-center">
                            <Bot className="w-3 h-3" />
                          </div>
                          <div className="bg-muted p-2 rounded-lg">
                            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                              <RefreshCw className="w-3 h-3 animate-spin" />
                              Analyzing...
                            </div>
                          </div>
                        </div>
                      )}
                      <div ref={messagesEndRef} />
                    </div>
                  )}
                </ScrollArea>

                {/* Input */}
                <div className="p-2 border-t border-border">
                  <div className="flex gap-1.5">
                    <Input
                      value={aiInput}
                      onChange={(e) => setAiInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleAIQuery(aiInput)}
                      placeholder="Ask about code..."
                      className="flex-1 h-8 text-xs"
                    />
                    <Button 
                      size="icon" 
                      className="h-8 w-8"
                      onClick={() => handleAIQuery(aiInput)}
                      disabled={!aiInput.trim() || isAiThinking}
                    >
                      <Send className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default CodeEditor;
