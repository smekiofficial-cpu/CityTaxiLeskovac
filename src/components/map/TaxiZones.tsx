import { Circle, Tooltip } from "react-leaflet";
import { Layers } from "lucide-react";
import type { TaxiZoneDB } from "@/hooks/useTaxiZones";

export function TaxiZoneToggle({ visible, onToggle }: { visible: boolean; onToggle: () => void }) {
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
      title={visible ? "Sakrij zone" : "Prikaži zone"}
    >
      <Layers className="w-3.5 h-3.5" />
      <span>Zone</span>
    </button>
  );
}

export function TaxiZoneLayer({ zones }: { zones: TaxiZoneDB[] }) {
  return (
    <>
      {zones.map((zone) => (
        <Circle
          key={zone.id}
          center={[zone.center_lat, zone.center_lng]}
          radius={zone.radius}
          pathOptions={{
            color: zone.color,
            weight: 3,
            opacity: 0.85,
            fillColor: zone.color,
            fillOpacity: 0.18,
            dashArray: "6, 8",
          }}
        >
          <Tooltip direction="center" permanent className="taxi-zone-tooltip">
            <span style={{ color: zone.color, textShadow: `0 0 8px ${zone.color}44` }}>{zone.name}</span>
          </Tooltip>
        </Circle>
      ))}
    </>
  );
}

export function TaxiZoneLegend({ zones }: { zones: TaxiZoneDB[] }) {
  return (
    <div className="map-legend" style={{ minWidth: 150 }}>
      <div className="map-legend-title">Taxi zone</div>
      {zones.map((zone) => (
        <div key={zone.id} className="map-legend-item">
          <div className="map-legend-dot" style={{ backgroundColor: zone.color }} />
          <div className="flex flex-col">
            <span className="font-semibold" style={{ color: zone.color }}>{zone.name}</span>
            <span style={{ fontSize: 10, opacity: 0.7 }}>{zone.landmark}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
