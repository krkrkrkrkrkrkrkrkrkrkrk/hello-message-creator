import { motion } from "framer-motion";
import { Bell, MessageCircle, ChevronRight, Key, Shield, CreditCard, Coins } from "lucide-react";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { supabase } from "@/integrations/supabase/client";

interface Notification {
  id: string;
  title: string;
  message: string;
  time: string;
  read: boolean;
  type: "welcome" | "support" | "key" | "security" | "purchase" | "tokens";
  actionUrl?: string;
}

const NotificationBell = () => {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      setUser(session.user);
      loadNotifications(session.user.id);
    }
  };

  const loadNotifications = async (userId: string) => {
    const storedNotifications = localStorage.getItem(`notifications_${userId}`);
    if (storedNotifications) {
      setNotifications(JSON.parse(storedNotifications));
    } else {
      // Add welcome notification for new users
      const welcomeNotification: Notification = {
        id: "welcome",
        title: "Welcome to ShadowAuth!",
        message: "Your account has been created. Start by creating your first script.",
        time: "Now",
        read: false,
        type: "welcome",
        actionUrl: "/scripts",
      };
      setNotifications([welcomeNotification]);
      saveNotifications(userId, [welcomeNotification]);
    }

    // Check for recent activities
    await checkRecentActivities(userId);
  };

  const checkRecentActivities = async (userId: string) => {
    const newNotifications: Notification[] = [];

    // Check for support ticket responses
    const { data: tickets } = await supabase
      .from("support_tickets")
      .select(`
        id,
        status,
        updated_at,
        support_messages (
          content,
          sender_type,
          created_at
        )
      `)
      .eq("user_id", userId)
      .order("updated_at", { ascending: false })
      .limit(5);

    if (tickets) {
      tickets.forEach((ticket: any) => {
        const adminMessages = ticket.support_messages?.filter(
          (m: any) => m.sender_type === "admin"
        );
        if (adminMessages && adminMessages.length > 0) {
          const lastAdminMessage = adminMessages[0];
          const messageDate = new Date(lastAdminMessage.created_at);
          const now = new Date();
          const diffHours = (now.getTime() - messageDate.getTime()) / (1000 * 60 * 60);
          
          if (diffHours < 24) {
            newNotifications.push({
              id: `support_${ticket.id}`,
              title: "Support Response",
              message: lastAdminMessage.content.slice(0, 50) + "...",
              time: formatTime(messageDate),
              read: false,
              type: "support",
              actionUrl: "/support",
            });
          }
        }
      });
    }

    // Check for recent key creations
    const { data: recentKeys } = await supabase
      .from("script_keys")
      .select("id, created_at, script_id, scripts(name)")
      .order("created_at", { ascending: false })
      .limit(3);

    if (recentKeys && recentKeys.length > 0) {
      const lastKey = recentKeys[0] as any;
      const keyDate = new Date(lastKey.created_at);
      const now = new Date();
      const diffMins = (now.getTime() - keyDate.getTime()) / (1000 * 60);
      
      if (diffMins < 5) {
        newNotifications.push({
          id: `key_${lastKey.id}`,
          title: "Key Created",
          message: `New license key created for ${lastKey.scripts?.name || "your script"}`,
          time: formatTime(keyDate),
          read: false,
          type: "key",
          actionUrl: `/keys/${lastKey.script_id}`,
        });
      }
    }

    // Get user profile for token info
    const { data: profile } = await supabase
      .from("profiles")
      .select("tokens, subscription_plan")
      .eq("id", userId)
      .single();

    if (profile && profile.tokens !== null && profile.tokens <= 20 && !profile.subscription_plan) {
      newNotifications.push({
        id: "low_tokens",
        title: "Low Tokens",
        message: `You have ${profile.tokens} tokens remaining. Upgrade for unlimited usage.`,
        time: "Now",
        read: false,
        type: "tokens",
        actionUrl: "/pricing",
      });
    }

    if (newNotifications.length > 0) {
      setNotifications(prev => {
        const updated = [...newNotifications, ...prev.filter(n => 
          !newNotifications.some(nn => nn.id === n.id)
        )].slice(0, 10);
        saveNotifications(userId, updated);
        return updated;
      });
    }
  };

  const saveNotifications = (userId: string, notifs: Notification[]) => {
    localStorage.setItem(`notifications_${userId}`, JSON.stringify(notifs));
  };

  const formatTime = (date: Date) => {
    const now = new Date();
    const diffMins = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
    return `${Math.floor(diffMins / 1440)}d ago`;
  };

  const markAsRead = (id: string) => {
    setNotifications(prev => {
      const updated = prev.map(n => (n.id === id ? { ...n, read: true } : n));
      if (user) saveNotifications(user.id, updated);
      return updated;
    });
  };

  const handleNotificationClick = (notification: Notification) => {
    markAsRead(notification.id);
    if (notification.actionUrl) {
      navigate(notification.actionUrl);
      setIsOpen(false);
    }
  };

  const markAllAsRead = () => {
    setNotifications(prev => {
      const updated = prev.map(n => ({ ...n, read: true }));
      if (user) saveNotifications(user.id, updated);
      return updated;
    });
  };

  const getIcon = (type: Notification["type"]) => {
    switch (type) {
      case "support":
        return <MessageCircle className="w-4 h-4 text-emerald-500" />;
      case "key":
        return <Key className="w-4 h-4 text-blue-500" />;
      case "security":
        return <Shield className="w-4 h-4 text-amber-500" />;
      case "purchase":
        return <CreditCard className="w-4 h-4 text-primary" />;
      case "tokens":
        return <Coins className="w-4 h-4 text-amber-500" />;
      default:
        return <Bell className="w-4 h-4 text-primary" />;
    }
  };

  const getIconBg = (type: Notification["type"]) => {
    switch (type) {
      case "support":
        return "bg-emerald-500/20";
      case "key":
        return "bg-blue-500/20";
      case "security":
      case "tokens":
        return "bg-amber-500/20";
      case "purchase":
        return "bg-primary/20";
      default:
        return "bg-primary/20";
    }
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="relative w-10 h-10 rounded-full glass flex items-center justify-center group overflow-visible"
          aria-label="Notifications"
        >
          <Bell className="w-5 h-5 text-primary" />
          
          {unreadCount > 0 && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 bg-primary rounded-full flex items-center justify-center text-[10px] font-bold text-primary-foreground border-2 border-background"
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </motion.div>
          )}

          <div className="absolute inset-0 bg-primary/10 opacity-0 group-hover:opacity-100 transition-opacity rounded-full" />
        </motion.button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0 glass-strong border-border/50" align="end" sideOffset={8}>
        <div className="p-4 border-b border-border/50">
          <h3 className="font-semibold text-foreground">Notifications</h3>
          <p className="text-xs text-muted-foreground">{unreadCount} unread</p>
        </div>
        <div className="max-h-80 overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground text-sm">
              No notifications
            </div>
          ) : (
            notifications.map((notification) => (
              <div
                key={notification.id}
                onClick={() => handleNotificationClick(notification)}
                className={`p-4 border-b border-border/30 hover:bg-primary/5 transition-colors cursor-pointer ${
                  !notification.read ? "bg-primary/5" : ""
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`w-8 h-8 rounded-full shrink-0 flex items-center justify-center ${getIconBg(notification.type)}`}>
                    {getIcon(notification.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-medium text-sm text-foreground truncate">
                        {notification.title}
                      </p>
                      {!notification.read && (
                        <div className="w-2 h-2 rounded-full bg-primary shrink-0" />
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                      {notification.message}
                    </p>
                    <div className="flex items-center justify-between mt-2">
                      <p className="text-xs text-muted-foreground">{notification.time}</p>
                      {notification.actionUrl && (
                        <span className="text-xs text-primary flex items-center gap-0.5">
                          View <ChevronRight className="w-3 h-3" />
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
        {notifications.length > 0 && (
          <div className="p-3 border-t border-border/50">
            <button
              onClick={markAllAsRead}
              className="w-full text-center text-xs text-primary hover:underline"
            >
              Mark all as read
            </button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
};

export default NotificationBell;