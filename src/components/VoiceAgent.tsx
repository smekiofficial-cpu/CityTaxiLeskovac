import { useConversation } from "@elevenlabs/react";
import { useState, useCallback, useRef, useMemo, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Phone, PhoneOff, Mic, MicOff, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

export default function VoiceAgent() {
  const [isConnecting, setIsConnecting] = useState(false);
  const [micDenied, setMicDenied] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const { toast } = useToast();
  const toastRef = useRef(toast);
  toastRef.current = toast;

  const clientTools = useMemo(() => ({
    create_ride: async (params: { pickup_address: string; destination_address?: string; fare?: number; notes?: string }) => {
      try {
        const resp = await supabase.functions.invoke("create-ride-voice", {
          body: {
            action: "create_ride",
            pickup_address: params.pickup_address,
            destination_address: params.destination_address,
            fare: params.fare,
            notes: params.notes,
          },
        });
        if (resp.error) throw resp.error;
        const result = resp.data;
        const destText = params.destination_address ? ` do ${params.destination_address}` : "";
        const fareText = params.fare ? ` Cena: ${params.fare} dinara.` : "";
        if (result.driver_assigned) {
          toastRef.current({
            title: "🚕 Vožnja dodeljena!",
            description: `${result.driver_name} → ${params.pickup_address}${destText}`,
          });
          return `Vožnja je kreirana i dodeljena vozaču ${result.driver_name}. Polazak: ${params.pickup_address}${destText}.${fareText} Vozilo stiže za 5-6 minuta.`;
        } else {
          toastRef.current({
            title: "🚕 Nova vožnja kreirana!",
            description: `${params.pickup_address}${destText} — čeka dodelu`,
          });
          return `Vožnja je kreirana. Polazak: ${params.pickup_address}${destText}.${fareText} Trenutno nema slobodnih vozača, dispečer će dodeliti vozilo u najkraćem roku.`;
        }
      } catch (err) {
        console.error("create_ride error:", err);
        return "Žao mi je, došlo je do greške pri kreiranju vožnje. Molim pokušajte ponovo.";
      }
    },
    cancel_ride: async (params: { pickup_address?: string }) => {
      try {
        const resp = await supabase.functions.invoke("create-ride-voice", {
          body: { action: "cancel_ride", pickup_address: params.pickup_address },
        });
        if (resp.error) throw resp.error;
        toastRef.current({ title: "❌ Vožnja otkazana", description: resp.data.message });
        return resp.data.message;
      } catch (err) {
        console.error("cancel_ride error:", err);
        return "Došlo je do greške pri otkazivanju vožnje.";
      }
    },
    get_info: async () => {
      try {
        const resp = await supabase.functions.invoke("create-ride-voice", {
          body: { action: "get_info" },
        });
        if (resp.error) throw resp.error;
        return resp.data.message;
      } catch (err) {
        console.error("get_info error:", err);
        return "City Taxi Leskovac, telefon 0800 211 111, radimo non-stop.";
      }
    },
  }), []);

  const conversation = useConversation({
    clientTools,
    onConnect: () => {
      console.log("ElevenLabs agent connected");
      toastRef.current({ title: "📞 Agent povezan", description: "AI agent je spreman za razgovor" });
      setCallDuration(0);
      timerRef.current = setInterval(() => setCallDuration(d => d + 1), 1000);
    },
    onDisconnect: () => {
      console.log("ElevenLabs agent disconnected");
      toastRef.current({ title: "📞 Razgovor završen" });
      if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    },
    onError: (error) => {
      console.error("Voice agent error:", error);
      toastRef.current({
        title: "Greška",
        description: "Došlo je do greške sa glasovnim agentom.",
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  const formatDuration = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  const startConversation = useCallback(async () => {
    setIsConnecting(true);
    setMicDenied(false);
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      setMicDenied(true);
      setIsConnecting(false);
      toastRef.current({
        title: "Mikrofon nije dostupan",
        description: "Dozvolite pristup mikrofonu u podešavanjima pretraživača.",
        variant: "destructive",
      });
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke("elevenlabs-token");
      if (error) throw new Error(error.message || "Nije moguće dobiti token");
      if (!data?.signed_url) throw new Error("Signed URL nije dobijen od servera");

      console.log("Starting WebSocket session with signed URL");
      await conversation.startSession({ signedUrl: data.signed_url });
    } catch (error) {
      console.error("Failed to start conversation:", error);
      toastRef.current({
        title: "Greška pri pokretanju",
        description: error instanceof Error ? error.message : "Pokušajte ponovo.",
        variant: "destructive",
      });
    } finally {
      setIsConnecting(false);
    }
  }, [conversation]);

  const stopConversation = useCallback(async () => {
    await conversation.endSession();
  }, [conversation]);

  const isActive = conversation.status === "connected";

  return (
    <div className="flex items-center gap-2">
      {isActive && (
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-taxi-green/10 border border-taxi-green/30 animate-in fade-in slide-in-from-right-2 duration-300">
          {conversation.isSpeaking ? (
            <Volume2 className="w-4 h-4 text-taxi-green animate-pulse" />
          ) : (
            <Mic className="w-4 h-4 text-taxi-green" />
          )}
          <span className="text-xs font-medium text-taxi-green">
            {conversation.isSpeaking ? "Govori..." : "Sluša..."}
          </span>
          <span className="text-xs text-taxi-green/70 font-mono">{formatDuration(callDuration)}</span>
        </div>
      )}

      {micDenied && !isActive && (
        <div className="flex items-center gap-1 text-xs text-destructive">
          <MicOff className="w-3 h-3" />
          <span>Mikrofon blokiran</span>
        </div>
      )}

      {isActive ? (
        <Button
          onClick={stopConversation}
          variant="destructive"
          size="sm"
          className="gap-2 animate-in fade-in duration-200"
        >
          <PhoneOff className="w-4 h-4" />
          Prekini
        </Button>
      ) : (
        <Button
          onClick={startConversation}
          disabled={isConnecting}
          className="gap-2 bg-taxi-green hover:bg-taxi-green/90 text-white transition-all"
          size="sm"
        >
          <Phone className={cn("w-4 h-4", isConnecting && "animate-pulse")} />
          {isConnecting ? "Povezivanje..." : "AI Agent"}
        </Button>
      )}
    </div>
  );
}
