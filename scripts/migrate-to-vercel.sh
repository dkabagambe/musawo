#!/bin/bash
# Migration Script: Render → Vercel + Neon + Upstash
# 
# Usage:
#   ./scripts/migrate-to-vercel.sh
#
# This script automates:
# 1. Backing up Render database
# 2. Validating Neon & Upstash connections
# 3. Generating required secrets
# 4. Creating a .env.vercel file with new settings
#
# DO NOT RUN until you have created Neon and Upstash accounts and have their connection strings.

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   Render → Vercel + Neon + Upstash Migration Tool            ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════════╝${NC}"
echo ""

# ─────────────────────────────────────────────────────────────────────────────
# Step 1: Validate Tools
# ─────────────────────────────────────────────────────────────────────────────

echo -e "${YELLOW}[1/5] Checking required tools...${NC}"

for tool in pg_dump psql openssl; do
  if ! command -v $tool &> /dev/null; then
    echo -e "${RED}✗ $tool is not installed${NC}"
    exit 1
  fi
done

echo -e "${GREEN}✓ All tools found${NC}"
echo ""

# ─────────────────────────────────────────────────────────────────────────────
# Step 2: Get Connection Strings
# ─────────────────────────────────────────────────────────────────────────────

echo -e "${YELLOW}[2/5] Collecting connection strings...${NC}"

# Render DB (from .env comments)
read -p "Enter Render DATABASE_URL: " RENDER_DB_URL
if [[ -z "$RENDER_DB_URL" ]]; then
  echo -e "${RED}✗ Render DATABASE_URL is required${NC}"
  exit 1
fi

# Neon DB
read -p "Enter Neon DATABASE_URL: " NEON_DB_URL
if [[ -z "$NEON_DB_URL" ]]; then
  echo -e "${RED}✗ Neon DATABASE_URL is required${NC}"
  exit 1
fi

# Upstash Redis
read -p "Enter Upstash REDIS_URL: " UPSTASH_REDIS_URL
if [[ -z "$UPSTASH_REDIS_URL" ]]; then
  echo -e "${RED}✗ Upstash REDIS_URL is required${NC}"
  exit 1
fi

echo -e "${GREEN}✓ Connection strings collected${NC}"
echo ""

# ─────────────────────────────────────────────────────────────────────────────
# Step 3: Test Render Connection
# ─────────────────────────────────────────────────────────────────────────────

echo -e "${YELLOW}[3/5] Testing Render database connection...${NC}"

if psql "$RENDER_DB_URL" -c "SELECT 1;" &> /dev/null; then
  echo -e "${GREEN}✓ Render connection successful${NC}"
else
  echo -e "${RED}✗ Cannot connect to Render database${NC}"
  echo "   Check your connection string and credentials"
  exit 1
fi
echo ""

# ─────────────────────────────────────────────────────────────────────────────
# Step 4: Backup Render Database
# ─────────────────────────────────────────────────────────────────────────────

echo -e "${YELLOW}[4/5] Backing up Render database...${NC}"

BACKUP_FILE="musawo-render-backup-$(date +%Y%m%d-%H%M%S).sql"

if pg_dump "$RENDER_DB_URL" --no-password > "$BACKUP_FILE" 2>&1; then
  SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
  echo -e "${GREEN}✓ Backup created: $BACKUP_FILE ($SIZE)${NC}"
else
  echo -e "${RED}✗ Backup failed${NC}"
  exit 1
fi
echo ""

# ─────────────────────────────────────────────────────────────────────────────
# Step 5: Test Neon Connection & Restore
# ─────────────────────────────────────────────────────────────────────────────

echo -e "${YELLOW}[5/5] Testing Neon connection...${NC}"

if psql "$NEON_DB_URL" -c "SELECT 1;" &> /dev/null; then
  echo -e "${GREEN}✓ Neon connection successful${NC}"
else
  echo -e "${RED}✗ Cannot connect to Neon database${NC}"
  echo "   Check your connection string"
  exit 1
fi

echo ""
read -p "Restore backup to Neon now? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
  echo -e "${YELLOW}Restoring to Neon (this may take 1-2 minutes)...${NC}"
  if psql "$NEON_DB_URL" < "$BACKUP_FILE" &> /dev/null; then
    echo -e "${GREEN}✓ Restore completed${NC}"
    
    # Verify
    USER_COUNT=$(psql "$NEON_DB_URL" -t -c "SELECT COUNT(*) FROM \"User\";")
    echo -e "${GREEN}✓ Users in Neon: $USER_COUNT${NC}"
  else
    echo -e "${RED}✗ Restore failed${NC}"
    exit 1
  fi
