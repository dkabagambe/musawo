/**
 * Production safety tests.
 *
 * Verifies that APP_ENV=production correctly disables demo features
 * and that rate-limit settings are as specified.
 *
 * These tests run without a database or Redis.
 */

import { describe, it, expect, vi, afterEach } from "vitest";

// ── APP_ENV helpers ──────────────────────────────────────────────────────────

describe("isDemoAllowed()", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns true when APP_ENV=development", async () => {
    vi.stubEnv("APP_ENV", "development");
    const { isDemoAllowed } = await import("@/lib/env");
    expect(isDemoAllowed()).toBe(true);
  });

  it("returns true when APP_ENV=staging", async () => {
    vi.stubEnv("APP_ENV", "staging");
    const { isDemoAllowed } = await import("@/lib/env");
    expect(isDemoAllowed()).toBe(true);
  });

  it("returns false when APP_ENV=production", async () => {
    vi.stubEnv("APP_ENV", "production");
    const { isDemoAllowed } = await import("@/lib/env");
    expect(isDemoAllowed()).toBe(false);
  });

  it("defaults to development (returns true) when APP_ENV is unset", async () => {
    vi.stubEnv("APP_ENV", "");
    const { isDemoAllowed } = await import("@/lib/env");
    expect(isDemoAllowed()).toBe(true);
  });

  it("isProduction returns true only for APP_ENV=production", async () => {
    vi.stubEnv("APP_ENV", "production");
    const { isProduction } = await import("@/lib/env");
    expect(isProduction()).toBe(true);

    vi.stubEnv("APP_ENV", "staging");
    const { isProduction: isProduction2 } = await import("@/lib/env");
    expect(isProduction2()).toBe(false);
  });
});

// ── Rate-limit defaults ──────────────────────────────────────────────────────

describe("RL_DEFAULTS are correct per spec", () => {
  it("account: 5 failures per 15 minutes", async () => {
    const { RL_DEFAULTS } = await import("@/lib/auth/rate-limit");
    expect(RL_DEFAULTS.accountMaxFailures).toBe(5);
    expect(RL_DEFAULTS.accountWindowSecs).toBe(900);  // 15 min
  });

  it("IP: 100 failures per 15 minutes", async () => {
    const { RL_DEFAULTS } = await import("@/lib/auth/rate-limit");
    expect(RL_DEFAULTS.ipMaxFailures).toBe(100);
    expect(RL_DEFAULTS.ipWindowSecs).toBe(900);  // 15 min
  });
});

// ── Env validation ───────────────────────────────────────────────────────────

describe("validateProductionEnv()", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("does not throw in non-production environments", async () => {
    vi.stubEnv("APP_ENV", "development");
    const { validateProductionEnv } = await import("@/lib/env-validate");
    expect(() => validateProductionEnv()).not.toThrow();
  });

  it("does not throw in staging", async () => {
    vi.stubEnv("APP_ENV", "staging");
    const { validateProductionEnv } = await import("@/lib/env-validate");
    expect(() => validateProductionEnv()).not.toThrow();
  });

  // Note: we do not test APP_ENV=production with missing vars here because
  // validateProductionEnv() calls process.exit(1) on failure which would
  // terminate the test process. Integration testing of that path is done
  // manually by inspecting startup logs on a production deployment.
});
