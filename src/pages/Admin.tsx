import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Shield, Plus, Trash2, Loader2, Tag, Percent, Calendar, Users, 
  Copy, Check, Crown, ArrowLeft, ToggleLeft, ToggleRight, Key,
  Clock, UserCircle, Mail, Search, ChevronDown, ChevronUp, Ban,
  RefreshCw, Eye, EyeOff, DollarSign, TrendingUp, Activity, ShoppingCart,
  Server, Zap, AlertTriangle, Globe
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface PromoCode {
  id: string;
  code: string;
  discount_percent: number;
  expires_at: string | null;
  max_uses: number | null;
  current_uses: number;
  is_active: boolean;
  created_at: string;
}

interface UserProfile {
  id: string;
  email: string | null;
  display_name: string | null;
  subscription_plan: string | null;
  subscription_started_at: string | null;
  subscription_expires_at: string | null;
  created_at: string;
  is_admin: boolean | null;
  discord_id: string | null;
}

interface ScriptKey {
  id: string;
  key_value: string;
  script_id: string;
  script_name: string;
  is_banned: boolean;
  hwid: string | null;
  discord_id: string | null;
  expires_at: string | null;
  created_at: string;
  execution_count: number;
  note: string | null;
}

interface Sale {
  id: string;
  user_email: string;
  plan_name: string;
  amount: number;
  discount_percent: number;
  promo_code: string | null;
  duration_days: number | null;
  payment_method: string;
  status: string;
  created_at: string;
}

interface SalesStats {
  total_sales: number;
  total_revenue: number;
  today_sales: number;
  today_revenue: number;
  week_sales: number;
  week_revenue: number;
  month_sales: number;
  month_revenue: number;
}

interface ApiStats {
  total_requests: number;
  requests_24h: number;
  requests_1h: number;
  error_count: number;
  unique_ips: number;
  avg_response_time_ms: number;
}

interface EndpointStats {
  [endpoint: string]: {
    count: number;
    errors: number;
  };
}

