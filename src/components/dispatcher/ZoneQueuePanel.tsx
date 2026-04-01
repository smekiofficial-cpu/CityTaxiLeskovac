import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { MapPin, Plus, X, Crown, ChevronDown, ChevronUp } from "lucide-react";
import { useZoneQueue } from "@/hooks/useZoneQueue";
import { useTaxiZones, type TaxiZoneDB } from "@/hooks/useTaxiZones";
import { useToast } from "@/hooks/use-toast";

interface DriverInfo { id: string; full_name: string | null; email: string; }
interface VehicleInfo { id: string; registration: string; current_driver_id: string | null; }

export default function ZoneQueuePanel() {
  const { zones } = useTaxiZones();
  const { queue, getQueueForZone, addToQueue, removeFromQueue, removeFirstFromZone } = useZoneQueue();
  const { toast } = useToast();
  const [drivers, setDrivers] = useState<DriverInfo[]>([]);
  const [vehicles, setVehicles] = useState<VehicleInfo[]>([]);
  const [addForm, setAddForm] = useState<{ zoneId: number | null; vehicleId: string; driverId: string }>({ zoneId: null, vehicleId: "", driverId: "" });
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      const [dRes, vRes] = await Promise.all([
        supabase.from("profiles").select("id, full_name, email").in("id",
          (await supabase.from("user_roles").select("user_id").eq("role", "driver")).data?.map(r => r.user_id) ?? []
        ),
        supabase.from("vehicles").select("id, registration, current_driver_id"),
      ]);
      if (dRes.data) setDrivers(dRes.data);
      if (vRes.data) setVehicles(vRes.data);
    };
    fetchData();
  }, []);

  const handleAdd = async () => {
    if (!addForm.zoneId || !addForm.vehicleId || !addForm.driverId) return;
    const error = await addToQueue(addForm.zoneId, addForm.vehicleId, addForm.driverId);
    if (error) {
      toast({ title: "Greška", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "✅ Vozilo dodato u red" });
      setAddForm({ zoneId: null, vehicleId: "", driverId: "" });
    }
  };

  const handleDispatch = async (zoneId: number) => {
    const error = await removeFirstFromZone(zoneId);
    if (!error) {
      toast({ title: "🚕 Vozilo poslato na vožnju" });
    }
  };

  const driverName = (driverId: string) => {
    const d = drivers.find(d => d.id === driverId);
    return d?.full_name || d?.email || "—";
  };

  const vehicleReg = (vehicleId: string) => {
    return vehicles.find(v => v.id === vehicleId)?.registration || "—";
  };

  return (
    <Card className="glass-dark border-border/30 shadow-2xl backdrop-blur-xl bg-background/80">
      <CardContent className="p-0">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="w-full flex items-center justify-between px-2.5 py-1.5 hover:bg-muted/5 transition-colors"
        >
          <div className="flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-primary" />
            <span className="text-xs font-display font-bold text-foreground">Red po zonama</span>
            <Badge className="bg-primary/20 text-primary border-primary/30 text-[10px] h-4 px-1.5">{queue.length}</Badge>
          </div>
          {collapsed ? <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" />}
        </button>

        {!collapsed && (
          <div className="px-2.5 pb-2.5 space-y-2 max-h-[30vh] overflow-auto">
            {/* Add to queue form */}
            <div className="flex gap-2 items-end">
              <Select value={addForm.zoneId?.toString() || ""} onValueChange={(v) => setAddForm(f => ({ ...f, zoneId: parseInt(v) }))}>
                <SelectTrigger className="h-8 text-xs flex-1"><SelectValue placeholder="Zona" /></SelectTrigger>
                <SelectContent className="z-[10000]">
                  {zones.map(z => <SelectItem key={z.id} value={z.id.toString()}><span style={{ color: z.color }}>{z.name}</span> — {z.landmark}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={addForm.vehicleId} onValueChange={(v) => {
                const veh = vehicles.find(vh => vh.id === v);
                setAddForm(f => ({ ...f, vehicleId: v, driverId: veh?.current_driver_id || f.driverId }));
              }}>
                <SelectTrigger className="h-8 text-xs flex-1"><SelectValue placeholder="Vozilo" /></SelectTrigger>
                <SelectContent className="z-[10000]">
                  {vehicles.map(v => <SelectItem key={v.id} value={v.id}>{v.registration}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={addForm.driverId} onValueChange={(v) => setAddForm(f => ({ ...f, driverId: v }))}>
                <SelectTrigger className="h-8 text-xs flex-1"><SelectValue placeholder="Vozač" /></SelectTrigger>
                <SelectContent className="z-[10000]">
                  {drivers.map(d => <SelectItem key={d.id} value={d.id}>{d.full_name || d.email}</SelectItem>)}
                </SelectContent>
              </Select>
              <Button size="sm" className="h-8 px-3 taxi-gradient text-primary-foreground" onClick={handleAdd} disabled={!addForm.zoneId || !addForm.vehicleId || !addForm.driverId}>
                <Plus className="w-3 h-3" />
              </Button>
            </div>

            {/* Zone queues */}
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-1.5">
              {zones.map(zone => {
                const zoneQueue = getQueueForZone(zone.id);
                return (
                  <div key={zone.id} className="rounded-lg border p-2 space-y-1.5" style={{ borderColor: `${zone.color}30`, background: `${zone.color}08` }}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: zone.color }} />
                        <span className="text-xs font-display font-bold" style={{ color: zone.color }}>{zone.name}</span>
                      </div>
                      <Badge variant="outline" className="text-[10px] h-5 px-1.5" style={{ borderColor: `${zone.color}40`, color: zone.color }}>
                        {zoneQueue.length}
                      </Badge>
                    </div>
                    <p className="text-[10px] text-muted-foreground truncate">{zone.landmark}</p>

                    {zoneQueue.length === 0 ? (
                      <p className="text-[10px] text-muted-foreground/50 italic text-center py-1">Prazan red</p>
                    ) : (
                      <div className="space-y-1">
                        {zoneQueue.map((entry, idx) => (
                          <div key={entry.id} className={cn(
                            "flex items-center gap-1.5 rounded px-1.5 py-1 text-[11px]",
                            idx === 0 ? "bg-primary/15 border border-primary/30" : "bg-muted/5"
                          )}>
                            {idx === 0 ? (
                              <Crown className="w-3 h-3 text-primary shrink-0" />
                            ) : (
                              <span className="w-3 text-center text-muted-foreground font-mono text-[10px]">{idx + 1}</span>
                            )}
                            <span className="font-mono font-bold text-foreground">{vehicleReg(entry.vehicle_id)}</span>
                            <span className="text-muted-foreground truncate flex-1">{driverName(entry.driver_id)}</span>
                            <button onClick={() => removeFromQueue(entry.id)} className="text-muted-foreground hover:text-destructive transition-colors">
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    {zoneQueue.length > 0 && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full h-6 text-[10px] border-primary/30 text-primary hover:bg-primary/10"
                        onClick={() => handleDispatch(zone.id)}
                      >
                        🚕 Pošalji prvog
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
