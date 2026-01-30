import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, CreditCard, Wallet, Bitcoin, Loader2, Lock, Shield, Check, AlertCircle, Sparkles, Tag, Percent } from "lucide-react";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, CardNumberElement, CardExpiryElement, CardCvcElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

const stripePromise = loadStripe("pk_test_51Ru0z2IHFoKvK2ctfYFoYVXeCgHe7iZv2e19xKe0oU02k2cFEqYpCiAB5d5GmvYQQgB5xjAOQaafr0FTHlQMNu9w00lLjX3pOL");

type PaymentMethod = "card" | "paypal" | "crypto";
type PaymentStatus = "idle" | "processing" | "success" | "declined";

interface PromoCodeState {
  code: string;
  discount_percent: number;
  valid: boolean;
}

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  plan: {
    name: string;
    price: string;
    priceId?: string;
    days?: number;
  };
}

const elementStyles = {
  style: {
    base: {
      fontSize: "16px",
      color: "#fafafa",
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
      letterSpacing: "0.025em",
      "::placeholder": {
        color: "#71717a",
      },
      iconColor: "#71717a",
    },
    invalid: {
      color: "#ef4444",
      iconColor: "#ef4444",
    },
    complete: {
      color: "#22c55e",
      iconColor: "#22c55e",
    },
  },
};

// List of disposable/temporary email domains
const DISPOSABLE_EMAIL_DOMAINS = [
  'tempmail.com', 'temp-mail.org', 'guerrillamail.com', 'guerrillamail.org',
  '10minutemail.com', '10minutemail.net', 'mailinator.com', 'maildrop.cc',
  'throwaway.email', 'trashmail.com', 'trashmail.net', 'fakeinbox.com',
  'tempinbox.com', 'getnada.com', 'mohmal.com', 'sharklasers.com',
  'spam4.me', 'grr.la', 'yopmail.com', 'yopmail.fr', 'tempail.com',
  'emailondeck.com', 'dispostable.com', 'mailnesia.com', 'mailcatch.com',
  'throwawaymail.com', 'mintemail.com', 'tempmailaddress.com', 'burnermail.io',
  'getairmail.com', 'tmpmail.org', 'tmpmail.net', 'email-fake.com',
  'fakemailgenerator.com', 'generator.email', 'mailsac.com', 'inboxalias.com',
  'tempr.email', 'discard.email', 'discardmail.com', 'spamgourmet.com',
  'mailexpire.com', 'mailmoat.com', 'mt2015.com', 'nada.email', 'pookmail.com',
  'binkmail.com', 'bobmail.info', 'chammy.info', 'devnullmail.com', 'letthemeatspam.com',
  'maildx.com', 'mailnull.com', 'meltmail.com', 'mytrashmail.com', 'nomail.xl.cx',
  'spamavert.com', 'spambox.us', 'spamcero.com', 'spamex.com', 'spamfree24.org',
  'spamspot.com', 'spamthis.co.uk', 'tempemail.net', 'trash-mail.at', 'trashmail.me',
  'wegwerfmail.de', 'wegwerfmail.net', 'wegwerfmail.org', 'mailtemp.info', 'tmpbox.net',
  'mail-temp.com', 'tempmailer.com', 'mailforspam.com', 'guerrillamailblock.com'
];

