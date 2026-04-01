import { useState, useRef, useCallback, useEffect } from "react";
import { Search, MapPin, X, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export interface AddressResult {
  display_name: string;
  lat: number;
  lon: number;
  type: string;
}

interface AddressSearchProps {
  value: string;
  onChange: (value: string) => void;
  onSelect?: (result: AddressResult) => void;
  placeholder?: string;
  className?: string;
  autoFocus?: boolean;
}

const DEBOUNCE_MS = 150;
const CACHE = new Map<string, AddressResult[]>();

export default function AddressSearch({
  value,
  onChange,
  onSelect,
  placeholder = "Pretraži adresu...",
  className,
  autoFocus,
}: AddressSearchProps) {
  const [results, setResults] = useState<AddressResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const search = useCallback(async (query: string) => {
    if (query.length < 2) {
      setResults([]);
      return;
    }

    const cacheKey = query.toLowerCase().trim();
    if (CACHE.has(cacheKey)) {
      setResults(CACHE.get(cacheKey)!);
      setIsLoading(false);
      return;
    }

    // Cancel previous request
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        q: `${query}, Leskovac, Serbia`,
        format: "json",
        limit: "8",
        addressdetails: "1",
        viewbox: "21.88,43.03,22.01,42.96",
        bounded: "0",
      });

      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?${params}`,
        {
          headers: { "Accept-Language": "sr,en", "User-Agent": "CityTaxiLeskovac/1.0" },
          signal: controller.signal,
        }
      );
      const data = await res.json();

      const mapped: AddressResult[] = data.map((r: any) => ({
        display_name: formatAddress(r.display_name),
        lat: parseFloat(r.lat),
        lon: parseFloat(r.lon),
        type: r.type,
      }));

      CACHE.set(cacheKey, mapped);
      // Limit cache size
      if (CACHE.size > 100) {
        const firstKey = CACHE.keys().next().value;
        if (firstKey) CACHE.delete(firstKey);
      }

      setResults(mapped);
    } catch (e: any) {
      if (e.name !== "AbortError") setResults([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleChange = (val: string) => {
    onChange(val);
    if (timerRef.current) clearTimeout(timerRef.current);

    // Instant cache hit
    const cacheKey = val.toLowerCase().trim();
    if (val.length >= 2 && CACHE.has(cacheKey)) {
      setResults(CACHE.get(cacheKey)!);
      setShowResults(true);
      setIsLoading(false);
      return;
    }

    timerRef.current = setTimeout(() => search(val), DEBOUNCE_MS);
    setShowResults(true);
    if (val.length >= 2) setIsLoading(true);
  };

  const handleSelect = (result: AddressResult) => {
    onChange(result.display_name);
    setShowResults(false);
    setResults([]);
    onSelect?.(result);
  };

  const handleClear = () => {
    onChange("");
    setResults([]);
    setShowResults(false);
    abortRef.current?.abort();
  };

  // Close on click outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowResults(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      abortRef.current?.abort();
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
        <Input
          value={value}
          onChange={(e) => handleChange(e.target.value)}
          onFocus={() => results.length > 0 && setShowResults(true)}
          placeholder={placeholder}
          className="pl-9 pr-9"
          autoFocus={autoFocus}
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
        />
        {isLoading && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground animate-spin" />
        )}
        {!isLoading && value && (
          <button
            onClick={handleClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {showResults && results.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-popover border border-border rounded-lg shadow-xl z-[10001] max-h-[280px] overflow-auto">
          {results.map((r, i) => (
            <button
              key={`${r.lat}-${r.lon}-${i}`}
              onClick={() => handleSelect(r)}
              className="w-full flex items-start gap-2.5 px-3 py-2 text-left hover:bg-accent/50 active:bg-accent/70 transition-colors text-sm border-b border-border/30 last:border-0"
            >
              <MapPin className="w-4 h-4 text-primary shrink-0 mt-0.5" />
              <span className="text-foreground/90 leading-tight">{r.display_name}</span>
            </button>
          ))}
        </div>
      )}

      {showResults && value.length >= 2 && !isLoading && results.length === 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-popover border border-border rounded-lg shadow-xl z-[10001] px-3 py-3 text-sm text-muted-foreground text-center">
          Nema rezultata za "{value}"
        </div>
      )}
    </div>
  );
}

function formatAddress(raw: string): string {
  const parts = raw.split(", ");
  if (parts.length > 3) {
    return parts.slice(0, -2).join(", ");
  }
  return raw;
}
