import { useState, useEffect } from "react";
import {
  ComposableMap,
  Geographies,
  Geography,
  ZoomableGroup
} from "react-simple-maps";
import { motion } from "framer-motion";
import { Globe, Users, Zap } from "lucide-react";

// TopoJSON URL for world countries
const geoUrl = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

interface CountryData {
  country: string;
  executions: number;
  users: number;
}

interface WorldMapProps {
  countryData: CountryData[];
}

// Map of country codes to names
const countryCodeToName: Record<string, string> = {
  "USA": "United States",
  "BRA": "Brazil",
  "RUS": "Russia",
  "CHN": "China",
  "IND": "India",
  "GBR": "United Kingdom",
  "FRA": "France",
  "DEU": "Germany",
  "JPN": "Japan",
  "CAN": "Canada",
  "AUS": "Australia",
  "MEX": "Mexico",
  "ESP": "Spain",
  "ITA": "Italy",
  "KOR": "South Korea",
  "ARG": "Argentina",
  "COL": "Colombia",
  "POL": "Poland",
  "TUR": "Turkey",
  "NLD": "Netherlands",
  "PHL": "Philippines",
  "VNM": "Vietnam",
  "THA": "Thailand",
  "IDN": "Indonesia",
  "MYS": "Malaysia",
  "PRT": "Portugal",
  "ROU": "Romania",
  "CHL": "Chile",
  "PER": "Peru",
  "VEN": "Venezuela",
};

export default function WorldMap({ countryData }: WorldMapProps) {
  const [tooltipContent, setTooltipContent] = useState<{
    name: string;
    executions: number;
    users: number;
    x: number;
    y: number;
  } | null>(null);

  const getCountryColor = (countryName: string) => {
    const data = countryData.find(
      c => c.country?.toLowerCase() === countryName?.toLowerCase() ||
           Object.entries(countryCodeToName).find(([code, name]) => 
             name.toLowerCase() === countryName?.toLowerCase() && c.country === code
           )
    );

    if (!data || data.executions === 0) {
      return "hsl(var(--muted) / 0.3)";
    }

    // Gradient based on execution count
    const maxExecutions = Math.max(...countryData.map(c => c.executions), 1);
    const intensity = Math.min(data.executions / maxExecutions, 1);
    
    if (intensity > 0.7) return "hsl(var(--primary))";
    if (intensity > 0.4) return "hsl(var(--primary) / 0.7)";
    if (intensity > 0.1) return "hsl(var(--primary) / 0.5)";
    return "hsl(var(--primary) / 0.3)";
  };

  const handleMouseEnter = (geo: any, event: React.MouseEvent) => {
    const { NAME, name } = geo.properties;
    const countryName = NAME || name || "Unknown";
    
    const data = countryData.find(
      c => c.country?.toLowerCase() === countryName?.toLowerCase() ||
           Object.values(countryCodeToName).some(n => 
             n.toLowerCase() === countryName?.toLowerCase()
           )
    ) || { executions: 0, users: 0 };

    setTooltipContent({
      name: countryName,
      executions: data.executions,
      users: data.users,
      x: event.clientX,
      y: event.clientY,
    });
  };

  const handleMouseLeave = () => {
    setTooltipContent(null);
  };

  return (
    <div className="relative w-full h-[450px] rounded-xl bg-card border border-border overflow-hidden">
      {/* Tooltip */}
      {tooltipContent && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="fixed z-50 bg-card border border-border rounded-xl p-4 shadow-2xl pointer-events-none"
          style={{
            left: tooltipContent.x + 15,
            top: tooltipContent.y - 30,
          }}
        >
          <div className="flex items-center gap-2 mb-3">
            <Globe className="w-4 h-4 text-primary" />
            <span className="font-bold text-foreground">{tooltipContent.name}</span>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between gap-6">
              <span className="text-muted-foreground flex items-center gap-1.5">
                <Zap className="w-3 h-3" /> Executions:
              </span>
              <span className="text-primary font-semibold">{tooltipContent.executions}</span>
            </div>
            <div className="flex items-center justify-between gap-6">
              <span className="text-muted-foreground flex items-center gap-1.5">
                <Users className="w-3 h-3" /> Users:
              </span>
              <span className="text-primary font-semibold">{tooltipContent.users}</span>
            </div>
          </div>
          {tooltipContent.executions === 0 && (
            <p className="text-muted-foreground text-xs mt-2 pt-2 border-t border-border">
              No activity recorded
            </p>
          )}
        </motion.div>
      )}

      {/* Map */}
      <ComposableMap
        projectionConfig={{
          rotate: [-10, 0, 0],
          scale: 147,
        }}
        style={{ width: "100%", height: "100%" }}
      >
        <ZoomableGroup zoom={1} center={[0, 20]}>
          <Geographies geography={geoUrl}>
            {({ geographies }) =>
              geographies.map((geo) => (
                <Geography
                  key={geo.rsmKey}
                  geography={geo}
                  onMouseEnter={(event) => handleMouseEnter(geo, event)}
                  onMouseLeave={handleMouseLeave}
                  style={{
                    default: {
                      fill: getCountryColor(geo.properties.name || geo.properties.NAME),
                      stroke: "hsl(var(--border))",
                      strokeWidth: 0.5,
                      outline: "none",
                    },
                    hover: {
                      fill: "hsl(var(--primary))",
                      stroke: "hsl(var(--primary))",
                      strokeWidth: 1,
                      outline: "none",
                      cursor: "pointer",
                    },
                    pressed: {
                      fill: "hsl(var(--primary) / 0.8)",
                      outline: "none",
                    },
                  }}
                />
              ))
            }
          </Geographies>
        </ZoomableGroup>
      </ComposableMap>
    </div>
  );
}
