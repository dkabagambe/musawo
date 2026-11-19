-- CreateTable
CREATE TABLE "request_metrics" (
    "id" TEXT NOT NULL,
    "route" TEXT NOT NULL,
    "method" TEXT NOT NULL,
    "status" INTEGER NOT NULL,
    "durationMs" INTEGER NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "request_metrics_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "request_metrics_route_timestamp_idx" ON "request_metrics"("route", "timestamp");

-- CreateIndex
CREATE INDEX "request_metrics_timestamp_idx" ON "request_metrics"("timestamp");

-- CreateIndex
CREATE INDEX "request_metrics_status_timestamp_idx" ON "request_metrics"("status", "timestamp");
