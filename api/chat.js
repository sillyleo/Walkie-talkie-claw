const { verifyToken } = require('./_lib/auth');

const SYSTEM_PROMPT = `你是一個語音對講機助手。用簡潔的口語回答，像對講機對話一樣。
回答保持簡短（1-3句），除非用戶明確要求詳細說明。
用繁體中文回答。`;

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  
  const { text, mode, token } = req.body || {};
  if (!verifyToken(token)) return res.status(401).json({ error: '請重新解鎖' });
  if (!text) return res.status(400).json({ error: '沒有訊息' });
  
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return res.json({ reply: '未設定 OPENAI_API_KEY' });
  
  const systemMsg = mode === 'command' 
    ? SYSTEM_PROMPT + '\n\n⚠️ 指令模式：用戶已通過驗證，可以執行指令。如果用戶要求查詢資料或執行操作，盡力協助。'
    : SYSTEM_PROMPT;
  
  try {
    const resp = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemMsg },
          { role: 'user', content: text }
        ],
        max_tokens: 300,
        temperature: 0.7
      })
    });
    
    const data = await resp.json();
    const reply = data.choices?.[0]?.message?.content || '（無回應）';
    res.json({ reply });
  } catch (e) {
    res.json({ reply: '連線錯誤：' + e.message });
  }
};
