import { useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { LogOut } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

// Custom ShadowHub Icons
const OverviewIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" className={className} stroke="currentColor" strokeWidth="1.5">
    <path d="M3 3v18h18" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M7 14l4-4 4 4 5-5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const ServicesIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" className={className} stroke="currentColor" strokeWidth="1.5">
    <rect x="3" y="3" width="7" height="7" rx="1" />
    <rect x="14" y="3" width="7" height="7" rx="1" />
    <rect x="3" y="14" width="7" height="7" rx="1" />
    <rect x="14" y="14" width="7" height="7" rx="1" />
  </svg>
);

const IntegrationsIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" className={className} stroke="currentColor" strokeWidth="1.5">
    <path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const ProvidersIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" className={className} stroke="currentColor" strokeWidth="1.5">
    <line x1="4" y1="6" x2="20" y2="6" strokeLinecap="round" />
    <line x1="4" y1="12" x2="20" y2="12" strokeLinecap="round" />
    <line x1="4" y1="18" x2="14" y2="18" strokeLinecap="round" />
    <circle cx="8" cy="6" r="2" fill="currentColor" />
  </svg>
);

const KeysIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" className={className} stroke="currentColor" strokeWidth="1.5">
    <circle cx="8" cy="8" r="5" />
    <path d="M11.5 11.5L20 20" strokeLinecap="round" />
    <path d="M16 16l2 2m-4 0l2 2" strokeLinecap="round" />
  </svg>
);

const LuaScriptsIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" className={className} stroke="currentColor" strokeWidth="1.5">
    <path d="M8 6l-4 6 4 6" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M16 6l4 6-4 6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const RevenueIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" className={className} stroke="currentColor" strokeWidth="1.5">
    <path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const WebhooksIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" className={className} stroke="currentColor" strokeWidth="1.5">
    <path d="M10 14a3.5 3.5 0 005 0l4-4a3.5 3.5 0 00-5-5l-.5.5" strokeLinecap="round" />
    <path d="M14 10a3.5 3.5 0 00-5 0l-4 4a3.5 3.5 0 005 5l.5-.5" strokeLinecap="round" />
  </svg>
);

const ApiKeysIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" className={className} stroke="currentColor" strokeWidth="1.5">
    <circle cx="12" cy="12" r="9" />
    <path d="M12 8v4l2 2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const HwidsIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" className={className} stroke="currentColor" strokeWidth="1.5">
    <circle cx="12" cy="12" r="9" />
    <path d="M12 6v6l4 2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const DiscordLogsIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" className={className} stroke="currentColor" strokeWidth="1.5">
    <rect x="3" y="4" width="18" height="16" rx="2" />
    <path d="M7 8h10M7 12h6M7 16h8" strokeLinecap="round" />
  </svg>
);

const PagesIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" className={className} stroke="currentColor" strokeWidth="1.5">
    <circle cx="12" cy="12" r="9" />
    <path d="M3 12h18M12 3a15.3 15.3 0 014 9 15.3 15.3 0 01-4 9 15.3 15.3 0 01-4-9 15.3 15.3 0 014-9z" />
  </svg>
);

const SettingsIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" className={className} stroke="currentColor" strokeWidth="1.5">
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z" />
  </svg>
);

const ShieldIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" className={className} stroke="currentColor" strokeWidth="1.5">
    <path d="M12 2l8 4v6c0 5.5-3.8 10.7-8 12-4.2-1.3-8-6.5-8-12V6l8-4z" />
    <path d="M9 12l2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

