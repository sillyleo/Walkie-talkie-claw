// ─── App Types ──────────────────────────────────────────────────────────────

export type Screen = "lock" | "chat";
export type BtnState = "idle" | "recording" | "waiting";
export type DialPosition = -1 | 0 | 1;
export type DisplayMode = "voice" | "text" | "both";

export interface Message {
  id: string;
  text: string;
  role: "user" | "bot";
}

export interface TtsModel {
  id: string;
  label: string;
}

// ─── Constants ──────────────────────────────────────────────────────────────

export const TTS_MODELS: TtsModel[] = [
  { id: "openai/tts-1", label: "TTS-1" },
  { id: "openai/tts-1-hd", label: "TTS-HD" },
  { id: "gemini/gemini-2.5-flash", label: "Gemini" },
];

export const DISPLAY_MODES: DisplayMode[] = ["voice", "text", "both"];

// Braun T3 colour tokens
export const C = {
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
} as const;

// ─── Helpers ────────────────────────────────────────────────────────────────

export function genId() {
  return Math.random().toString(36).slice(2);
}

export async function apiFetch(path: string, body: Record<string, unknown>) {
  const r = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return r.json();
}
