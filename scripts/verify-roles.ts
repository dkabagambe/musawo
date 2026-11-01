#!/usr/bin/env ts-node
/**
 * scripts/verify-roles.ts  ->  npm run verify:roles
 *
 * Verifies that every seeded demo account can log in through the same credential
 * check the app uses (the authorize() body in src/lib/auth/index.ts), lands on
 * the correct home page for its role, and is denied a portal it must not reach.
 *
 * It uses the REAL helpers: argon2 verifyPassword from src/lib/auth/password,
 * getHomePathForRole from src/lib/auth/redirect, and canAccessPrefix/can from
 * src/lib/rbac. Only the credential lookup is mirrored here (the NextAuth
 * provider object is not importable in a plain ts-node script because the auth
 * module uses the "@" alias).
 *
 * Run it yourself on a machine where Docker + the database are up:
 *   npm run demo:reset   # (or demo:start)
 *   npm run verify:roles
 */

import { readFileSync } from "fs";
import { PrismaClient, type UserRole } from "@prisma/client";
import { verifyPassword } from "../src/lib/auth/password";
import { canAccessPrefix } from "../src/lib/rbac";
import { getHomePathForRole } from "../src/lib/auth/redirect";

// Load .env so DATABASE_URL is available when run as a plain script.
function loadEnv() {
  try {
    const text = readFileSync(".env", "utf-8");
    for (const raw of text.split("\n")) {
      const line = raw.trim();
      if (!line || line.startsWith("#")) continue;
      const eq = line.indexOf("=");
      if (eq < 0) continue;
      const key = line.slice(0, eq).trim();
      let val = line.slice(eq + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      if (process.env[key] === undefined) process.env[key] = val;
    }
  } catch {
    /* .env is optional; env may already be exported */
  }
}
loadEnv();

const DEMO_PASSWORD = "Demo1234!";

type Account = {
  role: UserRole;
  email: string;
  home: string;
  forbidden: string;
};

const ACCOUNTS: Account[] = [
  { role: "DIRECTOR", email: "director@mtc.ac.ug", home: "/director", forbidden: "/dashboard" },
  { role: "PRINCIPAL", email: "principal@mtc.ac.ug", home: "/principal", forbidden: "/director" },
  { role: "ADMIN", email: "admin@mtc.ac.ug", home: "/admin", forbidden: "/director" },
  { role: "ACADEMIC_REGISTRAR", email: "registrar@mtc.ac.ug", home: "/registrar", forbidden: "/dashboard" },
  { role: "INSTRUCTOR", email: "tutor@mtc.ac.ug", home: "/tutor", forbidden: "/director" },
  { role: "SYSTEM_IT", email: "itadmin@mtc.ac.ug", home: "/system", forbidden: "/dashboard" },
  { role: "STUDENT", email: "student.full@example.com", home: "/dashboard", forbidden: "/director" },
];

const prisma = new PrismaClient();

// Mirrors the credentials authorize() in src/lib/auth/index.ts.
async function loginAs(email: string, password: string): Promise<{ ok: true; role: UserRole } | { ok: false; reason: string }> {
  const user = await prisma.user.findFirst({ where: { OR: [{ email }, { phone: email }] } });
  if (!user || !user.passwordHash) return { ok: false, reason: "account not found or no password" };
  if (user.status === "SUSPENDED" || user.status === "PENDING_ACCEPTANCE" || user.status === "DETAILS_DISPUTED") {
    return { ok: false, reason: `account status is ${user.status}` };
  }
  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) return { ok: false, reason: "password did not verify" };
  if (user.totpEnabled && user.totpSecret) return { ok: false, reason: "TOTP required (seeded accounts should have TOTP off)" };
  return { ok: true, role: user.role };
}

function pad(s: string, n: number) {
  return s.length >= n ? s.slice(0, n) : s + " ".repeat(n - s.length);
}

async function main() {
  const rows: Array<{ account: Account; login: string; roleMatch: string; home: string; forbidden: string; pass: boolean }> = [];

  for (const account of ACCOUNTS) {
    const login = await loginAs(account.email, DEMO_PASSWORD);
    const loginOk = login.ok;
    const actualRole = loginOk ? (login as { ok: true; role: UserRole }).role : null;

    const roleMatch = loginOk && actualRole === account.role;
    const homeOk = loginOk && getHomePathForRole(actualRole as UserRole) === account.home;
    const forbiddenDenied = loginOk && canAccessPrefix(actualRole as UserRole, account.forbidden) === false;
    const pass = Boolean(loginOk && roleMatch && homeOk && forbiddenDenied);

    rows.push({
      account,
      login: loginOk ? "ok" : `fail: ${(login as { ok: false; reason: string }).reason}`,
      roleMatch: roleMatch ? "ok" : loginOk ? `got ${actualRole}` : "-",
      home: homeOk ? "ok" : loginOk ? `got ${getHomePathForRole(actualRole as UserRole)}` : "-",
      forbidden: forbiddenDenied ? "denied" : loginOk ? "ALLOWED (bug)" : "-",
      pass,
    });
  }

  // Print a table.
  const cols = ["Role", "Email", "Login", "Role", "Home", "Forbidden", "Result"];
  const widths = [18, 28, 26, 14, 22, 16, 6];
  console.log(cols.map((c, i) => pad(c, widths[i])).join("  "));
  console.log("-".repeat(widths.reduce((a, b) => a + b + 2, 0)));
  for (const r of rows) {
    console.log(
      [
        pad(r.account.role, widths[0]),
        pad(r.account.email, widths[1]),
        pad(r.login, widths[2]),
        pad(r.roleMatch, widths[3]),
        pad(r.home, widths[4]),
        pad(r.forbidden, widths[5]),
        pad(r.pass ? "PASS" : "FAIL", widths[6]),
      ].join("  "),
    );
  }

  const failed = rows.filter((r) => !r.pass);
  console.log(`\n${rows.length - failed.length}/${rows.length} passed.`);
  await prisma.$disconnect();
  if (failed.length) {
    console.error("\nFailed accounts:");
    for (const r of failed) console.error(`  - ${r.account.email}: login=${r.login}, role=${r.roleMatch}, home=${r.home}, forbidden=${r.forbidden}`);
    process.exit(1);
  }
}

main().catch(async (e) => {
  console.error("verify:roles error:", e);
  await prisma.$disconnect().catch(() => undefined);
  process.exit(1);
});
