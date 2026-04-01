import { useEffect, useState, useRef, useCallback } from "react";
import { MapContainer, Marker, Polygon, Polyline, useMap, CircleMarker, Popup } from "react-leaflet";
import { Crosshair, Navigation, Clock, ArrowRight } from "lucide-react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "./mapStyles.css";
import { LESKOVAC_BOUNDARY, LESKOVAC_CENTER } from "./leskovacBoundary";
import { MapTileLayers, MapLayerSwitcher, useMapLayer } from "./MapLayerSwitcher";
import { useRouting, formatDistance, formatDuration } from "@/hooks/useRouting";

// Fix default marker icons
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

function createDriverIcon(label: string) {
  return L.divIcon({
    className: "",
    html: `
      <div class="driver-marker-wrapper" style="position:relative;width:52px;height:52px;">
        <div class="driver-pulse-ring" style="top:-8px;left:-8px;width:68px;height:68px;border:3px solid hsl(45,100%,51%);opacity:0.8;"></div>
        <div class="driver-marker-dot" style="
          background: linear-gradient(145deg, hsl(45,100%,55%), hsl(38,100%,42%));
          color: hsl(40,10%,5%);
          border: 3.5px solid rgba(255,255,255,0.97);
          width: 52px;
          height: 52px;
          box-shadow: 0 6px 24px rgba(234,179,8,0.6), 0 2px 8px rgba(0,0,0,0.5), 0 0 32px rgba(234,179,8,0.35);
          font-size: 12px;
          font-weight: 900;
          letter-spacing: 0.8px;
        ">${label}</div>
      </div>`,
    iconSize: [52, 52],
    iconAnchor: [26, 26],
    popupAnchor: [0, -30],
  });
}

const AutoZoomToDriver = ({ lat, lng, trigger, initialDone }: { lat: number; lng: number; trigger: number; initialDone: React.MutableRefObject<boolean> }) => {
  const map = useMap();
  const prev = useRef<string>("");

  useEffect(() => {
    if (!initialDone.current) {
      initialDone.current = true;
      map.setView([lat, lng], 17, { animate: true });
    }
  }, [lat, lng, map, initialDone]);

  useEffect(() => {
    if (trigger === 0) return;
    const key = `${trigger}`;
    if (key === prev.current) return;
    prev.current = key;
    map.flyTo([lat, lng], 17, { duration: 1.2 });
  }, [trigger, lat, lng, map]);

  return null;
}

const FollowDriver = ({ lat, lng }: { lat: number; lng: number }) => {
  const map = useMap();
  const lastPos = useRef<string>("");

  useEffect(() => {
    const key = `${lat.toFixed(5)},${lng.toFixed(5)}`;
    if (key === lastPos.current) return;
    lastPos.current = key;
    const point = map.latLngToContainerPoint([lat, lng]);
    const size = map.getSize();
    const margin = 0.25;
    const isOutside =
      point.x < size.x * margin ||
      point.x > size.x * (1 - margin) ||
      point.y < size.y * margin ||
      point.y > size.y * (1 - margin);
    if (isOutside) {
      map.panTo([lat, lng], { animate: true, duration: 0.8 });
    }
  }, [lat, lng, map]);

  return null;
}

function createDestinationIcon() {
  return L.divIcon({
    className: "",
    html: `
      <div style="position:relative;width:40px;height:40px;">
        <div style="
          background: linear-gradient(145deg, hsl(0,85%,55%), hsl(350,85%,45%));
          color: white;
          border: 3px solid rgba(255,255,255,0.95);
          width: 40px;
          height: 40px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 18px;
          box-shadow: 0 4px 16px rgba(220,38,38,0.5), 0 2px 6px rgba(0,0,0,0.4);
        ">📍</div>
      </div>`,
    iconSize: [40, 40],
    iconAnchor: [20, 20],
    popupAnchor: [0, -24],
  });
}

function FitBoundsToRoute({ coordinates }: { coordinates: L.LatLngTuple[] }) {
  const map = useMap();
  const prev = useRef("");

  useEffect(() => {
    if (coordinates.length < 2) return;
    const key = `${coordinates[0][0]},${coordinates[0][1]}-${coordinates[coordinates.length - 1][0]},${coordinates[coordinates.length - 1][1]}`;
    if (key === prev.current) return;
    prev.current = key;
    const bounds = L.latLngBounds(coordinates);
    map.fitBounds(bounds, { padding: [60, 60], maxZoom: 16, animate: true });
  }, [coordinates, map]);

  return null;
}

