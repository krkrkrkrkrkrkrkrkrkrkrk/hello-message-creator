import { useState } from "react";
import { motion } from "framer-motion";
import { Rocket, Upload, Sparkles, ArrowRight, Image, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ProjectOnboardingProps {
  userId: string;
  onProjectCreated: () => void;
  maxScripts: number;
}

export default function ProjectOnboarding({ userId, onProjectCreated, maxScripts }: ProjectOnboardingProps) {
  const [projectName, setProjectName] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [scriptContent, setScriptContent] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const MAX_LINES = 5000;
  const lineCount = scriptContent.split("\n").length;
  const isOverLimit = lineCount > MAX_LINES;

  const handleCreate = async () => {
    if (!projectName.trim()) {
      toast.error("Please enter a project name");
      return;
    }
    if (!scriptContent.trim()) {
      toast.error("Please paste your Lua script");
      return;
    }
    if (isOverLimit) {
      toast.error(`Script exceeds ${MAX_LINES} lines limit`);
      return;
    }

    setIsCreating(true);
    try {
      // Create the script
      const { error } = await supabase.from("scripts").insert({
        user_id: userId,
        name: projectName.trim(),
        content: scriptContent.trim(),
      });

      if (error) throw error;

      // Update profile display name if owner name provided
      if (ownerName.trim()) {
        await supabase
          .from("profiles")
          .update({ display_name: ownerName.trim() })
          .eq("user_id", userId);
      }

      toast.success("Project created successfully!");
      onProjectCreated();
    } catch (error: any) {
      console.error("Error creating project:", error);
      toast.error(error.message || "Failed to create project");
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="min-h-[70vh] flex items-center justify-center">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-lg"
      >
        {/* Header */}
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring" }}
            className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary/30 to-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-5"
          >
            <Rocket className="w-10 h-10 text-primary" />
          </motion.div>
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Create Your First Project
          </h1>
          <p className="text-muted-foreground text-sm max-w-sm mx-auto">
            Set up your Lua script project to start managing keys, users, and executions.
          </p>
        </div>

        {/* Form */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="rounded-2xl bg-card border border-border p-6 space-y-5"
        >
          {/* Owner Name */}
          <div className="space-y-2">
            <Label htmlFor="owner-name" className="text-sm font-medium">
              Owner Name
            </Label>
            <Input
              id="owner-name"
              value={ownerName}
              onChange={(e) => setOwnerName(e.target.value)}
              placeholder="Your name or brand"
              className="h-11"
            />
            <p className="text-xs text-muted-foreground">
              Displayed as the project owner in the dashboard
            </p>
          </div>

          {/* Project Name */}
          <div className="space-y-2">
            <Label htmlFor="project-name" className="text-sm font-medium">
              Project Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="project-name"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              placeholder="My Awesome Script"
              className="h-11"
              maxLength={50}
            />
            <p className="text-xs text-muted-foreground">
              This will appear in your sidebar and control panel
            </p>
          </div>

          {/* Script Content */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="script-content" className="text-sm font-medium">
                Lua Script <span className="text-destructive">*</span>
              </Label>
              <span className={`text-xs ${isOverLimit ? "text-destructive" : "text-muted-foreground"}`}>
                {lineCount.toLocaleString()} / {MAX_LINES.toLocaleString()} lines
              </span>
            </div>
            <Textarea
              id="script-content"
              value={scriptContent}
              onChange={(e) => setScriptContent(e.target.value)}
              placeholder='print("Hello World")'
              className="font-mono text-sm min-h-[160px] resize-y"
            />
            {isOverLimit && (
              <p className="text-xs text-destructive">
                Script exceeds the maximum of {MAX_LINES.toLocaleString()} lines. Please reduce the size.
              </p>
            )}
          </div>

          {/* Create Button */}
          <Button
            onClick={handleCreate}
            disabled={isCreating || !projectName.trim() || !scriptContent.trim() || isOverLimit}
            className="w-full h-12 text-base gap-2"
            size="lg"
          >
            {isCreating ? (
              <>
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                >
                  <Sparkles className="w-5 h-5" />
                </motion.div>
                Creating...
              </>
            ) : (
              <>
                Create Project
                <ArrowRight className="w-5 h-5" />
              </>
            )}
          </Button>

          <p className="text-xs text-center text-muted-foreground">
            You can create up to {maxScripts} projects on your current plan
          </p>
        </motion.div>
      </motion.div>
    </div>
  );
}
