import { motion } from "framer-motion";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatsCardProps {
  icon: LucideIcon;
  label: string;
  value: string | number;
  trend?: string;
  trendUp?: boolean;
  iconColor?: string;
  delay?: number;
}

export default function StatsCard({ 
  icon: Icon, 
  label, 
  value, 
  trend, 
  trendUp,
  iconColor = "text-primary",
  delay = 0 
}: StatsCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="group rounded-xl bg-card/50 backdrop-blur-sm border border-border/50 p-5 hover:border-primary/30 transition-all"
    >
      <div className="flex items-center gap-4">
        <div className={cn(
          "w-12 h-12 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110",
          iconColor === "text-primary" && "bg-primary/10",
          iconColor === "text-green-500" && "bg-green-500/10",
          iconColor === "text-blue-500" && "bg-blue-500/10",
          iconColor === "text-yellow-500" && "bg-yellow-500/10",
          iconColor === "text-destructive" && "bg-destructive/10"
        )}>
          <Icon className={cn("w-6 h-6", iconColor)} />
        </div>
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">{label}</p>
          <div className="flex items-baseline gap-2">
            <p className="text-2xl font-bold">{value}</p>
            {trend && (
              <span className={cn(
                "text-xs font-medium",
                trendUp ? "text-green-500" : "text-destructive"
              )}>
                {trendUp ? "↗" : "↘"} {trend}
              </span>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
