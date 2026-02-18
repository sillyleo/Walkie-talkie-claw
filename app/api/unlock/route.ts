import { NextRequest, NextResponse } from "next/server";
import { createToken } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const accessCode = process.env.ACCESS_CODE;
  if (!accessCode) {
    return NextResponse.json({ error: "尚未設定 ACCESS_CODE" }, { status: 500 });
  }

  const body = await req.json().catch(() => ({}));
  const { passphrase } = body;

  if (!passphrase) {
    return NextResponse.json({ error: "請輸入密碼" }, { status: 400 });
  }

  if (passphrase.trim() !== accessCode) {
    return NextResponse.json({ error: "密碼錯誤" }, { status: 401 });
  }

  const token = createToken();
  return NextResponse.json({ ok: true, token });
}
