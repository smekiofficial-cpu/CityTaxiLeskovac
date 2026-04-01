import { useState, useEffect, useCallback } from "react";
import { TileLayer } from "react-leaflet";
import { MapPin, Clock } from "lucide-react";

type LayerType = "osm";
type AutoMode = "auto" | "manual";

interface TileConfig {
  url: string;
  attribution: string;
}

const TILE_CONFIGS: Record<LayerType, TileConfig> = {
  osm: {
    url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  },
};

const LAYER_ICONS: Record<LayerType, { icon: typeof MapPin; label: string }> = {
  osm: { icon: MapPin, label: "OSM" },
};

function getAutoLayer(): LayerType {
  return "osm";
}

export function useMapLayer() {
  const [autoMode, setAutoMode] = useState<AutoMode>("auto");
  const [manualLayer, setManualLayer] = useState<LayerType>("osm");
  const [autoLayer, setAutoLayer] = useState<LayerType>(getAutoLayer);

  // Update auto layer every minute
  useEffect(() => {
    if (autoMode !== "auto") return;
    setAutoLayer(getAutoLayer());
    const interval = setInterval(() => setAutoLayer(getAutoLayer()), 60_000);
    return () => clearInterval(interval);
  }, [autoMode]);

  const layer = autoMode === "auto" ? autoLayer : manualLayer;

  const setLayer = useCallback((l: LayerType) => {
    setAutoMode("manual");
    setManualLayer(l);
  }, []);

  const toggleAuto = useCallback(() => {
    setAutoMode((prev) => (prev === "auto" ? "manual" : "auto"));
  }, []);

  return { layer, setLayer, autoMode, toggleAuto };
}

export function MapTileLayers({ layer }: { layer: LayerType }) {
  const config = TILE_CONFIGS[layer];
  return (
    <TileLayer
      key={`base-${layer}`}
      url={config.url}
      attribution={config.attribution}
      maxZoom={19}
    />
  );
}

export function MapLayerSwitcher({
  layer,
  setLayer,
  autoMode,
  toggleAuto,
}: {
  layer: LayerType;
  setLayer: (l: LayerType) => void;
  autoMode: AutoMode;
  toggleAuto: () => void;
}) {
  const layers: LayerType[] = ["osm"];

  return (
    <div className="absolute top-4 right-4 z-[1000] flex flex-col gap-1.5">
      {/* Auto toggle */}
      <button
        onClick={toggleAuto}
        className={`
          flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium
          transition-all duration-200 backdrop-blur-md border
          ${autoMode === "auto"
            ? "bg-emerald-500/90 text-white border-emerald-400/50 shadow-lg shadow-emerald-500/20"
            : "bg-background/70 text-foreground/70 border-border/40 hover:bg-background/90 hover:text-foreground"
          }
        `}
        title={autoMode === "auto" ? "Auto mod aktivan (19h–06h noćna)" : "Uključi auto mod"}
      >
        <Clock className="w-3.5 h-3.5" />
        <span>Auto</span>
      </button>

      <div className="h-px bg-border/30 mx-1" />

      {/* Layer buttons */}
      {layers.map((l) => {
        const { icon: Icon, label } = LAYER_ICONS[l];
        const active = layer === l;
        return (
          <button
            key={l}
            onClick={() => setLayer(l)}
            className={`
              flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium
              transition-all duration-200 backdrop-blur-md border
              ${active
                ? "bg-primary/90 text-primary-foreground border-primary/50 shadow-lg shadow-primary/20"
                : "bg-background/70 text-foreground/70 border-border/40 hover:bg-background/90 hover:text-foreground"
              }
            `}
            title={label}
          >
            <Icon className="w-3.5 h-3.5" />
            <span>{label}</span>
          </button>
        );
      })}
    </div>
  );
}
