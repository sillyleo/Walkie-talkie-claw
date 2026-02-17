const { verifyToken } = require('./_lib/auth');

const OPENCLAW_URL = process.env.OPENCLAW_GATEWAY_URL; // e.g. https://xxx.trycloudflare.com
const OPENCLAW_TOKEN = process.env.OPENCLAW_GATEWAY_TOKEN;
const WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL || '';

// Log user message to Discord via webhook (fire and forget)
function logUserToDiscord(text) {
  if (!WEBHOOK_URL) return;
  fetch(WEBHOOK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content: text, username: 'Leo (對講機)' })
  }).catch(() => {});
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  
  const { text, mode, token, sessionId } = req.body || {};
  if (!verifyToken(token)) return res.status(401).json({ error: '請重新解鎖' });
  if (!text) return res.status(400).json({ error: '沒有訊息' });
  
  if (!OPENCLAW_URL || !OPENCLAW_TOKEN) {
    return res.json({ reply: '未設定 OpenClaw Gateway 連線' });
  }

  // Log user message
  const prefix = mode === 'command' ? '🟢 ' : '';
  logUserToDiscord(prefix + text);

  try {
    const r = await fetch(`${OPENCLAW_URL}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENCLAW_TOKEN}`,
        'x-openclaw-agent-id': 'walkie'
      },
      body: JSON.stringify({
        model: 'openclaw:walkie',
        user: sessionId || 'walkie-web',
        messages: [{ role: 'user', content: text }]
      })
    });
    
    if (!r.ok) {
      const errText = await r.text();
      console.error('OpenClaw error:', r.status, errText);
      return res.json({ reply: `連線錯誤 (${r.status})` });
    }
    
    const data = await r.json();
    const reply = data.choices?.[0]?.message?.content || '（無回應）';
    
    res.json({ reply });
  } catch (e) {
    console.error('Chat error:', e);
    res.json({ reply: '連線失敗：' + e.message });
  }
}
