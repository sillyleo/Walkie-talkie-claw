"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { C, apiFetch } from "@/lib/types";

const LOCK_DOT_COLS = 10;
const LOCK_DOT_ROWS = 6;

interface UnlockScreenProps {
  onUnlocked: (token: string) => void;
}

export function UnlockScreen({ onUnlocked }: UnlockScreenProps) {
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

  const canSubmit = passphrase.trim() && ready && !loading;

  return (
    <Card
      className="h-full flex flex-col items-center overflow-hidden border-4"
      style={{
        backgroundColor: C.bodyBg,
        borderColor: C.bodyBorder,
        borderRadius: "32px",
      }}
    >
      {/* Speaker dots - decorative */}
      <div className="flex flex-1 items-center justify-center w-full px-6 pt-7 pb-5">
        <div
          className="grid w-full max-w-[300px] opacity-35"
          style={{
            gridTemplateColumns: `repeat(${LOCK_DOT_COLS}, 1fr)`,
            gap: "8px",
          }}
        >
          {Array.from({ length: LOCK_DOT_ROWS * LOCK_DOT_COLS }).map((_, i) => (
            <div
              key={i}
              className="aspect-square rounded-full"
              style={{ backgroundColor: C.dot }}
            />
          ))}
        </div>
      </div>

      {/* Divider */}
      <div
        className="h-px"
        style={{
          backgroundColor: C.divider,
          width: "calc(100% - 48px)",
        }}
      />

      {/* Lock control area */}
      <div className="shrink-0 flex flex-col items-center gap-5 w-full px-8 pt-8 pb-12">
        {/* Status label */}
        <span
          className="text-[11px] uppercase font-mono font-medium"
          style={{
            letterSpacing: "0.22em",
            color: C.textMuted,
          }}
        >
          {!ready ? "初始化…" : "輸入密碼解鎖"}
        </span>

        {/* Password field */}
        <Input
          ref={inputRef}
          type="password"
          value={passphrase}
          onChange={(e) => setPassphrase(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          placeholder="  ·  ·  ·  ·  ·"
          disabled={!ready || loading}
          autoComplete="off"
          className="w-full max-w-[260px] h-[50px] text-center text-[22px] font-mono border-[1.5px] focus-visible:ring-1"
          style={{
            letterSpacing: "0.5em",
            backgroundColor: C.pageBg,
            borderColor: C.centerBorder,
            borderRadius: "12px",
            color: C.textPrimary,
          }}
        />

        {/* Error */}
        {error && (
          <span
            className="text-xs"
            style={{ color: C.recordRed, letterSpacing: "0.08em" }}
          >
            {error}
          </span>
        )}

        {/* Unlock button - large circle */}
        <Button
          onClick={submit}
          disabled={!canSubmit}
          className="rounded-full w-[86px] h-[86px] text-[11px] uppercase border-none transition-all duration-200"
          style={{
            letterSpacing: "0.2em",
            backgroundColor: canSubmit ? C.bodyBorder : C.dialBorder,
            color: C.bodyBg,
            cursor: canSubmit ? "pointer" : "default",
            boxShadow: canSubmit
              ? "0 4px 12px rgba(74,74,74,0.3)"
              : "none",
            fontFamily:
              "-apple-system, BlinkMacSystemFont, 'Helvetica Neue', sans-serif",
          }}
        >
          {loading ? "…" : "解鎖"}
        </Button>

        {/* Branding */}
        <span
          className="text-[10px] uppercase"
          style={{ letterSpacing: "0.4em", color: C.textMuted }}
        >
          walkie
        </span>
      </div>
    </Card>
  );
}
