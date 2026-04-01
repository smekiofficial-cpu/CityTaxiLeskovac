import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import DispatcherLayout from "@/components/dispatcher/DispatcherLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { History as HistoryIcon, Download, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface Ride {
  id: string;
  pickup_address: string;
  destination_address: string | null;
  fare: number | null;
  status: string;
  assigned_driver_id: string | null;
  created_at: string;
  completed_at: string | null;
}

interface DriverProfile {
  id: string;
  full_name: string | null;
}

export default function History() {
  const [rides, setRides] = useState<Ride[]>([]);
  const [driverNames, setDriverNames] = useState<Map<string, string>>(new Map());
  const [confirmReset, setConfirmReset] = useState(false);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const fetchData = async () => {
    const { data } = await supabase.from("rides").select("*").in("status", ["completed", "cancelled"]).order("completed_at", { ascending: false });
    if (data) {
      setRides(data);
      const driverIds = [...new Set(data.map(r => r.assigned_driver_id).filter(Boolean))] as string[];
      if (driverIds.length > 0) {
        const { data: profiles } = await supabase.from("profiles").select("id, full_name").in("id", driverIds);
        if (profiles) {
          const map = new Map<string, string>();
          profiles.forEach((p: DriverProfile) => map.set(p.id, p.full_name || "—"));
          setDriverNames(map);
        }
      }
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSaveReport = async () => {
    setSaving(true);
    const completed = rides.filter(r => r.status === "completed");
    const cancelled = rides.filter(r => r.status === "cancelled");
    const fares = completed.map(r => r.fare).filter((f): f is number => f !== null && f > 0);
    const totalRevenue = fares.reduce((a, b) => a + b, 0);
    const avgFare = fares.length > 0 ? Math.round(totalRevenue / fares.length) : 0;

    const { data: driverRoles } = await supabase.from("user_roles").select("user_id").eq("role", "driver");
    const totalDrivers = driverRoles?.length ?? 0;
    const todayStr = format(new Date(), "yyyy-MM-dd");

    const { error } = await supabase.from("daily_reports").upsert({
      report_date: todayStr,
      total_rides: rides.length,
      completed_rides: completed.length,
      cancelled_rides: cancelled.length,
      total_revenue: Math.round(totalRevenue),
      avg_fare: avgFare,
      total_drivers: totalDrivers,
    }, { onConflict: "report_date" });

    setSaving(false);
    if (error) {
      toast({ title: "Greška", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "✅ Podaci sačuvani u izveštaj" });
    }
  };

  const handleReset = async () => {
    const ids = rides.map(r => r.id);
    if (ids.length === 0) {
      setConfirmReset(false);
      return;
    }

    const { error } = await supabase.from("rides").delete().in("id", ids);
    setConfirmReset(false);
    if (error) {
      toast({ title: "Greška", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "🗑️ Istorija vožnji resetovana" });
      setRides([]);
      setDriverNames(new Map());
    }
  };

  return (
    <DispatcherLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-display font-bold">Istorija vožnji</h1>
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="gap-2 border-primary/30 text-primary hover:bg-primary/10 font-display text-xs"
              onClick={handleSaveReport}
              disabled={saving || rides.length === 0}
            >
              <Download className="w-4 h-4" />
              {saving ? "Čuvanje..." : "Sačuvaj izveštaj"}
            </Button>
            <Button
              variant="outline"
              className="gap-2 border-destructive/30 text-destructive hover:bg-destructive/10 font-display text-xs"
              onClick={() => setConfirmReset(true)}
              disabled={rides.length === 0}
            >
              <Trash2 className="w-4 h-4" />
              Resetuj
            </Button>
          </div>
        </div>
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Polazak</TableHead>
                  <TableHead>Destinacija</TableHead>
                  <TableHead>Vozač</TableHead>
                  <TableHead>Cena</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Datum</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rides.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      <HistoryIcon className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      Nema završenih vožnji.
                    </TableCell>
                  </TableRow>
                ) : (
                  rides.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell>{r.pickup_address}</TableCell>
                      <TableCell>{r.destination_address || "—"}</TableCell>
                      <TableCell>{r.assigned_driver_id ? driverNames.get(r.assigned_driver_id) || "—" : "—"}</TableCell>
                      <TableCell>{r.fare ? `${r.fare} RSD` : "—"}</TableCell>
                      <TableCell>
                        <Badge className={r.status === "completed" ? "bg-taxi-green text-white" : "bg-taxi-red text-white"}>
                          {r.status === "completed" ? "Završena" : "Otkazana"}
                        </Badge>
                      </TableCell>
                      <TableCell>{r.completed_at ? new Date(r.completed_at).toLocaleDateString("sr-RS") : "—"}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Confirm Reset Dialog */}
      <Dialog open={confirmReset} onOpenChange={setConfirmReset}>
        <DialogContent className="glass-dark border-glow z-[9999]">
          <DialogHeader>
            <DialogTitle className="font-display">Potvrdi resetovanje</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Da li ste sigurni da želite da obrišete svu istoriju vožnji ({rides.length} vožnji)? Ova akcija se ne može poništiti.
          </p>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setConfirmReset(false)}>Otkaži</Button>
            <Button variant="destructive" onClick={handleReset} className="gap-2">
              <Trash2 className="w-4 h-4" /> Resetuj
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DispatcherLayout>
  );
}
