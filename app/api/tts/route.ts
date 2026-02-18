import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { text, voice, model } = body;

  if (!text) {
    return NextResponse.json({ error: "No text" }, { status: 400 });
  }

  try {
    if (model && model.startsWith("gemini/")) {
      return await handleGeminiTTS(text, model);
    } else {
      return await handleOpenAITTS(text, voice, model);
    }
  } catch (e) {
    console.error("TTS error:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    );
  }
}

async function handleOpenAITTS(
  text: string,
  voice: string,
  model: string
): Promise<NextResponse> {
  const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
  if (!OPENAI_API_KEY) {
    return NextResponse.json({ error: "Missing OpenAI key" }, { status: 500 });
  }

  const openaiModel = model ? model.replace("openai/", "") : "tts-1";

  const r = await fetch("https://api.openai.com/v1/audio/speech", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: openaiModel,
      input: text,
      voice: voice || "shimmer",
      response_format: "mp3",
    }),
  });

  if (!r.ok) {
    const err = await r.text();
    console.error("OpenAI TTS error:", r.status, err);
    return NextResponse.json(
      { error: `TTS error ${r.status}` },
      { status: 500 }
    );
  }

  const buf = Buffer.from(await r.arrayBuffer());
  return new NextResponse(buf, {
    headers: {
      "Content-Type": "audio/mpeg",
      "Cache-Control": "public, max-age=86400",
    },
  });
}

async function handleGeminiTTS(
  text: string,
  model: string
): Promise<NextResponse> {
  const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
  if (!GEMINI_API_KEY) {
    return NextResponse.json(
      { error: "Missing Gemini key" },
      { status: 500 }
    );
  }

  const geminiModel = model.replace("gemini/", "");

  const r = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: `Please read the following text aloud in a natural, conversational tone. Read it in the same language as the text. Only read the text, do not add anything:\n\n${text}`,
              },
            ],
          },
        ],
        generationConfig: {
          responseModalities: ["AUDIO"],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: {
                voiceName: "Kore",
              },
            },
          },
        },
      }),
    }
  );

  if (!r.ok) {
    const err = await r.text();
    console.error("Gemini TTS error:", r.status, err);
    return NextResponse.json(
      { error: `Gemini TTS error ${r.status}` },
      { status: 500 }
    );
  }

  const data = await r.json();
  const parts = data?.candidates?.[0]?.content?.parts || [];
  const audioPart = parts.find(
    (p: { inlineData?: { mimeType?: string; data: string } }) =>
      p.inlineData && p.inlineData.mimeType?.startsWith("audio/")
  );

  if (!audioPart) {
    console.error(
      "No audio in Gemini response:",
      JSON.stringify(data).slice(0, 500)
    );
    return NextResponse.json(
      { error: "No audio in Gemini response" },
      { status: 500 }
    );
  }

  const audioBuffer = Buffer.from(audioPart.inlineData.data, "base64");
  return new NextResponse(audioBuffer, {
    headers: {
      "Content-Type": audioPart.inlineData.mimeType,
      "Cache-Control": "public, max-age=86400",
    },
  });
}
