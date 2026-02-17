export default function handler(req, res) {
  res.json({ hasPassphrase: !!process.env.PASSPHRASE_HASH });
}
