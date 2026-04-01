import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Users, Crown } from "lucide-react";
import { cn } from "@/lib/utils";

interface QueueEntry {
  id: string;
  zone_id: number;
  vehicle_id: string;
  driver_id: string;
  position: number;
  entered_at: string;
}

interface ZoneInfo {
  id: number;
  name: string;
  color: string;
}

interface DriverProfile {
  id: string;
  full_name: string | null;
}

interface VehicleInfo {
  id: string;
  registration: string;
}

interface Props {
  driverId: string;
}

export default function ZoneQueuePanel({ driverId }: Props) {
  const [queue, setQueue] = useState<QueueEntry[]>([]);
  const [zones, setZones] = useState<ZoneInfo[]>([]);
  const [profiles, setProfiles] = useState<Record<string, string>>({});
  const [vehicles, setVehicles] = useState<Record<string, string>>({});
  const [expanded, setExpanded] = useState(false);

  const fetchAll = useCallback(async () => {
    const [qRes, zRes] = await Promise.all([
      supabase.from("zone_queue").select("*").order("zone_id").order("position"),
      supabase.from("taxi_zones").select("id, name, color"),
    ]);
    if (qRes.data) setQueue(qRes.data as QueueEntry[]);
    if (zRes.data) setZones(zRes.data);
  }, []);

  useEffect(() => {
    fetchAll();
    const ch = supabase.channel("driver-zone-queue")
      .on("postgres_changes", { event: "*", schema: "public", table: "zone_queue" }, () => fetchAll())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [fetchAll]);

  // Fetch profiles and vehicle regs for queue entries
  useEffect(() => {
    if (queue.length === 0) return;
    const driverIds = [...new Set(queue.map(q => q.driver_id))];
    const vehicleIds = [...new Set(queue.map(q => q.vehicle_id))];

    supabase.from("profiles").select("id, full_name").in("id", driverIds)
      .then(({ data }) => {
        if (data) {
          const map: Record<string, string> = {};
          data.forEach((p: DriverProfile) => { map[p.id] = p.full_name || "Vozač"; });
          setProfiles(map);
        }
      });

    supabase.from("vehicles").select("id, registration").in("id", vehicleIds)
      .then(({ data }) => {
        if (data) {
          const map: Record<string, string> = {};
          data.forEach((v: VehicleInfo) => { map[v.id] = v.registration; });
          setVehicles(map);
        }
      });
  }, [queue]);

  // Find which zones have entries
  const activeZones = zones.filter(z => queue.some(q => q.zone_id === z.id));
  const myEntries = queue.filter(q => q.driver_id === driverId);
  const myPosition = myEntries.length > 0 ? myEntries[0] : null;

  if (queue.length === 0) return null;

  return (
    <div className="space-y-1">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-3 py-2 rounded-lg glass-dark border border-border/30 text-sm"
      >
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-primary" />
          <span className="font-display font-semibold text-foreground">Red u zonama</span>
          {myPosition && (
            <Badge variant="outline" className="text-xs border-primary/50 text-primary">
              #{myPosition.position} u redu
            </Badge>
          )}
        </div>
        <span className="text-xs text-muted-foreground">{expanded ? "▲" : "▼"}</span>
      </button>

      {expanded && (
        <div className="space-y-2 max-h-[40vh] overflow-auto px-1 pb-1">
          {activeZones.map(zone => {
            const zoneQueue = queue.filter(q => q.zone_id === zone.id).sort((a, b) => a.position - b.position);
            return (
              <div key={zone.id} className="rounded-lg glass-dark border border-border/20 p-2">
                <div className="flex items-center gap-2 mb-1.5">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: zone.color }} />
                  <span className="text-xs font-display font-bold text-foreground">{zone.name}</span>
                  <span className="text-xs text-muted-foreground ml-auto">{zoneQueue.length} vozila</span>
                </div>
                <div className="space-y-1">
                  {zoneQueue.map((entry, idx) => (
                    <div
                      key={entry.id}
                      className={cn(
                        "flex items-center gap-2 px-2 py-1.5 rounded text-xs",
                        entry.driver_id === driverId
                          ? "bg-primary/15 border border-primary/30"
                          : "bg-muted/30"
                      )}
                    >
                      {idx === 0 && <Crown className="w-3 h-3 text-primary shrink-0" />}
                      <span className="font-mono font-bold text-foreground w-5">#{entry.position}</span>
                      <span className="font-mono text-primary text-xs">{vehicles[entry.vehicle_id] || "..."}</span>
                      <span className="text-muted-foreground truncate flex-1">
                        {entry.driver_id === driverId ? "Vi" : (profiles[entry.driver_id] || "...")}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
