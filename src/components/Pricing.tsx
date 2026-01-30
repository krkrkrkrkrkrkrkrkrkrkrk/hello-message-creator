import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Check, Sparkles, Zap, Crown, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import CheckoutModal from "@/components/checkout/CheckoutModal";

const plans = [
  {
    name: "Starter",
    price: "$9.99",
    priceId: "price_1Sb8gUIHFoKvK2ctlf7ycfpK", // Starter plan price ID
    days: 30,
    description: "Perfect for testing and small projects",
    icon: Zap,
    features: [
      "Up to 1000 authentications/day",
      "3 Projects",
      "Basic obfuscation",
      "Community support",
      "API access",
      "30 days access",
    ],
  },
  {
    name: "Pro",
    price: "$24.99",
    priceId: "price_1Sb8gUIHFoKvK2ctlf7ycfpK", // Pro plan price ID - update with actual
    days: 90,
    description: "For serious developers and growing projects",
    icon: Sparkles,
    features: [
      "Unlimited authentications",
      "10 Projects",
      "Advanced obfuscation",
      "HWID locking",
      "Priority support",
      "Custom webhooks",
      "Analytics dashboard",
      "90 days access",
    ],
    popular: true,
  },
  {
    name: "Enterprise",
    price: "$99.99",
    priceId: "price_1Sb8gjIHFoKvK2ctkU04Xz8O", // Enterprise plan price ID
    days: 365,
    description: "For teams and professional studios",
    icon: Crown,
    features: [
      "Everything in Pro",
      "Unlimited projects",
      "White-label solution",
      "Custom domain",
      "Dedicated support",
      "SLA guarantee",
      "Custom integrations",
      "Team management",
      "365 days access",
    ],
  },
];

const Pricing = () => {
  const [selectedPlan, setSelectedPlan] = useState<{
    name: string;
    price: string;
    priceId: string;
    days: number;
  } | null>(null);

  const handleSubscribe = (plan: typeof plans[0]) => {
    setSelectedPlan({
      name: plan.name,
      price: plan.price,
      priceId: plan.priceId,
      days: plan.days,
    });
  };

  return (
    <section id="pricing" className="py-32 relative overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 overflow-hidden">
        <motion.div 
          animate={{ 
            scale: [1, 1.2, 1],
            opacity: [0.1, 0.15, 0.1]
          }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-primary/20 rounded-full blur-[200px]" 
        />
        <motion.div 
          animate={{ 
            scale: [1.2, 1, 1.2],
            opacity: [0.1, 0.12, 0.1]
          }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
          className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-accent/20 rounded-full blur-[180px]" 
        />
      </div>

      <div className="container mx-auto px-6 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-20"
        >
          <motion.span 
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass text-primary font-medium text-sm mb-6"
          >
            <Sparkles className="w-4 h-4" />
            Pricing Plans
          </motion.span>
          <h2 className="font-display text-4xl md:text-6xl font-bold mb-6">
            Simple, <span className="text-gradient">Transparent</span> Pricing
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
            Choose the plan that fits your needs. Get your subscription code after payment.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-6 lg:gap-8 max-w-6xl mx-auto">
          {plans.map((plan, index) => (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.15 }}
            >
              <PricingCard {...plan} onSubscribe={() => handleSubscribe(plan)} />
            </motion.div>
          ))}
        </div>
      </div>

      {/* Checkout Modal */}
      {selectedPlan && (
        <CheckoutModal
          isOpen={!!selectedPlan}
          onClose={() => setSelectedPlan(null)}
          plan={selectedPlan}
        />
      )}
    </section>
  );
};

const PricingCard = ({ name, price, days, description, features, popular, icon: Icon, onSubscribe }: {
  name: string;
  price: string;
  days: number;
  description: string;
  features: string[];
  popular?: boolean;
  icon: React.ElementType;
  onSubscribe: () => void;
}) => (
  <motion.div
    whileHover={{ y: -8, scale: 1.02 }}
    transition={{ duration: 0.3, ease: "easeOut" }}
    className={`relative group h-full`}
  >
    {/* Glow Effect */}
    {popular && (
      <motion.div 
        animate={{ opacity: [0.3, 0.5, 0.3] }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        className="absolute -inset-[2px] bg-gradient-to-r from-primary via-primary-glow to-primary rounded-3xl blur-lg"
      />
    )}
    
    <div className={`relative h-full rounded-2xl overflow-hidden ${
      popular 
        ? "bg-gradient-to-b from-card to-background border-2 border-primary/50" 
        : "glass-strong"
    }`}>
      {/* Popular Badge */}
      {popular && (
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary via-primary-glow to-primary" />
      )}
      
      <div className="p-8 h-full flex flex-col">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
              popular 
                ? "bg-primary text-primary-foreground" 
                : "bg-primary/10"
            }`}>
              <Icon className={`w-6 h-6 ${popular ? "" : "text-primary"}`} />
            </div>
            {popular && (
              <span className="px-3 py-1 rounded-full bg-primary/20 text-primary text-xs font-semibold uppercase tracking-wider">
                Most Popular
              </span>
            )}
          </div>
          <h3 className="font-display text-2xl font-bold mb-2">{name}</h3>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>

        {/* Price */}
        <div className="mb-8">
          <div className="flex items-baseline gap-1">
            <span className="font-display text-5xl font-bold">{price}</span>
            <span className="text-muted-foreground text-lg">/{days} days</span>
          </div>
        </div>

        {/* Features */}
        <ul className="space-y-4 mb-8 flex-grow">
          {features.map((feature, i) => (
            <motion.li 
              key={feature} 
              initial={{ opacity: 0, x: -10 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.05 }}
              className="flex items-start gap-3"
            >
              <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
                popular 
                  ? "bg-primary text-primary-foreground" 
                  : "bg-primary/10"
              }`}>
                <Check className={`w-3 h-3 ${popular ? "" : "text-primary"}`} />
              </div>
              <span className="text-sm text-muted-foreground">{feature}</span>
            </motion.li>
          ))}
        </ul>

        {/* CTA Button */}
        <Button
          variant={popular ? "hero" : "outline"}
          className={`w-full h-12 group/btn ${popular ? "shadow-lg shadow-primary/25" : ""}`}
          size="lg"
          onClick={onSubscribe}
        >
          <span className="flex items-center justify-center gap-2">
            Get Started
            <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
          </span>
        </Button>
      </div>
    </div>
  </motion.div>
);

export default Pricing;
