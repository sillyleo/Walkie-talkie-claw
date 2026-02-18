import { NextRequest, NextResponse } from "next/server";
import { hashPassphrase, createToken } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const storedHash = process.env.PASSPHRASE_HASH;
  if (!storedHash) {
    return NextResponse.json({ error: "尚未設定密語" }, { status: 400 });
  }

  const body = await req.json().catch(() => ({}));
  const { passphrase } = body;

  if (!passphrase) {
    return NextResponse.json({ error: "請說出密語" }, { status: 400 });
  }

  if (hashPassphrase(passphrase) !== storedHash) {
    return NextResponse.json({ error: "密語錯誤" }, { status: 401 });
  }

  const token = createToken();
  return NextResponse.json({ ok: true, token });
}
