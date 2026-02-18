"use client";

import { useRef, useCallback } from "react";

interface UseAudioRecorderOptions {
  onRecordingStart?: () => void;
  onRecordingStop?: (blob: Blob) => void;
  onError?: (message: string) => void;
}

export function useAudioRecorder({
  onRecordingStart,
  onRecordingStop,
  onError,
}: UseAudioRecorderOptions) {
  const mediaRecRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const isRecordingRef = useRef(false);

  const startRecording = useCallback(async () => {
    if (isRecordingRef.current) return;
    isRecordingRef.current = true;
    chunksRef.current = [];

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : "audio/webm";
      const rec = new MediaRecorder(stream, { mimeType });
      mediaRecRef.current = rec;

      rec.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      rec.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        if (chunksRef.current.length === 0) {
          onError?.("沒有錄到聲音");
          return;
        }
        const blob = new Blob(chunksRef.current, { type: rec.mimeType });
        onRecordingStop?.(blob);
      };

      rec.start();
      onRecordingStart?.();
    } catch {
      isRecordingRef.current = false;
      onError?.("無法使用麥克風");
    }
  }, [onRecordingStart, onRecordingStop, onError]);

  const stopRecording = useCallback(() => {
    if (!isRecordingRef.current) return;
    isRecordingRef.current = false;
    const rec = mediaRecRef.current;
    if (rec && rec.state !== "inactive") {
      rec.stop();
    }
    mediaRecRef.current = null;
  }, []);

  return { startRecording, stopRecording, isRecordingRef };
}
