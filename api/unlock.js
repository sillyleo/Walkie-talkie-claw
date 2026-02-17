const { hashPassphrase, createToken } = require('./_lib/auth');

export default function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const storedHash = process.env.PASSPHRASE_HASH;
  if (!storedHash) return res.status(400).json({ error: '尚未設定密語' });
  
  const { passphrase } = req.body || {};
  if (!passphrase) return res.status(400).json({ error: '請說出密語' });
  if (hashPassphrase(passphrase) !== storedHash) return res.status(401).json({ error: '密語錯誤' });
  
  const token = createToken();
  res.json({ ok: true, token });
}
