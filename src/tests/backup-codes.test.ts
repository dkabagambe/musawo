/**
 * Tests for TOTP backup codes (item 4 of Section 1b).
 *
 * Covers:
 *   - generateBackupCodes(10) returns 10 unique 8-char codes and encrypted JSON
 *   - redeemBackupCode accepts a valid code and marks it used
 *   - redeemBackupCode rejects an invalid code
 *   - redeemed codes cannot be reused
 *   - decryptBackupCodes returns the stored records
 */

import { describe, it, expect, beforeAll } from "vitest";
import {
  generateBackupCodes,
  redeemBackupCode,
  decryptBackupCodes,
} from "@/lib/totp/backup-codes";

// Set the encryption key for tests (64 hex chars = 32 bytes)
beforeAll(() => {
  process.env.TOTP_ENCRYPTION_KEY =
    process.env.TOTP_ENCRYPTION_KEY ||
    "a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2";
});

// argon2 hashing is intentionally slow (65 536 KiB cost).
// Each test that calls generateBackupCodes or redeemBackupCode gets
// a 30-second timeout so they pass reliably in CI alongside other tests.
const ARGON_TIMEOUT = 30_000;

describe("Backup codes (item 4)", () => {
  it("generateBackupCodes(10) returns exactly 10 unique 8-char codes", { timeout: ARGON_TIMEOUT }, async () => {
    const { plainCodes, encryptedJson } = await generateBackupCodes(10);

    // 10 codes
    expect(plainCodes).toHaveLength(10);

    // each is 8 hex chars uppercase
    for (const code of plainCodes) {
      expect(code).toMatch(/^[0-9A-F]{8}$/);
    }

    // all unique
    const unique = new Set(plainCodes);
    expect(unique.size).toBe(10);

    // encryptedJson is a non-empty string (not plaintext)
    expect(encryptedJson).toBeTruthy();
    expect(encryptedJson).not.toContain(plainCodes[0]);
  });

  it("encrypted JSON decrypts to 10 records with hash and null usedAt", { timeout: ARGON_TIMEOUT }, async () => {
    const { encryptedJson } = await generateBackupCodes(10);
    const records = decryptBackupCodes(encryptedJson);

    expect(records).toHaveLength(10);
    for (const rec of records) {
      expect(rec.hash).toBeTruthy();
      expect(rec.hash.length).toBeGreaterThan(20); // argon2 hash
      expect(rec.usedAt).toBeNull();
    }
  });

  it("redeemBackupCode accepts a valid code and marks it used", { timeout: ARGON_TIMEOUT }, async () => {
    const { plainCodes, encryptedJson } = await generateBackupCodes(10);

    const result = await redeemBackupCode(encryptedJson, plainCodes[3]);

    expect(result.redeemed).toBe(true);

    // Verify the code is now marked used
    const records = decryptBackupCodes(result.updatedEncryptedJson);
    expect(records[3].usedAt).not.toBeNull();
    // Other codes remain unused
    expect(records[0].usedAt).toBeNull();
    expect(records[5].usedAt).toBeNull();
  });

  it("redeemBackupCode rejects an invalid code", { timeout: ARGON_TIMEOUT }, async () => {
    const { encryptedJson } = await generateBackupCodes(10);

    const result = await redeemBackupCode(encryptedJson, "ZZZZZZZZ");

    expect(result.redeemed).toBe(false);
  });

  it("a redeemed code cannot be reused", { timeout: ARGON_TIMEOUT }, async () => {
    const { plainCodes, encryptedJson } = await generateBackupCodes(10);

    // First use: succeeds
    const r1 = await redeemBackupCode(encryptedJson, plainCodes[0]);
    expect(r1.redeemed).toBe(true);

    // Second use of same code: must fail
    const r2 = await redeemBackupCode(r1.updatedEncryptedJson, plainCodes[0]);
    expect(r2.redeemed).toBe(false);
  });

  it("case-insensitive: lowercase code matches uppercase stored code", { timeout: ARGON_TIMEOUT }, async () => {
    const { plainCodes, encryptedJson } = await generateBackupCodes(10);

    const result = await redeemBackupCode(
      encryptedJson,
      plainCodes[0].toLowerCase(),
    );
    expect(result.redeemed).toBe(true);
  });
});
