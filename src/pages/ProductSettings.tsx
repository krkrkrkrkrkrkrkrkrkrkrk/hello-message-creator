import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Package, Plus, RefreshCw, Box, Trash2, Edit, Copy, Check, Loader2, Megaphone, Store } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import AddProductModal from "@/components/products/AddProductModal";
import EditProductModal from "@/components/products/EditProductModal";

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  status: "active" | "inactive";
  is_active: boolean;
  is_advertised: boolean;
  image_url: string | null;
  created_at: string;
}

export default function ProductSettings() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    setLoading(true);
    
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      setLoading(false);
      return;
    }

    const { data } = await supabase
      .from("marketplace_products")
      .select("*")
      .eq("user_id", session.user.id)
      .order("created_at", { ascending: false });

    if (data) {
      setProducts(data.map(p => ({
        ...p,
        status: p.is_active ? "active" : "inactive",
      })));
    }
    setLoading(false);
  };

  const handleDeleteProduct = async (id: string) => {
    const { error } = await supabase
      .from("marketplace_products")
      .delete()
      .eq("id", id);

    if (error) {
      toast.error("Failed to delete product");
    } else {
      toast.success("Product deleted");
      fetchProducts();
    }
  };

  const toggleStatus = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === "active";
    
    const { error } = await supabase
      .from("marketplace_products")
      .update({ is_active: !newStatus })
      .eq("id", id);

    if (error) {
      toast.error("Failed to update status");
    } else {
      toast.success("Product status updated");
      fetchProducts();
    }
  };

  const toggleAdvertise = async (id: string, currentlyAdvertised: boolean) => {
    const { error } = await supabase
      .from("marketplace_products")
      .update({ is_advertised: !currentlyAdvertised })
      .eq("id", id);

    if (error) {
      toast.error("Failed to update advertisement status");
    } else {
      toast.success(currentlyAdvertised ? "Product removed from marketplace" : "Product is now advertised on marketplace!");
      fetchProducts();
    }
  };

  const copyId = (id: string) => {
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    toast.success("Product ID copied!");
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <DashboardLayout breadcrumb="Product Settings" title="Product Settings">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl bg-primary/20 flex items-center justify-center">
              <Package className="w-7 h-7 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-foreground">Product Management</h2>
              <p className="text-sm text-muted-foreground">Manage your products and sell on marketplace</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" className="gap-2">
              <Box className="w-4 h-4" />
              {products.length} Products
            </Button>
            <Button variant="outline" className="gap-2" onClick={fetchProducts}>
              <RefreshCw className="w-4 h-4" />
              Refresh
            </Button>
          </div>
        </div>
      </motion.div>

      {/* Add New Product Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="rounded-xl bg-card border border-border p-4 mb-6 cursor-pointer hover:border-primary/50 transition-colors"
        onClick={() => setShowAddModal(true)}
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
            <Plus className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="font-bold text-foreground">Add New Product</h3>
            <p className="text-sm text-muted-foreground">Create and configure a new product with image</p>
          </div>
        </div>
      </motion.div>

      {/* Your Products Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="rounded-xl bg-card border border-border p-6"
      >
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
            <Box className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="font-bold text-foreground">Your Products</h3>
            <p className="text-sm text-muted-foreground">
              {products.length > 0 ? `${products.length} product(s) created` : "No products uploaded yet"}
            </p>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-20 h-20 rounded-full bg-secondary flex items-center justify-center mx-auto mb-4">
              <Box className="w-10 h-10 text-muted-foreground/50" />
            </div>
            <p className="text-muted-foreground">No products to display</p>
            <Button className="mt-4 gap-2" onClick={() => setShowAddModal(true)}>
              <Plus className="w-4 h-4" />
              Create First Product
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {products.map((product) => (
              <div
                key={product.id}
                className="flex items-center justify-between p-4 rounded-lg bg-secondary/30 border border-border"
              >
                <div className="flex items-center gap-4">
                  {product.image_url ? (
                    <img 
                      src={product.image_url} 
                      alt={product.name}
                      className="w-12 h-12 rounded-lg object-cover border border-border"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-lg bg-primary/20 flex items-center justify-center">
                      <Package className="w-6 h-6 text-primary" />
                    </div>
                  )}
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold text-foreground">{product.name}</h4>
                      {product.is_advertised && (
                        <Badge className="bg-green-500/20 text-green-500 border-0 text-xs">
                          <Store className="w-3 h-3 mr-1" />
                          On Marketplace
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">{product.description || "No description"}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge className={product.status === "active" ? "bg-green-500/20 text-green-500" : "bg-secondary text-muted-foreground"}>
                    {product.status}
                  </Badge>
                  <span className="text-sm text-muted-foreground">${product.price.toFixed(2)}</span>
                  
                  {/* Advertise Toggle */}
                  <div className="flex items-center gap-2 px-3 py-1 rounded-lg bg-secondary/50">
                    <Megaphone className={`w-4 h-4 ${product.is_advertised ? 'text-green-500' : 'text-muted-foreground'}`} />
                    <Switch
                      checked={product.is_advertised}
                      onCheckedChange={() => toggleAdvertise(product.id, product.is_advertised)}
                    />
                  </div>

                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-foreground"
                    onClick={() => copyId(product.id)}
                  >
                    {copiedId === product.id ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-blue-400 hover:text-blue-300 hover:bg-blue-500/10"
                    onClick={() => setEditingProduct(product)}
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={() => handleDeleteProduct(product.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </motion.div>

      {/* Add Product Modal */}
      {showAddModal && (
        <AddProductModal 
          onClose={() => setShowAddModal(false)}
          onSave={() => {
            setShowAddModal(false);
            fetchProducts();
          }}
        />
      )}

      {/* Edit Product Modal */}
      {editingProduct && (
        <EditProductModal
          product={editingProduct}
          onClose={() => setEditingProduct(null)}
          onSave={() => {
            setEditingProduct(null);
            fetchProducts();
          }}
        />
      )}
    </DashboardLayout>
  );
}