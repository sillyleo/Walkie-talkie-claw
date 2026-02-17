const { verifyToken } = require('./_lib/auth');

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  
  const { text, mode, token } = req.body || {};
  if (!verifyToken(token)) return res.status(401).json({ error: '請重新解鎖' });
  if (!text) return res.status(400).json({ error: '沒有訊息' });
  
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return res.json({ reply: '未設定 OPENAI_API_KEY' });
  
  const sys = `你是語音對講機助手。簡潔口語回答，1-3句。繁體中文。${mode === 'command' ? '\n指令模式：用戶已驗證，可執行指令。' : ''}`;
  
  try {
    const r = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
      body: JSON.stringify({ model: 'gpt-4o-mini', messages: [{ role: 'system', content: sys }, { role: 'user', content: text }], max_tokens: 300 })
    });
    const data = await r.json();
    res.json({ reply: data.choices?.[0]?.message?.content || '（無回應）' });
  } catch (e) {
    res.json({ reply: '錯誤：' + e.message });
  }
}
