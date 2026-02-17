export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  
  const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
  if (!OPENAI_API_KEY) return res.status(500).json({ error: 'Missing OpenAI key' });

  // Expect raw audio body with content-type header
  const contentType = req.headers['content-type'] || 'audio/webm';
  
  // Read raw body
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(chunk);
  }
  const audioBuffer = Buffer.concat(chunks);
  
  if (audioBuffer.length < 100) {
    return res.json({ text: '' });
  }

  // Build multipart form data manually
  const boundary = '----WalkieFormBoundary' + Date.now();
  const ext = contentType.includes('wav') ? 'wav' : contentType.includes('mp4') ? 'mp4' : 'webm';
  
  const parts = [];
  // file field
  parts.push(Buffer.from(
    `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="audio.${ext}"\r\nContent-Type: ${contentType}\r\n\r\n`
  ));
  parts.push(audioBuffer);
  parts.push(Buffer.from('\r\n'));
  // model field
  parts.push(Buffer.from(
    `--${boundary}\r\nContent-Disposition: form-data; name="model"\r\n\r\nwhisper-1\r\n`
  ));
  // language field
  parts.push(Buffer.from(
    `--${boundary}\r\nContent-Disposition: form-data; name="language"\r\n\r\nzh\r\n`
  ));
  parts.push(Buffer.from(`--${boundary}--\r\n`));
  
  const body = Buffer.concat(parts);

  try {
    const r = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': `multipart/form-data; boundary=${boundary}`
      },
      body
    });
    
    if (!r.ok) {
      const err = await r.text();
      console.error('Whisper error:', r.status, err);
      return res.json({ text: '', error: `Whisper error ${r.status}` });
    }
    
    const data = await r.json();
    res.json({ text: data.text || '' });
  } catch (e) {
    console.error('Transcribe error:', e);
    res.json({ text: '', error: e.message });
  }
}

export const config = {
  api: { bodyParser: false }
};
