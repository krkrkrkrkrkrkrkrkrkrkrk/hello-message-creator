import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Link as LinkIcon, Plus, Copy, ExternalLink, Trash2, Check, Loader2, Edit, QrCode } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { toast } from "sonner";

interface ShortURL {
  id: string;
  slug: string;
  destination: string;
  clicks: number;
  created_at: string;
}

export default function ShortURLSettings() {
  const [urls, setUrls] = useState<ShortURL[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newUrl, setNewUrl] = useState({ slug: "", destination: "" });
  const [saving, setSaving] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    fetchUrls();
  }, []);

  const fetchUrls = () => {
    setLoading(true);
    const stored = localStorage.getItem("shadow_short_urls");
    if (stored) {
      setUrls(JSON.parse(stored));
    }
    setLoading(false);
  };

  const saveUrls = (newUrls: ShortURL[]) => {
    localStorage.setItem("shadow_short_urls", JSON.stringify(newUrls));
    setUrls(newUrls);
  };

  const generateRandomSlug = () => {
    const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
    let slug = "";
    for (let i = 0; i < 6; i++) {
      slug += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return slug;
  };

  const handleAddUrl = () => {
    if (!newUrl.destination) {
      toast.error("Please enter a destination URL");
      return;
    }

    // Validate URL
    try {
      new URL(newUrl.destination);
    } catch {
      toast.error("Please enter a valid URL");
      return;
    }

    setSaving(true);
    const shortUrl: ShortURL = {
      id: crypto.randomUUID(),
      slug: newUrl.slug || generateRandomSlug(),
      destination: newUrl.destination,
      clicks: 0,
      created_at: new Date().toISOString(),
    };

    // Check for duplicate slug
    if (urls.some(u => u.slug === shortUrl.slug)) {
      toast.error("This slug is already in use");
      setSaving(false);
      return;
    }

    const updated = [shortUrl, ...urls];
    saveUrls(updated);
    setNewUrl({ slug: "", destination: "" });
    setShowAddModal(false);
    setSaving(false);
    toast.success("Short URL created successfully!");
  };

  const deleteUrl = (id: string) => {
    const updated = urls.filter(u => u.id !== id);
    saveUrls(updated);
    toast.success("URL deleted");
  };

  const copyShortUrl = (slug: string) => {
    const shortUrl = `${window.location.origin}/r/${slug}`;
    navigator.clipboard.writeText(shortUrl);
    setCopiedId(slug);
    toast.success("Short URL copied!");
    setTimeout(() => setCopiedId(null), 2000);
  };

  const openUrl = (destination: string) => {
    window.open(destination, "_blank");
  };

  const incrementClicks = (id: string) => {
    const updated = urls.map(u => 
      u.id === id ? { ...u, clicks: u.clicks + 1 } : u
    );
    saveUrls(updated);
  };

  return (
    <DashboardLayout breadcrumb="Short URL Settings" title="Short URL Settings">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl bg-primary/20 flex items-center justify-center">
              <LinkIcon className="w-7 h-7 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-foreground">Short URL Settings</h2>
              <p className="text-sm text-muted-foreground">Create and manage short URLs</p>
            </div>
          </div>
          <Button className="gap-2" onClick={() => setShowAddModal(true)}>
            <Plus className="w-4 h-4" />
            Create Short URL
          </Button>
        </div>
      </motion.div>

      {/* URLs List */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : urls.length === 0 ? (
        <div className="rounded-xl bg-card border border-border p-12 text-center">
          <LinkIcon className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
          <h3 className="text-xl font-bold mb-2">No Short URLs</h3>
          <p className="text-muted-foreground mb-4">Create short URLs to share your content easily</p>
          <Button className="gap-2" onClick={() => setShowAddModal(true)}>
            <Plus className="w-4 h-4" />
            Create First URL
          </Button>
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          {urls.map((url, index) => (
            <motion.div
              key={url.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className="rounded-xl bg-card border border-border p-4"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
                    <LinkIcon className="w-6 h-6 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <code className="text-sm font-mono text-primary">/{url.slug}</code>
                      <span className="text-xs text-muted-foreground bg-secondary px-2 py-0.5 rounded">
                        {url.clicks} clicks
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground truncate">{url.destination}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-muted-foreground hover:text-foreground"
                    onClick={() => copyShortUrl(url.slug)}
                  >
                    {copiedId === url.slug ? (
                      <Check className="w-4 h-4 text-green-500" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-blue-400 hover:text-blue-300 hover:bg-blue-500/10"
                    onClick={() => {
                      incrementClicks(url.id);
                      openUrl(url.destination);
                    }}
                  >
                    <ExternalLink className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={() => deleteUrl(url.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      )}

      {/* Add URL Modal */}
      {showAddModal && (
        <div 
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setShowAddModal(false)}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="rounded-xl bg-card border border-border p-6 w-full max-w-md"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-xl font-bold mb-4">Create Short URL</h3>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Custom Slug (optional)</label>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">/</span>
                  <Input
                    placeholder="my-link"
                    value={newUrl.slug}
                    onChange={(e) => setNewUrl({ ...newUrl, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "") })}
                    className="bg-secondary border-border"
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-1">Leave empty for random slug</p>
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Destination URL</label>
                <Input
                  placeholder="https://example.com"
                  value={newUrl.destination}
                  onChange={(e) => setNewUrl({ ...newUrl, destination: e.target.value })}
                  className="bg-secondary border-border"
                />
              </div>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => setShowAddModal(false)}>
                  Cancel
                </Button>
                <Button className="flex-1 bg-primary" onClick={handleAddUrl} disabled={saving}>
                  {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
                  Create URL
                </Button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </DashboardLayout>
  );
}
