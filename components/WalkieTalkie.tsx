"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Settings2, Volume2, VolumeX, Play, Lock, Radio } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────
type Screen = "lock" | "chat";
type BtnState = "idle" | "recording" | "waiting";

interface Message {
  id: string;
  text: string;
  role: "user" | "bot";
}

// ─── Helper ───────────────────────────────────────────────────────────────────
function genId() {
  return Math.random().toString(36).slice(2);
}

async function apiFetch(path: string, body: Record<string, unknown>) {
  const r = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return r.json();
}

// ─── Lock Screen ─────────────────────────────────────────────────────────────
function LockScreen({
  onUnlocked,
}: {
  onUnlocked: (token: string) => void;
}) {
  const [passphrase, setPassphrase] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/status")
      .then((r) => r.json())
      .then(() => {
        setReady(true);
        setTimeout(() => inputRef.current?.focus(), 100);
      })
      .catch(() => setError("無法連線伺服器"));
  }, []);

  const submit = useCallback(async () => {
    if (!passphrase.trim() || loading) return;
    setLoading(true);
    setError("");

    try {
      const res = await apiFetch("/api/unlock", { passphrase: passphrase.trim() });

      if (res.ok) {
        localStorage.setItem("wt_token", res.token);
        localStorage.setItem("wt_token_time", String(Date.now()));
        onUnlocked(res.token);
      } else {
        setError(res.error || "密碼錯誤");
        setPassphrase("");
        inputRef.current?.focus();
      }
    } catch {
      setError("連線失敗");
    }
    setLoading(false);
  }, [passphrase, loading, onUnlocked]);

  return (
    <div className="flex flex-col items-center justify-center h-full gap-10 px-8">
      {/* Logo / title */}
      <div className="flex flex-col items-center gap-3">
        <div className="w-16 h-16 rounded-full border border-border flex items-center justify-center">
          <Radio className="w-7 h-7 text-muted-foreground" />
        </div>
        <h1 className="text-2xl font-light tracking-[0.3em] uppercase text-foreground">
          對講機
        </h1>
        <p className="text-muted-foreground text-sm tracking-wide">
          {!ready ? "載入中…" : "輸入密碼解鎖"}
        </p>
      </div>

      {/* Input */}
      <div className="w-full max-w-xs flex flex-col gap-3">
        <Input
          ref={inputRef}
          type="password"
          placeholder="密碼"
          value={passphrase}
          onChange={(e) => setPassphrase(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          className="bg-card border-border text-center text-lg tracking-widest h-12 rounded-xl focus-visible:ring-1 focus-visible:ring-muted-foreground"
          autoComplete="off"
          disabled={!ready || loading}
        />

        <Button
          onClick={submit}
          disabled={!ready || loading || !passphrase.trim()}
          className="h-12 rounded-xl tracking-widest text-sm uppercase w-full"
        >
          {loading ? (
            <span className="opacity-60">處理中…</span>
          ) : (
            <>
              <Lock className="w-4 h-4" />
              解鎖
            </>
          )}
        </Button>

        {error && (
          <p className="text-center text-sm text-red-400 tracking-wide">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}

// ─── PTT Button ───────────────────────────────────────────────────────────────
function PTTButton({
  state,
  onStart,
  onStop,
}: {
  state: BtnState;
  onStart: () => void;
  onStop: () => void;
}) {
  const isRecording = state === "recording";
  const isWaiting = state === "waiting";

  return (
    <Button
      variant="outline"
      onMouseDown={onStart}
      onMouseUp={onStop}
      onMouseLeave={onStop}
      onTouchStart={(e) => { e.preventDefault(); onStart(); }}
      onTouchEnd={(e) => { e.preventDefault(); onStop(); }}
      onTouchCancel={(e) => { e.preventDefault(); onStop(); }}
      disabled={isWaiting}
      aria-label={isRecording ? "錄音中" : isWaiting ? "處理中" : "按住說話"}
      className={cn(
        "relative w-44 h-44 rounded-full",
        "border-2 transition-all duration-150",
        "flex flex-col items-center justify-center gap-2",
        "select-none touch-none shadow-none",
        !isRecording && !isWaiting && [
          "border-border bg-background",
          "hover:bg-accent hover:border-foreground/30",
          "active:scale-[0.97]",
        ],
        isRecording && [
          "border-red-500 bg-red-500/10",
          "scale-105",
          "ptt-btn-recording",
        ],
        isWaiting && [
          "border-amber-500/50 bg-amber-500/5",
          "cursor-not-allowed",
          "ptt-btn-waiting",
        ]
      )}
    >
      {/* Center dot indicator */}
      <div
        className={cn(
          "w-4 h-4 rounded-full transition-all duration-150",
          isRecording && "bg-red-500 shadow-[0_0_12px_rgba(239,68,68,0.8)]",
          isWaiting && "bg-amber-500",
          !isRecording && !isWaiting && "bg-muted-foreground"
        )}
      />
      <span
        className={cn(
          "text-xs font-medium tracking-[0.2em] uppercase transition-colors duration-150",
          isRecording && "text-red-400",
          isWaiting && "text-amber-400",
          !isRecording && !isWaiting && "text-muted-foreground"
        )}
      >
        {isRecording ? "聆聽中" : isWaiting ? "處理中" : "按住說話"}
      </span>
    </Button>
  );
}

// ─── Message Bubble ───────────────────────────────────────────────────────────
function MessageBubble({
  message,
  onPlay,
}: {
  message: Message;
  onPlay?: (text: string) => void;
}) {
  const isUser = message.role === "user";

  return (
    <div
      className={cn(
        "msg-enter flex gap-2 max-w-[85%]",
        isUser ? "self-end flex-row-reverse" : "self-start"
      )}
    >
      <div
        className={cn(
          "px-4 py-3 rounded-2xl text-sm leading-relaxed break-words",
          isUser
            ? "bg-foreground text-background rounded-br-sm"
            : "bg-card text-foreground rounded-bl-sm border border-border"
        )}
      >
        {message.text}
      </div>
      {!isUser && onPlay && (
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onPlay(message.text)}
          className="self-end mb-1 text-muted-foreground hover:text-foreground h-7 w-7"
          aria-label="播放語音"
        >
          <Play className="w-3.5 h-3.5" />
        </Button>
      )}
    </div>
  );
}

// ─── Settings Panel ───────────────────────────────────────────────────────────
function SettingsPanel({
  ttsModel,
  ttsVoice,
  onModelChange,
  onVoiceChange,
}: {
  ttsModel: string;
  ttsVoice: string;
  onModelChange: (v: string) => void;
  onVoiceChange: (v: string) => void;
}) {
  const isGemini = ttsModel.startsWith("gemini/");

  return (
    <div className="border border-border rounded-xl p-4 bg-card space-y-3 text-sm">
      <p className="text-muted-foreground text-xs uppercase tracking-widest font-medium">
        語音設定
      </p>

      <div className="space-y-1">
        <label className="text-muted-foreground text-xs">
          模型
        </label>
        <Select value={ttsModel} onValueChange={onModelChange}>
          <SelectTrigger className="bg-input border-border h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="openai/tts-1">OpenAI TTS-1</SelectItem>
            <SelectItem value="openai/tts-1-hd">OpenAI TTS-1-HD</SelectItem>
            <SelectItem value="gemini/gemini-2.5-flash">
              Gemini 2.5 Flash
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      {!isGemini && (
        <div className="space-y-1">
          <label className="text-muted-foreground text-xs">
            聲音
          </label>
          <Select value={ttsVoice} onValueChange={onVoiceChange}>
            <SelectTrigger className="bg-input border-border h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {["alloy", "echo", "fable", "onyx", "nova", "shimmer"].map(
                (v) => (
                  <SelectItem key={v} value={v}>
                    {v.charAt(0).toUpperCase() + v.slice(1)}
                  </SelectItem>
                )
              )}
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  );
}

// ─── Chat Screen ─────────────────────────────────────────────────────────────
function ChatScreen({ token }: { token: string }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [btnState, setBtnState] = useState<BtnState>("idle");
  const [liveText, setLiveText] = useState("");
  const [ttsEnabled, setTtsEnabled] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem("wt_tts") === "1";
  });
  const [ttsModel, setTtsModel] = useState(() => {
    if (typeof window === "undefined") return "openai/tts-1";
    return localStorage.getItem("wt_tts_model") || "openai/tts-1";
  });
  const [ttsVoice, setTtsVoice] = useState(() => {
    if (typeof window === "undefined") return "shimmer";
    return localStorage.getItem("wt_tts_voice") || "shimmer";
  });
  const [showSettings, setShowSettings] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const mediaRecRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const isRecordingRef = useRef(false);
  const ttsAudioRef = useRef<HTMLAudioElement | null>(null);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, liveText]);

  const addMessage = useCallback((text: string, role: "user" | "bot") => {
    const msg: Message = { id: genId(), text, role };
    setMessages((prev) => [...prev, msg]);
    return msg.id;
  }, []);

  const playTTS = useCallback(
    async (text: string) => {
      if (ttsAudioRef.current) {
        ttsAudioRef.current.pause();
        ttsAudioRef.current = null;
      }
      try {
        const r = await fetch("/api/tts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text, model: ttsModel, voice: ttsVoice }),
        });
        if (!r.ok) return;
        const blob = await r.blob();
        const url = URL.createObjectURL(blob);
        const audio = new Audio(url);
        ttsAudioRef.current = audio;
        audio.play().catch(() => {});
      } catch {}
    },
    [ttsModel, ttsVoice]
  );

  const handleResult = useCallback(
    async (text: string) => {
      setLiveText("");
      if (!text) return;

      addMessage(text, "user");

      // Add typing placeholder
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
          prev.map((m) =>
            m.id === typingId ? { ...m, text: reply } : m
          )
        );
        if (ttsEnabled) playTTS(reply);
      } catch {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === typingId ? { ...m, text: "連線失敗" } : m
          )
        );
      }

      setBtnState("idle");
    },
    [token, ttsEnabled, playTTS, addMessage]
  );

  const startRecording = useCallback(async () => {
    if (isRecordingRef.current || btnState !== "idle") return;
    isRecordingRef.current = true;
    chunksRef.current = [];
    setBtnState("recording");
    setLiveText("🎤 錄音中…");

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

      rec.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        if (chunksRef.current.length === 0) {
          setBtnState("idle");
          setLiveText("");
          return;
        }

        const blob = new Blob(chunksRef.current, { type: rec.mimeType });
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
      };

      rec.start();
    } catch {
      setLiveText("無法使用麥克風");
      isRecordingRef.current = false;
      setBtnState("idle");
    }
  }, [btnState, handleResult]);

  const stopRecording = useCallback(() => {
    if (!isRecordingRef.current) return;
    isRecordingRef.current = false;
    const rec = mediaRecRef.current;
    if (rec && rec.state !== "inactive") {
      rec.stop();
    } else {
      setBtnState("idle");
    }
    mediaRecRef.current = null;
  }, []);

  const handleTtsToggle = () => {
    const next = !ttsEnabled;
    setTtsEnabled(next);
    localStorage.setItem("wt_tts", next ? "1" : "0");
  };

  const handleModelChange = (v: string) => {
    setTtsModel(v);
    localStorage.setItem("wt_tts_model", v);
  };

  const handleVoiceChange = (v: string) => {
    setTtsVoice(v);
    localStorage.setItem("wt_tts_voice", v);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Top bar */}
      <div className="flex-shrink-0 flex items-center justify-between px-5 py-4 border-b border-border">
        <div className="flex items-center gap-2.5">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          <span className="text-xs font-medium tracking-[0.25em] uppercase text-muted-foreground">
            對講機
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleTtsToggle}
            className={ttsEnabled ? "text-foreground" : "text-muted-foreground"}
            aria-label={ttsEnabled ? "關閉語音" : "開啟語音"}
          >
            {ttsEnabled ? (
              <Volume2 className="w-4 h-4" />
            ) : (
              <VolumeX className="w-4 h-4" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowSettings((s) => !s)}
            className={showSettings ? "text-foreground" : "text-muted-foreground"}
            aria-label="語音設定"
          >
            <Settings2 className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 min-h-0 overflow-y-auto px-4 py-4 flex flex-col gap-2.5">
        {messages.length === 0 && (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-muted-foreground text-sm tracking-wide">
              按住下方按鈕開始說話
            </p>
          </div>
        )}
        {messages.map((msg) => (
          <MessageBubble
            key={msg.id}
            message={msg}
            onPlay={msg.role === "bot" ? playTTS : undefined}
          />
        ))}
        {liveText && btnState !== "waiting" && (
          <div className="self-end px-4 py-3 rounded-2xl rounded-br-sm text-sm text-muted-foreground italic border border-border bg-card max-w-[85%]">
            {liveText}
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* PTT area */}
      <div className="flex-shrink-0 border-t border-border px-5 pt-5 pb-8 flex flex-col items-center gap-5">
        {/* Settings panel */}
        {showSettings && (
          <div className="w-full max-w-xs">
            <SettingsPanel
              ttsModel={ttsModel}
              ttsVoice={ttsVoice}
              onModelChange={handleModelChange}
              onVoiceChange={handleVoiceChange}
            />
          </div>
        )}

        {/* Live transcript */}
        <div className="h-5 flex items-center">
          {liveText && (
            <p className="text-xs text-muted-foreground text-center truncate max-w-[240px]">
              {liveText}
            </p>
          )}
        </div>

        {/* PTT button */}
        <PTTButton
          state={btnState}
          onStart={startRecording}
          onStop={stopRecording}
        />
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function WalkieTalkie() {
  const [screen, setScreen] = useState<Screen>("lock");
  const [token, setToken] = useState("");

  useEffect(() => {
    // Check if we have a valid stored token
    const storedToken = localStorage.getItem("wt_token");
    const storedTime = parseInt(localStorage.getItem("wt_token_time") || "0");
    if (storedToken && Date.now() - storedTime < 4 * 60 * 60 * 1000) {
      setToken(storedToken);
      setScreen("chat");
    }
  }, []);

  const handleUnlocked = useCallback((newToken: string) => {
    setToken(newToken);
    setScreen("chat");
  }, []);

  return (
    <main className="h-full h-dvh max-w-md mx-auto">
      {screen === "lock" ? (
        <LockScreen onUnlocked={handleUnlocked} />
      ) : (
        <ChatScreen token={token} />
      )}
    </main>
  );
}
