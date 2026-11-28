#!/bin/bash
# seed-neon.sh — Seed the production Neon database with demo data
# Usage: ./seed-neon.sh
# Or: ./seed-neon.sh [DATABASE_URL]

set -e

# Default to Neon production URL (from .env.vercel)
DATABASE_URL="${1:-postgresql://neondb_owner:npg_UbN5Edvj1DKP@ep-purple-pond-bc8ow353-pooler.c-16.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require}"

echo "🌱 Seeding Neon database..."
echo "Database: ${DATABASE_URL%%?*}...***"
echo ""

# Export env vars
export APP_ENV=staging
export DATABASE_URL="$DATABASE_URL"

# Run migrations (if any pending)
echo "[1/3] Checking for pending migrations..."
./node_modules/.bin/prisma migrate deploy

# Run base seed
echo ""
echo "[2/3] Running base seed (staff, students, courses, intakes)..."
npx tsx prisma/seed.ts

# Run topup seed (35+ students, live classes)
echo ""
echo "[3/3] Running topup seed (35+ students, live classes)..."
npx tsx prisma/seed-topup.ts

echo ""
echo "✅ Seed complete!"
echo ""
echo "Demo accounts (password: Demo1234!):"
echo "  - director@mtc.ac.ug"
echo "  - principal@mtc.ac.ug"
echo "  - admin@mtc.ac.ug"
echo "  - tutor@mtc.ac.ug"
echo "  - student.full@example.com (and 35+ more students)"
echo ""
echo "Login at: https://musawo-six.vercel.app"
