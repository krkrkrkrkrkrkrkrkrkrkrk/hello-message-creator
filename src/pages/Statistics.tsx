import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { 
  Shield, ArrowLeft, BarChart3, TrendingUp, Activity, Clock, Loader2, RefreshCw, Globe, MapPin
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell } from "recharts";

interface ExecutionData {
  date: string;
  executions: number;
}

interface CountryData {
  country: string;
  count: number;
  percentage: number;
}

interface ServerStatus {
  name: string;
  region: string;
  status: "up" | "down";
  load: number;
  requests: number;
  active: number;
}

// Country code to name mapping
const countryNames: Record<string, string> = {
  BR: "Brazil",
  US: "United States",
  GB: "United Kingdom",
  DE: "Germany",
  FR: "France",
  ES: "Spain",
  PT: "Portugal",
  MX: "Mexico",
  AR: "Argentina",
  CO: "Colombia",
  CL: "Chile",
  PE: "Peru",
  VE: "Venezuela",
  CA: "Canada",
  AU: "Australia",
  JP: "Japan",
  KR: "South Korea",
  CN: "China",
  IN: "India",
  RU: "Russia",
  PL: "Poland",
  IT: "Italy",
  NL: "Netherlands",
  TR: "Turkey",
  PH: "Philippines",
  ID: "Indonesia",
  TH: "Thailand",
  VN: "Vietnam",
  MY: "Malaysia",
  SG: "Singapore",
};

