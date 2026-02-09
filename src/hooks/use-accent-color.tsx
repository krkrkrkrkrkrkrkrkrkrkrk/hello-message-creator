import { createContext, useContext, useEffect, useState } from "react";

export type AccentColor = "red" | "blue" | "pink" | "purple" | "green" | "orange" | "cyan";

interface AccentColorContextType {
  accentColor: AccentColor;
  setAccentColor: (color: AccentColor) => void;
}

const AccentColorContext = createContext<AccentColorContextType | undefined>(undefined);

export const accentColors: Record<AccentColor, { 
  primary: string; 
  primaryGlow: string; 
  accent: string;
  ring: string;
  label: string;
}> = {
  red: {
    primary: "0 85% 55%",
    primaryGlow: "0 90% 60%",
    accent: "0 75% 50%",
    ring: "0 85% 55%",
    label: "Red",
  },
  blue: {
    primary: "217 91% 60%",
    primaryGlow: "217 95% 65%",
    accent: "217 85% 55%",
    ring: "217 91% 60%",
    label: "Blue",
  },
  pink: {
    primary: "330 85% 60%",
    primaryGlow: "330 90% 65%",
    accent: "330 80% 55%",
    ring: "330 85% 60%",
    label: "Pink",
  },
  purple: {
    primary: "270 85% 60%",
    primaryGlow: "270 90% 65%",
    accent: "270 80% 55%",
    ring: "270 85% 60%",
    label: "Purple",
  },
  green: {
    primary: "142 76% 45%",
    primaryGlow: "142 80% 50%",
    accent: "142 70% 40%",
    ring: "142 76% 45%",
    label: "Green",
  },
  orange: {
    primary: "25 95% 55%",
    primaryGlow: "25 98% 60%",
    accent: "25 90% 50%",
    ring: "25 95% 55%",
    label: "Orange",
  },
  cyan: {
    primary: "185 85% 50%",
    primaryGlow: "185 90% 55%",
    accent: "185 80% 45%",
    ring: "185 85% 50%",
    label: "Cyan",
  },
};

export const AccentColorProvider = ({ children }: { children: React.ReactNode }) => {
  const [accentColor, setAccentColorState] = useState<AccentColor>(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("accent-color") as AccentColor;
      return stored && accentColors[stored] ? stored : "red";
    }
    return "red";
  });

  useEffect(() => {
    const root = window.document.documentElement;
    const colors = accentColors[accentColor];

    root.style.setProperty("--primary", colors.primary);
    root.style.setProperty("--primary-glow", colors.primaryGlow);
    root.style.setProperty("--accent", colors.accent);
    root.style.setProperty("--ring", colors.ring);

    // Update gradients
    root.style.setProperty(
      "--gradient-primary",
      `linear-gradient(135deg, hsl(${colors.primary}) 0%, hsl(${colors.accent}) 100%)`
    );
    root.style.setProperty(
      "--gradient-glow",
      `linear-gradient(180deg, hsl(${colors.primary} / 0.3) 0%, transparent 100%)`
    );
    root.style.setProperty(
      "--shadow-glow",
      `0 0 60px hsl(${colors.primary} / 0.3)`
    );

    localStorage.setItem("accent-color", accentColor);
  }, [accentColor]);

  const setAccentColor = (color: AccentColor) => {
    setAccentColorState(color);
  };

  return (
    <AccentColorContext.Provider value={{ accentColor, setAccentColor }}>
      {children}
    </AccentColorContext.Provider>
  );
};

export const useAccentColor = () => {
  const context = useContext(AccentColorContext);
  if (!context) {
    throw new Error("useAccentColor must be used within an AccentColorProvider");
  }
  return context;
};
