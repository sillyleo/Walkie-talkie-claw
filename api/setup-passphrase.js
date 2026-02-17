const { hashPassphrase, createToken } = require('./_lib/auth');

module.exports = (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  
  // If PASSPHRASE_HASH is already set in env, can't setup again
  if (process.env.PASSPHRASE_HASH) {
    return res.status(400).json({ error: '密語已設定' });
  }
  
  const { passphrase } = req.body || {};
  if (!passphrase || passphrase.trim().length < 2) {
    return res.status(400).json({ error: '密語太短' });
  }
  
  const hash = hashPassphrase(passphrase);
  
  // Store in runtime env (persists for this function instance)
  // User MUST also set PASSPHRASE_HASH in Vercel env vars for persistence
  process.env.PASSPHRASE_HASH = hash;
  
  const token = createToken();
  res.json({ 
    ok: true, 
    token,
    hash,
    note: '請將此 hash 設為 Vercel 環境變數 PASSPHRASE_HASH 以永久保存'
  });
};
