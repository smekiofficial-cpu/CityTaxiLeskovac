import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface TaxiZoneDB {
  id: number;
  name: string;
  landmark: string;
  center_lat: number;
  center_lng: number;
  radius: number;
  color: string;
}

export function useTaxiZones() {
  const [zones, setZones] = useState<TaxiZoneDB[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchZones = useCallback(async () => {
    const { data } = await supabase
      .from("taxi_zones")
      .select("*")
      .order("id");
    if (data) setZones(data as TaxiZoneDB[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchZones();
  }, [fetchZones]);

  return { zones, loading, refetch: fetchZones };
}
