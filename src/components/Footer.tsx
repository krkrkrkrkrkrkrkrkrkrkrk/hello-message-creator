import { Shield, Github, Twitter, MessageCircle } from "lucide-react";
import { Link } from "react-router-dom";

const DISCORD_INVITE = "https://discord.gg/GE847sSjDV";

const Footer = () => {
  const currentYear = new Date().getFullYear();
  
  return (
    <footer className="border-t border-border/50 py-16 bg-gradient-to-t from-card/50 to-transparent">
      <div className="container mx-auto px-6">
        <div className="grid md:grid-cols-5 gap-12">
          {/* Brand */}
          <div className="md:col-span-2">
            <Link to="/" className="flex items-center gap-3 mb-4 group">
              <div className="relative">
                <Shield className="w-7 h-7 text-primary transition-transform group-hover:scale-110" />
                <div className="absolute inset-0 bg-primary/30 blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <span className="font-display text-lg font-bold">
                Shadow<span className="text-gradient bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">Auth</span>
              </span>
            </Link>
            <p className="text-sm text-muted-foreground mb-6 max-w-xs leading-relaxed">
              The most advanced authentication and licensing platform for Roblox Lua scripts.
            </p>
            <div className="flex items-center gap-3">
              <SocialLink href="https://twitter.com" icon={Twitter} label="Twitter" />
              <SocialLink href="https://github.com" icon={Github} label="GitHub" />
              <SocialLink href={DISCORD_INVITE} icon={MessageCircle} label="Discord" />
            </div>
          </div>

          {/* Links */}
          <div>
            <h4 className="font-display font-semibold mb-4 text-foreground">Product</h4>
            <ul className="space-y-3">
              <FooterLink href="/#features">Features</FooterLink>
              <FooterLink href="/#pricing">Pricing</FooterLink>
              <FooterLink href="/#api">API</FooterLink>
              <FooterLink href="/scripthub">ScriptHub</FooterLink>
            </ul>
          </div>

          <div>
            <h4 className="font-display font-semibold mb-4 text-foreground">Resources</h4>
            <ul className="space-y-3">
              <FooterLink href="/documentation">Documentation</FooterLink>
              <FooterLink href="/marketplace">Marketplace</FooterLink>
              <FooterLink href="/support">Support</FooterLink>
              <FooterLink href={DISCORD_INVITE} external>Discord</FooterLink>
            </ul>
          </div>

          <div>
            <h4 className="font-display font-semibold mb-4 text-foreground">Legal</h4>
            <ul className="space-y-3">
              <FooterLink href="/documentation">Terms of Service</FooterLink>
              <FooterLink href="/documentation">Privacy Policy</FooterLink>
              <FooterLink href="/documentation">Refund Policy</FooterLink>
            </ul>
          </div>
        </div>

        <div className="border-t border-border/50 mt-12 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">
            © {currentYear} Shadow Auth. All rights reserved.
          </p>
          <p className="text-sm text-muted-foreground flex items-center gap-1.5">
            Built with <span className="text-destructive">❤️</span> for the Roblox community
          </p>
        </div>
      </div>
    </footer>
  );
};

const FooterLink = ({ href, children, external }: { href: string; children: React.ReactNode; external?: boolean }) => {
  if (external || href.startsWith('http')) {
    return (
      <li>
        <a 
          href={href} 
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-muted-foreground hover:text-primary transition-colors"
        >
          {children}
        </a>
      </li>
    );
  }
  
  const isHashLink = href.includes('#');
  
  if (isHashLink) {
    return (
      <li>
        <a href={href} className="text-sm text-muted-foreground hover:text-primary transition-colors">
          {children}
        </a>
      </li>
    );
  }
  
  return (
    <li>
      <Link to={href} className="text-sm text-muted-foreground hover:text-primary transition-colors">
        {children}
      </Link>
    </li>
  );
};

const SocialLink = ({ href, icon: Icon, label }: { href: string; icon: React.ElementType; label: string }) => (
  <a
    href={href}
    target="_blank"
    rel="noopener noreferrer"
    aria-label={label}
    className="w-10 h-10 rounded-xl bg-secondary/80 flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-primary/10 hover:scale-110 transition-all duration-300"
  >
    <Icon className="w-5 h-5" />
  </a>
);

export default Footer;