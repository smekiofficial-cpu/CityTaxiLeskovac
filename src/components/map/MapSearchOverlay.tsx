import { useState } from "react";
import { useMap } from "react-leaflet";
import AddressSearch, { type AddressResult } from "./AddressSearch";

interface MapSearchControlProps {
  onAddressSelect?: (result: AddressResult) => void;
}

/** Renders inside a MapContainer — uses useMap to fly to selected address */
function MapSearchInner({ onAddressSelect }: MapSearchControlProps) {
  const map = useMap();
  const [query, setQuery] = useState("");

  const handleSelect = (result: AddressResult) => {
    map.flyTo([result.lat, result.lon], 17, { duration: 1.2 });
    onAddressSelect?.(result);
  };

  return null; // Actual UI rendered via portal pattern in parent
}

export { MapSearchInner };

/** Standalone overlay for map search — positioned absolutely */
export default function MapSearchOverlay({
  onSelect,
}: {
  onSelect?: (result: AddressResult) => void;
}) {
  const [query, setQuery] = useState("");

  return (
    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000] w-[min(400px,calc(100%-120px))]">
      <AddressSearch
        value={query}
        onChange={setQuery}
        onSelect={onSelect}
        placeholder="🔍 Pretraži adresu u Leskovcu..."
        className="[&_input]:bg-background/90 [&_input]:backdrop-blur-md [&_input]:border-border/50 [&_input]:shadow-lg"
      />
    </div>
  );
}
