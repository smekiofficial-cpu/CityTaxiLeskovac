import { useEffect, useRef, useCallback } from "react";

export function useWakeLock(enabled: boolean) {
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);

  const requestWakeLock = useCallback(async () => {
    if (!("wakeLock" in navigator)) return;
    try {
      wakeLockRef.current = await (navigator as any).wakeLock.request("screen");
      wakeLockRef.current?.addEventListener("release", () => {
        wakeLockRef.current = null;
      });
    } catch (e) {
      console.warn("Wake lock failed:", e);
    }
  }, []);

  useEffect(() => {
    if (enabled) {
      requestWakeLock();
      // Re-acquire on visibility change (Android tabs back in)
      const onVisibility = () => {
        if (document.visibilityState === "visible" && enabled) {
          requestWakeLock();
        }
      };
      document.addEventListener("visibilitychange", onVisibility);
      return () => {
        document.removeEventListener("visibilitychange", onVisibility);
        wakeLockRef.current?.release();
        wakeLockRef.current = null;
      };
    } else {
      wakeLockRef.current?.release();
      wakeLockRef.current = null;
    }
  }, [enabled, requestWakeLock]);
}
