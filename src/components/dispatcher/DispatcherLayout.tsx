import { ReactNode, useState, useEffect } from "react";
import DailyReportButton from "@/components/dispatcher/DailyReportButton";
import { useAuth } from "@/lib/auth";
import { Link, useLocation } from "react-router-dom";
import { Car, Users, LogOut, Menu, LayoutDashboard, Phone, History, Shield, Video, VideoOff, Pause, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import AiDispatcher from "@/components/AiDispatcher";
import { useScreenRecording } from "@/hooks/useScreenRecording";
import { supabase } from "@/integrations/supabase/client";

const navItems = [
  { to: "/dispatcher", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/dispatcher/drivers", icon: Users, label: "Vozači" },
  { to: "/dispatcher/vehicles", icon: Car, label: "Vozila" },
  { to: "/dispatcher/history", icon: History, label: "Istorija" },
  { to: "/dispatcher/dispatchers", icon: Shield, label: "Dispečeri" },
];

export default function DispatcherLayout({ children }: { children: ReactNode }) {
  const { signOut, user, role } = useAuth();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { isRecording, isPaused, startRecording, stopRecording, togglePause, canRecord } = useScreenRecording(user?.id);
  const isAdmin = role === "admin";

  // Listen for remote recording commands from admin
  useEffect(() => {
    if (!user || !canRecord) return;
    const channel = supabase.channel("recording-commands")
      .on("broadcast", { event: "start-recording" }, (payload) => {
        if (payload.payload?.target_user_id === user.id && !isRecording) {
          startRecording();
        }
      })
      .on("broadcast", { event: "stop-recording" }, (payload) => {
        if (payload.payload?.target_user_id === user.id && isRecording) {
          stopRecording();
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, canRecord, isRecording, startRecording, stopRecording]);

  return (
    <div className="flex h-screen-safe bg-background mobile-no-select">
      {/* Desktop Sidebar */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 w-60 futuristic-gradient text-sidebar-foreground transform transition-transform border-r border-sidebar-border/40",
        "hidden lg:flex lg:flex-col lg:relative lg:translate-x-0",
        sidebarOpen ? "!flex translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex items-center gap-3 px-5 py-5 border-b border-sidebar-border/40">
          <div className="w-10 h-10 rounded-xl taxi-gradient flex items-center justify-center glow-yellow">
            <Car className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="font-mono font-bold text-base text-sidebar-primary text-glow-yellow tracking-wider">CITY TAXI</h1>
            <p className="text-[10px] text-taxi-cyan/50 font-display tracking-widest">LESKOVAC</p>
          </div>
        </div>

        {/* Phone number */}
        <div className="px-3 py-2.5 border-b border-sidebar-border/40">
          <a href="tel:0800211111" className="flex items-center gap-2 px-3 py-2 rounded-lg bg-sidebar-accent/40 text-sidebar-primary hover:bg-sidebar-accent/60 transition-all group">
            <Phone className="w-3.5 h-3.5 group-hover:animate-pulse" />
            <span className="font-mono font-bold text-xs tracking-wider">0800 211 111</span>
          </a>
        </div>

        <nav className="p-3 space-y-0.5 flex-1">
          {navItems.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              onClick={() => setSidebarOpen(false)}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-display font-medium transition-all",
                location.pathname === item.to
                  ? "bg-primary/10 text-sidebar-primary border border-primary/20 glow-yellow"
                  : "text-sidebar-foreground/50 hover:bg-sidebar-accent/40 hover:text-sidebar-foreground"
              )}
            >
              <item.icon className="w-4 h-4" />
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="p-3 border-t border-sidebar-border/40 space-y-1.5">
          <DailyReportButton />
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start text-sidebar-foreground/40 hover:text-destructive hover:bg-destructive/10 transition-all text-xs"
            onClick={signOut}
          >
            <LogOut className="w-4 h-4 mr-2" />
            Odjavi se
          </Button>
        </div>
      </aside>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-background/60 backdrop-blur-sm lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="h-14 border-b border-border/40 flex items-center justify-between px-4 lg:px-5 glass-dark safe-top shrink-0">
          <div className="flex items-center">
            <Button variant="ghost" size="icon" className="lg:hidden mr-2 h-9 w-9" onClick={() => setSidebarOpen(true)}>
              <Menu className="w-5 h-5" />
            </Button>
            <h2 className="font-display font-semibold text-base text-foreground truncate">
              {navItems.find((i) => i.to === location.pathname)?.label ?? "Dispečer"}
            </h2>
          </div>
          <div className="flex items-center gap-2">
            {canRecord && (
              <div className="flex items-center gap-1">
                {isRecording && (
                  <div className="flex items-center gap-1.5 mr-1">
                    <span className="w-2 h-2 rounded-full bg-destructive animate-pulse" />
                    <span className="text-[10px] font-mono text-destructive hidden sm:inline">REC</span>
                  </div>
                )}
                {isRecording && (
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={togglePause} title={isPaused ? "Nastavi" : "Pauziraj"}>
                    {isPaused ? <Play className="w-3.5 h-3.5 text-primary" /> : <Pause className="w-3.5 h-3.5 text-muted-foreground" />}
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn("h-8 w-8", isRecording && "text-destructive hover:text-destructive")}
                  onClick={isRecording ? stopRecording : startRecording}
                  title={isRecording ? "Zaustavi snimanje" : "Pokreni snimanje"}
                >
                  {isRecording ? <VideoOff className="w-4 h-4" /> : <Video className="w-4 h-4" />}
                </Button>
              </div>
            )}
            <AiDispatcher />
            <a href="tel:0800211111" className="flex items-center gap-1.5 text-primary font-mono font-bold text-xs lg:hidden">
              <Phone className="w-3.5 h-3.5" />
              0800 211 111
            </a>
          </div>
        </header>

        {/* Content — leaves room for bottom nav on mobile */}
        <main className="flex-1 overflow-auto p-4 lg:p-6 pb-20 lg:pb-6 animate-page-enter touch-scroll">
          {children}
        </main>

        {/* Mobile bottom navigation */}
        <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 glass-dark border-t border-border/40 pb-safe safe-bottom">
          <div className="flex items-center justify-around h-14">
            {navItems.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "flex flex-col items-center justify-center gap-0.5 flex-1 h-full transition-colors active:scale-95",
                  location.pathname === item.to
                    ? "text-primary"
                    : "text-muted-foreground/50"
                )}
              >
                <item.icon className={cn(
                  "w-5 h-5 transition-all",
                  location.pathname === item.to && "drop-shadow-[0_0_6px_hsl(158_64%_42%/0.5)]"
                )} />
                <span className="text-[10px] font-display font-medium tracking-wide">{item.label}</span>
              </Link>
            ))}
          </div>
        </nav>
      </div>
    </div>
  );
}
