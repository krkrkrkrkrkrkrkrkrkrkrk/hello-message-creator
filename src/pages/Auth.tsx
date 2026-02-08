import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Shield, Mail, Lock, Eye, EyeOff, Loader2, Key, Check, AlertCircle, Crown, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [subscriptionCode, setSubscriptionCode] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<"google" | "discord" | null>(null);
  const [hasSubscriptionCode, setHasSubscriptionCode] = useState(false);
  const [codeValidation, setCodeValidation] = useState<{
    valid: boolean;
    planName?: string;
    days?: number;
    message?: string;
  } | null>(null);
  const [validatingCode, setValidatingCode] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!cancelled && session) {
        navigate("/dashboard");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [navigate]);

  const validateSubscriptionCode = async (code: string) => {
    if (!code || code.length < 5) {
      setCodeValidation(null);
      return;
    }

    setValidatingCode(true);
    try {
      const { data, error } = await supabase
        .from("subscription_codes")
        .select("*")
        .eq("code", code)
        .eq("is_used", false)
        .maybeSingle();

      if (error) {
        setCodeValidation({ valid: false, message: "Error validating code" });
      } else if (data) {
        setCodeValidation({
          valid: true,
          planName: data.plan_name,
          days: data.duration_days,
        });
      } else {
        setCodeValidation({ valid: false, message: "Invalid or already used code" });
      }
    } catch (error) {
      setCodeValidation({ valid: false, message: "Error validating code" });
    }
    setValidatingCode(false);
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      if (!isLogin && hasSubscriptionCode && subscriptionCode) {
        validateSubscriptionCode(subscriptionCode);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [subscriptionCode, isLogin, hasSubscriptionCode]);

  const handleOAuthLogin = async (provider: "google" | "discord") => {
    setOauthLoading(provider);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/dashboard`,
        },
      });
      if (error) throw error;
    } catch (error: any) {
      toast.error(`${provider} login failed: ${error.message}. Please ensure the provider is enabled.`);
      setOauthLoading(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        toast.success("Welcome back!");
        navigate("/dashboard");
      } else {
        // Sign up the user (with or without subscription code)
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/dashboard`,
          },
        });
        if (authError) throw authError;

        if (authData.user) {
          // Wait a moment for the profile trigger to create the profile
          await new Promise((resolve) => setTimeout(resolve, 1000));

          if (hasSubscriptionCode && codeValidation?.valid && subscriptionCode) {
            // User has valid subscription code
            const expiresAt = new Date();
            expiresAt.setDate(expiresAt.getDate() + (codeValidation.days || 30));

            // Update the subscription code as used
            await supabase
              .from("subscription_codes")
              .update({
                is_used: true,
                used_by: authData.user.id,
                used_at: new Date().toISOString(),
              })
              .eq("code", subscriptionCode)
              .eq("is_used", false);

            // Update profile with subscription info
            const { error: profileError } = await supabase
              .from("profiles")
              .upsert(
                {
                  id: authData.user.id,
                  email: email,
                  subscription_plan: codeValidation.planName,
                  subscription_started_at: new Date().toISOString(),
                  subscription_expires_at: expiresAt.toISOString(),
                  api_key: await generateApiKey(),
                },
                { onConflict: "id" }
              );

            if (profileError) {
              console.error("Failed to update profile:", profileError);
            }
          } else {
            // Free user without subscription
            const { error: profileError } = await supabase
              .from("profiles")
              .upsert(
                {
                  id: authData.user.id,
                  email: email,
                  subscription_plan: "free",
                  api_key: await generateApiKey(),
                },
                { onConflict: "id" }
              );

            if (profileError) {
              console.error("Failed to update profile:", profileError);
            }
          }
        }

        toast.success("Account created successfully!");
        navigate("/dashboard");
      }
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const generateApiKey = async () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let result = "";
    for (let i = 0; i < 32; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 relative overflow-hidden">
      {/* Animated Background Grid */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:64px_64px] [mask-image:radial-gradient(ellipse_at_center,black_20%,transparent_70%)]" />
      
      {/* Glowing Orbs */}
      <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-primary/20 rounded-full blur-[120px] animate-pulse" />
      <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-primary/15 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: "1s" }} />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/10 rounded-full blur-[150px]" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="relative z-10 w-full max-w-[420px]"
      >
        {/* Logo Section */}
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", duration: 0.8, bounce: 0.4 }}
            className="relative inline-flex"
          >
            {/* Glow ring */}
            <div className="absolute inset-0 rounded-2xl bg-primary/40 blur-xl animate-pulse" />
            <div 
              className="relative w-16 h-16 rounded-2xl flex items-center justify-center border border-primary/50"
              style={{
                background: "linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--primary) / 0.7) 100%)",
                boxShadow: "0 0 40px hsl(var(--primary) / 0.4), inset 0 1px 0 rgba(255,255,255,0.2)"
              }}
            >
              <Shield className="w-8 h-8 text-white drop-shadow-lg" />
            </div>
          </motion.div>
          
          <motion.h1 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-3xl font-bold mt-5 tracking-tight"
          >
            <span className="text-foreground">Shadow</span>
            <span className="text-primary">Auth</span>
          </motion.h1>
          
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="text-muted-foreground mt-2 text-sm"
          >
            {isLogin ? "Welcome back! Sign in to continue" : "Create your account to get started"}
          </motion.p>
        </div>

        {/* Main Card */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="relative"
        >
          {/* Card glow effect */}
          <div className="absolute -inset-1 bg-gradient-to-r from-primary/20 via-transparent to-primary/20 rounded-3xl blur-xl opacity-50" />
          
          <div 
            className="relative rounded-2xl p-6 md:p-8 border border-border/50"
            style={{
              background: "linear-gradient(180deg, hsl(var(--card)) 0%, hsl(var(--card) / 0.8) 100%)",
              backdropFilter: "blur(20px)"
            }}
          >
            {/* OAuth Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="space-y-3"
            >
              <Button
                type="button"
                variant="outline"
                className="w-full h-12 gap-3 text-sm font-medium bg-background/50 border-border/50 hover:bg-background hover:border-primary/30 transition-all group"
                onClick={() => handleOAuthLogin("google")}
                disabled={oauthLoading !== null || loading}
              >
                {oauthLoading === "google" ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <svg className="w-5 h-5 group-hover:scale-110 transition-transform" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                  </svg>
                )}
                Continue with Google
              </Button>

              <Button
                type="button"
                variant="outline"
                className="w-full h-12 gap-3 text-sm font-medium bg-background/50 border-border/50 hover:bg-background hover:border-[#5865F2]/50 transition-all group"
                onClick={() => handleOAuthLogin("discord")}
                disabled={oauthLoading !== null || loading}
              >
                {oauthLoading === "discord" ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <svg className="w-5 h-5 text-[#5865F2] group-hover:scale-110 transition-transform" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
                  </svg>
                )}
                Continue with Discord
              </Button>
            </motion.div>

            {/* Divider */}
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border/30"></div>
              </div>
              <div className="relative flex justify-center">
                <span className="bg-card px-4 text-xs text-muted-foreground uppercase tracking-wider">or continue with email</span>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Subscription Code Toggle - Only for signup */}
              {!isLogin && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  className="space-y-3"
                >
                  {/* Premium Toggle */}
                  <div 
                    className="flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all border"
                    onClick={() => setHasSubscriptionCode(!hasSubscriptionCode)}
                    style={{
                      background: hasSubscriptionCode 
                        ? "linear-gradient(135deg, hsl(var(--primary) / 0.1) 0%, hsl(var(--primary) / 0.05) 100%)"
                        : "hsl(var(--muted) / 0.3)",
                      borderColor: hasSubscriptionCode ? "hsl(var(--primary) / 0.3)" : "transparent"
                    }}
                  >
                    <div 
                      className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${
                        hasSubscriptionCode 
                          ? "bg-primary border-primary" 
                          : "border-muted-foreground/30"
                      }`}
                    >
                      {hasSubscriptionCode && <Check className="w-3 h-3 text-primary-foreground" />}
                    </div>
                    <div className="flex items-center gap-2">
                      <Crown className={`w-4 h-4 ${hasSubscriptionCode ? "text-primary" : "text-muted-foreground"}`} />
                      <span className="text-sm font-medium text-foreground">I have a subscription code</span>
                    </div>
                  </div>

                  {hasSubscriptionCode && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="space-y-2"
                    >
                      <div className="relative">
                        <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary" />
                        <Input
                          type="text"
                          placeholder="Enter your code"
                          value={subscriptionCode}
                          onChange={(e) => setSubscriptionCode(e.target.value.toUpperCase())}
                          className="pl-10 h-11 bg-background/50 border-border/30 focus:border-primary/50 font-mono uppercase tracking-wider text-sm"
                        />
                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                          {validatingCode && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
                          {!validatingCode && codeValidation?.valid && <Check className="w-4 h-4 text-emerald-500" />}
                          {!validatingCode && codeValidation && !codeValidation.valid && <AlertCircle className="w-4 h-4 text-destructive" />}
                        </div>
                      </div>

                      {codeValidation && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className={`p-3 rounded-lg text-sm flex items-center gap-2 ${
                            codeValidation.valid
                              ? "bg-emerald-500/10 border border-emerald-500/30 text-emerald-400"
                              : "bg-destructive/10 border border-destructive/30 text-destructive"
                          }`}
                        >
                          {codeValidation.valid ? (
                            <>
                              <Sparkles className="w-4 h-4" />
                              <span><strong>{codeValidation.planName}</strong> • {codeValidation.days} days</span>
                            </>
                          ) : (
                            <span>{codeValidation.message}</span>
                          )}
                        </motion.div>
                      )}
                    </motion.div>
                  )}

                  {!hasSubscriptionCode && (
                    <p className="text-xs text-muted-foreground px-1 flex items-center gap-1">
                      <Sparkles className="w-3 h-3" />
                      Free tier available. <a href="/#pricing" className="text-primary hover:underline font-medium">Upgrade anytime</a>
                    </p>
                  )}
                </motion.div>
              )}

              {/* Email Input */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground flex items-center gap-2">
                  <Mail className="w-4 h-4 text-muted-foreground" />
                  Email
                </label>
                <Input
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-11 bg-background/50 border-border/30 focus:border-primary/50 transition-colors"
                  required
                />
              </div>

              {/* Password Input */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground flex items-center gap-2">
                  <Lock className="w-4 h-4 text-muted-foreground" />
                  Password
                </label>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-11 pr-10 bg-background/50 border-border/30 focus:border-primary/50 transition-colors"
                    required
                    minLength={6}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <motion.div
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
              >
                <Button
                  type="submit"
                  disabled={loading || (hasSubscriptionCode && !codeValidation?.valid && subscriptionCode.length > 0)}
                  className="w-full h-12 text-sm font-semibold mt-2 relative overflow-hidden group"
                  style={{
                    background: "linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--primary) / 0.8) 100%)",
                    boxShadow: "0 4px 20px hsl(var(--primary) / 0.3)"
                  }}
                >
                  {/* Shimmer effect */}
                  <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                  
                  {loading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <span className="relative z-10">{isLogin ? "Sign In" : "Create Account"}</span>
                  )}
                </Button>
              </motion.div>
            </form>

            {/* Toggle Login/Signup */}
            <div className="mt-6 text-center">
              <p className="text-sm text-muted-foreground">
                {isLogin ? "Don't have an account?" : "Already have an account?"}{" "}
                <button
                  onClick={() => {
                    setIsLogin(!isLogin);
                    setCodeValidation(null);
                    setSubscriptionCode("");
                    setHasSubscriptionCode(false);
                  }}
                  className="text-primary font-semibold hover:underline transition-colors"
                >
                  {isLogin ? "Sign up" : "Sign in"}
                </button>
              </p>
            </div>
          </div>
        </motion.div>

        {/* Footer */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-center text-xs text-muted-foreground mt-6"
        >
          By continuing, you agree to our{" "}
          <a href="#" className="text-primary hover:underline">Terms</a>
          {" "}and{" "}
          <a href="#" className="text-primary hover:underline">Privacy Policy</a>
        </motion.p>
      </motion.div>
    </div>
  );
};

export default Auth;