// Colors for pie chart
const COLORS = ['hsl(var(--primary))', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#84cc16'];

const Statistics = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [executionData, setExecutionData] = useState<ExecutionData[]>([]);
  const [countryData, setCountryData] = useState<CountryData[]>([]);
  const [totalExecutions, setTotalExecutions] = useState(0);
  const [todayExecutions, setTodayExecutions] = useState(0);
  const [uniqueCountries, setUniqueCountries] = useState(0);
  const [lastUpdated, setLastUpdated] = useState(new Date());

  // Simulated server status
  const serverStatus: ServerStatus[] = [
    { name: "Europe/Warsaw", region: "EU", status: "up", load: 51, requests: 3333, active: 76215 },
    { name: "US/New York", region: "US", status: "up", load: 25, requests: 1510, active: 38190 },
    { name: "Canada/Montreal", region: "CA", status: "up", load: 32, requests: 2200, active: 48729 },
  ];

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate("/auth");
      } else {
        fetchStatistics();
      }
    });
  }, [navigate]);

  const fetchStatistics = async () => {
    setLoading(true);
    
    // Get user's scripts
    const { data: scripts } = await supabase
      .from("scripts")
      .select("id");

    if (!scripts || scripts.length === 0) {
      setLoading(false);
      return;
    }

    const scriptIds = scripts.map(s => s.id);

    // Fetch executions for the last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: executions, error } = await supabase
      .from("script_executions")
      .select("*")
      .in("script_id", scriptIds)
      .gte("executed_at", thirtyDaysAgo.toISOString());

    if (error) {
      toast.error("Failed to fetch statistics");
    } else {
      // Process data for chart
      const dailyData: { [key: string]: number } = {};
      const countryCount: { [key: string]: number } = {};
      const today = new Date().toISOString().split("T")[0];
      let todayCount = 0;

      // Initialize last 30 days
      for (let i = 29; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split("T")[0];
        dailyData[dateStr] = 0;
      }

      // Count executions per day and country
      executions?.forEach((exec: any) => {
        const date = exec.executed_at.split("T")[0];
        if (dailyData[date] !== undefined) {
          dailyData[date]++;
        }
        if (date === today) {
          todayCount++;
        }
        // Count countries
        const country = exec.country || "Unknown";
        countryCount[country] = (countryCount[country] || 0) + 1;
      });

      const chartData = Object.entries(dailyData).map(([date, count]) => ({
        date: new Date(date).toLocaleDateString("en-US", { month: "numeric", day: "numeric" }),
        executions: count,
      }));

      // Process country data
      const totalExecs = executions?.length || 0;
      const countryArray = Object.entries(countryCount)
        .map(([country, count]) => ({
          country,
          count,
          percentage: totalExecs > 0 ? Math.round((count / totalExecs) * 100) : 0,
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 8); // Top 8 countries

      setExecutionData(chartData);
      setCountryData(countryArray);
      setTotalExecutions(totalExecs);
      setTodayExecutions(todayCount);
      setUniqueCountries(Object.keys(countryCount).filter(c => c !== "Unknown").length);
    }

    setLastUpdated(new Date());
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/50 bg-background/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex items-center gap-3">
              <Shield className="w-8 h-8 text-primary" />
              <span className="text-xl font-bold">
                Shadow<span className="text-primary">Auth</span>
              </span>
            </div>
            <span className="text-muted-foreground">/ Statistics</span>
          </div>
          <Button variant="ghost" size="sm" onClick={fetchStatistics}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Stats cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card rounded-xl p-6 border border-border/50"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                <BarChart3 className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-3xl font-bold">{totalExecutions.toLocaleString()}</p>
                <p className="text-muted-foreground text-sm">Total Executions</p>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="glass-card rounded-xl p-6 border border-border/50"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-green-500/10 flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-green-500" />
              </div>
              <div>
                <p className="text-3xl font-bold">{todayExecutions.toLocaleString()}</p>
                <p className="text-muted-foreground text-sm">Today</p>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="glass-card rounded-xl p-6 border border-border/50"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <Activity className="w-6 h-6 text-blue-500" />
              </div>
              <div>
                <p className="text-3xl font-bold">
                  {executionData.length > 0 
                    ? Math.round(totalExecutions / 30)
                    : 0}
                </p>
                <p className="text-muted-foreground text-sm">Avg/Day</p>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="glass-card rounded-xl p-6 border border-border/50"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-purple-500/10 flex items-center justify-center">
                <Globe className="w-6 h-6 text-purple-500" />
              </div>
              <div>
                <p className="text-3xl font-bold">{uniqueCountries}</p>
                <p className="text-muted-foreground text-sm">Countries</p>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Chart + Countries Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Executions Chart */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="lg:col-span-2 glass-card rounded-xl p-6 border border-border/50"
          >
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold">Executions</h2>
                <p className="text-muted-foreground text-sm">
                  Total executions over the last 30 days
                </p>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Clock className="w-3 h-3" />
                updated {Math.floor((new Date().getTime() - lastUpdated.getTime()) / 60000)} min ago
              </div>
            </div>

            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={executionData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                  <XAxis 
                    dataKey="date" 
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
                    labelStyle={{ color: "hsl(var(--foreground))" }}
                  />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="executions" 
                    stroke="hsl(var(--primary))" 
                    strokeWidth={2}
                    dot={{ fill: "hsl(var(--primary))", strokeWidth: 0, r: 3 }}
                    activeDot={{ r: 6, stroke: "hsl(var(--primary))", strokeWidth: 2, fill: "hsl(var(--background))" }}
                    name="Executions"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </motion.div>

          {/* Top Countries */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="glass-card rounded-xl p-6 border border-border/50"
          >
            <div className="flex items-center gap-2 mb-6">
              <MapPin className="w-5 h-5 text-primary" />
              <h2 className="text-xl font-bold">Top Countries</h2>
            </div>

            {countryData.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                <Globe className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No country data yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {countryData.map((item, index) => (
                  <motion.div
                    key={item.country}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.6 + index * 0.05 }}
                    className="flex items-center gap-3"
                  >
                    <span className="text-lg w-6 text-center">
                      {index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : `${index + 1}.`}
                    </span>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-sm">
                          {countryNames[item.country] || item.country}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {item.count.toLocaleString()} ({item.percentage}%)
                        </span>
                      </div>
                      <div className="h-2 bg-muted/30 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${item.percentage}%` }}
                          transition={{ delay: 0.7 + index * 0.05, duration: 0.5 }}
                          className="h-full rounded-full"
                          style={{ backgroundColor: COLORS[index % COLORS.length] }}
                        />
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        </div>

        {/* Server Status */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="glass-card rounded-xl p-6 border border-border/50"
        >
          <h2 className="text-xl font-bold mb-6">Server Status</h2>

          <div className="space-y-4">
            {serverStatus.map((server, index) => (
              <motion.div
                key={server.name}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.7 + index * 0.1 }}
                className="flex items-center gap-4"
              >
                <div className="w-32 sm:w-40">
                  <span className="font-medium">{server.name}</span>
                </div>
                <div className={`px-2 py-0.5 rounded text-xs font-medium ${
                  server.status === "up" 
                    ? "bg-green-500/20 text-green-500" 
                    : "bg-destructive/20 text-destructive"
                }`}>
                  {server.status.toUpperCase()}
                </div>
                <div className="flex-1 h-2 bg-muted/30 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${server.load}%` }}
                    transition={{ delay: 0.8 + index * 0.1, duration: 0.5 }}
                    className={`h-full rounded-full ${
                      server.load > 80 ? "bg-destructive" : 
                      server.load > 50 ? "bg-yellow-500" : "bg-green-500"
                    }`}
                  />
                </div>
                <div className="text-right text-sm text-muted-foreground hidden sm:block">
                  load: {server.load}%, req/s: {server.requests.toLocaleString()}, active: {server.active.toLocaleString()}
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </main>
    </div>
  );
};

export default Statistics;