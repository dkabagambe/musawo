/**
 * TOTP helpers - wraps `otpauth` library.
 * The secret is stored encrypted in the DB using AES-256-GCM.
 * Encryption key comes from TOTP_ENCRYPTION_KEY env var (32-byte hex).
 */

import * as crypto from "crypto";

// ─── Encryption helpers ────────────────────────────────────────────────────

function getEncKey(): Buffer {
  const hex = process.env.TOTP_ENCRYPTION_KEY;
  if (!hex || hex.length !== 64) {
    throw new Error("TOTP_ENCRYPTION_KEY must be a 64-char hex string (32 bytes)");
  }
  return Buffer.from(hex, "hex");
}

export function encryptSecret(plaintext: string): string {
  const key = getEncKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  // Format: iv(24 hex) + tag(32 hex) + ciphertext(hex)
  return iv.toString("hex") + tag.toString("hex") + encrypted.toString("hex");
}

export function decryptSecret(ciphertext: string): string {
  const key = getEncKey();
  const iv = Buffer.from(ciphertext.slice(0, 24), "hex");
  const tag = Buffer.from(ciphertext.slice(24, 56), "hex");
  const data = Buffer.from(ciphertext.slice(56), "hex");
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  return decipher.update(data) + decipher.final("utf8");
}

// ─── TOTP generation & verification ───────────────────────────────────────

/**
 * Generate a new TOTP secret and return the base32 representation.
 * Store the return value (encrypted) in user.totpSecret.
 */
export async function generateTotpSecret(label: string, issuer = "Musawo Training Center"): Promise<{
  secret: string;       // base32 secret to store (encrypt before saving)
  otpauthUrl: string;   // for QR code generation
}> {
  // Dynamic import to avoid edge runtime issues
  const { TOTP, Secret } = await import("otpauth");
  const totp = new TOTP({
    issuer,
    label,
    algorithm: "SHA1",
    digits: 6,
    period: 30,
    secret: new Secret({ size: 20 }),
  });
  return {
    secret: totp.secret.base32,
    otpauthUrl: totp.toString(),
  };
}

/**
 * Verify a 6-digit TOTP code against a stored base32 secret.
 * Allows ±1 period window (30 s drift tolerance).
 */
export async function verifyTotp(base32Secret: string, code: string): Promise<boolean> {
  const { TOTP, Secret } = await import("otpauth");
  const totp = new TOTP({
    algorithm: "SHA1",
    digits: 6,
    period: 30,
    secret: Secret.fromBase32(base32Secret),
  });
  const delta = totp.validate({ token: code.replace(/\s/g, ""), window: 1 });
  return delta !== null;
}

/**
 * Generate QR-code data URL for the otpauth URI.
 * Returns a base64 PNG data URL.
 */
export async function generateQrDataUrl(otpauthUrl: string): Promise<string> {
  const QRCode = await import("qrcode");
  return QRCode.toDataURL(otpauthUrl);
}
