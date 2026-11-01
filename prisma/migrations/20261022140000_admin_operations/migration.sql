ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'STUDENT_LOOKUP';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'ACCOUNT_RESET_SENT';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'SUPPORT_TICKET_REPLIED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'OPERATIONAL_NOTICE_SENT';

ALTER TABLE "support_tickets"
  ADD COLUMN "category" TEXT NOT NULL DEFAULT 'GENERAL';

CREATE TABLE "venues" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "location" TEXT,
  "capacity" INTEGER,
  "notes" TEXT,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "venues_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "venues_name_key" ON "venues"("name");

CREATE TABLE "venue_bookings" (
  "id" TEXT NOT NULL,
  "venueId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "startsAt" TIMESTAMP(3) NOT NULL,
  "endsAt" TIMESTAMP(3) NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'CONFIRMED',
  "notes" TEXT,
  "createdById" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "venue_bookings_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "venue_bookings_venueId_startsAt_endsAt_idx" ON "venue_bookings"("venueId", "startsAt", "endsAt");
ALTER TABLE "venue_bookings" ADD CONSTRAINT "venue_bookings_venueId_fkey" FOREIGN KEY ("venueId") REFERENCES "venues"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "practical_sessions" (
  "id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "venueId" TEXT NOT NULL,
  "startsAt" TIMESTAMP(3) NOT NULL,
  "endsAt" TIMESTAMP(3) NOT NULL,
  "courseName" TEXT,
  "notes" TEXT,
  "createdById" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "practical_sessions_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "practical_sessions_venueId_startsAt_endsAt_idx" ON "practical_sessions"("venueId", "startsAt", "endsAt");
ALTER TABLE "practical_sessions" ADD CONSTRAINT "practical_sessions_venueId_fkey" FOREIGN KEY ("venueId") REFERENCES "venues"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "practical_equipment_items" (
  "id" TEXT NOT NULL,
  "practicalSessionId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "needed" INTEGER NOT NULL DEFAULT 1,
  "available" INTEGER NOT NULL DEFAULT 0,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "practical_equipment_items_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "practical_equipment_items" ADD CONSTRAINT "practical_equipment_items_practicalSessionId_fkey" FOREIGN KEY ("practicalSessionId") REFERENCES "practical_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "operational_notices" (
  "id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "audience" TEXT NOT NULL,
  "channel" TEXT NOT NULL DEFAULT 'IN_APP',
  "sentById" TEXT NOT NULL,
  "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "operational_notices_pkey" PRIMARY KEY ("id")
);

UPDATE "site_settings"
SET "value" = (("value"::jsonb - 'HR_SYSTEM_ADMIN') || '{"HR_MANAGER":{"parent":"DEPUTY_PRINCIPAL","level":4},"ADMINISTRATOR":{"parent":"HR_MANAGER","level":5}}'::jsonb)::text
WHERE "key" = 'rbac.roleTree';

CREATE TABLE "leave_requests" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "startsAt" TIMESTAMP(3) NOT NULL,
  "endsAt" TIMESTAMP(3) NOT NULL,
  "reason" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "decidedById" TEXT,
  "decidedAt" TIMESTAMP(3),
  "decisionNote" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "leave_requests_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "leave_requests_status_startsAt_idx" ON "leave_requests"("status", "startsAt");
ALTER TABLE "leave_requests" ADD CONSTRAINT "leave_requests_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "leave_requests" ADD CONSTRAINT "leave_requests_decidedById_fkey" FOREIGN KEY ("decidedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
