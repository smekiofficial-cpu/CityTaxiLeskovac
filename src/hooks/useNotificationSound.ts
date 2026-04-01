import { useCallback, useRef, useState } from "react";

const VOLUME_KEY = "notification_volume";

type SoundType = "alert" | "accepted" | "rejected";

export function useNotificationSound() {
  const audioCtxRef = useRef<AudioContext | null>(null);
  const [volume, setVolumeState] = useState(() => {
    const saved = localStorage.getItem(VOLUME_KEY);
    return saved !== null ? parseFloat(saved) : 1.0;
  });

  const setVolume = useCallback((v: number) => {
    const clamped = Math.max(0, Math.min(1, v));
    setVolumeState(clamped);
    localStorage.setItem(VOLUME_KEY, String(clamped));
  }, []);

  const getCtx = useCallback(() => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new AudioContext();
    }
    const ctx = audioCtxRef.current;
    if (ctx.state === "suspended") ctx.resume();
    return ctx;
  }, []);

  const playAlert = useCallback(() => {
    if (volume === 0) return;
    try {
      const ctx = getCtx();
      if (navigator.vibrate) {
        navigator.vibrate([600, 100, 600, 100, 600, 100, 600, 100, 600]);
      }
      const frequencies = [880, 1320, 880, 1320, 880, 1320, 880, 1320, 880, 1320];
      for (let i = 0; i < frequencies.length; i++) {
        const oscillator = ctx.createOscillator();
        const gainNode = ctx.createGain();
        const oscillator2 = ctx.createOscillator();
        const gainNode2 = ctx.createGain();
        oscillator.connect(gainNode);
        gainNode.connect(ctx.destination);
        oscillator2.connect(gainNode2);
        gainNode2.connect(ctx.destination);
        oscillator.type = "square";
        oscillator.frequency.setValueAtTime(frequencies[i], ctx.currentTime);
        oscillator2.type = "sawtooth";
        oscillator2.frequency.setValueAtTime(frequencies[i] * 1.01, ctx.currentTime);
        const startTime = ctx.currentTime + i * 0.25;
        gainNode.gain.setValueAtTime(volume, startTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + 0.2);
        gainNode2.gain.setValueAtTime(volume, startTime);
        gainNode2.gain.exponentialRampToValueAtTime(0.01, startTime + 0.2);
        oscillator.start(startTime);
        oscillator.stop(startTime + 0.2);
        oscillator2.start(startTime);
        oscillator2.stop(startTime + 0.2);
      }
    } catch (e) {
      console.warn("Could not play notification sound:", e);
    }
  }, [volume, getCtx]);

  const playAccepted = useCallback(() => {
    if (volume === 0) return;
    try {
      const ctx = getCtx();
      if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
      // Ascending cheerful tones
      const notes = [523, 659, 784, 1047]; // C5 E5 G5 C6
      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, ctx.currentTime);
        const start = ctx.currentTime + i * 0.12;
        gain.gain.setValueAtTime(volume * 0.6, start);
        gain.gain.exponentialRampToValueAtTime(0.01, start + 0.2);
        osc.start(start);
        osc.stop(start + 0.2);
      });
    } catch (e) {
      console.warn("Could not play accepted sound:", e);
    }
  }, [volume, getCtx]);

  const playRejected = useCallback(() => {
    if (volume === 0) return;
    try {
      const ctx = getCtx();
      if (navigator.vibrate) navigator.vibrate([400, 200, 400]);
      // Descending low tones
      const notes = [440, 349, 294, 220]; // A4 F4 D4 A3
      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = "triangle";
        osc.frequency.setValueAtTime(freq, ctx.currentTime);
        const start = ctx.currentTime + i * 0.18;
        gain.gain.setValueAtTime(volume * 0.7, start);
        gain.gain.exponentialRampToValueAtTime(0.01, start + 0.25);
        osc.start(start);
        osc.stop(start + 0.25);
      });
    } catch (e) {
      console.warn("Could not play rejected sound:", e);
    }
  }, [volume, getCtx]);

  const playSound = useCallback((type: SoundType) => {
    switch (type) {
      case "accepted": return playAccepted();
      case "rejected": return playRejected();
      default: return playAlert();
    }
  }, [playAlert, playAccepted, playRejected]);

  return { playAlert, playAccepted, playRejected, playSound, volume, setVolume };
}
