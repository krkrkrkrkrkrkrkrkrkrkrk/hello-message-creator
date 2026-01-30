import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import DashboardSidebar from "./DashboardSidebar";
import DashboardHeader from "./DashboardHeader";

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

interface DashboardLayoutProps {
  children: React.ReactNode;
  breadcrumb: string;
  title: string;
}

export default function DashboardLayout({ children, breadcrumb, title }: DashboardLayoutProps) {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const navigate = useNavigate();
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    const init = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        navigate("/auth");
        return;
      }

      setUser(session.user);
      
      const { data } = await supabase
        .from("profiles")
        .select("display_name, avatar_url, email, api_key, subscription_plan, subscription_expires_at, subscription_started_at, is_admin")
        .eq("id", session.user.id)
        .maybeSingle();
      
      if (data) {
        setProfile(data);
      }
    };

    init();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        navigate("/auth");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const displayName = profile?.display_name || user?.email?.split('@')[0] || 'User';

  return (
    <div className="min-h-screen bg-background">
      <DashboardSidebar />
      
      <div className="ml-[220px]">
        <DashboardHeader 
          breadcrumb={breadcrumb}
          title={title}
          avatarUrl={profile?.avatar_url}
          displayName={displayName}
          email={profile?.email || user?.email}
          plan={profile?.subscription_plan}
        />
        
        <main className="p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
