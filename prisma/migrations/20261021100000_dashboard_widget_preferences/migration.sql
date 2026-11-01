CREATE TABLE "DashboardWidgetPreference" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "tab" TEXT NOT NULL,
  "widgetId" TEXT NOT NULL,
  "visible" BOOLEAN NOT NULL DEFAULT true,
  "column" INTEGER NOT NULL DEFAULT 0,
  "position" INTEGER NOT NULL DEFAULT 0,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "DashboardWidgetPreference_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "DashboardWidgetPreference_userId_tab_widgetId_key"
  ON "DashboardWidgetPreference"("userId", "tab", "widgetId");
CREATE INDEX "DashboardWidgetPreference_userId_tab_column_position_idx"
  ON "DashboardWidgetPreference"("userId", "tab", "column", "position");
ALTER TABLE "DashboardWidgetPreference"
  ADD CONSTRAINT "DashboardWidgetPreference_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
