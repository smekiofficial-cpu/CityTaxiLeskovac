import { useEffect, useState, useRef, useCallback } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Slider } from "@/components/ui/slider";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Car, LogOut, MapPin, Navigation, DollarSign, Coffee, Check, XCircle, Phone, Volume2, Maximize, Zap, CreditCard, Banknote } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import DriverMap, { type DriverDestination } from "@/components/map/DriverMap";
import { useNotificationSound } from "@/hooks/useNotificationSound";
import { useWakeLock } from "@/hooks/useWakeLock";
import { useFullscreen } from "@/hooks/useFullscreen";
import { useIsMobile } from "@/hooks/use-mobile";
import { useDriverShift } from "@/hooks/useDriverShift";
import { cn } from "@/lib/utils";
import ZoneQueuePanel from "@/components/driver/ZoneQueuePanel";
import ShiftStatsBar from "@/components/driver/ShiftStatsBar";
import DriverAddressSearch from "@/components/driver/DriverAddressSearch";

type DriverStatus = "available" | "busy" | "offline";

interface Ride {
  id: string;
  pickup_address: string;
  destination_address: string | null;
  fare: number | null;
  status: string;
  notes: string | null;
}

export default function DriverDashboard() {
  const { user, signOut } = useAuth();
  const [status, setStatus] = useState<DriverStatus>("offline");
  const [currentRide, setCurrentRide] = useState<Ride | null>(null);
  const [fareInput, setFareInput] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "card">("cash");
  const [isTracking, setIsTracking] = useState(false);
  const [watchId, setWatchId] = useState<number | null>(null);
  const [myLat, setMyLat] = useState<number | null>(null);
  const [myLng, setMyLng] = useState<number | null>(null);
  const [vehicleReg, setVehicleReg] = useState<string>("");
  const [isPaused, setIsPaused] = useState(false);
  
  const [navDestination, setNavDestination] = useState<DriverDestination | null>(null);
  const [rideTimer, setRideTimer] = useState(0);
  const rideTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const { toast } = useToast();
  const { playAlert, volume, setVolume } = useNotificationSound();
  const prevRideRef = useRef<string | null>(null);
  const isMobile = useIsMobile();
  const { enterFullscreen } = useFullscreen();
  const { stats, startShift, endShift, recordRide, persistStats } = useDriverShift(user?.id);

  useWakeLock(status !== "offline");

  useEffect(() => {
    prevRideRef.current = null;
    setCurrentRide(null);
    setFareInput("");
  }, [user?.id]);

  useEffect(() => {
    if (currentRide?.status === "in_progress") {
      setRideTimer(0);
      rideTimerRef.current = setInterval(() => setRideTimer(t => t + 1), 1000);
    } else {
      if (rideTimerRef.current) { clearInterval(rideTimerRef.current); rideTimerRef.current = null; }
      setRideTimer(0);
    }
    return () => { if (rideTimerRef.current) clearInterval(rideTimerRef.current); };
  }, [currentRide?.status]);

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("status").eq("id", user.id).single()
      .then(({ data }) => { if (data) setStatus(data.status as DriverStatus); });
    supabase.from("rides").select("*").eq("assigned_driver_id", user.id).in("status", ["assigned", "in_progress"]).limit(1).single()
      .then(({ data }) => { if (data) { setCurrentRide(data); setFareInput(data.fare?.toString() || ""); } });
    supabase.from("vehicles").select("registration").eq("current_driver_id", user.id).limit(1).single()
      .then(({ data }) => { if (data) setVehicleReg(data.registration); });

    const channel = supabase.channel("driver-rides")
      .on("postgres_changes", { event: "*", schema: "public", table: "rides", filter: `assigned_driver_id=eq.${user.id}` },
        (payload) => {
          if (payload.eventType === "DELETE") { setCurrentRide(null); prevRideRef.current = null; }
          else {
            const ride = payload.new as Ride;
            if (["assigned", "in_progress"].includes(ride.status)) {
                if (ride.status === "assigned" && prevRideRef.current !== ride.id) {
                playAlert();
                setTimeout(() => playAlert(), 1800);
                setTimeout(() => playAlert(), 3600);
                toast({ title: "🚕 NOVA VOŽNJA!", description: ride.pickup_address });
                // Navigate in-app to pickup address
                geocodeAndNavigate(ride.pickup_address);
              }
              prevRideRef.current = ride.id;
              setCurrentRide(ride);
              setFareInput(ride.fare?.toString() || "");
            } else {
              setCurrentRide(null);
              prevRideRef.current = null;
            }
          }
        })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const updateStatus = async (newStatus: DriverStatus) => {
    if (!user) return;
    await supabase.from("profiles").update({ status: newStatus }).eq("id", user.id);
    setStatus(newStatus);
    setIsPaused(false);
    if (newStatus === "available") {
      startTracking();
      if (!stats.isActive) startShift();
    } else if (newStatus === "offline") {
      stopTracking();
      if (stats.isActive) {
        await persistStats();
        await endShift();
      }
    }
  };

  const togglePause = async () => {
    if (!user) return;
    if (isPaused) {
      await supabase.from("profiles").update({ status: "available" as DriverStatus }).eq("id", user.id);
      setStatus("available");
      setIsPaused(false);
      startTracking();
    } else {
      await supabase.from("profiles").update({ status: "busy" as DriverStatus }).eq("id", user.id);
      setStatus("busy");
      setIsPaused(true);
    }
  };

  const vehicleIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!user) return;
    supabase.from("vehicles").select("id").eq("current_driver_id", user.id).limit(1).single()
      .then(({ data }) => { if (data) vehicleIdRef.current = data.id; });
  }, [user]);

  const startTracking = () => {
    if (!navigator.geolocation || !user) return;
    const id = navigator.geolocation.watchPosition(
      async (pos) => {
        setMyLat(pos.coords.latitude);
        setMyLng(pos.coords.longitude);
        const vid = vehicleIdRef.current;
        if (!vid) {
          const { data: vehicle } = await supabase.from("vehicles").select("id").eq("current_driver_id", user.id).limit(1).single();
          if (!vehicle) return;
          vehicleIdRef.current = vehicle.id;
        }
        const { error: locError } = await supabase.from("vehicle_locations").upsert({
          vehicle_id: vehicleIdRef.current!, driver_id: user.id,
          latitude: pos.coords.latitude, longitude: pos.coords.longitude,
          heading: pos.coords.heading, speed: pos.coords.speed,
        }, { onConflict: "vehicle_id" });
        if (locError) console.error("GPS upsert error:", locError.message);
      },
      (err) => toast({ title: "GPS greška", description: err.message, variant: "destructive" }),
      { enableHighAccuracy: true, maximumAge: 2000, timeout: 5000 }
    );
    setWatchId(id);
    setIsTracking(true);
  };

  const stopTracking = () => {
    if (watchId !== null) navigator.geolocation.clearWatch(watchId);
    setIsTracking(false);
    setWatchId(null);
  };

  const acceptRide = async () => {
    if (!currentRide) return;
    await supabase.from("rides").update({ status: "in_progress" }).eq("id", currentRide.id);
    setCurrentRide({ ...currentRide, status: "in_progress" });
    updateStatus("busy");
  };

  const rejectRide = async () => {
    if (!currentRide) return;
    await supabase.from("rides").update({ assigned_driver_id: null, assigned_vehicle_id: null, status: "pending" }).eq("id", currentRide.id);
    setCurrentRide(null);
    prevRideRef.current = null;
    toast({ title: "Vožnja odbijena" });
  };

  const completeRide = async () => {
    if (!currentRide) return;
    const fare = parseFloat(fareInput) || 0;
    await supabase.from("rides").update({
      status: "completed",
      fare,
      completed_at: new Date().toISOString(),
      payment_method: paymentMethod,
    } as any).eq("id", currentRide.id);
    recordRide(fare, paymentMethod);
    await persistStats();
    setCurrentRide(null);
    setPaymentMethod("cash");
    updateStatus("available");
    toast({ title: "✅ Vožnja završena", description: `${fare} RSD (${paymentMethod === "cash" ? "Keš" : "Kartica"})` });
  };

  const handleDriverNavigate = useCallback((lat: number, lng: number, address: string) => {
    setNavDestination({ lat, lng, address });
  }, []);

  const navigateInApp = useCallback((address: string) => {
    geocodeAndNavigate(address);
  }, []);

  const geocodeAndNavigate = useCallback(async (address: string) => {
    try {
      const params = new URLSearchParams({
        q: `${address}, Leskovac, Serbia`,
        format: "json",
        limit: "1",
        viewbox: "21.88,43.03,22.01,42.96",
      });
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?${params}`,
        { headers: { "Accept-Language": "sr,en", "User-Agent": "CityTaxiLeskovac/1.0" } }
      );
      const data = await res.json();
      if (data?.[0]) {
        handleDriverNavigate(parseFloat(data[0].lat), parseFloat(data[0].lon), address);
      }
    } catch (e) {
      console.error("Geocode error:", e);
    }
  }, [handleDriverNavigate]);

  const clearDestination = useCallback(() => {
    setNavDestination(null);
  }, []);

  const formatTimer = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  const statusColors: Record<DriverStatus, string> = {
    available: "bg-taxi-green text-white glow-green",
    busy: "bg-taxi-red text-white",
    offline: "bg-muted text-muted-foreground",
  };

  const statusLabels: Record<DriverStatus, string> = {
    available: isPaused ? "⏸ Pauza" : "Slobodan",
    busy: isPaused ? "⏸ Pauza" : "Zauzet",
    offline: "Van mreže",
  };

  return (
    <div className="h-[100dvh] flex flex-col bg-background overflow-hidden mobile-no-select">
      {/* Header */}
      <header className="taxi-gradient px-4 py-3 flex items-center justify-between shadow-lg shrink-0 safe-top safe-left safe-right relative overflow-hidden">
        <div className="absolute inset-0 scan-line opacity-30" />
        <div className="flex items-center gap-3 relative z-10">
          <div className="w-10 h-10 md:w-11 md:h-11 rounded-xl bg-secondary/80 flex items-center justify-center backdrop-blur glow-yellow">
            <Car className="w-5 h-5 md:w-6 md:h-6 text-secondary-foreground" />
          </div>
          <div>
            <h1 className="font-mono font-bold text-primary-foreground text-sm md:text-base tracking-wider">CITY TAXI</h1>
            <div className="flex items-center gap-2">
              <Badge className={`${statusColors[status]} text-xs`}>{statusLabels[status]}</Badge>
              {vehicleReg && <span className="text-xs text-primary-foreground/70 font-mono tracking-wider">{vehicleReg}</span>}
              {isTracking && (
                <span className="flex items-center gap-1 text-xs text-primary-foreground/80">
                  <Navigation className="w-3 h-3 animate-pulse-dot" /> GPS
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1 relative z-10">
          {/* Shift stats in header */}
          <ShiftStatsBar stats={stats} />
          <Button variant="ghost" size="icon" onClick={enterFullscreen}
            className="text-primary-foreground hover:bg-primary-foreground/10 h-10 w-10 md:h-11 md:w-11">
            <Maximize className="w-4 h-4" />
          </Button>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" className="text-primary-foreground hover:bg-primary-foreground/10 h-10 w-10 md:h-11 md:w-11">
                <Volume2 className="w-4 h-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-56 p-4 z-[2000] glass-dark border-glow" side="bottom">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-display font-medium">Jačina zvuka</span>
                  <span className="text-xs text-taxi-cyan font-mono">{Math.round(volume * 100)}%</span>
                </div>
                <Slider value={[volume]} onValueChange={([v]) => setVolume(v)} max={1} step={0.05} className="w-full" />
                <Button size="sm" variant="outline" className="w-full text-xs" onClick={() => playAlert()}>🔊 Testiraj zvuk</Button>
              </div>
            </PopoverContent>
          </Popover>
          <a href="tel:0800211111" className="flex items-center gap-1 text-primary-foreground/90 hover:text-primary-foreground text-xs font-mono font-bold px-2 tracking-wider">
            <Phone className="w-4 h-4 md:w-5 md:h-5" />
            <span className="hidden sm:inline">0800 211 111</span>
          </a>
          <Button variant="ghost" size="icon" onClick={signOut} className="text-primary-foreground hover:bg-primary-foreground/10 h-10 w-10 md:h-11 md:w-11">
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      </header>

      {/* Map */}
      <div className="flex-1 relative">
        <DriverMap latitude={myLat} longitude={myLng} vehicleRegistration={vehicleReg} destination={navDestination} onClearDestination={clearDestination} />

        {/* Search button - top left */}
        <div className="absolute top-3 left-3 z-[1000]">
          <DriverAddressSearch onNavigate={handleDriverNavigate} />
        </div>

        {/* Zone queue panel - top right */}
        {user && status !== "offline" && (
          <div className="absolute top-3 right-3 z-[1000]" style={{ width: "min(280px, calc(100vw - 80px))" }}>
            <ZoneQueuePanel driverId={user.id} />
          </div>
        )}

        {/* Ride card */}
        {currentRide && (
          <div className={cn(
            "absolute z-[1000] animate-fade-in safe-left safe-right",
            isMobile ? "bottom-20 left-2 right-2" : "top-4 left-4 right-4 max-w-lg"
          )}>
            <Card className={cn(
              "shadow-2xl glass-dark border-2 transition-all",
              currentRide.status === "assigned" ? "border-taxi-orange/50 animate-glow-pulse" : "border-taxi-green/30 glow-green"
            )}>
              <CardContent className="p-4 md:p-5 space-y-3">
                <div className="flex items-center gap-2">
                  <div className={cn(
                    "w-10 h-10 rounded-lg flex items-center justify-center shrink-0",
                    currentRide.status === "assigned" ? "bg-taxi-orange/20" : "bg-taxi-green/20"
                  )}>
                    <MapPin className={cn(
                      "w-5 h-5",
                      currentRide.status === "assigned" ? "text-taxi-orange animate-pulse" : "text-taxi-green"
                    )} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs md:text-sm text-muted-foreground font-display font-medium flex items-center gap-2">
                      {currentRide.status === "assigned" ? (
                        <span className="text-taxi-orange flex items-center gap-1">
                          <Zap className="w-3 h-3" /> Nova vožnja!
                        </span>
                      ) : "U toku"}
                      {currentRide.status === "in_progress" && (
                        <span className="font-mono text-taxi-cyan text-glow-cyan">{formatTimer(rideTimer)}</span>
                      )}
                    </p>
                    <p className="font-display font-bold text-sm md:text-base truncate text-foreground">{currentRide.pickup_address}</p>
                  </div>
                  <Button
                    size="icon"
                    variant="outline"
                    className="shrink-0 h-10 w-10 md:h-11 md:w-11 border-border/50"
                    onClick={() => navigateInApp(currentRide.pickup_address)}
                    title="Navigiraj do polaska"
                  >
                    <Navigation className="w-5 h-5 text-primary" />
                  </Button>
                </div>
                {currentRide.destination_address && (
                  <div className="flex items-center gap-2 pl-12">
                    <p className="text-xs md:text-sm text-muted-foreground flex-1">→ {currentRide.destination_address}</p>
                    <Button
                      size="icon"
                      variant="outline"
                      className="shrink-0 h-9 w-9 border-border/50"
                      onClick={() => navigateInApp(currentRide.destination_address!)}
                      title="Navigiraj do destinacije"
                    >
                      <Navigation className="w-4 h-4 text-primary" />
                    </Button>
                  </div>
                )}
                {currentRide.notes && <p className="text-xs md:text-sm text-muted-foreground italic pl-12">📝 {currentRide.notes}</p>}

                {currentRide.status === "assigned" && (
                  <div className="flex gap-2 pt-1">
                    <Button className="flex-1 bg-taxi-green hover:bg-taxi-green/90 text-white h-14 md:h-16 text-base md:text-lg font-display font-bold active:scale-95 transition-all glow-green" onClick={acceptRide}>
                      <Check className="w-6 h-6 mr-2" /> Prihvati
                    </Button>
                    <Button variant="destructive" className="flex-1 h-14 md:h-16 text-base md:text-lg font-display font-bold active:scale-95 transition-all" onClick={rejectRide}>
                      <XCircle className="w-6 h-6 mr-2" /> Odbij
                    </Button>
                  </div>
                )}

                {currentRide.status === "in_progress" && (
                  <>
                    <div className="flex gap-2 items-center">
                      <Input type="number" inputMode="decimal" value={fareInput} onChange={(e) => setFareInput(e.target.value)} placeholder="Cena (RSD)" className="flex-1 h-12 md:h-14 text-base md:text-lg bg-secondary/30 border-border/50 font-mono" />
                      <DollarSign className="w-5 h-5 text-taxi-cyan" />
                    </div>
                    {/* Payment method toggle */}
                    <div className="flex gap-2">
                      <Button
                        variant={paymentMethod === "cash" ? "default" : "outline"}
                        className={cn("flex-1 h-11 font-display font-bold active:scale-95 transition-all",
                          paymentMethod === "cash" ? "bg-taxi-green hover:bg-taxi-green/90 text-white" : "border-border/50"
                        )}
                        onClick={() => setPaymentMethod("cash")}
                      >
                        <Banknote className="w-4 h-4 mr-1.5" /> Keš
                      </Button>
                      <Button
                        variant={paymentMethod === "card" ? "default" : "outline"}
                        className={cn("flex-1 h-11 font-display font-bold active:scale-95 transition-all",
                          paymentMethod === "card" ? "bg-taxi-cyan hover:bg-taxi-cyan/90 text-white" : "border-border/50"
                        )}
                        onClick={() => setPaymentMethod("card")}
                      >
                        <CreditCard className="w-4 h-4 mr-1.5" /> Kartica
                      </Button>
                    </div>
                    <Button className="w-full h-14 md:h-16 text-base md:text-lg font-display font-bold active:scale-95 transition-all taxi-gradient text-primary-foreground glow-yellow" onClick={completeRide}>
                      ✅ Završi vožnju
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* Bottom controls */}
      <div className="shrink-0 glass-dark border-t border-border/30 p-3 md:p-4 z-[1000] safe-bottom safe-left safe-right">
        <div className="grid grid-cols-3 gap-2 md:gap-3 max-w-lg md:mx-auto">
          <Button size="sm" variant={status === "available" && !isPaused ? "default" : "outline"}
            onClick={() => updateStatus("available")}
            className={cn(
              "text-sm md:text-base h-16 md:h-[4.5rem] font-display font-bold transition-all active:scale-95",
              status === "available" && !isPaused
                ? "bg-taxi-green hover:bg-taxi-green/90 text-white shadow-lg glow-green border-0"
                : "border-border/50"
            )}>
            ✅ Slobodan
          </Button>
          <Button size="sm" variant={isPaused ? "default" : "outline"}
            onClick={togglePause}
            className={cn(
              "text-sm md:text-base h-16 md:h-[4.5rem] font-display font-bold transition-all active:scale-95",
              isPaused
                ? "bg-taxi-orange hover:bg-taxi-orange/90 text-white shadow-lg border-0"
                : "border-border/50"
            )}>
            <Coffee className="w-5 h-5 mr-1" /> Pauza
          </Button>
          <Button size="sm" variant={status === "offline" ? "default" : "outline"}
            onClick={() => updateStatus("offline")}
            className={cn(
              "text-sm md:text-base h-16 md:h-[4.5rem] font-display font-bold transition-all active:scale-95",
              status === "offline" ? "border-0" : "border-border/50"
            )}>
            🔴 Kraj
          </Button>
        </div>
      </div>
    </div>
  );
}
