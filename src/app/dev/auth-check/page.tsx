/**
 * /dev/auth-check — Development-only diagnostic page.
 * 404 in production.
 *
 * Shows for every demo account:
 *  - User exists in DB
 *  - Status, emailVerified, dataConsentAt, TOTP state
 *  - Whether Demo1234! verifies through the SAME function authorize() uses
 *  - Rate-limiter key status (shows current count, not blocked state)
 */

import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { verifyPassword } from "@/lib/auth/password";
import { redis } from "@/lib/db/redis";

export const dynamic = "force-dynamic";
export const metadata = { title: "Auth Check — Dev" };

const DEMO_EMAIL = "Demo1234!";

const DEMO_ACCOUNTS = [
  "ceo@musawotraining.ug",
  "deputy@musawotraining.ug",
  "itadmin@musawotraining.ug",
  "registrar@musawotraining.ug",
  "bursar@musawotraining.ug",
  "tutor@musawotraining.ug",
  "tutor2@musawotraining.ug",
  "student.new@example.com",
  "student.pending@example.com",
  "student.25@example.com",
  "student.50@example.com",
  "student.75@example.com",
  "student.full@example.com",
  "student.overdue@example.com",
  "student.sponsored@example.com",
  "student.completed@example.com",
];

interface AccountCheck {
  email: string;
  exists: boolean;
  status: string | null;
  emailVerified: boolean;
  dataConsentAt: boolean;
  totpEnabled: boolean;
  totpSecret: boolean;
  passwordVerifies: boolean | "error";
  passwordError?: string;
  rateLimitKey: string;
  rateLimitCount: number | "redis-error";
  wouldAuthorize: boolean;
  blockReason: string | null;
}

async function checkAccount(email: string): Promise<AccountCheck> {
  const user = await db.user.findFirst({
    where: { email },
  });

  const rateLimitKey = `rl:auth:login:${email}`;
  let rateLimitCount: number | "redis-error" = "redis-error";
  try {
    rateLimitCount = await redis.zcard(rateLimitKey);
  } catch {
    // Redis unavailable — not a hard failure
  }

  if (!user) {
    return {
      email, exists: false, status: null, emailVerified: false,
      dataConsentAt: false, totpEnabled: false, totpSecret: false,
      passwordVerifies: false, rateLimitKey, rateLimitCount,
      wouldAuthorize: false, blockReason: "user not found in database",
    };
  }

  let passwordVerifies: boolean | "error" = false;
  let passwordError: string | undefined;
  if (user.passwordHash) {
    try {
      passwordVerifies = await verifyPassword(DEMO_EMAIL, user.passwordHash);
    } catch (e) {
      passwordVerifies = "error";
      passwordError = e instanceof Error ? e.message : String(e);
    }
  }

  // Simulate the authorize() decision (mirrors src/lib/auth/index.ts)
  let blockReason: string | null = null;
  if (!user.passwordHash) {
    blockReason = "no passwordHash";
  } else if (user.status === "SUSPENDED") {
    blockReason = "status is SUSPENDED";
  } else if (passwordVerifies !== true) {
    blockReason = passwordVerifies === "error"
      ? `verifyPassword threw: ${passwordError}`
      : "password does not verify";
  } else if (user.totpEnabled && user.totpSecret) {
    blockReason = "TOTP required (totpEnabled=true) - needs code in login form";
  }

  return {
    email,
    exists: true,
    status: user.status,
    emailVerified: !!user.emailVerified,
    dataConsentAt: !!user.dataConsentAt,
    totpEnabled: user.totpEnabled,
    totpSecret: !!user.totpSecret,
    passwordVerifies,
    passwordError,
    rateLimitKey,
    rateLimitCount,
    wouldAuthorize: blockReason === null,
    blockReason,
  };
}