const validateEmail = (email: string): { valid: boolean; error?: string } => {
  // Basic format validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { valid: false, error: "Invalid email format" };
  }

  // Check for common typos in popular domains
  const domain = email.split('@')[1].toLowerCase();
  const typoPatterns: Record<string, string[]> = {
    'gmail.com': ['gmial.com', 'gmal.com', 'gmaill.com', 'gamil.com', 'gmali.com', 'gnail.com'],
    'yahoo.com': ['yaho.com', 'yahooo.com', 'yhoo.com', 'yhaoo.com'],
    'hotmail.com': ['hotmal.com', 'hotmial.com', 'hotmaill.com', 'hotmali.com'],
    'outlook.com': ['outlok.com', 'outllok.com', 'outlookk.com'],
    'icloud.com': ['iclould.com', 'icoud.com', 'iclooud.com']
  };

  for (const [correct, typos] of Object.entries(typoPatterns)) {
    if (typos.includes(domain)) {
      return { valid: false, error: `Did you mean @${correct}?` };
    }
  }

  // Check for disposable/temporary email domains
  if (DISPOSABLE_EMAIL_DOMAINS.includes(domain)) {
    return { valid: false, error: "Temporary email addresses are not allowed" };
  }

  // Check for suspicious patterns
  if (/^[a-z0-9]{20,}@/.test(email.toLowerCase())) {
    return { valid: false, error: "Please use a valid personal email address" };
  }

  // Check minimum length for local part
  const localPart = email.split('@')[0];
  if (localPart.length < 2) {
    return { valid: false, error: "Email address is too short" };
  }

  // Check for valid TLD (at least 2 characters)
  const tld = domain.split('.').pop() || '';
  if (tld.length < 2) {
    return { valid: false, error: "Invalid email domain" };
  }

  return { valid: true };
};

