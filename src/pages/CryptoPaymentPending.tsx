import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Bitcoin, Loader2, Check, X, Copy, Clock, RefreshCw, ExternalLink, Shield, Key } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

type PaymentStatus = "pending" | "confirming" | "completed" | "failed" | "expired" | "rejected";

interface PaymentData {
  order_id: string;
  invoice_id: string;
  plan_name: string;
  amount: number;
  status: PaymentStatus;
  api_key: string | null;
  created_at: string;
}

const CryptoPaymentPending = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const orderId = searchParams.get("order_id");
  
  const [paymentData, setPaymentData] = useState<PaymentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [polling, setPolling] = useState(true);
  const [showApiKey, setShowApiKey] = useState(false);

  const fetchPaymentStatus = async () => {
    if (!orderId) return;

    try {
      const { data, error } = await supabase
        .from("crypto_payments")
        .select("*")
        .eq("order_id", orderId)
        .single();

      if (error) {
        console.error("Error fetching payment:", error);
        return;
      }

      setPaymentData(data as PaymentData);
      
      // Stop polling if payment is completed, failed, or expired
      if (data.status === "completed" || data.status === "failed" || data.status === "expired") {
        setPolling(false);
      }
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!orderId) {
      navigate("/pricing");
      return;
    }

    fetchPaymentStatus();

    // Poll every 5 seconds while pending
    const interval = setInterval(() => {
      if (polling) {
        fetchPaymentStatus();
      }
    }, 5000);

    // Set up realtime subscription for instant updates when admin approves
    const channel = supabase
      .channel(`payment-${orderId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'crypto_payments',
          filter: `order_id=eq.${orderId}`
        },
        (payload) => {
          console.log('Payment updated:', payload);
          const newData = payload.new as PaymentData;
          setPaymentData(newData);
          
          if (newData.status === "completed") {
            setPolling(false);
            toast.success("Pagamento aprovado! Sua API Key está pronta.");
          } else if (newData.status === "rejected") {
            setPolling(false);
            toast.error("Pagamento rejeitado. Por favor, tente novamente.");
          }
        }
      )
      .subscribe();

    return () => {
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, [orderId, polling]);

  const copyApiKey = () => {
    if (paymentData?.api_key) {
      navigator.clipboard.writeText(paymentData.api_key);
      toast.success("API Key copied to clipboard!");
    }
  };

  const getStatusIcon = () => {
    switch (paymentData?.status) {
      case "pending":
        return <Clock className="w-12 h-12 text-yellow-400" />;
      case "confirming":
        return <Loader2 className="w-12 h-12 text-blue-400 animate-spin" />;
      case "completed":
        return <Check className="w-12 h-12 text-primary" strokeWidth={3} />;
      case "failed":
      case "expired":
      case "rejected":
        return <X className="w-12 h-12 text-destructive" />;
      default:
        return <Loader2 className="w-12 h-12 animate-spin" />;
    }
  };

  const getStatusColor = () => {
    switch (paymentData?.status) {
      case "pending":
        return "from-yellow-500/20 to-yellow-600/10 border-yellow-500/30";
      case "confirming":
        return "from-blue-500/20 to-blue-600/10 border-blue-500/30";
      case "completed":
        return "from-primary/20 to-primary/10 border-primary/30";
      case "failed":
      case "expired":
      case "rejected":
        return "from-destructive/20 to-destructive/10 border-destructive/30";
      default:
        return "from-muted/20 to-muted/10 border-border";
    }
  };

  const getStatusText = () => {
    switch (paymentData?.status) {
      case "pending":
        return "Waiting for Payment";
      case "confirming":
        return "Confirming on Blockchain";
      case "completed":
        return "Payment Successful!";
      case "failed":
        return "Payment Failed";
      case "expired":
        return "Payment Expired";
      case "rejected":
        return "Payment Rejected";
      default:
        return "Loading...";
    }
  };

  const getStatusDescription = () => {
    switch (paymentData?.status) {
      case "pending":
        return "Please complete your payment in the NOWPayments window. This page will automatically update when we detect your payment.";
      case "confirming":
        return "We've detected your payment! Waiting for blockchain confirmations. This usually takes a few minutes.";
      case "completed":
        return "Your payment has been confirmed! Your API key is ready below.";
      case "failed":
        return "Something went wrong with your payment. Please try again or contact support.";
      case "expired":
        return "Your payment session has expired. Please create a new payment.";
      case "rejected":
        return "Your payment was rejected by our team. Please try again or contact support.";
      default:
        return "Loading payment status...";
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!paymentData) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Payment Not Found</h1>
          <p className="text-muted-foreground mb-6">We couldn't find this payment. Please check your order ID.</p>
          <Button onClick={() => navigate("/pricing")}>
            Go to Pricing
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 pointer-events-none">
        <motion.div 
          animate={{ 
            scale: [1, 1.2, 1],
            opacity: [0.1, 0.15, 0.1]
          }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-primary/20 rounded-full blur-[200px]"
        />
        <motion.div 
          animate={{ 
            scale: [1.2, 1, 1.2],
            opacity: [0.1, 0.12, 0.1]
          }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
          className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-orange-500/20 rounded-full blur-[180px]"
        />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 w-full max-w-lg"
      >
        <div className="bg-card/95 backdrop-blur-xl rounded-2xl p-8 border border-border/50 shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-orange-500/20 flex items-center justify-center">
                <Bitcoin className="w-5 h-5 text-orange-400" />
              </div>
              <div>
                <h1 className="font-display text-xl font-bold">Crypto Payment</h1>
                <p className="text-xs text-muted-foreground">Order: {orderId?.slice(0, 20)}...</p>
              </div>
            </div>
            {polling && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <RefreshCw className="w-3 h-3 animate-spin" />
                Auto-refreshing
              </div>
            )}
          </div>

          {/* Status Card */}
          <motion.div
            key={paymentData.status}
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className={`p-6 rounded-2xl bg-gradient-to-br ${getStatusColor()} border mb-6`}
          >
            <div className="flex flex-col items-center text-center">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", damping: 12 }}
                className="mb-4"
              >
                {getStatusIcon()}
              </motion.div>
              
              <h2 className="font-display text-2xl font-bold mb-2">
                {getStatusText()}
              </h2>
              
              <p className="text-sm text-muted-foreground max-w-sm">
                {getStatusDescription()}
              </p>
            </div>
          </motion.div>

          {/* Order Details */}
          <div className="p-4 rounded-xl bg-background/50 border border-border/50 mb-6">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Plan</span>
                <p className="font-semibold">{paymentData.plan_name}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Amount</span>
                <p className="font-semibold">${paymentData.amount}</p>
              </div>
            </div>
          </div>

          {/* API Key Section - Only show when completed */}
          <AnimatePresence>
            {paymentData.status === "completed" && paymentData.api_key && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="mb-6"
              >
                <div className="p-5 rounded-xl bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 border border-emerald-500/30">
                  <div className="flex items-center gap-2 mb-3">
                    <Key className="w-5 h-5 text-emerald-400" />
                    <span className="font-semibold text-emerald-400">Your API Key</span>
                  </div>
                  
                  <div className="relative">
                    <div className="p-3 rounded-lg bg-background/80 border border-border font-mono text-sm break-all">
                      {showApiKey ? paymentData.api_key : "•".repeat(32)}
                    </div>
                    
                    <div className="flex gap-2 mt-3">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowApiKey(!showApiKey)}
                        className="flex-1"
                      >
                        {showApiKey ? "Hide" : "Show"} Key
                      </Button>
                      <Button
                        size="sm"
                        onClick={copyApiKey}
                        className="flex-1 bg-emerald-500 hover:bg-emerald-600"
                      >
                        <Copy className="w-4 h-4 mr-2" />
                        Copy
                      </Button>
                    </div>
                  </div>
                  
                  <p className="text-xs text-muted-foreground mt-3 flex items-center gap-1">
                    <Shield className="w-3 h-3" />
                    Save this key securely. It won't be shown again after you leave this page.
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Actions */}
          <div className="flex gap-3">
            {paymentData.status === "pending" && (
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => window.open(`https://nowpayments.io/payment/?iid=${paymentData.invoice_id}`, "_blank")}
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                Open Payment Page
              </Button>
            )}
            
            {paymentData.status === "completed" && (
              <Button
                className="flex-1"
                onClick={() => navigate("/dashboard")}
              >
                Go to Dashboard
              </Button>
            )}
            
            {(paymentData.status === "failed" || paymentData.status === "expired" || paymentData.status === "rejected") && (
              <Button
                className="flex-1"
                onClick={() => navigate("/pricing")}
              >
                Try Again
              </Button>
            )}
            
            <Button
              variant="ghost"
              onClick={fetchPaymentStatus}
              disabled={loading}
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default CryptoPaymentPending;
