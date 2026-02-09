import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageSquare, X, Send, Loader2, Headphones, ChevronLeft, Bot, Shield, ChevronRight, Search, HelpCircle, MessageCircle, User, Circle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp?: string;
}

interface SupportMessage {
  id: string;
  sender_type: "user" | "admin";
  content: string;
  created_at: string;
}

interface SupportTicket {
  id: string;
  user_email: string;
  user_name: string;
  status: string;
  created_at: string;
  messages?: SupportMessage[];
}

interface ChatSession {
  id: string;
  title: string;
  lastMessage: string;
  timestamp: string;
}

interface AdminUser {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  email: string | null;
}

type Screen = "home" | "chat" | "support" | "supportChat" | "adminTickets" | "adminChat" | "selectAdmin";

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-assistant`;

const formatTime = (date?: string) => {
  if (date) {
    return new Date(date).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
  }
  return new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
};

// Clean markdown renderer
const renderMessage = (content: string) => {
  let cleanContent = content.replace(/^#{1,6}\s*/gm, "");
  const parts = cleanContent.split(/(```[\s\S]*?```)/g);
  
  return parts.map((part, i) => {
    if (part.startsWith("```") && part.endsWith("```")) {
      const code = part.slice(3, -3).replace(/^[a-z]+\n/, "");
      return (
        <pre key={i} className="bg-background rounded-lg p-3 my-2 text-xs overflow-x-auto border border-border/50 font-mono max-w-full whitespace-pre-wrap break-all">
          <code className="block max-w-full break-all">{code.trim()}</code>
        </pre>
      );
    }
    
    return (
      <span key={i}>
        {part.split("\n").map((line, j) => {
          if (line.trim() === "") return j > 0 ? <br key={j} /> : null;
          let processed = line;
          processed = processed.replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold">$1</strong>');
          processed = processed.replace(/`([^`]+)`/g, '<code class="bg-background px-1.5 py-0.5 rounded text-xs font-mono text-primary">$1</code>');
          return (
            <span key={j}>
              <span dangerouslySetInnerHTML={{ __html: processed }} />
              {j < part.split("\n").length - 1 && <br />}
            </span>
          );
        })}
      </span>
    );
  });
};

