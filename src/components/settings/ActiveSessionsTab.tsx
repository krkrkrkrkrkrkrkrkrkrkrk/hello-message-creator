import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { 
  Users, 
  Monitor, 
  Globe, 
  Clock,
  RefreshCw,
  Loader2,
  XCircle,
  CheckCircle,
  Wifi,
  WifiOff,
  Gamepad2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Session {
  id: string;
  username: string | null;
  hwid: string | null;
  ip_address: string;
  executor: string | null;
  is_connected: boolean;
  status: string;
  connected_at: string;
  last_heartbeat: string;
  script_id: string;
}

export default function ActiveSessionsTab() {
  const [loading, setLoading] = useState(true);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [recentExecutions, setRecentExecutions] = useState<any[]>([]);
  const [kicking, setKicking] = useState<string | null>(null);

  useEffect(() => {
    fetchSessions();
    fetchRecentExecutions();
    
    // Set up real-time subscription
    const channel = supabase
      .channel('websocket_sessions_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'websocket_sessions',
        },
        () => {
          fetchSessions();
        }
      )
      .subscribe();

    // Also subscribe to script_executions for recent activity
    const execChannel = supabase
      .channel('script_executions_changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'script_executions',
        },
        () => {
          fetchRecentExecutions();
        }
      )
      .subscribe();

    // Refresh every 10 seconds
    const interval = setInterval(() => {
      fetchSessions();
      fetchRecentExecutions();
    }, 10000);

    return () => {
      supabase.removeChannel(channel);
      supabase.removeChannel(execChannel);
      clearInterval(interval);
    };
  }, []);

  const fetchSessions = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      setLoading(false);
      return;
    }

    // Get user's scripts
    const { data: scripts } = await supabase
      .from("scripts")
      .select("id")
      .eq("user_id", session.user.id);

    if (!scripts?.length) {
      setSessions([]);
      setLoading(false);
      return;
    }

    const scriptIds = scripts.map(s => s.id);

    // Get active sessions
    const { data: activeSessions } = await supabase
      .from("websocket_sessions")
      .select("*")
      .in("script_id", scriptIds)
      .eq("is_connected", true)
      .order("connected_at", { ascending: false });

    setSessions(activeSessions || []);
    setLoading(false);
  };

  const fetchRecentExecutions = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    // Get user's scripts
    const { data: scripts } = await supabase
      .from("scripts")
      .select("id, name")
      .eq("user_id", session.user.id);

    if (!scripts?.length) return;

    const scriptIds = scripts.map(s => s.id);

    // Get recent executions (last 10)
    const { data: executions } = await supabase
      .from("script_executions")
      .select("*")
      .in("script_id", scriptIds)
      .order("executed_at", { ascending: false })
      .limit(10);

    // Merge script names
    const executionsWithNames = (executions || []).map(exec => ({
      ...exec,
      script_name: scripts.find(s => s.id === exec.script_id)?.name || "Unknown"
    }));

    setRecentExecutions(executionsWithNames);
  };

  const kickSession = async (sessionId: string) => {
    setKicking(sessionId);
    
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      setKicking(null);
      return;
    }

    // Update the websocket session as kicked (just disconnect, don't ban)
    const { error } = await supabase
      .from("websocket_sessions")
      .update({
        is_connected: false,
        status: "kicked",
        kick_reason: "Kicked by owner",
        kicked_by: session.user.id,
        disconnected_at: new Date().toISOString(),
      })
      .eq("id", sessionId);

    if (error) {
      toast.error("Failed to kick session");
      setKicking(null);
      return;
    }

    // Just kick - user can execute again with the same key
    toast.success("User kicked! They will be disconnected from the game.");
    
    fetchSessions();
    setKicking(null);
  };

  const getTimeSince = (date: string) => {
    const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    return `${Math.floor(seconds / 3600)}h ago`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-xl bg-card border border-border p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
              <Wifi className="w-5 h-5 text-green-500" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Active Now</p>
              <p className="text-2xl font-bold">{sessions.length}</p>
            </div>
          </div>
        </div>

        <div className="rounded-xl bg-card border border-border p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
              <Users className="w-5 h-5 text-blue-500" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Unique Users</p>
              <p className="text-2xl font-bold">
                {new Set(sessions.map(s => s.hwid).filter(Boolean)).size}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-xl bg-card border border-border p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
              <Monitor className="w-5 h-5 text-purple-500" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Executors</p>
              <p className="text-2xl font-bold">
                {new Set(sessions.map(s => s.executor).filter(Boolean)).size}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-xl bg-card border border-border p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-yellow-500/10 flex items-center justify-center">
              <Globe className="w-5 h-5 text-yellow-500" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">IPs</p>
              <p className="text-2xl font-bold">
                {new Set(sessions.map(s => s.ip_address)).size}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Active Sessions List */}
      <div className="rounded-xl bg-card border border-border p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
              <Users className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h4 className="font-bold">Active Sessions</h4>
              <p className="text-xs text-muted-foreground">Real-time user monitoring</p>
            </div>
          </div>
          <Button variant="outline" size="sm" className="gap-2" onClick={fetchSessions}>
            <RefreshCw className="w-4 h-4" />
            Refresh
          </Button>
        </div>

        {sessions.length > 0 ? (
          <div className="space-y-3">
            {sessions.map((session) => (
              <motion.div
                key={session.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-center justify-between p-4 rounded-lg bg-secondary/30 border border-border"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center border border-primary/20">
                    <Users className="w-6 h-6 text-primary" />
                  </div>
                  
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-semibold">{session.username || "Unknown User"}</p>
                      <Badge className="bg-green-500/20 text-green-500 border-0">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Online
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                      <span className="flex items-center gap-1">
                        <Globe className="w-3 h-3" />
                        {session.ip_address}
                      </span>
                      <span className="flex items-center gap-1">
                        <Monitor className="w-3 h-3" />
                        {session.executor || "Unknown"}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {getTimeSince(session.connected_at)}
                      </span>
                    </div>
                  </div>
                </div>

                <Button
                  variant="destructive"
                  size="sm"
                  className="gap-2"
                  onClick={() => kickSession(session.id)}
                  disabled={kicking === session.id}
                >
                  {kicking === session.id ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <XCircle className="w-4 h-4" />
                  )}
                  Kick
                </Button>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <WifiOff className="w-16 h-16 mb-4 opacity-50" />
            <p className="text-lg font-medium">No Active Sessions</p>
            <p className="text-sm">Users will appear here when they execute your scripts</p>
          </div>
        )}
      </div>

      {/* Recent Executions */}
      <div className="rounded-xl bg-card border border-border p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
            <Gamepad2 className="w-5 h-5 text-blue-500" />
          </div>
          <div>
            <h4 className="font-bold">Recent Executions</h4>
            <p className="text-xs text-muted-foreground">Latest script activity - Users appear here when executing</p>
          </div>
        </div>

        {recentExecutions.length > 0 ? (
          <div className="space-y-2">
            {recentExecutions.map((exec, idx) => (
              <div
                key={exec.id || idx}
                className="flex items-center justify-between p-3 rounded-lg bg-secondary/20 border border-border/50"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
                    <Users className="w-5 h-5 text-green-500" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium">
                        {exec.roblox_username || "Unknown User"}
                      </p>
                      <Badge className="bg-green-500/20 text-green-500 border-0 text-xs">
                        Active
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {exec.script_name} • {exec.country || "Unknown"} • {exec.executor_type || "Unknown"}
                    </p>
                  </div>
                </div>
                <span className="text-xs text-muted-foreground">
                  {getTimeSince(exec.executed_at)}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <Gamepad2 className="w-12 h-12 mx-auto mb-2 opacity-30" />
            <p>No recent executions</p>
            <p className="text-xs mt-1">Users will appear here when they execute your scripts</p>
          </div>
        )}
      </div>
    </motion.div>
  );
}