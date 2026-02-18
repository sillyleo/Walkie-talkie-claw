"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { type Message, type BtnState, type DisplayMode, genId, apiFetch } from "@/lib/types";

interface UseChatOptions {
  token: string;
  playTTS: (text: string) => Promise<void>;
}

export function useChat({ token, playTTS }: UseChatOptions) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [btnState, setBtnState] = useState<BtnState>("idle");
  const [liveText, setLiveText] = useState("");
  const [displayMode, setDisplayMode] = useState<DisplayMode>(() => {
    if (typeof window === "undefined") return "voice";
    return (localStorage.getItem("wt_display_mode") as DisplayMode) || "voice";
  });

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, liveText]);

  const addMessage = useCallback((text: string, role: "user" | "bot") => {
    const msg: Message = { id: genId(), text, role };
    setMessages((prev) => [...prev, msg]);
    return msg.id;
  }, []);

  const handleResult = useCallback(
    async (text: string) => {
      setLiveText("");
      if (!text) return;
      addMessage(text, "user");

      const typingId = genId();
      setMessages((prev) => [
        ...prev,
        { id: typingId, text: "…", role: "bot" },
      ]);
      setBtnState("waiting");

      try {
        const res = await apiFetch("/api/chat", { text, token });
        if (res.error === "請重新解鎖") {
          localStorage.removeItem("wt_token");
          window.location.reload();
          return;
        }
        const reply = res.reply || res.error || "（無回應）";
        setMessages((prev) =>
          prev.map((m) => (m.id === typingId ? { ...m, text: reply } : m))
        );
        const shouldPlayTts = displayMode === "voice" || displayMode === "both";
        if (shouldPlayTts) playTTS(reply);
      } catch {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === typingId ? { ...m, text: "連線失敗" } : m
          )
        );
      }
      setBtnState("idle");
    },
    [token, displayMode, playTTS, addMessage]
  );

  const handleTranscription = useCallback(
    async (blob: Blob) => {
      setLiveText("辨識中…");
      setBtnState("waiting");
      try {
        const r = await fetch("/api/transcribe", {
          method: "POST",
          headers: { "Content-Type": blob.type },
          body: blob,
        });
        const data = await r.json();
        const text = (data.text || "").trim();
        setLiveText(text);
        await handleResult(text);
      } catch {
        setLiveText("辨識失敗");
        setBtnState("idle");
      }
    },
    [handleResult]
  );

  const cycleDisplayMode = useCallback(() => {
    const modes: DisplayMode[] = ["voice", "text", "both"];
    const currentIdx = modes.indexOf(displayMode);
    const nextMode = modes[(currentIdx + 1) % modes.length];
    setDisplayMode(nextMode);
    localStorage.setItem("wt_display_mode", nextMode);
  }, [displayMode]);

  return {
    messages,
    btnState,
    setBtnState,
    liveText,
    setLiveText,
    displayMode,
    messagesEndRef,
    handleResult,
    handleTranscription,
    cycleDisplayMode,
  };
}