export default async function AuthCheckPage() {
  if (process.env.NODE_ENV === "production") notFound();

  const results = await Promise.all(DEMO_ACCOUNTS.map(checkAccount));
  const allGood = results.every((r) => r.wouldAuthorize);

  return (
    <div style={{ fontFamily: "monospace", padding: "2rem", maxWidth: "960px", margin: "0 auto" }}>
      <h1 style={{ fontSize: "1.5rem", fontWeight: "bold", marginBottom: "0.5rem" }}>
        🔐 Auth Check — Dev Only
      </h1>
      <p style={{ color: "#666", marginBottom: "1.5rem", fontSize: "0.875rem" }}>
        Tests each demo account against the real <code>authorize()</code> logic (same
        verifyPassword function, same TOTP gate). Never logs passwords.
        Rate-limit counts show current Redis zset size - reset with{" "}
        <code>npm run rate-limit:reset</code>.
      </p>

      {allGood ? (
        <div style={{ background: "#d1fae5", border: "1px solid #6ee7b7", borderRadius: "8px", padding: "0.75rem 1rem", marginBottom: "1.5rem", color: "#065f46" }}>
          ✅ All {results.length} demo accounts would be authorized with <strong>Demo1234!</strong>
        </div>
      ) : (
        <div style={{ background: "#fee2e2", border: "1px solid #fca5a5", borderRadius: "8px", padding: "0.75rem 1rem", marginBottom: "1.5rem", color: "#7f1d1d" }}>
          ❌ {results.filter((r) => !r.wouldAuthorize).length} account(s) would NOT be authorized
        </div>
      )}

      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8rem" }}>
        <thead>
          <tr style={{ background: "#f3f4f6" }}>
            <th style={th}>Email</th>
            <th style={th}>Exists</th>
            <th style={th}>Status</th>
            <th style={th}>EmailVerified</th>
            <th style={th}>TOTP</th>
            <th style={th}>PW ✓</th>
            <th style={th}>RL count</th>
            <th style={th}>authorize()</th>
            <th style={th}>Block reason</th>
          </tr>
        </thead>
        <tbody>
          {results.map((r) => (
            <tr key={r.email} style={{ background: r.wouldAuthorize ? "#f0fdf4" : "#fef2f2" }}>
              <td style={td}>{r.email}</td>
              <td style={{ ...td, textAlign: "center" }}>{r.exists ? "✅" : "❌"}</td>
              <td style={td}>{r.status ?? "—"}</td>
              <td style={{ ...td, textAlign: "center" }}>{r.emailVerified ? "✅" : "❌"}</td>
              <td style={{ ...td, textAlign: "center" }}>
                {r.totpEnabled ? (r.totpSecret ? "🔐 on" : "⚠️ on/no-secret") : "off"}
              </td>
              <td style={{ ...td, textAlign: "center" }}>
                {r.passwordVerifies === true ? "✅" : r.passwordVerifies === "error" ? "💥" : "❌"}
              </td>
              <td style={{ ...td, textAlign: "center" }}>
                {r.rateLimitCount === "redis-error" ? "⚠️" : r.rateLimitCount}
              </td>
              <td style={{ ...td, textAlign: "center", fontWeight: "bold", color: r.wouldAuthorize ? "#166534" : "#7f1d1d" }}>
                {r.wouldAuthorize ? "✅ yes" : "❌ no"}
              </td>
              <td style={{ ...td, color: "#6b7280" }}>{r.blockReason ?? "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div style={{ marginTop: "2rem", fontSize: "0.8rem", color: "#666" }}>
        <strong>ENV check:</strong>{" "}
        NEXTAUTH_URL = {process.env.NEXTAUTH_URL ?? "(not set)"} &nbsp;|&nbsp;
        AUTH_URL = {process.env.AUTH_URL ?? "(not set)"} &nbsp;|&nbsp;
        AUTH_TRUST_HOST = {process.env.AUTH_TRUST_HOST ?? "(not set)"} &nbsp;|&nbsp;
        SECRET set = {process.env.NEXTAUTH_SECRET ? "yes" : process.env.AUTH_SECRET ? "yes" : "❌ NO"}
        <br /><br />
        <strong>Note:</strong> This page is only accessible in development (NODE_ENV ≠ production).
      </div>
    </div>
  );
}

const th: React.CSSProperties = {
  padding: "0.5rem 0.75rem",
  textAlign: "left",
  borderBottom: "1px solid #e5e7eb",
  fontWeight: "600",
  whiteSpace: "nowrap",
};
const td: React.CSSProperties = {
  padding: "0.4rem 0.75rem",
  borderBottom: "1px solid #e5e7eb",
  verticalAlign: "middle",
};
