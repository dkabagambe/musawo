/**
 * Login rate-limiting.
 *
 * Rules (all values are admin settings with the defaults below):
 *   auth.rateLimit.account.maxFailures   = 5     failures before account lock
 *   auth.rateLimit.account.windowSecs    = 900   window in seconds (15 min)
 *   auth.rateLimit.ip.maxFailures        = 100   failures before IP lock
 *   auth.rateLimit.ip.windowSecs         = 900   window in seconds (15 min)
 *
 * KEY DESIGN
 *   Only FAILED attempts are counted.  A successful login never increments a
 *   counter, so 30 people logging in from the same shared IP (office, school)
 *   are never blocked as long as their passwords are correct.
 *
 *   Two independent counters per attempt:
 *     rl:account:<email>   -- locks just that account after 5 wrong passwords
 *     rl:ip:<ip>           -- locks the IP only after 100 failures (brute-force)
 *
 * FAIL-OPEN: if Redis is unavailable all rate-limit checks return "allowed"
 * so a Redis outage never blocks legitimate users.
 */

import { redis } from "@/lib/db/redis";

// ── defaults (used when SiteSettings DB is not available, e.g. in tests) ───
export const RL_DEFAULTS = {
  accountMaxFailures: 5,
  accountWindowSecs: 900,  // 15 min
  ipMaxFailures: 100,
  ipWindowSecs: 900,        // 15 min
} as const;

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetIn: number; // seconds
}

// ─── internal sliding-window counter ───────────────────────────────────────

/**
 * Check whether a counter (Redis sorted-set) has reached its limit.
 * Does NOT write a new entry; call recordFailure() separately.
 *
 * Fail-open: any Redis error returns { allowed: true }.
 */
export async function checkRateLimit(options: {
  key: string;
  maxRequests: number;
  windowSeconds: number;
}): Promise<RateLimitResult> {
  const { key, maxRequests, windowSeconds } = options;
  try {
    const now = Math.floor(Date.now() / 1000);
    const windowStart = now - windowSeconds;
    const redisKey = `rl:${key}`;

    await redis.zremrangebyscore(redisKey, "-inf", windowStart);
    const count = await redis.zcard(redisKey);

    if (count >= maxRequests) {
      const oldest = await redis.zrange(redisKey, 0, 0, "WITHSCORES");
      const oldestScore = oldest[1] ? parseInt(oldest[1]) : now;
      return {
        allowed: false,
        remaining: 0,
        resetIn: oldestScore + windowSeconds - now,
      };
    }

    return {
      allowed: true,
      remaining: maxRequests - count,
      resetIn: windowSeconds,
    };
  } catch {
    return { allowed: true, remaining: maxRequests, resetIn: windowSeconds };
  }
}

/**
 * Record one failure entry in the sliding window.
 * Separate from checkRateLimit so we only record failures, not every attempt.
 */
export async function recordFailure(options: {
  key: string;
  windowSeconds: number;
}): Promise<void> {
  const { key, windowSeconds } = options;
  try {
    const now = Math.floor(Date.now() / 1000);
    const redisKey = `rl:${key}`;
    await redis.zadd(redisKey, now, `${now}-${Math.random()}`);
    await redis.expire(redisKey, windowSeconds);
  } catch {
    // Fail-open: ignore Redis errors
  }
}

/**
 * Clear all failure entries for a key (e.g. after a successful login).
 * Call this when the user logs in successfully to avoid eventual stale locks.
 */
export async function clearFailures(key: string): Promise<void> {
  try {
    await redis.del(`rl:${key}`);
  } catch {
    // Fail-open
  }
}

// ── high-level auth helpers (used by authorize()) ──────────────────────────

export interface AuthRateLimitConfig {
  accountMaxFailures: number;
  accountWindowSecs: number;
  ipMaxFailures: number;
  ipWindowSecs: number;
}

/**
 * Returns the settings-driven config, falling back to RL_DEFAULTS when
 * the settings service is unavailable (no DB, tests, etc.).
 */
