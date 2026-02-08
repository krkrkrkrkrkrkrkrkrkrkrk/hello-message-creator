import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { 
  ShoppingCart, Key, Check, Loader2, X, CreditCard, 
  Package, Shield, Bitcoin, Code, Copy
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Product {
  id: string;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
  category: string | null;
  script_content?: string | null;
}

interface PurchaseModalProps {
  product: Product | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPurchaseComplete?: () => void;
}

export default function PurchaseModal({ 
  product, 
  open, 
  onOpenChange,
  onPurchaseComplete 
}: PurchaseModalProps) {
  const navigate = useNavigate();
  const [purchasing, setPurchasing] = useState(false);
  const [purchaseComplete, setPurchaseComplete] = useState(false);
  const [generatedKey, setGeneratedKey] = useState<string | null>(null);
  const [scriptContent, setScriptContent] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState(false);
  const [copiedScript, setCopiedScript] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"crypto" | "free">("crypto");

  const handleCryptoPurchase = async () => {
    if (!product) return;

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      toast.error("Please log in to purchase products");
      return;
    }

    setPurchasing(true);

    try {
      // Check if already purchased
      const { data: existing } = await supabase
        .from("marketplace_purchases")
        .select("id")
        .eq("user_id", session.user.id)
        .eq("product_id", product.id)
        .maybeSingle();

      if (existing) {
        toast.error("You already own this product!");
        setPurchasing(false);
        return;
      }

      // Create crypto invoice for marketplace
      const response = await supabase.functions.invoke("create-crypto-invoice", {
        body: {
          price_amount: product.price,
          plan_name: `Marketplace: ${product.name}`,
          email: session.user.email,
          days: 0, // Not a subscription
          marketplace_product_id: product.id,
          is_marketplace: true
        }
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      const { invoice_url, order_id } = response.data;

      // Open payment page
      window.open(invoice_url, "_blank");
      
      // Navigate to pending page
      navigate(`/payment/pending?order=${order_id}&type=marketplace&product=${product.id}`);
      onOpenChange(false);

    } catch (err: any) {
      console.error("Purchase error:", err);
      toast.error(err.message || "An error occurred during purchase");
    }

    setPurchasing(false);
  };

  const handleFreePurchase = async () => {
    if (!product || product.price > 0) return;

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      toast.error("Please log in to get this product");
      return;
    }

    setPurchasing(true);

    try {
      // Check if already purchased
      const { data: existing } = await supabase
        .from("marketplace_purchases")
        .select("id")
        .eq("user_id", session.user.id)
        .eq("product_id", product.id)
        .maybeSingle();

      if (existing) {
        toast.error("You already own this product!");
        setPurchasing(false);
        return;
      }

      // Generate license key
      const generateKey = () => {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let key = 'SHADOW-';
        for (let i = 0; i < 4; i++) {
          for (let j = 0; j < 4; j++) {
            key += chars.charAt(Math.floor(Math.random() * chars.length));
          }
          if (i < 3) key += '-';
        }
        return key;
      };

      const licenseKey = generateKey();

      // Create purchase record
      const { error } = await supabase
        .from("marketplace_purchases")
        .insert({
          user_id: session.user.id,
          product_id: product.id,
          license_key: licenseKey,
          amount: 0,
          script_content: product.script_content || null,
          status: 'completed'
        });

      if (error) {
        console.error("Purchase error:", error);
        toast.error("Failed to complete purchase");
        setPurchasing(false);
        return;
      }

      // Update downloads count
      await supabase
        .from("marketplace_products")
        .update({ downloads: (product as any).downloads + 1 || 1 })
        .eq("id", product.id);

      setGeneratedKey(licenseKey);
      setScriptContent(product.script_content || null);
      setPurchaseComplete(true);
      toast.success("Product acquired successfully!");
      onPurchaseComplete?.();

    } catch (err) {
      console.error("Purchase error:", err);
      toast.error("An error occurred");
    }

    setPurchasing(false);
  };

  const handleClose = () => {
    setPurchaseComplete(false);
    setGeneratedKey(null);
    setScriptContent(null);
    setCopiedKey(false);
    setCopiedScript(false);
    onOpenChange(false);
  };

  const copyKey = () => {
    if (generatedKey) {
      navigator.clipboard.writeText(generatedKey);
      setCopiedKey(true);
      setTimeout(() => setCopiedKey(false), 2000);
      toast.success("License key copied!");
    }
  };

  const copyScript = () => {
    if (scriptContent) {
      navigator.clipboard.writeText(scriptContent);
      setCopiedScript(true);
      setTimeout(() => setCopiedScript(false), 2000);
      toast.success("Script copied!");
    }
  };

  if (!product) return null;

  const isFree = product.price === 0;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg bg-card border-border max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            {purchaseComplete ? (
              <>
                <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
                  <Check className="w-5 h-5 text-green-500" />
                </div>
                <span>Purchase Complete!</span>
              </>
            ) : (
              <>
                <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                  <ShoppingCart className="w-5 h-5 text-primary" />
                </div>
                <span>Complete Purchase</span>
              </>
            )}
          </DialogTitle>
        </DialogHeader>

        {purchaseComplete ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4 py-4"
          >
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4">
                <Check className="w-8 h-8 text-green-500" />
              </div>
              <h3 className="text-lg font-bold mb-2">Thank you for your purchase!</h3>
              <p className="text-sm text-muted-foreground">
                Your license key and script are ready below.
              </p>
            </div>

            {/* License Key */}
            <div className="rounded-lg bg-secondary/50 border border-border p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Key className="w-4 h-4 text-primary" />
                  Your License Key
                </div>
                <Button variant="ghost" size="sm" onClick={copyKey} className="h-8 gap-2">
                  {copiedKey ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                  {copiedKey ? "Copied!" : "Copy"}
                </Button>
              </div>
              <code className="block text-sm font-mono bg-background/50 rounded px-3 py-2 break-all">
                {generatedKey}
              </code>
            </div>

            {/* Script Content */}
            {scriptContent && (
              <div className="rounded-lg bg-secondary/50 border border-border p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <Code className="w-4 h-4 text-primary" />
                    Your Script
                  </div>
                  <Button variant="ghost" size="sm" onClick={copyScript} className="h-8 gap-2">
                    {copiedScript ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                    {copiedScript ? "Copied!" : "Copy Script"}
                  </Button>
                </div>
                <pre className="text-xs font-mono bg-background/50 rounded px-3 py-2 max-h-40 overflow-y-auto whitespace-pre-wrap break-all">
                  {scriptContent.substring(0, 500)}{scriptContent.length > 500 ? "..." : ""}
                </pre>
              </div>
            )}

            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Shield className="w-4 h-4" />
              <span>You can view all your purchases in "My Purchases"</span>
            </div>

            <div className="flex gap-2">
              <Button className="flex-1" onClick={handleClose}>
                Done
              </Button>
              <Button variant="outline" onClick={() => navigate("/my-purchases")}>
                View All Purchases
              </Button>
            </div>
          </motion.div>
        ) : (
          <div className="space-y-6 py-4">
            {/* Product Info */}
            <div className="flex gap-4">
              <div className="w-20 h-20 rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center flex-shrink-0 overflow-hidden">
                {product.image_url ? (
                  <img 
                    src={product.image_url} 
                    alt={product.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <Package className="w-10 h-10 text-primary/40" />
                )}
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-foreground">{product.name}</h3>
                <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                  {product.description || "No description"}
                </p>
                {product.category && (
                  <Badge variant="secondary" className="mt-2 text-xs">
                    {product.category}
                  </Badge>
                )}
              </div>
            </div>

            {/* Price Summary */}
            <div className="rounded-lg bg-secondary/50 border border-border p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Product</span>
                <span className="font-medium">{product.name}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Price</span>
                <span className="font-bold text-lg">
                  {isFree ? "FREE" : `$${product.price.toFixed(2)}`}
                </span>
              </div>
              <div className="border-t border-border pt-3 flex items-center justify-between">
                <span className="font-medium">Total</span>
                <span className="font-bold text-xl text-primary">
                  {isFree ? "FREE" : `$${product.price.toFixed(2)}`}
                </span>
              </div>
            </div>

            {/* Payment Method Selection (only for paid products) */}
            {!isFree && (
              <div className="space-y-3">
                <h4 className="text-sm font-medium">Payment Method</h4>
                <div className="grid grid-cols-1 gap-2">
                  <button
                    onClick={() => setPaymentMethod("crypto")}
                    className={`flex items-center gap-3 p-4 rounded-lg border transition-all ${
                      paymentMethod === "crypto"
                        ? "border-primary bg-primary/10"
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      paymentMethod === "crypto" ? "bg-primary/20" : "bg-secondary"
                    }`}>
                      <Bitcoin className="w-5 h-5 text-orange-500" />
                    </div>
                    <div className="flex-1 text-left">
                      <p className="font-medium">Cryptocurrency</p>
                      <p className="text-xs text-muted-foreground">Bitcoin, ETH, USDT & more</p>
                    </div>
                    {paymentMethod === "crypto" && (
                      <Check className="w-5 h-5 text-primary" />
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* What you get */}
            <div className="space-y-2">
              <h4 className="text-sm font-medium">What you'll get:</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-500" />
                  Unique license key for authentication
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-500" />
                  Full script content
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-500" />
                  Lifetime access to updates
                </li>
              </ul>
            </div>

            {/* Payment Button */}
            {isFree ? (
              <Button 
                className="w-full gap-2" 
                size="lg"
                onClick={handleFreePurchase}
                disabled={purchasing}
              >
                {purchasing ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Check className="w-5 h-5" />
                    Get Free Product
                  </>
                )}
              </Button>
            ) : (
              <Button 
                className="w-full gap-2" 
                size="lg"
                onClick={handleCryptoPurchase}
                disabled={purchasing}
              >
                {purchasing ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Creating Invoice...
                  </>
                ) : (
                  <>
                    <Bitcoin className="w-5 h-5" />
                    Pay with Crypto - ${product.price.toFixed(2)}
                  </>
                )}
              </Button>
            )}

            <p className="text-xs text-center text-muted-foreground">
              By completing this purchase, you agree to our terms of service
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
