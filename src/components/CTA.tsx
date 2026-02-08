import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowRight, Shield, Sparkles, Zap, CheckCircle2 } from "lucide-react";
import { Link } from "react-router-dom";

const CTA = () => {
  return (
    <section className="py-32 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/5 to-transparent" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/10 rounded-full blur-[200px]" />

      <div className="container mx-auto px-6 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="glass-strong rounded-3xl p-12 md:p-16 text-center max-w-4xl mx-auto relative overflow-hidden border border-primary/20"
        >
          {/* Corner Glow */}
          <div className="absolute -top-20 -right-20 w-40 h-40 bg-primary/30 rounded-full blur-[80px]" />
          <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-accent/20 rounded-full blur-[80px]" />

          <div className="relative">
            <motion.div
              animate={{ rotate: [0, 5, -5, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20 mb-8 border border-primary/30"
            >
              <Shield className="w-8 h-8 text-primary" />
            </motion.div>

            <h2 className="font-display text-3xl md:text-5xl font-bold mb-6">
              Ready to <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">Secure</span> Your Scripts?
            </h2>

            <p className="text-muted-foreground max-w-xl mx-auto mb-8">
              Join thousands of developers who trust Shadow Auth to protect their 
              Roblox creations. Start free, upgrade anytime.
            </p>

            {/* Features List */}
            <div className="flex flex-wrap items-center justify-center gap-4 md:gap-6 mb-10">
              <FeatureItem icon={Sparkles} text="Free forever tier" />
              <FeatureItem icon={Zap} text="Instant setup" />
              <FeatureItem icon={CheckCircle2} text="No credit card" />
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link to="/auth">
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.98 }}>
                  <Button variant="hero" size="xl" className="group">
                    Get Started Free
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </motion.div>
              </Link>
              <Link to="/documentation">
                <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.98 }}>
                  <Button variant="outline" size="xl">
                    View Documentation
                  </Button>
                </motion.div>
              </Link>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

const FeatureItem = ({ icon: Icon, text }: { icon: React.ElementType; text: string }) => (
  <div className="flex items-center gap-2 text-sm text-muted-foreground">
    <Icon className="w-4 h-4 text-primary" />
    <span>{text}</span>
  </div>
);

export default CTA;