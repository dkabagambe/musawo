import { Redis } from "ioredis";

const globalForRedis = globalThis as unknown as {
  redis: Redis | undefined;
};

function createRedis(): Redis {
  const url = process.env.REDIS_URL ?? "redis://localhost:6379";
  const client = new Redis(url, {
    maxRetriesPerRequest: 3,
    // Gracefully reconnect — do not crash the process on connection failure
    lazyConnect: false,
    enableReadyCheck: true,
  });

  client.on("error", (err: Error) => {
    // Log but never crash — Redis is optional for demo deployments
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