const Admin = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [activeTab, setActiveTab] = useState("sales");
  
  // Promo codes state
  const [promoCodes, setPromoCodes] = useState<PromoCode[]>([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [creating, setCreating] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  
  // Users state
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [userSearch, setUserSearch] = useState("");
  const [expandedUser, setExpandedUser] = useState<string | null>(null);
  const [userKeys, setUserKeys] = useState<Record<string, ScriptKey[]>>({});
  const [keysLoading, setKeysLoading] = useState<string | null>(null);
  
  // Sales state
  const [sales, setSales] = useState<Sale[]>([]);
  const [salesLoading, setSalesLoading] = useState(false);
  const [salesStats, setSalesStats] = useState<SalesStats | null>(null);
  
  // API Stats state
  const [apiStats, setApiStats] = useState<ApiStats | null>(null);
  const [endpointStats, setEndpointStats] = useState<EndpointStats>({});
  const [apiStatsLoading, setApiStatsLoading] = useState(false);
  
  // Extend subscription modal
  const [showExtendModal, setShowExtendModal] = useState<string | null>(null);
  const [extendDays, setExtendDays] = useState("30");
  const [extendPlan, setExtendPlan] = useState("Basic");

  // Form state
  const [newCode, setNewCode] = useState("");
  const [discountPercent, setDiscountPercent] = useState("10");
  const [maxUses, setMaxUses] = useState("");
  const [expiresInDays, setExpiresInDays] = useState("");

  useEffect(() => {
    checkAdminAndLoad();
  }, []);

  // Set up realtime subscription for sales
  useEffect(() => {
    if (!isAdmin) return;

    const channel = supabase
      .channel('sales-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'sales'
        },
        (payload) => {
          console.log('New sale:', payload);
          const newSale = payload.new as Sale;
          setSales(prev => [newSale, ...prev]);
          toast.success(`New sale: ${newSale.plan_name} - $${newSale.amount}`, {
            icon: <DollarSign className="w-4 h-4 text-emerald-500" />
          });
          // Refresh stats
          loadSalesStats();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isAdmin]);

  const checkAdminAndLoad = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        navigate("/auth");
        return;
      }

      const { data: hasAdminRole, error } = await supabase.rpc('has_role', {
        _user_id: user.id,
        _role: 'admin'
      });

      if (error || !hasAdminRole) {
        toast.error("Access denied. Admins only.");
        navigate("/dashboard");
        return;
      }

      setIsAdmin(true);
      await Promise.all([loadPromoCodes(), loadSales(), loadSalesStats()]);
    } catch (error) {
      console.error("Error checking admin:", error);
      navigate("/dashboard");
    } finally {
      setLoading(false);
    }
  };

  const loadPromoCodes = async () => {
    const { data, error } = await supabase
      .from("promo_codes")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error loading promo codes:", error);
      return;
    }

    setPromoCodes(data || []);
  };

  const loadSales = async () => {
    setSalesLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-manage-user`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify({ action: 'get_sales' }),
        }
      );

      const data = await response.json();
      if (data.error) throw new Error(data.error);
      
      setSales(data.sales || []);
    } catch (error: any) {
      console.error("Error loading sales:", error);
      toast.error("Failed to load sales");
    } finally {
      setSalesLoading(false);
    }
  };

  const loadSalesStats = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-manage-user`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify({ action: 'get_sales_stats' }),
        }
      );

      const data = await response.json();
      if (data.error) throw new Error(data.error);
      
      setSalesStats(data.stats || null);
    } catch (error: any) {
      console.error("Error loading sales stats:", error);
    }
  };

  const loadApiStats = async () => {
    setApiStatsLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-manage-user`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify({ action: 'get_api_stats' }),
        }
      );

      const data = await response.json();
      if (data.error) throw new Error(data.error);
      
      setApiStats(data.stats || null);
      setEndpointStats(data.endpoints || {});
    } catch (error: any) {
      console.error("Error loading API stats:", error);
      toast.error("Failed to load API stats");
    } finally {
      setApiStatsLoading(false);
    }
  };

  const loadUsers = async () => {
    setUsersLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-manage-user`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify({ action: 'get_all_users' }),
        }
      );

      const data = await response.json();
      if (data.error) throw new Error(data.error);
      
      setUsers(data.profiles || []);
    } catch (error: any) {
      console.error("Error loading users:", error);
      toast.error("Failed to load users");
    } finally {
      setUsersLoading(false);
    }
  };

  const loadUserKeys = async (userId: string) => {
    setKeysLoading(userId);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-manage-user`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify({ action: 'get_user_keys', userId }),
        }
      );

      const data = await response.json();
      if (data.error) throw new Error(data.error);
      
      setUserKeys(prev => ({ ...prev, [userId]: data.keys || [] }));
    } catch (error: any) {
      console.error("Error loading keys:", error);
      toast.error("Failed to load keys");
    } finally {
      setKeysLoading(null);
    }
  };

  const toggleUserExpand = async (userId: string) => {
    if (expandedUser === userId) {
      setExpandedUser(null);
    } else {
      setExpandedUser(userId);
      if (!userKeys[userId]) {
        await loadUserKeys(userId);
      }
    }
  };

  const extendSubscription = async (userId: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-manage-user`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify({ 
            action: 'extend_subscription', 
            userId,
            days: parseInt(extendDays),
            plan: extendPlan
          }),
        }
      );

      const data = await response.json();
      if (data.error) throw new Error(data.error);
      
      toast.success(`Subscription extended by ${extendDays} days`);
      setShowExtendModal(null);
      await loadUsers();
    } catch (error: any) {
      toast.error(error.message || "Failed to extend subscription");
    }
  };

  const setUserSubscription = async (userId: string, plan: string | null, days: number | null) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-manage-user`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify({ 
            action: 'set_subscription', 
            userId,
            plan,
            days
          }),
        }
      );

      const data = await response.json();
      if (data.error) throw new Error(data.error);
      
      toast.success(plan ? `Subscription set to ${plan}` : "Subscription removed");
      await loadUsers();
    } catch (error: any) {
      toast.error(error.message || "Failed to update subscription");
    }
  };

  const toggleKeyBan = async (keyId: string, currentBan: boolean, userId: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-manage-user`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify({ 
            action: 'update_key', 
            keyId,
            updates: { is_banned: !currentBan }
          }),
        }
      );

      const data = await response.json();
      if (data.error) throw new Error(data.error);
      
      toast.success(!currentBan ? "Key banned" : "Key unbanned");
      await loadUserKeys(userId);
    } catch (error: any) {
      toast.error(error.message || "Failed to update key");
    }
  };

  const resetKeyHwid = async (keyId: string, userId: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-manage-user`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify({ 
            action: 'update_key', 
            keyId,
            updates: { hwid: null }
          }),
        }
      );

      const data = await response.json();
      if (data.error) throw new Error(data.error);
      
      toast.success("HWID reset");
      await loadUserKeys(userId);
    } catch (error: any) {
      toast.error(error.message || "Failed to reset HWID");
    }
  };

  const deleteKey = async (keyId: string, userId: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-manage-user`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify({ action: 'delete_key', keyId }),
        }
      );

      const data = await response.json();
      if (data.error) throw new Error(data.error);
      
      toast.success("Key deleted");
      await loadUserKeys(userId);
    } catch (error: any) {
      toast.error(error.message || "Failed to delete key");
    }
  };

  const generateRandomCode = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let code = "";
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setNewCode(code);
  };

  const handleCreatePromoCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const expiresAt = expiresInDays 
        ? new Date(Date.now() + parseInt(expiresInDays) * 24 * 60 * 60 * 1000).toISOString()
        : null;

      const { error } = await supabase.from("promo_codes").insert({
        code: newCode.toUpperCase(),
        discount_percent: parseInt(discountPercent),
        max_uses: maxUses ? parseInt(maxUses) : null,
        expires_at: expiresAt,
        created_by: user?.id,
      });

      if (error) throw error;

      toast.success("Promo code created!");
      setShowCreateForm(false);
      setNewCode("");
      setDiscountPercent("10");
      setMaxUses("");
      setExpiresInDays("");
      await loadPromoCodes();
    } catch (error: any) {
      toast.error(error.message || "Failed to create promo code");
    } finally {
      setCreating(false);
    }
  };

  const togglePromoCode = async (id: string, currentStatus: boolean) => {
    const { error } = await supabase
      .from("promo_codes")
      .update({ is_active: !currentStatus })
      .eq("id", id);

    if (error) {
      toast.error("Failed to update status");
      return;
    }

    setPromoCodes(prev => 
      prev.map(code => 
        code.id === id ? { ...code, is_active: !currentStatus } : code
      )
    );
    toast.success(`Promo code ${!currentStatus ? "activated" : "deactivated"}`);
  };

  const deletePromoCode = async (id: string) => {
    const { error } = await supabase
      .from("promo_codes")
      .delete()
      .eq("id", id);

    if (error) {
      toast.error("Failed to delete promo code");
      return;
    }

    setPromoCodes(prev => prev.filter(code => code.id !== id));
    toast.success("Promo code deleted");
  };

  const copyCode = async (code: string, id: string) => {
    await navigator.clipboard.writeText(code);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const filteredUsers = users.filter(user => 
    user.email?.toLowerCase().includes(userSearch.toLowerCase()) ||
    user.display_name?.toLowerCase().includes(userSearch.toLowerCase())
  );

  const getSubscriptionStatus = (user: UserProfile) => {
    if (!user.subscription_plan) return { status: "none", label: "No Plan", color: "text-muted-foreground" };
    
    if (!user.subscription_expires_at) return { status: "lifetime", label: "Lifetime", color: "text-emerald-500" };
    
    const expiresAt = new Date(user.subscription_expires_at);
    const now = new Date();
    
    if (expiresAt < now) return { status: "expired", label: "Expired", color: "text-destructive" };
    
    const daysLeft = Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return { 
      status: "active", 
      label: `${daysLeft} days left`, 
      color: daysLeft < 7 ? "text-yellow-500" : "text-emerald-500" 
    };
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAdmin) return null;

  return (
    <div className="min-h-screen bg-background">
      <div className="fixed inset-0 bg-gradient-radial from-primary/5 via-transparent to-transparent pointer-events-none" />

      <div className="relative z-10 container max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/dashboard")}
              className="rounded-xl"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <div className="flex items-center gap-2">
                <Crown className="w-6 h-6 text-primary" />
                <h1 className="text-3xl font-bold">Admin Panel</h1>
              </div>
              <p className="text-muted-foreground mt-1">Manage users, subscriptions & promo codes</p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={(v) => {
          setActiveTab(v);
          if (v === "users" && users.length === 0) loadUsers();
          if (v === "api" && !apiStats) loadApiStats();
        }}>
          <TabsList className="mb-6">
            <TabsTrigger value="sales" className="gap-2">
              <DollarSign className="w-4 h-4" />
              Live Sales
            </TabsTrigger>
            <TabsTrigger value="api" className="gap-2">
              <Server className="w-4 h-4" />
              API Requests
            </TabsTrigger>
            <TabsTrigger value="promo" className="gap-2">
              <Tag className="w-4 h-4" />
              Promo Codes
            </TabsTrigger>
            <TabsTrigger value="users" className="gap-2">
              <Users className="w-4 h-4" />
              Users & Subscriptions
            </TabsTrigger>
          </TabsList>

          {/* Sales Tab */}
          <TabsContent value="sales">
            <div className="space-y-6">
              {/* Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="glass-card rounded-2xl p-5 border border-border/50"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                      <DollarSign className="w-5 h-5 text-emerald-500" />
                    </div>
                    <span className="text-sm text-muted-foreground">Today</span>
                  </div>
                  <div className="text-2xl font-bold">${salesStats?.today_revenue?.toFixed(2) || "0.00"}</div>
                  <div className="text-sm text-muted-foreground">{salesStats?.today_sales || 0} sales</div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="glass-card rounded-2xl p-5 border border-border/50"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                      <TrendingUp className="w-5 h-5 text-blue-500" />
                    </div>
                    <span className="text-sm text-muted-foreground">This Week</span>
                  </div>
                  <div className="text-2xl font-bold">${salesStats?.week_revenue?.toFixed(2) || "0.00"}</div>
                  <div className="text-sm text-muted-foreground">{salesStats?.week_sales || 0} sales</div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="glass-card rounded-2xl p-5 border border-border/50"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center">
                      <Calendar className="w-5 h-5 text-purple-500" />
                    </div>
                    <span className="text-sm text-muted-foreground">This Month</span>
                  </div>
                  <div className="text-2xl font-bold">${salesStats?.month_revenue?.toFixed(2) || "0.00"}</div>
                  <div className="text-sm text-muted-foreground">{salesStats?.month_sales || 0} sales</div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="glass-card rounded-2xl p-5 border border-border/50"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                      <ShoppingCart className="w-5 h-5 text-primary" />
                    </div>
                    <span className="text-sm text-muted-foreground">All Time</span>
                  </div>
                  <div className="text-2xl font-bold">${salesStats?.total_revenue?.toFixed(2) || "0.00"}</div>
                  <div className="text-sm text-muted-foreground">{salesStats?.total_sales || 0} sales</div>
                </motion.div>
              </div>

              {/* Live indicator */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-sm text-muted-foreground">Live updates enabled</span>
                </div>
                <Button variant="outline" onClick={() => { loadSales(); loadSalesStats(); }} disabled={salesLoading} className="gap-2">
                  <RefreshCw className={`w-4 h-4 ${salesLoading ? "animate-spin" : ""}`} />
                  Refresh
                </Button>
              </div>

              {/* Sales List */}
              <div className="glass-card rounded-2xl border border-border/50 overflow-hidden">
                <div className="p-4 border-b border-border/50">
                  <h2 className="font-semibold flex items-center gap-2">
                    <Activity className="w-4 h-4 text-primary" />
                    Recent Sales ({sales.length})
                  </h2>
                </div>

                {salesLoading ? (
                  <div className="p-8 text-center">
                    <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
                  </div>
                ) : sales.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground">
                    <ShoppingCart className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No sales yet</p>
                  </div>
                ) : (
                  <div className="divide-y divide-border/50 max-h-[600px] overflow-y-auto">
                    {sales.map((sale, index) => (
                      <motion.div
                        key={sale.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.02 }}
                        className="p-4 flex items-center justify-between hover:bg-muted/30 transition-colors"
                      >
                        <div className="flex items-center gap-4">
                          <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                            sale.status === 'completed' ? 'bg-emerald-500/10' : 'bg-yellow-500/10'
                          }`}>
                            <DollarSign className={`w-6 h-6 ${
                              sale.status === 'completed' ? 'text-emerald-500' : 'text-yellow-500'
                            }`} />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-semibold">{sale.user_email}</span>
                              {sale.promo_code && (
                                <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full flex items-center gap-1">
                                  <Tag className="w-3 h-3" />
                                  {sale.promo_code}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                              <span className="font-medium text-foreground">{sale.plan_name}</span>
                              <span>•</span>
                              <span>{sale.payment_method}</span>
                              <span>•</span>
                              <span>{new Date(sale.created_at).toLocaleString()}</span>
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-lg text-emerald-500">${Number(sale.amount).toFixed(2)}</div>
                          {sale.discount_percent > 0 && (
                            <div className="text-xs text-muted-foreground">-{sale.discount_percent}% off</div>
                          )}
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          {/* Promo Codes Tab */}
          {/* API Stats Tab */}
          <TabsContent value="api">
            <div className="space-y-6">
              {/* Refresh Button */}
              <div className="flex justify-end">
                <Button 
                  variant="outline" 
                  onClick={loadApiStats} 
                  disabled={apiStatsLoading}
                  className="gap-2"
                >
                  <RefreshCw className={`w-4 h-4 ${apiStatsLoading ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
              </div>

              {/* Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="glass-card rounded-2xl p-5 border border-border/50"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                      <Server className="w-5 h-5 text-primary" />
                    </div>
                    <span className="text-sm text-muted-foreground">Total (7d)</span>
                  </div>
                  <div className="text-2xl font-bold">{apiStats?.total_requests?.toLocaleString() || 0}</div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.05 }}
                  className="glass-card rounded-2xl p-5 border border-border/50"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                      <Zap className="w-5 h-5 text-blue-500" />
                    </div>
                    <span className="text-sm text-muted-foreground">Last 24h</span>
                  </div>
                  <div className="text-2xl font-bold">{apiStats?.requests_24h?.toLocaleString() || 0}</div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="glass-card rounded-2xl p-5 border border-border/50"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                      <Activity className="w-5 h-5 text-emerald-500" />
                    </div>
                    <span className="text-sm text-muted-foreground">Last Hour</span>
                  </div>
                  <div className="text-2xl font-bold">{apiStats?.requests_1h?.toLocaleString() || 0}</div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 }}
                  className="glass-card rounded-2xl p-5 border border-border/50"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center">
                      <AlertTriangle className="w-5 h-5 text-red-500" />
                    </div>
                    <span className="text-sm text-muted-foreground">Errors</span>
                  </div>
                  <div className="text-2xl font-bold text-red-500">{apiStats?.error_count?.toLocaleString() || 0}</div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="glass-card rounded-2xl p-5 border border-border/50"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center">
                      <Globe className="w-5 h-5 text-purple-500" />
                    </div>
                    <span className="text-sm text-muted-foreground">Unique IPs</span>
                  </div>
                  <div className="text-2xl font-bold">{apiStats?.unique_ips?.toLocaleString() || 0}</div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.25 }}
                  className="glass-card rounded-2xl p-5 border border-border/50"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-xl bg-yellow-500/10 flex items-center justify-center">
                      <Clock className="w-5 h-5 text-yellow-500" />
                    </div>
                    <span className="text-sm text-muted-foreground">Avg Response</span>
                  </div>
                  <div className="text-2xl font-bold">{apiStats?.avg_response_time_ms || 0}ms</div>
                </motion.div>
              </div>

              {/* Endpoint Breakdown */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="glass-card rounded-2xl border border-border/50 overflow-hidden"
              >
                <div className="p-4 border-b border-border/50">
                  <h3 className="font-semibold flex items-center gap-2">
                    <Server className="w-4 h-4 text-primary" />
                    Endpoint Breakdown
                  </h3>
                </div>
                
                {apiStatsLoading ? (
                  <div className="p-8 text-center">
                    <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
                  </div>
                ) : Object.keys(endpointStats).length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground">
                    <Server className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No request data yet</p>
                  </div>
                ) : (
                  <div className="divide-y divide-border/50">
                    {Object.entries(endpointStats).map(([endpoint, stats]) => (
                      <div
                        key={endpoint}
                        className="p-4 flex items-center justify-between hover:bg-muted/30 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                            <Zap className="w-5 h-5 text-primary" />
                          </div>
                          <div>
                            <div className="font-mono text-sm">{endpoint}</div>
                            <div className="text-xs text-muted-foreground mt-0.5">
                              {stats.errors > 0 && (
                                <span className="text-red-400">{stats.errors} errors</span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-bold">{stats.count.toLocaleString()}</div>
                          <div className="text-xs text-muted-foreground">requests</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            </div>
          </TabsContent>

          <TabsContent value="promo">
            <div className="flex justify-end mb-4">
              <Button variant="glow" onClick={() => setShowCreateForm(true)} className="gap-2">
                <Plus className="w-4 h-4" />
                Create Promo Code
              </Button>
            </div>

            {/* Create Form Modal */}
            {showCreateForm && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-xl p-4"
                onClick={() => setShowCreateForm(false)}
              >
                <motion.div
                  initial={{ scale: 0.95, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="w-full max-w-md glass-card rounded-2xl p-6 border border-border/50"
                  onClick={e => e.stopPropagation()}
                >
                  <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                    <Tag className="w-5 h-5 text-primary" />
                    Create Promo Code
                  </h2>

                  <form onSubmit={handleCreatePromoCode} className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Promo Code</label>
                      <div className="flex gap-2">
                        <Input
                          value={newCode}
                          onChange={e => setNewCode(e.target.value.toUpperCase())}
                          placeholder="SUMMER2024"
                          className="font-mono uppercase"
                          required
                        />
                        <Button type="button" variant="outline" onClick={generateRandomCode}>
                          Generate
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium flex items-center gap-2">
                        <Percent className="w-4 h-4 text-primary" />
                        Discount Percentage
                      </label>
                      <Input
                        type="number"
                        value={discountPercent}
                        onChange={e => setDiscountPercent(e.target.value)}
                        min="1"
                        max="100"
                        placeholder="10"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium flex items-center gap-2">
                        <Users className="w-4 h-4 text-primary" />
                        Max Uses (optional)
                      </label>
                      <Input
                        type="number"
                        value={maxUses}
                        onChange={e => setMaxUses(e.target.value)}
                        min="1"
                        placeholder="Unlimited"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-primary" />
                        Expires in Days (optional)
                      </label>
                      <Input
                        type="number"
                        value={expiresInDays}
                        onChange={e => setExpiresInDays(e.target.value)}
                        min="1"
                        placeholder="Never expires"
                      />
                    </div>

                    <div className="flex gap-3 pt-4">
                      <Button type="button" variant="outline" className="flex-1" onClick={() => setShowCreateForm(false)}>
                        Cancel
                      </Button>
                      <Button type="submit" variant="glow" className="flex-1" disabled={creating || !newCode}>
                        {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : "Create"}
                      </Button>
                    </div>
                  </form>
                </motion.div>
              </motion.div>
            )}

            {/* Promo Codes List */}
            <div className="glass-card rounded-2xl border border-border/50 overflow-hidden">
              <div className="p-4 border-b border-border/50">
                <h2 className="font-semibold flex items-center gap-2">
                  <Tag className="w-4 h-4 text-primary" />
                  Promo Codes ({promoCodes.length})
                </h2>
              </div>

              {promoCodes.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  <Tag className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No promo codes yet</p>
                </div>
              ) : (
                <div className="divide-y divide-border/50">
                  {promoCodes.map((code, index) => (
                    <motion.div
                      key={code.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className={`p-4 flex items-center justify-between hover:bg-muted/30 transition-colors ${!code.is_active ? "opacity-60" : ""}`}
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                          <Percent className="w-6 h-6 text-primary" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-lg">{code.code}</span>
                            <button onClick={() => copyCode(code.code, code.id)} className="text-muted-foreground hover:text-foreground transition-colors">
                              {copiedId === code.id ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                            </button>
                            {!code.is_active && (
                              <span className="text-xs bg-destructive/20 text-destructive px-2 py-0.5 rounded-full">Inactive</span>
                            )}
                          </div>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                            <span className="text-primary font-semibold">{code.discount_percent}% OFF</span>
                            <span>•</span>
                            <span>{code.current_uses}/{code.max_uses || "∞"} uses</span>
                            {code.expires_at && (
                              <>
                                <span>•</span>
                                <span>Expires: {new Date(code.expires_at).toLocaleDateString()}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button variant="ghost" size="icon" onClick={() => togglePromoCode(code.id, code.is_active)} className="rounded-xl">
                          {code.is_active ? <ToggleRight className="w-5 h-5 text-emerald-500" /> : <ToggleLeft className="w-5 h-5 text-muted-foreground" />}
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => deletePromoCode(code.id)} className="rounded-xl text-destructive hover:text-destructive hover:bg-destructive/10">
                          <Trash2 className="w-5 h-5" />
                        </Button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          {/* Users Tab */}
          <TabsContent value="users">
            <div className="space-y-4">
              {/* Search */}
              <div className="flex items-center gap-4">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by email or name..."
                    value={userSearch}
                    onChange={e => setUserSearch(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Button variant="outline" onClick={loadUsers} disabled={usersLoading} className="gap-2">
                  <RefreshCw className={`w-4 h-4 ${usersLoading ? "animate-spin" : ""}`} />
                  Refresh
                </Button>
              </div>

              {/* Users List */}
              <div className="glass-card rounded-2xl border border-border/50 overflow-hidden">
                <div className="p-4 border-b border-border/50">
                  <h2 className="font-semibold flex items-center gap-2">
                    <Users className="w-4 h-4 text-primary" />
                    Users ({filteredUsers.length})
                  </h2>
                </div>

                {usersLoading ? (
                  <div className="p-8 text-center">
                    <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
                  </div>
                ) : filteredUsers.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground">
                    <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No users found</p>
                  </div>
                ) : (
                  <div className="divide-y divide-border/50">
                    {filteredUsers.map((user, index) => {
                      const subStatus = getSubscriptionStatus(user);
                      const isExpanded = expandedUser === user.id;
                      const keys = userKeys[user.id] || [];

                      return (
                        <motion.div
                          key={user.id}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: index * 0.02 }}
                        >
                          {/* User Row */}
                          <div 
                            className="p-4 flex items-center justify-between hover:bg-muted/30 transition-colors cursor-pointer"
                            onClick={() => toggleUserExpand(user.id)}
                          >
                            <div className="flex items-center gap-4">
                              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                                <UserCircle className="w-6 h-6 text-primary" />
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="font-semibold">{user.email}</span>
                                  {user.is_admin && (
                                    <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full">Admin</span>
                                  )}
                                </div>
                                <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                                  <span>{user.subscription_plan || "No Plan"}</span>
                                  <span>•</span>
                                  <span className={subStatus.color}>{subStatus.label}</span>
                                  <span>•</span>
                                  <span>Joined {new Date(user.created_at).toLocaleDateString()}</span>
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setShowExtendModal(user.id);
                                  setExtendPlan(user.subscription_plan || "Basic");
                                }}
                                className="gap-1"
                              >
                                <Clock className="w-4 h-4" />
                                Extend
                              </Button>
                              {isExpanded ? (
                                <ChevronUp className="w-5 h-5 text-muted-foreground" />
                              ) : (
                                <ChevronDown className="w-5 h-5 text-muted-foreground" />
                              )}
                            </div>
                          </div>

                          {/* Expanded Content */}
                          <AnimatePresence>
                            {isExpanded && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: "auto", opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="overflow-hidden bg-muted/20"
                              >
                                <div className="p-4 space-y-4">
                                  {/* Quick Actions */}
                                  <div className="flex flex-wrap gap-2">
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => setUserSubscription(user.id, "Basic", 30)}
                                    >
                                      Set Basic (30d)
                                    </Button>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => setUserSubscription(user.id, "Pro", 30)}
                                    >
                                      Set Pro (30d)
                                    </Button>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => setUserSubscription(user.id, "Enterprise", null)}
                                    >
                                      Set Enterprise (Lifetime)
                                    </Button>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="text-destructive"
                                      onClick={() => setUserSubscription(user.id, null, null)}
                                    >
                                      Remove Subscription
                                    </Button>
                                  </div>

                                  {/* Keys Section */}
                                  <div>
                                    <h4 className="font-semibold mb-2 flex items-center gap-2">
                                      <Key className="w-4 h-4 text-primary" />
                                      Script Keys ({keys.length})
                                    </h4>

                                    {keysLoading === user.id ? (
                                      <div className="text-center py-4">
                                        <Loader2 className="w-5 h-5 animate-spin text-primary mx-auto" />
                                      </div>
                                    ) : keys.length === 0 ? (
                                      <p className="text-sm text-muted-foreground">No keys found for this user</p>
                                    ) : (
                                      <div className="space-y-2">
                                        {keys.map(key => (
                                          <div key={key.id} className="bg-background/50 rounded-lg p-3 flex items-center justify-between">
                                            <div className="flex-1 min-w-0">
                                              <div className="flex items-center gap-2">
                                                <code className="text-sm font-mono truncate">{key.key_value}</code>
                                                {key.is_banned && (
                                                  <span className="text-xs bg-destructive/20 text-destructive px-2 py-0.5 rounded-full">Banned</span>
                                                )}
                                              </div>
                                              <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                                                <span>{key.script_name}</span>
                                                <span>•</span>
                                                <span>{key.execution_count} executions</span>
                                                {key.hwid && (
                                                  <>
                                                    <span>•</span>
                                                    <span>HWID bound</span>
                                                  </>
                                                )}
                                              </div>
                                            </div>
                                            <div className="flex items-center gap-1">
                                              <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => toggleKeyBan(key.id, key.is_banned, user.id)}
                                                className="h-8 w-8"
                                                title={key.is_banned ? "Unban" : "Ban"}
                                              >
                                                <Ban className={`w-4 h-4 ${key.is_banned ? "text-destructive" : ""}`} />
                                              </Button>
                                              {key.hwid && (
                                                <Button
                                                  variant="ghost"
                                                  size="icon"
                                                  onClick={() => resetKeyHwid(key.id, user.id)}
                                                  className="h-8 w-8"
                                                  title="Reset HWID"
                                                >
                                                  <RefreshCw className="w-4 h-4" />
                                                </Button>
                                              )}
                                              <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => deleteKey(key.id, user.id)}
                                                className="h-8 w-8 text-destructive"
                                                title="Delete key"
                                              >
                                                <Trash2 className="w-4 h-4" />
                                              </Button>
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </motion.div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {/* Extend Subscription Modal */}
        {showExtendModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-xl p-4"
            onClick={() => setShowExtendModal(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="w-full max-w-sm glass-card rounded-2xl p-6 border border-border/50"
              onClick={e => e.stopPropagation()}
            >
              <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                <Clock className="w-5 h-5 text-primary" />
                Extend Subscription
              </h2>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Days to Add</label>
                  <Input
                    type="number"
                    value={extendDays}
                    onChange={e => setExtendDays(e.target.value)}
                    min="1"
                    placeholder="30"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Plan</label>
                  <select
                    value={extendPlan}
                    onChange={e => setExtendPlan(e.target.value)}
                    className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                  >
                    <option value="Basic">Basic</option>
                    <option value="Pro">Pro</option>
                    <option value="Enterprise">Enterprise</option>
                  </select>
                </div>

                <div className="flex gap-3 pt-4">
                  <Button variant="outline" className="flex-1" onClick={() => setShowExtendModal(null)}>
                    Cancel
                  </Button>
                  <Button variant="glow" className="flex-1" onClick={() => extendSubscription(showExtendModal)}>
                    Extend
                  </Button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default Admin;
