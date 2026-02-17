const { verifyToken } = require('./_lib/auth');

const WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL || '';
const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN || '';
const DISCORD_CHANNEL_ID = '1473259736731226115';

const SYSTEM_PROMPT = `你是一個語音對講機助手。用簡潔口語回答，像對講機對話一樣。
回答保持簡短（1-3句），除非用戶要求詳細。繁體中文。輕鬆友善。`;

// Log to Discord (fire and forget)
function logToDiscord(text, asBot = false) {
  try {
    if (asBot && DISCORD_BOT_TOKEN) {
      fetch(`https://discord.com/api/v10/channels/${DISCORD_CHANNEL_ID}/messages`, {
        method: 'POST',
        headers: { 'Authorization': `Bot ${DISCORD_BOT_TOKEN}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: text })
      }).catch(() => {});
    } else if (WEBHOOK_URL) {
      fetch(WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: text, username: 'Leo (對講機)' })
      }).catch(() => {});
    }
  } catch {}
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  
  const { text, mode, token } = req.body || {};
  if (!verifyToken(token)) return res.status(401).json({ error: '請重新解鎖' });
  if (!text) return res.status(400).json({ error: '沒有訊息' });
  
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return res.json({ reply: '未設定 OPENAI_API_KEY' });

  // Log user message to Discord
  const prefix = mode === 'command' ? '🟢 ' : '';
  logToDiscord(prefix + text);

  const sys = mode === 'command' 
    ? SYSTEM_PROMPT + '\n指令模式：用戶已驗證，盡力協助。' 
    : SYSTEM_PROMPT;
  
  try {
    const r = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{ role: 'system', content: sys }, { role: 'user', content: text }],
        max_tokens: 300
      })
    });
    const data = await r.json();
    const reply = data.choices?.[0]?.message?.content || '（無回應）';
    
    // Log bot reply to Discord
    logToDiscord('🎙️ ' + reply, true);
    
    res.json({ reply });
  } catch (e) {
    res.json({ reply: '錯誤：' + e.message });
  }
}
