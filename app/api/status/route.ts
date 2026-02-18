import { NextResponse } from "next/server";

export function GET() {
  return NextResponse.json({ hasPassphrase: !!process.env.PASSPHRASE_HASH });
}

export function POST() {
  return NextResponse.json({ hasPassphrase: !!process.env.PASSPHRASE_HASH });
}
