import { NextRequest, NextResponse } from "next/server";
import { hashPassphrase, createToken } from "@/lib/auth";

export async function POST(req: NextRequest) {
  if (process.env.PASSPHRASE_HASH) {
    return NextResponse.json({ error: "密語已設定" }, { status: 400 });
  }

  const body = await req.json().catch(() => ({}));
  const { passphrase } = body;

  if (!passphrase || passphrase.trim().length < 2) {
    return NextResponse.json({ error: "密語太短" }, { status: 400 });
  }

  const hash = hashPassphrase(passphrase);
  process.env.PASSPHRASE_HASH = hash;
  const token = createToken();

  return NextResponse.json({
    ok: true,
    token,
    hash,
    note: "請將此 hash 設為 Vercel 環境變數 PASSPHRASE_HASH",
  });
}
