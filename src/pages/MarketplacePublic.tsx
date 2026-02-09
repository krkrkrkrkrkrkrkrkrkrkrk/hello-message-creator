import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { 
  Store, Search, ShoppingCart, Star, Download, Package, Sparkles, ShoppingBag
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import PurchaseModal from "@/components/marketplace/PurchaseModal";
import { useNavigate } from "react-router-dom";

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  image_url: string | null;
  category: string;
  downloads: number;
  rating: number;
  script_content?: string | null;
}

const categories = ["All", "Scripts", "Loaders", "Utilities", "Games"];

export default function MarketplacePublic() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<Product[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [purchaseModalOpen, setPurchaseModalOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    fetchProducts();
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    setIsLoggedIn(!!session);
  };

  const fetchProducts = async () => {
    setLoading(true);
    
    const { data } = await supabase
      .from("marketplace_products")
      .select("id, name, description, price, image_url, category, downloads, rating, script_content")
      .eq("is_advertised", true)
      .eq("is_active", true)
      .order("created_at", { ascending: false });

    setProducts(data || []);
    setLoading(false);
  };

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         product.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === "All" || product.category === selectedCategory.toLowerCase();
    return matchesSearch && matchesCategory;
  });

  const handlePurchase = async (product: Product) => {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      toast.error("Please log in to purchase products");
      return;
    }
    
    setSelectedProduct(product);
    setPurchaseModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="pt-24 pb-16">
        <div className="container mx-auto px-6">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-12"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-6">
              <Store className="w-5 h-5 text-primary" />
              <span className="text-primary font-medium">Marketplace</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              Discover <span className="text-gradient">Premium Scripts</span>
            </h1>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto mb-6">
              Browse and purchase scripts from trusted developers in the community
            </p>
            
            {/* My Purchases Button */}
            {isLoggedIn && (
              <Button 
                variant="outline" 
                className="gap-2"
                onClick={() => navigate("/my-purchases")}
              >
                <ShoppingBag className="w-4 h-4" />
                My Purchases
              </Button>
            )}
          </motion.div>

          {/* Search and Filters */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="flex flex-col md:flex-row gap-4 mb-8"
          >
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                placeholder="Search products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-card border-border"
              />
            </div>
            <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0">
              {categories.map((category) => (
                <Button
                  key={category}
                  variant={selectedCategory === category ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedCategory(category)}
                  className="whitespace-nowrap"
                >
                  {category}
                </Button>
              ))}
            </div>
          </motion.div>

          {/* Products Count */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="mb-6"
          >
            <Badge className="bg-primary/20 text-primary border-0 px-3 py-1">
              <Sparkles className="w-4 h-4 mr-1" />
              {filteredProducts.length} Products Available
            </Badge>
          </motion.div>

          {/* Products Grid */}
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {[1,2,3,4].map(i => (
                <div key={i} className="rounded-xl bg-card border border-border overflow-hidden animate-pulse">
                  <div className="aspect-video bg-muted" />
                  <div className="p-4 space-y-3">
                    <div className="h-4 bg-muted rounded w-3/4" />
                    <div className="h-3 bg-muted rounded w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredProducts.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredProducts.map((product, index) => (
                <motion.div
                  key={product.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="group rounded-xl bg-card border border-border overflow-hidden hover:border-primary/50 transition-all"
                >
                  {/* Product Image */}
                  <div className="aspect-video bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center relative overflow-hidden">
                    {product.image_url ? (
                      <img 
                        src={product.image_url} 
                        alt={product.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Package className="w-16 h-16 text-primary/40" />
                    )}
                    <div className="absolute top-2 right-2">
                      <Badge className="bg-background/80 backdrop-blur-sm text-foreground border-0">
                        ${product.price.toFixed(2)}
                      </Badge>
                    </div>
                  </div>

                  {/* Product Info */}
                  <div className="p-4">
                    <h3 className="font-bold text-foreground mb-1 truncate">{product.name}</h3>
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                      {product.description || "No description available"}
                    </p>

                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-1">
                        <Star className="w-4 h-4 fill-yellow-500 text-yellow-500" />
                        <span className="text-sm font-medium">{product.rating.toFixed(1)}</span>
                      </div>
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Download className="w-4 h-4" />
                        <span className="text-sm">{product.downloads}</span>
                      </div>
                    </div>

                    <Button 
                      className="w-full gap-2"
                      onClick={() => handlePurchase(product)}
                    >
                      <ShoppingCart className="w-4 h-4" />
                      Purchase
                    </Button>
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center py-20"
            >
              <div className="w-24 h-24 rounded-full bg-secondary flex items-center justify-center mb-4">
                <Store className="w-12 h-12 text-muted-foreground/50" />
              </div>
              <h3 className="text-xl font-bold mb-2">No Products Found</h3>
              <p className="text-muted-foreground text-center max-w-md">
                {searchQuery 
                  ? "No products match your search. Try different keywords."
                  : "The marketplace is empty. Check back later!"}
              </p>
            </motion.div>
          )}
        </div>
      </main>

      <Footer />
      
      <PurchaseModal 
        product={selectedProduct}
        open={purchaseModalOpen}
        onOpenChange={setPurchaseModalOpen}
        onPurchaseComplete={fetchProducts}
      />
    </div>
  );
}
