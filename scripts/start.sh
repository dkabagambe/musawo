#!/bin/sh
set -e

# ── Graceful shutdown ────────────────────────────────────────────────────────
# Render sends SIGTERM before stopping the container. Trap it so we can
# finish in-flight requests before exiting (avoids 502 on deploys/restarts).
cleanup() {
  echo "[start] Received SIGTERM — shutting down gracefully"
  kill -TERM "$APP_PID" 2>/dev/null
  wait "$APP_PID"
  echo "[start] Shutdown complete"
}
trap cleanup TERM INT

# ── Database migrations ──────────────────────────────────────────────────────
# Run in the foreground first so the schema is always up to date.
# If this fails we still start the app (it may already be on the correct
# schema from a previous deploy), but we print a visible warning.
echo "[start] Running Prisma migrations..."
if npx prisma migrate deploy; then
  echo "[start] Migrations OK"
else
  echo "[start] WARNING: prisma migrate deploy failed — starting anyway" >&2
fi

# ── Start Next.js ────────────────────────────────────────────────────────────
echo "[start] Starting Next.js..."
node server.js &
APP_PID=$!

# Wait for the app process; exit with its exit code
wait "$APP_PID"
