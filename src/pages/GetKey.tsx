import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Shield, CheckCircle2, Loader2, Copy, Check, ExternalLink, 
  Clock, Sparkles, RefreshCw, AlertTriangle, ChevronRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const FUNCTION_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ad-key-system`;

interface Checkpoint {
  order: number;
  provider: string;
  url: string;
  anti_bypass: boolean;
}

interface SessionData {
  session_token: string;
  current_step: number;
  total_steps: number;
  generated_key?: string;
  completed: boolean;
  key_expires_at?: string;
  checkpoints: Checkpoint[];
}

const providerLogos: Record<string, string> = {
  linkvertise: "🔗",
  lootlabs: "🎁",
  workink: "💼",
  shrtfly: "✈️",
  shrinkearn: "💰",
  custom: "🌐",
};

const providerNames: Record<string, string> = {
  linkvertise: "Linkvertise",
  lootlabs: "Lootlabs",
  workink: "Work.ink",
  shrtfly: "ShrtFly",
  shrinkearn: "ShrinkEarn",
  custom: "Verification",
};

const GetKey = () => {
  const [searchParams] = useSearchParams();
  const scriptId = searchParams.get("for") || searchParams.get("script_id");
  const errorParam = searchParams.get("error");
  
  const [session, setSession] = useState<SessionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [processingStep, setProcessingStep] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [redirecting, setRedirecting] = useState(false);

  useEffect(() => {
    if (errorParam) {
      const errorMessages: Record<string, string> = {
        invalid_callback: "Invalid callback received",
        invalid_token: "Invalid verification token",
        invalid_session: "Session expired or invalid",
        verification_failed: "Checkpoint verification failed. Please try again."
      };
      toast.error(errorMessages[errorParam] || "An error occurred");
    }
  }, [errorParam]);

  useEffect(() => {
    if (scriptId) {
      startSession();
    } else {
      setError("No script ID provided");
      setLoading(false);
    }
  }, [scriptId]);

  const startSession = async () => {
    try {
      const response = await fetch(`${FUNCTION_URL}?action=start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ script_id: scriptId }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Failed to start session");
        setLoading(false);
        return;
      }

      setSession(data);
      setLoading(false);
    } catch (err) {
      setError("Failed to connect to server");
      setLoading(false);
    }
  };

  const handleCheckpoint = async (step: number) => {
    if (!session) return;
    
    setProcessingStep(step);
    const checkpoint = session.checkpoints.find(c => c.order === step);

    if (checkpoint && checkpoint.url) {
      // Get redirect URL from backend
      try {
        const response = await fetch(`${FUNCTION_URL}?action=get_checkpoint_url`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            session_token: session.session_token,
            step,
          }),
        });

        const data = await response.json();

        if (data.redirect_url) {
          setRedirecting(true);
          // Open in new tab or redirect
          window.open(data.redirect_url, "_blank");
          
          // Poll for completion
          const pollInterval = setInterval(async () => {
            const statusResponse = await fetch(
              `${FUNCTION_URL}?action=get_status&session_token=${session.session_token}`
            );
            const statusData = await statusResponse.json();
            
            if (statusData.current_step >= step) {
              clearInterval(pollInterval);
              setRedirecting(false);
              setProcessingStep(null);
              setSession(prev => prev ? {
                ...prev,
                current_step: statusData.current_step,
                generated_key: statusData.generated_key,
                completed: statusData.completed,
                key_expires_at: statusData.key_expires_at,
              } : null);
              
              if (statusData.completed) {
                toast.success("Key generated successfully!");
              }
            }
          }, 2000);

          // Stop polling after 5 minutes
          setTimeout(() => {
            clearInterval(pollInterval);
            setRedirecting(false);
            setProcessingStep(null);
          }, 300000);

          return;
        }
      } catch (err) {
        console.error("Error getting checkpoint URL:", err);
      }
    }

    // Fallback to default flow (simulated wait)
    await new Promise(resolve => setTimeout(resolve, 3000));

    try {
      const response = await fetch(`${FUNCTION_URL}?action=complete_step`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_token: session.session_token,
          step,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.requires_redirect) {
          toast.error("Please complete the checkpoint link first");
        } else {
          toast.error(data.error || "Failed to complete step");
        }
        setProcessingStep(null);
        return;
      }

      setSession(prev => prev ? {
        ...prev,
        current_step: data.current_step,
        generated_key: data.generated_key,
        completed: data.completed,
      } : null);

      if (data.completed) {
        toast.success("Key generated successfully!");
      }
    } catch (err) {
      toast.error("Failed to complete step");
    }
    
    setProcessingStep(null);
  };

  const resetSession = async () => {
    if (!session) return;
    
    try {
      await fetch(`${FUNCTION_URL}?action=reset_session`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_token: session.session_token }),
      });
      
      setSession(null);
      setLoading(true);
      startSession();
      toast.success("Session reset successfully");
    } catch (err) {
      toast.error("Failed to reset session");
    }
  };

  const copyKey = () => {
    if (session?.generated_key) {
      navigator.clipboard.writeText(session.generated_key);
      setCopied(true);
      toast.success("Key copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const getTimeRemaining = () => {
    if (!session?.key_expires_at) return "24 hours";
    const expires = new Date(session.key_expires_at);
    const now = new Date();
    const diff = expires.getTime() - now.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes} minutes`;
  };

  const steps = Array.from({ length: session?.total_steps || 3 }, (_, i) => {
    const checkpoint = session?.checkpoints.find(c => c.order === i + 1);
    return {
      id: i + 1,
      title: checkpoint ? providerNames[checkpoint.provider] || "Checkpoint" : `Step ${i + 1}`,
      description: checkpoint 
        ? `Complete ${providerNames[checkpoint.provider]} verification`
        : "Complete the checkpoint",
      provider: checkpoint?.provider || "default",
      hasCheckpoint: !!checkpoint,
    };
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Initializing session...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-8 h-8 text-destructive" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">Error</h1>
          <p className="text-muted-foreground mb-4">{error}</p>
          <Button onClick={() => window.location.reload()} variant="outline">
            <RefreshCw className="w-4 h-4 mr-2" />
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:64px_64px] [mask-image:radial-gradient(ellipse_at_center,black_20%,transparent_70%)]" />
      <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-primary/15 rounded-full blur-[120px]" />
      <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-primary/10 rounded-full blur-[100px]" />

      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center px-4 py-12">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-6">
            <Shield className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-primary">Key System</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-2">
            Get Your Access Key
          </h1>
          <p className="text-muted-foreground max-w-md mx-auto">
            Complete {session?.total_steps || 3} checkpoint{(session?.total_steps || 3) > 1 ? 's' : ''} to receive your key
          </p>
        </motion.div>

        {/* Main Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="w-full max-w-lg"
        >
          <div className="relative">
            <div className="absolute -inset-1 bg-gradient-to-r from-primary/20 via-transparent to-primary/20 rounded-3xl blur-xl opacity-50" />
            
            <div 
              className="relative rounded-2xl p-6 md:p-8 border border-border/50"
              style={{
                background: "linear-gradient(180deg, hsl(var(--card)) 0%, hsl(var(--card) / 0.8) 100%)",
                backdropFilter: "blur(20px)"
              }}
            >
              {/* Redirecting Overlay */}
              <AnimatePresence>
                {redirecting && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 bg-background/90 rounded-2xl flex flex-col items-center justify-center z-10"
                  >
                    <Loader2 className="w-12 h-12 animate-spin text-primary mb-4" />
                    <p className="text-foreground font-medium mb-2">Waiting for checkpoint completion...</p>
                    <p className="text-sm text-muted-foreground">Complete the checkpoint in the new tab</p>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Steps */}
              <div className="space-y-3 mb-8">
                {steps.map((step, index) => {
                  const isCompleted = session && session.current_step >= step.id;
                  const isCurrent = session && session.current_step === step.id - 1;
                  const isProcessing = processingStep === step.id;
                  const isLocked = session && session.current_step < step.id - 1;

                  return (
                    <motion.div
                      key={step.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.05 * index }}
                      className={`relative flex items-center gap-4 p-4 rounded-xl border transition-all ${
                        isCompleted
                          ? "bg-emerald-500/10 border-emerald-500/30"
                          : isCurrent
                          ? "bg-primary/10 border-primary/30 shadow-lg shadow-primary/10"
                          : isLocked
                          ? "bg-muted/20 border-border/30 opacity-60"
                          : "bg-muted/30 border-border/50"
                      }`}
                    >
                      {/* Step indicator */}
                      <div className={`shrink-0 w-12 h-12 rounded-xl flex items-center justify-center text-lg ${
                        isCompleted
                          ? "bg-emerald-500 text-white"
                          : isCurrent
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground"
                      }`}>
                        {isProcessing ? (
                          <Loader2 className="w-5 h-5 animate-spin" />
                        ) : isCompleted ? (
                          <CheckCircle2 className="w-6 h-6" />
                        ) : (
                          <span>{providerLogos[step.provider] || step.id}</span>
                        )}
                      </div>

                      {/* Step content */}
                      <div className="flex-1 min-w-0">
                        <h3 className={`font-semibold ${isCompleted ? "text-emerald-400" : "text-foreground"}`}>
                          {step.title}
                        </h3>
                        <p className="text-sm text-muted-foreground">{step.description}</p>
                      </div>

                      {/* Action button */}
                      {isCurrent && !isCompleted && (
                        <Button
                          onClick={() => handleCheckpoint(step.id)}
                          disabled={isProcessing || redirecting}
                          className="shrink-0 gap-2"
                          size="sm"
                        >
                          {isProcessing ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" />
                              Wait...
                            </>
                          ) : (
                            <>
                              {step.hasCheckpoint ? "Open Link" : "Continue"}
                              <ChevronRight className="w-4 h-4" />
                            </>
                          )}
                        </Button>
                      )}

                      {isCompleted && (
                        <div className="shrink-0 px-3 py-1.5 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-medium flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          Done
                        </div>
                      )}
                    </motion.div>
                  );
                })}
              </div>

              {/* Generated Key */}
              <AnimatePresence>
                {session?.completed && session.generated_key && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="space-y-4"
                  >
                    <div className="text-center mb-4">
                      <div className="inline-flex items-center gap-2 text-emerald-400 mb-2">
                        <Sparkles className="w-5 h-5" />
                        <span className="font-semibold">Your Key is Ready!</span>
                      </div>
                    </div>

                    <div 
                      className="p-4 rounded-xl bg-gradient-to-r from-primary/10 to-emerald-500/10 border border-primary/30 flex items-center justify-between gap-4"
                      style={{ boxShadow: "0 0 30px hsl(var(--primary) / 0.15)" }}
                    >
                      <code className="font-mono text-sm md:text-base text-primary truncate flex-1 select-all">
                        {session.generated_key}
                      </code>
                      <Button
                        onClick={copyKey}
                        variant={copied ? "default" : "secondary"}
                        size="sm"
                        className="shrink-0 gap-2"
                      >
                        {copied ? (
                          <>
                            <Check className="w-4 h-4" />
                            Copied!
                          </>
                        ) : (
                          <>
                            <Copy className="w-4 h-4" />
                            Copy
                          </>
                        )}
                      </Button>
                    </div>

                    <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                      <Clock className="w-3 h-3" />
                      <span>Key expires in {getTimeRemaining()}</span>
                    </div>

                    <div className="text-center p-4 rounded-xl bg-muted/30 border border-border/30">
                      <p className="text-sm text-muted-foreground">
                        Copy this key and paste it in the script to activate.
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Progress indicator */}
              {session && !session.completed && (
                <div className="mt-6">
                  <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
                    <span>Progress</span>
                    <span>{session.current_step} / {session.total_steps} completed</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-gradient-to-r from-primary to-emerald-500 rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: `${(session.current_step / session.total_steps) * 100}%` }}
                      transition={{ duration: 0.5, ease: "easeOut" }}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </motion.div>

        {/* Footer with reset option */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="mt-8 text-center space-y-4"
        >
          <p className="text-xs text-muted-foreground">
            Powered by <span className="text-primary font-medium">ShadowAuth</span>
          </p>
          
          {session && !session.completed && (
            <button
              onClick={resetSession}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors underline underline-offset-2"
            >
              Forget Browser / Reset Progress
            </button>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default GetKey;