const AIChatWidget = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [screen, setScreen] = useState<Screen>("home");
  const [messages, setMessages] = useState<Message[]>([]);
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [userName, setUserName] = useState("Guest");
  const [userId, setUserId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  
  // Support chat state
  const [supportTicket, setSupportTicket] = useState<SupportTicket | null>(null);
  const [supportMessages, setSupportMessages] = useState<SupportMessage[]>([]);
  const [supportInput, setSupportInput] = useState("");
  const [loadingSupport, setLoadingSupport] = useState(false);
  
  // Admin state
  const [allTickets, setAllTickets] = useState<SupportTicket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [onlineAdmins, setOnlineAdmins] = useState<AdminUser[]>([]);
  const [loadingAdmins, setLoadingAdmins] = useState(false);
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const supportScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    if (supportScrollRef.current) {
      supportScrollRef.current.scrollTop = supportScrollRef.current.scrollHeight;
    }
  }, [supportMessages]);

  useEffect(() => {
    const checkAdmin = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setUserId(session.user.id);
        setUserEmail(session.user.email || null);
        
        // Check admin role from user_roles table
        const { data: roleData } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", session.user.id)
          .eq("role", "admin")
          .maybeSingle();
        
        const { data: profile } = await supabase
          .from("profiles")
          .select("display_name, avatar_url")
          .eq("id", session.user.id)
          .maybeSingle();
        
        setIsAdmin(!!roleData);
        setUserName(profile?.display_name || session.user.email?.split("@")[0] || "User");
      }
    };
    checkAdmin();
  }, []);

  // Load user's support ticket
  const loadUserTicket = async () => {
    if (!userId) return;
    
    setLoadingSupport(true);
    const { data: tickets } = await supabase
      .from("support_tickets")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1);
    
    if (tickets && tickets.length > 0) {
      setSupportTicket(tickets[0] as SupportTicket);
      await loadSupportMessages(tickets[0].id);
    }
    setLoadingSupport(false);
  };

  const loadSupportMessages = async (ticketId: string) => {
    const { data: messages } = await supabase
      .from("support_messages")
      .select("*")
      .eq("ticket_id", ticketId)
      .order("created_at", { ascending: true });
    
    if (messages) {
      setSupportMessages(messages as SupportMessage[]);
    }
  };

  // Create new support ticket
  const createSupportTicket = async () => {
    if (!userId || !userEmail) return;
    
    setLoadingSupport(true);
    const { data, error } = await supabase
      .from("support_tickets")
      .insert({
        user_id: userId,
        user_email: userEmail,
        user_name: userName,
        status: "open"
      })
      .select()
      .single();
    
    if (data && !error) {
      setSupportTicket(data as SupportTicket);
      setSupportMessages([]);
    }
    setLoadingSupport(false);
  };

  // Send support message
  const sendSupportMessage = async () => {
    if (!supportInput.trim() || !supportTicket || !userId) return;
    
    const messageContent = supportInput.trim();
    setSupportInput("");
    
    const { data, error } = await supabase
      .from("support_messages")
      .insert({
        ticket_id: supportTicket.id,
        sender_id: userId,
        sender_type: isAdmin && selectedTicket ? "admin" : "user",
        content: messageContent
      })
      .select()
      .single();
    
    if (data && !error) {
      setSupportMessages(prev => [...prev, data as SupportMessage]);
    }
  };

  // Admin: Load all tickets
  const loadAllTickets = async () => {
    setLoadingSupport(true);
    const { data: tickets } = await supabase
      .from("support_tickets")
      .select("*")
      .order("updated_at", { ascending: false });
    
    if (tickets) {
      setAllTickets(tickets as SupportTicket[]);
    }
    setLoadingSupport(false);
  };

  // Admin: Send reply to ticket
  const sendAdminReply = async () => {
    if (!supportInput.trim() || !selectedTicket || !userId) return;
    
    const messageContent = supportInput.trim();
    setSupportInput("");
    
    const { data, error } = await supabase
      .from("support_messages")
      .insert({
        ticket_id: selectedTicket.id,
        sender_id: userId,
        sender_type: "admin",
        content: messageContent
      })
      .select()
      .single();
    
    if (data && !error) {
      setSupportMessages(prev => [...prev, data as SupportMessage]);
    }
  };

  // Realtime subscription for support messages
  useEffect(() => {
    if (!supportTicket && !selectedTicket) return;
    
    const ticketId = selectedTicket?.id || supportTicket?.id;
    if (!ticketId) return;

    const channel = supabase
      .channel(`support_messages_${ticketId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'support_messages',
          filter: `ticket_id=eq.${ticketId}`
        },
        (payload) => {
          const newMessage = payload.new as SupportMessage;
          setSupportMessages(prev => {
            if (prev.some(m => m.id === newMessage.id)) return prev;
            return [...prev, newMessage];
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supportTicket, selectedTicket]);

  const startNewChat = (initialQuery?: string) => {
    const newSession: ChatSession = {
      id: Date.now().toString(),
      title: initialQuery || "New conversation",
      lastMessage: "",
      timestamp: formatTime(),
    };
    setChatSessions(prev => [newSession, ...prev]);
    setMessages([{
      role: "assistant",
      content: "Hello! How can I help you today? 🎮",
      timestamp: formatTime(),
    }]);
    setScreen("chat");
    
    if (initialQuery) {
      setTimeout(() => sendMessage(initialQuery), 500);
    }
  };

  const streamChat = async (userMessages: Message[]) => {
    const resp = await fetch(CHAT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
      },
      body: JSON.stringify({ 
        messages: userMessages.map(m => ({ role: m.role, content: m.content })),
        stream: true
      }),
    });

    if (!resp.ok || !resp.body) throw new Error("Failed to start stream");

    const reader = resp.body.getReader();
    const decoder = new TextDecoder();
    let textBuffer = "";
    let assistantContent = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      textBuffer += decoder.decode(value, { stream: true });

      let newlineIndex: number;
      while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
        let line = textBuffer.slice(0, newlineIndex);
        textBuffer = textBuffer.slice(newlineIndex + 1);

        if (line.endsWith("\r")) line = line.slice(0, -1);
        if (line.startsWith(":") || line.trim() === "") continue;
        if (!line.startsWith("data: ")) continue;

        const jsonStr = line.slice(6).trim();
        if (jsonStr === "[DONE]") break;

        try {
          const parsed = JSON.parse(jsonStr);
          const content = parsed.choices?.[0]?.delta?.content as string | undefined;
          if (content) {
            assistantContent += content;
            setMessages((prev) => {
              const last = prev[prev.length - 1];
              if (last?.role === "assistant" && !last.timestamp) {
                return prev.map((m, i) =>
                  i === prev.length - 1 ? { ...m, content: assistantContent } : m
                );
              }
              return [...prev, { role: "assistant", content: assistantContent }];
            });
          }
        } catch {
          textBuffer = line + "\n" + textBuffer;
          break;
        }
      }
    }
    
    setMessages((prev) => {
      const last = prev[prev.length - 1];
      if (last?.role === "assistant" && !last.timestamp) {
        return prev.map((m, i) =>
          i === prev.length - 1 ? { ...m, timestamp: formatTime() } : m
        );
      }
      return prev;
    });
  };

  const sendMessage = async (text?: string) => {
    const messageText = text || input.trim();
    if (!messageText || isLoading) return;

    const userMsg: Message = { role: "user", content: messageText, timestamp: formatTime() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setIsLoading(true);

    // Update session
    setChatSessions(prev => {
      if (prev.length > 0) {
        return prev.map((s, i) => i === 0 ? { ...s, lastMessage: messageText, title: messageText.slice(0, 30) } : s);
      }
      return prev;
    });

    try {
      await streamChat(newMessages);
    } catch (error) {
      console.error("Chat error:", error);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Sorry, an error occurred. Please try again.", timestamp: formatTime() },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const quickActions = [
    { label: "Create Script", icon: "📝", query: "How do I create a script?" },
    { label: "License Keys", icon: "🔑", query: "How do keys work?" },
    { label: "Discord Bot", icon: "🤖", query: "How to setup Discord?" },
    { label: "Billing", icon: "💳", query: "Subscription info?" },
  ];

  const faqItems = [
    "How to create my first script?",
    "How do license keys work?",
    "How to setup Discord integration?",
    "What are the subscription plans?",
  ];

  // Load online admins
  const loadOnlineAdmins = async () => {
    setLoadingAdmins(true);
    const { data: adminRoles } = await supabase
      .from("user_roles")
      .select("user_id")
      .eq("role", "admin");
    
    if (adminRoles && adminRoles.length > 0) {
      const adminIds = adminRoles.map(r => r.user_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, display_name, avatar_url, email")
        .in("id", adminIds);
      
      setOnlineAdmins(profiles as AdminUser[] || []);
    }
    setLoadingAdmins(false);
  };

  const openSupportChat = async () => {
    if (!userId) return;
    await loadOnlineAdmins();
    await loadUserTicket();
    setScreen("selectAdmin");
  };

  const startSupportWithAdmin = async () => {
    if (!supportTicket) {
      await createSupportTicket();
    }
    setScreen("supportChat");
  };

  const openAdminDashboard = async () => {
    await loadAllTickets();
    setScreen("adminTickets");
  };

  const openTicketChat = async (ticket: SupportTicket) => {
    setSelectedTicket(ticket);
    await loadSupportMessages(ticket.id);
    setScreen("adminChat");
  };

  return (
    <>
      {/* Floating Button */}
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-primary shadow-lg flex items-center justify-center text-primary-foreground hover:brightness-110 transition-all"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        style={{ boxShadow: "0 4px 20px hsl(var(--primary) / 0.4)" }}
      >
        <AnimatePresence mode="wait">
          {isOpen ? (
            <motion.div key="close" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }}>
              <X className="w-6 h-6" />
            </motion.div>
          ) : (
            <motion.div key="open" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
              <MessageSquare className="w-6 h-6" />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.button>

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-24 right-6 z-50 w-[400px] max-w-[calc(100vw-48px)] h-[550px] rounded-2xl overflow-hidden shadow-2xl flex flex-col bg-background border border-border"
          >
            {/* HOME SCREEN */}
            {screen === "home" && (
              <>
                {/* Modern Gradient Header */}
                <div 
                  className="shrink-0 relative overflow-hidden"
                  style={{ 
                    background: "linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--primary) / 0.85) 100%)",
                  }}
                >
                  {/* Glow Effects */}
                  <div className="absolute -top-10 -right-10 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
                  <div className="absolute -bottom-10 -left-10 w-24 h-24 bg-white/10 rounded-full blur-xl" />
                  
                  {/* Close Button */}
                  <button
                    onClick={() => setIsOpen(false)}
                    className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors z-10 backdrop-blur-sm"
                  >
                    <X className="w-4 h-4 text-white" />
                  </button>

                  {/* Logo Section */}
                  <div className="px-5 pt-4 pb-2 relative z-10">
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-10 h-10 rounded-xl flex items-center justify-center shadow-lg"
                        style={{ 
                          background: "linear-gradient(135deg, rgba(255,255,255,0.3) 0%, rgba(255,255,255,0.1) 100%)",
                          backdropFilter: "blur(10px)",
                          border: "1px solid rgba(255,255,255,0.3)"
                        }}
                      >
                        <Shield className="w-5 h-5 text-white drop-shadow-lg" />
                      </div>
                      <span className="text-white font-bold text-lg drop-shadow-sm">ShadowAuth</span>
                    </div>
                  </div>

                  {/* Greeting Section */}
                  <div className="px-5 pt-2 pb-6 relative z-10">
                    <h2 className="text-white text-2xl font-bold drop-shadow-sm">
                      Hello {userName}! 👋
                    </h2>
                    <p className="text-white/80 text-sm mt-1">How can we help you today?</p>
                  </div>
                </div>

                {/* Content */}
                <ScrollArea className="flex-1 bg-card">
                  <div className="p-4 space-y-4">
                    {/* Recent Chat */}
                    {chatSessions.length > 0 && (
                      <div className="bg-muted/50 rounded-xl p-3">
                        <p className="text-xs text-muted-foreground font-medium mb-2">Recent conversation</p>
                        <button
                          onClick={() => setScreen("chat")}
                          className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-muted transition-colors"
                        >
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                            <MessageCircle className="w-4 h-4 text-primary" />
                          </div>
                          <div className="flex-1 text-left">
                            <p className="text-sm font-medium text-foreground truncate">{chatSessions[0]?.title}</p>
                            <p className="text-xs text-muted-foreground">ShadowAuth • {chatSessions[0]?.timestamp}</p>
                          </div>
                          <ChevronRight className="w-4 h-4 text-muted-foreground" />
                        </button>
                      </div>
                    )}

                    {/* Search/FAQ */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 px-1">
                        <Search className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">What's your question?</span>
                      </div>
                      
                      {faqItems.map((item, i) => (
                        <button
                          key={i}
                          onClick={() => startNewChat(item)}
                          className="w-full flex items-center justify-between p-3 rounded-xl bg-background hover:bg-muted/50 transition-colors border border-border/50 text-left"
                        >
                          <span className="text-sm text-foreground">{item}</span>
                          <ChevronRight className="w-4 h-4 text-muted-foreground" />
                        </button>
                      ))}
                    </div>

                    {/* Start New Chat */}
                    <button
                      onClick={() => startNewChat()}
                      className="w-full flex items-center justify-between p-4 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors border border-border/50"
                    >
                      <div className="flex items-center gap-3">
                        <MessageSquare className="w-5 h-5 text-primary" />
                        <span className="font-medium text-foreground">Start a conversation</span>
                      </div>
                      <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                        <Send className="w-4 h-4 text-primary-foreground" />
                      </div>
                    </button>
                  </div>
                </ScrollArea>

                {/* Human Support Button */}
                <div className="border-t border-border bg-card py-3 px-4">
                  {isAdmin ? (
                    <button
                      onClick={openAdminDashboard}
                      className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-primary/10 hover:bg-primary/20 transition-colors border border-primary/20"
                    >
                      <Headphones className="w-5 h-5 text-primary" />
                      <span className="text-sm font-medium text-primary">Open Support Dashboard</span>
                    </button>
                  ) : userId ? (
                    <button
                      onClick={openSupportChat}
                      className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 transition-colors border border-emerald-500/20"
                    >
                      <Headphones className="w-5 h-5 text-emerald-500" />
                      <span className="text-sm font-medium text-emerald-500">Talk to human support</span>
                      <ChevronRight className="w-4 h-4 text-emerald-500" />
                    </button>
                  ) : (
                    <p className="text-center text-sm text-muted-foreground py-2">
                      Login to access human support
                    </p>
                  )}
                </div>

                {/* Tab Bar */}
                <div className="border-t border-border bg-card grid grid-cols-3 py-2">
                  <button className="flex flex-col items-center gap-1 py-2 text-primary">
                    <MessageSquare className="w-5 h-5" />
                    <span className="text-xs font-medium">Home</span>
                  </button>
                  <button className="flex flex-col items-center gap-1 py-2 text-muted-foreground hover:text-foreground transition-colors">
                    <HelpCircle className="w-5 h-5" />
                    <span className="text-xs">Help</span>
                  </button>
                  <button 
                    onClick={() => chatSessions.length > 0 && setScreen("chat")}
                    className="flex flex-col items-center gap-1 py-2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <MessageCircle className="w-5 h-5" />
                    <span className="text-xs">Messages</span>
                  </button>
                </div>
              </>
            )}

            {/* CHAT SCREEN */}
            {screen === "chat" && (
              <>
                {/* Header */}
                <div className="px-4 py-3 border-b border-border flex items-center gap-3 shrink-0 bg-card">
                  <button
                    onClick={() => setScreen("home")}
                    className="w-8 h-8 rounded-full hover:bg-muted flex items-center justify-center transition-colors text-primary"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center">
                    <Bot className="w-5 h-5 text-primary-foreground" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-foreground text-sm">ShadowAuth Bot</h3>
                    <p className="text-xs text-muted-foreground">AI Assistant</p>
                  </div>
                  <button
                    onClick={() => setIsOpen(false)}
                    className="w-8 h-8 rounded-full hover:bg-muted flex items-center justify-center transition-colors"
                  >
                    <X className="w-4 h-4 text-muted-foreground" />
                  </button>
                </div>

                {/* Messages */}
                <ScrollArea className="flex-1 bg-muted/20" ref={scrollRef}>
                  <div className="p-3 space-y-3">
                    {messages.map((msg, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`flex gap-2 ${msg.role === "user" ? "flex-row-reverse" : ""}`}
                      >
                        {msg.role === "assistant" && (
                          <div className="w-7 h-7 rounded-full bg-primary shrink-0 flex items-center justify-center">
                            <Bot className="w-3.5 h-3.5 text-primary-foreground" />
                          </div>
                        )}
                        
                        <div className={`flex flex-col ${msg.role === "user" ? "items-end" : "items-start"} max-w-[85%] min-w-0`}>
                          <div
                            className={`px-3 py-2 rounded-2xl text-[13px] leading-relaxed break-words overflow-hidden w-full ${
                              msg.role === "user"
                                ? "bg-primary text-primary-foreground rounded-br-md"
                                : "bg-card text-foreground rounded-bl-md shadow-sm border border-border/50"
                            }`}
                            style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}
                          >
                            {msg.role === "assistant" ? renderMessage(msg.content) : msg.content}
                          </div>
                          
                          {msg.timestamp && (
                            <span className="text-[10px] text-muted-foreground mt-0.5 px-1">
                              {msg.role === "assistant" ? "AI • " : ""}{msg.timestamp}
                            </span>
                          )}
                        </div>
                      </motion.div>
                    ))}
                    
                    {/* Quick Actions */}
                    {messages.length === 1 && messages[0].role === "assistant" && !isLoading && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="flex flex-wrap gap-1.5 pl-9"
                      >
                        {quickActions.map((action, i) => (
                          <motion.button
                            key={i}
                            onClick={() => sendMessage(action.query)}
                            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-full bg-primary text-primary-foreground text-xs font-medium hover:brightness-110 transition-all shadow-sm"
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 0.1 * i }}
                          >
                            <span>{action.icon}</span>
                            <span>{action.label}</span>
                          </motion.button>
                        ))}
                      </motion.div>
                    )}

                    {isLoading && (
                      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-2">
                        <div className="w-7 h-7 rounded-full bg-primary shrink-0 flex items-center justify-center">
                          <Bot className="w-3.5 h-3.5 text-primary-foreground" />
                        </div>
                        <div className="bg-card px-3 py-2 rounded-2xl rounded-bl-md shadow-sm border border-border/50">
                          <div className="flex items-center gap-1">
                            <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: "0ms" }}></span>
                            <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: "150ms" }}></span>
                            <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: "300ms" }}></span>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </div>
                </ScrollArea>

                {/* Input */}
                <div className="p-3 border-t border-border bg-card shrink-0">
                  <div className="flex gap-2">
                    <Input
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage()}
                      placeholder="Type your message..."
                      className="flex-1 bg-muted/50 border-0 h-11 focus-visible:ring-1"
                      disabled={isLoading}
                    />
                    <Button
                      onClick={() => sendMessage()}
                      disabled={!input.trim() || isLoading}
                      size="icon"
                      className="shrink-0 h-11 w-11 rounded-xl"
                    >
                      {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>
              </>
            )}

            {/* USER SUPPORT CHAT */}
            {screen === "supportChat" && (
              <>
                <div className="px-4 py-3 border-b border-border flex items-center gap-3 shrink-0 bg-emerald-500">
                  <button
                    onClick={() => setScreen("home")}
                    className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"
                  >
                    <ChevronLeft className="w-5 h-5 text-white" />
                  </button>
                  <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                    <Headphones className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-white text-sm">Human Support</h3>
                    <p className="text-xs text-white/80">We'll respond soon</p>
                  </div>
                  <button onClick={() => setIsOpen(false)} className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors">
                    <X className="w-4 h-4 text-white" />
                  </button>
                </div>

                <ScrollArea className="flex-1 bg-muted/20" ref={supportScrollRef}>
                  <div className="p-3 space-y-3">
                    {supportMessages.length === 0 && (
                      <div className="text-center py-8">
                        <Headphones className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                        <p className="text-sm text-muted-foreground">Start chatting with our support team</p>
                      </div>
                    )}
                    
                    {supportMessages.map((msg) => (
                      <motion.div
                        key={msg.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`flex gap-2 ${msg.sender_type === "user" ? "flex-row-reverse" : ""}`}
                      >
                        <div className={`w-7 h-7 rounded-full shrink-0 flex items-center justify-center ${
                          msg.sender_type === "admin" ? "bg-emerald-500" : "bg-primary"
                        }`}>
                          {msg.sender_type === "admin" ? (
                            <Headphones className="w-3.5 h-3.5 text-white" />
                          ) : (
                            <User className="w-3.5 h-3.5 text-primary-foreground" />
                          )}
                        </div>
                        
                        <div className={`flex flex-col ${msg.sender_type === "user" ? "items-end" : "items-start"} max-w-[75%]`}>
                          <div
                            className={`px-3 py-2 rounded-2xl text-[13px] leading-relaxed ${
                              msg.sender_type === "user"
                                ? "bg-primary text-primary-foreground rounded-br-md"
                                : "bg-emerald-500/10 text-foreground rounded-bl-md border border-emerald-500/30"
                            }`}
                          >
                            {msg.content}
                          </div>
                          <span className="text-[10px] text-muted-foreground mt-0.5 px-1">
                            {msg.sender_type === "admin" ? "Support • " : ""}{formatTime(msg.created_at)}
                          </span>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </ScrollArea>

                <div className="p-3 border-t border-border bg-card shrink-0">
                  <div className="flex gap-2">
                    <Input
                      value={supportInput}
                      onChange={(e) => setSupportInput(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendSupportMessage()}
                      placeholder="Describe your issue..."
                      className="flex-1 bg-muted/50 border-0 h-11 focus-visible:ring-1"
                    />
                    <Button
                      onClick={sendSupportMessage}
                      disabled={!supportInput.trim()}
                      size="icon"
                      className="shrink-0 h-11 w-11 rounded-xl bg-emerald-500 hover:bg-emerald-600"
                    >
                      <Send className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </>
            )}

            {/* SELECT ADMIN SCREEN */}
            {screen === "selectAdmin" && (
              <>
                <div 
                  className="px-4 py-3 border-b border-border flex items-center gap-3 shrink-0"
                  style={{ background: "linear-gradient(135deg, hsl(142 76% 36%) 0%, hsl(142 76% 28%) 100%)" }}
                >
                  <button
                    onClick={() => setScreen("home")}
                    className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"
                  >
                    <ChevronLeft className="w-5 h-5 text-white" />
                  </button>
                  <div className="flex-1">
                    <h3 className="font-semibold text-white text-sm">Human Support</h3>
                    <p className="text-xs text-white/80">Available agents</p>
                  </div>
                  <button onClick={() => setIsOpen(false)} className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors">
                    <X className="w-4 h-4 text-white" />
                  </button>
                </div>

                <ScrollArea className="flex-1 bg-muted/10">
                  <div className="p-4 space-y-4">
                    {/* Existing ticket notice */}
                    {supportTicket && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30"
                      >
                        <p className="text-sm text-emerald-400 font-medium">You have an existing conversation</p>
                        <Button
                          onClick={startSupportWithAdmin}
                          className="w-full mt-2 bg-emerald-500 hover:bg-emerald-600 h-9"
                        >
                          Continue Conversation
                        </Button>
                      </motion.div>
                    )}

                    {/* Online Admins */}
                    <div>
                      <p className="text-xs text-muted-foreground font-medium mb-3 flex items-center gap-2">
                        <Circle className="w-2 h-2 fill-emerald-500 text-emerald-500" />
                        Available Support Team
                      </p>
                      
                      {loadingAdmins ? (
                        <div className="flex items-center justify-center py-8">
                          <Loader2 className="w-6 h-6 animate-spin text-emerald-500" />
                        </div>
                      ) : onlineAdmins.length === 0 ? (
                        <div className="text-center py-8">
                          <Headphones className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-50" />
                          <p className="text-sm text-muted-foreground">No agents available right now</p>
                          <p className="text-xs text-muted-foreground mt-1">Leave a message and we'll respond soon</p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {onlineAdmins.map((admin) => (
                            <motion.div
                              key={admin.id}
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border/50 hover:border-emerald-500/30 transition-all"
                            >
                              <div className="relative">
                                {admin.avatar_url ? (
                                  <img 
                                    src={admin.avatar_url} 
                                    alt={admin.display_name || "Admin"} 
                                    className="w-12 h-12 rounded-full object-cover border-2 border-emerald-500/30"
                                  />
                                ) : (
                                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center text-white font-semibold text-lg">
                                    {(admin.display_name || admin.email || "A").charAt(0).toUpperCase()}
                                  </div>
                                )}
                                {/* Online indicator */}
                                <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-emerald-500 rounded-full border-2 border-card flex items-center justify-center">
                                  <Circle className="w-1.5 h-1.5 fill-white text-white" />
                                </div>
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-semibold text-foreground text-sm truncate">
                                  {admin.display_name || admin.email?.split("@")[0] || "Support Agent"}
                                </p>
                                <p className="text-xs text-emerald-500 flex items-center gap-1">
                                  <Circle className="w-1.5 h-1.5 fill-current" />
                                  Online
                                </p>
                              </div>
                            </motion.div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Start Chat Button */}
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.2 }}
                    >
                      <Button
                        onClick={startSupportWithAdmin}
                        className="w-full h-12 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white font-semibold rounded-xl shadow-lg"
                        style={{ boxShadow: "0 4px 15px hsl(142 76% 36% / 0.3)" }}
                      >
                        <MessageCircle className="w-5 h-5 mr-2" />
                        {supportTicket ? "Continue Chat" : "Start New Conversation"}
                      </Button>
                    </motion.div>

                    {/* Response time notice */}
                    <p className="text-center text-xs text-muted-foreground">
                      Average response time: <span className="text-foreground font-medium">~5 minutes</span>
                    </p>
                  </div>
                </ScrollArea>
              </>
            )}

            {/* ADMIN TICKETS LIST */}
            {screen === "adminTickets" && isAdmin && (
              <>
                <div className="px-4 py-3 border-b border-border flex items-center gap-3 shrink-0 bg-card">
                  <button
                    onClick={() => setScreen("home")}
                    className="w-8 h-8 rounded-full hover:bg-muted flex items-center justify-center transition-colors text-primary"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <div className="flex-1">
                    <h3 className="font-semibold text-foreground">Support Tickets</h3>
                    <p className="text-xs text-muted-foreground">{allTickets.length} tickets</p>
                  </div>
                  <button onClick={() => setIsOpen(false)} className="w-8 h-8 rounded-full hover:bg-muted flex items-center justify-center transition-colors">
                    <X className="w-4 h-4 text-muted-foreground" />
                  </button>
                </div>
                
                <ScrollArea className="flex-1">
                  <div className="p-3 space-y-2">
                    {loadingSupport ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="w-6 h-6 animate-spin text-primary" />
                      </div>
                    ) : allTickets.length === 0 ? (
                      <div className="text-center py-8">
                        <Headphones className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                        <p className="text-sm text-muted-foreground">No support tickets yet</p>
                      </div>
                    ) : (
                      allTickets.map((ticket) => (
                        <button
                          key={ticket.id}
                          onClick={() => openTicketChat(ticket)}
                          className="w-full flex items-center gap-3 p-3 rounded-xl bg-muted/50 hover:bg-muted transition-colors text-left"
                        >
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                            ticket.status === "open" ? "bg-emerald-500/20" : "bg-muted"
                          }`}>
                            <User className={`w-5 h-5 ${ticket.status === "open" ? "text-emerald-500" : "text-muted-foreground"}`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">{ticket.user_name || ticket.user_email}</p>
                            <p className="text-xs text-muted-foreground">{formatTime(ticket.created_at)}</p>
                          </div>
                          <div className={`px-2 py-1 rounded text-xs font-medium ${
                            ticket.status === "open" 
                              ? "bg-emerald-500/20 text-emerald-500" 
                              : "bg-muted text-muted-foreground"
                          }`}>
                            {ticket.status}
                          </div>
                          <ChevronRight className="w-4 h-4 text-muted-foreground" />
                        </button>
                      ))
                    )}
                  </div>
                </ScrollArea>
              </>
            )}

            {/* ADMIN CHAT WITH USER */}
            {screen === "adminChat" && isAdmin && selectedTicket && (
              <>
                <div className="px-4 py-3 border-b border-border flex items-center gap-3 shrink-0 bg-emerald-500">
                  <button
                    onClick={() => {
                      setSelectedTicket(null);
                      setScreen("adminTickets");
                    }}
                    className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"
                  >
                    <ChevronLeft className="w-5 h-5 text-white" />
                  </button>
                  <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                    <User className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-white text-sm">{selectedTicket.user_name || "User"}</h3>
                    <p className="text-xs text-white/80">{selectedTicket.user_email}</p>
                  </div>
                  <button onClick={() => setIsOpen(false)} className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors">
                    <X className="w-4 h-4 text-white" />
                  </button>
                </div>

                <ScrollArea className="flex-1 bg-muted/20" ref={supportScrollRef}>
                  <div className="p-3 space-y-3">
                    {supportMessages.map((msg) => (
                      <motion.div
                        key={msg.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`flex gap-2 ${msg.sender_type === "admin" ? "flex-row-reverse" : ""}`}
                      >
                        <div className={`w-7 h-7 rounded-full shrink-0 flex items-center justify-center ${
                          msg.sender_type === "admin" ? "bg-emerald-500" : "bg-primary"
                        }`}>
                          {msg.sender_type === "admin" ? (
                            <Headphones className="w-3.5 h-3.5 text-white" />
                          ) : (
                            <User className="w-3.5 h-3.5 text-primary-foreground" />
                          )}
                        </div>
                        
                        <div className={`flex flex-col ${msg.sender_type === "admin" ? "items-end" : "items-start"} max-w-[75%]`}>
                          <div
                            className={`px-3 py-2 rounded-2xl text-[13px] leading-relaxed ${
                              msg.sender_type === "admin"
                                ? "bg-emerald-500 text-white rounded-br-md"
                                : "bg-card text-foreground rounded-bl-md border border-border/50"
                            }`}
                          >
                            {msg.content}
                          </div>
                          <span className="text-[10px] text-muted-foreground mt-0.5 px-1">
                            {formatTime(msg.created_at)}
                          </span>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </ScrollArea>

                <div className="p-3 border-t border-border bg-card shrink-0">
                  <div className="flex gap-2">
                    <Input
                      value={supportInput}
                      onChange={(e) => setSupportInput(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendAdminReply()}
                      placeholder="Reply to user..."
                      className="flex-1 bg-muted/50 border-0 h-11 focus-visible:ring-1"
                    />
                    <Button
                      onClick={sendAdminReply}
                      disabled={!supportInput.trim()}
                      size="icon"
                      className="shrink-0 h-11 w-11 rounded-xl bg-emerald-500 hover:bg-emerald-600"
                    >
                      <Send className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default AIChatWidget;