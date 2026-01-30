import { useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Shield, Home, FileText, Key, Server, Settings, 
  Package, Zap, Link as LinkIcon,
  ChevronDown, Code, ShieldCheck, Layers
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";

interface NavItem {
  icon: React.ElementType;
  label: string;
  href: string;
}

interface NavGroup {
  icon: React.ElementType;
  label: string;
  items: NavItem[];
}

const navGroups: NavGroup[] = [
  {
    icon: Layers,
    label: "Management",
    items: [
      { icon: Key, label: "Key Management", href: "/keys" },
      { icon: Package, label: "Product Settings", href: "/settings/products" },
      { icon: Server, label: "Virtual Storage", href: "/scripts" },
      { icon: Code, label: "Code Editor", href: "/code-editor" },
    ],
  },
  {
    icon: ShieldCheck,
    label: "Vanguard",
    items: [
      { icon: ShieldCheck, label: "Vanguard Center", href: "/vanguard" },
    ],
  },
  {
    icon: Settings,
    label: "Settings",
    items: [
      { icon: Settings, label: "Hub Settings", href: "/settings" },
      { icon: Zap, label: "Booster Settings", href: "/settings/boosters" },
      { icon: LinkIcon, label: "Short URL Settings", href: "/settings/urls" },
    ],
  },
];

const standaloneItems: NavItem[] = [
  { icon: Home, label: "Main Dashboard", href: "/dashboard" },
];

const bottomItems: NavItem[] = [
  { icon: FileText, label: "Documentation", href: "/documentation" },
];

export default function DashboardSidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const [profile, setProfile] = useState<{ display_name: string | null; avatar_url: string | null; email: string | null } | null>(null);
  
  // All groups open by default
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    navGroups.forEach(group => {
      initial[group.label] = true;
    });
    return initial;
  });

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

  const toggleGroup = (label: string) => {
    setOpenGroups(prev => ({ ...prev, [label]: !prev[label] }));
  };

  const isActive = (href: string) => {
    if (href === "/settings") {
      return location.pathname === "/settings";
    }
    return location.pathname === href || location.pathname.startsWith(href + "/");
  };

  const renderNavItem = (item: NavItem, index: number, nested = false) => {
    const active = isActive(item.href);
    
    return (
      <motion.button
        key={item.href}
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: index * 0.02, duration: 0.2 }}
        whileHover={{ x: 2 }}
        onClick={() => navigate(item.href)}
        className={cn(
          "w-full flex items-center gap-3 py-2 text-sm transition-all duration-200 relative group rounded-lg",
          nested ? "px-3 pl-10" : "px-3",
          active 
            ? "bg-primary/10 text-primary" 
            : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
        )}
      >
        <item.icon className={cn(
          "w-4 h-4 flex-shrink-0",
          active && "text-primary"
        )} />
        <span className={cn(
          "truncate transition-colors",
          active && "font-medium"
        )}>
          {item.label}
        </span>
      </motion.button>
    );
  };

  return (
    <aside className="fixed left-0 top-0 bottom-0 z-40 w-[220px] bg-card border-r border-border flex flex-col">
      {/* Logo */}
      <motion.div 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-4 flex items-center gap-3"
      >
        <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center flex-shrink-0 shadow-lg shadow-primary/30">
          <Shield className="w-5 h-5 text-primary-foreground" />
        </div>
        <div>
          <h1 className="font-bold text-base text-foreground tracking-wide">Shadow Auth</h1>
          <p className="text-[10px] text-muted-foreground">Panda Auth System v2.0</p>
        </div>
      </motion.div>

      {/* Navigation */}
      <nav className="flex-1 px-2 py-2 overflow-y-auto overflow-x-hidden scrollbar-thin space-y-1">
        {/* Standalone items at top */}
        {standaloneItems.map((item, index) => renderNavItem(item, index))}

        {/* Collapsible groups */}
        {navGroups.map((group, groupIndex) => (
          <Collapsible
            key={group.label}
            open={openGroups[group.label]}
            onOpenChange={() => toggleGroup(group.label)}
            className="mt-3"
          >
            <CollapsibleTrigger asChild>
              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: groupIndex * 0.05 }}
                className={cn(
                  "w-full flex items-center justify-between px-3 py-2 text-sm rounded-lg transition-all duration-200 group",
                  openGroups[group.label] 
                    ? "text-foreground bg-muted/30" 
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
                )}
              >
                <div className="flex items-center gap-3">
                  <group.icon className="w-4 h-4" />
                  <span className="font-medium">{group.label}</span>
                </div>
                <ChevronDown 
                  className={cn(
                    "w-4 h-4 transition-transform duration-200",
                    openGroups[group.label] && "rotate-180"
                  )} 
                />
              </motion.button>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-1 space-y-0.5">
              <AnimatePresence>
                {group.items.map((item, index) => renderNavItem(item, index, true))}
              </AnimatePresence>
            </CollapsibleContent>
          </Collapsible>
        ))}

        {/* Bottom standalone items */}
        <div className="mt-4 pt-4 border-t border-border">
          {bottomItems.map((item, index) => renderNavItem(item, index))}
        </div>
      </nav>

      {/* Footer with user profile */}
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="p-3 border-t border-border"
      >
        <button
          onClick={() => navigate("/settings/account")}
          className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors"
        >
          <Avatar className="h-8 w-8">
            <AvatarImage src={profile?.avatar_url || undefined} />
            <AvatarFallback className="bg-primary text-primary-foreground text-xs">
              {profile?.display_name?.charAt(0)?.toUpperCase() || profile?.email?.charAt(0)?.toUpperCase() || "?"}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 text-left overflow-hidden">
            <p className="text-xs font-medium truncate">
              {profile?.display_name || profile?.email?.split("@")[0] || "User"}
            </p>
            <p className="text-[10px] text-muted-foreground truncate">
              {profile?.email || "Account"}
            </p>
          </div>
        </button>
      </motion.div>
    </aside>
  );
}
