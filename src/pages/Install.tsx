import { usePWAInstall } from "@/hooks/usePWAInstall";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Download, Check, Smartphone, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function Install() {
  const { canInstall, isInstalled, install } = usePWAInstall();
  const navigate = useNavigate();

  return (
    <div className="min-h-[100dvh] flex items-center justify-center taxi-dark-gradient p-4 relative overflow-hidden noise-bg grid-bg">
      <div className="orb orb-yellow w-80 h-80 top-10 right-10" />
      <div className="orb orb-cyan w-64 h-64 bottom-20 left-10" />

      <Card className="w-full max-w-sm glass-dark border-glow shadow-2xl relative z-10 animate-scale-in">
        <CardContent className="p-8 space-y-8 text-center">
          <div className="relative mx-auto w-fit">
            <div className="w-24 h-24 rounded-2xl taxi-gradient flex items-center justify-center shadow-2xl glow-yellow-strong animate-float">
              <Smartphone className="w-12 h-12 text-primary-foreground" />
            </div>
            <div className="absolute inset-0 -m-2 rounded-2xl border border-taxi-cyan/20 animate-spin" style={{ animationDuration: '15s' }} />
          </div>

          <div>
            <h1 className="text-2xl font-mono font-bold text-primary text-glow-yellow tracking-wider">CITYTAXI</h1>
            <div className="neon-line mt-3 mx-auto w-24" />
            <p className="text-muted-foreground text-sm mt-3 font-display">Instaliraj na svoj telefon</p>
          </div>

          {isInstalled ? (
            <div className="space-y-4">
              <div className="flex items-center justify-center gap-2 text-taxi-green">
                <Check className="w-6 h-6" />
                <span className="font-display font-bold">Aplikacija je instalirana!</span>
              </div>
              <Button className="w-full h-12 font-display taxi-gradient text-primary-foreground glow-yellow" onClick={() => navigate("/")}>
                Otvori aplikaciju
              </Button>
            </div>
          ) : canInstall ? (
            <Button
              className="w-full h-14 text-lg font-mono font-bold taxi-gradient text-primary-foreground glow-yellow-strong hover:glow-yellow-strong active:scale-95 transition-all tracking-wider"
              onClick={install}
            >
              <Download className="w-5 h-5 mr-2" />
              INSTALIRAJ
            </Button>
          ) : (
            <div className="space-y-5">
              <p className="text-sm text-muted-foreground font-display">
                Da instalirate aplikaciju na Android:
              </p>
              <ol className="text-left text-sm space-y-3 text-muted-foreground">
                <li className="flex gap-3 items-start">
                  <span className="w-6 h-6 rounded-full bg-primary/10 text-primary font-mono text-xs flex items-center justify-center shrink-0 mt-0.5">1</span>
                  <span>Otvorite u <span className="text-foreground font-medium">Chrome</span> pregledaču</span>
                </li>
                <li className="flex gap-3 items-start">
                  <span className="w-6 h-6 rounded-full bg-primary/10 text-primary font-mono text-xs flex items-center justify-center shrink-0 mt-0.5">2</span>
                  <span>Tapnite na <span className="text-foreground font-medium">⋮ meni</span> (tri tačke)</span>
                </li>
                <li className="flex gap-3 items-start">
                  <span className="w-6 h-6 rounded-full bg-primary/10 text-primary font-mono text-xs flex items-center justify-center shrink-0 mt-0.5">3</span>
                  <span>Izaberite "<span className="text-foreground font-medium">Dodaj na početni ekran</span>"</span>
                </li>
              </ol>
            </div>
          )}

          <Button variant="ghost" className="w-full text-muted-foreground hover:text-foreground" onClick={() => navigate("/")}>
            <ArrowLeft className="w-4 h-4 mr-2" /> Nazad na prijavu
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
