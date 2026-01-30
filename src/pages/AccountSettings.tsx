import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  User,
  Mail,
  Lock,
  Save,
  Loader2,
  Eye,
  EyeOff,
  Crown,
  Clock,
  Ticket,
  Shield,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import DiscordLink from "@/components/settings/DiscordLink";

export default function AccountSettings() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [profile, setProfile] = useState({
    display_name: "",
    avatar_url: "",
  });
  const [subscriptionPlan, setSubscriptionPlan] = useState<string | null>(null);
  const [subscriptionExpiresAt, setSubscriptionExpiresAt] = useState<string | null>(null);
  const [renewCode, setRenewCode] = useState("");
  const [renewing, setRenewing] = useState(false);
  const [passwords, setPasswords] = useState({
    current: "",
    new: "",
    confirm: "",
  });
  const [newEmail, setNewEmail] = useState("");

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setUser(session.user);
        setNewEmail(session.user.email || "");
        fetchProfile(session.user.id);
      }
    });
  }, []);

  const fetchProfile = async (userId: string) => {
    const { data } = await supabase
      .from("profiles")
      .select("display_name, avatar_url, subscription_plan, subscription_expires_at")
      .eq("id", userId)
      .maybeSingle();

    if (data) {
      setProfile({
        display_name: data.display_name || "",
        avatar_url: data.avatar_url || "",
      });
      setSubscriptionPlan(data.subscription_plan || null);
      setSubscriptionExpiresAt(data.subscription_expires_at || null);
    }
    setLoading(false);
  };

  const handleSaveProfile = async () => {
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

  if (loading) {
    return (
      <DashboardLayout breadcrumb="Account Settings" title="Account Settings">
        <div className="animate-pulse space-y-6">
          <div className="h-48 bg-muted/50 rounded-xl" />
          <div className="h-48 bg-muted/50 rounded-xl" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout breadcrumb="Account Settings" title="Account Settings">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6"
      >
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-xl bg-primary/20 flex items-center justify-center">
            <User className="w-7 h-7 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-foreground">Account Settings</h2>
            <p className="text-sm text-muted-foreground">Manage your account, subscription, and security settings</p>
          </div>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Subscription Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="rounded-xl bg-card border border-primary/30 p-6"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
              <Crown className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h4 className="font-bold">Subscription</h4>
              <p className="text-xs text-muted-foreground">Manage your plan</p>
            </div>
          </div>

          <div className="grid gap-3 mb-5 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Current Plan</span>
              <span className="font-medium">{subscriptionPlan || "None"}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground flex items-center gap-2">
                <Clock className="w-4 h-4 text-primary" />
                Expires
              </span>
              <span className="font-medium">
                {subscriptionExpiresAt ? new Date(subscriptionExpiresAt).toLocaleDateString() : "-"}
              </span>
            </div>
          </div>

          <div className="space-y-3">
            <label className="text-sm font-medium flex items-center gap-2">
              <Ticket className="w-4 h-4 text-primary" />
              Renewal Code
            </label>
            <Input
              placeholder="Enter code..."
              value={renewCode}
              onChange={(e) => setRenewCode(e.target.value)}
              className="bg-secondary font-mono uppercase"
            />
            <Button
              className="w-full"
              onClick={handleRedeemRenewalCode}
              disabled={renewing}
            >
              {renewing ? <Loader2 className="w-4 h-4 animate-spin" /> : "Renew Subscription"}
            </Button>
          </div>
        </motion.div>

        {/* Profile Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="rounded-xl bg-card border border-border p-6"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
              <User className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h4 className="font-bold">Profile</h4>
              <p className="text-xs text-muted-foreground">Update your profile info</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center border border-primary/30 overflow-hidden">
                {profile.avatar_url ? (
                  <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <User className="w-8 h-8 text-primary" />
                )}
              </div>
              <div className="flex-1">
                <label className="text-xs text-muted-foreground mb-1 block">Avatar URL</label>
                <Input
                  placeholder="https://..."
                  value={profile.avatar_url}
                  onChange={(e) => setProfile({ ...profile, avatar_url: e.target.value })}
                  className="bg-secondary"
                />
              </div>
            </div>

            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Display Name</label>
              <Input
                value={profile.display_name}
                onChange={(e) => setProfile({ ...profile, display_name: e.target.value })}
                className="bg-secondary"
              />
            </div>

            <Button onClick={handleSaveProfile} disabled={saving} className="w-full gap-2">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save Profile
            </Button>
          </div>
        </motion.div>

        {/* Email Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="rounded-xl bg-card border border-border p-6"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
              <Mail className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h4 className="font-bold">Email</h4>
              <p className="text-xs text-muted-foreground">Update your email address</p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Email Address</label>
              <Input
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                className="bg-secondary"
              />
            </div>

            <Button onClick={handleChangeEmail} disabled={saving} variant="outline" className="w-full gap-2">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
              Update Email
            </Button>
          </div>
        </motion.div>

        {/* Password Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="rounded-xl bg-card border border-border p-6"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
              <Lock className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h4 className="font-bold">Password</h4>
              <p className="text-xs text-muted-foreground">Change your password</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="relative">
              <label className="text-xs text-muted-foreground mb-1 block">New Password</label>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  value={passwords.new}
                  onChange={(e) => setPasswords({ ...passwords, new: e.target.value })}
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
              <label className="text-xs text-muted-foreground mb-1 block">Confirm Password</label>
              <Input
                type="password"
                value={passwords.confirm}
                onChange={(e) => setPasswords({ ...passwords, confirm: e.target.value })}
                className="bg-secondary"
              />
            </div>

            <Button onClick={handleChangePassword} disabled={saving} variant="outline" className="w-full gap-2">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
              Update Password
            </Button>
          </div>
        </motion.div>
      </div>

      {/* Discord Link */}
      <div className="mt-6">
        <DiscordLink />
      </div>
    </DashboardLayout>
  );
}
