import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface ZoneQueueEntry {
  id: string;
  zone_id: number;
  vehicle_id: string;
  driver_id: string;
  position: number;
  entered_at: string;
}

export function useZoneQueue() {
  const [queue, setQueue] = useState<ZoneQueueEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchQueue = useCallback(async () => {
    const { data } = await supabase
      .from("zone_queue")
      .select("*")
      .order("zone_id")
      .order("position");
    if (data) setQueue(data as ZoneQueueEntry[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchQueue();

    const channel = supabase
      .channel("zone-queue-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "zone_queue" }, () => fetchQueue())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetchQueue]);

  const getQueueForZone = useCallback((zoneId: number) => {
    return queue.filter(q => q.zone_id === zoneId).sort((a, b) => a.position - b.position);
  }, [queue]);

  const getNextInZone = useCallback((zoneId: number) => {
    const zoneQueue = getQueueForZone(zoneId);
    return zoneQueue.length > 0 ? zoneQueue[0] : null;
  }, [getQueueForZone]);

  const addToQueue = useCallback(async (zoneId: number, vehicleId: string, driverId: string) => {
    const zoneQueue = queue.filter(q => q.zone_id === zoneId);
    const maxPos = zoneQueue.length > 0 ? Math.max(...zoneQueue.map(q => q.position)) : 0;
    
    const { error } = await supabase.from("zone_queue").upsert({
      zone_id: zoneId,
      vehicle_id: vehicleId,
      driver_id: driverId,
      position: maxPos + 1,
    }, { onConflict: "zone_id,vehicle_id" });
    
    if (!error) fetchQueue();
    return error;
  }, [queue, fetchQueue]);

  const removeFromQueue = useCallback(async (entryId: string) => {
    const { error } = await supabase.from("zone_queue").delete().eq("id", entryId);
    if (!error) fetchQueue();
    return error;
  }, [fetchQueue]);

  const removeFirstFromZone = useCallback(async (zoneId: number) => {
    const next = getNextInZone(zoneId);
    if (next) {
      return removeFromQueue(next.id);
    }
    return null;
  }, [getNextInZone, removeFromQueue]);

  return { queue, loading, fetchQueue, getQueueForZone, getNextInZone, addToQueue, removeFromQueue, removeFirstFromZone };
}
