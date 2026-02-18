import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
  if (!OPENAI_API_KEY) {
    return NextResponse.json({ error: "Missing OpenAI key" }, { status: 500 });
  }

  const contentType = req.headers.get("content-type") || "audio/webm";

  // Read raw body
  const audioBuffer = Buffer.from(await req.arrayBuffer());

  if (audioBuffer.length < 100) {
    return NextResponse.json({ text: "" });
  }

  // Build multipart form data
  const boundary = "----WalkieFormBoundary" + Date.now();
  const ext = contentType.includes("wav")
    ? "wav"
    : contentType.includes("mp4")
    ? "mp4"
    : "webm";

  const parts: Buffer[] = [];
  parts.push(
    Buffer.from(
      `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="audio.${ext}"\r\nContent-Type: ${contentType}\r\n\r\n`
    )
  );
  parts.push(audioBuffer);
  parts.push(Buffer.from("\r\n"));
  parts.push(
    Buffer.from(
      `--${boundary}\r\nContent-Disposition: form-data; name="model"\r\n\r\nwhisper-1\r\n`
    )
  );
  parts.push(
    Buffer.from(
      `--${boundary}\r\nContent-Disposition: form-data; name="language"\r\n\r\nzh\r\n`
    )
  );
  parts.push(Buffer.from(`--${boundary}--\r\n`));

  const body = Buffer.concat(parts);

  try {
    const r = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": `multipart/form-data; boundary=${boundary}`,
      },
      body,
    });

    if (!r.ok) {
      const err = await r.text();
      console.error("Whisper error:", r.status, err);
      return NextResponse.json({
        text: "",
        error: `Whisper error ${r.status}`,
      });
    }

    const data = await r.json();
    return NextResponse.json({ text: data.text || "" });
  } catch (e) {
    console.error("Transcribe error:", e);
    return NextResponse.json({
      text: "",
      error: e instanceof Error ? e.message : String(e),
    });
  }
}
