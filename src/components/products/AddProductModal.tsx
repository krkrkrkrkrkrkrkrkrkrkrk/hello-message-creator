import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { X, Image, Loader2, Plus, DollarSign, Gift, Code, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Script {
  id: string;
  name: string;
}

interface AddProductModalProps {
  onClose: () => void;
  onSave: () => void;
}

export default function AddProductModal({ onClose, onSave }: AddProductModalProps) {
  const [step, setStep] = useState<"type" | "form">("type");
  const [productType, setProductType] = useState<"paid" | "free" | null>(null);
  const [form, setForm] = useState({
    name: "",
    description: "",
    price: 0,
    scriptId: "",
  });
  const [saving, setSaving] = useState(false);
  const [productImage, setProductImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [scripts, setScripts] = useState<Script[]>([]);
  const [loadingScripts, setLoadingScripts] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const fetchScripts = async () => {
      setLoadingScripts(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data } = await supabase
        .from("scripts")
        .select("id, name")
        .eq("user_id", session.user.id)
        .order("created_at", { ascending: false });

      if (data) {
        setScripts(data);
      }
      setLoadingScripts(false);
    };

    fetchScripts();
  }, []);

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

  const selectType = (type: "paid" | "free") => {
    setProductType(type);
    if (type === "free") {
      setForm({ ...form, price: 0 });
    }
    setStep("form");
  };

  const handleSave = async () => {
    if (!form.name) {
      toast.error("Please enter a product name");
      return;
    }

    // For paid products, script is required
    if (productType === "paid" && !form.scriptId) {
      toast.error("Please select a script for your paid product");
      return;
    }

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      toast.error("Please log in first");
      return;
    }

    setSaving(true);

    let imageUrl: string | null = null;
    let scriptContent: string | null = null;
    
    if (productImage) {
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

    // Fetch script content if a script is selected
    if (form.scriptId) {
      const { data: scriptData } = await supabase
        .from("scripts")
        .select("content")
        .eq("id", form.scriptId)
        .single();
      
      if (scriptData) {
        scriptContent = scriptData.content;
      }
    }

    const { error } = await supabase
      .from("marketplace_products")
      .insert({
        user_id: session.user.id,
        name: form.name,
        description: form.description,
        price: productType === "free" ? 0 : form.price,
        image_url: imageUrl,
        script_id: form.scriptId || null,
        script_content: scriptContent,
        is_active: true,
        is_advertised: productType === "paid",
      });

    if (error) {
      console.error("Error creating product:", error);
      toast.error("Failed to create product");
    } else {
      if (productType === "free") {
        toast.success("Product created! Free products appear on ScriptHub when you add a script.");
      } else {
        toast.success("Product created! Enable 'Advertise' to show on Marketplace.");
      }
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
          <h3 className="text-xl font-bold">
            {step === "type" ? "Choose Product Type" : `New ${productType === "free" ? "Free" : "Paid"} Product`}
          </h3>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        {step === "type" ? (
          <div className="grid grid-cols-2 gap-4">
            <motion.div
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="rounded-xl border-2 border-border hover:border-primary/50 p-6 cursor-pointer transition-all text-center"
              onClick={() => selectType("paid")}
            >
              <div className="w-14 h-14 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4">
                <DollarSign className="w-7 h-7 text-green-500" />
              </div>
              <h4 className="font-bold mb-1">Paid Product</h4>
              <p className="text-xs text-muted-foreground">
                Sell on Marketplace with custom pricing
              </p>
            </motion.div>

            <motion.div
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="rounded-xl border-2 border-border hover:border-primary/50 p-6 cursor-pointer transition-all text-center"
              onClick={() => selectType("free")}
            >
              <div className="w-14 h-14 rounded-full bg-blue-500/20 flex items-center justify-center mx-auto mb-4">
                <Gift className="w-7 h-7 text-blue-500" />
              </div>
              <h4 className="font-bold mb-1">Free Product</h4>
              <p className="text-xs text-muted-foreground">
                Share with community on ScriptHub
              </p>
            </motion.div>
          </div>
        ) : (
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
                    <p className="text-xs text-muted-foreground/50">PNG, JPG up to 5MB</p>
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
              <label className="text-sm font-medium mb-2 block">Product Name *</label>
              <Input
                placeholder="My Product"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="bg-secondary border-border"
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Description</label>
              <Textarea
                placeholder="Product description..."
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="bg-secondary border-border"
                rows={3}
              />
            </div>

            {/* Script Selection - Required for paid products */}
            <div>
              <label className="text-sm font-medium mb-2 block flex items-center gap-2">
                <Code className="w-4 h-4" />
                Select Script {productType === "paid" && "*"}
              </label>
              {scripts.length === 0 && !loadingScripts ? (
                <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-destructive mt-0.5" />
                    <div className="text-sm">
                      <p className="font-medium text-destructive">No scripts found</p>
                      <p className="text-muted-foreground">
                        Create a script first in the Scripts section before creating a paid product.
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <Select 
                  value={form.scriptId} 
                  onValueChange={(value) => setForm({ ...form, scriptId: value })}
                  disabled={loadingScripts}
                >
                  <SelectTrigger className="bg-secondary border-border">
                    <SelectValue placeholder={loadingScripts ? "Loading scripts..." : "Select a script"} />
                  </SelectTrigger>
                  <SelectContent>
                    {scripts.map((script) => (
                      <SelectItem key={script.id} value={script.id}>
                        {script.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              {productType === "paid" && (
                <p className="text-xs text-muted-foreground mt-1">
                  The script content will be delivered to buyers after purchase
                </p>
              )}
            </div>

            {productType === "paid" && (
              <div>
                <label className="text-sm font-medium mb-2 block">Price ($)</label>
                <Input
                  type="number"
                  placeholder="9.99"
                  value={form.price}
                  onChange={(e) => setForm({ ...form, price: parseFloat(e.target.value) || 0 })}
                  className="bg-secondary border-border"
                />
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => setStep("type")}>
                Back
              </Button>
              <Button 
                className="flex-1" 
                onClick={handleSave} 
                disabled={saving || (productType === "paid" && scripts.length === 0)}
              >
                {saving ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Plus className="w-4 h-4 mr-2" />
                )}
                Create Product
              </Button>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
