import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, CreditCard, Loader2, Lock, Shield, Check, Copy, Sparkles, Key } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface MockCheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  plan: {
    name: string;
    price: string;
    days: number;
  };
}

type CheckoutStep = "form" | "processing" | "success";

const MockCheckoutModal = ({ isOpen, onClose, plan }: MockCheckoutModalProps) => {
  const [step, setStep] = useState<CheckoutStep>("form");
  const [email, setEmail] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvc, setCvc] = useState("");
  const [cardName, setCardName] = useState("");
  const [generatedCode, setGeneratedCode] = useState("");
  const [copied, setCopied] = useState(false);

  const formatCardNumber = (value: string) => {
    const v = value.replace(/\s+/g, "").replace(/[^0-9]/gi, "");
    const matches = v.match(/\d{4,16}/g);
    const match = (matches && matches[0]) || "";
    const parts = [];
    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4));
    }
    return parts.length ? parts.join(" ") : value;
  };

  const formatExpiry = (value: string) => {
    const v = value.replace(/\s+/g, "").replace(/[^0-9]/gi, "");
    if (v.length >= 2) {
      return v.substring(0, 2) + "/" + v.substring(2, 4);
    }
    return v;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !cardNumber || !expiry || !cvc || !cardName) {
      toast.error("Please fill in all fields");
      return;
    }

    setStep("processing");

    // Simulate payment processing
    await new Promise((resolve) => setTimeout(resolve, 2000));

    try {
      // Generate a unique subscription code with ShadowAuth Pro format
      const code = `SHADOWAUTH-${plan.name.toUpperCase()}-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
      
      // Insert the subscription code into the database
      const { error } = await supabase
        .from("subscription_codes")
        .insert({
          code,
          plan_name: plan.name,
          duration_days: plan.days,
          price: parseFloat(plan.price.replace("$", "")),
        });

      if (error) {
        console.error("Error creating subscription code:", error);
        // Even if there's an error, show the code (for demo purposes)
      }

      setGeneratedCode(code);
      setStep("success");
    } catch (error) {
      console.error("Payment error:", error);
      toast.error("Payment failed. Please try again.");
      setStep("form");
    }
  };

  const copyCode = () => {
    navigator.clipboard.writeText(generatedCode);
    setCopied(true);
    toast.success("Code copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleClose = () => {
    setStep("form");
    setEmail("");
    setCardNumber("");
    setExpiry("");
    setCvc("");
    setCardName("");
    setGeneratedCode("");
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-2xl p-4"
          onClick={handleClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            transition={{ type: "spring", damping: 30, stiffness: 400 }}
            className="w-full max-w-lg max-h-[90vh] overflow-y-auto relative"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-transparent to-primary/10 rounded-3xl blur-2xl opacity-50 pointer-events-none" />
            
            <div className="relative bg-card/95 backdrop-blur-xl rounded-2xl p-8 border border-border/50 shadow-2xl overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
              
              {/* Header */}
              <div className="flex items-start justify-between mb-8">
                <div>
                  <motion.div 
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex items-center gap-2 mb-2"
                  >
                    <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
                      <CreditCard className="w-4 h-4 text-primary" />
                    </div>
                    <span className="text-sm text-muted-foreground">Checkout</span>
                  </motion.div>
                  <h2 className="font-display text-2xl font-bold">
                    <span className="text-gradient">{plan.name}</span> Plan
                  </h2>
                </div>
                <motion.button
                  whileHover={{ scale: 1.1, rotate: 90 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={handleClose}
                  className="w-10 h-10 rounded-full glass flex items-center justify-center hover:bg-destructive/10 hover:text-destructive transition-colors"
                >
                  <X className="w-5 h-5" />
                </motion.button>
              </div>

              {/* Processing State */}
              {step === "processing" && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="py-16 text-center"
                >
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                    className="w-20 h-20 mx-auto mb-8 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center border border-primary/30"
                  >
                    <Loader2 className="w-10 h-10 text-primary" />
                  </motion.div>
                  <h3 className="font-display text-2xl font-bold text-foreground mb-3">
                    Processing Payment
                  </h3>
                  <p className="text-muted-foreground">
                    Please wait while we process your payment...
                  </p>
                </motion.div>
              )}

              {/* Success State */}
              {step === "success" && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="py-8 text-center"
                >
                  <motion.div
                    initial={{ scale: 0, rotate: -180 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ type: "spring", damping: 12, stiffness: 200 }}
                    className="w-24 h-24 mx-auto mb-8 rounded-full bg-gradient-to-br from-emerald-500/20 to-emerald-600/10 flex items-center justify-center border border-emerald-500/30"
                  >
                    <Check className="w-12 h-12 text-emerald-400" strokeWidth={3} />
                  </motion.div>
                  
                  <motion.h3
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="font-display text-3xl font-bold text-foreground mb-3"
                  >
                    Payment Successful!
                  </motion.h3>
                  
                  <motion.p
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="text-muted-foreground mb-8"
                  >
                    Your subscription code has been generated
                  </motion.p>

                  {/* Generated Code */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="p-6 rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/30 mb-6"
                  >
                    <div className="flex items-center justify-center gap-3 mb-4">
                      <Key className="w-6 h-6 text-primary" />
                      <span className="text-sm font-medium text-muted-foreground">Your Subscription Code</span>
                    </div>
                    <code className="block text-xl font-mono font-bold text-primary mb-4 break-all">
                      {generatedCode}
                    </code>
                    <Button
                      variant="outline"
                      onClick={copyCode}
                      className="w-full"
                    >
                      {copied ? (
                        <>
                          <Check className="w-4 h-4 mr-2 text-emerald-500" />
                          Copied!
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4 mr-2" />
                          Copy Code
                        </>
                      )}
                    </Button>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5 }}
                    className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-left"
                  >
                    <p className="text-sm text-amber-200">
                      <strong>Important:</strong> Save this code! You'll need it to create your account. 
                      Go to the <strong>Sign Up</strong> page and enter this code to activate your {plan.days} days subscription.
                    </p>
                  </motion.div>

                  <Button
                    variant="hero"
                    className="w-full mt-6"
                    onClick={() => {
                      handleClose();
                      window.location.href = "/auth";
                    }}
                  >
                    Go to Sign Up
                  </Button>
                </motion.div>
              )}

              {/* Form State */}
              {step === "form" && (
                <form onSubmit={handleSubmit} className="space-y-5">
                  {/* Email Input */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground">
                      Email Address
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      required
                      className="w-full px-4 py-3.5 rounded-xl bg-background border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all"
                    />
                  </div>

                  {/* Cardholder Name */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground">Cardholder Name</label>
                    <input
                      type="text"
                      value={cardName}
                      onChange={(e) => setCardName(e.target.value)}
                      placeholder="John Doe"
                      required
                      className="w-full px-4 py-3.5 rounded-xl bg-background border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all"
                    />
                  </div>

                  {/* Card Number */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground">Card Number</label>
                    <input
                      type="text"
                      value={cardNumber}
                      onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                      placeholder="4242 4242 4242 4242"
                      maxLength={19}
                      required
                      className="w-full px-4 py-3.5 rounded-xl bg-background border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all font-mono"
                    />
                  </div>

                  {/* Expiry and CVC */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-muted-foreground">Expiry Date</label>
                      <input
                        type="text"
                        value={expiry}
                        onChange={(e) => setExpiry(formatExpiry(e.target.value))}
                        placeholder="MM/YY"
                        maxLength={5}
                        required
                        className="w-full px-4 py-3.5 rounded-xl bg-background border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all font-mono"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-muted-foreground">Security Code</label>
                      <input
                        type="text"
                        value={cvc}
                        onChange={(e) => setCvc(e.target.value.replace(/\D/g, "").substring(0, 4))}
                        placeholder="123"
                        maxLength={4}
                        required
                        className="w-full px-4 py-3.5 rounded-xl bg-background border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all font-mono"
                      />
                    </div>
                  </div>

                  {/* Order Summary */}
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-5 rounded-2xl bg-gradient-to-br from-primary/5 to-primary/10 border border-primary/20"
                  >
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
                        <Sparkles className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-semibold text-foreground">{plan.name} Plan</p>
                        <p className="text-xs text-muted-foreground">{plan.days} days access</p>
                      </div>
                    </div>
                    <div className="flex justify-between items-center pt-4 border-t border-border/30">
                      <span className="text-muted-foreground">Total today</span>
                      <span className="font-display text-2xl font-bold text-primary">
                        {plan.price}
                      </span>
                    </div>
                  </motion.div>

                  {/* Submit Button */}
                  <Button
                    type="submit"
                    className="w-full h-14 text-lg font-semibold relative overflow-hidden group rounded-xl"
                    variant="hero"
                  >
                    <Lock className="w-5 h-5 mr-2" />
                    Pay {plan.price}
                  </Button>

                  {/* Security Badge */}
                  <div className="flex items-center justify-center gap-3 text-xs text-muted-foreground">
                    <Shield className="w-4 h-4 text-primary/60" />
                    <span>256-bit SSL encryption • Secure payment</span>
                  </div>
                </form>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default MockCheckoutModal;
