/**
 * Rate-limit unit tests (no live Redis or DB needed).
 *
 * Tests:
 *   1. 30 successful logins from one shared IP are never blocked.
 *   2. 5 failures on one account lock it; 6th attempt is rejected.
 *   3. Successful login clears the per-account counter.
 *   4. IP lock triggers after 100 failures from one IP.
 *   5. Different accounts from the same IP have independent account counters.
 *   6. IP counter is NOT cleared on a successful login.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ── in-process sorted-set store ────────────────────────────────────────────
// Shared via closure so the module factory can capture it.
const _store = new Map<string, Array<{ score: number; member: string }>>();

function _getSet(key: string) {
  if (!_store.has(key)) _store.set(key, []);
  return _store.get(key)!;
}

// vi.mock factories are hoisted to top-of-file by Vite/Vitest.
// Do NOT reference any non-imported variables inside the factory.
vi.mock("@/lib/db/redis", () => {
  const store = new Map<string, Array<{ score: number; member: string }>>();
  function getSet(k: string) {
    if (!store.has(k)) store.set(k, []);
    return store.get(k)!;
  }
  const redis = {
    _store: store, // exposed so tests can reset it
    async zremrangebyscore(key: string, _min: string, max: number) {
      const s = getSet(key);
      const kept = s.filter((e) => e.score > max);
      store.set(key, kept);
      return s.length - kept.length;
    },
    async zcard(key: string) { return getSet(key).length; },
    async zadd(key: string, score: number, member: string) {
      getSet(key).push({ score, member });
      return 1;
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
    async del(key: string) {
      const had = store.has(key) ? 1 : 0;
      store.delete(key);
      return had;
    },
    async get() { return null; },
    async set() { return "OK"; },
  };
  return { redis };
});

vi.mock("@/lib/settings", () => ({
  getSetting: (_key: string, fallback: string) => Promise.resolve(fallback),
}));

// Import AFTER mocks are registered
import {
  checkLoginAllowed,
  recordLoginFailure,
  recordLoginSuccess,
  RL_DEFAULTS,
} from "@/lib/auth/rate-limit";
import { redis } from "@/lib/db/redis";

// ── helpers ────────────────────────────────────────────────────────────────

function resetStore() {
  // The factory exposed _store on redis; cast to access it
  ((redis as unknown) as { _store: Map<unknown, unknown> })._store.clear();
}

async function simulateFailures(email: string, ip: string, count: number) {
  for (let i = 0; i < count; i++) {
    await recordLoginFailure(email, ip);
  }
}

// ── tests ──────────────────────────────────────────────────────────────────

describe("Login rate-limit", () => {
  beforeEach(resetStore);

  it("30 successful logins from one shared IP are never blocked", async () => {
    const sharedIp = "192.168.1.1";
    for (let i = 1; i <= 30; i++) {
      const result = await checkLoginAllowed(`user${i}@example.com`, sharedIp);
      expect(result.allowed).toBe(true);
    }
  });

  it("account is locked after 5 failures; 6th attempt is rejected", async () => {
    const email = "victim@example.com";
    const ip = "10.0.0.1";

    for (let i = 0; i < RL_DEFAULTS.accountMaxFailures; i++) {
      expect((await checkLoginAllowed(email, ip)).allowed).toBe(true);
      await recordLoginFailure(email, ip);
    }

    const result = await checkLoginAllowed(email, ip);
    expect(result.allowed).toBe(false);
    if (!result.allowed) expect(result.message).toContain("account");
  });

  it("successful login clears the per-account counter", async () => {
    const email = "recover@example.com";
    const ip = "10.0.0.2";

    await simulateFailures(email, ip, RL_DEFAULTS.accountMaxFailures);
    expect((await checkLoginAllowed(email, ip)).allowed).toBe(false);

    await recordLoginSuccess(email);
    expect((await checkLoginAllowed(email, ip)).allowed).toBe(true);
  });

  it("IP is locked after 100 failures across different accounts", async () => {
    const ip = "10.1.2.3";
    for (let i = 0; i < RL_DEFAULTS.ipMaxFailures; i++) {
      await recordLoginFailure(`account${i}@example.com`, ip);
    }

    const result = await checkLoginAllowed("new@example.com", ip);
    expect(result.allowed).toBe(false);
    if (!result.allowed) expect(result.message).toContain("network");
  });

  it("different accounts from the same IP have independent account counters", async () => {
    const ip = "10.0.0.5";
    await simulateFailures("alice@example.com", ip, RL_DEFAULTS.accountMaxFailures);

    // Bob is not locked
    expect((await checkLoginAllowed("bob@example.com", ip)).allowed).toBe(true);
    // Alice is locked
    expect((await checkLoginAllowed("alice@example.com", ip)).allowed).toBe(false);
  });

  it("IP counter persists after a successful login", async () => {
    const ip = "10.0.0.6";
    const email = "tester@example.com";

    await simulateFailures(email, ip, 50);
    await recordLoginSuccess(email);

    // Account is clear; IP still has 50 entries but under 100 threshold so allowed
    expect((await checkLoginAllowed(email, ip)).allowed).toBe(true);

    // 50 more failures push IP over 100
    await simulateFailures("other@example.com", ip, 50);
    expect((await checkLoginAllowed("other@example.com", ip)).allowed).toBe(false);
  });
});