export async function getAuthRateLimitConfig(): Promise<AuthRateLimitConfig> {
  try {
    // Dynamic import to avoid pulling DB/Redis into edge middleware
    const { getSetting } = await import("@/lib/settings");
    const [accMax, accWin, ipMax, ipWin] = await Promise.all([
      getSetting("auth.rateLimit.account.maxFailures", String(RL_DEFAULTS.accountMaxFailures)),
      getSetting("auth.rateLimit.account.windowSecs",  String(RL_DEFAULTS.accountWindowSecs)),
      getSetting("auth.rateLimit.ip.maxFailures",      String(RL_DEFAULTS.ipMaxFailures)),
      getSetting("auth.rateLimit.ip.windowSecs",       String(RL_DEFAULTS.ipWindowSecs)),
    ]);
    return {
      accountMaxFailures: parseInt(accMax, 10) || RL_DEFAULTS.accountMaxFailures,
      accountWindowSecs:  parseInt(accWin, 10) || RL_DEFAULTS.accountWindowSecs,
      ipMaxFailures:      parseInt(ipMax,  10) || RL_DEFAULTS.ipMaxFailures,
      ipWindowSecs:       parseInt(ipWin,  10) || RL_DEFAULTS.ipWindowSecs,
    };
  } catch {
    return { ...RL_DEFAULTS };
  }
}

/**
 * Check both the per-account and per-IP counters BEFORE attempting login.
 * Returns allowed=false with a user-friendly message if either is locked.
 */
export async function checkLoginAllowed(
  email: string,
  ip: string,
): Promise<{ allowed: true } | { allowed: false; message: string }> {
  const cfg = await getAuthRateLimitConfig();
  const [accountResult, ipResult] = await Promise.all([
    checkRateLimit({
      key: `account:${email.toLowerCase()}`,
      maxRequests: cfg.accountMaxFailures,
      windowSeconds: cfg.accountWindowSecs,
    }),
    checkRateLimit({
      key: `ip:${ip}`,
      maxRequests: cfg.ipMaxFailures,
      windowSeconds: cfg.ipWindowSecs,
    }),
  ]);

  if (!accountResult.allowed) {
    const mins = Math.ceil(accountResult.resetIn / 60);
    return {
      allowed: false,
      message: `Too many failed login attempts for this account. Please try again in ${mins} minute${mins !== 1 ? "s" : ""}.`,
    };
  }
  if (!ipResult.allowed) {
    const mins = Math.ceil(ipResult.resetIn / 60);
    return {
      allowed: false,
      message: `Too many failed login attempts from your network. Please try again in ${mins} minute${mins !== 1 ? "s" : ""}.`,
    };
  }
  return { allowed: true };
}

/**
 * Record a failed login for both the per-account and per-IP counters.
 */
export async function recordLoginFailure(
  email: string,
  ip: string,
): Promise<void> {
  const cfg = await getAuthRateLimitConfig();
  await Promise.all([
    recordFailure({ key: `account:${email.toLowerCase()}`, windowSeconds: cfg.accountWindowSecs }),
    recordFailure({ key: `ip:${ip}`,                       windowSeconds: cfg.ipWindowSecs }),
  ]);
}

/**
 * Clear the per-account failure counter after a successful login.
 * The per-IP counter is NOT cleared so abuse from an IP is still visible.
 */
export async function recordLoginSuccess(email: string): Promise<void> {
  await clearFailures(`account:${email.toLowerCase()}`);
}

/** Add rate-limit headers to a 429 Response. */
export function rateLimitResponse(result: RateLimitResult, message?: string) {
  const headers = new Headers({
    "Retry-After": String(result.resetIn),
    "X-RateLimit-Remaining": String(result.remaining),
    "Content-Type": "application/json",
  });
  return new Response(
    JSON.stringify({ error: message ?? "Too many requests. Please slow down." }),
    { status: 429, headers },
  );
}
