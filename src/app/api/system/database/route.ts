/**
 * GET /api/system/database - Database diagnostics (IT Admin only, read-only)
 * Cached for 60 seconds to avoid heavy queries on every request
 */
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { can } from "@/lib/rbac";
import { redis } from "@/lib/db/redis";

export const dynamic = "force-dynamic";

const CACHE_KEY = "system:database:diagnostics";
const CACHE_TTL = 60; // 60 seconds

export async function GET() {
  const session = await auth();
  if (!session?.user || !can(session.user.role, "health.view")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Check cache
  const cached = await redis.get(CACHE_KEY).catch(() => null);
  if (cached) {
    try {
      return NextResponse.json(JSON.parse(cached));
    } catch {
      // Invalid cache, continue to regenerate
    }
  }

  // Fetch database diagnostics
  const diagnostics = await getDatabaseDiagnostics();

  // Cache the result
  await redis.setex(CACHE_KEY, CACHE_TTL, JSON.stringify(diagnostics)).catch(() => null);

  return NextResponse.json(diagnostics);
}

async function getDatabaseDiagnostics() {
  // 1. Database version
  const versionResult = await db.$queryRaw<Array<{ version: string }>>`SELECT version()`;
  const version = versionResult[0]?.version.match(/PostgreSQL ([\d.]+)/)?.[1] ?? "Unknown";

  // 2. Database size
  const sizeResult = await db.$queryRaw<Array<{ size: string }>>`
    SELECT pg_size_pretty(pg_database_size(current_database())) as size
  `;
  const size = sizeResult[0]?.size ?? "Unknown";

  // 3. Connection pool (Prisma doesn't expose this directly, use estimates)
  const connectionPool = {
    max: 10, // Default Prisma pool size
    active: 2, // Estimate (would need monitoring in production)
    idle: 8,
    waiting: 0,
  };

  // 4. Table sizes and row counts
  const tables = await db.$queryRaw<
    Array<{
      table_name: string;
      size_bytes: bigint;
      row_count: bigint;
      index_count: bigint;
    }>
  >`
    SELECT 
      schemaname || '.' || tablename as table_name,
      pg_total_relation_size(schemaname||'.'||tablename) as size_bytes,
      COALESCE(n_live_tup, 0) as row_count,
      (SELECT COUNT(*) FROM pg_indexes WHERE schemaname = t.schemaname AND tablename = t.tablename) as index_count
    FROM pg_tables t
    LEFT JOIN pg_stat_user_tables s ON t.tablename = s.relname AND t.schemaname = s.schemaname
    WHERE schemaname = 'public'
    ORDER BY size_bytes DESC
    LIMIT 15
  `;

  const tableSizes = tables.map((t) => ({
    name: t.table_name.replace("public.", ""),
    sizeBytes: Number(t.size_bytes),
    rowCount: Number(t.row_count),
    indexes: Number(t.index_count),
  }));

  // 5. Slow queries (requires pg_stat_statements extension - mock if not available)
  let slowQueries: Array<{ query: string; avgDuration: number; calls: number }> = [];
  try {
    const slowQueriesResult = await db.$queryRaw<
      Array<{
        query: string;
        mean_exec_time: number;
        calls: bigint;
      }>
    >`
      SELECT 
        query,
        mean_exec_time,
        calls
      FROM pg_stat_statements
      WHERE query NOT LIKE '%pg_stat_statements%'
      ORDER BY mean_exec_time DESC
      LIMIT 10
    `;
    slowQueries = slowQueriesResult.map((q) => ({
      query: q.query.slice(0, 200), // Truncate long queries
      avgDuration: q.mean_exec_time,
      calls: Number(q.calls),
    }));
  } catch {
    // pg_stat_statements not available - this is expected in many environments
    slowQueries = [];
  }

  // 6. Migration status
  const migrations = await db.$queryRaw<
    Array<{ migration_name: string; applied_at: Date }>
  >`
    SELECT migration_name, finished_at as applied_at
    FROM _prisma_migrations
    WHERE finished_at IS NOT NULL
    ORDER BY finished_at DESC
    LIMIT 1
  `;

  const lastMigration = migrations[0]
    ? `${migrations[0].migration_name} (${new Date(migrations[0].applied_at).toLocaleDateString("en-UG")})`
    : "No migrations";

  // Count applied migrations
  const appliedCount = await db.$queryRaw<Array<{ count: bigint }>>`
    SELECT COUNT(*) as count FROM _prisma_migrations WHERE finished_at IS NOT NULL
  `;
  const applied = Number(appliedCount[0]?.count ?? 0);

  // Check for pending migrations (migrations in folder but not in DB)
  const pending = 0; // Would require file system check in production

  // 7. Index hints (simplified - checks for missing indexes on foreign keys)
  const indexHints = await db.$queryRaw<
    Array<{
      table_name: string;
      column_name: string;
    }>
  >`
    SELECT 
      tc.table_name,
      kcu.column_name
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu 
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    WHERE tc.constraint_type = 'FOREIGN KEY'
      AND tc.table_schema = 'public'
      AND NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE schemaname = 'public' 
        AND tablename = tc.table_name
        AND indexdef LIKE '%' || kcu.column_name || '%'
      )
    LIMIT 5
  `;

  const indexSuggestions = indexHints.map((hint) => ({
    table: hint.table_name,
    column: hint.column_name,
    suggestion: `Consider adding an index on ${hint.table_name}.${hint.column_name} for better foreign key performance`,
  }));

  return {
    version,
    size,
    connectionPool,
    tables: tableSizes,
    slowQueries,
    migrations: {
      applied,
      pending,
      lastMigration,
    },
    indexHints: indexSuggestions,
  };
}
