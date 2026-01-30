import { useNavigate } from "react-router-dom";
import { 
  MessageCircle, FileText, Sun, Moon, 
  Settings, LogOut
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTheme } from "@/hooks/use-theme";
import { supabase } from "@/integrations/supabase/client";

interface DashboardHeaderProps {
  breadcrumb: string;
  title: string;
  avatarUrl?: string | null;
  displayName?: string;
  email?: string;
  plan?: string | null;
}

export default function DashboardHeader({ 
  breadcrumb, 
  title, 
  avatarUrl, 
  displayName,
  email,
  plan 
}: DashboardHeaderProps) {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  return (
    <header className="sticky top-0 z-30 bg-background border-b border-border">
      <div className="flex items-center justify-between px-6 py-4">
        {/* Breadcrumb & Title */}
        <div>
          <p className="text-xs text-muted-foreground mb-0.5">
            Pages / {breadcrumb}
          </p>
          <h1 className="text-2xl font-bold text-foreground">{title}</h1>
        </div>

        {/* Right side - Icon buttons + User info */}
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="w-10 h-10 rounded-full bg-primary text-primary-foreground hover:bg-primary/90"
            onClick={() => window.open("https://discord.gg", "_blank")}
          >
            <MessageCircle className="w-5 h-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="w-10 h-10 rounded-full bg-secondary text-foreground hover:bg-secondary/80"
            onClick={() => navigate("/documentation")}
          >
            <FileText className="w-5 h-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="w-10 h-10 rounded-full bg-secondary text-foreground hover:bg-secondary/80"
            onClick={toggleTheme}
          >
            {theme === "dark" ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </Button>

          {/* User Avatar Dropdown with larger avatar */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-auto p-1 rounded-full hover:bg-secondary/50">
                <Avatar className="w-12 h-12 border-2 border-primary/50">
                  <AvatarImage src={avatarUrl || undefined} className="object-cover" />
                  <AvatarFallback className="bg-primary text-primary-foreground text-lg">
                    {displayName?.charAt(0)?.toUpperCase() || "U"}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64 bg-card border-border p-3">
              {/* User profile info in dropdown */}
              <div className="flex items-center gap-3 mb-3 pb-3 border-b border-border">
                <Avatar className="w-14 h-14 border-2 border-primary/30">
                  <AvatarImage src={avatarUrl || undefined} className="object-cover" />
                  <AvatarFallback className="bg-primary text-primary-foreground text-xl">
                    {displayName?.charAt(0)?.toUpperCase() || "U"}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">{displayName || "User"}</p>
                  <p className="text-xs text-muted-foreground truncate">{email || "No email"}</p>
                  <span className="inline-block mt-1 px-2 py-0.5 text-[10px] font-medium rounded-full bg-primary/20 text-primary">
                    {plan?.toUpperCase() || "FREE"}
                  </span>
                </div>
              </div>
              <DropdownMenuItem onClick={() => navigate("/settings")} className="cursor-pointer">
                <Settings className="mr-2 h-4 w-4" />
                Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-border" />
              <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-destructive">
                <LogOut className="mr-2 h-4 w-4" />
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}