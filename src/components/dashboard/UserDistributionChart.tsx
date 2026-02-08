import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";
import { Users } from "lucide-react";

interface UserDistributionChartProps {
  premiumKeys: number;
  normalKeys: number;
}

export default function UserDistributionChart({ premiumKeys, normalKeys }: UserDistributionChartProps) {
  const data = [
    { name: "Premium Keys", value: premiumKeys, color: "hsl(221, 83%, 53%)" },
    { name: "Normal Keys", value: normalKeys, color: "hsl(173, 80%, 40%)" },
  ];

  const total = premiumKeys + normalKeys;
  const premiumPercent = total > 0 ? Math.round((premiumKeys / total) * 100) : 0;
  const normalPercent = total > 0 ? Math.round((normalKeys / total) * 100) : 0;

  return (
    <div className="rounded-xl bg-card border border-border p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
          <Users className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h3 className="font-bold text-foreground">User Distribution</h3>
          <p className="text-sm text-muted-foreground">Premium vs Normal users</p>
        </div>
      </div>

      <p className="text-center text-sm text-muted-foreground mb-4">
        Premium vs Normal allocation
      </p>

      <div className="h-[200px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={50}
              outerRadius={80}
              paddingAngle={2}
              dataKey="value"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "8px",
                padding: "8px 12px",
              }}
              labelStyle={{ color: "hsl(var(--foreground))" }}
              itemStyle={{ color: "hsl(var(--muted-foreground))" }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-6 mt-4 pt-4 border-t border-border">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-[hsl(221,83%,53%)]" />
          <span className="text-sm text-muted-foreground">
            Premium Keys ({premiumPercent}%)
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-[hsl(173,80%,40%)]" />
          <span className="text-sm text-muted-foreground">
            Normal Keys ({normalPercent}%)
          </span>
        </div>
      </div>
    </div>
  );
}
