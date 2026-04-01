import { useEffect, useState, useRef } from "react";
import { MapContainer, Marker, Popup, Polygon, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "./mapStyles.css";
import { supabase } from "@/integrations/supabase/client";
import { LESKOVAC_BOUNDARY, LESKOVAC_CENTER } from "./leskovacBoundary";
import MapLegend from "./MapLegend";
import { MapTileLayers, MapLayerSwitcher, useMapLayer } from "./MapLayerSwitcher";

import { TaxiZoneToggle, TaxiZoneLayer, TaxiZoneLegend } from "./TaxiZones";
import MapClickHandler from "./MapClickHandler";
import TaxiZoneManager from "./TaxiZoneManager";
import DraggableZoneMarkers from "./DraggableZoneMarkers";
import { useTaxiZones } from "@/hooks/useTaxiZones";
import MapSearchOverlay from "./MapSearchOverlay";
import FlyToLocation from "./FlyToLocation";
import type { AddressResult } from "./AddressSearch";

function ZoomControls() {
  const map = useMap();
  return (
    <div className="leaflet-top leaflet-right" style={{ top: "60px", right: "10px", position: "absolute", zIndex: 1000 }}>
      <div className="flex flex-col gap-1">
        <button
          onClick={() => map.zoomIn()}
          className="w-8 h-8 rounded-lg glass-dark border border-border/30 flex items-center justify-center text-foreground hover:bg-muted/20 transition-colors font-mono font-bold text-sm shadow-lg"
          title="Uvećaj"
        >
          +
        </button>
        <button
          onClick={() => map.zoomOut()}
          className="w-8 h-8 rounded-lg glass-dark border border-border/30 flex items-center justify-center text-foreground hover:bg-muted/20 transition-colors font-mono font-bold text-sm shadow-lg"
          title="Umanji"
        >
          −
        </button>
        <button
          onClick={() => map.flyTo(LESKOVAC_CENTER, 14, { duration: 0.8 })}
          className="w-8 h-8 rounded-lg glass-dark border border-border/30 flex items-center justify-center text-foreground hover:bg-muted/20 transition-colors text-xs shadow-lg"
          title="Centar grada"
        >
          ⌂
        </button>
      </div>
    </div>
  );
}

// Fix default marker icons
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

function createDriverIcon(status: string, registration?: string) {
  const colors: Record<string, { bg: string; glow: string }> = {
    available: { bg: "#22c55e", glow: "rgba(34,197,94,0.5)" },
    busy: { bg: "#6b7280", glow: "rgba(107,114,128,0.3)" },
  };
  const { bg, glow } = colors[status] || { bg: "#3b82f6", glow: "rgba(59,130,246,0.4)" };
  const label = registration || "🚕";
  const pulseRing = status === "available"
    ? `<div class="driver-pulse-ring" style="top:-7px;left:-7px;width:58px;height:58px;border:2.5px solid ${bg};opacity:0.7;"></div>`
    : "";

  return L.divIcon({
    className: "",
    html: `
      <div class="driver-marker-wrapper" style="position:relative;width:44px;height:44px;">
        ${pulseRing}
        <div class="driver-marker-dot" style="
          background: linear-gradient(145deg, ${bg}, ${bg}dd);
          color: white;
          border: 3px solid rgba(255,255,255,0.95);
          width: 44px;
          height: 44px;
          box-shadow: 0 4px 16px ${glow}, 0 2px 6px rgba(0,0,0,0.4), 0 0 20px ${glow};
          font-size: 10px;
        ">${label}</div>
      </div>`,
    iconSize: [44, 44],
    iconAnchor: [22, 22],
    popupAnchor: [0, -25],
  });
}

function SmoothMarker({ position, icon, children }: {
  position: [number, number];
  icon: L.DivIcon;
  children: React.ReactNode;
}) {
  const markerRef = useRef<L.Marker | null>(null);
  const prevPos = useRef(position);

  useEffect(() => {
    const marker = markerRef.current;
    if (marker && (prevPos.current[0] !== position[0] || prevPos.current[1] !== position[1])) {
      const start = prevPos.current;
      const end = position;
      const duration = 1000;
      const startTime = Date.now();
      const animate = () => {
        const elapsed = Date.now() - startTime;
        const t = Math.min(elapsed / duration, 1);
        const eased = t * (2 - t);
        marker.setLatLng([
          start[0] + (end[0] - start[0]) * eased,
          start[1] + (end[1] - start[1]) * eased,
        ]);
        if (t < 1) requestAnimationFrame(animate);
      };
      requestAnimationFrame(animate);
      prevPos.current = position;
    }
  }, [position]);

  return (
    <Marker ref={markerRef} position={position} icon={icon}>
      {children}
    </Marker>
  );
}

interface VehicleLocation {
  id: string; vehicle_id: string; driver_id: string;
  latitude: number; longitude: number;
  heading: number | null; speed: number | null; updated_at: string;
}
interface DriverInfo { id: string; full_name: string | null; status: string; }
interface VehicleInfo { id: string; registration: string; current_driver_id: string | null; }

export default function LiveMap() {
  const [locations, setLocations] = useState<VehicleLocation[]>([]);
  const [drivers, setDrivers] = useState<Map<string, DriverInfo>>(new Map());
  const [vehicles, setVehicles] = useState<Map<string, VehicleInfo>>(new Map());
  
  const [showZones, setShowZones] = useState(true);
  const [zoneDragMode, setZoneDragMode] = useState(false);
  const [searchTarget, setSearchTarget] = useState<{ lat: number; lng: number } | null>(null);
  const { layer, setLayer, autoMode, toggleAuto } = useMapLayer();
  const { zones: taxiZones, refetch: refetchZones } = useTaxiZones();
  const [zonePickMode, setZonePickMode] = useState(false);
  const [pickedCoords, setPickedCoords] = useState<{ lat: number; lng: number } | null>(null);

  const handleZoneMoved = async (zoneId: number, lat: number, lng: number) => {
    await supabase.from("taxi_zones").update({ center_lat: lat, center_lng: lng }).eq("id", zoneId);
    refetchZones();
  };

  const handleMapClickForZone = (lat: number, lng: number) => {
    setPickedCoords({ lat, lng });
  };

  const handleSearchSelect = (result: AddressResult) => {
    setSearchTarget({ lat: result.lat, lng: result.lon });
  };

  useEffect(() => {
    const fetchAll = async () => {
      const [locRes, drvRes, vehRes] = await Promise.all([
        supabase.from("vehicle_locations").select("*"),
        supabase.from("profiles").select("id, full_name, status"),
        supabase.from("vehicles").select("id, registration, current_driver_id"),
      ]);
      if (locRes.data) setLocations(locRes.data);
      if (drvRes.data) setDrivers(new Map(drvRes.data.map(d => [d.id, d])));
      if (vehRes.data) setVehicles(new Map(vehRes.data.map(v => [v.id, v])));
    };
    fetchAll();

    const locChannel = supabase
      .channel("live-vehicle-locations")
      .on("postgres_changes", { event: "*", schema: "public", table: "vehicle_locations" }, (payload) => {
        if (payload.eventType === "DELETE") {
          setLocations(prev => prev.filter(l => l.id !== (payload.old as any).id));
        } else {
          const newLoc = payload.new as VehicleLocation;
          setLocations(prev => {
            const idx = prev.findIndex(l => l.vehicle_id === newLoc.vehicle_id);
            if (idx >= 0) { const updated = [...prev]; updated[idx] = newLoc; return updated; }
            return [...prev, newLoc];
          });
        }
      })
      .subscribe();

    const profileChannel = supabase
      .channel("live-driver-profiles")
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "profiles" }, (payload) => {
        const updated = payload.new as DriverInfo;
        setDrivers(prev => { const next = new Map(prev); next.set(updated.id, updated); return next; });
      })
      .subscribe();

    return () => { supabase.removeChannel(locChannel); supabase.removeChannel(profileChannel); };
  }, []);

  const timeSince = (dateStr: string) => {
    const secs = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
    if (secs < 10) return "Upravo";
    if (secs < 60) return `${secs}s`;
    const mins = Math.floor(secs / 60);
    if (mins < 60) return `${mins} min`;
    return `${Math.floor(mins / 60)}h ${mins % 60}m`;
  };

  const statusLabel = (s: string) => {
    const map: Record<string, string> = { available: "🟢 Slobodan", busy: "⚪ Na pauzi" };
    return map[s] || s;
  };

  return (
    <div className="relative h-full w-full">
      <MapContainer
        center={LESKOVAC_CENTER}
        zoom={14}
        className={`h-full w-full ${zonePickMode ? "zone-pick-mode" : ""}`}
        style={{ minHeight: "400px" }}
        maxZoom={19}
        minZoom={12}
        zoomControl={false}
      >
        <ZoomControls />
        <MapTileLayers layer={layer} />
        <MapClickHandler active={zonePickMode} onMapClick={handleMapClickForZone} />
        <FlyToLocation lat={searchTarget?.lat ?? null} lng={searchTarget?.lng ?? null} />

        {/* City boundary */}
        <Polygon
          positions={LESKOVAC_BOUNDARY}
          pathOptions={{
            color: "hsl(45, 100%, 51%)",
            weight: 2.5,
            opacity: 0.65,
            fillColor: "hsl(45, 100%, 51%)",
            fillOpacity: 0.06,
            dashArray: "8, 10",
          }}
        />

        {/* Driver markers */}
        {locations.filter((loc) => {
          const driver = drivers.get(loc.driver_id);
          return driver?.status && driver.status !== "offline";
        }).map((loc) => {
          const driver = drivers.get(loc.driver_id);
          const vehicle = vehicles.get(loc.vehicle_id);
          const driverStatus = driver?.status || "offline";
          const icon = createDriverIcon(driverStatus, vehicle?.registration);

          return (
            <SmoothMarker key={loc.vehicle_id} position={[loc.latitude, loc.longitude]} icon={icon}>
              <Popup>
                <div className="space-y-1.5 min-w-[150px]">
                  <div className="font-display font-bold text-sm" style={{ color: "hsl(45, 100%, 51%)" }}>
                    {driver?.full_name || "Vozač"}
                  </div>
                  {vehicle?.registration && (
                    <div className="text-xs font-mono" style={{ color: "hsl(40, 10%, 55%)" }}>
                      🚗 {vehicle.registration}
                    </div>
                  )}
                  <div className="text-xs">{statusLabel(driverStatus)}</div>
                  {loc.speed !== null && loc.speed > 0 && (
                    <div className="text-xs" style={{ color: "hsl(40, 10%, 55%)" }}>
                      🏎️ {Math.round(loc.speed * 3.6)} km/h
                    </div>
                  )}
                  <div className="text-xs border-t pt-1.5 mt-1.5" style={{ borderColor: "hsl(40, 10%, 20%)", color: "hsl(40, 10%, 50%)" }}>
                    📍 {timeSince(loc.updated_at)}
                  </div>
                </div>
              </Popup>
            </SmoothMarker>
          );
        })}
        
        {showZones && !zoneDragMode && <TaxiZoneLayer zones={taxiZones} />}
        {zoneDragMode && <DraggableZoneMarkers zones={taxiZones} onZoneMoved={handleZoneMoved} />}
      </MapContainer>

      <MapSearchOverlay onSelect={handleSearchSelect} />
      <MapLayerSwitcher layer={layer} setLayer={setLayer} autoMode={autoMode} toggleAuto={toggleAuto} />
      <div className="absolute top-14 left-4 z-[1000] flex flex-col gap-1.5">
        
        <TaxiZoneToggle visible={showZones} onToggle={() => setShowZones(v => !v)} />
        <button
          onClick={() => setZoneDragMode(d => !d)}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all duration-200 backdrop-blur-md border ${
            zoneDragMode
              ? "bg-primary/90 text-primary-foreground border-primary/50 shadow-lg shadow-primary/20"
              : "bg-background/70 text-foreground/70 border-border/40 hover:bg-background/90"
          }`}
          title={zoneDragMode ? "Završi pomeranje zona" : "Pomeri zone prevlačenjem"}
        >
          ✋ <span>{zoneDragMode ? "Završi" : "Pomeri zone"}</span>
        </button>
        <TaxiZoneManager
          zones={taxiZones}
          onRefresh={refetchZones}
          pickMode={zonePickMode}
          onPickModeChange={setZonePickMode}
          pickedCoords={pickedCoords}
          onClearPicked={() => setPickedCoords(null)}
        />
      </div>
      {zonePickMode && (
        <div className="zone-pick-banner">📍 Klikni na mapu da postaviš centar zone</div>
      )}
    </div>
  );
}