else
  echo -e "${YELLOW}Restore skipped. You can restore manually later.${NC}"
fi

echo ""
echo -e "${BLUE}╔════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   Generating Vercel Secrets                                   ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Generate secrets
NEXTAUTH_SECRET=$(openssl rand -base64 32)
DATA_ENCRYPTION_KEY=$(openssl rand -hex 32)
TOTP_ENCRYPTION_KEY=$(openssl rand -hex 32)
CRON_SECRET=$(openssl rand -hex 32)

# Create Vercel env file
ENV_FILE=".env.vercel"

cat > "$ENV_FILE" << EOF
# ─── Generated for Vercel Migration ───
# Copy these to Vercel Dashboard → Settings → Environment Variables

# App Configuration
NEXTAUTH_URL=https://YOUR_VERCEL_DOMAIN.vercel.app
NEXTAUTH_SECRET=$NEXTAUTH_SECRET
NODE_ENV=production
APP_ENV=staging
AUTH_URL=https://YOUR_VERCEL_DOMAIN.vercel.app
AUTH_SECRET=$NEXTAUTH_SECRET
AUTH_TRUST_HOST=true
NEXT_PUBLIC_SITE_URL=https://YOUR_VERCEL_DOMAIN.vercel.app

# Database & Cache
DATABASE_URL=$NEON_DB_URL
REDIS_URL=$UPSTASH_REDIS_URL

# Encryption Keys
DATA_ENCRYPTION_KEY=$DATA_ENCRYPTION_KEY
TOTP_ENCRYPTION_KEY=$TOTP_ENCRYPTION_KEY
CRON_SECRET=$CRON_SECRET

# Email
EMAIL_FROM=MTC <noreply@musawotraining.ug>

# Payments (copy from your .env)
PESAPAL_CONSUMER_KEY=
PESAPAL_CONSUMER_SECRET=
PESAPAL_IPN_ID=
PESAPAL_BASE_URL=https://cybqa.pesapal.com/pesapalv3
PESAPAL_WEBHOOK_SECRET=
FLUTTERWAVE_SECRET_KEY=
FLUTTERWAVE_PUBLIC_KEY=
FLUTTERWAVE_WEBHOOK_SECRET=

# S3 Storage (copy from your .env)
S3_ENDPOINT=
S3_REGION=auto
S3_BUCKET=mtc-files
S3_ACCESS_KEY_ID=
S3_SECRET_ACCESS_KEY=

# Bunny CDN (copy from your .env)
BUNNY_STREAM_API_KEY=
BUNNY_LIBRARY_ID=
BUNNY_SIGNING_KEY=
BUNNY_CDN_HOSTNAME=iframe.mediadelivery.net

# Resend Email (copy from your .env)
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# SMS / WhatsApp (copy from your .env)
AT_API_KEY=
AT_USERNAME=sandbox
AT_SENDER_ID=MUSAWO

# Demo Mode
DEMO_MODE=true
EOF

echo -e "${GREEN}✓ Created $ENV_FILE${NC}"
echo ""
echo -e "${BLUE}╔════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   Migration Checklist Complete!                              ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "Next steps:"
echo ""
echo -e "  1. ${YELLOW}Backup file:${NC} $BACKUP_FILE"
echo -e "     Keep this safe — it's your insurance against data loss"
echo ""
echo -e "  2. ${YELLOW}Vercel secrets:${NC} $ENV_FILE"
echo -e "     Copy the contents to Vercel Dashboard"
echo -e "     Settings → Environment Variables → Add"
echo ""
echo -e "  3. ${YELLOW}Deploy to Vercel:${NC}"
echo -e "     - Go to https://vercel.com"
echo -e "     - Import your musawo GitHub repo"
echo -e "     - Add all env vars from $ENV_FILE"
echo -e "     - Click Deploy"
echo ""
echo -e "  4. ${YELLOW}Test:${NC}"
echo -e "     - Visit your Vercel domain"
echo -e "     - Log in and check core functions"
echo ""
echo -e "  5. ${YELLOW}Cutover:${NC}"
echo -e "     - Suspend Render service"
echo -e "     - Update DNS if using custom domain"
echo ""
echo -e "${GREEN}Questions? See MIGRATION-STEP-BY-STEP.md${NC}"
echo ""
