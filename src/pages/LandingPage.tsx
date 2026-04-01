import { Car, Phone, Clock, MapPin, Shield, Users, Zap, ChevronRight, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen taxi-dark-gradient noise-bg grid-bg relative overflow-hidden font-sans">
      {/* Background orbs */}
      <div className="orb orb-yellow w-[500px] h-[500px] -top-40 -right-40 opacity-40" />
      <div className="orb orb-cyan w-[400px] h-[400px] bottom-40 -left-40 opacity-30" />
      <div className="orb orb-purple w-[300px] h-[300px] top-1/2 left-1/3 opacity-15" />
      <div className="absolute inset-0 scan-line pointer-events-none z-[1]" />

      {/* Navigation */}
      <nav className="relative z-20 flex items-center justify-between px-6 md:px-12 py-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl taxi-gradient flex items-center justify-center glow-yellow">
            <Car className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <span className="font-mono font-bold text-lg text-primary text-glow-yellow tracking-wider">CITY TAXI</span>
            <span className="block text-[9px] text-taxi-cyan font-display tracking-[0.4em] uppercase -mt-0.5">Leskovac</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <a
            href="tel:0800211111"
            className="hidden sm:flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors"
          >
            <Phone className="w-4 h-4" />
            0800 211 111
          </a>
          <Button
            onClick={() => navigate("/login")}
            variant="outline"
            className="border-primary/30 text-primary hover:bg-primary/10 font-display tracking-wider text-xs"
          >
            PRIJAVA
          </Button>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative z-10 px-6 md:px-12 pt-12 md:pt-24 pb-20 max-w-6xl mx-auto">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div className="space-y-8">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full glass-dark border-glow text-xs text-taxi-cyan font-display tracking-wider">
                <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                DOSTUPNI 24/7
              </div>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-mono font-black leading-tight text-secondary-foreground">
                Vaš <span className="text-primary text-glow-yellow">pouzdani</span> taksi u Leskovcu
              </h1>
              <p className="text-lg max-w-md leading-relaxed text-secondary">
                Brz, siguran i profesionalan prevoz. Pozovite nas ili naručite vožnju — stižemo za par minuta.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
              <a href="tel:0800211111" className="flex-1 sm:flex-none">
                <Button className="w-full h-14 taxi-gradient text-primary-foreground glow-yellow hover:glow-yellow-strong font-display font-bold tracking-wider text-sm relative overflow-hidden group rounded-xl">
                  <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-700" />
                  <Phone className="w-5 h-5 mr-2 relative z-10" />
                  <span className="relative z-10">POZOVI TAKSI</span>
                </Button>
              </a>
              <Button
                onClick={() => navigate("/login")}
                variant="outline"
                className="h-14 border-primary/30 text-primary hover:bg-primary/10 font-display tracking-wider text-sm rounded-xl px-8"
              >
                PRIJAVI SE
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>

            {/* Quick stats */}
            <div className="flex gap-8 pt-4">
              {[
                { value: "24/7", label: "Non-stop" },
                { value: "5 min", label: "Prosečno čekanje" },
              ].map((stat) => (
                <div key={stat.label} className="text-center">
                  <div className="text-2xl font-mono font-bold text-primary text-glow-yellow">{stat.value}</div>
                  <div className="text-[10px] text-muted-foreground font-display tracking-wider uppercase mt-1">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Hero visual — stylized card */}
          <div className="hidden md:block relative">
            <div className="glass-dark border-glow rounded-3xl p-8 relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1 taxi-gradient" />
              <div className="space-y-6">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl taxi-gradient flex items-center justify-center glow-yellow-strong animate-float">
                    <Car className="w-7 h-7 text-primary-foreground" />
                  </div>
                  <div>
                    <div className="font-mono font-bold text-xl text-primary text-glow-yellow">CITY TAXI</div>
                    <div className="text-xs text-muted-foreground font-display tracking-wider">Dispečerski sistem</div>
                  </div>
                </div>
                <div className="neon-line w-full" />
                <div className="space-y-3">
                  {[
                    { icon: MapPin, text: "GPS praćenje vozila u realnom vremenu" },
                    { icon: Zap, text: "Automatska dodela vožnji" },
                    { icon: Shield, text: "AI asistent za dispečere" },
                  ].map(({ icon: Icon, text }) => (
                    <div key={text} className="flex items-center gap-3 text-sm text-muted-foreground">
                      <Icon className="w-4 h-4 text-primary flex-shrink-0" />
                      {text}
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-3 gap-3 pt-2">
                  {["Zona 1", "Zona 2", "Zona 3"].map((z) => (
                    <div key={z} className="text-center py-2 rounded-lg bg-primary/5 border border-primary/10">
                      <div className="text-xs font-display text-primary tracking-wider">{z}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            {/* Decorative glow behind card */}
            <div className="absolute -inset-4 bg-primary/5 rounded-3xl blur-3xl -z-10" />
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 px-6 md:px-12 py-8 border-t border-border/20">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Car className="w-4 h-4 text-primary" />
            <span className="font-mono font-bold text-sm text-primary tracking-wider">CITY TAXI</span>
            <span className="text-xs text-muted-foreground">Leskovac</span>
          </div>
          <div className="flex items-center gap-6 text-xs text-muted-foreground">
            <span>📞 0800 211 111</span>
            <span>🕐 0–24h</span>
            <span>💵 Gotovina - Kartice</span>
          </div>
          <div className="text-xs font-extrabold text-secondary font-serif bg-taxi-green">
            © 2026 City Taxi Leskovac by Stefan Djordjevic
          </div>
        </div>
      </footer>
    </div>
  );
}
