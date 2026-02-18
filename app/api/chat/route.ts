import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";

const OPENCLAW_URL = process.env.OPENCLAW_GATEWAY_URL;
const OPENCLAW_TOKEN = process.env.OPENCLAW_GATEWAY_TOKEN;

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { text, token, sessionId } = body;

  if (!verifyToken(token)) {
    return NextResponse.json({ error: "請重新解鎖" }, { status: 401 });
  }

  if (!text) {
    return NextResponse.json({ error: "沒有訊息" }, { status: 400 });
  }

  if (!OPENCLAW_URL || !OPENCLAW_TOKEN) {
    return NextResponse.json({ reply: "未設定 OpenClaw Gateway 連線" });
  }

  try {
    const r = await fetch(`${OPENCLAW_URL}/v1/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENCLAW_TOKEN}`,
        "x-openclaw-agent-id": "walkie",
      },
      body: JSON.stringify({
        model: "openclaw:walkie",
        user: sessionId || "walkie-web",
        messages: [{ role: "user", content: text }],
      }),
    });

    if (!r.ok) {
      const errText = await r.text();
      console.error("OpenClaw error:", r.status, errText);
      return NextResponse.json({ reply: `連線錯誤 (${r.status})` });
    }

    const data = await r.json();
    const reply = data.choices?.[0]?.message?.content || "（無回應）";
    return NextResponse.json({ reply });
  } catch (e) {
    console.error("Chat error:", e);
    return NextResponse.json({
      reply: "連線失敗：" + (e instanceof Error ? e.message : String(e)),
    });
  }
}
