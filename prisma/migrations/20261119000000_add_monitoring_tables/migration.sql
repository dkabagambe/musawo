-- I4: Add monitoring tables (SystemLog, AlertItem, JobDefinition, JobRun)

CREATE TABLE "system_logs" (
    "id"        TEXT NOT NULL,
    "level"     TEXT NOT NULL,
    "source"    TEXT NOT NULL,
    "route"     TEXT,
    "requestId" TEXT,
    "message"   TEXT NOT NULL,
    "metadata"  JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "system_logs_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "system_logs_level_createdAt_idx"   ON "system_logs"("level",   "createdAt");
CREATE INDEX "system_logs_source_createdAt_idx"  ON "system_logs"("source",  "createdAt");
CREATE INDEX "system_logs_createdAt_idx"         ON "system_logs"("createdAt");

CREATE TABLE "alert_items" (
    "id"               TEXT NOT NULL,
    "ruleKey"          TEXT NOT NULL,
    "severity"         TEXT NOT NULL DEFAULT 'WARNING',
    "title"            TEXT NOT NULL,
    "description"      TEXT NOT NULL,
    "status"           TEXT NOT NULL DEFAULT 'OPEN',
    "metadata"         JSONB,
    "acknowledgedById" TEXT,
    "acknowledgedAt"   TIMESTAMP(3),
    "resolvedAt"       TIMESTAMP(3),
    "createdAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "alert_items_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "alert_items_status_createdAt_idx"  ON "alert_items"("status",  "createdAt");
CREATE INDEX "alert_items_ruleKey_createdAt_idx" ON "alert_items"("ruleKey", "createdAt");

CREATE TABLE "job_definitions" (
    "id"          TEXT NOT NULL,
    "key"         TEXT NOT NULL,
    "label"       TEXT NOT NULL,
    "description" TEXT,
    "schedule"    TEXT NOT NULL,
    "runnable"    BOOLEAN NOT NULL DEFAULT true,
    "active"      BOOLEAN NOT NULL DEFAULT true,
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "job_definitions_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "job_definitions_key_key" ON "job_definitions"("key");

CREATE TABLE "job_runs" (
    "id"          TEXT NOT NULL,
    "jobKey"      TEXT NOT NULL,
    "startedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt"  TIMESTAMP(3),
    "status"      TEXT NOT NULL DEFAULT 'RUNNING',
    "durationMs"  INTEGER,
    "output"      TEXT,
    "error"       TEXT,
    "triggeredBy" TEXT NOT NULL DEFAULT 'scheduler',
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "job_runs_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "job_runs_jobKey_startedAt_idx" ON "job_runs"("jobKey", "startedAt");
CREATE INDEX "job_runs_status_startedAt_idx" ON "job_runs"("status", "startedAt");
CREATE INDEX "job_runs_startedAt_idx"        ON "job_runs"("startedAt");

ALTER TABLE "job_runs" ADD CONSTRAINT "job_runs_jobKey_fkey"
    FOREIGN KEY ("jobKey") REFERENCES "job_definitions"("key")
    ON DELETE SET NULL ON UPDATE CASCADE;