interface NavItem {
  icon: React.FC<{ className?: string }>;
  label: string;
  href: string;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

const navSections: NavSection[] = [
  {
    title: "MAIN",
    items: [
      { icon: OverviewIcon, label: "Overview", href: "/dashboard" },
      { icon: ServicesIcon, label: "Services", href: "/settings/products" },
      { icon: IntegrationsIcon, label: "Integrations", href: "/settings" },
      { icon: ProvidersIcon, label: "Providers", href: "/providers" },
      { icon: KeysIcon, label: "Keys", href: "/keys" },
      { icon: RevenueIcon, label: "Revenue", href: "/revenue" },
    ],
  },
  {
    title: "TOOLS",
    items: [
      { icon: LuaScriptsIcon, label: "Lua Scripts", href: "/scripts" },
      { icon: ShieldIcon, label: "Obfuscator", href: "/dashboard/obfuscator" },
      { icon: WebhooksIcon, label: "Webhooks", href: "/settings/urls" },
      { icon: ApiKeysIcon, label: "Code Editor", href: "/code-editor" },
      { icon: HwidsIcon, label: "HWIDs", href: "/vanguard" },
      { icon: DiscordLogsIcon, label: "Discord Bot", href: "/discord-bot" },
      { icon: PagesIcon, label: "Overview Pages", href: "/documentation" },
      { icon: SettingsIcon, label: "Settings", href: "/settings/account" },
    ],
  },
];

export default function DashboardSidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const [profile, setProfile] = useState<{ display_name: string | null; avatar_url: string | null; email: string | null } | null>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase
          .from("profiles")
          .select("display_name, avatar_url, email")
          .eq("id", user.id)
          .single();
        if (data) setProfile(data);
      }
    };
    fetchProfile();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  const isActive = (href: string) => {
    if (href === "/settings") {
      return location.pathname === "/settings";
    }
    return location.pathname === href || location.pathname.startsWith(href + "/");
  };

  const getInitials = () => {
    if (profile?.display_name) {
      return profile.display_name.substring(0, 2).toUpperCase();
    }
    if (profile?.email) {
      return profile.email.substring(0, 2).toUpperCase();
    }
    return "US";
  };

  return (
    <aside className="fixed left-0 top-0 bottom-0 z-40 w-[220px] bg-card border-r border-border flex flex-col">
      {/* Logo Card */}
      <motion.div 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-4"
      >
        <div className="rounded-2xl bg-primary py-6 px-4 flex items-center justify-center gap-2">
          <ShieldIcon className="w-6 h-6 text-primary-foreground" />
          <span className="text-lg font-bold text-primary-foreground tracking-wide">SHADOWHUB</span>
        </div>
      </motion.div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-2 overflow-y-auto overflow-x-hidden scrollbar-thin">
        {navSections.map((section, sectionIndex) => (
          <div key={section.title} className={cn(sectionIndex > 0 && "mt-6")}>
            <p className="mb-3 text-xs font-semibold text-muted-foreground tracking-wider">
              {section.title}
            </p>
            <div className="space-y-1">
              {section.items.map((item) => {
                const active = isActive(item.href);
                return (
                  <button
                    key={item.href}
                    onClick={() => navigate(item.href)}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2 text-sm transition-colors rounded-lg",
                      active 
                        ? "bg-primary text-primary-foreground" 
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
                    )}
                  >
                    <item.icon className="w-4 h-4 flex-shrink-0" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer with user */}
      <div className="p-4 border-t border-border">
        <Popover>
          <PopoverTrigger asChild>
            <button className="w-full flex items-center gap-3 py-2 rounded-lg hover:bg-muted/30 transition-colors">
              {profile?.avatar_url ? (
                <img 
                  src={profile.avatar_url} 
                  alt="Avatar" 
                  className="w-8 h-8 rounded-full object-cover"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-medium text-muted-foreground">
                  {getInitials()}
                </div>
              )}
              <div className="flex-1 text-left overflow-hidden">
                <p className="text-sm font-medium truncate text-foreground">
                  {profile?.display_name || profile?.email?.split("@")[0] || "User"}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {profile?.email || ""}
                </p>
              </div>
              <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4 text-muted-foreground" stroke="currentColor" strokeWidth="2">
                <path d="M7 10l5-5 5 5M7 14l5 5 5-5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </PopoverTrigger>
          <PopoverContent 
            side="top" 
            align="start" 
            className="w-56 p-2 bg-card border-border"
          >
            <div className="flex items-center gap-3 p-2 mb-1">
              {profile?.avatar_url ? (
                <img 
                  src={profile.avatar_url} 
                  alt="Avatar" 
                  className="w-8 h-8 rounded-full object-cover"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-medium text-muted-foreground">
                  {getInitials()}
                </div>
              )}
              <div className="flex-1 overflow-hidden">
                <p className="text-sm font-medium truncate text-foreground">
                  {profile?.display_name || profile?.email?.split("@")[0] || "User"}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {profile?.email || ""}
                </p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-2 py-2 text-sm text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span>Log out</span>
            </button>
          </PopoverContent>
        </Popover>
      </div>
    </aside>
  );
}
