import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/lib/auth";
import Login from "./pages/Login";
import Install from "./pages/Install";
import LandingPage from "./pages/LandingPage";
import Dashboard from "./pages/dispatcher/Dashboard";
import Vehicles from "./pages/dispatcher/Vehicles";
import Drivers from "./pages/dispatcher/Drivers";
import Dispatchers from "./pages/dispatcher/Dispatchers";
import History from "./pages/dispatcher/History";
import DriverDashboard from "./pages/driver/DriverDashboard";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1 } },
});

function AppRoutes() {
  const { user, role, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center taxi-dark-gradient relative overflow-hidden">
        <div className="orb orb-yellow w-64 h-64 top-20 right-20" />
        <div className="orb orb-cyan w-48 h-48 bottom-20 left-20" />
        <div className="text-center relative z-10">
          <div className="w-20 h-20 rounded-2xl taxi-gradient flex items-center justify-center mx-auto mb-5 glow-yellow-strong animate-float">
            <span className="text-3xl">🚕</span>
          </div>
          <p className="text-muted-foreground font-display tracking-wider">Učitavanje...</p>
          <div className="neon-line mt-4 mx-auto w-24" />
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<Login />} />
        <Route path="/install" element={<Install />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    );
  }

  if (role === "dispatcher" || role === "admin") {
    return (
      <Routes>
        <Route path="/" element={<Navigate to="/dispatcher" replace />} />
        <Route path="/dispatcher" element={<Dashboard />} />
        <Route path="/dispatcher/vehicles" element={<Vehicles />} />
        <Route path="/dispatcher/drivers" element={<Drivers />} />
        <Route path="/dispatcher/dispatchers" element={<Dispatchers />} />
        <Route path="/dispatcher/history" element={<History />} />
        <Route path="*" element={<Navigate to="/dispatcher" replace />} />
      </Routes>
    );
  }

  if (role === "driver") {
    return (
      <Routes>
        <Route path="/" element={<Navigate to="/driver" replace />} />
        <Route path="/driver" element={<DriverDashboard />} />
        <Route path="*" element={<Navigate to="/driver" replace />} />
      </Routes>
    );
  }

  return (
    <Routes>
      <Route path="*" element={
        <div className="flex min-h-screen items-center justify-center bg-background">
          <div className="text-center p-8">
            <p className="text-lg text-muted-foreground">Vaš nalog još nema dodeljenu ulogu. Kontaktirajte dispečera.</p>
          </div>
        </div>
      } />
    </Routes>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
