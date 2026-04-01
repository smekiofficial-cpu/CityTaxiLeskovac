import { useState, useRef, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export function useScreenRecording(userId: string | undefined) {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const chunkIndexRef = useRef(0);
  const sessionIdRef = useRef<string>("");

  const uploadChunk = useCallback(async (blob: Blob, index: number) => {
    if (!userId) return;
    const sessionId = sessionIdRef.current;
    const fileName = `${userId}/${sessionId}/chunk_${String(index).padStart(4, "0")}.webm`;
    
    const { error } = await supabase.storage
      .from("recordings")
      .upload(fileName, blob, { contentType: "video/webm", upsert: false });

    if (error) {
      console.error("Failed to upload recording chunk:", error);
    }
  }, [userId]);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { displaySurface: "monitor" } as any,
        audio: false,
      });

      streamRef.current = stream;
      sessionIdRef.current = new Date().toISOString().replace(/[:.]/g, "-");
      chunkIndexRef.current = 0;
      chunksRef.current = [];

      const recorder = new MediaRecorder(stream, {
        mimeType: "video/webm;codecs=vp9",
      });

      recorder.ondataavailable = async (e) => {
        if (e.data.size > 0) {
          const idx = chunkIndexRef.current++;
          await uploadChunk(e.data, idx);
        }
      };

      recorder.onstop = () => {
        setIsRecording(false);
        setIsPaused(false);
        stream.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      };

      // Upload every 30 seconds
      recorder.start(30000);
      mediaRecorderRef.current = recorder;
      setIsRecording(true);

      // Handle user stopping share via browser UI
      stream.getVideoTracks()[0].onended = () => {
        stopRecording();
      };

      toast({
        title: "Snimanje pokrenuto",
        description: "Ekran se snima i čuva automatski.",
      });
    } catch (err: any) {
      if (err.name !== "NotAllowedError") {
        console.error("Screen recording error:", err);
        toast({
          title: "Greška",
          description: "Nije moguće pokrenuti snimanje ekrana.",
          variant: "destructive",
        });
      }
    }
  }, [uploadChunk]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    mediaRecorderRef.current = null;
    toast({
      title: "Snimanje zaustavljeno",
      description: "Snimak je sačuvan.",
    });
  }, []);

  const togglePause = useCallback(() => {
    const recorder = mediaRecorderRef.current;
    if (!recorder) return;
    if (recorder.state === "recording") {
      recorder.pause();
      setIsPaused(true);
    } else if (recorder.state === "paused") {
      recorder.resume();
      setIsPaused(false);
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
        mediaRecorderRef.current.stop();
      }
    };
  }, []);

  return {
    isRecording,
    isPaused,
    startRecording,
    stopRecording,
    togglePause,
    canRecord: !!navigator.mediaDevices?.getDisplayMedia,
  };
}
