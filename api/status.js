module.exports = (req, res) => {
  res.json({ hasPassphrase: !!process.env.PASSPHRASE_HASH });
};
