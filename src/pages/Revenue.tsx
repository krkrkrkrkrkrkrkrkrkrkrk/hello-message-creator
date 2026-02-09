import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { 
  DollarSign, TrendingUp, Eye, MousePointerClick, 
  ArrowUpRight, ArrowDownRight, Calendar, Globe,
  BarChart3, Wallet, RefreshCw, ExternalLink, Key, Copy, Settings
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
} from "recharts";

interface RevenueStats {
  totalRevenue: number;
  todayRevenue: number;
  totalViews: number;
  totalClicks: number;
  cpm: number;
  changePercent: number;
}

interface DailyRevenue {
  date: string;
  revenue: number;
  views: number;
  clicks: number;
}

// Mock data - in production, this would come from LootLabs API
const generateMockData = (): DailyRevenue[] => {
  const data: DailyRevenue[] = [];
  const today = new Date();
  
  for (let i = 29; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    data.push({
      date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      revenue: Math.random() * 50 + 10,
      views: Math.floor(Math.random() * 1000 + 200),
      clicks: Math.floor(Math.random() * 100 + 20),
    });
  }
  return data;
};

const COUNTRY_DATA = [
  { country: "United States", code: "US", revenue: 245.50, percentage: 35 },
  { country: "Germany", code: "DE", revenue: 120.30, percentage: 17 },
  { country: "United Kingdom", code: "UK", revenue: 98.20, percentage: 14 },
  { country: "France", code: "FR", revenue: 76.40, percentage: 11 },
  { country: "Brazil", code: "BR", revenue: 54.10, percentage: 8 },
  { country: "Other", code: "XX", revenue: 105.50, percentage: 15 },
];

