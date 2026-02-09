import { motion } from "framer-motion";
import { Shield } from "lucide-react";

const LoadingScreen = () => {
  return (
    <motion.div
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
      className="fixed inset-0 z-[100] bg-background flex flex-col items-center justify-center"
    >
      {/* Background effects */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-primary/10 via-background to-background" />
      <div className="absolute inset-0 noise opacity-[0.02]" />
      
      {/* Animated logo */}
      <motion.div
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="relative"
      >
        {/* Glow rings */}
        <motion.div
          animate={{ 
            scale: [1, 1.5, 1],
            opacity: [0.5, 0, 0.5]
          }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          className="absolute inset-0 w-32 h-32 -m-8 rounded-full border border-primary/30"
        />
        <motion.div
          animate={{ 
            scale: [1, 1.8, 1],
            opacity: [0.3, 0, 0.3]
          }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut", delay: 0.3 }}
          className="absolute inset-0 w-32 h-32 -m-8 rounded-full border border-primary/20"
        />
        
        {/* Main logo container */}
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center border border-primary/30 shadow-[0_0_50px_rgba(239,68,68,0.3)]"
        >
          <motion.div
            animate={{ rotate: -360 }}
            transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          >
            <Shield className="w-8 h-8 text-primary" />
          </motion.div>
        </motion.div>
      </motion.div>

      {/* Logo text */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.5 }}
        className="mt-8 text-center"
      >
        <h1 className="font-display text-3xl font-bold tracking-tight">
          Shadow<span className="text-primary">Auth</span>
        </h1>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-muted-foreground text-sm mt-2"
        >
          Securing your scripts
        </motion.p>
      </motion.div>

      {/* Loading bar */}
      <motion.div
        initial={{ opacity: 0, width: 0 }}
        animate={{ opacity: 1, width: 200 }}
        transition={{ delay: 0.6, duration: 0.3 }}
        className="mt-8 h-1 bg-border/50 rounded-full overflow-hidden"
      >
        <motion.div
          initial={{ x: "-100%" }}
          animate={{ x: "100%" }}
          transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
          className="h-full w-1/2 bg-gradient-to-r from-transparent via-primary to-transparent"
        />
      </motion.div>
    </motion.div>
  );
};

export default LoadingScreen;
