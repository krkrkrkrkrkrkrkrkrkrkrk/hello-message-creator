import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { X, Image, Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  is_active: boolean;
  is_advertised: boolean;
  image_url: string | null;
}

interface EditProductModalProps {
  product: Product;
  onClose: () => void;
  onSave: () => void;
}

export default function EditProductModal({ product, onClose, onSave }: EditProductModalProps) {
  const [form, setForm] = useState({
    name: product.name,
    description: product.description || "",
    price: product.price,
    is_active: product.is_active,
    is_advertised: product.is_advertised,
  });
  const [saving, setSaving] = useState(false);
  const [productImage, setProductImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(product.image_url);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith("image/")) {
      setProductImage(file);
      const reader = new FileReader();
      reader.onload = (ev) => setImagePreview(ev.target?.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith("image/")) {
      setProductImage(file);
      const reader = new FileReader();
      reader.onload = (ev) => setImagePreview(ev.target?.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    if (!form.name) {
      toast.error("Please enter a product name");
      return;
    }

    setSaving(true);

    let imageUrl = product.image_url;
    
    if (productImage) {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const fileExt = productImage.name.split(".").pop();
        const fileName = `${session.user.id}/${Date.now()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from("product-images")
          .upload(fileName, productImage);

        if (!uploadError) {
          const { data: { publicUrl } } = supabase.storage
            .from("product-images")
            .getPublicUrl(fileName);
          imageUrl = publicUrl;
        }
      }
    }

    const { error } = await supabase
      .from("marketplace_products")
      .update({
        name: form.name,
        description: form.description,
        price: form.price,
        is_active: form.is_active,
        is_advertised: form.is_advertised,
        image_url: imageUrl,
      })
      .eq("id", product.id);

    if (error) {
      toast.error("Failed to update product");
    } else {
      toast.success("Product updated successfully!");
      onSave();
    }
    setSaving(false);
  };

  return (
    <div 
      className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="rounded-xl bg-card border border-border p-6 w-full max-w-md max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold">Edit Product</h3>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        <div className="space-y-4">
          {/* Image Upload with Drag & Drop */}
          <div>
            <label className="text-sm font-medium mb-2 block">Product Image</label>
            <div 
              className={`border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-all ${
                isDragging 
                  ? 'border-primary bg-primary/10' 
                  : imagePreview 
                    ? 'border-primary/50 bg-primary/5' 
                    : 'border-border hover:border-primary/30'
              }`}
              onClick={() => fileInputRef.current?.click()}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              {imagePreview ? (
                <div className="relative">
                  <img 
                    src={imagePreview} 
                    alt="Preview" 
                    className="w-full h-32 object-cover rounded-lg"
                  />
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity rounded-lg">
                    <p className="text-white text-sm">Click or drag to change</p>
                  </div>
                </div>
              ) : (
                <div className="py-4">
                  <Image className="w-10 h-10 mx-auto text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">
                    {isDragging ? "Drop image here" : "Drag & drop or click to upload"}
                  </p>
                </div>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageSelect}
              className="hidden"
            />
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Product Name</label>
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="bg-secondary border-border"
            />
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Description</label>
            <Textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="bg-secondary border-border"
              rows={3}
            />
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Price ($)</label>
            <Input
              type="number"
              value={form.price}
              onChange={(e) => setForm({ ...form, price: parseFloat(e.target.value) || 0 })}
              className="bg-secondary border-border"
            />
          </div>

          <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
            <div>
              <p className="font-medium text-sm">Active</p>
              <p className="text-xs text-muted-foreground">Product is visible to buyers</p>
            </div>
            <Switch
              checked={form.is_active}
              onCheckedChange={(checked) => setForm({ ...form, is_active: checked })}
            />
          </div>

          <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
            <div>
              <p className="font-medium text-sm">Advertised on Marketplace</p>
              <p className="text-xs text-muted-foreground">Show on public marketplace</p>
            </div>
            <Switch
              checked={form.is_advertised}
              onCheckedChange={(checked) => setForm({ ...form, is_advertised: checked })}
            />
          </div>

          <div className="flex gap-2 pt-2">
            <Button variant="outline" className="flex-1" onClick={onClose}>
              Cancel
            </Button>
            <Button className="flex-1" onClick={handleSave} disabled={saving}>
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              Save Changes
            </Button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
