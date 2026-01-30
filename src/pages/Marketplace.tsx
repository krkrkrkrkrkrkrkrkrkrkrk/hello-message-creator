import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { 
  Store, 
  Search, 
  ShoppingCart, 
  Star, 
  Download,
  Filter,
  Loader2,
  Package,
  TrendingUp,
  Sparkles
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  image_url: string | null;
  category: string;
  downloads: number;
  rating: number;
  created_at: string;
}

const categories = ["All", "Scripts", "Loaders", "Utilities", "Games"];

export default function Marketplace() {
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<Product[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    setLoading(true);
    
    const { data } = await supabase
      .from("marketplace_products")
      .select("*")
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

  const handlePurchase = (product: Product) => {
    toast.info(`Purchasing ${product.name} - Feature coming soon!`);
  };

  return (
    <DashboardLayout breadcrumb="Marketplace" title="Marketplace">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center">
              <Store className="w-7 h-7 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-foreground">Marketplace</h2>
              <p className="text-sm text-muted-foreground">Discover and purchase scripts from the community</p>
            </div>
          </div>
          <Badge className="bg-primary/20 text-primary border-0 px-3 py-1">
            <Sparkles className="w-4 h-4 mr-1" />
            {products.length} Products
          </Badge>
        </div>
      </motion.div>

      {/* Search and Filters */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="flex flex-col md:flex-row gap-4 mb-6"
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

      {/* Products Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
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
              : "The marketplace is empty. Be the first to advertise your product!"}
          </p>
        </motion.div>
      )}

      {/* Featured Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="mt-12"
      >
        <div className="flex items-center gap-3 mb-6">
          <TrendingUp className="w-6 h-6 text-primary" />
          <h3 className="text-lg font-bold">Why Sell on Marketplace?</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { title: "Global Reach", desc: "Reach thousands of potential buyers worldwide" },
            { title: "Secure Payments", desc: "Built-in payment processing and protection" },
            { title: "Analytics", desc: "Track your sales and customer engagement" },
          ].map((item, i) => (
            <div key={item.title} className="rounded-xl bg-card border border-border p-6">
              <h4 className="font-bold mb-2">{item.title}</h4>
              <p className="text-sm text-muted-foreground">{item.desc}</p>
            </div>
          ))}
        </div>
      </motion.div>
    </DashboardLayout>
  );
}
