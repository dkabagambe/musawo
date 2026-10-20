/**
 * authorize.test.ts
 *
 * Verifies that all demo accounts can sign in through the SAME logic
 * used by authorize() in src/lib/auth/index.ts:
 *
 *  1. User found in DB by email
 *  2. User is not SUSPENDED
 *  3. Password "Demo1234!" verifies against the stored hash
 *  4. TOTP gate: only blocks when totpEnabled=true AND totpSecret is set
 *
 * Does NOT need a running Next.js server — calls the real DB and the
 * real verifyPassword function directly.
 *
 * Run:  npm test  (or npx vitest run src/tests/authorize.test.ts)
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { PrismaClient } from "@prisma/client";
import { verifyPassword } from "@/lib/auth/password";

const db = new PrismaClient();

const DEMO_PASSWORD = "Demo1234!";

/**
 * All accounts seeded by prisma/seed.ts.
 * If you add more demo accounts, add them here too.
 */
const DEMO_EMAILS = [
  // Staff -- matching prisma/seed.ts mkStaff calls
  "ceo@mtc.ac.ug",
  "deputy@mtc.ac.ug",
  "board@mtc.ac.ug",
  "principal@mtc.ac.ug",
  "deputyprincipal@mtc.ac.ug",
  "registrar@mtc.ac.ug",
  "finance@mtc.ac.ug",
  "hr@mtc.ac.ug",
  "auditor@mtc.ac.ug",
  "itadmin@mtc.ac.ug",
  "tutor@mtc.ac.ug",
  "tutor2@mtc.ac.ug",
  "assistant@mtc.ac.ug",
  // Students
  "student.new@example.com",
  "student.pending@example.com",
  "student.25@example.com",
  "student.50@example.com",
  "student.75@example.com",
  "student.full@example.com",
  "student.overdue@example.com",
  "student.completed@example.com",
  // Special-state students (cannot log in until they accept the invite)
  // "student.waiting@example.com",  - PENDING_ACCEPTANCE, login blocked
  // "student.disputed@example.com", - DETAILS_DISPUTED, login blocked
];

afterAll(() => db.$disconnect());

/**
 * Replicates the exact authorize() flow from src/lib/auth/index.ts.
 * Returns null with a reason string, or the user object on success.
 */
async function simulateAuthorize(
  identifier: string,
  password: string,
  totpCode = ""
): Promise<{ ok: true; userId: string } | { ok: false; reason: string }> {
  const user = await db.user.findFirst({
    where: { OR: [{ email: identifier }, { phone: identifier }] },
  });

  if (!user || !user.passwordHash) return { ok: false, reason: "user not found or no hash" };
  if (user.status === "SUSPENDED") return { ok: false, reason: "SUSPENDED" };

  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) return { ok: false, reason: "password mismatch" };

  // TOTP gate — same logic as the fixed authorize():
  // only blocks when totpEnabled=true AND a secret is stored
  if (user.totpEnabled && user.totpSecret) {
    if (!totpCode) return { ok: false, reason: "TOTP required (totpEnabled=true)" };
    // In a real test we'd verify the code; here we just prove the
    // seeded accounts (totpEnabled=false) are never blocked by this gate
    return { ok: false, reason: "TOTP code needed (not provided in test)" };
  }

  return { ok: true, userId: user.id };
}

// argon2 is intentionally slow; allow up to 15 s per check (first call pays JIT warm-up cost)
const ARGON2_TIMEOUT_MS = 15_000;

describe("authorize() — all demo accounts sign in with Demo1234!", () => {
  it.each(DEMO_EMAILS)("signs in %s", async (email) => {
    const result = await simulateAuthorize(email, DEMO_PASSWORD);
    expect(
      result,
      `${email} authorize failed: ${!result.ok ? result.reason : ""}`,
    ).toMatchObject({ ok: true });
  }, ARGON2_TIMEOUT_MS);

  it("rejects a wrong password", async () => {
    const result = await simulateAuthorize("ceo@mtc.ac.ug", "WrongPass1!");
    expect(result).toMatchObject({ ok: false, reason: "password mismatch" });
  });

  it("rejects a non-existent user", async () => {
    const result = await simulateAuthorize("nobody@example.com", DEMO_PASSWORD);
    expect(result).toMatchObject({ ok: false, reason: "user not found or no hash" });
  });

  it("rejects PENDING_ACCEPTANCE users (login impossible before acceptance)", async () => {
    const result = await simulateAuthorize("student.waiting@example.com", DEMO_PASSWORD);
    // These accounts have no passwordHash in the seed (status is PENDING_ACCEPTANCE)
    // so they fail at the "user not found or no hash" check
    expect(result.ok).toBe(false);
  });

  it("rejects DETAILS_DISPUTED users (login blocked until Registrar resolves)", async () => {
    const result = await simulateAuthorize("student.disputed@example.com", DEMO_PASSWORD);
    expect(result.ok).toBe(false);
  });
});
