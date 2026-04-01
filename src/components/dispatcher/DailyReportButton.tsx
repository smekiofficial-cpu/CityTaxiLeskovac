import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FileText, Download, RotateCcw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface DailyReport {
  id: string;
  report_date: string;
  total_rides: number;
  completed_rides: number;
  cancelled_rides: number;
  total_revenue: number;
  avg_fare: number;
  total_drivers: number;
  created_at: string;
}

export default function DailyReportButton() {
  const [open, setOpen] = useState(false);
  const [reports, setReports] = useState<DailyReport[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const fetchReports = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("daily_reports")
      .select("*")
      .order("report_date", { ascending: false })
      .limit(30);
    if (data) setReports(data as DailyReport[]);
    setLoading(false);
  };

  const generateTodayReport = async () => {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayStr = format(todayStart, "yyyy-MM-dd");

    const { data: rides } = await supabase
      .from("rides")
      .select("id, status, fare")
      .gte("created_at", todayStart.toISOString());

    const allRides = rides ?? [];
    const completed = allRides.filter(r => r.status === "completed");
    const cancelled = allRides.filter(r => r.status === "cancelled");
    const fares = completed.map(r => r.fare).filter((f): f is number => f !== null && f > 0);
    const totalRevenue = fares.reduce((a, b) => a + b, 0);
    const avgFare = fares.length > 0 ? Math.round(totalRevenue / fares.length) : 0;

    const { data: driverRoles } = await supabase.from("user_roles").select("user_id").eq("role", "driver");
    const totalDrivers = driverRoles?.length ?? 0;

    const { error } = await supabase.from("daily_reports").upsert({
      report_date: todayStr,
      total_rides: allRides.length,
      completed_rides: completed.length,
      cancelled_rides: cancelled.length,
      total_revenue: Math.round(totalRevenue),
      avg_fare: avgFare,
      total_drivers: totalDrivers,
    }, { onConflict: "report_date" });

    if (error) {
      toast({ title: "Greška", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "✅ Izveštaj generisan za danas" });
      fetchReports();
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (o) fetchReports(); }}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="w-full h-9 gap-2 border-border/50 justify-start text-sidebar-foreground/60 hover:text-sidebar-foreground">
          <FileText className="w-4 h-4" />
          Izveštaji
        </Button>
      </DialogTrigger>
      <DialogContent className="z-[9999] glass-dark border-glow max-w-2xl">
        <DialogHeader>
          <DialogTitle className="font-display text-lg flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            Dnevni izveštaji
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex gap-2">
            <Button className="taxi-gradient text-primary-foreground font-display gap-2" onClick={generateTodayReport}>
              <Download className="w-4 h-4" /> Generiši za danas
            </Button>
            <Button variant="outline" size="icon" onClick={fetchReports}>
              <RotateCcw className="w-4 h-4" />
            </Button>
          </div>

          {reports.length > 0 ? (
            <div className="max-h-[400px] overflow-auto rounded-lg border border-border/30">
              <Table>
                <TableHeader>
                  <TableRow className="border-border/30">
                    <TableHead className="text-xs font-display">Datum</TableHead>
                    <TableHead className="text-xs font-display">Vožnje</TableHead>
                    <TableHead className="text-xs font-display">Završene</TableHead>
                    <TableHead className="text-xs font-display">Otkazane</TableHead>
                    <TableHead className="text-xs font-display">Prihod</TableHead>
                    <TableHead className="text-xs font-display">Prosek</TableHead>
                    <TableHead className="text-xs font-display">Vozači</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reports.map(r => (
                    <TableRow key={r.id} className="border-border/20">
                      <TableCell className="font-mono text-sm">{format(new Date(r.report_date), "dd.MM.yyyy")}</TableCell>
                      <TableCell className="font-mono font-bold text-primary">{r.total_rides}</TableCell>
                      <TableCell className="font-mono text-taxi-green">{r.completed_rides}</TableCell>
                      <TableCell className="font-mono text-destructive">{r.cancelled_rides}</TableCell>
                      <TableCell className="font-mono">{r.total_revenue} RSD</TableCell>
                      <TableCell className="font-mono">{r.avg_fare} RSD</TableCell>
                      <TableCell className="font-mono">{r.total_drivers}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-6">
              {loading ? "Učitavanje..." : "Nema izveštaja. Generiši prvi izveštaj."}
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
