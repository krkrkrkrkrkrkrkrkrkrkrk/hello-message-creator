import { motion } from "framer-motion";
import { Bell, MessageCircle, ChevronRight } from "lucide-react";
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
  type: "welcome" | "support" | "info";
  actionUrl?: string;
}

const NotificationBell = () => {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([
    {
      id: "1",
      title: "Welcome to ShadowAuth!",
      message: "Your account has been created successfully.",
      time: "Now",
      read: false,
      type: "welcome",
    },
  ]);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const checkSupportResponses = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      // Check if there are any support responses (simulated for now)
      // In a real implementation, this would query a support_tickets table
    };

    checkSupportResponses();
  }, []);

  const addSupportNotification = (adminMessage: string) => {
    const newNotification: Notification = {
      id: Date.now().toString(),
      title: "Support Response",
      message: adminMessage.slice(0, 50) + (adminMessage.length > 50 ? "..." : ""),
      time: new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
      read: false,
      type: "support",
      actionUrl: "/support",
    };
    setNotifications(prev => [newNotification, ...prev]);
  };

  const markAsRead = (id: string) => {
    setNotifications(prev =>
      prev.map(n => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const handleNotificationClick = (notification: Notification) => {
    markAsRead(notification.id);
    if (notification.actionUrl) {
      navigate(notification.actionUrl);
      setIsOpen(false);
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
                  <div className={`w-8 h-8 rounded-full shrink-0 flex items-center justify-center ${
                    notification.type === "support" 
                      ? "bg-emerald-500/20" 
                      : notification.type === "welcome" 
                        ? "bg-primary/20" 
                        : "bg-muted"
                  }`}>
                    {notification.type === "support" ? (
                      <MessageCircle className="w-4 h-4 text-emerald-500" />
                    ) : (
                      <Bell className="w-4 h-4 text-primary" />
                    )}
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
              onClick={() => setNotifications(prev => prev.map(n => ({ ...n, read: true })))}
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