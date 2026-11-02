import { redis } from "@/lib/db/redis";

interface RateLimitOptions {
  key: string;       // e.g. "auth:login:${ip}"
  maxRequests: number;
  windowSeconds: number;
}

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetIn: number;
}

/**
 * Sliding-window rate limit using Redis sorted sets.
 * FAIL-OPEN: if Redis is unavailable the request is always allowed
 * so a Redis outage never blocks legitimate users.
 */
export async function checkRateLimit(
  options: RateLimitOptions,
): Promise<RateLimitResult> {
  const { key, maxRequests, windowSeconds } = options;

  try {
    const now = Math.floor(Date.now() / 1000);
    const windowStart = now - windowSeconds;
    const redisKey = `rl:${key}`;

    await redis.zremrangebyscore(redisKey, "-inf", windowStart);
    const count = await redis.zcard(redisKey);

    if (count >= maxRequests) {
      const oldestStr = await redis.zrange(redisKey, 0, 0, "WITHSCORES");
      const oldest = oldestStr[1] ? parseInt(oldestStr[1]) : now;
      return {
        allowed: false,
        remaining: 0,
        resetIn: oldest + windowSeconds - now,
      };
    }

    await redis.zadd(redisKey, now, `${now}-${Math.random()}`);
    await redis.expire(redisKey, windowSeconds);

    return {
      allowed: true,
      remaining: maxRequests - count - 1,
      resetIn: windowSeconds,
    };
  } catch {
    // Redis is unavailable — fail open so users are never blocked by infra failure
    return { allowed: true, remaining: maxRequests, resetIn: windowSeconds };
  }
}

/**
 * Add rate-limit headers to a Response.
 * Call this when allowed === false to return a 429.
 */
export function rateLimitResponse(result: RateLimitResult) {
  const headers = new Headers({
    "Retry-After": String(result.resetIn),
    "X-RateLimit-Remaining": String(result.remaining),
    "Content-Type": "application/json",
  });
  return new Response(
    JSON.stringify({ error: "Too many requests. Please slow down." }),
    { status: 429, headers },
  );
}
