import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Car, Lock, Mail, Shield, Zap } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [focused, setFocused] = useState<string | null>(null);
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await signIn(email, password);
      navigate("/");
    } catch (error: any) {
      toast({
        title: "Greška pri prijavi",
        description: error.message || "Neispravan email ili lozinka",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="h-screen-safe flex flex-col items-center justify-center taxi-dark-gradient px-5 py-6 relative overflow-hidden noise-bg grid-bg safe-top safe-bottom mobile-no-select">
      {/* Animated background orbs */}
      <div className="orb orb-yellow w-72 sm:w-96 h-72 sm:h-96 -top-24 -right-24 opacity-50" />
      <div className="orb orb-cyan w-64 sm:w-80 h-64 sm:h-80 bottom-0 -left-24 opacity-40" />
      <div className="orb orb-purple w-48 sm:w-64 h-48 sm:h-64 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-20" />

      {/* Scan line overlay */}
      <div className="absolute inset-0 scan-line pointer-events-none z-[1]" />

      {/* Floating particles */}
      <div className="absolute inset-0 pointer-events-none z-[1]">
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 rounded-full bg-primary/30"
            style={{
              left: `${15 + i * 15}%`,
              top: `${10 + i * 12}%`,
              animation: `orb-float ${12 + i * 3}s ease-in-out infinite`,
              animationDelay: `${-i * 2}s`,
            }}
          />
        ))}
      </div>

      <div className="w-full max-w-sm relative z-10">
        {/* Main card */}
        <Card className="glass-dark border-glow shadow-2xl animate-scale-in overflow-hidden relative">
          {/* Top gradient accent bar */}
          <div className="h-1 w-full taxi-gradient" />

          <CardHeader className="text-center space-y-4 pb-1 pt-6 sm:pt-8 relative">
            {/* Logo with pulse ring */}
            <div className="mx-auto relative">
              <div className="absolute inset-0 w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-primary/20 animate-ping mx-auto" style={{ animationDuration: '3s' }} />
              <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-2xl taxi-gradient flex items-center justify-center shadow-xl glow-yellow-strong animate-float">
                <Car className="w-8 h-8 sm:w-10 sm:h-10 text-primary-foreground" />
              </div>
            </div>

            <div className="space-y-1.5">
              <h1 className="text-2xl sm:text-3xl font-mono font-bold text-primary text-glow-yellow tracking-wider">
                CITY TAXI
              </h1>
              <div className="neon-line mx-auto w-28 sm:w-32" />
              <p className="text-[10px] sm:text-xs text-taxi-cyan font-display font-semibold tracking-[0.35em] uppercase">
                Leskovac
              </p>
            </div>
          </CardHeader>

          <CardContent className="px-5 sm:px-7 pb-5 sm:pb-7 pt-2">
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Email field */}
              <div className="space-y-1.5">
                <Label
                  htmlFor="email"
                  className={`text-xs tracking-wider uppercase font-display transition-colors duration-300 ${
                    focused === 'email' ? 'text-primary' : 'text-muted-foreground'
                  }`}
                >
                  Email
                </Label>
                <div className={`relative group rounded-lg transition-all duration-300 ${
                  focused === 'email' ? 'glow-yellow' : ''
                }`}>
                  <Mail className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors duration-300 ${
                    focused === 'email' ? 'text-primary' : 'text-muted-foreground/60'
                  }`} />
                  <Input
                    id="email"
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    placeholder="vas@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onFocus={() => setFocused('email')}
                    onBlur={() => setFocused(null)}
                    required
                    className="pl-10 h-12 bg-secondary/40 border-border/40 focus:border-primary/60 focus:ring-1 focus:ring-primary/20 transition-all duration-300 text-base"
                  />
                </div>
              </div>

              {/* Password field */}
              <div className="space-y-1.5">
                <Label
                  htmlFor="password"
                  className={`text-xs tracking-wider uppercase font-display transition-colors duration-300 ${
                    focused === 'password' ? 'text-primary' : 'text-muted-foreground'
                  }`}
                >
                  Lozinka
                </Label>
                <div className={`relative group rounded-lg transition-all duration-300 ${
                  focused === 'password' ? 'glow-yellow' : ''
                }`}>
                  <Lock className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors duration-300 ${
                    focused === 'password' ? 'text-primary' : 'text-muted-foreground/60'
                  }`} />
                  <Input
                    id="password"
                    type="password"
                    autoComplete="current-password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onFocus={() => setFocused('password')}
                    onBlur={() => setFocused(null)}
                    required
                    className="pl-10 h-12 bg-secondary/40 border-border/40 focus:border-primary/60 focus:ring-1 focus:ring-primary/20 transition-all duration-300 text-base"
                  />
                </div>
              </div>

              {/* Submit button */}
              <Button
                type="submit"
                className="w-full h-14 font-display font-bold text-sm tracking-wider taxi-gradient text-primary-foreground glow-yellow hover:glow-yellow-strong transition-all duration-300 active:scale-[0.97] relative overflow-hidden group rounded-xl"
                disabled={isLoading}
              >
                <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-700" />
                {isLoading ? (
                  <span className="flex items-center gap-2 relative z-10">
                    <span className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                    Prijava...
                  </span>
                ) : (
                  <span className="relative z-10">PRIJAVI SE</span>
                )}
              </Button>
            </form>

            {/* Trust indicators */}
            <div className="mt-5 flex items-center justify-center gap-4">
              <div className="flex items-center gap-1.5 text-muted-foreground/50">
                <Shield className="w-3.5 h-3.5" />
                <span className="text-[10px] font-display tracking-wider uppercase">Sigurno</span>
              </div>
              <div className="w-px h-3 bg-border/30" />
              <div className="flex items-center gap-1.5 text-muted-foreground/50">
                <Zap className="w-3.5 h-3.5" />
                <span className="text-[10px] font-display tracking-wider uppercase">24/7</span>
              </div>
            </div>

            <div className="mt-3 text-center">
              <a
                href="/install"
                className="text-xs text-taxi-cyan/60 hover:text-taxi-cyan transition-colors duration-300 font-display tracking-wider inline-flex items-center gap-1.5 group"
              >
                <span className="group-hover:scale-110 transition-transform duration-300">📱</span>
                Instaliraj aplikaciju
              </a>
            </div>
          </CardContent>
        </Card>

        {/* Bottom decorative element */}
        <div className="neon-line mt-4 mx-auto w-16 opacity-40" />
      </div>
    </div>
  );
}
