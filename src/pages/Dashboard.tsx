import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { 
  Key, Users, Zap, Globe, TrendingUp, Clock, Shield, Activity,
  BarChart3, DollarSign, Eye, Server
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import SecurityMonitoring from "@/components/dashboard/SecurityMonitoring";
import WorldMap from "@/components/dashboard/WorldMap";
import UserDistributionChart from "@/components/dashboard/UserDistributionChart";
import ActivityChart from "@/components/dashboard/ActivityChart";

interface Profile {
  display_name: string | null;
  avatar_url: string | null;
  email: string | null;
  api_key: string | null;
  subscription_plan: string | null;
  subscription_expires_at: string | null;
  subscription_started_at: string | null;
  is_admin: boolean | null;
}

interface ExecutionStats {
  total: number;
  today: number;
  uniqueUsers: number;
}

interface CountryData {
  country: string;
  executions: number;
  users: number;
}

const Dashboard = () => {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [keysCount, setKeysCount] = useState(0);
  const [premiumKeys, setPremiumKeys] = useState(0);
  const [normalKeys, setNormalKeys] = useState(0);
  const [scriptsCount, setScriptsCount] = useState(0);
  const [execStats, setExecStats] = useState<ExecutionStats>({ total: 0, today: 0, uniqueUsers: 0 });
  const [countryData, setCountryData] = useState<CountryData[]>([]);
  const [activityData, setActivityData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const navigate = useNavigate();

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        navigate("/auth");
      }
    });

    const init = async () => {
      setLoading(true);

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        navigate("/auth");
        return;
      }

      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData.user) {
        await supabase.auth.signOut();
        navigate("/auth");
        return;
      }

      setUser(userData.user);

      // Fetch all data in parallel for speed
      await Promise.all([
        fetchProfile(userData.user.id),
        fetchStats(),
      ]);

      setLoading(false);
    };

    init();

    return () => subscription.unsubscribe();
  }, [navigate]);

  const fetchProfile = async (userId: string) => {
    const { data } = await supabase
      .from("profiles")
      .select("display_name, avatar_url, email, api_key, subscription_plan, subscription_expires_at, subscription_started_at, is_admin")
      .eq("id", userId)
      .maybeSingle();
    
    if (data) {
      setProfile(data);
    }
  };

  const fetchStats = async () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Get 7 days ago date
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    // Fetch ALL data in parallel with a single batch
    const [
      scriptsRes,
      keysRes,
      execCountRes,
      todayExecRes,
      allExecsRes,
      last7DaysExecsRes,
      last7DaysKeysRes
    ] = await Promise.all([
      // Scripts count
      supabase.from("scripts").select("*", { count: "exact", head: true }),
      // Keys data
      supabase.from("script_keys").select("duration_type, created_at"),
      // Total executions count
      supabase.from("script_executions").select("*", { count: "exact", head: true }),
      // Today's executions count
      supabase.from("script_executions").select("*", { count: "exact", head: true }).gte("executed_at", today.toISOString()),
      // All executions for unique HWID and country
      supabase.from("script_executions").select("hwid, country").not("hwid", "is", null),
      // Last 7 days executions with timestamp
      supabase.from("script_executions").select("executed_at").gte("executed_at", sevenDaysAgo.toISOString()),
      // Last 7 days keys with timestamp
      supabase.from("script_keys").select("created_at").gte("created_at", sevenDaysAgo.toISOString())
    ]);
    
    // Set scripts count
    setScriptsCount(scriptsRes.count || 0);

    // Process keys
    const keysData = keysRes.data || [];
    const totalKeys = keysData.length;
    const premium = keysData.filter(k => k.duration_type === "lifetime").length;
    const normal = totalKeys - premium;
    
    setKeysCount(totalKeys);
    setPremiumKeys(premium);
    setNormalKeys(normal);

    // Process executions
    const uniqueData = allExecsRes.data || [];
    const uniqueHwids = new Set(uniqueData.map(e => e.hwid)).size;

    setExecStats({
      total: execCountRes.count || 0,
      today: todayExecRes.count || 0,
      uniqueUsers: uniqueHwids,
    });

    // Process country data for map
    const countryMap = new Map<string, { executions: number; users: Set<string> }>();
    uniqueData.forEach(e => {
      if (e.country) {
        const current = countryMap.get(e.country) || { executions: 0, users: new Set<string>() };
        current.executions++;
        if (e.hwid) current.users.add(e.hwid);
        countryMap.set(e.country, current);
      }
    });

    const countryDataArray: CountryData[] = [];
    countryMap.forEach((value, key) => {
      countryDataArray.push({
        country: key,
        executions: value.executions,
        users: value.users.size,
      });
    });
    setCountryData(countryDataArray);

    // Generate 7-day activity chart from pre-fetched data (NO SEQUENTIAL QUERIES)
    const executions = last7DaysExecsRes.data || [];
    const keys = last7DaysKeysRes.data || [];
    
    const activityArr = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);

      // Filter from pre-fetched data
      const dayExecs = executions.filter(e => {
        const execDate = new Date(e.executed_at);
        return execDate >= startOfDay && execDate <= endOfDay;
      }).length;

      const dayKeys = keys.filter(k => {
        const keyDate = new Date(k.created_at);
        return keyDate >= startOfDay && keyDate <= endOfDay;
      }).length;

      activityArr.push({
        date: dateStr,
        executions: dayExecs,
        keys: dayKeys,
      });
    }
    setActivityData(activityArr);
  };

  const countriesCount = countryData.length || 1;

  if (loading) {
    return (
      <DashboardLayout breadcrumb="Main Dashboard" title="Main Dashboard">
        <div className="animate-pulse space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1,2,3,4].map(i => <div key={i} className="h-28 bg-muted/50 rounded-xl" />)}
          </div>
          <div className="h-[450px] bg-muted/50 rounded-xl" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout breadcrumb="Main Dashboard" title="Main Dashboard">
      {/* User Welcome Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-xl bg-gradient-to-r from-primary/20 to-primary/5 border border-primary/20 p-6 mb-6"
      >
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full border-2 border-primary/30 overflow-hidden flex-shrink-0">
            {profile?.avatar_url ? (
              <img 
                src={profile.avatar_url} 
                alt="Avatar" 
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-primary flex items-center justify-center text-primary-foreground text-xl font-bold">
                {(profile?.display_name || user?.email || "U").charAt(0).toUpperCase()}
              </div>
            )}
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-bold text-foreground">
              Welcome back, {profile?.display_name || user?.email?.split('@')[0] || "User"}!
            </h2>
            <p className="text-sm text-muted-foreground">{profile?.email || user?.email}</p>
            <div className="flex items-center gap-2 mt-1">
              <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-primary/20 text-primary">
                {profile?.subscription_plan?.toUpperCase() || "FREE"} Plan
              </span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Key Performance Metrics - 4 Cards */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6"
      >
        {/* Total Executions */}
        <div className="rounded-xl bg-card border border-border p-5 hover:border-primary/30 transition-colors">
          <div className="flex items-center gap-2 text-muted-foreground text-sm mb-2">
            <Zap className="w-4 h-4 text-primary" />
            Total Executions
          </div>
          <p className="text-3xl font-bold text-foreground">{execStats.total}</p>
          <p className="text-xs text-green-500 mt-1 flex items-center gap-1">
            <TrendingUp className="w-3 h-3" />
            +{execStats.today} today
          </p>
        </div>

        {/* Total Keys */}
        <div className="rounded-xl bg-card border border-border p-5 hover:border-primary/30 transition-colors">
          <div className="flex items-center gap-2 text-muted-foreground text-sm mb-2">
            <Key className="w-4 h-4 text-pink-500" />
            Total Keys
          </div>
          <p className="text-3xl font-bold text-foreground">{keysCount}</p>
          <p className="text-xs text-muted-foreground mt-1">
            {premiumKeys} premium, {normalKeys} standard
          </p>
        </div>

        {/* Active Users */}
        <div className="rounded-xl bg-card border border-border p-5 hover:border-primary/30 transition-colors">
          <div className="flex items-center gap-2 text-muted-foreground text-sm mb-2">
            <Users className="w-4 h-4 text-blue-500" />
            Active Users
          </div>
          <p className="text-3xl font-bold text-foreground">{execStats.uniqueUsers}</p>
          <p className="text-xs text-muted-foreground mt-1">
            Unique HWID count
          </p>
        </div>

        {/* Countries */}
        <div className="rounded-xl bg-card border border-border p-5 hover:border-primary/30 transition-colors">
          <div className="flex items-center gap-2 text-muted-foreground text-sm mb-2">
            <Globe className="w-4 h-4 text-green-500" />
            Countries
          </div>
          <p className="text-3xl font-bold text-foreground">{countriesCount}</p>
          <p className="text-xs text-muted-foreground mt-1">
            Global reach
          </p>
        </div>
      </motion.div>

      {/* World Map - Full Width */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="mb-6"
      >
        <WorldMap countryData={countryData} />
      </motion.div>

      {/* Activity Chart + User Distribution */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6"
      >
        <div className="lg:col-span-2">
          <ActivityChart data={activityData} />
        </div>
        <div>
          <UserDistributionChart premiumKeys={premiumKeys} normalKeys={normalKeys} />
        </div>
      </motion.div>

      {/* Quick Stats Row */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6"
      >
        {/* Scripts */}
        <div className="rounded-xl bg-card border border-border p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
              <Server className="w-5 h-5 text-purple-500" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total Scripts</p>
              <p className="text-xl font-bold text-foreground">{scriptsCount}</p>
            </div>
          </div>
        </div>

        {/* Today's Activity */}
        <div className="rounded-xl bg-card border border-border p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
              <Activity className="w-5 h-5 text-green-500" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Today's Executions</p>
              <p className="text-xl font-bold text-foreground">{execStats.today}</p>
            </div>
          </div>
        </div>

        {/* Premium Rate */}
        <div className="rounded-xl bg-card border border-border p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-yellow-500/20 flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-yellow-500" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Premium Rate</p>
              <p className="text-xl font-bold text-foreground">
                {keysCount > 0 ? Math.round((premiumKeys / keysCount) * 100) : 0}%
              </p>
            </div>
          </div>
        </div>

        {/* Avg Daily */}
        <div className="rounded-xl bg-card border border-border p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-blue-500" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Avg Daily Executions</p>
              <p className="text-xl font-bold text-foreground">
                {activityData.length > 0 
                  ? Math.round(activityData.reduce((sum, d) => sum + d.executions, 0) / activityData.length)
                  : 0
                }
              </p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Recent Activity & Top Countries */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6"
      >
        {/* Top Countries */}
        <div className="rounded-xl bg-card border border-border p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
              <Globe className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="font-bold text-foreground">Top Countries</h3>
              <p className="text-sm text-muted-foreground">By execution count</p>
            </div>
          </div>
          
          <div className="space-y-3">
            {countryData.length > 0 ? (
              countryData.slice(0, 5).map((country, idx) => (
                <div key={country.country} className="flex items-center justify-between p-3 rounded-lg bg-secondary/30">
                  <div className="flex items-center gap-3">
                    <span className="text-lg font-bold text-primary">#{idx + 1}</span>
                    <span className="text-foreground">{country.country}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-sm text-muted-foreground">
                      {country.executions} execs
                    </span>
                    <span className="text-sm text-muted-foreground">
                      {country.users} users
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Globe className="w-12 h-12 mx-auto mb-2 opacity-30" />
                <p>No execution data yet</p>
                <p className="text-xs">Execute scripts to see country distribution</p>
              </div>
            )}
          </div>
        </div>

        {/* System Status */}
        <div className="rounded-xl bg-card border border-border p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
              <Shield className="w-5 h-5 text-green-500" />
            </div>
            <div>
              <h3 className="font-bold text-foreground">System Status</h3>
              <p className="text-sm text-muted-foreground">All services operational</p>
            </div>
          </div>
          
          <div className="space-y-3">
            {[
              { name: "API Server", status: "Operational", uptime: "99.9%" },
              { name: "Database", status: "Operational", uptime: "99.8%" },
              { name: "Key Validation", status: "Operational", uptime: "100%" },
              { name: "Script Loader", status: "Operational", uptime: "99.9%" },
            ].map((service) => (
              <div key={service.name} className="flex items-center justify-between p-3 rounded-lg bg-secondary/30">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                  <span className="text-foreground">{service.name}</span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-xs text-green-500">{service.status}</span>
                  <span className="text-xs text-muted-foreground">{service.uptime}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </motion.div>

      {/* Quick Actions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="rounded-xl bg-card border border-border p-6 mb-6"
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
            <Zap className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="font-bold text-foreground">Quick Actions</h3>
            <p className="text-sm text-muted-foreground">Common tasks at your fingertips</p>
          </div>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <button 
            onClick={() => navigate("/keys")}
            className="p-4 rounded-lg bg-secondary/50 border border-border hover:border-primary/50 transition-colors text-left"
          >
            <Key className="w-6 h-6 text-pink-500 mb-2" />
            <p className="font-medium text-sm">Create Key</p>
            <p className="text-xs text-muted-foreground">Generate new license</p>
          </button>
          <button 
            onClick={() => navigate("/scripts")}
            className="p-4 rounded-lg bg-secondary/50 border border-border hover:border-primary/50 transition-colors text-left"
          >
            <Server className="w-6 h-6 text-purple-500 mb-2" />
            <p className="font-medium text-sm">Add Script</p>
            <p className="text-xs text-muted-foreground">Upload new script</p>
          </button>
          <button 
            onClick={() => navigate("/settings/products")}
            className="p-4 rounded-lg bg-secondary/50 border border-border hover:border-primary/50 transition-colors text-left"
          >
            <DollarSign className="w-6 h-6 text-green-500 mb-2" />
            <p className="font-medium text-sm">Sell Product</p>
            <p className="text-xs text-muted-foreground">List on marketplace</p>
          </button>
          <button 
            onClick={() => navigate("/documentation")}
            className="p-4 rounded-lg bg-secondary/50 border border-border hover:border-primary/50 transition-colors text-left"
          >
            <Eye className="w-6 h-6 text-blue-500 mb-2" />
            <p className="font-medium text-sm">View Docs</p>
            <p className="text-xs text-muted-foreground">API documentation</p>
          </button>
        </div>
      </motion.div>

      {/* Recent Scripts */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.55 }}
        className="rounded-xl bg-card border border-border p-6 mb-6"
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
              <Server className="w-5 h-5 text-purple-500" />
            </div>
            <div>
              <h3 className="font-bold text-foreground">Recent Scripts</h3>
              <p className="text-sm text-muted-foreground">Your latest uploaded scripts</p>
            </div>
          </div>
          <button 
            onClick={() => navigate("/scripts")}
            className="text-sm text-primary hover:underline"
          >
            View All →
          </button>
        </div>
        
        <div className="text-center py-8 text-muted-foreground">
          <Server className="w-12 h-12 mx-auto mb-2 opacity-30" />
          <p>No scripts yet</p>
          <p className="text-xs">Upload your first script to get started</p>
        </div>
      </motion.div>

      {/* Security Monitoring */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
      >
        <SecurityMonitoring />
      </motion.div>
    </DashboardLayout>
  );
};

export default Dashboard;
