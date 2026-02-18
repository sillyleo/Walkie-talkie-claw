"use client";

import { Badge } from "@/components/ui/badge";
import { type DisplayMode, C, TTS_MODELS } from "@/lib/types";

interface StatusBarProps {
  displayMode: DisplayMode;
  ttsModelIdx: number;
}

export function StatusBar({ displayMode, ttsModelIdx }: StatusBarProps) {
  const modeIndicator =
    displayMode === "voice"
      ? `🔊 ${TTS_MODELS[ttsModelIdx].label}`
      : displayMode === "both"
      ? `🔊💬 ${TTS_MODELS[ttsModelIdx].label}`
      : "💬 文字";

  return (
    <div className="shrink-0 flex items-center justify-between px-5 pt-4 pb-2">
      {/* Connected indicator */}
      <div className="flex items-center gap-1.5">
        <div
          className="w-1.5 h-1.5 rounded-full"
          style={{ backgroundColor: C.green }}
        />
        <span
          className="text-[10px] uppercase font-medium"
          style={{ letterSpacing: "0.25em", color: C.textMuted }}
        >
          對講機
        </span>
      </div>

      {/* Mode badge */}
      <Badge
        variant="secondary"
        className="text-[10px] uppercase font-normal px-2 py-0.5 border-0"
        style={{
          letterSpacing: "0.15em",
          color: C.textMuted,
          backgroundColor: "transparent",
        }}
      >
        {modeIndicator}
      </Badge>
    </div>
  );
}
