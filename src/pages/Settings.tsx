import { useState, useEffect, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Settings as SettingsIcon,
  Shield,
  BarChart3,
  User,
  Link as LinkIcon,
  RefreshCw,
  Save,
  Loader2,
  Upload,
  Trash2,
  Bot,
  ImageIcon,
  Mail,
  Lock,
  Eye,
  EyeOff,
  Crown,
  Clock,
  Ticket,
  Palette,
  Bell,
  Globe,
  Monitor,
  Moon,
  Sun,
  Smartphone,
  Key,
  LogOut,
  AlertTriangle,
  Check,
  X,
  Camera,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { cn } from "@/lib/utils";
import DiscordLink from "@/components/settings/DiscordLink";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useTheme } from "@/hooks/use-theme";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export default function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const { theme, toggleTheme } = useTheme();

  // Profile state
  const [profile, setProfile] = useState({
    display_name: "",
    avatar_url: "",
    email: "",
  });

  // Subscription state
  const [subscriptionPlan, setSubscriptionPlan] = useState<string | null>(null);
  const [subscriptionExpiresAt, setSubscriptionExpiresAt] = useState<string | null>(null);
  const [renewCode, setRenewCode] = useState("");
  const [renewing, setRenewing] = useState(false);

  // Password state
  const [passwords, setPasswords] = useState({
    current: "",
    new: "",
    confirm: "",
  });
  const [newEmail, setNewEmail] = useState("");

  // Preferences state
  const [preferences, setPreferences] = useState({
    emailNotifications: true,
    discordNotifications: true,
    securityAlerts: true,
    marketingEmails: false,
    twoFactorEnabled: false,
    language: "en",
    timezone: "UTC",
  });

  // Hub settings state
  const [hubSettings, setHubSettings] = useState({
    serviceName: "Shadow Hub",
    identifier: "shadowdevkit",
    discordUrl: "",
    keyPrefix: "shadow_",
    apiToken: "",
    logoUrl: "",
  });

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setUser(session.user);
        setNewEmail(session.user.email || "");
        await fetchProfile(session.user.id);
      }
      setLoading(false);
    };
    init();
  }, []);

  const fetchProfile = async (userId: string) => {
    const { data } = await supabase
      .from("profiles")
      .select("display_name, avatar_url, email, subscription_plan, subscription_expires_at, api_key")
      .eq("id", userId)
      .maybeSingle();

    if (data) {
      setProfile({
        display_name: data.display_name || "",
        avatar_url: data.avatar_url || "",
        email: data.email || "",
      });
      setSubscriptionPlan(data.subscription_plan || null);
      setSubscriptionExpiresAt(data.subscription_expires_at || null);
      if (data.api_key) {
        setHubSettings(prev => ({ ...prev, apiToken: data.api_key }));
      }
    }
  };

  const handleSaveProfile = async () => {
    if (!user) return;
    setSaving(true);
    
    const { error } = await supabase
      .from("profiles")
      .update({
        display_name: profile.display_name,
        avatar_url: profile.avatar_url,
      })
      .eq("id", user.id);

    if (error) {
      toast.error("Failed to update profile");
    } else {
      toast.success("Profile updated successfully!");
    }
    setSaving(false);
  };

  const handleChangePassword = async () => {
    if (passwords.new !== passwords.confirm) {
      toast.error("New passwords don't match");
      return;
    }
    if (passwords.new.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    setSaving(true);
    const { error } = await supabase.auth.updateUser({
      password: passwords.new,
    });

    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Password updated successfully!");
      setPasswords({ current: "", new: "", confirm: "" });
    }
    setSaving(false);
  };

  const handleChangeEmail = async () => {
    if (!newEmail || newEmail === user?.email) {
      toast.error("Please enter a different email");
      return;
    }

    setSaving(true);
    const { error } = await supabase.auth.updateUser({
      email: newEmail,
    });

    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Verification email sent to new address!");
    }
    setSaving(false);
  };

  const handleRedeemRenewalCode = async () => {
    if (!renewCode.trim()) {
      toast.error("Enter a renewal code");
      return;
    }

    setRenewing(true);
    try {
      const codeToRedeem = renewCode.trim().toUpperCase();
      
      const { data: codeRow, error: codeError } = await supabase
        .from("subscription_codes")
        .update({
          is_used: true,
          used_by: user.id,
          used_at: new Date().toISOString(),
        })
        .eq("code", codeToRedeem)
        .eq("is_used", false)
        .select("plan_name, duration_days")
        .maybeSingle();

      if (codeError || !codeRow) {
        toast.error("Invalid or already used code");
        return;
      }

      const now = new Date();
      const base = subscriptionExpiresAt && new Date(subscriptionExpiresAt) > now
        ? new Date(subscriptionExpiresAt)
        : now;

      base.setDate(base.getDate() + (codeRow.duration_days || 30));

      await supabase
        .from("profiles")
        .update({
          subscription_plan: codeRow.plan_name,
          subscription_started_at: now.toISOString(),
          subscription_expires_at: base.toISOString(),
        })
        .eq("id", user.id);

      setSubscriptionPlan(codeRow.plan_name);
      setSubscriptionExpiresAt(base.toISOString());
      setRenewCode("");
      toast.success("Subscription renewed!");
    } finally {
      setRenewing(false);
    }
  };

  const uploadAvatar = async (file: File) => {
    if (!user) {
      toast.error("You must be logged in to upload");
      return;
    }

    const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      toast.error("Please upload a valid image (JPG, PNG, GIF, WebP)");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be less than 5MB");
      return;
    }

    setUploading(true);

    try {
      const fileExt = file.name.split('.').pop()?.toLowerCase() || 'png';
      const fileName = `${user.id}/avatar.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, { 
          upsert: true,
          contentType: file.type 
        });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        toast.error("Failed to upload image");
        return;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      const urlWithCacheBuster = `${publicUrl}?t=${Date.now()}`;

      // Update profile with new avatar
      await supabase
        .from("profiles")
        .update({ avatar_url: urlWithCacheBuster })
        .eq("id", user.id);

      setProfile({ ...profile, avatar_url: urlWithCacheBuster });
      toast.success("Avatar uploaded successfully!");
    } catch (err) {
      console.error('Upload error:', err);
      toast.error("Failed to upload image");
    } finally {
      setUploading(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await uploadAvatar(file);
    }
  };

  const generateApiToken = async () => {
    if (!user) return;
    
    const token = Array.from({ length: 32 }, () => 
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"
        .charAt(Math.floor(Math.random() * 62))
    ).join("");
    
    const { error } = await supabase
      .from("profiles")
      .update({ api_key: token })
      .eq("id", user.id);

    if (error) {
      toast.error("Failed to generate API token");
    } else {
      setHubSettings({ ...hubSettings, apiToken: token });
      toast.success("New API token generated!");
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = "/auth";
  };

  const handleDeleteAccount = async () => {
    toast.error("Account deletion requires contacting support");
  };

  if (loading) {
    return (
      <DashboardLayout breadcrumb="Settings" title="Settings">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout breadcrumb="Settings" title="Settings">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6"
      >
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-xl bg-primary/20 flex items-center justify-center">
            <SettingsIcon className="w-7 h-7 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-foreground">Settings</h2>
            <p className="text-sm text-muted-foreground">Manage all your account and application settings</p>
          </div>
        </div>
      </motion.div>

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList className="bg-secondary/50 p-1 flex flex-wrap gap-1">
          <TabsTrigger value="profile" className="gap-2">
            <User className="w-4 h-4" />
            Profile
          </TabsTrigger>
          <TabsTrigger value="security" className="gap-2">
            <Shield className="w-4 h-4" />
            Security
          </TabsTrigger>
          <TabsTrigger value="subscription" className="gap-2">
            <Crown className="w-4 h-4" />
            Subscription
          </TabsTrigger>
          <TabsTrigger value="preferences" className="gap-2">
            <Palette className="w-4 h-4" />
            Preferences
          </TabsTrigger>
          <TabsTrigger value="integrations" className="gap-2">
            <LinkIcon className="w-4 h-4" />
            Integrations
          </TabsTrigger>
          <TabsTrigger value="api" className="gap-2">
            <Key className="w-4 h-4" />
            API
          </TabsTrigger>
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Avatar & Basic Info */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-xl bg-card border border-border p-6"
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                  <User className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h4 className="font-bold">Profile Picture</h4>
                  <p className="text-xs text-muted-foreground">Upload your avatar</p>
                </div>
              </div>

              <div className="flex items-center gap-6">
                <div className="relative group">
                  <Avatar className="w-24 h-24 border-4 border-primary/20">
                    <AvatarImage src={profile.avatar_url} />
                    <AvatarFallback className="bg-primary/10 text-primary text-2xl">
                      {profile.display_name?.charAt(0)?.toUpperCase() || user?.email?.charAt(0)?.toUpperCase() || "U"}
                    </AvatarFallback>
                  </Avatar>
                  <button
                    onClick={() => avatarInputRef.current?.click()}
                    className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    disabled={uploading}
                  >
                    {uploading ? (
                      <Loader2 className="w-6 h-6 text-white animate-spin" />
                    ) : (
                      <Camera className="w-6 h-6 text-white" />
                    )}
                  </button>
                  <input
                    ref={avatarInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/gif,image/webp"
                    onChange={handleAvatarUpload}
                    className="hidden"
                  />
                </div>

                <div className="flex-1 space-y-3">
                  <Button 
                    variant="outline" 
                    className="w-full gap-2"
                    onClick={() => avatarInputRef.current?.click()}
                    disabled={uploading}
                  >
                    <Upload className="w-4 h-4" />
                    {uploading ? "Uploading..." : "Upload Photo"}
                  </Button>
                  <Button 
                    variant="ghost" 
                    className="w-full gap-2 text-destructive hover:text-destructive"
                    onClick={() => {
                      setProfile({ ...profile, avatar_url: "" });
                      handleSaveProfile();
                    }}
                    disabled={!profile.avatar_url}
                  >
                    <Trash2 className="w-4 h-4" />
                    Remove Photo
                  </Button>
                </div>
              </div>
            </motion.div>

            {/* Display Name & Email */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="rounded-xl bg-card border border-border p-6"
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                  <User className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h4 className="font-bold">Personal Information</h4>
                  <p className="text-xs text-muted-foreground">Your basic info</p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <Label className="text-xs text-muted-foreground">Display Name</Label>
                  <Input
                    value={profile.display_name}
                    onChange={(e) => setProfile({ ...profile, display_name: e.target.value })}
                    placeholder="Enter your name"
                    className="bg-secondary mt-1"
                  />
                </div>

                <div>
                  <Label className="text-xs text-muted-foreground">Email Address</Label>
                  <Input
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="your@email.com"
                    className="bg-secondary mt-1"
                  />
                </div>

                <div className="flex gap-2">
                  <Button onClick={handleSaveProfile} disabled={saving} className="flex-1 gap-2">
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    Save Profile
                  </Button>
                  <Button onClick={handleChangeEmail} disabled={saving} variant="outline" className="gap-2">
                    <Mail className="w-4 h-4" />
                    Update Email
                  </Button>
                </div>
              </div>
            </motion.div>
          </div>
        </TabsContent>

        {/* Security Tab */}
        <TabsContent value="security" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Change Password */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-xl bg-card border border-border p-6"
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                  <Lock className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h4 className="font-bold">Change Password</h4>
                  <p className="text-xs text-muted-foreground">Update your password</p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <Label className="text-xs text-muted-foreground">Current Password</Label>
                  <div className="relative mt-1">
                    <Input
                      type={showPassword ? "text" : "password"}
                      value={passwords.current}
                      onChange={(e) => setPasswords({ ...passwords, current: e.target.value })}
                      className="bg-secondary pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <Label className="text-xs text-muted-foreground">New Password</Label>
                  <div className="relative mt-1">
                    <Input
                      type={showNewPassword ? "text" : "password"}
                      value={passwords.new}
                      onChange={(e) => setPasswords({ ...passwords, new: e.target.value })}
                      className="bg-secondary pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <Label className="text-xs text-muted-foreground">Confirm New Password</Label>
                  <Input
                    type="password"
                    value={passwords.confirm}
                    onChange={(e) => setPasswords({ ...passwords, confirm: e.target.value })}
                    className="bg-secondary mt-1"
                  />
                </div>

                <Button onClick={handleChangePassword} disabled={saving} className="w-full gap-2">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
                  Update Password
                </Button>
              </div>
            </motion.div>

            {/* Security Options */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="rounded-xl bg-card border border-border p-6"
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                  <Shield className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h4 className="font-bold">Security Options</h4>
                  <p className="text-xs text-muted-foreground">Additional security settings</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Shield className="w-5 h-5 text-primary" />
                    <div>
                      <p className="text-sm font-medium">Two-Factor Authentication</p>
                      <p className="text-xs text-muted-foreground">Add extra security</p>
                    </div>
                  </div>
                  <Switch
                    checked={preferences.twoFactorEnabled}
                    onCheckedChange={(checked) => {
                      setPreferences({ ...preferences, twoFactorEnabled: checked });
                      toast.info(checked ? "2FA would be enabled" : "2FA disabled");
                    }}
                  />
                </div>

                <div className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Bell className="w-5 h-5 text-primary" />
                    <div>
                      <p className="text-sm font-medium">Security Alerts</p>
                      <p className="text-xs text-muted-foreground">Get notified of suspicious activity</p>
                    </div>
                  </div>
                  <Switch
                    checked={preferences.securityAlerts}
                    onCheckedChange={(checked) => setPreferences({ ...preferences, securityAlerts: checked })}
                  />
                </div>

                <Separator />

                <div className="space-y-3">
                  <Button variant="outline" className="w-full gap-2" onClick={handleLogout}>
                    <LogOut className="w-4 h-4" />
                    Sign Out
                  </Button>

                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" className="w-full gap-2">
                        <AlertTriangle className="w-4 h-4" />
                        Delete Account
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This action cannot be undone. This will permanently delete your account and remove all your data from our servers.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeleteAccount} className="bg-destructive hover:bg-destructive/90">
                          Delete Account
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            </motion.div>
          </div>
        </TabsContent>

        {/* Subscription Tab */}
        <TabsContent value="subscription" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Current Plan */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-xl bg-card border border-primary/30 p-6"
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                  <Crown className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h4 className="font-bold">Current Plan</h4>
                  <p className="text-xs text-muted-foreground">Your subscription status</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="p-4 bg-primary/10 rounded-lg border border-primary/20">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-muted-foreground">Plan</span>
                    <span className="font-bold text-primary">{subscriptionPlan || "Free"}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      Expires
                    </span>
                    <span className="font-medium">
                      {subscriptionExpiresAt 
                        ? new Date(subscriptionExpiresAt).toLocaleDateString() 
                        : "Never"}
                    </span>
                  </div>
                </div>

                {subscriptionPlan && (
                  <div className="flex items-center gap-2 p-3 bg-primary/10 border border-primary/20 rounded-lg">
                    <Check className="w-5 h-5 text-primary" />
                    <span className="text-sm text-primary">Your subscription is active</span>
                  </div>
                )}
              </div>
            </motion.div>

            {/* Renewal Code */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="rounded-xl bg-card border border-border p-6"
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                  <Ticket className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h4 className="font-bold">Renewal Code</h4>
                  <p className="text-xs text-muted-foreground">Redeem a subscription code</p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <Label className="text-xs text-muted-foreground">Enter Code</Label>
                  <Input
                    placeholder="XXXX-XXXX-XXXX"
                    value={renewCode}
                    onChange={(e) => setRenewCode(e.target.value)}
                    className="bg-secondary font-mono uppercase mt-1"
                  />
                </div>

                <Button
                  className="w-full gap-2"
                  onClick={handleRedeemRenewalCode}
                  disabled={renewing}
                >
                  {renewing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Ticket className="w-4 h-4" />}
                  Redeem Code
                </Button>

                <p className="text-xs text-muted-foreground text-center">
                  Need a subscription? <a href="/pricing" className="text-primary hover:underline">View Plans</a>
                </p>
              </div>
            </motion.div>
          </div>
        </TabsContent>

        {/* Preferences Tab */}
        <TabsContent value="preferences" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Appearance */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-xl bg-card border border-border p-6"
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                  <Palette className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h4 className="font-bold">Appearance</h4>
                  <p className="text-xs text-muted-foreground">Customize the look</p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <Label className="text-xs text-muted-foreground mb-2 block">Theme</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      variant={theme === "light" ? "default" : "outline"}
                      className="gap-2"
                      onClick={() => theme === "dark" && toggleTheme()}
                    >
                      <Sun className="w-4 h-4" />
                      Light
                    </Button>
                    <Button
                      variant={theme === "dark" ? "default" : "outline"}
                      className="gap-2"
                      onClick={() => theme === "light" && toggleTheme()}
                    >
                      <Moon className="w-4 h-4" />
                      Dark
                    </Button>
                  </div>
                </div>

                <Separator />

                <div>
                  <Label className="text-xs text-muted-foreground">Language</Label>
                  <Select
                    value={preferences.language}
                    onValueChange={(value) => setPreferences({ ...preferences, language: value })}
                  >
                    <SelectTrigger className="bg-secondary mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="en">English</SelectItem>
                      <SelectItem value="pt">Português</SelectItem>
                      <SelectItem value="es">Español</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-xs text-muted-foreground">Timezone</Label>
                  <Select
                    value={preferences.timezone}
                    onValueChange={(value) => setPreferences({ ...preferences, timezone: value })}
                  >
                    <SelectTrigger className="bg-secondary mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="UTC">UTC</SelectItem>
                      <SelectItem value="America/Sao_Paulo">São Paulo (GMT-3)</SelectItem>
                      <SelectItem value="America/New_York">New York (GMT-5)</SelectItem>
                      <SelectItem value="Europe/London">London (GMT)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </motion.div>

            {/* Notifications */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="rounded-xl bg-card border border-border p-6"
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                  <Bell className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h4 className="font-bold">Notifications</h4>
                  <p className="text-xs text-muted-foreground">Manage notifications</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Mail className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">Email Notifications</p>
                      <p className="text-xs text-muted-foreground">Receive updates via email</p>
                    </div>
                  </div>
                  <Switch
                    checked={preferences.emailNotifications}
                    onCheckedChange={(checked) => setPreferences({ ...preferences, emailNotifications: checked })}
                  />
                </div>

                <div className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Bot className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">Discord Notifications</p>
                      <p className="text-xs text-muted-foreground">Get notified on Discord</p>
                    </div>
                  </div>
                  <Switch
                    checked={preferences.discordNotifications}
                    onCheckedChange={(checked) => setPreferences({ ...preferences, discordNotifications: checked })}
                  />
                </div>

                <div className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Smartphone className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">Marketing Emails</p>
                      <p className="text-xs text-muted-foreground">Receive promotional content</p>
                    </div>
                  </div>
                  <Switch
                    checked={preferences.marketingEmails}
                    onCheckedChange={(checked) => setPreferences({ ...preferences, marketingEmails: checked })}
                  />
                </div>
              </div>
            </motion.div>
          </div>
        </TabsContent>

        {/* Integrations Tab */}
        <TabsContent value="integrations" className="space-y-6">
          <DiscordLink />
        </TabsContent>

        {/* API Tab */}
        <TabsContent value="api" className="space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-xl bg-card border border-border p-6"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                <Key className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h4 className="font-bold">API Token</h4>
                <p className="text-xs text-muted-foreground">Manage your API access</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <Label className="text-xs text-muted-foreground">Your API Token</Label>
                <div className="flex gap-2 mt-1">
                  <Input
                    value={hubSettings.apiToken}
                    readOnly
                    className="bg-secondary font-mono text-sm flex-1"
                    placeholder="Click generate to create a token"
                  />
                  <Button onClick={generateApiToken} className="gap-2">
                    <RefreshCw className="w-4 h-4" />
                    Generate
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Keep your API token secret. It provides full access to your account.
                </p>
              </div>

              <Separator />

              <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-destructive mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-destructive">Security Warning</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Never share your API token. If you believe it has been compromised, regenerate it immediately.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </TabsContent>
      </Tabs>
    </DashboardLayout>
  );
}
