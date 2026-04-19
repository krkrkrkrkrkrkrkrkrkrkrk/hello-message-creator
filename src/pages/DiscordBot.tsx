import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import DiscordBotTab from "@/components/settings/DiscordBotTab";
import { Loader2, ShieldAlert } from "lucide-react";

const DiscordBot = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const checkAdmin = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }
      // Check admin role via secure RPC (server-side)
      const { data, error } = await supabase.rpc("has_role", {
        _user_id: user.id,
        _role: "admin",
      });
      if (error || !data) {
        setIsAdmin(false);
      } else {
        setIsAdmin(true);
      }
      setLoading(false);
    };
    checkAdmin();
  }, [navigate]);

  if (loading) {
    return (
      <DashboardLayout breadcrumb="Discord Bot" title="Discord Bot">
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      </DashboardLayout>
    );
  }

  if (!isAdmin) {
    return (
      <DashboardLayout breadcrumb="Discord Bot" title="Access Denied">
        <div className="max-w-2xl mx-auto py-16 text-center space-y-4">
          <ShieldAlert className="w-16 h-16 mx-auto text-destructive" />
          <h2 className="text-2xl font-bold">Admin Access Required</h2>
          <p className="text-muted-foreground">
            The Admin Discord Bot configuration is restricted to platform administrators only.
            This protects against privilege escalation attacks.
          </p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout breadcrumb="Admin · Discord Bot" title="Admin Discord Bot">
      <div className="max-w-4xl space-y-6">
        <DiscordBotTab />
      </div>
    </DashboardLayout>
  );
};

export default DiscordBot;
