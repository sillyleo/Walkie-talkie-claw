const crypto = require('crypto');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'walkie-talkie-default-secret-change-me';

function hashPassphrase(text) {
  return crypto.scryptSync(text.trim(), 'openclaw-walkie-salt', 64).toString('hex');
}

function createToken() {
  return jwt.sign({ ts: Date.now() }, JWT_SECRET, { expiresIn: '4h' });
}

function verifyToken(token) {
  try {
    jwt.verify(token, JWT_SECRET);
    return true;
  } catch { return false; }
}

module.exports = { hashPassphrase, createToken, verifyToken };
