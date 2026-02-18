"use client";

import { useState, useEffect, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { type Screen, type DialPosition, C } from "@/lib/types";
import { useAudioRecorder } from "@/hooks/useAudioRecorder";
import { useChat } from "@/hooks/useChat";
import { useTts } from "@/hooks/useTts";
import { UnlockScreen } from "./UnlockScreen";
import { StatusBar } from "./StatusBar";
import { SpeakerDots } from "./SpeakerDots";
import { ChatMessages } from "./ChatMessages";
import { RotaryDial } from "./RotaryDial";

// ─── Chat Screen ─────────────────────────────────────────────────────────────

function ChatScreen({ token }: { token: string }) {
  const { isPlaying, ttsModelIdx, ttsModelLabel, playTTS, cycleTtsModel } =
    useTts();

  const {
    messages,
    btnState,
    setBtnState,
    liveText,
    setLiveText,
    displayMode,
    messagesEndRef,
    handleTranscription,
    cycleDisplayMode,
  } = useChat({
    token,
    playTTS,
  });

  const [dialPosition, setDialPosition] = useState<DialPosition>(0);

  const { startRecording, stopRecording } = useAudioRecorder({
    onRecordingStart: () => {
      setBtnState("recording");
      setLiveText("🎤 錄音中…");
    },
    onRecordingStop: (blob) => {
      handleTranscription(blob);
    },
    onError: (msg) => {
      setLiveText(msg);
      setBtnState("idle");
    },
  });

  // Dial rotation
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
  }, [dialPosition, btnState, startRecording]);

  const handleCenterRelease = useCallback(() => {
    if (dialPosition === 0) {
      stopRecording();
    } else if (dialPosition === -1) {
      cycleDisplayMode();
    } else if (dialPosition === 1) {
      cycleTtsModel();
    }
  }, [dialPosition, stopRecording, cycleDisplayMode, cycleTtsModel]);

  const showSpeakerDots = displayMode === "voice";
  const showChatBubbles = displayMode === "text" || displayMode === "both";

  return (
    <Card
      className="h-full flex flex-col overflow-hidden border-4"
      style={{
        backgroundColor: C.bodyBg,
        borderColor: C.bodyBorder,
        borderRadius: "32px",
      }}
    >
      {/* Display area */}
      <div className="flex flex-1 flex-col overflow-hidden relative min-h-0">
        <StatusBar displayMode={displayMode} ttsModelIdx={ttsModelIdx} />

        {showSpeakerDots && !showChatBubbles ? (
          <SpeakerDots isPlaying={isPlaying} />
        ) : (
          <ChatMessages
            messages={messages}
            liveText={liveText}
            btnState={btnState}
            messagesEndRef={messagesEndRef}
          />
        )}
      </div>

      {/* Divider */}
      <div
        className="h-px shrink-0 mx-6"
        style={{ backgroundColor: C.divider }}
      />

      {/* Control area */}
      <div className="shrink-0 flex flex-col items-center gap-1 pt-3.5 pb-7">
        {/* Live text / status */}
        <div className="h-[18px] flex items-center justify-center">
          {liveText && (
            <span
              className="text-[11px]"
              style={{ color: C.textSecondary, letterSpacing: "0.08em" }}
            >
              {liveText}
            </span>
          )}
        </div>

        <RotaryDial
          position={dialPosition}
          btnState={btnState}
          displayMode={displayMode}
          ttsModelLabel={ttsModelLabel}
          onRotateLeft={handleRotateLeft}
          onRotateRight={handleRotateRight}
          onCenterPress={handleCenterPress}
          onCenterRelease={handleCenterRelease}
        />
      </div>
    </Card>
  );
}

// ─── Root Component ──────────────────────────────────────────────────────────

export default function WalkieApp() {
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
      className="h-dvh flex items-stretch justify-center p-3"
      style={{ backgroundColor: C.pageBg }}
    >
      <div className="w-full max-w-[430px] flex-1">
        {screen === "lock" ? (
          <UnlockScreen onUnlocked={handleUnlocked} />
        ) : (
          <ChatScreen token={token} />
        )}
      </div>
    </main>
  );
}
