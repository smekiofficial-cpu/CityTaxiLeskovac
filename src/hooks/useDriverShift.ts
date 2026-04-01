import { useEffect, useState, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface ShiftStats {
  totalRides: number;
  completedRides: number;
  totalEarnings: number;
  cashEarnings: number;
  cardEarnings: number;
  durationMinutes: number;
  shiftId: string | null;
  isActive: boolean;
}


export function useDriverShift(userId: string | undefined) {
  const [stats, setStats] = useState<ShiftStats>({
    totalRides: 0, completedRides: 0, totalEarnings: 0,
    cashEarnings: 0, cardEarnings: 0, durationMinutes: 0,
    shiftId: null, isActive: false,
  });
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const shiftStartRef = useRef<Date | null>(null);

  const startShift = useCallback(async () => {
    if (!userId || stats.isActive) return;
    const { data, error } = await supabase.from("driver_shifts").insert({
      driver_id: userId,
      started_at: new Date().toISOString(),
    }).select("id").single();
    
    if (data && !error) {
      shiftStartRef.current = new Date();
      setStats(s => ({ ...s, shiftId: data.id as string, isActive: true, totalRides: 0, completedRides: 0, totalEarnings: 0, cashEarnings: 0, cardEarnings: 0, durationMinutes: 0 }));
    }
  }, [userId, stats.isActive]);

  const endShift = useCallback(async () => {
    if (!userId || !stats.shiftId) return;
    const duration = shiftStartRef.current
      ? Math.round((Date.now() - shiftStartRef.current.getTime()) / 60000)
      : stats.durationMinutes;

    await supabase.from("driver_shifts").update({
      ended_at: new Date().toISOString(),
      total_rides: stats.totalRides,
      completed_rides: stats.completedRides,
      total_earnings: stats.totalEarnings,
      cash_earnings: stats.cashEarnings,
      card_earnings: stats.cardEarnings,
      duration_minutes: duration,
    }).eq("id", stats.shiftId);

    shiftStartRef.current = null;
    setStats({ totalRides: 0, completedRides: 0, totalEarnings: 0, cashEarnings: 0, cardEarnings: 0, durationMinutes: 0, shiftId: null, isActive: false });
  }, [userId, stats]);

  const recordRide = useCallback((fare: number, paymentMethod: string) => {
    setStats(s => ({
      ...s,
      totalRides: s.totalRides + 1,
      completedRides: s.completedRides + 1,
      totalEarnings: s.totalEarnings + fare,
      cashEarnings: s.cashEarnings + (paymentMethod === "cash" ? fare : 0),
      cardEarnings: s.cardEarnings + (paymentMethod === "card" ? fare : 0),
    }));
  }, []);

  // Also persist the updated stats to the DB
  const persistStats = useCallback(async () => {
    if (!stats.shiftId) return;
    const duration = shiftStartRef.current
      ? Math.round((Date.now() - shiftStartRef.current.getTime()) / 60000)
      : stats.durationMinutes;
    await supabase.from("driver_shifts").update({
      total_rides: stats.totalRides,
      completed_rides: stats.completedRides,
      total_earnings: stats.totalEarnings,
      cash_earnings: stats.cashEarnings,
      card_earnings: stats.cardEarnings,
      duration_minutes: duration,
    }).eq("id", stats.shiftId);
  }, [stats]);

  useEffect(() => {
    if (stats.isActive && shiftStartRef.current) {
      timerRef.current = setInterval(() => {
        if (shiftStartRef.current) {
          setStats(s => ({ ...s, durationMinutes: Math.round((Date.now() - shiftStartRef.current!.getTime()) / 60000) }));
        }
      }, 30000);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [stats.isActive]);

  useEffect(() => {
    if (!userId) return;
    supabase.from("driver_shifts")
      .select("*")
      .eq("driver_id", userId)
      .is("ended_at", null)
      .order("started_at", { ascending: false })
      .limit(1)
      .single()
      .then(({ data, error }) => {
        if (error || !data) return; // gracefully skip if table missing or no active shift
        shiftStartRef.current = new Date(data.started_at);
        const dur = Math.round((Date.now() - new Date(data.started_at).getTime()) / 60000);
        setStats({
          shiftId: data.id,
          isActive: true,
          totalRides: data.total_rides,
          completedRides: data.completed_rides,
          totalEarnings: Number(data.total_earnings),
          cashEarnings: Number(data.cash_earnings),
          cardEarnings: Number(data.card_earnings),
          durationMinutes: dur,
        });
      });
  }, [userId]);

  return { stats, startShift, endShift, recordRide, persistStats };
}
