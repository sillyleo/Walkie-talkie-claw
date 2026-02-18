export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  
  const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
  if (!OPENAI_API_KEY) return res.status(500).json({ error: 'Missing OpenAI key' });

  const { text, voice } = req.body || {};
  if (!text) return res.status(400).json({ error: 'No text' });

  try {
    const r = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'tts-1',
        input: text,
        voice: voice || 'shimmer',
        response_format: 'mp3'
      })
    });

    if (!r.ok) {
      const err = await r.text();
      console.error('TTS error:', r.status, err);
      return res.status(500).json({ error: `TTS error ${r.status}` });
    }

    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    const buf = Buffer.from(await r.arrayBuffer());
    res.send(buf);
  } catch (e) {
    console.error('TTS error:', e);
    res.status(500).json({ error: e.message });
  }
}
