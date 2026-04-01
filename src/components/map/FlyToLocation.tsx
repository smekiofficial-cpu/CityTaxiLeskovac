import { useMap } from "react-leaflet";
import { useEffect, useRef } from "react";

/** Place inside MapContainer — flies to target when it changes */
export default function FlyToLocation({ lat, lng }: { lat: number | null; lng: number | null }) {
  const map = useMap();
  const prev = useRef<string>("");

  useEffect(() => {
    if (lat === null || lng === null) return;
    const key = `${lat},${lng}`;
    if (key === prev.current) return;
    prev.current = key;
    map.flyTo([lat, lng], 17, { duration: 1.2 });
  }, [lat, lng, map]);

  return null;
}
