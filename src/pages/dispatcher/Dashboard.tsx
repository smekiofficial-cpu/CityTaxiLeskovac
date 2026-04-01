import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, UserMinus, UserPlus, X, RefreshCw, Clock, Car, Zap, ChevronDown, ChevronUp } from "lucide-react";
import DispatcherLayout from "@/components/dispatcher/DispatcherLayout";
import LiveMap from "@/components/map/LiveMap";
import AddressSearch from "@/components/map/AddressSearch";
import { useToast } from "@/hooks/use-toast";
import ZoneQueuePanel from "@/components/dispatcher/ZoneQueuePanel";
import { useNotificationSound } from "@/hooks/useNotificationSound";

interface Driver { id: string; full_name: string | null; email: string; status: string; }
interface Vehicle { id: string; registration: string; }
interface Ride {
  id: string;
  pickup_address: string;
  destination_address: string | null;
  fare: number | null;
  status: string;
  assigned_driver_id: string | null;
  assigned_vehicle_id: string | null;
  notes: string | null;
  created_at: string;
}

export default function Dashboard() {
  const [rides, setRides] = useState<Ride[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [open, setOpen] = useState(false);
  const [assignDialog, setAssignDialog] = useState<{ rideId: string; driverId: string; vehicleId: string } | null>(null);
  const [form, setForm] = useState({ pickup_address: "", destination_address: "", assigned_driver_id: "", assigned_vehicle_id: "", notes: "" });
  const [isLoading, setIsLoading] = useState(true);
  const [ridesCollapsed, setRidesCollapsed] = useState(false);
  const { toast } = useToast();
  const { playAccepted, playRejected, playAlert } = useNotificationSound();
  const prevRidesRef = useRef<Map<string, string>>(new Map());

  const fetchData = useCallback(async () => {
    const rolesRes = await supabase.from("user_roles").select("user_id").eq("role", "driver");
    const driverIds = rolesRes.data?.map(r => r.user_id) ?? [];
    const [rRes, dRes, vRes] = await Promise.all([
      supabase.from("rides").select("*").in("status", ["pending", "assigned", "in_progress"]).order("created_at", { ascending: false }),
      driverIds.length > 0
        ? supabase.from("profiles").select("id, full_name, email, status").in("id", driverIds)
        : Promise.resolve({ data: [] as Driver[] }),
      supabase.from("vehicles").select("id, registration"),
    ]);
    if (rRes.data) setRides(rRes.data);
    if (dRes.data) setDrivers(dRes.data);
    if (vRes.data) setVehicles(vRes.data);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    const newMap = new Map<string, string>();
    rides.forEach(r => newMap.set(r.id, r.status));
    prevRidesRef.current = newMap;
  }, [rides]);

  useEffect(() => {
    const channel = supabase.channel("dashboard-realtime")
      // Rides: all changes
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "rides" }, (payload) => {
        const updated = payload.new as Ride;
        const oldStatus = prevRidesRef.current.get(updated.id);
        if (oldStatus && oldStatus !== updated.status) {
          if (updated.status === "in_progress" && oldStatus === "assigned") {
            playAccepted();
            toast({ title: "✅ Vozač prihvatio vožnju", description: updated.pickup_address });
          } else if (updated.status === "cancelled" && (oldStatus === "assigned" || oldStatus === "pending")) {
            playRejected();
            toast({ title: "❌ Vožnja otkazana", description: updated.pickup_address, variant: "destructive" });
          } else if (updated.status === "pending" && oldStatus === "assigned") {
            playRejected();
            toast({ title: "⚠️ Vozač odbio vožnju", description: updated.pickup_address, variant: "destructive" });
          } else if (updated.status === "assigned" && oldStatus === "pending") {
            playAlert();
            toast({ title: "🚕 Vožnja dodeljena", description: updated.pickup_address });
          } else if (updated.status === "completed") {
            playAccepted();
            toast({ title: "✅ Vožnja završena", description: `${updated.pickup_address}${updated.fare ? ` — ${updated.fare} RSD` : ""}` });
          }
        }
        setRides(prev => {
          const activeStatuses = ["pending", "assigned", "in_progress"];
          if (activeStatuses.includes(updated.status)) {
            const idx = prev.findIndex(r => r.id === updated.id);
            if (idx >= 0) { const next = [...prev]; next[idx] = updated; return next; }
            return [updated, ...prev];
          }
          return prev.filter(r => r.id !== updated.id);
        });
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "rides" }, (payload) => {
        const newRide = payload.new as Ride;
        if (["pending", "assigned", "in_progress"].includes(newRide.status)) {
          playAlert();
          setRides(prev => [newRide, ...prev]);
        }
      })
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "rides" }, (payload) => {
        setRides(prev => prev.filter(r => r.id !== (payload.old as any).id));
      })
      // Profiles: driver status changes (online/offline/busy)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "profiles" }, (payload) => {
        const updated = payload.new as Driver;
        setDrivers(prev => prev.map(d => d.id === updated.id ? { ...d, status: updated.status, full_name: updated.full_name } : d));
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchData, playAccepted, playRejected, playAlert, toast]);

  const handleAdd = async () => {
    if (!form.pickup_address) return;
    const { error } = await supabase.from("rides").insert({
      pickup_address: form.pickup_address,
      destination_address: form.destination_address || null,
      assigned_driver_id: form.assigned_driver_id || null,
      assigned_vehicle_id: form.assigned_vehicle_id || null,
      status: form.assigned_driver_id ? "assigned" : "pending",
      notes: form.notes || null,
    });
    if (error) {
      toast({ title: "Greška", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "✅ Vožnja kreirana" });
      setForm({ pickup_address: "", destination_address: "", assigned_driver_id: "", assigned_vehicle_id: "", notes: "" });
      setOpen(false);
    }
  };

  const handleUnassign = async (rideId: string) => {
    await supabase.from("rides").update({ assigned_driver_id: null, assigned_vehicle_id: null, status: "pending" }).eq("id", rideId);
    toast({ title: "Vožnja oduzeta od vozača" });
  };

  const handleReassign = async () => {
    if (!assignDialog) return;
    await supabase.from("rides").update({
      assigned_driver_id: assignDialog.driverId || null,
      assigned_vehicle_id: assignDialog.vehicleId || null,
      status: assignDialog.driverId ? "assigned" : "pending",
    }).eq("id", assignDialog.rideId);
    toast({ title: "✅ Vožnja dodeljena" });
    setAssignDialog(null);
  };

  const handleCancel = async (rideId: string) => {
    await supabase.from("rides").update({ status: "cancelled" }).eq("id", rideId);
    toast({ title: "Vožnja otkazana" });
  };

  const statusBadge = (s: string) => {
    const map: Record<string, { label: string; cls: string }> = {
      pending: { label: "Čeka", cls: "bg-taxi-orange/20 text-taxi-orange border border-taxi-orange/30 animate-pulse" },
      assigned: { label: "Dodeljena", cls: "bg-primary/20 text-primary border border-primary/30" },
      in_progress: { label: "U toku", cls: "bg-taxi-green/20 text-taxi-green border border-taxi-green/30" },
    };
    const m = map[s] ?? { label: s, cls: "" };
    return <Badge className={m.cls}>{m.label}</Badge>;
  };

  const timeSince = (dateStr: string) => {
    const mins = Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000);
    if (mins < 1) return "Upravo";
    if (mins < 60) return `${mins} min`;
    return `${Math.floor(mins / 60)}h ${mins % 60}m`;
  };

  return (
    <DispatcherLayout>
      <div className="relative h-[calc(100vh-4rem)] -m-4 lg:-m-6">
        {/* FULLSCREEN MAP */}
        <div className="absolute inset-0">
          <LiveMap />
        </div>

        {/* TOP-LEFT: Nova vožnja button (highest z-index, always in front) */}
        <div className="absolute top-3 left-3 z-[9000] flex items-center gap-1.5">
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="h-9 px-5 taxi-gradient text-primary-foreground font-display glow-yellow hover:glow-yellow-strong transition-all text-sm shadow-2xl">
                <Plus className="w-4 h-4 mr-1.5" /> Nova vožnja
              </Button>
            </DialogTrigger>
            <DialogContent className="z-[9999] glass-dark border-glow">
              <DialogHeader>
                <DialogTitle className="font-display text-lg">Kreiraj vožnju</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div><Label className="text-xs font-display tracking-wider uppercase text-muted-foreground">Adresa polaska *</Label><AddressSearch value={form.pickup_address} onChange={(v) => setForm({ ...form, pickup_address: v })} placeholder="Ul. Bulevar oslobođenja 5" autoFocus /></div>
                <div><Label className="text-xs font-display tracking-wider uppercase text-muted-foreground">Destinacija</Label><AddressSearch value={form.destination_address} onChange={(v) => setForm({ ...form, destination_address: v })} placeholder="Opciono" /></div>
                <div>
                  <Label className="text-xs font-display tracking-wider uppercase text-muted-foreground">Vozač</Label>
                  <Select value={form.assigned_driver_id} onValueChange={(v) => setForm({ ...form, assigned_driver_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Izaberi vozača" /></SelectTrigger>
                    <SelectContent className="z-[10000]">
                      {drivers.map((d) => (
                        <SelectItem key={d.id} value={d.id}>
                          <span className="flex items-center gap-2">
                            {d.full_name || d.email}
                            {d.status === "available" && <span className="w-2 h-2 rounded-full bg-taxi-green inline-block" />}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs font-display tracking-wider uppercase text-muted-foreground">Vozilo</Label>
                  <Select value={form.assigned_vehicle_id} onValueChange={(v) => setForm({ ...form, assigned_vehicle_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Izaberi vozilo" /></SelectTrigger>
                    <SelectContent className="z-[10000]">{vehicles.map((v) => <SelectItem key={v.id} value={v.id}>{v.registration}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label className="text-xs font-display tracking-wider uppercase text-muted-foreground">Napomene</Label><Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Opciono" /></div>
                <Button className="w-full taxi-gradient text-primary-foreground font-display glow-yellow" onClick={handleAdd} disabled={!form.pickup_address}>Kreiraj</Button>
              </div>
            </DialogContent>
          </Dialog>
          <Button variant="outline" size="icon" onClick={fetchData} className="h-8 w-8 glass-dark border-border/30 hover:bg-muted/20">
            <RefreshCw className="w-3.5 h-3.5" />
          </Button>
        </div>


        {/* BOTTOM-LEFT: Rides panel (collapsible, compact overlay) */}
        <div className="absolute bottom-3 left-3 z-[500] w-full max-w-[calc(100%-24px)] lg:w-[360px] lg:max-w-[calc(50%-16px)]">
          {rides.length > 0 ? (
            <Card className="glass-dark border-border/30 shadow-xl">
              <CardContent className="p-0">
                <button
                  onClick={() => setRidesCollapsed(!ridesCollapsed)}
                  className="w-full flex items-center justify-between px-3 py-2 hover:bg-muted/5 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Zap className="w-3 h-3 text-primary" />
                    <span className="text-xs font-display font-bold text-foreground">Vožnje</span>
                    <Badge className="bg-primary/20 text-primary border-primary/30 text-[10px] h-4 px-1.5">{rides.length}</Badge>
                    {rides.filter(r => r.status === "pending").length > 0 && (
                      <Badge className="bg-taxi-orange/20 text-taxi-orange border-taxi-orange/30 text-[10px] h-4 px-1.5 animate-pulse">
                        {rides.filter(r => r.status === "pending").length} čeka
                      </Badge>
                    )}
                  </div>
                  {ridesCollapsed ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />}
                </button>
                {!ridesCollapsed && (
                  <div className="max-h-[25vh] overflow-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="border-border/30">
                          <TableHead className="text-[10px] font-display tracking-wider uppercase text-muted-foreground py-1">Polazak</TableHead>
                          <TableHead className="text-[10px] font-display tracking-wider uppercase text-muted-foreground py-1">Vozač</TableHead>
                          <TableHead className="text-[10px] font-display tracking-wider uppercase text-muted-foreground py-1">Status</TableHead>
                          <TableHead className="text-right text-[10px] font-display tracking-wider uppercase text-muted-foreground py-1">Akcije</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {rides.map((r) => (
                          <TableRow key={r.id} className={cn(
                            "transition-all border-border/20 hover:bg-muted/5",
                            r.status === "pending" && "bg-taxi-orange/5"
                          )}>
                            <TableCell className="py-1">
                              <p className="font-display font-semibold text-[11px] truncate max-w-[120px]">{r.pickup_address}</p>
                              {r.notes && <p className="text-[9px] text-muted-foreground truncate max-w-[120px]">📝 {r.notes}</p>}
                            </TableCell>
                            <TableCell className="text-[11px] font-display py-1">{drivers.find(d => d.id === r.assigned_driver_id)?.full_name || "—"}</TableCell>
                            <TableCell className="py-1">{statusBadge(r.status)}</TableCell>
                            <TableCell className="text-right space-x-0.5 py-1">
                              {r.assigned_driver_id && (
                                <Button variant="ghost" size="sm" onClick={() => handleUnassign(r.id)} title="Oduzmi" className="h-5 w-5 p-0 hover:bg-taxi-red/10">
                                  <UserMinus className="w-2.5 h-2.5 text-taxi-red" />
                                </Button>
                              )}
                              <Button variant="ghost" size="sm" onClick={() => setAssignDialog({ rideId: r.id, driverId: r.assigned_driver_id || "", vehicleId: r.assigned_vehicle_id || "" })} title="Dodeli" className="h-5 w-5 p-0 hover:bg-primary/10">
                                <UserPlus className="w-2.5 h-2.5 text-primary" />
                              </Button>
                              <Button variant="ghost" size="sm" onClick={() => handleCancel(r.id)} title="Otkaži" className="h-5 w-5 p-0 hover:bg-muted/10">
                                <X className="w-2.5 h-2.5 text-muted-foreground" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          ) : !isLoading ? (
            <Card className="glass-dark border-border/30 shadow-xl">
              <CardContent className="py-3 px-4 flex items-center gap-2 text-muted-foreground">
                <Zap className="w-4 h-4 text-primary/30" />
                <p className="text-xs font-display">Nema aktivnih vožnji</p>
              </CardContent>
            </Card>
          ) : null}
        </div>

        {/* BOTTOM-RIGHT: Zone queue panel */}
        <div className="absolute bottom-3 right-3 z-[500] w-[420px] max-w-[calc(50%-16px)]">
          <ZoneQueuePanel />
        </div>

        {/* Assign dialog */}
        <Dialog open={!!assignDialog} onOpenChange={(o) => !o && setAssignDialog(null)}>
          <DialogContent className="z-[9999] glass-dark border-glow">
            <DialogHeader>
              <DialogTitle className="font-display text-lg">Dodeli vožnju</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label className="text-xs font-display tracking-wider uppercase text-muted-foreground">Vozač</Label>
                <Select value={assignDialog?.driverId || ""} onValueChange={(v) => setAssignDialog(prev => prev ? { ...prev, driverId: v } : null)}>
                  <SelectTrigger><SelectValue placeholder="Izaberi vozača" /></SelectTrigger>
                  <SelectContent className="z-[10000]">
                    {drivers.map((d) => (
                      <SelectItem key={d.id} value={d.id}>
                        <span className="flex items-center gap-2">
                          {d.full_name || d.email}
                          {d.status === "available" && <span className="w-2 h-2 rounded-full bg-taxi-green inline-block" />}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs font-display tracking-wider uppercase text-muted-foreground">Vozilo</Label>
                <Select value={assignDialog?.vehicleId || ""} onValueChange={(v) => setAssignDialog(prev => prev ? { ...prev, vehicleId: v } : null)}>
                  <SelectTrigger><SelectValue placeholder="Izaberi vozilo" /></SelectTrigger>
                  <SelectContent className="z-[10000]">{vehicles.map((v) => <SelectItem key={v.id} value={v.id}>{v.registration}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <Button className="w-full taxi-gradient text-primary-foreground font-display glow-yellow" onClick={handleReassign}>Dodeli</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DispatcherLayout>
  );
}
