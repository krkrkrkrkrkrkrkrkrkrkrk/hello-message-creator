import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Shield, Menu, X, MessageCircle, LayoutDashboard } from "lucide-react";
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import ThemeToggle from "./ThemeToggle";
import NotificationBell from "./NotificationBell";
import { supabase } from "@/integrations/supabase/client";

const DISCORD_INVITE = "https://discord.gg/GE847sSjDV";

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setIsLoggedIn(!!session);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsLoggedIn(!!session);
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <motion.nav
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="fixed top-0 left-0 right-0 z-50 glass-strong"
    >
      <div className="container mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <motion.div whileHover={{ scale: 1.02 }} className="flex items-center gap-3">
              <div className="relative">
                <Shield className="w-8 h-8 text-primary" />
                <div className="absolute inset-0 bg-primary/30 blur-xl" />
              </div>
              <span className="font-display text-xl font-bold text-foreground">
                Shadow<span className="text-gradient">Auth</span>
              </span>
            </motion.div>
          </Link>

          {/* Desktop Menu */}
          <div className="hidden md:flex items-center gap-8">
            <NavLink href="/#features">Features</NavLink>
            <NavLink href="/#pricing">Pricing</NavLink>
            <NavLink href="/scripthub">ScriptHub</NavLink>
            <NavLink href="/marketplace">Marketplace</NavLink>
            <NavLink href="/documentation">Documentation</NavLink>
            <a 
              href={DISCORD_INVITE} 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <MessageCircle className="w-4 h-4" />
              Discord
            </a>
          </div>

          <div className="hidden md:flex items-center gap-4">
            <NotificationBell />
            <ThemeToggle />
            {isLoggedIn ? (
              <Link to="/dashboard">
                <Button variant="hero" size="sm" className="flex items-center gap-2">
                  <LayoutDashboard className="w-4 h-4" />
                  Dashboard
                </Button>
              </Link>
            ) : (
              <>
                <Link to="/auth">
                  <Button variant="ghost" size="sm">
                    Login
                  </Button>
                </Link>
                <Link to="/auth">
                  <Button variant="hero" size="sm">
                    Get Started
                  </Button>
                </Link>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="flex md:hidden items-center gap-3">
            <NotificationBell />
            <ThemeToggle />
            <button
              className="text-foreground"
              onClick={() => setIsOpen(!isOpen)}
            >
              {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden pt-4 pb-2"
          >
            <div className="flex flex-col gap-4">
              <NavLink href="/#features" mobile>Features</NavLink>
              <NavLink href="/#pricing" mobile>Pricing</NavLink>
              <NavLink href="/scripthub" mobile>ScriptHub</NavLink>
              <NavLink href="/marketplace" mobile>Marketplace</NavLink>
              <NavLink href="/documentation" mobile>Documentation</NavLink>
              <a 
                href={DISCORD_INVITE} 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors py-2"
              >
                <MessageCircle className="w-4 h-4" />
                Discord
              </a>
              <div className="flex flex-col gap-2 pt-4 border-t border-border">
                {isLoggedIn ? (
                  <Link to="/dashboard">
                    <Button variant="hero" className="w-full flex items-center gap-2">
                      <LayoutDashboard className="w-4 h-4" />
                      Dashboard
                    </Button>
                  </Link>
                ) : (
                  <>
                    <Link to="/auth">
                      <Button variant="ghost" className="w-full">Login</Button>
                    </Link>
                    <Link to="/auth">
                      <Button variant="hero" className="w-full">Get Started</Button>
                    </Link>
                  </>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </motion.nav>
  );
};

const NavLink = ({ href, children, mobile }: { href: string; children: React.ReactNode; mobile?: boolean }) => {
  // Use Link for internal routes, anchor for hash links
  const isInternal = href.startsWith('/') && !href.includes('#');
  
  if (isInternal) {
    return (
      <Link 
        to={href}
        className={`text-muted-foreground hover:text-foreground transition-colors ${mobile ? 'py-2' : ''}`}
      >
        {children}
      </Link>
    );
  }
  
  return (
    <motion.a
      href={href}
      className={`text-muted-foreground hover:text-foreground transition-colors ${mobile ? 'py-2' : ''}`}
      whileHover={{ x: mobile ? 4 : 0 }}
    >
      {children}
    </motion.a>
  );
};

export default Navbar;
