"use client";

import { useState, useEffect, useRef, useCallback } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────
type Screen = "lock" | "chat";
type BtnState = "idle" | "recording" | "waiting";
type DialPosition = -1 | 0 | 1;

interface Message {
  id: string;
  text: string;
  role: "user" | "bot";
}

// ─── Constants ────────────────────────────────────────────────────────────────
const TTS_MODELS = [
  { id: "openai/tts-1", label: "TTS-1" },
  { id: "openai/tts-1-hd", label: "TTS-HD" },
  { id: "gemini/gemini-2.5-flash", label: "Gemini" },
];

// Braun T3 colour tokens
const C = {
  pageBg: "#dedad5",
  bodyBg: "#f0eeeb",
  bodyBorder: "#4a4a4a",
  dot: "#5a5757",
  dialFace: "#ebebea",
  dialBorder: "#b0ada8",
  triangle: "#3a3a3a",
  tick: "#888480",
  centerBtn: "#f5f3f0",
  centerBorder: "#c0bdb8",
  centerDot: "#888480",
  divider: "#d0cdc8",
  textPrimary: "#3a3a3a",
  textSecondary: "#8a8480",
  textMuted: "#aaa8a3",
  bubbleUser: "#3a3a3a",
  bubbleUserText: "#f0eeeb",
  bubbleBot: "#e0ddd8",
  bubbleBotText: "#3a3a3a",
  bubbleBotBorder: "#c8c5c0",
  recordRed: "#ef4444",
  recordRedBg: "#fee2e2",
  recordRedBorder: "#ef4444",
  green: "#22c55e",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
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

// ─── Speaker Dots ─────────────────────────────────────────────────────────────
function SpeakerDots({ isPlaying }: { isPlaying: boolean }) {
  const COLS = 12;
  const ROWS = 10;
  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px 18px",
        minHeight: 0,
      }}
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${COLS}, 1fr)`,
          gap: "7px",
          width: "100%",
          maxWidth: "340px",
        }}
      >
        {Array.from({ length: ROWS * COLS }).map((_, i) => {
          const col = i % COLS;
          return (
            <div
              key={i}
              style={{
                aspectRatio: "1",
                borderRadius: "50%",
                backgroundColor: C.dot,
                ...(isPlaying
                  ? {
                      animation: "speakerPulse 0.7s ease-in-out infinite",
                      animationDelay: `${col * 0.045}s`,
                    }
                  : {}),
              }}
            />
          );
        })}
      </div>
    </div>
  );
}

// ─── Message Bubble ───────────────────────────────────────────────────────────
function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === "user";
  return (
    <div
      className="msg-enter"
      style={{
        display: "flex",
        alignSelf: isUser ? "flex-end" : "flex-start",
        maxWidth: "85%",
      }}
    >
      <div
        style={{
          padding: "10px 14px",
          borderRadius: isUser ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
          fontSize: "14px",
          lineHeight: "1.55",
          backgroundColor: isUser ? C.bubbleUser : C.bubbleBot,
          color: isUser ? C.bubbleUserText : C.bubbleBotText,
          border: isUser ? "none" : `1px solid ${C.bubbleBotBorder}`,
          wordBreak: "break-word",
        }}
      >
        {message.text}
      </div>
    </div>
  );
}

// ─── Rotary Dial ─────────────────────────────────────────────────────────────
interface RotaryDialProps {
  position: DialPosition;
  btnState: BtnState;
  ttsEnabled: boolean;
  ttsModelLabel: string;
  onRotateLeft: () => void;
  onRotateRight: () => void;
  onCenterPress: () => void;
  onCenterRelease: () => void;
}

function RotaryDial({
  position,
  btnState,
  ttsEnabled,
  ttsModelLabel,
  onRotateLeft,
  onRotateRight,
  onCenterPress,
  onCenterRelease,
}: RotaryDialProps) {
  const angle = position * 45;
  const isRecording = btnState === "recording";
  const isWaiting = btnState === "waiting";

  const containerRef = useRef<HTMLDivElement>(null);
  const dragStartX = useRef(0);
  const isDragging = useRef(false);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      // Ignore if click is near center button (r < 46px)
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const dx = e.clientX - (rect.left + rect.width / 2);
      const dy = e.clientY - (rect.top + rect.height / 2);
      if (Math.sqrt(dx * dx + dy * dy) < 46) return;

      dragStartX.current = e.clientX;
      isDragging.current = true;
      e.currentTarget.setPointerCapture(e.pointerId);
    },
    []
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!isDragging.current) return;
      isDragging.current = false;
      const delta = e.clientX - dragStartX.current;
      if (delta > 24) onRotateRight();
      else if (delta < -24) onRotateLeft();
    },
    [onRotateLeft, onRotateRight]
  );

  const handlePointerCancel = useCallback(() => {
    isDragging.current = false;
  }, []);

  // Mode display text
  const modeLabel =
    position === 0
      ? isRecording
        ? "●"
        : "PTT"
      : position === -1
      ? ttsEnabled
        ? "🔊"
        : "🔇"
      : ttsModelLabel;

  const modeName =
    position === 0
      ? isRecording
        ? "聆聽中"
        : isWaiting
        ? "處理中"
        : "按住說話"
      : position === -1
      ? ttsEnabled
        ? "語音開啟"
        : "語音關閉"
      : "切換模型";

  const DIAL_SIZE = 210;
  const FACE_INSET = 5;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "6px",
      }}
    >
      {/* Mode name label */}
      <div
        style={{
          fontSize: "11px",
          letterSpacing: "0.18em",
          color: isRecording ? C.recordRed : C.textSecondary,
          textTransform: "uppercase",
          fontWeight: 500,
          height: "16px",
          display: "flex",
          alignItems: "center",
          transition: "color 0.2s",
        }}
      >
        {modeName}
      </div>

      {/* Dial */}
      <div
        ref={containerRef}
        style={{
          position: "relative",
          width: DIAL_SIZE,
          height: DIAL_SIZE,
          userSelect: "none",
          touchAction: "none",
          cursor: "grab",
        }}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
      >
        {/* Outer ring */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: "50%",
            border: `1.5px solid ${C.dialBorder}`,
            pointerEvents: "none",
          }}
        />

        {/* Rotating dial face */}
        <div
          style={{
            position: "absolute",
            inset: FACE_INSET,
            borderRadius: "50%",
            backgroundColor: C.dialFace,
            transform: `rotate(${angle}deg)`,
            transition:
              "transform 0.38s cubic-bezier(0.34, 1.56, 0.64, 1)",
            boxShadow:
              "inset 0 2px 6px rgba(0,0,0,0.07), inset 0 -1px 3px rgba(255,255,255,0.9)",
            pointerEvents: "none",
          }}
        >
          {/* Triangle indicator — top of dial face */}
          <div
            style={{
              position: "absolute",
              top: "14px",
              left: "50%",
              transform: "translateX(-50%)",
              width: 0,
              height: 0,
              borderLeft: "5.5px solid transparent",
              borderRight: "5.5px solid transparent",
              borderBottom: `9px solid ${C.triangle}`,
            }}
          />

          {/* Tick mark — lower-left */}
          <div
            style={{
              position: "absolute",
              bottom: "21%",
              left: "16%",
              width: "22px",
              height: "2px",
              backgroundColor: C.tick,
              borderRadius: "1px",
              transform: "rotate(40deg)",
            }}
          />

          {/* Tick mark — lower-right */}
          <div
            style={{
              position: "absolute",
              bottom: "21%",
              right: "16%",
              width: "22px",
              height: "2px",
              backgroundColor: C.tick,
              borderRadius: "1px",
              transform: "rotate(-40deg)",
            }}
          />
        </div>

        {/* Left tap zone (click = rotate left) */}
        <button
          aria-label="向左旋轉"
          onClick={onRotateLeft}
          style={{
            position: "absolute",
            left: "8px",
            top: "50%",
            transform: "translateY(-50%)",
            width: "55px",
            height: "90px",
            opacity: 0,
            zIndex: 4,
            cursor: "pointer",
          }}
        />

        {/* Right tap zone (click = rotate right) */}
        <button
          aria-label="向右旋轉"
          onClick={onRotateRight}
          style={{
            position: "absolute",
            right: "8px",
            top: "50%",
            transform: "translateY(-50%)",
            width: "55px",
            height: "90px",
            opacity: 0,
            zIndex: 4,
            cursor: "pointer",
          }}
        />

        {/* Center button — fixed, does NOT rotate */}
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            zIndex: 10,
          }}
        >
          <button
            onMouseDown={onCenterPress}
            onMouseUp={onCenterRelease}
            onMouseLeave={onCenterRelease}
            onTouchStart={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onCenterPress();
            }}
            onTouchEnd={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onCenterRelease();
            }}
            onTouchCancel={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onCenterRelease();
            }}
            disabled={isWaiting}
            aria-label="中心按鈕"
            style={{
              width: "70px",
              height: "70px",
              borderRadius: "50%",
              backgroundColor: isRecording
                ? C.recordRedBg
                : C.centerBtn,
              border: `1.5px solid ${
                isRecording ? C.recordRedBorder : C.centerBorder
              }`,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: "6px",
              cursor: isWaiting ? "not-allowed" : "pointer",
              boxShadow: isRecording
                ? `0 0 14px rgba(239,68,68,0.35), inset 0 1px 3px rgba(0,0,0,0.12)`
                : "inset 0 2px 5px rgba(0,0,0,0.09), inset 0 -1px 2px rgba(255,255,255,0.85)",
              transition: "all 0.15s ease",
              animation: isRecording
                ? "centerPulse 1.2s ease-in-out infinite"
                : "none",
            }}
          >
            <span
              style={{
                width: "7px",
                height: "7px",
                borderRadius: "50%",
                backgroundColor: isRecording
                  ? C.recordRed
                  : isWaiting
                  ? "#d4a800"
                  : C.centerDot,
                transition: "background-color 0.15s",
              }}
            />
            <span
              style={{
                width: "7px",
                height: "7px",
                borderRadius: "50%",
                backgroundColor: isRecording
                  ? C.recordRed
                  : isWaiting
                  ? "#d4a800"
                  : C.centerDot,
                transition: "background-color 0.15s",
              }}
            />
          </button>
        </div>
      </div>

      {/* Mode value label */}
      <div
        style={{
          fontSize: "16px",
          color: C.textPrimary,
          height: "26px",
          display: "flex",
          alignItems: "center",
          letterSpacing: "0.05em",
          minWidth: "60px",
          justifyContent: "center",
        }}
      >
        {modeLabel}
      </div>
    </div>
  );
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
      .catch(() => setError("無法連線"));
  }, []);

  const submit = useCallback(async () => {
    if (!passphrase.trim() || loading) return;
    setLoading(true);
    setError("");
    try {
      const res = await apiFetch("/api/unlock", {
        passphrase: passphrase.trim(),
      });
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

  const LOCK_DOT_COLS = 10;
  const LOCK_DOT_ROWS = 6;

  return (
    <div
      style={{
        backgroundColor: C.bodyBg,
        borderRadius: "32px",
        border: `4px solid ${C.bodyBorder}`,
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        overflow: "hidden",
      }}
    >
      {/* Speaker dots — decorative top section */}
      <div
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "28px 24px 20px",
          width: "100%",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: `repeat(${LOCK_DOT_COLS}, 1fr)`,
            gap: "8px",
            width: "100%",
            maxWidth: "300px",
            opacity: 0.35,
          }}
        >
          {Array.from({ length: LOCK_DOT_ROWS * LOCK_DOT_COLS }).map(
            (_, i) => (
              <div
                key={i}
                style={{
                  aspectRatio: "1",
                  borderRadius: "50%",
                  backgroundColor: C.dot,
                }}
              />
            )
          )}
        </div>
      </div>

      {/* Divider */}
      <div
        style={{
          height: "1px",
          backgroundColor: C.divider,
          width: "calc(100% - 48px)",
        }}
      />

      {/* Lock control area */}
      <div
        style={{
          flexShrink: 0,
          padding: "32px 32px 48px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "20px",
          width: "100%",
        }}
      >
        {/* Status label */}
        <div
          style={{
            fontSize: "11px",
            letterSpacing: "0.22em",
            color: C.textMuted,
            textTransform: "uppercase",
            fontFamily: "monospace",
          }}
        >
          {!ready ? "初始化…" : "輸入密碼解鎖"}
        </div>

        {/* Password field */}
        <input
          ref={inputRef}
          type="password"
          value={passphrase}
          onChange={(e) => setPassphrase(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          placeholder="  ·  ·  ·  ·  ·"
          disabled={!ready || loading}
          autoComplete="off"
          style={{
            width: "100%",
            maxWidth: "260px",
            height: "50px",
            backgroundColor: C.pageBg,
            border: `1.5px solid ${C.centerBorder}`,
            borderRadius: "12px",
            textAlign: "center",
            fontSize: "22px",
            letterSpacing: "0.5em",
            color: C.textPrimary,
            outline: "none",
            fontFamily: "monospace",
          }}
        />

        {/* Error */}
        {error && (
          <div
            style={{
              fontSize: "12px",
              color: C.recordRed,
              letterSpacing: "0.08em",
            }}
          >
            {error}
          </div>
        )}

        {/* Unlock button — large circle */}
        <button
          onClick={submit}
          disabled={!ready || loading || !passphrase.trim()}
          style={{
            width: "86px",
            height: "86px",
            borderRadius: "50%",
            backgroundColor:
              passphrase.trim() && ready && !loading
                ? C.bodyBorder
                : C.dialBorder,
            border: "none",
            color: C.bodyBg,
            fontSize: "11px",
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            cursor:
              passphrase.trim() && ready && !loading ? "pointer" : "default",
            transition: "all 0.2s ease",
            boxShadow:
              passphrase.trim() && ready && !loading
                ? "0 4px 12px rgba(74,74,74,0.3)"
                : "none",
            fontFamily:
              "-apple-system, BlinkMacSystemFont, 'Helvetica Neue', sans-serif",
          }}
        >
          {loading ? "…" : "解鎖"}
        </button>

        {/* Branding */}
        <div
          style={{
            fontSize: "10px",
            letterSpacing: "0.4em",
            color: C.textMuted,
            textTransform: "uppercase",
          }}
        >
          walkie
        </div>
      </div>
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
  const [dialPosition, setDialPosition] = useState<DialPosition>(0);
  const [isPlaying, setIsPlaying] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const mediaRecRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const isRecordingRef = useRef(false);
  const ttsAudioRef = useRef<HTMLAudioElement | null>(null);

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
        ttsAudioRef.current = audio;
        audio.onended = () => setIsPlaying(false);
        audio.onerror = () => setIsPlaying(false);
        audio.play().catch(() => setIsPlaying(false));
      } catch {
        setIsPlaying(false);
      }
    },
    [ttsModelIdx, ttsVoice]
  );

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
    if (rec && rec.state !== "inactive") rec.stop();
    else setBtnState("idle");
    mediaRecRef.current = null;
  }, []);

  // Dial interaction
  const handleRotateLeft = useCallback(() => {
    setDialPosition((p) => {
      if (p === 1) return 0;
      if (p === 0) return -1;
      return p;
    });
  }, []);

  const handleRotateRight = useCallback(() => {
    setDialPosition((p) => {
      if (p === -1) return 0;
      if (p === 0) return 1;
      return p;
    });
  }, []);

  const handleCenterPress = useCallback(() => {
    if (dialPosition === 0 && btnState === "idle") {
      startRecording();
    }
    // TTS and Model modes: action happens on release (like a click)
  }, [dialPosition, btnState, startRecording]);

  const handleCenterRelease = useCallback(() => {
    if (dialPosition === 0) {
      stopRecording();
    } else if (dialPosition === -1) {
      // Toggle TTS
      const next = !ttsEnabled;
      setTtsEnabled(next);
      localStorage.setItem("wt_tts", next ? "1" : "0");
    } else if (dialPosition === 1) {
      // Cycle model
      const nextIdx = (ttsModelIdx + 1) % TTS_MODELS.length;
      setTtsModelIdx(nextIdx);
      localStorage.setItem("wt_tts_model", TTS_MODELS[nextIdx].id);
    }
  }, [dialPosition, ttsEnabled, ttsModelIdx, stopRecording]);

  const showSpeakerDots = ttsEnabled;

  return (
    <div
      style={{
        backgroundColor: C.bodyBg,
        borderRadius: "32px",
        border: `4px solid ${C.bodyBorder}`,
        height: "100%",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      {/* ── Display area (speaker dots OR chat) ────────────────── */}
      <div
        style={{
          flex: 1,
          minHeight: 0,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          position: "relative",
        }}
      >
        {/* Top status bar */}
        <div
          style={{
            flexShrink: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "16px 20px 8px",
          }}
        >
          {/* Connected indicator */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            <div
              style={{
                width: "6px",
                height: "6px",
                borderRadius: "50%",
                backgroundColor: C.green,
              }}
            />
            <span
              style={{
                fontSize: "10px",
                letterSpacing: "0.25em",
                color: C.textMuted,
                textTransform: "uppercase",
                fontWeight: 500,
              }}
            >
              對講機
            </span>
          </div>

          {/* TTS / mode indicator */}
          <div
            style={{
              fontSize: "10px",
              letterSpacing: "0.15em",
              color: C.textMuted,
              textTransform: "uppercase",
            }}
          >
            {ttsEnabled
              ? `${TTS_MODELS[ttsModelIdx].label}`
              : "文字"}
          </div>
        </div>

        {/* Main display */}
        {showSpeakerDots ? (
          <SpeakerDots isPlaying={isPlaying} />
        ) : (
          <div
            style={{
              flex: 1,
              minHeight: 0,
              overflowY: "auto",
              padding: "8px 16px 16px",
              display: "flex",
              flexDirection: "column",
              gap: "10px",
            }}
          >
            {messages.length === 0 && (
              <div
                style={{
                  flex: 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <p
                  style={{
                    color: C.textMuted,
                    fontSize: "13px",
                    letterSpacing: "0.12em",
                  }}
                >
                  旋轉旋鈕選擇模式
                </p>
              </div>
            )}
            {messages.map((msg) => (
              <MessageBubble key={msg.id} message={msg} />
            ))}
            {liveText && btnState !== "waiting" && (
              <div
                style={{
                  alignSelf: "flex-end",
                  padding: "10px 14px",
                  borderRadius: "16px 16px 4px 16px",
                  fontSize: "13px",
                  color: C.textSecondary,
                  fontStyle: "italic",
                  border: `1px solid ${C.bubbleBotBorder}`,
                  backgroundColor: C.pageBg,
                  maxWidth: "85%",
                }}
              >
                {liveText}
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Divider */}
      <div
        style={{
          height: "1px",
          backgroundColor: C.divider,
          margin: "0 24px",
          flexShrink: 0,
        }}
      />

      {/* ── Control area ────────────────────────────────────────── */}
      <div
        style={{
          flexShrink: 0,
          padding: "14px 0 28px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "4px",
        }}
      >
        {/* Live text / status */}
        <div
          style={{
            height: "18px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {liveText && (
            <span
              style={{
                fontSize: "11px",
                color: C.textSecondary,
                letterSpacing: "0.08em",
              }}
            >
              {liveText}
            </span>
          )}
        </div>

        {/* Rotary dial */}
        <RotaryDial
          position={dialPosition}
          btnState={btnState}
          ttsEnabled={ttsEnabled}
          ttsModelLabel={TTS_MODELS[ttsModelIdx].label}
          onRotateLeft={handleRotateLeft}
          onRotateRight={handleRotateRight}
          onCenterPress={handleCenterPress}
          onCenterRelease={handleCenterRelease}
        />
      </div>
    </div>
  );
}

// ─── Root Component ──────────────────────────────────────────────────────────
export default function WalkieTalkie() {
  const [screen, setScreen] = useState<Screen>("lock");
  const [token, setToken] = useState("");

  useEffect(() => {
    const storedToken = localStorage.getItem("wt_token");
    const storedTime = parseInt(
      localStorage.getItem("wt_token_time") || "0"
    );
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
    <main
      style={{
        height: "100dvh",
        display: "flex",
        alignItems: "stretch",
        justifyContent: "center",
        backgroundColor: C.pageBg,
        padding: "12px",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "430px",
          flex: 1,
        }}
      >
        {screen === "lock" ? (
          <LockScreen onUnlocked={handleUnlocked} />
        ) : (
          <ChatScreen token={token} />
        )}
      </div>
    </main>
  );
}
