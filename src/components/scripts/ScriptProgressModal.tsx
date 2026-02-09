import { motion, AnimatePresence } from "framer-motion";
import { Cloud, Settings, Lock, CheckCircle2, Loader2 } from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface ScriptProgressModalProps {
  isOpen: boolean;
  progress: number;
  currentStep: number;
  steps: { name: string; icon: React.ReactNode }[];
}

export default function ScriptProgressModal({
  isOpen,
  progress,
  currentStep,
  steps,
}: ScriptProgressModalProps) {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="w-full max-w-lg mx-4 bg-card border border-border rounded-2xl p-6 shadow-2xl"
        >
          {/* Header */}
          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
              <Cloud className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-foreground">Uploading Script</h3>
              <p className="text-sm text-muted-foreground">Uploading your script to the server...</p>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">Progress</span>
              <span className="text-sm font-medium text-primary">{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="h-2 bg-secondary" />
          </div>

          {/* Steps */}
          <div className="space-y-3 mb-6">
            {steps.map((step, index) => {
              const isCompleted = index < currentStep;
              const isActive = index === currentStep;
              const isPending = index > currentStep;

              return (
                <motion.div
                  key={step.name}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className={`flex items-center gap-3 p-2 rounded-lg transition-colors ${
                    isActive ? "bg-primary/10" : ""
                  }`}
                >
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                      isCompleted
                        ? "bg-green-500/20 text-green-500"
                        : isActive
                        ? "bg-primary/20 text-primary"
                        : "bg-muted/50 text-muted-foreground"
                    }`}
                  >
                    {isCompleted ? (
                      <CheckCircle2 className="w-4 h-4" />
                    ) : isActive ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      step.icon
                    )}
                  </div>
                  <span
                    className={`text-sm font-medium ${
                      isCompleted
                        ? "text-green-500"
                        : isActive
                        ? "text-primary"
                        : "text-muted-foreground"
                    }`}
                  >
                    {step.name}
                  </span>
                </motion.div>
              );
            })}
          </div>

          {/* Footer Message */}
          <p className="text-center text-xs text-muted-foreground">
            Please wait while we process your script. This may take a moment for large files.
          </p>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
