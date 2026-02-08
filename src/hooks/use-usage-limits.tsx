import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface UsageLimit {
  allowed: boolean;
  current: number;
  limit: number | "unlimited";
  remaining?: number;
  plan: string;
  reason?: string;
}

export function useUsageLimits() {
  const [loading, setLoading] = useState(false);

  const checkLimit = useCallback(async (limitType: "obfuscation" | "key_creation" | "script"): Promise<UsageLimit | null> => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("Você precisa estar logado");
        return null;
      }

      const { data, error } = await supabase.rpc("check_usage_limit", {
        p_user_id: session.user.id,
        p_limit_type: limitType
      });

      if (error) {
        console.error("Error checking limit:", error);
        return null;
      }

      if (!data || typeof data !== "object") {
        return null;
      }

      const result = data as Record<string, unknown>;
      return {
        allowed: Boolean(result.allowed),
        current: Number(result.current) || 0,
        limit: result.limit === "unlimited" ? "unlimited" : Number(result.limit) || 0,
        remaining: result.remaining ? Number(result.remaining) : undefined,
        plan: String(result.plan) || "free",
        reason: result.reason ? String(result.reason) : undefined
      } as UsageLimit;
    } catch (error) {
      console.error("Error checking limit:", error);
      return null;
    }
  }, []);

  const incrementUsage = useCallback(async (usageType: "obfuscation" | "key_creation" | "script"): Promise<boolean> => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return false;

      const { data, error } = await supabase.rpc("increment_usage", {
        p_user_id: session.user.id,
        p_usage_type: usageType
      });

      if (error) {
        console.error("Error incrementing usage:", error);
        return false;
      }

      return data as boolean;
    } catch (error) {
      console.error("Error incrementing usage:", error);
      return false;
    }
  }, []);

  const checkAndIncrement = useCallback(async (
    limitType: "obfuscation" | "key_creation" | "script",
    onLimitReached?: () => void
  ): Promise<boolean> => {
    setLoading(true);
    try {
      const limit = await checkLimit(limitType);
      
      if (!limit) {
        toast.error("Erro ao verificar limites");
        return false;
      }

      if (!limit.allowed) {
        toast.error(limit.reason || `Limite de ${limitType} atingido. Faça upgrade do seu plano.`);
        onLimitReached?.();
        return false;
      }

      await incrementUsage(limitType);
      return true;
    } finally {
      setLoading(false);
    }
  }, [checkLimit, incrementUsage]);

  return {
    checkLimit,
    incrementUsage,
    checkAndIncrement,
    loading
  };
}
