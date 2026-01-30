import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { 
  ShoppingBag, Key, Copy, Check, Package, Loader2, 
  ExternalLink, Calendar, DollarSign, ArrowLeft, Shield, LogIn
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

interface Purchase {
  id: string;
  license_key: string;
  purchased_at: string;
  amount: number;
  status: string;
  script_content: string | null;
  product: {
    id: string;
    name: string;
    description: string | null;
    image_url: string | null;
    category: string | null;
  } | null;
}

export default function MyPurchasesPublic() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [copiedScript, setCopiedScript] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    checkAuthAndFetch();
  }, []);

  const checkAuthAndFetch = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      setUser(session.user);
      await fetchPurchases(session.user.id);
    }
    setLoading(false);
  };

  const fetchPurchases = async (userId: string) => {
    const { data, error } = await supabase
      .from("marketplace_purchases")
      .select(`
        id,
        license_key,
        purchased_at,
        amount,
        status,
        script_content,
        product:marketplace_products (
          id,
          name,
          description,
          image_url,
          category
        )
      `)
      .eq("user_id", userId)
      .order("purchased_at", { ascending: false });

    if (error) {
      console.error("Error fetching purchases:", error);
      toast.error("Failed to load purchases");
    } else {
      setPurchases((data as unknown as Purchase[]) || []);
    }
  };

  const copyToClipboard = (text: string, type: "key" | "script", id: string) => {
    navigator.clipboard.writeText(text);
    if (type === "key") {
      setCopiedKey(id);
      setTimeout(() => setCopiedKey(null), 2000);
    } else {
      setCopiedScript(id);
      setTimeout(() => setCopiedScript(null), 2000);
    }
    toast.success(`${type === "key" ? "License key" : "Script"} copied to clipboard!`);
  };

  const generateLoaderScript = (purchase: Purchase) => {
    return `script_key="${purchase.license_key}"
loadstring(game:HttpGet("${import.meta.env.VITE_SUPABASE_URL}/functions/v1/loader/${purchase.product?.id}"))()`;
  };

  return (
    <main className="min-h-screen bg-background">
      <Navbar />
      
      <div className="container mx-auto px-4 pt-24 pb-16">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center gap-4 mb-6">
            <Button 
              variant="ghost" 
              onClick={() => navigate("/marketplace")}
              className="gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Marketplace
            </Button>
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center">
                <ShoppingBag className="w-8 h-8 text-primary" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-foreground">My Purchases</h1>
                <p className="text-muted-foreground">View your purchased products and license keys</p>
              </div>
            </div>
            {user && (
              <Badge className="bg-primary/20 text-primary border-0 px-4 py-2 text-lg">
                {purchases.length} Products
              </Badge>
            )}
          </div>
        </motion.div>

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center py-32">
            <Loader2 className="w-10 h-10 animate-spin text-primary" />
          </div>
        ) : !user ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center py-32"
          >
            <div className="w-24 h-24 rounded-full bg-secondary flex items-center justify-center mb-6">
              <LogIn className="w-12 h-12 text-muted-foreground/50" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Login Required</h2>
            <p className="text-muted-foreground text-center max-w-md mb-6">
              Please login to view your purchased products and license keys.
            </p>
            <Button 
              size="lg"
              onClick={() => navigate("/auth")}
              className="gap-2"
            >
              <LogIn className="w-5 h-5" />
              Login to View Purchases
            </Button>
          </motion.div>
        ) : purchases.length > 0 ? (
          <div className="space-y-6">
            {purchases.map((purchase, index) => (
              <motion.div
                key={purchase.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="rounded-xl bg-card border border-border p-6"
              >
                <div className="flex flex-col lg:flex-row gap-6">
                  {/* Product Image */}
                  <div className="w-full lg:w-56 h-40 rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center overflow-hidden flex-shrink-0">
                    {purchase.product?.image_url ? (
                      <img 
                        src={purchase.product.image_url} 
                        alt={purchase.product?.name || "Product"}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Package className="w-20 h-20 text-primary/40" />
                    )}
                  </div>

                  {/* Product Info */}
                  <div className="flex-1 space-y-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="text-xl font-bold text-foreground">
                          {purchase.product?.name || "Unknown Product"}
                        </h3>
                        <p className="text-muted-foreground mt-1">
                          {purchase.product?.description || "No description"}
                        </p>
                      </div>
                      <Badge className="bg-green-500/20 text-green-500 border-0 px-3 py-1">
                        {purchase.status}
                      </Badge>
                    </div>

                    {/* Purchase Details */}
                    <div className="flex items-center gap-6 text-sm text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        <span>{new Date(purchase.purchased_at).toLocaleDateString()}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <DollarSign className="w-4 h-4" />
                        <span>${purchase.amount.toFixed(2)}</span>
                      </div>
                      {purchase.product?.category && (
                        <Badge variant="secondary" className="text-xs">
                          {purchase.product.category}
                        </Badge>
                      )}
                    </div>

                    {/* License Key */}
                    <div className="rounded-lg bg-secondary/50 border border-border p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2 text-sm font-medium">
                          <Key className="w-4 h-4 text-primary" />
                          License Key
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(purchase.license_key, "key", purchase.id)}
                          className="h-8 gap-2"
                        >
                          {copiedKey === purchase.id ? (
                            <>
                              <Check className="w-4 h-4 text-green-500" />
                              Copied!
                            </>
                          ) : (
                            <>
                              <Copy className="w-4 h-4" />
                              Copy Key
                            </>
                          )}
                        </Button>
                      </div>
                      <code className="block text-sm text-muted-foreground font-mono break-all">
                        {purchase.license_key}
                      </code>
                    </div>

                    {/* Script Loader */}
                    <div className="rounded-lg bg-secondary/50 border border-border p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2 text-sm font-medium">
                          <ExternalLink className="w-4 h-4 text-primary" />
                          Script Loader
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(generateLoaderScript(purchase), "script", purchase.id)}
                          className="h-8 gap-2"
                        >
                          {copiedScript === purchase.id ? (
                            <>
                              <Check className="w-4 h-4 text-green-500" />
                              Copied!
                            </>
                          ) : (
                            <>
                              <Copy className="w-4 h-4" />
                              Copy Script
                            </>
                          )}
                        </Button>
                      </div>
                      <code className="block text-xs text-muted-foreground font-mono break-all whitespace-pre-wrap">
                        {generateLoaderScript(purchase)}
                      </code>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center py-32"
          >
            <div className="w-24 h-24 rounded-full bg-secondary flex items-center justify-center mb-6">
              <ShoppingBag className="w-12 h-12 text-muted-foreground/50" />
            </div>
            <h2 className="text-2xl font-bold mb-2">No Purchases Yet</h2>
            <p className="text-muted-foreground text-center max-w-md mb-6">
              You haven't purchased any products yet. Browse the marketplace to find scripts you need!
            </p>
            <Button size="lg" onClick={() => navigate("/marketplace")}>
              Browse Marketplace
            </Button>
          </motion.div>
        )}
      </div>

      <Footer />
    </main>
  );
}
