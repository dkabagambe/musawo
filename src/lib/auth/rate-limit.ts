import { redis } from "@/lib/db/redis";

interface RateLimitOptions {
  key: string;       // e.g. "auth:login:${ip}"
  maxRequests: number;
  windowSeconds: number;
}

export async function checkRateLimit(
  options: RateLimitOptions
): Promise<{ allowed: boolean; remaining: number; resetIn: number }> {
  const { key, maxRequests, windowSeconds } = options;
  const now = Math.floor(Date.now() / 1000);
  const windowStart = now - windowSeconds;
  const redisKey = `rl:${key}`;

  // Remove old entries
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
}
