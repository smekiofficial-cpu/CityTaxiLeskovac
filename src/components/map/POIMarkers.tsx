import { useState } from "react";
import { CircleMarker, Tooltip } from "react-leaflet";
import { LESKOVAC_POIS, POI_CATEGORIES } from "./leskovacPOIs";
import { MapPin, Eye, EyeOff } from "lucide-react";

export function POIToggle({ visible, onToggle }: { visible: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      className={`
        flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium
        transition-all duration-200 backdrop-blur-md border
        ${visible
          ? "bg-primary/90 text-primary-foreground border-primary/50 shadow-lg shadow-primary/20"
          : "bg-background/70 text-foreground/70 border-border/40 hover:bg-background/90"
        }
      `}
      title={visible ? "Sakrij lokacije" : "Prikaži lokacije"}
    >
      {visible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
      <MapPin className="w-3.5 h-3.5" />
      <span>Lokacije</span>
    </button>
  );
}

export function POILayer() {
  return (
    <>
      {LESKOVAC_POIS.map((poi) => {
        const cat = POI_CATEGORIES[poi.category];
        return (
          <CircleMarker
            key={poi.name}
            center={[poi.lat, poi.lng]}
            radius={8}
            pathOptions={{
              color: cat.color,
              weight: 2,
              fillColor: cat.color,
              fillOpacity: 0.7,
            }}
          >
            <Tooltip direction="top" offset={[0, -10]} className="poi-tooltip">
              <span>{poi.icon} {poi.name}</span>
            </Tooltip>
          </CircleMarker>
        );
      })}
    </>
  );
}
