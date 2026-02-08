import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Crown, Zap, Key, FileCode } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface UsageData {
  obfuscation: { current: number; limit: number | "unlimited"; percentage: number };
  keys: { current: number; limit: number | "unlimited"; percentage: number };
  scripts: { current: number; limit: number | "unlimited"; percentage: number };
  plan: string;
}

export function UsageLimitBanner() {
  const navigate = useNavigate();
  const [usage, setUsage] = useState<UsageData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUsage();
  }, []);

  const loadUsage = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      // Get user profile with usage
      const { data: profile } = await supabase
        .from("profiles")
        .select("subscription_plan, obfuscation_count, key_creation_count, script_creation_count")
        .eq("id", session.user.id)
        .single();

      if (!profile) return;

      // Get plan limits
      const { data: plan } = await supabase
        .from("subscription_plans")
        .select("*")
        .eq("name", profile.subscription_plan || "free")
        .single();

      if (!plan) return;

      const getPercentage = (current: number, limit: number) => 
        limit === -1 ? 0 : Math.min((current / limit) * 100, 100);

      setUsage({
        obfuscation: {
          current: profile.obfuscation_count || 0,
          limit: plan.obfuscation_limit === -1 ? "unlimited" : plan.obfuscation_limit,
          percentage: getPercentage(profile.obfuscation_count || 0, plan.obfuscation_limit)
        },
        keys: {
          current: profile.key_creation_count || 0,
          limit: plan.key_creation_limit === -1 ? "unlimited" : plan.key_creation_limit,
          percentage: getPercentage(profile.key_creation_count || 0, plan.key_creation_limit)
        },
        scripts: {
          current: profile.script_creation_count || 0,
          limit: plan.script_limit === -1 ? "unlimited" : plan.script_limit,
          percentage: getPercentage(profile.script_creation_count || 0, plan.script_limit)
        },
        plan: plan.display_name
      });
    } catch (error) {
      console.error("Error loading usage:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !usage) return null;

  const isPremium = usage.plan.toLowerCase() !== "free";
  const isNearLimit = usage.obfuscation.percentage >= 80 || usage.keys.percentage >= 80 || usage.scripts.percentage >= 80;

  if (isPremium && !isNearLimit) return null;

  return (
    <div className={`rounded-lg border p-4 mb-6 ${isNearLimit ? "bg-amber-500/10 border-amber-500/30" : "bg-muted/50 border-border"}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 space-y-4">
          <div className="flex items-center gap-2">
            {isNearLimit && <Zap className="w-5 h-5 text-amber-500" />}
            <h3 className="font-semibold">
              {isNearLimit ? "Você está perto do limite!" : `Plano ${usage.plan}`}
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Obfuscation */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <Zap className="w-4 h-4" />
                  Obfuscação
                </span>
                <span>
                  {usage.obfuscation.current}/{usage.obfuscation.limit === "unlimited" ? "∞" : usage.obfuscation.limit}
                </span>
              </div>
              {usage.obfuscation.limit !== "unlimited" && (
                <Progress 
                  value={usage.obfuscation.percentage} 
                  className={`h-2 ${usage.obfuscation.percentage >= 80 ? "[&>div]:bg-amber-500" : ""}`}
                />
              )}
            </div>

            {/* Keys */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <Key className="w-4 h-4" />
                  Keys
                </span>
                <span>
                  {usage.keys.current}/{usage.keys.limit === "unlimited" ? "∞" : usage.keys.limit}
                </span>
              </div>
              {usage.keys.limit !== "unlimited" && (
                <Progress 
                  value={usage.keys.percentage} 
                  className={`h-2 ${usage.keys.percentage >= 80 ? "[&>div]:bg-amber-500" : ""}`}
                />
              )}
            </div>

            {/* Scripts */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <FileCode className="w-4 h-4" />
                  Scripts
                </span>
                <span>
                  {usage.scripts.current}/{usage.scripts.limit === "unlimited" ? "∞" : usage.scripts.limit}
                </span>
              </div>
              {usage.scripts.limit !== "unlimited" && (
                <Progress 
                  value={usage.scripts.percentage} 
                  className={`h-2 ${usage.scripts.percentage >= 80 ? "[&>div]:bg-amber-500" : ""}`}
                />
              )}
            </div>
          </div>
        </div>

        {!isPremium && (
          <Button 
            onClick={() => navigate("/pricing")}
            variant="hero"
            className="shrink-0"
          >
            <Crown className="w-4 h-4 mr-2" />
            Upgrade
          </Button>
        )}
      </div>
    </div>
  );
}
