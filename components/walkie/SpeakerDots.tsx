"use client";

import { C } from "@/lib/types";

const COLS = 12;
const ROWS = 10;

export function SpeakerDots({ isPlaying }: { isPlaying: boolean }) {
  return (
    <div className="flex flex-1 items-center justify-center px-[18px] py-5 min-h-0">
      <div
        className="grid w-full max-w-[340px]"
        style={{
          gridTemplateColumns: `repeat(${COLS}, 1fr)`,
          gap: "7px",
        }}
      >
        {Array.from({ length: ROWS * COLS }).map((_, i) => {
          const col = i % COLS;
          return (
            <div
              key={i}
              className="aspect-square rounded-full"
              style={{
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
