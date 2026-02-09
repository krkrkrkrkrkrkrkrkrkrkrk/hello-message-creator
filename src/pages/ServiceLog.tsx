import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { 
  Activity, RefreshCw, Search, Filter, Clock, 
  AlertCircle, CheckCircle, XCircle, Loader2, 
  Globe, User, Key, Code
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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

interface LogEntry {
  id: string;
  event_type: string;
  severity: string;
  ip_address: string | null;
  user_agent: string | null;
  details: any;
  created_at: string;
  script_id: string | null;
  key_id: string | null;
}

interface ExecutionLog {
  id: string;
  script_id: string;
  key_id: string | null;
  executed_at: string;
  executor_ip: string | null;
  hwid: string | null;
  country: string | null;
  executor_type: string | null;
  roblox_username: string | null;
}

export default function ServiceLog() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [securityEvents, setSecurityEvents] = useState<LogEntry[]>([]);
  const [executions, setExecutions] = useState<ExecutionLog[]>([]);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [activeTab, setActiveTab] = useState<"executions" | "security">("executions");

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
        return;
      }
      await fetchLogs();
      setLoading(false);
    };
    init();
  }, [navigate]);

  const fetchLogs = async () => {
    // Fetch user's scripts first
    const { data: scripts } = await supabase
      .from("scripts")
      .select("id");

    if (!scripts || scripts.length === 0) {
      setLoading(false);
      return;
    }

    const scriptIds = scripts.map(s => s.id);

    // Fetch execution logs
    const { data: execData } = await supabase
      .from("script_executions")
      .select("*")
      .in("script_id", scriptIds)
      .order("executed_at", { ascending: false })
      .limit(100);

    if (execData) {
      setExecutions(execData);
    }

    // Security events are admin only, so we'll use local data for now
    // In a real app, you'd fetch from security_events table with proper RLS
    setSecurityEvents([]);
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "error": return "bg-red-500/20 text-red-500";
      case "warning": return "bg-yellow-500/20 text-yellow-500";
      case "info": return "bg-blue-500/20 text-blue-500";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case "error": return <XCircle className="w-4 h-4" />;
      case "warning": return <AlertCircle className="w-4 h-4" />;
      case "info": return <CheckCircle className="w-4 h-4" />;
      default: return <Activity className="w-4 h-4" />;
    }
  };

  const filteredExecutions = executions.filter(exec => {
    const matchesSearch = 
      exec.executor_ip?.includes(search) ||
      exec.roblox_username?.toLowerCase().includes(search.toLowerCase()) ||
      exec.hwid?.includes(search);
    const matchesType = filterType === "all" || exec.country === filterType;
    return matchesSearch || !search;
  });

  if (loading) {
    return (
      <DashboardLayout breadcrumb="Service Log" title="Service Log">
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout breadcrumb="Service Log" title="Service Log">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl bg-primary/20 flex items-center justify-center">
              <Activity className="w-7 h-7 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-foreground">Service Log</h2>
              <p className="text-sm text-muted-foreground">Monitor all activity and events</p>
            </div>
          </div>
          <Button variant="outline" className="gap-2" onClick={fetchLogs}>
            <RefreshCw className="w-4 h-4" />
            Refresh
          </Button>
        </div>
      </motion.div>

      {/* Stats Cards */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6"
      >
        <div className="rounded-xl bg-card border border-border p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-green-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{executions.length}</p>
              <p className="text-xs text-muted-foreground">Total Executions</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl bg-card border border-border p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
              <User className="w-5 h-5 text-blue-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">
                {new Set(executions.map(e => e.hwid).filter(Boolean)).size}
              </p>
              <p className="text-xs text-muted-foreground">Unique Users</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl bg-card border border-border p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
              <Globe className="w-5 h-5 text-purple-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">
                {new Set(executions.map(e => e.country).filter(Boolean)).size}
              </p>
              <p className="text-xs text-muted-foreground">Countries</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl bg-card border border-border p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-yellow-500/20 flex items-center justify-center">
              <Clock className="w-5 h-5 text-yellow-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">
                {executions.filter(e => {
                  const today = new Date();
                  today.setHours(0, 0, 0, 0);
                  return new Date(e.executed_at) >= today;
                }).length}
              </p>
              <p className="text-xs text-muted-foreground">Today</p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Tabs */}
      <div className="flex items-center gap-2 mb-6 border-b border-border">
        <button
          onClick={() => setActiveTab("executions")}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors border-b-2 -mb-px ${
            activeTab === "executions" 
              ? "border-primary text-foreground" 
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Code className="w-4 h-4" />
          Executions ({executions.length})
        </button>
        <button
          onClick={() => setActiveTab("security")}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors border-b-2 -mb-px ${
            activeTab === "security" 
              ? "border-primary text-foreground" 
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <AlertCircle className="w-4 h-4" />
          Security Events ({securityEvents.length})
        </button>
      </div>

      {/* Logs List */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="rounded-xl bg-card border border-border overflow-hidden"
      >
        {/* Filters */}
        <div className="p-4 border-b border-border flex items-center gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by IP, username, or HWID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 bg-secondary border-border"
            />
          </div>
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-40 bg-secondary border-border">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue placeholder="All" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Countries</SelectItem>
              {Array.from(new Set(executions.map(e => e.country).filter(Boolean))).map(country => (
                <SelectItem key={country} value={country!}>{country}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Logs */}
        {activeTab === "executions" && (
          <div className="divide-y divide-border">
            {filteredExecutions.length === 0 ? (
              <div className="p-12 text-center">
                <Activity className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
                <p className="text-muted-foreground">No execution logs found</p>
              </div>
            ) : (
              filteredExecutions.map((exec, index) => (
                <motion.div
                  key={exec.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.02 }}
                  className="p-4 hover:bg-secondary/30 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
                        <CheckCircle className="w-5 h-5 text-green-500" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-foreground">Script Execution</span>
                          {exec.roblox_username && (
                            <Badge className="bg-blue-500/20 text-blue-500 text-xs">
                              {exec.roblox_username}
                            </Badge>
                          )}
                          {exec.country && (
                            <Badge className="bg-secondary text-muted-foreground text-xs">
                              {exec.country}
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          IP: {exec.executor_ip || "Unknown"} • 
                          HWID: {exec.hwid ? `${exec.hwid.slice(0, 12)}...` : "N/A"} •
                          {exec.executor_type && ` Executor: ${exec.executor_type}`}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">
                        {new Date(exec.executed_at).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit"
                        })}
                      </p>
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        )}

        {activeTab === "security" && (
          <div className="p-12 text-center">
            <AlertCircle className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
            <p className="text-muted-foreground">No security events recorded</p>
            <p className="text-xs text-muted-foreground mt-2">Security events will appear here when detected</p>
          </div>
        )}
      </motion.div>
    </DashboardLayout>
  );
}
