/**
 * Production safety and configuration tests.
 *
 * Verifies:
 *   1. isDemoAllowed() / isProduction() / isTotpEnforced() flags per APP_ENV
 *   2. Rate-limit defaults match the spec (5/15min per account, 100/15min per IP)
 *   3. Login rate limit: 30 successful logins from one IP are never blocked
 *   4. Login rate limit: 5 failures lock that account; 6th is rejected with message
 *   5. Successful logins never count toward IP lock
 *   6. validateProductionEnv() is silent in non-production
 *   7. isTotpEnforced() respects TOTP_REQUIRED=true in staging
 *
 * No live Redis, DB, or server needed.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// ── Shared in-process Redis mock (same as rate-limit.test.ts) ───────────────
vi.mock("@/lib/db/redis", () => {
  const store = new Map<string, Array<{ score: number; member: string }>>();
  function getSet(k: string) {
    if (!store.has(k)) store.set(k, []);
    return store.get(k)!;
  }
  const redis = {
    _store: store,
    async zremrangebyscore(key: string, _min: string, max: number) {
      const s = getSet(key);
      const kept = s.filter((e) => e.score > max);
      store.set(key, kept);
    },
    async zcard(key: string) { return getSet(key).length; },
    async zadd(key: string, score: number, member: string) {
      getSet(key).push({ score, member }); return 1;
    },
    async zrange(key: string, _s: number, _e: number, ws?: string) {
      const s = getSet(key);
      if (s.length === 0) return [];
      const sorted = [...s].sort((a, b) => a.score - b.score);
      return ws === "WITHSCORES"
        ? [sorted[0].member, String(sorted[0].score)]
        : [sorted[0].member];
    },
    async expire() { return 1; },
    async del(key: string) { const had = store.has(key) ? 1 : 0; store.delete(key); return had; },
    async get() { return null; },
    async set() { return "OK"; },
  };
  return { redis };
});

vi.mock("@/lib/settings", () => ({
  getSetting: (_key: string, fallback: string) => Promise.resolve(fallback),
}));

import {
  checkLoginAllowed,
  recordLoginFailure,
  recordLoginSuccess,
  RL_DEFAULTS,
} from "@/lib/auth/rate-limit";
import { redis } from "@/lib/db/redis";

function resetStore() {
  ((redis as unknown) as { _store: Map<unknown, unknown> })._store.clear();
}

// ── 1. APP_ENV feature flags ─────────────────────────────────────────────────

describe("isDemoAllowed()", () => {
  beforeEach(() => vi.resetModules());
  afterEach(() => vi.unstubAllEnvs());

  it("is true when APP_ENV=development (default)", async () => {
    vi.stubEnv("APP_ENV", "development");
    const { isDemoAllowed } = await import("@/lib/env");
    expect(isDemoAllowed()).toBe(true);
  });

  it("is true when APP_ENV=staging", async () => {
    vi.stubEnv("APP_ENV", "staging");
    const { isDemoAllowed } = await import("@/lib/env");
    expect(isDemoAllowed()).toBe(true);
  });

  it("is false when APP_ENV=production", async () => {
    vi.stubEnv("APP_ENV", "production");
    const { isDemoAllowed } = await import("@/lib/env");
    expect(isDemoAllowed()).toBe(false);
  });

  it("defaults to development (true) when APP_ENV is unset", async () => {
    vi.stubEnv("APP_ENV", "");
    const { isDemoAllowed } = await import("@/lib/env");
    expect(isDemoAllowed()).toBe(true);
  });
});

describe("isProduction()", () => {
  beforeEach(() => vi.resetModules());
  afterEach(() => vi.unstubAllEnvs());

  it("is true only when APP_ENV=production", async () => {
    vi.stubEnv("APP_ENV", "production");
    const { isProduction } = await import("@/lib/env");
    expect(isProduction()).toBe(true);
  });

  it("is false for staging", async () => {
    vi.stubEnv("APP_ENV", "staging");
    const { isProduction } = await import("@/lib/env");
    expect(isProduction()).toBe(false);
  });

  it("is false for development", async () => {
    vi.stubEnv("APP_ENV", "development");
    const { isProduction } = await import("@/lib/env");
    expect(isProduction()).toBe(false);
  });
});

// ── 2. isTotpEnforced() ──────────────────────────────────────────────────────

describe("isTotpEnforced()", () => {
  beforeEach(() => vi.resetModules());
  afterEach(() => vi.unstubAllEnvs());

  it("is true in production regardless of TOTP_REQUIRED", async () => {
    vi.stubEnv("APP_ENV", "production");
    vi.stubEnv("TOTP_REQUIRED", "false");
    const { isTotpEnforced } = await import("@/lib/env");
    expect(isTotpEnforced()).toBe(true);
  });

  it("is false in development by default", async () => {
    vi.stubEnv("APP_ENV", "development");
    vi.stubEnv("TOTP_REQUIRED", "");
    const { isTotpEnforced } = await import("@/lib/env");
    expect(isTotpEnforced()).toBe(false);
  });

  it("is false in staging by default", async () => {
    vi.stubEnv("APP_ENV", "staging");
    vi.stubEnv("TOTP_REQUIRED", "");
    const { isTotpEnforced } = await import("@/lib/env");
    expect(isTotpEnforced()).toBe(false);
  });

  it("is true in staging when TOTP_REQUIRED=true", async () => {
    vi.stubEnv("APP_ENV", "staging");
    vi.stubEnv("TOTP_REQUIRED", "true");
    const { isTotpEnforced } = await import("@/lib/env");
    expect(isTotpEnforced()).toBe(true);
  });

  it("is true in development when TOTP_REQUIRED=true", async () => {
    vi.stubEnv("APP_ENV", "development");
    vi.stubEnv("TOTP_REQUIRED", "true");
    const { isTotpEnforced } = await import("@/lib/env");
    expect(isTotpEnforced()).toBe(true);
  });
});

// ── 3. Rate-limit defaults ───────────────────────────────────────────────────

describe("RL_DEFAULTS match spec", () => {
  it("account: 5 failures per 15 minutes", () => {
    expect(RL_DEFAULTS.accountMaxFailures).toBe(5);
    expect(RL_DEFAULTS.accountWindowSecs).toBe(900);
  });

  it("IP: 100 failures per 15 minutes", () => {
    expect(RL_DEFAULTS.ipMaxFailures).toBe(100);
    expect(RL_DEFAULTS.ipWindowSecs).toBe(900);
  });
});

// ── 4. 30 successful logins from one IP are never blocked ────────────────────

describe("Rate limit: 30 successful logins from one shared IP are never blocked", () => {
  beforeEach(resetStore);

  it("allows all 30 logins without recording any failures", async () => {
    const sharedIp = "192.168.0.1";
    for (let i = 1; i <= 30; i++) {
      const result = await checkLoginAllowed(`user${i}@example.com`, sharedIp);
      expect(result.allowed, `Login ${i} should be allowed`).toBe(true);
      // Do NOT call recordLoginFailure -- these are all successful logins
    }
    // All 30 different accounts on same IP -- still allowed
    const extra = await checkLoginAllowed("user31@example.com", sharedIp);
    expect(extra.allowed).toBe(true);
  });
});

// ── 5. Account lock after 5 failures ─────────────────────────────────────────

describe("Rate limit: account locked after 5 failures with clear message", () => {
  beforeEach(resetStore);

  it("allows the first 5 attempts and records failures", async () => {
    const email = "target@example.com";
    const ip    = "10.0.0.1";

    for (let i = 0; i < RL_DEFAULTS.accountMaxFailures; i++) {
      const check = await checkLoginAllowed(email, ip);
      expect(check.allowed, `Attempt ${i + 1} should be allowed`).toBe(true);
      await recordLoginFailure(email, ip);
    }
  });

  it("blocks the 6th attempt with a clear message mentioning 'account'", async () => {
    const email = "locked@example.com";
    const ip    = "10.0.0.2";

    for (let i = 0; i < RL_DEFAULTS.accountMaxFailures; i++) {
      await recordLoginFailure(email, ip);
    }

    const result = await checkLoginAllowed(email, ip);
    expect(result.allowed).toBe(false);
    if (!result.allowed) {
      expect(result.message).toMatch(/account/i);
      expect(result.message).toMatch(/minute/i);
    }
  });

  it("only locks the targeted account; other accounts on same IP still work", async () => {
    const lockedEmail = "victim@example.com";
    const otherEmail  = "innocent@example.com";
    const ip          = "10.0.0.3";

    for (let i = 0; i < RL_DEFAULTS.accountMaxFailures; i++) {
      await recordLoginFailure(lockedEmail, ip);
    }

    expect((await checkLoginAllowed(lockedEmail, ip)).allowed).toBe(false);
    expect((await checkLoginAllowed(otherEmail, ip)).allowed).toBe(true);
  });

  it("successful login clears the account lock", async () => {
    const email = "recover@example.com";
    const ip    = "10.0.0.4";

    for (let i = 0; i < RL_DEFAULTS.accountMaxFailures; i++) {
      await recordLoginFailure(email, ip);
    }
    expect((await checkLoginAllowed(email, ip)).allowed).toBe(false);

    await recordLoginSuccess(email);
    expect((await checkLoginAllowed(email, ip)).allowed).toBe(true);
  });
});

// ── 6. IP lock after 100 failures ────────────────────────────────────────────

describe("Rate limit: IP locked after 100 failures", () => {
  beforeEach(resetStore);

  it("blocks a new account after 100 failures across different accounts from same IP", async () => {
    const ip = "10.1.1.1";
    for (let i = 0; i < RL_DEFAULTS.ipMaxFailures; i++) {
      await recordLoginFailure(`acct${i}@example.com`, ip);
    }
    const result = await checkLoginAllowed("new@example.com", ip);
    expect(result.allowed).toBe(false);
    if (!result.allowed) {
      expect(result.message).toMatch(/network/i);
    }
  });

  it("IP counter is NOT cleared on a successful login", async () => {
    const ip    = "10.1.1.2";
    const email = "user@example.com";

    for (let i = 0; i < 60; i++) {
      await recordLoginFailure(`x${i}@example.com`, ip);
    }
    await recordLoginSuccess(email);

    // Account is clear; IP has 60 entries, under threshold, still allowed
    expect((await checkLoginAllowed(email, ip)).allowed).toBe(true);

    // 40 more failures push IP over 100 -> blocked
    for (let i = 0; i < 40; i++) {
      await recordLoginFailure(`y${i}@example.com`, ip);
    }
    expect((await checkLoginAllowed("final@example.com", ip)).allowed).toBe(false);
  });
});

// ── 7. validateProductionEnv() silent in non-production ──────────────────────

describe("validateProductionEnv()", () => {
  beforeEach(() => vi.resetModules());
  afterEach(() => vi.unstubAllEnvs());

  it("does not call process.exit in development", async () => {
    vi.stubEnv("APP_ENV", "development");
    const exitSpy = vi.spyOn(process, "exit").mockImplementation(() => { throw new Error("exit called"); });
    const { validateProductionEnv } = await import("@/lib/env-validate");
    expect(() => validateProductionEnv()).not.toThrow();
    exitSpy.mockRestore();
  });

  it("does not call process.exit in staging", async () => {
    vi.stubEnv("APP_ENV", "staging");
    const exitSpy = vi.spyOn(process, "exit").mockImplementation(() => { throw new Error("exit called"); });
    const { validateProductionEnv } = await import("@/lib/env-validate");
    expect(() => validateProductionEnv()).not.toThrow();
    exitSpy.mockRestore();
  });

  it("calls process.exit in production when DEMO_MODE=true (loud warning)", async () => {
    vi.stubEnv("APP_ENV", "production");
    vi.stubEnv("DEMO_MODE", "true");
    // Provide all other required vars so only DEMO_MODE triggers exit
    vi.stubEnv("AUTH_SECRET", "secret");
    vi.stubEnv("AUTH_URL", "https://example.com");
    vi.stubEnv("DATABASE_URL", "postgresql://x");
    vi.stubEnv("REDIS_URL", "redis://x");
    vi.stubEnv("DATA_ENCRYPTION_KEY", "a".repeat(64));
    vi.stubEnv("TOTP_ENCRYPTION_KEY", "a".repeat(64));
    vi.stubEnv("CRON_SECRET", "secret");
    vi.resetModules();
    const exitSpy = vi.spyOn(process, "exit").mockImplementation(() => { throw new Error("exit"); });
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const { validateProductionEnv } = await import("@/lib/env-validate");
    expect(() => validateProductionEnv()).toThrow("exit");
    const errorOutput = consoleSpy.mock.calls.map((c) => c.join(" ")).join("\n");
    expect(errorOutput).toContain("DEMO_MODE");
    exitSpy.mockRestore();
    consoleSpy.mockRestore();
  });

  it("passes in production when required vars are set and DEMO_MODE is not true", async () => {
    vi.stubEnv("APP_ENV", "production");
    vi.stubEnv("DEMO_MODE", "false");
    vi.stubEnv("AUTH_SECRET", "secret");
    vi.stubEnv("AUTH_URL", "http://localhost:3000");  // localhost skips AUTH_TRUST_HOST check
    vi.stubEnv("DATABASE_URL", "postgresql://x");
    vi.stubEnv("REDIS_URL", "redis://x");
    vi.stubEnv("DATA_ENCRYPTION_KEY", "a".repeat(64));
    vi.stubEnv("TOTP_ENCRYPTION_KEY", "a".repeat(64));
    vi.stubEnv("CRON_SECRET", "secret");
    vi.resetModules();
    const exitSpy = vi.spyOn(process, "exit").mockImplementation(() => { throw new Error("exit"); });
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const { validateProductionEnv } = await import("@/lib/env-validate");
    expect(() => validateProductionEnv()).not.toThrow();
    exitSpy.mockRestore();
    consoleSpy.mockRestore();
  });
});

// ── 8. Production feature switch-off (isDemoAllowed gates) ──────────────────

describe("Production feature switch-off: assertDemoAllowed", () => {
  beforeEach(() => vi.resetModules());
  afterEach(() => vi.unstubAllEnvs());

  it("throws with [SECURITY] prefix when called in production", async () => {
    vi.stubEnv("APP_ENV", "production");
    const { assertDemoAllowed } = await import("@/lib/env");
    expect(() => assertDemoAllowed("demo-payments")).toThrow(/\[SECURITY\]/);
    expect(() => assertDemoAllowed("demo-payments")).toThrow(/production/);
  });

  it("does not throw in development", async () => {
    vi.stubEnv("APP_ENV", "development");
    const { assertDemoAllowed } = await import("@/lib/env");
    expect(() => assertDemoAllowed("demo-payments")).not.toThrow();
  });

  it("does not throw in staging", async () => {
    vi.stubEnv("APP_ENV", "staging");
    const { assertDemoAllowed } = await import("@/lib/env");
    expect(() => assertDemoAllowed("demo-payments")).not.toThrow();
  });
});

// ── 9. Noindex header: production vs non-production ─────────────────────────

describe("Noindex header behavior", () => {
  beforeEach(() => vi.resetModules());
  afterEach(() => vi.unstubAllEnvs());

  it("isProduction()=false in development (noindex header should be added)", async () => {
    vi.stubEnv("APP_ENV", "development");
    const { isProduction } = await import("@/lib/env");
    // next.config adds X-Robots-Tag: noindex when !isProduction
    expect(isProduction()).toBe(false);
  });

  it("isProduction()=false in staging (noindex header should be added)", async () => {
    vi.stubEnv("APP_ENV", "staging");
    const { isProduction } = await import("@/lib/env");
    expect(isProduction()).toBe(false);
  });

  it("isProduction()=true in production (noindex header must NOT be added)", async () => {
    vi.stubEnv("APP_ENV", "production");
    const { isProduction } = await import("@/lib/env");
    // next.config skips noindex when isProduction() is true
    expect(isProduction()).toBe(true);
  });
});

// ── 10. TOTP_REQUIRED override in development/staging ────────────────────────

describe("TOTP enforcement: production always on, staging/dev depends on TOTP_REQUIRED", () => {
  beforeEach(() => vi.resetModules());
  afterEach(() => vi.unstubAllEnvs());

  it("TOTP_REQUIRED=false in staging: demo DIRECTOR/PRINCIPAL can log in without 2FA", async () => {
    vi.stubEnv("APP_ENV", "staging");
    vi.stubEnv("TOTP_REQUIRED", "false");
    const { isTotpEnforced } = await import("@/lib/env");
    expect(isTotpEnforced()).toBe(false); // no 2FA required in staging
  });

  it("TOTP_REQUIRED=false in development: demo DIRECTOR/PRINCIPAL can log in without 2FA", async () => {
    vi.stubEnv("APP_ENV", "development");
    vi.stubEnv("TOTP_REQUIRED", "false");
    const { isTotpEnforced } = await import("@/lib/env");
    expect(isTotpEnforced()).toBe(false);
  });

  it("APP_ENV=production always enforces TOTP even when TOTP_REQUIRED=false", async () => {
    vi.stubEnv("APP_ENV", "production");
    vi.stubEnv("TOTP_REQUIRED", "false");
    const { isTotpEnforced } = await import("@/lib/env");
    expect(isTotpEnforced()).toBe(true);
  });
});
