-- ─────────────────────────────────────────────
-- FAILED EMAIL QUEUE
-- Stores emails that could not be sent because RESEND_API_KEY is not
-- configured or because Resend returned an error.  A cron job or Admin
-- action retries PENDING rows once the domain is verified and the key set.
-- ─────────────────────────────────────────────

CREATE TABLE "failed_emails" (
    "id"        TEXT NOT NULL,
    "to"        TEXT NOT NULL,
    "subject"   TEXT NOT NULL,
    "html"      TEXT NOT NULL,
    "template"  TEXT NOT NULL,
    "variables" JSONB NOT NULL,
    "status"    TEXT NOT NULL DEFAULT 'PENDING',
    "attempts"  INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sentAt"    TIMESTAMP(3),

    CONSTRAINT "failed_emails_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "failed_emails_status_createdAt_idx" ON "failed_emails"("status", "createdAt");
