"use client";

import { useState, useRef, useCallback } from "react";
import { TTS_MODELS } from "@/lib/types";

export function useTts() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [ttsModelIdx, setTtsModelIdx] = useState(() => {
    if (typeof window === "undefined") return 0;
    const saved = localStorage.getItem("wt_tts_model");
    const idx = TTS_MODELS.findIndex((m) => m.id === saved);
    return idx >= 0 ? idx : 0;
  });
  const [ttsVoice] = useState(() => {
    if (typeof window === "undefined") return "shimmer";
    return localStorage.getItem("wt_tts_voice") || "shimmer";
  });
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const playTTS = useCallback(
    async (text: string) => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      setIsPlaying(true);
      try {
        const model = TTS_MODELS[ttsModelIdx].id;
        const r = await fetch("/api/tts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text, model, voice: ttsVoice }),
        });
        if (!r.ok) {
          setIsPlaying(false);
          return;
        }
        const blob = await r.blob();
        const url = URL.createObjectURL(blob);
        const audio = new Audio(url);
        audioRef.current = audio;
        audio.onended = () => setIsPlaying(false);
        audio.onerror = () => setIsPlaying(false);
        audio.play().catch(() => setIsPlaying(false));
      } catch {
        setIsPlaying(false);
      }
    },
    [ttsModelIdx, ttsVoice]
  );

  const cycleTtsModel = useCallback(() => {
    const nextIdx = (ttsModelIdx + 1) % TTS_MODELS.length;
    setTtsModelIdx(nextIdx);
    localStorage.setItem("wt_tts_model", TTS_MODELS[nextIdx].id);
  }, [ttsModelIdx]);

  return {
    isPlaying,
    ttsModelIdx,
    ttsModelLabel: TTS_MODELS[ttsModelIdx].label,
    playTTS,
    cycleTtsModel,
  };
}
