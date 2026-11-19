# Musawo Training Center Operations Runbook

**Last Updated**: 2026-11-19  
**Maintained By**: IT Admin (Daniel Kabagambe)

## Table of Contents

1. [Database Backup & Restore](#database-backup--restore)
2. [Deployment Procedures](#deployment-procedures)
3. [Secret Rotation](#secret-rotation)
4. [Email DNS Configuration](#email-dns-configuration)
5. [User Management](#user-management)
6. [Incident Response](#incident-response)
7. [Capacity & Scaling](#capacity--scaling)
8. [Monthly Checklist](#monthly-checklist)

---

## Database Backup & Restore

### Automated Backups

Backups run nightly at 2:00 AM via the `nightly-backup` scheduled job:
- **Frequency**: Daily at 02:00 EAT
- **Retention**: 30 daily backups + 12 monthly backups
- **Location**: S3-compatible storage (configured via S3_* environment variables)
- **Format**: Compressed (gzip) and encrypted pg_dump

### Manual Backup

```bash
# From IT Admin portal
# Navigate to /system/backups → Click "Back up now"
# Rate limited to 1 backup per hour per user

# Or via command line
cd /path/to/musawo
npx tsx -e "
  import { db } from './src/lib/db';
  const run = await db.jobRun.create({ 
    data: { jobKey: 'nightly-backup', status: 'RUNNING', triggeredBy: 'manual:cli' }
  });
  console.log('Backup job:', run.id);
"
```

### Restore from Backup

**⚠️ CRITICAL: Restore requires Director approval and should be documented**

#### Monthly Drill (Test Restore)

Run the restore drill monthly to verify backup integrity:

```bash
# 1. Download latest backup from S3
aws s3 cp s3://your-bucket/backups/backup-YYYY-MM-DD.sql.gz /tmp/

# 2. Create scratch database
createdb mtc_restore_test

# 3. Restore backup
gunzip -c /tmp/backup-YYYY-MM-DD.sql.gz | psql mtc_restore_test

# 4. Verify restoration
psql mtc_restore_test -c "SELECT COUNT(*) FROM users;"
psql mtc_restore_test -c "SELECT COUNT(*) FROM enrolments;"

# 5. Drop scratch database
dropdb mtc_restore_test

# 6. Record result in IT Admin portal (/system/backups)
```

#### Production Restore

**Only perform after:**
1. Director approval
2. Incident documented
3. All stakeholders notified

```bash
# 1. Stop the application
# (Render: pause service OR set maintenance mode)

# 2. Create a backup of current state first
pg_dump -Fc $DATABASE_URL > /tmp/pre-restore-backup.dump

# 3. Download the restore point
aws s3 cp s3://your-bucket/backups/backup-YYYY-MM-DD.sql.gz /tmp/

# 4. Drop and recreate database (DESTRUCTIVE)
dropdb mtc_db
createdb mtc_db

# 5. Restore
gunzip -c /tmp/backup-YYYY-MM-DD.sql.gz | psql $DATABASE_URL

# 6. Run migrations if needed
npx prisma migrate deploy

# 7. Restart application

# 8. Verify and audit
# Log restore in audit log via IT Admin portal
```

---

## Deployment Procedures

### Standard Deployment (Render)

```bash
# 1. Ensure all tests pass
npm run test

# 2. Build locally to verify
npm run build

# 3. Commit and push to main
git push origin main

# 4. Render auto-deploys from main branch

# 5. Verify deployment
curl https://your-domain.com/api/health

# 6. Monitor logs
# Render dashboard → Logs tab

# 7. Record deployment in /system/releases
```

### Rollback

```bash
# Option 1: Render dashboard
# Services → musawo → Manual Deploy → Select previous commit

# Option 2: Git revert
git revert <commit-hash>
git push origin main
```

---

## Secret Rotation

### Database Password

```bash
# 1. Generate new password
NEW_PASSWORD=$(openssl rand -base64 32)

# 2. Update database user
psql $DATABASE_URL -c "ALTER USER mtc WITH PASSWORD '$NEW_PASSWORD';"

# 3. Update environment variable (Render)
# Dashboard → Environment → Edit DATABASE_URL

# 4. Redeploy application

# 5. Test connection
curl https://your-domain.com/api/health
```

### S3 Access Keys

```bash
# 1. Generate new access key in S3 provider console

# 2. Update environment variables
# S3_ACCESS_KEY_ID
# S3_SECRET_ACCESS_KEY

# 3. Redeploy

# 4. Test storage
# IT Admin portal → /system/storage → Test button

# 5. Delete old access key from S3 console
```

### JWT Secret (NEXTAUTH_SECRET)

```bash
# 1. Generate new secret
openssl rand -base64 64

# 2. Schedule maintenance window (logs out all users)

# 3. Update NEXTAUTH_SECRET in environment

# 4. Redeploy

# 5. Notify users of forced logout
```

---

## Email DNS Configuration

### SPF Record

```
TXT @ "v=spf1 include:_spf.resend.com ~all"
```

### DKIM Record

```
TXT resend._domainkey "v=DKIM1; k=rsa; p=<public-key-from-resend>"
```

### DMARC Record

```
TXT _dmarc "v=DMARC1; p=none; rua=mailto:dmarc@yourdomain.com"
```

### Verification

```bash
# Check SPF
dig TXT yourdomain.com

# Check DKIM
dig TXT resend._domainkey.yourdomain.com

# Test via IT Admin portal
# /system/integrations → Email Provider → Test button
```

---

## User Management

### Add IT Admin User

```bash
# Via Prisma Studio (development)
npx prisma studio
# Navigate to User table → Add record:
# - email: newadmin@mtc.ac.ug
# - role: SYSTEM_IT
# - status: ACTIVE

# Or via SQL
psql $DATABASE_URL << EOF
INSERT INTO users (id, email, name, role, status, "createdAt", "updatedAt")
VALUES (
  'cl' || substr(md5(random()::text), 1, 24),
  'newadmin@mtc.ac.ug',
  'New Admin Name',
  'SYSTEM_IT',
  'ACTIVE',
  NOW(),
  NOW()
);
EOF
```

### Reset User 2FA

```bash
# Only Director can reset 2FA for Principal/Director
# For other users, IT Admin can use Account Support page

# Via database (emergency only)
psql $DATABASE_URL << EOF
UPDATE users 
SET "totpSecret" = NULL, "totpEnabled" = false
WHERE email = 'user@mtc.ac.ug';
EOF
```

---

## Incident Response

### Application Down

1. Check health endpoint: `curl https://your-domain.com/api/health`
2. Check Render logs: Dashboard → Logs
3. Check database: `psql $DATABASE_URL -c "SELECT 1"`
4. Check Redis: `redis-cli -u $REDIS_URL ping`
5. Enable maintenance mode if needed: IT Admin portal → /system/maintenance
6. Escalate to Render support if infrastructure issue

### Database Performance Issues

1. Check connection pool: /system/database → Connection Pool
2. Check slow queries: /system/database → Slow Queries
3. Check table sizes: /system/database → Table Sizes
4. Consider adding indexes: /system/database → Index Hints
5. If critical, scale up database instance

### Storage Full

1. Check usage: /system/storage
2. Run retention job manually: /system/jobs → storage-retention → Run now
3. Review largest categories: /system/storage → Categories
4. Consider increasing bucket size
5. Alert triggers at 80% usage

---

## Capacity & Scaling

### Current Limits

- **Database**: Shared PostgreSQL (Render)
- **Redis**: Shared instance
- **Storage**: 50 GB S3 bucket
- **Concurrent Users**: ~200 (estimated)

### Scale Up Indicators

- Connection pool > 80% for sustained period
- P95 latency > 2 seconds
- Storage > 80%
- Redis memory > 80%
- Error rate > 2%

### Scale Up Actions

1. Database: Upgrade Render plan
2. Redis: Upgrade to dedicated instance
3. Storage: Increase S3 bucket quota
4. Application: Enable horizontal scaling (multiple instances)

---

## Monthly Checklist

### First Monday of Each Month

- [ ] Run restore drill (verify latest backup)
- [ ] Review dependency updates: `npm outdated`
- [ ] Review security advisories: `npm audit`
- [ ] Review audit log: /system/audit
- [ ] Review slow queries: /system/database
- [ ] Review storage growth: /system/storage
- [ ] Review alert history: /system/alerts
- [ ] Test all integrations: /system/integrations → Test buttons
- [ ] Verify backup retention: /system/backups (30 daily + 12 monthly)
- [ ] Review access logs for privileged accounts: /system/security

### Last Recorded Drill

- **Date**: Not yet performed
- **Result**: N/A
- **Duration**: N/A
- **Notes**: First drill pending

---

## Emergency Contacts

- **Director**: director@mtc.ac.ug
- **Principal**: principal@mtc.ac.ug
- **IT Admin**: itadmin@mtc.ac.ug
- **Render Support**: https://render.com/support

---

**Document Version**: 1.0  
**Next Review**: Monthly (first Monday)
