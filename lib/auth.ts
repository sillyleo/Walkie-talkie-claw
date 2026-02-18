import crypto from "crypto";

const JWT_SECRET = process.env.JWT_SECRET || "walkie-default";

export function hashPassphrase(text: string): string {
  return crypto
    .createHash("sha256")
    .update(text.trim() + "openclaw-walkie-salt")
    .digest("hex");
}

export function createToken(): string {
  const payload = JSON.stringify({
    ts: Date.now(),
    exp: Date.now() + 4 * 3600000,
  });
  const sig = crypto
    .createHmac("sha256", JWT_SECRET)
    .update(payload)
    .digest("hex");
  return Buffer.from(payload).toString("base64") + "." + sig;
}

export function verifyToken(token: string): boolean {
  try {
    const [b64, sig] = token.split(".");
    const payload = Buffer.from(b64, "base64").toString();
    const expected = crypto
      .createHmac("sha256", JWT_SECRET)
      .update(payload)
      .digest("hex");
    if (sig !== expected) return false;
    const { exp } = JSON.parse(payload);
    return Date.now() < exp;
  } catch {
    return false;
  }
}
