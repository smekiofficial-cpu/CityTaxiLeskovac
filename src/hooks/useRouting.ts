import { useState, useCallback, useRef } from "react";
import type { LatLngTuple } from "leaflet";

interface RouteData {
  coordinates: LatLngTuple[];
  distance: number; // meters
  duration: number; // seconds
  instructions: RouteInstruction[];
}

export interface RouteInstruction {
  text: string;
  distance: number;
  duration: number;
  type: string;
  modifier?: string;
}

const ROUTE_CACHE = new Map<string, RouteData>();

export function useRouting() {
  const [route, setRoute] = useState<RouteData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const fetchRoute = useCallback(async (
    fromLat: number, fromLng: number,
    toLat: number, toLng: number,
  ) => {
    const cacheKey = `${fromLat.toFixed(4)},${fromLng.toFixed(4)}-${toLat.toFixed(4)},${toLng.toFixed(4)}`;
    
    if (ROUTE_CACHE.has(cacheKey)) {
      setRoute(ROUTE_CACHE.get(cacheKey)!);
      return;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setIsLoading(true);
    try {
      // OSRM free routing API
      const res = await fetch(
        `https://router.project-osrm.org/route/v1/driving/${fromLng},${fromLat};${toLng},${toLat}?overview=full&geometries=geojson&steps=true`,
        { signal: controller.signal }
      );
      const data = await res.json();

      if (data.code === "Ok" && data.routes?.[0]) {
        const r = data.routes[0];
        const coordinates: LatLngTuple[] = r.geometry.coordinates.map(
          (c: [number, number]) => [c[1], c[0]] as LatLngTuple
        );

        const instructions: RouteInstruction[] = [];
        for (const leg of r.legs) {
          for (const step of leg.steps) {
            if (step.maneuver.type === "depart" || step.maneuver.type === "arrive" || step.distance < 5) continue;
            instructions.push({
              text: step.name ? `${formatManeuver(step.maneuver.type, step.maneuver.modifier)} na ${step.name}` : formatManeuver(step.maneuver.type, step.maneuver.modifier),
              distance: step.distance,
              duration: step.duration,
              type: step.maneuver.type,
              modifier: step.maneuver.modifier,
            });
          }
        }

        const routeData: RouteData = {
          coordinates,
          distance: r.distance,
          duration: r.duration,
          instructions,
        };

        ROUTE_CACHE.set(cacheKey, routeData);
        if (ROUTE_CACHE.size > 50) {
          const firstKey = ROUTE_CACHE.keys().next().value;
          if (firstKey) ROUTE_CACHE.delete(firstKey);
        }

        setRoute(routeData);
      }
    } catch (e: any) {
      if (e.name !== "AbortError") {
        console.error("Routing error:", e);
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  const clearRoute = useCallback(() => {
    setRoute(null);
    abortRef.current?.abort();
  }, []);

  return { route, isLoading, fetchRoute, clearRoute };
}

function formatManeuver(type: string, modifier?: string): string {
  const modMap: Record<string, string> = {
    left: "Skrenite levo",
    right: "Skrenite desno",
    "slight left": "Blago levo",
    "slight right": "Blago desno",
    "sharp left": "Oštro levo",
    "sharp right": "Oštro desno",
    straight: "Nastavite pravo",
    uturn: "Okrenite se",
  };

  const typeMap: Record<string, string> = {
    turn: modifier ? modMap[modifier] || "Skrenite" : "Skrenite",
    "new name": "Nastavite",
    merge: "Pridružite se",
    "on ramp": "Uđite na rampu",
    "off ramp": "Siđite sa rampe",
    fork: modifier?.includes("left") ? "Držite se levo" : "Držite se desno",
    "end of road": modifier ? modMap[modifier] || "Kraj puta" : "Kraj puta",
    continue: "Nastavite pravo",
    roundabout: "Kružni tok",
    "roundabout turn": "Kružni tok",
    rotary: "Kružni tok",
    notification: "Obaveštenje",
  };

  return typeMap[type] || modMap[modifier || ""] || "Nastavite";
}

export function formatDistance(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(1)} km`;
}

export function formatDuration(seconds: number): string {
  const mins = Math.round(seconds / 60);
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${h}h ${m}min`;
}