function FitBounds({ driverLat, driverLng, destLat, destLng }: { driverLat: number; driverLng: number; destLat: number; destLng: number }) {
  const map = useMap();
  const prev = useRef("");

  useEffect(() => {
    const key = `${destLat},${destLng}`;
    if (key === prev.current) return;
    prev.current = key;
    const bounds = L.latLngBounds([
      [driverLat, driverLng],
      [destLat, destLng],
    ]);
    map.fitBounds(bounds, { padding: [60, 60], maxZoom: 16, animate: true });
  }, [driverLat, driverLng, destLat, destLng, map]);

  return null;
}

export interface DriverDestination {
  lat: number;
  lng: number;
  address: string;
}

interface DriverMapProps {
  latitude: number | null;
  longitude: number | null;
  vehicleRegistration?: string;
  destination?: DriverDestination | null;
  onClearDestination?: () => void;
}

export default function DriverMap({ latitude, longitude, vehicleRegistration, destination, onClearDestination }: DriverMapProps) {
  const lat = latitude ?? LESKOVAC_CENTER[0];
  const lng = longitude ?? LESKOVAC_CENTER[1];
  const hasLocation = latitude !== null && longitude !== null;
  const icon = createDriverIcon(vehicleRegistration || "🚕");
  const { layer, setLayer, autoMode, toggleAuto } = useMapLayer();
  const [recenterTrigger, setRecenterTrigger] = useState(0);
  const initialDone = useRef(false);
  const { route, isLoading: routeLoading, fetchRoute, clearRoute } = useRouting();
  const [showInstructions, setShowInstructions] = useState(false);

  // Fetch route when destination changes
  useEffect(() => {
    if (destination && hasLocation) {
      fetchRoute(lat, lng, destination.lat, destination.lng);
    } else {
      clearRoute();
      setShowInstructions(false);
    }
  }, [destination?.lat, destination?.lng, hasLocation]);

  // Re-fetch route periodically as driver moves (every 30s)
  useEffect(() => {
    if (!destination || !hasLocation) return;
    const interval = setInterval(() => {
      fetchRoute(lat, lng, destination.lat, destination.lng);
    }, 30000);
    return () => clearInterval(interval);
  }, [destination, lat, lng, hasLocation, fetchRoute]);

  const handleRecenter = useCallback(() => {
    setRecenterTrigger(t => t + 1);
  }, []);

  const handleClearNav = useCallback(() => {
    clearRoute();
    setShowInstructions(false);
    onClearDestination?.();
  }, [clearRoute, onClearDestination]);

  return (
    <div className="relative h-full w-full">
      <MapContainer
        center={[lat, lng]}
        zoom={hasLocation ? 17 : 14}
        className="h-full w-full"
        style={{ minHeight: "250px" }}
        maxZoom={19}
        minZoom={12}
        zoomControl={false}
      >
        <MapTileLayers layer={layer} />

        <Polygon
          positions={LESKOVAC_BOUNDARY}
          pathOptions={{
            color: "hsl(45, 100%, 51%)",
            weight: 2,
            opacity: 0.25,
            fillColor: "hsl(45, 100%, 51%)",
            fillOpacity: 0.02,
            dashArray: "6, 8",
          }}
        />

        {hasLocation && (
          <>
            {destination && route?.coordinates ? (
              <FitBoundsToRoute coordinates={route.coordinates} />
            ) : destination ? (
              <FitBounds driverLat={lat} driverLng={lng} destLat={destination.lat} destLng={destination.lng} />
            ) : (
              <>
                <AutoZoomToDriver lat={lat} lng={lng} trigger={recenterTrigger} initialDone={initialDone} />
                <FollowDriver lat={lat} lng={lng} />
              </>
            )}
            <CircleMarker
              center={[lat, lng]}
              radius={10}
              pathOptions={{
                color: "hsl(45, 100%, 51%)",
                weight: 2,
                opacity: 0.4,
                fillColor: "hsl(45, 100%, 51%)",
                fillOpacity: 0.12,
              }}
            />
            <Marker position={[lat, lng]} icon={icon} />
          </>
        )}

        {/* Route polyline (real road route from OSRM) */}
        {route?.coordinates && route.coordinates.length > 1 && (
          <Polyline
            positions={route.coordinates}
            pathOptions={{
              color: "hsl(210, 100%, 56%)",
              weight: 5,
              opacity: 0.85,
              lineCap: "round",
              lineJoin: "round",
            }}
          />
        )}

        {/* Fallback straight line while route loads */}
        {destination && hasLocation && !route?.coordinates && (
          <Polyline
            positions={[[lat, lng], [destination.lat, destination.lng]]}
            pathOptions={{
              color: "hsl(0, 85%, 55%)",
              weight: 4,
              opacity: 0.5,
              dashArray: "10, 8",
            }}
          />
        )}

        {/* Destination marker */}
        {destination && hasLocation && (
          <Marker position={[destination.lat, destination.lng]} icon={createDestinationIcon()}>
            <Popup>
              <div style={{ maxWidth: 200, fontSize: 13 }}>
                <strong>📍 Odredište</strong><br />
                {destination.address}
                {route && (
                  <>
                    <br />
                    <span style={{ color: "#3b82f6" }}>
                      {formatDistance(route.distance)} · {formatDuration(route.duration)}
                    </span>
                  </>
                )}
              </div>
            </Popup>
          </Marker>
        )}
      </MapContainer>

      <MapLayerSwitcher layer={layer} setLayer={setLayer} autoMode={autoMode} toggleAuto={toggleAuto} />

      {/* In-app navigation bar */}
      {destination && (
        <div className="absolute bottom-20 left-3 right-16 z-[1000] animate-fade-in">
          {/* Route info bar */}
          <div className="glass-dark border border-border/30 rounded-xl px-3 py-2 shadow-xl">
            <div className="flex items-center gap-2">
              <span className="text-lg">📍</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-xs text-muted-foreground">Navigacija do:</p>
                  {route && !routeLoading && (
                    <div className="flex items-center gap-1.5 text-xs">
                      <span className="flex items-center gap-0.5 text-primary font-mono font-bold">
                        <Navigation className="w-3 h-3" />
                        {formatDistance(route.distance)}
                      </span>
                      <span className="flex items-center gap-0.5 text-taxi-cyan font-mono font-bold">
                        <Clock className="w-3 h-3" />
                        {formatDuration(route.duration)}
                      </span>
                    </div>
                  )}
                  {routeLoading && (
                    <span className="text-[10px] text-muted-foreground animate-pulse">Učitavam rutu...</span>
                  )}
                </div>
                <p className="text-sm font-semibold text-foreground truncate">{destination.address}</p>
              </div>
              {/* Toggle instructions */}
              {route && route.instructions.length > 0 && (
                <button
                  onClick={() => setShowInstructions(!showInstructions)}
                  className="shrink-0 w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center hover:bg-primary/20 transition-colors"
                  title="Prikaži uputstva"
                >
                  <ArrowRight className={`w-4 h-4 transition-transform ${showInstructions ? "rotate-90" : ""}`} />
                </button>
              )}
              <button
                onClick={handleClearNav}
                className="shrink-0 w-9 h-9 rounded-full bg-destructive/20 text-destructive flex items-center justify-center hover:bg-destructive/30 transition-colors"
                title="Zatvori navigaciju"
              >
                ✕
              </button>
            </div>

            {/* Turn-by-turn instructions */}
            {showInstructions && route && route.instructions.length > 0 && (
              <div className="mt-2 pt-2 border-t border-border/30 max-h-[120px] overflow-auto space-y-1">
                {route.instructions.map((inst, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs py-1">
                    <span className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0 font-mono text-[10px] font-bold">
                      {i + 1}
                    </span>
                    <span className="text-foreground/80 flex-1">{inst.text}</span>
                    <span className="text-muted-foreground font-mono text-[10px] shrink-0">
                      {formatDistance(inst.distance)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Recenter button */}
      <button
        onClick={handleRecenter}
        className="absolute bottom-4 right-4 z-[1000] w-14 h-14 rounded-full glass-dark border border-border/30 flex items-center justify-center text-primary hover:bg-muted/20 active:scale-90 transition-all shadow-xl"
        title="Centriraj na moju lokaciju"
      >
        <Crosshair className="w-6 h-6" />
      </button>
    </div>
  );
}
