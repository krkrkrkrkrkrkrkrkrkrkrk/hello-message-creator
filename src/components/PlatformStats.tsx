import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";

interface Stats {
  total_authentications: number;
  active_projects: number;
  total_users: number;
}

const formatNumber = (num: number): string => {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1).replace(/\.0$/, "") + "M+";
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1).replace(/\.0$/, "") + "K+";
  }
  return num.toString() + "+";
};

const PlatformStats = () => {
  const [stats, setStats] = useState<Stats>({
    total_authentications: 0,
    active_projects: 0,
    total_users: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    // Fetch platform stats
    const { data: statsData } = await supabase
      .from("platform_stats")
      .select("stat_key, stat_value");

    if (statsData) {
      const statsMap: Record<string, number> = {};
      statsData.forEach((s) => {
        statsMap[s.stat_key] = Number(s.stat_value);
      });
      
      setStats({
        total_authentications: statsMap.total_authentications || 0,
        active_projects: statsMap.active_projects || 0,
        total_users: statsMap.total_users || 0,
      });
    }

    // If stats are 0, fetch real counts
    const [{ count: execCount }, { count: scriptCount }, { count: userCount }] = await Promise.all([
      supabase.from("script_executions").select("*", { count: "exact", head: true }),
      supabase.from("scripts").select("*", { count: "exact", head: true }),
      supabase.from("profiles").select("*", { count: "exact", head: true }),
    ]);

    setStats({
      total_authentications: execCount || 0,
      active_projects: scriptCount || 0,
      total_users: userCount || 0,
    });

    setLoading(false);
  };

  const statItems = [
    { value: stats.total_authentications, label: "Authentications", delay: 0 },
    { value: stats.active_projects, label: "Active Projects", delay: 0.1 },
    { value: stats.total_users, label: "Registered Users", delay: 0.2 },
  ];

  return (
    <div className="grid grid-cols-3 gap-8 mt-16 pt-16 border-t border-border/50">
      {statItems.map((stat, index) => (
        <motion.div
          key={stat.label}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.8 + stat.delay }}
          whileHover={{ scale: 1.05 }}
          className="text-center cursor-default"
        >
          <motion.div
            className="font-display text-3xl md:text-4xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 1 + stat.delay }}
          >
            {loading ? "..." : formatNumber(stat.value)}
          </motion.div>
          <div className="text-sm text-muted-foreground mt-1">{stat.label}</div>
        </motion.div>
      ))}
    </div>
  );
};

export default PlatformStats;