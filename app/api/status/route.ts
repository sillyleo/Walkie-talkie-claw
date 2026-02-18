import { NextResponse } from "next/server";

export function GET() {
  return NextResponse.json({ hasPassphrase: !!process.env.ACCESS_CODE });
}

export function POST() {
  return NextResponse.json({ hasPassphrase: !!process.env.ACCESS_CODE });
}
