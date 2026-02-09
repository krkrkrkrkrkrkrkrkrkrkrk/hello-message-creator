import { useState } from "react";
import { motion } from "framer-motion";
import { 
  ShieldCheck, Shield, Activity, AlertTriangle, 
  CheckCircle, XCircle, Eye, Lock, Zap,
  RefreshCw, Clock, TrendingUp, Bot, Users
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import ActiveSessionsTab from "@/components/settings/ActiveSessionsTab";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const VanguardCenter = () => {
  const [lastUpdated] = useState(new Date());

  const { data: stats, refetch, isRefetching } = useQuery({
    queryKey: ["vanguard-stats"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      
      // Get user's scripts
      const { data: scripts } = await supabase
        .from("scripts")
        .select("id, secure_core_enabled, anti_tamper_enabled, anti_debug_enabled, hwid_lock_enabled, execution_count")
        .eq("user_id", user.id);

      const scriptIds = scripts?.map(s => s.id) || [];
      
      // Get keys for statistics
      const { data: keys } = await supabase
        .from("script_keys")
        .select("id, is_banned, hwid")
        .in("script_id", scriptIds);

      // Get active sessions (websocket_sessions)
      const { data: activeSessions } = await supabase
        .from("websocket_sessions")
        .select("id, is_connected")
        .in("script_id", scriptIds)
        .eq("is_connected", true);

      // Get executions for scan count
      const { data: executions } = await supabase
        .from("script_executions")
        .select("id, executed_at")
        .in("script_id", scriptIds);

      // Get security events
      const { data: events } = await supabase
        .from("security_events")
        .select("*")
        .in("script_id", scriptIds)
        .order("created_at", { ascending: false })
        .limit(10);

      const totalExecutions = executions?.length || 0;
      const activeSessionCount = activeSessions?.length || 0;
      const bannedKeys = keys?.filter(k => k.is_banned).length || 0;
      const validKeys = keys?.filter(k => !k.is_banned).length || 0;

      return {
        scripts: scripts || [],
        keys: keys || [],
        events: events || [],
        totalExecutions,
        activeSessionCount,
        bannedKeys,
        validKeys,
        totalScripts: scripts?.length || 0,
      };
    },
  });

  const totalScans = stats?.totalExecutions || 0;
  const activeSessions = stats?.activeSessionCount || 0;
  const trustedRequests = stats?.validKeys || 0;
  const blockedRequests = stats?.bannedKeys || 0;
  const blockRate = (trustedRequests + blockedRequests) > 0 
    ? ((blockedRequests / (trustedRequests + blockedRequests)) * 100).toFixed(1) 
    : "0.0";
  const botsBlocked = stats?.events?.filter(e => e.event_type?.includes("bot")).length || 0;

  const securityStatus = blockedRequests === 0 ? "Excellent" : blockedRequests > trustedRequests ? "Critical" : "Warning";

  const statsCards = [
    { icon: Eye, label: "Total Scans", value: totalScans, badge: "All Time", badgeColor: "bg-blue-500/20 text-blue-400" },
    { icon: Activity, label: "Active Sessions", value: activeSessions, badge: "Live", badgeColor: "bg-cyan-500/20 text-cyan-400" },
    { icon: CheckCircle, label: "Valid Keys", value: trustedRequests, badge: "Verified", badgeColor: "bg-green-500/20 text-green-400" },
    { icon: XCircle, label: "Banned Keys", value: blockedRequests, badge: "Blocked", badgeColor: "bg-red-500/20 text-red-400" },
    { icon: Bot, label: "Bots Blocked", value: botsBlocked, badge: "Detected", badgeColor: "bg-purple-500/20 text-purple-400" },
  ];

  return (
    <DashboardLayout breadcrumb="Pages / Vanguard Center" title="Vanguard Center">
      <div className="space-y-4">
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-cyan-500/20 flex items-center justify-center">
              <Shield className="w-6 h-6 text-cyan-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-semibold text-foreground">Vanguard Center</h1>
                <Badge className="bg-cyan-500/20 text-cyan-400 text-[10px] px-2 py-0.5">AI-Powered</Badge>
              </div>
              <p className="text-xs text-muted-foreground">Real-time security monitoring and threat analysis</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-red-400 border-red-400/50 gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
              OFFLINE
            </Badge>
            <Button variant="outline" size="sm" className="text-xs gap-1.5">
              Clear Cache
            </Button>
            <Button 
              size="sm" 
              className="bg-cyan-500 hover:bg-cyan-600 text-white text-xs gap-1.5"
              onClick={() => refetch()}
              disabled={isRefetching}
            >
              {isRefetching ? <RefreshCw className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
              Refresh
            </Button>
          </div>
        </motion.div>

        {/* Last Updated */}
        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <Clock className="w-3 h-3" />
          Last updated: {lastUpdated.toLocaleTimeString()}
        </div>

        {/* Security Status Bar */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="bg-card border border-border rounded-lg p-4"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
                <ShieldCheck className="w-5 h-5 text-green-400" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">Security Status:</span>
                  <span className="text-sm text-green-400 font-semibold">{securityStatus}</span>
                </div>
                <p className="text-[11px] text-muted-foreground">100% of requests passed security verification</p>
              </div>
            </div>
            <div className="flex items-center gap-8">
              <div className="text-center">
                <p className="text-lg font-bold">{totalScans}</p>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Total Scans</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold text-cyan-400">{activeSessions}</p>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Active</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold text-green-400">{trustedRequests}</p>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Valid</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold text-red-400">{blockedRequests}</p>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Banned</p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Stats Cards */}
        <div className="grid grid-cols-5 gap-3">
          {statsCards.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + i * 0.03 }}
              className="bg-card border border-border rounded-lg p-4 relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-16 h-16 opacity-10">
                <TrendingUp className="w-full h-full" />
              </div>
              <div className="flex items-start justify-between mb-3">
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                  i === 0 ? 'bg-blue-500/20' : 
                  i === 1 ? 'bg-green-500/20' : 
                  i === 2 ? 'bg-red-500/20' : 
                  i === 3 ? 'bg-orange-500/20' : 'bg-purple-500/20'
                }`}>
                  <stat.icon className={`w-4 h-4 ${
                    i === 0 ? 'text-blue-400' : 
                    i === 1 ? 'text-green-400' : 
                    i === 2 ? 'text-red-400' : 
                    i === 3 ? 'text-orange-400' : 'text-purple-400'
                  }`} />
                </div>
                <Badge className={`text-[9px] px-1.5 py-0 ${stat.badgeColor}`}>
                  {stat.badge}
                </Badge>
              </div>
              <p className="text-[11px] text-muted-foreground mb-1">{stat.label}</p>
              <p className="text-xl font-bold">{stat.value}</p>
            </motion.div>
          ))}
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-3 gap-4">
          {/* Scan Activity Chart */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="col-span-2 bg-card border border-border rounded-lg p-4"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-muted-foreground" />
                <div>
                  <h3 className="text-sm font-medium">Scan Activity</h3>
                  <p className="text-[10px] text-muted-foreground">Last 7 days trend analysis</p>
                </div>
              </div>
              <div className="flex items-center gap-3 text-[10px]">
                <div className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-cyan-400" />
                  Scans
                </div>
                <div className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-red-400" />
                  Blocked
                </div>
              </div>
            </div>
            <div className="h-48 flex items-center justify-center">
              <div className="text-center text-muted-foreground">
                <TrendingUp className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <p className="text-xs">No activity data yet</p>
                <p className="text-[10px] opacity-70">Data will appear as scans are recorded</p>
              </div>
            </div>
          </motion.div>

          {/* Distribution Chart */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="bg-card border border-border rounded-lg p-4"
          >
            <div className="flex items-center gap-2 mb-4">
              <Shield className="w-4 h-4 text-muted-foreground" />
              <div>
                <h3 className="text-sm font-medium">Distribution</h3>
                <p className="text-[10px] text-muted-foreground">Trusted vs Blocked ratio</p>
              </div>
            </div>
            <div className="h-32 flex items-center justify-center">
              <div className="text-center text-muted-foreground">
                <Shield className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p className="text-xs">No data yet</p>
              </div>
            </div>
            <div className="flex items-center justify-center gap-4 mt-4 text-[10px]">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-cyan-400" />
                <span>{trustedRequests} Trusted</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-red-400" />
                <span>{blockedRequests} Blocked</span>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Security Features */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-card border border-border rounded-lg p-4"
        >
          <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
            <Lock className="w-4 h-4" />
            Active Protection Features
          </h3>
          <div className="grid grid-cols-4 gap-3">
            {[
              { icon: Shield, label: "Secure Core", active: stats?.scripts?.some(s => s.secure_core_enabled) },
              { icon: Lock, label: "Anti-Tamper", active: stats?.scripts?.some(s => s.anti_tamper_enabled) },
              { icon: Eye, label: "Anti-Debug", active: stats?.scripts?.some(s => s.anti_debug_enabled) },
              { icon: Zap, label: "HWID Lock", active: stats?.scripts?.some(s => s.hwid_lock_enabled) },
            ].map((feature, i) => (
              <div key={feature.label} className={`p-3 rounded-lg border ${feature.active ? 'border-green-500/30 bg-green-500/5' : 'border-border bg-muted/20'}`}>
                <div className="flex items-center justify-between mb-2">
                  <feature.icon className={`w-4 h-4 ${feature.active ? 'text-green-400' : 'text-muted-foreground'}`} />
                  <span className={`w-2 h-2 rounded-full ${feature.active ? 'bg-green-400' : 'bg-muted-foreground'}`} />
                </div>
                <p className="text-xs font-medium">{feature.label}</p>
                <p className="text-[10px] text-muted-foreground">{feature.active ? 'Enabled' : 'Disabled'}</p>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Active Sessions Section */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="bg-card border border-border rounded-lg p-4"
        >
          <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
            <Users className="w-4 h-4" />
            Active Sessions
          </h3>
          <ActiveSessionsTab />
        </motion.div>

        {/* Recent Events */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-card border border-border rounded-lg p-4"
        >
          <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            Recent Security Events
          </h3>
          {stats?.events && stats.events.length > 0 ? (
            <div className="space-y-2">
              {stats.events.slice(0, 5).map((event) => (
                <div key={event.id} className="flex items-center gap-3 p-2 rounded-lg bg-muted/30 text-xs">
                  <div className={`w-2 h-2 rounded-full ${
                    event.severity === 'high' ? 'bg-red-400' : 
                    event.severity === 'medium' ? 'bg-yellow-400' : 'bg-green-400'
                  }`} />
                  <span className="flex-1">{event.event_type}</span>
                  <span className="text-muted-foreground">{new Date(event.created_at).toLocaleTimeString()}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6 text-muted-foreground">
              <ShieldCheck className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-xs">No security events recorded</p>
              <p className="text-[10px] opacity-70">Events will appear here when detected</p>
            </div>
          )}
        </motion.div>
      </div>
    </DashboardLayout>
  );
};

export default VanguardCenter;