export default function Revenue() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [dateRange, setDateRange] = useState("30d");
  const [apiKey, setApiKey] = useState("");
  const [isConfigured, setIsConfigured] = useState(false);
  const [showApiKeyInput, setShowApiKeyInput] = useState(false);
  const [chartData, setChartData] = useState<DailyRevenue[]>([]);
  const [stats, setStats] = useState<RevenueStats>({
    totalRevenue: 0,
    todayRevenue: 0,
    totalViews: 0,
    totalClicks: 0,
    cpm: 0,
    changePercent: 0,
  });

  useEffect(() => {
    loadData();
  }, [dateRange]);

  const loadData = async () => {
    setLoading(true);
    
    // Check for stored API key
    const storedKey = localStorage.getItem("lootlabs_api_key");
    if (storedKey) {
      setApiKey(storedKey);
      setIsConfigured(true);
      
      // In production, fetch real data from LootLabs API
      // For now, use mock data
      const mockData = generateMockData();
      setChartData(mockData);
      
      const totalRevenue = mockData.reduce((sum, d) => sum + d.revenue, 0);
      const totalViews = mockData.reduce((sum, d) => sum + d.views, 0);
      const totalClicks = mockData.reduce((sum, d) => sum + d.clicks, 0);
      
      setStats({
        totalRevenue,
        todayRevenue: mockData[mockData.length - 1]?.revenue || 0,
        totalViews,
        totalClicks,
        cpm: (totalRevenue / totalViews) * 1000,
        changePercent: Math.random() * 20 - 5,
      });
    }
    
    setLoading(false);
  };

  const handleSaveApiKey = () => {
    if (!apiKey.trim()) {
      toast.error("Please enter your LootLabs API key");
      return;
    }
    
    localStorage.setItem("lootlabs_api_key", apiKey);
    setIsConfigured(true);
    setShowApiKeyInput(false);
    toast.success("LootLabs API key saved!");
    loadData();
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
    toast.success("Revenue data refreshed");
  };

  const StatCard = ({ 
    title, 
    value, 
    icon: Icon, 
    change, 
    prefix = "",
    suffix = "",
    color = "primary"
  }: { 
    title: string; 
    value: number | string; 
    icon: any; 
    change?: number;
    prefix?: string;
    suffix?: string;
    color?: string;
  }) => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl bg-card border border-border p-6"
    >
      <div className="flex items-center justify-between mb-4">
        <div className={`w-12 h-12 rounded-xl bg-${color}/20 flex items-center justify-center`}>
          <Icon className={`w-6 h-6 text-${color}`} />
        </div>
        {change !== undefined && (
          <Badge 
            variant="secondary" 
            className={change >= 0 ? "bg-green-500/20 text-green-500" : "bg-red-500/20 text-red-500"}
          >
            {change >= 0 ? <ArrowUpRight className="w-3 h-3 mr-1" /> : <ArrowDownRight className="w-3 h-3 mr-1" />}
            {Math.abs(change).toFixed(1)}%
          </Badge>
        )}
      </div>
      <p className="text-sm text-muted-foreground mb-1">{title}</p>
      <p className="text-2xl font-bold">
        {prefix}{typeof value === 'number' ? value.toLocaleString(undefined, { maximumFractionDigits: 2 }) : value}{suffix}
      </p>
    </motion.div>
  );

  if (!isConfigured && !showApiKeyInput) {
    return (
      <DashboardLayout breadcrumb="Revenue" title="Revenue Dashboard">
        <div className="flex items-center justify-center min-h-[60vh]">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="max-w-md w-full text-center"
          >
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-green-500/20 to-emerald-500/20 flex items-center justify-center mx-auto mb-6">
              <DollarSign className="w-10 h-10 text-green-500" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Connect LootLabs</h2>
            <p className="text-muted-foreground mb-6">
              Connect your LootLabs account to view revenue statistics, CPM, and earnings from your monetized links.
            </p>
            <div className="space-y-3">
              <Button 
                className="w-full gap-2" 
                onClick={() => setShowApiKeyInput(true)}
              >
                <Key className="w-4 h-4" />
                Connect with API Key
              </Button>
              <Button 
                variant="outline" 
                className="w-full gap-2"
                onClick={() => window.open("https://lootlabs.gg/", "_blank")}
              >
                <ExternalLink className="w-4 h-4" />
                Create LootLabs Account
              </Button>
            </div>
          </motion.div>
        </div>
      </DashboardLayout>
    );
  }

  if (showApiKeyInput) {
    return (
      <DashboardLayout breadcrumb="Revenue" title="Revenue Dashboard">
        <div className="flex items-center justify-center min-h-[60vh]">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="max-w-md w-full"
          >
            <div className="rounded-xl bg-card border border-border p-6">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center mx-auto mb-6">
                <Key className="w-8 h-8 text-primary" />
              </div>
              <h2 className="text-xl font-bold text-center mb-2">Enter LootLabs API Key</h2>
              <p className="text-sm text-muted-foreground text-center mb-6">
                You can find your API key in the LootLabs dashboard under Profile Settings &gt; Advanced Tab
              </p>
              <div className="space-y-4">
                <Input
                  type="password"
                  placeholder="Enter your LootLabs API key..."
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  className="bg-secondary border-border"
                />
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    className="flex-1"
                    onClick={() => setShowApiKeyInput(false)}
                  >
                    Cancel
                  </Button>
                  <Button 
                    className="flex-1"
                    onClick={handleSaveApiKey}
                  >
                    Connect
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout breadcrumb="Revenue" title="Revenue Dashboard">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6"
      >
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-green-500/20 to-emerald-500/20 flex items-center justify-center">
              <DollarSign className="w-7 h-7 text-green-500" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-foreground">Revenue Dashboard</h2>
              <p className="text-sm text-muted-foreground">Track your LootLabs earnings and statistics</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger className="w-[140px] bg-card border-border">
                <Calendar className="w-4 h-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">Last 7 days</SelectItem>
                <SelectItem value="30d">Last 30 days</SelectItem>
                <SelectItem value="90d">Last 90 days</SelectItem>
              </SelectContent>
            </Select>
            <Button 
              variant="outline" 
              size="icon"
              onClick={handleRefresh}
              disabled={refreshing}
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            </Button>
            <Button 
              variant="outline" 
              size="icon"
              onClick={() => setShowApiKeyInput(true)}
            >
              <Settings className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </motion.div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          title="Total Revenue"
          value={stats.totalRevenue}
          icon={DollarSign}
          prefix="$"
          change={stats.changePercent}
          color="green-500"
        />
        <StatCard
          title="Today's Earnings"
          value={stats.todayRevenue}
          icon={Wallet}
          prefix="$"
          color="blue-500"
        />
        <StatCard
          title="Total Views"
          value={stats.totalViews}
          icon={Eye}
          color="purple-500"
        />
        <StatCard
          title="Average CPM"
          value={stats.cpm}
          icon={TrendingUp}
          prefix="$"
          color="orange-500"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Revenue Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="rounded-xl bg-card border border-border p-6"
        >
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="font-bold">Revenue Over Time</h3>
              <p className="text-sm text-muted-foreground">Daily earnings from LootLabs</p>
            </div>
            <Badge variant="secondary" className="bg-green-500/20 text-green-500">
              +{stats.changePercent.toFixed(1)}%
            </Badge>
          </div>
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis 
                dataKey="date" 
                stroke="hsl(var(--muted-foreground))" 
                fontSize={12}
                tickLine={false}
              />
              <YAxis 
                stroke="hsl(var(--muted-foreground))" 
                fontSize={12}
                tickLine={false}
                tickFormatter={(value) => `$${value}`}
              />
              <Tooltip 
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                }}
                formatter={(value: number) => [`$${value.toFixed(2)}`, 'Revenue']}
              />
              <Area
                type="monotone"
                dataKey="revenue"
                stroke="hsl(var(--primary))"
                fill="url(#revenueGradient)"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Views & Clicks Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="rounded-xl bg-card border border-border p-6"
        >
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="font-bold">Views & Clicks</h3>
              <p className="text-sm text-muted-foreground">User engagement metrics</p>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={chartData.slice(-7)}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis 
                dataKey="date" 
                stroke="hsl(var(--muted-foreground))" 
                fontSize={12}
                tickLine={false}
              />
              <YAxis 
                stroke="hsl(var(--muted-foreground))" 
                fontSize={12}
                tickLine={false}
              />
              <Tooltip 
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                }}
              />
              <Bar dataKey="views" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              <Bar dataKey="clicks" fill="hsl(217 91% 60%)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>
      </div>

      {/* Country Breakdown */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="rounded-xl bg-card border border-border p-6"
      >
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
              <Globe className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="font-bold">Revenue by Country</h3>
              <p className="text-sm text-muted-foreground">Geographic breakdown of earnings</p>
            </div>
          </div>
        </div>
        <div className="space-y-4">
          {COUNTRY_DATA.map((country, index) => (
            <motion.div
              key={country.code}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 * index }}
              className="flex items-center gap-4"
            >
              <div className="w-10 text-center">
                <span className="text-lg">{country.code === "US" ? "🇺🇸" : 
                  country.code === "DE" ? "🇩🇪" : 
                  country.code === "UK" ? "🇬🇧" : 
                  country.code === "FR" ? "🇫🇷" : 
                  country.code === "BR" ? "🇧🇷" : "🌍"}</span>
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium">{country.country}</span>
                  <span className="text-sm text-muted-foreground">${country.revenue.toFixed(2)}</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${country.percentage}%` }}
                    transition={{ duration: 0.5, delay: 0.1 * index }}
                    className="bg-primary h-2 rounded-full"
                  />
                </div>
              </div>
              <span className="text-sm text-muted-foreground w-12 text-right">
                {country.percentage}%
              </span>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </DashboardLayout>
  );
}
