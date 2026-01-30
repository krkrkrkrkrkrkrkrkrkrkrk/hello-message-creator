import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { 
  Search, 
  Upload,
  Download,
  Eye,
  Clock,
  Filter,
  Loader2,
  Code2,
  Users,
  TrendingUp,
  Sparkles,
  Plus,
  Image,
  X,
  Copy,
  Check
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

interface CommunityScript {
  id: string;
  name: string;
  description: string | null;
  script_content: string;
  image_url: string | null;
  game_name: string | null;
  category: string | null;
  views: number;
  downloads: number;
  created_at: string;
  user_id: string;
}

const categories = ["All", "Universal", "Games", "Utilities", "GUI", "Combat"];

export default function ScriptBlox() {
  const [loading, setLoading] = useState(true);
  const [scripts, setScripts] = useState<CommunityScript[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  
  // Form state
  const [newScript, setNewScript] = useState({
    name: "",
    description: "",
    script_content: "",
    game_name: "",
    category: "universal"
  });
  const [scriptImage, setScriptImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchScripts();
    checkUser();
  }, []);

  const checkUser = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    setUser(session?.user || null);
  };

  const fetchScripts = async () => {
    setLoading(true);
    
    const { data, error } = await supabase
      .from("community_scripts")
      .select("*")
      .eq("is_active", true)
      .order("created_at", { ascending: false });

    if (!error && data) {
      setScripts(data);
    }
    setLoading(false);
  };

  const filteredScripts = scripts.filter(script => {
    const matchesSearch = script.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         script.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         script.game_name?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === "All" || script.category?.toLowerCase() === selectedCategory.toLowerCase();
    return matchesSearch && matchesCategory;
  });

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
      setScriptImage(file);
      const reader = new FileReader();
      reader.onload = (ev) => setImagePreview(ev.target?.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith("image/")) {
      setScriptImage(file);
      const reader = new FileReader();
      reader.onload = (ev) => setImagePreview(ev.target?.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleUpload = async () => {
    if (!user) {
      toast.error("Please log in to upload scripts");
      return;
    }
    if (!newScript.name || !newScript.script_content) {
      toast.error("Please fill in required fields");
      return;
    }

    setUploading(true);

    let imageUrl: string | null = null;
    if (scriptImage) {
      const fileExt = scriptImage.name.split(".").pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from("product-images")
        .upload(fileName, scriptImage);

      if (!uploadError) {
        const { data: { publicUrl } } = supabase.storage
          .from("product-images")
          .getPublicUrl(fileName);
        imageUrl = publicUrl;
      }
    }

    const { error } = await supabase
      .from("community_scripts")
      .insert({
        user_id: user.id,
        name: newScript.name,
        description: newScript.description,
        script_content: newScript.script_content,
        game_name: newScript.game_name,
        category: newScript.category,
        image_url: imageUrl,
      });

    if (error) {
      toast.error("Failed to upload script");
    } else {
      toast.success("Script uploaded successfully!");
      setNewScript({ name: "", description: "", script_content: "", game_name: "", category: "universal" });
      setScriptImage(null);
      setImagePreview(null);
      setShowUploadModal(false);
      fetchScripts();
    }
    setUploading(false);
  };

  const copyScript = async (script: CommunityScript) => {
    await navigator.clipboard.writeText(script.script_content);
    setCopiedId(script.id);
    toast.success("Script copied to clipboard!");
    
    // Increment downloads
    await supabase
      .from("community_scripts")
      .update({ downloads: (script.downloads || 0) + 1 })
      .eq("id", script.id);
    
    setTimeout(() => setCopiedId(null), 2000);
  };

  const getTimeSince = (date: string) => {
    const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };

  return (
    <main className="min-h-screen bg-background">
      <Navbar />
      
      <div className="container mx-auto px-4 pt-24 pb-16">
        {/* Hero Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            <span className="text-primary">Script</span>Hub
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Search the best <span className="text-primary">Lua</span> scripts available in the community uploaded by users!
          </p>
        </motion.div>

        {/* Search Bar */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="max-w-3xl mx-auto mb-8"
        >
          <div className="relative flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                placeholder='Try "admin" or game name...'
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-12 h-12 bg-card border-border text-lg"
              />
            </div>
            <Button variant="outline" size="lg" className="gap-2">
              <Filter className="w-5 h-5" />
            </Button>
            <Button size="lg" className="gap-2">
              Search
            </Button>
          </div>
        </motion.div>

        {/* Stats Cards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12"
        >
          <div className="rounded-xl bg-card border border-border p-6">
            <Users className="w-8 h-8 text-primary mb-3" />
            <h3 className="font-bold text-lg mb-1">Active community</h3>
            <p className="text-sm text-muted-foreground">
              Join hundreds of thousands of people already sharing their content!
            </p>
          </div>
          <div className="rounded-xl bg-card border border-border p-6">
            <Code2 className="w-8 h-8 text-primary mb-3" />
            <h3 className="font-bold text-lg mb-1">Extensive collection</h3>
            <p className="text-sm text-muted-foreground">
              With tens of scripts uploaded every day, the variety is almost endless!
            </p>
          </div>
          <div className="rounded-xl bg-card border border-border p-6">
            <Sparkles className="w-8 h-8 text-primary mb-3" />
            <h3 className="font-bold text-lg mb-1">Bring your spin</h3>
            <p className="text-sm text-muted-foreground">
              Have something to share? Upload and make your presence known!
            </p>
          </div>
        </motion.div>

        {/* Category Filters */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="flex flex-wrap gap-2 mb-8"
        >
          {categories.map((category) => (
            <Button
              key={category}
              variant={selectedCategory === category ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedCategory(category)}
            >
              {category}
            </Button>
          ))}
        </motion.div>

        {/* Recent Scripts Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="flex items-center justify-between mb-6"
        >
          <div className="flex items-center gap-3">
            <TrendingUp className="w-6 h-6 text-primary" />
            <h2 className="text-xl font-bold">Recent Scripts</h2>
          </div>
          <Button 
            className="gap-2"
            onClick={() => user ? setShowUploadModal(true) : toast.error("Please log in to upload")}
          >
            <Plus className="w-4 h-4" />
            Upload
          </Button>
        </motion.div>

        {/* Scripts Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : filteredScripts.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredScripts.map((script, index) => (
              <motion.div
                key={script.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="group relative rounded-xl overflow-hidden bg-card border border-border hover:border-primary/50 transition-all cursor-pointer"
                onClick={() => copyScript(script)}
              >
                {/* Image */}
                <div className="aspect-video bg-gradient-to-br from-primary/20 to-primary/5 relative">
                  {script.image_url ? (
                    <img 
                      src={script.image_url} 
                      alt={script.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Code2 className="w-16 h-16 text-primary/30" />
                    </div>
                  )}
                  
                  {/* Overlay Stats */}
                  <div className="absolute top-2 left-2 flex items-center gap-1 bg-background/80 backdrop-blur-sm rounded-full px-2 py-1">
                    <Eye className="w-3 h-3" />
                    <span className="text-xs">{script.views || 0}</span>
                  </div>
                  <div className="absolute top-2 right-2 bg-background/80 backdrop-blur-sm rounded-full px-2 py-1">
                    <span className="text-xs">{getTimeSince(script.created_at)}</span>
                  </div>
                  
                  {/* Copy Overlay */}
                  <div className="absolute inset-0 bg-primary/80 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    {copiedId === script.id ? (
                      <div className="flex items-center gap-2 text-primary-foreground">
                        <Check className="w-6 h-6" />
                        <span className="font-medium">Copied!</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-primary-foreground">
                        <Copy className="w-6 h-6" />
                        <span className="font-medium">Copy Script</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Info */}
                <div className="p-4">
                  <h3 className="font-bold text-sm truncate">{script.name}</h3>
                  <p className="text-xs text-muted-foreground truncate">
                    {script.game_name || "Universal"} • {script.category || "General"}
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge variant="secondary" className="text-xs">
                      <Download className="w-3 h-3 mr-1" />
                      {script.downloads || 0}
                    </Badge>
                  </div>
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
              <Code2 className="w-12 h-12 text-muted-foreground/50" />
            </div>
            <h3 className="text-xl font-bold mb-2">No Scripts Found</h3>
            <p className="text-muted-foreground text-center max-w-md">
              {searchQuery 
                ? "No scripts match your search. Try different keywords."
                : "Be the first to upload a free script to the community!"}
            </p>
            <Button className="mt-4 gap-2" onClick={() => setShowUploadModal(true)}>
              <Plus className="w-4 h-4" />
              Upload Script
            </Button>
          </motion.div>
        )}
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <div 
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setShowUploadModal(false)}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="rounded-xl bg-card border border-border p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold">Upload Free Script</h3>
              <Button variant="ghost" size="icon" onClick={() => setShowUploadModal(false)}>
                <X className="w-5 h-5" />
              </Button>
            </div>

            <div className="space-y-4">
              {/* Image Upload with Drag & Drop */}
              <div>
                <label className="text-sm font-medium mb-2 block">Script Image (optional)</label>
                <div 
                  className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-all ${
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
                        className="w-full h-40 object-cover rounded-lg"
                      />
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity rounded-lg">
                        <p className="text-white text-sm">Click or drag to change</p>
                      </div>
                    </div>
                  ) : (
                    <div className="py-4">
                      <Image className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
                      <p className="text-sm text-muted-foreground">
                        {isDragging ? "Drop image here" : "Drag & drop or click to upload"}
                      </p>
                      <p className="text-xs text-muted-foreground/50 mt-1">PNG, JPG up to 5MB</p>
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
                <label className="text-sm font-medium mb-2 block">Script Name *</label>
                <Input
                  placeholder="My Amazing Script"
                  value={newScript.name}
                  onChange={(e) => setNewScript({ ...newScript, name: e.target.value })}
                  className="bg-secondary border-border"
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Game Name</label>
                <Input
                  placeholder="e.g., Murder Mystery 2, Blox Fruits..."
                  value={newScript.game_name}
                  onChange={(e) => setNewScript({ ...newScript, game_name: e.target.value })}
                  className="bg-secondary border-border"
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Description</label>
                <Textarea
                  placeholder="What does this script do?"
                  value={newScript.description}
                  onChange={(e) => setNewScript({ ...newScript, description: e.target.value })}
                  className="bg-secondary border-border"
                  rows={2}
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Script Content *</label>
                <Textarea
                  placeholder="Paste your Lua script here..."
                  value={newScript.script_content}
                  onChange={(e) => setNewScript({ ...newScript, script_content: e.target.value })}
                  className="bg-secondary border-border font-mono text-sm"
                  rows={8}
                />
              </div>

              <div className="flex gap-2 pt-2">
                <Button 
                  variant="outline" 
                  className="flex-1" 
                  onClick={() => setShowUploadModal(false)}
                >
                  Cancel
                </Button>
                <Button 
                  className="flex-1" 
                  onClick={handleUpload}
                  disabled={uploading}
                >
                  {uploading ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <Upload className="w-4 h-4 mr-2" />
                  )}
                  Upload Script
                </Button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      <Footer />
    </main>
  );
}
