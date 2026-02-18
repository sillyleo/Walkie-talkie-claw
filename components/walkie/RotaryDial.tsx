"use client";

import { useRef, useCallback } from "react";
import { type BtnState, type DialPosition, type DisplayMode, C } from "@/lib/types";

interface RotaryDialProps {
  position: DialPosition;
  btnState: BtnState;
  displayMode: DisplayMode;
  ttsModelLabel: string;
  onRotateLeft: () => void;
  onRotateRight: () => void;
  onCenterPress: () => void;
  onCenterRelease: () => void;
}

const DIAL_SIZE = 210;
const FACE_INSET = 5;

export function RotaryDial({
  position,
  btnState,
  displayMode,
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
      ? displayMode === "voice"
        ? "🔊"
        : displayMode === "both"
        ? "🔊💬"
        : "💬"
      : ttsModelLabel;

  const modeName =
    position === 0
      ? isRecording
        ? "聆聽中"
        : isWaiting
        ? "處理中"
        : "按住說話"
      : position === -1
      ? displayMode === "voice"
        ? "語音"
        : displayMode === "both"
        ? "語音＋文字"
        : "文字"
      : "切換模型";

  return (
    <div className="flex flex-col items-center gap-1.5">
      {/* Mode name label */}
      <div
        className="text-[11px] uppercase font-medium h-4 flex items-center transition-colors duration-200"
        style={{
          letterSpacing: "0.18em",
          color: isRecording ? C.recordRed : C.textSecondary,
        }}
      >
        {modeName}
      </div>

      {/* Dial */}
      <div
        ref={containerRef}
        className="relative select-none"
        style={{
          width: DIAL_SIZE,
          height: DIAL_SIZE,
          touchAction: "none",
          cursor: "grab",
        }}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
      >
        {/* Outer ring */}
        <div
          className="absolute inset-0 rounded-full pointer-events-none"
          style={{ border: `1.5px solid ${C.dialBorder}` }}
        />

        {/* Rotating dial face */}
        <div
          className="absolute rounded-full pointer-events-none"
          style={{
            inset: FACE_INSET,
            backgroundColor: C.dialFace,
            transform: `rotate(${angle}deg)`,
            transition: "transform 0.38s cubic-bezier(0.34, 1.56, 0.64, 1)",
            boxShadow:
              "inset 0 2px 6px rgba(0,0,0,0.07), inset 0 -1px 3px rgba(255,255,255,0.9)",
          }}
        >
          {/* Triangle indicator */}
          <div
            className="absolute top-[14px] left-1/2 -translate-x-1/2"
            style={{
              width: 0,
              height: 0,
              borderLeft: "5.5px solid transparent",
              borderRight: "5.5px solid transparent",
              borderBottom: `9px solid ${C.triangle}`,
            }}
          />

          {/* Tick mark — lower-left */}
          <div
            className="absolute"
            style={{
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
            className="absolute"
            style={{
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

        {/* Left tap zone */}
        <button
          aria-label="向左旋轉"
          onClick={onRotateLeft}
          className="absolute left-2 top-1/2 -translate-y-1/2 w-[55px] h-[90px] opacity-0 z-[4] cursor-pointer"
        />

        {/* Right tap zone */}
        <button
          aria-label="向右旋轉"
          onClick={onRotateRight}
          className="absolute right-2 top-1/2 -translate-y-1/2 w-[55px] h-[90px] opacity-0 z-[4] cursor-pointer"
        />

        {/* Center button — fixed, does NOT rotate */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
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
            className="flex flex-col items-center justify-center gap-1.5 rounded-full transition-all duration-150"
            style={{
              width: "70px",
              height: "70px",
              backgroundColor: isRecording ? C.recordRedBg : C.centerBtn,
              border: `1.5px solid ${isRecording ? C.recordRedBorder : C.centerBorder}`,
              cursor: isWaiting ? "not-allowed" : "pointer",
              boxShadow: isRecording
                ? "0 0 14px rgba(239,68,68,0.35), inset 0 1px 3px rgba(0,0,0,0.12)"
                : "inset 0 2px 5px rgba(0,0,0,0.09), inset 0 -1px 2px rgba(255,255,255,0.85)",
              animation: isRecording
                ? "centerPulse 1.2s ease-in-out infinite"
                : "none",
            }}
          >
            <span
              className="w-[7px] h-[7px] rounded-full transition-colors duration-150"
              style={{
                backgroundColor: isRecording
                  ? C.recordRed
                  : isWaiting
                  ? "#d4a800"
                  : C.centerDot,
              }}
            />
            <span
              className="w-[7px] h-[7px] rounded-full transition-colors duration-150"
              style={{
                backgroundColor: isRecording
                  ? C.recordRed
                  : isWaiting
                  ? "#d4a800"
                  : C.centerDot,
              }}
            />
          </button>
        </div>
      </div>

      {/* Mode value label */}
      <div
        className="text-base h-[26px] flex items-center justify-center min-w-[60px]"
        style={{
          color: C.textPrimary,
          letterSpacing: "0.05em",
        }}
      >
        {modeLabel}
      </div>
    </div>
  );
}
