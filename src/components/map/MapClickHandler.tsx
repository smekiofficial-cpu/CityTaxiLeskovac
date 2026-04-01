import { useMapEvents } from "react-leaflet";

interface MapClickHandlerProps {
  active: boolean;
  onMapClick: (lat: number, lng: number) => void;
}

export default function MapClickHandler({ active, onMapClick }: MapClickHandlerProps) {
  useMapEvents({
    click(e) {
      if (active) {
        onMapClick(e.latlng.lat, e.latlng.lng);
      }
    },
  });
  return null;
}
