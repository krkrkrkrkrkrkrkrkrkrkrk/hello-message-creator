import { motion } from "framer-motion";
import { 
  Shield, Key, Code, Zap, Lock, Globe, Clock, BarChart3, 
  Users, Webhook, Database, Bot, Terminal, Cpu, AlertTriangle, RefreshCw
} from "lucide-react";

const features = [
  {
    icon: Shield,
    title: "Military-Grade Security",
    description: "Advanced encryption algorithms protect your scripts from unauthorized access and reverse engineering.",
  },
  {
    icon: Key,
    title: "License Management",
    description: "Create, manage, and distribute license keys with customizable expiration dates and usage limits.",
  },
  {
    icon: Lock,
    title: "HWID Locking",
    description: "Hardware ID binding ensures each license is uniquely tied to the user's device for maximum protection.",
  },
  {
    icon: Zap,
    title: "Instant Verification",
    description: "Lightning-fast authentication with sub-100ms response times globally distributed.",
  },
  {
    icon: Bot,
    title: "Discord Bot Integration",
    description: "Full Discord bot with whitelist, blacklist, control panel, HWID reset, and more commands.",
  },
  {
    icon: Users,
    title: "User Management",
    description: "Complete user control with whitelist, blacklist, ban, and role management directly from Discord.",
  },
  {
    icon: RefreshCw,
    title: "HWID Reset System",
    description: "Allow users to reset their HWID with configurable cooldowns. Force reset available for managers.",
  },
  {
    icon: Webhook,
    title: "Webhooks & Logs",
    description: "Real-time webhook notifications for all key events. Complete execution logs with IP, country, and executor type.",
  },
  {
    icon: Globe,
    title: "Global CDN",
    description: "Distributed network ensures your users have fast, reliable access from anywhere in the world.",
  },
  {
    icon: Clock,
    title: "Real-time Analytics",
    description: "Monitor authentications, track usage patterns, country stats, and detect suspicious activity instantly.",
  },
  {
    icon: BarChart3,
    title: "Developer Dashboard",
    description: "Intuitive dashboard to manage scripts, users, licenses, and view detailed statistics.",
  },
  {
    icon: Database,
    title: "Secure Database",
    description: "All data stored securely with encryption at rest. Automatic backups and 99.9% uptime guarantee.",
  },
];

const executorSupport = [
  // Windows - Updated January 2026 from whatexpsare.online
  { name: "Seliware", status: "full", platform: "Windows" },
  { name: "Volt", status: "full", platform: "Windows" },
  { name: "Potassium", status: "full", platform: "Windows" },
  { name: "Bunni.lol", status: "full", platform: "Windows" },
  { name: "Velocity", status: "full", platform: "Windows" },
  { name: "SirHurt", status: "full", platform: "Windows" },
  { name: "Solara", status: "full", platform: "Windows" },
  { name: "Xeno", status: "full", platform: "Windows" },
  // Mac
  { name: "Hydrogen", status: "full", platform: "Mac" },
  { name: "MacSploit", status: "partial", platform: "Mac" },
  // Mobile
  { name: "Delta", status: "full", platform: "Mobile" },
  { name: "Codex", status: "full", platform: "Mobile" },
  { name: "Vega X", status: "full", platform: "Mobile" },
];

const Features = () => {
  return (
    <section id="features" className="py-32 relative overflow-hidden">
      {/* Background Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/5 rounded-full blur-[200px]" />

      <div className="container mx-auto px-6 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <span className="text-primary font-medium text-sm uppercase tracking-wider">Features</span>
          <h2 className="font-display text-4xl md:text-5xl font-bold mt-4 mb-6">
            Everything You Need to{" "}
            <span className="text-gradient">Protect</span> Your Scripts
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Comprehensive tools and features designed specifically for Lua developers
            who demand the best security for their Roblox creations.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
            >
              <FeatureCard {...feature} />
            </motion.div>
          ))}
        </div>

        {/* Executor Support Section */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="mt-24"
        >
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass text-primary font-medium text-sm mb-4">
              <Terminal className="w-4 h-4" />
              Executor Compatibility
            </div>
            <h3 className="font-display text-3xl font-bold mb-4">
              Supported <span className="text-gradient">Executors</span>
            </h3>
            <p className="text-muted-foreground max-w-xl mx-auto">
              ShadowAuth is compatible with all major Roblox executors. Our loader automatically detects and adapts to your executor.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 max-w-5xl mx-auto">
            {executorSupport.map((executor, index) => (
              <motion.div
                key={executor.name}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
                className={`glass p-4 rounded-xl text-center ${
                  executor.status === "full" 
                    ? "border border-green-500/30 hover:border-green-500/50" 
                    : "border border-yellow-500/30 hover:border-yellow-500/50"
                } transition-colors`}
              >
                <Cpu className={`w-6 h-6 mx-auto mb-2 ${
                  executor.status === "full" ? "text-green-400" : "text-yellow-400"
                }`} />
                <span className="text-sm font-medium text-foreground">{executor.name}</span>
                <div className="text-xs text-muted-foreground mt-0.5">{executor.platform}</div>
                <div className={`text-xs mt-1 ${
                  executor.status === "full" ? "text-green-400" : "text-yellow-400"
                }`}>
                  {executor.status === "full" ? "✓ Updated" : "⚠ Partial"}
                </div>
              </motion.div>
            ))}
          </div>

          <div className="text-center mt-8">
            <p className="text-sm text-muted-foreground flex items-center justify-center gap-2">
              <AlertTriangle className="w-4 h-4 text-yellow-500" />
              Executors require HttpGet/request function support for authentication
            </p>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

const FeatureCard = ({ icon: Icon, title, description }: {
  icon: React.ElementType;
  title: string;
  description: string;
}) => (
  <motion.div
    whileHover={{ y: -8, scale: 1.02 }}
    transition={{ duration: 0.3, ease: "easeOut" }}
    className="group glass p-6 rounded-2xl h-full cursor-default card-hover"
  >
    <motion.div 
      whileHover={{ rotate: [0, -10, 10, 0] }}
      transition={{ duration: 0.4 }}
      className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 group-hover:shadow-lg group-hover:shadow-primary/20 transition-all duration-300"
    >
      <Icon className="w-6 h-6 text-primary" />
    </motion.div>
    <h3 className="font-display text-lg font-semibold mb-2 group-hover:text-primary transition-colors duration-300">{title}</h3>
    <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
  </motion.div>
);

export default Features;
