import { motion } from "framer-motion";
import { Check, Palette } from "lucide-react";
import { useAccentColor, accentColors, AccentColor } from "@/hooks/use-accent-color";

const ThemeColorPicker = () => {
  const { accentColor, setAccentColor } = useAccentColor();

  const colorKeys = Object.keys(accentColors) as AccentColor[];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card rounded-2xl p-6 border border-border/50 mb-6"
    >
      <h2 className="text-xl font-bold mb-2 flex items-center gap-2">
        <Palette className="w-5 h-5 text-primary" />
        Theme Color
      </h2>
      <p className="text-sm text-muted-foreground mb-6">
        Choose the primary color for the website
      </p>

      <div className="flex justify-center gap-4 flex-wrap">
        {colorKeys.map((color) => {
          const colorData = accentColors[color];
          const isSelected = accentColor === color;

          return (
            <motion.button
              key={color}
              onClick={() => setAccentColor(color)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="flex flex-col items-center gap-2"
            >
              <div
                className={`w-14 h-14 rounded-xl transition-all duration-200 flex items-center justify-center ${
                  isSelected ? "ring-2 ring-offset-2 ring-offset-background ring-white" : ""
                }`}
                style={{
                  backgroundColor: `hsl(${colorData.primary})`,
                  boxShadow: isSelected ? `0 0 20px hsl(${colorData.primary} / 0.5)` : undefined,
                }}
              >
                {isSelected && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 500 }}
                  >
                    <Check className="w-6 h-6 text-white" />
                  </motion.div>
                )}
              </div>
              <span className="text-xs text-muted-foreground">
                {colorData.label}
              </span>
            </motion.button>
          );
        })}
      </div>
    </motion.div>
  );
};

export default ThemeColorPicker;
