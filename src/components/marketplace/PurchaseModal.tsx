import { useState } from "react";
import { motion } from "framer-motion";
import { 
  ShoppingCart, Key, Check, Loader2, X, CreditCard, 
  Package, Shield
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
  const [purchasing, setPurchasing] = useState(false);
  const [purchaseComplete, setPurchaseComplete] = useState(false);
  const [generatedKey, setGeneratedKey] = useState<string | null>(null);

  const handlePurchase = async () => {
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
          amount: product.price,
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
      setPurchaseComplete(true);
      toast.success("Purchase completed successfully!");
      onPurchaseComplete?.();

    } catch (err) {
      console.error("Purchase error:", err);
      toast.error("An error occurred during purchase");
    }

    setPurchasing(false);
  };

  const handleClose = () => {
    setPurchaseComplete(false);
    setGeneratedKey(null);
    onOpenChange(false);
  };

  const copyKey = () => {
    if (generatedKey) {
      navigator.clipboard.writeText(generatedKey);
      toast.success("License key copied to clipboard!");
    }
  };

  if (!product) return null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg bg-card border-border">
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
            className="space-y-6 py-4"
          >
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4">
                <Check className="w-8 h-8 text-green-500" />
              </div>
              <h3 className="text-lg font-bold mb-2">Thank you for your purchase!</h3>
              <p className="text-sm text-muted-foreground">
                Your license key has been generated. Save it somewhere safe!
              </p>
            </div>

            <div className="rounded-lg bg-secondary/50 border border-border p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Key className="w-4 h-4 text-primary" />
                  Your License Key
                </div>
              </div>
              <div className="flex items-center gap-2">
                <code className="flex-1 text-sm font-mono bg-background/50 rounded px-3 py-2 break-all">
                  {generatedKey}
                </code>
                <Button variant="outline" size="sm" onClick={copyKey}>
                  Copy
                </Button>
              </div>
            </div>

            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Shield className="w-4 h-4" />
              <span>You can view all your purchases in the "My Purchases" section</span>
            </div>

            <Button className="w-full" onClick={handleClose}>
              Done
            </Button>
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
                <span className="font-bold text-lg">${product.price.toFixed(2)}</span>
              </div>
              <div className="border-t border-border pt-3 flex items-center justify-between">
                <span className="font-medium">Total</span>
                <span className="font-bold text-xl text-primary">${product.price.toFixed(2)}</span>
              </div>
            </div>

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
                  Access to script content
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-500" />
                  Lifetime access to updates
                </li>
              </ul>
            </div>

            {/* Payment Button */}
            <Button 
              className="w-full gap-2" 
              size="lg"
              onClick={handlePurchase}
              disabled={purchasing}
            >
              {purchasing ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <CreditCard className="w-5 h-5" />
                  Complete Purchase - ${product.price.toFixed(2)}
                </>
              )}
            </Button>

            <p className="text-xs text-center text-muted-foreground">
              By completing this purchase, you agree to our terms of service
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
