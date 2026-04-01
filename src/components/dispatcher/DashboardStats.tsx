import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface StatCardProps {
  icon: LucideIcon;
  label: string;
  value: string | number;
  subtitle?: string;
  accentColor: "yellow" | "green" | "cyan" | "orange" | "purple";
  delay?: number;
}

const colorMap = {
  yellow: { bg: "bg-primary/10", text: "text-primary", glow: "glow-yellow", border: "border-primary/20" },
  green: { bg: "bg-taxi-green/10", text: "text-taxi-green", glow: "glow-green", border: "border-taxi-green/20" },
  cyan: { bg: "bg-taxi-cyan/10", text: "text-taxi-cyan", glow: "glow-cyan", border: "border-taxi-cyan/20" },
  orange: { bg: "bg-taxi-orange/10", text: "text-taxi-orange", glow: "", border: "border-taxi-orange/20" },
  purple: { bg: "bg-taxi-purple/10", text: "text-taxi-purple", glow: "", border: "border-taxi-purple/20" },
};

function StatCard({ icon: Icon, label, value, subtitle, accentColor, delay = 0 }: StatCardProps) {
  const colors = colorMap[accentColor];
  const [show, setShow] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setShow(true), delay);
    return () => clearTimeout(t);
  }, [delay]);

  return (
    <Card className={cn(
      "glass-dark border transition-all duration-500",
      colors.border,
      colors.glow,
      show ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
    )}>
      <CardContent className="p-4 flex items-center gap-4">
        <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center shrink-0", colors.bg)}>
          <Icon className={cn("w-6 h-6", colors.text)} />
        </div>
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground font-display tracking-wider uppercase">{label}</p>
          <p className={cn("text-2xl font-mono font-bold tracking-wider", colors.text)}>{value}</p>
          {subtitle && <p className="text-xs text-muted-foreground truncate">{subtitle}</p>}
        </div>
      </CardContent>
    </Card>
  );
}

interface DashboardStats {
  todayRides: number;
  completedToday: number;
  avgFare: number;
  activeRides: number;
  pendingRides: number;
  availableDrivers: number;
  busyDrivers: number;
  totalDrivers: number;
  totalRevenue: number;
}

export function useDashboardStats() {
  const [stats, setStats] = useState<DashboardStats>({
    todayRides: 0, completedToday: 0, avgFare: 0,
    activeRides: 0, pendingRides: 0,
    availableDrivers: 0, busyDrivers: 0, totalDrivers: 0,
    totalRevenue: 0,
  });

  const fetchStats = useCallback(async () => {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const rolesRes = await supabase.from("user_roles").select("user_id").eq("role", "driver");
    const driverIds = rolesRes.data?.map(r => r.user_id) ?? [];
    const [todayRes, driversRes] = await Promise.all([
      supabase.from("rides").select("id, status, fare, created_at").gte("created_at", todayStart.toISOString()),
      driverIds.length > 0
        ? supabase.from("profiles").select("id, status").in("id", driverIds)
        : Promise.resolve({ data: [] as { id: string; status: string }[] }),
    ]);

    const todayRides = todayRes.data ?? [];
    const drivers = driversRes.data ?? [];
    const completed = todayRides.filter(r => r.status === "completed");
    const fares = completed.map(r => r.fare).filter((f): f is number => f !== null && f > 0);
    const avgFare = fares.length > 0 ? Math.round(fares.reduce((a, b) => a + b, 0) / fares.length) : 0;
    const totalRevenue = fares.reduce((a, b) => a + b, 0);

    setStats({
      todayRides: todayRides.length,
      completedToday: completed.length,
      avgFare,
      activeRides: todayRides.filter(r => r.status === "in_progress").length,
      pendingRides: todayRides.filter(r => r.status === "pending").length,
      availableDrivers: drivers.filter(d => d.status === "available").length,
      busyDrivers: drivers.filter(d => d.status === "busy").length,
      totalDrivers: drivers.length,
      totalRevenue: Math.round(totalRevenue),
    });
  }, []);

  useEffect(() => {
    fetchStats();

    const channel = supabase.channel("stats-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "rides" }, () => fetchStats())
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "profiles" }, () => fetchStats())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchStats]);

  return stats;
}

export { StatCard };
export type { DashboardStats };
