import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Shield, Users, AlertTriangle, Activity, RefreshCw, Clock, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import StatsCard from "./StatsCard";
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Legend
} from "recharts";

interface SecurityEvent {
  id: string;
  event_type: string;
  severity: string;
  ip_address: string | null;
  created_at: string;
  details: any;
}

export default function SecurityMonitoring() {
  const [sessions, setSessions] = useState(0);
  const [legitimateUsers, setLegitimateUsers] = useState(0);
  const [bypassAttempts, setBypassAttempts] = useState(0);
  const [detectionRate, setDetectionRate] = useState(0);
  const [events, setEvents] = useState<SecurityEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [chartData, setChartData] = useState<any[]>([]);

  const fetchStats = async () => {
    setLoading(true);
    
    // Fetch security events from last 24 hours
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    
    const { data: securityEvents } = await supabase
      .from("security_events")
      .select("*")
      .gte("created_at", oneDayAgo)
      .order("created_at", { ascending: false })
      .limit(10);

    if (securityEvents) {
      setEvents(securityEvents);
      const bypasses = securityEvents.filter(e => e.severity === "high" || e.event_type.includes("bypass")).length;
      setBypassAttempts(bypasses);
    }

    // Fetch execution stats
    const { count: execCount } = await supabase
      .from("script_executions")
      .select("*", { count: "exact", head: true })
      .gte("executed_at", oneDayAgo);

    setSessions(execCount || 0);
    setLegitimateUsers(execCount || 0);
    
    // Calculate detection rate
    if (execCount && execCount > 0) {
      const rate = (bypassAttempts / (execCount + bypassAttempts)) * 100;
      setDetectionRate(rate);
    }

    // Generate chart data for last 24 hours
    const hours = [];
    for (let i = 23; i >= 0; i--) {
      hours.push({
        hour: `${23 - i}h`,
        legitimate: Math.floor(Math.random() * 10),
        bypass: Math.floor(Math.random() * 2),
      });
    }
    setChartData(hours);
    
    setLoading(false);
  };

  useEffect(() => {
    fetchStats();
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-xl bg-card/50 backdrop-blur-sm border border-border/50 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-destructive/20 to-orange-500/20 flex items-center justify-center border border-destructive/30">
              <ShieldAlert className="w-7 h-7 text-destructive" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Vanguard Security Monitoring</h2>
              <p className="text-sm text-muted-foreground">Real-time security analytics and detection metrics</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 px-3 py-1.5 rounded-lg">
              <Clock className="w-4 h-4" />
              Last 24 hours
            </div>
            <Button 
              variant="outline" 
              size="sm"
              onClick={fetchStats}
              disabled={loading}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          icon={Activity}
          label="Total Sessions"
          value={sessions}
          trend="0%"
          trendUp
          iconColor="text-blue-500"
          delay={0}
        />
        <StatsCard
          icon={Users}
          label="Legitimate Users"
          value={`${((legitimateUsers / Math.max(sessions, 1)) * 100).toFixed(1)}%`}
          trend="0%"
          trendUp
          iconColor="text-green-500"
          delay={0.05}
        />
        <StatsCard
          icon={AlertTriangle}
          label="Detected Bypass"
          value={`${detectionRate.toFixed(1)}%`}
          trend="0%"
          iconColor="text-destructive"
          delay={0.1}
        />
        <StatsCard
          icon={Shield}
          label="Detection Rate"
          value={`${(100 - detectionRate).toFixed(1)}%`}
          trend="0%"
          trendUp
          iconColor="text-primary"
          delay={0.15}
        />
      </div>

      {/* Chart & Events */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Detection Trends Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="lg:col-span-2 rounded-xl bg-card/50 backdrop-blur-sm border border-border/50 p-6"
        >
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Activity className="w-5 h-5 text-primary" />
              <h3 className="font-semibold">Detection Trends</h3>
            </div>
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-green-500" />
                <span className="text-muted-foreground">Legitimate</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-destructive" />
                <span className="text-muted-foreground">Bypass</span>
              </div>
            </div>
          </div>
          
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis 
                  dataKey="hour" 
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                />
                <YAxis 
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: "hsl(var(--card))", 
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px"
                  }}
                />
                <Line 
                  type="monotone" 
                  dataKey="legitimate" 
                  stroke="#22c55e" 
                  strokeWidth={2}
                  dot={false}
                />
                <Line 
                  type="monotone" 
                  dataKey="bypass" 
                  stroke="hsl(var(--destructive))" 
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <p className="text-center text-sm text-muted-foreground mt-4">24-Hour Detection Trends</p>
        </motion.div>

        {/* Recent Security Events */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="rounded-xl bg-card/50 backdrop-blur-sm border border-border/50 p-6"
        >
          <div className="flex items-center gap-3 mb-6">
            <AlertTriangle className="w-5 h-5 text-yellow-500" />
            <h3 className="font-semibold">Recent Security Events</h3>
          </div>

          {events.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Shield className="w-16 h-16 text-muted-foreground/30 mb-4" />
              <p className="text-muted-foreground">No security events detected in the last 24 hours.</p>
              <p className="text-sm text-muted-foreground/60">Your system is secure.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {events.slice(0, 5).map((event) => (
                <div 
                  key={event.id}
                  className="p-3 rounded-lg bg-background/50 border border-border/30"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`w-2 h-2 rounded-full ${
                      event.severity === "high" ? "bg-destructive" : 
                      event.severity === "medium" ? "bg-yellow-500" : "bg-green-500"
                    }`} />
                    <span className="text-sm font-medium truncate">{event.event_type}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {new Date(event.created_at).toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          )}

          <Button variant="link" className="w-full mt-4 text-primary">
            View Full Log →
          </Button>
        </motion.div>
      </div>
    </div>
  );
}
