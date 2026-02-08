import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { BarChart3, TrendingUp, Users, Globe, Activity, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

const COLORS = ['hsl(var(--primary))', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

export default function AnalyticsTab() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalExecutions: 0,
    totalKeys: 0,
    uniqueUsers: 0,
    countries: 0,
  });
  const [chartData, setChartData] = useState<any[]>([]);
  const [countryData, setCountryData] = useState<any[]>([]);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    setLoading(true);
    
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      setLoading(false);
      return;
    }

    // Fetch user's scripts
    const { data: scripts } = await supabase
      .from("scripts")
      .select("id")
      .eq("user_id", session.user.id);

    if (!scripts?.length) {
      setLoading(false);
      return;
    }

    const scriptIds = scripts.map(s => s.id);

    // Fetch executions
    const { data: executions } = await supabase
      .from("script_executions")
      .select("*")
      .in("script_id", scriptIds);

    // Fetch keys
    const { data: keys } = await supabase
      .from("script_keys")
      .select("*")
      .in("script_id", scriptIds);

    // Calculate stats
    const uniqueHwids = new Set(executions?.map(e => e.hwid).filter(Boolean)).size;
    const uniqueCountries = new Set(executions?.map(e => e.country).filter(Boolean)).size;

    setStats({
      totalExecutions: executions?.length || 0,
      totalKeys: keys?.length || 0,
      uniqueUsers: uniqueHwids,
      countries: uniqueCountries,
    });

    // Generate 7-day chart data
    const last7Days = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dayStr = date.toISOString().split('T')[0];
      const dayExecs = executions?.filter(e => 
        e.executed_at?.startsWith(dayStr)
      ).length || 0;
      
      last7Days.push({
        name: date.toLocaleDateString('en', { weekday: 'short' }),
        executions: dayExecs,
      });
    }
    setChartData(last7Days);

    // Country distribution
    const countryCounts: Record<string, number> = {};
    executions?.forEach(e => {
      if (e.country) {
        countryCounts[e.country] = (countryCounts[e.country] || 0) + 1;
      }
    });
    
    const countryArr = Object.entries(countryCounts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
    
    setCountryData(countryArr);
    setLoading(false);
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
      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Executions", value: stats.totalExecutions, icon: Activity, color: "text-primary" },
          { label: "Total Keys", value: stats.totalKeys, icon: TrendingUp, color: "text-green-500" },
          { label: "Unique Users", value: stats.uniqueUsers, icon: Users, color: "text-blue-500" },
          { label: "Countries", value: stats.countries, icon: Globe, color: "text-yellow-500" },
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="rounded-xl bg-card border border-border p-4"
          >
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg bg-secondary flex items-center justify-center`}>
                <stat.icon className={`w-5 h-5 ${stat.color}`} />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
                <p className="text-2xl font-bold">{stat.value.toLocaleString()}</p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Executions Chart */}
        <div className="rounded-xl bg-card border border-border p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h4 className="font-bold">Execution Trends</h4>
              <p className="text-xs text-muted-foreground">Last 7 days activity</p>
            </div>
          </div>

          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorExec" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }}
                />
                <Area 
                  type="monotone" 
                  dataKey="executions" 
                  stroke="hsl(var(--primary))" 
                  fill="url(#colorExec)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Country Distribution */}
        <div className="rounded-xl bg-card border border-border p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
              <Globe className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h4 className="font-bold">Top Countries</h4>
              <p className="text-xs text-muted-foreground">Geographic distribution</p>
            </div>
          </div>

          {countryData.length > 0 ? (
            <div className="flex items-center gap-6">
              <div className="w-40 h-40">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={countryData}
                      innerRadius={40}
                      outerRadius={60}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {countryData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex-1 space-y-2">
                {countryData.map((country, i) => (
                  <div key={country.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: COLORS[i % COLORS.length] }}
                      />
                      <span className="text-sm">{country.name}</span>
                    </div>
                    <span className="text-sm font-medium">{country.value}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-40 text-muted-foreground">
              No country data available
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
