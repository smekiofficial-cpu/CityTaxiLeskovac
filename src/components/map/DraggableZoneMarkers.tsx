import { useCallback, useEffect, useRef } from "react";
import { Circle, Marker, Tooltip, useMap } from "react-leaflet";
import L from "leaflet";
import type { TaxiZoneDB } from "@/hooks/useTaxiZones";

function createZoneEditIcon(name: string, color: string) {
  return L.divIcon({
    className: "",
    html: `
      <div style="
        width: 32px; height: 32px; border-radius: 50%;
        background: ${color};
        border: 3px solid white;
        box-shadow: 0 2px 12px rgba(0,0,0,0.4), 0 0 0 2px ${color};
        display: flex; align-items: center; justify-content: center;
        cursor: grab; font-size: 10px; color: white; font-weight: 900;
      ">${name.replace("Zona ", "Z")}</div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });
}

interface Props {
  zones: TaxiZoneDB[];
  onZoneMoved: (zoneId: number, lat: number, lng: number) => void;
}

export default function DraggableZoneMarkers({ zones, onZoneMoved }: Props) {
  return (
    <>
      {zones.map((zone) => (
        <DraggableZoneMarker key={zone.id} zone={zone} onMoved={onZoneMoved} />
      ))}
    </>
  );
}

function DraggableZoneMarker({
  zone,
  onMoved,
}: {
  zone: TaxiZoneDB;
  onMoved: (zoneId: number, lat: number, lng: number) => void;
}) {
  const markerRef = useRef<L.Marker | null>(null);
  const icon = createZoneEditIcon(zone.name, zone.color);

  useEffect(() => {
    const marker = markerRef.current;
    if (!marker) return;

    const handleDragEnd = () => {
      const pos = marker.getLatLng();
      onMoved(zone.id, pos.lat, pos.lng);
    };

    marker.on("dragend", handleDragEnd);
    return () => {
      marker.off("dragend", handleDragEnd);
    };
  }, [zone.id, onMoved]);

  return (
    <>
      {/* Semi-transparent preview circle */}
      <Circle
        center={[zone.center_lat, zone.center_lng]}
        radius={zone.radius}
        pathOptions={{
          color: zone.color,
          weight: 2,
          opacity: 0.5,
          fillColor: zone.color,
          fillOpacity: 0.1,
          dashArray: "4, 6",
        }}
      />
      <Marker
        ref={markerRef}
        position={[zone.center_lat, zone.center_lng]}
        icon={icon}
        draggable
      >
        <Tooltip direction="top" offset={[0, -20]} className="taxi-zone-tooltip">
          <span style={{ color: zone.color }}>{zone.name} — prevuci da premestiš</span>
        </Tooltip>
      </Marker>
    </>
  );
}
