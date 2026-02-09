import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Moon, Sun, Crown, Coins, Settings, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Progress } from "@/components/ui/progress";
import { useTheme } from "@/hooks/use-theme";
import { supabase } from "@/integrations/supabase/client";

// Custom Icons
const SidebarIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" className={className} stroke="currentColor" strokeWidth="1.5">
    <rect x="3" y="3" width="18" height="18" rx="2" />
    <path d="M9 3v18" />
  </svg>
);

const DocsIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" className={className} stroke="currentColor" strokeWidth="1.5">
    <rect x="4" y="2" width="16" height="20" rx="2" />
    <path d="M8 6h8M8 10h8M8 14h4" strokeLinecap="round" />
  </svg>
);

const DiscordIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M20.317 4.37a19.791 19.791 0 00-4.885-1.515.074.074 0 00-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 00-5.487 0 12.64 12.64 0 00-.617-1.25.077.077 0 00-.079-.037A19.736 19.736 0 003.677 4.37a.07.07 0 00-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 00.031.057 19.9 19.9 0 005.993 3.03.078.078 0 00.084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 00-.041-.106 13.107 13.107 0 01-1.872-.892.077.077 0 01-.008-.128 10.2 10.2 0 00.372-.292.074.074 0 01.077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 01.078.01c.12.098.246.198.373.292a.077.077 0 01-.006.127 12.299 12.299 0 01-1.873.892.077.077 0 00-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 00.084.028 19.839 19.839 0 006.002-3.03.077.077 0 00.032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 00-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
  </svg>
);

const GlobeIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" className={className} stroke="currentColor" strokeWidth="1.5">
    <circle cx="12" cy="12" r="10" />
    <path d="M2 12h20M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" />
  </svg>
);

interface DashboardHeaderProps {
  breadcrumb: string;
  title: string;
  avatarUrl?: string | null;
  displayName?: string;
  email?: string;
  plan?: string | null;
}

export default function DashboardHeader({
  title,
  avatarUrl,
  displayName,
  email,
  plan,
}: DashboardHeaderProps) {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const [tokens, setTokens] = useState<number | null>(null);

  useEffect(() => {
    const fetchTokens = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const { data } = await supabase
          .from("profiles")
          .select("tokens")
          .eq("id", session.user.id)
          .maybeSingle();
        if (data) {
          setTokens(data.tokens ?? 0);
        }
      }
    };
    fetchTokens();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  const isEnterprise = plan?.toLowerCase() === 'enterprise';
  const planTokenLimit = plan?.toLowerCase() === 'starter' ? 300 : plan?.toLowerCase() === 'pro' ? 500 : 100;
  const tokensPercentage = tokens !== null ? Math.min((tokens / planTokenLimit) * 100, 100) : 0;

  const getInitials = () => {
    if (displayName) return displayName.charAt(0).toUpperCase();
    if (email) return email.charAt(0).toUpperCase();
    return "U";
  };

  return (
    <header className="sticky top-0 z-30 bg-background border-b border-border">
      <div className="flex items-center justify-between px-5 h-14">
        {/* Left side - Sidebar toggle + Breadcrumb */}
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="w-8 h-8 rounded-md hover:bg-muted"
          >
            <SidebarIcon className="w-4 h-4 text-muted-foreground" />
          </Button>
          
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">Dashboard</span>
            <span className="text-muted-foreground">&gt;</span>
            <span className="text-foreground font-medium">{title}</span>
          </div>
        </div>

        {/* Right side - Actions */}
        <div className="flex items-center gap-1.5">
          {/* Theme Toggle */}
          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-2.5 rounded-md hover:bg-muted gap-1.5"
            onClick={toggleTheme}
          >
            {theme === "dark" ? (
              <Moon className="w-4 h-4 text-muted-foreground" />
            ) : (
              <Sun className="w-4 h-4 text-muted-foreground" />
            )}
            <span className="text-sm text-muted-foreground">
              {theme === "dark" ? "Dark" : "Light"}
            </span>
          </Button>

          {/* Docs */}
          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-2.5 rounded-md hover:bg-muted gap-1.5"
            onClick={() => navigate("/documentation")}
          >
            <DocsIcon className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Docs</span>
          </Button>

          {/* Premium Button */}
          <Button
            size="sm"
            className="h-8 px-3 rounded-md gap-1.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white border-0"
            onClick={() => navigate("/pricing")}
          >
            <Crown className="w-4 h-4" />
            <span className="text-sm font-medium">
              {isEnterprise ? 'Enterprise' : plan?.toLowerCase() === 'pro' ? 'Pro' : plan?.toLowerCase() === 'starter' ? 'Starter' : 'Premium'}
            </span>
          </Button>

          {/* Tokens */}
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="h-8 px-2.5 rounded-md gap-1.5 border-border hover:bg-muted"
              >
                <Coins className="w-4 h-4 text-primary" />
                <span className="text-sm text-foreground">
                  {isEnterprise ? "∞" : tokens !== null ? tokens : "..."}
                </span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64 p-4" align="end">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Your Tokens</span>
                  <span className="text-xs text-muted-foreground">
                    {isEnterprise ? "Unlimited" : `${tokens ?? 0} / ${planTokenLimit}`}
                  </span>
                </div>
                {!isEnterprise && (
                  <>
                    <Progress value={tokensPercentage} className="h-2" />
                    <div className="text-xs text-muted-foreground space-y-1">
                      <p>• Script upload: <span className="text-foreground font-medium">10 tokens</span></p>
                      <p>• Obfuscation: <span className="text-foreground font-medium">10 tokens</span></p>
                      <p className="text-primary">Tokens reset every 30 days</p>
                    </div>
                    <Button 
                      size="sm" 
                      className="w-full"
                      onClick={() => navigate("/pricing")}
                    >
                      {plan?.toLowerCase() === 'pro' ? 'Upgrade to Enterprise' : 'Upgrade Plan'}
                    </Button>
                  </>
                )}
                {isEnterprise && (
                  <p className="text-xs text-muted-foreground">
                    You have unlimited tokens with the Enterprise plan!
                  </p>
                )}
              </div>
            </PopoverContent>
          </Popover>

          {/* Discord */}
          <Button
            variant="outline"
            size="sm"
            className="h-8 px-2.5 rounded-md gap-1.5 border-border hover:bg-muted"
            onClick={() => window.open("https://discord.gg/GE847sSjDV", "_blank")}
          >
            <DiscordIcon className="w-4 h-4 text-[#5865F2]" />
            <span className="text-sm text-foreground">Discord</span>
          </Button>

          {/* Language */}
          <Button
            variant="outline"
            size="sm"
            className="h-8 px-2.5 rounded-md gap-1.5 border-border hover:bg-muted"
          >
            <GlobeIcon className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm text-foreground">EN</span>
          </Button>

          {/* User Avatar Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="w-8 h-8 rounded-full hover:bg-muted ml-1">
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt="Avatar"
                    className="w-7 h-7 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center text-xs font-medium text-muted-foreground">
                    {getInitials()}
                  </div>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 bg-card border-border">
              <div className="flex items-center gap-2 p-2 border-b border-border">
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt="Avatar"
                    className="w-7 h-7 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center text-xs font-medium text-muted-foreground">
                    {getInitials()}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{displayName || "User"}</p>
                  <p className="text-xs text-muted-foreground truncate">{email || ""}</p>
                </div>
              </div>
              <DropdownMenuItem onClick={() => navigate("/settings")} className="cursor-pointer">
                <Settings className="mr-2 h-4 w-4" />
                Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-border" />
              <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-destructive">
                <LogOut className="mr-2 h-4 w-4" />
                Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
