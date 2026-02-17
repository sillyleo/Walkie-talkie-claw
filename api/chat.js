const { verifyToken } = require('./_lib/auth');

const WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL || '';
const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN || '';
const CHANNEL_ID = '1473259736731226115';
const BOT_USER_ID = process.env.DISCORD_BOT_USER_ID || '';

async function sendWebhook(text, mode) {
  const prefix = mode === 'command' ? '🟢 [指令] ' : '';
  const r = await fetch(WEBHOOK_URL + '?wait=true', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content: prefix + text, username: 'Leo (對講機)' })
  });
  return r.json();
}

async function pollReply(afterId, maxWait = 30000) {
  const start = Date.now();
  while (Date.now() - start < maxWait) {
    await new Promise(r => setTimeout(r, 1500));
    try {
      const r = await fetch(`https://discord.com/api/v10/channels/${CHANNEL_ID}/messages?after=${afterId}&limit=5`, {
        headers: { 'Authorization': `Bot ${BOT_TOKEN}` }
      });
      const msgs = await r.json();
      if (Array.isArray(msgs)) {
        // Find a message from the bot (not webhook)
        const botMsg = msgs.find(m => m.author && m.author.bot && m.author.id !== '1472078444945735710' && m.webhook_id === undefined);
        if (botMsg) return botMsg.content;
      }
    } catch {}
  }
  return null;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  
  const { text, mode, token } = req.body || {};
  if (!verifyToken(token)) return res.status(401).json({ error: '請重新解鎖' });
  if (!text) return res.status(400).json({ error: '沒有訊息' });
  
  if (!WEBHOOK_URL) return res.json({ reply: '未設定 DISCORD_WEBHOOK_URL' });
  if (!BOT_TOKEN) return res.json({ reply: '未設定 DISCORD_BOT_TOKEN' });
  
  try {
    // Send user message via webhook
    const sent = await sendWebhook(text, mode);
    if (!sent.id) return res.json({ reply: '發送失敗' });
    
    // Poll for bot reply
    const reply = await pollReply(sent.id);
    if (reply) {
      res.json({ reply });
    } else {
      res.json({ reply: '（等待超時，請稍後再試）' });
    }
  } catch (e) {
    res.json({ reply: '錯誤：' + e.message });
  }
}
