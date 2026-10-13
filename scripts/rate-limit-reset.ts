#!/usr/bin/env tsx
/**
 * scripts/rate-limit-reset.ts
 *
 * Deletes all rate-limit keys from Redis so demo/test accounts
 * are not locked out after repeated failed login attempts.
 *
 * Usage:  npm run rate-limit:reset
 */

import { Redis } from "ioredis";

const redis = new Redis(process.env.REDIS_URL ?? "redis://localhost:6379", {
  maxRetriesPerRequest: 1,
});

async function main() {
  const keys = await redis.keys("rl:*");
  if (keys.length === 0) {
    console.log("No rate-limit keys found — nothing to reset.");
  } else {
    await redis.del(...keys);
    console.log(`✓ Deleted ${keys.length} rate-limit key(s):`);
    keys.forEach((k) => console.log("  ", k));
  }
  await redis.quit();
}

main().catch((e) => {
  console.error("Error:", e.message);
  process.exit(1);
});
