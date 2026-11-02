import { Redis } from "ioredis";

const globalForRedis = globalThis as unknown as {
  redis: Redis | undefined;
};

function createRedis(): Redis {
  const url = process.env.REDIS_URL ?? "redis://localhost:6379";
  const client = new Redis(url, {
    maxRetriesPerRequest: 2,
    // Short connect timeout so a slow/absent Redis never blocks a request
    connectTimeout: 3000,
    // Gracefully reconnect — do not crash the process on connection failure
    lazyConnect: false,
    enableReadyCheck: false, // skip PING round-trip on connect (faster cold start)
    // Cap retry backoff so reconnections are quick
    retryStrategy(times: number) {
      if (times > 6) return null; // stop retrying after ~30 s; fail open
      return Math.min(times * 500, 3000);
    },
  });

  client.on("error", (err: Error) => {
    // Log but never crash — Redis is optional (rate limits and presence fail open)
    if (process.env.APP_ENV !== "production") {
      console.warn("[redis] Connection error (non-fatal in demo):", err.message);
    } else {
      console.error("[redis] Connection error:", err.message);
    }
  });

  return client;
}

export const redis =
  globalForRedis.redis ??
  createRedis();

if (process.env.NODE_ENV !== "production") globalForRedis.redis = redis;