const PaymentForm = ({ plan, onClose, appliedPromo }: { plan: CheckoutModalProps["plan"]; onClose: () => void; appliedPromo: PromoCodeState | null }) => {
  const stripe = useStripe();
  const elements = useElements();
  const navigate = useNavigate();
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>("idle");
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState("");
  const [cardholderName, setCardholderName] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  // Calculate discounted price
  const originalPrice = parseFloat(plan.price.replace("$", ""));
  const discountedPrice = appliedPromo 
    ? originalPrice * (1 - appliedPromo.discount_percent / 100)
    : originalPrice;
  const displayPrice = appliedPromo ? `$${discountedPrice.toFixed(2)}` : plan.price;

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newEmail = e.target.value;
    setEmail(newEmail);
    
    if (newEmail.length > 0) {
      const validation = validateEmail(newEmail);
      setEmailError(validation.error || "");
    } else {
      setEmailError("");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!stripe || !elements) {
      return;
    }

    // Validate email before processing
    const emailValidation = validateEmail(email);
    if (!emailValidation.valid) {
      setEmailError(emailValidation.error || "Invalid email");
      return;
    }

    setPaymentStatus("processing");
    setErrorMessage("");

    try {
      const response = await supabase.functions.invoke("create-checkout", {
        body: { priceId: plan.priceId, email },
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      const { clientSecret } = response.data;

      if (!clientSecret) {
        throw new Error("Failed to create payment intent");
      }

      const cardNumberElement = elements.getElement(CardNumberElement);
      
      if (!cardNumberElement) {
        throw new Error("Card element not found");
      }

      const { error, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card: cardNumberElement,
          billing_details: {
            name: cardholderName,
            email: email,
          },
        },
      });

      if (error) {
        setPaymentStatus("declined");
        setErrorMessage(error.message || "Your card was declined");
        
        setTimeout(() => {
          onClose();
          navigate("/");
        }, 5000);
      } else if (paymentIntent?.status === "succeeded") {
        setPaymentStatus("success");
        
        // Record the sale
        try {
          const { data: { user } } = await supabase.auth.getUser();
          await supabase.from("sales").insert({
            user_id: user?.id || null,
            user_email: email,
            plan_name: plan.name,
            amount: discountedPrice,
            discount_percent: appliedPromo?.discount_percent || 0,
            promo_code: appliedPromo?.code || null,
            duration_days: plan.days || 30,
            payment_method: "card",
            status: "completed"
          });
        } catch (saleError) {
          console.error("Failed to record sale:", saleError);
        }
        
        setTimeout(() => {
          onClose();
          navigate("/dashboard");
        }, 5000);
      }
    } catch (error: any) {
      setPaymentStatus("declined");
      setErrorMessage(error.message || "Payment failed");
      
      setTimeout(() => {
        onClose();
        navigate("/");
      }, 5000);
    }
  };

  // Success State
  if (paymentStatus === "success") {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="py-16 text-center"
      >
        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: "spring", damping: 12, stiffness: 200 }}
          className="w-24 h-24 mx-auto mb-8 rounded-full bg-gradient-to-br from-emerald-500/20 to-emerald-600/10 flex items-center justify-center border border-emerald-500/30"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.3, type: "spring" }}
          >
            <Check className="w-12 h-12 text-emerald-400" strokeWidth={3} />
          </motion.div>
        </motion.div>
        
        <motion.h3
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="font-display text-3xl font-bold text-foreground mb-3"
        >
          Payment Successful!
        </motion.h3>
        
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="text-muted-foreground mb-8 text-lg"
        >
          Welcome to {plan.name}!
        </motion.p>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="inline-flex items-center gap-3 px-5 py-3 rounded-full glass text-sm text-muted-foreground"
        >
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>Redirecting to your dashboard...</span>
        </motion.div>
      </motion.div>
    );
  }

  // Declined State
  if (paymentStatus === "declined") {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="py-16 text-center"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", damping: 12, stiffness: 200 }}
          className="w-24 h-24 mx-auto mb-8 rounded-full bg-gradient-to-br from-destructive/20 to-destructive/10 flex items-center justify-center border border-destructive/30"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.3 }}
          >
            <AlertCircle className="w-12 h-12 text-destructive" strokeWidth={2} />
          </motion.div>
        </motion.div>
        
        <motion.h3
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="font-display text-3xl font-bold text-foreground mb-3"
        >
          Payment Declined
        </motion.h3>
        
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="text-muted-foreground mb-8 max-w-xs mx-auto"
        >
          {errorMessage || "Your card was declined. Please try a different payment method."}
        </motion.p>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="inline-flex items-center gap-3 px-5 py-3 rounded-full glass text-sm text-muted-foreground"
        >
          <div className="w-2 h-2 rounded-full bg-destructive animate-pulse" />
          <span>Returning to homepage...</span>
        </motion.div>
      </motion.div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Email Input */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-muted-foreground">
          Email Address
        </label>
        <input
          type="email"
          value={email}
          onChange={handleEmailChange}
          placeholder="you@example.com"
          required
          disabled={paymentStatus === "processing"}
          className={`w-full px-4 py-3.5 rounded-xl bg-background border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 transition-all disabled:opacity-50 ${
            emailError 
              ? "border-destructive focus:ring-destructive/20 focus:border-destructive" 
              : "border-border focus:ring-primary/20 focus:border-primary/50"
          }`}
        />
        {emailError && (
          <p className="text-xs text-destructive flex items-center gap-1">
            <AlertCircle className="w-3 h-3" />
            {emailError}
          </p>
        )}
      </div>

      {/* Cardholder Name */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-muted-foreground">Cardholder Name</label>
        <input
          type="text"
          value={cardholderName}
          onChange={(e) => setCardholderName(e.target.value)}
          placeholder="John Doe"
          required
          disabled={paymentStatus === "processing"}
          className="w-full px-4 py-3.5 rounded-xl bg-background border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all disabled:opacity-50"
        />
      </div>

      {/* Card Number */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-muted-foreground">Card Number</label>
        <div className="px-4 py-3.5 rounded-xl bg-background border border-border focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary/50 transition-all">
          <CardNumberElement options={elementStyles} />
        </div>
      </div>

      {/* Expiry and CVC */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-sm font-medium text-muted-foreground">Expiry Date</label>
          <div className="px-4 py-3.5 rounded-xl bg-background border border-border focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary/50 transition-all">
            <CardExpiryElement options={elementStyles} />
          </div>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-muted-foreground">Security Code</label>
          <div className="px-4 py-3.5 rounded-xl bg-background border border-border focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary/50 transition-all">
            <CardCvcElement options={elementStyles} />
          </div>
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
            <p className="text-xs text-muted-foreground">Billed monthly</p>
          </div>
        </div>
        
        {appliedPromo && (
          <div className="flex justify-between items-center py-2 text-sm">
            <span className="text-muted-foreground flex items-center gap-2">
              <Tag className="w-4 h-4 text-emerald-500" />
              {appliedPromo.code}
            </span>
            <span className="text-emerald-500 font-medium">-{appliedPromo.discount_percent}%</span>
          </div>
        )}
        
        <div className="flex justify-between items-center pt-4 border-t border-border/30">
          <span className="text-muted-foreground">Total today</span>
          <div className="text-right">
            {appliedPromo && (
              <span className="text-sm text-muted-foreground line-through mr-2">{plan.price}</span>
            )}
            <span className="font-display text-2xl font-bold text-primary">
              {displayPrice}<span className="text-sm text-muted-foreground font-normal">/month</span>
            </span>
          </div>
        </div>
      </motion.div>

      {/* Submit Button */}
      <Button
        type="submit"
        disabled={!stripe || paymentStatus === "processing" || !email || !cardholderName || !!emailError}
        className="w-full h-14 text-lg font-semibold relative overflow-hidden group rounded-xl"
        variant="hero"
      >
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent"
          initial={{ x: "-100%" }}
          animate={paymentStatus === "processing" ? { x: "100%" } : {}}
          transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
        />
        {paymentStatus === "processing" ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin mr-2" />
            Processing payment...
          </>
        ) : (
          <>
            <Lock className="w-5 h-5 mr-2" />
            Pay {displayPrice}/month
          </>
        )}
      </Button>

      {/* Security Badge */}
      <div className="flex items-center justify-center gap-3 text-xs text-muted-foreground">
        <Shield className="w-4 h-4 text-primary/60" />
        <span>256-bit SSL encryption • Powered by Stripe</span>
      </div>
    </form>
  );
};

