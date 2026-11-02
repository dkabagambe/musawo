/**
 * Next.js instrumentation hook (Node runtime only).
 *
 * Runs once when the server worker starts. Used to:
 *  1. Register global unhandledRejection / uncaughtException handlers so a
 *     single bad async call does not take down the whole process.
 *  2. Register a SIGTERM handler for graceful shutdown on Render.
 *  3. Pre-warm the database connection pool so the first real request
 *     does not block waiting for a cold Prisma connection.
 *
 * https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  // ── Prevent crashes from unhandled promise rejections ─────────────────────
  // A rogue rejection (e.g. Redis command after disconnect) would otherwise
  // crash the Node process and trigger a Render 502.
  process.on("unhandledRejection", (reason: unknown) => {
    const msg = reason instanceof Error ? reason.message : String(reason);
    // Silence Redis ECONNREFUSED - expected when Redis is offline in demo
    if (msg.includes("ECONNREFUSED") || msg.includes("connect ETIMEDOUT")) {
      console.warn("[process] Suppressed Redis connection rejection:", msg);
      return;
    }
    console.error("[process] Unhandled rejection:", reason);
    // Do NOT exit - keep serving traffic
  });

  process.on("uncaughtException", (err: Error) => {
    // Redis errors sometimes surface here too
    if (
      err.message.includes("ECONNREFUSED") ||
      err.message.includes("connect ETIMEDOUT")
    ) {
      console.warn("[process] Suppressed Redis uncaught exception:", err.message);
      return;
    }
    console.error("[process] Uncaught exception:", err);
    // For truly unexpected errors, exit and let Render restart
    process.exit(1);
  });

  // ── Graceful shutdown on SIGTERM (Render deploy / stop) ───────────────────
  // Render sends SIGTERM before killing the container. Give in-flight requests
  // up to 5 seconds to complete before we exit.
  process.once("SIGTERM", () => {
    console.log("[process] SIGTERM received - shutting down gracefully (5 s)");
    setTimeout(() => {
      console.log("[process] Graceful shutdown timeout reached - exiting");
      process.exit(0);
    }, 5000).unref();
  });

  // ── Pre-warm the DB connection pool ───────────────────────────────────────
  // Run asynchronously after startup - do not block the server from accepting
  // requests. This ensures the pool has an open connection ready before the
  // first real page load, cutting the cold-start latency from ~800 ms to ~50 ms.
  setTimeout(async () => {
    try {
      const { db } = await import("@/lib/db");
      await db.$queryRaw`SELECT 1`;
      console.log("[startup] DB connection pool warmed");
    } catch (err) {
      // Non-fatal - the app will connect on first request instead
      console.warn("[startup] DB pre-warm failed (non-fatal):", err instanceof Error ? err.message : String(err));
    }
  }, 500); // 500 ms after server binds - give Next.js time to finish init
}
