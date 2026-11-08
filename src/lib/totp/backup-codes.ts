/**
 * TOTP backup codes.
 *
 * Backup codes are 10 single-use alphanumeric codes (8 chars each) generated
 * at 2FA setup time. They are shown once, hashed with argon2, and stored
 * encrypted in user.totpBackupCodes as a JSON array.
 *
 * Format stored (after encryption):
 *   JSON: Array<{ hash: string; usedAt: string | null }>
 *
 * The outer JSON is then AES-256-GCM encrypted using the same
 * TOTP_ENCRYPTION_KEY as the TOTP secret, so DB leaks do not expose codes.
 */

import { randomBytes } from "crypto";
import { hash as argon2Hash, verify as argon2Verify } from "argon2";
import { encryptSecret, decryptSecret } from "./index";

const ARGON2_OPTIONS = {
  type: 2 as const,  // argon2id
  memoryCost: 65536,
  timeCost: 2,
  parallelism: 1,
};

export interface BackupCodeRecord {
  hash:   string;
  usedAt: string | null; // ISO timestamp or null
}

/** Generate `count` random 8-character backup codes. */
function generateRawCode(): string {
  // 5 bytes -> 10 hex chars, take 8 -> readable and unambiguous
  return randomBytes(4).toString("hex").toUpperCase();
}

/**
 * Generate backup codes, hash them, and return:
 *   - plainCodes: the raw codes to show to the user (ONCE)
 *   - encryptedJson: the encrypted JSON to store in user.totpBackupCodes
 */
export async function generateBackupCodes(count: number): Promise<{
  plainCodes:    string[];
  encryptedJson: string;
}> {
  const plainCodes = Array.from({ length: count }, generateRawCode);
  const records: BackupCodeRecord[] = await Promise.all(
    plainCodes.map(async (code) => ({
      hash:   await argon2Hash(code, ARGON2_OPTIONS),
      usedAt: null,
    }))
  );
  const json = JSON.stringify(records);
  return {
    plainCodes,
    encryptedJson: encryptSecret(json),
  };
}

/**
 * Try to redeem a backup code. Returns true if a valid unused code was found
 * and marks it as used. Returns false if no matching unused code exists.
 *
 * Mutates the stored codes by marking the matched one used; the caller must
 * persist the returned updatedEncryptedJson.
 */
export async function redeemBackupCode(
  encryptedJson: string,
  candidateCode: string,
): Promise<{ redeemed: boolean; updatedEncryptedJson: string }> {
  let records: BackupCodeRecord[];
  try {
    records = JSON.parse(decryptSecret(encryptedJson)) as BackupCodeRecord[];
  } catch {
    return { redeemed: false, updatedEncryptedJson: encryptedJson };
  }

  const normalized = candidateCode.trim().toUpperCase();
  let redeemed = false;

  const updated = await Promise.all(
    records.map(async (rec) => {
      if (!redeemed && rec.usedAt === null) {
        try {
          const match = await argon2Verify(rec.hash, normalized);
          if (match) {
            redeemed = true;
            return { ...rec, usedAt: new Date().toISOString() };
          }
        } catch {
          // argon2 verify error -- skip
        }
      }
      return rec;
    })
  );

  return {
    redeemed,
    updatedEncryptedJson: encryptSecret(JSON.stringify(updated)),
  };
}

/** Encrypt a JSON string using the TOTP key (reuses encryptSecret). */
export function encryptBackupCodes(json: string): string {
  return encryptSecret(json);
}

/** Decrypt backup codes JSON string. */
export function decryptBackupCodes(encrypted: string): BackupCodeRecord[] {
  return JSON.parse(decryptSecret(encrypted)) as BackupCodeRecord[];
}