const CheckoutModal = ({ isOpen, onClose, plan }: CheckoutModalProps) => {
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(null);
  const [promoCode, setPromoCode] = useState("");
  const [appliedPromo, setAppliedPromo] = useState<PromoCodeState | null>(null);
  const [validatingPromo, setValidatingPromo] = useState(false);
  const [promoError, setPromoError] = useState("");

  const handleValidatePromo = async () => {
    if (!promoCode.trim()) return;
    
    setValidatingPromo(true);
    setPromoError("");
    
    try {
      const response = await supabase.functions.invoke("validate-promo", {
        body: { code: promoCode },
      });

      if (response.data?.valid) {
        setAppliedPromo({
          code: response.data.code,
          discount_percent: response.data.discount_percent,
          valid: true,
        });
        toast.success(`Promo code applied! ${response.data.discount_percent}% off`);
      } else {
        setPromoError(response.data?.error || "Invalid promo code");
      }
    } catch (error) {
      setPromoError("Failed to validate promo code");
    } finally {
      setValidatingPromo(false);
    }
  };

  const removePromo = () => {
    setAppliedPromo(null);
    setPromoCode("");
    setPromoError("");
  };

  const handleMethodSelect = (method: PaymentMethod) => {
    setSelectedMethod(method);
  };

  const handleComingSoon = (method: string) => {
    toast.info(`${method} payment coming soon!`);
  };

  const handleClose = () => {
    setSelectedMethod(null);
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
            {/* Glow Effects - contained within bounds */}
            <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-transparent to-primary/10 rounded-3xl blur-2xl opacity-50 pointer-events-none" />
            
            <div className="relative bg-card/95 backdrop-blur-xl rounded-2xl p-8 border border-border/50 shadow-2xl overflow-hidden">
              {/* Decorative Line - contained */}
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

              {/* Promo Code Section */}
              {!selectedMethod && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-6"
                >
                  <div className="p-4 rounded-xl bg-background/50 border border-border/50">
                    <div className="flex items-center gap-2 mb-3">
                      <Tag className="w-4 h-4 text-primary" />
                      <span className="text-sm font-medium">Have a promo code?</span>
                    </div>
                    
                    {appliedPromo ? (
                      <div className="flex items-center justify-between p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30">
                        <div className="flex items-center gap-2">
                          <Check className="w-4 h-4 text-emerald-500" />
                          <span className="font-mono font-medium text-emerald-400">{appliedPromo.code}</span>
                          <span className="text-sm text-emerald-400">({appliedPromo.discount_percent}% off)</span>
                        </div>
                        <button
                          onClick={removePromo}
                          className="text-muted-foreground hover:text-foreground transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={promoCode}
                          onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                          placeholder="Enter code"
                          className="flex-1 px-3 py-2 rounded-lg bg-background border border-border text-sm font-mono uppercase placeholder:normal-case placeholder:font-sans focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50"
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleValidatePromo}
                          disabled={validatingPromo || !promoCode.trim()}
                          className="px-4"
                        >
                          {validatingPromo ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            "Apply"
                          )}
                        </Button>
                      </div>
                    )}
                    
                    {promoError && (
                      <p className="text-xs text-destructive mt-2 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        {promoError}
                      </p>
                    )}
                  </div>
                </motion.div>
              )}

              {/* Payment Method Selection */}
              {!selectedMethod && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-4"
                >
                  <p className="text-sm text-muted-foreground mb-6">
                    Select your preferred payment method
                  </p>
                  
                  <div className="grid grid-cols-1 gap-3">
                    {/* Card Payment */}
                    <motion.button
                      whileHover={{ scale: 1.02, y: -2 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => handleMethodSelect("card")}
                      className="group relative p-6 rounded-2xl border border-border/50 bg-background/50 hover:border-primary/50 hover:bg-primary/5 transition-all duration-300 text-left overflow-hidden"
                    >
                      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                      <div className="flex items-center gap-4 relative">
                        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center border border-primary/20 group-hover:border-primary/40 transition-colors">
                          <CreditCard className="w-7 h-7 text-primary" />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold text-foreground text-lg">Credit / Debit Card</h3>
                          <p className="text-sm text-muted-foreground mt-1">
                            Visa, Mastercard, American Express
                          </p>
                        </div>
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <Check className="w-4 h-4 text-primary" />
                        </div>
                      </div>
                    </motion.button>

                    {/* PayPal */}
                    <motion.button
                      whileHover={{ scale: 1.01 }}
                      onClick={() => handleComingSoon("PayPal")}
                      className="group relative p-6 rounded-2xl border border-border/30 bg-background/30 transition-all duration-300 text-left opacity-60"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-2xl bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
                          <Wallet className="w-7 h-7 text-blue-400" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-3">
                            <h3 className="font-semibold text-foreground text-lg">PayPal</h3>
                            <span className="px-2.5 py-1 text-[10px] font-semibold rounded-full bg-muted text-muted-foreground uppercase tracking-wider">Coming Soon</span>
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">
                            Pay with your PayPal account
                          </p>
                        </div>
                      </div>
                    </motion.button>

                    {/* Crypto */}
                    <motion.button
                      whileHover={{ scale: 1.01 }}
                      onClick={() => handleComingSoon("Crypto")}
                      className="group relative p-6 rounded-2xl border border-border/30 bg-background/30 transition-all duration-300 text-left opacity-60"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-2xl bg-orange-500/10 flex items-center justify-center border border-orange-500/20">
                          <Bitcoin className="w-7 h-7 text-orange-400" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-3">
                            <h3 className="font-semibold text-foreground text-lg">Cryptocurrency</h3>
                            <span className="px-2.5 py-1 text-[10px] font-semibold rounded-full bg-muted text-muted-foreground uppercase tracking-wider">Coming Soon</span>
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">
                            Bitcoin, Ethereum, USDT
                          </p>
                        </div>
                      </div>
                    </motion.button>
                  </div>
                </motion.div>
              )}

              {/* Card Payment Form */}
              {selectedMethod === "card" && (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <button
                    onClick={() => setSelectedMethod(null)}
                    className="mb-6 text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-2"
                  >
                    ← Back to payment methods
                  </button>
                  
                  <Elements stripe={stripePromise}>
                    <PaymentForm plan={plan} onClose={handleClose} appliedPromo={appliedPromo} />
                  </Elements>
                </motion.div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default CheckoutModal;
