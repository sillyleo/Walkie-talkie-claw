"use client";

import { type RefObject } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { type Message, type BtnState, C } from "@/lib/types";

interface ChatMessagesProps {
  messages: Message[];
  liveText: string;
  btnState: BtnState;
  messagesEndRef: RefObject<HTMLDivElement | null>;
}

function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === "user";

  return (
    <div
      className="msg-enter flex"
      style={{
        alignSelf: isUser ? "flex-end" : "flex-start",
        maxWidth: "85%",
      }}
    >
      <div
        className="text-sm leading-relaxed break-words"
        style={{
          padding: "10px 14px",
          borderRadius: isUser ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
          backgroundColor: isUser ? C.bubbleUser : C.bubbleBot,
          color: isUser ? C.bubbleUserText : C.bubbleBotText,
          border: isUser ? "none" : `1px solid ${C.bubbleBotBorder}`,
        }}
      >
        {message.text}
      </div>
    </div>
  );
}

export function ChatMessages({
  messages,
  liveText,
  btnState,
  messagesEndRef,
}: ChatMessagesProps) {
  return (
    <ScrollArea className="flex-1 min-h-0">
      <div className="flex flex-col gap-2.5 px-4 pt-2 pb-4">
        {messages.length === 0 && (
          <div className="flex flex-1 items-center justify-center min-h-[120px]">
            <p
              className="text-[13px]"
              style={{ color: C.textMuted, letterSpacing: "0.12em" }}
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
            className="msg-enter text-[13px] italic self-end"
            style={{
              padding: "10px 14px",
              borderRadius: "16px 16px 4px 16px",
              color: C.textSecondary,
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
    </ScrollArea>
  );
}
