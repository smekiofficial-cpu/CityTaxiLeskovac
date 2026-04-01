import { useState, useCallback } from "react";
import { Search, Navigation, X } from "lucide-react";
import AddressSearch, { AddressResult } from "@/components/map/AddressSearch";

interface Props {
  onNavigate: (lat: number, lng: number, address: string) => void;
}

export default function DriverAddressSearch({ onNavigate }: Props) {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);

  const handleSelect = useCallback((result: AddressResult) => {
    onNavigate(result.lat, result.lon, result.display_name);
    setQuery("");
    setIsOpen(false);
  }, [onNavigate]);

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="w-10 h-10 rounded-full glass-dark border border-border/30 flex items-center justify-center text-primary hover:bg-muted/20 active:scale-95 transition-all shadow-lg"
        title="Pretraži adresu"
      >
        <Search className="w-5 h-5" />
      </button>
    );
  }

  return (
    <div className="glass-dark border border-border/30 rounded-xl p-2 shadow-xl" style={{ width: "min(320px, calc(100vw - 32px))" }}>
      <div className="flex items-center gap-1 mb-1">
        <Navigation className="w-4 h-4 text-primary shrink-0" />
        <span className="text-xs font-display font-semibold text-foreground">Navigacija</span>
        <button onClick={() => { setIsOpen(false); setQuery(""); }} className="ml-auto text-muted-foreground hover:text-foreground">
          <X className="w-4 h-4" />
        </button>
      </div>
      <AddressSearch
        value={query}
        onChange={setQuery}
        onSelect={handleSelect}
        placeholder="Unesite adresu..."
        autoFocus
      />
    </div>
  );
}
