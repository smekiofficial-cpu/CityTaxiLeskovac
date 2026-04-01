import { ShiftStats } from "@/hooks/useDriverShift";
import { Car, DollarSign, Clock } from "lucide-react";

interface Props {
  stats: ShiftStats;
}

export default function ShiftStatsBar({ stats }: Props) {
  if (!stats.isActive) return null;

  const hours = Math.floor(stats.durationMinutes / 60);
  const mins = stats.durationMinutes % 60;
  const timeStr = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;

  return (
    <div className="flex items-center gap-3 px-3 py-1.5 text-xs">
      <div className="flex items-center gap-1 text-muted-foreground">
        <Car className="w-3 h-3" />
        <span className="font-mono font-bold text-foreground">{stats.completedRides}</span>
      </div>
      <div className="flex items-center gap-1 text-muted-foreground">
        <DollarSign className="w-3 h-3" />
        <span className="font-mono font-bold text-foreground">{stats.totalEarnings.toLocaleString()}</span>
        <span>RSD</span>
      </div>
      <div className="flex items-center gap-1 text-muted-foreground">
        <Clock className="w-3 h-3" />
        <span className="font-mono font-bold text-foreground">{timeStr}</span>
      </div>
    </div>
  );
}
