export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { text, voice, model } = req.body || {};
  if (!text) return res.status(400).json({ error: 'No text' });

  try {
    // Route based on model
    if (model && model.startsWith('gemini/')) {
      return await handleGeminiTTS(req, res, text, model);
    } else {
      return await handleOpenAITTS(req, res, text, voice, model);
    }
  } catch (e) {
    console.error('TTS error:', e);
    res.status(500).json({ error: e.message });
  }
}

async function handleOpenAITTS(req, res, text, voice, model) {
  const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
  if (!OPENAI_API_KEY) return res.status(500).json({ error: 'Missing OpenAI key' });

  // model comes as "openai/tts-1" or "openai/tts-1-hd"
  const openaiModel = model ? model.replace('openai/', '') : 'tts-1';

  const r = await fetch('https://api.openai.com/v1/audio/speech', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: openaiModel,
      input: text,
      voice: voice || 'shimmer',
      response_format: 'mp3'
    })
  });

  if (!r.ok) {
    const err = await r.text();
    console.error('OpenAI TTS error:', r.status, err);
    return res.status(500).json({ error: `TTS error ${r.status}` });
  }

  res.setHeader('Content-Type', 'audio/mpeg');
  res.setHeader('Cache-Control', 'public, max-age=86400');
  const buf = Buffer.from(await r.arrayBuffer());
  res.send(buf);
}

async function handleGeminiTTS(req, res, text, model) {
  const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
  if (!GEMINI_API_KEY) return res.status(500).json({ error: 'Missing Gemini key' });

  const geminiModel = model.replace('gemini/', '');

  // Use Gemini's generateContent with audio response
  const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${GEMINI_API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{
        parts: [{ text: `Please read the following text aloud in a natural, conversational tone. Read it in the same language as the text. Only read the text, do not add anything:\n\n${text}` }]
      }],
      generationConfig: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: {
              voiceName: 'Kore'
            }
          }
        }
      }
    })
  });

  if (!r.ok) {
    const err = await r.text();
    console.error('Gemini TTS error:', r.status, err);
    return res.status(500).json({ error: `Gemini TTS error ${r.status}` });
  }

  const data = await r.json();
  
  // Extract audio from Gemini response
  const parts = data?.candidates?.[0]?.content?.parts || [];
  const audioPart = parts.find(p => p.inlineData && p.inlineData.mimeType?.startsWith('audio/'));
  
  if (!audioPart) {
    console.error('No audio in Gemini response:', JSON.stringify(data).slice(0, 500));
    return res.status(500).json({ error: 'No audio in Gemini response' });
  }

  const audioBuffer = Buffer.from(audioPart.inlineData.data, 'base64');
  res.setHeader('Content-Type', audioPart.inlineData.mimeType);
  res.setHeader('Cache-Control', 'public, max-age=86400');
  res.send(audioBuffer);
}
